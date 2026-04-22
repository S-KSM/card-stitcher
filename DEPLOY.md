# Deploy

Card Stitcher is a static PWA. Any static host works. Recommended: **Cloudflare Pages** (unlimited bandwidth on free tier, global edge, Workers-ready for Phase 2).

## Build

```bash
npm ci
npm run build
# → dist/
```

`dist/` contains everything. No server runtime required.

## Cloudflare Pages — one-time setup

### Option A: GitHub → Cloudflare (recommended)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Pick the repo.
4. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** (leave blank)
5. Click **Save and Deploy**. Every `git push` triggers a new build.

Preview URL appears at `<branch>.<project>.pages.dev`. Production URL at `<project>.pages.dev` or your custom domain.

### Option B: Direct upload via wrangler CLI

```bash
npm i -g wrangler
wrangler login
wrangler pages deploy dist --project-name=card-stitcher
```

## Custom domain

Cloudflare dashboard → your Pages project → **Custom domains** → add domain. DNS auto-routes if the domain is already on Cloudflare; otherwise add a CNAME to `<project>.pages.dev`.

## Headers and SPA fallback

`public/_headers` and `public/_redirects` are copied to `dist/` on build and honored by Cloudflare Pages automatically:

- SPA fallback — all routes serve `index.html` (`/* /index.html 200`).
- Long-lived immutable cache for `/assets/*`, images, SVGs.
- `sw.js` always revalidates so service-worker updates propagate.

## Verifying PWA

After deploy:

1. Open the site in Chrome / Edge.
2. DevTools → **Application** → **Manifest** — should list all icons.
3. DevTools → **Application** → **Service Workers** — should show `sw.js` activated.
4. Lighthouse → **PWA** — should score 100 with "Installable" checks green.

## Alternatives

- **Netlify:** drag-drop `dist/` to netlify.com/drop or `netlify deploy --prod --dir=dist`.
- **Vercel:** `vercel --prod` (uses dist/ by default for Vite).
- **GitHub Pages:** `gh-pages -d dist` — note: no `_headers` support.
- **Any S3 + CDN:** upload dist/, set index.html as root and 404 fallback.

For Phase 2 (Stripe webhooks, shareable links via R2), Cloudflare Workers will pair cleanly with Pages on the same account.
