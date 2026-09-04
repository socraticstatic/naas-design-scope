# NetBond and the AI-grade network: the layer elevator. Brief for Claude Design

Date: 2026-09-04
Status: design brief, approved direction
Owner: Micah Boswell, Experience Lead, DNI
Asked by: Ramesh Prabagaran, owner of Cloud_Fabric_with_Control_MVP-v1
Design spec this brief draws from: `2026-09-04-netbond-layer-elevator-design.md`
Sibling brief: `2026-09-03-naas-guided-storefront-requirements.md` (the store). Its section 8, Flywheel compliance, applies here verbatim. Do not restate it. Do not deviate from it.

---

## 0. How to use this document in Claude Design

Paste this whole file as the brief. Then ask for the artboards in section 9, in order, at 1440 wide, light first, dark second. Every artboard is a screen a customer could land on. The two apps are already designed; this brief adds one control, three banners, four cross-links, and one card. Draw only what is new, on top of the existing screens.

Three rules override anything Claude Design would do by default:

1. Nothing in NetBond moves below the header. The wizard, Connections, Pools, Insights, Configure stay exactly as drawn in the NetBond file.
2. The elevator is the only new chrome. One control, same anatomy in both apps. If a second control seems needed, stop and ask.
3. The name on the lockup is the layer you are standing on. Every copy decision follows from that sentence.

---

## 1. What this is

NetBond Advanced is the Cloud layer of the AT&T AI-grade network. Ramesh asked for the AI-grade network to be integrated into NetBond. This brief does that without merging the two portals.

NetBond keeps its name and its screens. Its brand lockup becomes a menu of the four network layers. Pick another layer and you ride to the AI-grade network at that layer, with your tenant and session. Pick Cloud and you are back in NetBond. Three data bridges make the two apps read as one product: NetBond connections draw as the on-ramps in the fabric picture, NetBond's supply figures feed the store's head start, and the advisor's findings open NetBond's Create wizard pre-filled, then the order flows back.

This is not a product switcher. A switcher moves between two apps. An elevator moves between floors of one building.

---

## 2. The one metaphor

The network stack has four layers. Each layer is a floor. NetBond is the Cloud floor. The lockup is the elevator button. The menu is the floor list. The subtitle under the wordmark is the floor indicator.

Do not add a second metaphor. No "portal", no "workspace", no "app switcher", no waffle grid.

---

## 3. The four layers

Elevation order, top to bottom. AI Fabric rides on the network, so it draws on top.

| Layer | Tagline | Host app | Status |
|---|---|---|---|
| AI Fabric | The token layer | AI-grade network | Live |
| Cloud | The on-ramp layer, with control | NetBond Advanced | Live |
| Network services | The services layer | AI-grade network | Live |
| Transport and access | The physical layer | none yet | Vision |

Transport and access has no screens. It is a dimmed row with the kicker "Vision". It never links anywhere.

---

## 4. The elevator, specified

### 4.1 Resting state, NetBond header

The existing NetBond header, 64 high, with one change: the lockup gains a chevron and a subtitle line. Nothing else in the header moves.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  AT&T NetBond® Advanced ⌄        Create    Manage    Monitor    Configure    🔍  ?  🔔  ⦿ │
│  Cloud on-ramp layer                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- Wordmark: "AT&T" in AT&T blue `#009fdb`, "NetBond® Advanced" in gray 900, both 16 bold, letter spacing -0.03em. Unchanged from today.
- Chevron: 12px, gray 600, 6px after the wordmark. Rotates 180 when open.
- Subtitle: "Cloud on-ramp layer", 11 Regular, gray 600, letter spacing 0, baseline 14 below the wordmark baseline. The subtitle sits inside the 64px header; the wordmark shifts up 6px to make room.
- The whole lockup is one button. Hit area is the two lines plus 8px padding. Hover: wordmark unchanged, chevron goes gray 800. No underline, no background.
- Focus: the standard 2px cobalt ring, radius 8.

