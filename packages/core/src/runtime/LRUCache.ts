import { CacheManager, CacheEntry, LoadedModel } from '../types';

export class LRUCache implements CacheManager {
  private cache = new Map<string, { model: LoadedModel; entry: CacheEntry }>();
  private maxSize: number;
  private currentSize = 0;

  constructor(maxSizeMB: number = 2048) {
    this.maxSize = maxSizeMB * 1024 * 1024;
  }

  async get(key: string): Promise<LoadedModel | null> {
    const cached = this.cache.get(key);
    if (!cached) return null;

    cached.entry.lastAccessed = new Date();
    cached.entry.hitCount++;

    this.cache.delete(key);
    this.cache.set(key, cached);

    return cached.model;
  }

  async set(key: string, model: LoadedModel): Promise<void> {
    const modelSize = model.info.size;

    while (this.currentSize + modelSize > this.maxSize && this.cache.size > 0) {
      await this.evictLRU();
    }

    if (modelSize > this.maxSize) {
      throw new Error(`Model size ${modelSize} exceeds cache capacity ${this.maxSize}`);
    }

    const entry: CacheEntry = {
      key,
      modelId: model.id,
      size: modelSize,
      lastAccessed: new Date(),
      hitCount: 1
    };

    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.entry.size;
      await existing.model.adapter.unloadModel(existing.model.id);
    }

    this.cache.set(key, { model, entry });
    this.currentSize += modelSize;
  }

  async delete(key: string): Promise<void> {
    const cached = this.cache.get(key);
    if (cached) {
      this.currentSize -= cached.entry.size;
      await cached.model.adapter.unloadModel(cached.model.id);
      this.cache.delete(key);
    }
  }

  async clear(): Promise<void> {
    const promises = Array.from(this.cache.values()).map(
      cached => cached.model.adapter.unloadModel(cached.model.id)
    );

    await Promise.allSettled(promises);
    this.cache.clear();
    this.currentSize = 0;
  }

  async getStats(): Promise<{ totalSize: number; entryCount: number; hitRate: number }> {
    const totalHits = Array.from(this.cache.values())
      .reduce((sum, cached) => sum + cached.entry.hitCount, 0);

    const totalAccesses = totalHits;
    const hitRate = totalAccesses > 0 ? totalHits / totalAccesses : 0;

    return {
      totalSize: this.currentSize,
      entryCount: this.cache.size,
      hitRate
    };
  }

  private async evictLRU(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime: Date | null = null;

    for (const [key, cached] of this.cache.entries()) {
      if (!oldestTime || cached.entry.lastAccessed < oldestTime) {
        oldestTime = cached.entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      await this.delete(oldestKey);
    }
  }

  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values()).map(cached => cached.entry);
  }

  async prune(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      const age = now.getTime() - cached.entry.lastAccessed.getTime();
      if (age > maxAge) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }

    return keysToDelete.length;
  }
}