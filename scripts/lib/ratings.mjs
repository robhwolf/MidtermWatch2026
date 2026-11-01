// Cook ratings CSV. Hand-entered, so the parser forgives spelling and reports
// anything it cannot read instead of dropping it silently.

const ALIASES = {
  'solid d': 'Solid D', 'safe d': 'Solid D', 'likely d': 'Likely D', 'lean d': 'Lean D',
  'toss-up': 'Toss-up', 'tossup': 'Toss-up', 'toss up': 'Toss-up',
  'lean r': 'Lean R', 'likely r': 'Likely R', 'solid r': 'Solid R', 'safe r': 'Solid R',
};

export const RATINGS = ['Solid D', 'Likely D', 'Lean D', 'Toss-up', 'Lean R', 'Likely R', 'Solid R'];

export function csvRows(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// The race column may hold an id or a candidate's name, so the id comes from
// chamber, state and district when they are there.
function raceId(chamberText, stateText, districtText) {
  const chamber = (chamberText || '').trim().toLowerCase();
  const state = (stateText || '').trim().toUpperCase();
  const district = (districtText || '').trim();
  if (!state) return null;
  if (chamber === 'senate') return `${state}-S`;
  if (chamber === 'governor') return `${state}-G`;
  if (chamber !== 'house' || !district) return null;
  return `${state}-H-${/^(al|0)$/i.test(district) ? 1 : Number(district)}`;
}

export function parseRatings(text) {
  const [head, ...rows] = csvRows(text);
  const col = Object.fromEntries((head || []).map((h, i) => [h.trim().toLowerCase(), i]));
  const ratings = {}, problems = [];
  for (const row of rows) {
    const id = raceId(row[col.chamber], row[col.state], row[col.district]) || (row[col.race] || '').trim();
    const raw = (row[col.rating] || '').trim();
    if (!id || !raw) continue;
    const rating = ALIASES[raw.toLowerCase().replace(/\s+/g, ' ')];
    if (rating) ratings[id] = rating;
    else problems.push(`${id}: unrecognised rating "${raw}"`);
  }
  return { ratings, problems };
}

// Blank means Solid for the seat holder, marked assumed. Redrawn seats have
// no meaningful holder, so they stay Not rated until entered.
export function resolveRating(id, roster, ratings) {
  if (ratings[id]) return { rating: ratings[id], assumed: false };
  if (roster.redrawn || !roster.holder || roster.holder === 'I') return { rating: null, assumed: false };
  return { rating: `Solid ${roster.holder}`, assumed: true };
}
