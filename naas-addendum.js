/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// Addendum 01: inventory tree, station track, Observe at full weight. Pure derivations from an estate.
import { fmt, pct } from './naas-logic.js';

const CITY = { 'us-east-1': 'N. Virginia', 'us-east-2': 'Ohio', 'us-west-2': 'Oregon', 'eu-central-1': 'Frankfurt', 'eu-west-1': 'Ireland', 'ap-southeast-1': 'Singapore', eastus: 'Virginia', eastus2: 'Virginia', westeurope: 'Netherlands', centralus: 'Iowa', 'uk-south': 'London', 'us-central1': 'Iowa', 'europe-west1': 'Belgium', 'us-east-04': 'Weehawken', 'us-east-04a': 'Weehawken', 'eu-north1': 'Finland', 'us-ashburn-1': 'Ashburn' };
const GPU_CLOUDS = ['CoreWeave', 'Nebius', 'Lambda'];
const PE_CODE = { 'us-east-1': 'IAD', 'us-east-2': 'CMH', 'us-west-2': 'PDX', 'eu-central-1': 'FRA', 'eu-west-1': 'DUB', 'ap-southeast-1': 'SIN', eastus: 'IAD', eastus2: 'IAD', westeurope: 'AMS', centralus: 'DFW', 'uk-south': 'LHR', 'us-central1': 'ORD', 'europe-west1': 'BRU', 'us-east-04': 'EWR', 'eu-north1': 'HEL', 'us-ashburn-1': 'IAD' };
const peCode = (region) => PE_CODE[region] || region.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase();
const PROVIDER_MARK = { AWS: 'brand/providers/aws.svg', Azure: 'brand/providers/azure.svg', 'Google Cloud': 'brand/providers/google.svg', Oracle: 'brand/providers/oracle.svg', 'Oracle Cloud': 'brand/providers/oracle.svg' };
const TAG_HUE = { 'rd-helion': '#7b61ff', 'shared-services': '#00a3a3', finance: '#0078d4', 'finance-invoices': '#7b61ff', pci: '#c2185b', 'classified-helion': '#d32f2f', 'internet-facing': '#0288d1', analytics: '#2e7d32', prod: '#5c6bc0', gpu: '#f57c00', ai: '#f57c00' };

export function tagStyle(t, dark) {
  const h = TAG_HUE[t.toLowerCase()] || '#5c6bc0';
  return { bg: h + (dark ? '2e' : '14'), border: h + (dark ? '80' : '40'), color: dark ? lighten(h) : h };
}
function lighten(hex) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const f = (x) => Math.round(x + (255 - x) * 0.45); return `rgb(${f(r)},${f(g)},${f(b)})`; }

// ---------- Inventory tree ----------
export function inventory(est) {
  const clouds = [];
  est.regionsList.forEach((r, i) => {
    let cl = clouds.find(c => c.name === r.cloud);
    if (!cl) { cl = { id: 'c-' + r.cloud, name: r.cloud, mark: PROVIDER_MARK[r.cloud] || null, initials: r.cloud === 'GCP' ? 'G' : r.cloud.slice(0, 2).toUpperCase(), gpu: GPU_CLOUDS.includes(r.cloud), regions: [] }; clouds.push(cl); }
    cl.regions.push(region(r, i, est));
  });
  clouds.forEach(cl => { cl.vpcs = cl.regions.reduce((a, r) => a + r.vpcs.length, 0); cl.wl = cl.regions.reduce((a, r) => a + r.wl, 0); cl.priv = cl.regions.some(r => r.priv); });
  return clouds;
}

