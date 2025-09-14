import { ModelInfo, ModelDownloadOptions, ProgressCallback, CacheManager } from '../types';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export class ModelManager {
  private cachePath: string;
  private maxCacheSize: number;
  private cacheManager?: CacheManager;

  constructor(cachePath: string = './models', maxCacheSize: number = 2 * 1024 * 1024 * 1024) {
    this.cachePath = cachePath;
    this.maxCacheSize = maxCacheSize;
    this.ensureCacheDirectory();
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cachePath)) {
      fs.mkdirSync(this.cachePath, { recursive: true });
    }
  }

  async downloadModel(
    url: string,
    modelInfo: ModelInfo,
    options: ModelDownloadOptions = {}
  ): Promise<string> {
    const fileName = path.basename(url) || `${modelInfo.name}.${modelInfo.format}`;
    const modelPath = path.join(this.cachePath, fileName);

    if (fs.existsSync(modelPath)) {
      if (options.validateChecksum && await this.validateChecksum(modelPath, modelInfo.checksum)) {
        return modelPath;
      }
    }

    return this.downloadWithProgress(url, modelPath, options);
  }

  private async downloadWithProgress(
    url: string,
    filePath: string,
    options: ModelDownloadOptions
  ): Promise<string> {
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
        if (!reader) throw new Error('Response body not available');

        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

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

      } catch (error) {
        if (attempt === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    throw new Error(`Failed to download model after ${retries} attempts`);
  }

  private async validateChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => {
        const actualChecksum = hash.digest('hex');
        resolve(actualChecksum === expectedChecksum);
      });
    });
  }

  async getModelInfo(modelPath: string): Promise<ModelInfo | null> {
    if (!fs.existsSync(modelPath)) return null;

    const stats = fs.statSync(modelPath);
    const extension = path.extname(modelPath).toLowerCase();

    let format: ModelInfo['format'];
    switch (extension) {
      case '.gguf': format = 'gguf'; break;
      case '.tflite': format = 'tflite'; break;
      case '.onnx': format = 'onnx'; break;
      case '.pte': format = 'pte'; break;
      default: return null;
    }

    const checksum = await new Promise<string>((resolve, reject) => {
      const hash = createHash('sha256');
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

  private inferModelType(modelPath: string): ModelInfo['type'] {
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

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async clearCache(): Promise<void> {
    const files = fs.readdirSync(this.cachePath);
    for (const file of files) {
      const filePath = path.join(this.cachePath, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
  }

  getCacheStats(): { totalSize: number; fileCount: number } {
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