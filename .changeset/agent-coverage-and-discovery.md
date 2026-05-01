---
"agent-install": minor
---

Skills surface gets a major capability bump:

- Adds 38 new agent definitions (52 total), bringing parity with the broader skills ecosystem (Amp, Antigravity, Augment, OpenClaw, Continue, Crush, Junie, Trae, Warp, Zencoder, and many more), with `XDG_CONFIG_HOME`, `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, and `VIBE_HOME` env-var overrides honored.
- Adds plugin manifest discovery: `discoverSkills` now reads `.claude-plugin/marketplace.json` and `.claude-plugin/plugin.json`, attaches `pluginName` to grouped skills, and rejects entries that escape the source root.
- Adds well-known skills support: `parseSkillSource` recognises arbitrary HTTPS URLs as `well-known` sources, and `fetchWellKnownSkills` resolves `/.well-known/agent-skills/index.json` (with `/.well-known/skills/` legacy fallback), validates entry shape, and downloads each declared file into a temp dir for the normal install pipeline.
- `git clone` failures now print actionable next steps (timeout env var, `gh auth status`, SSH key checks).
- `skill list` is symlink-aware and only attributes skills to agents that are actually installed (or have a leftover skills folder), so universal agents stop double-listing under every redirect.

### Behavior changes worth knowing

- `SkillSourceType` gained a new member: `"well-known"`. TS consumers doing exhaustive `switch` over the union will see a new case to handle.
- Arbitrary HTTPS URLs without a `.git` suffix or `git@` prefix (e.g. `https://docs.example.com`, `https://git.self-hosted.example/owner/repo`) are now classified as `well-known` instead of falling through to a generic `git` clone. To force the legacy git-clone path for a self-hosted repo, append `.git` (e.g. `https://git.self-hosted.example/owner/repo.git`) or use the SSH form (`git@host:owner/repo.git`).
