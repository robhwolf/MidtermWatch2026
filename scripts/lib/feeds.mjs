// Parsers for the public results feeds. Each parser turns one feed's JSON into
// the same normalised race shape, so the merge step never sees feed quirks.
//
// Shape: { id, chamber, source, sourceUrl, updatedAt, votes, reporting,
//          candidates:[{name,party,votes,pct,incumbent,winner}],
//          call:{party,name,at,by}|null, runoff:bool }

export const NYT_BASE = 'https://static01.nyt.com/elections-assets/pages/data/2026-11-03';
export const NPR_BASE = 'https://apps.npr.org/2026-election-results/data';
export const CNN_BASE = 'https://politics.api.cnn.io/results/race';

const PARTY = {
  DEM: 'D', Dem: 'D', D: 'D', Democrat: 'D', Democratic: 'D', democrat: 'D',
  GOP: 'R', REP: 'R', R: 'R', Republican: 'R', republican: 'R',
};
export const party = p => PARTY[p] || 'I';

// "NC-S", "FL-S", "TX-H-9", "AK-H-1", "OH-G". Each is unique in the roster.
export const raceId = (state, office, seat) =>
  office === 'H' ? `${state}-H-${Number(seat) || 1}` : `${state}-${office}`;

const CHAMBER = { S: 'senate', H: 'house', G: 'governor' };
const round1 = n => Math.round(n * 10) / 10;

function withPct(cands, total) {
  return cands
    .map(c => ({ ...c, pct: total > 0 ? round1((c.votes / total) * 100) : null }))
    .sort((a, b) => b.votes - a.votes);
}

export function parseNyt(json, url) {
  const out = [];
  for (const r of json.races || []) {
    const m = /^([A-Z]{2})-[A-Z_]+-([SHG])(?:-(\d+))?-/.exec(r.nyt_id);
    if (!m || m[1] === 'US') continue; // US-G-H is a national roll-up, not a seat
    const [, state, office, seat] = m;
    const unit = (r.reporting_units || []).find(u => u.level === 'state') || r.reporting_units?.[0];
    if (!unit) continue;
    const meta = r.candidate_metadata || {};
    const won = r.outcome?.won || [];
    const cands = (unit.candidates || []).map(c => {
      const d = meta[c.nyt_id] || {};
      return {
        name: [d.first_name, d.last_name].filter(Boolean).join(' ') || c.nyt_id,
        party: party(d.party?.nyt_id),
        votes: c.votes?.total ?? 0,
        incumbent: !!d.incumbent,
        winner: won.includes(c.nyt_id),
      };
    });
    const total = unit.total_votes ?? cands.reduce((s, c) => s + c.votes, 0);
    const sorted = withPct(cands, total);
    const w = sorted.find(c => c.winner);
    out.push({
      id: raceId(state, office, seat),
      chamber: CHAMBER[office],
      source: 'nyt',
      sourceUrl: url,
      updatedAt: unit.provider_updated_at || r.updated_at || null,
      votes: total,
      reporting: unit.eevp ?? null,
      candidates: sorted,
      call: w ? {
        party: w.party, name: w.name,
        at: r.outcome?.winner_accepted_at?.[0] || null,
        by: (r.outcome?.called_by || []).map(s => s.toUpperCase()).join(', ') || 'NYT',
      } : null,
      runoff: (r.outcome?.advanced_to_runoff || []).length > 0,
    });
  }
  return out;
}

export function parseNpr(json, url) {
  const out = [];
  for (const r of json.results || []) {
    if (r.test) continue;                       // NPR marks rehearsal data
    if (!['S', 'H', 'G'].includes(r.office)) continue;
    const cands = (r.candidates || []).map(c => ({
      name: [c.first, c.last].filter(Boolean).join(' '),
      party: party(c.party),
      votes: c.votes ?? 0,
      incumbent: !!c.incumbent,
      winner: c.winner === 'X',
      winnerAt: c.winnerDateTime || null,
    }));
    const total = cands.reduce((s, c) => s + c.votes, 0);
    const sorted = withPct(cands, total);
    const w = sorted.find(c => c.winner);
    out.push({
      id: raceId(r.state, r.office, r.seatNumber),
      chamber: CHAMBER[r.office],
      source: 'npr',
      sourceUrl: url,
      updatedAt: r.updated ? new Date(r.updated).toISOString() : null,
      votes: total,
      reporting: r.eevp != null ? Math.round(r.eevp * 100) : null,
      candidates: sorted.map(({ winnerAt, ...c }) => c),
      call: w ? { party: w.party, name: w.name, at: w.winnerAt, by: 'AP' } : null,
      runoff: /runoff/i.test(r.raceCallStatus || ''),
      holder: r.previousParty ? party(r.previousParty) : null,
    });
  }
  return out;
}

export function parseCnn(json, id, url) {
  const cands = (json.candidates || []).map(c => ({
    name: c.fullName,
    party: party(c.candidatePartyCode),
    votes: c.voteNum ?? 0,
    incumbent: !!c.isIncumbent,
    winner: !!c.winner,
  }));
  const total = json.totalVote ?? cands.reduce((s, c) => s + c.votes, 0);
  const sorted = withPct(cands, total);
  const w = sorted.find(c => c.winner);
  const office = id.split('-')[1];
  return {
    id,
    chamber: CHAMBER[office],
    source: 'cnn',
    sourceUrl: url,
    updatedAt: json.voteTimestamp || null,
    votes: total,
    reporting: json.percentReporting ?? null,
    candidates: sorted,
    call: w ? { party: w.party, name: w.name, at: json.voteTimestamp || null, by: 'CNN' } : null,
    runoff: sorted.some((c, i) => json.candidates?.[i]?.runoffCandidate),
  };
}

// CNN keys per race. Special Senate races are not at SG; they return 404 and
// the caller just treats that as "not available from this source".
export const cnnKey = id => {
  const [state, office, seat] = id.split('-');
  return office === 'H' ? `2026-HG-${state}-${seat}` : `2026-${office}G-${state}`;
};

export async function fetchJson(url, { timeoutMs = 25000, retries = 1 } = {}) {
  let last;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': 'MidtermWatch2026 (personal election dashboard)', Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) { last = e; }
  }
  throw last;
}
