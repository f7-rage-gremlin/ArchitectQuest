# HeartQuest — status

_Last updated: 2026-08-16_
_Location on disk: `/home/emidude/projects/heartQuest/heartquest/`_
_Repo: `github.com:f7-rage-gremlin/heartquest.git` (private, `master` branch)_

## What it is

A sci-fi/fantasy dating RPG prototype. Framed as PvP Pokémon-Go-style: instead of monsters, wild potential mates appear in the world, and players can use items, fight off rivals in the vicinity, and level stats. Product ideas include monster hunting, Magic Mirror, proximity notifications, cloak of deception, mega items, ice breaker challenges, legendary items.

Landing page live at **emidude.zo.space** (built by today's chat with waitlist signup + feature breakdown).

## Stack

- **App**: Vite + React 19 + Capacitor 8 (converted May 2026 from Expo/React Native)
- **State**: Zustand
- **Persistence**: `localStorage` on web, AsyncStorage on native (unified adapter)
- **Backend**: Supabase schema + client exist, not deployed for production
- **Build (mobile)**: `npm run build` → `npx cap sync android` → Gradle → APK
- **Nix**: flake providing Node 22 + git (no Android SDK, no Gradle, no bun in flake yet)

## Current state

### Verified working
- `npm run build` passes
- Web dev server (`npm run dev`)
- `nix develop` works; `flake.lock` committed as of today
- Onboarding (name + starter weapon), monster combat, inventory, equipment, XP/gold/gems, item rarities
- Proximity gameplay hooks (`src/hooks/useProximity.ts`, `src/services/proximity.ts`) added today
- Real Android APK builds on hardware (`heartquest.apk` in `hQdlds/directdls/` from today's Zo build)

### Broken / incomplete
- **`npx tsc --noEmit` fails** — missing CSS-module and `@types/react-dom` declarations, stale `Item`/`Stats` shapes, incomplete `Player` on proximity data, unused imports, missing Vite env typings
- **Sentry references still in code** (`.env.example`, `bun.lock`, `capacitor.config.ts`, `package-lock.json`) despite intent to remove — see loose ends below
- **APK toolchain not portable**: scripts hardcode `/opt/android-sdk` and `/usr/lib/jvm/java-21-openjdk-amd64` (non-NixOS assumptions)
- **`bun` used in build scripts** (`bun scripts/quick-build.ts`) but not declared in the flake — impure
- **Supabase production backend not configured**
- **PvP/rival safety design not started** (see priorities)

## Priorities (from HANDOFF.md and today's discovery)

1. **Clean the TypeScript errors** — do this before any new feature. It'll catch mobile/browser regressions early.
2. **Fix the APK toolchain for NixOS** — either remove hardcoded paths + add Android SDK/Gradle to the flake, or document the NixOS module setup as the tool source. Add `bun` to the flake too.
3. **Real Android hardware test** — build, install via ADB, verify permissions, storage-across-restarts, touch targets, back nav, location-denied behaviour, offline launch.
4. **Backend boundary decision** — keep local persistence for prototype; introduce Supabase only when accounts, shared rivals, matchmaking, cloud saves, and anti-cheat are ready to be designed together. Never trust the client with authoritative combat/loot/PvP outcomes.
5. **Rival gameplay safety design** — opt-in PvP, block/report, safe zones, cooldowns, no real-world precision exposure, anti-stalking limits, faint recovery rules. No mechanic that encourages physical confrontation. Friendly/hostile and deception are game-state signals, not permission to expose location.
6. **Remove Sentry properly** — either re-do the removal, or attempt recovery from `hQdlds/directdls/heartquest.zip` (see loose ends).

## Loose ends from today's session

- **`hQdlds/directdls/heartquest.zip`** (166MB) — today's Zo download of the working tree. May contain the Sentry-removed state from the lost May 15 session. Worth diffing against `master` before re-doing the Sentry removal.
- **`hQdlds/chat2` and `chat2-a`** — downloaded chat transcripts from today's export session, preserved as context.
- **`hQdlds/landingPageScreenshots/`** — four screenshots of the landing page visual.
- **May 15 chat's work** — not in git anywhere. Emily recalls it removed Sentry and solved multiple issues. If not recoverable from the zip, it's lost.
- **`master` is 1 commit ahead of `origin/master`** locally — the `flake.lock` commit. Not yet pushed.

## Environment / nix notes

- Flakes are enabled system-wide on this NixOS box (`/etc/nix/nix.conf` line: `experimental-features = nix-command flakes`) — no user setup needed.
- Nix version 2.31.5.
- The project's `flake.nix` only declares Node 22 + git. Android SDK, Gradle, and Bun are used but not provided — so `npm run build:apk` currently relies on system paths and outside-nix tooling.

## Git housekeeping done today

- Verified `master` was the authoritative branch (not `export/heartquest-latest` as Emily initially thought).
- Fast-forwarded and deleted `export/heartquest-latest` (both local and remote) — all commits reachable from `master`.
- Committed `flake.lock` (`11e112a chore: commit flake.lock generated by nix develop`).
- Left `master` unpushed (1 commit ahead of `origin/master`).

## For the cowork writeup

**Pitchable / interesting bits:**
- Game-like framing: proximity gameplay, rival system, item rarities, cloak of deception — cyberpunk-magic aesthetic.
- Landing page live at emidude.zo.space with functional waitlist.
- Full stack transition from Expo/React Native → Vite + React + Capacitor achieved in one week (May 2026).
- Reproducible dev env via nix flake.

**Honest state:** working prototype with real APK builds on hardware, but TypeScript errors, hardcoded toolchain paths, and unfinished backend/safety design mean it's not yet reviewable as "release-ready". Next session's first job is a clean type-check.
