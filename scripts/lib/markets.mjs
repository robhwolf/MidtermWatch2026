// Kalshi's public prices for House and Senate control, appended to a history
// file so the page can chart them. The first run also fills in six months of
// Kalshi's own history. A failed fetch just skips a point: markets are a nice
// extra and must never affect the results run.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fetchJson } from './feeds.mjs';

const BASE = 'https://api.elections.kalshi.com/trade-api/v2/markets?event_ticker=';
const EVENTS = { house: 'CONTROLH-2026', senate: 'CONTROLS-2026' };
const MAX_POINTS = 3000;
const HISTORY_DAYS = 185;
const HOURLY_DAYS = 31;

const candlesUrl = (event, side, days, period, end) => {
  const series = event.split('-')[0];
  const start = end - days * 86400;
  return `https://api.elections.kalshi.com/trade-api/v2/series/${series}/markets/${event}-${side}/candlesticks?start_ts=${start}&end_ts=${end}&period_interval=${period}`;
};

function midpoint(bidText, askText, lastText) {
  const bid = Number(bidText), ask = Number(askText);
  const price = bid > 0 && ask > 0 ? (bid + ask) / 2 : Number(lastText);
  return Number.isFinite(price) ? Math.round(price * 1000) / 10 : null;
}

export function midPrices(markets, event) {
  const out = {};
  for (const m of markets) {
    const side = { [`${event}-D`]: 'D', [`${event}-R`]: 'R' }[m.ticker];
    if (!side) continue;
    const price = midpoint(m.yes_bid_dollars, m.yes_ask_dollars, m.last_price_dollars);
    if (price !== null) out[side] = price;
  }
  return out.D != null && out.R != null ? out : null;
}

// Candles for each chamber and side become points, keeping only the times every
// market has a price.
export function candlePoints(candles) {
  const byTime = new Map();
  for (const [key, sides] of Object.entries(candles)) {
    for (const [side, list] of Object.entries(sides)) {
      for (const c of list) {
        const price = midpoint(c.yes_bid?.close_dollars, c.yes_ask?.close_dollars, c.price?.close_dollars);
        if (price === null) continue;
        const at = new Date(c.end_period_ts * 1000).toISOString();
        if (!byTime.has(at)) byTime.set(at, { at });
        const point = byTime.get(at);
        (point[key] ||= {})[side] = price;
      }
    }
  }
  return [...byTime.values()]
    .filter(p => Object.keys(candles).every(k => p[k]?.D != null && p[k]?.R != null))
    .sort((a, b) => a.at.localeCompare(b.at));
}

async function loadHistory(days, period, end) {
  const candles = {};
  for (const [key, event] of Object.entries(EVENTS)) {
    candles[key] = {};
    for (const side of ['D', 'R']) {
      const url = candlesUrl(event, side, days, period, end);
      candles[key][side] = (await fetchJson(url, { timeoutMs: 15000 })).candlesticks || [];
    }
  }
  return candlePoints(candles);
}

async function backfill(doc, now) {
  const end = Math.floor(Date.parse(now) / 1000);
  const first = doc.points[0]?.at ?? now;
  const daily = await loadHistory(HISTORY_DAYS, 1440, end);
  const hourly = await loadHistory(HOURLY_DAYS, 60, end);
  const hourlyFrom = hourly[0]?.at ?? first;
  doc.points = [...daily.filter(p => p.at < hourlyFrom), ...hourly.filter(p => p.at < first), ...doc.points];
  doc.backfilled = true;
}

export async function updateMarkets(path, now) {
  const doc = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8'))
    : { source: 'Kalshi', sourceUrl: 'https://kalshi.com/category/elections', points: [] };
  try {
    const point = { at: now };
    for (const [key, event] of Object.entries(EVENTS)) {
      const prices = midPrices((await fetchJson(BASE + event, { timeoutMs: 10000 })).markets || [], event);
      if (!prices) throw new Error(`no prices for ${event}`);
      point[key] = prices;
    }
    if (!doc.backfilled) await backfill(doc, now).catch(e => console.warn(`Market history skipped: ${e.message}`));
    doc.points.push(point);
    doc.points = doc.points.slice(-MAX_POINTS);
    doc.updatedAt = now;
    writeFileSync(path, JSON.stringify(doc));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
