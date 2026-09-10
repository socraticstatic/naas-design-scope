/*
 * AT&T AI-grade Network — NaaS storefront prototype
 * Copyright (c) 2026 AT&T Intellectual Property. All rights reserved.
 *
 * AT&T proprietary and confidential. Provided for evaluation and
 * integration by AT&T and its authorised partners. Not for redistribution.
 */
// naas-volume.js — the drawer at the point of volume (Micah, 16:23): every
// asset behind a rolled-up count, searchable, sortable worst first, filterable,
// selectable in bulk. Pure data. Added 2026-09-09.
import * as S from './naas-sites.js';
import * as P from './naas-paths.js';

const n = (x) => Number(x).toLocaleString('en-US');
const RANK = { degraded: 0, public: 1, ok: 2 };

/** State of one site: a few public sites are degraded (seeded), public is the next worst, the rest are fine. */
export function siteState(site, i) {
  if (!site.priv && (i * 13) % 89 === 5) return 'degraded';
  return site.priv ? 'ok' : 'public';
}

/** Find the metro node for a class and metro name. */
export function metroOf(est, cls, metro) {
  const c = S.siteTree(est).find(x => x.cls === cls || x.label === cls); if (!c) return null;
  return c.children.find(ch => ch.kind === 'metro' && ch.name === metro) || null;
}

/** The list behind "+N more": all sites of a metro with state, sorted worst first, filtered, paged. */
export function volumeList(est, parent, opts = {}) {
  const q = (opts.q || '').trim().toLowerCase(); const path = opts.path || 'all'; const state = opts.state || 'all'; const page = opts.page || 1; const size = opts.size || 60; const sel = new Set(opts.sel || []);
  const m = metroOf(est, parent.cls, parent.metro); if (!m) return null;
  const cls = S.CLASS[parent.cls] || S.CLASS.Branch;
  const all = S.metroSites(m).map((x, i) => ({ ...x, i, state: siteState(x, i), access: m.access, cls: parent.cls }));
  const counts = { total: all.length, fabric: all.filter(x => x.priv).length, public: all.filter(x => !x.priv).length, degraded: all.filter(x => x.state === 'degraded').length };
  let rows = all;
  if (q) rows = rows.filter(x => `${x.id} ${x.address} ${x.metro}`.toLowerCase().includes(q));
  if (path === 'fabric') rows = rows.filter(x => x.priv); if (path === 'public') rows = rows.filter(x => !x.priv);
  if (state !== 'all') rows = rows.filter(x => x.state === state);
  rows = rows.slice().sort((a, b) => RANK[a.state] - RANK[b.state] || a.ms - b.ms * 0 || a.id.localeCompare(b.id));
  const matching = rows.length; const shown = rows.slice(0, page * size);
  const selected = all.filter(x => sel.has(x.id));
  return { title: `${m.name} · ${n(m.count)} ${m.count === 1 ? cls.unit : cls.plural}`, sub: `${n(counts.fabric)} on the fabric · ${n(counts.public)} public · ${n(counts.degraded)} degraded`, counts, matching, shownCount: shown.length, hasMore: shown.length < matching, rows: shown.map(x => ({ ...x, selected: sel.has(x.id), stateLabel: x.state === 'degraded' ? 'Degraded' : x.state === 'public' ? 'Public first mile' : 'On the fabric', sub: `${x.address} · ${x.access} · ${x.ms} ms`, action: x.priv ? (x.state === 'degraded' ? 'Impact' : '') : 'Attach' })), selectedCount: selected.length, selectedPublic: selected.filter(x => !x.priv).length, matchingIds: rows.map(x => x.id), bulk: { attach: (sel.size ? selected : rows).filter(x => !x.priv).length, label: sel.size ? `${n(selected.length)} selected` : `${n(matching)} matching` } };
}

/**
 * The drawer at the point of volume, cloud side.
 *
 * The column drills cloud → region → VPC → subnet in place, beside the
 * fabric picture, because every one of those levels is small: a region has a
 * handful of VPCs, a VPC a handful of subnets. Workloads are where volume
 * arrives — a subnet holds hundreds — so that is where the column stops
 * sampling and hands off here. The handoff is a count, not a depth.
 *
 * An app is a TAG across workloads, not a level beneath one: `checkout-api`
 * gathers instances that sit in different subnets and different AZs. So the
 * app is a filter over this list, never another row to descend into.
 *
 * `scope` is { region, vpcId, snId? }. Without snId the list is the whole
 * VPC, which is what "see every workload in this VPC" needs.
 */
