# Local patches on top of the Claude Design export

Applied 2026-09-08. Each one is small and lives in the export files, so a
fresh export from Claude Design will drop it unless the change was also made
there. Re-apply after `rsync` if the symptom returns.

## 1. Template wrap (console noise)
`NaaS Storefront.dc.html`, `Elevator Boards.dc.html`: the `<x-dc>` body is
wrapped in `<template>…</template>`, followed by a one-line inline script that
moves the template content back into `<x-dc>` and sets `window.__resources`.
Without it the browser parses every `{{ }}` SVG attribute on load and logs
about 90 errors per page; inert template content parses silently. Setting
`__resources` stops the runtime from re-fetching the raw file, which would
otherwise re-introduce the wrapper into the template string.

## 2. Header icon props (root 404s)
Header buttons used `url('{{ iconDir }}/search.svg')`; the placeholder render
resolves that to `/search.svg` and 404s at the site root. Replaced with
`{{ iconSearch }}`, `{{ iconBell }}`, `{{ iconPerson }}`, `{{ iconGear }}`
(`{{ iconQuestion }}` on the boards page) and added those props next to
`storeIcon` in `naas-app.js` and in the boards page return.

## 3. Pending Actions bar (Go live unreachable at 1280)
`section[aria-label="Pending actions"]`: columns `220px minmax(0,1fr) auto`
and the stage `<ol>` gets `flex-wrap:wrap;row-gap:6px;min-width:0`. The
`1fr` column could not shrink below the five nowrap stages, so the buttons
were pushed under the Andi panel.

## 4. By tag group line (`naas-app.js` tagTree)
Pluralises regions and clouds and counts workloads from the detailed VPC
objects, which carry their count under a different field than the rollups.

## 5. AI Fabric UI shell (2026-09-08, afternoon)
Header, rail and page header row replaced with the shell drawn on the Figma
"AI Fabric UI" page (main-header 114:2195, nav items 114:2210): stacked
wordmark (still opens the layer elevator), two flat product pills, outlined
Ask Andi with the real Andi symbol (`brand/andi-symbol.svg`), bell, LG avatar
(the demo controls live behind it), a 240px grouped text rail (Connect ·
Observe · Deep dive · Govern for NaaS; their AI Fabric groups), and a title
row with "Updated" and the date range above every screen. Everything below
the title row is the export's own content. Props live in `shellVals` in
`naas-app.js` (`pills`, `railGroups`, `pageTitle`, `rangeValue`, `setRange`). The build stamp prints in the title row (`buildLabel`); `<body data-version-pill="off">` tells version.js not to float its pill over content.
Andi docks at 1440 and wider, floats below. The rail collapses to a 64px icon strip from the toggle at its foot; labels stay as tooltips. It starts collapsed under 1600 wide, since the screens were drawn for a 64px rail beside the docked Andi. The frame title row hides on screens that carry their own heading.

## 6. Connect lens labels (export defect)
The lens value on each region wire (private, 12 ms, $0.02/GB) was anchored
to the wire's end and drew over the on-ramp chip and shield in the export
itself. It now ends 8px left of the chip (`heroEdges` map in the storefront's
inline script).

## 7. Filter grammar, Compose wrap, sites drill (2026-09-08, afternoon)
- Every filter row uses the AI Fabric UI control grammar (Figma filters-bar
  114:1427): inline label, 36px select with chevron, 272px search field,
  outlined button. `.fx-*` classes in the storefront's helmet style.
  Explore 360 facets, Observe scope, Marketplace search/sort/filters.
- Compose: outcome and option cards and the summary rows wrap instead of
  clipping (nowrap removed).
- Explore 360 "Your sites" drills class → metro → site (`naas-sites.js`),
  mirroring the cloud tree's rows, stat tiles, badges, Control and Ask Andi
  doors, with a breadcrumb over the drilled path. Open state in `s.siteOpen`.

