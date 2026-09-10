// naas-observe-dash.js — gauges, the alert queue and the detail panel for the
// Observe dashboard. Pure data. Added 2026-09-09.
import * as F from './naas-flowmap.js';
import { impacted, records, resolveDest } from './naas-connections.js';
import * as S from './naas-sites.js';
import * as P from './naas-paths.js';

const n = (x) => Number(x).toLocaleString('en-US');
const R = 22, C = 2 * Math.PI * R;

/** One ring per connection: used against purchased, the 24h line inside, a state dot. */
export function gauges(conns) {
  return conns.rows.map(r => ({ id: r.id, region: r.region, cloud: r.cloud, label: `${r.cloud} ${r.region}`, ramp: r.ramp, pct: r.pct, pctF: r.pct + '%', purchased: `${r.ports} × 10 Gbps`, used: `${r.gbps} Gbps`, dash: `${(C * r.pct / 100).toFixed(1)} ${C.toFixed(1)}`, circ: C.toFixed(1), r: R, state: r.state, bgp: r.bgp, drops: r.drops, inD: r.inD, outD: r.outD, degraded: r.degraded, hot: r.hot, wl: r.wl, color: r.state === 'Degraded' ? '#ff8500' : r.state === 'Saturating' ? '#e5a100' : '#009fdb' }));
}

/** The operator's morning: what, where, how long, one action. Worst first. */
export function queue(est, ob, conns, hp) {
  const rows = [];
  conns.rows.filter(r => r.degraded).forEach(r => rows.push({ key: 'deg:' + r.region, sev: 2, state: 'Degraded', what: `BGP flapping on ${r.ramp}, ${r.drops} drops`, where: `${r.cloud} ${r.region}`, age: '22 min', wl: r.wl, action: 'impact', actionLabel: 'See impact', connId: r.id, region: r.region }));
  conns.rows.filter(r => r.hot && !r.degraded).forEach(r => rows.push({ key: 'sat:' + r.region, sev: 1, state: 'Saturating', what: `${r.pct}% of ${r.ports} × 10 Gbps purchased`, where: `${r.cloud} ${r.region}`, age: '3 h', wl: r.wl, action: 'port', actionLabel: 'Add a port', connId: r.id, region: r.region }));
  (ob.blind || []).forEach(r => rows.push({ key: 'blind:' + r.region, sev: 1, state: 'Blind', what: 'no flow logs, traffic unseen', where: `${r.cloud} ${r.region}`, age: 'since discovery', wl: r.wl, action: 'attach', actionLabel: 'Attach', region: r.region }));
  (ob.flows || []).filter(f => !f.controlled && f.latency > F.SLO).slice(0, 3).forEach(f => rows.push({ key: 'slo:' + f.id, sev: 1, state: 'Over SLO', what: `${f.latency} ms on the public path`, where: f.name, age: '22 min', wl: 0, action: 'steer', actionLabel: 'Steer', flowId: f.id, region: (f.region || '').split(' ')[1] }));
  return rows.sort((a, b) => b.sev - a.sev);
}

