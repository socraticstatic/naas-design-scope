/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-connections.js — the network layer on Observe and what it means for
// the workloads behind it. Pure data. Added 2026-09-09 after Ramesh's review:
// "you had five connections of which one is experiencing this problem. Here
// are the workloads that are impacted. These workloads are also talking to
// these other workloads."
import * as P from './naas-paths.js';

const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rnd = (seed) => { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; };
const ATT_TERMINATED = new Set(['NetBond', 'EQX', 'hosted']);
const FAB = '#0057b8', PUB = '#8a949c';
const n = (x) => x.toLocaleString('en-US');

/** 24-point utilization line in a 100x24 box, seeded so it never jitters between renders. */
export function sparkline(seed, points = 24, base = 50, amp = 20) {
  const r = rnd(hash(seed) || 1); let v = base;
  const pts = Array.from({ length: points }, (_, i) => { v = Math.max(2, Math.min(98, v + (r() - 0.5) * amp)); return [i / (points - 1) * 100, 24 - v / 100 * 22 - 1]; });
  return pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
}

const ORDER = { Degraded: 0, Saturating: 1, Up: 2 };

/** One row per attached region: what NetBond Advanced's monitor shows, plus what was purchased. */
export function connections(est, ob) {
  const util = ob.utilRows || [];
  const rows = est.regionsList.filter(r => r.priv).map(r => {
    const u = util.find(x => x.region === r.region) || { gbps: 0, ports: 1, cap: 10, pct: 0 };
    const degraded = r.link === 'degraded';
    const pct = degraded ? Math.max(u.pct, 62) : u.pct;
    const state = degraded ? 'Degraded' : pct >= 80 ? 'Saturating' : 'Up';
    const ramp = r.ramp || 'NetBond';
    return { id: 'cx-' + r.region, cloud: r.cloud, region: r.region, ramp, ports: u.ports, cap: u.cap, gbps: u.gbps, avg: +(u.gbps * 0.82).toFixed(1), pct, state, bgp: degraded ? 'Flapping' : 'Established', drops: degraded ? '0.31%' : state === 'Saturating' ? '0.04%' : '0.00%', inD: sparkline(r.region + ':in', 24, pct, degraded ? 34 : 12), outD: sparkline(r.region + ':out', 24, Math.max(4, pct - 18), degraded ? 30 : 10), wl: r.wl, terminated: ATT_TERMINATED.has(ramp) ? 'att' : 'own', paths: r.paths || 1, acct: r.acct || null, hot: pct >= 80, degraded };
  }).sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.pct - a.pct);
  return { rows, degraded: rows.filter(r => r.degraded).length, total: rows.length };
}

/** What a connection's state means for the workloads behind it, with the honesty the data allows (Dev, 10:05). */
export function impacted(est, inv, row) {
  if (!row) return { kind: 'none', certainty: '', resilience: '', vpcs: [], downstream: [], wl: 0 };
  const regionsOf = inv.flatMap(c => c.regions);
  const reg = regionsOf.find(r => r.region === row.region);
  const vpcs = (reg ? reg.vpcs : []).map(v => ({ name: v.name, wl: v.wl, tags: v.tags.slice(0, 2) }));
  const partners = (est.arcs || []).filter(a => a.from === row.region || a.to === row.region).map(a => a.from === row.region ? a.to : a.from);
  const downstream = partners.map(p => { const pr = est.regionsList.find(r => r.region === p); const pi = regionsOf.find(r => r.region === p); return pr ? { label: `${pr.cloud} ${pr.region}`, vpcs: (pi ? pi.vpcs : []).slice(0, 2).map(v => ({ name: v.name, wl: v.wl })) } : null; }).filter(Boolean);
  const wl = vpcs.reduce((a, v) => a + v.wl, 0);
  if (!row.degraded) return { kind: 'none', certainty: `No impact. ${n(wl)} workloads reach the fabric through this connection at ${row.pct}% utilization.`, resilience: '', vpcs, downstream, wl };
  const direct = row.terminated === 'att';
  const certainty = direct ? 'Directly impacted. AT&T terminates this connection in your VPC.' : `Possible impact. Visibility ends at your gateway. ${row.cloud} ${row.acct || 'account'}.`;
  const resilience = row.paths >= 2 ? `Access holds: a second path carries ${row.gbps} Gbps at ${Math.min(99, row.pct * 2)}% while this one degrades.` : 'Single path. Access to these workloads is lost if this link fails.';
  return { kind: direct ? 'direct' : 'possible', certainty, resilience, vpcs, downstream, wl };
}