## 8. AI Overlay requirements on the storefront (2026-09-08, evening)
The seven CSV requirements that were missing or partial, drawn in the AI
Fabric UI patterns (table-horizontal-bar-chart 114:1719, Alert 114:2625,
Badge pill). Styles are the `.fx-card / .fx-row / .fx-alert / .fx-badge /
.fx-chip` block in the storefront's helmet style.
- AO-363 Utilization: seventh Observe KPI and a "Utilization by connection"
  bar card under the Sankey. Each attached region is sized in 10 Gbps ports
  (`utilRows` in `naas-addendum.js`); over 80% draws orange.
- AO-350 Managed chip: every VPC row carries "AT&T-managed" (the first VPC in
  an attached region) or "Customer-managed" (`managed` in the addendum).
- AO-353 / AO-354 Labels: dashed auto-label chips on VPC rows (cloud, region,
  type, on-ramp) and site rows (state, metro, access); "+ Label" opens an
  inline input, Enter or Add commits, × removes. Labels live in `s.labels`
  and join the By tag groups (`labelKit` in `naas-app.js`).
- AO-360 AT&T charges: Cost card from catalog prices × what is attached
  (on-ramps, hosted VPC/VNet, L3 attach), with the savings it carries.
- AO-359 Egress by site class: Cost card splitting the egress base across
  site classes, on-fabric share as its own series; "Drill sites" opens
  Explore 360.
- AO-362 New since window: every VPC, workload and site carries a seeded
  `since` day. Explore 360 opens with the Figma Alert strip (count, unlabeled,
  exposed), a "Since" window select that shares `obWindow` with the title
  row, "Review new" filters the trees to the window and expands them, and
  "New · n days ago" badges sit on new rows.
Also fixed here: a stray `</div>` at the end of the Explore 360 section
(left by patch 7) closed `<main>` at parse time, so every later screen
(Observe, Cost, Compose, Marketplace) rendered outside the content column.

## 9. Enhance pass (2026-09-08, evening)
- Every new row is a door: utilization rows open Andi scoped to the region,
  or Compose prefilled for a region over 80% ("Add a port →"); site-class
  rows on Cost open Explore 360 with that class expanded (`composeFor` and
  the `go('s1', { siteOpen })` door in `naas-app.js`).
- Act-on-it strips (Figma Alert) under the Observe KPIs (hot ports, blind
  regions, one CTA) and above the Cost arbitrage (public first mile, the
  largest attach on the table).
- AT&T charges ends on "Net saving after charges" (egress savings minus
  catalog charges).
- Discover heading carries a "n new · window" pill that toggles the
  new-only view.

## 10. Observe rebuilt: Sankey, scope bar, Insights (2026-09-08, evening)
- Sankey (`sankey3` in `naas-addendum.js`): sources grouped under headers
  (Sites · first mile, Cloud workloads by tag, Cloud to cloud), every node at
  least 16px tall so labels can never collide, labels on pills with the Gbps
  value, destinations headed, and the picture grows in height instead of
  squeezing. Site traffic is seeded per class (data center 6 Gbps, campus
  2.5, branch 0.04 ...) and lands on a "Cloud regions (from sites)"
  destination. Every node is a door: site class → Explore 360 with the class
  open, tag → By tag, region → Ask Andi, destination → flow logs.
- Scope row is one Figma filter bar: Scope select, Live, View logs. The
  duplicate "Whole estate" heading is gone.
- Insights are six bar-list cards (`insightWidgets` in `naas-round2.js`,
  doors in `iwVals`): Top talkers from the same per-region flows as the
  Sankey; New destinations in the window by GB/day; Shadow SaaS by GB/day,
  orange where no policy matches; Egress growth as twelve weekly columns
  (fabric under public); Cloud-to-cloud paths; Latency over SLO. Rows open
  Andi, Govern authoring, or steer the flow; the old gauges with hardcoded
  27/61/18/84 are gone since the Utilization card carries the real numbers.
- SVG `<text>` inside an `sc-for` does not render in this runtime; headers
  use `foreignObject` like the labels.

## 11. Audit moves 1–3: one navigation, hero collapse, one grammar (2026-09-09)
- The CONNECT/OBSERVE/GOVERN/COST band under the hero is gone; its verdict is
  the title row's subtitle (`pageSub`). A recognized estate opens on the
  Floor (`init`), so there is one home. The Floor's own band is gone too.