/** What the panel shows for a selection: a map node key or a connection id. */
export function panelFor(sel, ctx) {
  const { est, inv, flows, map, conns } = ctx;
  if (!sel) return null;
  if (sel.startsWith('cx-')) {
    const row = conns.rows.find(r => r.id === sel); if (!row) return null;
    const imp = impacted(est, inv, row);
    const recs = records(est, inv, { flows }, 'all').filter(r => (r.srcSub + ' ' + r.dstSub).includes(row.region)).slice(0, 8);
    return { kind: 'connection', title: `${row.cloud} ${row.region}`, sub: `${row.ramp} · ${row.ports} × 10 Gbps purchased`, trail: [{ key: sel, name: `${row.cloud} ${row.region}` }],
      overview: [['Current · in / out', `${row.gbps} / ${(row.gbps * 0.62).toFixed(1)} Gbps`], ['Average · in / out', `${row.avg} / ${(row.avg * 0.62).toFixed(1)} Gbps`], ['Purchased', `${row.ports} × 10 Gbps`], ['Utilization', `${row.pct}% of ${row.cap} Gbps`], ['State', row.state], ['BGP', row.bgp], ['Drops', row.drops], ['Workloads behind it', n(row.wl)]],
      impact: imp, records: recs, actions: [...(row.hot ? [{ key: 'port', label: 'Add a port', region: row.region }] : []), { key: 'policy', label: 'Author a policy for these workloads', region: row.region }, { key: 'logs', label: 'All records for this connection', region: row.region }] };
  }
  // An opened node is replaced by its children on the map; its trail still knows it.
  if (sel.startsWith('asset:')) return sitePanel(sel.slice(6), ctx);
  if (sel.startsWith('wl:')) return workloadPanel(sel, ctx);
  const tr = F.trail(sel, est, inv, flows);
  const node = map.nodes.find(x => x.key === sel) || (tr.length && tr[tr.length - 1].key === sel ? { ...tr[tr.length - 1].node, delta: F.deltaOf(sel), opened: true } : null); if (!node) return null;
  if (node.kind === 'sitename' && node.siteName) { const sp = sitePanel(node.siteName, ctx); if (sp) return { ...sp, trail: tr.map(t => ({ key: t.key, name: t.name })) }; }
  const region = node.region || node.regionName || (node.kind === 'c2c' ? node.name.split(' ')[1] : null) || (node.kind === 'endpoint' && /^[A-Z]/.test(node.name) ? node.name.split(' ')[1] : null);
  const row = region ? conns.rows.find(r => r.region === region) : null;
  const imp = row ? impacted(est, inv, row) : null;
  const share = map.total ? Math.round(node.v / map.total * 100) : 0;
  const recs = records(est, inv, { flows }, 'all').filter(r => region ? (r.srcSub + ' ' + r.dstSub).includes(region) : true).slice(0, 8);
  const resolved = node.kind === 'workload' ? { name: node.resource, sub: node.ip } : node.unresolved ? { name: node.name, sub: 'unresolved · public' } : null;
  return { kind: node.kind, title: node.name, sub: node.sub || '', trail: tr,
    overview: [...(node.opened ? [['Opened', 'children shown in place']] : []), ['Traffic', `${node.v.toFixed(2)} Gbps`], ['On the fabric', `${node.v ? Math.round(node.fabV / node.v * 100) : 0}%`], ['Share of all traffic', `${share}%`], ['Change vs prior window', (node.delta >= 0 ? '+' : '') + node.delta + '%'], ['State', node.state === 'ok' ? 'Healthy' : node.state === 'degraded' ? 'Degraded' : 'Over SLO or public'], ...(resolved ? [['Resource', resolved.name], ['Address', resolved.sub]] : [])],
    impact: imp, records: recs, actions: [...(node.state !== 'ok' && node.fabV < node.v ? [{ key: 'steer', label: 'Steer onto the fabric' }] : []), ...(region && !(row) ? [{ key: 'attach', label: `Attach ${region}`, region }] : []), ...(row && row.hot ? [{ key: 'port', label: 'Add a port', region }] : []), { key: 'policy', label: 'Author a policy here', region }] };
}

/** Find a site by id or name: a named site of the estate, or one generated inside a metro. */
export function findSite(est, id) {
  const named = P.allSites(est).find(x => x.id === id || x.name === id);
  if (named) return { ...named, clsLabel: named.clsLabel || (S.CLASS[named.cls] || {}).label, trail: [(S.CLASS[named.cls] || { label: named.cls }).label, named.metro, named.name] };
  for (const c of S.siteTree(est)) for (const ch of c.children) if (ch.kind === 'metro') { const hit = S.metroSites(ch).find(x => x.id === id); if (hit) return { ...hit, cls: c.cls, clsLabel: c.label, access: ch.access, ramp: ch.ramp, popMs: ch.ms, trail: [c.label, ch.name, hit.id] }; }
  return null;
}

/** The detail of one site (a branch, an ATM, a data center): identity, access, state, paths, what it talks to, records, actions. */
export function sitePanel(id, ctx) {
  const { est, inv, flows } = ctx;
  const site = findSite(est, id); if (!site) return null;
  const sr = P.siteRegions(est, site, 6);
  const paths = sr.rows.map(x => { const pth = P.path(site, x.region); const bad = pth.hops.find(h => h.state !== 'ok'); return { key: x.region.region, region: `${x.region.cloud} ${x.region.region}`, ms: pth.ms, gbps: x.gbps, priv: !!x.region.priv, via: pth.hops.filter(h => h.kind !== 'site' && h.kind !== 'region').map(h => h.name).join(' → '), state: pth.state, worst: bad ? `${bad.name}: ${bad.sub}` : 'clean' }; });
  const regionsOf = inv.flatMap(c => c.regions);
  const talks = sr.rows.slice(0, 3).map(x => { const r = regionsOf.find(z => z.region === x.region.region); const v = r && r.vpcs[0]; const w = v && v.subnets.flatMap(sn => sn.workloads || [])[0]; return { key: x.region.region, label: `${x.region.cloud} ${x.region.region}`, what: v ? `${v.name}${w ? ' · ' + (w.tag || v.name) + '/' + w.name : ''}` : 'workloads', gbps: x.gbps }; });
  const recs = records(est, inv, { flows }, 'inbound').filter(r => r.srcName === site.name || r.srcName === site.id).slice(0, 8);
  const pub = !site.priv;
  const state = site.state === 'degraded' ? 'Degraded' : pub ? 'Public first mile' : 'On the fabric';
  return { kind: 'site', title: site.name || site.id, sub: `${site.clsLabel || site.cls} · ${site.metro}${site.address ? ' · ' + site.address : ''}`, trail: site.trail.map((t, i) => ({ key: 'st' + i, name: t })),
    overview: [['Class', site.clsLabel || site.cls], ['Metro', site.metro], ...(site.address ? [['Address', site.address]] : []), ['Access', site.access || 'Access'], ['First mile', pub ? 'Public internet' : 'AT&T private'], ['PoP', `${site.metro === 'Various' ? 'nearest' : site.metro} PoP · ${site.popMs || site.ms || 4} ms`], ['State', state], ['Traffic', (() => { const g = sr.rows.reduce((a, x) => a + x.gbps, 0); return g >= 1 ? g.toFixed(1) + ' Gbps' : Math.max(1, Math.round(g * 1000)) + ' Mbps'; })()], ['Reaches', `${sr.total} regions`], ['Discovered', `${site.since || 0} days ago`]],
    paths, talks, impact: null, records: recs,
    actions: [...(pub ? [{ key: 'attach', label: `Attach ${site.id || site.name}`, site: site.id || site.name }] : [{ key: 'path', label: 'Add a second path', site: site.id || site.name }]), { key: 'failover', label: 'Run a failover test' }, { key: 'policy', label: `Author a policy for ${(site.clsLabel || site.cls || 'this class').toLowerCase()}` }] };
}

