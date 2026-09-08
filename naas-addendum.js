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
    const mkWl = (pub, a, n, cidr, tag) => Array.from({ length: Math.min(n, 6) }, (_, w) => { const t = WL_TYPES[pub ? 'pub' : 'prv'][(w + a) % WL_TYPES[pub ? 'pub' : 'prv'].length]; return { id: `${cidr}-${w}`, since: (w * 37 + a * 53 + n * 11) % 365, name: `${t[0]}-${'abc'[a]}${w + 1}`, type: t[1], ip: cidr.replace(/0\/24$/, String(10 + w * 7)), tag, exposed: pub && w < 2 }; });
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
const GBPS_PER_WL = 0.14;
const DESTS = ['AI endpoints', 'object storage', 'public internet', 'SaaS', 'inter-cloud'];

export function observe(est, steered, inv) {
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
    { key: 'p95', l: 'P95 Latency', v: String(p95), u: 'ms', e: '' },
    { key: 'loss', l: 'Packet Loss', v: loss.toFixed(2), u: '%', e: '' },
    { key: 'egr', l: 'Egress Spend', v: short(egressMo), u: '', e: '/mo' },
    { key: 'fab', l: 'On the AT&T fabric', v: String(covPct), u: '%', e: '' },
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
  const sankey = sankey3(est, flows);
  return { flows: flows.sort((a, b) => (a.kind === b.kind ? b.gbps - a.gbps : a.kind === 'App' ? -1 : 1)), total, fab, pub, covPct, kpis, verdict, coverage, subVerdict, briefing, records, pathsSummary, sankey, savingsMo, egressMo, blind, worst, pathsCovered, util, capGbps: capTotal, utilRows };
}

