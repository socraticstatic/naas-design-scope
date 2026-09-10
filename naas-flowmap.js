/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
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
  (est.sites || []).forEach(s => { const cls = S.accessOf(s); const c = S.ACCESS_CLASS[cls]; const count = S.countOf(s.name); const v = (PER_SITE[S.classOf(s)] || 0.5) * count; const g = sg[cls] = sg[cls] || { kind: 'site', key: 'site:' + cls, cls, unit: c.unit, plural: c.plural, count: 0, v: 0, fabV: 0 }; g.count += count; g.v += v; g.fabV += s.priv ? v : v * 0.1; });
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
    // Children of a first-mile group are the sites on it, by metro where a
    // metro holds more than one. siteTree groups by building class, which is
    // exactly the thing the network cannot see, so this descends on its own.
    const mine = (est.sites || []).filter(x => S.accessOf(x) === node.cls);
    if (!mine.length) return [];
    // A row that stands for many sites ("Remote sites (212)") carries no real
    // metro; siteTree already splits those into the metros they are in, so
    // borrow them rather than lumping 212 buildings under "Various".
    const tree = S.siteTree(est);
    const byMetro = {};
    mine.forEach(x => {
      const count = S.countOf(x.name);
      const cls = S.classOf(x);
      const kids = count > 1 ? ((tree.find(c => c.cls === cls) || {}).children || []).filter(k => k.kind === 'metro') : [];
      if (kids.length) {
        kids.forEach(k => {
          const g = byMetro[k.name] = byMetro[k.name] || { metro: k.name, count: 0, onFabric: 0, only: null, cls };
          g.count += k.count; g.onFabric += k.onFabric || 0;
        });
        return;
      }
      const m = x.metro || 'Various';
      const g = byMetro[m] = byMetro[m] || { metro: m, count: 0, onFabric: 0, only: x, cls };
      g.count += count; g.onFabric += x.priv ? count : 0; if (g.count > count) g.only = null;
    });
    const per = PER_SITE[S.classOf(mine[0])] || 0.5;
    return Object.values(byMetro).map(g => g.only && g.count === 1
      ? { kind: 'sitename', key: `${node.key}/${g.only.name}`, cls: node.cls, siteName: g.only.name, name: g.only.name, sub: g.only.access, v: per, fabV: g.only.priv ? per : per * 0.1, hasChildren: false, state: g.only.priv ? 'ok' : 'slo', parentKey: node.key }
      : { kind: 'metro', key: `${node.key}/${g.metro}`, cls: node.cls, siteCls: g.cls || S.classOf(mine[0]), metro: g.metro, count: g.count, name: `${g.metro} · ${n(g.count)}`, v: per * g.count, fabV: per * g.onFabric, hasChildren: true, state: g.onFabric < g.count / 2 ? 'slo' : 'ok', parentKey: node.key }
    ).sort((a, b) => b.v - a.v);
  }
  if (node.kind === 'metro') {
    const cls = S.siteTree(est).find(c => c.cls === node.cls); const m = cls && cls.children.find(ch => ch.kind === 'metro' && ch.name === node.metro); if (!m) return [];
    const per = PER_SITE[node.cls] || 0.5;
    const rows = m.sites.map(x => ({ kind: 'sitename', key: `${node.key}/${x.id}`, cls: node.cls, siteName: x.id, name: x.id, sub: x.address, v: per, fabV: x.priv ? per : per * 0.1, hasChildren: false, state: x.priv ? 'ok' : 'slo', parentKey: node.key }));
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
    return ir.vpcs.map(v => ({ kind: 'vpc', key: `${node.key}/${v.id}`, panelSel: `vpc:${rname}|${v.id}`, tag: node.tag, regionName: rname, vpcId: v.id, name: v.name, sub: `${v.purpose} · ${n(v.wl)} workloads`, v: node.v * v.wl / sum, fabV: node.v * v.wl / sum * (v.priv ? Math.max(fabShare, 0.9) : Math.min(fabShare, 0.1)), hasChildren: true, state: v.priv ? stateOfRegion(est, rname) : 'slo', parentKey: node.key }));
  }
  if (node.kind === 'vpc') {
    const ir = invRegion(inv, node.regionName); const vpc = ir && ir.vpcs.find(v => v.id === node.vpcId); if (!vpc) return [];
    const sum = vpc.subnets.reduce((a, s) => a + s.wl, 0) || 1; const fabShare = node.v ? node.fabV / node.v : 0;
    return vpc.subnets.map(sn => ({ kind: 'subnet', key: `${node.key}/${sn.id}`, panelSel: `sn:${node.regionName}|${node.vpcId}|${sn.id}`, regionName: node.regionName, vpcId: node.vpcId, subnetId: sn.id, name: sn.name, sub: `${sn.cidr} · ${sn.az} · ${n(sn.wl)} workloads`, v: node.v * sn.wl / sum, fabV: node.v * sn.wl / sum * (sn.pub ? Math.min(fabShare, 0.2) : fabShare), hasChildren: true, state: sn.pub ? 'slo' : stateOfRegion(est, node.regionName), parentKey: node.key }));
  }
  if (node.kind === 'subnet') {
    const ir = invRegion(inv, node.regionName); const vpc = ir && ir.vpcs.find(v => v.id === node.vpcId); const sn = vpc && vpc.subnets.find(x => x.id === node.subnetId); if (!sn) return [];
    const all = sn.workloads || []; const ws = all.slice(0, 6); const each = node.v / Math.max(1, all.length); const fabShare = node.v ? node.fabV / node.v : 0;
    const rows = ws.map(w => ({ kind: 'workload', key: `${node.key}/${String(w.id).replace(/\//g, '_')}`, regionName: node.regionName, wlSel: `wl:${node.regionName}|${node.vpcId}|${w.id}`, panelSel: `wl:${node.regionName}|${node.vpcId}|${w.id}`, name: `${w.tag || vpc.name}/${w.name}`, sub: `${w.type} · ${(w.endpoints || []).map(e => e.app).slice(0, 2).join(', ') || w.ip}`, ip: w.ip, resource: `${w.tag || vpc.name}/${w.name}`, v: each, fabV: each * (w.exposed ? Math.min(fabShare, 0.1) : fabShare), hasChildren: false, state: w.exposed ? 'slo' : 'ok', parentKey: node.key }));
    // The map samples six and hands the rest to the drawer, exactly as the
    // site side already does with its 'more' node. Same door, other column.
    if (all.length > rows.length) rows.push({ kind: 'wlmore', key: `${node.key}/wlmore`, regionName: node.regionName, vpcId: node.vpcId, subnetId: node.subnetId, name: `See all ${all.length} workloads`, sub: 'every app in this subnet', v: each * (all.length - rows.length), fabV: each * (all.length - rows.length) * fabShare, hasChildren: false, state: 'ok', parentKey: node.key });
    return rows;
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
  // Below the roots, an open node's siblings fold into one row so the map's height stays bounded at volume (Micah, 16:23).
  const CAP = 6;
  const openHere = depth > 0 ? list.filter(nd => open.has(nd.key) && nd.hasChildren) : [];
  let fold = openHere.length ? list.filter(nd => !open.has(nd.key)) : [];
  let keep = openHere.length ? list.filter(nd => open.has(nd.key)) : list;
  // Nothing open at this level: keep the largest few and fold the tail, so a
  // level with thirty rows is readable before you have touched anything.
  if (!openHere.length && keep.length > CAP) {
    const ranked = keep.slice().sort((a, b) => b.v - a.v);
    keep = ranked.slice(0, CAP);
    fold = ranked.slice(CAP);
  }
  const out = keep.flatMap(nd => { const node = { ...nd, depth, group: nd.group || rootGroup(nd) }; if (open.has(node.key) && node.hasChildren) { const kids = childrenOf(node, est, inv, flows).map(k => ({ ...k, group: node.group })); return kids.length ? expand(kids, open, est, inv, flows, depth + 1) : [node]; } return [node]; });
  if (fold.length) { const first = openHere[0] || keep[0] || fold[0]; const kindWord = { metro: 'metros', sitename: 'sites', site: 'first miles', tag: 'workload tags', c2c: 'cloud pairs', tagregion: 'regions', vpc: 'VPCs', subnet: 'subnets', workload: 'workloads', endpoint: 'endpoints', dest: 'destinations' }[fold[0].kind] || ''; out.push({ kind: 'rollup', key: `${(fold[0].parentKey || (first && first.key ? first.key.split('/')[0] : 'lvl' + depth))}/rollup`, name: kindWord ? `+${fold.length} other ${kindWord}` : `+${fold.length} others`, sub: 'click to fold back', v: fold.reduce((a, x) => a + x.v, 0), fabV: fold.reduce((a, x) => a + x.fabV, 0), hasChildren: false, state: 'ok', depth, group: fold[0].group || rootGroup(fold[0]), parentKey: fold[0].parentKey, foldsKey: first && first.key ? first.key : null, tailOnly: !openHere.length }); }
  return out;
}

