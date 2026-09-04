# AT&T NaaS Brand Package

For the AT&T AI-grade network guided storefront. Companion to `NaaS_Guided_Storefront_Requirements.md`. Everything here is pulled from the running apps, not redrawn.

Open `preview.html` in a browser to see every asset on light and dark at once.

```
ATT_NaaS_Brand_Package/
  README.md              this file
  preview.html           contact sheet, light and dark
  logo/
    att-globe.svg        the AT&T globe, gradient on transparent, works on both themes
    att-globe-500.jpg    raster fallback, 500 x 500
    att-lockup-light.svg globe + "AT&T AI-grade network", light background baked in
    att-lockup-dark.svg  same, dark background baked in
    att-wordmark-light.svg  type only, transparent, for light surfaces
    att-wordmark-dark.svg   type only, transparent, for dark surfaces
  icons/
    light/att-*.svg      the 26 curated icons the apps use, gray 900 (#13171b), for light surfaces
    dark/att-*.svg       the same 26, white (#ffffff), for dark surfaces
    currentColor/att-*.svg  the same 26, inherit color from CSS, for code
    all/
      light/ dark/ currentColor/   the full AT&T set, 751 icons, same three variants
      index.html, index.png        contact sheet of all 751 on light and dark
      INDEX.txt                    every file name, one per line
      CATEGORIES.md                the pack's own category list
      icons-data.json              name, display name, category, viewBox, paths
  fonts/
    ATTAleckSans_{Light,Regular,Medium,Bold,Black}.woff2
    All_ATTAleck_Web_Fonts.zip   the full family for installing in Figma or Claude Design
    fonts.css            the @font-face block used by the app
  providers/
    aws.svg azure.svg google.svg oracle.svg equinix.svg digitalrealty.svg
  tokens/
    tokens.css           Flywheel light tokens, the source of truth
    dark.css             the generated dark skin, scoped under html.dark
```

---

## 1. Logo

### Which file, where

| Surface | Use | Size |
|---|---|---|
| Top bar, light | `att-wordmark-light.svg` | 24px cap height, 16px type in the running app |
| Top bar, dark | `att-wordmark-dark.svg` | same |
| Front door hero, cards, handoff screens | `att-globe.svg` | 40 or 56px square |
| Slides, thumbnails, covers | `att-lockup-light.svg` or `att-lockup-dark.svg` | 56px tall, scales |
| Raster only (email, chat) | `att-globe-500.jpg` | 500 square |

### Rules

- The globe never changes color. It is the AT&T blue gradient (`#00a8e0` to `#1696d4`) on transparent, on both themes. Do not flatten it, do not recolor it, do not put it in a box.
- The wordmark is two words in two colors. "AT&T" is AT&T blue `#009fdb`, bold. "AI-grade network" is gray 900 `#13171b` on light and `#f2f6fa` on dark, bold. Same size, 8px gap. That is how the running app draws it.
- Casing: "AI-grade" hyphenated, "network" lowercase. Never "AI Grade Network", never "Cloud Connect", never "NetBond Advanced" as the product name.
- Clear space: one globe-height on every side of the lockup. Nothing inside that.
- Minimum size: globe 24px, wordmark 16px type.
- The globe alone is enough on a card or a tile. The lockup is for a page header or a cover. Never both on one surface.
- Do not set the wordmark in any face but ATT Aleck Sans Bold. If the font is missing, install `fonts/All_ATTAleck_Web_Fonts.zip` first; do not substitute.

The lockup and wordmark SVGs reference the font by name. They render correctly wherever ATT Aleck Sans is installed. In a tool that cannot load the font, rebuild them as two text layers per the rule above rather than outlining the type.

---

## 2. Icons

26 icons from the AT&T icon set, viewBox 0 0 96 96, outline style, stroke 4 on a 96 grid (which reads as a 1px hairline at 24px). One exception: `hub` is a filled glyph, stroke 0.

| Icon | Used for |
|---|---|
| home | layer home, "the layer at a glance" |
| cloud | Connect, clouds, on-ramps |
| check-shield | Govern, policy, protection |
| high-meter | Observe, performance |
| bill | Cost, savings, term pricing |
| hub | Connection Hub, the AT&T fabric band |
| router, ethernet, cable | transport and access, first mile |
| firewall, lock | inspection, NGFW, virtual keys |
| apis, apps | AI Fabric providers, APIs, automation |
| person, person-group | teams and limits, personas |
| search | discover, marketplace search |
| grid, checklist, pie-chart, smart-meter | inventory, scan steps, cost breakdown, telemetry |
| bell | pending actions, alerts |
| shopping-bag | the marketplace, Browse |
| question-circle | "Why we recommend this" |
| plus | "+ Create", compose |
| download | exports, proposals |
| gear | settings |

### Which folder, where

- **Design tools (Figma, Claude Design):** use `icons/light/` on light artboards and `icons/dark/` on dark artboards. Import as SVG, keep as vectors, do not rasterize.
- **Code:** use `icons/currentColor/` and set `color` on the parent. This is how `AttIcon` renders them in the app.

### Rules

- Sizes: 16, 20, 24, 32. Default 20 (`h-5 w-5`). Never scale to an odd size; the stroke goes fuzzy.
- Color: icons take the text color of their context. Heading gray on a heading row, body gray beside body text, link cobalt inside a link, white on a cobalt button. On dark, `#f2f6fa` for headings, `#c5cfd9` beside body text, `#66c8f0` inside links.
- Never color an icon with a status color unless the icon is the status. A red bell means an alarm, not decoration.
- Always pair with a label. An icon alone is allowed only in a toolbar with a tooltip.
- Do not mix with a second outline set at the same weight. Lucide is the app's utility set (chevrons, close, menu, search field icon). AT&T icons carry meaning: layers, verbs, products. If both could work, AT&T wins.
- Do not add a circle or tile behind an icon except on a product card, where the tile is cobalt 100 on light and `#16324e` (ghost) on dark, radius 12.

