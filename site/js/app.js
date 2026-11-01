import {
  RATING_ORDER, averageSwing, balance, bellwethers, closesBy, dayET, dayTimeET, governors, isStale, isTossup, isUpset, isWatched,
  leader, margin, path, pollGroups, ratingParty, recentCalls, standing, staleLimitMinutes, swing, timeET,
} from './model.js';
import { SeatBar } from './seatbar.js';
import './theme.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https?:\/\//.test(u || '') ? esc(u) : null);
const link = (u, text) => (safeUrl(u) ? `<a href="${safeUrl(u)}" rel="noopener">${esc(text)}</a>` : esc(text));
const pty = p => `<span class="pty ${esc(p)}" title="${{ D: 'Democrat', R: 'Republican', I: 'Independent or other' }[p] || ''}">${esc(p)}</span>`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const signed = n => (n == null ? '–' : n === 0 ? 'Even' : `${n > 0 ? 'D' : 'R'}+${Math.abs(n).toFixed(1)}`);

const sample = new URLSearchParams(location.search).get('sample');
const DATA = sample && /^(pre|mid|final)$/.test(sample) ? `data/sample-${sample}.json` : 'data/results.json';
const REFRESH_MS = 60000;
const PAGE = 40;

let doc = null, lastGood = null, loadError = null;
let filters = { chamber: '', state: '', rating: 'competitive', status: '', closing: '', q: '' };
let shown = PAGE, sortKey = 'default', openRow = null;
const bars = {};
let knownCalls = null;

function raceName(r) {
  if (r.chamber === 'house') return `${r.state}-${r.atLarge ? 'AL' : r.district}`;
  return `${r.state} ${r.chamber === 'senate' ? (r.special ? 'Senate (special)' : 'Senate') : 'Governor'}`;
}

function ratingChip(c) {
  if (!c?.rating) return '<span class="rate assumed">Not rated</span>';
  if (c.assumed) return `<span class="rate assumed" title="No Cook rating entered; assumed from the seat holder">${esc(c.rating)}*</span>`;
  const [bg, fg] = ratingColors(c.rating);
  return `<span class="rate" style="--chip:${bg};--chip-ink:${fg}">${esc(c.rating)}</span>`;
}

function ratingColors(rating) {
  return {
    'Solid D': ['var(--d)', '#fff'], 'Likely D': ['var(--d-soft)', 'var(--ink)'], 'Lean D': ['var(--d-wash)', 'var(--ink)'],
    'Toss-up': ['var(--toss)', 'var(--ink)'],
    'Lean R': ['var(--r-wash)', 'var(--ink)'], 'Likely R': ['var(--r-soft)', 'var(--ink)'], 'Solid R': ['var(--r)', '#fff'],
  }[rating] || ['var(--rule)', 'var(--ink)'];
}

/* Header and alerts */
const limitText = m => (m >= 60 ? `${m / 60}-hour` : `${m}-minute`);
function renderStatus() {
  const now = Date.now();
  const at = doc?.generatedAt;
  const age = at ? Math.round((now - Date.parse(at)) / 60000) : 0;
  const ageText = age >= 120 ? `${Math.round(age / 60)} hours` : `${age} minutes`;
  const stale = !!at && !doc.sample && isStale(at, now);
  $('updated').textContent = at ? `Updated ${dayTimeET(at)}${stale ? ` · ${ageText} old` : ''}` : 'Waiting for the first update';
  $('updated').classList.toggle('late', stale || !!loadError);
  const alerts = [];
  if (doc?.sample) alerts.push(`Sample data, invented for testing. <a href="./">Live results</a>`);
  if (loadError) alerts.push('Could not reach the latest results. Showing the last ones loaded.');
  if (stale) {
    alerts.push(`These results are ${ageText} old, past the ${limitText(staleLimitMinutes(now))} limit. The update job may be delayed.`);
  }
  const down = (doc?.sources || []).filter(s => !s.ok && s.role === 'feed');
  if (down.length) alerts.push(`Source down: ${down.map(s => esc(s.name)).join(', ')}. Using the backup.`);
  const carried = (doc?.races || []).filter(r => r.carried).length;
  if (carried > 20) alerts.push(`${carried} races are showing their last known count because no source returned them.`);
  $('alerts').innerHTML = alerts.map(a => `<p class="alert" role="status">${a}</p>`).join('');
}

