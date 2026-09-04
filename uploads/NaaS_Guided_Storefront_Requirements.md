# AT&T NaaS Guided Storefront - Requirements for Claude Design

Date: 2026-09-03 (rev 2, MVP coverage folded in)
Status: requirements for design, not yet approved for build
Owner: Micah Boswell, Experience Lead, DNI
Audience for the design: AT&T executives (demo), then the NaaS / Cloud Control / AI Fabric stakeholder group
MVP source of truth: Cloud_Fabric_with_Control_MVP-v1 (Ramesh Prabagaran, Aug 2026). Section 17 maps every MVP line to a screen.

---

## 0. How to use this document in Claude Design

Paste this whole file as the brief. Then ask for the artboards in section 6, in order, at 1440 wide, light theme first, dark theme second. Every artboard is a screen a customer could land on, never a marketing slide.

Three rules override anything Claude Design would do by default:

1. Reuse, do not reinvent. The hero visualization, the layer explorer, the Discover tree and map, the Govern, Observe, and Cost screens, and the storefront stage model already exist and are described here. Design the storefront around them.
2. Flywheel is the design system. Section 8 lists the tokens, type, radii, and component rules. Nothing off-system.
3. The customer is recognized, not marketed to. The store reads the estate and leads with what closes gaps. Every offer carries its evidence. Unpriced things are named, never summed.

---

## 1. What this is

A guided storefront for AT&T Network-as-a-Service. One front door for everything AT&T sells on the fabric: AI Fabric, cloud connectivity with control, network services, and transport and access.

"With control" is the whole point. The MVP is not pipes. It is private reach into hyperscalers, neoclouds, and SaaS, plus policy, cost, and observability control on every path. The storefront sells the path and the control together. A path without its policy, its savings, and its telemetry is not an offer in this store.

It is broad because an executive needs to see the whole catalog in one picture. It is deep because the same executive will click one thing and expect to land on a real screen, with real evidence, all the way to an order review.

It is guided because the store does the work. The customer arrives, the store discovers what they have and what AT&T can see, asks for at most two things, and composes the recommendation. Browsing is available but never the default.

Brand: **AT&T AI-grade network**. Never "Cloud Connect", never "NetBond Advanced" as a product name in display copy. NetBond is the on-ramp product and stays.

---

## 2. The thesis in one picture

The stack is the store.

The network stack has four layers. They are the store's departments. The customer's estate sits on the left, the clouds, neoclouds, and AI providers on the right, the AT&T fabric in the middle. Every product in the catalog is a way of moving something across that picture more privately, more reliably, more cheaply, or with more control.

So the storefront's home is not a grid of tiles. It is the fabric picture with the four layers stacked on it. Click a layer and it opens. Click inside and it opens again. At the bottom of every path is an outcome you can order, and the outcome always carries its control.

That one metaphor runs the whole product. Do not add a second one.

---

## 3. What we take from each source

| Source | Take | Leave |
|---|---|---|
| Cloud Fabric with Control MVP v1 | The five pillars (private reach, optimal path, policy control, cost control, observability). The three use cases (ingress site to cloud, egress cloud to Internet or WAN, optimal cloud to cloud). The spine Discover, Attach, Govern, Observe. The Phase-1 capability matrix. The six success metrics. Hosted VPC/VNet per region as the anchor product. | Nothing. Every Phase-1 line lands on a screen (section 17). Next-phase lines are vision strata. |
| AI-grade network: `FabricHero` (`src/features/connect/FabricHero.tsx`) | The three-column fabric picture: sites left, AT&T fabric band center, clouds and internet right. Ports, on-ramp chips, comets keyed to latency, reliability dots, band that expands in place to show its internals. Deterministic layout from a model. Animations that collapse to the static frame. | The Connect-page chrome around it. |
| AI-grade network: layer explorer (`edgeDrill.ts`, `EstateLevelMap.tsx`, `EdgeTrail.tsx`) | Click a layer, the next opens. Drill chain as data: class, region, state, metro, district, site. Breadcrumb that reverses one click at a time. Hero column capped at 7 rows, the level map shows every group with sort and search and a 60-tile soft cap. Rollup and filter before any diagram renders individuals. | Nothing. This is the interaction model. |
| AI-grade network: Discover (`UnifiedDiscovery.tsx`, `AttachmentMap.tsx`, `DiscoveryWizard.tsx`, `StackPanel.tsx`) | Credential intake (provider, read-only scope, daily refresh). The inventory tree: cloud, region, VPC/VNet, subnet, workload. The attachment map: sites, fabric, regions, workloads, one row per workload, click a workload for its chain. Estate filter chips that scope tree and map. The stack panel that shows the layers with findings. | Nothing. |
| AI-grade network: Govern (`state-rules.ts`, `/naas/govern`) | Policies as match plus requirement: tag matched, with live consequences. The requirement set: no direct internet path, inline security inspection, segment intra-tag only, private path required, latency SLO. Matched and violating workloads computed from the tag registry. Author, simulate, enforce, undo. | Nothing. |
| AI-grade network: Observe (`/naas/observe`, `SankeyPanel.tsx`) | Six KPI tiles: throughput, P95 latency, packet loss, egress, under control, savings. The three-band Sankey (source, AT&T fabric or public internet, destination). Flow-log records with deny rows and inspection enrichment when a managed VPC is live. "See the savings" hands off to Cost. | Nothing. |
| AI-grade network: Cost (`state-billing.ts`, `SteerToSave.tsx`, `/naas/cost`) | Per-bucket egress arbitrage: GPU inference egress, cross-cloud (AWS West/EU, Azure), misc internet egress, committed base. Hyperscaler bill vs. fully-on-fabric bill. Steer-to-save recommendations per bucket. | Nothing. |
| AI-grade network: managed VPC (`state-managed.ts`) | The AT&T-hosted VPC/VNet lifecycle: create VPC/VNet, launch vSRX HA pair, plumb toward cloud (TGW attachment or VNet peering), plumb toward AT&T (private VIF or private peering plus BGP), validated live. | Nothing. This is the MVP's headline product. |
| AI-grade network: layer-first IA (`navItems.ts`, spec 2026-07-23) | Rows are layers, columns are the lifecycle (Connect, Govern, Observe, Cost). Verbs are never destinations. Places in the top bar, tasks as a badge. | Nothing. |
| AI-grade network: advisor entry (Aug 7 brainstorm, Business Advisor video) | Minimal intake, maximum inference. Visible scan steps with receipts. Savings headline, itemized beneath. Evidence inline, "why" one click away. Chat narrates, canvas shows, canvas stands alone. | Consumer checkout. |
| NetBond storefront (`att-netbond-sdci`, spec 2026-09-03) | Stage model: empty, partial, mature. Head-start counters. Outcome composer as a door to the wizard. Starter packages with limits and term pricing. Findings with a three-tier ladder: Start here, Recommended, Full control. Tailored per-connection offers. View-as switcher for demos. Two modes: For you and Browse. Estate visual reusing the wizard's tile language. | The "Marketplace" tab placement inside Manage. In this product the storefront is the front door. The contract-term-only pricing model; here the priced findings are path arbitrage. |
| Equinix Fabric (portal and Fabric One, Sept 2026) | Two-card fork at flow entry: connect to a provider vs. connect my own assets. One origin-type control that reshapes the form. Region tabs, then metro, then asset, same on both sides. The service profile is the SKU behind every provider tile. Constraints stated inline, not on submit. Map as a design tool: pick two metros, see path and latency before ordering. Pricing shown twice, calculator before and Pricing Overview at review. Count tiles with Get Started empty states and Pending Actions above the fold. Natural language as a peer to the wizard. Package tiers with hard limits and term pricing. Declare outcome, compose, delivered. | Widget dashboard you rearrange. Autonomous ordering. Their names for things. |

