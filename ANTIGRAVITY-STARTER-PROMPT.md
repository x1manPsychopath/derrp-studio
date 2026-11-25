# Paste this into Antigravity IDE — Derrp Studio website, first session

Open **only** the derrp-studio repo folder as the workspace for this task. If the repo is not yet cloned on this PC, clone `https://github.com/x1manPsychopath/derrp-studio.git` into a single dedicated folder and open that folder — do not open `C:\AI` or `C:\AI\Projects`, and do not open the mochi-studio-bridge folder for this task.

---

You are taking over initial maintenance and construction continuity for the Derrp Studio website from a previous agent. Full context is in `ANTIGRAVITY-HANDOFF.md` in the repo root — read it completely before doing anything, then read `README.md`, `DEPLOY-KIT.md`, and the bridge client section of `src/scripts/app.js`.

This first session is **VERIFY-ONLY**. Do not edit, commit, or push anything. Do not start, stop, or restart any service. Do not touch the bridge, Mochi, OBS, Streamer.bot, or any port — especially not 8100 or 8190.

Run these checks and report each one with its actual result:

1. `git remote -v`, `git status`, and `git log --oneline -3`. Expected head: `3000a5e3` "Align bridge client with bridge v1 contract…". If the head differs, report what you found and stop — do not pull or reset until I confirm.
2. `npm install` (only if `node_modules` is missing), then `npm run build`. Expected: build passes, 1 page in `dist/`.
3. Grep `src/` for the invalid Art Gloop invite `PyetPxNPQX`. Expected: zero hits.
4. Confirm the `stream-config.json` export in `src/scripts/app.js` produces exactly five keys: `twitchTitle`, `twitchCategory`, `goLiveMessage`, `welcomeMessage`, `discordMessage`.
5. Confirm the bridge client uses the aligned v1 contract: `GET /config/item?id=<id>`, `items[]` list parsing, fields `sha256` / `last_modified` / `effective_when`, status keys `mochi_core` / `candidate` / `voice_sidecar` / `obs_ws`, and `latency_ms`. Flag any remaining `/config/:id`-style code as a defect — report it, do not fix it in this session.
6. Confirm the Saturday guard and the control-locked behaviour are present in code: a Saturday save without a typed override note is blocked, and config/speak/stop/stage controls stay locked while the bridge reports `control_unlocked=false`.
7. Confirm no token or credential value appears anywhere in the repo source.

Then give me a short continuity report in Markdown:
- Head SHA found vs. expected, build verdict, and the result of each check above (PASS/FAIL with evidence, not summaries)
- Gate state as you understand it from the handoff: Gate 3 is next, Gate 4 is blocked on my explicit GO, Gate 2's iPhone cellular leg is deferred
- The exact next step you propose for Gate 3, and what you need from me before starting it

Hard stops for this and every session (from the handoff, §9): never enable control or `control_unlocked`, never enable Tailscale Funnel, never print or commit the bridge token, never add `C:\AI` as a workspace, never delete the Muse Space version of Derrp Studio.

Wait for my go-ahead before making any change.
