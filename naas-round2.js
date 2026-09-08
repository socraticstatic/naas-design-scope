// Stakeholder round 2: path tradeoffs, health, endpoints/resources, Observe cuts, Cost arbitrage.
import { fmt, pct } from './naas-logic.js';

// ---------- Three paths x four lenses ----------
export const PATHS = [
  { id: 'netbond', name: 'NetBond on the AT&T fabric', short: 'NetBond', rel: 99.99, relLabel: '99.99% · dual PE, managed failover', lat: (r) => r.fab, latLabel: (r) => `${r.fab} ms · deterministic`, egress: 0.02, sec: 'Private · never on the internet · inline inspection available', secScore: 3, relScore: 3, latScore: 3, costScore: 3, setup: 'From 10 business days · AT&T provisions both ends', tone: '#0057b8' },
  { id: 'native', name: 'Hyperscaler-native (Direct Connect, ExpressRoute, Interconnect)', short: 'Hyperscaler-native', rel: 99.9, relLabel: '99.9% · single circuit unless you buy two', lat: (r) => r.fab + 3, latLabel: (r) => `${r.fab + 3} ms · deterministic`, egress: 0.02, sec: 'Private · one cloud at a time · you run the routers', secScore: 2, relScore: 2, latScore: 3, costScore: 2, setup: '4 to 8 weeks · you order the port, the LOA, the cross-connect', tone: '#5d6f80' },
  { id: 'internet', name: 'Internet attach (IPsec over public transit)', short: 'Internet attach', rel: 99.5, relLabel: '99.5% · best effort, no SLA on the middle', lat: (r) => r.pub, latLabel: (r) => `${r.pub} ms · varies by hour`, egress: 0.09, sec: 'Encrypted but exposed · hyperscaler egress path · no inspection', secScore: 1, relScore: 1, latScore: 1, costScore: 1, setup: 'Same day · nothing to order', tone: '#8a949c' },
];
export const LENSES = [
  { id: 'security', label: 'Security', q: 'Does it ever touch the public internet?' },
  { id: 'performance', label: 'Performance', q: 'What latency, and is it the same at 3pm and 3am?' },
  { id: 'reliability', label: 'Reliability', q: 'What uptime, and who fixes it?' },
  { id: 'cost', label: 'Cost', q: 'What does a GB cost to move, and what does the path cost to keep?' },
];
const GB_PER_WL_MO = 42;
// Scale GB per workload so that public regions' egress at $0.09 equals the estate's public egress spend.
function gbPerWl(est, base) { const pubWl = est.regionsList.filter(r => !r.priv).reduce((a, r) => a + r.wl, 0); const totalWl = est.regionsList.reduce((a, r) => a + r.wl, 0) || 1; const pubShare = pubWl / totalWl; const pubSpend = base * (pubShare * 0.09 / (pubShare * 0.09 + (1 - pubShare) * 0.02) || 0); return pubWl && base ? pubSpend / 0.09 / pubWl : GB_PER_WL_MO; }
export function regionPath(r) { return r.priv ? (r.ramp === 'DX' || r.ramp === 'ER' ? 'native' : 'netbond') : 'internet'; }
export function compareRegion(r, base, est) {
  const gb = Math.round(r.wl * (r.gbPerWl || GB_PER_WL_MO)), cur = regionPath(r);
  return PATHS.map(p => ({ ...p, cur: p.id === cur, egressMo: Math.round(gb * p.egress), latMs: p.lat(r), latText: p.latLabel(r), gbF: gb.toLocaleString('en-US'), math: `${gb.toLocaleString('en-US')} GB × $${p.egress.toFixed(2)} = ${fmt(Math.round(gb * p.egress))}/mo` }));
}
export function lensScore(r, lens) {
  const p = PATHS.find(x => x.id === regionPath(r));
  const s = { security: p.secScore, performance: r.rel === 'warn' ? 1 : p.latScore, reliability: r.rel === 'warn' ? 1 : p.relScore, cost: p.costScore }[lens];
  return s; // 3 good, 2 fair, 1 poor
}
export const SCORE_COLOR = { 3: 'var(--success)', 2: 'var(--warning)', 1: 'var(--error)' };
export const SCORE_WORD = { 3: 'good', 2: 'fair', 1: 'poor' };
export function lensVerdict(est, lens) {
  const rs = est.regionsList; if (!rs.length) return 'Nothing connected yet.';
  const poor = rs.filter(r => lensScore(r, lens) === 1), fair = rs.filter(r => lensScore(r, lens) === 2);
  const gbPub = rs.filter(r => !r.priv).reduce((a, r) => a + r.wl * GB_PER_WL_MO, 0);
  return {
    security: `${poor.length} of ${rs.length} regions touch the public internet. ${rs.length - poor.length} never do.`,
    performance: `${poor.length} ${poor.length === 1 ? 'region runs' : 'regions run'} above 100 ms or with loss; the fabric path to the same regions is ${Math.min(...rs.map(r => r.fab))}–${Math.max(...rs.map(r => r.fab))} ms, every hour.`,
    reliability: `${rs.length - poor.length - fair.length} regions at 99.99%, ${fair.length} at 99.9% on a single native circuit, ${poor.length} best-effort.`,
    cost: `${gbPub.toLocaleString('en-US')} GB/mo leaves on public rates at $0.09. The same bytes on the fabric: $0.02, ${fmt(Math.round(gbPub * 0.07))}/mo less.`,
  }[lens];
}

