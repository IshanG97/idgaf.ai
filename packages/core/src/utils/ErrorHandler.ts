export enum ErrorCode {
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_LOAD_FAILED = 'MODEL_LOAD_FAILED',
  INFERENCE_FAILED = 'INFERENCE_FAILED',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  INVALID_INPUT = 'INVALID_INPUT',
  MEMORY_ERROR = 'MEMORY_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  HARDWARE_ERROR = 'HARDWARE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

export class AIError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, any>;
  public readonly recoverable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    recoverable = false
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.details = details;
    this.recoverable = recoverable;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError);
    }
  }

  static modelNotFound(modelId: string): AIError {
    return new AIError(
      ErrorCode.MODEL_NOT_FOUND,
      `Model not found: ${modelId}`,
      { modelId },
      true
    );
  }

  static modelLoadFailed(modelPath: string, cause: Error): AIError {
    return new AIError(
      ErrorCode.MODEL_LOAD_FAILED,
      `Failed to load model: ${modelPath}`,
      { modelPath, cause: cause.message },
      true
    );
  }

  static inferenceFailed(operation: string, cause: Error): AIError {
    return new AIError(
      ErrorCode.INFERENCE_FAILED,
      `Inference failed for operation: ${operation}`,
      { operation, cause: cause.message },
      true
    );
  }

  static unsupportedFormat(format: string, supportedFormats: string[]): AIError {
    return new AIError(
      ErrorCode.UNSUPPORTED_FORMAT,
      `Unsupported model format: ${format}`,
      { format, supportedFormats },
      false
    );
  }

  static invalidInput(expectedType: string, actualType: string): AIError {
    return new AIError(
      ErrorCode.INVALID_INPUT,
      `Invalid input type. Expected: ${expectedType}, Got: ${actualType}`,
      { expectedType, actualType },
      true
    );
  }

  static memoryError(requiredMB: number, availableMB: number): AIError {
    return new AIError(
      ErrorCode.MEMORY_ERROR,
      `Insufficient memory. Required: ${requiredMB}MB, Available: ${availableMB}MB`,
      { requiredMB, availableMB },
      false
    );
  }

  static timeoutError(operation: string, timeoutMs: number): AIError {
    return new AIError(
      ErrorCode.TIMEOUT_ERROR,
      `Operation timed out: ${operation} (${timeoutMs}ms)`,
      { operation, timeoutMs },
      true
    );
  }

  static networkError(url: string, cause: Error): AIError {
    return new AIError(
      ErrorCode.NETWORK_ERROR,
      `Network error while accessing: ${url}`,
      { url, cause: cause.message },
      true
    );
  }

  static hardwareError(message: string, hardwareInfo?: any): AIError {
    return new AIError(
      ErrorCode.HARDWARE_ERROR,
      `Hardware error: ${message}`,
      { hardwareInfo },
      false
    );
  }

  static configurationError(setting: string, value: any, reason: string): AIError {
    return new AIError(
      ErrorCode.CONFIGURATION_ERROR,
      `Configuration error for ${setting}: ${reason}`,
      { setting, value, reason },
      true
    );
  }
}

export class ErrorHandler {
  private static retryableErrors = new Set([
    ErrorCode.MODEL_LOAD_FAILED,
    ErrorCode.INFERENCE_FAILED,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.NETWORK_ERROR
  ]);

  static isRetryable(error: Error): boolean {
    if (error instanceof AIError) {
      return error.recoverable && this.retryableErrors.has(error.code);
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('temporary')
    );
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    backoffMs = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries || !this.isRetryable(lastError)) {
          throw lastError;
        }

        const delay = backoffMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  static getErrorSuggestion(error: Error): string {
    if (!(error instanceof AIError)) {
      return 'Check the error message for more details.';
    }

    switch (error.code) {
      case ErrorCode.MODEL_NOT_FOUND:
        return 'Ensure the model is loaded before attempting inference. Use ai.loadModel() first.';

      case ErrorCode.MODEL_LOAD_FAILED:
        return 'Verify the model file exists and is in a supported format. Check file permissions and disk space.';

      case ErrorCode.INFERENCE_FAILED:
        return 'Verify input data format and dimensions match model requirements. Check model compatibility.';

      case ErrorCode.UNSUPPORTED_FORMAT:
        return `Supported formats: ${error.details?.supportedFormats?.join(', ') || 'gguf, tflite, onnx, pte'}`;

      case ErrorCode.INVALID_INPUT:
        return `Ensure input data is in the correct format: ${error.details?.expectedType}`;

      case ErrorCode.MEMORY_ERROR:
        return 'Free up memory by unloading unused models or reducing batch size/context length.';

      case ErrorCode.TIMEOUT_ERROR:
        return 'Increase timeout value or optimize model/hardware configuration for better performance.';

      case ErrorCode.NETWORK_ERROR:
        return 'Check internet connection and ensure the model URL is accessible.';

      case ErrorCode.HARDWARE_ERROR:
        return 'Verify hardware compatibility. Try disabling GPU acceleration if available.';

      case ErrorCode.CONFIGURATION_ERROR:
        return 'Review configuration values and ensure they are within valid ranges.';

      default:
        return 'Consult the documentation or check the error details for more information.';
    }
  }

  static formatError(error: Error): {
    message: string;
    code?: string;
    details?: Record<string, any>;
    suggestion: string;
    recoverable?: boolean;
  } {
    const suggestion = this.getErrorSuggestion(error);

    if (error instanceof AIError) {
      return {
        message: error.message,
        code: error.code,
        details: error.details,
        suggestion,
        recoverable: error.recoverable
      };
    }

    return {
      message: error.message,
      suggestion
    };
  }

  static logError(error: Error, context?: Record<string, any>): void {
    const formatted = this.formatError(error);

    console.error('AI SDK Error:', {
      ...formatted,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
  }
}