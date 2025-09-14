import {
  ModelAdapter,
  ModelInfo,
  LoadedModel,
  ModelOptions,
  Tensor,
  ClassifyOptions,
  ClassificationResult,
  Classification,
  DetectionResult,
  DetectionBox,
  SegmentationResult,
  AdapterCapabilities
} from '../types';

interface TFLiteModel {
  interpreter: any;
  inputDetails: any[];
  outputDetails: any[];
  labels?: string[];
}

export class TFLiteAdapter implements ModelAdapter {
  readonly format = 'tflite' as const;
  readonly supportedTypes = ['vision', 'audio'] as const;

  private loadedModels = new Map<string, TFLiteModel>();
  private tflite: any = null;

  constructor() {
    this.initializeTFLite();
  }

  private async initializeTFLite(): Promise<void> {
    try {
      if (typeof require !== 'undefined') {
        this.tflite = require('@tensorflow/tfjs-tflite');
      } else {
        const tf = await import('@tensorflow/tfjs');
        await tf.ready();
        this.tflite = tf;
      }
    } catch (error) {
      console.warn('Failed to initialize TensorFlow Lite:', error);
    }
  }

  canHandle(modelPath: string, info?: ModelInfo): boolean {
    if (info?.format === 'tflite') return true;
    return modelPath.toLowerCase().endsWith('.tflite');
  }

