# Heart of Passion website

One repository for three things that belong together:

| Path | What it is | Who it is for |
|---|---|---|
| `/` (`index.html`, `about.html`, `red-carpet-day.html`, `get-involved.html`, `donate.html`, `assets/`) | The Heart of Passion site. Prototype, pending HoP's approval. | The public |
| `/leaders/` | The Heart Meter: donations, outreach and, next, participation points for HoP Nola leaders. | Leaders and mentors, by link only |
| `backend/Code.gs` | Google Apps Script that turns the Heart Meter's Google Sheet into its backend, and reads HoP's Spotfund page every hour. | The Sheet owner |

Every page is `noindex` and `robots.txt` blocks crawlers. The public site does not link to `/leaders/`: it shows first names of minors.

## Status

- The site is a prototype. Its text comes from HoP's previous site; yellow notes mark what HoP still has to confirm.
- `/leaders/` is not connected: `leaders/config.js` is empty on purpose. The live Heart Meter is still the old one at `jivalare-lab.github.io/hop-heart-meter`. This copy gets the Apps Script URL only after the new backend is deployed and checked.

## Spotfund

HoP raises money on Spotfund, one fundraiser per leader, under the organization "Heart Of Passion Inc". The backend reads that public organization page every hour (read only, no login) and saves each fundraiser's raised amount in the `Spotfund` tab.

A fundraiser counts toward a leader only when the Sheet owner links it in the `Settings` tab, key `spotfund`:

```
Leader1=<storyId>|1150, Leader2=<storyId>
```

The id is the one in the fundraiser's URL (`spotfund.com/story/<id>`). The number after `|` is the baseline: what that fundraiser had raised before this season. Only the amount above it counts, so last year's money is not counted again. No number means 0.

When a leader is linked, gifts they logged by hand with "How it came in" = Spotfund stay on the list but stop counting, so nothing is counted twice.

If a read fails, or finds fewer fundraisers than last time, the last good read is kept, the error is saved, Apps Script emails the owner, and the page says in red that Spotfund amounts may be out of date.

To turn it on: paste `backend/Code.gs` into the Sheet's Apps Script, save, deploy a new version, then run `installSpotfund` once from the editor.

## Checks

```
node tests/leaders.js                                   # backend, money math, Spotfund, schema, safety
node tests/sitio.mjs [screenshots-folder]               # site audit (needs npm ci)
<python with playwright> tests/movil.py [folder]        # Heart Meter on three phones
```

GitHub Actions runs all three on every push and pull request and keeps the screenshots for 14 days as the `vista-previa` artifact.
