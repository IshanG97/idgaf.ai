import {
  AIConfig,
  ModelOptions,
  GenerateOptions,
  ChatMessage,
  ChatOptions,
  ClassifyOptions,
  ClassificationResult,
  DetectionResult,
  SegmentationResult,
  TranscriptionOptions,
  TranscriptionResult,
  SynthesisOptions,
  EmbeddingOptions,
  Tensor,
  LoadedModel,
  ModelInfo,
  PerformanceMetrics,
  HardwareInfo
} from './types';
import { ModelRegistry } from './runtime/ModelRegistry';
import { ModelManager } from './runtime/ModelManager';
import { HardwareDetection } from './runtime/HardwareDetection';

export class IDGAF {
  private registry: ModelRegistry;
  private modelManager: ModelManager;
  private config: Required<AIConfig>;
  private hardware: HardwareInfo | null = null;
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();

  constructor(config: AIConfig = {}) {
    this.config = {
      modelCachePath: config.modelCachePath || './models',
      maxCacheSize: config.maxCacheSize || 2 * 1024 * 1024 * 1024,
      logLevel: config.logLevel || 'info',
      enableTelemetry: config.enableTelemetry ?? false,
      hardware: {
        preferGPU: config.hardware?.preferGPU ?? true,
        preferNPU: config.hardware?.preferNPU ?? true,
        maxMemoryMB: config.hardware?.maxMemoryMB
      }
    };

    this.registry = new ModelRegistry();
    this.modelManager = new ModelManager(this.config.modelCachePath, this.config.maxCacheSize);
    this.initializeHardware();
  }

  private async initializeHardware(): Promise<void> {
    try {
      this.hardware = await HardwareDetection.detect();
      this.log('info', `Detected hardware: ${JSON.stringify(this.hardware)}`);
    } catch (error) {
      this.log('warn', `Hardware detection failed: ${error}`);
    }
  }

