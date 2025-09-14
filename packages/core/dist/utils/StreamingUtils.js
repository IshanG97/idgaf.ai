"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamCancellation = exports.TokenBuffer = exports.BackpressureHandler = exports.StreamController = void 0;
exports.streamWithTimeout = streamWithTimeout;
exports.transformStream = transformStream;
exports.bufferStream = bufferStream;
class StreamController {
    constructor() {
        this._controller = null;
        this._closed = false;
        this._stream = new ReadableStream({
            start: (controller) => {
                this._controller = controller;
            },
            cancel: () => {
                this._closed = true;
            }
        });
    }
    get stream() {
        return this._stream;
    }
    push(value) {
        if (this._closed || !this._controller)
            return false;
        try {
            this._controller.enqueue(value);
            return true;
        }
        catch (error) {
            console.warn('Failed to enqueue value:', error);
            return false;
        }
    }
    close() {
        if (!this._closed && this._controller) {
            this._controller.close();
            this._closed = true;
        }
    }
    error(reason) {
        if (!this._closed && this._controller) {
            this._controller.error(reason);
            this._closed = true;
        }
    }
    get isClosed() {
        return this._closed;
    }
}
exports.StreamController = StreamController;
class BackpressureHandler {
    constructor(maxPending = 10) {
        this.pending = 0;
        this.waitingResolvers = [];
        this.maxPending = maxPending;
    }
    async acquire() {
        if (this.pending < this.maxPending) {
            this.pending++;
            return;
        }
        return new Promise((resolve) => {
            this.waitingResolvers.push(resolve);
        });
    }
    release() {
        this.pending--;
        const resolver = this.waitingResolvers.shift();
        if (resolver) {
            this.pending++;
            resolver();
        }
    }
    get pendingCount() {
        return this.pending;
    }
    get waitingCount() {
        return this.waitingResolvers.length;
    }
}
exports.BackpressureHandler = BackpressureHandler;
class TokenBuffer {
    constructor(maxSize = 100) {
        this.buffer = [];
        this.maxSize = maxSize;
    }
    add(token) {
        this.buffer.push(token);
        if (this.buffer.length > this.maxSize) {
            this.buffer.shift();
        }
    }
    getAll() {
        return [...this.buffer];
    }
    getText() {
        return this.buffer.join('');
    }
    getLastN(n) {
        return this.buffer.slice(-n);
    }
    clear() {
        this.buffer = [];
    }
    get length() {
        return this.buffer.length;
    }
}
exports.TokenBuffer = TokenBuffer;
async function* streamWithTimeout(generator, timeoutMs) {
    let timeoutId = null;
    let timeoutPromise = null;
    try {
        while (true) {
            timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`Stream timeout after ${timeoutMs}ms`));
                }, timeoutMs);
            });
            const nextPromise = generator.next();
            const result = await Promise.race([nextPromise, timeoutPromise]);
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (result.done) {
                break;
            }
            yield result.value;
        }
    }
    finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        try {
            await generator.return?.(undefined);
        }
        catch (error) {
            console.warn('Error closing generator:', error);
        }
    }
}
async function* transformStream(generator, transform) {
    try {
        for await (const value of generator) {
            yield await transform(value);
        }
    }
    catch (error) {
        throw error;
    }
}
async function* bufferStream(generator, bufferSize) {
    const buffer = [];
    try {
        for await (const value of generator) {
            buffer.push(value);
            if (buffer.length >= bufferSize) {
                yield [...buffer];
                buffer.length = 0;
            }
        }
        if (buffer.length > 0) {
            yield [...buffer];
        }
    }
    catch (error) {
        throw error;
    }
}
class StreamCancellation {
    constructor() {
        this._cancelled = false;
        this._onCancel = [];
    }
    cancel() {
        if (!this._cancelled) {
            this._cancelled = true;
            this._onCancel.forEach(callback => {
                try {
                    callback();
                }
                catch (error) {
                    console.warn('Error in cancel callback:', error);
                }
            });
        }
    }
    onCancel(callback) {
        if (this._cancelled) {
            callback();
        }
        else {
            this._onCancel.push(callback);
        }
    }
    get isCancelled() {
        return this._cancelled;
    }
    throwIfCancelled() {
        if (this._cancelled) {
            throw new Error('Stream was cancelled');
        }
    }
}
exports.StreamCancellation = StreamCancellation;
//# sourceMappingURL=StreamingUtils.js.map