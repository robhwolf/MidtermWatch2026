import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseCnn, parseNpr, parseNyt } from '../scripts/lib/feeds.mjs';
import { candlePoints, midPrices } from '../scripts/lib/markets.mjs';
import { applyOverride, mergeRace } from '../scripts/lib/merge.mjs';
import { nextRun } from '../scripts/lib/next-run.mjs';
import { csvRows, parseRatings, resolveRating } from '../scripts/lib/ratings.mjs';
import { averageSwing, balance, isStale, isUpset, margin, path, staleLimitMinutes, timeET } from '../site/js/model.js';

const NIGHT = '2026-11-04T02:00:00.000Z';
const rec = (o = {}) => ({
  id: 'NC-S', chamber: 'senate', source: 'nyt', sourceUrl: 'u', updatedAt: NIGHT, votes: 100, reporting: 40,
  candidates: [{ name: 'A', party: 'D', votes: 60, pct: 60 }, { name: 'B', party: 'R', votes: 40, pct: 40 }],
  call: null, runoff: false, ...o,
});

test('Run chain follows the schedule and stops after the runoffs', () => {
  const at = iso => new Date(nextRun(Date.parse(iso))).toISOString();
  assert.equal(at('2026-11-01T03:30:00Z'), '2026-11-01T04:07:00.000Z');
  assert.equal(at('2026-11-03T22:30:00Z'), '2026-11-03T22:42:00.000Z');
  assert.equal(at('2026-11-03T22:42:30Z'), '2026-11-03T22:47:00.000Z');
  assert.equal(at('2026-11-04T02:03:00Z'), '2026-11-04T02:07:00.000Z');
  assert.equal(at('2026-11-04T02:06:50Z'), '2026-11-04T02:12:00.000Z');
  assert.equal(at('2026-11-04T15:03:00Z'), '2026-11-04T15:07:00.000Z');
  assert.equal(at('2026-12-13T23:30:00Z'), '2026-12-14T00:07:00.000Z');
  assert.equal(nextRun(Date.parse('2026-12-14T00:10:00Z')), null);
});

test('Market history keeps only times every market has a price', () => {
  const candle = (ts, bid, ask) => ({ end_period_ts: ts, yes_bid: { close_dollars: bid }, yes_ask: { close_dollars: ask } });
  const points = candlePoints({
    house: { D: [candle(2000, '0.90', '0.92'), candle(1000, '0.80', '0.82')], R: [candle(1000, '0.18', '0.20'), candle(2000, '0.08', '0.10')] },
    senate: { D: [candle(1000, '0.60', '0.62'), candle(2000, '0.70', '0.72')], R: [candle(1000, '0.38', '0.40')] },
  });
  assert.deepEqual(points, [{ at: '1970-01-01T00:16:40.000Z', house: { D: 81, R: 19 }, senate: { D: 61, R: 39 } }]);
});

test('NYT parser reads a called race', () => {
  const raw = { races: [
    { nyt_id: 'US-G-H-2026-11-03', reporting_units: [] },
    { nyt_id: 'FL-S_W-S-2026-11-03', updated_at: NIGHT, outcome: { won: ['a'], called_by: ['ap'], winner_accepted_at: [NIGHT] },
      candidate_metadata: { a: { first_name: 'Ann', last_name: 'A', party: { nyt_id: 'DEM' } }, b: { last_name: 'B', party: { nyt_id: 'GOP' } } },
      reporting_units: [{ level: 'state', eevp: 80, total_votes: 100, candidates: [{ nyt_id: 'b', votes: { total: 40 } }, { nyt_id: 'a', votes: { total: 60 } }] }] },
  ] };
  const [r, extra] = parseNyt(raw, 'u');
  assert.equal(extra, undefined);
  assert.equal(r.id, 'FL-S');
  assert.equal(r.candidates[0].party, 'D');
  assert.deepEqual([r.call.party, r.call.by], ['D', 'AP']);
});

test('NYT Louisiana all-party primary ids map to the seat', () => {
  const raw = { races: [{ nyt_id: 'LA-L-H-3-2026-11-03', outcome: {}, candidate_metadata: {},
    reporting_units: [{ level: 'state', candidates: [] }] }] };
  assert.equal(parseNyt(raw, 'u')[0].id, 'LA-H-3');
});

