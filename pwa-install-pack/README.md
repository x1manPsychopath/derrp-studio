# Derrp Studio — PWA install pack (ready to drop in)

**Prepared:** 2026-11-24, after Joshua asked whether Derrp Studio can be an installable desktop app. Advice given in chat: **PWA, not a native build** — this pack is that recommendation, made concrete. Nothing here has been applied to the site or pushed to GitHub. Antigravity applies it (or Joshua says go and Muse hands it to Antigravity as a task).

## What this pack is

The three files Derrp Studio is missing to be installable, built from the site's own brand assets — no new design, no new dependencies:

- `manifest.webmanifest` — name "Derrp Studio — Command Center", `display: standalone`, theme/background `#0F5257` (the ruled deep teal), start URL `/`.
- `icons/icon-192.png`, `icons/icon-512.png` — rasterised from the site's existing `public/favicon.svg` (teal rounded square, amber crescent, heterochromia dots) via `sharp` in the site's own `node_modules`. Verified sizes: 192×192, 512×512, PNG/RGBA.
- `icons/icon-180.png` — Apple touch icon, same source, 180×180.

## Apply (Antigravity, derrp-studio repo workspace, one small commit)

1. Copy the files into the repo: `manifest.webmanifest` → `public/manifest.webmanifest`; the three PNGs → `public/icons/`.
   **If the PNGs are not present** (fresh clone from GitHub — the binary icons are not stored in the repo; they are reproducible build artefacts), generate them from the site's own favicon instead, after `npm install`, from the repo root:
   ```powershell
   node -e "const sharp=require('sharp'); const fs=require('fs'); fs.mkdirSync('public/icons',{recursive:true}); (async()=>{ for (const s of [180,192,512]) { await sharp('public/favicon.svg',{density:384}).resize(s,s).png().toFile('public/icons/icon-'+s+'.png'); } console.log('icons generated'); })();"
   ```
   Then verify each output is a PNG at exactly 180×180 / 192×192 / 512×512 before continuing. Generated icons are committed as part of the PWA commit on the PC side, where a normal git client handles the binaries.
2. In `src/layouts/Layout.astro`, inside `<head>` next to the existing favicon link, add exactly:
   ```html
   <link rel="manifest" href="/manifest.webmanifest" />
   <link rel="apple-touch-icon" href="/icons/icon-180.png" />
   <meta name="mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
   ```
   The existing `<meta name="theme-color" content="#0F5257" />` already matches the manifest — no change.
3. `npm run build` must pass. Then confirm `dist/manifest.webmanifest` and `dist/icons/` exist in the build output (Astro copies `public/` verbatim — verify, don't assume).
4. Commit as one small commit, e.g. `Add PWA manifest and icons for installable Derrp Studio`, push to `main` — Cloudflare Pages redeploys automatically.

## Verify after deploy

- [ ] Desktop (NeoDerrp, Edge or Chrome): open `https://derrp-studio.pages.dev` → install prompt / "Install Derrp Studio" appears; installed app opens in its own window, no address bar, pinned to taskbar/Start.
- [ ] iPhone: Safari → Share → Add to Home Screen; icon is the teal/crescent mark (not a screenshot thumbnail), app opens full-screen.
- [ ] Installed app still shows the Gate 3 bridge connection (host profile lives in that browser's localStorage — installing does not wipe it, but if a fresh profile is ever needed, re-enter the bridge URL + token from `bridge.token.json` as before).
- [ ] No service worker is included on purpose: the Studio is a live client of the bridge, so offline caching would risk showing stale stack status. If offline use is ever wanted, that is a separate design decision — not this pack.

## What this does not do

- No native/Tauri/Electron build, no code signing, no updater — deliberately. With the bridge Launcher plane (see `Derrp-Studio-Launcher-Spec.md`), the PWA gives the app window/icon and the bridge gives local process power, including launching from the phone. A desktop app would add none of that.
- No change to any module, gate, or the bridge contract. The manifest is metadata only.
