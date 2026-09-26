// GPU frame time from EXT_disjoint_timer_query_webgl2 where the browser offers it. Results arrive
// a few frames late and are discarded when the GPU reports a disjoint (a context switch or clock
// change). Where the extension is missing (many browsers, software rendering), `available` is false
// and dynamic resolution judges by the frame interval instead.

interface TimerQueryExt {
  readonly TIME_ELAPSED_EXT: number;
  readonly GPU_DISJOINT_EXT: number;
}

/** Queries in flight before new frames stop being measured (results lag 2–3 frames). */
const MAX_PENDING = 4;

export class GpuTimer {
  readonly available: boolean;
  private readonly gl: WebGL2RenderingContext;
  private readonly ext: TimerQueryExt | null;
  private readonly pending: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerQueryExt | null;
    this.available = this.ext !== null;
  }

  begin(): void {
    if (!this.ext || this.active || this.pending.length >= MAX_PENDING) return;
    const q = this.gl.createQuery();
    if (!q) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.active = q;
  }

  end(): void {
    if (!this.ext || !this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  /** The oldest finished measurement in ms, or null if none is ready (or it was disjoint). */
  poll(): number | null {
    const gl = this.gl;
    const q = this.pending[0];
    if (!this.ext || !q) return null;
    if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) return null;
    this.pending.shift();
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT) as boolean;
    const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
    gl.deleteQuery(q);
    return disjoint ? null : ns / 1e6;
  }

  dispose(): void {
    if (this.active && this.ext) this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    for (const q of this.pending) this.gl.deleteQuery(q);
    this.pending.length = 0;
    this.active = null;
  }
}
