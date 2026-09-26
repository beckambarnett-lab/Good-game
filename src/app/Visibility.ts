// Page visibility (Plan Part 2.11): the sim pauses while the tab is hidden, audio ducks or stops,
// and `pagehide` gets a best-effort autosave. Sources are injected so tests can drive them.

import { EventBus } from '../core/EventBus.ts';

export interface VisibilitySource {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', fn: () => void): void;
  removeEventListener(type: 'visibilitychange', fn: () => void): void;
}

export interface PageHideSource {
  addEventListener(type: 'pagehide', fn: () => void): void;
  removeEventListener(type: 'pagehide', fn: () => void): void;
}

export type VisibilityEvents = {
  hidden: undefined;
  visible: undefined;
  /** The page is being unloaded or frozen: save now, it may be the last chance. */
  pagehide: undefined;
};

export class Visibility {
  readonly events = new EventBus<VisibilityEvents>();
  private readonly doc: VisibilitySource;
  private readonly page: PageHideSource;
  private wasHidden: boolean;

  constructor(doc: VisibilitySource, page: PageHideSource) {
    this.doc = doc;
    this.page = page;
    this.wasHidden = doc.visibilityState === 'hidden';
    doc.addEventListener('visibilitychange', this.onChange);
    page.addEventListener('pagehide', this.onPageHide);
  }

  get hidden(): boolean {
    return this.doc.visibilityState === 'hidden';
  }

  dispose(): void {
    this.doc.removeEventListener('visibilitychange', this.onChange);
    this.page.removeEventListener('pagehide', this.onPageHide);
    this.events.clear();
  }

  private readonly onChange = (): void => {
    const hidden = this.hidden;
    if (hidden === this.wasHidden) return;
    this.wasHidden = hidden;
    this.events.emit(hidden ? 'hidden' : 'visible', undefined);
  };

  private readonly onPageHide = (): void => {
    this.events.emit('pagehide', undefined);
  };
}
