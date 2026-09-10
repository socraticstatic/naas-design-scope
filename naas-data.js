/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
export const LAYERS = [
  // The AI Fabric stratum stays in the fabric picture. It is a greyed,
  // non-interactive band inside the AT&T FABRIC box - removing it left the
  // box a quarter empty, because the band is drawn in four equal strata.
  { id: 'ai', label: 'AI Fabric', tagline: 'The token layer' },
  { id: 'cloud', label: 'Cloud', tagline: 'The on-ramp layer, with control' },
  { id: 'net', label: 'Network services', tagline: 'The services layer' },
  { id: 'transport', label: 'Transport and access', tagline: 'The physical layer' },
];

export const VIEWS = [
  { id: 'live', label: 'Live estate' },
  { id: 'empty', label: 'New customer' },
  { id: 'partial', label: 'Growing' },
  { id: 'mature', label: 'Established' },
  { id: 'trust', label: 'Bank scale' },
];

export const HEADSTART = [
  { n: '41', label: 'metros with on-ramps', cat: 'private' },
  { n: '12', label: 'clouds and neoclouds', cat: 'hosted' },
  { n: '9', label: 'Last Mile metros live', cat: 'maxres' },
  { n: '6', label: 'connection types', cat: 'internet' },
];

// x: { link: 'ok'|'degraded', paths: 1|2, acct: string } for the Observe connections panel (2026-09-09).
const REG = (cloud, region, wl, priv, ramp, pub, fab, tags, rel, x) => ({ cloud, region, wl, priv, ramp, pub, fab, tags: tags || [], rel: rel || 'ok', link: (x && x.link) || 'ok', paths: (x && x.paths) || 1, acct: (x && x.acct) || null });

