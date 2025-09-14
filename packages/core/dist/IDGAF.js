"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDGAF = void 0;
const ModelRegistry_1 = require("./runtime/ModelRegistry");
const ModelManager_1 = require("./runtime/ModelManager");
const HardwareDetection_1 = require("./runtime/HardwareDetection");
class IDGAF {
    constructor(config = {}) {
        this.hardware = null;
        this.performanceMetrics = new Map();
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
        this.registry = new ModelRegistry_1.ModelRegistry();
        this.modelManager = new ModelManager_1.ModelManager(this.config.modelCachePath, this.config.maxCacheSize);
        this.initializeHardware();
    }
    async initializeHardware() {
        try {
            this.hardware = await HardwareDetection_1.HardwareDetection.detect();
            this.log('info', `Detected hardware: ${JSON.stringify(this.hardware)}`);
        }
        catch (error) {
            this.log('warn', `Hardware detection failed: ${error}`);
        }
    }
    async loadModel(pathOrUrl, options = {}) {
        const startTime = Date.now();
        this.log('info', `Loading model: ${pathOrUrl}`);
        try {
            let modelPath;
            if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
                const modelInfo = await this.inferModelInfoFromUrl(pathOrUrl);
                modelPath = await this.modelManager.downloadModel(pathOrUrl, modelInfo, {
                    onProgress: (progress, status) => {
                        this.log('info', `Download progress: ${progress.toFixed(1)}% - ${status}`);
                    }
                });
            }
            else {
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
            const metrics = {
                modelLoadTimeMs: loadTime,
                inferenceTimeMs: 0,
                memoryUsageMB: modelInfo.size / (1024 * 1024)
            };
            this.performanceMetrics.set(model.id, metrics);
            this.log('info', `Model loaded successfully: ${model.id} (${loadTime}ms)`);
            return model;
        }
        catch (error) {
            this.log('error', `Failed to load model: ${error}`);
            throw error;
        }
    }
    async *generate(prompt, options = {}) {
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
        }
        catch (error) {
            this.log('error', `Generation failed: ${error}`);
            throw error;
        }
    }
    async *chat(messages, options = {}) {
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
        }
        catch (error) {
            this.log('error', `Chat completion failed: ${error}`);
            throw error;
        }
    }
    async classify(image, options = {}) {
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
        }
        catch (error) {
            this.log('error', `Classification failed: ${error}`);
            throw error;
        }
    }
    async detect(image, options = {}) {
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
        }
        catch (error) {
            this.log('error', `Detection failed: ${error}`);
            throw error;
        }
    }
    async segment(image, options = {}) {
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
        }
        catch (error) {
            this.log('error', `Segmentation failed: ${error}`);
            throw error;
        }
    }
    async transcribe(audio, options = {}) {
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
        }
        catch (error) {
            this.log('error', `Transcription failed: ${error}`);
            throw error;
        }
    }
    async synthesize(text, options = {}) {
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
        }
        catch (error) {
            this.log('error', `Synthesis failed: ${error}`);
            throw error;
        }
    }
    async embed(input, options = {}) {
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
        }
        catch (error) {
            this.log('error', `Embedding generation failed: ${error}`);
            throw error;
        }
    }
    async run(input, options = {}) {
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
        }
        catch (error) {
            this.log('error', `Generic inference failed: ${error}`);
            throw error;
        }
    }
    getLoadedModels() {
        return this.registry.getAllLoadedModels();
    }
    async unloadModel(modelId) {
        await this.registry.unloadModel(modelId);
        this.performanceMetrics.delete(modelId);
        this.log('info', `Model unloaded: ${modelId}`);
    }
    getPerformanceMetrics(modelId) {
        if (modelId) {
            return this.performanceMetrics.get(modelId) || {
                inferenceTimeMs: 0,
                memoryUsageMB: 0
            };
        }
        return this.performanceMetrics;
    }
    getHardwareInfo() {
        return this.hardware;
    }
    getCompatibleModels(type) {
        return this.registry.getAllLoadedModels()
            .filter(model => model.info.type === type);
    }
    updatePerformanceMetrics(modelId, metrics) {
        const existing = this.performanceMetrics.get(modelId) || {
            inferenceTimeMs: 0,
            memoryUsageMB: 0
        };
        this.performanceMetrics.set(modelId, { ...existing, ...metrics });
    }
    async inferModelInfoFromUrl(url) {
        const filename = url.split('/').pop() || 'model';
        const extension = filename.split('.').pop()?.toLowerCase();
        let format;
        switch (extension) {
            case 'gguf':
                format = 'gguf';
                break;
            case 'tflite':
                format = 'tflite';
                break;
            case 'onnx':
                format = 'onnx';
                break;
            case 'pte':
                format = 'pte';
                break;
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
    log(level, message) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const configLevel = levels.indexOf(this.config.logLevel);
        const messageLevel = levels.indexOf(level);
        if (messageLevel >= configLevel) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        }
    }
}
exports.IDGAF = IDGAF;
//# sourceMappingURL=IDGAF.js.map