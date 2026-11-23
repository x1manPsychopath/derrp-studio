# Derrp Studio

The Derrp household's command center — a standalone website (not a Muse Space) for NeoDerrp and AmaDerrp's streams. One rich client-side page; all state persists in the browser's localStorage, and the only network calls are to the household Mochi bridge when a host profile is configured.

**Live URL (after deploy):** https://derrp-studio.pages.dev

## Modules

- **Status strip** — tonight / next-up computed from the ruled household pattern in America/New_York (Neo Mon/Wed/Fri, Ama Tue/Thu/Sun, Saturday = guarded family day), plus live bridge state.
- **Copy Studio** — Neo / Ama / Duo stream copy under the adopted title & copy standard (`Hook | Game | Series`, TTS-safe welcome, Discord mission line). Drafts save locally; export downloads `stream-config.json` with exactly the five keys the Mochi stream stack consumes (`twitchTitle`, `twitchCategory`, `goLiveMessage`, `welcomeMessage`, `discordMessage`).
- **Mochi & Sessions** — host profiles (label + bridge URL + bridge token) switch Mochi's hosting location (NeoDerrp PC now, derrp-server later). Talks to the Tailscale bridge per `Derrp-Studio-Tailscale-Bridge-Spec.md`: `GET /health`, `/status`, `/session`, config reads; config writes stay locked until the bridge itself reports live control. Without a bridge the module shows an honest "not connected" state — it never fabricates stack status. Sessions track the nine-stage stream lifecycle with per-stage checklists and review notes.
- **Week Planner** — the household Mon–Sun pattern on real current-week dates. Saturday is a hard guard: scheduling anything requires a typed override note.
- **Queue & Prompts** — Ama's request queue (anonymous-by-default) and a Prompt Jar, with the verified bits/sub reference card.
- **Commission Prep** — anonymous-by-default prep sheet; pricing is VGen-link-only unless the price toggle is on.
- **Promo & Social** — cross-promo variants for The Derrps, Art Gloop, YouTube, Shorts, and Instagram, generated from the current copy set. The Art Gloop invite field has no baked-in default (a previously documented invite is invalid).

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # static build into dist/
npm run preview  # preview the production build
```

Stack: Astro 5, no heavy framework — an Astro page plus one client script (`src/scripts/app.js`). Design: the ruled cozy brand system (deep teal `#0F5257`, teal `#2AA198`, sky `#8FE3FF`, amber `#FFB84D`; Baloo 2 + Nunito).

## Deploy

See [DEPLOY-KIT.md](DEPLOY-KIT.md) — GitHub repo `x1manPsychopath/derrp-studio`, Cloudflare Pages (Astro preset, `npm run build`, output `dist`).

## Privacy notes

- No credentials or tokens are hardcoded anywhere in this repo.
- Bridge tokens live only in the browser that entered them (localStorage). Stack credentials never leave the PC — the bridge injects them itself.