export function workloadList(est, inv, scope, opts = {}) {
  const q = (opts.q || '').trim().toLowerCase();
  const app = opts.path || 'all';       // the app tag, reusing the drawer's chip row
  const state = opts.state || 'all';    // all | exposed
  const page = opts.page || 1, size = opts.size || 60;
  const sel = new Set(opts.sel || []);

  const top = est.regionsList.find(r => r.region === scope.region);
  const reg = inv.flatMap(c => c.regions).find(r => r.region === scope.region);
  if (!top || !reg) return null;
  const vpc = reg.vpcs.find(v => v.id === scope.vpcId);
  if (!vpc) return null;
  const subnets = scope.snId ? vpc.subnets.filter(x => x.id === scope.snId) : vpc.subnets;
  if (!subnets.length) return null;
  const sn = scope.snId ? subnets[0] : null;

  // At a VPC the drawer shows its SUBNETS and slides into one, rather than
  // dumping every workload in the VPC as a flat list. Depth is revealed one
  // level at a time; the trail in the header climbs back out.
  if (!sn && !scope.flat) {
    const totalWl = vpc.subnets.reduce((t, x) => t + (x.workloads || []).length, 0);
    const rows = vpc.subnets.map(x => {
      const ws = x.workloads || [];
      const exp = ws.filter(y => y.exposed).length;
      return {
        id: x.name, snId: x.id, descend: true,
        state: x.pub ? 'public' : 'fabric',
        stateLabel: x.pub ? 'Public subnet' : 'Private subnet',
        sub: `${x.cidr} · ${x.az} · ${n(ws.length)} ${ws.length === 1 ? 'workload' : 'workloads'}${exp ? ` · ${exp} exposed` : ''}`,
        action: '',
      };
    });
    return {
      kind: 'workloads', level: 'subnets', apps: [],
      title: `${vpc.name} · ${n(vpc.subnets.length)} ${vpc.subnets.length === 1 ? 'subnet' : 'subnets'}`,
      sub: `${top.cloud} ${top.region} · ${n(totalWl)} workloads`,
      trail: [top.cloud, top.region, vpc.name],
      counts: { total: totalWl, exposed: 0, apps: 0 },
      matching: rows.length, shownCount: rows.length, hasMore: false, rows,
      flatDoor: { label: `All ${n(totalWl)} workloads in this VPC`, sub: 'skip the subnets' },
      selectedCount: 0, matchingIds: [], bulk: { attach: 0, label: '' },
    };
  }


  const all = subnets.flatMap(x => (x.workloads || []).map(w => ({
    ...w, snName: x.name, snCidr: x.cidr, az: x.az, snPub: !!x.pub,
    state: w.exposed ? 'public' : 'fabric',
  })));

  // Apps present here, largest first — the chip row is the app grouping.
  const byTag = {};
  for (const w of all) byTag[w.tag || 'untagged'] = (byTag[w.tag || 'untagged'] || 0) + 1;
  const apps = Object.entries(byTag).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));

  const counts = { total: all.length, exposed: all.filter(w => w.exposed).length, apps: apps.length };

  let rows = all;
  if (q) rows = rows.filter(w => `${w.name} ${w.ip} ${w.type} ${w.tag} ${w.snName}`.toLowerCase().includes(q));
  if (app !== 'all') rows = rows.filter(w => (w.tag || 'untagged') === app);
  if (state === 'exposed') rows = rows.filter(w => w.exposed);
  // Worst first: exposed before private, then by app, then by name.
  rows = rows.slice().sort((a, b) => (b.exposed - a.exposed) || String(a.tag).localeCompare(String(b.tag)) || a.name.localeCompare(b.name));

  const matching = rows.length, shown = rows.slice(0, page * size);
  const selected = all.filter(w => sel.has(w.id));
  const where = sn ? `${vpc.name} › ${sn.name}` : vpc.name;
  const trail = [top.cloud, top.region, vpc.name, ...(sn ? [sn.name] : [])];

  return {
    kind: 'workloads', level: 'workloads', trail, apps,
    title: `${where} · ${n(all.length)} ${all.length === 1 ? 'workload' : 'workloads'}`,
    sub: `${top.cloud} ${top.region} · ${n(counts.apps)} ${counts.apps === 1 ? 'app' : 'apps'} · ${n(counts.exposed)} exposed`,
    counts, matching, shownCount: shown.length, hasMore: shown.length < matching,
    rows: shown.map(w => ({
      ...w,
      id: w.name,
      selected: sel.has(w.id),
      stateLabel: w.exposed ? 'Exposed to the internet' : 'Private',
      sub: `${w.ip} · ${w.type} · ${w.tag || 'untagged'} · ${w.snName}`,
      action: w.exposed ? 'Isolate' : '',
    })),
    selectedCount: selected.length,
    matchingIds: rows.map(w => w.id),
    bulk: {
      attach: (sel.size ? selected : rows).filter(w => w.exposed).length,
      label: sel.size ? `${n(selected.length)} selected` : `${n(matching)} matching`,
    },
  };
}
