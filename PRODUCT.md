# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS on GitHub Pages, no framework and no build tooling on the page itself. Data refresh is a Node script run by a GitHub Actions cron, writing JSON the page reads (user-specified static site + Actions; Node chosen because the owner's machine has no Python).

## Users

The owner and friends, following the 2026 US midterms together. The link is passed around a group chat. People open it repeatedly on phones on election night to get the state of play in seconds. They follow politics but are not data specialists. Between now and Tuesday it is a preview of the battleground, checked casually.

## Product Purpose

One shareable page for House, Senate and governor races: Cook ratings before the election, and live results, calls, upsets and paths to majority on the night. Success is a friend opening the link and knowing within seconds where each chamber stands and what just changed.

## Positioning

Set against Cook's own ratings rather than one network's narrative: every race is read against what Cook expected, so upsets, swing and the path to majority sit on one page. It says where each number came from and how old it is.

## Operating Context

- Election Day is Tuesday 3 November 2026. All times shown in Eastern Time and labelled ET.
- Cron refresh: twice daily until Election Day, every 5 minutes from first poll close through the next morning, then hourly. GitHub's scheduler can lag 5 to 10 minutes.
- The owner enters Cook ratings by hand in a CSV and can override results or call races by hand in JSON on election night.
- Louisiana's six House seats hold an all-party primary on 3 November with a 12 December runoff, so some control questions may stay open after the night.

## Capabilities and Constraints

- Cook ratings are never scraped.
- Results come from public feeds with fallback between at least two sources. Every data point keeps its source and timestamp.
- Poll closing times come from each state's election office, with the source URL recorded.
- Swing baseline is hybrid and always labelled: 2024 House margin for unchanged seats, last election for Senate and governors, 2024 presidential margin on the new lines for redrawn districts. National average swing uses like-for-like seats only.
- Blank Cook ratings mean Solid for the seat holder, marked as assumed; redrawn districts stay Not rated until entered.
- Stale warning: 20 minutes during the 5-minute window, otherwise relative to the current cadence.

## Brand Commitments

- Name: Midterm Watch 2026.
- Natural, organic look, avoiding AI design cliches.
- Red and blue party colours, muted, contrasting well against the natural look.
- Clean and mobile-friendly.

## Evidence on Hand

- Sample data is synthetic and must be labelled as sample wherever it is shown.
- No forecasts, results or ratings may be invented for the live site.

## Product Principles

1. Fast scan first: the seat count and what just changed must never take hunting.
2. Never claim currency the data lacks: show age and source, and warn when stale.
3. Cook is the yardstick: every result is read against the rating.
4. A failed source must not blank the page: fall back, keep the last good data, say so.
5. The phone in a group chat is the primary screen.

## Accessibility & Inclusion

Party must never be encoded by colour alone; pair it with a letter or position, since red/blue must survive colour-blind reading and muted tones.