// ---------- Health ----------
export function health(est, ob, steered) {
  const rs = est.regionsList;
  const regionHealth = {};
  rs.forEach(r => { regionHealth[r.region] = r.rel === 'warn' ? 'amber' : !r.priv && r.pub > 120 ? 'amber' : 'green'; });
  const amber = Object.values(regionHealth).filter(h => h === 'amber').length;
  const incidents = rs.filter(r => r.rel === 'warn').map(r => ({ region: r.region, cloud: r.cloud, text: `${r.cloud} ${r.region} · p95 ${r.pub + 40} ms · 22 min · public path` }));
  const uptime = rs.length ? (rs.reduce((a, r) => a + (r.priv ? 99.99 : 99.5), 0) / rs.length).toFixed(2) : '—';
  return { regionHealth, amber, incidents, strip: rs.length ? [
    { key: 'up', l: 'Uptime', v: uptime + '%', tone: 'var(--success)' },
    { key: 'p95', l: 'P95 latency', v: ob.kpis[1].v + ' ms', tone: +ob.kpis[1].v > 100 ? 'var(--warning)' : 'var(--success)' },
    { key: 'loss', l: 'Packet loss', v: ob.kpis[2].v + '%', tone: +ob.kpis[2].v > 0.1 ? 'var(--warning)' : 'var(--success)' },
    { key: 'inc', l: 'Incidents', v: String(incidents.length), tone: incidents.length ? 'var(--warning)' : 'var(--success)' },
    { key: 'ctl', l: 'On fabric', v: ob.covPct + '%', tone: 'var(--link)' },
  ] : [] };
}

// ---------- Endpoints and resources (below subnet) ----------
const RES = { alb: ['ALB', 'Load balancer'], api: ['API GW', 'API gateway'], web: ['EC2', 'Web tier'], nat: ['Bastion', 'Bastion host'], app: ['EKS', 'App service'], db: ['RDS', 'Database'], cache: ['ElastiCache', 'Cache'], worker: ['Batch', 'Batch worker'], gpu: ['p5.48xl', 'GPU inference'], queue: ['SQS', 'Message queue'] };
export function endpointsFor(w, cloud) {
  const kind = w.name.split('-')[0];
  const [svc, role] = RES[kind] || ['VM', 'Compute'];
  const svcName = cloud === 'Azure' ? { EC2: 'VM', EKS: 'AKS', RDS: 'Azure SQL', ElastiCache: 'Redis Cache', ALB: 'App Gateway', 'API GW': 'APIM', SQS: 'Service Bus' }[svc] || svc : cloud === 'GCP' ? { EC2: 'GCE', EKS: 'GKE', RDS: 'Cloud SQL', ElastiCache: 'Memorystore', ALB: 'Cloud LB', 'API GW': 'Apigee', SQS: 'Pub/Sub' }[svc] || svc : svc;
  const eni = `eni-${(w.ip || '').split('.').slice(2).join('')}${kind.length}a`;
  return {
    endpoint: { name: eni, type: w.exposed ? 'Public ENI · EIP attached' : 'Private ENI', ip: w.ip, dns: `${w.name}.${w.tag || 'default'}.internal`, sg: `sg-${kind}-${w.tag || 'default'}`.toLowerCase(), ports: w.exposed ? '443, 80' : kind === 'db' ? '5432' : kind === 'cache' ? '6379' : '8080' },
    resource: { name: `${w.tag || 'default'}/${w.name}`, arn: cloud === 'Azure' ? `/subscriptions/…/resourceGroups/${w.tag || 'default'}/providers/${svcName}/${w.name}` : cloud === 'GCP' ? `projects/${w.tag || 'default'}/zones/…/${svcName.toLowerCase()}/${w.name}` : `arn:aws:${svc.toLowerCase().replace(/\s/g, '')}:…:${w.name}`, svc: svcName, role, owner: ({ pci: 'payments-platform', prod: 'platform-eng', finance: 'fin-systems', 'internet-facing': 'web-team', gpu: 'ml-infra', ai: 'ml-infra' })[(w.tag || '').toLowerCase()] || 'platform-eng' },
  };
}

