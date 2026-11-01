// Derived views over results.json. Pure functions shared by the page and the
// tests, so the numbers on screen are the numbers under test.

export const RATING_ORDER = ['Solid D', 'Likely D', 'Lean D', 'Toss-up', 'Lean R', 'Likely R', 'Solid R'];

export const leader = r => (r.candidates || []).find(c => c.votes > 0) || null;

export function margin(r) {
  const d = topOf(r, 'D'), x = topOf(r, 'R');
  if (!d || !x || !r.votes) return null;
  return round((d.pct ?? 0) - (x.pct ?? 0));
}
const topOf = (r, p) => (r.candidates || []).filter(c => c.party === p).sort((a, b) => b.votes - a.votes)[0];
const round = n => Math.round(n * 10) / 10;

// Which party a race is being counted for, and how firmly.
export function standing(r) {
  if (r.status === 'called' && r.call) return { party: r.call.party, kind: 'won' };
  const l = leader(r);
  if (r.status === 'counting' && l) return { party: l.party, kind: 'leading' };
  return { party: null, kind: 'uncalled' };
}

export function balance(races, chamber, cfg) {
  const list = races.filter(r => r.chamber === chamber);
  const hold = cfg.holdover || { D: 0, R: 0, I: 0 };
  const out = {
    won: { D: hold.D, R: hold.R, I: hold.I },
    leading: { D: 0, R: 0, I: 0 },
    uncalled: 0, holdover: hold, total: list.length, toWin: cfg.toWin, seats: cfg.seats,
    flips: { D: 0, R: 0 },
  };
  for (const r of list) {
    const s = standing(r);
    if (s.kind === 'won') {
      out.won[s.party]++;
      if (r.holder && r.holder !== s.party && s.party !== 'I') out.flips[s.party]++;
    } else if (s.kind === 'leading') { out.leading[s.party]++; out.uncalled++; }
    else out.uncalled++;
  }
  return out;
}

export function governors(races) {
  const out = { won: { D: 0, R: 0, I: 0 }, leading: { D: 0, R: 0, I: 0 }, uncalled: 0, total: 0 };
  for (const r of races.filter(x => x.chamber === 'governor')) {
    out.total++;
    const s = standing(r);
    if (s.kind === 'won') out.won[s.party]++;
    else { out.uncalled++; if (s.kind === 'leading') out.leading[s.party]++; }
  }
  return out;
}

// How many of the remaining uncalled races a party needs.
export function path(b, p) {
  const need = b.toWin[p] - b.won[p];
  if (need <= 0) return { need: 0, of: b.uncalled, state: 'clinched' };
  if (need > b.uncalled) return { need, of: b.uncalled, state: 'out' };
  return { need, of: b.uncalled, share: Math.round((need / b.uncalled) * 100), state: 'alive' };
}

export const ratingParty = rating => (!rating || rating === 'Toss-up' ? null : rating.slice(-1));

// Called against Cook's lean. A toss-up cannot be an upset, and an assumed
// Solid is not a Cook call, so neither counts.
export function isUpset(r) {
  if (r.status !== 'called' || !r.call || r.cook?.assumed) return false;
  const lean = ratingParty(r.cook?.rating);
  return !!lean && lean !== r.call.party;
}

export const isTossup = r => r.cook?.rating === 'Toss-up';

export function swing(r) {
  const now = margin(r), then = r.baseline?.margin;
  if (now == null || then == null) return null;
  return round(now - then);
}

// Averages use called races only, with one vote-count floor so a race called
// on early returns does not skew the figure.
export function averageSwing(races) {
  const pick = f => {
    const v = races.filter(r => r.status === 'called' && (r.reporting ?? 0) >= 50 && f(r))
      .map(swing).filter(x => x != null);
    return { n: v.length, avg: v.length ? round(v.reduce((a, b) => a + b, 0) / v.length) : null };
  };
  return {
    house: pick(r => r.chamber === 'house' && r.baseline?.likeForLike),
    senate: pick(r => r.chamber === 'senate' && r.baseline?.likeForLike),
    governor: pick(r => r.chamber === 'governor' && r.baseline?.likeForLike),
  };
}

export function pollGroups(races, closings) {
  const groups = new Map();
  for (const [state, c] of Object.entries(closings.states)) {
    const key = c.first;
    if (!groups.has(key)) groups.set(key, { at: key, states: [] });
    groups.get(key).states.push({
      ...c,
      races: races.filter(r => r.state === state && isWatched(r)),
      all: races.filter(r => r.state === state),
    });
  }
  return [...groups.values()].sort((a, b) => a.at.localeCompare(b.at));
}

// A state with two closing times counts from its later one, when all its polls are closed.
export const closesBy = (r, closings, at) => closings.states[r.state]?.last <= at;

export const isWatched = r => ['Toss-up', 'Lean D', 'Lean R'].includes(r.cook?.rating) && !r.cook.assumed;

// Toss-up and Lean races in the states whose polls close first. Those groups
// are the first real evidence of the night.
export function bellwethers(groups, count = 3) {
  const out = [];
  for (const g of groups.slice(0, count)) for (const s of g.states) out.push(...s.races);
  return out;
}

export function recentCalls(races, limit = 8) {
  return races.filter(r => r.status === 'called' && r.firstCalledAt)
    .sort((a, b) => b.firstCalledAt.localeCompare(a.firstCalledAt)).slice(0, limit);
}

// The page's stale limit follows the refresh schedule, so the warning means a
// run was missed rather than simply that polling is slow today.
const NIGHT_START = Date.parse('2026-11-03T23:00:00Z');
const NIGHT_END = Date.parse('2026-11-04T15:00:00Z');
const RUNOFFS_END = Date.parse('2026-12-14T00:00:00Z');
export function staleLimitMinutes(nowMs) {
  if (nowMs < NIGHT_START) return 13 * 60;
  if (nowMs <= NIGHT_END) return 20;
  if (nowMs <= RUNOFFS_END) return 2 * 60;
  return Infinity; // the job has finished for good
}
export const isStale = (generatedAt, nowMs) =>
  (nowMs - Date.parse(generatedAt)) / 60000 > staleLimitMinutes(nowMs);

const ET = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
const ET_DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
export const timeET = iso => `${ET.format(new Date(iso)).replace(':00', '').replace(' AM', ' am').replace(' PM', ' pm')} ET`;
export const dayET = iso => ET_DAY.format(new Date(iso));
export const dayTimeET = iso => `${ET_DAY.format(new Date(iso))}, ${timeET(iso)}`;
