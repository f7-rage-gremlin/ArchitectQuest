# Architect Campaign — Claude Code context

Emily Donovan, Negative Zero. Sitting the **Claude Certified Architect – Foundations** exam.

---

## Goal

A fully cloud-side system that reads email/calendar/Teams, tracks progress, sends a
morning brief and granular daily tasks, and replans each evening — **no laptop required
at runtime**. Framing is game-like (quests, stats, bosses) by design.

---

## Fixed dates

| When | What |
|---|---|
| Wed 19 Aug, 17–19 BST | Hackathon 2 — cybersecurity theme. Format unconfirmed (Teams vs in-person Central London) |
| Wed 26 Aug | Weekly check-in / showcase |
| Wed 2 Sept | Check-in — exam prep |
| Wed 9 Sept | Check-in — "a surprise awaits" |
| **Tue 22 Sept** | **Third hackathon — exam sits inside it** |
| Thu 1 Oct | All associates certified |

Weekly check-ins: Thursdays 18:00 BST on Teams. Programme lead: **Drew Perry**.

---

## Binding constraint

Exam booking is locked until **all four Skilljar modules are complete**:

1. Introduction to Agent Skills
2. Claude Code in Action
3. Introduction to Model Context Protocol
4. Building with the Claude API

Do these first. Mock exam simulator is ungated — sit one cold before doing anything
else; it reweights the plan from evidence.

Exam: 60 questions, 120 min, pass 720/1000, $125. Domain weights:
Orchestration 27% · Config & Workflows 20% · Prompting & Output 20% · Tools & MCP 18% · Context & Reliability 15%

---

## Architecture

Three tiers split by what must be running.

**Cloud (always on)** — Scheduled Claude sessions read M365 (mail, calendar, Teams),
read state from Drive, write morning briefs. Laptop irrelevant.

**Google Apps Script (always on)** — Workhorse. Runs on Google's servers on timers.
Talks to Habitica, scrapes Lab page, reads/writes Drive natively. No OAuth setup
needed (`DriveApp`/`DocumentApp` built in).

**Laptop (build-time only)** — Repos, clasp, MCP servers. Never needed for daily loop.

### Egress facts (tested)

Cowork sandbox allowlist is narrow:
- **Reachable:** `api.github.com`, `registry.npmjs.org`, `raw.githubusercontent.com`
- **Blocked:** `habitica.com`, `googleapis.com`, `drive.google.com`, `ntfy.sh`, push notification APIs

MCP connectors route server-side and are unaffected — Drive works via connector even
though `drive.google.com` is blocked from the shell.

### State persistence

Scheduled sessions start fresh. State lives in:
- **Claude project docs** — plans and prose (`project_write` edits in place)
- **Google Drive `Architect Campaign/`** — machine output. Drive connector is
  metadata-only; every write is a new dated file. Apps Script `DocumentApp` can
  rewrite an existing body.

### M365 limits

- Read (mail, calendar, Teams): works
- Write (SharePoint/OneDrive): 403 — tenant config, not a bug
- Teams transcripts via Graph: disabled at tenant level

---

## What's built

One Apps Script project, three files. Credentials in **Apps Script → Project Settings →
Script Properties** — never in chat, never in a repo.

### `Code.gs` — Habitica bridge (v6, live)

Pushes quests from a Drive doc into Habitica as todos; pulls progress back.

**Gate** — enforced as the first line of `call_()`, the only function containing
`UrlFetchApp.fetch`. Allowlist: `GET /tasks/user`, `GET /user`, `GET /tags`,
`POST /tags`, `POST /tasks/user`. DELETE/PUT/PATCH refused outright. `/score/`
path refused. Creating untagged tasks or non-todos refused.

Every created task carries a `claude` tag. Nothing it creates can be edited afterwards;
nothing can be completed — Emily ticks her own work off.

**Safety properties (each exists because it was missing once):**
- `HABITICA_DRY_RUN` fails safe: absent/blank/anything ≠ `"false"` means dry run ON
- Receipts: every doc ends with endpoints called, HTTP codes, byte counts. Failed fetch
  writes a doc headed "NO DATA WAS RETRIEVED" — Claude cannot narrate numbers over a
  failed fetch
- Read-back verification: after creating tasks, re-reads and confirms each is present
- Audit in `finally`: record survives the failure it's recording
- Rate limit: 30 creations/day
- Partial failure tolerance: halts after three consecutive failures, not one
- `verifyGate()`: tests eight forbidden operations, expects eight refusals (no network)

**Quest doc format** (`Architect Campaign/quests *` — newest file wins), one per line:
```
MAIN | Title of the quest | 120
SIDE | Another one | 40
```
`#` comments ignored. Already-present titles skipped — re-running is safe.

Habitica accepts only priority values `0.1, 1, 1.5, 2`. Anything else 400s.

### `Lab.gs` — Lab page watcher (live)

`lab.syntheticsignal.io` disallows crawlers; Apps Script fetching with Emily's session
cookie is not a crawler. Snapshots daily at 07:15, writes to Drive only on change.

Cookie gotcha: copy the *whole* `Cookie` request header from DevTools → Network. Three
auth cookies; picking one from the Application tab silently fails.

### `Skilljar.gs` — lesson puller (BROKEN, low priority)

Returns 403. Likely bot detection. Course pages, catalogue, and the exam guide PDF are
all publicly fetchable without cookies — build the task backlog from those instead.

### Triggers

- `nightly()` — 21:00: pull Habitica progress
- `morning()` — 06:30: push quests, then pull progress
- `labCheck()` — 07:15: snapshot Lab page if changed

Apps Script fires within the hour, not on it — jitter of ~15 min is normal. Never
chain triggers assuming order; make each idempotent.

### Script properties

`HABITICA_USER`, `HABITICA_TOKEN`, `HABITICA_DRY_RUN`, `CLAUDE_TAG_ID`, `LAB_URL`,
`LAB_COOKIE`, `SKILLJAR_COOKIE`, `SKILLJAR_COURSES`. Cookies expire — 401 in logs
means refresh from DevTools.

---

## Open items (priority order)

1. **Granular task backlog** — "Do module 1" is a category, not a task. One sitting,
   one artefact, honestly tickable. Build from public docs; don't wait on Skilljar.
2. **clasp + git for Apps Script** — currently updating by pasting whole files. Also
   genuine exam material (Config & Workflows, 20% of exam).
3. **Adversarial subagents** — second agent hunts holes in Claude's own code and plans.
   Design notes in project doc `07-skill-plan.md`. Maps to Orchestration domain (27%).
4. **Config-driven engine (v7)** — move URLs and quest sources from code into Drive
   config docs. Code changes rarely; config changes daily.
5. **Three project names** for learn-by-doing quests — one she knows well, one that's a
   mess, one she's been avoiding.
6. **Hackathon Wed 19 Aug** — 3 days away. Habitica gate is a credible candidate: real
   security design with a working adversarial test. Format still unconfirmed.

---

## Working notes

- Emily reads slowly — **one or two sentences per point**, files over long chat messages,
  only active quests on screen at a time
- She is a careful reviewer. Four real design faults found in two days — take her
  corrections seriously
- **Show evidence, not argument.** Run the command, quote the receipt, show the empty
  result. It ends disagreements in one move
- Check your own tool inventory before designing around a gap — a workaround for Drive's
  missing edit method was built for a day while `project_write` sat unused
