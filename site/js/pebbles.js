// A tile map of hand-shaped pebbles: equal size, so small states stay tappable.
// Shapes are seeded from the state code, so a pebble keeps its shape across
// refreshes.

export const TILES = {
  ME: [11, 0], VT: [10, 1], NH: [11, 1],
  WA: [1, 2], ID: [2, 2], MT: [3, 2], ND: [4, 2], MN: [5, 2], WI: [6, 2], MI: [8, 2], NY: [9, 2], MA: [10, 2], RI: [11, 2],
  OR: [1, 3], NV: [2, 3], WY: [3, 3], SD: [4, 3], IA: [5, 3], IL: [6, 3], IN: [7, 3], OH: [8, 3], PA: [9, 3], NJ: [10, 3], CT: [11, 3],
  CA: [1, 4], UT: [2, 4], CO: [3, 4], NE: [4, 4], MO: [5, 4], KY: [6, 4], WV: [7, 4], VA: [8, 4], MD: [9, 4], DE: [10, 4],
  AZ: [2, 5], NM: [3, 5], KS: [4, 5], AR: [5, 5], TN: [6, 5], NC: [7, 5], SC: [8, 5], DC: [9, 5],
  AK: [1, 6], OK: [4, 6], LA: [5, 6], MS: [6, 6], AL: [7, 6], GA: [8, 6],
  HI: [2, 7], TX: [4, 7], FL: [9, 7],
};

const CELL = 54;
const R = 25.5;

function shape(code, cx, cy) {
  let s = code.charCodeAt(0) * 31 + code.charCodeAt(1);
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pts = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2;
    const r = R * (0.92 + rnd() * 0.14);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.94];
  });
  let d = '';
  pts.forEach((p, i) => {
    const a = pts[(i + 8) % 9], b = pts[(i + 1) % 9], c = pts[(i + 2) % 9];
    if (!i) d += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    d += `C${(p[0] + (b[0] - a[0]) / 6).toFixed(1)} ${(p[1] + (b[1] - a[1]) / 6).toFixed(1)} `
       + `${(b[0] - (c[0] - p[0]) / 6).toFixed(1)} ${(b[1] - (c[1] - p[1]) / 6).toFixed(1)} `
       + `${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  });
  return `${d}Z`;
}

// fills: { TX: { parts:[{color,share}], ink, label } }; a state with no race
// this year has no entry.
export function renderMap(el, fills, selected, onPick) {
  const w = 11 * CELL, h = 8 * CELL;
  const body = Object.entries(TILES).map(([code, [cx, cy]]) => {
    const x = cx * CELL + CELL / 2, y = cy * CELL + CELL / 2;
    const d = shape(code, x, y);
    const f = fills[code];
    let fillMarkup = `<path d="${d}" fill="var(--raised)"/>`;
    if (f) {
      let at = x - R - 4;
      const bars = f.parts.map(p => {
        const wide = p.share * (R * 2 + 8);
        const r = `<rect x="${at.toFixed(1)}" y="${y - R - 4}" width="${wide.toFixed(1)}" height="${R * 2 + 8}" fill="${p.color}"/>`;
        at += wide;
        return r;
      }).join('');
      fillMarkup = `<clipPath id="c${code}"><path d="${d}"/></clipPath><g clip-path="url(#c${code})">${bars}</g>`;
    }
    const on = selected === code ? ' on' : '';
    return `<g class="pebble${on}" data-s="${code}" role="button" tabindex="0" aria-pressed="${selected === code}"
      aria-label="${f ? f.label : `${code}: no race this year`}">${fillMarkup}
      <path class="edge" d="${d}" fill="none" stroke="var(--rule)"/>
      <text x="${x}" y="${y}" fill="${f ? f.ink : 'var(--ink-3)'}">${code}</text>
      <title>${f ? f.label : `${code}: no race this year`}</title></g>`;
  }).join('');
  el.innerHTML = `<svg viewBox="${CELL} 0 ${w} ${h}" role="group" aria-label="State map; choose a state to filter the table">${body}</svg>`;
  const pick = g => onPick(g.dataset.s);
  el.querySelectorAll('.pebble').forEach(g => {
    g.addEventListener('click', () => pick(g));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(g); } });
  });
}
