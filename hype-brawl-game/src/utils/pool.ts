export class ObjectPool<T> {
  private readonly free: T[] = [];
  private readonly created: T[] = [];

  constructor(
    private readonly factory: () => T,
    private readonly reset: (item: T) => void,
    prewarm = 0,
  ) {
    for (let i = 0; i < prewarm; i++) {
      const item = this.factory();
      this.reset(item);
      this.free.push(item);
      this.created.push(item);
    }
  }

  acquire(): T {
    const item = this.free.pop() ?? this.factory();
    if (!this.created.includes(item)) this.created.push(item);
    return item;
  }

  release(item: T): void {
    this.reset(item);
    if (!this.free.includes(item)) this.free.push(item);
  }

  get all(): readonly T[] {
    return this.created;
  }

  get available(): number {
    return this.free.length;
  }
}
