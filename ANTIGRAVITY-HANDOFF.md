# Derrp Studio Website — Antigravity Handoff
## Initial maintenance + construction continuity

**Prepared:** 2026-11-23 (America/New_York)
**Owner / final approver:** Joshua Phillips (NeoDerrp, GitHub: `x1manPsychopath`)
**Handoff purpose:** Transfer day-to-day maintenance and continued construction of the Derrp Studio website to Antigravity IDE on NeoDerrp, with no loss of context, rulings, or gate state. Antigravity maintains and builds; Joshua approves deploys, gate promotions, and any control unlock.

---

## 1. What this is — in one paragraph

Derrp Studio is the Derrp household's stream command center: a **real, standalone website on Joshua's own stack** (Astro + GitHub + Cloudflare Pages), **not** a Muse Space. It serves two creators — NeoDerrp (Joshua) and AmaDerrp (his wife) — plus Duo mode. It is a pure client-side app: one rich page, all local state in browser `localStorage`, and its only network calls go to the household **Mochi Tailscale bridge** on NeoDerrp when a host profile is configured. The older Muse Space version of Derrp Studio still exists and **stays until the website is live — delete it only on Joshua's explicit word.**

## 2. Canonical locations — do not confuse them

| Thing | Location |
|---|---|
| Website repo (source of truth) | `https://github.com/x1manPsychopath/derrp-studio` — branch `main` |
| Website local mirror (Muse side) | `workspace/creator-hub/derrp-studio-site/` — **Antigravity: clone/pull the GitHub repo on NeoDerrp instead of using this path** |
| Live URL (after Pages connect) | `https://derrp-studio.pages.dev` |
| Bridge repo / install (separate project) | `C:\AI\Projects\mochi-studio-bridge\` on NeoDerrp — Python stdlib, loopback `127.0.0.1:8190` |
| Bridge spec | `workspace/mochi-command-center/Derrp-Studio-Tailscale-Bridge-Spec.md` |
| Bridge tailnet URL | `https://neoderrp.taila861af.ts.net` (tailnet-only, Funnel **disabled**) |
| NeoDerrp tailnet identity | `neoderrp` — `100.123.97.23` |
| Deploy instructions | `DEPLOY-KIT.md` in the repo root |

**Verified current state (checked 2026-11-23 evening):**
- GitHub `main` head: **`3000a5e3`** — "Align bridge client with bridge v1 contract (config item route, status keys, latency_ms)"
- Previous commit: `1903b749` — initial scaffold + `package-lock.json`
- Local build re-verified 2026-11-23 19:53 ET: `npm run build` **passes**, 1 static page in `dist/`
- Bridge state as of ~19:50 ET: Step 5 kill test **PASSED** end-to-end, Step 6 committed locally as `6a34d73`, bridge **UP** (PID 102008, `control_unlocked=false`, tailnet-published). Gate 3's bridge side is done — only the Pages connect + Studio panel wiring remain.
- Stack: Astro `^5.0.0`, no heavy framework. Entry points: `src/pages/index.astro` (389 lines), `src/scripts/app.js` (896 lines — all app logic), `src/styles/global.css`, `src/layouts/Layout.astro`

## 3. Workspace discipline — read before opening anything

This was ruled on 2026-11-23 after a near-miss, and it is not optional:

- For website work, open **only the derrp-studio repo folder** in Antigravity.
- For bridge work, open **only** `C:\AI\Projects\mochi-studio-bridge\`.
- **Never** add `C:\AI` or `C:\AI\Projects` as a standing workspace. That would give standing write reach over production Mochi Core, the live mochi-stream release, the frozen `v1.0.0-rc.1` candidate worktree, and candidate data.
- Never open `stream-ops-deployments` or `stream-ops-data` as workspaces.
- Per-task, narrowest folder, removed after the task if it was added for that task only.
- Terminal / PowerShell checks (ports, HTTP, file reads) work from the repo workspace — no wider folder is needed to verify anything in this handoff.

## 4. The seven modules — what is built and verified

All seven shipped in the scaffold and were verified locally. Do not rebuild them from scratch; maintain and extend them.

1. **Status strip** — tonight / next-up computed from the ruled household pattern in `America/New_York`: Neo Mon/Wed/Fri 5–10 PM ET, Ama Tue/Thu/Sun 5–10 PM ET, Saturday = guarded family day. Includes a live bridge-state cell.
2. **Copy Studio** — Neo / Ama / Duo profiles. Title & copy standard (settled, do not restyle): format `Hook | Game | Series`, verb-first hook ~50–70 chars, total ≤ ~110 chars (140 hard), series spelled out last, one optional series emoji at the end (⚔️ Main Quest Monday, 🔍 Unfinished Business, 🎲 Community Quest Friday). Go-live ≤ ~90 chars, hook-first, "lurkers welcome". Welcome is TTS-safe plain text, ≤3 sentences. Discord copy uses a `🎯 Tonight:` mission line; invite link only when cross-posting. Export downloads `stream-config.json` with **exactly these five keys, no more, no fewer**: `twitchTitle`, `twitchCategory`, `goLiveMessage`, `welcomeMessage`, `discordMessage`.
3. **Mochi & Sessions** — host profiles (label + bridge base URL + bridge token) stored in `localStorage`; switching the active profile is how Mochi's hosting location switches (NeoDerrp now, derrp-server later — nothing else in the site changes). Bridge client: `GET /health`, `GET /status`, `GET /session`, config reads (see §6). Honest connection states only — **never fabricate stack status**. 8 stack cards. Config panel stays locked until the bridge itself reports control unlocked. Nine-stage session lifecycle with per-stage checklists.
4. **Week Planner** — real current-week dates, household pattern. **Saturday guard is a hard rule:** scheduling anything on Saturday requires a typed override note, enforced at the action layer, not just in the UI.
5. **Queue & Prompts** — Ama's request queue, **anonymous-by-default**, plus a Prompt Jar. Verified bits/sub ladder reference: 100 bits = derp doodle, 500 = coloured, 1,000 = full piece; subs T1 Derpling, T2 Cryptid (priority requests), T3 (+ raffle).
6. **Commission Prep** — anonymous-by-default prep sheet. Pricing is **VGen-link-only by default**; prices appear only when the show-prices toggle is ON, and then exactly as: `Headshot from $30 · Bust-up from $50 · Full body from $80 (VGen)`. Never direct users to DM for commissions — VGen / form only.
7. **Promo & Social** — cross-promo variants for The Derrps Discord, Art Gloop, YouTube, Shorts, Instagram, generated from the current copy set. **The Art Gloop invite field ships blank.** A previously published invite (`discord.gg/PyetPxNPQX`) is **invalid and must never reappear in source or output** — verified absent 2026-11-23.

**Creator facts Antigravity must not guess:**
- Ama's series: Adventure Tuesday (fixed), Thursday flex, Art n Goose Shenanigans Sunday (fixed). Content: drawing requests/commissions, character design, cryptid journals, art challenges, Goose chaos (`!honk`), variety gaming. For a Thursday title, ask Joshua for the one project line — do not invent it.
- Neo's series: Main Quest Monday (flagship), Unfinished Business Wednesdays, Community Quest Fridays.
- Use "NeoDerrp" in titles/announcements. "ND1" only when Joshua explicitly requests it.

**Brand system (ruled, cozy — not esports/fierce):** deep teal `#0F5257`, teal `#2AA198`, sky `#8FE3FF`, amber `#FFB84D`; fonts Baloo 2 + Nunito. Vibe in Joshua's words: passion for gaming, IT, being cozy, building community, sharing experiences and learning new things together.

## 5. The bridge — how the website talks to Mochi

The website has no backend. The bridge is a separate, removable Python-stdlib service on NeoDerrp, bound to **loopback only**, published to the tailnet only via `tailscale serve`. Design invariants:

- The candidate API on `:8100` stays loopback-only and byte-untouched. The bridge never restarts, reconfigures, or writes to any stack service in read-only mode.
- The bridge holds all local credentials and injects them server-side. **The Studio never sees or stores a stack token.** It holds only the bridge's own bearer token, entered once per browser, stored in that browser's `localStorage`, write-only in the UI (never rendered back).
- No public Funnel endpoint may carry any route. Funnel stays **disabled**.
- Stack probed by `/status`: Mochi Core `:8000`, candidate `:8100`, voice sidecar `:8770`, Voicebox `:17493`, research `:8765`, Streamer.bot `:8081`, OBS WebSocket `:4455`.

### Gate state — exactly where things stand

| Gate | State |
|---|---|
| Gate 0 — Inventory | ✅ PASS — Tailscale CLI 1.104.7; 33-file config allowlist (31 live, `stream-config.json` = next_startup, `relationship_neo.md` = unknown) |
| Gate 0.5 — Config inventory | ✅ PASS |
| Gate 1 — Bridge v1 local | ✅ PASS — originally 7/7 unit tests; suite is now **8/8** after the CORS test was added |
| Gate 2 — Tailnet publish | ✅ PASS **except the iPhone cellular leg** — NeoDerrp enrolled, Serve live and tailnet-only. iPhone leg is **deferred, not failed**: Joshua cannot download the Tailscale iPhone app right now due to an Apple ID payment issue (Apple blocks even free downloads). Do not call Gate 2 fully passed, and do not substitute a LAN test for the cellular test. Waydroid on the Surface (`100.66.129.39`) is enrolled and can provide a second-device fetch as supporting evidence. |
| Gate 3 — Studio wiring + kill test | ⬜ **NEXT — this is the first construction task in this handoff (see §7)** |
| Gate 4 — Control (v2) | 🔒 **BLOCKED.** Opens only on Joshua's explicit release-promotion GO in-session. Silence is not GO. |

### Bridge fixes already landed (2026-11-23 evening — do not redo)

- `Stop-MochiBridge.ps1` — no longer swallows errors; verifies process exit + port 8190 free before claiming "Stopped"; preserves `bridge.pid` on failure; from a non-elevated shell against an elevated orphan it exits 1 and names the PID and the elevation required. Proven both ways.
- `Start-MochiBridge.ps1` — duplicate-start guard: reports "already running" and spawns nothing.
- CORS — `https://derrp-studio.pages.dev` added to `allowed_origins` in `bridge/config.py` and `config/bridge.config.example.json`; all five prior origins kept.
- Elevated cleanup executed by Joshua: orphan PID 96788 stopped cleanly, port 8190 free, Serve already off, no Mochi/candidate/OBS/Streamer.bot services touched.
- **CORRECTION 2026-11-23 ~19:50 ET — the bridge arc is now closed out (this supersedes the "bridge down / Step 5 pending" state above):** after the cleanup, Antigravity ran the full Step 5 kill test end-to-end from one elevation and it **PASSED** — start → duplicate guard → loopback + tailnet `/health` 200 → stop → tailnet refused → restart → re-publish → tailnet `/health` 200, zero token leaks in the audit log. Step 6 local commit is done: **`6a34d73`**. **Bridge is currently UP and published** — `127.0.0.1:8190`, PID 102008, read-only, `control_unlocked=false`, Funnel disabled, at `https://neoderrp.taila861af.ts.net`. Nothing on the bridge side blocks Gate 3 now; the bridge session has no open step left.

## 6. Bridge API contract — the aligned v1 (do not regress to the old assumption)

The website client was aligned to the bridge as built on 2026-11-23 (commit `3000a5e3`). The old `/config/:id` path style is **superseded and wrong**.

```
GET  /health
GET  /status          → component keys include: mochi_core, candidate, voice_sidecar, obs_ws
                        latency field: latency_ms
GET  /session
GET  /config          → returns items[] list
GET  /config/item?id=<id>
                        item fields: sha256, last_modified, effective_when
                        example verified live: /config/item?id=personality/core → 200, effective_when: live

Control-class — ALL return 403 control_locked in v1, and the client must keep them locked:
POST /speak, POST /stop, POST /stage
PUT|POST /config/item, POST /config/revert
```