---

## 4. Journey and information architecture

### 4.1 The guided path, mapped to the MVP spine

| MVP spine | Storefront step | What happens |
|---|---|---|
| Discover | Front door | Head start: what AT&T already sees. Two-field intake if the estate is unknown. |
| Discover | Discover | Scan steps check off. Inventory tree and topology map appear. Filter chips scope the estate. |
| Discover | Floor | The fabric picture with four layers. The estate on the left, clouds and workloads on the right. |
| Attach, Govern, Observe | Department | One layer opened. Its Connect, Govern, Observe, Cost tabs. Findings with ladders. |
| Attach | Compose | Declare the outcome: ingress, egress, or cloud to cloud. Control attached inline. |
| Attach | Recommend | Findings with ladders, or packages when the estate is empty. |
| Attach | Review | Order summary, pricing overview, the policy that ships with it, timeline, approve. |
| Attach | Handoff | The portal's Connect flow opens with the order pre-filled. |
| Govern, Observe | After delivery | Pending Actions row, then the policy simulate and enforce, then telemetry. Not designed here beyond the handoff row. |

Every step is a place with a URL. Back always works. The breadcrumb is the layer trail, not the wizard step.

### 4.2 Two modes, one store

- **For you** is the default and the guided path above.
- **Browse** is the full marketplace: hero, shop-by-category tiles, curated rows, every product behind search, sort, and a filter panel. Browse never knows the estate. The home never lists every product; results replace the home once the customer names what they want.

Mode is a flat underline tab pair under the page title. Never a pillbox.

### 4.3 The four layers (the rows)

In elevation order, top to bottom. AI Fabric rides on the network, so it draws on top.

| Layer | Tagline | Lifecycle verbs inside it |
|---|---|---|
| AI Fabric | The token layer | Connect (Providers, Virtual keys) · Govern (Policies, Teams and limits) · Observe (Insights) · Cost (Savings) |
| Cloud | The on-ramp layer, with control | Connect · Govern · Observe · Cost |
| Network services | The services layer | Connect · Govern · Observe · Cost |
| Transport and access | The physical layer | Connect · Govern · Observe · Cost |

Rules: users enter through rows, act through columns. A verb is never a top-level destination. The lifecycle verbs read the same in every layer so a viewer's knowledge transfers.

### 4.4 The three MVP use cases as outcomes

The composer and the findings speak in these three outcomes. Nothing else is an outcome.

| Use case | Outcome name in the store | Direction on the picture | Control that ships with it |
|---|---|---|---|
| U1 Ingress site to cloud | "Reach a cloud privately" | Left to right | Private path required, inline inspection optional |
| U2 Egress cloud to Internet or WAN | "Control what leaves the cloud" | Right to left, or right to the Internet node | No direct internet path, NGFW plus AT&T egress |
| U3 Optimal cloud to cloud | "Join two clouds on the best path" | Right column arc | Latency SLO, cost-aware routing |

Next phase, vision only: SaaS control, cloud to neocloud native.

### 4.5 Stage model (what the store leads with)

Derived from the estate, never authored.

| Stage | Customer has | Store leads with |
|---|---|---|
| Empty | No active connections | Head start (what AT&T already sees), the outcome composer, three starter packages |
| Partial | Some connections, gaps in reach, policy, cost, or observability | Success-metric rollup, then findings, each with a three-tier ladder |
| Mature | Broad estate, few gaps | Success-metric rollup, then offers built per connection: control add-ons, term upgrades, hub consolidation, automation |

A **View as** switcher lets a presenter pick Live estate, New customer, Growing, or Established. Deep links: `?view=empty|partial|mature`, `?mode=browse`, `?category=<id>`, `?estate=meridian` for the bank-scale estate.

---

## 5. The catalog (breadth)

Every product below is either already modeled in one of the two codebases (live) or is a named stratum with no screens yet (vision). Vision items appear as labeled strata in the stack and as tiles in Browse. They never get a wired-up detail page that pretends to be real. Phase-1 in the MVP means live here. Next in the MVP means vision here.

