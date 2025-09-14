export declare class StreamController<T> {
    private _controller;
    private _stream;
    private _closed;
    constructor();
    get stream(): ReadableStream<T>;
    push(value: T): boolean;
    close(): void;
    error(reason?: any): void;
    get isClosed(): boolean;
}
export declare class BackpressureHandler {
    private pending;
    private maxPending;
    private waitingResolvers;
    constructor(maxPending?: number);
    acquire(): Promise<void>;
    release(): void;
    get pendingCount(): number;
    get waitingCount(): number;
}
export declare class TokenBuffer {
    private buffer;
    private maxSize;
    constructor(maxSize?: number);
    add(token: string): void;
    getAll(): string[];
    getText(): string;
    getLastN(n: number): string[];
    clear(): void;
    get length(): number;
}
export declare function streamWithTimeout<T>(generator: AsyncGenerator<T>, timeoutMs: number): AsyncGenerator<T>;
export declare function transformStream<T, R>(generator: AsyncGenerator<T>, transform: (value: T) => R | Promise<R>): AsyncGenerator<R>;
export declare function bufferStream<T>(generator: AsyncGenerator<T>, bufferSize: number): AsyncGenerator<T[]>;
export declare class StreamCancellation {
    private _cancelled;
    private _onCancel;
    cancel(): void;
    onCancel(callback: () => void): void;
    get isCancelled(): boolean;
    throwIfCancelled(): void;
}
//# sourceMappingURL=StreamingUtils.d.ts.map