"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = exports.AIError = exports.ErrorCode = void 0;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["MODEL_NOT_FOUND"] = "MODEL_NOT_FOUND";
    ErrorCode["MODEL_LOAD_FAILED"] = "MODEL_LOAD_FAILED";
    ErrorCode["INFERENCE_FAILED"] = "INFERENCE_FAILED";
    ErrorCode["UNSUPPORTED_FORMAT"] = "UNSUPPORTED_FORMAT";
    ErrorCode["INVALID_INPUT"] = "INVALID_INPUT";
    ErrorCode["MEMORY_ERROR"] = "MEMORY_ERROR";
    ErrorCode["TIMEOUT_ERROR"] = "TIMEOUT_ERROR";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["HARDWARE_ERROR"] = "HARDWARE_ERROR";
    ErrorCode["CONFIGURATION_ERROR"] = "CONFIGURATION_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class AIError extends Error {
    constructor(code, message, details, recoverable = false) {
        super(message);
        this.name = 'AIError';
        this.code = code;
        this.details = details;
        this.recoverable = recoverable;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AIError);
        }
    }
    static modelNotFound(modelId) {
        return new AIError(ErrorCode.MODEL_NOT_FOUND, `Model not found: ${modelId}`, { modelId }, true);
    }
    static modelLoadFailed(modelPath, cause) {
        return new AIError(ErrorCode.MODEL_LOAD_FAILED, `Failed to load model: ${modelPath}`, { modelPath, cause: cause.message }, true);
    }
    static inferenceFailed(operation, cause) {
        return new AIError(ErrorCode.INFERENCE_FAILED, `Inference failed for operation: ${operation}`, { operation, cause: cause.message }, true);
    }
    static unsupportedFormat(format, supportedFormats) {
        return new AIError(ErrorCode.UNSUPPORTED_FORMAT, `Unsupported model format: ${format}`, { format, supportedFormats }, false);
    }
    static invalidInput(expectedType, actualType) {
        return new AIError(ErrorCode.INVALID_INPUT, `Invalid input type. Expected: ${expectedType}, Got: ${actualType}`, { expectedType, actualType }, true);
    }
    static memoryError(requiredMB, availableMB) {
        return new AIError(ErrorCode.MEMORY_ERROR, `Insufficient memory. Required: ${requiredMB}MB, Available: ${availableMB}MB`, { requiredMB, availableMB }, false);
    }
    static timeoutError(operation, timeoutMs) {
        return new AIError(ErrorCode.TIMEOUT_ERROR, `Operation timed out: ${operation} (${timeoutMs}ms)`, { operation, timeoutMs }, true);
    }
    static networkError(url, cause) {
        return new AIError(ErrorCode.NETWORK_ERROR, `Network error while accessing: ${url}`, { url, cause: cause.message }, true);
    }
    static hardwareError(message, hardwareInfo) {
        return new AIError(ErrorCode.HARDWARE_ERROR, `Hardware error: ${message}`, { hardwareInfo }, false);
    }
    static configurationError(setting, value, reason) {
        return new AIError(ErrorCode.CONFIGURATION_ERROR, `Configuration error for ${setting}: ${reason}`, { setting, value, reason }, true);
    }
}
exports.AIError = AIError;
class ErrorHandler {
    static isRetryable(error) {
        if (error instanceof AIError) {
            return error.recoverable && this.retryableErrors.has(error.code);
        }
        const message = error.message.toLowerCase();
        return (message.includes('timeout') ||
            message.includes('network') ||
            message.includes('connection') ||
            message.includes('temporary'));
    }
    static async withRetry(operation, maxRetries = 3, backoffMs = 1000) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxRetries || !this.isRetryable(lastError)) {
                    throw lastError;
                }
                const delay = backoffMs * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }
    static getErrorSuggestion(error) {
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
    static formatError(error) {
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
    static logError(error, context) {
        const formatted = this.formatError(error);
        console.error('AI SDK Error:', {
            ...formatted,
            context,
            timestamp: new Date().toISOString(),
            stack: error.stack
        });
    }
}
exports.ErrorHandler = ErrorHandler;
ErrorHandler.retryableErrors = new Set([
    ErrorCode.MODEL_LOAD_FAILED,
    ErrorCode.INFERENCE_FAILED,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.NETWORK_ERROR
]);
//# sourceMappingURL=ErrorHandler.js.map