export const ESTATES = {
  empty: {
    id: 'empty', name: 'Meridian Logistics', stage: 'empty', clouds: 0, regions: 0, workloads: 0, sites: [], regionsList: [], regionsExtra: 0, privatePct: 0,
    attachedRegions: 0, policiesEnforced: 0, policiesAuthored: 0, observedPct: 0, savedMo: 0, fabricAttachPct: 0, tags: 0, findings: [], arcs: [], buckets: [], policies: [],
  },
  partial: {
    id: 'partial', name: 'Acme Corp', stage: 'partial', clouds: 3, regions: 12, workloads: 322, privatePct: 40, attachedRegions: 5, policiesEnforced: 4, policiesAuthored: 7, observedPct: 61, savedMo: 36000, fabricAttachPct: 38, tags: 14,
    sites: [
      { name: 'Dallas DC1', cls: 'Data center', access: 'AVPN (MPLS VPN)', priv: true, metro: 'Dallas' },
      { name: 'Atlanta DC2', cls: 'Data center', access: 'ADI (Dedicated Internet)', priv: false, metro: 'Atlanta' },
      { name: 'Chicago HQ', cls: 'Campus', access: 'ABF (Business Fiber)', priv: true, metro: 'Chicago' },
      { name: 'Remote sites (38)', cls: 'Branch', access: 'SD-WAN', priv: false, metro: 'Various' },
      { name: 'Denver plant', cls: 'Plant', access: 'ADI (Dedicated Internet)', priv: false, metro: 'Denver' },
    ],
    regionsList: [
      REG('AWS', 'us-east-1', 89, true, 'NetBond', 41, 9, ['PCI', 'Prod'], 'ok', { paths: 2 }),
      REG('AWS', 'us-west-2', 44, false, null, 58, 14, ['Prod']),
      REG('AWS', 'eu-west-1', 31, false, null, 96, 71, ['Internet-facing'], 'warn'),
      REG('Azure', 'eastus', 40, true, 'ER', 39, 11, ['Finance'], 'ok', { link: 'degraded', acct: 'sub 7f3a-…-21c4' }),
      REG('Azure', 'westeurope', 28, false, null, 102, 74, ['Finance']),
      REG('GCP', 'us-central1', 41, false, null, 47, 12, ['AI', 'GPU']),
      REG('GCP', 'europe-west1', 30, false, null, 99, 73, []),
    ],
    regionsExtra: 5,
    arcs: [{ from: 'us-east-1', to: 'eastus', priv: false }, { from: 'us-west-2', to: 'us-central1', priv: false }],
    policies: [
      { name: 'PCI private path', match: 'tag PCI', req: 'Private path required', matched: 34, viol: 11, state: 'enforced' },
      { name: 'Internet-facing inspection', match: 'tag Internet-facing', req: 'Inline security inspection', matched: 19, viol: 7, state: 'enforced' },
      { name: 'Finance segmentation', match: 'remote-site Finance', req: 'Segment intra-tag only', matched: 26, viol: 0, state: 'enforced' },
      { name: 'Prod no direct internet', match: 'tag Prod', req: 'No direct internet path', matched: 133, viol: 0, state: 'enforced' },
      { name: 'GPU latency SLO', match: 'tag GPU', req: 'Latency SLO 15 ms', matched: 41, viol: 18, state: 'simulated' },
      { name: 'EU residency', match: 'region eu-*', req: 'Private path required', matched: 89, viol: 89, state: 'authored' },
      { name: 'AI provider private', match: 'tag AI', req: 'Private path required', matched: 41, viol: 41, state: 'authored' },
    ],
    buckets: [
      { id: 'gpu', name: 'GPU inference egress', cloud: 'GCP', today: 31200, fabric: 12400 },
      { id: 'awsx', name: 'AWS West/EU cross-cloud', cloud: 'AWS', today: 14800, fabric: 6100 },
      { id: 'azx', name: 'Azure cross-cloud', cloud: 'Azure', today: 7400, fabric: 3300 },
      { id: 'misc', name: 'Misc internet egress', cloud: 'AWS', today: 9600, fabric: 5200 },
      { id: 'base', name: 'Committed base', cloud: 'AWS', today: 18000, fabric: 18000 },
    ],
    findings: [
      { kind: 'avoidable', layer: 'cloud', tab: 'cost', pillar: 'Cost control', persona: 'FinOps', head: '$40,800/mo of internet egress the fabric would carry for $17,600', ev: 'GPU inference and misc internet buckets on GCP and AWS, last 30 days of egress spend.', priced: true, save: 23200, why: 'Both buckets already terminate in metros with a NetBond on-ramp. Steering them changes the path, not the workload.', ladder: ['Steer this bucket on the fabric', 'Steer every internet bucket', 'Hosted VPC with AT&T egress for the region'] },
      { kind: 'crosscloud', layer: 'cloud', tab: 'cost', pillar: 'Cost control', persona: 'FinOps', head: '$22,200/mo of cross-cloud traffic crosses the public internet', ev: 'us-east-1 to eastus and us-west-2 to us-central1, both over public egress.', priced: true, save: 12800, why: 'Both pairs sit in metros where AT&T already has on-ramps for each cloud. A Cloud to Cloud path removes the hyperscaler egress charge.', ladder: ['Cloud to Cloud for the pair', 'Multi-region, multi-cloud routing', 'Neocloud reach via Equinix Fabric'] },
      { kind: 'pci', layer: 'cloud', tab: 'govern', pillar: 'Policy control', persona: 'Security and Compliance', head: '11 PCI-tagged workloads reach the internet directly', ev: '11 of 34 PCI-tagged workloads in us-east-1 have a default route to an internet gateway.', priced: false, why: 'The PCI private path policy is enforced, but these workloads sit in a VPC with no private path to enforce it on.', ladder: ['Author "private path required" for tag PCI', 'Hosted VPC in us-east-1 with the policy enforced', 'Hosted VPC plus inline inspection'] },
      { kind: 'uninspected', layer: 'cloud', tab: 'govern', pillar: 'Policy control', persona: 'Security and Compliance', head: '7 internet-facing workloads have no inspection in path', ev: '7 of 19 Internet-facing workloads in eu-west-1 egress without an NGFW (next-generation firewall).', priced: false, why: 'No hosted VPC exists in eu-west-1, so no inspection point is in the path.', ladder: ['Author "inline security inspection"', 'NGFW (Palo Alto) in path', 'Hosted VPC with the vSRX pair and AT&T egress'] },
      { kind: 'single', layer: 'transport', tab: 'connect', pillar: 'Private reach', persona: 'Network Engineering', head: '4 connections have one path', ev: 'Atlanta DC2, Denver plant, and two branch hubs reach the fabric on a single ADI (Dedicated Internet) circuit.', priced: false, why: 'A second path in a second metro lifts these sites to geodiversity.', ladder: ['Add a second ADI circuit', 'Geodiversity tier with a second metro', 'AWS Interconnect Last Mile, maximum resiliency'] },
      { kind: 'unmonitored', layer: 'net', tab: 'observe', pillar: 'Observability', persona: 'Network Engineering', head: '6 paths send no telemetry', ev: 'us-west-2, eu-west-1, westeurope, us-central1, europe-west1 and the branch SD-WAN send no flow logs to AT&T.', priced: false, why: 'Telemetry starts at the first attach. These regions are not attached yet.', ladder: ['Enable flow logs on the public paths', 'Advanced Network Monitoring for the estate', 'Managed NOC with path telemetry'] },
    ],
  },
  mature: {
    id: 'mature', name: 'DataFlow Systems', stage: 'mature', clouds: 4, regions: 18, workloads: 940, privatePct: 86, attachedRegions: 16, policiesEnforced: 14, policiesAuthored: 16, observedPct: 92, savedMo: 61400, fabricAttachPct: 78, tags: 31,
    sites: [
      { name: 'Ashburn DC', cls: 'Data center', access: 'AVPN (MPLS VPN)', priv: true, metro: 'Ashburn' },
      { name: 'San Jose DC', cls: 'Data center', access: 'AVPN (MPLS VPN)', priv: true, metro: 'San Jose' },
      { name: 'Frankfurt DC', cls: 'Data center', access: 'ASE (Switched Ethernet)', priv: true, metro: 'Frankfurt' },
      { name: 'Austin campus', cls: 'Campus', access: 'ABF (Business Fiber)', priv: true, metro: 'Austin' },
      { name: 'Remote sites (212)', cls: 'Branch', access: 'SD-WAN over AVPN', priv: true, metro: 'Various' },
      { name: 'Field (wireless)', cls: 'Mobility', access: 'Mobility first mile', priv: true, metro: 'Various' },
      { name: 'Singapore DC', cls: 'Data center', access: 'ADI (Dedicated Internet)', priv: false, metro: 'Singapore' },
    ],
    regionsList: [
      REG('AWS', 'us-east-1', 210, true, 'NetBond', 38, 8, ['PCI', 'Prod'], 'ok', { paths: 2 }),
      REG('AWS', 'us-west-2', 120, true, 'DX', 52, 12, ['Prod'], 'ok', { acct: 'acct 4102-8837-5510', paths: 2 }),
      REG('AWS', 'eu-central-1', 96, true, 'DX', 88, 19, ['Prod'], 'ok', { link: 'degraded', acct: 'acct 4102-8837-5510', paths: 1 }),
      REG('Azure', 'eastus', 140, true, 'ER', 36, 9, ['Finance'], 'ok', { acct: 'sub 7f3a-…-21c4' }),
      REG('Azure', 'westeurope', 88, true, 'ER', 91, 21, ['Finance'], 'ok', { acct: 'sub 7f3a-…-21c4' }),
      REG('GCP', 'us-central1', 110, true, 'NetBond', 44, 11, ['AI', 'GPU'], 'ok', { paths: 2 }),
      REG('CoreWeave', 'us-east-04', 64, true, 'EQX', 51, 13, ['AI', 'GPU']),
      REG('AWS', 'ap-southeast-1', 52, false, null, 188, 96, ['Prod'], 'warn'),
    ],
    regionsExtra: 10,
    arcs: [{ from: 'us-east-1', to: 'eastus', priv: true }, { from: 'us-central1', to: 'us-east-04', priv: true }, { from: 'us-west-2', to: 'us-central1', priv: true }],
    policies: [
      { name: 'PCI private path', match: 'tag PCI', req: 'Private path required', matched: 122, viol: 0, state: 'enforced' },
      { name: 'Internet-facing inspection', match: 'tag Internet-facing', req: 'Inline security inspection', matched: 61, viol: 0, state: 'enforced' },
      { name: 'Finance segmentation', match: 'remote-site Finance', req: 'Segment intra-tag only', matched: 228, viol: 0, state: 'enforced' },
      { name: 'Prod no direct internet', match: 'tag Prod', req: 'No direct internet path', matched: 478, viol: 52, state: 'enforced' },
      { name: 'GPU latency SLO', match: 'tag GPU', req: 'Latency SLO 15 ms', matched: 174, viol: 0, state: 'enforced' },
      { name: 'APAC residency', match: 'region ap-*', req: 'Private path required', matched: 52, viol: 52, state: 'simulated' },
    ],
    buckets: [
      { id: 'gpu', name: 'GPU inference egress', cloud: 'GCP', today: 18400, fabric: 18400 },
      { id: 'awsx', name: 'AWS West/EU cross-cloud', cloud: 'AWS', today: 21000, fabric: 8900 },
      { id: 'azx', name: 'Azure cross-cloud', cloud: 'Azure', today: 6200, fabric: 6200 },
      { id: 'misc', name: 'Misc internet egress', cloud: 'AWS', today: 11800, fabric: 6400 },
      { id: 'base', name: 'Committed base', cloud: 'AWS', today: 64000, fabric: 64000 },
    ],
    findings: [
      { kind: 'unmonitored', layer: 'net', tab: 'observe', pillar: 'Observability', persona: 'Network Engineering', head: '3 paths send no telemetry', ev: 'ap-southeast-1 and two Singapore ADI (Dedicated Internet) circuits send no flow logs.', priced: false, why: 'Singapore is the only site not attached to the fabric.', ladder: ['Enable flow logs on the public paths', 'Advanced Network Monitoring for APAC', 'Managed NOC with path telemetry'] },
    ],
    tailored: {
      addons: [
        { conn: 'us-east-1 hosted VPC', inspection: 'In path', segmentation: 'By tag', slo: 'Add 10 ms SLO' },
        { conn: 'eastus hosted VNet', inspection: 'Add NGFW', segmentation: 'By tag', slo: 'Add 10 ms SLO' },
        { conn: 'us-central1 hosted VPC', inspection: 'In path', segmentation: 'Add', slo: '15 ms enforced' },
        { conn: 'eu-central-1 DX', inspection: 'Add NGFW', segmentation: 'Add', slo: 'Add 25 ms SLO' },
      ],
      terms: [
        { conn: 'Ashburn NetBond 10G', od: 4200, m12: 3570, m36: 2100 },
        { conn: 'San Jose DX 10G', od: 3900, m12: 3315, m36: 1950 },
        { conn: 'Frankfurt ER 5G', od: 3100, m12: 2635, m36: 1550 },
      ],
      hubs: [
        { loc: 'Ashburn', conns: 6, hub: 'Connection Hub East', save: 'Two ports retire' },
        { loc: 'San Jose', conns: 4, hub: 'Connection Hub West', save: 'One port retires' },
      ],
    },
  },
  trust: {
    id: 'trust', name: 'Meridian Networks', stage: 'partial', clouds: 3, regions: 14, workloads: 2860, sitesCount: 4120, privatePct: 52, attachedRegions: 8, policiesEnforced: 9, policiesAuthored: 15, observedPct: 58, savedMo: 148000, fabricAttachPct: 61, tags: 42,
    sites: [
      { name: 'Data centers (6)', cls: 'Data center', access: 'AVPN (MPLS VPN)', priv: true, metro: 'Various', rollup: true },
      { name: 'Regional hubs (24)', cls: 'Hub', access: 'AVPN (MPLS VPN)', priv: true, metro: 'Various', rollup: true },
      { name: 'Remote sites, East (1,640)', cls: 'Branch', access: 'SD-WAN', priv: false, metro: 'Various', rollup: true },
      { name: 'Remote sites, Central (1,210)', cls: 'Branch', access: 'SD-WAN', priv: false, metro: 'Various', rollup: true },
      { name: 'Remote sites, West (1,180)', cls: 'Branch', access: 'SD-WAN', priv: true, metro: 'Various', rollup: true },
      { name: 'Edge devices (48)', cls: 'Edge', access: 'Mobility first mile', priv: false, metro: 'Various', rollup: true },
      { name: 'Trading floors (12)', cls: 'Campus', access: 'ASE (Switched Ethernet)', priv: true, metro: 'Various', rollup: true },
    ],
    regionsList: [
      REG('AWS', 'us-east-1', 812, true, 'NetBond', 40, 9, ['PCI', 'Prod'], 'ok', { paths: 2 }),
      REG('AWS', 'us-east-2', 420, true, 'DX', 44, 10, ['PCI'], 'ok', { link: 'degraded', acct: 'acct 6620-1194-3308' }),
      REG('AWS', 'us-west-2', 388, false, null, 60, 14, ['Prod'], 'warn'),
      REG('Azure', 'eastus', 560, true, 'ER', 38, 9, ['Finance'], 'ok', { paths: 2, acct: 'sub 0c9e-…-88b1' }),
      REG('Azure', 'centralus', 210, false, null, 51, 13, ['Finance']),
      REG('GCP', 'us-central1', 290, true, 'NetBond', 46, 12, ['AI', 'GPU']),
    ],
    regionsExtra: 8,
    arcs: [{ from: 'us-east-1', to: 'eastus', priv: true }, { from: 'us-west-2', to: 'centralus', priv: false }],
    policies: [
      { name: 'PCI private path', match: 'tag PCI', req: 'Private path required', matched: 1232, viol: 96, state: 'enforced' },
      { name: 'Internet-facing inspection', match: 'tag Internet-facing', req: 'Inline security inspection', matched: 380, viol: 140, state: 'enforced' },
      { name: 'Finance segmentation', match: 'remote-site Finance', req: 'Segment intra-tag only', matched: 770, viol: 0, state: 'enforced' },
      { name: 'Remote sites, no direct internet', match: 'tag RemoteSite', req: 'No direct internet path', matched: 4030, viol: 2850, state: 'simulated' },
    ],
    buckets: [
      { id: 'gpu', name: 'GPU inference egress', cloud: 'GCP', today: 84000, fabric: 31000 },
      { id: 'awsx', name: 'AWS West/EU cross-cloud', cloud: 'AWS', today: 62000, fabric: 24000 },
      { id: 'azx', name: 'Azure cross-cloud', cloud: 'Azure', today: 38000, fabric: 15000 },
      { id: 'misc', name: 'Misc internet egress', cloud: 'AWS', today: 44000, fabric: 26000 },
      { id: 'base', name: 'Committed base', cloud: 'AWS', today: 210000, fabric: 210000 },
    ],
    findings: [
      { kind: 'avoidable', layer: 'cloud', tab: 'cost', pillar: 'Cost control', persona: 'FinOps', head: '$128,000/mo of internet egress the fabric would carry for $57,000', ev: 'GPU inference and misc internet buckets across 3 clouds, last 30 days of egress spend.', priced: true, save: 71000, why: 'Every bucket terminates in a metro with an AT&T on-ramp already carrying this estate.', ladder: ['Steer this bucket on the fabric', 'Steer every internet bucket', 'Hosted VPC with AT&T egress for the region'] },
      { kind: 'crosscloud', layer: 'cloud', tab: 'cost', pillar: 'Cost control', persona: 'FinOps', head: '$100,000/mo of cross-cloud traffic crosses the public internet', ev: 'us-west-2 to centralus and 4 other pairs, all over public egress.', priced: true, save: 61000, why: 'Each pair has an on-ramp for both clouds in the same metro.', ladder: ['Cloud to Cloud for the pair', 'Multi-region, multi-cloud routing', 'Neocloud reach via Equinix Fabric'] },
      { kind: 'pci', layer: 'cloud', tab: 'govern', pillar: 'Policy control', persona: 'Security and Compliance', head: '96 PCI-tagged workloads reach the internet directly', ev: '96 of 1,232 PCI-tagged workloads in us-west-2 have a default route to an internet gateway.', priced: false, why: 'us-west-2 has no hosted VPC to enforce the policy on.', ladder: ['Author "private path required" for tag PCI', 'Hosted VPC in us-west-2 with the policy enforced', 'Hosted VPC plus inline inspection'] },
      { kind: 'unsegmented', layer: 'cloud', tab: 'govern', pillar: 'Policy control', persona: 'Security and Compliance', head: 'Finance and non-finance workloads share a routing domain', ev: 'centralus: 210 workloads, 84 Finance-tagged, one route table.', priced: false, why: 'Segmentation needs a hosted VNet in the region to hold the per-tag routing domains.', ladder: ['Author "segment intra-tag only"', 'Segmentation across the region\'s hosted VNet', 'Segmentation plus latency SLO per tag'] },
      { kind: 'nothub', layer: 'transport', tab: 'connect', pillar: 'Private reach', persona: 'Network Engineering', head: '2,850 connections route outside a Connection Hub', ev: 'Branches East and Central reach the clouds over SD-WAN internet paths with no Connection Hub in the metro.', priced: false, why: 'Two Connection Hubs, Atlanta and Chicago, would carry both branch groups privately.', ladder: ['Connection Hub in Atlanta', 'Connection Hubs in Atlanta and Chicago', 'Hubs plus SD-WAN steer on the fabric'] },
      { kind: 'unmonitored', layer: 'net', tab: 'observe', pillar: 'Observability', persona: 'Network Engineering', head: '2,898 paths send no telemetry', ev: 'Branches East and Central and ATMs send no flow logs to AT&T.', priced: false, why: 'Telemetry starts at the first attach.', ladder: ['Enable flow logs on the public paths', 'Advanced Network Monitoring for the estate', 'Managed NOC with path telemetry'] },
    ],
  },
};