function region(r, i, est) {
  const isAzure = r.cloud === 'Azure';
  const pfx = isAzure ? 'vnet' : 'vpc';
  const n = r.wl > 100 ? 3 : r.wl > 40 ? 2 : 1;
  const purposes = ['Production · 3-tier', 'Data lake', 'DMZ · public'];
  const suffix = ['prod-01', 'data-02', 'dmz-03'];
  const azs = [3, 2, 2];
  const base = 10 + i * 3;
  const tagsFor = (k) => k === 0 ? [...r.tags.map(t => t.toLowerCase()), 'shared-services'] : k === 1 ? (r.tags.includes('PCI') ? ['finance-invoices', 'pci', 'finance'] : ['analytics', ...r.tags.slice(0, 1).map(t => t.toLowerCase())]) : ['internet-facing'];
  const vpcs = Array.from({ length: n }, (_, k) => {
    const cidrBase = `10.${base + k}`;
    const wl = Math.max(4, Math.round(r.wl * [0.55, 0.3, 0.15][k] / (n === 1 ? 0.55 : n === 2 ? 0.85 : 1)));
    const priv = r.priv && k < 2;
    const azList = Array.from({ length: azs[k] }, (_, a) => r.region + 'abc'[a]);
    const WL_TYPES = { pub: [['alb', 'Load balancer'], ['api', 'API gateway'], ['web', 'Web tier'], ['nat', 'Bastion']], prv: [['app', 'App server'], ['db', 'Database'], ['cache', 'Cache'], ['worker', 'Batch worker'], ['gpu', 'GPU inference'], ['queue', 'Message queue']] };
/**
 * What is listening on a workload — the rung below the instance, and the one
 * Ramesh names last in cloud → region → VPC → subnet → endpoint → resource.
 *
 * Ports and listeners, not layer 7. A network product knows what is bound to
 * an address; it does not know what the application does. Everything here is
 * something a private endpoint's own metadata carries.
 */
/**
 * The named services running on a workload — the last rung of Ramesh's chain,
 * and the one that stops the product speaking in addresses.
 *
 * This is not layer 7 inference off netflow. It is what the cloud's own
 * control plane already knows: ECS task definitions, Kubernetes workloads,
 * instance tags. Discovery reads it with the same credentials that found the
 * VPC, so the names are the customer's own.
 */
const WL_APPS = {
  alb: [['edge-router', '2.14', '443/tcp', 'TLS termination and routing']],
  api: [['orders-api', '4.2', '443/tcp', 'order capture · REST /v1'], ['payments-api', '3.8', '443/tcp', 'card auth and capture'], ['api-gateway', '2.1', '8443/tcp', 'gRPC to the service mesh']],
  web: [['storefront-web', '6.7', '443/tcp', 'server-rendered pages'], ['otel-agent', '0.98', '9100/tcp', 'metrics sidecar']],
  nat: [['ssh-bastion', '9.4', '22/tcp', 'operator access, key only']],
  app: [['checkout-svc', '4.2', '8080/tcp', 'cart, pricing, tax'], ['orders-svc', '2.9', '8443/tcp', 'order lifecycle'], ['otel-agent', '0.98', '9100/tcp', 'metrics sidecar']],
  db: [['postgres', '15.4', '5432/tcp', 'primary, read-write'], ['pgbouncer', '1.21', '6432/tcp', 'connection pool'], ['wal-shipper', '2.2', '', 'continuous archive']],
  cache: [['redis', '7.2', '6379/tcp', 'session and object cache']],
  worker: [['batch-runner', '3.1', '', 'nightly reconciliation'], ['otel-agent', '0.98', '9100/tcp', 'metrics sidecar']],
  gpu: [['triton-server', '2.45', '8000/tcp', 'model serving'], ['embed-worker', '1.7', '', 'vector generation']],
  queue: [['rabbitmq', '3.13', '5672/tcp', 'broker'], ['shovel', '3.13', '15672/tcp', 'federation and console']],
};
    const mkWl = (pub, a, n, cidr, tag) => Array.from({ length: Math.min(n, 300) }, (_, w) => { const t = WL_TYPES[pub ? 'pub' : 'prv'][(w + a) % WL_TYPES[pub ? 'pub' : 'prv'].length]; const ip = cidr.replace(/0\/24$/, String(10 + w * 7)); return { id: `${cidr}-${w}`, since: (w * 37 + a * 53 + n * 11) % 365, name: `${t[0]}-${'abc'[a]}${String(w + 1).padStart(2, '0')}`, type: t[1], ip, tag, exposed: pub && w < 2, endpoints: (WL_APPS[t[0]] || []).map(([app, ver, port, note]) => ({ id: `${ip}:${app}`, app, ver, port, note })) }; });
    const subnets = azList.flatMap((az, a) => {
      const pubN = Math.max(2, Math.round(wl / azs[k] * 0.4)), prvN = Math.max(2, Math.round(wl / azs[k] * 0.6));
      const pubC = `${cidrBase}.${a}.0/24`, prvC = `${cidrBase}.${10 + a}.0/24`;
      return [
        { id: `${pfx}-${i}-${k}-pub-${a}`, name: 'public-' + 'abc'[a], az, pub: true, cidr: pubC, wl: pubN, tags: tagsFor(k).slice(0, 1), workloads: mkWl(true, a, pubN, pubC, tagsFor(k)[0]) },
        { id: `${pfx}-${i}-${k}-prv-${a}`, name: 'private-' + 'abc'[a], az, pub: false, cidr: prvC, wl: prvN, tags: tagsFor(k).slice(0, 1), workloads: mkWl(false, a, prvN, prvC, tagsFor(k)[0]) },
      ];
    });
    const routeTables = [{ name: 'rtb-public', sub: 'Public · 1 route', viol: 0 }, ...azList.map((az, a) => ({ name: 'rtb-private-' + 'abc'[a], sub: 'Private · 3 routes', viol: k === 2 && r.tags.includes('Prod') && a === 0 ? 1 : 0 }))];
    const gws = [
      { name: isAzure ? 'vnet-gw' : 'igw-prod', type: 'Internet gateway', kind: 'igw' },
      ...azList.map((az, a) => ({ name: 'nat-' + 'abc'[a], type: 'NAT gateway', kind: 'nat' })),
      { name: isAzure ? 'blob-pe' : r.cloud === 'GCP' ? 'gcs-psc' : 's3-vpce', type: isAzure ? 'Private endpoint' : r.cloud === 'GCP' ? 'Private Service Connect' : 'S3 gateway endpoint', kind: 'endpoint' },
      ...(priv ? [{ name: isAzure ? 'ergw-prod' : 'dxgw-prod', type: isAzure ? 'ExpressRoute gateway' : 'Direct Connect gateway', kind: 'dx', lock: true, circuits: circuitsFor(est, r, i, k, isAzure) }] : []),
      { name: isAzure ? 'vwan-hub' : 'tgw-attach', type: isAzure ? 'Virtual WAN hub' : 'Transit gateway', kind: 'tgw' },
    ];
    return { id: `${pfx}-${i}-${k}`, managed: priv && k === 0, since: (i * 47 + k * 31 + 3) % 240, label: pfx.toUpperCase(), name: `${pfx}-${suffix[k]}`, purpose: purposes[k], cidr: `${cidrBase}.0.0/16`, tags: tagsFor(k), azs: azs[k], subnets, routeTables, gws, wl, priv, violations: routeTables.reduce((a, t) => a + t.viol, 0) };
  });
  return { id: 'r-' + r.cloud + '-' + r.region, cloud: r.cloud, region: r.region, city: CITY[r.region] || '', priv: r.priv, ramp: r.ramp, latency: r.priv ? r.fab : r.pub, wl: r.wl, rel: r.rel, tags: r.tags, vpcs, subnets: vpcs.reduce((a, v) => a + v.subnets.length, 0) };
}

