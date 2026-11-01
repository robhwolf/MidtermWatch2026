---
name: Midterm Watch 2026
description: An election-results page set like a survey sheet on linen, read off brown-ink scale bars.
colors:
  linen-ground: "#f8f3e9"
  linen-raised: "#fffcf5"
  brown-ink: "#2f261b"
  brown-ink-2: "#5a4d3c"
  brown-ink-3: "#6c5e4b"
  sheet-rule: "#e4dacb"
  contour-brown: "#9a7b56"
  slate-blue: "#2f6d9e"
  brick-red: "#b8483e"
  heather: "#6d5e8c"
  slate-blue-soft: "#8fb3cf"
  brick-red-soft: "#dda59f"
  slate-blue-wash: "#e0e8ea"
  brick-red-wash: "#f6e1d6"
  toss-straw: "#dcc58e"
  warn-bg: "#f3e6c4"
  warn-ink: "#4f3f0e"
  pencil: "#a4530f"
  walnut-ground: "#2b2018"
  walnut-raised: "#37291e"
  walnut-ink: "#f0e5d2"
typography:
  numeral-display:
    fontFamily: "Archivo Narrow, Arial Narrow, Roboto Condensed, sans-serif"
    fontSize: "clamp(3.2rem, 11vw, 5.5rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "0em"
  masthead:
    fontFamily: "Archivo Narrow, Arial Narrow, Roboto Condensed, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.04em"
  legend-head:
    fontFamily: "Archivo Narrow, Arial Narrow, Roboto Condensed, sans-serif"
    fontSize: "clamp(1.15rem, 3.4vw, 1.45rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  legend-sub:
    fontFamily: "Archivo Narrow, Arial Narrow, Roboto Condensed, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.05em"
  body:
    fontFamily: "Source Sans 3, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Source Sans 3, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "3px"
  md: "8px"
  pill: "999px"
spacing:
  gutter: "clamp(16px, 4vw, 32px)"
  section: "40px"
  row: "6px"
  col-gap: "28px"
components:
  table-sheet:
    backgroundColor: "{colors.linen-raised}"
    textColor: "{colors.brown-ink}"
    rounded: "0"
  field:
    backgroundColor: "{colors.linen-raised}"
    textColor: "{colors.brown-ink}"
    rounded: "{rounded.sm}"
    padding: "7px 8px"
    height: "40px"
  button-more:
    backgroundColor: "{colors.linen-raised}"
    textColor: "{colors.brown-ink}"
    rounded: "{rounded.sm}"
    padding: "8px 18px"
  party-tile-dem:
    backgroundColor: "{colors.slate-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
  party-tile-rep:
    backgroundColor: "{colors.brick-red}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
  alert-stale:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn-ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
---

# Design System: Midterm Watch 2026

## Overview

**Creative North Star: "The Survey Sheet"**

The page is a results sheet drawn like a topographic quad: linen paper, brown ink, a muted slate blue and brick red for the two parties. Counts are read off scale bars the way distance is read off a map's scale, not off KPI cards. Every section opens on a heavy ruler rule and a legend-style heading with a short tick ruler under it. Dark mode is Walnut, the same sheet by lamplight, with the same hues lifted for contrast. The page follows the device until the reader uses the header switch, which is saved in their browser.

The density is that of a newspaper results table: hairline rules between rows, no card chrome, no ambient decoration. There are no background contour lines and no map; the survey language lives only in functional marks (scale bar, benchmark, ruler rules, dashed trail, pencil ring). The palette is brown and cream rather than green; the outdoorsy-map look and the KPI-card dashboard are both refused.

The only motion is the sweep across a seat bar when a race is called, so movement means news. Scroll is smooth unless reduced motion is requested.

**Key Characteristics:**
- Linen ground, brown ink, two party hues and one pencil-orange for human marks.
- Archivo Narrow for numerals and legend heads; Source Sans 3 for all running text.
- Seat scale bar with a majority benchmark as the signature.
- Flat: depth from rules and a raised-paper tint, never shadows.
- Square-ish corners (3px) everywhere except rating pills.

