export interface Tensor {
  data: Float32Array | Uint8Array | Int32Array;
  shape: number[];
  dtype: 'float32' | 'uint8' | 'int32';
}

export interface AIConfig {
  modelCachePath?: string;
  maxCacheSize?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  enableTelemetry?: boolean;
  hardware?: {
    preferGPU?: boolean;
    preferNPU?: boolean;
    maxMemoryMB?: number;
  };
}

export interface ModelOptions {
  quantization?: '2bit' | '4bit' | '8bit' | 'fp16' | 'fp32';
  contextLength?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  cacheEnabled?: boolean;
}

export interface GenerateOptions extends ModelOptions {
  stream?: boolean;
  stopSequences?: string[];
  seed?: number;
  systemPrompt?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ChatOptions extends GenerateOptions {
  messages?: ChatMessage[];
  conversationId?: string;
}

export interface ClassifyOptions {
  topK?: number;
  threshold?: number;
  includeEmbeddings?: boolean;
}

export interface Classification {
  label: string;
  confidence: number;
  index: number;
}

export interface ClassificationResult {
  predictions: Classification[];
  top(k: number): Classification[];
  embeddings?: Float32Array;
}

export interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
  labelId: number;
}

export interface DetectionResult {
  boxes: DetectionBox[];
  count: number;
}

export interface SegmentationResult {
  mask: Uint8Array;
  classes: number[];
  width: number;
  height: number;
}

export interface TranscriptionOptions {
  language?: string;
  enablePunctuation?: boolean;
  enableDiarization?: boolean;
  maxSpeakers?: number;
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
    speaker?: number;
  }>;
  language?: string;
  confidence: number;
}

export interface SynthesisOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: 'wav' | 'mp3' | 'pcm';
}

export interface EmbeddingOptions {
  normalize?: boolean;
  pooling?: 'mean' | 'cls' | 'max';
}

export interface ModelInfo {
  name: string;
  format: 'gguf' | 'tflite' | 'onnx' | 'pte';
  type: 'llm' | 'vision' | 'audio' | 'embedding';
  size: number;
  version: string;
  checksum: string;
  metadata?: Record<string, any>;
}

export interface ModelAdapter {
  readonly format: ModelInfo['format'];
  readonly supportedTypes: readonly ModelInfo['type'][];

  canHandle(modelPath: string, info?: ModelInfo): boolean;
  loadModel(modelPath: string, options?: ModelOptions): Promise<LoadedModel>;
  unloadModel(modelId: string): Promise<void>;
  getCapabilities(): AdapterCapabilities;
}

export interface LoadedModel {
  id: string;
  info: ModelInfo;
  adapter: ModelAdapter;

  generate?(prompt: string, options?: GenerateOptions): AsyncGenerator<string>;
  chat?(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>;
  classify?(input: Tensor, options?: ClassifyOptions): Promise<ClassificationResult>;
  detect?(input: Tensor, options?: any): Promise<DetectionResult>;
  segment?(input: Tensor, options?: any): Promise<SegmentationResult>;
  transcribe?(audio: Tensor, options?: TranscriptionOptions): Promise<TranscriptionResult>;
  synthesize?(text: string, options?: SynthesisOptions): Promise<ArrayBuffer>;
  embed?(input: string | Tensor, options?: EmbeddingOptions): Promise<Float32Array>;
  run?(input: any, options?: any): Promise<any>;
}

export interface AdapterCapabilities {
  supportsStreaming: boolean;
  supportsGPU: boolean;
  supportsQuantization: string[];
  maxContextLength?: number;
  supportedFormats: string[];
}

export interface ProgressCallback {
  (progress: number, status: string): void;
}

export interface ModelDownloadOptions {
  onProgress?: ProgressCallback;
  timeout?: number;
  retries?: number;
  validateChecksum?: boolean;
}

export interface CacheEntry {
  key: string;
  modelId: string;
  size: number;
  lastAccessed: Date;
  hitCount: number;
}

export interface CacheManager {
  get(key: string): Promise<LoadedModel | null>;
  set(key: string, model: LoadedModel): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<{
    totalSize: number;
    entryCount: number;
    hitRate: number;
  }>;
}

export interface HardwareInfo {
  platform: 'ios' | 'android' | 'web' | 'node';
  hasGPU: boolean;
  hasNPU: boolean;
  memoryMB: number;
  cores: number;
  architecture: string;
}

export interface PerformanceMetrics {
  tokensPerSecond?: number;
  inferenceTimeMs: number;
  memoryUsageMB: number;
  gpuUtilization?: number;
  modelLoadTimeMs?: number;
}