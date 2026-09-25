// The dev overlay (Plan Parts 7.3 and 7.8; F3, or `?dev=1`): frame, GPU and CPU times, draw calls
// and triangles per pass, heap and memory estimates, each against its budget, then the clock,
// position and the cheats. Readings refresh four times a second; the worst frame is tracked every
// frame so a single hitch still shows.

import { keyboardBindings } from '../data/bindings.ts';
import { frameBudget, renderBudget } from '../data/tuning.ts';
import type { Place } from '../data/world/places.ts';
import type { Cheats } from './Cheats.ts';

export interface DevReadings {
  fps: number;
  frameMs: number;
  /** GPU time of a recent frame, or null without a GPU timer. */
  gpuMs: number | null;
  stepMs: number;
  stepsPerFrame: number;
  renderMs: number;
  mainCalls: number;
  mainTriangles: number;
  shadowCalls: number;
  shadowTriangles: number;
  postCalls: number;
  /** Chrome reports the JS heap; other browsers don't. */
  heapMB: number | null;
  targetsMB: number;
  pcmMB: number;
  renderScale: number;
  quality: string;
  time: string;
  where: string;
}

export type BudgetStatus = 'ok' | 'near' | 'over';

export interface BudgetRow {
  label: string;
  value: string;
  budget: string;
  status: BudgetStatus;
}

/** Past this fraction of a budget, a reading shows as close to it. */
const NEAR = 0.9;
/** How often the text refreshes (s), and how long the worst frame is remembered (s). */
const REFRESH_SECONDS = 0.25;
const WORST_WINDOW = 2;

const statusOf = (value: number, budget: number): BudgetStatus =>
  value > budget ? 'over' : value > budget * NEAR ? 'near' : 'ok';
const worse = (a: BudgetStatus, b: BudgetStatus): BudgetStatus =>
  a === 'over' || b === 'over' ? 'over' : a === 'near' || b === 'near' ? 'near' : 'ok';
const ms = (v: number) => `${v.toFixed(1)} ms`;
const count = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(2)} M` : v >= 1e4 ? `${Math.round(v / 1e3)} k` : String(Math.round(v));

/** Every budgeted reading with its Plan 7.8 budget and how close it is. Pure, so it's tested. */
export function budgetRows(r: DevReadings, worstMs: number): BudgetRow[] {
  const b = frameBudget;
  return [
    {
      label: 'Frame',
      value: `${ms(r.frameMs)} · ${Math.round(r.fps)} fps`,
      budget: ms(b.frameMs),
      status: statusOf(r.frameMs, b.frameMs),
    },
    {
      label: 'Worst frame',
      value: ms(worstMs),
      budget: ms(b.worstFrameMs),
      status: statusOf(worstMs, b.worstFrameMs),
    },
    r.gpuMs === null
      ? { label: 'GPU', value: 'no timer here', budget: ms(b.frameMs), status: 'ok' }
      : { label: 'GPU', value: ms(r.gpuMs), budget: ms(b.frameMs), status: statusOf(r.gpuMs, b.frameMs) },
    {
      label: 'Sim step',
      value: `${r.stepMs.toFixed(2)} ms × ${r.stepsPerFrame}`,
      budget: ms(b.simStepMs),
      status: statusOf(r.stepMs, b.simStepMs),
    },
    {
      label: 'Render CPU',
      value: ms(r.renderMs),
      budget: ms(b.renderCpuMs),
      status: statusOf(r.renderMs, b.renderCpuMs),
    },
    {
      label: 'Main pass',
      value: `${r.mainCalls} draws · ${count(r.mainTriangles)} tris`,
      budget: `${renderBudget.mainCalls} · ${count(renderBudget.mainTriangles)}`,
      status: worse(
        statusOf(r.mainCalls, renderBudget.mainCalls),
        statusOf(r.mainTriangles, renderBudget.mainTriangles),
      ),
    },
    {
      label: 'Shadow pass',
      value: `${r.shadowCalls} draws · ${count(r.shadowTriangles)} tris`,
      budget: `${renderBudget.shadowCalls} · ${count(renderBudget.shadowTriangles)}`,
      status: worse(
        statusOf(r.shadowCalls, renderBudget.shadowCalls),
        statusOf(r.shadowTriangles, renderBudget.shadowTriangles),
      ),
    },
    r.heapMB === null
      ? { label: 'JS heap', value: 'not reported here', budget: `${b.heapMB} MB`, status: 'ok' }
      : {
          label: 'JS heap',
          value: `${Math.round(r.heapMB)} MB`,
          budget: `${b.heapMB} MB`,
          status: statusOf(r.heapMB, b.heapMB),
        },
    {
      label: 'GPU targets (est.)',
      value: `${Math.round(r.targetsMB)} MB`,
      budget: `${b.gpuTargetsMB} MB`,
      status: statusOf(r.targetsMB, b.gpuTargetsMB),
    },
    {
      label: 'Audio PCM',
      value: `${r.pcmMB.toFixed(1)} MB`,
      budget: `${b.audioPcmMB} MB`,
      status: statusOf(r.pcmMB, b.audioPcmMB),
    },
  ];
}

const STYLE = `
.dev-overlay { position: absolute; top: 12px; left: 12px; z-index: 5; max-width: calc(100% - 24px);
  background: rgba(11, 19, 48, 0.82); color: #e8eef8; border-radius: 8px; padding: 10px 12px;
  font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; display: grid; gap: 8px; }
