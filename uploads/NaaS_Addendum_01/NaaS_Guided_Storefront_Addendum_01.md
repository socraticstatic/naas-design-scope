# Addendum 01 to the NaaS Guided Storefront Requirements: the Discover inventory tree, the lifecycle, and Observe at full weight

Date: 2026-09-04
Status: addendum for design, not yet approved for build
Applies to: `2026-09-03-naas-guided-storefront-requirements.md` (rev 2). That document is unchanged. Where this addendum and the base spec differ, this addendum wins.
Reference captures: `NaaS_Addendum_01/reference/` beside this file (the Discover tree, the VPC map close-up, the Map view, NaaS Observe, AI Fabric Insights; light and dark, captured from the running app)

---

## 1. Why this addendum exists

Three things came out of review of rev 2.

First, the Discover inventory tree, the clickable drill-down from cloud to region to VPC to the VPC map, is the most useful screen for digging into workloads, and the base spec gives it one line. Claude Design had never seen it and produced nothing like it. It is specified here in full, from captures of the running app.

Second, the five-stop lifecycle (Discover, Connect, Govern, Observe, Cost) is the model everyone likes. It needed a check against the MVP document and a decision on one word.

Third, Observe is light in the base spec. It gets one tab description, one unpriced finding, one rollup card, and one line on the order. Govern gets three findings, a policy table, and simulate-before-enforce. Cost gets the arbitrage engine and two priced findings. The July executive note said the opposite should be true: Observe is the money screen because the selling motion is visibility-led. The MVP's fifth pillar and its section G ask Observe for path visualization, throughput, latency, loss, traffic and policy analytics, cost analytics per path and per workload, and a coverage metric. The running app already has almost all of it and the base spec does not use it.

This addendum specifies the tree, settles the lifecycle, and brings Observe up to the weight of the other four stops.

---

## 2. The Discover inventory tree

Amends base spec S1. The tree is S1's body.

This is the clickable drill-down that already runs on `#/discover`. It is the single most useful screen for digging into workloads and it must be reproduced as built, not reinterpreted. Design it from the captures: `discover-tree-collapsed-light.png` and `-dark.png` for the page, and the close-ups `discover-vpc-open-light.png` and `-dark.png` for one region and one VPC open through the VPC map. The map view is in `discover-map-light.png` and `-dark.png`.

### Above the tree
- Verdict line, bold, in the estate's numbers: "8 of your 9 cloud regions still ride the public internet. 1 is on the AT&T fabric, across 6 clouds." Beneath it a persona line: "For Cloud & Platform Architect: see what I actually have across every cloud, one inventory, no console hopping."
- The lifecycle station track: Discover · Connect · Govern · Observe · Cost as five stops on one line, Discover filled, with the primary CTA at the right end: "Attach the 142 workloads still on the public internet".
- Page title "Discover", subtitle "Your estate across every cloud. Connect an account, scan it, browse every region, VPC and subnet." Right of it the secondary button "Connect a cloud" and the advisor card: kicker "Your advisor", the savings figure large (`$52,961/mo`), "on the table across 3 findings", primary button "Ask the advisor".
- Controls row: Tree · Map as a flat underline pair, then a muted "Collapsed view" state label, right-aligned "Expand all" and "Collapse all" as outline pills.
- Filter chips row: Cloud, Path, Domain, Site type, Region, Business unit, Connection. Each a pill with a chevron. Chips scope the tree and the map from one control.

**Level 1, cloud rows.** One card per cloud, radius 16, base background, secondary border, 10px between cards. Left to right: chevron (rotates 90 degrees when open), provider mark in a 32px tile, cloud name bold, sub-line "3 regions · 6 VPC/VNet · 142 workloads" in light body text. GPU/AI clouds (CoreWeave, Nebius) carry a small "GPU / AI" pill after the name. Right-aligned connection state: a green pill "via the AT&T fabric" with a link icon when any path is private, otherwise a gray pill "public internet" with a globe. The whole row is the disclosure button.