function circuitsFor(est, r, i, k, isAzure) {
  const sites = (est.sites || []).filter(s => s.priv);
  const pe = 'PE-' + peCode(r.region) + '-0' + (1 + (i % 2));
  const ramp = r.ramp || (isAzure ? 'ER' : 'NetBond');
  const n = k === 0 ? 2 : 1;
  return Array.from({ length: n }, (_, c) => { const site = sites[(i + c) % Math.max(1, sites.length)] || { name: 'Ashburn DC', access: 'AVPN (MPLS VPN)', metro: 'Ashburn' }; return { id: `cx-${i}-${k}-${c}`, name: `${ramp.toLowerCase().replace(/\s/g, '')}-${peCode(r.region).toLowerCase()}-${['prod', 'data'][k] || 'dmz'}-0${c + 1}`, ramp, pe, bw: c === 0 ? '10 Gbps' : '5 Gbps', site: site.name, access: site.access, metro: site.metro, status: r.landed ? 'Provisioning' : 'Active', ms: r.fab }; });
}

export function inventoryStats(est, clouds) {
  const vpcs = clouds.flatMap(c => c.regions.flatMap(r => r.vpcs));
  const regions = clouds.reduce((a, c) => a + c.regions.length, 0);
  const workloads = clouds.reduce((a, c) => a + c.wl, 0);
  return { sites: est.sitesCount || est.sites.length, clouds: clouds.length, regions, workloads, attached: vpcs.filter(v => v.priv).length, exposed: vpcs.filter(v => v.tags.includes('internet-facing')).length };
}

