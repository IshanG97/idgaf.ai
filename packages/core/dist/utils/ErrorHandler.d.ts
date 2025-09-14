export declare enum ErrorCode {
    MODEL_NOT_FOUND = "MODEL_NOT_FOUND",
    MODEL_LOAD_FAILED = "MODEL_LOAD_FAILED",
    INFERENCE_FAILED = "INFERENCE_FAILED",
    UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
    INVALID_INPUT = "INVALID_INPUT",
    MEMORY_ERROR = "MEMORY_ERROR",
    TIMEOUT_ERROR = "TIMEOUT_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR",
    HARDWARE_ERROR = "HARDWARE_ERROR",
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
}
export declare class AIError extends Error {
    readonly code: ErrorCode;
    readonly details?: Record<string, any>;
    readonly recoverable: boolean;
    constructor(code: ErrorCode, message: string, details?: Record<string, any>, recoverable?: boolean);
    static modelNotFound(modelId: string): AIError;
    static modelLoadFailed(modelPath: string, cause: Error): AIError;
    static inferenceFailed(operation: string, cause: Error): AIError;
    static unsupportedFormat(format: string, supportedFormats: string[]): AIError;
    static invalidInput(expectedType: string, actualType: string): AIError;
    static memoryError(requiredMB: number, availableMB: number): AIError;
    static timeoutError(operation: string, timeoutMs: number): AIError;
    static networkError(url: string, cause: Error): AIError;
    static hardwareError(message: string, hardwareInfo?: any): AIError;
    static configurationError(setting: string, value: any, reason: string): AIError;
}
export declare class ErrorHandler {
    private static retryableErrors;
    static isRetryable(error: Error): boolean;
    static withRetry<T>(operation: () => Promise<T>, maxRetries?: number, backoffMs?: number): Promise<T>;
    static getErrorSuggestion(error: Error): string;
    static formatError(error: Error): {
        message: string;
        code?: string;
        details?: Record<string, any>;
        suggestion: string;
        recoverable?: boolean;
    };
    static logError(error: Error, context?: Record<string, any>): void;
}
//# sourceMappingURL=ErrorHandler.d.ts.map