test('NPR parser drops test records and reads winners', () => {
  const base = { office: 'H', state: 'AL', seatNumber: '2', eevp: 1, updated: 1,
    candidates: [{ first: 'S', last: 'F', party: 'Dem', votes: 60, winner: 'X', winnerDateTime: NIGHT }, { first: 'C', last: 'D', party: 'GOP', votes: 40 }] };
  const out = parseNpr({ results: [{ ...base, test: true }, { ...base, previousParty: 'GOP' }] }, 'u');
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'AL-H-2');
  assert.equal(out[0].holder, 'R');
  assert.equal(out[0].reporting, 100);
  assert.equal(out[0].call.party, 'D');
});

test('CNN parser reads a called race', () => {
  const r = parseCnn({ totalVote: 100, percentReporting: 99, voteTimestamp: NIGHT,
    candidates: [{ fullName: 'T S', candidatePartyCode: 'R', voteNum: 55, winner: true }, { fullName: 'J T', candidatePartyCode: 'D', voteNum: 45 }] }, 'MT-S', 'u');
  assert.equal(r.call.party, 'R');
  assert.equal(r.call.by, 'CNN');
});

test('falling back: the feed with more votes wins, and either can supply the call', () => {
  const a = rec({ votes: 100 });
  const b = rec({ source: 'npr', votes: 150, call: { party: 'D', name: 'A', at: NIGHT, by: 'AP' } });
  const r = mergeRace('NC-S', [a, b], null, NIGHT);
  assert.equal(r.source, 'npr');
  assert.equal(r.status, 'called');
});

test('both feeds down keeps last good data and marks it carried', () => {
  const prev = { id: 'NC-S', status: 'counting', votes: 500 };
  const r = mergeRace('NC-S', [], prev, NIGHT);
  assert.equal(r.votes, 500);
  assert.equal(r.carried, true);
});

test('a collapsed count is rejected as a broken feed', () => {
  const prev = { id: 'NC-S', status: 'counting', votes: 100000 };
  const r = mergeRace('NC-S', [rec({ votes: 12 })], prev, NIGHT);
  assert.equal(r.votes, 100000);
  assert.equal(r.carried, true);
});

test('votes and calls before first poll close are treated as rehearsal data', () => {
  const r = mergeRace('NC-S', [rec({ call: { party: 'D', name: 'A', by: 'AP' } })], null, '2026-11-02T12:00:00.000Z');
  assert.equal(r.status, 'pending');
  assert.equal(r.votes, 0);
  assert.equal(r.call, null);
});

test('conflicting calls are flagged', () => {
  const r = mergeRace('NC-S', [
    rec({ call: { party: 'D', name: 'A', by: 'AP' } }),
    rec({ source: 'npr', call: { party: 'R', name: 'B', by: 'CNN' } }),
  ], null, NIGHT);
  assert.equal(r.callConflict, true);
});

test('manual override can call, retract and correct', () => {
  const base = mergeRace('NC-S', [rec()], null, NIGHT);
  const called = applyOverride(base, { call: { party: 'R', name: 'B' }, note: 'checked' }, NIGHT);
  assert.equal(called.status, 'called');
  assert.equal(called.source, 'manual');
  assert.equal(called.call.by, 'Manual');
  const retracted = applyOverride(mergeRace('NC-S', [rec({ call: { party: 'D', name: 'A', by: 'AP' } })], null, NIGHT), { call: null }, NIGHT);
  assert.equal(retracted.status, 'counting');
  const fixed = applyOverride(base, { candidates: [{ name: 'A', party: 'D', votes: 30 }, { name: 'B', party: 'R', votes: 70 }] }, NIGHT);
  assert.equal(fixed.candidates[0].name, 'B');
  assert.equal(fixed.candidates[0].pct, 70);
});

test('a manual call keeps its first time across runs', () => {
  const later = '2026-11-04T03:00:00.000Z';
  const first = applyOverride(mergeRace('NC-S', [rec()], null, NIGHT), { call: { party: 'R', name: 'B' } }, NIGHT);
  const next = applyOverride(mergeRace('NC-S', [rec()], first, later), { call: { party: 'R', name: 'B' } }, later, first);
  assert.equal(next.firstCalledAt, NIGHT);
  assert.equal(next.updatedAt, NIGHT);
});

test('market midpoints, with last price as the fallback', () => {
  const p = midPrices([
    { ticker: 'E-D', yes_bid_dollars: '0.70', yes_ask_dollars: '0.72' },
    { ticker: 'E-R', yes_bid_dollars: '0', yes_ask_dollars: '0', last_price_dollars: '0.29' },
    { ticker: 'E-X', last_price_dollars: '0.01' },
  ], 'E');
  assert.deepEqual(p, { D: 71, R: 29 });
  assert.equal(midPrices([{ ticker: 'E-D', last_price_dollars: '0.5' }], 'E'), null);
});

