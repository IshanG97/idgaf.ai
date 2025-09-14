"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelManager = void 0;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ModelManager {
    constructor(cachePath = './models', maxCacheSize = 2 * 1024 * 1024 * 1024) {
        this.cachePath = cachePath;
        this.maxCacheSize = maxCacheSize;
        this.ensureCacheDirectory();
    }
    ensureCacheDirectory() {
        if (!fs.existsSync(this.cachePath)) {
            fs.mkdirSync(this.cachePath, { recursive: true });
        }
    }
    async downloadModel(url, modelInfo, options = {}) {
        const fileName = path.basename(url) || `${modelInfo.name}.${modelInfo.format}`;
        const modelPath = path.join(this.cachePath, fileName);
        if (fs.existsSync(modelPath)) {
            if (options.validateChecksum && await this.validateChecksum(modelPath, modelInfo.checksum)) {
                return modelPath;
            }
        }
        return this.downloadWithProgress(url, modelPath, options);
    }
    async downloadWithProgress(url, filePath, options) {
        const { onProgress, timeout = 300000, retries = 3 } = options;
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                if (typeof fetch === 'undefined') {
                    throw new Error('Fetch not available - please use in a browser or Node 18+ environment');
                }
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/octet-stream'
                    }
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const totalSize = parseInt(response.headers.get('content-length') || '0');
                let downloadedSize = 0;
                const reader = response.body?.getReader();
                if (!reader)
                    throw new Error('Response body not available');
                const chunks = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done)
                        break;
                    chunks.push(value);
                    downloadedSize += value.length;
                    if (onProgress && totalSize > 0) {
                        const progress = (downloadedSize / totalSize) * 100;
                        onProgress(progress, `Downloaded ${this.formatBytes(downloadedSize)}/${this.formatBytes(totalSize)}`);
                    }
                }
                const fileData = new Uint8Array(downloadedSize);
                let offset = 0;
                for (const chunk of chunks) {
                    fileData.set(chunk, offset);
                    offset += chunk.length;
                }
                fs.writeFileSync(filePath, fileData);
                return filePath;
            }
            catch (error) {
                if (attempt === retries - 1)
                    throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
        throw new Error(`Failed to download model after ${retries} attempts`);
    }
    async validateChecksum(filePath, expectedChecksum) {
        return new Promise((resolve, reject) => {
            const hash = (0, crypto_1.createHash)('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('error', reject);
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => {
                const actualChecksum = hash.digest('hex');
                resolve(actualChecksum === expectedChecksum);
            });
        });
    }
    async getModelInfo(modelPath) {
        if (!fs.existsSync(modelPath))
            return null;
        const stats = fs.statSync(modelPath);
        const extension = path.extname(modelPath).toLowerCase();
        let format;
        switch (extension) {
            case '.gguf':
                format = 'gguf';
                break;
            case '.tflite':
                format = 'tflite';
                break;
            case '.onnx':
                format = 'onnx';
                break;
            case '.pte':
                format = 'pte';
                break;
            default: return null;
        }
        const checksum = await new Promise((resolve, reject) => {
            const hash = (0, crypto_1.createHash)('sha256');
            const stream = fs.createReadStream(modelPath);
            stream.on('error', reject);
            stream.on('data', chunk => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
        });
        return {
            name: path.basename(modelPath, extension),
            format,
            type: this.inferModelType(modelPath),
            size: stats.size,
            version: '1.0.0',
            checksum,
            metadata: {}
        };
    }
    inferModelType(modelPath) {
        const fileName = path.basename(modelPath).toLowerCase();
        if (fileName.includes('llama') || fileName.includes('gpt') || fileName.includes('chat') || fileName.includes('instruct')) {
            return 'llm';
        }
        if (fileName.includes('whisper') || fileName.includes('speech') || fileName.includes('audio')) {
            return 'audio';
        }
        if (fileName.includes('clip') || fileName.includes('vision') || fileName.includes('image') || fileName.includes('mobilenet')) {
            return 'vision';
        }
        if (fileName.includes('embed') || fileName.includes('sentence')) {
            return 'embedding';
        }
        return 'llm';
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    async clearCache() {
        const files = fs.readdirSync(this.cachePath);
        for (const file of files) {
            const filePath = path.join(this.cachePath, file);
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        }
    }
    getCacheStats() {
        const files = fs.readdirSync(this.cachePath);
        let totalSize = 0;
        let fileCount = 0;
        for (const file of files) {
            const filePath = path.join(this.cachePath, file);
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
                totalSize += stats.size;
                fileCount++;
            }
        }
        return { totalSize, fileCount };
    }
}
exports.ModelManager = ModelManager;
//# sourceMappingURL=ModelManager.js.map