### 4.2 Resting state, AI-grade header

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  AT&T AI-grade network ⌄    Discover │ Network services   AI Fabric      🔍  ✓3  🔔  ⦿ │
│  Network services layer                                                                │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- Same anatomy. Subtitle reads the active top tab: "Network services layer" or "AI Fabric layer". On Discover, Tasks, and any page outside a layer, the subtitle reads "All layers".
- The top tab "NaaS" is relabeled "Network services". Its tagline "The network layer" becomes "The services layer". Nothing else in that nav changes.

### 4.3 Open state

The menu drops from the lockup's left edge. Width 320. Radius 16. Base background, secondary border, `shadow-sm`. 8px below the header. Opens in 150ms, fade plus 4px rise. Closes instantly.

```
  AT&T NetBond® Advanced ⌃
  Cloud on-ramp layer
┌────────────────────────────────────────────┐
│  AT&T AI-GRADE NETWORK · LAYERS             │  ← kicker, 12/18 +0.04em uppercase, gray 600
├────────────────────────────────────────────┤
│  ▲  AI Fabric                               │
│     The token layer                         │
│                                             │
│  ✓  Cloud · NetBond Advanced                │  ← current row: cobalt 100 fill, cobalt 600 check
│     The on-ramp layer, with control         │
│                                             │
│  ≡  Network services                        │
│     The services layer                      │
│                                             │
│  ▽  Transport and access          VISION    │  ← dimmed to 40%, kicker right-aligned, no hover
│     The physical layer                      │
├────────────────────────────────────────────┤
│  Discover your estate                    →  │  ← link rows, 14 Medium, cobalt 600
│  See the whole stack                     →  │
└────────────────────────────────────────────┘
```

- Rows are 48 high, padding 12/16. Layer name 14 Medium gray 900. Tagline 12 Regular gray 600. The icon column is 20 wide, an AT&T icon per layer, never Lucide: `ai` for AI Fabric, `cloud` for Cloud, `network` for Network services, `fiber` for Transport and access. If an icon is missing from the 26, take it from the full set and say so.
- The current row carries the check in place of its icon and a cobalt 100 fill. Clicking it goes to that layer's home.
- Hover on a live row: gray 100 fill. Hover on the Vision row: nothing.
- `role="menu"`, `aria-label="Switch network layer"`. Arrow keys move, Enter selects, Escape closes, focus returns to the lockup.

In the AI-grade app the menu is identical. The check sits on Network services or AI Fabric, the Cloud row reads "Cloud · NetBond Advanced" and is the only row that leaves the app.

### 4.4 Mobile

The drawer's brand row becomes the same list, inline, above the nav items. No dropdown on mobile. The subtitle line stays under the wordmark.

```
┌──────────────────────────────┐
│ AT&T NetBond® Advanced    ✕  │
│ Cloud on-ramp layer          │
├──────────────────────────────┤
│ LAYERS                       │
│ ▲ AI Fabric                  │
│ ✓ Cloud · NetBond Advanced   │
│ ≡ Network services           │
│ ▽ Transport and access VISION│
├──────────────────────────────┤
│ Create                       │
│ Manage                       │
│ Monitor                      │
│ Configure                    │
└──────────────────────────────┘
```

### 4.5 Same-verb landing

A hop lands on the same lifecycle verb in the other app when one exists. The menu does not show this. It is what happens.

| From NetBond | Lands on |
|---|---|
| Create | Network services · Connect |
| Manage, Connections | Network services · Connect |
| Manage, Pools | Network services · Govern |
| Manage, Insights | Network services · Observe |
| Monitor | Network services · Observe |
| Configure | Network services · Govern |
| Configure, Billing | Network services · Cost |
| anywhere else | the layer's Home |

From the AI-grade app, every Cloud hop lands on NetBond Manage.

### 4.6 Arrival

The first paint after a hop shows the destination with the tenant already set. No interstitial, no "switching" toast, no spinner. If the tenant was handed over, the existing "Viewing as {tenant}" banner shows as it does after a tenant switch today.

