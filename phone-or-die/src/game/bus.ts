export interface StickVector {
  x: number;
  y: number;
}

type Listener = (payload: unknown) => void;

class TinyBus {
  private listeners = new Map<string, Set<Listener>>();

  on<T = unknown>(event: string, listener: (payload: T) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as Listener);
    return () => this.off(event, listener);
  }

  off<T = unknown>(event: string, listener: (payload: T) => void): void {
    this.listeners.get(event)?.delete(listener as Listener);
  }

  emit<T = unknown>(event: string, payload?: T): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[bus] ${event}`, error);
      }
    });
  }
}

export const gameBus = new TinyBus();