// ---------- Observe cuts: scope, trends, anomalies, insights ----------
export function scopes(est) {
  return [{ key: 'all', label: 'Whole estate', kind: 'all' }, ...est.regionsList.reduce((acc, r) => acc.find(x => x.label === r.cloud) ? acc : [...acc, { key: 'cloud:' + r.cloud, label: r.cloud, kind: 'cloud' }], []), ...est.sites.filter(s => !s.rollup).slice(0, 4).map(s => ({ key: 'site:' + s.name, label: s.name, kind: 'site' }))];
}
export function applyScope(est, scope) {
  if (!scope || scope === 'all') return est;
  const [kind, name] = scope.split(':');
  if (kind === 'cloud') return { ...est, regionsList: est.regionsList.filter(r => r.cloud === name), sites: est.sites };
  if (kind === 'site') { const site = est.sites.find(s => s.name === name); return { ...est, sites: est.sites.filter(s => s.name === name), regionsList: est.regionsList.filter((r, i) => site && site.priv ? r.priv || i % 2 === 0 : i % 2 === 1 || !r.priv) }; }
  return est;
}
export function trends(ob, window) {
  const f = { '7d': 1, '30d': 1, '90d': 1 }[window] || 1;
  const d = { '7d': [0.04, -0.03, 0.01, 0.06, 0.02, 0.05], '30d': [0.11, -0.08, -0.02, 0.18, 0.06, 0.14], '90d': [0.31, -0.19, -0.05, 0.42, 0.15, 0.36] }[window] || [0, 0, 0, 0, 0, 0];
  return ob.kpis.map((k, i) => { const delta = d[i]; const good = (i === 1 || i === 2 || i === 3) ? delta <= 0 : delta >= 0; return { ...k, delta: (delta >= 0 ? '+' : '') + Math.round(delta * 100) + '%', deltaTone: good ? 'var(--success)' : 'var(--warning)', arrow: delta >= 0 ? '↑' : '↓', vs: `vs previous ${window}` }; });
}
export function anomalies(est, ob) {
  const out = [];
  est.regionsList.filter(r => r.rel === 'warn').forEach(r => out.push({ key: 'an-' + r.region, when: '02:14 today · 22 min', sev: 'amber', head: `Latency spike on ${r.cloud} ${r.region}`, cause: `Upstream transit congestion between the hyperscaler edge and your users; p95 rose from ${r.pub} to ${r.pub + 40} ms with 0.3% loss.`, did: 'AT&T flagged the event and confirmed the fabric path to the same region held at ' + r.fab + ' ms.', can: 'Attach the region and set a latency SLO; the fabric re-routes before the ceiling is hit.', region: r.region }));
  const newDest = est.regionsList.find(r => !r.priv && (r.tags || []).includes('Prod'));
  if (newDest) out.push({ key: 'an-dest', when: 'Yesterday', sev: 'amber', head: `New destination from ${newDest.region}: files.slack-edge.com`, cause: `Workloads tagged Prod began sending 3.1 GB/day to a destination not seen in the prior 30 days.`, did: 'Logged and classified as SaaS; no policy matched, so nothing was blocked.', can: 'Author a policy: when tag Prod reaches the Internet, require inline inspection.', region: newDest.region });
  if (ob.pub > 0) out.push({ key: 'an-egress', when: 'This week', sev: 'info', head: `Public egress up ${Math.round(8 + ob.pub * 3)}% week over week`, cause: `Growth is concentrated in object-storage reads from ${est.regionsList.filter(r => !r.priv).map(r => r.region).slice(0, 2).join(' and ') || 'unattached regions'}.`, did: 'Priced the same bytes on the fabric.', can: `Steer the object-storage flow: ${fmt(Math.round(ob.pub * 1000 * 0.07 * 30 / 10) * 10)}/mo back.` });
  return out;
}
export function insights(est, ob) {
  const rs = est.regionsList; if (!rs.length) return [];
  const top = rs.slice().sort((a, b) => b.wl - a.wl)[0];
  const pubRs = rs.filter(r => !r.priv);
  return [
    { key: 'talkers', kicker: 'Top talkers', head: `${top.cloud} ${top.region} carries ${pct(top.wl, rs.reduce((a, r) => a + r.wl, 0))}% of all traffic`, body: `${top.wl} workloads; ${top.priv ? 'already on the fabric' : 'still on public transit'}. ${top.tags.join(', ') || 'Untagged'}.` },
    { key: 'newdest', kicker: 'New destinations · 30d', head: `${3 + pubRs.length} destinations not seen before`, body: 'Two SaaS (Slack edge, Datadog intake), one AI endpoint (api.anthropic.com), the rest object storage in other regions.' },
    { key: 'shadow', kicker: 'Shadow SaaS', head: `${2 + Math.round(pubRs.length / 2)} SaaS domains with no policy`, body: 'Reached directly from cloud workloads over the hyperscaler exit. No inspection, no owner recorded.' },
    { key: 'growth', kicker: 'Egress growth', head: `Public egress grows ${Math.round(6 + ob.pub * 2)}% a month`, body: `At this rate you add ${fmt(Math.round(ob.egressMo * 0.08))}/mo of egress spend each quarter unless the object-storage flow is steered.` },
    { key: 'multi', kicker: 'Multi-cloud paths', head: `${(est.arcs || []).length} cloud-to-cloud paths, ${(est.arcs || []).filter(a => a.priv).length} on the fabric`, body: 'Cloud-to-cloud over the public internet pays egress twice, once out of each cloud.' },
    { key: 'idle', kicker: 'Idle capacity', head: `${Math.max(1, Math.round(rs.filter(r => r.priv).length / 3))} committed on-ramps under 30% utilised`, body: 'Consolidating two 5 Gbps ports into one 10 Gbps saves the second port fee; AT&T can re-home the VLANs.' },
  ];
}

