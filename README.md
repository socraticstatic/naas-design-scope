# AT&T AI-grade network · guided storefront prototype

Static prototype. No build step; every file is served as-is.

## Preview on GitHub Pages (private repo)
1. Create a **private** repository and push this folder to `main`.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
3. Pages on a private repo requires GitHub Pro, Team or Enterprise. With **Enterprise Cloud** turn on *Private Pages* (Settings → Pages → Visibility: Private) so the site is only visible to repo members. On other plans the Pages site itself is public even though the repo is private; treat the URL as a secret and rely on the crawler discouragement below.
4. Open `https://<owner>.github.io/<repo>/` → redirects to the storefront.

## Crawler discouragement
- `robots.txt` disallows everything.
- Every page carries `<meta name="robots" content="noindex, nofollow, noarchive">`.
- `.nojekyll` stops Jekyll from processing and listing files.
- Do not link the URL from any public page; search engines index by links, not by guessing.

## Files
- `NaaS Storefront.dc.html` — the prototype (Home, Discover, Network services, AI Fabric; elevator lockup).
- `IA Map.dc.html` — the information architecture proposal.
- `Elevator Boards.dc.html` — boards E0–E7 from the elevator brief.
- `naas-data.js`, `naas-logic.js`, `naas-app.js`, `naas-addendum.js` — data and derivations.
- `support.js` — runtime. `brand/`, `fonts/` — AT&T assets (Aleck Sans is proprietary; keep the repo private).
- `uploads/` — source briefs; safe to delete before publishing.