export const KINDS = { blindspots: 'Blind spots', degraded: 'Degraded paths', avoidable: 'Avoidable egress', crosscloud: 'Cross-cloud over the internet', pci: 'PCI on public paths', uninspected: 'Uninspected internet-facing', unsegmented: 'Unsegmented', single: 'Single path', onecloud: 'One cloud', nothub: 'Not in a hub', month: 'Month to month', unmonitored: 'Unmonitored', aiuntracked: 'Untracked AI traffic' };

export const CATEGORIES = [
  { id: 'hosted', label: 'Hosted VPC and control' },
  { id: 'maxres', label: 'Max resiliency' },
  { id: 'private', label: 'Private connect' },
  { id: 'internet', label: 'Internet' },
  { id: 'security', label: 'Security' },
  { id: 'vnf', label: 'VNF' },
  { id: 'apis', label: 'APIs' },
  { id: 'managed', label: 'Managed' },
];

const P = (id, layer, cat, name, provider, promise, price, tags, proof, extra) => Object.assign({ id, layer, cat, name, provider, promise, price, tags: tags || [], proof: proof || ['99.99% uptime', '<10 ms metro', '24x7 support'], included: [], limits: [], runsWith: [], popular: 50 }, extra || {});

export const CATALOG = [
  P('hosted-vpc', 'cloud', 'hosted', 'AT&T-hosted VPC per region', 'AT&T', 'A VPC in your region with policy, routing and inspection baked in, validated live.', 2400, ['Anchor', 'AWS', 'GCP'], ['99.99% uptime', '9 ms to us-east-1', '24x7 managed'], { popular: 98, included: ['VPC in the region', 'vSRX HA pair', 'TGW (Transit Gateway) attachment', 'Private VIF plus BGP to AT&T', 'Live validation'], limits: ['One region per instance', 'Up to 10 Gbps', 'Policies unlimited'], runsWith: ['ngfw', 'steer', 'monitoring'], evidence: '78% of estates your size run this with inline inspection', stages: true }),
  P('hosted-vnet', 'cloud', 'hosted', 'AT&T-hosted VNet per region', 'AT&T', 'A VNet in your Azure region with the vSRX pair, VNet peering and private peering to AT&T.', 2400, ['Anchor', 'Azure'], ['99.99% uptime', '11 ms to eastus', '24x7 managed'], { popular: 90, included: ['VNet in the region', 'vSRX HA pair', 'VNet peering', 'Private peering plus BGP to AT&T', 'Live validation'], limits: ['One region per instance', 'Up to 10 Gbps'], runsWith: ['ngfw', 'steer'], evidence: '71% of Azure estates your size run this with segmentation by tag', stages: true }),
  P('l3-attach', 'cloud', 'hosted', 'Customer L3 attach into hosted VPC/VNet', 'AT&T', 'Bring your own VPC into the hosted VPC over a routed attachment.', 400, ['Attach'], null, { popular: 70, included: ['Routed attachment', 'BGP session', 'Route policy'], limits: ['Per attachment'], runsWith: ['hosted-vpc'] }),
  P('netbond', 'cloud', 'private', 'NetBond for Cloud', 'AT&T', 'Private on-ramp to AWS, Azure, Google Cloud and Oracle from the AT&T network.', 1800, ['On-ramp', 'AWS', 'Azure', 'GCP', 'Oracle'], ['99.99% uptime', '9 ms metro', '24x7 support'], { popular: 95, included: ['Private on-ramp', 'Up to 10 Gbps', 'BGP routing'], limits: ['Per cloud per metro'], runsWith: ['hosted-vpc', 'steer'], evidence: '84% of estates your size start here' }),
  P('steer', 'cloud', 'private', 'Steer on the AT&T fabric', 'AT&T', 'Replace public egress with the AI-grade path. Savings re-check on every change.', null, ['Savings', 'Egress'], ['99.99% uptime', '9 ms metro', 'Savings per bucket'], { popular: 88, included: ['Per-bucket steering', 'Arbitrage engine', 'Savings line on every order'], limits: ['Priced by the arbitrage engine'], runsWith: ['netbond', 'hosted-vpc'] }),
  P('c2c', 'cloud', 'private', 'Multi-region, multi-cloud routing', 'AT&T', 'Cloud to Cloud on the fabric, on the best path, never the public internet.', 1200, ['Cloud to Cloud'], ['99.99% uptime', '12 ms cross-cloud', '24x7 support'], { popular: 80, included: ['Connection Hub routing', 'Cost-aware path', 'Latency SLO (service level objective)'], limits: ['Per region pair'], runsWith: ['hosted-vpc', 'c2c'] }),
  P('neocloud', 'cloud', 'private', 'Neocloud L3 reach via Equinix Fabric', 'AT&T', 'Private reach to CoreWeave, Lambda and other neoclouds through Equinix Fabric.', 2100, ['Neocloud', 'EQX'], ['99.99% uptime', '13 ms metro', '24x7 support'], { popular: 60, included: ['Equinix Fabric virtual connection', 'L3 routing on the fabric'], limits: ['Where Equinix Fabric is present'], runsWith: ['ai-transport'] }),
  P('lmcc', 'cloud', 'maxres', 'AWS Interconnect Last Mile (LMCC)', 'AT&T', 'Maximum resiliency to AWS: two metros, two paths, one order.', 5200, ['Max resiliency', 'AWS'], ['99.999% uptime', '8 ms metro', '24x7 managed'], { popular: 75, included: ['Two metros', 'Two Direct Connect paths', 'Managed failover'], limits: ['AWS only', '9 metros live today'], runsWith: ['hosted-vpc', 'monitoring'], evidence: '92% of maximum-resiliency estates pair this with a hosted VPC' }),
  P('i2c', 'cloud', 'internet', 'Internet to Cloud', 'AT&T', 'Encrypted IP (IPSec) from any internet site into the cloud through the fabric.', 600, ['Internet', 'IPSec'], ['99.9% uptime', '20 ms metro', '24x7 support'], { popular: 72, included: ['IPSec tunnel', 'Connection Hub termination'], limits: ['Up to 1 Gbps'], runsWith: ['netbond'] }),
  P('colo', 'cloud', 'private', 'Colo to Colo', 'AT&T', 'Private connection between two colocation facilities on the fabric.', 900, ['Colo'], null, { popular: 55, included: ['Cross connect at both ends', 'L2 or L3'], limits: ['Where AT&T is present'], runsWith: ['hub'] }),
  P('hub', 'cloud', 'private', 'Connection Hub', 'AT&T', 'The routing entity. Every path in a metro terminates on one hub.', 800, ['Routing'], null, { popular: 78, included: ['Routing domain', 'Route policy', 'Up to 40 connections'], limits: ['Per metro'], runsWith: ['netbond', 'c2c'] }),
  P('policy', 'cloud', 'hosted', 'Policy engine', 'AT&T', 'Tag, region and workload policies. Author, simulate, enforce. Ships with every path.', null, ['Control', 'Ships with every path'], ['Simulate first', 'Enforced on delivery', 'Undo any time'], { popular: 85, included: ['Requirements: private path, no direct internet, inspection, segment by tag, latency SLO', 'Allow-deny, segmentation, route steering', 'Cost-aware routing'], limits: ['Included with every path'], runsWith: ['hosted-vpc'] }),
  P('ngfw', 'cloud', 'security', 'NGFW (Palo Alto) in path', 'Palo Alto', 'Next-generation firewall inserted on the path inside the hosted VPC.', 1400, ['Inspection', 'Palo Alto'], ['99.99% uptime', 'Inline', '24x7 managed'], { popular: 82, included: ['Service insertion', 'Inspection zone in flow logs'], limits: ['Per hosted VPC'], runsWith: ['hosted-vpc', 'policy'] }),
  P('observability', 'cloud', 'managed', 'Observability', 'AT&T', 'Path, throughput, latency, loss, flow logs and cost analytics per path and workload.', null, ['Control', 'Ships with every path'], ['From day one', 'Per path', 'Per workload'], { popular: 84, included: ['Path visualization', 'Traffic and policy analytics', 'Cost analytics'], limits: ['Included with every path'], runsWith: ['hosted-vpc'] }),
  P('sdwan', 'net', 'managed', 'SD-WAN', 'Cisco, VeloCloud', 'Managed SD-WAN over any first mile, steered on the fabric.', 180, ['SD-WAN'], null, { popular: 80, included: ['Managed edge', 'Policy steering'], limits: ['Per site'], runsWith: ['flexware'] }),
  P('flexware', 'net', 'vnf', 'FlexWare', 'AT&T', 'Universal CPE hosting VNFs at the site.', 220, ['VNF host'], null, { popular: 58, included: ['uCPE', 'VNF hosting'], limits: ['Per site'], runsWith: ['vnf-pan'] }),
  P('ddos', 'net', 'security', 'DDoS Defense', 'AT&T', 'Volumetric attack mitigation on the AT&T backbone.', 950, ['Security'], null, { popular: 77, included: ['Always-on detection', 'Backbone scrubbing'], limits: ['Per circuit'], runsWith: ['mfw'] }),
  P('mfw', 'net', 'security', 'Managed Firewall', 'Palo Alto', 'Palo Alto firewall managed by AT&T, in path.', 1300, ['Security', 'Palo Alto'], null, { popular: 79, included: ['Managed policy', 'Inline'], limits: ['Per site or VPC'], runsWith: ['ngfw'] }),
  P('threat', 'net', 'security', 'Threat Manager', 'AT&T', 'Threat detection and analytics across the estate.', 700, ['Security'], null, { popular: 50 }),
  P('iprotect', 'net', 'security', 'Internet Protect', 'AT&T', 'DNS and web-layer protection for every internet path.', 300, ['Security'], null, { popular: 54 }),
  P('dyndef', 'net', 'security', 'Dynamic Defense', 'AT&T', 'Network-embedded security on the AT&T backbone.', 500, ['Security'], null, { popular: 52 }),
  P('vnf-pan', 'net', 'vnf', 'Palo Alto VNF', 'Palo Alto', 'Palo Alto firewall as a VNF on FlexWare.', 900, ['VNF'], null, { popular: 48 }),
  P('vnf-f5', 'net', 'vnf', 'F5 VNF', 'F5', 'F5 load balancing as a VNF on FlexWare.', 850, ['VNF'], null, { popular: 40 }),
  P('vnf-cisco', 'net', 'vnf', 'Cisco VNF', 'Cisco', 'Cisco routing as a VNF on FlexWare.', 700, ['VNF'], null, { popular: 42 }),
  P('monitoring', 'net', 'managed', 'Advanced Network Monitoring', 'AT&T', 'Path telemetry for every connection, with alerts.', 650, ['Observability'], null, { popular: 68 }),
  P('noc', 'net', 'managed', 'Managed NOC', 'AT&T', 'AT&T runs the network operations center for your estate.', 4800, ['Managed'], null, { popular: 45 }),
  P('api-insights', 'net', 'apis', 'Network Insights API', 'AT&T', 'Telemetry and topology as an API.', null, ['API'], ['REST', 'Terraform provider', 'Sandbox'], { popular: 57, included: ['Topology', 'Telemetry', 'Findings'], limits: ['Included'], runsWith: ['api-prov'] }),
  P('api-prov', 'net', 'apis', 'Provisioning API', 'AT&T', 'Order and change connections by API or Terraform.', null, ['API'], ['REST', 'Terraform provider', 'Sandbox'], { popular: 59 }),
  P('api-bill', 'net', 'apis', 'Billing API', 'AT&T', 'Invoices, usage and savings as an API.', null, ['API'], ['REST', 'Daily refresh', 'Sandbox'], { popular: 44 }),
  P('adi', 'transport', 'internet', 'ADI (Dedicated Internet)', 'AT&T', 'Dedicated internet access as the first mile to the fabric.', 1100, ['First mile'], null, { popular: 83 }),
  P('abf', 'transport', 'internet', 'ABF (Business Fiber)', 'AT&T', 'Business fiber as the first mile.', 400, ['First mile'], null, { popular: 76 }),
  P('avpn', 'transport', 'private', 'AVPN (MPLS VPN)', 'AT&T', 'MPLS VPN, private end to end, into the fabric.', 1600, ['First mile', 'Private'], null, { popular: 81 }),
  P('ase', 'transport', 'private', 'ASE (Switched Ethernet)', 'AT&T', 'Switched Ethernet into the fabric.', 1300, ['First mile', 'Private'], null, { popular: 63 }),
  P('mobility', 'transport', 'internet', 'Mobility and wireless first mile', 'AT&T', '5G and FirstNet first mile for sites without fiber.', 120, ['First mile', 'Wireless'], null, { popular: 61 }),
  P('inet-fm', 'transport', 'internet', 'Internet first mile', 'AT&T', 'Any internet circuit into the fabric over IPSec.', 0, ['First mile'], null, { popular: 65 }),
  P('oracle-fc', 'cloud', 'private', 'Oracle FastConnect via NetBond', 'AT&T', 'Private on-ramp to Oracle Cloud regions over NetBond.', 1800, ['On-ramp', 'Oracle'], null, { popular: 45 }),
];