  async loadModel(modelPath: string, options: ModelOptions = {}): Promise<LoadedModel> {
    if (!this.tflite) {
      throw new Error('TensorFlow Lite not available - ensure @tensorflow/tfjs-tflite is installed');
    }

    const modelId = `tflite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      let modelBuffer: ArrayBuffer;

      if (typeof fetch !== 'undefined' && (modelPath.startsWith('http://') || modelPath.startsWith('https://'))) {
        const response = await fetch(modelPath);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        modelBuffer = await response.arrayBuffer();
      } else {
        const fs = require('fs');
        const buffer = fs.readFileSync(modelPath);
        modelBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }

      const interpreter = await this.tflite.loadTFLiteModel(modelBuffer);

      const inputDetails = [];
      const outputDetails = [];

      for (let i = 0; i < interpreter.inputs.length; i++) {
        const input = interpreter.inputs[i];
        inputDetails.push({
          name: input.name || `input_${i}`,
          index: i,
          shape: input.shape,
          dtype: input.dtype
        });
      }

      for (let i = 0; i < interpreter.outputs.length; i++) {
        const output = interpreter.outputs[i];
        outputDetails.push({
          name: output.name || `output_${i}`,
          index: i,
          shape: output.shape,
          dtype: output.dtype
        });
      }

      let labels: string[] | undefined;
      try {
        const labelsPath = modelPath.replace('.tflite', '_labels.txt');
        if (typeof require !== 'undefined') {
          const fs = require('fs');
          if (fs.existsSync(labelsPath)) {
            const labelsText = fs.readFileSync(labelsPath, 'utf-8');
            labels = labelsText.split('\n').filter((line: string) => line.trim());
          }
        }
      } catch (error) {
        console.warn('Could not load labels file:', error);
      }

      const tfliteModel: TFLiteModel = {
        interpreter,
        inputDetails,
        outputDetails,
        labels
      };

      this.loadedModels.set(modelId, tfliteModel);

      const modelInfo: ModelInfo = {
        name: modelPath.split('/').pop()?.replace('.tflite', '') || 'unknown',
        format: 'tflite',
        type: this.inferModelType(modelPath, inputDetails[0]?.shape),
        size: modelBuffer.byteLength,
        version: '1.0.0',
        checksum: '',
        metadata: {
          inputShape: inputDetails[0]?.shape,
          outputShape: outputDetails[0]?.shape,
          numClasses: labels?.length || outputDetails[0]?.shape?.[1]
        }
      };

      const loadedModel: LoadedModel = {
        id: modelId,
        info: modelInfo,
        adapter: this as ModelAdapter,
        classify: modelInfo.type === 'vision' ? this.createClassifyFunction(modelId) : undefined,
        detect: this.createDetectFunction(modelId),
        segment: this.createSegmentFunction(modelId)
      };

      return loadedModel;

    } catch (error) {
      throw new Error(`Failed to load TFLite model: ${error}`);
    }
  }

  async unloadModel(modelId: string): Promise<void> {
    const model = this.loadedModels.get(modelId);
    if (model) {
      try {
        model.interpreter.dispose?.();
      } catch (error) {
        console.warn(`Error disposing model ${modelId}:`, error);
      }
      this.loadedModels.delete(modelId);
    }
  }

  getCapabilities(): AdapterCapabilities {
    return {
      supportsStreaming: false,
      supportsGPU: true,
      supportsQuantization: ['int8', 'float16'],
      supportedFormats: ['tflite']
    };
  }

  private inferModelType(modelPath: string, inputShape?: number[]): ModelInfo['type'] {
    const fileName = modelPath.toLowerCase();

    if (fileName.includes('audio') || fileName.includes('speech') || fileName.includes('whisper')) {
      return 'audio';
    }

    if (inputShape && inputShape.length === 4) {
      return 'vision';
    }

    return 'vision';
  }

  private createClassifyFunction(modelId: string) {
    return async (input: Tensor, options: ClassifyOptions = {}): Promise<ClassificationResult> => {
      const model = this.loadedModels.get(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      try {
        const inputTensor = this.preprocessInput(input, model.inputDetails[0]);

        const prediction = model.interpreter.predict(inputTensor) as any;

        let probabilities: Float32Array;
        if (prediction instanceof Array) {
          probabilities = prediction[0].dataSync();
        } else {
          probabilities = prediction.dataSync();
        }

        const predictions: Classification[] = [];
        for (let i = 0; i < probabilities.length; i++) {
          predictions.push({
            label: model.labels?.[i] || `class_${i}`,
            confidence: probabilities[i],
            index: i
          });
        }

        predictions.sort((a, b) => b.confidence - a.confidence);

        if (options.threshold) {
          const filtered = predictions.filter(p => p.confidence >= options.threshold!);
          predictions.splice(0, predictions.length, ...filtered);
        }

        const result: ClassificationResult = {
          predictions,
          top: (k: number) => predictions.slice(0, k)
        };

        if (options.includeEmbeddings && model.outputDetails.length > 1) {
          const embeddingOutput = model.interpreter.predict(inputTensor);
          result.embeddings = embeddingOutput[1]?.dataSync() || null;
        }

        return result;

      } catch (error) {
        throw new Error(`Classification failed: ${error}`);
      }
    };
  }

  private createDetectFunction(modelId: string) {
    return async (input: Tensor, options: any = {}): Promise<DetectionResult> => {
      const model = this.loadedModels.get(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      try {
        const inputTensor = this.preprocessInput(input, model.inputDetails[0]);

        const outputs = model.interpreter.predict(inputTensor) as any[];

        const boxes: DetectionBox[] = [];
        const scoreThreshold = options.scoreThreshold || 0.5;
        const iouThreshold = options.iouThreshold || 0.5;

        if (outputs.length >= 4) {
          const locations = outputs[0].dataSync();
          const classes = outputs[1].dataSync();
          const scores = outputs[2].dataSync();
          const numDetections = Math.floor(outputs[3].dataSync()[0]);

          for (let i = 0; i < numDetections; i++) {
            const score = scores[i];
            if (score >= scoreThreshold) {
              const classId = Math.floor(classes[i]);
              const y1 = locations[i * 4];
              const x1 = locations[i * 4 + 1];
              const y2 = locations[i * 4 + 2];
              const x2 = locations[i * 4 + 3];

              boxes.push({
                x: x1,
                y: y1,
                width: x2 - x1,
                height: y2 - y1,
                confidence: score,
                label: model.labels?.[classId] || `class_${classId}`,
                labelId: classId
              });
            }
          }
        }

        const filteredBoxes = this.applyNMS(boxes, iouThreshold);

        return {
          boxes: filteredBoxes,
          count: filteredBoxes.length
        };

      } catch (error) {
        throw new Error(`Detection failed: ${error}`);
      }
    };
  }

  private createSegmentFunction(modelId: string) {
    return async (input: Tensor, options: any = {}): Promise<SegmentationResult> => {
      const model = this.loadedModels.get(modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      try {
        const inputTensor = this.preprocessInput(input, model.inputDetails[0]);

        const prediction = model.interpreter.predict(inputTensor) as any;

        const maskData = prediction.dataSync();
        const outputShape = model.outputDetails[0].shape;

        const height = outputShape[1];
        const width = outputShape[2];
        const numClasses = outputShape[3] || 1;

        const mask = new Uint8Array(maskData.length);
        const classes: number[] = [];

        for (let i = 0; i < maskData.length; i += numClasses) {
          let maxClass = 0;
          let maxScore = maskData[i];

          for (let c = 1; c < numClasses; c++) {
            if (maskData[i + c] > maxScore) {
              maxScore = maskData[i + c];
              maxClass = c;
            }
          }

          mask[i / numClasses] = maxClass;
          if (!classes.includes(maxClass)) {
            classes.push(maxClass);
          }
        }

        return {
          mask,
          classes,
          width,
          height
        };

      } catch (error) {
        throw new Error(`Segmentation failed: ${error}`);
      }
    };
  }

  private preprocessInput(input: Tensor, inputDetails: any): any {
    const { shape, dtype } = inputDetails;

    let processedData = input.data;

    if (dtype === 'uint8' && input.dtype !== 'uint8') {
      processedData = new Uint8Array(input.data.length);
      for (let i = 0; i < input.data.length; i++) {
        processedData[i] = Math.round(Math.max(0, Math.min(255, input.data[i] * 255)));
      }
    } else if (dtype === 'float32' && input.dtype !== 'float32') {
      processedData = new Float32Array(input.data.length);
      for (let i = 0; i < input.data.length; i++) {
        processedData[i] = input.data[i] / 255.0;
      }
    }

    if (this.tflite.tensor) {
      return this.tflite.tensor(Array.from(processedData), shape, dtype);
    }

    return { data: processedData, shape, dtype };
  }

  private applyNMS(boxes: DetectionBox[], iouThreshold: number): DetectionBox[] {
    boxes.sort((a, b) => b.confidence - a.confidence);

    const result: DetectionBox[] = [];
    const suppressed = new Set<number>();

    for (let i = 0; i < boxes.length; i++) {
      if (suppressed.has(i)) continue;

      result.push(boxes[i]);

      for (let j = i + 1; j < boxes.length; j++) {
        if (suppressed.has(j)) continue;

        const iou = this.calculateIoU(boxes[i], boxes[j]);
        if (iou > iouThreshold) {
          suppressed.add(j);
        }
      }
    }

    return result;
  }

  private calculateIoU(boxA: DetectionBox, boxB: DetectionBox): number {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA.width * boxA.height;
    const boxBArea = boxB.width * boxB.height;

    return interArea / (boxAArea + boxBArea - interArea);
  }
}