.dev-overlay[hidden] { display: none; }
.dev-overlay table { border-collapse: collapse; font-variant-numeric: tabular-nums; }
.dev-overlay td { padding: 0 10px 0 0; white-space: nowrap; }
.dev-overlay td.budget { color: #9aa8c4; }
.dev-overlay tr.near td.value { color: #f2c14e; }
.dev-overlay tr.over td.value { color: #ff7b7b; font-weight: 700; }
.dev-overlay tr.ok td.value { color: #9be29b; }
.dev-overlay .info { color: #c9d4ea; white-space: pre; }
.dev-overlay .cheats { display: flex; flex-wrap: wrap; gap: 4px; }
.dev-overlay button { font: inherit; color: #0b1330; background: #e8eef8; border: 0; border-radius: 4px;
  padding: 2px 7px; cursor: pointer; }
.dev-overlay button:focus-visible { outline: 2px solid #f2c14e; outline-offset: 1px; }
.dev-overlay .title { color: #9aa8c4; }
`;

export class DevOverlay {
  readonly root: HTMLDivElement;
  private readonly read: () => DevReadings;
  private readonly table: HTMLTableElement;
  private readonly info: HTMLDivElement;
  /** Recent frames: when each ended (ms) and how long it took (ms), unclamped. */
  private readonly frames: { at: number; ms: number }[] = [];
  private lastFrameAt = 0;
  private refreshIn = 0;
  private readonly onKey: (e: KeyboardEvent) => void;

  constructor(
    host: HTMLElement,
    read: () => DevReadings,
    cheats: Cheats,
    places: readonly Place[],
    visible: boolean,
  ) {
    this.read = read;
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.root = document.createElement('div');
    this.root.className = 'dev-overlay';
    this.root.hidden = !visible;
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = `Dev · ${keyboardBindings.buttons.devOverlay.join('/')} hides · budgets: Plan 7.8, Medium`;
    this.table = document.createElement('table');
    this.info = document.createElement('div');
    this.info.className = 'info';
    const buttons = document.createElement('div');
    buttons.className = 'cheats';
    const add = (label: string, fn: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', () => {
        fn();
        b.blur();
        this.refresh();
      });
      buttons.append(b);
    };
    add('+1 h', () => cheats.addHours(1));
    add('Dawn', () => cheats.skipTo(7));
    add('Noon', () => cheats.skipTo(12));
    add('Dusk', () => cheats.skipTo(17));
    add('Night', () => cheats.skipTo(22));
    add('Freeze clock', () => cheats.toggleFreeze());
    add('Pace', () => cheats.cyclePace());
    for (const p of places) add(p.label, () => cheats.goTo(p.id));
    this.root.append(style, title, this.table, this.info, buttons);
    host.append(this.root);
    this.onKey = (e) => {
      if (!keyboardBindings.buttons.devOverlay.includes(e.code)) return;
      e.preventDefault(); // F3 would open the browser's find bar
      this.toggle();
    };
    window.addEventListener('keydown', this.onKey);
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  toggle(): void {
    this.root.hidden = !this.root.hidden;
    if (this.visible) this.refresh();
  }

  /**
   * Called every rendered frame. Measures the real interval itself: the loop clamps the frame time
   * it hands to the game, which would hide exactly the long hitches this should show.
   */
  frame(): void {
    const now = performance.now();
    const ms = this.lastFrameAt > 0 ? now - this.lastFrameAt : 0;
    this.lastFrameAt = now;
    this.frames.push({ at: now, ms });
    while ((this.frames[0]?.at ?? now) < now - WORST_WINDOW * 1000) this.frames.shift();
    this.refreshIn -= ms / 1000;
    if (this.refreshIn <= 0 && this.visible) this.refresh();
  }

  /** The longest frame (ms) of the last two seconds. */
  worstMs(): number {
    let worst = 0;
    for (const f of this.frames) worst = Math.max(worst, f.ms);
    return worst;
  }

  private refresh(): void {
    this.refreshIn = REFRESH_SECONDS;
    const r = this.read();
    const rows = budgetRows(r, this.worstMs());
    this.table.replaceChildren(
      ...rows.map((row) => {
        const tr = document.createElement('tr');
        tr.className = row.status;
        for (const [cls, text] of [
          ['label', row.label],
          ['value', row.value],
          ['budget', `≤ ${row.budget}`],
        ] as const) {
          const td = document.createElement('td');
          td.className = cls;
          td.textContent = text;
          tr.append(td);
        }
        return tr;
      }),
    );
    this.info.textContent = [
      `Render scale ${Math.round(r.renderScale * 100)}% · ${r.quality}`,
      `Post passes ${r.postCalls} draws`,
      r.time,
      r.where,
    ].join('\n');
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}
