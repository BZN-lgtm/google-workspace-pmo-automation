# ⚙️ Google Workspace PMO Automation

A serverless **Google Apps Script** system that automates the daily PMO reporting cycle
end to end — no servers, no paid tools, runs entirely inside Google Workspace.

Every evening at **18:00** it reads progress logged by implementation managers in a
Google Sheet, upserts the **Daily Progress Report (DPR)**, rebuilds the management
report tabs, asks **Claude** for a short executive brief, and emails a formatted
digest to leadership.

> Built to replace a manual "update Excel → format → screenshot → send" loop in a
> telecom project-management office. No company data is included.

## What it produces
| Tab / output | Contents |
|---|---|
| **DPR** | One row per site per day — upserted on `Date + Site ID`, so re-runs never duplicate |
| **P&L** | Revenue, Cost, P-L, P-L % for the day |
| **Site SLA** | SLA vs actual visits, auto-flagged `BREACH` with conditional formatting |
| **Resource Utilization** | Per-team-lead sites, revenue, cost and margin |
| **Run Log** | Timestamped success / error entry for every run |
| **Email digest** | KPI tiles + AI brief + link to the sheet |

## Architecture
```
IM Google Sheet ──► readInput_() ──► upsertDpr_() ──► buildReports_() ──► KPIs
                                                                         │
                     MailApp digest ◄── summarize_() (Claude API, template fallback)
         time-driven trigger @ 18:00 · LockService guards overlapping runs
```

## Setup
1. Create a Google Sheet for the DPR → *Extensions → Apps Script*.
2. Copy the files from `src/` and `appsscript.json` (or `clasp push`, see `.clasp.json.example`).
3. *Project Settings → Script properties*: `INPUT_SHEET_ID`, `DPR_SHEET_ID`,
   `REPORT_RECIPIENTS`, and optionally `ANTHROPIC_API_KEY`.
4. Reload the sheet → **PMO Automation → Install 18:00 daily trigger**.

## Engineering notes
- **Secrets in Script Properties**, never in code.
- **Idempotent** — DPR upsert means a manual re-run on the same day is safe.
- **Concurrency-safe** — `LockService` prevents trigger + manual run collisions.
- **LLM-optional** — any API failure falls back to a deterministic summary.

## Tech
Google Apps Script (V8) · Google Sheets · MailApp · UrlFetchApp · Anthropic Claude API

## Author
**Bilal Zubair Nizam** — MS Artificial Intelligence Engineering
