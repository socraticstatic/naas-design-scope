// naas-flowmap.js — the live flow map: a Sankey you can open in place, node
// by node, down to the flow record. Pure data. Added 2026-09-09 for the
// Observe dashboard (Micah: "deep-drillable, with cutting edge UX").
import * as S from './naas-sites.js';
import * as P from './naas-paths.js';

const PER_SITE = { 'Data center': 6, Campus: 2.5, Plant: 1.5, Office: 0.8, Branch: 0.04, Edge: 0.005, Field: 0.3 };
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const n = (x) => x.toLocaleString('en-US');
export const SLO = 100;
const PUBLIC_IPS = ['104.18.32.7', '142.250.72.14', '3.5.140.2', '52.94.236.248', '20.60.132.10', '35.190.247.10'];
const AI_HOSTS = ['api.openai.com', 'api.anthropic.com', 'bedrock-runtime', 'aiplatform.googleapis.com'];

/** Seeded delta against the prior window, in percent, for the "what changed" mode. */
export const deltaOf = (key) => ((hash(key + ':d') % 70) - 25);
/** Seeded 24h shape, 0..1 → multiplier, for the scrubber. */
export const shapeAt = (key, t) => { const a = (hash(key + ':a') % 40) / 100, ph = (hash(key + ':p') % 628) / 100; return 0.75 + a * (1 + Math.sin(t * 6.283 + ph)) / 2 + 0.05 * Math.sin(t * 25 + ph); };

function regionOf(est, name) { return est.regionsList.find(r => r.region === name); }
function invRegion(inv, name) { return inv.flatMap(c => c.regions).find(r => r.region === name); }
function stateOfRegion(est, name) { const r = regionOf(est, name); if (!r) return 'ok'; if (r.link === 'degraded') return 'degraded'; if (!r.priv && (r.pub || 0) > SLO) return 'slo'; if (r.rel === 'warn') return 'slo'; return 'ok'; }

/** Root nodes on the left: site classes, workload groups by tag, cloud-to-cloud regions. */
export function leftRoots(est, flows) {
  const sg = {};
  (est.sites || []).forEach(s => { const cls = S.classOf(s); const c = S.CLASS[cls]; const count = S.countOf(s.name); const v = (PER_SITE[cls] || 0.5) * count; const g = sg[cls] = sg[cls] || { kind: 'site', key: 'site:' + cls, cls, unit: c.unit, plural: c.plural, count: 0, v: 0, fabV: 0 }; g.count += count; g.v += v; g.fabV += s.priv ? v : v * 0.1; });
  const sites = Object.values(sg).map(g => ({ ...g, name: `${n(g.count)} ${g.count === 1 ? g.unit : g.plural}`, group: 'sites', hasChildren: true, state: 'ok' })).sort((a, b) => b.v - a.v);
  const tg = {}; flows.filter(f => f.kind === 'App').forEach(f => { const g = tg[f.from] = tg[f.from] || { kind: 'tag', key: 'tag:' + f.from, name: f.from, v: 0, fabV: 0, regions: new Set() }; g.v += f.gbps; if (f.controlled) g.fabV += f.gbps; g.regions.add(f.region); });
  const tags = Object.values(tg).map(g => ({ ...g, group: 'tags', hasChildren: true, state: [...g.regions].map(r => stateOfRegion(est, r.split(' ')[1] || r)).find(x => x !== 'ok') || 'ok' })).sort((a, b) => b.v - a.v);
  const rg = {}; flows.filter(f => f.kind !== 'App').forEach(f => { const g = rg[f.from] = rg[f.from] || { kind: 'c2c', key: 'c2c:' + f.from, name: f.from, v: 0, fabV: 0 }; g.v += f.gbps; if (f.controlled) g.fabV += f.gbps; });
  const c2c = Object.values(rg).map(g => ({ ...g, group: 'c2c', hasChildren: false, state: stateOfRegion(est, g.name.split(' ')[1] || g.name) })).sort((a, b) => b.v - a.v);
  return [...sites, ...tags, ...c2c];
}