/** The map. open: keys to expand. filterRegion: keep only what touches a region. t: 0..1 scrubber, null = window. */
export function buildMap(est, inv, flows0, opts = {}) {
  const open = new Set(opts.open || []);
  const flows = opts.filterRegion ? flows0.filter(f => (f.region || '').includes(opts.filterRegion) || f.name.includes(opts.filterRegion)) : flows0;
  const L0 = leftRoots(est, flows), R0 = rightRoots(est, flows);
  const L = expand(L0, open, est, inv, flows), R = expand(R0, open, est, inv, flows);
  const scale = (nd) => opts.t == null ? nd : { ...nd, v: nd.v * shapeAt(nd.key, opts.t), fabV: nd.fabV * shapeAt(nd.key, opts.t) };
  // Ramesh's first pattern (19:09): what stays within the region. Workload groups carry east-west traffic that never leaves the region; it gets its own band.
  const LOCAL = 0.6;
  const Ls = L.map(scale).map(x => x.group === 'tags' || (!x.group && rootGroup(x) === 'tags') ? { ...x, locV: x.v * LOCAL } : { ...x, locV: 0 });
  const localV = Ls.reduce((a, x) => a + (x.locV || 0), 0);
  const Rs = [...R.map(scale), ...(localV > 0.001 ? [{ kind: 'dest', key: 'dest:local', name: 'Same region (east-west)', v: localV, fabV: 0, locV: localV, hasChildren: false, state: 'ok' }] : [])];
  const W = 900, colW = 12, minH = 14, pad = 5, headH = 16, gap = 14, top = 20, H0 = 500;
  const groups = [['sites', 'First mile · from sites'], ['tags', 'First mile · from cloud workloads'], ['c2c', 'First mile · cloud to cloud']].map(([g, head]) => ({ g, head, nodes: Ls.filter(x => (x.group || rootGroup(x)) === g) })).filter(x => x.nodes.length);
  const T = Ls.reduce((a, x) => a + x.v + (x.locV || 0), 0) || 1, fabV = Ls.reduce((a, x) => a + x.fabV, 0);
  // Fixed frame (Micah, 16:35: "zoom on click"): the map keeps its height. With a zoom, the focused subtree takes
  // 55 percent of the row budget and everything else compresses into the rest; ribbons taper, so they still attach.
  const nLeft = Ls.length;
  const zoom = opts.zoom || null;
  const inZoom = (k) => !!zoom && (k === zoom || k.startsWith(zoom + '/'));
  const rowsBudget = (n, nGroups) => Math.max(100, H0 - top - nGroups * (headH + gap) - Math.max(0, n - nGroups) * pad);
  const subTot = zoom ? [...Ls, ...Rs].filter(x => inZoom(x.key) && x.kind !== 'more').reduce((a, x) => a + x.v + (x.locV || 0), 0) : 0;
  const scBase = Math.max(0.05, rowsBudget(nLeft, groups.length) / T);
  const zf = subTot > 0 ? Math.max(1, (rowsBudget(nLeft, groups.length) * 0.55) / (subTot * scBase)) : 1;
  const heightsFor = (arr, budgetPx) => {
    const nZ = arr.filter(x => inZoom(x.key) && x.kind !== 'more').length, nO = arr.filter(x => !inZoom(x.key) && x.kind !== 'more').length, nM = arr.filter(x => x.kind === 'more').length;
    const bz = nZ ? budgetPx * 0.55 : 0, bo = budgetPx - bz - nM * 18;
    const tz = arr.filter(x => inZoom(x.key) && x.kind !== 'more').reduce((a, x) => a + x.v + (x.locV || 0), 0) || 1;
    const to = arr.filter(x => !inZoom(x.key) && x.kind !== 'more').reduce((a, x) => a + x.v + (x.locV || 0), 0) || 1;
    const minZ = nZ ? Math.max(12, Math.min(22, Math.floor(bz / nZ))) : 12, minOh = nO ? Math.max(7, Math.min(14, Math.floor(bo / nO))) : 7;
    let rows = arr.map(x => { const tot = x.v + (x.locV || 0); const z = inZoom(x.key) && x.kind !== 'more'; const h = x.kind === 'more' ? 18 : z ? Math.max(minZ, tot / tz * bz) : Math.max(minOh, tot / to * (nZ ? bo : budgetPx)); return { ...x, h, tot, zoomed: z }; });
    const sum = rows.reduce((a, r) => a + r.h, 0);
    if (sum > budgetPx && sum > 0) { const f = budgetPx / sum; rows = rows.map(r => ({ ...r, h: Math.max(7, r.h * f) })); }
    return rows;
  };
  const layout = (rows, x, y0) => { let y = y0; return rows.map(r => { const o = { ...r, x, y, x2: x + colW, used: 0 }; y += o.h + pad; return o; }); };
  const leftRows = heightsFor(Ls, rowsBudget(nLeft, groups.length));
  const heads = []; const SS = []; let y = top;
  groups.forEach(g => { heads.push({ x: 0, y: y - 4, anchor: 'start', text: g.head }); const mine = leftRows.filter(r => g.nodes.some(n0 => n0.key === r.key)); const placed = layout(mine, 0, y + headH - 6); SS.push(...placed); if (placed.length) y = placed[placed.length - 1].y + placed[placed.length - 1].h + gap; });
  const leftH = SS.length ? y - gap + 8 : top;
  heads.push({ x: W, y: top - 4, anchor: 'end', text: 'Destinations' });
  heads.push({ x: W / 2, y: top - 4, anchor: 'middle', text: 'Mid mile' });
  const DD = layout(heightsFor(Rs, rowsBudget(Rs.length, 1)), W - colW, top + headH - 6);
  const rightH = DD.length ? DD[DD.length - 1].y + DD[DD.length - 1].h + 8 : top;
  const H = Math.max(leftH, rightH, H0);
  const mids = [{ kind: 'mid', key: 'mid:fabric', name: 'AT&T fabric', v: fabV, fabV, priv: true, state: 'ok', hasChildren: false }, { kind: 'mid', key: 'mid:public', name: 'Outside the fabric', v: T - fabV - localV, fabV: 0, priv: false, state: 'ok', hasChildren: false }].filter(m => m.v > 0.001);
  const midBudget = rowsBudget(mids.length, 0) - 40;
  const MMh = mids.map(m => ({ ...m, tot: m.v, h: Math.max(minH, m.v / (T || 1) * midBudget) }));
  const midH = MMh.reduce((a, m) => a + m.h, 0) + pad * (MMh.length - 1);
  const MM = layout(MMh, W / 2 - colW / 2, Math.max(top, (H - midH) / 2));
  const ribbons = [];
  const patternOf = (a, b) => { const g = a.group || rootGroup(a); if (b.key === 'dest:local') return 'region'; if (g === 'sites' || b.key === 'dest:regions') return 'inbound'; if (g === 'c2c' || /inter-cloud/.test(b.name || '')) return 'clouds'; if (/object storage/.test(b.name || '')) return 'regions'; if (/AI endpoints|public internet/.test(b.name || '')) return 'internet'; return a.side === 'l' || a.kind !== 'mid' ? 'mixed' : 'mixed'; };
  const link = (a, b, v, priv, kindOverride) => { if (v <= 0.0005) return; const sa = a.h / (a.tot || a.v || 1), sb = b.h / (b.tot || b.v || 1); const ay = a.y + a.used * sa, by = b.y + b.used * sb, ah = v * sa, bh = v * sb; a.used += v; b.used += v; const mx = (a.x2 + b.x) / 2; ribbons.push({ d: `M${a.x2},${ay} C${mx},${ay} ${mx},${by} ${b.x},${by} L${b.x},${by + bh} C${mx},${by + bh} ${mx},${ay + ah} ${a.x2},${ay + ah} Z`, priv, local: !!kindOverride, v, from: a.key, to: b.key, state: kindOverride ? 'ok' : priv ? 'ok' : (a.state !== 'ok' ? a.state : b.state), delta: deltaOf(a.key + '>' + b.key), pattern: kindOverride || patternOf(a, b) }); };
  const fab = MM.find(m => m.priv), pub = MM.find(m => !m.priv);
  const localDest = DD.find(d => d.key === 'dest:local');
  // Traffic that starts and ends inside one region crosses no mid mile, so it
  // is drawn straight across, under the band, instead of being given a middle
  // node that misrepresents it as a path you could buy.
  SS.forEach(s => { if (fab) link(s, fab, s.fabV, true); if (pub) link(s, pub, s.v - s.fabV, false); if (localDest && s.locV) link(s, localDest, s.locV, false, 'region'); });
  DD.forEach(d => { if (d.key === 'dest:local') return; if (fab) link(fab, d, d.fabV, true); if (pub) link(pub, d, d.v - d.fabV, false); });
  const nodes = [...SS.map(x => ({ ...x, side: 'l' })), ...MM.map(x => ({ ...x, side: 'm' })), ...DD.map(x => ({ ...x, side: 'r' }))].map(x => ({ ...x, delta: deltaOf(x.key), open: open.has(x.key) }));
  return { W, H, heads, nodes, ribbons, total: T, fabV, localV, open: [...open], zoom, zf };
}
function rootGroup(x) { return x.kind === 'site' || x.kind === 'metro' || x.kind === 'sitename' || x.kind === 'circuit' ? 'sites' : x.kind === 'c2c' ? 'c2c' : 'tags'; }