export const VISION = [
  { layer: 'cloud', name: 'Intent-driven auto path optimization' }, { layer: 'cloud', name: 'SD-WAN auto-onboarding' }, { layer: 'cloud', name: 'Neocloud asset discovery' }, { layer: 'cloud', name: 'Continuous discovery' },
  { layer: 'cloud', name: 'Intent-based and app-aware policies' }, { layer: 'cloud', name: 'Check Point and Fortinet NGFW' }, { layer: 'cloud', name: 'SSE and DLP insertion' }, { layer: 'cloud', name: 'AI-driven root cause' }, { layer: 'cloud', name: 'Automated cost-driven re-routing' }, { layer: 'cloud', name: 'FinOps and budget policy' }, { layer: 'cloud', name: 'SaaS control' }, { layer: 'cloud', name: 'Cloud to neocloud native' },
  { layer: 'net', name: 'Managed SASE (SSE)' }, { layer: 'net', name: 'Fortinet and Check Point VNFs' },
  { layer: 'transport', name: 'Satellite' }, { layer: 'transport', name: 'Dark fiber' },
];

export const PACKAGES = [
  { id: 'start', name: 'Start', promise: 'One cloud, reached privately, with the policy that keeps it that way.', included: ['One cloud', 'Path health visible from the first attach', 'Internet to Cloud', 'Standard resiliency', '1 Gbps', 'Private path policy'], limits: ['1 cloud', '1 Gbps', 'Standard', '5 policies'], od: 1900, m36: 950 },
  { id: 'grow', name: 'Grow', promise: 'Two clouds joined on the fabric, with a hosted VPC in each and segmentation by tag.', included: ['Two clouds', 'Telemetry from day one', 'Hosted VPC in each', 'Cloud to Cloud', 'DDoS Defense', 'Geodiversity', 'Segmentation by tag'], limits: ['2 clouds', '10 Gbps', 'Geodiversity', '25 policies'], od: 7800, m36: 3900, featured: true },
  { id: 'run', name: 'Run', promise: 'Every region hosted, inspected, monitored and cost-routed.', included: ['Hosted VPC per region with the vSRX pair', 'Telemetry from day one', 'AWS Interconnect Last Mile', 'Managed Firewall in path', 'Advanced Monitoring', 'Cost-aware routing'], limits: ['Unlimited clouds', '100 Gbps', 'Maximum', 'Unlimited policies'], od: 21000, m36: 10500 },
];