// ---------- Cost: arbitrage, destination classes, forecast ----------
const DEST_CLASSES = [
  { key: 'ai', label: 'AI endpoints', share: 0.32, hyper: 0.09, fabric: 0.02 },
  { key: 'obj', label: 'Object storage (cross-region)', share: 0.28, hyper: 0.09, fabric: 0.02 },
  { key: 'inet', label: 'Public internet · SaaS', share: 0.22, hyper: 0.09, fabric: 0.05 },
  { key: 'x', label: 'Inter-cloud', share: 0.18, hyper: 0.18, fabric: 0.02 },
];
export function arbitrage(est, base, targetSave) {
  const pubRs = est.regionsList.filter(r => !r.priv);
  const pubWl = pubRs.reduce((a, r) => a + r.wl, 0) || 1;
  // Anchor: total saving across public regions equals the bucket-level saving already shown elsewhere.
  const g = targetSave ? targetSave / 0.07 / pubWl : gbPerWl(est, base);
  return pubRs.map(r => {
    const gb = Math.round(r.wl * g);
    const rows = PATHS.map(p => ({ id: p.id, short: p.short, egressMo: Math.round(gb * p.egress), rate: p.egress }));
    const now = rows.find(x => x.id === 'internet'), best = rows.find(x => x.id === 'netbond');
    const nearby = est.regionsList.find(x => x.priv && x.cloud === r.cloud);
    return { key: 'arb-' + r.region, region: `${r.cloud} ${r.region}`, wl: r.wl, gbF: gb.toLocaleString('en-US'), now: fmt(now.egressMo), nowRate: '$0.09', fabric: fmt(best.egressMo), fabricRate: '$0.02', save: fmt(now.egressMo - best.egressMo), saveN: now.egressMo - best.egressMo, math: `${gb.toLocaleString('en-US')} GB × ($0.09 − $0.02) × 12 = ${fmt((now.egressMo - best.egressMo) * 12)}/yr`, alt: nearby ? `Or move the workload to ${nearby.region}, already attached: same saving, no new circuit, +${Math.abs(nearby.fab - r.fab)} ms.` : 'No attached region in this cloud yet; the attach is the move.', regionId: r.region };
  }).sort((a, b) => b.saveN - a.saveN);
}
export function destClasses(ob, base, targetSave) {
  const today = base || ob.egressMo || 0;
  const ifAll = Math.max(0, today - (targetSave || 0));
  return DEST_CLASSES.map(d => { const now = Math.round(today * d.share), after = Math.round(ifAll * d.share); const gb = Math.round(now / (d.hyper * 0.6 + d.fabric * 0.4)); return { ...d, gbF: gb.toLocaleString('en-US'), hyperF: '$' + d.hyper.toFixed(2), fabricF: '$' + d.fabric.toFixed(2), nowF: fmt(now), ifAllF: fmt(after), w: Math.round(d.share * 100) + '%' }; });
}
export function forecast(ob, arb) {
  const months = 3, growth = 0.06, base = ob.egressMo || 1000, moveSave = Math.min(base * 0.9, arb.reduce((a, r) => a + r.saveN, 0));
  const W = 600, H = 160;
  const pts = (fn) => Array.from({ length: months * 30 + 1 }, (_, d) => fn(d));
  const asIs = pts(d => base * Math.pow(1 + growth, d / 30));
  const moved = pts(d => Math.max(0, (base - moveSave * Math.min(1, d / 20)) * Math.pow(1 + growth * 0.4, d / 30)));
  const max = Math.max(...asIs) * 1.1;
  const path = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (arr.length - 1) * W).toFixed(1)},${(H - v / max * (H - 16)).toFixed(1)}`).join(' ');
  const q = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  return { W, H, asIs: path(asIs), moved: path(moved), asIsQ: fmt(q(asIs)), movedQ: fmt(q(moved)), diffQ: fmt(q(asIs) - q(moved)), maxLabel: fmt(Math.round(max)) };
}
export function commitments(est, base) {
  const g = gbPerWl(est, base) || GB_PER_WL_MO;
  return est.regionsList.filter(r => r.priv).slice(0, 3).map((r, i) => { const gb = Math.round(r.wl * g); const metered = Math.round(gb * 0.02); const committed = Math.round(1200 + gb * 0.008); const better = committed < metered; return { key: 'cm-' + r.region, region: `${r.cloud} ${r.region}`, gbF: gb.toLocaleString('en-US'), metered: fmt(metered), committed: fmt(committed), verdict: better ? `Commit: saves ${fmt(metered - committed)}/mo at this volume` : `Stay metered: commitment breaks even at ${Math.round(1200 / 0.012).toLocaleString('en-US')} GB/mo`, tone: better ? 'var(--success)' : 'var(--text-body)' }; });
}

export function gbPerWlExport(est, base) { return gbPerWl(est, base); }


// ---------- Insight widgets: data shaped for drawing, not reading ----------
export function insightWidgets(est, ob) {
  const rs = est.regionsList; if (!rs.length) return null;
  const totalWl = rs.reduce((a, r) => a + r.wl, 0) || 1;
  // 1. Top talkers: horizontal bars, fabric vs public split
  const talkers = rs.slice().sort((a, b) => b.wl - a.wl).slice(0, 5).map(r => ({ key: r.region, region: r.region, label: r.cloud + ' ' + r.region, pctW: pct(r.wl, rs[0] ? Math.max(...rs.map(x => x.wl)) : 1) + '%', share: pct(r.wl, totalWl) + '%', priv: r.priv, fill: r.priv ? '#0057b8' : '#8a949c', tags: r.tags.slice(0, 2).join(' · ') }));
  // 2. New destinations: 30-day strip, dots by day, class-colored
  const pubN = rs.filter(r => !r.priv).length;
  const dests = [{ d: 3, n: 'api.anthropic.com', c: 'ai' }, { d: 8, n: 'files.slack-edge.com', c: 'saas' }, { d: 11, n: 's3.eu-west-1', c: 'obj' }, { d: 17, n: 'intake.datadoghq.com', c: 'saas' }, { d: 22, n: 'blob.core.windows.net', c: 'obj' }, { d: 26, n: 'api.openai.com', c: 'ai' }].slice(0, 3 + pubN);
  const CLASS = { ai: '#7b3fbf', saas: '#f57c00', obj: '#00838f' };
  const newDest = dests.map(x => ({ key: x.n, x: (x.d / 30 * 100).toFixed(1) + '%', name: x.n, fill: CLASS[x.c], cls: { ai: 'AI endpoint', saas: 'SaaS', obj: 'Object storage' }[x.c], day: 'day ' + x.d }));
  // 3. Shadow SaaS: domains sized by GB, colored by policy coverage
  const saas = [['slack-edge', 3.1, false], ['datadoghq', 2.4, false], ['zoom.us', 1.8, true], ['github.com', 1.6, true], ['notion.so', 0.9, false], ['figma.com', 0.7, false]].slice(0, 3 + Math.min(3, pubN));
  const shadow = saas.map(([n, gb, covered], i) => ({ key: n, name: n, gb: gb + ' GB/d', r: 14 + gb * 7, covered, fill: covered ? '#0057b8' : '#f57c00', op: covered ? 0.9 : 0.75, x: 18 + (i % 3) * 32 + (i > 2 ? 14 : 0), y: i > 2 ? 68 : 30 }));
  const shadowN = shadow.filter(s => !s.covered).length;
  // 4. Egress growth: 12-week sparkline, public vs fabric stacked
  const wk = Array.from({ length: 12 }, (_, i) => { const pubW = (ob.pub || 1) * Math.pow(1.02, i) * (0.9 + 0.1 * Math.sin(i)); const fabW = (ob.fab || 1) * (0.97 + 0.03 * Math.cos(i * 0.6)); return { pub: pubW, fab: fabW }; });
  const mx = Math.max(...wk.map(w => w.pub + w.fab)) * 1.1; const W = 300, H = 90;
  const pt = (i, v) => `${(i / 11 * W).toFixed(1)},${(H - v / mx * H).toFixed(1)}`;
  const fabArea = 'M' + wk.map((w, i) => pt(i, w.fab)).join(' L') + ` L${W},${H} L0,${H} Z`;
  const pubArea = 'M' + wk.map((w, i) => pt(i, w.fab + w.pub)).join(' L') + ' L' + wk.map((w, i) => pt(11 - i, wk[11 - i].fab)).join(' L') + ' Z';
  const growth = { fabArea, pubArea, W, H, pubPct: Math.round((wk[11].pub / wk[0].pub - 1) * 100), fabPct: Math.round((wk[11].fab / wk[0].fab - 1) * 100) };
  // 5. Multi-cloud paths: chord-ish arcs between cloud nodes
  const clouds = [...new Set(rs.map(r => r.cloud))].slice(0, 5);
  const cx = 150, cy = 78, R = 58;
  const nodes = clouds.map((c, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / clouds.length; return { key: c, name: c, x: +(cx + R * Math.cos(a)).toFixed(1), y: +(cy + R * Math.sin(a)).toFixed(1), lx: +(cx + (R + 22) * Math.cos(a)).toFixed(1), ly: +(cy + (R + 22) * Math.sin(a)).toFixed(1), anchor: Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle' }; });
  const arcs = (est.arcs || []).map((a, i) => { const A = rs.find(r => r.region === a.from), B = rs.find(r => r.region === a.to); const n1 = A && nodes.find(n => n.name === A.cloud), n2 = B && nodes.find(n => n.name === B.cloud); if (!n1 || !n2) return null; return { key: 'arc' + i, d: `M${n1.x},${n1.y} Q${cx},${cy} ${n2.x},${n2.y}`, stroke: a.priv ? '#0057b8' : '#8a949c', dash: a.priv ? 'none' : '4 4', w: a.priv ? 2.5 : 1.5 }; }).filter(Boolean);
  const multi = { nodes, arcs, privN: (est.arcs || []).filter(a => a.priv).length, totalN: (est.arcs || []).length };
  // 6. Port utilisation: gauges per committed on-ramp
  const ports = rs.filter(r => r.priv).slice(0, 4).map((r, i) => { const u = [27, 61, 18, 84][i % 4]; return { key: r.region, label: `${r.cloud} ${r.region}`, pctN: u, pct: u + '%', dash: `${(u / 100 * 113).toFixed(1)} 113`, tone: u < 30 ? '#f57c00' : u > 80 ? '#c2185b' : '#0057b8', bw: i % 2 ? '5 Gbps' : '10 Gbps', idle: u < 30 }; });
  return { talkers, newDest, newDestN: newDest.length, shadow, shadowN, growth, multi, ports, idleN: ports.filter(p => p.idle).length };
}
