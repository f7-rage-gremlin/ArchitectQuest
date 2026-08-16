# TODO — Architect Campaign

Rolling list of small quests. Ticked items live in git history; delete them here.

## Later quests

- [ ] **Hard-code nix purity into permission allow/refuse list.** Add explicit `deny` rules to `settings.json` (project or user scope) blocking `sudo *install*`, `npm install -g`, `pip install *` outside a shell, `curl | sh`, and any write to `~/.bashrc` / `/etc/*`. Compensates for taste with mechanics — Emily should not have to rely on Claude remembering. Skill to invoke: `update-config`.