export const OUTCOMES = [
  { id: 'u1', name: 'Reach a cloud privately', dir: 'Site to cloud', control: ['Private path required'], optional: ['Inline security inspection'], desc: 'Ingress from your sites into a cloud region over the fabric.' },
  { id: 'u2', name: 'Control what leaves the cloud', dir: 'Cloud to Internet or WAN', control: ['No direct internet path', 'Inline security inspection'], desc: 'Egress from a cloud region through NGFW and AT&T egress.' },
  { id: 'u3', name: 'Join two clouds on the best path', dir: 'Cloud to cloud', control: ['Latency SLO', 'Cost-aware routing'], desc: 'Two regions joined on the fabric, latency and cost aware.' },
];

export const COMPOSE_CHIPS = {
  source: ['Data center', 'Sites', 'Internet', 'A cloud region', 'AI workloads'],
  dest: ['Clouds', 'Neoclouds', 'AI providers', 'The Internet', 'The WAN'],
  regions: { 'US East': ['Ashburn', 'Atlanta', 'New York'], 'US Central': ['Dallas', 'Chicago', 'Denver'], 'US West': ['San Jose', 'Los Angeles', 'Seattle'], 'Europe': ['Frankfurt', 'London', 'Amsterdam'], 'APAC': ['Singapore', 'Tokyo', 'Sydney'] },
  resiliency: ['Standard', 'Geodiversity', 'Maximum'],
  control: ['Private path required', 'No direct internet path', 'Inline inspection', 'Segment by tag', 'Latency SLO', 'Cost-aware routing'],
};

