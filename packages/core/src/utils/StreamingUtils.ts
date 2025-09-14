export class StreamController<T> {
  private _controller: ReadableStreamDefaultController<T> | null = null;
  private _stream: ReadableStream<T>;
  private _closed = false;

  constructor() {
    this._stream = new ReadableStream<T>({
      start: (controller) => {
        this._controller = controller;
      },
      cancel: () => {
        this._closed = true;
      }
    });
  }

  get stream(): ReadableStream<T> {
    return this._stream;
  }

  push(value: T): boolean {
    if (this._closed || !this._controller) return false;

    try {
      this._controller.enqueue(value);
      return true;
    } catch (error) {
      console.warn('Failed to enqueue value:', error);
      return false;
    }
  }

  close(): void {
    if (!this._closed && this._controller) {
      this._controller.close();
      this._closed = true;
    }
  }

  error(reason?: any): void {
    if (!this._closed && this._controller) {
      this._controller.error(reason);
      this._closed = true;
    }
  }

  get isClosed(): boolean {
    return this._closed;
  }
}

export class BackpressureHandler {
  private pending = 0;
  private maxPending: number;
  private waitingResolvers: Array<() => void> = [];

  constructor(maxPending = 10) {
    this.maxPending = maxPending;
  }

  async acquire(): Promise<void> {
    if (this.pending < this.maxPending) {
      this.pending++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitingResolvers.push(resolve);
    });
  }

  release(): void {
    this.pending--;

    const resolver = this.waitingResolvers.shift();
    if (resolver) {
      this.pending++;
      resolver();
    }
  }

  get pendingCount(): number {
    return this.pending;
  }

  get waitingCount(): number {
    return this.waitingResolvers.length;
  }
}

export class TokenBuffer {
  private buffer: string[] = [];
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  add(token: string): void {
    this.buffer.push(token);

    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getAll(): string[] {
    return [...this.buffer];
  }

  getText(): string {
    return this.buffer.join('');
  }

  getLastN(n: number): string[] {
    return this.buffer.slice(-n);
  }

  clear(): void {
    this.buffer = [];
  }

  get length(): number {
    return this.buffer.length;
  }
}

export async function* streamWithTimeout<T>(
  generator: AsyncGenerator<T>,
  timeoutMs: number
): AsyncGenerator<T> {
  let timeoutId: NodeJS.Timeout | null = null;
  let timeoutPromise: Promise<never> | null = null;

  try {
    while (true) {
      timeoutPromise = new Promise<never>((_, reject) => {
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
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    try {
      await generator.return?.(undefined as any);
    } catch (error) {
      console.warn('Error closing generator:', error);
    }
  }
}

export async function* transformStream<T, R>(
  generator: AsyncGenerator<T>,
  transform: (value: T) => R | Promise<R>
): AsyncGenerator<R> {
  try {
    for await (const value of generator) {
      yield await transform(value);
    }
  } catch (error) {
    throw error;
  }
}

export async function* bufferStream<T>(
  generator: AsyncGenerator<T>,
  bufferSize: number
): AsyncGenerator<T[]> {
  const buffer: T[] = [];

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
  } catch (error) {
    throw error;
  }
}

export class StreamCancellation {
  private _cancelled = false;
  private _onCancel: Array<() => void> = [];

  cancel(): void {
    if (!this._cancelled) {
      this._cancelled = true;
      this._onCancel.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.warn('Error in cancel callback:', error);
        }
      });
    }
  }

  onCancel(callback: () => void): void {
    if (this._cancelled) {
      callback();
    } else {
      this._onCancel.push(callback);
    }
  }

  get isCancelled(): boolean {
    return this._cancelled;
  }

  throwIfCancelled(): void {
    if (this._cancelled) {
      throw new Error('Stream was cancelled');
    }
  }
}