const bar = (rows) => { const m = Math.max(0.001, ...rows.map(r => r.gbps)); return rows.map(r => ({ ...r, w: Math.round(r.gbps / m * 100) + '%' })); };
const G = (x) => x.toFixed(1) + ' Gbps';

/** The five patterns most cloud conversations center on (Ramesh, 19:04). Each row is a door into Logs. */
export function patterns(est, ob, inv) {
  const rs = est.regionsList, flows = ob.flows || [];
  const legend = [{ label: 'On the fabric', fill: FAB }, { label: 'Public internet', fill: PUB }];
  const pathWord = (c) => c ? 'on the fabric' : 'public internet';
  const region = bar(rs.map(r => ({ key: r.region, name: `${r.cloud} ${r.region}`, sub: `${n(r.wl)} workloads · between VPCs`, gbps: +(r.wl * 0.14 * 0.6).toFixed(1), priv: r.priv, fill: r.priv ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  const regions = bar(flows.filter(f => f.to === 'object storage').map(f => ({ key: f.id, name: `${f.from} → object storage`, sub: `${f.region} · ${pathWord(f.controlled)} · ${f.latency} ms`, gbps: f.gbps, priv: f.controlled, fill: f.controlled ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  const clouds = bar(flows.filter(f => f.kind !== 'App').map(f => ({ key: f.id, name: f.name, sub: `${pathWord(f.controlled)} · ${f.latency} ms`, gbps: f.gbps, priv: f.controlled, fill: f.controlled ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  const internet = bar(flows.filter(f => f.kind === 'App' && f.to !== 'object storage').map(f => ({ key: f.id, name: f.name, sub: `${f.region} · ${f.controlled ? 'AT&T egress' : 'hyperscaler exit'} · $${f.perGb.toFixed(2)}/GB`, gbps: f.gbps, priv: f.controlled, fill: f.controlled ? FAB : PUB })).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: G(r.gbps) }));
  const sites = P.allSites(est);
  const inbound = bar(sites.map(st => ({ key: st.id || st.name, name: st.name, sub: `${st.access || 'Access'} · ${st.priv ? 'private first mile' : 'public first mile'}`, gbps: +rs.reduce((a, r) => a + P.gbps(est, st, r), 0).toFixed(2), priv: !!st.priv, fill: st.priv ? FAB : PUB })).filter(x => x.gbps > 0).sort((a, b) => b.gbps - a.gbps).slice(0, 5)).map(r => ({ ...r, v: r.gbps >= 1 ? G(r.gbps) : Math.round(r.gbps * 1000) + ' Mbps' }));
  // Each pattern answers the three questions Ramesh named (19:18): connectivity, security, cost.
  const mk = (key, title, rows, word) => {
    const onFab = rows.filter(r => r.priv).length, pub = rows.length - onFab;
    const gb = rows.reduce((a, r) => a + r.gbps, 0), pubGb = rows.filter(r => !r.priv).reduce((a, r) => a + r.gbps, 0);
    const perGb = gb ? ((pubGb * 0.09 + (gb - pubGb) * 0.02) / gb) : 0;
    return { key, title, rows, legend, total: gb, sub: rows.length ? `${onFab} of ${rows.length} ${word} on the fabric · ${pub ? pub + ' uninspected' : 'all inspected'} · $${perGb.toFixed(2)}/GB` : 'Nothing in this window', connectivity: `${onFab} of ${rows.length} on the fabric`, security: pub ? `${pub} with no inspection point` : 'every path has an inspection point', cost: `$${perGb.toFixed(2)}/GB blended` };
  };
  return [mk('region', 'Stays in the region', region, 'regions'), mk('regions', 'Across regions', regions, 'flows'), mk('clouds', 'Across clouds', clouds, 'paths'), mk('internet', 'Out to the internet', internet, 'flows'), mk('inbound', 'Coming in', inbound, 'sites')];
}

/** Private ip → resource name through the discovery tree; public stays null (Santosh, 19:51). */
export function resolveDest(inv, ip) {
  for (const c of inv) for (const r of c.regions) for (const v of r.vpcs) for (const s of v.subnets) for (const w of s.workloads || []) if (w.ip === ip) return { name: `${w.tag || v.name}/${w.name}`, sub: `${ip} · ${w.type} · ${r.region}` };
  return null;
}

const money = (x) => '$' + Math.round(x).toLocaleString('en-US');

/** The four launch-off points (Ramesh, 23:09). New customers start at Connect; everyone else at Observe. */
export function launchCards({ est, ob, conns, totalSave, violations, isEmpty }) {
  const rs = est.regionsList, pub = rs.filter(r => !r.priv).length;
  const degRow = conns.rows.find(r => r.degraded);
  return [
    { key: 'connect', label: 'Connect', value: isEmpty ? 'Nothing connected yet' : `${pub} of ${rs.length} regions`, sub: isEmpty ? 'Start here' : pub ? 'still ride the public internet' : 'every region on the fabric', bar: isEmpty ? null : Math.round((rs.length - pub) / (rs.length || 1) * 100) },
    { key: 'observe', label: 'Observe', value: isEmpty ? 'No telemetry yet' : `${conns.degraded} of ${conns.total} connections`, sub: isEmpty ? 'starts with the first attach' : degRow ? `degraded · ${n(degRow.wl)} workloads impacted` : `healthy · ${(ob.fab || 0).toFixed(1)} Gbps on the fabric`, bar: null },
    { key: 'govern', label: 'Govern', value: isEmpty ? 'No policies yet' : n(violations), sub: isEmpty ? 'three starting points' : `policy violations across ${(est.policies || []).length} policies`, bar: null },
    { key: 'cost', label: 'Cost', value: isEmpty ? 'No egress seen yet' : totalSave ? money(totalSave) + '/mo' : money(ob.savingsMo || 0) + '/mo', sub: isEmpty ? 'priced after the scan' : totalSave ? `on the table across ${est.findings.filter(f => f.priced).length} findings` : 'already saved on the fabric', bar: null },
  ].map(c => {
    const primary = isEmpty ? c.key === 'connect' : c.key === 'observe';
    const door = { connect: isEmpty ? 'Connect a cloud' : pub ? `Attach the ${pub === 1 ? 'region' : pub + ' regions'}` : 'See the fabric', observe: isEmpty ? 'Open Observe' : degRow ? 'What is impacted' : 'See the traffic', govern: isEmpty ? 'Start a policy' : violations ? 'Review violations' : 'Review policies', cost: isEmpty ? 'Open Cost' : 'See the savings' }[c.key];
    return { ...c, primary, door, eyebrow: primary ? (isEmpty ? 'Start here · new to the fabric' : 'Start here · you are connected') : '' };
  });
}

const PROTO = ['tcp/443', 'tcp/5432', 'tcp/8080', 'udp/53', 'tcp/6379', 'tcp/22'];
const PUBLIC_DST = [['52.94.236.248', 's3 · public'], ['104.18.32.7', 'unresolved · public'], ['20.60.132.10', 'blob · public'], ['142.250.72.14', 'unresolved · public'], ['3.5.140.2', 'unresolved · public']];
const PATTERN_OF = { region: 'region', regions: 'regions', clouds: 'clouds', internet: 'internet', inbound: 'inbound' };

/** Per-flow records for Logs, one pattern each; private destinations carry the resource name, public ones stay an ip. */
export function records(est, inv, ob, pattern = 'all') {
  const regionsOf = inv.flatMap(c => c.regions);
  if (!regionsOf.length) return [];
  const wls = regionsOf.flatMap(r => r.vpcs.flatMap(v => v.subnets.flatMap(s => (s.workloads || []).map(w => ({ ...w, region: r.region, cloud: r.cloud, priv: r.priv, vpc: v.name })))));
  const pick = (seed, arr) => arr[hash(seed) % arr.length];
  const sites = P.allSites(est);
  const out = [];
  const push = (id, pat, src, dst, path, action, seed) => out.push({ id, pattern: pat, time: `14:0${hash(seed) % 10}:${String(10 + hash(seed + 'x') % 50)}`, srcName: src.name, srcSub: src.sub, dstName: dst.name, dstSub: dst.sub, proto: pick(seed + 'p', PROTO), bytes: (0.2 + (hash(seed + 'b') % 900) / 100).toFixed(1) + ' GB', path, action, deny: action === 'deny' });
  const wlRef = (w) => ({ name: `${w.tag || w.vpc}/${w.name}`, sub: `${w.ip} · ${w.region}` });
  const hit = (ip) => resolveDest(inv, ip);
  regionsOf.slice(0, 4).forEach((r, i) => {
    const mine = wls.filter(w => w.region === r.region); if (mine.length < 2) return;
    const a = mine[0], b = mine[Math.min(3, mine.length - 1)];
    push(`rec-region-${i}`, 'region', wlRef(a), hit(b.ip) || { name: b.ip, sub: 'unresolved' }, r.priv ? 'private' : 'public', 'allow', `r${i}`);
    const other = wls.find(w => w.cloud === r.cloud && w.region !== r.region);
    if (other) push(`rec-regions-${i}`, 'regions', wlRef(a), hit(other.ip) || { name: other.ip, sub: 'unresolved' }, r.priv && other.priv ? 'private' : 'public', 'allow', `x${i}`);
    const xc = wls.find(w => w.cloud !== r.cloud);
    if (xc) push(`rec-clouds-${i}`, 'clouds', wlRef(a), hit(xc.ip) || { name: xc.ip, sub: 'unresolved' }, r.priv && xc.priv ? 'private' : 'public', 'allow', `c${i}`);
    const pd = PUBLIC_DST[i % PUBLIC_DST.length];
    push(`rec-internet-${i}`, 'internet', wlRef(mine[1]), { name: pd[0], sub: pd[1] }, 'public', r.priv && (a.tag === 'pci' || a.tag === 'prod') ? 'deny' : 'allow', `n${i}`);
  });
  sites.slice(0, 4).forEach((st, i) => {
    const target = wls.find(w => w.priv) || wls[0]; if (!target) return;
    push(`rec-inbound-${i}`, 'inbound', { name: st.name, sub: `${st.access || 'Access'} · ${st.metro || ''}`.trim() }, wlRef(target), st.priv && target.priv ? 'private' : 'public', 'allow', `s${i}`);
  });
  const filtered = pattern === 'all' ? out : out.filter(r => r.pattern === PATTERN_OF[pattern]);
  return filtered.sort((a, b) => a.time.localeCompare(b.time));
}

// ---------- Drills in place (Santosh, 16:02: "I don't want to lose the context") ----------
import * as S from './naas-sites.js';

function pathsOfSite(est, site) { const sr = P.siteRegions(est, site, 6); return { level: 'path', label: `${site.name || site.id} · paths`, rows: sr.rows.map(x => ({ key: 'path:' + x.region.region, name: `${x.region.cloud} ${x.region.region}`, access: `${site.access || 'Access'} · ${P.path(site, x.region).ms} ms · ${x.region.priv ? 'AT&T fabric' : 'public internet'}`, priv: !!x.region.priv, gbps: x.gbps, leaf: true, region: x.region.region })) }; }

/** Left column of the hero for a drill trail: [] → the estate's sites; [class] → metros or named sites; [class, metro] → sites; [class, metro, site] → the site's paths. */
export function siteDrillRows(est, trail, opts = {}) {
  if (!trail || !trail.length) return null;
  const tree = S.siteTree(est);
  const all = P.allSites(est);
  const cls = tree.find(c => c.cls === trail[0] || c.label === trail[0]);
  if (!cls) { const named = all.find(x => x.name === trail[0]); return named && trail.length === 1 ? pathsOfSite(est, named) : null; }
  const siteRowOf = (x) => ({ key: 'site:' + x.id, name: x.id, access: x.address || `${x.metro} · ${x.access || ''}`, priv: !!x.priv, drillKey: x.id, rollup: false, cursor: 'pointer' });
  const pathsOf = (site) => pathsOfSite(est, site);
  const _unused = (site) => { const sr = P.siteRegions(est, site, 6); return { level: 'path', label: `${site.name || site.id} · paths`, rows: sr.rows.map(x => ({ key: 'path:' + x.region.region, name: `${x.region.cloud} ${x.region.region}`, access: `${site.access || 'Access'} · ${P.path(site, x.region).ms} ms · ${x.region.priv ? 'AT&T fabric' : 'public internet'}`, priv: !!x.region.priv, gbps: x.gbps, leaf: true, region: x.region.region })) }; };
  if (trail.length === 1) {
    const rows = cls.children.map(ch => ch.kind === 'metro'
      ? { key: 'metro:' + ch.name, name: `${ch.name} (${ch.count.toLocaleString('en-US')})`, access: `${ch.onFabric.toLocaleString('en-US')} of ${ch.count.toLocaleString('en-US')} on the fabric · ${ch.access}`, priv: ch.onFabric >= ch.count / 2, drillKey: ch.name, rollup: true, cursor: 'pointer' }
      : { key: 'site:' + ch.name, name: ch.name, access: ch.address || ch.access, priv: !!ch.priv, drillKey: ch.name, rollup: false, cursor: 'pointer' });
    return { level: cls.children[0] && cls.children[0].kind === 'metro' ? 'metro' : 'site', label: cls.label, rows };
  }
  const second = cls.children.find(ch => ch.name === trail[1] || ch.key === trail[1]);
  if (!second) return null;
  if (second.kind === 'site') return pathsOf(all.find(x => x.name === second.name) || { ...second, cls: cls.cls, clsLabel: cls.label });
  if (trail.length === 2) {
    let rows = second.sites.map(siteRowOf);
    // A site pinned from the drawer leads the sample.
    if (opts.pin && !rows.some(r => r.drillKey === opts.pin)) { const pinned = S.metroSites(second).find(x => x.id === opts.pin); if (pinned) rows = [siteRowOf(pinned), ...rows.slice(0, 5)]; }
    if (second.more) rows.push({ key: 'more', name: `+${second.more.toLocaleString('en-US')} more in ${second.name}`, access: 'open the drawer ›', more: true, rollup: false, cursor: 'pointer' });
    return { level: 'site', label: `${cls.label} · ${second.name}`, rows };
  }
  const site = all.find(x => x.id === trail[2] || x.name === trail[2]) || (second.kind === 'metro' ? S.metroSites(second).find(x => x.id === trail[2]) : null);
  return site ? pathsOf({ ...site, cls: cls.cls, clsLabel: cls.label, access: site.access || second.access }) : null;
}

/** Right column of the hero for a cloud drill: [region] → its VPCs; [region, vpc] → subnets; [region, vpc, subnet] → workloads. Other regions fold into one row. */
export function regionDrillRows(est, inv, trail) {
  if (!trail || !trail.length) return null;
  const top = est.regionsList.find(r => r.region === trail[0]); if (!top) return null;
  const reg = inv.flatMap(c => c.regions).find(r => r.region === trail[0]); if (!reg) return null;
  const pinned = { ...top, pinned: true, drillUp: true };
  const child = (o) => ({ cloud: top.cloud, region: o.name, wl: o.wl, priv: o.priv, ramp: null, child: true, noEdge: true, indent: 14, drill: o.drill || null, leaf: !!o.leaf, wlLabel: o.wlLabel || null, sub: o.sub || '' });
  let children, level, label;
  if (trail.length === 1) { level = 'vpc'; label = `${top.cloud} ${top.region}`; children = reg.vpcs.map(v => child({ name: v.name, wl: v.wl, priv: v.priv, drill: v.id, sub: v.purpose })); }
  else {
    const vpc = reg.vpcs.find(v => v.id === trail[1]); if (!vpc) return null;
    if (trail.length === 2) { level = 'subnet'; label = `${top.region} › ${vpc.name}`; children = vpc.subnets.map(sn => child({ name: `${sn.name} · ${sn.cidr}`, wl: sn.wl, priv: !sn.pub, drill: sn.id, sub: sn.az })); children.push({ ...child({ name: `See all ${vpc.subnets.reduce((t, x) => t + (x.workloads || []).length, 0)} workloads`, wl: 0, priv: true, leaf: true, sub: 'every app in this VPC' }), seeAll: true, wlScope: { region: trail[0], vpcId: trail[1], snId: null } }); }
    else {
      const sn = vpc.subnets.find(x => x.id === trail[2]); if (!sn) return null; level = 'workload'; label = `${vpc.name} › ${sn.name}`;
      const wls = sn.workloads || [];
      // The column samples; it never lies about the rest. Workloads are the
      // first level with volume, so this is where the drawer takes over.
      children = wls.slice(0, 6).map(w => ({ ...child({ name: w.name, wl: 1, priv: !w.exposed, leaf: true, wlLabel: w.ip, sub: `${w.type} · ${w.tag || 'untagged'}` }), wlSel: `wl:${trail[0]}|${trail[1]}|${w.id}` }));
      if (wls.length > children.length) children.push({ ...child({ name: `See all ${wls.length} workloads`, wl: 0, priv: true, leaf: true, sub: 'every app in this subnet' }), seeAll: true, wlScope: { region: trail[0], vpcId: trail[1], snId: trail[2] } });
    }
  }
  const others = est.regionsList.length - 1 + (est.regionsExtra || 0);
  const rows = [pinned, ...children, ...(others > 0 ? [{ cloud: '', region: `+${others} other regions`, rollup: true, other: true, wl: 0, priv: false }] : [])];
  // Every hop by name, cloud first. The crumb used to be built from `label`,
  // which already carried the region, so it read "Clouds › AWS › us-east-1 ›
  // AWS us-east-1". This is the trail; nothing derives it twice.
  const vpcOf = trail.length > 1 ? reg.vpcs.find(v => v.id === trail[1]) : null;
  const snOf = vpcOf && trail.length > 2 ? vpcOf.subnets.find(x => x.id === trail[2]) : null;
  const crumb = [top.cloud, top.region, vpcOf ? vpcOf.name : null, snOf ? snOf.name : null].filter(Boolean);
  return { level, label, crumb, rows, top };
}

/** Sankey split: 'site:<class>' splits a site class by metro; 'tag:<group>' splits a workload group by region. */
export function splitSources(est, flows, split) {
  if (!split) return null;
  const [kind, name] = split.split(':');
  const perSite = { 'Data center': 6, Campus: 2.5, Plant: 1.5, Office: 0.8, Branch: 0.04, Edge: 0.005, Field: 0.3 };
  if (kind === 'site') {
    const cls = S.siteTree(est).find(c => c.cls === name); if (!cls) return null;
    const per = perSite[name] || 0.5;
    return { kind, name, nodes: cls.children.map(ch => ch.kind === 'metro'
      ? { kind: 'sitemetro', key: `site:${name}/${ch.name}`, cls: name, name: `${ch.name} · ${ch.count.toLocaleString('en-US')}`, v: per * ch.count, fabV: per * ch.onFabric }
      : { kind: 'sitemetro', key: `site:${name}/${ch.name}`, cls: name, name: ch.name, v: per, fabV: ch.priv ? per : per * 0.1 }).sort((a, b) => b.v - a.v) };
  }
  if (kind === 'tag') {
    const m = {};
    flows.filter(f => f.kind === 'App' && f.from === name).forEach(f => { const g = m[f.region] = m[f.region] || { kind: 'tagregion', key: `tag:${name}/${f.region}`, name: `${name} · ${f.region}`, v: 0, fabV: 0 }; g.v += f.gbps; if (f.controlled) g.fabV += f.gbps; });
    const nodes = Object.values(m).sort((a, b) => b.v - a.v);
    return nodes.length ? { kind, name, nodes } : null;
  }
  return null;
}

/** Pattern a Sankey destination belongs to, for the Logs door. */
export const destPattern = (name) => /object storage/.test(name) ? 'regions' : /inter-cloud/.test(name) ? 'clouds' : /from sites/.test(name) ? 'inbound' : 'internet';