/**
 * What is inside one workload — app-b12, cache-b08, whichever leaf you land on.
 *
 * The leaf was the one thing with no detail: every level above it opens a
 * panel, and the last one just sat there. It is reachable from three places,
 * like every other detail on this product: the map node, the drawer row, and
 * the column.
 *
 * Honest to the data. A private workload resolves to a name because we
 * created the mapping; its partners are the flows we can see. Nothing here
 * claims layer 7.
 */
export function workloadPanel(sel, ctx) {
  const { est, inv, flows, conns } = ctx;
  const [region, vpcId, wid] = sel.slice(3).split('|');
  const reg = inv.flatMap(c => c.regions).find(r => r.region === region);
  const top = est.regionsList.find(r => r.region === region);
  const vpc = reg && reg.vpcs.find(v => v.id === vpcId);
  if (!reg || !top || !vpc) return null;
  let sn = null, w = null;
  for (const x of vpc.subnets) { const hit = (x.workloads || []).find(y => y.id === wid || y.name === wid); if (hit) { sn = x; w = hit; break; } }
  if (!w) return null;

  const app = w.tag || 'untagged';
  const row = conns && conns.rows.find(r => r.region === region);
  const ms = top.priv ? top.fab : top.pub;
  // Its neighbours: the other workloads carrying the same app tag. That is
  // what "who does this talk to" can honestly mean from tags and flow logs.
  const peers = reg.vpcs.flatMap(v => v.subnets.flatMap(x => (x.workloads || []).map(y => ({ ...y, vpc: v.name, sn: x.name }))))
    .filter(y => (y.tag || 'untagged') === app && y.id !== w.id);
  const talks = peers.slice(0, 4).map(y => ({ key: y.id, label: `${y.vpc} · ${y.sn}`, what: `${y.name} · ${y.ip}`, gbps: 0.04 }));
  const recs = records(est, inv, { flows }, 'all').filter(r => (r.srcSub + ' ' + r.dstSub).includes(region)).slice(0, 6);

  return {
    kind: 'workload',
    title: w.name,
    sub: `${w.type} · ${app} · ${top.cloud} ${top.region}`,
    trail: [top.cloud, top.region, vpc.name, sn.name, w.name].map((nm, i) => ({ key: 'wt' + i, name: nm })),
    overview: [
      ['Resource', `${app}/${w.name}`],
      ['Address', w.ip],
      ['Type', w.type],
      ['App tag', app],
      ['VPC / VNet', `${vpc.name} · ${vpc.purpose || 'workload'}`],
      ['Subnet', `${sn.name} · ${sn.cidr}`],
      ['Availability zone', sn.az],
      ['Reachability', w.exposed ? 'Exposed to the internet' : 'Private'],
      ['Path', top.priv ? `AT&T fabric · ${top.ramp || 'NetBond'}` : 'Public internet'],
      ['Latency to the on-ramp', `${ms} ms`],
      ...(row ? [['Connection', `${row.ramp} · ${row.state}`]] : []),
      ['First seen', w.since === 0 ? 'today' : w.since === 1 ? '1 day ago' : `${w.since} days ago`],
      ['Instances sharing this app', `${peers.length + 1}`],
    ],
    paths: [{ key: 'p0', region: `${top.cloud} ${top.region}`, ms, gbps: 0.04, priv: !!top.priv, via: top.priv ? (top.ramp || 'NetBond') : 'hyperscaler edge', state: w.exposed ? 'warn' : 'ok', worst: w.exposed ? 'reachable from the internet' : 'clean' }],
    talks, impact: null, records: recs,
    actions: [
      ...(w.exposed ? [{ key: 'attach', label: `Isolate ${w.name}`, site: `${w.name} · ${w.ip}` }] : []),
      { key: 'policy', label: `Author a policy for ${app}`, region },
      { key: 'logs', label: 'All records for this workload', region },
    ],
  };
}
