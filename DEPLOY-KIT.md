# Derrp Studio — Deploy Kit

Standalone site on Joshua's own stack: GitHub + Cloudflare Pages, mirroring how `neoderrp-site` is deployed.

- **Repo:** `x1manPsychopath/derrp-studio` (create on GitHub, push this folder as the repo root)
- **Site URL:** https://derrp-studio.pages.dev
- **Custom domain:** later — not part of this kit.

## 1. Push to GitHub

From this folder, on NeoDerrp:

```powershell
git init
git add .
git commit -m "Derrp Studio — initial scaffold"
git branch -M main
git remote add origin https://github.com/x1manPsychopath/derrp-studio.git
git push -u origin main
```

(Or create the repo in the GitHub UI first and clone it, then copy these files in — either order works. `node_modules/` and `dist/` are gitignored.)

## 2. Connect Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select the `derrp-studio` repo.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Production branch:** `main`
4. **Save and Deploy.** First build takes a couple of minutes; the site lands at https://derrp-studio.pages.dev.
5. Every later push to `main` redeploys automatically.

> Note: Cloudflare sign-in must be done from Joshua's own PC browser — Muse's browser session is blocked by Cloudflare's verification, so this connect step is operator-run.

## 3. Verify after deploy

- [ ] https://derrp-studio.pages.dev loads; status strip shows tonight / next-up for the current ET day.
- [ ] Copy Studio generates a title and exports a `stream-config.json` with exactly the five keys.
- [ ] Week Planner shows the current Mon–Sun week; Saturday refuses a save without an override note.
- [ ] Mochi & Sessions shows "Bridge not connected" (expected until the bridge exists — Gate 1 of the bridge spec).
- [ ] Open it on the iPhone: layout is usable one-handed; Add to Home Screen works.

## 4. Later

- Custom domain (once the eu.org / DNS situation settles) attaches under Pages → Custom domains; nothing in the code changes.
- The Mochi bridge wiring is specced separately in `~/workspace/mochi-command-center/Derrp-Studio-Tailscale-Bridge-Spec.md` (Gates 0–4). The site is fully useful before the bridge exists; the Mochi module lights up as the gates pass.
