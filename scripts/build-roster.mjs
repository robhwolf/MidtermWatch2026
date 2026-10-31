#!/usr/bin/env node
// One-off setup, rerun only if the race list changes: writes the race roster,
// the prior-margin baseline and, if missing, the blank Cook ratings template.
// ratings.csv is never overwritten, because it holds hand-entered work.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NYT_BASE, NPR_BASE, fetchJson, parseNpr, party, raceId } from './lib/feeds.mjs';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'source');
const NYT_2024 = 'https://static01.nyt.com/elections-assets/pages/data/2024-11-05/results-house.json';

// New congressional lines in force for November 2026. Missouri's new map is
// on hold and Virginia's was voided, so both stay on their 2024 lines.
export const REDRAWN = ['AL', 'CA', 'FL', 'LA', 'NC', 'OH', 'TN', 'TX', 'UT'];

const STATE_NAMES = {};
const margin = cands => {
  const d = cands.filter(c => c.party === 'D').sort((a, b) => b.pct - a.pct)[0];
  const r = cands.filter(c => c.party === 'R').sort((a, b) => b.pct - a.pct)[0];
  return d && r ? Math.round((d.pct - r.pct) * 100) / 100 : null;
};

const nytId = /^([A-Z]{2})-([A-Z_]+)-([SHG])(?:-(\d+))?-/;

async function loadNyt() {
  const all = [];
  for (const page of ['senate', 'house', 'governor']) {
    const url = `${NYT_BASE}/results-${page}.json`;
    const json = await fetchJson(url);
    for (const r of json.races) all.push({ r, url });
  }
  return all;
}

// Prior margins come from the NYT's archived result files, one file per
// election, so this makes few requests.
const ARCHIVE = 'https://static01.nyt.com/elections-assets';
const S20 = `${ARCHIVE}/2020/data/api/2020-11-03/national-map-page/national/senate.json`;
const S22 = `${ARCHIVE}/2022/data/2022-11-08/results-senate.json`;
const G24 = `${ARCHIVE}/pages/data/2024-11-05/results-governor.json`;
const govUrl = name => `${ARCHIVE}/2022/data/2022-11-08/results-${name.toLowerCase().replace(/ /g, '-')}-governor.json`;

function nytMargin(race) {
  const u = race.reporting_units.find(x => x.level === 'state') || race.reporting_units[0];
  const total = u.total_votes || u.candidates.reduce((n, c) => n + c.votes.total, 0);
  return margin(u.candidates.map(c => ({
    party: party(race.candidate_metadata?.[c.nyt_id]?.party?.nyt_id ?? ''),
    pct: (c.votes.total / total) * 100,
  })));
}

async function priorMargins() {
  const s20 = {}, s22 = {}, g24 = {};
  for (const r of (await fetchJson(S20)).data.races) {
    s20[r.race_id.slice(0, 2)] = margin(r.candidates.map(c => ({ party: party(c.party_id), pct: c.percent })));
  }
  for (const r of (await fetchJson(S22)).races) s22[r.nyt_id.slice(0, 2)] = nytMargin(r);
  for (const r of (await fetchJson(G24)).races) g24[r.nyt_id.slice(0, 2)] = nytMargin(r);
  return { s20, s22, g24 };
}

// Seats whose last election was not the regular one. Values from each race's
// certified result; see README for the citation.
const SEAT_EXCEPTIONS = JSON.parse(readFileSync(join(SRC, 'baseline-exceptions.json'), 'utf8'));

