import { ModelAdapter, ModelInfo, LoadedModel, ModelOptions, AdapterCapabilities } from '../types';
export declare class TFLiteAdapter implements ModelAdapter {
    readonly format: "tflite";
    readonly supportedTypes: readonly ["vision", "audio"];
    private loadedModels;
    private tflite;
    constructor();
    private initializeTFLite;
    canHandle(modelPath: string, info?: ModelInfo): boolean;
    loadModel(modelPath: string, options?: ModelOptions): Promise<LoadedModel>;
    unloadModel(modelId: string): Promise<void>;
    getCapabilities(): AdapterCapabilities;
    private inferModelType;
    private createClassifyFunction;
    private createDetectFunction;
    private createSegmentFunction;
    private preprocessInput;
    private applyNMS;
    private calculateIoU;
}
//# sourceMappingURL=TFLiteAdapter.d.ts.map