  async loadModel(pathOrUrl: string, options: ModelOptions = {}): Promise<LoadedModel> {
    const startTime = Date.now();
    this.log('info', `Loading model: ${pathOrUrl}`);

    try {
      let modelPath: string;

      if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        const modelInfo = await this.inferModelInfoFromUrl(pathOrUrl);
        modelPath = await this.modelManager.downloadModel(pathOrUrl, modelInfo, {
          onProgress: (progress, status) => {
            this.log('info', `Download progress: ${progress.toFixed(1)}% - ${status}`);
          }
        });
      } else {
        modelPath = pathOrUrl;
      }

      const modelInfo = await this.modelManager.getModelInfo(modelPath);
      if (!modelInfo) {
        throw new Error(`Unable to determine model format for: ${modelPath}`);
      }

      const adapter = await this.registry.selectBestAdapter(modelPath, modelInfo, this.hardware || undefined);
      if (!adapter) {
        throw new Error(`No compatible adapter found for model: ${modelInfo.format}`);
      }

      const model = await adapter.loadModel(modelPath, options);
      this.registry.registerLoadedModel(model);

      const loadTime = Date.now() - startTime;
      const metrics: PerformanceMetrics = {
        modelLoadTimeMs: loadTime,
        inferenceTimeMs: 0,
        memoryUsageMB: modelInfo.size / (1024 * 1024)
      };
      this.performanceMetrics.set(model.id, metrics);

      this.log('info', `Model loaded successfully: ${model.id} (${loadTime}ms)`);
      return model;

    } catch (error) {
      this.log('error', `Failed to load model: ${error}`);
      throw error;
    }
  }

  async *generate(prompt: string, options: GenerateOptions = {}): AsyncGenerator<string> {
    const models = this.getCompatibleModels('llm');
    if (models.length === 0) {
      throw new Error('No LLM models loaded');
    }

    const model = models[0];
    if (!model.generate) {
      throw new Error('Model does not support text generation');
    }

    const startTime = Date.now();
    let tokenCount = 0;

    try {
      for await (const token of model.generate(prompt, options)) {
        tokenCount++;
        yield token;
      }

      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(model.id, {
        inferenceTimeMs: inferenceTime,
        tokensPerSecond: tokenCount / (inferenceTime / 1000)
      });

    } catch (error) {
      this.log('error', `Generation failed: ${error}`);
      throw error;
    }
  }

  async *chat(messages: ChatMessage[], options: ChatOptions = {}): AsyncGenerator<string> {
    const models = this.getCompatibleModels('llm');
    if (models.length === 0) {
      throw new Error('No LLM models loaded');
    }

    const model = models[0];
    if (!model.chat) {
      throw new Error('Model does not support chat completion');
    }

    const startTime = Date.now();
    let tokenCount = 0;

    try {
      for await (const token of model.chat(messages, options)) {
        tokenCount++;
        yield token;
      }

      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(model.id, {
        inferenceTimeMs: inferenceTime,
        tokensPerSecond: tokenCount / (inferenceTime / 1000)
      });

    } catch (error) {
      this.log('error', `Chat completion failed: ${error}`);
      throw error;
    }
  }

  async classify(image: Tensor, options: ClassifyOptions = {}): Promise<ClassificationResult> {
    const models = this.getCompatibleModels('vision');
    if (models.length === 0) {
      throw new Error('No vision models loaded');
    }

    const model = models[0];
    if (!model.classify) {
      throw new Error('Model does not support image classification');
    }

    const startTime = Date.now();

    try {
      const result = await model.classify(image, options);

      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(model.id, {
        inferenceTimeMs: inferenceTime
      });

      return result;

    } catch (error) {
      this.log('error', `Classification failed: ${error}`);
      throw error;
    }
  }

  async detect(image: Tensor, options: any = {}): Promise<DetectionResult> {
    const models = this.getCompatibleModels('vision');
    if (models.length === 0) {
      throw new Error('No vision models loaded');
    }

    const model = models[0];
    if (!model.detect) {
      throw new Error('Model does not support object detection');
    }

    const startTime = Date.now();

    try {
      const result = await model.detect(image, options);

      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(model.id, {
        inferenceTimeMs: inferenceTime
      });

      return result;

    } catch (error) {
      this.log('error', `Detection failed: ${error}`);
      throw error;
    }
  }

  async segment(image: Tensor, options: any = {}): Promise<SegmentationResult> {
    const models = this.getCompatibleModels('vision');
    if (models.length === 0) {
      throw new Error('No vision models loaded');
    }

    const model = models[0];
    if (!model.segment) {
      throw new Error('Model does not support image segmentation');
    }

    const startTime = Date.now();

    try {
      const result = await model.segment(image, options);

      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(model.id, {
        inferenceTimeMs: inferenceTime
      });

      return result;

    } catch (error) {
      this.log('error', `Segmentation failed: ${error}`);
      throw error;
    }
  }

  async transcribe(audio: Tensor, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    const models = this.getCompatibleModels('audio');
    if (models.length === 0) {
      throw new Error('No audio models loaded');
    }

    const model = models[0];
    if (!model.transcribe) {
      throw new Error('Model does not support speech transcription');
    }

    const startTime = Date.now();

    try {
      const result = await model.transcribe(audio, options);

      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(model.id, {
        inferenceTimeMs: inferenceTime
      });

      return result;

    } catch (error) {
      this.log('error', `Transcription failed: ${error}`);
      throw error;
    }
  }

  async synthesize(text: string, options: SynthesisOptions = {}): Promise<ArrayBuffer> {
    const models = this.getCompatibleModels('audio');
    if (models.length === 0) {
      throw new Error('No audio models loaded');
    }

    const model = models[0];
    if (!model.synthesize) {
      throw new Error('Model does not support speech synthesis');
    }

    const startTime = Date.now();

    try {
      const result = await model.synthesize(text, options);

      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(model.id, {
        inferenceTimeMs: inferenceTime
      });

      return result;

    } catch (error) {
      this.log('error', `Synthesis failed: ${error}`);
      throw error;
    }
  }

  async embed(input: string | Tensor, options: EmbeddingOptions = {}): Promise<Float32Array> {
    const models = this.getCompatibleModels('embedding');
    if (models.length === 0) {
      throw new Error('No embedding models loaded');
    }

    const model = models[0];
    if (!model.embed) {
      throw new Error('Model does not support embedding generation');
    }

    const startTime = Date.now();

    try {
      const result = await model.embed(input, options);

      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(model.id, {
        inferenceTimeMs: inferenceTime
      });

      return result;

    } catch (error) {
      this.log('error', `Embedding generation failed: ${error}`);
      throw error;
    }
  }

  async run(input: any, options: any = {}): Promise<any> {
    const models = this.registry.getAllLoadedModels();
    if (models.length === 0) {
      throw new Error('No models loaded');
    }

    const model = models[0];
    if (!model.run) {
      throw new Error('Model does not support generic inference');
    }

    const startTime = Date.now();

    try {
      const result = await model.run(input, options);

      const inferenceTime = Date.now() - startTime;
      this.updatePerformanceMetrics(model.id, {
        inferenceTimeMs: inferenceTime
      });

      return result;

    } catch (error) {
      this.log('error', `Generic inference failed: ${error}`);
      throw error;
    }
  }

  getLoadedModels(): LoadedModel[] {
    return this.registry.getAllLoadedModels();
  }

  async unloadModel(modelId: string): Promise<void> {
    await this.registry.unloadModel(modelId);
    this.performanceMetrics.delete(modelId);
    this.log('info', `Model unloaded: ${modelId}`);
  }

  getPerformanceMetrics(modelId?: string): PerformanceMetrics | Map<string, PerformanceMetrics> {
    if (modelId) {
      return this.performanceMetrics.get(modelId) || {
        inferenceTimeMs: 0,
        memoryUsageMB: 0
      };
    }
    return this.performanceMetrics;
  }

  getHardwareInfo(): HardwareInfo | null {
    return this.hardware;
  }

  private getCompatibleModels(type: ModelInfo['type']): LoadedModel[] {
    return this.registry.getAllLoadedModels()
      .filter(model => model.info.type === type);
  }

  private updatePerformanceMetrics(modelId: string, metrics: Partial<PerformanceMetrics>): void {
    const existing = this.performanceMetrics.get(modelId) || {
      inferenceTimeMs: 0,
      memoryUsageMB: 0
    };

    this.performanceMetrics.set(modelId, { ...existing, ...metrics });
  }

  private async inferModelInfoFromUrl(url: string): Promise<ModelInfo> {
    const filename = url.split('/').pop() || 'model';
    const extension = filename.split('.').pop()?.toLowerCase();

    let format: ModelInfo['format'];
    switch (extension) {
      case 'gguf': format = 'gguf'; break;
      case 'tflite': format = 'tflite'; break;
      case 'onnx': format = 'onnx'; break;
      case 'pte': format = 'pte'; break;
      default: format = 'gguf';
    }

    return {
      name: filename.replace(/\.[^/.]+$/, ''),
      format,
      type: 'llm',
      size: 0,
      version: '1.0.0',
      checksum: '',
      metadata: {}
    };
  }

  private log(level: string, message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }
}