/* Balance of power */
function renderBalance() {
  const host = $('chambers');
  for (const key of ['house', 'senate']) {
    const label = key === 'house' ? 'House' : 'Senate';
    if (!bars[key]) {
      host.insertAdjacentHTML('beforeend', `<article class="chamber" id="c-${key}"><div class="head-slot"></div>
        <canvas class="seatbar" role="img"></canvas><div class="foot-slot"></div></article>`);
      bars[key] = new SeatBar(host.querySelector(`#c-${key} canvas`));
    }
    const cfg = doc.chambers[key];
    const b = balance(doc.races, key, cfg);
    const el = $(`c-${key}`);
    const goal = key === 'senate' ? `<strong>51 to win</strong><span>Republicans need 50, with the VP's tie-break</span>` : `<strong>218 to win</strong>`;
    el.querySelector('.head-slot').innerHTML = `<div class="chamber-head">
      <div class="tally D"><b>${b.won.D}</b><small>Dem<br>${b.leading.D ? `+${b.leading.D} leading` : ''}</small></div>
      <div class="goal"><h2>${label}</h2>${goal}</div>
      <div class="tally R right"><small>Rep<br>${b.leading.R ? `+${b.leading.R} leading` : ''}</small><b>${b.won.R}</b></div></div>`;
    const cv = el.querySelector('canvas');
    cv.setAttribute('aria-label', `${label}: Democrats ${b.won.D} won, ${b.leading.D} leading. Republicans ${b.won.R} won, ${b.leading.R} leading. ${b.uncalled} uncalled.`);
    bars[key].set(b);
    const flips = b.flips.D + b.flips.R;
    const other = b.won.I + b.leading.I;
    el.querySelector('.foot-slot').innerHTML = `${key === 'house' ? BAR_KEY : ''}<div class="chamber-foot">
      <span><strong>${b.uncalled}</strong> uncalled${other ? ` · <strong>${other}</strong> independent` : ''}${key === 'senate' ? ` · ${b.holdover.D + b.holdover.R} not up this year` : ''}</span>
      <span>${flips ? `Flipped: <strong>${b.flips.D} to D, ${b.flips.R} to R</strong>` : 'No seats flipped yet'}</span></div>${cookStrip(key)}`;
  }
  const g = governors(doc.races);
  $('governors').innerHTML = `<h2>Governors</h2>
    <span class="D"><b>${g.won.D}</b> Dem${g.leading.D ? `, +${g.leading.D} leading` : ''}</span>
    <span class="R"><b>${g.won.R}</b> Rep${g.leading.R ? `, +${g.leading.R} leading` : ''}</span>
    ${g.won.I ? `<span><b>${g.won.I}</b> Ind</span>` : ''}
    <span>${g.uncalled} of ${g.total} races uncalled</span>`;

  const calls = recentCalls(doc.races);
  $('latest').innerHTML = `<h2>Latest calls</h2>` + (calls.length
    ? calls.map(r => `<div class="call">${pty(r.call.party)}<span><a href="#races" data-race="${esc(r.id)}">${esc(raceName(r))}</a>: ${esc(r.call.name)}</span>
        <time>${timeET(r.firstCalledAt)}</time></div>`).join('')
    : `<p>No races called yet. First polls close at 6 pm ET on Tuesday.</p>`);
}

const BAR_KEY = `<div class="bar-key" aria-hidden="true"><span><i class="solid"></i>Called</span><span><i class="hatch"></i>Leading</span><span><i class="open"></i>Uncalled</span></div>`;