### AI Fabric (live)
- AI Fabric governance: providers, virtual keys, token policies, teams and limits, insights, savings
- Private AI transport: model endpoints and neoclouds reached over the fabric instead of the public internet
- 14-day AI traffic assessment (the advisor's first offer)

### Cloud (live)
- **AT&T-hosted VPC/VNet per region.** The anchor product. Policy, routing, and security baked in: the VPC or VNet, a vSRX HA pair, plumbing toward the cloud (TGW attachment or VNet peering) and toward AT&T (private VIF or private peering with BGP), validated live. Five visible stages.
- Customer L3 attach into the hosted VPC/VNet
- NetBond for Cloud: private on-ramp to AWS, Azure, Google Cloud, Oracle
- Steer on the AT&T fabric (the AI-grade path, replacing public egress)
- Multi-region, multi-cloud routing (Cloud to Cloud)
- Neocloud L3 reach via Equinix Fabric
- AWS Interconnect - Last Mile (LMCC): the max-resiliency hero
- Internet to Cloud, Colo to Colo connection types
- Connection Hub: the routing entity (never "Gateway", never "Cloud Router")
- Resiliency tiers: standard, geodiversity, maximum
- Attach types: IP, Encrypted IP (IPSec), PrivateLink, cloud-native (AWS TGW, Azure vWAN, GCP NCC), Direct Connect / ExpressRoute / Interconnect
- Vision: intent-driven auto path optimization, SD-WAN auto-onboarding, neocloud asset discovery, continuous discovery

### Control (live, sold with every path, never alone)
- Policy engine: tag, region, and workload-matched policies with a requirement. Requirements: no direct internet path, inline security inspection, segment intra-tag only, private path required, latency SLO. Allow-deny, segmentation, route steering. Cost-aware routing. Author, simulate, enforce.
- Service insertion: NGFW (Palo Alto) in path
- Observability: path visualization, throughput, latency, loss; traffic and policy analytics; cost analytics per path and per workload
- Cost control: ingress, egress, and cross-cloud visibility; path cost comparison with savings recommendations; arbitrage between hyperscaler paths and AT&T paths
- Vision: intent-based and app-aware policies, additional NGFW vendors (Check Point, Fortinet), SSE and DLP insertion, AI-driven root cause and recommendations, automated cost-driven re-routing, FinOps and budget policy integration

### Network services (live)
- SD-WAN (Cisco, VeloCloud), FlexWare
- DDoS Defense, Managed Firewall (Palo Alto), Threat Manager, Internet Protect, Dynamic Defense
- VNFs: Palo Alto, F5, Cisco
- Advanced Network Monitoring, Managed NOC
- APIs: Network Insights, Provisioning, Billing; automation tiers Portal, API, Terraform
- Vision: Managed SASE (SSE), Fortinet and Check Point VNFs

### Transport and access (live as first-mile ingress)
- ADI (Dedicated Internet), ABF (Business Fiber), AVPN (MPLS VPN), ASE (Switched Ethernet)
- Mobility and wireless first mile
- Internet first mile
- Vision: satellite, dark fiber

The storefront must show all four layers on the floor and all of the above in Browse. It must not show "coming soon" anywhere. Vision strata are labeled by what they are, not by when they arrive.

---

## 6. Screens (the artboards)

Canvas 1440 wide. Aleck Sans. Light and dark. Layer names in the design file match the aria-labels of the running app so a freeze can be pixel-diffed later.

### S0 Front door

Purpose: the customer is recognized before they type anything.

- Page title: "AT&T AI-grade network". Kicker above it: "Network as a service".
- Hero: the fabric picture (S2's hero) in its rolled-up form, with the four layer strata drawn as horizontal bands across the fabric column, top to bottom in elevation order.
- Left of the hero, one short block: "Before you tell us anything" and four counters with links: metros with AT&T on-ramps, clouds and neoclouds reachable, Last Mile metros live today, connection types orderable now. Each counter opens the Browse category that proves it.
- Below the hero, the mode tabs: For you · Browse the marketplace.
- Right-aligned in the header: View as (Live estate · New customer · Growing · Established).
- If the estate is empty: the intake card. Organization, then one estate source: a cloud credential (provider, auth type, read-only scope, daily refresh) or existing inventory (NetBond, AVPN base). Trust line: read-only, refreshed daily, no change to routing. Single CTA: "Start the scan".
- If the estate is known: skip the intake. The hero shows the real estate.

### S1 Discover

Purpose: the scan produces something you can see. This is the MVP's Discover step and its first two success metrics.

- Scan steps, checked off one by one with their source named: finding cloud inventory (regions, VPCs and VNets, subnets, gateways, endpoints, workloads), reading AT&T access records (NetBond, AVPN, ADI, ABF), checking on-ramp coverage per metro, joining utilization and egress spend. Status line: "Discovering your estate."
- Verdict sentence on completion, in the estate's numbers: "3 clouds, 12 regions, 322 workloads. 40% already reach AT&T privately."
- Four KPI tiles: assets discovered, regions attached, cloud attach rate, tags discovered. Value on top, evidence below.
- Tree and Map toggle, flat underline tabs. Tree: cloud, region, VPC/VNet, subnet, workload, disclosure rows, tags as chips. Map: the attachment map, four bands left to right, sites, AT&T fabric, regions grouped by cloud, workloads one row each. Click a workload to open its chain drawer: first mile, on-ramp, hosted VPC, workload, and the policies that match it.
- Estate filter chips above both: region, site class, business unit, cloud, connection type. Rollups first. At Meridian Trust scale the tree opens collapsed and the map draws groups, never thousands of rows.
- CTA: "Open the floor". The floor is S2 with this estate.

### S2 The floor (For you, hero expanded)

Purpose: the whole store in one picture.

- The fabric hero, full width, deterministic layout. Sites left, band center, clouds and internet right, workloads as a fourth column when the estate has them (rolled up per region until drilled), cloud-to-cloud arcs bowing right of the region column.
- The four layers as bands inside the fabric column. Each band is a button: label, one-line tagline, count of live products in that layer, and the finding count for this estate when above zero. The AI Fabric band sits on top.
- Below the hero, the success-metric rollup band: six cards, each a link, each with an honest denominator and a progress bar only where one exists. Alarm state under 50 percent.

| Card | Value | Links to |
|---|---|---|
| Discovered | assets discovered, clouds | S1 |
| Attached | regions attached of regions discovered, attach rate | Cloud department, Connect |
| Governed | tag policies enforced of policies authored | Cloud department, Govern |
| Observed | percent of traffic and paths covered | Cloud department, Observe |
| Saved | dollars of egress and cross-cloud savings identified per month | Cloud department, Cost |
| Fabric attach | share of the NetBond and AVPN base on the fabric | Transport department |

- Below that, by stage: findings (partial), tailored offers (mature), or the composer plus packages (empty).
- At the foot, one row: "Looking for something specific? Every product is in the marketplace, with filters and pricing." Link to Browse.

Hero interactions:
- Hover a node: the connected edges light, everything else dims to 0.3.
- Hover a cloud region: performance card with "Public today N ms · on the fabric N ms", the reliability dot, and a link to Observe.
- Pick two metros on the band: the route draws with its latency before anything is ordered.
- Click the band label: it widens leftward and shows its internals, on-ramps grouped by AT&T facility, max three facilities, "+N more facilities".
- Click a layer band: S3 opens in place. The hero keeps its geometry; only the band gains a selected state and the content below swaps.
- Click a site: the ingress column descends one level of the drill chain; the breadcrumb grows one step.
- Click a region: the egress column descends to its workloads.

### S3 Department (one layer opened)

Purpose: everything AT&T sells in that layer, framed by this estate, across all four verbs.

- Breadcrumb trail: Floor > Layer > (drill path). One click reverses one step.
- Hero stays, scoped: the selected band is lit, the other bands recede to 60 percent. Edges that belong to the layer stay full, others dim.
- Under the hero, the lifecycle verbs of that layer as a flat underline tab row: Connect · Govern · Observe · Cost. Same four in every layer. Each tab has real content, specified below for the Cloud layer. The other layers follow the same shape with their own products.

**Connect tab**
- Left column (8 of 12): reach findings for this layer with their ladders. When none: "Nothing to close in this layer" and the three most-chosen products for estates like this one, each with its evidence chip.
- Right column (4 of 12): the level map, every group at this depth as tiles, sortable by largest, most exposed, A to Z, searchable, soft cap of 60 with "show more".
- Below both: the layer's catalog row. Hosted VPC/VNet per region leads it. Product cards, grid that wraps, never scrolls sideways.

**Govern tab**
- Verdict sentence: "4 policies enforced. 11 PCI-tagged workloads still reach the internet directly."
- Policy findings with ladders (see 6.1).
- The policy table: name, match (tag, region, or workload), requirement, matched workloads, violations, state (authored, simulated, enforced). Dot plus text for state. No box wrapper.
- "Author a policy" opens the composer's control step with the tag registry. Example policies shown as starting points, in the MVP's words: tag PCI forces a private path; tag Internet-facing gets NGFW plus AT&T egress; branch Finance reaches only finance-tagged workloads.
- Simulate before enforce: a simulate button shows what would change (paths rerouted, flows denied) before the enforce button is enabled.

**Observe tab**
- Six KPI tiles: throughput, P95 latency, packet loss, egress, under control, savings.
- The three-band Sankey: source, AT&T fabric or public internet, destination. Rolled up and filtered by the estate chips before it draws.
- Flow-log records beneath: seven columns, deny rows, inspection zone when a hosted VPC is live.
- Observability findings with ladders (see 6.1).
- "See the savings" hands off to the Cost tab.

**Cost tab**
- Verdict sentence: "$X/mo leaves through public egress that the fabric would carry for $Y."
- The arbitrage breakdown: one row per bucket, GPU inference egress, AWS West/EU cross-cloud, Azure cross-cloud, misc internet egress, committed base. Columns: today on the hyperscaler, on the fabric, saved, action. Table rules apply.
- Steer-to-save recommendations, one per bucket, each routing to the composer with the bucket's path pre-filled.
- Cost findings with ladders (see 6.1).

Product card: name, provider or AT&T mark, one-line promise, three proof cells (uptime, latency, support), "Starting at $X/mo" or no price line at all, tags, CTA "Choose this". Icon tile in the AT&T blue family.

#### 6.1 Finding kinds

Findings are derived from the estate and omitted at zero. Sorted savings-first, then by count. Nine kinds, three per MVP pillar group.

| Kind | Pillar | Headline pattern | Priced |
|---|---|---|---|
| Single path | Private reach | "N connections have one path" | No |
| One cloud | Private reach | "Everything reaches one cloud" | No |
| Not in a hub | Private reach | "N connections route outside a Connection Hub" | No |
| PCI on public paths | Policy control | "N PCI-tagged workloads reach the internet directly" | No |
| Uninspected internet-facing | Policy control | "N internet-facing workloads have no inspection in path" | No |
| Unsegmented | Policy control | "Finance and non-finance workloads share a routing domain" | No |
| Avoidable egress | Cost control | "$X/mo of internet egress the fabric would carry for $Y" | Yes, from the arbitrage engine |
| Cross-cloud over the internet | Cost control | "$X/mo of cross-cloud traffic crosses the public internet" | Yes, from the arbitrage engine |
| Month to month | Cost control | "N connections are month to month" | Yes, from the term band |
| Unmonitored | Observability | "N paths send no telemetry" | No |

Three cost kinds are priced. Nothing else shows a dollar.

### S4 Compose (declare the outcome)

Purpose: the customer states what they want, the store composes the order with its control.

- Kicker: "Describe the outcome. AT&T composes the connection."
- Step one, the outcome: three cards, one per MVP use case. "Reach a cloud privately", "Control what leaves the cloud", "Join two clouds on the best path". The choice reshapes the rest of the form.
- Chip pickers, one row each: Source (data center, sites, internet, a cloud region, AI workloads), Destination (clouds, neoclouds, AI providers, the Internet, the WAN), Metro (region tabs, then metro), Resiliency (Standard, Geodiversity, Maximum), Control (private path required, no direct internet path, inline inspection, segment by tag, latency SLO, cost-aware routing). Control is a step, not an add-on.
- A text field above the chips: "Or just say it". Same contract as the chips. Text entry is a peer to chips, never the only way.
- Right rail, sticky: the composed summary card that redraws as chips change. Outcome, providers, tier, the drawn path on a mini fabric picture (answers ghost to solid, dual doubles the wire, tier thickens it, an inspection icon appears on the path when a control requires it), the policy line, "Starting at $X/mo", the savings line when the path replaces public egress, timeline in business days.
- Constraints appear inline the moment they apply ("Maximum resiliency needs two metros. Add one."), never at submit.
- CTA: "Review this order". Nothing is ordered here.

### S5 Recommend

Two layouts, chosen by stage.

**Empty estate: packages.** Three cards, middle featured with a cobalt fill. Start, Grow, Run. Each: one-line promise, what's included, hard limits (clouds, bandwidth, resiliency, policies), on-demand monthly beside 36-month with "save N% vs on-demand", CTA to the wizard. Term discount band 15 / 30 / 50 percent at 12 / 24 / 36 months.

- Start: one cloud, Internet to Cloud, standard resiliency, 1 Gbps, private path policy.
- Grow: two clouds, hosted VPC in each, Cloud to Cloud, DDoS Defense, geodiversity, segmentation by tag.
- Run: hosted VPC per region with the vSRX pair, AWS Interconnect - Last Mile, Managed Firewall in path, Advanced Monitoring, cost-aware routing.

**Partial estate: findings.** Up to four. Each card: kicker "For {persona}" (Cloud and Platform Architect, Network Engineering, Security and Compliance, FinOps), headline in customer language, risk-first or savings-first, one evidence sentence using the estate's own numbers, a "Why we recommend this" disclosure, then the ladder.

Ladder: exactly three tiers, Start here / Recommended / Full control, middle featured. Each tier names the product and routes to a real flow. Savings figure only when priced; when unpriced, no dollar anywhere on the card.

Ladders for the new kinds:

| Kind | Start here | Recommended | Full control |
|---|---|---|---|
| PCI on public paths | Author "private path required" for tag PCI | Hosted VPC in the region with the policy enforced | Hosted VPC plus inline inspection |
| Uninspected internet-facing | Author "inline security inspection" | NGFW (Palo Alto) in path | Hosted VPC with the vSRX pair and AT&T egress |
| Unsegmented | Author "segment intra-tag only" | Segmentation across the region's hosted VPC | Segmentation plus latency SLO per tag |
| Avoidable egress | Steer this bucket on the fabric | Steer every internet bucket | Hosted VPC with AT&T egress for the region |
| Cross-cloud over the internet | Cloud to Cloud for the pair | Multi-region, multi-cloud routing | Neocloud reach via Equinix Fabric when a neocloud is in the pair |

**Mature estate: tailored.** Heading "Built for what you already run". Sections: control add-ons per connection (table: inspection, segmentation, SLO), term upgrades (table with on-demand / 12 / 36 and percent saved), hub consolidation by location, steer-to-save per bucket, automation (Portal · API · Terraform as a flat tab card).

### S6 Review order

Purpose: Equinix's Pricing Overview, done our way, with the control on the order.

- Left: order summary as a table. No box wrapper, fixed columns, truncate. Line, product, quantity, term, monthly.
- Beneath it, "Ships with this order": the policies, in the policy table's shape, state "will be enforced on delivery". And the telemetry line: "Path, throughput, latency, loss, and flow logs from day one."
- Right, sticky: pricing overview. On-demand vs chosen term with percent saved. The savings line when the path replaces public egress. Unpriced lines listed under "Priced after survey", never summed into the total. Timeline. Notification email. Approver.
- The drawn path from S4 sits above the table, final.
- CTAs: primary "Submit for approval", secondary "Save as proposal". Proposal then approve, never autonomous ordering.
- Success state: a Pending Actions row appears at the top of S2 and in the tasks badge. For a hosted VPC order, the row shows the five stages: create, vSRX pair, plumb toward cloud, plumb toward AT&T, validated live.

### S7 Browse the marketplace

- Hero: the LMCC max-resiliency hero, unchanged from NetBond.
- Shop by category: eight tiles in the AT&T blue family (Hosted VPC and control, Max resiliency, Private connect, Internet, Security, VNF, APIs, Managed). All selectable.
- Curated rows: "Most chosen by estates like yours", "New on the fabric", "Runs with AI Fabric".
- Toolbar: search, sort (popular, price, name), Filters button that opens a full-width panel (categories, providers, price ceiling). Active filter count on the button.
- Results replace the home. "Back to the marketplace" returns.

### S8 Product detail

- Header: name, provider mark, promise, price line, "Choose this".
- Body: three proof cells, what's included, limits, evidence chip ("78% of estates your size run this with inline inspection", sourced), "Runs with" cross-sell row, term pricing table.
- Right rail: where this lands on the fabric picture, one lit edge. For hosted VPC: the five-stage lifecycle drawn as a station track.

### S9 Estate presets (for the demo)

Three named estates, each honest to its stage: Meridian Logistics (empty), Acme Corp (partial), DataFlow Systems (mature). Plus Meridian Trust (bank scale, thousands of sites) to prove rollup and filter. Presenters switch with View as. Design one artboard per preset for S2, and one S1 for Meridian Trust to prove the collapsed tree and grouped map.

---

## 7. The hero visualization, specified

Reuse the existing component's model and geometry. What the design must preserve:

- One axis. Left is ingress, right is egress. Status and history render as positions on the path, never as separate chart types.
- Three columns, four when the estate has workloads: site nodes, the fabric band, cloud region nodes grouped by cloud, workloads rolled up per region, plus an Internet / SaaS public egress node.
- Ports: small circles where every edge meets the band, private vs public.
- On-ramp chips on the fabric-to-region edges: NetBond, DX, ER, IX, EQX for neocloud reach via Equinix Fabric. Haloed text in light, pill chips in dark.
- Reliability dot on every region node.
- Comets: a dim cobalt tail and a bright sky-blue head on each private edge, period keyed to that region's latency. Public edges crawl a dash.
- Inspection mark: a small shield on any edge that passes through a vSRX or NGFW. This is the "with control" tell on the picture.
- The band breathes. Once. Subtly.
- Band expands in place. Width grows leftward, internals draw as an inventory grouped by facility.
- Layer strata: four horizontal bands inside the fabric column, AI Fabric on top. This is the new element. The strata are part of the band, not a separate legend.
- Route preview: two metros picked on the band draw the path and its latency.
- Deterministic: same model in, same picture out. No randomness.
- Every animation's base state equals the static frame, so a frozen board and reduced motion look identical.
- Hand-rolled SVG only. No chart libraries. `viewBox` plus width 100 percent, never a horizontal scroll.
- Scale: the ingress column draws at most 7 rows. The level map shows the rest. Roll up and filter before drawing individuals. Never thousands of nodes.

---

## 8. Flywheel compliance

The AT&T Flywheel design system as implemented in both repos. Tokens are the source of truth; the values here are for the design file.

### Color
- AT&T blue: `#009fdb` (brand), `#00abeb` (000), `#66c8f0` (100), `#99daf5` (200).
- Cobalt: `#e6f0fa` (100, ghost fills), `#3374cc` (400), `#0057b8` (600, primary interactive: buttons, links, active nav, active borders), `#00388f` (700, hover and pressed), `#00235a` (800).
- Gray: 100 `#f8fafb` (page wash), 300 (secondary borders), 600 (primary borders, light body), 700 (body), 800 (headings in components), 900 `#13171b` (headings).
- Semantic: green 600 success, orange 600 warning, red 600 error. 400 variants in dark.
- Semantic tokens to design with: text heading / body / bodyLight / link / disabled; bg base / wash / neutral / accent / primary / ctaPrimary; border primary / secondary / active / focus.
- No gradients on chrome, cards, buttons, or tiles. The only gradient in the product is inside the fabric SVG band in dark mode. That is data art, not chrome.
- Dark mode is a skin over the same tokens. Design both. Backgrounds go black / gray 900 / gray 800; links go AT&T blue 000.

### Type
- ATT Aleck Sans everywhere. Weights: Regular 400, Medium 500, Bold 700. Never more than three.
- Scale (size / line height, letter spacing -0.03em on body and headings): 12/18 xs, 14/20 sm, 16/24 base, 18/26 h6, 26/34 h5, 34/42 h4, 42/50 h3, 50/58 h2, 58/66 h1.
- Tags and kickers: 12/18 or 14/20 with +0.04em, uppercase, semibold, disabled-gray color.
- Page title is h4 (34). Section headings h6 (18). Card titles base bold.

### Radius
- 9999 pills: buttons, tags, badges, search, progress bars.
- 8 inputs, dropdowns, metric cells.
- 16 cards, containers, tables.
- 24 modals, featured cards.
- Navigation tabs are square. `no-rounded`.

### Spacing
- 8px grid. 12-column layout at 1440 with 24px gutters. Card padding 16 or 24. Section gap 32.

### Components
- Primary button: cobalt 600 fill, white text, cobalt 700 hover, cobalt 800 active, 2px focus ring offset by the base color. Height 36, padding 8/16, Medium 14. No scale transform, no heavy shadow, no gradient.
- Secondary and outline: cobalt 600 text and border, cobalt 100 hover fill.
- Ghost: cobalt 100 fill.
- Tabs: flat underline, `border-b-2`, active is cobalt 600 text and border, inside a `nav` with `role=tablist`. Never a pillbox, never a segmented control.
- Inputs: height 40, radius 8, secondary border, active border on focus, 2px active ring.
- Cards: base background, 16 radius, secondary border, no drop shadow at rest, `shadow-sm` at most on hover.
- Tables: no box wrapper, no horizontal scroll, fixed layout with truncation, header row wash background with heading-color text (not muted, not uppercase). Status is a dot plus text. Resiliency is text. Policy state is a dot plus text.
- Status colors only mean status. Never decorative.
- Icons: Lucide plus the AT&T icon set (`AttIcon`). Always paired with a label.

### Accessibility
- WCAG 2.1 AA. 4.5:1 body, 3:1 large text and UI. Keyboard order follows reading order. Visible focus on every interactive element. 44px touch targets. Reduced motion honored.

---

## 9. Visual grammar and value rules

- Value on top, evidence below. Every screen opens with a plain-English verdict sentence, then the picture, then the numbers.
- Savings first. Labels lead with "save" and "savings". "Cost" only where the figure is literally spend.
- The two-second test. A customer must get the point of any chart without explanation.
- Jared's three tests for every screen: is it savings-first, does it flow without pogo-sticking, are the measurements right with the right labels.
- Few numbers at the top. Everything else on demand.
- Evidence inline, sourced. "Based on anonymized AT&T Business customer data for estates of a similar size."
- The recommendation is a starting point. Change any line and the savings re-check instantly.
- Chat narrates, canvas shows. Any advisor rail is optional. The canvas must stand alone without it.
- Control is visible on the picture. A path with inspection shows the shield. A policy that is simulated but not enforced is drawn dashed.

---

## 10. Vocabulary and copy

- Product: "AT&T AI-grade network". In a sentence: "the AI-grade network".
- Routing entity: "Connection Hub". Never "Gateway", never "Cloud Router".
- The anchor product: "AT&T-hosted VPC" for AWS and GCP, "AT&T-hosted VNet" for Azure. Never "managed gateway".
- Tiers: Start here / Recommended / Full control. CTA: "Choose this". Disclosure: "Why we recommend this".
- Term line: "36-month: $X/mo · save 50% vs on-demand".
- Arbitrage line: "$X/mo today on {cloud} · $Y/mo on the fabric · save $Z/mo".
- Stage kickers: empty "Describe the outcome. AT&T composes the connection." partial "Where this estate stands, and what closes the gaps." mature "Built for what you already run."
- Head start kicker: "Before you tell us anything".
- Policy state words: authored, simulated, enforced.
- Never: em dashes, "perhaps", "coming soon", "seamless", "leverage", adjective stacks.
- Unpriced items show no dollar figure anywhere, including totals.
- Every acronym is glossed on first use in a screen: AVPN (MPLS VPN), ADI (Dedicated Internet), ABF (Business Fiber), ASE (Switched Ethernet), LMCC (Last Mile), DX (Direct Connect), ER (ExpressRoute), TGW (Transit Gateway), NGFW (next-generation firewall), SLO (service level objective).

---

## 11. States

| Surface | Empty | Loading | Error | Populated |
|---|---|---|---|---|
| Front door | Intake card | n/a | n/a | Head start plus hero |
| Discover | "Add a cloud credential or pick an inventory to start" | Scan steps checked off one by one, each naming its source | "We could not read {source}. Nothing changed." with retry | Verdict, four KPI tiles, tree and map |
| Floor | Hero with ghost estate and four counters | Skeleton hero, geometry fixed | Same | Full hero, six rollup cards |
| Department, Connect | "Nothing to close in this layer" plus three most-chosen | Skeleton cards | Same | Findings plus level map |
| Department, Govern | "No policies yet" plus the three example policies as starting points | Skeleton table | Same | Policy table, findings |
| Department, Observe | "No telemetry yet. It starts with the first attach." | Skeleton tiles, Sankey outline | Same | Six tiles, Sankey, flow logs |
| Department, Cost | "No egress seen yet." | Skeleton rows | Same | Arbitrage breakdown, steer-to-save |
| Compose | Outcome cards unselected, summary card says "Pick an outcome to start" | n/a | Inline constraint | Summary redraws |
| Review | n/a | n/a | Approval failed, keep the proposal | Submitted, Pending Actions row |

Scan steps are theater with receipts. Each step names its source and checks off.

---

## 12. Motion

- Page transitions: fade in 300ms. No slides.
- Hero: edge draw-in on first render and after a provision (`fabric-edge-enter`), comets continuous, band breathe once on mount.
- Layer open: the band's selected state and the content swap below, 200ms. The hero geometry does not move.
- Composer: chips ghost to solid, wire doubles for dual paths, thickens for tier, shield appears for inspection, 200ms.
- Policy simulate: affected paths pulse once, then draw dashed until enforced.
- Hover: color and 1px elevation only. No scale transforms.
- Everything collapses to the static frame under reduced motion.

---

## 13. The five-minute executive demo

1. Front door, empty estate. "Before you tell us anything" counters. Enter Meridian Logistics, add a read-only AWS credential. Scan steps check off. Discover: 3 clouds, 12 regions, 322 workloads, 40 percent private. (45s)
2. The floor. The fabric picture draws with workloads on the right. Four layers on the band. Six rollup cards. Hover a region: public 41 ms, on the fabric 9 ms. (30s)
3. Click the Cloud layer, Govern tab. Finding: 11 PCI-tagged workloads reach the internet directly. Ladder. Choose Recommended: hosted VPC in us-east-1 with "private path required" enforced. Simulate: 11 paths reroute, drawn dashed. (60s)
4. Cost tab. Verdict: $X/mo of GPU inference egress the fabric would carry for $Y. Steer this bucket. The savings line lands on the summary card. (40s)
5. Switch View as to Established. The same floor, now DataFlow Systems. Observe tab: six tiles, the Sankey, flow logs with deny rows from the vSRX. Tailored offers: control add-ons per connection, term upgrades. (45s)
6. Click the AI Fabric layer. Untracked AI traffic finding. Ladder ends in the 14-day assessment. (30s)
7. Compose: "Control what leaves the cloud". AWS us-east-1 to the Internet, no direct internet path, NGFW in path. Path draws with the shield. Review order: the policy ships with it. Submit for approval. Pending Actions shows the five hosted-VPC stages. (50s)

Every click lands on a designed screen. No dead ends. Every MVP pillar appears at least once.

---

## 14. Acceptance criteria for the design

- All artboards S0 to S9 at 1440, light and dark, all four layer departments designed with all four verb tabs, all three stage presets designed, Meridian Trust at scale designed for S1 and S2.
- Every Phase-1 line in the MVP capability matrix lands on a named screen (section 17). Every Next line appears as a vision stratum or tile and nowhere else.
- Every color, type size, radius, and spacing value resolves to a Flywheel token in section 8.
- No gradient outside the fabric SVG. No pillbox tabs. No boxed tables. No horizontal scroll anywhere.
- Every product in section 5 appears somewhere: on the floor, in a department, or in Browse.
- Every finding card carries evidence. Only the three cost kinds show a dollar figure.
- Every order in S6 ships with at least one policy line and the telemetry line.
- Every screen passes the two-second test and opens with a verdict sentence.
- Gestalt QA per board: grid alignment, consistent spacing rhythm, optical symmetry, integer pixel positions, consistent radii and stroke weights, grouping that matches visual proximity.
- Layer names in the design file match the running app's aria-labels.

---

## 15. Out of scope

- A pricing engine, a checkout, or any new backend. This is a stakeholder mock that must demo end to end.
- Natural-language composition beyond the text field. Chips are the door; text can replace them later without changing the wizard contract.
- Post-delivery Govern and Observe operations beyond the Pending Actions row. The portal owns those screens; the storefront hands off to them.
- Persisting View as.
- Mobile layouts. Desktop 1440 only, responsive down to 1024.

---

## 16. References

Running apps
- AI-grade network: https://socraticstatic.github.io/ai-grade-network/ (Discover at `#/discover`; Connect at `#/naas/connect` for the hero and drill; Govern, Observe, Cost at `#/naas/govern`, `#/naas/observe`, `#/naas/cost`; `?estate=meridian` before the hash for bank scale; `/stack` for the layer concept deck)
- NetBond storefront: https://socraticstatic.github.io/NetBond_Advanced/ (`#/manage?tab=marketplace`, `?view=empty|partial|mature`, `?mode=browse`)

Code (read before designing, never re-derive)
- `~/Developer/cloud-connect/src/features/connect/FabricHero.tsx`, `edgeDrill.ts`, `EstateLevelMap.tsx`, `EdgeTrail.tsx`
- `~/Developer/cloud-connect/src/features/discover/UnifiedDiscovery.tsx`, `AttachmentMap.tsx`, `attachmentLayout.ts`, `ChainDrawer.tsx`, `DiscoveryWizard.tsx`, `EstateFilterChips.tsx`, `StackPanel.tsx`
- `~/Developer/cloud-connect/src/engine/state-rules.ts` (policies), `state-billing.ts` (arbitrage buckets), `state-managed.ts` (hosted VPC lifecycle), `state-routing.ts` (fabric model)
- `~/Developer/cloud-connect/src/features/observe/ObservePage.tsx`, `SankeyPanel.tsx`; `src/features/cost/CostPage.tsx`, `SteerToSave.tsx`; `src/features/govern/`
- `~/Developer/cloud-connect/src/components/navigation/navItems.ts` (the layers)
- `~/Developer/cloud-connect/src/features/advisor/offerCatalog.ts`
- `~/Developer/att-netbond-sdci/src/components/Marketplace.tsx` and `src/components/marketplace/*`
- `~/Developer/att-netbond-sdci/src/data/storefront/*` (estate, stage, findings, ladders, packages, head start, lifecycle, tailored, presets, catalog)
- `~/Developer/att-netbond-sdci/src/styles/tokens.css` and `tailwind.config.js` (Flywheel tokens)

Specs and source docs
- `~/Desktop/Cloud_Fabric_with_Control_MVP-v1 1.docx` (the MVP)
- `docs/superpowers/specs/2026-07-23-layer-first-ia-design.md`
- `docs/superpowers/specs/2026-07-29-observe-sankey-flowlogs-design.md`
- `docs/superpowers/specs/2026-08-10-advisor-program-roadmap.md`
- `docs/naas-brainstorm-2026-08-07-notes.md`
- `~/Developer/att-netbond-sdci/docs/superpowers/specs/2026-09-03-naas-storefront-design.md`

Figma
- NaaS mockups file `GMSruRYGS5uyQLRBk2ADMB`, page "NaaS - 1440 Mockups". Method: `docs/figma-handoff/METHOD.md`. Boards are frozen transcriptions of the running app, never generated.

Equinix
- https://docs.equinix.com/fabric/fabric-landing-dashboard
- https://docs.equinix.com/fabric-marketplace/
- https://docs.equinix.com/fabric-cloud-router/fcr-create
- https://docs.equinix.com/fabric/pricing-billing/fabricpricingtool
- https://www.equinix.com/product-solutions/connectivity/fabric
- https://newsroom.equinix.com/2026-09-02-Equinix-Unveils-Equinix-Fabric-One,-Redefining-How-Enterprises-Connect-Across-AI,-Cloud-and-Networking-Infrastructure

---

## 17. MVP traceability

Every line of Cloud_Fabric_with_Control_MVP-v1, and where it lands.

| MVP line | Phase | Screen |
|---|---|---|
| Private reach into hyperscalers, neoclouds, SaaS | 1 | S2 hero right column; neoclouds via EQX chip; SaaS as the Internet / SaaS node |
| Foundation beneath AI Fabric | 1 | S2 strata, AI Fabric on top |
| V1 Private reach to cloud, region, workload | 1 | S1 map workloads; S2 fourth column; region click descends to workloads |
| V2 Optimal path | 1 | S2 performance card, reliability dot, route preview; S3 Cost tab |
| V3 Policy control via tags | 1 | S3 Govern tab; S4 control step; S6 "Ships with this order" |
| V4 Cost control, arbitrage | 1 | S3 Cost tab; two priced findings; S4 savings line |
| V5 Observability | 1 | S3 Observe tab; S6 telemetry line |
| U1 Ingress site to cloud with control | 1 | S4 "Reach a cloud privately" |
| U2 Egress cloud to Internet or WAN with control | 1 | S4 "Control what leaves the cloud" |
| U3 Optimal cloud to cloud | 1 | S4 "Join two clouds on the best path"; S2 arcs |
| SaaS control, cloud to neocloud native | Next | Vision strata |
| Spine Discover, Attach, Govern, Observe | 1 | Section 4.1 |
| A. AWS / Azure / GCP discovery: regions, VPC/VNet, subnets, gateways, endpoints, workloads | 1 | S1 scan steps and tree |
| A. Topology and dependency map | 1 | S1 map, chain drawer |
| A. Continuous discovery, neocloud asset discovery | Next | Vision |
| B. AT&T-hosted VPC/VNet per region | 1 | Section 5 anchor product; S3 catalog lead; S5 packages; S6 five stages; S8 station track |
| B. Customer L3 attach into hosted VPC/VNet | 1 | Section 5; S4 |
| B. Multi-region, multi-cloud routing | 1 | S4 U3; cross-cloud ladder |
| B. Neocloud L3 reach via Equinix Fabric | 1 | Section 5; EQX chip; cross-cloud ladder Full control |
| B. Intent-driven auto path optimization | Next | Vision; the composer is the door |
| C. IP, Encrypted IP, PrivateLink, cloud-native, DX / ER / Interconnect | 1 | Section 5 attach types; S4 |
| C. SD-WAN auto-onboarding | Next | Vision |
| D. ADI, ABF, AVPN; mobility; internet | 1 | Transport layer; S2 first-mile sub-lines |
| D. Satellite | Next | Vision |
| E. Tag, region, workload policies; allow-deny, segmentation, steering; cost-aware routing | 1 | S3 Govern tab; S4 control chips; three policy findings |
| E. Example policies (PCI, Internet-facing, Finance) | 1 | S3 Govern starting points, verbatim |
| E. Intent-based, app-aware policies | Next | Vision |
| F. NGFW (Palo Alto) in path | 1 | Uninspected ladder; S4 inspection; S2 shield mark |
| F. Check Point, Fortinet; SSE / DLP | Next | Vision (SASE and Fortinet moved out of live) |
| G. Path viz, throughput, latency, loss | 1 | S3 Observe six tiles; S2 hero |
| G. Traffic and policy analytics | 1 | S3 Observe Sankey and flow logs |
| G. Cost analytics per path and workload | 1 | S3 Cost breakdown per bucket |
| G. AI-driven RCA | Next | Vision |
| H. Ingress, egress, cross-cloud cost visibility | 1 | S3 Cost verdict and breakdown |
| H. Path cost comparison and savings recommendations | 1 | S3 Cost steer-to-save; avoidable egress finding |
| H. Arbitrage hyperscaler vs AT&T | 1 | S3 Cost table columns |
| H. Automated re-routing; FinOps integration | Next | Vision |
| Metric: assets discovered, regions attached, attach rate | 1 | S1 tiles; S2 Discovered and Attached cards |
| Metric: tag policies deployed and enforced | 1 | S2 Governed card |
| Metric: percent traffic and path coverage | 1 | S2 Observed card |
| Metric: dollars egress and cross-cloud savings identified | 1 | S2 Saved card |
| Metric: attach rate on NetBond / AVPN base | 1 | S2 Fabric attach card |
