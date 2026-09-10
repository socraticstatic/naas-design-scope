/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-fabric.js — inside the AT&T fabric band: facilities → ports → circuits,
// opened in place on the picture. Pure data. Added 2026-09-09 (Micah, 14:13:
// "Why does clicking on AT&T fabric take me to a wordy sales page!").
const n = (x) => Number(x).toLocaleString('en-US');

/** Facilities the estate's attached regions land on, from the inventory's city per region. */
export function facilities(est, inv, ob) {
  const util = ob.utilRows || [];
  const byCity = {};
  inv.flatMap(c => c.regions).filter(r => r.priv).forEach(r => {
    const city = r.city || r.region; const u = util.find(x => x.region === r.region) || { ports: 1, cap: 10, gbps: 0, pct: 0 };
    const f = byCity[city] = byCity[city] || { key: 'fac:' + city, city, name: `AT&T ${city}`, regions: [], ramps: new Set(), ports: 0, cap: 0, gbps: 0, degraded: false };
    const reg = est.regionsList.find(x => x.region === r.region) || {};
    f.regions.push({ region: r.region, cloud: r.cloud, ramp: r.ramp || 'NetBond', ports: u.ports, cap: u.cap, gbps: u.gbps, pct: u.pct, degraded: reg.link === 'degraded', paths: reg.paths || 1 });
    f.ramps.add(r.ramp || 'NetBond'); f.ports += u.ports; f.cap += u.cap; f.gbps += u.gbps; if (reg.link === 'degraded') f.degraded = true;
  });
  return Object.values(byCity).map(f => { const ramps = [...f.ramps]; const pct = f.cap ? Math.round(f.gbps / f.cap * 100) : 0; return { ...f, ramps, pct, sub: `${f.ports} ${f.ports === 1 ? 'port' : 'ports'} · ${ramps.join(' · ')} · ${pct}% used`, state: f.degraded ? 'degraded' : (pct >= 80 ? 'saturating' : 'ok') }; }).sort((a, b) => b.gbps - a.gbps);
}

/** Ports at a facility: one row per purchased 10 Gbps port, with its own utilization. */
export function ports(facility) {
  const out = [];
  facility.regions.forEach(r => { for (let i = 0; i < r.ports; i++) { const pct = Math.max(2, Math.min(99, Math.round(r.pct * (1 + ((i % 3) - 1) * 0.12)))); out.push({ key: `port:${r.region}:${i + 1}`, region: r.region, cloud: r.cloud, ramp: r.ramp, name: `${r.ramp} port ${i + 1} · ${r.cloud} ${r.region}`, sub: `10 Gbps · ${pct}% used · ${r.degraded && i === 0 ? 'BGP flapping' : 'BGP established'}`, pct, state: r.degraded && i === 0 ? 'degraded' : pct >= 80 ? 'saturating' : 'ok', idx: i }); } });
  return out;
}

/** Circuits on a port: the gateways' circuits in the inventory, each landing on a customer site. */
export function circuits(port, inv) {
  const reg = inv.flatMap(c => c.regions).find(r => r.region === port.region); if (!reg) return [];
  const all = reg.vpcs.flatMap(v => v.gws.filter(g => g.circuits).flatMap(g => g.circuits.map(cx => ({ ...cx, vpc: v.name }))));
  const mine = all.filter((cx, i) => i % Math.max(1, Math.ceil(all.length / Math.max(1, port.ports || 1))) === 0 || all.length <= 2 || i % 2 === port.idx % 2);
  return (mine.length ? mine : all).slice(0, 8).map(cx => ({ key: 'cx:' + cx.id, name: cx.name, sub: `${cx.pe} · ${cx.bw} · to ${cx.site} (${cx.access}) · ${cx.ms} ms · ${cx.status}`, site: cx.site, pe: cx.pe, bw: cx.bw, status: cx.status, vpc: cx.vpc, state: cx.status === 'Provisioning' ? 'saturating' : 'ok' }));
}

/** Rows for a fabric drill trail: ['fab'] facilities, ['fab', city] ports, ['fab', city, portKey] circuits. */
export function fabricRows(est, inv, ob, trail) {
  if (!trail || !trail.length) return null;
  const facs = facilities(est, inv, ob);
  if (trail.length === 1) return { level: 'facility', label: 'AT&T fabric', rows: facs.map(f => ({ key: f.key, name: f.name, sub: f.sub, state: f.state, drill: f.city, count: `${f.ports}` })), head: `${facs.length} facilities` };
  const fac = facs.find(f => f.city === trail[1]); if (!fac) return null;
  if (trail.length === 2) { const ps = ports(fac); return { level: 'port', label: fac.name, rows: ps.map(p => ({ key: p.key, name: p.name, sub: p.sub, state: p.state, drill: p.key, count: p.pct + '%' })), head: `${ps.length} ports · ${fac.ramps.join(' · ')}` }; }
  const port = ports(fac).find(p => p.key === trail[2]); if (!port) return null;
  const cxs = circuits({ ...port, ports: fac.ports }, inv);
  return { level: 'circuit', label: port.name, rows: cxs.map(c => ({ key: c.key, name: c.name, sub: c.sub, state: c.state, drill: null, leaf: true, site: c.site, count: c.bw })), head: `${cxs.length} circuits on this port` };
}
