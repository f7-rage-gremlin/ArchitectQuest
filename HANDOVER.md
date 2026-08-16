# Handover — Architect Campaign

_Written 2026-08-16 for the next fresh Claude Code session._

## Read first, in order

1. **This file.**
2. **`coworkUpdate`** — the Cowork Claude's plan sketch. **This is the starting point for tomorrow's planning, not a coding checklist.** Emily has stated that explicitly.
3. **`project-summaries/{heartquest.md, voting-app.md, mathmap.md}`** — state-of-play per project.
4. **`CLAUDE.md`** — project instructions (exam dates, architecture, egress facts, credentials rule).
5. **`~/.claude/projects/-home-emidude-projects-architectCampaign/memory/MEMORY.md`** loads automatically; the individual entries under `memory/` explain how Emily wants to be collaborated with.

## First goal for the next session (Emily's explicit ask)

**Set up "the four habits" as a reusable framework and apply it to the projects.** Cowork sketched it in `coworkUpdate` §"The four habits (no full harness)":

1. **A verify command in `CLAUDE.md`.** One line: lint + typecheck + build + test. Every session ends by running it and pasting real output.
2. **Contract-lite.** 5–10 binary observable assertions written before a build session. Done = they pass.
3. **Anti-fabrication verbatim in `CLAUDE.md`:** *"nothing is 'done' without the actual command run and its real, full output. Anything needing a human is reported as `NOT DONE — needs human: <what>`."*
4. **One concern per session.** Types, then browser, then security. Long sessions accumulate context that degrades everything.

Plus the **adversarial pass** technique (Cowork §"Adversarial pass, cheaply"): at end of a build session, open a *fresh* session with no context, give it the goal and conclusion but **withhold the reasoning**, and ask it to find the route that was missed. Two-or-three in parallel with different lenses beats one generalist. Majority verdict, not first answer.

This is Voxpop's nz-loop-harness compressed to ~20 minutes of setup — proportional to the deadline pressure.

## Priority order (from Cowork, honoured)

1. **HeartQuest, pen-testable by Wednesday 19 Aug** — cybersecurity hackathon.
2. **MathMap as the configuration exercise** — small enough to test `CLAUDE.md` + verify command + nix-purity hook end-to-end.
3. Everything else.

## What we did this session (2026-08-16)