export const FLOWS = [
  { t: '14:02:11', src: '10.12.4.31', dst: '52.94.76.10', proto: 'TCP 443', bytes: '4.1 MB', path: 'AT&T fabric', zone: 'vSRX inspected', action: 'allow' },
  { t: '14:02:11', src: '10.12.7.8', dst: '20.42.65.90', proto: 'TCP 443', bytes: '1.8 MB', path: 'AT&T fabric', zone: 'vSRX inspected', action: 'allow' },
  { t: '14:02:12', src: '10.12.9.104', dst: '104.16.1.1', proto: 'TCP 80', bytes: '12 KB', path: 'Public internet', zone: 'None', action: 'deny' },
  { t: '14:02:12', src: '10.12.4.77', dst: '35.190.2.2', proto: 'UDP 443', bytes: '640 KB', path: 'AT&T fabric', zone: 'vSRX inspected', action: 'allow' },
  { t: '14:02:13', src: '10.12.11.2', dst: '198.51.100.7', proto: 'TCP 22', bytes: '3 KB', path: 'Public internet', zone: 'None', action: 'deny' },
  { t: '14:02:13', src: '10.12.7.41', dst: '52.94.76.14', proto: 'TCP 443', bytes: '9.7 MB', path: 'AT&T fabric', zone: 'vSRX inspected', action: 'allow' },
];

export const LIFECYCLE = ['Create VPC/VNet', 'vSRX HA pair', 'Plumb toward cloud', 'Plumb toward AT&T', 'Validated live'];