async function main() {
  const now = new Date().toISOString();
  const nyt = await loadNyt();
  const npr = [];
  for (const f of ['senate', 'house', 'gov']) {
    const url = `${NPR_BASE}/${f}.json`;
    npr.push(...parseNpr(await fetchJson(url), url));
  }
  const holders = Object.fromEntries(npr.map(r => [r.id, r.holder]));

  const h24 = await fetchJson(NYT_2024);
  const prior = {};
  for (const r of h24.races) {
    const m = nytId.exec(r.nyt_id);
    if (!m || m[3] !== 'H') continue;
    const u = r.reporting_units[0];
    const meta = r.candidate_metadata;
    const total = u.total_votes;
    const cands = u.candidates.map(c => ({ party: party(meta[c.nyt_id]?.party?.nyt_id), pct: (c.votes.total / total) * 100 }));
    prior[raceId(m[1], 'H', m[4])] = r.uncontested ? null : margin(cands);
  }

  const old = await priorMargins();
  const races = [], baseline = {};
  const priorHolder = id => (prior[id] == null ? null : prior[id] > 0 ? 'D' : 'R');
  for (const { r } of nyt) {
    const m = nytId.exec(r.nyt_id);
    if (!m || m[1] === 'US') continue;
    const [, state, kind, office, seat] = m;
    const id = raceId(state, office, seat);
    const unit = r.reporting_units.find(u => u.level === 'state') || r.reporting_units[0];
    STATE_NAMES[state] = STATE_NAMES[state] || unit.name;
    const cands = Object.values(r.candidate_metadata || {});
    const redrawn = office === 'H' && REDRAWN.includes(state);
    const chamber = { S: 'senate', H: 'house', G: 'governor' }[office];
    const district = office === 'H' ? Number(seat) || 1 : null;
    const atLarge = office === 'H' && (unit.name || '').match(/at.large/i);
    races.push({
      id, chamber, state, stateName: null, district,
      special: kind.startsWith('S_'),
      runoffPrimary: kind === 'L',
      redrawn,
      holder: redrawn ? null : holders[id] || priorHolder(id),
      uncontested: !!r.uncontested,
      atLarge: !!atLarge,
      candidates: cands.sort((a, b) => a.order - b.order).slice(0, 6).map(c => ({
        name: [c.first_name, c.last_name].filter(Boolean).join(' '),
        party: party(c.party?.nyt_id),
        incumbent: !!c.incumbent,
      })),
    });
    const pres24 = unit.historical_comparison_race_data?.[`${state}-G-P-2024-11-05`]?.margin ?? null;
    let b;
    if (redrawn) {
      b = { margin: pres24, kind: 'president-2024-new-lines', label: '2024 president, new lines', likeForLike: false,
            source: `${NYT_BASE}/results-house.json` };
    } else if (office === 'H') {
      b = { margin: prior[id] ?? null, kind: 'house-2024', label: '2024 House', likeForLike: prior[id] != null, source: NYT_2024 };
    } else if (SEAT_EXCEPTIONS[id]) {
      b = { likeForLike: true, ...SEAT_EXCEPTIONS[id] };
    } else {
      const twoYear = ['NH', 'VT'].includes(state);
      const special = kind.startsWith('S_');
      let value = null, url, yr;
      if (office === 'S') { yr = special ? 2022 : 2020; value = (special ? old.s22 : old.s20)[state] ?? null; url = special ? S22 : S20; }
      else if (twoYear) { yr = 2024; value = old.g24[state] ?? null; url = G24; }
      else {
        yr = 2022; url = govUrl(unit.name);
        try {
          const race = (await fetchJson(url)).races.find(x => x.nyt_id.startsWith(`${state}-G-G-`));
          value = nytMargin(race);
        } catch (e) { console.error(`baseline ${id}: ${e.message}`); }
      }
      b = { margin: value, kind: `${office === 'S' ? 'senate' : 'governor'}-${yr}`,
            label: `${yr} ${office === 'S' ? 'Senate' : 'governor'}`, likeForLike: value != null, source: url };
    }
    baseline[id] = { ...b, pres24, fetchedAt: now };
  }

  for (const r of races) r.stateName = STATE_NAMES[r.state];
  races.sort((a, b) => a.chamber.localeCompare(b.chamber) || a.state.localeCompare(b.state) || (a.district || 0) - (b.district || 0));

  writeFileSync(join(SRC, 'races.json'), JSON.stringify({
    generatedAt: now, source: 'NYT and NPR 2026 results feeds', redrawnStates: REDRAWN, races }, null, 1));
  writeFileSync(join(SRC, 'baseline.json'), JSON.stringify({ generatedAt: now, seats: baseline }, null, 1));

  const csv = join(SRC, 'ratings.csv');
  if (existsSync(csv)) console.log('ratings.csv exists, left untouched');
  else {
    const lines = ['race,chamber,state,district,rating'];
    for (const r of races) lines.push(`${r.id},${r.chamber},${r.state},${r.district ?? ''},`);
    writeFileSync(csv, lines.join('\n') + '\n');
    console.log('wrote blank ratings.csv');
  }
  const missing = Object.entries(baseline).filter(([, b]) => b.margin == null).map(([id, b]) => `${id}(${b.kind})`);
  console.log(`${races.length} races; no baseline margin for ${missing.length}: ${missing.join(' ')}`);
}

main().catch(e => { console.error(e); process.exit(1); });
