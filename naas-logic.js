/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// Layout and derivation helpers for the NaaS storefront. Pure functions, no DOM.
export const fmt = (n) => '$' + Math.round(n).toLocaleString('en-US');
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

const CLOUD_ORDER = ['AWS', 'Azure', 'GCP', 'CoreWeave', 'Oracle'];

export function heroLayout(est, opts) {
  // The band widens when the fabric is open (facilities, ports, circuits) so its rows read at full size.
  const W = 1392, H = 560, bandX = opts.bandX || 560, bandW = opts.bandW || 240, bandY = 28, bandH = 396, strataH = bandH / 4;
  // Beneath the band: the lane for traffic that never touches the AT&T fabric (third party, internet). Ramesh, 2026-09-09.
  const lane = { x: bandX, y: bandY + bandH + 16, w: bandW, h: 76 };
  const out = { W, H, bandX, bandW, bandY, bandH, lane, sites: [], groups: [], regions: [], workloads: [], edges: [], arcs: [], internet: null, strata: [], ghost: false };
  const clampBand = (y) => Math.round(Math.min(bandY + bandH - 24, Math.max(bandY + 24, y)));
  const clampLane = (y) => Math.round(Math.min(lane.y + lane.h - 14, Math.max(lane.y + 14, y)));
  const empty = !est || est.stage === 'empty';
  out.ghost = empty;

  const rawSites = empty ? [{ name: 'Your data centers', access: 'AVPN, ASE', ghost: true }, { name: 'Your sites', access: 'ADI, ABF, SD-WAN', ghost: true }, { name: 'Your internet sites', access: 'Internet first mile', ghost: true }] : (opts.siteRows || est.sites);
  const sites = rawSites.length > 7 ? [...rawSites.slice(0, 6), { name: `+${fmtN(rawSites.length - 6)} more`, access: 'In the level map', more: true, rollup: false }] : rawSites;
  const n = sites.length;
  const gap = n > 1 ? Math.min(66, (H - 120) / (n - 1)) : 0;
  const top = 48 + ((H - 96) - (n - 1) * gap) / 2 - 18;
  sites.forEach((s, i) => {
    const y = Math.round(top + i * gap);
    out.sites.push({ ...s, i, y, cy: y + 18, key: 'site' + i });
    const viaLane = !s.priv && !s.ghost;
    out.edges.push({ id: 'in' + i, kind: 'ingress', priv: !!s.priv, ghost: !!s.ghost, viaLane, x1: 224, y1: y + 18, x2: bandX, y2: viaLane ? clampLane(y + 18) : clampBand(y + 18), site: s });
  });

  const regs = empty ? [{ cloud: 'Clouds', region: 'Your regions', ghost: true, wl: 0 }, { cloud: 'Neoclouds', region: 'Your GPU regions', ghost: true, wl: 0 }] : (opts.regionRows || est.regionsList);
  const byCloud = {};
  regs.forEach(r => { (byCloud[r.cloud] = byCloud[r.cloud] || []).push(r); });
  const ord = (c) => { const i = CLOUD_ORDER.indexOf(c); return i < 0 ? 99 : i; };
  const clouds = Object.keys(byCloud).sort((a, b) => ord(a) - ord(b));
  const rowH = 34, groupHead = 20, groupGap = 12;
  let y = 30;
  clouds.forEach(c => {
    out.groups.push({ cloud: c, y, count: byCloud[c].length });
    y += groupHead;
    byCloud[c].forEach((r, j) => {
      const ry = y;
      out.regions.push({ ...r, y: ry, cy: ry + 14, key: (r.child ? 'c:' : '') + r.region });
      const viaLane = !r.priv && !r.ghost;
      if (!r.noEdge && !r.other) out.edges.push({ id: 'eg' + out.regions.length, kind: 'egress', priv: !!r.priv, ghost: !!r.ghost, viaLane, x1: bandX + bandW, y1: viaLane ? clampLane(ry + 14) : Math.round(Math.min(bandY + bandH - 40, Math.max(bandY + 24, ry + 14))), x2: 980, y2: ry + 14, chip: r.ramp, shield: !!r.priv && (r.ramp === 'NetBond' || r.ramp === 'ER'), region: r, dur: r.fab ? Math.max(1.2, r.fab / 6) : 3 });
      if (r.wl) out.workloads.push({ region: r.region, y: ry + 3, label: r.wlLabel || (r.wl.toLocaleString('en-US') + ' workloads'), key: 'wl' + (r.child ? 'c:' : '') + r.region, tags: r.tags });
      y += rowH;
    });
    y += groupGap;
  });
  if (!empty && est.regionsExtra && !opts.regionRows) { out.regions.push({ cloud: '', region: '+' + est.regionsExtra + ' regions', rollup: true, y, cy: y + 14, key: 'more' }); y += rowH; }
  out.internet = { y: Math.min(H - 36, Math.max(y + 8, 380)) };
  out.edges.push({ id: 'inet', kind: 'internet', priv: false, ghost: empty, viaLane: true, x1: bandX + bandW, y1: lane.y + lane.h - 14, x2: 980, y2: out.internet.y + 14, internet: true });
  (est && est.arcs || []).forEach((a, i) => {
    const r1 = out.regions.find(r => r.region === a.from), r2 = out.regions.find(r => r.region === a.to);
    if (r1 && r2) out.arcs.push({ id: 'arc' + i, priv: a.priv, y1: r1.cy, y2: r2.cy, from: a.from, to: a.to });
  });
  out.strata = [0, 1, 2, 3].map(i => ({ i, y: bandY + i * strataH, h: strataH }));
  return out;
}