function cookStrip(chamber) {
  const list = doc.races.filter(r => r.chamber === chamber);
  const rated = list.filter(r => r.cook?.rating && !r.cook.assumed);
  if (!rated.length) return `<p class="cook-note">Cook ratings not entered yet.</p>`;
  const seg = RATING_ORDER.map(k => {
    const n = list.filter(r => r.cook?.rating === k).length;
    return n ? `<i title="${k}: ${n}" style="flex:${n};background:${ratingColors(k)[0]}"></i>` : '';
  }).join('');
  return `<div class="cook-strip" aria-hidden="true">${seg}</div><div class="cook-ends"><span>Safe D</span><span>Cook ratings</span><span>Safe R</span></div>`;
}

/* Table */
function matches(r) {
  if (filters.chamber && r.chamber !== filters.chamber) return false;
  if (filters.state && r.state !== filters.state) return false;
  if (filters.status && r.status !== filters.status) return false;
  if (filters.closing && !closesBy(r, doc.closings, filters.closing)) return false;
  if (filters.rating === 'competitive') {
    const anyRated = doc.races.some(x => x.cook?.rating && !x.cook.assumed);
    if (anyRated && !(r.cook?.rating && !/^Solid/.test(r.cook.rating))) return false;
  } else if (filters.rating === 'none') { if (r.cook?.rating) return false; }
  else if (filters.rating && r.cook?.rating !== filters.rating) return false;
  if (filters.q) {
    const hay = `${raceName(r)} ${r.stateName} ${(r.candidates || []).map(c => c.name).join(' ')}`.toLowerCase();
    if (!hay.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}

const SORTS = {
  default: (a, b) => (b.status === 'counting') - (a.status === 'counting') || RATING_ORDER.indexOf(a.cook?.rating) - RATING_ORDER.indexOf(b.cook?.rating) || a.id.localeCompare(b.id),
  race: (a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }),
  reporting: (a, b) => (b.reporting ?? -1) - (a.reporting ?? -1),
  margin: (a, b) => Math.abs(margin(a) ?? 999) - Math.abs(margin(b) ?? 999),
  swing: (a, b) => Math.abs(swing(b) ?? -1) - Math.abs(swing(a) ?? -1),
};

function statusCell(r) {
  if (r.status === 'called' && r.call) return `<span class="state-called">Called</span><span class="sub">${esc(r.call.by)}${r.firstCalledAt ? `, ${timeET(r.firstCalledAt)}` : ''}</span>`;
  if (r.status === 'runoff') return 'Runoff';
  if (r.status === 'counting') return `Counting${r.callConflict ? '<span class="sub">Sources disagree</span>' : ''}`;
  return r.carried ? 'No data' : 'No votes yet';
}

const columns = () => (matchMedia('(max-width: 640px)').matches ? 4 : 6);
const shortName = n => {
  const parts = String(n).split(' ');
  return parts.length > 1 ? `<span class="fn">${esc(parts.slice(0, -1).join(' '))} </span>${esc(parts.at(-1))}` : esc(n);
};

function detailRow(r) {
  const cands = (r.candidates || []).map(c => `<li class="cand">${pty(c.party)} ${esc(c.name)}${c.incumbent ? ' (incumbent)' : ''}
    ${c.votes ? `: ${c.votes.toLocaleString('en-US')} votes, ${c.pct}%` : ''}${c.winner ? ' · winner' : ''}</li>`).join('');
  const b = r.baseline;
  return `<tr class="detail"><td colspan="${columns()}"><ul>${cands}</ul><dl>
    <dt>Results</dt><dd>${r.source ? link(r.sourceUrl, r.source === 'manual' ? 'Manual entry' : r.source.toUpperCase()) : 'None yet'}${r.updatedAt ? `, ${dayTimeET(r.updatedAt)}` : ''}${r.carried ? ' (last known)' : ''}</dd>
    ${r.override?.note ? `<dt>Note</dt><dd>${esc(r.override.note)}</dd>` : ''}
    <dt>Rating</dt><dd>${esc(r.cook?.rating || 'Not rated')}. ${esc(r.cook?.source || 'None entered')}${r.cook?.updatedAt ? `, ${dayTimeET(r.cook.updatedAt)}` : ''}</dd>
    <dt>Baseline</dt><dd>${b?.margin != null ? `${signed(b.margin)}, ${link(b.source, b.label)}` : 'No two-party baseline for this seat'}${b?.pres24 != null ? `. 2024 president: ${signed(Math.round(b.pres24 * 10) / 10)}` : ''}</dd>
    <dt>Polls close</dt><dd>${(doc.closings.states[r.state]?.closes || []).map(c => `${timeET(c.at)} (${esc(c.area)})`).join('; ')}</dd>
    ${r.redrawn ? '<dt>Map</dt><dd>New district lines since 2024</dd>' : ''}
    ${r.runoffPrimary ? '<dt>Format</dt><dd>All-party primary on Nov 3. Without a majority winner, this goes to a Dec 12 runoff.</dd>' : ''}
  </dl></td></tr>`;
}

function renderTable() {
  const list = doc.races.filter(matches).sort(SORTS[sortKey]);
  $('count').textContent = `${plural(list.length, 'race')}${filters.rating === 'competitive' && doc.races.some(r => r.cook?.rating && !r.cook.assumed) ? ', competitive ratings only' : ''}`;
  const head = [['race', 'Race'], [null, 'Cook'], [null, 'Leader'], ['margin', 'Margin'], ['reporting', 'In'], [null, 'Status']];
  const cls = ['', '', '', 'n', 'n hide-sm', 'hide-sm'];
  const th = head.map(([k, t], i) => `<th scope="col" class="${cls[i]}"${k && sortKey === k ? ' aria-sort="ascending"' : ''}>${k ? `<button data-sort="${k}">${t}</button>` : t}</th>`).join('');
  const rows = list.slice(0, shown).map(r => {
    const top = r.status === 'called' && r.call ? r.call : leader(r);
    const m = margin(r);
    return `<tr class="row" data-id="${esc(r.id)}" tabindex="0" aria-expanded="${openRow === r.id}">
      <td><span class="race-name">${esc(raceName(r))}</span></td>
      <td>${ratingChip(r.cook)}</td>
      <td>${top ? `<span class="cand">${pty(top.party)} <span>${shortName(top.name)}</span></span>` : '<span class="sub">–</span>'}</td>
      <td class="n">${signed(m)}</td>
      <td class="n hide-sm">${r.reporting != null && r.votes ? `${r.reporting}%` : '–'}</td>
      <td class="hide-sm">${statusCell(r)}</td></tr>${openRow === r.id ? detailRow(r) : ''}`;
  }).join('');
  $('table').innerHTML = `<thead><tr>${th}</tr></thead><tbody>${rows || `<tr><td colspan="${columns()}">No races match these filters.</td></tr>`}</tbody>`;
  $('more').hidden = list.length <= shown;
}

function syncForm() {
  const f = $('filters');
  for (const k of Object.keys(filters)) f.elements[k].value = filters[k];
}

/* Upsets */
const ringPath = 'M6 13C10 4 34 1 58 2S99 8 97 15 74 25 48 25 3 22 4 13C5 8 12 5 20 4';
function renderUpsets() {
  const list = doc.races.filter(isUpset).sort((a, b) => (b.firstCalledAt || '').localeCompare(a.firstCalledAt || ''));
  $('upset-list').innerHTML = list.length ? list.map(r => `<div class="upset">
      <span class="ring"><svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path d="${ringPath}"/></svg>${esc(raceName(r))}</span>
      <p>Cook rated this ${esc(r.cook.rating)}. ${esc(r.call.name)} (${esc(r.call.party)}) won${margin(r) != null ? ` by ${Math.abs(margin(r)).toFixed(1)} points` : ''}. Called by ${esc(r.call.by)}.</p></div>`).join('')
    : `<p class="empty">No upsets yet. A race lands here when the winner differs from Cook's lean.</p>`;
  const toss = doc.races.filter(isTossup).sort((a, b) => Math.abs(margin(a) ?? 999) - Math.abs(margin(b) ?? 999));
  $('tossups').innerHTML = toss.length ? toss.map(r => {
    const s = standing(r);
    return `<div class="toss"><span>${esc(raceName(r))}</span><span>${s.kind === 'won' ? `${pty(s.party)} won` : r.votes ? signed(margin(r)) : 'Waiting'}</span></div>`;
  }).join('') : `<p class="empty">Toss-ups appear here once Cook ratings are entered.</p>`;
}

/* Timeline */
function renderTimeline() {
  const groups = pollGroups(doc.races, doc.closings);
  const bells = new Set(bellwethers(groups).map(r => r.id));
  const now = doc.sample ? Date.parse(doc.generatedAt) : Date.now();
  let placedNow = false;
  const parts = [];
  for (const g of groups) {
    const t = Date.parse(g.at);
    if (!placedNow && t > now && now > Date.parse(groups[0].at)) {
      parts.push(`<div class="now-line"><span>Now, ${timeET(new Date(now).toISOString())}</span></div>`);
      placedNow = true;
    }
    const names = g.states.map(s => {
      const earlier = s.closes.length > 1 ? ` <span class="split">(first ${timeET(s.first)})</span>` : '';
      return `<span title="${esc(s.closes.map(c => `${timeET(c.at)}: ${c.area}`).join('; '))}">${esc(s.state)}${earlier}</span>`;
    }).join('');
    const watch = g.states.flatMap(s => s.races);
    const list = watch.map(r => {
      const s = standing(r);
      const st = s.kind === 'won' ? ` · ${s.party} won` : r.votes ? ` · ${signed(margin(r))}` : '';
      return `<li class="${bells.has(r.id) ? 'bell' : ''}">${esc(raceName(r))} <span class="sub" style="display:inline">${esc(r.cook.rating)}${st}</span></li>`;
    }).join('');
    const allCalled = g.states.flatMap(s => s.all).filter(r => r.status === 'called').length;
    const all = g.states.flatMap(s => s.all).length;
    parts.push(`<div class="wave${t <= now ? ' past' : ''}"><p class="wave-time">${timeET(g.at)}<small>${allCalled} of ${plural(all, 'race')} called</small></p>
      <div class="states-row">${names}</div>${list ? `<ul class="watch">${list}</ul>` : ''}</div>`);
  }
  $('timeline').innerHTML = parts.join('');
  const first = bellwethers(groups);
  $('bells').innerHTML = first.length ? first.map(r => {
    const s = standing(r);
    const lead = s.party || (r.cook.rating === 'Toss-up' ? null : r.cook.rating.slice(-1));
    const st = s.kind === 'won' ? `${s.party} won` : r.votes ? signed(margin(r)) : 'Waiting';
    return `<li class="bell-row">${lead ? pty(lead) : '<span class="pty none"></span>'}<span><strong>${esc(raceName(r))}</strong><span class="sub">${esc(r.cook.rating)}, ${timeET(doc.closings.states[r.state].last)}</span></span><b>${st}</b></li>`;
  }).join('') : '<li class="plain">Bellwethers appear once Cook ratings are entered.</li>';
}

/* Path */
function renderPath() {
  const line = (b, p) => {
    const q = path(b, p);
    const name = p === 'D' ? 'Democrats' : 'Republicans';
    const text = q.state === 'clinched' ? `${name} have the majority`
      : q.state === 'out' ? `${name} can no longer reach ${b.toWin[p]}`
      : `${name} need ${q.need} of ${q.of} uncalled`;
    const note = q.state === 'alive' ? `${q.share}% of what is left, ${b.leading[p]} currently ahead` : `${b.won[p]} seats secured`;
    return `<div class="path-line">${pty(p)}<div><strong>${text}</strong><span class="t">${note}</span></div></div>`;
  };
  $('path-grid').innerHTML = ['house', 'senate'].map(k => {
    const b = balance(doc.races, k, doc.chambers[k]);
    return `<div class="path-item"><h3>${k === 'house' ? 'House' : 'Senate'}</h3>${line(b, 'D')}${line(b, 'R')}${k === 'senate' ? `<p class="cook-note">${esc(doc.chambers.senate.note)}</p>` : ''}</div>`;
  }).join('');
}

/* Swing */
function renderSwing() {
  const a = averageSwing(doc.races);
  const cell = (x, t) => `<div><b>${x.avg == null ? '–' : signed(x.avg).replace('+', ' +')}</b><span>${t}, ${x.n ? `from ${plural(x.n, 'called race')}` : 'none called yet'}</span></div>`;
  $('swing-avg').innerHTML = cell(a.house, 'House, same lines as 2024') + cell(a.senate, 'Senate, last election') + cell(a.governor, 'Governors, last election');
  const rows = doc.races.filter(r => swing(r) != null && r.reporting >= 50 && (r.chamber !== 'house' || !isSolidNoise(r)))
    .sort((x, y) => Math.abs(swing(y)) - Math.abs(swing(x))).slice(0, 20);
  const LIMIT = 60;
  const pos = m => 50 + (Math.max(-LIMIT, Math.min(LIMIT, m)) / LIMIT) * 50;
  $('swing-chart').innerHTML = rows.length ? `<div class="swing-row swing-head"><span></span>
      <div class="swing-axis"><span>Republican</span><span>Even</span><span>Democratic</span></div><span></span></div>
      <p class="swing-key"><i class="then"></i>Last election <i class="now"></i>Now</p>` + rows.map(r => {
    const now = margin(r), then = r.baseline.margin;
    const [l, h] = [pos(then), pos(now)].sort((x, y) => x - y);
    return `<div class="swing-row"><span>${esc(raceName(r))}<span class="sub">${esc(r.baseline.label)}</span></span>
      <div class="dumb" title="${esc(r.baseline.label)} ${signed(then)}, now ${signed(now)}"><span class="axis"></span><span class="bar" style="left:${l}%;width:${h - l}%"></span>
      <span class="then" style="left:${pos(then)}%"></span><span class="now" style="left:${pos(now)}%;background:var(--${now >= 0 ? 'd' : 'r'})"></span></div>
      <span class="n" style="text-align:right">${signed(swing(r))}</span></div>`;
  }).join('') + `<p class="cook-note">The largest swings with at least half the vote in. Each row names its baseline. Margins past 60 points sit at the edge.</p>`
    : `<p class="empty">Swing appears once races have at least half their vote in.</p>`;
}
const isSolidNoise = r => !r.baseline?.likeForLike;

/* Prediction markets */
const RANGES = [['6 hours', 6], ['24 hours', 24], ['2 weeks', 336], ['30 days', 720], ['6 months', 4392]];
let marketRange = 24;
let marketDoc = null;

function marketChart(points, key, title) {
  const stamp = marketRange > 24 ? dayET : marketRange === 24 ? dayTimeET : timeET;
  const W = 480, H = 170, L = 34, R = 14, T = 10, B = 24;
  const t0 = Date.parse(points[0].at), t1 = Date.parse(points.at(-1).at);
  const x = at => L + ((Date.parse(at) - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = v => T + (1 - v / 100) * (H - T - B);
  const line = p => points.map((d, i) => `${i ? 'L' : 'M'}${x(d.at).toFixed(1)} ${y(d[key][p]).toFixed(1)}`).join('');
  const grid = [0, 50, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--rule)"/>
    <text x="${L - 6}" y="${y(v)}" text-anchor="end" dominant-baseline="central">${v}%</text>`).join('');
  const last = points.at(-1)[key];
  const end = p => `<circle cx="${x(points.at(-1).at)}" cy="${y(last[p])}" r="4" fill="var(--${p.toLowerCase()})" stroke="var(--ground)" stroke-width="2"/>`;
  return `<figure class="market" data-key="${key}"><figcaption><strong>${title}</strong>
      <span class="read">${pty('D')} ${last.D}% &nbsp; ${pty('R')} ${last.R}%</span></figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}: Democrats ${last.D} percent, Republicans ${last.R} percent">
      ${grid}
      <text x="${L}" y="${H - 6}">${stamp(points[0].at)}</text>
      <text x="${W - R}" y="${H - 6}" text-anchor="end">${stamp(points.at(-1).at)}</text>
      <path d="${line('D')}" fill="none" stroke="var(--d)" stroke-width="2"/>
      <path d="${line('R')}" fill="none" stroke="var(--r)" stroke-width="2"/>
      ${end('D')}${end('R')}
      <line class="hair" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="var(--ink-2)" hidden/>
    </svg></figure>`;
}

function renderRanges() {
  $('market-range').innerHTML = `<span>Past</span><div class="range-set">${RANGES.map(([label, hours]) =>
    `<button type="button" data-hours="${hours}" aria-label="Past ${label}" aria-pressed="${hours === marketRange}">${label}</button>`).join('')}</div>`;
}

function renderMarkets(m) {
  marketDoc = m;
  const all = m?.points || [];
  $('markets').hidden = all.length < 2;
  if (all.length < 2) return;
  const since = Date.parse(all.at(-1).at) - marketRange * 3600000;
  const points = all.filter(p => Date.parse(p.at) >= since);
  if (points.length < 2) {
    $('market-chart').innerHTML = `<p class="empty">No prices in this timeframe yet. Try a longer one.</p>`;
    return;
  }
  const history = m.backfilled ? ` Earlier prices are Kalshi's hourly closes for the past month and daily closes before that.` : '';
  $('market-chart').innerHTML = `<div class="markets">${marketChart(points, 'house', 'House control')}${marketChart(points, 'senate', 'Senate control')}</div>
    <p class="cook-note">${link(m.sourceUrl, m.source)}, midpoint of the bid and ask. Last updated ${dayTimeET(points.at(-1).at)}.${history}</p>`;
  document.querySelectorAll('.market').forEach(fig => {
    const svg = fig.querySelector('svg'), hair = fig.querySelector('.hair'), read = fig.querySelector('.read'), key = fig.dataset.key;
    const reset = read.innerHTML;
    svg.addEventListener('pointermove', e => {
      const box = svg.getBoundingClientRect();
      const px = ((e.clientX - box.left) / box.width) * 480;
      const share = Math.min(1, Math.max(0, (px - 34) / (480 - 48)));
      const target = Date.parse(points[0].at) + share * (Date.parse(points.at(-1).at) - Date.parse(points[0].at));
      const d = points.reduce((a, b) => (Math.abs(Date.parse(b.at) - target) < Math.abs(Date.parse(a.at) - target) ? b : a));
      hair.hidden = false; hair.setAttribute('x1', px); hair.setAttribute('x2', px);
      read.innerHTML = `${(marketRange >= 24 ? dayTimeET : timeET)(d.at)} &nbsp; ${pty('D')} ${d[key].D}% &nbsp; ${pty('R')} ${d[key].R}%`;
    });
    svg.addEventListener('pointerleave', () => { hair.hidden = true; read.innerHTML = reset; });
  });
}

renderRanges();
$('market-range').addEventListener('click', e => {
  const button = e.target.closest('button');
  if (!button) return;
  marketRange = Number(button.dataset.hours);
  $('market-range').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b === button));
  renderMarkets(marketDoc);
});

