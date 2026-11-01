// The seat bar, drawn like a map's scale bar: one tick every 50 House seats or
// 10 Senate seats, Democrats from the left, Republicans from the right, and a
// benchmark at the majority. Leading seats are hatched so they read without
// colour. A sweep runs across only when a race is called, so movement means news.

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

export class SeatBar {
  constructor(canvas) {
    this.c = canvas; this.b = null; this.t = -1;
    this.quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
    new ResizeObserver(() => this.draw()).observe(canvas);
    addEventListener('themechange', () => this.draw());
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

  sweep() {
    if (this.quiet) return;
    const start = performance.now();
    const step = now => {
      this.t = (now - start) / 900;
      this.draw();
      if (this.t < 1) requestAnimationFrame(step); else { this.t = -1; this.draw(); }
    };
    requestAnimationFrame(step);
  }

  draw() {
    const { c, seq, b } = this;
    if (!seq) return;
    const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (!w) return;
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, w, h);
    const won = { D: color('--d'), R: color('--r'), I: color('--i') };
    const leading = { D: color('--d-soft'), R: color('--r-soft'), I: color('--i') };
    const ink = color('--ink'), paper = color('--raised');
    const gap = w / seq.length, top = 8, tall = h - 20;

    x.fillStyle = paper;
    x.fillRect(0, top, w, tall);
    seq.forEach((s, i) => {
      if (s.kind === 'uncalled') return;
      x.fillStyle = (s.kind === 'won' ? won : leading)[s.party];
      x.fillRect(i * gap, top, gap + 0.6, tall);
    });

    x.save();
    x.beginPath();
    seq.forEach((s, i) => { if (s.kind === 'leading') x.rect(i * gap, top, gap + 0.6, tall); });
    x.clip();
    x.strokeStyle = paper;
    x.lineWidth = 1.5;
    for (let p = -tall; p < w; p += 7) { x.beginPath(); x.moveTo(p, top + tall); x.lineTo(p + tall, top); x.stroke(); }
    x.restore();

    if (this.t >= 0) {
      x.fillStyle = paper;
      x.globalAlpha = 0.55 * Math.sin(Math.PI * this.t);
      x.fillRect(this.t * w - 24, top, 48, tall);
      x.globalAlpha = 1;
    }

    x.strokeStyle = ink;
    x.lineWidth = 1.5;
    x.strokeRect(0.75, top, w - 1.5, tall);
    x.fillStyle = ink;
    const every = b.seats > 200 ? 50 : 10;
    for (let t = 0; t <= b.seats; t += every) x.fillRect(Math.min(w - 1, (t / b.seats) * w), top + tall, 1.2, 6);

    x.fillRect(w / 2 - 1, 0, 2, h - 4);
    x.beginPath();
    x.moveTo(w / 2 - 6, 0); x.lineTo(w / 2 + 6, 0); x.lineTo(w / 2, 8);
    x.fill();
  }
}