export function edgePath(e) {
  const mx = (e.x1 + e.x2) / 2;
  return `M${e.x1},${e.y1} C${mx},${e.y1} ${mx},${e.y2} ${e.x2},${e.y2}`;
}
export function arcPath(a) {
  return `M1220,${a.y1} C1246,${a.y1} 1246,${a.y2} 1220,${a.y2}`;
}

const STATES = { East: ['Georgia', 'Florida', 'North Carolina', 'Virginia', 'New York', 'Pennsylvania', 'New Jersey', 'Massachusetts'], Central: ['Texas', 'Illinois', 'Ohio', 'Missouri', 'Minnesota', 'Michigan', 'Tennessee', 'Oklahoma'], West: ['California', 'Washington', 'Arizona', 'Colorado', 'Oregon', 'Nevada', 'Utah'] };
const METROS = { Georgia: ['Atlanta', 'Savannah', 'Augusta'], Florida: ['Miami', 'Tampa', 'Orlando', 'Jacksonville'], 'North Carolina': ['Charlotte', 'Raleigh'], Virginia: ['Richmond', 'Norfolk', 'Ashburn'], 'New York': ['New York City', 'Buffalo', 'Albany'], Pennsylvania: ['Philadelphia', 'Pittsburgh'], 'New Jersey': ['Newark', 'Jersey City'], Massachusetts: ['Boston', 'Worcester'], Texas: ['Dallas', 'Houston', 'Austin', 'San Antonio'], Illinois: ['Chicago', 'Springfield'], Ohio: ['Columbus', 'Cleveland', 'Cincinnati'], Missouri: ['St. Louis', 'Kansas City'], Minnesota: ['Minneapolis', 'St. Paul'], Michigan: ['Detroit', 'Grand Rapids'], Tennessee: ['Nashville', 'Memphis'], Oklahoma: ['Oklahoma City', 'Tulsa'], California: ['Los Angeles', 'San Francisco', 'San Jose', 'San Diego', 'Sacramento'], Washington: ['Seattle', 'Spokane'], Arizona: ['Phoenix', 'Tucson'], Colorado: ['Denver', 'Colorado Springs'], Oregon: ['Portland', 'Eugene'], Nevada: ['Las Vegas', 'Reno'], Utah: ['Salt Lake City', 'Provo'] };
const DISTRICTS = ['Downtown', 'Midtown', 'North', 'South', 'Airport', 'Suburbs'];
const STREETS = ['Peachtree St', 'Main St', 'Market St', 'Broadway', 'Commerce Ave', 'Elm St', 'Lake Shore Dr', 'Congress Ave', 'Pine St', 'Oak Blvd', 'Union Ave', 'Harbor Way'];
const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0); };
const rnd = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; };
const countOf = (label) => { const m = /\(([\d,]+)\)/.exec(label); return m ? parseInt(m[1].replace(/,/g, ''), 10) : 1; };
const stripCount = (label) => label.replace(/\s*\([\d,]+\)\s*$/, '');
const fmtN = (n) => n.toLocaleString('en-US');

// Deterministic split of `total` across `names`, min 1 each, weighted by a seeded RNG.
function split(total, names, seed) {
  const r = rnd(seed);
  const n = Math.min(names.length, total);
  const w = Array.from({ length: n }, () => 0.4 + r());
  const sum = w.reduce((a, b) => a + b, 0);
  let left = total;
  return names.slice(0, n).map((nm, i) => { const c = i === n - 1 ? left : Math.max(1, Math.min(left - (n - 1 - i), Math.round(total * w[i] / sum))); left -= c; return { name: nm, count: c }; });
}

