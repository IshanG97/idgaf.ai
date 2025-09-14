import { ModelAdapter, ModelInfo, LoadedModel, HardwareInfo } from '../types';
export declare class ModelRegistry {
    private adapters;
    private loadedModels;
    registerAdapter(adapter: ModelAdapter): void;
    getAdapter(format: string): ModelAdapter | undefined;
    getAllAdapters(): ModelAdapter[];
    selectBestAdapter(modelPath: string, modelInfo?: ModelInfo, hardware?: HardwareInfo): Promise<ModelAdapter | null>;
    registerLoadedModel(model: LoadedModel): void;
    getLoadedModel(modelId: string): LoadedModel | undefined;
    unloadModel(modelId: string): Promise<void>;
    getAllLoadedModels(): LoadedModel[];
    getMemoryUsage(): number;
}
//# sourceMappingURL=ModelRegistry.d.ts.map