// ---------- Observe ----------
import * as S from './naas-sites.js';
const GBPS_PER_WL = 0.14;
const DESTS = ['AI endpoints', 'object storage', 'public internet', 'SaaS', 'inter-cloud'];

export function observe(est, steered, inv, split) {
  const flows = [];
  est.regionsList.forEach((r, i) => {
    const tag = r.tags[0] ? r.tags[0].toLowerCase() : 'untagged';
    const tagGroup = tag === 'pci' ? 'finance-invoices' : tag === 'prod' ? 'rd-helion' : tag === 'finance' ? 'finance' : tag === 'ai' || tag === 'gpu' ? 'classified-helion' : 'shared-services';
    const total = r.wl * GBPS_PER_WL;
    const split = [0.45, 0.3, 0.25];
    ['AI endpoints', 'object storage', 'public internet'].forEach((d, k) => {
      const id = `f-${i}-${k}`;
      const controlled = r.priv || steered.includes(id);
      flows.push({ id, name: `${tagGroup} → ${d}`, from: tagGroup, to: d, kind: 'App', gbps: +(total * split[k]).toFixed(1), latency: controlled ? r.fab : r.pub, perGb: controlled ? 0.02 : 0.09, controlled, steerable: !r.priv, steered: steered.includes(id), diverse: controlled && k === 0 && r.wl > 150, region: `${r.cloud} ${r.region}`, path: controlled ? `AT&T mid-mile · ${r.ramp || 'NetBond'} · PE-${peCode(r.region)}-02` : 'Hyperscaler-native · public internet', rel: r.rel });
    });
  });
  (est.arcs || []).forEach((a, i) => {
    const A = est.regionsList.find(r => r.region === a.from), B = est.regionsList.find(r => r.region === a.to);
    if (!A || !B) return;
    const id = `x-${i}`;
    const controlled = a.priv || steered.includes(id);
    flows.push({ id, name: `${A.cloud} ${A.region} ↔ ${B.cloud} ${B.region}`, from: `${A.cloud} ${A.region}`, to: 'inter-cloud', kind: 'Cloud-to-cloud', gbps: +((A.wl + B.wl) * GBPS_PER_WL * 0.1).toFixed(1), latency: controlled ? Math.max(A.fab, B.fab) + 4 : Math.max(A.pub, B.pub) + 12, perGb: controlled ? 0.02 : 0.09, controlled, steerable: !a.priv, steered: steered.includes(id), diverse: !controlled, region: `${A.cloud} ${A.region}`, path: controlled ? 'AT&T mid-mile · Cloud to Cloud' : 'Public internet · hyperscaler-native peering', rel: 'ok' });
  });
  const total = flows.reduce((a, f) => a + f.gbps, 0);
  const fab = flows.filter(f => f.controlled).reduce((a, f) => a + f.gbps, 0);
  const pub = total - fab;
  const covPct = total ? Math.round(fab / total * 100) : 0;
  const pubFlows = flows.filter(f => !f.controlled);
  const p95 = flows.length ? Math.max(...flows.map(f => f.latency)) : 0;
  const loss = +(pubFlows.length ? 0.04 + pubFlows.length * 0.012 : 0.02).toFixed(2);
  const steeredGbps = flows.filter(f => f.steered).reduce((a, f) => a + f.gbps, 0);
  const bucketToday = (est.buckets || []).reduce((a, b) => a + b.today, 0);
  const egressMo = Math.max(0, Math.round((bucketToday || pub * 900) - steeredGbps * 190));
  const savingsMo = Math.round((est.stage === 'mature' ? est.savedMo || 0 : 0) + steeredGbps * 190 + est.regionsList.filter(r => r.landed).reduce((a, r) => a + r.wl * GBPS_PER_WL * 190, 0));
  const pubRate = Math.round(egressMo * (pub / (total || 1)));
  const pathsCovered = est.regionsList.filter(r => r.priv).length + steered.filter(s => s.startsWith('f-')).map(s => s.split('-')[1]).filter((v, i, a) => a.indexOf(v) === i).length;
  const blind = est.regionsList.filter(r => !r.priv && !steered.some(s => s.startsWith(`f-${est.regionsList.indexOf(r)}-`)));
  const worst = pubFlows.slice().sort((a, b) => b.latency - a.latency)[0];
  const anomaly = est.regionsList.find(r => r.rel === 'warn');
  // Utilization: attached regions each ride a 10 Gbps NetBond port; fabric traffic against that capacity.
  const attachedRs = est.regionsList.filter(r => r.priv);
  const utilRows = attachedRs.map(r => { const i = est.regionsList.indexOf(r); const gbps = +flows.filter(f => f.id.startsWith(`f-${i}-`) && f.controlled).reduce((a, f) => a + f.gbps, 0).toFixed(1); const ports = Math.max(1, Math.ceil(gbps / 10 / (0.55 + ((i * 7) % 4) * 0.1))); const cap = ports * 10; return { id: 'u-' + r.region, region: r.region, cloud: r.cloud, ramp: r.ramp || 'NetBond', gbps, ports, cap, pct: Math.min(99, Math.round(gbps / cap * 100)) }; }).sort((a, b) => b.pct - a.pct);
  const capTotal = utilRows.reduce((a, u) => a + u.cap, 0);
  const util = capTotal ? Math.min(99, Math.round(utilRows.reduce((a, u) => a + u.gbps, 0) / capTotal * 100)) : 0;
  const kpis = [
    { key: 'thr', l: 'Throughput', v: total.toFixed(1), u: 'Gbps', e: '' },
    { key: 'p95', l: 'P95 latency', v: String(p95), u: 'ms', e: '' },
    { key: 'loss', l: 'Packet loss', v: loss.toFixed(2), u: '%', e: '' },
    { key: 'egr', l: 'Egress spend', v: short(egressMo), u: '', e: '/mo' },
    { key: 'fab', l: 'On fabric', v: String(covPct), u: '%', e: '' },
    { key: 'sav', l: 'Savings', v: short(savingsMo), u: '', e: '/mo' },
    ...(capTotal ? [{ key: 'util', l: 'Utilization', v: String(util), u: '%', e: 'of attached capacity' }] : []),
  ];
  const verdict = total ? `${covPct}% of traffic on the AT&T fabric, saving ${short(savingsMo)}/mo. ${blind.length} ${blind.length === 1 ? 'region is' : 'regions are'} blind.` : 'No telemetry yet.';
  const coverage = `${covPct}% of traffic and ${Math.min(pathsCovered, est.regionsList.length)} of ${est.regionsList.length} paths are covered. ${blind.length} ${blind.length === 1 ? 'region is' : 'regions are'} blind.`;
  const subVerdict = { pub: pub.toFixed(1), total: total.toFixed(1), fab: fab.toFixed(1) };
  const briefing = total ? [
    `${pathsCovered} of ${est.regionsList.length} regions ride the private envelope, ${Math.min(...est.regionsList.filter(r => r.priv).map(r => r.fab), 99)}ms to the on-ramp serving each.`,
    blind.length ? `${blind.length} still depend on public transit; ${worst ? worst.region.split(' ')[1] : blind[0].region} is the outlier at ${worst ? worst.latency : blind[0].pub}ms on the public path.` : 'Every region is on the fabric; no public transit remains in this window.',
    `Egress is running ${short(egressMo)}/mo with ${short(pubRate)} still on public rates; private-path savings hold at ${short(savingsMo)}/mo.`,
    anomaly ? `One anomaly in the window: a transit-congestion spike on ${anomaly.region}. It remains exposed to that event class until attached.` : 'No anomalies in the window.',
  ].join(' ') : '';
  const denyN = est.regionsList.filter(r => r.priv).length * 7;
  const records = [
    ...(denyN ? [{ key: 'deny', time: `${denyN} records`, src: 'tag PCI · 11 distinct', dst: 'public internet', proto: 'tcp/443', bytes: '0 GB', path: 'vSRX · inline', action: 'deny', deny: true }] : []),
    { key: 'pub', time: `${pubFlows.length * 10} records`, src: `${[...new Set(pubFlows.map(f => 'tag ' + f.from))].slice(0, 2).join(', ')}`, dst: `${new Set(pubFlows.map(f => f.to)).size} distinct`, proto: '3 distinct', bytes: (pub * 0.24).toFixed(1) + ' GB', path: 'public', action: 'allow' },
    { key: 'prv', time: `${flows.filter(f => f.controlled).length * 10} records`, src: `${[...new Set(flows.filter(f => f.controlled).map(f => 'tag ' + f.from))].slice(0, 2).join(', ')}`, dst: `${new Set(flows.filter(f => f.controlled).map(f => f.to)).size} distinct`, proto: '3 distinct', bytes: (fab * 0.4).toFixed(1) + ' GB', path: 'private', action: 'allow' },
  ].filter(r => !r.time.startsWith('0 '));
  const northSouth = pct(flows.filter(f => f.kind === 'App' && f.controlled).reduce((a, f) => a + f.gbps, 0), total || 1);
  const eastWest = pct(flows.filter(f => f.kind !== 'App' && f.controlled).reduce((a, f) => a + f.gbps, 0), flows.filter(f => f.kind !== 'App').reduce((a, f) => a + f.gbps, 0) || 1);
  const pathsSummary = `${covPct}% under AT&T control · North-south ${northSouth}% · East-west ${eastWest}% · ${steered.length} steered`;
  const sankey = sankey3(est, flows, split);
  return { flows: flows.sort((a, b) => (a.kind === b.kind ? b.gbps - a.gbps : a.kind === 'App' ? -1 : 1)), total, fab, pub, covPct, kpis, verdict, coverage, subVerdict, briefing, records, pathsSummary, sankey, savingsMo, egressMo, blind, worst, pathsCovered, util, capGbps: capTotal, utilRows };
}

