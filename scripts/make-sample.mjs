#!/usr/bin/env node
// Writes synthetic results for testing the page: before polls close, mid-night
// and the morning after. Every number here is invented. The page labels these
// clearly and only shows them with ?sample= in the URL.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => JSON.parse(readFileSync(join(ROOT, 'data', 'source', f), 'utf8'));
const roster = read('races.json').races;
const baseline = read('baseline.json').seats;
const closings = read('poll-closings.json');
const chambers = read('chambers.json');

let seed = 20261103;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const noise = n => (rnd() + rnd() + rnd() - 1.5) * (n / 1.5);

function sampleRating(m, fallback) {
  const x = (m ?? fallback) + noise(3);
  if (x > 18) return 'Solid D';
  if (x > 9) return 'Likely D';
  if (x > 3.5) return 'Lean D';
  if (x > -3.5) return 'Toss-up';
  if (x > -9) return 'Lean R';
  if (x > -18) return 'Likely R';
  return 'Solid R';
}

const NATIONAL_SWING = 3.5;
const base = roster.map(meta => {
  const b = baseline[meta.id];
  const shape = meta.candidates.filter(c => c.party === 'D' || c.party === 'R');
  const cands = shape.length >= 2 ? [shape.find(c => c.party === 'D') || shape[0], shape.find(c => c.party === 'R') || shape[1]] : meta.candidates.slice(0, 2);
  const m = (b.margin ?? (cands[0]?.party === 'D' ? 40 : -40)) + NATIONAL_SWING + noise(meta.chamber === 'house' ? 7 : 5);
  return { meta, b, cands, finalMargin: m, rating: sampleRating(b.margin, m), size: 180000 + Math.floor(rnd() * 200000) * (meta.chamber === 'house' ? 1 : 12) };
});

function race(item, at) {
  const { meta, b, cands, finalMargin, rating, size } = item;
  const close = Date.parse(closings.states[meta.state].first);
  const hoursIn = (at - close) / 3600e3;
  const reporting = hoursIn < 0 ? 0 : Math.min(99, Math.round(100 * (1 - Math.exp(-hoursIn / 1.6))));
  const margin = finalMargin + (reporting < 90 ? noise(6) * (1 - reporting / 100) : 0);
  const votes = Math.round(size * (reporting / 100));
  const dShare = (100 + margin) / 2;
  const dVotes = Math.round(votes * (dShare / 100));
  const ordered = cands.map(c => {
    const v = c.party === 'D' ? dVotes : c.party === 'R' ? votes - dVotes : Math.round(votes / 2);
    return { ...c, votes: v, pct: votes ? Math.round((v / votes) * 1000) / 10 : null, winner: false };
  }).sort((a, b2) => b2.votes - a.votes);

  const safe = Math.abs(margin) > 40 / Math.max(1, reporting / 12) && reporting >= 10;
  const late = meta.runoffPrimary && Math.abs(finalMargin) < 16;
  const called = reporting > 0 && !late && (safe || (reporting >= 90 && Math.abs(margin) > 1.2));
  const w = called ? ordered[0] : null;
  if (w) w.winner = true;
  const calledAt = called ? new Date(close + (1.5 + Math.abs(40 - Math.min(40, Math.abs(finalMargin))) / 12 + rnd()) * 1800e3).toISOString() : null;
  const iso = new Date(at).toISOString();
  const { candidates: _c, ...info } = meta;
  return {
    ...info,
    status: late && reporting >= 95 ? 'runoff' : called ? 'called' : reporting > 0 ? 'counting' : 'pending',
    votes, reporting, candidates: ordered,
    call: w ? { party: w.party, name: w.name, at: calledAt, by: 'Sample' } : null,
    callConflict: false,
    source: 'sample', sourceUrl: null, updatedAt: iso, checkedAt: iso, carried: false, override: null,
    firstCalledAt: called ? calledAt : null,
    cook: { rating, assumed: false, source: 'Sample rating, not Cook', updatedAt: '2026-10-31T12:00:00.000Z' },
    baseline: b,
  };
}

const scenes = { pre: '2026-11-03T14:00:00Z', mid: '2026-11-04T02:40:00Z', final: '2026-11-04T13:30:00Z' };
const trend = (start, end, t) => Math.round((start + (end - start) * t + noise(3)) * 10) / 10;
const points = Array.from({ length: 150 }, (_, i) => {
  const t = i / 149, house = trend(72, 96, t), senate = trend(62, 38, t);
  return { at: new Date(Date.parse('2026-11-03T23:00:00Z') + i * 300000).toISOString(),
    house: { D: house, R: Math.round((100 - house) * 10) / 10 }, senate: { D: senate, R: Math.round((100 - senate) * 10) / 10 } };
});
writeFileSync(join(ROOT, 'site', 'data', 'sample-markets.json'), JSON.stringify({ source: 'Sample generator', sourceUrl: null, points }));

for (const [name, when] of Object.entries(scenes)) {
  seed = 777;
  const at = Date.parse(when);
  const doc = {
    sample: name, generatedAt: new Date(at).toISOString(),
    sources: [{ id: 'sample', name: 'Sample generator', ok: true, races: roster.length, errors: [], checkedAt: new Date(at).toISOString(), role: 'feed' }],
    warnings: [], chambers, closings, races: base.map(i => race(i, at)),
  };
  writeFileSync(join(ROOT, 'site', 'data', `sample-${name}.json`), JSON.stringify(doc));
  const c = doc.races.filter(r => r.status === 'called').length;
  console.log(name, c, 'called');
}