## Colors

Warm paper neutrals carrying brown ink, with blue and red held to party meaning and one pencil orange for annotation. Values below are the light theme; Walnut variants are defined in the stylesheet as the dark theme.

### Primary
- **Slate Blue** (#2f6d9e): Democratic seats won, Democratic tallies, party tiles, source-ok dot. Walnut: #5a9bd0.
- **Brick Red** (#b8483e): Republican seats won, Republican tallies, party tiles, source-bad dot. Walnut: #d9705f.

### Secondary
- **Heather** (#6d5e8c): Independents only. Walnut: #ad9dcc.
- **Pencil** (#a4530f): The human mark: focus ring, the now-line, the ring around an upset, bell-race outlines. Walnut: #e5a35a.

### Tertiary
- **Slate Blue Soft** (#8fb3cf), **Brick Red Soft** (#dda59f): Leading (uncalled) seats, hatched on the bar, and Likely ratings.
- **Slate Blue Wash** (#e0e8ea), **Brick Red Wash** (#f6e1d6): Lean ratings.
- **Toss Straw** (#dcc58e): Toss-up ratings and seats not yet leaning; also selection highlight.
- **Warn Straw** (#f3e6c4 on #4f3f0e): Stale-data alert and the late timestamp.

### Neutral
- **Linen Ground** (#f8f3e9): Page. Walnut Ground #2b2018.
- **Linen Raised** (#fffcf5): Tables, fields, scale-bar paper. Walnut #37291e.
- **Brown Ink** (#2f261b): Text, heavy rules, bar outline. Walnut ink #f0e5d2.
- **Brown Ink 2 / 3** (#5a4d3c / #6c5e4b): Secondary and tertiary text, trail and dumbbell marks.
- **Sheet Rule** (#e4dacb): Hairline row dividers.
- **Contour Brown** (#9a7b56): Table frame, dashed trail, waypoint markers, field borders.

### Named Rules
**The Party Hue Rule.** Blue and red mean Democrat and Republican and nothing else; heather means Independent. Status, emphasis and annotation use ink or pencil.
**The Pencil Rule.** Pencil orange marks only what a person would mark by hand on a printed sheet: focus, now, upset, watch-list bell. It never fills a surface.
**The No-Color-Alone Rule.** Leading versus won is carried by hatching as well as tint, and ratings by label text as well as chip color.

## Typography

**Display Font:** Archivo Narrow (with Arial Narrow, Roboto Condensed, sans-serif)
**Body Font:** Source Sans 3 (with system-ui, Segoe UI, sans-serif)

**Character:** A condensed map-legend face for numbers and heads against a plain humanist text face. Numerals are large and narrow so two chamber tallies fit side by side on a phone.

### Hierarchy
- **Display** (700, clamp(3.2rem, 11vw, 5.5rem), 0.9): Chamber seat tallies, in party color.
- **Masthead** (700, 1.6rem, 1.1, 0.04em, uppercase): Site title.
- **Headline** (700, clamp(1.15rem, 3.4vw, 1.45rem), 1.2, 0.06em, uppercase): Section legend heads, each with a 120px tick ruler beneath.
- **Title** (700, 1rem, 1.3, 0.05em, uppercase): Sub-heads, table column heads (at 0.78rem), wave times (1.5rem).
- **Body** (400, 16px, 1.5): Text, capped near 65ch for ledes and fine print.
- **Label** (400-500, 0.78-0.9rem): Captions, footers, row sublines in Brown Ink 3.

### Named Rules
**The Numerals Rule.** Counts, times and tallies set in Archivo Narrow; anything read as a sentence sets in Source Sans 3. Tabular figures in tables and market readouts.

## Layout

A single 1120px column, side gutter clamp(16px, 4vw, 32px), sections separated by a 40px block padding and a 2px ink rule. A sticky masthead (title, update time, horizontal jump links) stays on screen. The first viewport is masthead, then House and Senate each as tally, majority goal, and seat bar. Grids use auto-fill/auto-fit with min(100%, 240-320px) tracks and 28-40px column gaps, so they collapse to one column without breakpoints. Below 640px: footnote columns and secondary table columns hide, tables tighten to 4px cell padding, and the latest calls list (capped at three) moves above the chamber bars once any exist. Row rhythm is 5-8px vertical padding on hairline-ruled rows.

## Elevation & Depth

Flat. Depth is carried by the raised-paper tint (Linen Raised) on tables, fields and bar paper, by 1px Contour Brown frames, and by heavy ink rules. There are no box-shadows for elevation; inset 1px shadows only draw pill outlines. The one floating element is the seat-bar tooltip, a solid ink chip with no shadow.

### Named Rules
**The Flat Sheet Rule.** A surface is distinguished by tint, rule or frame, never by a drop shadow.

## Shapes

Draftsman's corners: 3px on fields, buttons, alerts, party tiles and watch chips; tables are square. Rating pills are fully round (999px) and tooltips are 6-8px, which are carried as exceptions. Rules are straight: solid 1-2px ink or hairline, dashed 3px Contour Brown for the timeline trail, a triangle waypoint marker per wave (filled ink once past), and a hand-drawn ellipse in pencil around an upset race name.

## Components

### Seat Scale Bar (signature)
A canvas, 50px tall, full width. Linen Raised paper inside a 1.5px ink frame. Democrats fill from the left, Republicans from the right, uncalled seats stay blank in the middle (Independents sit at the center boundary). Won seats are solid party color; leading seats are the soft tint overdrawn with 135-degree paper hatching every 7px. Ticks hang below the frame every 50 seats (House) or 10 (Senate). A 2px ink benchmark line with a downward triangle stands at the exact middle: the majority. Hover shows a tooltip naming party and won/leading count. When a race is called, a translucent paper band sweeps left to right in 900ms; it does not run under reduced motion. Redraws with theme colors when the scheme changes.

### Cook Strip
An 8px segmented strip of rating colors under each bar with end labels and a note, and a key (solid, hatch, open swatches, 18x10 with ink border).

### Tables
Sit in a Linen Raised block framed in 1px Contour Brown. Column heads are Archivo Narrow uppercase with a 1.5px ink underline; rows have hairline rules, hover to raised tint, and expand into a definition-list detail row. Numeric columns right-aligned, tabular.

### Fields and Buttons
Selects and inputs: Linen Raised, 1px Contour Brown border, 3px radius, 40px minimum height, pencil focus ring (2px, 2px offset). The "show more" button is the same paper with a Sheet Rule border and 3px radius, centered.

### Party Tile and Rating Pill
A 1.45em square, 3px corners, white initial on party color (heather for Independent, straw for none). The rating pill is round, 0.78rem, tinted by rating (Solid = full party color with white text, Likely = soft, Lean = wash, Toss-up = straw); unrated or assumed ratings are outlined only.

### Timeline Trail
A dashed Contour Brown vertical trail with a triangle marker per poll-close wave; a pencil now-line crosses it with its label. Watch chips and bell rows are hairline-ruled lists, bell races outlined in pencil.

### Alerts
Warn Straw block, 3px corners, 500 weight, for stale or failed data; the timestamp turns into the same straw when late.

## Do's and Don'ts

### Do:
- **Do** show counts over a seat scale bar with the majority benchmark, not in a card.
- **Do** open each section with a 2px ink rule and an uppercase Archivo Narrow legend head with the 120px tick ruler.
- **Do** keep blue and red for party, pencil for hand marks, and carry leading versus won by hatching.
- **Do** separate surfaces with tint, hairline or frame; set the page in both Linen and Walnut with the same token names.
- **Do** animate only a sweep on a real call, and honor reduced motion.

### Don't:
- **Don't** use KPI cards, tinted stat tiles, or shadows to build hierarchy.
- **Don't** return to green, outdoorsy map costume, background contour lines, or a state map.
- **Don't** use party hues for non-party status, or color alone to separate leading from won.
- **Don't** use Archivo Narrow for running sentences or Source Sans 3 for tallies.
