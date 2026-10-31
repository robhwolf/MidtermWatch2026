---
name: Midterm Watch 2026
description: A familiar election-results page in lichen-white and pine ink, where every seat is a living blade of grass.
colors:
  ground: "#f3f5ee"
  raised: "#fbfcf8"
  ink: "#1b2822"
  ink-2: "#47564d"
  ink-3: "#647268"
  rule: "#d6dccf"
  blade: "#cdd4c3"
  slate-blue: "#2f6d9e"
  brick-red: "#b8483e"
  heather: "#7a6a9a"
  slate-blue-soft: "#8fb3cf"
  brick-red-soft: "#dda59f"
  slate-blue-wash: "#dfe9f0"
  brick-red-wash: "#f4e2df"
  toss-straw: "#d9c98f"
  warn-bg: "#f5e7c4"
  warn-ink: "#5b4610"
  pencil: "#c0772a"
  dusk-1: "#e7a86a"
  dusk-2: "#a0616f"
  dusk-3: "#4a4a78"
  dusk-4: "#1c2440"
typography:
  numeral-display:
    fontFamily: "Big Shoulders Display, Arial Narrow, Roboto Condensed, sans-serif"
    fontSize: "clamp(3.2rem, 11vw, 5.5rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.01em"
  numeral-title:
    fontFamily: "Big Shoulders Display, Arial Narrow, Roboto Condensed, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 4vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "1.1rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Schibsted Grotesk, system-ui, sans-serif"
    fontSize: ".8rem"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  sm: "6px"
  md: "8px"
  pill: "999px"
  pebble: "45% 55% 50% 50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "24px"
  xl: "40px"
  gutter: "clamp(16px, 4vw, 32px)"
components:
  segmented-toggle:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "2px"
  segmented-toggle-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  more-button:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
  filter-field:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "7px 8px"
    height: "40px"
  alert:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn-ink}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  rating-chip:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "1px 7px"
  tooltip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
---

# Design System: Midterm Watch 2026

## Overview

**Creative North Star: "The Results Page in the Meadow"**

A familiar news-site results page (masthead, jump links, hairline-ruled sections, tables) whose seat bars are alive: every seat is a blade of grass, every state a pebble. The structure is the category standard so friends in a group chat, on phones, on election night, never have to learn it; the flourishes are the part a network would find too daring. Cool lichen-white ground, pine-green ink, muted slate blue and brick red for the parties, moss neutrals. It refuses both the KPI-card dashboard and the cream-and-serif "organic" default.

Density is that of a results page: thin rules instead of cards, tabular numerals, giant condensed counts as the only loud type. A dark night theme follows the system preference (or `data-theme`) and keeps the same roles on a deep green-black ground.

**Key Characteristics:**
- Hairline rules and whitespace carry structure; there are no cards and no shadows.
- Party color is muted slate blue and brick red, never saturated, always paired with a letter or label.
- Big Shoulders numerals for counts and times; Schibsted Grotesk for everything else.
- Hand-drawn naturalist details (grass-tuft heading underline, pencil ring, dusk rail) used sparingly as signatures.

## Colors

Cool lichen paper with pine ink, two muted party hues, and one warm pencil-orange used only for human annotation.

