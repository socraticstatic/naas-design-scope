# NaaS storefront: handoff for the port (2026-09-11)

This is the static prototype behind https://socraticstatic.github.io/naas-design-scope/. It is what Ramesh reviewed on 2026-09-09 and what he asked for, reduced to the shape he named: one picture, four words, one loop. The shell (header, rail, title row, Andi dock) is the AI Fabric UI shell from the shared Figma file, so the port is content, not chrome.

## The shape

- **Home** for a connected customer is the fabric picture: sites on the left, the AT&T fabric in the middle, a lane beneath it for traffic outside the fabric (third party, internet), clouds and workloads on the right. Under it: the incidents, then four doors.
- **Four words** in the rail and on the four doors: Connect, Observe, Govern, Cost. Nothing else is in the navigation. A new customer lands on Connect (intake and scan). A connected customer is pushed to Observe.
- **One loop.** Every page ends with a "Next stop" row: Connect → Observe → Govern → Cost → Connect.
- **Observe** shows both layers: the network layer in NetBond Advanced's Detailed Metrics shape (utilization in and out, current and average, up or down, BGP, drops, purchased ports), and beside it the workloads that connection impacts, with two confidence levels (AT&T-terminated: directly impacted; customer DX or ER: possible impact by account) and the resilience rule. Then the traffic flow, then five pattern cards (stays in the region, across regions, across clouds, out to the internet, coming in), each opening Logs.
- **Drillable in place.** On Home and Connect the picture drills: left class → metro → site → paths, right region → VPC → subnet → workload. On Observe the live flow map is the drill surface: every node opens in place (semantic zoom) down to the workload or the unresolved ip, with a trail, keyboard navigation, a 24h scrubber with replay, a what-changed mode, and a detail panel (Overview, Impact, Records, Actions). Connections are gauges of used against purchased. See PATCHES.md section 9.

## Information architecture: place, list, detail

Every level of the estate has three faces, and the same trail runs through all three.

| Level | Place on the canvas | List at volume | Detail |
|---|---|---|---|
| Site class → metro → site → circuit | the picture's left column, the map's Sites band | the drawer behind "+N more" | the Detail overlay: Overview, Paths, Records, Actions |
| Cloud → region → VPC → subnet → workload | the picture's right column, the map's tag band | (counts past six, no data yet) | the Detail overlay: Overview, Impact, Records, Actions |
| Fabric → facility → port → circuit | the band, opened in place | (fits on the band) | the circuit row's action |
| Connection | the gauges, the queue | | Overview (in/out, purchased, BGP, drops), Impact, Records, Actions |

Rules: nothing leaves the page; drawers and details are overlays over the content; the picture shows the sample and the drawer holds the list; every number and row carries its action.

## Files

| File | What it is |
|---|---|
| `NaaS Storefront.dc.html` | Markup, dc-runtime templates (`sc-if`, `sc-for`, `{{ }}`). Sections are marked `<!-- ===== S0 … -->`. |
| `naas-app.js` | State → template values. `shellVals` (rail, pills, titles), the hero block (`heroLayout` call, drills), `addendumVals` (Observe), `andiVals`. |
| `naas-flowmap.js`, `naas-observe-dash.js` | The Observe dashboard: the live flow map (`buildMap`, `childrenOf`, `trail`, `litFor`), gauges, queue, panel. |
| `naas-connections.js` | Pure derivations added for Ramesh's asks: `connections`, `impacted`, `patterns`, `records`, `resolveDest`, `launchCards`, `siteDrillRows`, `regionDrillRows`, `splitSources`. Unit tests in `tests/`. |
| `naas-logic.js` | `heroLayout` (geometry of the picture, including the lane and `regionRows`). |
| `naas-addendum.js` | `observe` (flows, KPIs, Sankey via `sankey3`), inventory tree. |
| `naas-round2.js` | `health` (amber edges, incidents), scopes, endpoints. |
| `naas-data.js` | The estates. `REG(...)` regions carry `link`, `paths`, `acct` for the connections panel. |
| `naas-sites.js`, `naas-paths.js` | Sites by class, metro, site; site-to-region paths. |
| `PATCHES.md` | Every change on top of the Claude Design export, dated. Section 8 is this iteration. |

Run tests: `node --test 'tests/*.test.mjs'` (node 20 or newer, no install).

## State keys worth knowing

`screen` (`s0` intake, `s2` home, `s3` a word: `tab` in connect, observe, govern, cost), `drill` (left trail), `cloudDrill` (right trail), `obConn` (selected connection), `obTab` (`flow` or `control` = Logs), `logPattern`, `skSplit` (Sankey split key), `andiOpen` (closed unless the user opened it), `obScope`, `obWindow`.

## What is real and what is mock

Everything on screen derives from the seeded estates in `naas-data.js`. The derivations are honest about what the data can say: private destinations resolve to resource names through the discovery tree; public destinations stay an ip and are labeled unresolved; Shadow SaaS and new-destination insights were removed because sampled NetFlow cannot support them. When real telemetry is wired in, `connections()` expects per-connection utilization, state, BGP and drops; `impacted()` expects the region's VPCs and the cloud-to-cloud arcs.

## Not in this cut

Access-side utilization (ADI, AVPN interfaces) for the left side; application-layer impact; public destination resolution; the store screens (Compose, Recommend, Review, Marketplace) which still exist behind finding doors.