**Level 2, region rows.** Nested inside the open cloud card, indented 24px, radius 12, wash background. Chevron, region id bold ("us-east-1"), city beneath in light text ("N. Virginia"). Right side: three stat tiles (value bold on top, uppercase 10px label beneath): VPC/VNet count, Subnets, and Latency labeled "Latency · fabric" (3ms) or "Latency · public" (92ms). Then the same connection pill as the cloud row.

**Level 3, VPC/VNet rows.** Nested inside the open region, radius 12, base background. A checkbox on the far left, outside the disclosure button (selecting a VPC and opening it are different acts). Then chevron, a 28px "VPC" or "VNET" label tile, the VPC name bold, sub-line "Production · 3-tier · `10.0.0.0/16`" with the CIDR in mono, then tag chips (rd-helion, shared-services, finance, pci, classified-helion, internet-facing), each tinted from its tag color at 8 percent fill and 25 percent border. Right side: stat tiles AZs and Subnets, then the attach badge: green "Private" when attached, gray "Public" with a globe when not.

**Level 4, the VPC map.** Opens inside the VPC row as three calm columns with uppercase 11px column heads. No connecting lines; hierarchy comes from grouping and spacing.
- Subnets · by availability zone: AZ name as a small heading, then one card per subnet: name bold, a "public" globe pill or a green "private" pill, CIDR in mono, workload count, tag chips beneath.
- Route tables: one card per table, name bold, "Public · 1 route" or "Private · 3 routes". Policy violations render inside the card in error red with a triangle icon.
- Gateways & connections: one card per gateway with a 32px icon tile tinted by kind (internet gateway blue, NAT gray, endpoint purple, Direct Connect green with a lock when attached, transit gateway teal), name bold, type beneath.
- Legend at the foot, hairline above: "public subnet" (hollow dot), "private subnet" (green dot), "attached via the AI-grade network" (green lock), and "N policy violations" in red when any exist.

### Under the tree
- Five stat tiles in one card: Sites, Clouds · Regions ("6 · 9"), Workloads, Attached VPCs, Exposed endpoints. Then a "Show the breakdown" disclosure link.
- "Your sites" card: kicker with a pin icon, "6 premises · your own buildings, not a cloud", then site cards with a checkbox, site name, and its CIDR.

### Behavior
- Every row at every level is a disclosure with `aria-expanded`. Expand all and Collapse all act on every key. A first-scan reveal staggers rows in by 40ms and flashes a newly discovered card once.
- Selection is a checkbox, never a row click. Selected rows tint with the ghost fill and feed the advisor's "Attach the N workloads" count.
- Above the rollup threshold (bank scale), clouds open to grouped rows with counts, comma formatted, and a "+N more" overflow row. Never thousands of rows.
- Dark mode is the same layout on the dark tokens: wash `#111821`, base `#1a2431`, hairline `#2f3d4d`, heading `#f2f6fa`, body `#c5cfd9`. Green, red, and tag tints keep their hue and lift their lightness. See the dark captures.

**Storefront placement.** The tree is S1's body and returns in S3 as the level map's expanded state and in S8 for a product's "where this lands". The floor (S2) and the department (S3) never re-draw it as something else; they link back to it.

---

## 3. The lifecycle

### 3.1 Decision

The lifecycle is five stops, in this order, on every layer:

**Discover · Connect · Govern · Observe · Cost**

### 3.2 Reconciliation with the MVP

The MVP spine is Discover, Attach, Govern, Observe. The MVP also names Cost Control "a first-class MVP capability" (section H), gives it a pillar (V4), and gives it a success metric (dollars of egress and cross-cloud savings identified). Five stops is a faithful expansion of the MVP's four, not a departure. No conflict.

The one difference is a word. The MVP says Attach; the portal says Connect.

- **Connect is the place.** The nav, the layer-first IA, the rail, the "Connect a cloud" button, and the approved specs all say Connect. A place gets a noun-like name a viewer can return to.
- **Attach is the verb inside it.** Attaching a region, a VPC, or a workload to the fabric is what you do at the Connect stop. The Discover CTA already reads "Attach the 142 workloads still on the public internet". The MVP's "regions attached" and "cloud attach rate" metrics keep their words.