/** The trail for a key: every ancestor's name, root first. */
export function trail(key, est, inv, flows) {
  const parts = key.split('/'); const out = []; let acc = '';
  const roots = [...leftRoots(est, flows), ...rightRoots(est, flows)];
  let node = null;
  for (let i = 0; i < parts.length; i++) { acc = i ? acc + '/' + parts[i] : parts[i]; node = i === 0 ? roots.find(r => r.key === acc) : (node ? childrenOf(node, est, inv, flows).find(c => c.key === acc) : null); if (!node) break; out.push({ key: acc, name: node.name, kind: node.kind, node }); }
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

/** The five patterns Ramesh named (19:04), in his order. */
export const PATTERNS = [
  ['region', 'In the region', 'Traffic that starts and ends inside one cloud region. It never crosses a region boundary, so it costs nothing in egress.'],
  ['regions', 'Across regions', 'Traffic between two regions of the SAME cloud — us-east-1 to us-west-2. It leaves a region, so the hyperscaler bills egress on it.'],
  ['clouds', 'Across clouds', 'Traffic between DIFFERENT clouds — AWS to Azure. Billed egress at both ends unless it rides the AT&T fabric.'],
  ['internet', 'To the internet', 'Traffic leaving your estate for the public internet or SaaS. The most expensive path per GB and the least visible.'],
  ['inbound', 'Coming in', 'Traffic arriving from your sites and users into the cloud. Usually free to receive; the first mile decides how fast it is.'],
];
/** Ribbon indexes and node keys a pattern lights. Mid nodes light when any of their ribbons do. */
export function patternLit(map, pattern) {
  if (!pattern || pattern === 'all') return null;
  const idx = new Set(); const keys = new Set();
  map.ribbons.forEach((r, i) => { if (r.pattern === pattern) { idx.add(i); keys.add(r.from); keys.add(r.to); } });
  // second hop: a destination lit by the pattern also lights the mid→dest ribbons of the same pattern (already tagged), and sources feeding a lit mid keep their own tag.
  return { ribbons: idx, keys };
}
