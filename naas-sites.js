// naas-sites.js — the sites side of Explore 360, drilled the way the cloud
// side is: class → metro → site. Pure data; the app decorates it with
// open state, carets and doors. Added 2026-09-08 (Micah: "dive from top to
// bottom, region to ATM").

const METROS = ['Dallas', 'Houston', 'Atlanta', 'Chicago', 'Phoenix', 'Denver', 'Seattle', 'Miami', 'Charlotte', 'Nashville'];
const METRO_ABBR = { Dallas: 'DAL', Houston: 'HOU', Atlanta: 'ATL', Chicago: 'CHI', Phoenix: 'PHX', Denver: 'DEN', Seattle: 'SEA', Miami: 'MIA', Charlotte: 'CLT', Nashville: 'BNA' };
const STREETS = {
  Dallas: ['Ross Ave', 'Main St', 'Elm St', 'Commerce St', 'Greenville Ave', 'Belt Line Rd'],
  Houston: ['Westheimer Rd', 'Main St', 'Kirby Dr', 'Richmond Ave', 'Bellaire Blvd', 'Louisiana St'],
  Atlanta: ['Peachtree St', 'Ponce de Leon Ave', 'Piedmont Ave', 'Roswell Rd', 'Memorial Dr', 'Northside Dr'],
  Chicago: ['Michigan Ave', 'State St', 'Clark St', 'Halsted St', 'Milwaukee Ave', 'Western Ave'],
  Phoenix: ['Camelback Rd', 'Central Ave', 'Indian School Rd', 'Bell Rd', 'Thomas Rd', 'McDowell Rd'],
  Denver: ['Colfax Ave', 'Broadway', 'Federal Blvd', 'Colorado Blvd', 'Speer Blvd', 'Evans Ave'],
  Seattle: ['Pike St', 'Rainier Ave', 'Aurora Ave', 'Denny Way', 'Mercer St', '4th Ave'],
  Miami: ['Biscayne Blvd', 'Flagler St', 'Coral Way', 'Brickell Ave', 'Collins Ave', 'Calle Ocho'],
  Charlotte: ['Tryon St', 'Trade St', 'Independence Blvd', 'South Blvd', 'Providence Rd', 'Park Rd'],
  Nashville: ['Broadway', 'West End Ave', 'Charlotte Ave', 'Nolensville Pike', 'Gallatin Pike', '8th Ave'],
};
const STATE = { Dallas: 'TX', Houston: 'TX', Austin: 'TX', Atlanta: 'GA', Chicago: 'IL', Phoenix: 'AZ', Denver: 'CO', Seattle: 'WA', Miami: 'FL', Charlotte: 'NC', Nashville: 'TN', Ashburn: 'VA', 'San Jose': 'CA', Frankfurt: 'DE', Singapore: 'SG' };
/** Two-letter state (or country) for a metro; the auto-label on every site row. */
export const stateOf = (metro) => STATE[metro] || '';
const HOSTS = ['7-Eleven', 'Kroger', 'Walgreens', 'QuikTrip', 'Costco', 'Target', 'CVS', 'H-E-B'];

const CLASS = {
  'Data center': { label: 'Data centers', icon: 'router', prefix: 'DC', unit: 'data center', plural: 'data centers' },
  Campus: { label: 'Campuses', icon: 'home', prefix: 'CAM', unit: 'campus', plural: 'campuses' },
  Office: { label: 'Offices', icon: 'home', prefix: 'OFF', unit: 'office', plural: 'offices' },
  Plant: { label: 'Plants', icon: 'gear', prefix: 'PLT', unit: 'plant', plural: 'plants' },
  Branch: { label: 'Branches', icon: 'hub', prefix: 'BR', unit: 'branch', plural: 'branches' },
  Edge: { label: 'ATMs and kiosks', icon: 'smart-meter', prefix: 'ATM', unit: 'ATM', plural: 'ATMs' },
  Field: { label: 'Field (wireless)', icon: 'cable', prefix: 'FLD', unit: 'field site', plural: 'field sites' },
};
/** A site's class, from its declared class first and its name and access when the data is loose. */
function classOf(st) {
  if (/atm|kiosk/i.test(st.name)) return 'Edge';
  if (/field|wireless/i.test(st.name) || /mobility/i.test(st.access || '')) return 'Field';
  return CLASS[st.cls] ? st.cls : 'Branch';
}