---

## 5. The three bridges, as the customer sees them

### 5.1 Bridge A: NetBond connections are the on-ramps

In the fabric hero on Network services · Connect, every active NetBond connection draws as an on-ramp chip on its fabric-to-region edge. AWS Last Mile connections draw as "NetBond Adv" with the sub-line "Max resiliency · 4 paths". Provisioning connections draw as planned: dashed edge, chip at 60 percent.

Chips that come from NetBond are links. Hover: cobalt 700 text, the edge lights. Click: NetBond connection detail for that connection.

```
   Sites            AT&T fabric              Clouds
   ─────            ───────────              ──────
   ◯ Dallas HQ ───┐                      ┌── ● us-east-1  AWS
                  │  ┌───────────┐       │       [NetBond · PE-IAD-02]   ← chip, link
   ◯ Austin ──────┼──┤  AT&T     ├───────┤
                  │  │  fabric   │  ╌╌╌╌╌┼╌╌ ◌ us-west-2  AWS
   ◯ Chicago ─────┘  └───────────┘       │       [NetBond Adv · planned]  ← dashed, 60%
                                         └── ● westus2  Azure
                                                 [ExpressRoute · CH1]     ← seeded, inert
```

Nothing else in the hero changes. The band's internals list on-ramps grouped by facility exactly as today; NetBond-sourced on-ramps are simply present in that list.

### 5.2 Bridge B: two head starts

The store's front door (S0 in the sibling brief) and the advisor's head-start card show two bands, stacked, same card shape.

```
┌──────────────────────────────────────────────────────────────────┐
│  BEFORE YOU TELL US ANYTHING                                      │
│                                                                   │
│  What AT&T has                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │   14     │ │   11     │ │    2     │ │    10    │              │
│  │ Metros   │ │ Clouds & │ │ Last Mile│ │ Connection│             │
│  │ with AT&T│ │ colos    │ │ metros   │ │ types    │              │
│  │ on-ramps │ │ reachable│ │ live     │ │ orderable│              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                   │
│  What AT&T sees of you                                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                           │
│  │   312    │ │   41%    │ │    2     │                           │
│  │ Sites    │ │ Already  │ │ Clouds   │                           │
│  │          │ │ on-net   │ │ visible  │                           │
│  └──────────┘ └──────────┘ └──────────┘                           │
└──────────────────────────────────────────────────────────────────┘
```

- Both bands use the counter tile from the NetBond storefront: value 26 bold, label 12 gray 600, whole tile a link. The wireframe abbreviates the labels. Use NetBond's verbatim: "Metros with AT&T on-ramps", "Cloud and colo providers reachable", "Last Mile metros live today", "Connection types orderable now".
- "What AT&T has" counters open NetBond: the first, second, and fourth open Create, the third opens Create with Last Mile pre-chosen.
- "What AT&T sees of you" counters open Discover.
- Band labels are 14 Medium gray 800. The kicker is the existing one.
- When the estate is empty, the second band shows one tile: "Nothing yet. Add a credential or your NetBond inventory."

### 5.3 Bridge C: a finding becomes an order

The advisor's finding card is unchanged. Its ladder tiers "NetBond attach" and "NetBond Adv" now open NetBond Create pre-filled. The wizard shows one new banner above the stepper.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  RECOMMENDED BY YOUR ADVISOR                                         Why →   │
│  Save $50,400/mo by attaching 8 unattached regions                           │
│  Site to Cloud · AWS · Geo-diverse · Ashburn · 10 Gbps, ready to review.     │
└──────────────────────────────────────────────────────────────────────────────┘

  ① Connection Type   ② Choose Provider   ③ Connection Profile   ④ Terms   ⑤ Review
  ────────────────────────────────────────────────────────────────────────────