- All routes require `Authorization: Bearer <bridge token>`. **Never print, log, commit, or paste the token value.** It lives in the bridge's gitignored `config/bridge.token.json` on the PC.
- Config writes, when Gate 4 eventually opens, carry non-negotiable guardrails: timestamped backup + manifest before write, validation before commit (JSON parses + known key set; Markdown non-empty + size cap), atomic replace (temp + rename), audit-log entry with before/after hashes, and `POST /config/revert`. None of that is authorised yet.

## 7. Work queue — in order

### Task 1 — Cloudflare Pages connect (operator step, not Antigravity's to perform)
Joshua connects the repo in Cloudflare Pages **from his own PC browser** (Muse's browser is blocked by Cloudflare verification — do not retry that route). Settings per `DEPLOY-KIT.md`: preset **Astro**, build `npm run build`, output `dist`, production branch `main`. Antigravity's role: be ready to diagnose a failed Pages build from its log if Joshua pastes one.

### Task 2 — Post-deploy verification (after Task 1)
From `DEPLOY-KIT.md` §3, against `https://derrp-studio.pages.dev`:
- [ ] Page loads; status strip shows correct tonight/next-up for the current ET day
- [ ] Copy Studio generates a title; export contains exactly the five keys in §4.2
- [ ] Week Planner shows the current Mon–Sun week; Saturday refuses a save without an override note
- [ ] Mochi & Sessions shows an honest bridge state — "Connected — read-only" if the bridge is up (it is, as of ~19:50 ET), or "Bridge not connected" if it is down; either is a pass, a faked/stale status is not
- [ ] iPhone layout usable one-handed; Add to Home Screen works

### Task 3 — Gate 3: Studio panel wiring + kill test (the main event)
Preconditions: bridge fixes committed (`6a34d73`) and Step 5 kill test PASSED — both already done; Pages live (Task 1) is the only remaining precondition.
1. Verify the bridge is up — do **not** start a second instance. The duplicate-start guard will refuse it, and that refusal is correct behaviour. Confirm `GET /health` on loopback returns `control_unlocked=false` and the tailnet URL `https://neoderrp.taila861af.ts.net/health` answers. If the bridge is down for any reason, restart it from an **elevated** PowerShell in the bridge workspace only (`.\scripts\Start-MochiBridge.ps1`, then publish Serve per the bridge scripts) and say so in the report.
2. In the Studio (deployed site), create/select the host profile: label `NeoDerrp (PC)`, base URL `https://neoderrp.taila861af.ts.net`, token entered by Joshua in the browser UI only.
3. Verify the panel reaches **Connected — read-only**: `/health`, `/status`, `/session`, `/config` list, and one `/config/item?id=...` read all succeed; stack cards show real up/down states (honest DOWN states are a pass when a component is off).
4. **Kill test:** stop the bridge with the fixed stop script (elevated). Panel must flip to **Unreachable** with no stale/faked status.
5. Restart the bridge + Serve; panel must return to Connected — read-only.
- **Gate 3 PASS = both directions observed.** Report each step's actual result; do not summarise a step you did not run.

### Task 4 — Routine maintenance (standing)
- Before any edit: `git status` clean, `git pull` fast-forward only, note the head SHA.
- After any edit: `npm run build` must pass; check the browser console for errors; re-run the invariant checks in §8.
- Commit in small, single-purpose commits with descriptive messages (match the existing style on `main`). Push only when Joshua says so, or when he has given a standing instruction for that task.
- Never commit `node_modules/`, `dist/`, any token, or any localStorage export containing a token.

### Task 5 — Launchpad: launch stacks from the Studio (PROPOSED 2026-11-24, gated — do not build until Joshua gives Gate L GO)
Full spec: `workspace/mochi-command-center/Derrp-Studio-Launcher-Spec.md` — read it before any launcher work.
- Joshua's requirement: launch Mochi from Derrp Studio instead of hunting for the correct script, and the same for the other script/PowerShell-launched stacks — keeping track of them all is the core problem.
- Design direction in the spec: a web page cannot spawn local processes, so the **bridge gains a Launcher plane** (allowlisted registry → `GET /launchers`, `POST /launch/<id>`, `POST /launch/<id>/stop`, new flag `launcher_unlocked=false` by default). Derrp Studio stays the web/PWA UI — this is also why no native desktop app is being built for this (see the spec §9).
- First entry is the stream stack only: `C:\AI\Projects\mochi-stream\Start-MochiStream.ps1` / `Stop-MochiStream.ps1`. Never decompose it into per-component buttons.
- The bridge itself can never be a working Launch button (bootstrap paradox) — its card is status + "start from this shortcut" documentation only. The :8100 candidate, UGSM/game servers, and sydron-mobile are **excluded** (spec §5).
- Sequence: Gate L0 verify-only registry inventory → L1 bridge plane (one entry, locked by default) → L2 Studio Launchpad + live launch/stop test incl. phone → L3 expansion. Gate L is separate from Gate 4, which stays blocked.
- **Gate L0 prompt is written and queued (added 2026-11-24 at Joshua's instruction):** `workspace/mochi-command-center/GATE-L0-ANTIGRAVITY-PROMPT.md` — run it **after** the website starter prompt's verify-only session, in its **own** session with **only** `C:\AI\Projects\mochi-studio-bridge\` open as the workspace. It is verify-only: confirm every registry row against disk, hunt for missed `Start-*.ps1` scripts / "Start" shortcuts, start and stop nothing.

### Task 5b — PWA install pack (QUEUED 2026-11-24 at Joshua's instruction — AUTONOMOUS)
Pack: `pwa-install-pack/` in this repo (`README.md` + `manifest.webmanifest`). The 192/512px icons + 180px Apple touch icon are **not** stored in this repo (binaries) — the pack README gives the exact `sharp` command to regenerate them from `public/favicon.svg` at apply time; do that if `pwa-install-pack/icons/` is absent, and commit the generated PNGs with the PWA commit.
- **Run autonomously, end to end, in one session** (authorised by Joshua 2026-11-24): apply the pack exactly per its README — copy `manifest.webmanifest` to `public/`, icons to `public/icons/`, add the five `<head>` lines to `src/layouts/Layout.astro` — then `npm run build` (must pass, and `dist/manifest.webmanifest` + `dist/icons/` must exist in the output), commit as one small commit (`Add PWA manifest and icons for installable Derrp Studio`), push to `main`, and report per-step with evidence. Do not stop for intermediate approvals.
- Stop only if: the tree is dirty with changes you did not make, the build fails after two fix attempts on the same error, or a pack file is missing/corrupt.
- **No service worker** — deliberate (live bridge client; offline caching would risk stale stack status). Do not add one.
- Order note: this task and Task 6's hub build both touch the website; run them **sequentially, never in parallel** — PWA first (it touches `Layout.astro` only), hub second (it starts from the post-PWA head).

### Task 6 — Metaphor Companion area (QUEUED 2026-11-24 at Joshua's instruction — AUTONOMOUS prompt written)
**Build prompt:** `workspace/creator-hub/derrp-studio-site/METAPHOR-COMPANION-HUB-PROMPT.md` — paste-ready, written to run **autonomously end to end** (build → invariants → one commit → push → report; stop only on its listed hard stops). Run it after Task 5b, in the derrp-studio repo workspace only.
Joshua asked whether the Metaphor Companion tracker and/or site can be built into Derrp Studio with its own area, or linked; he then authorised the hub form and autonomous execution (2026-11-24). Form: **a dedicated Companion hub area, not a rebuild and not an iframe embed** — the build prompt above is the authoritative spec for it.
- Form in brief: a "Companion" module in the Studio nav containing (a) link cards for the Tracker (cloud, Vercel + Supabase), the local/stream Companion, and the OBS Overlay — URLs stored per-browser like the Promo invite fields, all shipping empty, none hardcoded; (b) an overlay helper that appends `?panels=enemy,recs` for copying (party-data caveat); (c) a desktop-reader info card (separate read-only app, never launched from the Studio, game never launched); (d) the Launcher-spec registry slot for the Companion (entry #4 — disabled until its launcher is actually built). **No status polling of any Companion endpoint.**
- Why not a rebuild: the Companion is three separate repos (companion local/stream, tracker cloud, desktop reader) under its own 1.0.0 release plan with Stage 1 GO/NO-GO still pending and a verified-fields-only discipline. Rebuilding its UI inside the Studio would fork it mid-release.
- Why not an iframe embed: Supabase-authenticated apps generally block or break under framing, and an embed would strand the Companion's own sign-in inside the Studio's page. Links that open the real app are honest; an embed that half-works is not.
- Note the file discipline: `RELEASE_PLAN.md` (open in Joshua's screenshot, 2026-11-24) is the **Companion app's** release plan — a different project and document from both this handoff and the Metaphor Twitch Chaos `REPORT.md`. Do not cross-wire them.

### Deferred / blocked — do not start
- Gate 4 control + config writes — blocked on Joshua's explicit GO (see §5).
- iPhone cellular leg of Gate 2 — deferred until the Apple ID payment issue clears.
- Phase 2/3 *features beyond what already shipped* — the shipped modules above are the scope; new modules need Joshua's ruling first.
- Custom domain — waits on the eu.org/DNS situation; nothing in code changes for it.
- Deleting the Muse Space version of Derrp Studio — only on Joshua's explicit word.

## 8. Invariants — check after every change

- [ ] `npm run build` passes
- [ ] `stream-config.json` export has exactly the five keys in §4.2
- [ ] Saturday save without a typed override note is blocked at the action layer
- [ ] Invalid Art Gloop invite appears nowhere in `src/` (grep it — expect zero hits)
- [ ] No token, credential, or stack secret anywhere in source
- [ ] Bridge client still uses `/config/item?id=`, `items[]`, `sha256` / `last_modified` / `effective_when`, `latency_ms`
- [ ] Panel shows Unreachable (not stale data) when the bridge is down
- [ ] Config / speak / stop / stage controls remain locked while the bridge reports `control_unlocked=false`
- [ ] Prices hidden unless the toggle is ON; VGen wording exact when shown
- [ ] Queue / Commission Prep remain anonymous-by-default

## 9. Hard stops — Antigravity must never do these

1. Enable control, set `control_unlocked=true`, or implement a Gate 4 route as functional — for any reason, including "just to test it."
2. Touch, restart, or reconfigure Mochi Core, the candidate on `:8100`, mochi-stream, OBS, Streamer.bot, or Voicebox while doing website work. Website work is website work.
3. Enable Tailscale Funnel, or expose the bridge or candidate publicly in any way.
4. Print, log, commit, screenshot, or paste the bridge token or any stack token.
5. Open `C:\AI` / `C:\AI\Projects` as a standing workspace (see §3).
6. Reintroduce the invalid Art Gloop invite, invent an Ama Thursday project line, or fabricate any stack/session status.
7. Delete the Muse Space Derrp Studio, delete drafts/localStorage data, or force-push `main`.

## 10. How Joshua works — reporting standard

- Implementation-first, minimal filler. Markdown for plans/reports.
- Report **per-step, with evidence**: command run, actual output/verdict, head SHA before/after. A claim without a paste-back or a checked result is not a pass.
- Verify-only first pass on any new task: inventory and report before editing, unless Joshua explicitly says to build.
- If a gate fails, stop at the gate, report exactly what failed, and wait — do not improvise around a failed gate.
- Batch questions into one message rather than dribbling them out.

## 11. Source documents (read in this order)

1. This file
2. Repo `README.md` and `DEPLOY-KIT.md`
3. Bridge spec: `workspace/mochi-command-center/Derrp-Studio-Tailscale-Bridge-Spec.md` (§4b is the configuration plane)
3b. Launcher spec (proposed, gated): `workspace/mochi-command-center/Derrp-Studio-Launcher-Spec.md`
4. `src/scripts/app.js` — the bridge client section first, then Copy Studio export, then the Saturday guard

---
*Continuity note: this handoff reflects verified state as of 2026-11-23 evening. If live state disagrees with this file (a newer head SHA, a changed gate), trust the live check, report the discrepancy to Joshua, and update this file in the same commit as the work that changed it.*