async function loadMarkets() {
  try {
    const url = sample ? 'data/sample-markets.json' : 'data/markets.json';
    const res = await fetch(`${url}?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-store' });
    if (res.ok) renderMarkets(await res.json());
  } catch { /* markets are optional */ }
}

/* Footer */
function renderSources() {
  $('sources').innerHTML = (doc.sources || []).map(s => `<div class="source"><span class="dot${s.ok ? '' : ' bad'}"></span>
    <span>${esc(s.name)}: ${s.ok ? plural(s.races, 'race') : 'not available'}, checked ${dayTimeET(s.checkedAt)}${s.role === 'backstop' ? ' (backstop)' : ''}</span></div>`).join('')
    + `<p>${link(doc.chambers.sourceUrl, doc.chambers.source)} for seat totals. Swing baselines are named on each race.</p>`;
  $('closing-sources').innerHTML = Object.values(doc.closings.states).map(s =>
    `<p>${link(s.sourceUrl, s.state)}: ${esc(s.localHours)}, ${timeET(s.first)}${s.last !== s.first ? ` to ${timeET(s.last)}` : ''}${s.note ? `. ${esc(s.note)}` : ''}</p>`).join('');
}

function checkNewCalls() {
  const ids = new Set(doc.races.filter(r => r.status === 'called').map(r => r.id));
  if (knownCalls) {
    const fresh = doc.races.filter(r => ids.has(r.id) && !knownCalls.has(r.id));
    for (const k of ['house', 'senate']) if (fresh.some(r => r.chamber === k)) bars[k]?.sweep();
  }
  knownCalls = ids;
}

function renderAll() {
  renderStatus();
  if (!doc) return;
  renderBalance(); renderTable(); renderUpsets(); renderTimeline(); renderPath(); renderSwing(); renderSources();
  checkNewCalls();
}

async function load() {
  try {
    const res = await fetch(`${DATA}?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const next = await res.json();
    if (doc?.generatedAt === next.generatedAt) { loadError = null; renderStatus(); return; }
    doc = next; lastGood = next; loadError = null;
    renderAll();
  } catch {
    loadError = true;
    if (!doc && lastGood) doc = lastGood;
    renderStatus();
    if (!doc) $('updated').textContent = 'Results could not be loaded. Retrying each minute.';
  }
}

function initControls() {
  const f = $('filters');
  f.elements.rating.innerHTML = `<option value="competitive">Competitive</option><option value="">All</option>`
    + RATING_ORDER.map(r => `<option>${r}</option>`).join('') + `<option value="none">Not rated</option>`;
  f.addEventListener('input', e => {
    filters[e.target.name] = e.target.value;
    shown = PAGE; renderTable();
  });
  f.addEventListener('submit', e => e.preventDefault());
  $('more').addEventListener('click', () => { shown += PAGE; renderTable(); });
  const toggle = tr => { openRow = openRow === tr.dataset.id ? null : tr.dataset.id; renderTable(); };
  $('table').addEventListener('click', e => {
    const s = e.target.closest('button[data-sort]');
    if (s) { sortKey = sortKey === s.dataset.sort ? 'default' : s.dataset.sort; renderTable(); return; }
    const tr = e.target.closest('tr.row');
    if (tr && !e.target.closest('a')) toggle(tr);
  });
  $('table').addEventListener('keydown', e => {
    const tr = e.target.closest('tr.row');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(tr); }
  });
  $('latest').addEventListener('click', e => {
    const a = e.target.closest('[data-race]'); if (!a) return;
    const r = doc.races.find(x => x.id === a.dataset.race);
    filters = { chamber: '', state: r.state, rating: '', status: '', closing: '', q: '' };
    openRow = r.id; syncForm(); renderTable();
  });
}

function initStates() {
  const sel = $('filters').elements.state;
  const seen = new Map(doc.races.map(r => [r.state, r.stateName]));
  sel.innerHTML = `<option value="">All</option>` + [...seen].sort((a, b) => String(a[1]).localeCompare(String(b[1])))
    .map(([s, n]) => `<option value="${esc(s)}">${esc(n || s)}</option>`).join('');
}

function initClosings() {
  $('filters').elements.closing.innerHTML = `<option value="">All</option>`
    + pollGroups(doc.races, doc.closings).map(g => `<option value="${g.at}">By ${timeET(g.at)}</option>`).join('');
}

initControls();
await load();
if (doc) { initStates(); initClosings(); }
loadMarkets();
setInterval(load, REFRESH_MS);
setInterval(loadMarkets, REFRESH_MS * 5);
setInterval(() => { renderStatus(); }, 30000);
