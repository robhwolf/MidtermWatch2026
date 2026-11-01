// When the next run in the chain should start. Runs land on fixed minutes so a
// slow run never pushes the rest of the night later.

const NIGHT_START = Date.parse('2026-11-03T22:42:00Z');
const NIGHT_END = Date.parse('2026-11-04T15:00:00Z');
const RUNOFFS_END = Date.parse('2026-12-14T00:00:00Z');
const MINUTE = 60000;
const SETTLE = 20000;

const slot = (t, every, offset) =>
  Math.ceil((t - offset * MINUTE) / (every * MINUTE)) * every * MINUTE + offset * MINUTE;

export function nextRun(nowMs) {
  const t = nowMs + SETTLE;
  if (t >= RUNOFFS_END) return null;
  if (t >= NIGHT_START && t < NIGHT_END) return slot(t, 5, 2);
  const hourly = slot(t, 60, 7);
  return t < NIGHT_START ? Math.min(hourly, NIGHT_START) : hourly;
}
