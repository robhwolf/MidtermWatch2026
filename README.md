# Midterm Watch 2026

House, Senate and governor races in the 2026 midterms, read against Cook's ratings. A static page on GitHub Pages, refreshed by a GitHub Actions job.

## Enter Cook ratings

Edit [`data/source/ratings.csv`](data/source/ratings.csv). You can do this on GitHub in a browser: open the file, press the pencil, commit.

Fill in only the `rating` column, and only for the races Cook lists as competitive:

```
race,chamber,state,district,rating
NC-S,senate,NC,,Lean D
PA-H-7,house,PA,7,Toss-up
OH-G,governor,OH,,Likely R
```

- Race IDs: `NC-S` Senate, `OH-G` governor, `PA-H-7` House. At-large House seats are district 1, for example `AK-H-1`.
- Ratings: `Solid D`, `Likely D`, `Lean D`, `Toss-up`, `Lean R`, `Likely R`, `Solid R`. Capitals and small spelling differences are forgiven.
- **A blank means Solid for the party holding the seat.** The page marks these with an asterisk, and they never count as upsets.
- **Redrawn districts have no blank default.** In AL, CA, FL, LA, NC, OH, TN, TX and UT, a blank House seat shows Not rated, so enter any you want coloured, including Solid ones.
- A rating the page can't read is listed in `warnings` in `site/data/results.json`.

Committing starts a refresh, and the site updates within about two minutes.

## Fix or call a race on election night

Edit [`data/source/overrides.json`](data/source/overrides.json). It wins over every feed. Check the commas: if the JSON is invalid, the job fails and the site stays on its last good data.

Call a race:

```json
{
  "NC-S": {
    "call": { "party": "D", "name": "Roy Cooper" },
    "by": "Decision Desk HQ",
    "note": "Called on air at 9:42 pm ET"
  }
}
```

Withdraw a wrong call from a feed:

```json
{ "NC-S": { "call": null, "note": "AP retracted" } }
```

Correct the votes or percent reporting:

```json
{
  "NC-S": {
    "reporting": 92,
    "candidates": [
      { "name": "Roy Cooper", "party": "D", "votes": 2100000 },
      { "name": "Michael Whatley", "party": "R", "votes": 2000000 }
    ]
  }
}
```

`party` is `D`, `R` or `I`. Several races go in one file, separated by commas. Delete an entry to hand the race back to the feeds. Overrides stick, so a corrected count stops updating until you remove it.

Actions shows each run. To force one, use **Actions > Refresh results > Run workflow**.

## Where the data comes from

| Data | Source | Refresh |
| --- | --- | --- |
| Ratings | Cook Political Report, entered by hand | When you commit |
| Results | NYT first, then NPR (both carry AP). The feed with more votes counted wins each race. | Scheduled |
| Backstop | CNN, one request per race, only for races both feeds miss, capped at 150 a run | Scheduled |
| Calls | AP through NYT and NPR, CNN if used, or you | Scheduled |
| Poll closing | Each state's election office; source URLs are in `scripts/lib/closings-data.mjs` and the page footer | Checked 31 Oct |
| Market odds | Kalshi prices for House and Senate control. Optional: a failed fetch skips one point. | Scheduled |
| Baseline | NYT archives: 2024 House, 2020 and 2022 Senate, 2022 and 2024 governors. GA, NE and OK Senate are in `data/source/baseline-exceptions.json`. | Once |

These feeds are undocumented and can change. If one fails, the other carries on, the page shows a warning, and races no source returned keep their last known count.

Decision Desk HQ is not a feed here because its site rate-limits automated requests. Its calls can go in through overrides.

Votes or calls seen before 6 pm ET on 3 November are discarded as rehearsal data.

## Schedule

Times are ET. GitHub can run these 5 to 10 minutes late.

- Until Election Day: 8 am and 8 pm
- 3 Nov, 6 pm to 4 Nov, 10 am: every 5 minutes
- After that, hourly until 13 December, the day after Louisiana's runoffs

The stale warning shows after 20 minutes on election night, 13 hours before it, and 2 hours in the hourly phase.

## Things to know

- **Louisiana House:** 3 November is an all-party primary with a 12 December runoff, so some seats may stay uncalled.
- **Georgia and others:** a race can go to a runoff if no one reaches the threshold.
- **Swing:** each race names its baseline. The national averages use like-for-like seats only, so redrawn districts are left out.
- **Senate control:** Democrats need 51 and Republicans 50, because the Vice President breaks ties. Independents won in 2026 count separately.
- **Redrawn maps:** the list in `scripts/build-roster.mjs` was checked on 31 Oct. Missouri's new map is on hold and Virginia's was voided, so both use their 2024 lines.

## Run it locally

Needs Node 22 or later. There is nothing to install.

```bash
npm test
```

```bash
node scripts/fetch-results.mjs
```

```bash
node scripts/make-sample.mjs
```

```bash
npx http-server site
```

Add `?sample=pre`, `?sample=mid` or `?sample=final` to the page URL to see invented results. These are labelled on the page.