Copy rule: never rename the stop to Attach, never say "connect a workload" when the act is an attach. Add one sentence wherever the lifecycle is introduced to a stakeholder who reads the MVP: "Connect is the place; attach is what you do there."

### 3.3 The station track

The lifecycle draws as one line with five stops on every layer home and every department. The current stop is filled cobalt, completed stops are green with a check, future stops are hollow. The right end of the line carries the next-stop CTA in the stop's own words: on Discover "Attach the N workloads still on the public internet"; on Observe "See the savings". The same component, the same geometry, every layer. This is already built (`FlowBar`) and is visible in the Observe capture.

---

## 4. Observe at full weight

### 4.1 What the base spec says today

Section 6, S3, Observe tab: six KPI tiles, the Sankey, flow logs, "See the savings". Section 7.1: one finding kind, Unmonitored, unpriced. Section 7.2/S2: one rollup card, Observed. S6: one telemetry line on the order. Section 13: Observe appears in demo step 5 only.

### 4.2 What runs today (design from the captures, never from memory)

The NaaS Observe screen at `#/naas/observe`, top to bottom. Every element below exists and must be reproduced as built.

1. **Verdict line.** Bold, savings-first, in the estate's numbers: "13% of your traffic rides the AT&T-controlled path, saving $3.3k/mo. 87% still crosses the public internet." Beneath it the persona line: "For FinOps & SRE: know where the traffic, the cost and the bottlenecks are, and what to do about them."
2. **Station track** with Observe filled and the CTA "See the savings".
3. **Filter chips** row, the same seven as Discover (Cloud, Path, Domain, Site type, Region, Business unit, Connection). They scope every panel below.
4. **Title** "Network Observability" with a green "Live" dot.
5. **Six KPI tiles**, one row: Throughput (Gbps), P95 Latency (ms, "across N flows"), Packet Loss (%), Egress Spend ($/mo), On the AT&T fabric (%), Savings ($/mo). Value large and bold, label uppercase 12px above, unit small beside. Savings and Egress Spend are the only dollar tiles; "Cost" is never a label.
6. **Traffic Flow panel** with seven flat tabs: Flow, Trend, Throughput, Latency, Loss, Egress, Control. Flow is the default and renders the three-band Sankey (sources: sites rolled up by class plus workload tag groups; path: AT&T fabric in cobalt versus Public internet in slate; destinations: AI endpoints, object storage, inter-cloud, SaaS and internet egress). Above the Sankey, a sub-verdict: "120.2 of 134.8 Gbps still rides the public internet · 14.6 Gbps under AT&T control" with a two-swatch legend. Beneath it the hint "Click a site group to split it by metro, or a path to split it by circuit." Footnote: how many flows, how many site-originated, how sites roll up. The six trend tabs render a TrendBand on the same left-to-right axis with a timeline scrubber; the Sankey has no timeline.
7. **Records** table: heading "Records · N groups", right-aligned "Group by" (None, Source, Destination, Path, Action). Columns: Time, Source, Destination, Proto/Port, Bytes, Path, Action. Path is "public" or "private" as text; Action is "allow" or "deny". Deny rows exist only when a hosted VPC's vSRX is live and policy says no, and those rows carry zone-from, zone-to, and session. Table rules: no box wrapper, fixed columns, truncate, no horizontal scroll.
8. **Network briefing** card: a five-sentence paragraph the system writes from state ("1 of 9 regions ride the private envelope, 3ms to the on-ramp serving each. 8 still depend on public transit; eu-north1 is the outlier at 204ms on the public path. Egress is running $44.9k/mo... One anomaly in the window: a transit-congestion spike on eu-west-1."), three action pills (Show public flows, Steer worst offender, Review path diversity), and three seeded questions for the advisor ("Which flow would save the most by steering to AT&T mid-mile?", "What is driving the public egress spend?", "Are any controlled flows single-homed?").
9. **"What your advisor would do with this"**: finding cards in the storefront's exact shape, kicker "For FinOps & SRE", savings-first headline ("Save $50,400/mo by attaching 8 unattached regions"), evidence sentence, "Why we recommend this", and the three-tier ladder (Steer on the AT&T fabric, NetBond attach featured, NetBond Adv), CTA "Choose this".
10. **Paths**: heading, then the "Flows & paths" table with a summary line ("13% under AT&T control · North-south 16% · East-west 0% · 0 steered") and a "Restore all" pill. Columns: Flow (name plus the path beneath in light text, e.g. "Hyperscaler-native · public internet" or "AT&T mid-mile · NetBond · PE-IAD-02"), Kind (App, Cloud-to-cloud), Gbps, Latency with a $/GB chip beside it, Control ("Public" gray or "AT&T-controlled" green), Diverse (Yes/No), Action (a "Steer" primary pill on steerable public flows, a "Failover" outline pill on controlled ones). Steering a row reroutes it and the KPI tiles, the Sankey, and the briefing all update.
11. **Event stream**: heading with a session count, empty state "No onramp or fix events yet: attach a circuit or apply a fix on Connect / Govern to populate the feed."

