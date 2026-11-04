# Heart Meter: handoff for Heart of Passion

Prepared by Equator Consulting Group, November 4, 2026.

## The link

Leaders and mentors: https://isaacvalarezo-equator.github.io/hop-website/leaders/

The team code and the mentor code are shared privately with Savannah. They are never written in this repository, because it is public.

## What it does

| Tab | Who uses it | What it does |
|---|---|---|
| Hearts and Donations | Leaders | Each leader logs gifts; their heart fills toward the $2,000 goal. Spotfund amounts are read every hour. |
| Outreach board | Leaders | Every contact with a sponsor, its status and the next step. Each contact also creates a pending participation task. |
| Points | Leaders and mentors | Leaders log a task with a reflection and a photo, video or link. A mentor reviews it with the mentor code and gives the points. Points count only once approved. |

The points summary is alphabetical, not a ranking, because the leaders are minors. Photos, videos and reflections are seen only by mentors.

## Where each piece lives

| Piece | Where | Owner today |
|---|---|---|
| Data | Google Sheet "HoP Nola Heart Meter (data)" | info@equatorcg.com |
| Backend | Apps Script inside that Sheet | info@equatorcg.com |
| Photos and videos | Drive folder "HoP Participation media", private | info@equatorcg.com |
| Backups | Drive folder "HoP Heart Meter backups", one copy per hour when something changed, newest 200 kept | info@equatorcg.com |
| Page and code | GitHub `isaacvalarezo-equator/hop-website`, published with GitHub Pages | Equator Consulting Group |

**Ownership.** Under ECG's delivery standard, the Sheet, the backend and the media folder should belong to a Heart of Passion Google account, with ECG as editor. When HoP has that account, ECG transfers the Sheet and stays as editor. Nothing breaks in the move.

## Monthly cost

$0. Google Sheets, Apps Script, Drive and GitHub Pages are free at this size.

## What the Sheet owner can change

- **Goal and roster:** tab `Settings`, keys `goal` and `leaders` (names separated by commas).
- **Points per task:** tab `Tasks`, column `points`. Until a task has points, the mentor types them when approving.
- **Spotfund links:** tab `Settings`, key `spotfund`, as `Leader=<storyId>|<baseline>`. See README.
- **Codes:** Apps Script, Project Settings, Script Properties: `TEAM_CODE` and `MENTOR_CODE`.

## If something fails

- The page says in red when Spotfund amounts may be out of date. Apps Script also emails the owner when a scheduled run fails.
- After 25 wrong codes in 10 minutes, writes pause for 10 minutes. It clears on its own.
- Anything deleted is kept, full row, in the `Log` tab. Earlier versions can be restored from the backups folder.

## Changes and support

Write to info@equatorcg.com. ECG keeps editor access to fix anything Google or Spotfund changes.

## Still open

1. Savannah: points for each of the 17 tasks.
2. Savannah: which Spotfund fundraiser belongs to each leader, and its starting amount.
3. Share the folder "HoP Participation media" with the mentors (Emily, Paige, Savannah).
4. Send the link to the leaders.
5. HoP Google account and transfer of ownership.