/** Root nodes on the right: the destination classes, plus the regions that sites reach. */
export function rightRoots(est, flows) {
  const dm = {}; flows.forEach(f => { const d = dm[f.to] = dm[f.to] || { kind: 'dest', key: 'dest:' + f.to, name: f.to, v: 0, fabV: 0 }; d.v += f.gbps; if (f.controlled) d.fabV += f.gbps; });
  const left = leftRoots(est, flows); const sitesV = left.filter(x => x.kind === 'site').reduce((a, x) => a + x.v, 0), sitesFab = left.filter(x => x.kind === 'site').reduce((a, x) => a + x.fabV, 0);
  return [...(sitesV ? [{ kind: 'dest', key: 'dest:regions', name: 'Cloud regions (from sites)', v: sitesV, fabV: sitesFab, hasChildren: true, state: 'ok' }] : []), ...Object.values(dm).map(d => ({ ...d, hasChildren: true, state: 'ok' })).sort((a, b) => b.v - a.v)];
}

/** Children of a node, one level down. Every level is honest about what the data can name. */
export function childrenOf(node, est, inv, flows) {
  const parts = node.key.split('/');
  if (node.kind === 'site') {
    const cls = S.siteTree(est).find(c => c.cls === node.cls); if (!cls) return [];
    const per = PER_SITE[node.cls] || 0.5;
    return cls.children.map(ch => ch.kind === 'metro'
      ? { kind: 'metro', key: `${node.key}/${ch.name}`, cls: node.cls, metro: ch.name, name: `${ch.name} · ${n(ch.count)}`, v: per * ch.count, fabV: per * ch.onFabric, hasChildren: true, state: ch.onFabric < ch.count / 2 ? 'slo' : 'ok', parentKey: node.key }
      : { kind: 'sitename', key: `${node.key}/${ch.name}`, cls: node.cls, siteName: ch.name, name: ch.name, v: per, fabV: ch.priv ? per : per * 0.1, hasChildren: true, state: ch.priv ? 'ok' : 'slo', parentKey: node.key }).sort((a, b) => b.v - a.v);
  }
  if (node.kind === 'metro') {
    const cls = S.siteTree(est).find(c => c.cls === node.cls); const m = cls && cls.children.find(ch => ch.kind === 'metro' && ch.name === node.metro); if (!m) return [];
    const per = PER_SITE[node.cls] || 0.5;
    const rows = m.sites.map(x => ({ kind: 'sitename', key: `${node.key}/${x.id}`, cls: node.cls, siteName: x.id, name: x.id, sub: x.address, v: per, fabV: x.priv ? per : per * 0.1, hasChildren: true, state: x.priv ? 'ok' : 'slo', parentKey: node.key }));
    if (m.more) rows.push({ kind: 'more', key: `${node.key}/more`, name: `+${n(m.more)} more`, v: per * m.more, fabV: per * Math.max(0, m.onFabric - m.sites.filter(x => x.priv).length), hasChildren: false, state: 'ok', parentKey: node.key });
    return rows;
  }
  if (node.kind === 'sitename') {
    const site = P.allSites(est).find(x => x.id === node.siteName || x.name === node.siteName); if (!site) return [];
    return P.siteRegions(est, site, 6).rows.map(x => ({ kind: 'circuit', key: `${node.key}/${x.region.region}`, name: `→ ${x.region.cloud} ${x.region.region}`, sub: `${site.access || 'Access'} · ${P.path(site, x.region).ms} ms`, v: Math.max(0.01, x.gbps), fabV: x.region.priv ? Math.max(0.01, x.gbps) : 0, hasChildren: false, state: x.region.priv ? 'ok' : (P.path(site, x.region).ms > SLO ? 'slo' : 'ok'), parentKey: node.key, region: x.region.region }));
  }
  if (node.kind === 'tag') {
    const m = {}; flows.filter(f => f.kind === 'App' && f.from === node.name).forEach(f => { const rn = f.region; const g = m[rn] = m[rn] || { kind: 'tagregion', key: `${node.key}/${rn}`, tag: node.name, regionName: rn, name: rn, v: 0, fabV: 0 }; g.v += f.gbps; if (f.controlled) g.fabV += f.gbps; });
    return Object.values(m).map(g => ({ ...g, hasChildren: true, state: stateOfRegion(est, g.regionName.split(' ')[1] || g.regionName), parentKey: node.key })).sort((a, b) => b.v - a.v);
  }
  if (node.kind === 'tagregion') {
    const rname = node.regionName.split(' ')[1] || node.regionName; const ir = invRegion(inv, rname); if (!ir) return [];
    const sum = ir.vpcs.reduce((a, v) => a + v.wl, 0) || 1; const fabShare = node.v ? node.fabV / node.v : 0;
    return ir.vpcs.map(v => ({ kind: 'vpc', key: `${node.key}/${v.id}`, tag: node.tag, regionName: rname, vpcId: v.id, name: v.name, sub: `${n(v.wl)} workloads · ${v.purpose}`, v: node.v * v.wl / sum, fabV: node.v * v.wl / sum * (v.priv ? Math.max(fabShare, 0.9) : Math.min(fabShare, 0.1)), hasChildren: true, state: v.priv ? stateOfRegion(est, rname) : 'slo', parentKey: node.key }));
  }
  if (node.kind === 'vpc') {
    const ir = invRegion(inv, node.regionName); const vpc = ir && ir.vpcs.find(v => v.id === node.vpcId); if (!vpc) return [];
    const sum = vpc.subnets.reduce((a, s) => a + s.wl, 0) || 1; const fabShare = node.v ? node.fabV / node.v : 0;
    return vpc.subnets.map(sn => ({ kind: 'subnet', key: `${node.key}/${sn.id}`, regionName: node.regionName, vpcId: node.vpcId, subnetId: sn.id, name: `${sn.name} · ${sn.cidr}`, sub: `${sn.az} · ${n(sn.wl)} workloads`, v: node.v * sn.wl / sum, fabV: node.v * sn.wl / sum * (sn.pub ? Math.min(fabShare, 0.2) : fabShare), hasChildren: true, state: sn.pub ? 'slo' : stateOfRegion(est, node.regionName), parentKey: node.key }));
  }
  if (node.kind === 'subnet') {
    const ir = invRegion(inv, node.regionName); const vpc = ir && ir.vpcs.find(v => v.id === node.vpcId); const sn = vpc && vpc.subnets.find(x => x.id === node.subnetId); if (!sn) return [];
    const ws = (sn.workloads || []).slice(0, 6); const each = node.v / Math.max(1, ws.length); const fabShare = node.v ? node.fabV / node.v : 0;
    return ws.map(w => ({ kind: 'workload', key: `${node.key}/${String(w.id).replace(/\//g, '_')}`, regionName: node.regionName, name: w.name, sub: `${w.ip} · ${w.type}`, ip: w.ip, resource: `${w.tag || vpc.name}/${w.name}`, v: each, fabV: each * (w.exposed ? Math.min(fabShare, 0.1) : fabShare), hasChildren: false, state: w.exposed ? 'slo' : 'ok', parentKey: node.key }));
  }
  if (node.kind === 'dest') {
    const per = (k) => node.v / k, fper = (k) => node.fabV / k;
    if (node.name === 'AI endpoints') return AI_HOSTS.map((h, i) => ({ kind: 'endpoint', key: `${node.key}/${i}`, name: PUBLIC_IPS[i], sub: `unresolved · public · likely ${h}`, v: per(4) * (1 - i * 0.15), fabV: fper(4) * (1 - i * 0.15), hasChildren: false, state: 'ok', parentKey: node.key, unresolved: true }));
    if (node.name === 'public internet') return PUBLIC_IPS.slice(0, 5).map((ip, i) => ({ kind: 'endpoint', key: `${node.key}/${i}`, name: ip, sub: 'unresolved · public', v: per(5) * (1 - i * 0.12), fabV: fper(5) * (1 - i * 0.12), hasChildren: false, state: 'ok', parentKey: node.key, unresolved: true }));
    if (node.name === 'object storage') { const rs = est.regionsList.slice(0, 5); return rs.map((r, i) => ({ kind: 'endpoint', key: `${node.key}/${r.region}`, name: r.cloud === 'Azure' ? `blob · ${r.region}` : r.cloud === 'GCP' ? `gcs · ${r.region}` : `s3 · ${r.region}`, sub: r.priv ? 'private endpoint · resolved' : 'public endpoint', v: per(rs.length) * (1 - i * 0.1), fabV: r.priv ? per(rs.length) * (1 - i * 0.1) : 0, hasChildren: false, state: r.priv ? 'ok' : 'slo', parentKey: node.key })); }
    if (node.name === 'inter-cloud') { const arcs = est.arcs || []; return arcs.map((a, i) => ({ kind: 'endpoint', key: `${node.key}/${i}`, name: `${a.from} ↔ ${a.to}`, sub: a.priv ? 'AT&T mid-mile' : 'public internet', v: per(arcs.length || 1), fabV: a.priv ? per(arcs.length || 1) : 0, hasChildren: false, state: a.priv ? 'ok' : 'slo', parentKey: node.key })); }
    if (node.name === 'Cloud regions (from sites)') { const rs = est.regionsList; const tot = rs.reduce((a, r) => a + r.wl, 0) || 1; return rs.map(r => ({ kind: 'endpoint', key: `${node.key}/${r.region}`, name: `${r.cloud} ${r.region}`, sub: r.priv ? `${r.ramp || 'NetBond'} · ${r.fab} ms` : `public · ${r.pub} ms`, v: node.v * r.wl / tot, fabV: r.priv ? node.v * r.wl / tot : 0, hasChildren: false, state: stateOfRegion(est, r.region), parentKey: node.key, region: r.region })); }
  }
  return [];
}