### How the zips are cut

Upload tools cap a zip at 500 entries, so the package ships as seven zips. `ATT_NaaS_Brand_Package.zip` (106 entries) is the core: logo, the curated 26 icons, fonts, providers, tokens, this README, the preview, and the full-set reference files (`index.png`, `INDEX.txt`, `CATEGORIES.md`, `icons-data.json`). The 751-icon variants come as `ATT_Icons_All_{light,dark,currentColor}_{1of2,2of2}.zip`, about 376 files each, split alphabetically. Unzip the ones you need into `icons/all/`. Only the light and dark halves matter for design work; currentColor is for code.

### The full set

`icons/all/` holds the complete AT&T pack, 751 icons on the same 96 grid, in the same three variants. Open `icons/all/index.html` (or `index.png`) to scan them all on light and dark. `INDEX.txt` is the file list; `icons-data.json` carries display names and categories for search.

The 26 in `icons/light/` and `icons/dark/` are the curated subset the apps already use, and they are the default. Two of them, `hub` and `plus`, are app-specific glyphs that do not exist under those names in the full pack (the pack's nearest are `add-line` and the connection icons); keep using the curated files for those two. Reach into `icons/all/` when a screen needs a concept the 26 do not cover (5G, satellite, fiber, a specific device, an arrow set). Pick one, add it to the curated folders, and name the concept it stands for. Do not import all 751 into a design file as components; import the curated set plus whatever a screen needs.

---

## 3. Type

ATT Aleck Sans. Regular 400, Medium 500, Bold 700. Light 300 and Black 900 are in the package but the UI does not use them.

Letter spacing -0.03em on all body and heading text. +0.04em on tags and kickers (uppercase, 12 or 14, semibold).

Scale, size / line height: 12/18, 14/20, 16/24, 18/26 h6, 26/34 h5, 34/42 h4, 42/50 h3, 50/58 h2, 58/66 h1. Page title is h4. Section heading is h6.

Install: unzip `fonts/All_ATTAleck_Web_Fonts.zip` and install the OTF or TTF files, then restart the design tool. On the web, `fonts/fonts.css` plus the woff2 files.

---

## 4. Color on light and dark

The tokens are the source of truth (`tokens/tokens.css` for light, `tokens/dark.css` for dark). The values a designer needs by hand:

| Role | Light | Dark |
|---|---|---|
| Page background (wash) | `#f8fafb` | `#111821` blue-charcoal, never black |
| Card and panel (base) | `#ffffff` | `#1a2431` |
| Subtle fill, chips, table header (neutral) | gray 200 | `#222e3c` |
| Hover, raised row | gray 100 | `#2a3848` |
| Hairline border | `#dcdfe3` | `#2f3d4d` |
| Strong border | gray 600 | `#4e5e6f` |
| Heading text | `#13171b` | `#f2f6fa` |
| Body text | `#454b52` | `#c5cfd9` |
| Muted text, kickers | `#686e74` | `#97a3b0` |
| Disabled text | gray 500 | `#67737f` |
| Link, active tab, active border | `#0057b8` cobalt 600 | `#66c8f0` AT&T blue 100 |
| Link hover | `#00388f` | `#99daf5` |
| Primary button fill | `#0057b8` | `#0057b8`, hover `#0064d6` (brightens, never darkens) |
| Ghost fill | `#e6f0fa` | `#16324e` |
| AT&T blue accent | `#009fdb` | `#009fdb` |
| Success / warn / error | green 600 / orange 600 / red 600 | `#6ecf63` / `#ffa25e` / `#ff7a8f` |

Rules that hold on both themes:

- No gradients on chrome. The only gradients are the globe and the fabric band art in dark mode.
- The primary button is the same cobalt on both themes. It is the one thing that does not change.
- Dark mode is a skin, not a redesign. Same layout, same spacing, same type, same icons at the same sizes. Only the token values change.
- Wash is never pure black. Base is never pure white on dark.

---

## 5. Provider marks

`providers/` holds the six marks the fabric picture uses on the egress column: AWS, Azure, Google Cloud, Oracle, Equinix, Digital Realty. Use them at 20 or 24px inside a region node, never larger than the AT&T globe on the same surface. Do not recolor them for dark; they carry their own brand colors and sit on the base card color.

---

## 6. Directions for Claude Design

Paste with the requirements doc:

1. Install ATT Aleck Sans from `fonts/All_ATTAleck_Web_Fonts.zip` before opening a canvas. Every text layer is Aleck Sans. No substitute.
2. Import `logo/att-wordmark-light.svg` into the light top bar and `logo/att-wordmark-dark.svg` into the dark top bar, 24px tall, left-aligned to the 12-column grid, hamburger to its left on narrow layouts.
3. Import `logo/att-globe.svg` once, 56px, for the front door hero and the AWS handoff screen. 40px inside cards.
4. Import all of `icons/light/` and `icons/dark/` (the curated 26) as components named `att/<name>`. Use light on light artboards and dark on dark artboards at 20px default. When a screen needs a concept the 26 do not cover, take it from `icons/all/` in the matching variant and add it to the component set. Never substitute a Lucide icon for a missing AT&T one.
5. Set the page background to wash and every card to base, per the table in section 4, for each theme.
6. Put the provider marks from `providers/` inside region nodes at 20px.
7. Never draw a logo, an icon, or a provider mark by hand. If one is missing from this package, stop and ask.