### Primary
- **Slate Blue** (#2f6d9e): Democratic seats, tallies, party dots, positive-source dot. Lighter on dark (#5a9bd0).
- **Brick Red** (#b8483e): Republican seats, tallies, bad-source dot. Lighter on dark (#d9705f).

### Secondary
- **Heather** (#7a6a9a): Independents. Soft and wash variants of blue and red (#8fb3cf, #dda59f, #dfe9f0, #f4e2df) fill rating chips and lean states.

### Tertiary
- **Pencil Orange** (#c0772a): The scribbled ring around upsets, the now-line, bell-race outlines, and the focus ring. Nothing else.
- **Toss Straw** (#d9c98f): Toss-up seats and text selection.
- **Warn Straw / Warn Ink** (#f5e7c4 / #5b4610): Alert banner only.
- **Dusk Rail** (#e7a86a, #a0616f, #4a4a78, #1c2440): The gradient on the poll-closing timeline, sunset to night.

### Neutral
- **Lichen Ground** (#f3f5ee): Page and sticky masthead.
- **Raised Paper** (#fbfcf8): Inputs, toggles, expanded detail rows.
- **Pine Ink** (#1b2822): Body text and active states.
- **Moss Ink 2 / 3** (#47564d / #647268): Secondary text and metadata.
- **Rule** (#d6dccf) and **Blade** (#cdd4c3): Hairlines, and unfilled seat blades.

### Named Rules
**The Muted Party Rule.** Blue and red stay at the slate and brick values above; the soft and wash variants are for fills. Never use a saturated news-network blue or red.
**The Pencil Rule.** Orange means a human marked it: an upset, the current time, a watch race, or keyboard focus.

## Typography

**Display Font:** Big Shoulders Display (with Arial Narrow, Roboto Condensed, sans-serif)
**Body Font:** Schibsted Grotesk (with system-ui, sans-serif)

**Character:** A condensed scoreboard numeral against a plain, friendly grotesk. The numerals read from across a room; the grotesk disappears into the data.

### Hierarchy
- **Numeral Display** (800, clamp(3.2rem, 11vw, 5.5rem), 0.9): The giant D and R chamber counts.
- **Numeral Title** (800, 1.6rem, 1.1, uppercase): Masthead title. Smaller numerals (2.4rem, 2rem, 1.5rem) serve swing averages, governor counts, and wave times.
- **Headline** (700, clamp(1.5rem, 4vw, 2rem), 1.15, -0.02em): Section h2, balanced wrap.
- **Title** (700, 1.1rem, 1.3): h3 and compact section heads.
- **Body** (400, 16px, 1.5): Ledes capped at 65ch; table text .93rem.
- **Label** (500, .78-.9rem): Table headers, filter labels, metadata in Moss Ink; tabular-nums on numeric columns.

### Named Rules
**The Numerals Only Rule.** Big Shoulders is for numbers, times, and the masthead title. Never set sentences in it.

## Layout

One centered column, max-width 1120px, gutter clamp(16px, 4vw, 32px). Sections are separated by a 1px rule with 40px vertical padding; no containers. Spacing runs on a small scale (4, 8, 12, 24, 40px). The masthead is sticky with a horizontally scrolling jump-link row. The first viewport stacks the House meadow (giant counts either side of a center majority marker, three-column grid), the Senate meadow, governors, then latest calls. From 900px the map block splits into a map (2.2fr) and a key column; below 640px secondary table columns hide, meadows shorten, and map labels grow to 17px. Auto-fill grids (minmax 240-300px) handle calls, toss-ups, and path cards.

## Elevation & Depth

Flat. No box-shadows are used for elevation; depth is tonal (Lichen Ground vs Raised Paper) and by hairline rules. Inset 1px ring shadows are used only as borders on chips. The sole floating element is the dark tooltip.

### Named Rules
**The Hairline Rule.** Separate with a 1px Rule line, not a card, shadow, or fill.

## Shapes

Mostly soft: 8px on inputs and alerts, 6px on tooltips, full pills for toggles, chips and the "more" button. Party badges and map tiles use an irregular pebble silhouette (border-radius 45% 55% 50% 50%) so no shape is a perfect circle or square. Seats are thin vertical blades. Section headings carry a small masked grass-tuft underline (74x9px).

## Components

### Segmented Toggle
Pill outlined in Rule on Raised Paper; the pressed option inverts to Ink on Ground. 5px 14px padding, .9rem.

### Filter Fields and Table
Selects and inputs: Raised Paper, 1px Rule border, 8px radius, 40px min height. Tables are rule-only: left-aligned .78rem headers with an Ink-3 underline, 8px cell padding, row hover to Raised Paper, tap to expand a definition-list detail row.

### Rating Chip and Watch Pills
Pill chips tinted with the lean color; "assumed" ratings are outline-only. Watch pills use an inset 1px Rule ring; bell races use a 1.5px Pencil ring.

### Meadow (signature)
One blade per seat, colored by party, Blade-gray when undecided; a ripple plays on a real call. Respects reduced motion.

### Pebble Map
State tiles as pebble shapes with centered bold labels; hover or selection strokes the edge in Ink, focus in Pencil.

### Pencil Ring and Dusk Rail
The ring is a hand-drawn orange ellipse around an upset margin. The timeline has a 6px gradient rail from dusk-1 to dusk-4 with ring-dot waves and an orange now-line.

### Alert and Tooltip
Warn Straw banner, 8px radius. Tooltip: Ink background, Ground text, .82rem.

## Do's and Don'ts

### Do:
- **Do** keep the results-page skeleton: masthead, jump links, hairline sections.
- **Do** pair every party color with a letter or label (D, R, I).
- **Do** use tabular numerals in all numeric columns.
- **Do** keep the 2px Pencil focus ring on every interactive element.
- **Do** define dark values by overriding the same custom properties.

### Don't:
- **Don't** use KPI cards, gradient hero panels, or saturated party colors.
- **Don't** use a serif or cream ground.
- **Don't** add shadows for elevation.
- **Don't** use Pencil Orange for decoration.

## Not canonized

Hard-coded party hexes in `.pty` badges (#2f6d9e, #b8483e, #6d5e8c) duplicate tokens and Independent drifts from Heather; the build carries this as a defect, not a rule.