/** Replace every open node by its children, recursively. */
function expand(list, open, est, inv, flows, depth = 0) {
  return list.flatMap(nd => { const node = { ...nd, depth, group: nd.group || rootGroup(nd) }; if (open.has(node.key) && node.hasChildren) { const kids = childrenOf(node, est, inv, flows).map(k => ({ ...k, group: node.group })); return kids.length ? expand(kids, open, est, inv, flows, depth + 1) : [node]; } return [node]; });
}

/** The map. open: keys to expand. filterRegion: keep only what touches a region. t: 0..1 scrubber, null = window. */
export function buildMap(est, inv, flows0, opts = {}) {
  const open = new Set(opts.open || []);
  const flows = opts.filterRegion ? flows0.filter(f => (f.region || '').includes(opts.filterRegion) || f.name.includes(opts.filterRegion)) : flows0;
  const L0 = leftRoots(est, flows), R0 = rightRoots(est, flows);
  const L = expand(L0, open, est, inv, flows), R = expand(R0, open, est, inv, flows);
  const scale = (nd) => opts.t == null ? nd : { ...nd, v: nd.v * shapeAt(nd.key, opts.t), fabV: nd.fabV * shapeAt(nd.key, opts.t) };
  const Ls = L.map(scale), Rs = R.map(scale);
  const W = 900, colW = 12, minH = 14, pad = 5, headH = 18, gap = 22, top = 20, H0 = 340;
  const groups = [['sites', 'Sites · first mile'], ['tags', 'Cloud workloads by tag'], ['c2c', 'Cloud to cloud']].map(([g, head]) => ({ g, head, nodes: Ls.filter(x => (x.group || rootGroup(x)) === g) })).filter(x => x.nodes.length);
  const T = Ls.reduce((a, x) => a + x.v, 0) || 1, fabV = Ls.reduce((a, x) => a + x.fabV, 0);
  const nLeft = Ls.length; const overhead = top + groups.length * (headH + gap) + (nLeft - groups.length) * pad;
  const sc = Math.max(0.5, (H0 - overhead) / T);
  const place = (arr, x, y0) => { let y = y0; return arr.map(a => { const h = Math.max(minH, a.v * sc); const o = { ...a, x, y, h, x2: x + colW, used: 0 }; y += h + pad; return o; }); };
  const heads = []; const SS = []; let y = top;
  groups.forEach(g => { heads.push({ x: 0, y: y - 4, anchor: 'start', text: g.head }); const placed = place(g.nodes, 0, y + headH - 6); SS.push(...placed); y = placed[placed.length - 1].y + placed[placed.length - 1].h + gap; });
  const leftH = SS.length ? y - gap + 8 : top;
  heads.push({ x: W, y: top - 4, anchor: 'end', text: 'Destinations' });
  const DD = place(Rs, W - colW, top + headH - 6);
  const rightH = DD.length ? DD[DD.length - 1].y + DD[DD.length - 1].h + 8 : top;
  const H = Math.max(leftH, rightH, H0);
  const mids = [{ kind: 'mid', key: 'mid:fabric', name: 'AT&T fabric', v: fabV, fabV, priv: true, state: 'ok', hasChildren: false }, { kind: 'mid', key: 'mid:public', name: 'Outside the fabric', v: T - fabV, fabV: 0, priv: false, state: 'ok', hasChildren: false }].filter(m => m.v > 0.001);
  const midH = mids.reduce((a, m) => a + Math.max(minH, m.v * sc), 0) + pad * (mids.length - 1);
  const MM = place(mids, W / 2 - colW / 2, Math.max(top, (H - midH) / 2));
  const ribbons = [];
  const link = (a, b, v, priv) => { if (v <= 0.0005) return; const sa = a.h / (a.v || 1), sb = b.h / (b.v || 1); const ay = a.y + a.used * sa, by = b.y + b.used * sb, ah = v * sa, bh = v * sb; a.used += v; b.used += v; const mx = (a.x2 + b.x) / 2; ribbons.push({ d: `M${a.x2},${ay} C${mx},${ay} ${mx},${by} ${b.x},${by} L${b.x},${by + bh} C${mx},${by + bh} ${mx},${ay + ah} ${a.x2},${ay + ah} Z`, priv, v, from: a.key, to: b.key, state: priv ? 'ok' : (a.state !== 'ok' ? a.state : b.state), delta: deltaOf(a.key + '>' + b.key) }); };
  const fab = MM.find(m => m.priv), pub = MM.find(m => !m.priv);
  SS.forEach(s => { if (fab) link(s, fab, s.fabV, true); if (pub) link(s, pub, s.v - s.fabV, false); });
  DD.forEach(d => { if (fab) link(fab, d, d.fabV, true); if (pub) link(pub, d, d.v - d.fabV, false); });
  const nodes = [...SS.map(x => ({ ...x, side: 'l' })), ...MM.map(x => ({ ...x, side: 'm' })), ...DD.map(x => ({ ...x, side: 'r' }))].map(x => ({ ...x, delta: deltaOf(x.key), open: open.has(x.key) }));
  return { W, H, heads, nodes, ribbons, total: T, fabV, open: [...open] };
}
function rootGroup(x) { return x.kind === 'site' || x.kind === 'metro' || x.kind === 'sitename' || x.kind === 'circuit' ? 'sites' : x.kind === 'c2c' ? 'c2c' : 'tags'; }

