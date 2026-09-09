// naas-observe-dash.js — gauges, the alert queue and the detail panel for the
// Observe dashboard. Pure data. Added 2026-09-09.
import * as F from './naas-flowmap.js';
import { impacted, records, resolveDest } from './naas-connections.js';

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
  const tr = F.trail(sel, est, inv, flows);
  const node = map.nodes.find(x => x.key === sel) || (tr.length && tr[tr.length - 1].key === sel ? { ...tr[tr.length - 1].node, delta: F.deltaOf(sel), opened: true } : null); if (!node) return null;
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
