import { ModelInfo, ModelDownloadOptions } from '../types';
export declare class ModelManager {
    private cachePath;
    private maxCacheSize;
    private cacheManager?;
    constructor(cachePath?: string, maxCacheSize?: number);
    private ensureCacheDirectory;
    downloadModel(url: string, modelInfo: ModelInfo, options?: ModelDownloadOptions): Promise<string>;
    private downloadWithProgress;
    private validateChecksum;
    getModelInfo(modelPath: string): Promise<ModelInfo | null>;
    private inferModelType;
    private formatBytes;
    clearCache(): Promise<void>;
    getCacheStats(): {
        totalSize: number;
        fileCount: number;
    };
}
//# sourceMappingURL=ModelManager.d.ts.map