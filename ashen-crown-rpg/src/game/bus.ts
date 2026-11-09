type Handler<T = unknown> = (payload: T) => void;

/**
 * A tiny, framework-free event bus used to talk to the Phaser scenes without
 * coupling the renderer to React or to the game store.
 */
class GameBus {
  private listeners = new Map<string, Set<Handler>>();

  on<T = unknown>(event: string, handler: Handler<T>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as Handler);
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: Handler<T>): void {
    this.listeners.get(event)?.delete(handler as Handler);
  }

  emit<T = unknown>(event: string, payload?: T): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[game-bus] handler for "${event}" failed`, error);
      }
    });
  }
}

export const gameBus = new GameBus();

export interface StickVector {
  x: number;
  y: number;
}

export interface TilePoint {
  x: number;
  y: number;
}
