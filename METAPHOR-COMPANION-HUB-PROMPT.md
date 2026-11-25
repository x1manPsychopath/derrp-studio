# Paste this into Antigravity IDE — Derrp Studio: Metaphor Companion hub area (AUTONOMOUS)

Open **only** the derrp-studio repo folder as the workspace for this task. Do not open `C:\AI`, `C:\AI\Projects`, any Metaphor Companion repo, or the mochi-studio-bridge folder as a workspace for this task. This is a Derrp Studio website task only.

---

You are building the Metaphor Companion hub area inside Derrp Studio, as recorded in `ANTIGRAVITY-HANDOFF.md` Task 6. **Run this autonomously, end to end, in this one session.** Joshua has authorised this build in advance: do not stop to ask for intermediate approvals, do not pause between steps, and do not end the session with a proposal instead of a result. Work through the steps below in order, fix your own build errors, and finish with the commit, the push, and the final report. Stop **only** on a hard stop in §5.

## 1. Context you must honour

- Derrp Studio is a static Astro site: `src/pages/index.astro` (markup), `src/scripts/app.js` (all logic), `src/styles/global.css`, `src/layouts/Layout.astro`. State lives in browser `localStorage`. Follow the existing module pattern exactly — look at how the existing modules (Copy Studio, Mochi & Sessions, Promo & Social) are structured in markup, nav, and JS, and build this one the same way.
- The Metaphor Companion is a **separate project with its own repos and its own 1.0.0 release plan** (`RELEASE_PLAN.md` — not this project's document). You are building a **hub / front door** to it inside the Studio. You are **not** rebuilding the Companion, its tracker, or its UI, and you are not embedding it in an iframe.
- The Companion's parts, for the hub's cards: (a) the **Tracker** — cloud, Vercel + Supabase; (b) the **local / stream Companion** — runs on NeoDerrp; (c) the **desktop reader** — a read-only Windows app; (d) the **OBS overlay** — used on stream.

## 2. What to build — a "Companion" module

Add a new nav entry **Companion** and a matching module section, containing:

1. **Link cards (configurable, never hardcoded).** One card each for: Tracker, Local / Stream Companion, OBS Overlay.
   - Each card has: a label, a one-line description, a URL field the user can edit, and an **Open** button/link that opens the stored URL in a new tab (`target="_blank"`, `rel="noopener"`).
   - URLs are stored per-browser in `localStorage`, using the same storage pattern as the existing Promo & Social invite fields. **All three URL fields ship empty**, with placeholder text telling the user to paste the current address. Do not invent, guess, or hardcode any Companion URL — the live addresses are Joshua's to enter once, in the browser, exactly like the Art Gloop invite.
   - If a card's URL is empty, its Open control is disabled with the note "No address set yet" — never a dead link to nowhere.
2. **OBS overlay helper.** Under the Overlay card, a copyable read-out of the stored overlay URL with this note, verbatim in substance: until party data is verified, use the overlay with `?panels=enemy,recs` (or disable the party panel) — the party block otherwise shows member levels plus the inactive slot. Add a small button that appends `?panels=enemy,recs` to the stored overlay URL for copying, without overwriting the stored base URL. If the overlay URL field is empty, this helper is disabled too.
3. **Desktop reader card (info only).** One card stating, in substance: the desktop reader is a separate read-only Windows app, launched from its own shortcut — it is report/status only here, the Studio does not launch it, and it never launches the game. No button except optionally a disabled one labelled "Not launched from Studio".
4. **Launcher slot card (disabled, honest).** One card for the Companion's slot in the bridge Launcher registry (Launcher spec entry #4): labelled to the effect of "Launch from Studio — not built yet", with the Launch control **disabled**, and a note that the Companion launcher was spec'd but never built, so this card activates only when that launcher exists and Gate L reaches it. Do not wire it to any endpoint. Do not fake a status.
5. **No status polling.** Do not poll any Companion endpoint. No health check, no guessed API. If it isn't a stored link the user entered, the hub does not claim to know it.

Style it with the existing design system (ruled cozy brand: deep teal `#0F5257`, teal `#2AA198`, sky `#8FE3FF`, amber `#FFB84D`; Baloo 2 + Nunito; existing card/button/field classes). No new dependencies. No new framework. Keep the change inside `index.astro`, `app.js`, and — only if a class genuinely doesn't exist — `global.css`.

## 3. Autonomous execution sequence

Run these in order, without pausing for approval:

1. `git status` — if the tree is dirty with changes you did not make, **hard stop** (§5). Record the head SHA (expected `3000a5e3` or a descendant that already contains the PWA commit — if the PWA task ran first, that is fine and expected).
2. Read the existing module pattern in `index.astro` / `app.js` (nav buttons use `data-module`; sections use `id="module-<name>"`).
3. Implement §2.
4. `npm run build` — must pass. If it fails, fix your own change and rebuild. Two failed fix attempts on the same error = hard stop.
5. Run the invariant checks in §4.
6. Commit as **one** small commit: `Add Metaphor Companion hub area (configurable links, overlay helper, launcher slot)`.
7. `git push` to `main`. Cloudflare Pages redeploys automatically — note the new head SHA in your report.
8. Write the final report (§6). The session ends with the report, not with a question.

## 4. Invariants — verify before committing, report each result

- [ ] `npm run build` passes
- [ ] No Companion URL is hardcoded anywhere in `src/` (grep for `vercel.app`, `supabase.co`, and `3099` — expect zero hits in your new code)
- [ ] No `<iframe>` added anywhere
- [ ] All three URL fields ship empty and persist via `localStorage`; Open controls disable honestly when empty
- [ ] The launcher slot's Launch control is disabled and calls no endpoint
- [ ] Existing invariants still hold: `stream-config.json` export has exactly the five keys; Saturday guard intact; invalid Art Gloop invite (`PyetPxNPQX`) appears nowhere in `src/`; no token or credential in source; bridge client still uses `/config/item?id=`
- [ ] No file outside `index.astro`, `app.js`, and (only if needed) `global.css` was changed

## 5. Hard stops — the only reasons to stop and report instead of finishing

1. `git status` shows pre-existing changes you did not make.
2. The same build error survives two fix attempts.
3. Any step would require: touching a Metaphor Companion repo, the bridge, or any local service; enabling any Gate 4 / Gate L control; printing or handling any token; or hardcoding a Companion URL you were not given in this prompt.
4. The existing module pattern in the code materially contradicts §2's assumptions (report what you found instead of improvising a different architecture).

Anything not on this list: use your judgment, follow the existing patterns, and keep going.

## 6. Final report (Markdown, per-step with evidence)

- Head SHA before / after, build verdict
- Each §4 invariant: PASS/FAIL with the evidence (command or grep result)
- Files changed, with line counts
- A short "what Joshua does next" list: deploy is automatic on push; he opens the Companion module once and pastes the Tracker / local Companion / overlay addresses into the three fields — one time, in that browser
- Anything you deliberately did **not** do, and why
