import { CacheManager, CacheEntry, LoadedModel } from '../types';
export declare class LRUCache implements CacheManager {
    private cache;
    private maxSize;
    private currentSize;
    constructor(maxSizeMB?: number);
    get(key: string): Promise<LoadedModel | null>;
    set(key: string, model: LoadedModel): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    getStats(): Promise<{
        totalSize: number;
        entryCount: number;
        hitRate: number;
    }>;
    private evictLRU;
    getEntries(): CacheEntry[];
    prune(maxAge?: number): Promise<number>;
}
//# sourceMappingURL=LRUCache.d.ts.map