```

- Banner: cobalt 100 fill, no border, radius 16, padding 16/24, full width of the wizard column. Kicker 12/18 uppercase +0.04em cobalt 700. Headline 16 bold gray 900. Detail line 14 Regular gray 700, the pre-filled choices joined by middle dots, then "ready to review." "Why" is a 14 Medium cobalt 600 link, right-aligned, back to the finding.
- The headline is the finding's savings line, verbatim. Save, not cost.
- The banner persists through every step and on Review. It never blocks Next. It has no dismiss.
- Pre-filled steps show their choice selected exactly as if the user had clicked it. No "pre-filled" badge on the choice itself. The banner is the only signal.
- The stepper starts at Connection Type, as it does when a type is already known.

After submit, three things change in the AI-grade app on the next visit, no action needed:

- The finding card gains a status chip "Ordered", green dot plus text, in the card's kicker row. Its ladder collapses to one line: "NetBond attach · ordered today".
- The fabric hero draws the new on-ramp as planned.
- Observe's "Under control" tile moves when the connection goes Active.

---

## 6. Cross-links on NetBond surfaces

Three additions. None is a new page.

### 6.1 Connection detail, header overflow

Two new items at the foot of the existing overflow menu, after a hairline.

```
  ⋯
  ┌────────────────────────────┐
  │ Edit connection            │
  │ Duplicate                  │
  │ Move to pool               │
  ├────────────────────────────┤
  │ Observe on the fabric   ↗  │
  │ Govern this path        ↗  │
  ├────────────────────────────┤
  │ Delete                     │
  └────────────────────────────┘
```

- 14 Regular gray 800, the external-link arrow 12px gray 600 right-aligned. Hidden when the connection is Inactive, Deleting, or Deleted.
- "Observe on the fabric" opens Network services · Observe scoped to this on-ramp. "Govern this path" opens Network services · Govern scoped the same way.

### 6.2 Manage, Insights tab: one card

One `MetricCard` in the existing widget grid, top left position by default.

```
┌──────────────────────────────┐
│ UNDER AT&T CONTROL           │
│                              │
│ 41%                          │
│ 19 of 46 flows on a          │
│ controlled path              │
│                              │
│ See the paths            →   │
└──────────────────────────────┘
```

- Same card as every other metric card. Value 34 bold. Evidence line 14 gray 700 with an honest denominator. Link 14 Medium cobalt 600 to Network services · Observe.
- Below 50 percent the value is orange 600. At or above, gray 900. Never green. Status colors mean status.
- When no figure has arrived yet: value "—", evidence "Open Observe to see your paths", same link.

### 6.3 Monitor: one row

One row above the fold, under the page header, full width.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⓘ  Fabric telemetry lives one layer up.      Open Network services · Observe →   ✕  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Wash fill, secondary border, radius 16, 48 high. Text 14 gray 800. Link 14 Medium cobalt 600. Dismiss returns for the session only.

---

## 7. Cross-links on AI-grade surfaces

- Fabric hero: NetBond on-ramp chips are links (5.1).
- Stack panel and the stack deck: the Cloud stratum's link reads "Cloud attach lives in NetBond Advanced" and opens NetBond Create. Today it reads "Cloud attach lives in NaaS · Connect today" and stays in-app. Same link style.
- Advisor ladders: tiers that name NetBond open NetBond Create pre-filled (5.3).
- Observe, Flows & paths: a row whose path names a NetBond on-ramp shows the on-ramp as a link to its NetBond connection. Same cell, link color.

---

## 8. One store, two departments

- The AI-grade front door is the store. Four departments, one per layer.
- NetBond's Marketplace tab becomes the Cloud department. Everything on it stays. Its Browse mode lists Cloud-layer products only.
- The Marketplace tab gains one row at the top, same shape as 6.3:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ▦  This is the Cloud layer of the AT&T store.                 See all layers →   │
└──────────────────────────────────────────────────────────────────────────────┘
```

- A finding renders in the department that owns its remedy. Cloud: single path, unprotected, unmonitored, not in a hub, month to month. Fabric: unattached regions, public egress, missing inspection, latency over SLO. Same card shape everywhere.

