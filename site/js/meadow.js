// The seat meadow: one blade per seat, Democrats growing from the left and
// Republicans from the right, so it reads as a seat bar. A ripple runs through
// only when a race is called, so movement always means news.

const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
const color = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function seatOrder(b) {
  const seq = [];
  const push = (n, party, kind) => { for (let i = 0; i < n; i++) seq.push({ party, kind }); };
  push(b.won.D, 'D', 'won');
  push(b.leading.D, 'D', 'leading');
  const others = b.won.I + b.leading.I;
  const blank = Math.max(0, b.seats - b.won.D - b.won.R - b.leading.D - b.leading.R - others);
  push(Math.ceil(blank / 2), null, 'uncalled');
  push(b.won.I, 'I', 'won');
  push(b.leading.I, 'I', 'leading');
  push(Math.floor(blank / 2), null, 'uncalled');
  push(b.leading.R, 'R', 'leading');
  push(b.won.R, 'R', 'won');
  return seq;
}

export class Meadow {
  constructor(canvas, label) {
    this.c = canvas; this.b = null; this.t = -1; this.label = label;
    this.quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
    new ResizeObserver(() => this.draw()).observe(canvas);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.draw());
    const tip = document.querySelector('.tip') || Object.assign(document.body.appendChild(document.createElement('div')), { className: 'tip', hidden: true });
    canvas.addEventListener('pointermove', e => {
      const seat = this.seq?.[Math.floor((e.offsetX / canvas.clientWidth) * this.seq.length)];
      if (!seat) return;
      tip.hidden = false;
      tip.textContent = this.describe(seat);
      tip.style.left = `${Math.min(e.clientX + 10, innerWidth - 200)}px`;
      tip.style.top = `${e.clientY - 34}px`;
    });
    canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
  }

  describe(s) {
    const b = this.b;
    if (s.kind === 'uncalled') return `${b.uncalled - b.leading.D - b.leading.R - b.leading.I} seats with no leader yet`;
    const name = { D: 'Democrats', R: 'Republicans', I: 'Independents' }[s.party];
    return `${name}: ${b[s.kind][s.party]} ${s.kind === 'won' ? 'seats won' : 'seats leading'}`;
  }

  set(b) { this.b = b; this.seq = seatOrder(b); this.draw(); }

  ripple() {
    if (this.quiet) return;
    this.t = 0;
    const start = performance.now();
    const step = now => {
      this.t = (now - start) / 1500;
      this.draw();
      if (this.t < 1) requestAnimationFrame(step); else { this.t = -1; this.draw(); }
    };
    requestAnimationFrame(step);
  }

  draw() {
    const { c, seq } = this;
    if (!seq) return;
    const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (!w) return;
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, w, h);
    const ink = {
      won: { D: color('--d'), R: color('--r'), I: color('--i') },
      leading: { D: color('--d-soft'), R: color('--r-soft'), I: color('--i') },
    };
    const blade = color('--blade');
    const gap = w / seq.length;
    const lw = Math.min(Math.max(gap * 0.82, 0.9), 7);
    const ground = h - 1;
    x.lineCap = 'round';
    seq.forEach((s, i) => {
      const rise = s.kind === 'won' ? 1 : s.kind === 'leading' ? 0.8 : 0.56;
      const len = (h - 16) * rise * (0.84 + hash(i + 1) * 0.16);
      const lean = (hash(i + 7) - 0.5) * Math.min(14, len * 0.2);
      const px = gap * (i + 0.5);
      const wave = this.t >= 0
        ? Math.sin((i / seq.length - this.t * 1.6) * 16) * 13 * Math.sin(Math.PI * this.t)
          * Math.exp(-(((i / seq.length - this.t) * 3.2) ** 2))
        : 0;
      x.strokeStyle = s.party ? ink[s.kind][s.party] : blade;
      x.lineWidth = lw;
      x.beginPath();
      x.moveTo(px, ground);
      x.quadraticCurveTo(px + (lean + wave) * 0.3, ground - len * 0.55, px + lean + wave, ground - len);
      x.stroke();
    });
    const mid = this.majorityX(w);
    x.strokeStyle = color('--ink');
    x.lineWidth = 2;
    x.beginPath(); x.moveTo(mid, 0); x.lineTo(mid, h); x.stroke();
  }

  majorityX(w) { return w / 2; }
}
