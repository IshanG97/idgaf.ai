import { AIConfig, ModelOptions, GenerateOptions, ChatMessage, ChatOptions, ClassifyOptions, ClassificationResult, DetectionResult, SegmentationResult, TranscriptionOptions, TranscriptionResult, SynthesisOptions, EmbeddingOptions, Tensor, LoadedModel, PerformanceMetrics, HardwareInfo } from './types';
export declare class UnifiedAI {
    private registry;
    private modelManager;
    private config;
    private hardware;
    private performanceMetrics;
    constructor(config?: AIConfig);
    private initializeHardware;
    loadModel(pathOrUrl: string, options?: ModelOptions): Promise<LoadedModel>;
    generate(prompt: string, options?: GenerateOptions): AsyncGenerator<string>;
    chat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>;
    classify(image: Tensor, options?: ClassifyOptions): Promise<ClassificationResult>;
    detect(image: Tensor, options?: any): Promise<DetectionResult>;
    segment(image: Tensor, options?: any): Promise<SegmentationResult>;
    transcribe(audio: Tensor, options?: TranscriptionOptions): Promise<TranscriptionResult>;
    synthesize(text: string, options?: SynthesisOptions): Promise<ArrayBuffer>;
    embed(input: string | Tensor, options?: EmbeddingOptions): Promise<Float32Array>;
    run(input: any, options?: any): Promise<any>;
    getLoadedModels(): LoadedModel[];
    unloadModel(modelId: string): Promise<void>;
    getPerformanceMetrics(modelId?: string): PerformanceMetrics | Map<string, PerformanceMetrics>;
    getHardwareInfo(): HardwareInfo | null;
    private getCompatibleModels;
    private updatePerformanceMetrics;
    private inferModelInfoFromUrl;
    private log;
}
//# sourceMappingURL=UnifiedAI.d.ts.map