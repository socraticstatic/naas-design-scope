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
