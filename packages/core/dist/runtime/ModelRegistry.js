"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = void 0;
class ModelRegistry {
    constructor() {
        this.adapters = new Map();
        this.loadedModels = new Map();
    }
    registerAdapter(adapter) {
        this.adapters.set(adapter.format, adapter);
    }
    getAdapter(format) {
        return this.adapters.get(format);
    }
    getAllAdapters() {
        return Array.from(this.adapters.values());
    }
    async selectBestAdapter(modelPath, modelInfo, hardware) {
        const candidates = [];
        for (const adapter of this.adapters.values()) {
            if (!adapter.canHandle(modelPath, modelInfo))
                continue;
            let score = 0;
            const capabilities = adapter.getCapabilities();
            if (modelInfo?.format === adapter.format)
                score += 100;
            if (hardware?.hasGPU && capabilities.supportsGPU)
                score += 50;
            if (capabilities.supportsStreaming)
                score += 20;
            if (capabilities.supportsQuantization.length > 0)
                score += 10;
            candidates.push({ adapter, score });
        }
        if (candidates.length === 0)
            return null;
        candidates.sort((a, b) => b.score - a.score);
        return candidates[0].adapter;
    }
    registerLoadedModel(model) {
        this.loadedModels.set(model.id, model);
    }
    getLoadedModel(modelId) {
        return this.loadedModels.get(modelId);
    }
    async unloadModel(modelId) {
        const model = this.loadedModels.get(modelId);
        if (model) {
            await model.adapter.unloadModel(modelId);
            this.loadedModels.delete(modelId);
        }
    }
    getAllLoadedModels() {
        return Array.from(this.loadedModels.values());
    }
    getMemoryUsage() {
        return Array.from(this.loadedModels.values())
            .reduce((total, model) => total + model.info.size, 0);
    }
}
exports.ModelRegistry = ModelRegistry;
//# sourceMappingURL=ModelRegistry.js.map