test('ratings CSV forgives spelling and reports the rest', () => {
  const { ratings, problems } = parseRatings('race,chamber,state,district,rating\nNC-S,senate,NC,,toss up\r\nME-S,senate,ME,,lean  d\nGA-S,senate,GA,,maybe\nOH-S,senate,OH,,\n');
  assert.deepEqual(ratings, { 'NC-S': 'Toss-up', 'ME-S': 'Lean D' });
  assert.equal(problems.length, 1);
  assert.equal(csvRows('"a,b",c\n')[0][0], 'a,b');
});

test('blank rating means Solid for the holder, except on redrawn seats', () => {
  assert.deepEqual(resolveRating('X', { holder: 'D' }, {}), { rating: 'Solid D', assumed: true });
  assert.deepEqual(resolveRating('X', { holder: null, redrawn: true }, {}), { rating: null, assumed: false });
  assert.deepEqual(resolveRating('X', { holder: 'D' }, { X: 'Lean R' }), { rating: 'Lean R', assumed: false });
});

test('balance counts holdovers, flips and uncalled seats', () => {
  const races = [
    { chamber: 'senate', status: 'called', call: { party: 'D' }, holder: 'R', candidates: [] },
    { chamber: 'senate', status: 'counting', candidates: [{ party: 'R', votes: 5 }] },
    { chamber: 'senate', status: 'pending', candidates: [] },
  ];
  const b = balance(races, 'senate', { seats: 100, toWin: { D: 51, R: 50 }, holdover: { D: 34, R: 31, I: 0 } });
  assert.equal(b.won.D, 35);
  assert.equal(b.flips.D, 1);
  assert.equal(b.leading.R, 1);
  assert.equal(b.uncalled, 2);
  assert.deepEqual(path(b, 'D'), { need: 16, of: 2, state: 'out' });
});

test('path states', () => {
  const b = { toWin: { D: 218, R: 218 }, won: { D: 218, R: 200 }, uncalled: 40 };
  assert.equal(path(b, 'D').state, 'clinched');
  assert.deepEqual(path(b, 'R'), { need: 18, of: 40, share: 45, state: 'alive' });
});

test('an upset needs a real Cook lean', () => {
  const r = { status: 'called', call: { party: 'D' }, cook: { rating: 'Lean R' } };
  assert.equal(isUpset(r), true);
  assert.equal(isUpset({ ...r, cook: { rating: 'Toss-up' } }), false);
  assert.equal(isUpset({ ...r, cook: { rating: 'Solid R', assumed: true } }), false);
});

test('average swing uses like-for-like called races only', () => {
  const race = (now, then, likeForLike) => ({ chamber: 'house', status: 'called', reporting: 95, votes: 100, baseline: { margin: then, likeForLike },
    candidates: [{ party: 'D', votes: 50 + now / 2, pct: 50 + now / 2 }, { party: 'R', votes: 50 - now / 2, pct: 50 - now / 2 }] });
  const a = averageSwing([race(10, 4, true), race(0, 4, true), race(50, -50, false)]);
  assert.deepEqual(a.house, { n: 2, avg: 1 });
  assert.equal(margin(race(10, 4, true)), 10);
});

test('stale limit follows the schedule', () => {
  assert.equal(staleLimitMinutes(Date.parse('2026-11-02T12:00:00Z')), 780);
  assert.equal(staleLimitMinutes(Date.parse('2026-11-04T02:00:00Z')), 20);
  assert.equal(staleLimitMinutes(Date.parse('2026-11-05T02:00:00Z')), 120);
  assert.equal(isStale('2026-11-04T01:30:00Z', Date.parse('2026-11-04T02:00:00Z')), true);
  assert.equal(isStale('2026-11-04T01:50:00Z', Date.parse('2026-11-04T02:00:00Z')), false);
});

test('times are labelled ET, including across the clock change', () => {
  assert.equal(timeET('2026-11-03T23:00:00Z'), '6 pm ET');
  assert.equal(timeET('2026-11-04T06:00:00Z'), '1 am ET');
});

test('every roster race has a closing time and a baseline entry', () => {
  const roster = JSON.parse(readFileSync('data/source/races.json', 'utf8')).races;
  const closings = JSON.parse(readFileSync('data/source/poll-closings.json', 'utf8')).states;
  const baseline = JSON.parse(readFileSync('data/source/baseline.json', 'utf8')).seats;
  assert.equal(roster.length, 506);
  for (const r of roster) {
    assert.ok(closings[r.state]?.sourceUrl, r.id);
    assert.ok(baseline[r.id], r.id);
  }
});
