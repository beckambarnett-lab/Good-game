// Typed publish/subscribe (Plan Part 7.3). The sim emits events; view, audio and UI subscribe.
// Pure: no DOM, so the sim can use it in Node.

export type Listener<T> = (payload: T) => void;

export class EventBus<M extends object> {
  private readonly listeners = new Map<keyof M, Set<Listener<never>>>();

  /** Subscribes; returns the unsubscribe function. */
  on<K extends keyof M>(type: K, fn: Listener<M[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(fn as Listener<never>);
    return () => this.off(type, fn);
  }

  /** Subscribes for a single delivery. */
  once<K extends keyof M>(type: K, fn: Listener<M[K]>): () => void {
    const off = this.on(type, (payload) => {
      off();
      fn(payload);
    });
    return off;
  }

  off<K extends keyof M>(type: K, fn: Listener<M[K]>): void {
    this.listeners.get(type)?.delete(fn as Listener<never>);
  }

  /** Delivers to a snapshot of the listeners, so subscribing or leaving mid-emit is safe. */
  emit<K extends keyof M>(type: K, payload: M[K]): void {
    const set = this.listeners.get(type);
    if (!set || set.size === 0) return;
    for (const fn of [...set]) (fn as Listener<M[K]>)(payload);
  }

  listenerCount(type: keyof M): number {
    return this.listeners.get(type)?.size ?? 0;
  }

  clear(): void {
    this.listeners.clear();
  }
}
