import { ModelAdapter, ModelInfo, LoadedModel, ModelOptions, AdapterCapabilities } from '../types';
export declare class GGUFAdapter implements ModelAdapter {
    readonly format: "gguf";
    readonly supportedTypes: readonly ["llm", "embedding"];
    private loadedContexts;
    private llamaCpp;
    constructor();
    private initializeLlamaCpp;
    canHandle(modelPath: string, info?: ModelInfo): boolean;
    loadModel(modelPath: string, options?: ModelOptions): Promise<LoadedModel>;
    unloadModel(modelId: string): Promise<void>;
    getCapabilities(): AdapterCapabilities;
    private createGenerateFunction;
    private createChatFunction;
    private createEmbedFunction;
}
//# sourceMappingURL=GGUFAdapter.d.ts.map