// Level of a drill trail: class → region → state → metro → district → site (street).
// `trail` is the list of clicked labels, e.g. ["Branches, East (1,640)", "Georgia (212)", "Atlanta (96)"].
export function drillLevel(trail) {
  const depth = trail.length;
  const top = stripCount(trail[0]);
  const hasRegion = /, (East|Central|West)$/.test(top);
  const cls = top.replace(/, (East|Central|West)$/, '').replace(/s$/, '');
  const chain = hasRegion ? ['state', 'metro', 'district', 'site'] : ['region', 'state', 'metro', 'district', 'site'];
  const total = countOf(trail[0]);
  if (total <= 8 && depth === 1) return { level: 'site', label: 'Sites', rows: sites(cls, trail, total) };
  const level = chain[Math.min(depth - 1, chain.length - 1)];
  return { level, label: { region: 'Regions', state: 'States', metro: 'Metros', district: 'Districts', site: 'Sites' }[level], rows: rowsFor(level, cls, trail) };
}

function rowsFor(level, cls, trail) {
  const last = trail[trail.length - 1], total = countOf(last), seed = hash(trail.join('/'));
  const parent = stripCount(last);
  const access = ['SD-WAN', 'ADI (Dedicated Internet)', 'ABF (Business Fiber)', 'AVPN (MPLS VPN)'];
  const mk = (arr) => arr.map((c, i) => ({ name: `${c.name} (${fmtN(c.count)})`, cls, access: access[(seed + i) % access.length], priv: (seed + i) % 3 === 0, rollup: true, count: c.count }));
  if (level === 'region') return mk(split(total, ['East', 'Central', 'West'], seed));
  if (level === 'state') { const region = /(East|Central|West)/.exec(trail.map(stripCount).join(' ')); const list = STATES[region ? region[1] : 'East']; return mk(split(total, list, seed)); }
  if (level === 'metro') return mk(split(total, METROS[parent] || ['Metro A', 'Metro B', 'Metro C'], seed));
  if (level === 'district') return total <= 6 ? sites(cls, trail, total) : mk(split(total, DISTRICTS, seed));
  return sites(cls, trail, total);
}

function sites(cls, trail, total) {
  const seed = hash(trail.join('/') + '#sites'), r = rnd(seed);
  const metro = trail.map(stripCount).find(t => Object.values(METROS).some(m => m.includes(t))) || 'Dallas';
  const access = ['SD-WAN', 'ADI (Dedicated Internet)', 'ABF (Business Fiber)', 'Mobility first mile'];
  return Array.from({ length: Math.min(total, 60) }, (_, i) => ({ name: `${100 + Math.floor(r() * 9800)} ${STREETS[Math.floor(r() * STREETS.length)]}, ${metro}`, cls, access: access[Math.floor(r() * access.length)], priv: r() > 0.55, rollup: false, count: 1 }));
}

export function drillChildren(label, depth) { return drillLevel([label]).rows; }

export function sankey(est) {
  const W = 900, H = 260, colW = 14;
  const srcs = est.sites.map(s => ({ name: s.name, v: Math.max(1, s.rollup ? 3 : 1), priv: s.priv }));
  const dsts = est.regionsList.map(r => ({ name: r.cloud + ' ' + r.region, v: r.wl || 1, priv: r.priv }));
  const total = dsts.reduce((a, b) => a + b.v, 0);
  const st = srcs.reduce((a, b) => a + b.v, 0);
  srcs.forEach(s => (s.v = s.v / st * total));
  const privV = dsts.filter(d => d.priv).reduce((a, b) => a + b.v, 0);
  const mids = [{ name: 'AT&T fabric', v: privV, priv: true }, { name: 'Public internet', v: total - privV, priv: false }];
  const stack = (arr, x) => { let y = 10; const pad = 8; const scale = (H - 20 - pad * (arr.length - 1)) / total; return arr.map(a => { const h = a.v * scale; const o = { ...a, x, y, h, x2: x + colW, used: 0 }; y += h + pad; return o; }); };
  const S = stack(srcs, 0), M = stack(mids, W / 2 - colW / 2), D = stack(dsts, W - colW);
  const ribbons = [];
  const link = (a, b, v, priv) => {
    const scaleA = a.h / a.v, scaleB = b.h / b.v;
    const ay = a.y + a.used * scaleA, by = b.y + b.used * scaleB, ah = v * scaleA, bh = v * scaleB;
    a.used += v; b.used += v;
    const mx = (a.x2 + b.x) / 2;
    ribbons.push({ d: `M${a.x2},${ay} C${mx},${ay} ${mx},${by} ${b.x},${by} L${b.x},${by + bh} C${mx},${by + bh} ${mx},${ay + ah} ${a.x2},${ay + ah} Z`, priv });
  };
  const privShareSrc = privV / total;
  S.forEach(s => { const toFab = s.priv ? s.v * 0.85 : s.v * 0.25; const a = Math.min(toFab, privV); link(s, M[0], toFab, true); link(s, M[1], s.v - toFab, false); });
  D.forEach(d => link(d.priv ? M[0] : M[1], d, d.v, d.priv));
  return { W, H, nodes: [...S, ...M, ...D], ribbons };
}
