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
  const mk = (key, title, rows, word) => ({ key, title, rows, legend, total: rows.reduce((a, r) => a + r.gbps, 0), sub: rows.length ? `${rows.filter(r => r.priv).length} of ${rows.length} ${word} on the fabric` : 'Nothing in this window' });
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
  ].map(c => ({ ...c, primary: isEmpty ? c.key === 'connect' : c.key === 'observe' }));
}
