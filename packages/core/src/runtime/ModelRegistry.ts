import { ModelAdapter, ModelInfo, LoadedModel, HardwareInfo } from '../types';

export class ModelRegistry {
  private adapters: Map<string, ModelAdapter> = new Map();
  private loadedModels: Map<string, LoadedModel> = new Map();

  registerAdapter(adapter: ModelAdapter): void {
    this.adapters.set(adapter.format, adapter);
  }

  getAdapter(format: string): ModelAdapter | undefined {
    return this.adapters.get(format);
  }

  getAllAdapters(): ModelAdapter[] {
    return Array.from(this.adapters.values());
  }

  async selectBestAdapter(
    modelPath: string,
    modelInfo?: ModelInfo,
    hardware?: HardwareInfo
  ): Promise<ModelAdapter | null> {
    const candidates: Array<{adapter: ModelAdapter, score: number}> = [];

    for (const adapter of this.adapters.values()) {
      if (!adapter.canHandle(modelPath, modelInfo)) continue;

      let score = 0;
      const capabilities = adapter.getCapabilities();

      if (modelInfo?.format === adapter.format) score += 100;

      if (hardware?.hasGPU && capabilities.supportsGPU) score += 50;
      if (capabilities.supportsStreaming) score += 20;
      if (capabilities.supportsQuantization.length > 0) score += 10;

      candidates.push({ adapter, score });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].adapter;
  }

  registerLoadedModel(model: LoadedModel): void {
    this.loadedModels.set(model.id, model);
  }

  getLoadedModel(modelId: string): LoadedModel | undefined {
    return this.loadedModels.get(modelId);
  }

  async unloadModel(modelId: string): Promise<void> {
    const model = this.loadedModels.get(modelId);
    if (model) {
      await model.adapter.unloadModel(modelId);
      this.loadedModels.delete(modelId);
    }
  }

  getAllLoadedModels(): LoadedModel[] {
    return Array.from(this.loadedModels.values());
  }

  getMemoryUsage(): number {
    return Array.from(this.loadedModels.values())
      .reduce((total, model) => total + model.info.size, 0);
  }
}