/** The trail for a key: every ancestor's name, root first. */
export function trail(key, est, inv, flows) {
  const parts = key.split('/'); const out = []; let acc = '';
  const roots = [...leftRoots(est, flows), ...rightRoots(est, flows)];
  let node = null;
  for (let i = 0; i < parts.length; i++) { acc = i ? acc + '/' + parts[i] : parts[i]; node = i === 0 ? roots.find(r => r.key === acc) : (node ? childrenOf(node, est, inv, flows).find(c => c.key === acc) : null); if (!node) break; out.push({ key: acc, name: node.name, kind: node.kind }); }
  return out;
}

/** Keys that a hovered or selected node lights: itself, its ribbons, the mids they touch. */
export function litFor(map, key) {
  if (!key) return null;
  // An opened node is gone from the map; its descendants stand for it.
  const present = map.nodes.some(x => x.key === key);
  const isMine = (k) => present ? k === key : (k === key || k.startsWith(key + '/'));
  const rb = map.ribbons.filter(r => isMine(r.from) || isMine(r.to));
  const keys = new Set([key, ...map.nodes.filter(x => isMine(x.key)).map(x => x.key), ...rb.map(r => r.from), ...rb.map(r => r.to)]);
  return { keys, ribbons: new Set(rb.map((r, i) => map.ribbons.indexOf(r))) };
}
