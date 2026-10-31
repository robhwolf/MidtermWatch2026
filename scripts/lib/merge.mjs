// Combines feed records, last-good data and manual overrides into one record
// per race. Pure functions; no network, so the failure paths are testable.

const STATUS = { PENDING: 'pending', COUNTING: 'counting', CALLED: 'called', RUNOFF: 'runoff' };

// Before this instant nothing can be a real result, so a feed carrying votes
// is a rehearsal. 23:00 UTC on 3 Nov is 6pm ET, the first poll close.
export const FIRST_CLOSE = Date.parse('2026-11-03T23:00:00Z');

// The feed with the most votes counted is the freshest view of that race.
// Ties go to the earlier feed in the list, which is the priority order.
export function pickRecord(records) {
  return records.reduce((best, r) => (!best || (r.votes || 0) > (best.votes || 0) ? r : best), null);
}

function anyCall(records) {
  const called = records.filter(r => r.call);
  if (!called.length) return { call: null, conflict: false };
  const parties = new Set(called.map(r => r.call.party));
  return {
    call: { ...called[0].call, by: [...new Set(called.map(r => r.call.by))].join(', ') },
    conflict: parties.size > 1,
  };
}

// A real count does not fall by half between runs; a broken feed does.
export function looksBroken(next, prev) {
  return !!prev && prev.votes > 1000 && (next.votes || 0) < prev.votes * 0.5;
}

export function mergeRace(id, fresh, prev, now, nowMs = Date.parse(now)) {
  const live = (fresh || []).filter(r => r && !looksBroken(r, prev));
  const rehearsal = nowMs < FIRST_CLOSE;
  const clean = rehearsal
    ? live.map(r => ({ ...r, votes: 0, reporting: 0, call: null, runoff: false,
        candidates: r.candidates.map(c => ({ ...c, votes: 0, pct: null, winner: false })) }))
    : live;

  const rec = pickRecord(clean);
  if (!rec) return prev ? { ...prev, carried: true } : null;

  const { call, conflict } = anyCall(clean);
  const runoff = clean.some(r => r.runoff) && !call;
  const status = call ? STATUS.CALLED : runoff ? STATUS.RUNOFF : rec.votes > 0 ? STATUS.COUNTING : STATUS.PENDING;
  return {
    id,
    chamber: rec.chamber,
    status,
    votes: rec.votes,
    reporting: rec.reporting,
    candidates: rec.candidates.slice(0, 5),
    call,
    callConflict: conflict,
    source: rec.source,
    sourceUrl: rec.sourceUrl,
    updatedAt: rec.updatedAt || now,
    checkedAt: now,
    carried: false,
    override: null,
    firstCalledAt: prev?.firstCalledAt && call ? prev.firstCalledAt : call ? (call.at || now) : null,
  };
}

// overrides.json: { "NC-S": { "call": { "party":"D", "name":"Roy Cooper" },
//                             "reporting": 98, "candidates": [...], "note": "..." } }
// "call": null clears a feed's call, so a bad call can be retracted.
export function applyOverride(race, ov, now) {
  if (!ov) return race;
  const r = { ...race };
  if ('call' in ov) {
    r.call = ov.call ? { ...ov.call, at: ov.call.at || ov.at || now, by: ov.by || 'Manual' } : null;
    r.status = r.call ? 'called' : r.votes > 0 ? 'counting' : 'pending';
    r.callConflict = false;
    r.firstCalledAt = r.call ? r.call.at : null;
  }
  if (ov.reporting != null) r.reporting = ov.reporting;
  if (Array.isArray(ov.candidates)) {
    const total = ov.candidates.reduce((s, c) => s + (c.votes || 0), 0);
    r.candidates = ov.candidates
      .map(c => ({ incumbent: false, winner: false, ...c,
        pct: total ? Math.round((c.votes / total) * 1000) / 10 : null }))
      .sort((a, b) => b.votes - a.votes);
    r.votes = total;
    if (r.status === 'pending' && total > 0) r.status = 'counting';
  }
  r.override = { note: ov.note || null, at: ov.at || now };
  r.source = 'manual';
  r.sourceUrl = 'data/source/overrides.json';
  r.updatedAt = ov.at || now;
  return r;
}