---

## 9. Screens (the artboards)

Canvas 1440 wide. Aleck Sans. Light and dark. Layer names in the design file match the aria-labels of the running apps so a freeze can be pixel-diffed later.

| Board | App | Screen | What is new on it |
|---|---|---|---|
| E0 | NetBond | Manage, Connections | Lockup with chevron and subtitle. Nothing else. |
| E1 | NetBond | Manage, elevator open | The menu of 4.3 over E0. Check on Cloud. |
| E2 | AI-grade | Network services · Observe | Lockup with subtitle. Sankey band rows naming "NetBond · PE-IAD-02" linked. |
| E3 | AI-grade | Network services · Connect | Fabric hero with NetBond chips as links, one planned NetBond Adv chip. |
| E4 | AI-grade | Discover, advisor | Two-band head start (5.2). Finding card with the three-tier ladder. |
| E5 | NetBond | Create, step 1 | Advisor banner above the stepper (5.3). Type pre-selected. |
| E6 | NetBond | Create, Review | Banner persists. Order summary as today. |
| E7 | AI-grade | Discover, advisor | Same finding card, now "Ordered". Ladder collapsed to one line. |
| E8 | NetBond | Manage, Insights | "Under AT&T control" card in the grid (6.2). |
| E9 | NetBond | Connection detail, overflow open | The two fabric links (6.1). |
| E10 | NetBond | Monitor | The telemetry row (6.3). |
| E11 | NetBond | Manage, Marketplace | The Cloud-layer row (section 8). |
| E12 | AI-grade | Elevator open | The menu over E2. Check on Network services. Cloud row reads "Cloud · NetBond Advanced". |
| E13 | both | Mobile drawer, 390 wide | The inline layer list (4.4), one board per app. |

E0 to E7 are the demo walk in order. E8 to E13 are the supporting surfaces.

---

## 10. The demo walk

Seven steps, one tenant, no reload that loses state. Ramesh judges this.

1. **E0.** Land in NetBond Manage as the Meridian estate. Connections, Pools, Insights as today. The lockup reads "Cloud on-ramp layer".
2. **E1.** Open the lockup. Four layers. The check is on Cloud. Say the sentence: the name on the lockup is the layer you are standing on.
3. **E2.** Ride to Network services. Observe. The Sankey's AT&T band carries flows over "NetBond · PE-IAD-02". Those are the connections from step 1.
4. **E4.** Discover your estate. The advisor scans, then finds "Save $50,400/mo by attaching 8 unattached regions". The ladder offers Steer on the AT&T fabric, NetBond attach, NetBond Adv.
5. **E5, E6.** Choose NetBond attach. The elevator drops you into NetBond Create, pre-filled, with the advisor's banner. Walk to Review. Submit.
6. **E3, E7.** Ride back up. The new on-ramp draws as planned on the fabric picture. The finding reads Ordered.
7. **E8.** Open Manage, Insights. "Under AT&T control" shows the figure Observe showed. One building, one number.

---

## 11. Copy, verbatim

| Where | Copy |
|---|---|
| NetBond subtitle | Cloud on-ramp layer |
| AI-grade subtitle, Network services | Network services layer |
| AI-grade subtitle, AI Fabric | AI Fabric layer |
| AI-grade subtitle, outside a layer | All layers |
| Menu kicker | AT&T AI-grade network · layers |
| Row 1 | AI Fabric / The token layer |
| Row 2 | Cloud · NetBond Advanced / The on-ramp layer, with control |
| Row 3 | Network services / The services layer |
| Row 4 | Transport and access / The physical layer / VISION |
| Footer 1 | Discover your estate |
| Footer 2 | See the whole stack |
| Banner kicker | Recommended by your advisor |
| Banner link | Why |
| Banner detail suffix | , ready to review. |
| Ordered chip | Ordered |
| Ordered ladder line | NetBond attach · ordered today |
| Overflow 1 | Observe on the fabric |
| Overflow 2 | Govern this path |
| Insights card title | Under AT&T control |
| Insights card evidence | N of M flows on a controlled path |
| Insights card empty | Open Observe to see your paths |
| Insights card link | See the paths |
| Monitor row | Fabric telemetry lives one layer up. / Open Network services · Observe |
| Marketplace row | This is the Cloud layer of the AT&T store. / See all layers |
| Stack link | Cloud attach lives in NetBond Advanced |