const countOf = (name) => { const m = /\(([\d,]+)\)/.exec(name); return m ? parseInt(m[1].replace(/,/g, ''), 10) : 1; };
const isRollup = (st) => countOf(st.name) > 1;

/** Deterministic split of n sites across k metros, largest first. */
function splitMetros(n, seed) {
  const k = Math.max(1, Math.min(6, Math.min(n, Math.round(n / 40) || 2)));
  const weights = Array.from({ length: k }, (_, i) => 1 / (i + 1.4));
  const total = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map(w => Math.max(1, Math.floor(n * w / total)));
  let left = n - counts.reduce((a, b) => a + b, 0);
  for (let i = 0; left > 0; i = (i + 1) % k) { counts[i] += 1; left -= 1; }
  return counts.map((c, i) => ({ metro: METROS[(i + seed) % METROS.length], count: c }));
}

/** One site row. Private share follows the class; latency and address are seeded. */
function siteRow(cls, metro, i, priv) {
  const c = CLASS[cls] || CLASS.Branch;
  const id = `${c.prefix}-${METRO_ABBR[metro] || metro.slice(0, 3).toUpperCase()}-${String(100 + i * 37 % 900).padStart(4, '0')}`;
  const host = cls === 'Edge' ? HOSTS[i % HOSTS.length] + ', ' : '';
  const streets = STREETS[metro] || STREETS.Dallas;
  const address = `${host}${1200 + i * 310} ${streets[i % streets.length]}`;
  const ms = priv ? 4 + (i * 5) % 12 : 28 + (i * 9) % 40;
  const since = (i * 71 + (METROS.indexOf(metro) + 2) * 37) % 365; // days since discovery, seeded
  return { id, name: id, address, metro, priv, ms, exposed: !priv, since };
}

/**
 * The tree: one node per site class present in the estate. Named sites
 * (a data center, a campus) are their own rows; rolled-up classes (branches,
 * ATMs) drill through metros to individual sites.
 */
export function siteTree(est) {
  const groups = {};
  (est.sites || []).forEach((st, idx) => {
    const cls = classOf(st);
    const g = groups[cls] = groups[cls] || { cls, ...CLASS[cls], count: 0, onFabric: 0, access: new Set(), named: [], rollups: [] };
    const n = countOf(st.name);
    g.count += n;
    if (st.priv) g.onFabric += n;
    g.access.add(st.access);
    if (isRollup(st)) g.rollups.push({ ...st, n, idx }); else g.named.push({ ...st, idx });
  });
  return Object.values(groups).map((g, gi) => {
    const privShare = g.count ? g.onFabric / g.count : 0;
    let children;
    if (g.rollups.length) {
      let seed = gi;
      children = g.rollups.flatMap((r, ri) => splitMetros(r.n, seed++).map((m, mi) => {
        const sites = Array.from({ length: Math.min(m.count, 6) }, (_, i) => siteRow(g.cls, m.metro, i + mi * 6, ((i * 7 + mi * 3) % 10) / 10 < privShare + 0.05));
        const onFabric = privShare >= 1 ? m.count : privShare <= 0 ? 0 : Math.round(m.count * (privShare + ((mi % 3) - 1) * 0.08));
        return {
          kind: 'metro', key: `${g.cls}:${ri}:${m.metro}`, name: m.metro, count: m.count, onFabric: Math.max(0, Math.min(m.count, onFabric)),
          access: r.access, ramp: `${m.metro} PoP`, ms: 4 + (mi * 3) % 9, sites, more: Math.max(0, m.count - sites.length),
        };
      }));
    } else {
      children = g.named.map((st, i) => ({ kind: 'site', key: `${g.cls}:${st.name}`, ...siteRow(g.cls, st.metro, i, !!st.priv), name: st.name, address: `${st.metro} · ${st.access}`, metro: st.metro, priv: !!st.priv, since: (st.idx * 97 + 17) % 365 }));
    }
    // The class rolls up from what it contains, so a class badge can never contradict its metros.
    const onFabric = children.reduce((a, ch) => a + (ch.kind === 'metro' ? ch.onFabric : (ch.priv ? 1 : 0)), 0);
    return { kind: 'class', key: g.cls, cls: g.cls, label: g.label, icon: g.icon, unit: g.unit, plural: g.plural, count: g.count, onFabric, access: [...g.access], children };
  });
}
