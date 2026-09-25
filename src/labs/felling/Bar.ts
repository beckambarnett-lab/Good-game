// The swinging chop bar (user design). Hand-drawn paper strip with a green centre zone, a
// slim "perfect" band, a marker that sweeps back and forth, and pips counting chops.

const SVG = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/** A slightly wobbly rectangle path, so the bar looks inked by hand. */
function wobblyRect(x: number, y: number, w: number, h: number, seed: number): string {
  const j = (i: number) => Math.sin(seed * 12.9 + i * 7.1) * 1.2;
  return `M${x + j(1)},${y + j(2)} L${x + w + j(3)},${y + j(4)} L${x + w + j(5)},${y + h + j(6)} L${x + j(7)},${y + h + j(8)} Z`;
}

export class Bar {
  readonly root: HTMLDivElement;
  private readonly svg: SVGSVGElement;
  private readonly green: SVGRectElement;
  private readonly perfect: SVGRectElement;
  private readonly marker: SVGGElement;
  private readonly pips: HTMLDivElement;
  private readonly width = 520;
  private readonly height = 44;
  private readonly pad = 10;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'chop-bar';
    this.svg = el('svg', {
      viewBox: `0 0 ${this.width} ${this.height + 22}`,
      role: 'img',
      'aria-label': 'Chop timing bar',
    });
    const inner = this.width - this.pad * 2;
    this.svg.append(
      el('path', { d: wobblyRect(this.pad, 8, inner, this.height - 16, 1), class: 'bar-paper' }),
    );
    this.green = el('rect', { y: 10, height: this.height - 20, rx: 3, class: 'bar-green' });
    this.perfect = el('rect', { y: 10, height: this.height - 20, rx: 2, class: 'bar-perfect' });
    this.svg.append(this.green, this.perfect);
    this.svg.append(el('path', { d: wobblyRect(this.pad, 8, inner, this.height - 16, 2), class: 'bar-ink' }));
    this.marker = el('g', { class: 'bar-marker' });
    this.marker.append(
      el('path', { d: 'M0,2 L-7,-6 L7,-6 Z', class: 'marker-head' }),
      el('rect', { x: -1.5, y: 2, width: 3, height: this.height - 12, rx: 1.5, class: 'marker-line' }),
    );
    this.svg.append(this.marker);
    this.pips = document.createElement('div');
    this.pips.className = 'chop-pips';
    this.root.append(this.svg, this.pips);
    parent.append(this.root);
  }

  setZones(greenWidth: number, perfectWidth: number): void {
    const inner = this.width - this.pad * 2;
    const gw = inner * greenWidth;
    this.green.setAttribute('x', String(this.pad + inner / 2 - gw / 2));
    this.green.setAttribute('width', String(gw));
    const pw = inner * perfectWidth;
    this.perfect.setAttribute('x', String(this.pad + inner / 2 - pw / 2));
    this.perfect.setAttribute('width', String(pw));
  }

  setMarker(t: number): void {
    const inner = this.width - this.pad * 2;
    this.marker.setAttribute('transform', `translate(${this.pad + inner * t}, 10)`);
  }

  setPips(done: number, total: number): void {
    if (this.pips.children.length !== total) {
      this.pips.replaceChildren(
        ...Array.from({ length: total }, () => {
          const p = document.createElement('span');
          return p;
        }),
      );
    }
    Array.from(this.pips.children).forEach((p, i) => {
      p.classList.toggle('filled', i < done);
    });
  }

  flash(kind: 'chop' | 'perfect' | 'miss'): void {
    this.root.classList.remove('hit', 'perfect', 'miss');
    void this.root.offsetWidth; // restart the CSS animation
    this.root.classList.add(kind === 'chop' ? 'hit' : kind);
  }

  show(visible: boolean): void {
    this.root.classList.toggle('hidden-bar', !visible);
  }
}