function short(n) { return n >= 1000 ? '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : '$' + n; }

function sankey3(est, flows) {
  const W = 900, H = 300, colW = 12;
  const siteGroups = {};
  est.sites.forEach(s => { const k = s.rollup ? s.name : s.cls === 'Data center' ? 'data centers' : 'offices'; siteGroups[k] = siteGroups[k] || { name: k, v: 0, priv: s.priv, n: 0 }; siteGroups[k].v += s.priv ? 4 : 3; siteGroups[k].n++; });
  const srcs = Object.values(siteGroups).map(g => ({ ...g, name: g.n > 1 && !g.name.includes('(') ? `${g.n} ${g.name} ›` : g.name }));
  const groups = {};
  flows.forEach(f => { groups[f.from] = groups[f.from] || { name: f.from, v: 0, fabV: 0 }; groups[f.from].v += f.gbps; if (f.controlled) groups[f.from].fabV += f.gbps; });
  const total = flows.reduce((a, f) => a + f.gbps, 0) || 1;
  const sV = srcs.reduce((a, b) => a + b.v, 0) || 1;
  srcs.forEach(s => { s.v = s.v / sV * total * 0.3; s.fabV = s.priv ? s.v * 0.9 : s.v * 0.05; });
  const S = [...srcs, ...Object.values(groups)];
  const T = S.reduce((a, b) => a + b.v, 0);
  const fabV = S.reduce((a, b) => a + b.fabV, 0);
  const M = [{ name: 'Public internet', v: T - fabV, priv: false }, { name: 'AT&T fabric', v: fabV, priv: true }];
  const dmap = {};
  flows.forEach(f => { dmap[f.to] = dmap[f.to] || { name: f.to, v: 0, fabV: 0 }; dmap[f.to].v += f.gbps; if (f.controlled) dmap[f.to].fabV += f.gbps; });
  const Dn = Object.values(dmap); const dT = Dn.reduce((a, b) => a + b.v, 0) || 1; Dn.forEach(d => { d.fabV = d.fabV / d.v * (d.v / dT * T); d.v = d.v / dT * T; });
  const stack = (arr, x) => { let y = 8; const pad = 6; const scale = (H - 16 - pad * (arr.length - 1)) / T; return arr.map(a => { const h = Math.max(2, a.v * scale); const o = { ...a, x, y, h, x2: x + colW, used: 0 }; y += h + pad; return o; }); };
  const SS = stack(S, 0), MM = stack(M, W / 2 - colW / 2), DD = stack(Dn, W - colW);
  const ribbons = [];
  const link = (a, b, v, priv) => { if (v <= 0) return; const sa = a.h / a.v, sb = b.h / b.v; const ay = a.y + a.used * sa, by = b.y + b.used * sb, ah = v * sa, bh = v * sb; a.used += v; b.used += v; const mx = (a.x2 + b.x) / 2; ribbons.push({ d: `M${a.x2},${ay} C${mx},${ay} ${mx},${by} ${b.x},${by} L${b.x},${by + bh} C${mx},${by + bh} ${mx},${ay + ah} ${a.x2},${ay + ah} Z`, priv }); };
  SS.forEach(s => { link(s, MM[1], s.fabV, true); link(s, MM[0], s.v - s.fabV, false); });
  DD.forEach(d => { link(MM[1], d, d.fabV, true); link(MM[0], d, d.v - d.fabV, false); });
  return { W, H, nodes: [...SS.map(n => ({ ...n, side: 'l' })), ...MM.map(n => ({ ...n, side: 'm' })), ...DD.map(n => ({ ...n, side: 'r' }))], ribbons };
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

// ---------- AI Fabric Insights ----------
export function aiInsights(est, metric) {
  const gpu = est.regionsList.filter(r => r.tags.includes('GPU') || r.tags.includes('AI')).reduce((a, r) => a + r.wl, 0);
  const tokensB = +(gpu * 0.0282).toFixed(2);
  const spend = Math.round(gpu * 14.2);
  const tiles = [
    { key: 'tok', l: 'Tokens', v: tokensB ? tokensB + 'B' : '0', e: 'all on governed paths', on: metric === 'tokens' },
    { key: 'spend', l: 'Spend', v: '$' + spend.toLocaleString('en-US'), e: '/today', on: metric === 'spend' },
    { key: 'ttft', l: 'TTFT (p95 latency)', v: '246', u: 'ms', e: 'P95 across 3 models', on: false },
    { key: 'blk', l: 'Blocked requests', v: '0', e: 'no request denied by policy today', on: false },
  ];
  const ids = [{ name: 'rd-helion', v: 2.4, model: 'CoreWeave H100', prov: 'CoreWeave/helion-70b', color: '#0057b8' }, { name: 'classified-helion', v: 0.9, model: 'Nebius L40S', prov: 'Nebius/helion-cls-13b', color: '#00235a' }, { name: 'shared-services', v: 1.6, model: 'OpenAI API', prov: 'OpenAI (external)/GPT-class', color: '#00abeb' }];
  const T = ids.reduce((a, b) => a + b.v, 0);
  const W = 1100, H = 320, colW = 10; const cols = [0, 370, 730, W - colW];
  const stack = (x) => { let y = 8; const pad = 10; const scale = (H - 16 - pad * 2) / T; return ids.map(a => { const h = a.v * scale; const o = { ...a, x, y, h, x2: x + colW }; y += h + pad; return o; }); };
  const C = cols.map(stack);
  const ribbons = [];
  for (let c = 0; c < 3; c++) C[c].forEach((a, i) => { const b = C[c + 1][i]; const mx = (a.x2 + b.x) / 2; ribbons.push({ d: `M${a.x2},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y} L${b.x},${b.y + b.h} C${mx},${b.y + b.h} ${mx},${a.y + a.h} ${a.x2},${a.y + a.h} Z`, fill: a.color }); });
  const nodes = C.flatMap((col, c) => col.map((n, i) => ({ ...n, key: `n${c}${i}`, label: [n.name, n.model, c === 2 ? (i === 1 ? 'Public internet' : '') : '', n.prov][c], val: n.v.toFixed(2) + 'B', lx: c === 3 ? n.x - 268 : n.x2 + 8, anchor: c === 3 ? 'flex-end' : 'flex-start', shift: '0', fill: c === 2 ? '#0057b8' : n.color })));
  const heads = [{ key: 'h0', x: 0, t: 'Identity', s: 'User / Agent', a: 'left' }, { key: 'h1', x: 370, t: 'Source', s: 'Model endpoint', a: 'left' }, { key: 'h2', x: 730, t: 'Fabric route', s: 'Egress path', a: 'left' }, { key: 'h3', x: W, t: 'Provider / model', s: 'Destination', a: 'right' }];
  return { tiles, sankey: { W, H, nodes, ribbons, heads }, latency: { direct: 38, routed: 50 }, share: [{ key: 'oa', name: 'OpenAI (external)', pct: 76, color: '#00abeb' }, { key: 'cw', name: 'CoreWeave', pct: 21, color: '#0057b8' }, { key: 'nb', name: 'Nebius', pct: 3, color: '#00235a' }] };
}