Dark mode is the same layout on the dark tokens. See `observe-dark.png`.

### 4.3 Observe findings (adds to base spec section 7.1)

Three Observe kinds, so the pillar has the same weight as Govern and Cost. Omitted at zero, like every other kind.

| Kind | Headline pattern | Evidence | Priced |
|---|---|---|---|
| Blind spots | "N regions send no flow logs. 38% of your traffic is unseen." | regions without telemetry, share of Gbps they carry | No |
| Degraded paths | "N paths run above their latency SLO or show loss." | the paths, their P95 against the SLO, loss where above zero | No |
| Unmonitored | "N paths send no telemetry." (unchanged from base spec) | count | No |

Ladders:

| Kind | Start here | Recommended | Full control |
|---|---|---|---|
| Blind spots | Attach the region (telemetry starts with the first attach) | Hosted VPC in the region (the vSRX pair turns on inspected flow logs) | Managed NOC |
| Degraded paths | Steer the worst path onto the fabric | Latency SLO policy for the tag, with the region attached | Dual-attach for path diversity (Failover) |
| Unmonitored | Advanced Network Monitoring | Network Insights API | Managed NOC |

Blind spots is the coverage metric turned into a finding. It is the first card in the Observe tab whenever coverage is under 100 percent.

### 4.4 Coverage is the verdict (amends base spec S2 and S3)

- The Observe tab opens with a coverage sentence: "62% of traffic and 7 of 9 paths are covered. 2 regions are blind." This is the MVP's "% traffic and path coverage" success metric, spoken.
- The **Observed** rollup card on the floor shows the same number, with a progress bar and the alarm state under 50 percent, and links to the Observe tab of the Cloud layer.
- The KPI strip's "On the AT&T fabric" tile and the Sankey sub-verdict are the two other statements of the same split. They must agree to the decimal. One derivation, three lenses.

### 4.5 Observe's fingerprints on every other screen

Observe is not only a tab. Its data shows on every screen, and Claude Design must keep these consistent because they are the same numbers:

- The hero's comets run at the region's own latency. The region performance card says "Public today N ms · on the fabric N ms" and links to Observe.
- The Discover tree's region rows carry the latency tile labeled "Latency · fabric" or "Latency · public".
- The Paths table's Latency and $/GB chips are the same figures the Cost tab's arbitrage breakdown prices.
- A policy simulated on Govern draws its affected paths dashed; when enforced, Observe's Records table gains the deny rows.

### 4.6 Observe in the offer (amends base spec S5 and S6)