function short(n) { return n >= 1000 ? '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + n; }

function sankey3(est, flows, split) {
  // Three source groups (sites, cloud workloads by tag, cloud to cloud) → fabric or public → destinations.
  // Every node keeps a minimum height so its label always has room; the picture grows instead of overlapping.
  const W = 900, colW = 12, minH = 16, pad = 6, headH = 18, gap = 24, top = 20;
  const perSite = { 'Data center': 6, Campus: 2.5, Plant: 1.5, Office: 0.8, Branch: 0.04, Edge: 0.005, Field: 0.3 };
  const siteGroups = {};
  (est.sites || []).forEach(s => {
    const cls = S.classOf(s); const c = S.CLASS[cls]; const count = S.countOf(s.name); const v = (perSite[cls] || 0.5) * count;
    const g = siteGroups[cls] = siteGroups[cls] || { kind: 'site', key: 'site:' + cls, cls, unit: c.unit, plural: c.plural, n: 0, v: 0, fabV: 0 };
    g.n += count; g.v += v; g.fabV += s.priv ? v : v * 0.1;
  });
  const sites = Object.values(siteGroups).map(g => ({ ...g, name: `${g.n.toLocaleString('en-US')} ${g.n === 1 ? g.unit : g.plural}` })).sort((a, b) => b.v - a.v);
  const grp = (list, kind) => { const m = {}; list.forEach(f => { const g = m[f.from] = m[f.from] || { kind, key: kind + ':' + f.from, name: f.from, v: 0, fabV: 0 }; g.v += f.gbps; if (f.controlled) g.fabV += f.gbps; }); return Object.values(m).sort((a, b) => b.v - a.v); };
  const tags = grp(flows.filter(f => f.kind === 'App'), 'tag');
  const regions = grp(flows.filter(f => f.kind !== 'App'), 'region');
  // In-place split (2026-09-09): a clicked site class opens by metro, a clicked tag group opens by region; the rest of the picture stays.
  const sitesS = split && split.kind === 'site' ? sites.flatMap(n => n.cls === split.name ? split.nodes : [n]) : sites;
  const tagsS = split && split.kind === 'tag' ? tags.flatMap(n => n.name === split.name ? split.nodes : [n]) : tags;
  const groups = [{ head: 'Sites · first mile', nodes: sitesS }, { head: 'Cloud workloads by tag', nodes: tagsS }, { head: 'Cloud to cloud', nodes: regions }].filter(g => g.nodes.length);
  const dmap = {};
  flows.forEach(f => { const d = dmap[f.to] = dmap[f.to] || { kind: 'dest', key: 'dest:' + f.to, name: f.to, v: 0, fabV: 0 }; d.v += f.gbps; if (f.controlled) d.fabV += f.gbps; });
  const sitesV = sites.reduce((a, s) => a + s.v, 0), sitesFab = sites.reduce((a, s) => a + s.fabV, 0);
  const dests = [...(sitesV ? [{ kind: 'dest', key: 'dest:regions', name: 'Cloud regions (from sites)', v: sitesV, fabV: sitesFab }] : []), ...Object.values(dmap).sort((a, b) => b.v - a.v)];
  const T = groups.reduce((a, g) => a + g.nodes.reduce((x, n) => x + n.v, 0), 0);
  const fabV = groups.reduce((a, g) => a + g.nodes.reduce((x, n) => x + n.fabV, 0), 0);
  const mids = [{ kind: 'mid', key: 'mid:fabric', name: 'AT&T fabric', v: fabV, priv: true }, { kind: 'mid', key: 'mid:public', name: 'Public internet', v: T - fabV, priv: false }].filter(m => m.v > 0);
  const nLeft = groups.reduce((a, g) => a + g.nodes.length, 0);
  const H0 = 320;
  const leftOverhead = top + groups.length * (headH + gap) + (nLeft - groups.length) * pad;
  const scale = (H0 - leftOverhead) / (T || 1);
  const place = (arr, x, y0) => { let y = y0; return arr.map(a => { const h = Math.max(minH, a.v * scale); const o = { ...a, x, y, h, x2: x + colW, used: 0 }; y += h + pad; return o; }); };
  const heads = []; const SS = [];
  let y = top;
  groups.forEach(g => { heads.push({ x: 0, y: y - 4, anchor: 'start', text: g.head }); const placed = place(g.nodes, 0, y + headH - 6); SS.push(...placed); y = placed[placed.length - 1].y + placed[placed.length - 1].h + gap; });
  const leftH = SS.length ? y - gap + 8 : top;
  heads.push({ x: W, y: top - 4, anchor: 'end', text: 'Destinations' });
  const DD = place(dests, W - colW, top + headH - 6);
  const rightH = DD.length ? DD[DD.length - 1].y + DD[DD.length - 1].h + 8 : top;
  const H = SS.length || DD.length ? Math.max(leftH, rightH, H0) : 60;
  const midH = mids.reduce((a, m) => a + Math.max(minH, m.v * scale), 0) + pad * (mids.length - 1);
  const MM = place(mids, W / 2 - colW / 2, Math.max(top, (H - midH) / 2));
  const ribbons = [];
  const link = (a, b, v, priv) => { if (v <= 0) return; const sa = a.h / a.v, sb = b.h / b.v; const ay = a.y + a.used * sa, by = b.y + b.used * sb, ah = v * sa, bh = v * sb; a.used += v; b.used += v; const mx = (a.x2 + b.x) / 2; ribbons.push({ d: `M${a.x2},${ay} C${mx},${ay} ${mx},${by} ${b.x},${by} L${b.x},${by + bh} C${mx},${by + bh} ${mx},${ay + ah} ${a.x2},${ay + ah} Z`, priv, v }); };
  const fab = MM.find(m => m.priv), pub = MM.find(m => !m.priv);
  SS.forEach(s => { if (fab) link(s, fab, s.fabV, true); if (pub) link(s, pub, s.v - s.fabV, false); });
  DD.forEach(d => { if (fab) link(fab, d, d.fabV, true); if (pub) link(pub, d, d.v - d.fabV, false); });
  return { W, H, heads, nodes: [...SS.map(n => ({ ...n, side: 'l' })), ...MM.map(n => ({ ...n, side: 'm' })), ...DD.map(n => ({ ...n, side: 'r' }))], ribbons };
}

export function trendBand(kind, ob) {
  const pts = 24; const base = { trend: ob.total, throughput: ob.total, latency: Math.max(...ob.flows.map(f => f.latency), 1), loss: 0.19, egress: ob.egressMo / 1000, control: ob.covPct }[kind] || 10;
  const unit = { trend: 'Gbps', throughput: 'Gbps', latency: 'ms', loss: '%', egress: '$k/mo', control: '%' }[kind];
  const vals = Array.from({ length: pts }, (_, i) => base * (0.82 + 0.18 * Math.abs(Math.sin(i * 0.7 + kind.length))) * (kind === 'latency' && i === 17 ? 1.35 : 1));
  const max = Math.max(...vals) * 1.15;
  const W = 900, H = 160;
  const path = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (pts - 1) * W).toFixed(1)},${(H - v / max * (H - 20)).toFixed(1)}`).join(' ');
  return { path, area: path + ` L${W},${H} L0,${H} Z`, unit, max: max.toFixed(kind === 'loss' ? 2 : 0), last: vals[pts - 1].toFixed(kind === 'loss' ? 2 : 1), W, H };
}

export function observeFindings(est, ob) {
  if (!ob.total) return [];
  const out = [];
  if (ob.covPct < 100 && ob.blind.length) out.push({ kind: 'blindspots', layer: 'cloud', tab: 'observe', pillar: 'Observability', persona: 'FinOps & SRE', head: `${ob.blind.length} ${ob.blind.length === 1 ? 'region sends' : 'regions send'} no flow logs. ${100 - ob.covPct}% of your traffic is unseen.`, ev: `${ob.blind.map(r => r.region).join(', ')} carry ${ob.pub.toFixed(1)} Gbps with no telemetry. Coverage starts with the first attach.`, priced: false, why: 'The coverage metric turned into a finding. Telemetry, inspection and steering all begin when the region is on the fabric.', ladder: ['Attach the region', 'Hosted VPC in the region', 'Managed NOC'] });
  const degraded = ob.flows.filter(f => !f.controlled && (f.latency > 120 || f.rel === 'warn'));
  if (degraded.length) out.push({ kind: 'degraded', layer: 'cloud', tab: 'observe', pillar: 'Observability', persona: 'FinOps & SRE', head: `${degraded.length} ${degraded.length === 1 ? 'path runs' : 'paths run'} above the latency SLO or show loss.`, ev: `${degraded.slice(0, 2).map(f => `${f.name} at ${f.latency}ms`).join('; ')}${degraded.length > 2 ? ` and ${degraded.length - 2} more` : ''}. SLO is 100ms; loss is above zero on every public path.`, priced: false, why: 'Public transit has no latency floor. The fabric path to the same region is single digit milliseconds.', ladder: ['Steer the worst path onto the fabric', 'Latency SLO policy for the tag', 'Dual-attach for path diversity'] });
  return out;
}

// ---------- Station track ----------
export const STOPS = ['discover', 'connect', 'govern', 'observe', 'cost'];
export const STOP_LABEL = { discover: 'Discover', connect: 'Connect', govern: 'Govern', observe: 'Observe', cost: 'Cost' };
export function stopCta(stop, est, ob, onTable) {
  const pubWl = est.regionsList.filter(r => !r.priv).reduce((a, r) => a + r.wl, 0);
  return {
    discover: { label: pubWl ? `Attach ${pubWl.toLocaleString('en-US')}` : 'Connect', next: 'connect' },
    connect: { label: 'Govern', next: 'govern' },
    govern: { label: 'Observe', next: 'observe' },
    observe: { label: onTable ? `Cost · ${short(onTable)}/mo` : 'Cost', next: 'cost' },
    cost: { label: onTable ? `Compose · ${short(onTable)}/mo` : 'Compose', next: 'compose' },
    observe_: null,
  }[stop];
}