- **HeartQuest git tidy:** discovered `export/heartquest-latest` branch was NOT diverged from master — it was 1 commit *behind*. Fast-forwarded, deleted local and remote export branches. Committed the `nix develop`-generated `flake.lock` as `11e112a`.
- **Learned flakes together** — Emily now understands: flake = flake.nix + flake.lock, `nix develop` = flake-world `nix-shell`, "dirty" means git working tree has uncommitted changes, git filters tracked-only-file-set into the flake. Flakes already enabled system-wide in `/etc/nix/nix.conf`.
- **architectCampaign repo pushed to GitHub** as `github.com/f7-rage-gremlin/ArchitectQuest.git`, branch `master` (Emily's `-M main` command had a typo yesterday, master stayed).
- **`.clasp.json` rootDir** fixed from stale `/home/emidude/testfolder2` → `/home/emidude/projects/architectCampaign`.
- **Three project summaries written and committed** under `project-summaries/`.
- **TODO.md** created with the "codify nix purity in permission allow/deny" item — Cowork has now expanded this into a concrete plan (skill → PreToolUse hook, see below).
- **Memory saved** across sessions: `feedback_nix_purity.md`, `feedback_nixos_learning.md`, `feedback_commit_cadence.md`, `feedback_architect_campaign_autonomy.md`, plus the pre-existing `user_emily.md`, `project_architect_campaign.md`, `feedback_working_style.md`.

## In-flight — needs your attention early tomorrow

### 1. **clasp is broken** — Emily updated Code.gs directly in the Apps Script IDE and needs to `clasp pull` to sync. She reports clasp itself "seems to have stopped working" — root-cause unknown. The `.clasp.json` fix earlier today should help, not hurt. If `clasp pull` still fails, likely candidates: expired auth in `~/.clasprc.json`, `clasp` binary not on PATH (nix-shell?), or the scriptId no longer accessible.

### 2. **HeartQuest master is 1 commit ahead of `origin/master`** — the `flake.lock` commit was never pushed (Emily didn't ask; policy respected). Push whenever she's ready.

### 3. **Voxpop is mid-Sprint-02.** Emily started stint 2 (GENERATOR BUILD, Sonnet) this evening. State may have changed dramatically by tomorrow — do NOT trust `project-summaries/voting-app.md` for the current sprint state without re-reading `votingApp/progress.md` and `votingApp/log.md` tail. **Directory remains read-only.**

### 4. **TODO.md item — nix-purity skill → PreToolUse hook.** Cowork has expanded the plan (§"nix-purity: skill → hook") with concrete implementation: `PreToolUse` hook on Bash rejecting `npm -g`, `npm install --global`, `pip install`, `brew`, `curl | sh`, bare `sudo` — exit non-zero with a message suggesting the flake instead. Two-line summary in global `~/.claude/CLAUDE.md`. Skill to invoke: `update-config`.

### 5. **HeartQuest Sentry-removal work is lost from git.** Possibly recoverable from `hQdlds/directdls/heartquest.zip` (166MB from today's Zo download). Worth diffing before re-doing the removal.

## Things I'm keeping in my head that aren't fully written down

- **Emily's autonomy grant is scoped to `/home/emidude/projects/architectCampaign` ONLY.** Local edits, commits, and `git push` are pre-authorized here. Everything outside this directory (heartQuest, votingApp, mathmap) needs explicit permission again for each write. **`votingApp` is explicitly read-only** while the harness loop runs. See memory `feedback_architect_campaign_autonomy.md`.
- **Nix purity is an invariant, not a preference.** Never global installs, `curl | sh`, `sudo apt install`, `npm install -g`. Preferred order: `nix-shell -p pkg --run` (ephemeral) → project `shell.nix` → project `flake.nix`. See memory `feedback_nix_purity.md`.
- **Cowork Claude can read this repo** (Emily linked it into the Cowork project). Cowork cannot write back — the channel is currently Claude Code → Cowork one-way. Emily relays. Cowork's brief said: a future Apps Script commit path with a PAT in Script Properties would close the loop.
- **Emily's `TODO:` file at votingApp root** already lists (independently): init claude, permissions/denies, memory for nix purity, memory for line-by-line bash explanation. Same conclusions the memory here reached — worth noting she was ahead of the tooling.
- **Interactive commands need her to run them.** For anything interactive (like `gh auth login`), suggest she type `! <command>` in her prompt — that runs it in-session and the output lands in the conversation.
- **The MathMap three bugs are documented in the summary** but not in any file inside `mathmap/`. If she starts the MathMap fix, the CLAUDE.md we write there should include them so a cold session doesn't rediscover them (Cowork §"The three known bugs" makes exactly this point: "One commit per bug, symptom in the message, so `git log` reads as a bug list").

## Things I'd like Emily to signpost

- **What "the four habits framework" concretely produces.** Cowork's brief describes the four habits (above). Confirm whether the goal is *(a)* write the framework as a reusable document to apply per project, or *(b)* apply it directly to HeartQuest first (adding verify command + contract-lite + anti-fabrication + one-concern rule to HeartQuest's CLAUDE.md), or both.
- **Whether to push HeartQuest master.**
- **Whether MathMap should be `git init`-ed** as part of tomorrow's session (currently zero git history — any edits from tomorrow start as-if-original).
- **Location of the Cowork project itself** — is it a Claude project she's using in the browser, or something on disk here I haven't seen? Right now I only know Cowork through `coworkUpdate`.

## Standing preferences (already in memory but signposted here for the cold-start test)

- Show evidence, not argument.
- Files, not chat, for anything longer than ~10 lines.
- Commit little and often; local commits and pushes to `origin/master` on this repo are pre-authorized.
- Nix purity always. `nix-shell -p` is the ephemeral pattern.
- Teach as we go on any nix decision — Emily is fluent in `nix-shell` / `shell.nix` but new to flakes and wants to build the mental model.
- Brief responses. One or two sentences per point.

## Trust-but-verify anchors

- Voxpop state: read `votingApp/progress.md` + tail of `votingApp/log.md`.
- Whether files claimed here still exist: `ls project-summaries/`, `ls -la .`, `git log --oneline -10`.
- Whether memory files exist: `ls ~/.claude/projects/-home-emidude-projects-architectCampaign/memory/`.
- Whether the repo remote is right: `git remote -v` (should be `github.com:f7-rage-gremlin/ArchitectQuest.git`).

## Last commit before writing this handover

```
f5d1e55 docs: add MathMap project summary
32b283f docs: add TODO list; first item is codifying nix purity in settings
5f82115 docs: add Voting App / Voxpop project summary
b1b4a96 fix: update clasp rootDir to current project location
dd0afe5 chore: add Apps Script sources from clasp clone
005a498 docs: add HeartQuest project summary
9b4c3a8 Bootstrap Architect Campaign local workspace
```