- Starter packages: Grow and Run state "Telemetry from day one" in their includes. Start states "Path health visible from the first attach".
- Review order, "Ships with this order": the telemetry line lists what becomes visible on delivery: path, throughput, P95 latency, loss, egress, and flow logs; with inspection when the order includes a hosted VPC.
- Tailored offers (mature): an Observe section, "See what you cannot see today", listing the blind regions with the attach-or-hosted-VPC choice per region.

### 4.7 Observe in the demo (amends base spec section 13)

Observe appears twice.

- Step 5 as written: the established estate's Observe tab. Six tiles, the Sankey, the briefing, deny rows from the vSRX, the Paths table. Steer one public flow; watch the tiles, the Sankey, and the briefing move together.
- A new closing beat after step 7: the order has landed. The Pending Actions row completes its fifth stage, "Validated · live". Click it. Observe opens on the new path: its first flow logs, its first comet on the hero, the coverage sentence up by one region. The demo ends on visibility, because that is what is being sold.

### 4.8 The AI Fabric layer's Observe

For the token layer, Observe is Insights: Performance, Savings, Security. These are frozen as Figma boards 20, 21, and 22 in file `GMSruRYGS5uyQLRBk2ADMB` and captured in `reference/ai-observe-insights-light.png`. The storefront reuses those boards as the AI Fabric department's Observe tab. Do not restate them; point at them.

### 4.9 Copy

- Tiles: Throughput, P95 Latency, Packet Loss, Egress Spend, On the AT&T fabric, Savings. Never "Cost", never "Under Control".
- Coverage sentence pattern: "{pct}% of traffic and {n} of {m} paths are covered. {k} regions are blind."
- Path control values: "Public" and "AT&T-controlled". Path column values in records: "public" and "private".
- Action pills: "Steer" (primary) and "Failover" (outline). "Restore all" resets steering.
- The briefing is prose, five sentences at most, written from state. No bullet lists inside it.

---

## 5. Traceability delta (extends base spec section 17)

| MVP line | Phase | Screen, per this addendum |
|---|---|---|
| V5 Observability: full telemetry plus traffic patterns for decisioning | 1 | 4.2 items 5 to 10; 4.5 fingerprints |
| G. Path viz, throughput, latency, loss | 1 | KPI strip; Trend, Throughput, Latency, Loss tabs; Paths table |
| G. Traffic and policy analytics | 1 | Sankey; Control tab; Records with deny rows; briefing |
| G. Cost analytics per path and per workload | 1 | Paths table $/GB chips; Egress tab; Records grouped by Source |
| G. AI-driven RCA and recommendations | Next | The briefing's anomaly sentence and the advisor cards are the Phase-1 edge of this; full RCA stays vision |
| Metric: percent traffic and path coverage | 1 | 4.4 coverage sentence, Observed card, Blind spots finding |
| Spine: Attach | 1 | 3.2: Connect is the place, attach is the verb |
| A. AWS / Azure / GCP discovery: regions, VPC/VNet, subnets, gateways, endpoints, workloads | 1 | Section 2, levels 1 to 4 of the tree |
| A. Topology and dependency map | 1 | Section 2, the VPC map and the Map view |
| V1 Private reach to cloud, region, workload | 1 | Section 2, the Private/Public badge at every level |

---

## 6. Acceptance criteria delta (extends base spec section 14)

- The Observe tab of the Cloud department is designed in full per 4.2, light and dark, from the captures.
- Three Observe finding cards exist with ladders per 4.3, in the same card shape as Govern and Cost findings.
- The coverage number appears in three places (Observe verdict, Observed rollup card, "On the AT&T fabric" tile plus Sankey sub-verdict) and is the same number.
- The demo storyboard ends on Observe.
- Every lifecycle station track uses the same component and geometry with the five stops in order; no layer shows a different set or order.
- No screen, label, or CTA renames Connect to Attach, and no copy says "connect a workload".

---

## 7. Out of scope for this addendum

- Changes to the base spec's Connect, Govern, or Cost content, or to Discover beyond the tree.
- Any new Observe data the engine does not already derive. Everything in 4.2 is on screen today.
- AI-driven root cause analysis beyond the briefing's anomaly sentence.
