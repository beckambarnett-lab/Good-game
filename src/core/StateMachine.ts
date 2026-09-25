// A small finite-state machine with an explicit transition table (Plan Part 7.3). Illegal
// transitions throw, so flow bugs surface in tests rather than as odd screens.

export type Transitions<S extends string> = { readonly [K in S]: readonly S[] };

export class IllegalTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Illegal transition ${from} → ${to}`);
    this.name = 'IllegalTransitionError';
  }
}

export class StateMachine<S extends string> {
  private state: S;
  private previous: S | null = null;
  private readonly table: Transitions<S>;
  private readonly listeners = new Set<(from: S, to: S) => void>();

  constructor(initial: S, table: Transitions<S>) {
    this.state = initial;
    this.table = table;
  }

  get current(): S {
    return this.state;
  }

  /** The state before the current one (what Paused resumes to). */
  get last(): S | null {
    return this.previous;
  }

  can(to: S): boolean {
    return this.table[this.state].includes(to);
  }

  go(to: S): void {
    if (!this.can(to)) throw new IllegalTransitionError(this.state, to);
    const from = this.state;
    this.previous = from;
    this.state = to;
    for (const fn of [...this.listeners]) fn(from, to);
  }

  /** Returns to the previous state, if that transition is allowed. */
  back(): boolean {
    if (this.previous === null || !this.can(this.previous)) return false;
    this.go(this.previous);
    return true;
  }

  /** Subscribes to transitions; returns the unsubscribe function. */
  onChange(fn: (from: S, to: S) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