- The fabric picture opens on Home and Fabric only. Elsewhere a one-line
  strip ("16 of 18 regions on the fabric · …") with "Show the fabric";
  the choice is remembered per screen in `localStorage` (`naas.hero`).
- Naming: Observe tab Control → Logs; Discover heading → Explore 360;
  Explore 360 leads the Connect group in the rail.
- Fabric no longer embeds the Explore 360 tree or the catalog; two doors
  instead. The catalog block is gone from AI Fabric too. Marketplace's dead
  "Vision strata" chips are gone. AI Observe's in-page tabs are gone (the
  rail selects the section) and its Insights window reads the title row.
- Andi docks only on data screens; the rail expands whenever Andi is not
  docked. Title row is 26px everywhere; export section heads are 18px.
  "Updated …" is live and its glyph re-reads the estate. Every button in the
  content column has the kit's 8px radius (pills stay for chips).
- Observe KPI tiles use the Figma KPI card content (label, trend badge,
  36→32px value) and open the matching tab; AI tiles match. Cost carries
  the same Scope bar as Traffic and reads the scoped estate; the AI
  Providers panel uses the search and select from the filter grammar.

## 12. Audit move 4: empty states and the broken layouts (2026-09-09)
- Discover: the scanning state is the finished layout's skeleton with one
  progress line ("Reading AT&T access records · 2 of 4"); the tick row, the
  COLLAPSED VIEW label and the bottom Home button are gone; clouds carry the
  same section header as sites; site crumbs show only once drilled.
- Review: empty order shows "Nothing in this order yet" with doors to
  Compose and the catalog; Submit is not shown without lines.
- Compose: a default is not a choice (`resiliencyChosen`); the summary row
  reads "Standard (default)" and the timeline waits for lines.
- Floor: tailored tables render only with rows. Recommend: "Recommended for
  your estate", four findings, tiles wrap. Front door: the fact strip wraps
  in its columns. Product: the stage rail has its column; cards wrap.
- Tables: the HTML parser foster-parents `<sc-for>` out of `<table>` (in the
  runtime's own `compileTemplate` too), so no table in the export ever
  rendered its rows in a browser; the raw `<tr>` printed once with unresolved
  values (the "/mo · /mo" row). All 13 tables are CSS tables now
  (`.dt/.dt-h/.dt-b/.dt-r/.dt-c`), and every one has rows.

## 13. Audit close-out: scope everywhere, Cost cards, one palette (2026-09-09)
- Fabric and Policies carry the same Scope bar as Traffic and Cost. Fabric's
  lens comparison reads the scoped estate; policies filter to the scope
  unless they apply to any cloud.
- Cost's Egress by destination, 90-day forecast and Committed vs metered
  are kit cards (`.fx-card`) with a title and one-line sub.
- One state palette: on Traffic the hero's wires are fabric blue and public
  grey like the Sankey; a red sleeve marks a path over 100 ms; the legend
  says so. "Hide the fabric" sits in the legend row, not over the picture.
- Observe tile "On the AT&T fabric" → "On fabric" so no label wraps past two
  lines at 128px.

## 14. Gestalt pass on widget heads (2026-09-09)
- No widget head wraps. Card titles and subs are one line with the full
  text on hover; sub copy was cut to fit its card ("6 new, by volume",
  "2 with no policy · 5.5 GB/day", "$32,200/mo · carries $61,400/mo of
  savings").
- Traffic KPI tiles use a compact variant (`.fx-kpi.sm`): 12px label on one
  line, 26px value, trend badge and "vs 30d" on one sub line. Labels are
  sentence case (P95 latency, Packet loss, Egress spend, On fabric).
- Floor rollup tiles share four fixed rows (label, value, one-line sub, bar
  slot) so the six values sit on one baseline; every tile has a sub, and
  tiles without a bar keep the slot.
- Front-door fact labels fit their column ("metros with on-ramps");
  Compose outcome titles reserve two lines so the three cards align.
