// Kalshi's public prices for House and Senate control, appended to a history
// file so the page can chart them over the night. A failed fetch just skips a
// point: markets are a nice extra and must never affect the results run.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fetchJson } from './feeds.mjs';

const BASE = 'https://api.elections.kalshi.com/trade-api/v2/markets?event_ticker=';
const EVENTS = { house: 'CONTROLH-2026', senate: 'CONTROLS-2026' };
const MAX_POINTS = 3000;

export function midPrices(markets, event) {
  const out = {};
  for (const m of markets) {
    const side = { [`${event}-D`]: 'D', [`${event}-R`]: 'R' }[m.ticker];
    if (!side) continue;
    const bid = Number(m.yes_bid_dollars), ask = Number(m.yes_ask_dollars);
    const price = bid > 0 && ask > 0 ? (bid + ask) / 2 : Number(m.last_price_dollars);
    if (Number.isFinite(price)) out[side] = Math.round(price * 1000) / 10;
  }
  return out.D != null && out.R != null ? out : null;
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
    doc.points.push(point);
    doc.points = doc.points.slice(-MAX_POINTS);
    doc.updatedAt = now;
    writeFileSync(path, JSON.stringify(doc));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