Rules: "NetBond® Advanced" with the mark only in the lockup. "NetBond Advanced" without the mark everywhere else. "AI-grade network" is the building, never a tile or a tier. Never "Cloud Connect", "Gateway", "Cloud Router", "portal", "switch app". Save, not cost.

---

## 12. States

- Elevator: rest, hover, focus, open, current row, live row hover, Vision row (no hover), keyboard focus on a row.
- Subtitle: the four values in section 11.
- Advisor banner: with headline, and with a finding that has no savings figure (headline is the finding's count line, e.g. "8 regions reach AWS over the public internet").
- Insights card: figure present, figure absent, under 50 percent.
- Fabric chip: seeded (inert), NetBond active (link), NetBond planned (dashed, 60 percent).
- Finding card: open, Ordered.
- Monitor and Marketplace rows: shown, dismissed.

---

## 13. Motion

- Menu open: 150ms fade plus 4px rise. Close: instant. Chevron rotates with the menu.
- A hop is a page load. No transition is designed for it.
- Banner: none. It is present at first paint.
- Ordered chip: none. Present at first paint on the next visit.
- Fabric: the planned on-ramp uses the existing `fabric-edge-enter` draw-in.
- Everything collapses to the static frame under reduced motion.

---

## 14. Acceptance criteria for the design

- All boards E0 to E13 at 1440, light and dark. E13 at 390.
- The resting header of each app differs from today by the chevron and the subtitle only. Overlay the current board to check.
- The menu anatomy is identical in both apps. Overlay E1 on E12 to check; only the check position and the Cloud row label differ.
- Every color, type size, radius, and spacing value resolves to a Flywheel token in section 8 of the sibling brief.
- No pillbox, no segmented control, no waffle icon, no app-switcher grid.
- "NetBond Advanced" appears on AI-grade boards only in the Cloud row, ladder tiers, the stack link, and on-ramp chips.
- Every finding card carries evidence. Only the savings headline shows a dollar.
- Gestalt QA per board: grid alignment, consistent spacing rhythm, optical symmetry, integer pixel positions, consistent radii and stroke weights, grouping that matches visual proximity.
- Layer names in the design file match the running apps' aria-labels.

---

## 15. Out of scope

Pricing engine, checkout, any backend, real telemetry, Angular parity, a unified RBAC, a shared component package, the Transport and access layer's screens, any change to NetBond below the header beyond sections 5.3, 6, and 8.

---

## 16. References

- Design spec: `docs/superpowers/specs/2026-09-04-netbond-layer-elevator-design.md`
- The store brief: `docs/superpowers/specs/2026-09-03-naas-guided-storefront-requirements.md`, section 8 for every token
- Layer-first IA: `docs/superpowers/specs/2026-07-23-layer-first-ia-design.md`
- NetBond header: `~/Developer/att-netbond-sdci/src/components/navigation/MainNav.tsx`
- AI-grade header and layers: `~/Developer/cloud-connect/src/components/navigation/MainNav.tsx`, `navItems.ts`
- Fabric hero: `~/Developer/cloud-connect/src/features/connect/FabricHero.tsx`
- Advisor ladders: `~/Developer/cloud-connect/src/features/advisor/offerCatalog.ts`
- NetBond head start: `~/Developer/att-netbond-sdci/src/data/storefront/headStart.ts`
- NetBond storefront: https://socraticstatic.github.io/NetBond_Advanced/
- AI-grade network: https://socraticstatic.github.io/ai-grade-network/
- Brand package: `ATT_NaaS_Brand_Package/` beside the store brief
