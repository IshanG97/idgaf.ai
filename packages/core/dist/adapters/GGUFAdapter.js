"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GGUFAdapter = void 0;
class GGUFAdapter {
    constructor() {
        this.format = 'gguf';
        this.supportedTypes = ['llm', 'embedding'];
        this.loadedContexts = new Map();
        this.llamaCpp = null;
        this.initializeLlamaCpp();
    }
    async initializeLlamaCpp() {
        try {
            if (typeof require !== 'undefined') {
                this.llamaCpp = require('@node-llama-cpp/node-llama-cpp');
            }
            else {
                throw new Error('Node.js environment required for GGUF models');
            }
        }
        catch (error) {
            console.warn('Failed to initialize llama.cpp:', error);
        }
    }
    canHandle(modelPath, info) {
        if (info?.format === 'gguf')
            return true;
        return modelPath.toLowerCase().endsWith('.gguf');
    }
    async loadModel(modelPath, options = {}) {
        if (!this.llamaCpp) {
            throw new Error('llama.cpp not available - ensure @node-llama-cpp/node-llama-cpp is installed');
        }
        const modelId = `gguf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            const model = new this.llamaCpp.LlamaModel({
                modelPath,
                gpuLayers: options.quantization === 'fp16' ? -1 : 0,
            });
            const context = new this.llamaCpp.LlamaContext({
                model,
                contextSize: options.contextLength || 2048,
                batchSize: 512,
                threads: 4,
                temperature: options.temperature || 0.7,
                topP: options.topP || 0.9,
                topK: options.topK || 40,
            });
            const contextInfo = {
                model,
                context,
                contextSize: options.contextLength || 2048,
                vocabSize: model.vocabSize
            };
            this.loadedContexts.set(modelId, contextInfo);
            const modelInfo = {
                name: modelPath.split('/').pop()?.replace('.gguf', '') || 'unknown',
                format: 'gguf',
                type: 'llm',
                size: 0,
                version: '1.0.0',
                checksum: '',
                metadata: {
                    contextSize: contextInfo.contextSize,
                    vocabSize: contextInfo.vocabSize
                }
            };
            const loadedModel = {
                id: modelId,
                info: modelInfo,
                adapter: this,
                generate: this.createGenerateFunction(modelId),
                chat: this.createChatFunction(modelId),
                embed: this.createEmbedFunction(modelId)
            };
            return loadedModel;
        }
        catch (error) {
            throw new Error(`Failed to load GGUF model: ${error}`);
        }
    }
    async unloadModel(modelId) {
        const context = this.loadedContexts.get(modelId);
        if (context) {
            try {
                context.context?.dispose?.();
                context.model?.dispose?.();
            }
            catch (error) {
                console.warn(`Error disposing model ${modelId}:`, error);
            }
            this.loadedContexts.delete(modelId);
        }
    }
    getCapabilities() {
        return {
            supportsStreaming: true,
            supportsGPU: true,
            supportsQuantization: ['2bit', '4bit', '8bit', 'fp16', 'fp32'],
            maxContextLength: 32768,
            supportedFormats: ['gguf']
        };
    }
    createGenerateFunction(modelId) {
        const self = this;
        return async function* (prompt, options = {}) {
            const context = self.loadedContexts.get(modelId);
            if (!context) {
                throw new Error(`Model ${modelId} not found`);
            }
            try {
                const session = new self.llamaCpp.LlamaChat({
                    context: context.context
                });
                const stopSequences = options.stopSequences || ['</s>', '<|end|>', '<|endoftext|>'];
                let totalTokens = 0;
                const maxTokens = options.maxTokens || 512;
                const responseIterator = session.prompt(prompt, {
                    temperature: options.temperature || context.context.temperature,
                    topP: options.topP || context.context.topP,
                    topK: options.topK || context.context.topK,
                    maxTokens,
                    stopSequences
                });
                for await (const token of responseIterator) {
                    if (totalTokens >= maxTokens)
                        break;
                    const tokenText = token.text || token;
                    if (stopSequences.some(seq => tokenText.includes(seq))) {
                        break;
                    }
                    totalTokens++;
                    yield tokenText;
                }
            }
            catch (error) {
                throw new Error(`Generation failed: ${error}`);
            }
        };
    }
    createChatFunction(modelId) {
        const self = this;
        return async function* (messages, options = {}) {
            const context = self.loadedContexts.get(modelId);
            if (!context) {
                throw new Error(`Model ${modelId} not found`);
            }
            try {
                const session = new self.llamaCpp.LlamaChat({
                    context: context.context
                });
                const chatHistory = messages.map(msg => ({
                    type: msg.role === 'user' ? 'user' : 'model',
                    text: msg.content
                }));
                const lastMessage = messages[messages.length - 1];
                if (lastMessage.role !== 'user') {
                    throw new Error('Last message must be from user');
                }
                const stopSequences = options.stopSequences || ['</s>', '<|end|>', '<|endoftext|>'];
                let totalTokens = 0;
                const maxTokens = options.maxTokens || 512;
                const responseIterator = session.prompt(lastMessage.content, {
                    temperature: options.temperature || context.context.temperature,
                    topP: options.topP || context.context.topP,
                    topK: options.topK || context.context.topK,
                    maxTokens,
                    stopSequences,
                    systemMessage: messages.find(m => m.role === 'system')?.content
                });
                for await (const token of responseIterator) {
                    if (totalTokens >= maxTokens)
                        break;
                    const tokenText = token.text || token;
                    if (stopSequences.some(seq => tokenText.includes(seq))) {
                        break;
                    }
                    totalTokens++;
                    yield tokenText;
                }
            }
            catch (error) {
                throw new Error(`Chat completion failed: ${error}`);
            }
        };
    }
    createEmbedFunction(modelId) {
        return async (input, options = {}) => {
            const context = this.loadedContexts.get(modelId);
            if (!context) {
                throw new Error(`Model ${modelId} not found`);
            }
            if (typeof input !== 'string') {
                throw new Error('GGUF models only support text embeddings');
            }
            try {
                const embeddings = await context.context.getEmbedding(input);
                if (options.normalize) {
                    const norm = Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0));
                    if (norm > 0) {
                        for (let i = 0; i < embeddings.length; i++) {
                            embeddings[i] /= norm;
                        }
                    }
                }
                return new Float32Array(embeddings);
            }
            catch (error) {
                throw new Error(`Embedding generation failed: ${error}`);
            }
        };
    }
}
exports.GGUFAdapter = GGUFAdapter;
//# sourceMappingURL=GGUFAdapter.js.map