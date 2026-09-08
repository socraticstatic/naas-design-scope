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

## The five-minute demo (elevator IA, current build)

Open the storefront. Gear (top right): persona Architect, estate Established, light.

1. **Home** (30s). The fabric picture: sites left, band, clouds right, four strata. Health strip under it; the amber wire pulses on the region with the latency spike. Six rollups. Verdict in one line: "86% of 940 workloads private · 4 to close". Andi (right) states the first thing to do.
2. **Discover** (45s). Top tab. One header row with six stat pills. Tree: AWS → us-east-1 → vpc-prod-01 → subnets → a workload → endpoint and resource (ARN, owner). Open a Direct Connect gateway for its circuits. **By tag** regroups across clouds.
3. **Connect** (60s). Rail. The picture stays: wires colored by lens (Security · Performance · Reliability · Cost) with the value on each. Hover a region for the three-path compare bars. **Control** on any row prefills Govern.
4. **Govern** (45s). Gates on the wires with a policy; violations pulse red. **Author** → When / Reaches / Require; matched wires light blue live. Simulate dashes them.
5. **Observe** (45s). Wire thickness = Gbps, color = latency vs SLO; scrub 24h under the picture to find the anomaly pin. Six insight widgets below; hover a talker to light its wire. Records and paths behind Details. **Steer** a public flow.
6. **Cost** (40s). Thickness = $/mo, red sleeve = premium; hover for the arithmetic. Slide the forecast to +90d and watch the sleeves thin. Arbitrage strip, destination bar.
7. **Compose → Review → Go live** (45s). Header CTA "Compose · $17.5k/mo". Six steps, prefilled. Submit; Pending Actions; **Go live** flips the region and opens Observe.
8. **AI Fabric** (20s). Top tab. Observe: Insights (tokens, spend, TTFT, blocked).
