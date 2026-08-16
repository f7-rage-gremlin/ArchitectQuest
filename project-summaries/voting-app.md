# Voting App / Voxpop — status

_Last updated: 2026-08-16_
_Location on disk: `/home/emidude/projects/votingApp/`_
_Repo: local git only — not yet on GitHub. Sprint 02 negotiation is uncommitted by design._

## What it is

A friction-free, blue-sky **liquid-democracy web app**. Anyone with a username can:

- **Propose** law ideas and upvote/downvote/comment on them (Submissions)
- **Vote** Yes / No / Abstain on exactly 5 laws currently live (Vote)
- **Follow** other users and **activate** them as delegates via three algorithms — None / Simple average / Weighted average (Follow)
- Control **Privacy** and delegation algorithm (Settings)

Delegation is the heart of the product and must be visibly explainable ("Your vote: Yes (auto — 3 of your 4 activated delegates voted Yes)"). Manual vote always overrides auto; clearing back to Abstain re-enables auto for that law.

Visual mood: bright sky-blue (#00D4FF), rounded, hand-drawn friendly. Per-tab accents (Submissions yellow, Vote green, Follow blue, Settings red/coral). "Old Reddit" density on desktop (not a centred mobile column).

## Three stacked attempts in one directory

### 1. `civic-voice/` — Lovable, oldest (de-emphasized)

React 18 + Vite (SWC) + shadcn/ui + Tailwind v3 + TanStack Query. Has all four tabs wired with mock data and dynamic per-tab theming. More visibly-feature-complete than the others, but **not the canonical direction**. Read-only per the harness's hard boundaries; kept only for infrastructure/wiring reference where compatible with democracy-2.0's decisions.

### 2. `democracy-2.0/` — previous Claude session

React 19 + Vite + TypeScript + Tailwind v4 + Zustand + Vitest. **Phase 1 complete** (app shell, TabBar, routing, per-tab accent colours, initial types). Phases 2–7 not started.

**Canonical for product decisions and visual language.** Owns two load-bearing artefacts:

- `democracy-2.0-spec.md` — the exact delegation rules (7 rules, precisely specified — the harness copies these verbatim into `app/`, never paraphrases)
- `DEMOCRACY_2.0.-o.pdf` — Emily's hand-drawn sketches, the primary "good" visual anchor

Also read-only under harness rules. Emily notes: this attempt was on more polished ground than the harness's current output — the sketch-derived layout and cyan background render fully.

### 3. `app/` — Voxpop, built by the nz-loop-harness (**current active attempt**)

React 19 + Vite 8 + TypeScript 6 + Tailwind v4 + Zustand + React Router v7 + Vitest + oxlint.

Fresh scaffold, built from scratch by the loop (not copied from democracy-2.0). Currently at end of Sprint 01: app shell, TabBar, four placeholder pages, `cn()` utility with unit test, empty Zustand store, `shell.nix`. Under the loop's hard boundary — only the harness roles write here.

## The nz-loop-harness (what makes this project distinct)

Adapted from Karpathy's "Field Notes on Agents That Run for Days". This is Emily's most ambitious agentic exercise and maps directly to **three exam domains**.

### Architecture (three roles, three contexts, three prompts)

| Role | Model | Job | Forbidden |
|---|---|---|---|
| **Planner** | Sonnet | Turn sprint sentence → `sprints/NN-spec.md`. Scope, non-goals, constraints. | Touch code. |
| **Generator** | Sonnet | Write everything: code, tests, config. Propose the contract. | Grade its own work, mark items pass/fail, edit contract after AGREED. |
| **Evaluator** | Opus | Adversarial. Reproduce every claim. Grade against rubric. | Edit application code (reports; generator fixes). Auto-pass `[HUMAN]` items. Fabricate anything. |

**Handoff is via files on disk only** — never pasting one role's reasoning into another's prompt. Mixing roles = the harness's defining failure.

### The adversarial charter (evaluator's opening line)

> "The code is broken. Your job is to prove it. Every generator claim is false until you reproduce it yourself. You never extend good faith to a paste."

Evaluator reruns lint/build/test itself, drives the running system via scripted HTTP + DOM checks, walks contract item-by-item with evidence, and issues one of four verdicts: SHIP / READY-FOR-HUMAN-GATES / ITERATE / REBUILD.

### Contract-first (Rule III)

No sprint code before evaluator stamps `contract.md` as `STATUS: AGREED`. Generator proposes ~20–30 binary observable assertions; evaluator negotiates in writing in the file until agreement. Sprint 02's contract took two rounds (r1 NOT AGREED with 12 REVISE, r2 AGREED with 42 ACCEPT). Everything outside the contract doesn't count as done; nothing inside it may be skipped.

### State on disk (Rule IV — "context windows lie; files don't")

Canonical state in exactly four files: `contract.md`, `feature_list.json`, `progress.md`, `log.md`. **Crash test:** a fresh Claude Code session with zero conversation history must be able to resume from these alone. If state doesn't fit in three files, simplify the state, don't add files.

### Grading (Rule VI — `harness/rubric.md`)

- Functionality 0.40 (contract items passing, invariants intact — invariants never averaged away)
- Craft 0.25 (framework idioms per CURRENT shipped docs, test quality, no dead code)
- Design 0.25 (fidelity to the blue-sky mood, feels like product not template)
- Originality 0.10

Ship gate: **score ≥ 0.80 AND all Functionality passing AND zero invariant failures**.

### Rules that shape behaviour

- **Rule V (let the loop restart):** the generator throwing its work away and starting clean from an agreed contract is the loop *working*, not failing. Human intervenes only when the *contract* is wrong.
- **Rule VII (read the traces):** debug the loop by grepping `traces/NN-<role>-<stamp>.md` for the moment judgment diverged, then fix the *role prompt*, not the message.
- **Rule VIII (delete the harness):** every model release, re-read `harness/` and delete anything the model now does unaided. A harness that grows monotonically is one nobody reads.
- **Rule IX (the bottleneck always moves):** close each sprint by naming the next bottleneck in `progress.md`. If everything is smooth, you're not looking carefully.
- **Anti-fabrication protocol:** nothing "done" without the actual command run and its REAL, full output. Anything needing a human → report exactly `NOT DONE — needs human: <what>`.

## Sprint progress

### Sprint 01 — SHIPPED

**Score: 0.86** (evaluator: Opus, 2026-08-06 16:15). 39 assertions all pass, lint/build/test/dev green.

Delivered: `app/` scaffolded with the full stack, four placeholder pages under React Router v7, full-width AppShell layout (regression guard: no `max-w-*` on outer wrapper), one Zustand store stub, `cn()` util with unit test, `shell.nix` providing Node 22 + npm, `oxlint` linter.

### Sprint 02 — CONTRACT AGREED, BUILD PENDING (Emily's stint 2)

Contract AGREED at round 2 on 2026-08-13. **42 assertions**, zero `[HUMAN]` items.

Scope clusters:

| Cluster | Assertions |
|---|---|
| Types (`types.ts`) | C-01…C-05 |
| Seed data (~7-9 users, 5 laws, 13-17 submissions, delegation graph) | C-06…C-11 |
| Accessor seam (`data/index.ts`, no direct seed imports) | C-12, C-13 |
| Store shape (8 slices, `getDelegatedVote` selector) | C-14…C-16 |
| Delegation math location (in store, not components) | C-17 |
| Delegation rules 1–7 tests | C-18…C-32 |
| Privacy-wipe tests | C-33…C-37 |
| Sprint 01 regression guards | C-38…C-42 |

**Owner decision recorded (bound to Sprint 02):** private-profile filtering follows **Option B, wipe semantics** — Public→Private wipes ALL incoming follows AND activations; private user's votes never enter any algorithm; outgoing follows survive; usernames stay visible on comments; Public→Private→Public does NOT restore follows.

**Next step for the fresh session:** spawn GENERATOR (BUILD, Sonnet) with `progress.md` as the resume anchor. On BUILD success, spawn EVALUATOR (GRADE, Opus). On SHIP verdict, driver runs sprint-close.

### Current bottleneck (Rule IX)

Delegation math correctness under wipe semantics — specifically the interaction between C-30 (manual lock) and C-33 (wipe cascade). Not asserted cross-cut, but flagged for the evaluator: if a user has a manual override on a law whose contributing delegate goes private mid-scenario, the manual lock takes precedence over the wipe recompute.

## Priorities

1. **Stint 2 (tonight) — Sprint 02 BUILD.** Spawn generator, ship the data layer + delegation math + 25 tests. Fresh-session start per `progress.md`; no re-asking for owner approval (green light recorded).
2. **Stint 2 continued — Sprint 02 GRADE.** Opus evaluator reruns everything, walks 42 assertions, scores against rubric. Verdict determines Sprint 03 or iterate/rebuild.
3. **Sprint 03+ (post-BUILD if SHIP):** UI-level features — Submissions tab feed + detail + threaded comments; Vote tab five-law list with three-state control and auto badge; Follow tab search + follow-vs-activate + weights + profile sub-tabs; Settings; polish (empty states, accessibility, responsiveness).
4. **Rule VIII pass at sprint close** — reconsider whether any harness scaffolding is now redundant given current model capability. Known candidate: `check.mjs` transient-error window between AGREED and STAMP+INDEX.
5. **Push to GitHub eventually** — currently local-only. Not urgent while the loop is mid-flight (Sprint 02 negotiation is deliberately uncommitted).

## Loose ends / known friction

- `check.mjs` transient-error window between evaluator AGREED and driver STAMP+INDEX. Non-blocking; queued for Rule VIII pass at Sprint 02 close.
- Background-driver `Write` tool guard — driver session uses Bash heredocs. Documented in a memory file at `~/.claude/projects/-home-emidude-projects-votingApp/memory/feedback_bg_driver_write_guard.md`.
- Uncommitted files at time of survey: modified `contract.md`, `feature_list.json`, `log.md`, `progress.md`, untracked `sprints/02-spec.md` + 5 Sprint 02 trace files. This is by design mid-sprint.
- Emily's own `TODO:` file at root: init claude, add permissions/denies, memory for nix purity, memory for line-by-line bash explanation.

## Environment / nix notes

- `app/shell.nix` provides Node 22 + npm — verify command is `cd app && nix-shell --run 'npm run lint && npm run build && npm test'`.
- Harness hard boundary: no global installs, no curl-pipe-to-shell, no sudo. Everything scoped to `app/node_modules`.
- `civic-voice/shell.nix` and `democracy-2.0/`'s equivalent are working examples the harness may reference.

## For the cowork writeup

This project is Emily's flagship agentic exercise and maps directly to multiple exam domains:

- **Orchestration (27% of exam)** — three-role subagent architecture, separate contexts, adversarial evaluator, contract-negotiation protocol. Concrete and battle-tested (proven across six-plus sprints in the origin `nz-synthetic-signal-lab` project).
- **Context & Reliability (15%)** — canonical state in four files on disk, crash test enforced, no context bleed between roles.
- **Config & Workflows (20%)** — the entire harness IS workflow: driver.md orchestrates GATHER → SPEC → PROPOSE → REVIEW → BUILD → GRADE → CLOSE, each as its own spawn.
- **Prompting & Output (20%)** — role prompts as *system* prompts, not user prompts; the evaluator's system prompt opens *"The code is broken. Your job is to prove it."* — a taste of prompt-as-charter.

**Notable observations to share:**

- **Product-visibility vs. process-value trade-off** — after Sprint 01 the visible UI is *less* developed than democracy-2.0's Phase 1, but the *loop itself* — negotiated contracts, adversarial grading, on-disk state — represents disproportionate value. The harness is the deliverable as much as the app is.
- **Contract-first prevents scope drift** — 42 binary observable assertions define "done" for Sprint 02. The evaluator cannot silently rubber-stamp; every claim carries evidence.
- **"Delete the harness" (Rule VIII)** — an unusual antidote to scaffolding decay. Every model release, prune what's now redundant. A rare acknowledgement in agentic tooling that most process debt eventually pays negative interest.
- **Anti-fabrication protocol as a load-bearing rule** — motivated by the origin project's real incident history (a rotation script that never existed, "7/7 passing" over 2 real failures, a stale deploy reported live). Emily's harness inherits the paranoia.

**Honest state to convey:** one sprint shipped at 0.86, one contract AGREED and pending BUILD tonight. Emily's stated goal is four sprints without her input; two owner decisions (privacy-wipe semantics being one) have already been requested, so "without input" is aspirational rather than literal. That's not a failure — the loop pausing for a genuine human decision is Rule V working correctly.
