#!/usr/bin/env node
// Turns the table in lib/closings-data.mjs into data/source/poll-closings.json.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKED_ON, STATES } from './lib/closings-data.mjs';

const EST_OFFSET_HOURS = 5;
const nov3 = Date.UTC(2026, 10, 3);
const iso = h => new Date(nov3 + (h + EST_OFFSET_HOURS) * 3600e3).toISOString();

const states = Object.fromEntries(STATES.map(([state, rule, closes, sourceUrl, note]) => [state, {
  state, localHours: rule, sourceUrl, note: note || null, checkedOn: CHECKED_ON,
  first: iso(closes[0][0]), last: iso(closes[closes.length - 1][0]),
  closes: closes.map(([h, area]) => ({ at: iso(h), area })),
}]));
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'source', 'poll-closings.json'),
  JSON.stringify({ checkedOn: CHECKED_ON, states }, null, 1));
console.log(Object.keys(states).length, 'states');
