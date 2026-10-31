#!/usr/bin/env node
// Run by the Actions cron. Fetches the feeds, merges them with last-good data
// and manual overrides, and writes site/data/results.json. One feed failing is
// normal: the run only exits non-zero if the output could not be written.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CNN_BASE, NPR_BASE, NYT_BASE, cnnKey, fetchJson, parseCnn, parseNpr, parseNyt } from './lib/feeds.mjs';
import { applyOverride, mergeRace } from './lib/merge.mjs';
import { updateMarkets } from './lib/markets.mjs';
import { parseRatings, resolveRating } from './lib/ratings.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data', 'source');
const OUT = join(ROOT, 'site', 'data', 'results.json');
const MARKETS = join(ROOT, 'site', 'data', 'markets.json');
const read = f => JSON.parse(readFileSync(join(SRC, f), 'utf8'));

const COOK_SOURCE = 'Cook Political Report, entered by hand';

// A feed that answers but has lost most of its races is treated as down.
const EXPECTED = { senate: 35, house: 435, governor: 36 };
const MIN_SHARE = 0.9;
const CNN_CAP = 150;

const FEEDS = [
  { id: 'nyt', name: 'New York Times (AP)', parse: parseNyt,
    pages: { senate: `${NYT_BASE}/results-senate.json`, house: `${NYT_BASE}/results-house.json`, governor: `${NYT_BASE}/results-governor.json` } },
  { id: 'npr', name: 'NPR (AP)', parse: parseNpr,
    pages: { senate: `${NPR_BASE}/senate.json`, house: `${NPR_BASE}/house.json`, governor: `${NPR_BASE}/gov.json` } },
];

async function runFeed(feed, now) {
  const records = [], errors = [];
  await Promise.all(Object.entries(feed.pages).map(async ([chamber, url]) => {
    try {
      const got = feed.parse(await fetchJson(url), url).filter(r => r.chamber === chamber);
      if (got.length < EXPECTED[chamber] * MIN_SHARE) throw new Error(`only ${got.length} ${chamber} races`);
      records.push(...got);
    } catch (e) { errors.push(`${chamber}: ${e.message}`); }
  }));
  return {
    records,
    health: { id: feed.id, name: feed.name, ok: errors.length === 0, races: records.length, errors, checkedAt: now, role: 'feed' },
  };
}

// CNN has one URL per race and answers 406 to bursts, so it is only called for
// races the bulk feeds did not return, slowly, and capped to fit one run. Close
// and rated races go first so the backstop covers what matters most.
async function runCnn(ids, now) {
  const records = [], errors = [];
  const queue = ids.slice(0, CNN_CAP);
  const worker = async () => {
    for (let id; (id = queue.shift());) {
      const url = `${CNN_BASE}/${cnnKey(id)}.json`;
      try { records.push(parseCnn(await fetchJson(url, { retries: 0, timeoutMs: 10000 }), id, url)); }
      catch (e) { errors.push(`${id}: ${e.message}`); }
      await new Promise(r => setTimeout(r, 700));
    }
  };
  await Promise.all(Array.from({ length: 2 }, worker));
  return {
    records,
    health: { id: 'cnn', name: 'CNN', ok: records.length > 0, races: records.length, errors: errors.slice(0, 5), checkedAt: now, role: 'backstop' },
  };
}

function gitTime(path) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cI', '--', path], { cwd: ROOT, encoding: 'utf8' }).trim() || null;
  } catch { return null; }
}

async function main() {
  const now = new Date().toISOString();
  const roster = read('races.json').races;
  const baseline = read('baseline.json').seats;
  const overrides = read('overrides.json');
  const closings = read('poll-closings.json');
  const { ratings, problems } = parseRatings(readFileSync(join(SRC, 'ratings.csv'), 'utf8'));
  const ratedAt = gitTime('data/source/ratings.csv') || now;

  const prevDoc = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  const prev = Object.fromEntries((prevDoc?.races || []).map(r => [r.id, r]));

  const runs = await Promise.all(FEEDS.map(f => runFeed(f, now)));
  const byRace = {};
  for (const run of runs) for (const r of run.records) (byRace[r.id] ||= []).push(r);

  const rank = r => (ratings[r.id] ? 0 : r.chamber === 'house' ? 2 : 1);
  const missing = roster.filter(r => !byRace[r.id]).sort((a, b) => rank(a) - rank(b)).map(r => r.id);
  if (missing.length) {
    const cnn = await runCnn(missing, now);
    runs.push(cnn);
    for (const r of cnn.records) (byRace[r.id] ||= []).push(r);
  }

  const races = roster.map(meta => {
    const merged = mergeRace(meta.id, byRace[meta.id], prev[meta.id], now);
    const base = merged || {
      id: meta.id, chamber: meta.chamber, status: 'pending', votes: 0, reporting: null,
      candidates: meta.candidates.map(c => ({ ...c, votes: 0, pct: null, winner: false })),
      call: null, source: null, sourceUrl: null, updatedAt: null, checkedAt: now, carried: true,
    };
    const raced = applyOverride(base, overrides[meta.id], now, prev[meta.id]);
    const { candidates: _drop, ...info } = meta;
    const r = resolveRating(meta.id, meta, ratings);
    return {
      ...info, ...raced,
      cook: { rating: r.rating, assumed: r.assumed, source: r.assumed ? 'Assumed from seat holder' : r.rating ? COOK_SOURCE : null, updatedAt: ratedAt },
      baseline: baseline[meta.id] || null,
    };
  });

  const unknownOverrides = Object.keys(overrides).filter(id => !roster.some(r => r.id === id));
  const doc = {
    generatedAt: now,
    sources: runs.map(r => r.health),
    warnings: [...problems, ...unknownOverrides.map(id => `overrides.json: no race called "${id}"`)],
    chambers: read('chambers.json'),
    closings,
    races,
  };
  writeFileSync(OUT, JSON.stringify(doc));

  const market = await updateMarkets(MARKETS, now);
  console.log(`kalshi: ${market.ok ? 'ok' : `skipped, ${market.error}`}`);

  const called = races.filter(r => r.status === 'called').length;
  const carried = races.filter(r => r.carried).length;
  for (const r of runs) console.log(`${r.health.id}: ${r.health.ok ? 'ok' : 'FAILED'} ${r.health.races} races ${r.health.errors.join('; ')}`);
  console.log(`${races.length} races, ${called} called, ${carried} carried from last run, ${doc.warnings.length} warnings`);
}

main().catch(e => { console.error(e); process.exit(1); });
