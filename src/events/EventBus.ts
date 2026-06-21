// Winziges typisiertes Pub/Sub. Systeme und UI kommunizieren entkoppelt.

type Handler<T> = (payload: T) => void;

export class EventBus<E extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof E, Set<Handler<unknown>>>();

  /** Abonnieren. Gibt eine Unsubscribe-Funktion zurück. */
  on<K extends keyof E>(type: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as Handler<unknown>);
    return () => {
      set?.delete(handler as Handler<unknown>);
    };
  }

  emit<K extends keyof E>(type: K, payload: E[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    // Über eine Kopie iterieren: Handler dürfen sich beim Emit ab-/anmelden.
    for (const handler of [...set]) {
      (handler as Handler<E[K]>)(payload);
    }
  }

  /** Alle Abos lösen (z. B. beim Dispose). */
  clear(): void {
    this.handlers.clear();
  }
}
