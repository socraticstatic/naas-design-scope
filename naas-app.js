import * as D from './naas-data.js';
import { fmt, pct, heroLayout, edgePath, arcPath, drillLevel, sankey } from './naas-logic.js';
import * as A from './naas-addendum.js';
import * as R from './naas-round2.js';

const SCREENS = { s0: 'Front door', s1: 'Discover', s2: 'Floor', s3: 'Department', s4: 'Compose', s5: 'Recommend', s6: 'Review', s7: 'Marketplace', s8: 'Product' };
const TABS = ['connect', 'govern', 'observe', 'cost'];
const TAB_LABEL = { connect: 'Connect', govern: 'Govern', observe: 'Observe', cost: 'Cost' };
const TIERS = ['Start here', 'Recommended', 'Full control'];
const PERSONA_PRODUCT = { 'Steer this bucket on the fabric': 'steer', 'Steer every internet bucket': 'steer', 'Hosted VPC with AT&T egress for the region': 'hosted-vpc', 'Cloud to Cloud for the pair': 'c2c', 'Multi-region, multi-cloud routing': 'c2c', 'Neocloud reach via Equinix Fabric': 'neocloud', 'Hosted VPC in us-east-1 with the policy enforced': 'hosted-vpc', 'Hosted VPC in us-west-2 with the policy enforced': 'hosted-vpc', 'Hosted VPC plus inline inspection': 'hosted-vpc', 'NGFW (Palo Alto) in path': 'ngfw', 'Hosted VPC with the vSRX pair and AT&T egress': 'hosted-vpc', 'Advanced Network Monitoring for the estate': 'monitoring', 'Advanced Network Monitoring for APAC': 'monitoring', 'Managed NOC with path telemetry': 'noc', 'AWS Interconnect Last Mile, maximum resiliency': 'lmcc', 'Add a second ADI circuit': 'adi', '14-day AI traffic assessment': 'ai-assess', 'Add the providers to AI Fabric': 'ai-gov', 'Virtual keys with team limits': 'ai-gov', 'Connection Hub in Atlanta': 'hub', 'Connection Hubs in Atlanta and Chicago': 'hub', "Segmentation across the region's hosted VNet": 'hosted-vnet' };

export function init(c) {
  try { const h = localStorage.getItem('naas.headOpen'); if (h === 'false') c.setState({ headOpen: false }); } catch (e) {}
  const q = new URLSearchParams(location.search);
  const hash = (location.hash || '').replace('#', '').split('/');
  const patch = {};
  if (q.get('view')) patch.view = q.get('view');
  if (q.get('estate') === 'meridian') patch.estateParam = 'trust';
  if (q.get('mode') === 'browse') patch.screen = 's7';
  if (q.get('category')) { patch.screen = 's7'; patch.browseCat = q.get('category'); }
  if (SCREENS[hash[0]]) patch.screen = hash[0];
  if (hash[1] && D.LAYERS.find(l => l.id === hash[1])) patch.layer = hash[1];
  if (hash[2] && TABS.includes(hash[2])) patch.tab = hash[2];
  c.setState(patch);
  if ((patch.screen || c.state.screen) === 's1') startScan(c);
}

export function defaults() {
  return {
    screen: 's0', view: 'mature', estateParam: null, mode: 'foryou', theme: 'light', layer: 'cloud', tab: 'connect',
    steered: [], inv: {}, invSel: [], obTab: 'flow', groupBy: 'Path', aiTab: 'perf', aiMetric: 'tokens', breakdownOpen: false, events: [],
    drill: [], regionDrill: null, hoverRegion: null, hoverNode: null, bandOpen: false, picked: [], scanStep: 0, treeOrMap: 'tree', openWorkload: null, treeOpen: {}, chips: [],
    compose: { outcome: null, source: [], dest: [], regionTab: 'US East', metros: [], resiliency: 'Standard', control: [] }, freeText: '',
    order: null, submitted: false, pendingDismissed: false, browseQuery: '', browseCat: null, browseSort: 'popular', filtersOpen: false, filterProviders: [], priceCeil: 0, product: null,
    simulated: false, enforced: false, whyOpen: null, levelSort: 'largest', levelQuery: '', intakeOrg: '', intakeSource: 'credential', intakeProvider: 'AWS', approver: 'j.martinez@meridianlogistics.com', term: 36,
  };
}

function estateFor(s) {
  if (s.view === 'live') return D.ESTATES[s.estateParam || 'partial'];
  return D.ESTATES[s.view] || D.ESTATES.mature;
}

export function scrollToResult(label) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = document.querySelector('[data-screen-label="' + label + '"]');
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: 'smooth' });
  }));
}
export function vals(c) {
  const s = c.state, set = (p) => c.setState(p), estRaw = estateFor(s);
  const steered = s.steered || [];
  const persona = PERSONA_NAME[s.persona] || 'Cloud & Platform Architect';
  const est0 = { ...estRaw, regionsList: estRaw.regionsList.map(r => r.region === s.landed ? { ...r, priv: true, ramp: r.ramp || 'NetBond', rel: 'ok', landed: true } : r), attachedRegions: estRaw.attachedRegions + (s.landed ? 1 : 0) };
  const inv = A.inventory({ ...est0, regionsList: est0.regionsList.filter((r, i) => facetPass(r, i, s.chips || [])) });
  const obScope = s.obScope || 'all';
  const ob = A.observe(R.applyScope(est0, obScope), steered, inv);
  const obAll = obScope === 'all' ? ob : A.observe(est0, steered, inv);
  const hp = R.health(est0, obAll, steered);
  const est = { ...est0, observedPct: ob.total ? ob.covPct : est0.observedPct, findings: [...A.observeFindings(est0, ob), ...est0.findings] };
  const go = (screen, extra) => () => { const pre = screen === 's4' && !(extra && extra.compose) && !s.compose.outcome ? { compose: prefillCompose(est) } : {}; if (screen === 's1' && s.scanStep < 4 && est.stage !== 'empty') startScan(c); c.setState({ screen, hoverRegion: null, andiScope: null, ...pre, ...(extra || {}) }); if (screen === 's3') scrollToResult('S3 Department'); else window.scrollTo(0, 0); syncHash(screen, extra && extra.layer || s.layer, extra && extra.tab || s.tab); if (screen === 's1') startScan(c); };
  const isEmpty = est.stage === 'empty', isMature = est.stage === 'mature', isPartial = est.stage === 'partial';
  const layer = D.LAYERS.find(l => l.id === s.layer) || D.LAYERS[1];
  const layerProducts = (id) => D.CATALOG.filter(p => p.layer === id);
  const findingsFor = (id, tab) => est.findings.filter(f => f.layer === id && (!tab || f.tab === tab));
  const pKey = persona.split(/\s|&/)[0].toLowerCase();
  const pMatch = (f) => (f.persona || '').toLowerCase().startsWith(pKey) ? 1 : 0;
  const sortF = (arr) => arr.slice().sort((a, b) => (pMatch(b) - pMatch(a)) || ((b.save || 0) - (a.save || 0)));
  const personaTab = PERSONA_TAB[persona] || 'connect';
  const totalSave = est.findings.filter(f => f.priced).reduce((a, f) => a + f.save, 0);

  // ---- hero ----
  const drillInfo = s.drill.length ? drillLevel(s.drill) : null;
  const drillRows = drillInfo ? drillInfo.rows : null;
  const L = heroLayout(est, { siteRows: drillRows });
  const hoverKey = s.hoverNode;
  const dimFor = (keys) => hoverKey ? (keys.includes(hoverKey) ? 1 : 0.3) : 1;
  const layerEdgeKinds = { ai: ['egress'], cloud: ['egress', 'internet'], net: ['ingress', 'internet'], transport: ['ingress'] };
  const inDept = s.screen === 's3';
  const strataMeta = D.LAYERS.map((l, i) => {
    const live = layerProducts(l.id).length, fcount = findingsFor(l.id).length;
    const selected = inDept && s.layer === l.id;
    return { ...l, ...L.strata[i], ry: L.strata[i].y + 6, live, fcount, hasFindings: fcount > 0, selected, open: l.id === 'cloud' ? () => { window.location.href = 'Elevator Boards.dc.html#e5'; } : l.id === 'transport' ? () => {} : go('s3', { layer: l.id, tab: personaTab }), short: l.id === 'cloud' ? 'NetBond Advanced ↗' : l.id === 'transport' ? 'Vision' : '', fill: selected ? 'var(--cta)' : 'var(--bg-base)', labelColor: selected ? '#fff' : 'var(--text-heading)', subColor: selected ? '#cfe3ff' : 'var(--text-light)', op: inDept && !selected ? 0.6 : 1, ty: L.strata[i].y + 30, ty2: L.strata[i].y + 48, ty3: L.strata[i].y + 70 };
  });
  const steeredRegionNames = new Set(steered.filter(id => id.startsWith('f-')).map(id => (estRaw.regionsList[+id.split('-')[1]] || {}).region));
  const heroEdges = L.edges.map(e => {
    const keys = [e.site ? 'site' + e.site.name : null, e.region ? 'reg' + e.region.region : null, e.internet ? 'inet' : null].filter(Boolean);
    let op = dimFor(keys);
    if (inDept && !layerEdgeKinds[s.layer].includes(e.kind)) op = Math.min(op, 0.3);
    const steeredHere = e.region && steeredRegionNames.has(e.region.region);
    if (steeredHere) e = { ...e, priv: true, chip: e.chip || 'Steered', shield: false };
    const simHit = s.simulated && !s.enforced && e.region && ((e.region.tags || []).includes('PCI') || (s.customPolicies || []).some(p => p.state === 'simulated' && (e.region.tags || []).some(t => p.match.toLowerCase().includes(t.toLowerCase()))));
    const dashed = !e.priv || simHit;
    const d = edgePath(e);
    const hh = e.region ? hp.regionHealth[e.region.region] : null;
    const healthStroke = hh === 'amber' ? 'var(--warning)' : null;
    const ov = overlayFor(e, s, est0, ob, hp, R, steered, hoverKey);
    return { ...e, ...ov, key: e.id, d, op: ov.opOverride != null ? Math.min(op, ov.opOverride) : op, landed: !!(e.region && e.region.landed), amber: hh === 'amber', openObserve: hh === 'amber' ? () => { go('s3', { layer: 'cloud', tab: 'observe', obScope: 'cloud:' + e.region.cloud })(); } : null, stroke: ov.stroke || (e.ghost ? 'var(--border-primary)' : healthStroke || (e.priv ? '#3374cc' : 'var(--text-disabled)')), w: ov.w || (e.priv ? 2 : 1.5), dash: dashed ? '6 6' : 'none', crawl: !e.priv && !e.ghost, mx: (e.x1 + e.x2) / 2, my: (e.y1 + e.y2) / 2, px: e.kind === 'ingress' ? e.x2 : e.x1, py: e.kind === 'ingress' ? e.y2 : e.y1, portFill: e.priv ? '#0057b8' : 'var(--bg-base)', durS: ov.durS || (e.dur ? e.dur + 's' : '2s'), tailBegin: '-0.25s', chipW: e.chip ? e.chip.length * 8 + 14 : 0, showChip: !!e.chip && op === 1 || !!e.chip && !hoverKey, pulse: simHit || !!(e.region && e.region.landed) };
  });
  const heroSites = L.sites.map(st => ({ ...st, key: st.key, op: dimFor(['site' + st.name]), ty: st.y + 15, ty2: st.y + 29, dash: st.ghost || st.more ? '4 4' : 'none', color: st.ghost ? 'var(--text-disabled)' : st.more ? 'var(--link)' : 'var(--text-heading)', click: () => { if (st.ghost) return; if (st.more) { go('s3', { layer: 'transport', tab: 'connect' })(); return; } if (st.rollup) set({ drill: [...s.drill, st.name] }); }, enter: () => set({ hoverNode: 'site' + st.name }), leave: () => set({ hoverNode: null }), cursor: st.rollup || st.more ? 'pointer' : 'default' }));
  const heroRegions = L.regions.map(r => ({ ...r, key: r.key, op: dimFor(['reg' + r.region]), ty: r.y + 19, dash: r.ghost ? '4 4' : 'none', color: r.ghost ? 'var(--text-disabled)' : 'var(--text-heading)', relFill: r.ghost ? 'transparent' : hp.regionHealth[r.region] === 'amber' ? 'var(--warning)' : 'var(--success)', relTitle: hp.regionHealth[r.region] === 'amber' ? 'Degraded: latency spike on the public path' : 'Healthy', click: () => { if (r.ghost || r.rollup) return; set({ regionDrill: s.regionDrill === r.region ? null : r.region, andiScope: s.regionDrill === r.region ? null : { kind: 'region', id: r.region, label: r.cloud + ' ' + r.region } }); }, enter: () => set({ hoverNode: 'reg' + r.region, hoverRegion: r.ghost || r.rollup ? null : r.region }), leave: () => set({ hoverNode: null, hoverRegion: null }) }));
  const drilledRegion = s.regionDrill && est.regionsList.find(r => r.region === s.regionDrill);
  const heroWorkloads0 = drilledRegion ? (drilledRegion.tags.length ? drilledRegion.tags : ['Untagged']).map((t, i) => { const base = L.regions.find(r => r.region === drilledRegion.region); return { key: 'wl' + t, y: base.y + 3 + i * 26, label: `${t} (${Math.max(1, Math.round(drilledRegion.wl / (drilledRegion.tags.length || 1)))})`, region: drilledRegion.region, op: 1 }; }) : L.workloads.map(w => ({ ...w, op: dimFor(['reg' + w.region]) }));
  const heroWorkloads = heroWorkloads0.map(w => ({ ...w, n: String(w.label).replace(/\s*workloads?$/i, '') }));
  const heroArcs = L.arcs.map(a => ({ ...a, key: a.id, d: arcPath(a), stroke: a.priv ? '#3374cc' : 'var(--text-disabled)', dash: a.priv ? 'none' : '4 4' }));
  const hr = s.hoverRegion && est.regionsList.find(r => r.region === s.hoverRegion);
  const hrNode = hr && L.regions.find(r => r.region === hr.region);
  const bandFill = s.theme === 'dark' ? 'url(#bandGrad)' : 'var(--band)';
  const facilities = [{ name: 'AT&T Dallas (Akard)', metro: 'Dallas', ramps: ['NetBond', 'DX', 'ER'], ms: 9 }, { name: 'AT&T Ashburn', metro: 'Ashburn', ramps: ['NetBond', 'DX', 'ER', 'IX'], ms: 8 }, { name: 'Equinix Chicago (CH1)', metro: 'Chicago', ramps: ['NetBond', 'EQX'], ms: 11 }];
  const picked = s.picked;
  const facilityRows = facilities.map((f, i) => ({ ...f, key: f.name, y: L.bandY + 28 + i * 110, ramps: f.ramps.join(' · '), picked: picked.includes(f.metro), pick: () => { const p = picked.includes(f.metro) ? picked.filter(m => m !== f.metro) : [...picked, f.metro].slice(-2); set({ picked: p }); }, fill: picked.includes(f.metro) ? 'var(--cta)' : 'var(--bg-base)', color: picked.includes(f.metro) ? '#fff' : 'var(--text-heading)' }));
  const routePreview = picked.length === 2 ? { a: picked[0], b: picked[1], ms: Math.abs(facilities.find(f => f.metro === picked[0]).ms - facilities.find(f => f.metro === picked[1]).ms) + 14, y1: facilityRows.find(f => f.metro === picked[0]).y + 30, y2: facilityRows.find(f => f.metro === picked[1]).y + 30 } : null;

  // ---- rollup cards ----
  const rollup = [
    { key: 'disc', label: 'Discovered', value: isEmpty ? 'Nothing yet' : `${est.workloads.toLocaleString('en-US')} assets`, sub: isEmpty ? 'Start the scan' : `${est.clouds} clouds, ${est.regions} regions`, bar: null, go: go('s1') },
    { key: 'att', label: 'Attached', value: isEmpty ? '0 regions' : `${est.attachedRegions} of ${est.regions} regions`, sub: isEmpty ? 'No private paths' : `${pct(est.attachedRegions, est.regions)}% attach rate`, bar: pct(est.attachedRegions, est.regions), go: go('s3', { layer: 'cloud', tab: 'connect' }) },
    { key: 'gov', label: 'Governed', value: `${est.policiesEnforced} of ${est.policiesAuthored} policies`, sub: '', bar: pct(est.policiesEnforced, est.policiesAuthored), go: go('s3', { layer: 'cloud', tab: 'govern' }) },
    { key: 'obs', label: 'Observed', value: `${est.observedPct}%`, sub: '', bar: est.observedPct, go: go('s3', { layer: 'cloud', tab: 'observe' }) },
    { key: 'saved', label: 'Saved', value: ob.savingsMo ? fmt(ob.savingsMo) + '/mo' : 'Nothing yet', sub: totalSave ? `+${fmt(totalSave)}/mo on the table` : '', bar: null, go: go('s3', { layer: 'cloud', tab: 'cost' }) },
    { key: 'fab', label: 'Fabric attach', value: `${est.fabricAttachPct}%`, sub: '', bar: est.fabricAttachPct, go: go('s3', { layer: 'transport', tab: 'connect' }) },
  ].map(r => ({ ...r, hasSub: !!r.sub, alarm: r.bar !== null && r.bar < 50, barColor: r.bar !== null && r.bar < 50 ? 'var(--warning)' : 'var(--cta)', barW: (r.bar || 0) + '%', hasBar: r.bar !== null }));

  // ---- findings ----
  const findingCard = (f) => {
    const open = s.whyOpen === f.kind;
    return { ...f, key: f.kind, kindLabel: D.KINDS[f.kind], rec: (() => { const tiers = f.ladder.map((t, i) => ({ name: t, i })); const r = tiers[1] || tiers[0]; return { name: r ? r.name : 'Choose', choose: () => { const pid = PERSONA_PRODUCT[r.name]; if (pid) go('s8', { productId: pid })(); else go('s4')(); } }; })(), askAndi: () => set({ andiScope: { kind: 'finding', id: f.kind, label: D.KINDS[f.kind] }, andiOpen: true }), saveLine: f.priced ? `save ${fmt(f.save)}/mo` : '', toggleWhy: () => set({ whyOpen: open ? null : f.kind }), whyOpen: open, whyLabel: open ? 'Hide why' : 'Why we recommend this',
      tiers: f.ladder.map((t, i) => { const pid = PERSONA_PRODUCT[t]; const prod = pid && D.CATALOG.find(p => p.id === pid); const price = prod && prod.price ? `Starting at ${fmt(prod.price)}/mo` : (prod && prod.price === 0 ? 'No charge' : 'Priced after survey'); return { key: t, tier: TIERS[i], name: t, featured: i === 1, price: f.priced && i === 0 ? `save ${fmt(Math.round(f.save * 0.6))}/mo` : f.priced ? `save ${fmt(f.save)}/mo` : price, choose: () => chooseTier(c, f, t, prod, est) }; }) };
  };
  const floorFindings = sortF(est.findings).slice(0, 1).map(findingCard);
  const moreByTab = ['connect', 'govern', 'observe', 'cost'].map(t => ({ key: t, label: TAB_LABEL[t], n: est.findings.filter(f => f.tab === t && f.layer !== 'ai').length, go: go('s3', { layer: 'cloud', tab: t }) })).filter(x => x.n > 0);

  // ---- department ----
  const deptFindings = (tab) => sortF(findingsFor(s.layer, tab)).map(findingCard);
  const mostChosen = layerProducts(s.layer).sort((a, b) => b.popular - a.popular).slice(0, 3).map(p => productCard(c, p, est));
  const levelItems = levelMap(s, est, layer, drillInfo, set).filter(t => !s.levelQuery || t.name.toLowerCase().includes(s.levelQuery.toLowerCase()));
  const sorted = levelItems.sort((a, b) => s.levelSort === 'az' ? a.name.localeCompare(b.name) : s.levelSort === 'exposed' ? b.exposed - a.exposed : b.size - a.size).slice(0, 60);
  const baseItems = s.layer === 'cloud' ? est.regionsList.map(r => ({ exposed: r.priv ? 0 : 1 })) : levelItems;
  const exposedN = baseItems.filter(t => t.exposed > 0).length, totalN = baseItems.length;
  const noun = s.layer === 'ai' ? ['model provider', 'model providers', 'are reached over the public internet'] : s.layer === 'cloud' ? ['region', 'regions', 'still ride the public internet'] : ['site', 'sites', 'reach clouds over the public internet'];
  const connectVerdict = isEmpty ? 'Nothing connected yet. AT&T already sees 41 metros with on-ramps and 12 clouds you could reach.' : exposedN ? `${exposedN} of ${totalN} ${noun[1]} ${noun[2]}. ${totalN - exposedN} ${totalN - exposedN === 1 ? 'is' : 'are'} on the AT&T fabric${s.layer === 'cloud' && est.regionsExtra ? `, plus ${est.regionsExtra} smaller regions rolled up` : ''}.` : `Every ${noun[0]} is on the AT&T fabric.`;
  const connectEmptyHead = isEmpty ? 'Nothing connected yet' : connectVerdict;
  const catalogRow = layerProducts(s.layer).sort((a, b) => (a.id === 'hosted-vpc' ? -1 : b.id === 'hosted-vpc' ? 1 : b.popular - a.popular)).map(p => productCard(c, p, est));
  const visionRow = D.VISION.filter(v => v.layer === s.layer).map(v => ({ key: v.name, name: v.name }));
  const policies = [...layerPolicies(s, est), ...(s.layer === 'cloud' ? (s.customPolicies || []) : [])].map(p => ({ ...p, key: p.name, dot: p.state === 'enforced' ? 'var(--success)' : p.state === 'simulated' ? 'var(--warning)' : 'var(--text-disabled)', violColor: p.viol ? 'var(--error)' : 'var(--text-body)', matched: p.matched.toLocaleString('en-US'), viol: p.viol.toLocaleString('en-US') }));
  const pciViol = (est.findings.find(f => f.kind === 'pci') || {}).head;
  const governVerdict = isEmpty ? 'No policies yet. Three starting points below.' : `${est.policiesEnforced} policies enforced. ${pciViol || (est.policiesAuthored - est.policiesEnforced) + ' authored but not enforced.'}`;
  const buckets = layerBuckets(s, est).map(b => ({ ...b, key: b.id, todayF: fmt(b.today), fabricF: fmt(b.fabric), savedF: b.today > b.fabric ? fmt(b.today - b.fabric) : 'On the fabric', saved: b.today - b.fabric, action: b.today > b.fabric ? 'Steer this bucket' : 'Already steered', canSteer: b.today > b.fabric, steer: () => steerBucket(c, b, est), arb: `${fmt(b.today)}/mo today on ${b.cloud} · ${fmt(b.fabric)}/mo on the fabric · save ${fmt(b.today - b.fabric)}/mo` }));
  const steerable = buckets.filter(b => b.canSteer);
  const bTotal = buckets.reduce((a, b) => a + b.today, 0), bFab = buckets.reduce((a, b) => a + b.fabric, 0);
  const costVerdict = isEmpty ? 'No egress seen yet.' : totalSave ? `${fmt(totalSave)}/mo on the table across ${est.findings.filter(f => f.priced).length} priced findings. ${fmt(ob.savingsMo)}/mo already saved on the fabric.` : steerable.length ? `${fmt(steerable.reduce((a, b) => a + b.today, 0))}/mo leaves through public egress that the fabric would carry for ${fmt(steerable.reduce((a, b) => a + b.fabric, 0))}.` : 'Every bucket is already on the fabric.';
  const kpis = isEmpty ? [] : kpiTiles(s, est);
  const sk = isEmpty ? null : sankey(est);
  const sankeyNodes = sk ? sk.nodes.map((n, i) => ({ ...n, key: 'n' + i, fill: n.priv ? '#0057b8' : 'var(--text-disabled)', tx: n.x === 0 ? n.x2 + 8 : n.x > 800 ? n.x - 8 : n.x2 + 8, anchor: n.x > 800 ? 'end' : 'start', ty: n.y + n.h / 2 + 4, h: Math.max(2, n.h) })) : [];
  const sankeyRibbons = sk ? sk.ribbons.map((r, i) => ({ ...r, key: 'r' + i, fill: r.priv ? '#3374cc' : '#8a949c' })) : [];
  const flows = isEmpty ? [] : D.FLOWS.map((f, i) => ({ ...f, key: 'f' + i, deny: f.action === 'deny', bg: f.action === 'deny' ? 'var(--bg-accent)' : 'transparent', dot: f.action === 'deny' ? 'var(--error)' : 'var(--success)' }));
  const verbTabs = TABS.map(t => ({ key: t, label: TAB_LABEL[t], sub: layer.sub ? layer.sub[t] : '', active: s.tab === t, go: () => { set({ tab: t }); syncHash('s3', s.layer, t); scrollToResult('S3 Department'); } }));
  const crumbs = [{ key: 'floor', label: 'Floor', go: go('s2', { drill: [] }) }, ...s.drill.map((d, i) => ({ key: 'd' + i, label: d, go: () => set({ drill: s.drill.slice(0, i + 1) }) }))];
  const drillLabel = drillInfo ? `${drillInfo.label} in ${s.drill[s.drill.length - 1]}` : '';

  // ---- compose ----
  const cp = s.compose;
  const outcome = D.OUTCOMES.find(o => o.id === cp.outcome);
  const setC = (patch) => set({ compose: { ...cp, ...patch } });
  const toggle = (field, v, single) => () => { if (single) return setC({ [field]: v }); const arr = cp[field]; setC({ [field]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }); };
  const chipRow = (field, list, single) => list.map(v => ({ key: v, label: v, on: single ? cp[field] === v : cp[field].includes(v), click: toggle(field, v, single) }));
  const metroChips = (D.COMPOSE_CHIPS.regions[cp.regionTab] || []).map(m => ({ key: m, label: m, on: cp.metros.includes(m), click: () => setC({ metros: cp.metros.includes(m) ? cp.metros.filter(x => x !== m) : [...cp.metros, m].slice(-2) }) }));
  const regionTabs = Object.keys(D.COMPOSE_CHIPS.regions).map(r => ({ key: r, label: r, active: cp.regionTab === r, click: () => setC({ regionTab: r }) }));
  const constraint = cp.resiliency === 'Maximum' && cp.metros.length < 2 ? 'Maximum resiliency needs two metros. Add one.' : cp.resiliency === 'Geodiversity' && cp.metros.length < 2 ? 'Geodiversity needs two metros. Add one.' : cp.outcome === 'u3' && cp.dest.length < 1 ? 'Cloud to cloud needs a destination cloud. Pick one.' : '';
  const composed = composeOrder(cp, outcome, est);
  const summary = { ...composed, ready: !!outcome && !constraint, outcomeName: outcome ? outcome.name : 'Pick an outcome to start', dir: outcome ? outcome.dir : '', providers: [...cp.source, ...cp.dest].join(', ') || (outcome ? 'Pick a source and destination' : ''), tier: cp.resiliency, policyLine: composed.policies.map(p => p.req).join(' · ') || 'Control ships with the path', priceLine: composed.monthly ? `Starting at ${fmt(composed.monthly)}/mo` : '', saveLine: composed.savings ? `save ${fmt(composed.savings)}/mo vs public egress` : '', timeline: `${composed.days} business days`, wires: cp.resiliency === 'Standard' ? 1 : 2, wireW: cp.resiliency === 'Maximum' ? 4 : cp.resiliency === 'Geodiversity' ? 3 : 2, shield: cp.control.includes('Inline inspection') || cp.control.includes('No direct internet path'), ghost: !outcome, srcLabel: cp.source[0] || 'Source', dstLabel: cp.dest[0] || 'Destination', dir: outcome ? outcome.dir : '' };
  const outcomeCards = D.OUTCOMES.map(o => ({ ...o, key: o.id, on: cp.outcome === o.id, click: () => setC({ outcome: o.id, control: o.control.slice(), source: o.id === 'u1' ? ['Data center'] : ['A cloud region'], dest: o.id === 'u2' ? ['The Internet'] : ['Clouds'] }), controlLine: o.control.join(', ') }));

  // ---- review ----
  const ord = s.order || composed;
  const orderLines = (ord.lines || []).map((l, i) => ({ ...l, key: 'l' + i, monthlyF: l.unpriced ? 'Priced after survey' : fmt(l.monthly) + '/mo', color: l.unpriced ? 'var(--text-light)' : 'var(--text-heading)' }));
  const pricedTotal = (ord.lines || []).filter(l => !l.unpriced).reduce((a, l) => a + l.monthly, 0);
  const termDisc = { 0: 0, 12: 15, 24: 30, 36: 50 }[s.term];
  const termTotal = Math.round(pricedTotal * (1 - termDisc / 100));
  const unpriced = (ord.lines || []).filter(l => l.unpriced).map((l, i) => ({ key: 'u' + i, product: l.product }));
  const orderPolicies = (ord.policies || []).map((p, i) => ({ ...p, key: 'p' + i }));
  const orderInspection = (ord.lines || []).some(l => /hosted VPC|hosted VNet|Hosted VPC/i.test(l.product || '')) ? ', with inspection from the vSRX pair' : '';
  const termOptions = [0, 12, 24, 36].map(t => ({ key: 't' + t, label: t ? t + '-month' : 'On-demand', on: s.term === t, click: () => set({ term: t }) }));

  // ---- browse ----
  const q = s.browseQuery.trim().toLowerCase();
  const filtered = D.CATALOG.filter(p => (!s.browseCat || p.cat === s.browseCat) && (!q || (p.name + ' ' + p.promise + ' ' + p.tags.join(' ')).toLowerCase().includes(q)) && (!s.filterProviders.length || s.filterProviders.includes(p.provider)) && (!s.priceCeil || (p.price || 0) <= s.priceCeil));
  const sortedProducts = filtered.sort((a, b) => s.browseSort === 'price' ? (a.price || 0) - (b.price || 0) : s.browseSort === 'name' ? a.name.localeCompare(b.name) : b.popular - a.popular);
  const results = sortedProducts.map(p => productCard(c, p, est));
  const browsing = !!(q || s.browseCat || s.filterProviders.length || s.priceCeil);
  const providers = [...new Set(D.CATALOG.map(p => p.provider))];
  const filterCount = s.filterProviders.length + (s.priceCeil ? 1 : 0) + (s.browseCat ? 1 : 0);
  const categories = D.CATEGORIES.map(cat => ({ ...cat, key: cat.id, count: D.CATALOG.filter(p => p.cat === cat.id).length, on: s.browseCat === cat.id, click: () => set({ browseCat: s.browseCat === cat.id ? null : cat.id }) }));
  const byIds = (ids) => ids.map(id => D.CATALOG.find(p => p.id === id)).filter(Boolean).map(p => productCard(c, p, est));
  const curated = [{ key: 'most', title: 'Most chosen by estates like yours', items: byIds(['hosted-vpc', 'netbond', 'steer', 'ngfw']) }, { key: 'new', title: 'New on the fabric', items: byIds(['hosted-vnet', 'neocloud', 'lmcc', 'ai-transport']) }, { key: 'ai', title: 'Runs with AI Fabric', items: byIds(['ai-gov', 'ai-assess', 'ai-transport', 'neocloud']) }];
  const visionTiles = D.VISION.map(v => ({ key: v.name, name: v.name, layer: D.LAYERS.find(l => l.id === v.layer).label }));

  // ---- product ----
  const prod = D.CATALOG.find(p => p.id === s.product) || D.CATALOG[0];
  const pc = productCard(c, prod, est);
  const productDetail = { ...pc, included: prod.included.map(x => ({ key: x, label: x })), limits: prod.limits.map(x => ({ key: x, label: x })), runsWith: byIds(prod.runsWith || []), evidence: prod.evidence || `${60 + (prod.popular % 30)}% of estates your size run this`, hasEvidence: true, terms: prod.price ? [12, 24, 36].map(t => ({ key: 't' + t, term: t + '-month', price: fmt(prod.price * (1 - { 12: .15, 24: .3, 36: .5 }[t])) + '/mo', save: `save ${{ 12: 15, 24: 30, 36: 50 }[t]}% vs on-demand` })) : [], hasStages: !!prod.stages, stages: D.LIFECYCLE.map((l, i) => ({ key: l, label: l, x: 40 + i * 70 })) };

  // ---- discover ----
  const scanSteps = [
    { label: 'Finding cloud inventory', src: 'regions, VPCs and VNets, subnets, gateways, endpoints, workloads' },
    { label: 'Reading AT&T access records', src: 'NetBond, AVPN (MPLS VPN), ADI (Dedicated Internet), ABF (Business Fiber)' },
    { label: 'Checking on-ramp coverage per metro', src: '41 metros' },
    { label: 'Joining utilization and egress spend', src: 'last 30 days' },
  ].map((st, i) => ({ ...st, key: 'sc' + i, done: s.scanStep > i, active: s.scanStep === i, color: s.scanStep > i ? 'var(--success)' : s.scanStep === i ? 'var(--cta)' : 'var(--border-primary)', textColor: s.scanStep >= i ? 'var(--text-heading)' : 'var(--text-disabled)' }));
  const scanDone = s.scanStep >= 4 || isEmpty === false && s.scanStep >= 4;
  const discoverVerdict = isEmpty ? 'Add a cloud credential or pick an inventory to start.' : `${est.clouds} clouds, ${est.regions} regions, ${est.workloads.toLocaleString('en-US')} workloads. ${est.privatePct}% already reach AT&T privately.`;
  const discoverKpis = isEmpty ? [] : [{ key: 'a', v: est.workloads.toLocaleString('en-US'), l: 'assets discovered', e: `${est.clouds} clouds, ${est.regions} regions` }, { key: 'b', v: `${est.attachedRegions} of ${est.regions}`, l: 'regions attached', e: 'private path to AT&T' }, { key: 'c', v: `${pct(est.attachedRegions, est.regions)}%`, l: 'cloud attach rate', e: 'regions with a private path' }, { key: 'd', v: est.tags, l: 'tags discovered', e: 'from cloud resource tags' }];
  const chipSets = [{ g: 'Region', v: ['US East', 'US West', 'Europe', 'APAC'] }, { g: 'Site class', v: ['Data center', 'Branch', 'Campus'] }, { g: 'Business unit', v: ['Finance', 'Retail', 'Platform'] }, { g: 'Cloud', v: ['AWS', 'Azure', 'GCP'] }, { g: 'Connection type', v: ['NetBond', 'DX', 'ER', 'Internet'] }];
  const estateChips = chipSets.flatMap(g => g.v.map(v => ({ key: v, label: v, on: s.chips.includes(v), click: () => set({ chips: s.chips.includes(v) ? s.chips.filter(x => x !== v) : [...s.chips, v] }) })));
  const chipScope = s.chips.length ? `Scoped to ${s.chips.join(', ')}` : 'Whole estate';
  const REGION_OF = (r) => /^(us|ca|sa|eastus|centralus|westus)/.test(r) ? (/west/.test(r) && !/eu/.test(r) ? 'US West' : 'US East') : /^(eu|europe|west|north|france|uk)/.test(r) ? 'Europe' : 'APAC';
  const FACETS = [
    { values: ['US East', 'US West', 'Europe', 'APAC'], test: (r, v) => REGION_OF(r.region) === v },
    { values: ['Data center', 'Branch', 'Campus'], test: (r, v, i) => ['Data center', 'Branch', 'Campus'][i % 3] === v },
    { values: ['Finance', 'Retail', 'Platform'], test: (r, v) => v === 'Finance' ? (r.tags || []).includes('Finance') : v === 'Platform' ? (r.tags || []).some(t => /Prod|AI|GPU/.test(t)) : !(r.tags || []).length || (r.tags || []).includes('Internet-facing') },
    { values: ['AWS', 'Azure', 'GCP'], test: (r, v) => r.cloud === v },
    { values: ['NetBond', 'DX', 'ER', 'Internet'], test: (r, v) => v === 'Internet' ? !r.priv : r.ramp === v },
  ];
  const tree = est.regionsList.filter((r, i) => FACETS.every(f => { const sel = s.chips.filter(c => f.values.includes(c)); return !sel.length || sel.some(v => f.test(r, v, i)); })).map(r => {
    const openKey = r.region, open = !!s.treeOpen[openKey];
    const vpcs = [1, 2].map(n => ({ key: r.region + n, name: `${r.cloud === 'Azure' ? 'vnet' : 'vpc'}-${r.region}-${n}`, subnets: n === 1 ? 3 : 2, wl: Math.round(r.wl / 2) }));
    return { ...r, key: r.region, open, caret: open ? 'v' : '>', toggle: () => set({ treeOpen: { ...s.treeOpen, [openKey]: !open } }), vpcs, tagChips: (r.tags || []).map(t => ({ key: t, label: t })), rampLabel: r.ramp || 'Public', rampColor: r.priv ? 'var(--link)' : 'var(--text-light)' };
  });
  const bigEstate = est.id === 'trust';
  const mapRows = tree.map((r, i) => ({ ...r, key: 'm' + r.region, y: 30 + i * 30, cy: 45 + i * 30, open: () => set({ openWorkload: r.region }), stroke: r.priv ? '#3374cc' : 'var(--text-disabled)', dash: r.priv ? 'none' : '5 5', wlLabel: `${r.wl.toLocaleString('en-US')} workloads` }));
  const mapH = 60 + mapRows.length * 30;
  const mapSites = (bigEstate ? est.sites : est.sites).slice(0, 7).map((st, i) => ({ ...st, key: 'ms' + i, y: 30 + i * 30 }));
  const ow = s.openWorkload && est.regionsList.find(r => r.region === s.openWorkload);
  const chain = ow ? [{ key: 'fm', step: 'First mile', v: est.sites[0] ? est.sites[0].access : 'Internet' }, { key: 'or', step: 'On-ramp', v: ow.ramp || 'Public internet' }, { key: 'hv', step: ow.cloud === 'Azure' ? 'Hosted VNet' : 'Hosted VPC', v: ow.priv ? `AT&T-hosted ${ow.cloud === 'Azure' ? 'VNet' : 'VPC'} ${ow.region}` : 'None' }, { key: 'wl', step: 'Workload', v: `${ow.wl} in ${ow.region}` }] : [];
  const chainPolicies = ow ? est.policies.filter(p => (ow.tags || []).some(t => p.match.includes(t))).map(p => ({ key: p.name, ...p })) : [];

  // ---- packages / tailored ----
  const packages = D.PACKAGES.map(p => ({ ...p, key: p.id, odF: fmt(p.od) + '/mo', m36F: `36-month: ${fmt(p.m36)}/mo · save 50% vs on-demand`, included: p.included.map(x => ({ key: x, label: x })), limits: p.limits.join(' · '), bg: p.featured ? 'var(--cta)' : 'var(--bg-base)', color: p.featured ? '#fff' : 'var(--text-heading)', sub: p.featured ? '#cfe3ff' : 'var(--text-light)', border: p.featured ? 'var(--cta)' : 'var(--border-secondary)', btnBg: p.featured ? '#fff' : 'var(--cta)', btnColor: p.featured ? 'var(--cta)' : '#fff', choose: () => { set({ order: packageOrder(p), screen: 's6', term: 36 }); window.scrollTo(0, 0); } }));
  const tl = est.tailored || { addons: [], terms: [], hubs: [] };
  const tailored = { addons: tl.addons.map(a => ({ ...a, key: a.conn })), terms: tl.terms.map(t => ({ ...t, key: t.conn, odF: fmt(t.od), m12F: fmt(t.m12), m36F: fmt(t.m36), save: `save ${pct(t.od - t.m36, t.od)}%` })), hubs: tl.hubs.map(h => ({ ...h, key: h.loc })), automation: ['Portal', 'API', 'Terraform'].map(a => ({ key: a, label: a, active: (s.autoTab || 'Portal') === a, click: () => set({ autoTab: a }) })), autoTab: s.autoTab || 'Portal', autoText: { Portal: 'Every order in this store, with approval flow and Pending Actions.', API: 'Provisioning, Network Insights and Billing APIs. Same contract as the composer.', Terraform: 'att_naas provider: hosted VPC, policy, attach and steer as resources.' }[s.autoTab || 'Portal'] };

  const stageKicker = `For ${persona}: ${PERSONA_LINE[persona] || ''}`;
  const floorVerdict0 = isEmpty ? `${est.name} has no active connections. AT&T already sees 41 metros with on-ramps and 12 clouds you could reach.` : isMature ? `${est.name}: ${est.privatePct}% of ${est.workloads.toLocaleString('en-US')} workloads reach AT&T privately. ${est.findings.length} things left to close.` : `${est.name}: ${est.privatePct}% of ${est.workloads.toLocaleString('en-US')} workloads reach AT&T privately. ${fmt(totalSave)}/mo in savings identified.`;

  const floorVerdict = isEmpty ? '0 connections · 41 metros · 12 clouds reachable' : `${est.privatePct}% of ${est.workloads.toLocaleString('en-US')} workloads private · ${est.findings.length} to close`;
  const showPending = s.submitted && !s.pendingDismissed && (s.screen === 's2' || s.screen === 's6' || (s.screen === 's3' && !!s.landed));
  const landedAll = !!s.landed;
  const pendingStages = D.LIFECYCLE.map((l, i) => landedAll ? ({ key: l, label: l, fill: 'var(--success)', ring: 'var(--success)', color: 'var(--text-heading)', line: 'var(--success)' }) : ({ key: l, label: l, fill: i < 2 ? 'var(--success)' : i === 2 ? 'var(--cta)' : 'var(--bg-base)', ring: i < 2 ? 'var(--success)' : i === 2 ? 'var(--cta)' : 'var(--border-primary)', color: i <= 2 ? 'var(--text-heading)' : 'var(--text-disabled)', line: i < 2 ? 'var(--success)' : 'var(--border-secondary)' }));

  const places = [['s0', 'Front door'], ['s1', 'Discover'], ['s2', 'Floor'], ['s4', 'Compose'], ['s7', 'Marketplace']].map(([id, label]) => ({ key: id, label, current: s.screen === id || (id === 's2' && s.screen === 's3') || (id === 's7' && s.screen === 's8') ? 'page' : 'false', go: go(id) }));

  return {
    theme: s.theme, themeLabel: s.theme === 'light' ? 'Dark' : 'Light', toggleTheme: () => set({ theme: s.theme === 'light' ? 'dark' : 'light' }),
    view: s.view, setView: (e) => set({ view: e.target.value, drill: [], regionDrill: null, simulated: false, enforced: false, scanStep: s.screen === 's1' ? 0 : s.scanStep }),
    places, goFront: go('s2'), goFloor: go('s2'), goDiscover: go('s1'), goCompose: () => { const pf = prefillCompose(est); c.setState({ screen: 's4', compose: cp.outcome ? { ...cp, step: cp.step || 0 } : pf }); window.scrollTo(0, 0); syncHash('s4'); }, goBrowse: go('s7', { browseCat: null, browseQuery: '' }), goRecommend: go('s5'), goReview: go('s6'),
    hasTasks: s.submitted, taskCount: 1, showPending, pendingStages, landed: landedAll, notLanded: !landedAll, pendingSub: landedAll ? 'Validated · live. First flow logs are in.' : 'Submitted for approval',
    deliverNow: () => { const cand = (s.compose && s.compose.prefillRegion ? s.compose.prefillRegion.split(' ')[1] : null) || (estRaw.regionsList.find(r => !r.priv) || {}).region; if (!cand) return; c.setState({ landed: cand, layer: 'cloud', tab: 'observe', screen: 's3', events: [...(s.events || []), { key: 'e' + Date.now(), t: new Date().toLocaleTimeString('en-US', { hour12: false }), text: `${cand} validated · live. Hosted VPC on the fabric; first flow logs received; coverage up by one region.` }] }); syncHash('s3', 'cloud', 'observe'); scrollToResult('S3 Department'); },
    ...shellVals(s, set, go, est, c),
    headOpen: s.headOpen !== false, headClosed: s.headOpen === false, toggleHead: () => { const v = s.headOpen === false; set({ headOpen: v }); try { localStorage.setItem('naas.headOpen', String(v)); } catch (e) {} }, headRot: s.headOpen === false ? 'rotate(-90deg)' : 'rotate(0deg)',
    ...andiVals(s, set, go, est, ob, { floorVerdict, connectVerdict, governVerdict, costVerdict, discoverVerdict, stageKicker, findingCard, sortF, findingsFor, isEmpty, totalSave, persona, personaTab }),
    deptVerdict: s.tab === 'govern' ? governVerdict : s.tab === 'cost' ? costVerdict : s.tab === 'observe' ? ob.verdict : connectVerdict, personaLine: PERSONA_LINE[persona] || '', connectEmptyHead, connectEmptySub: isEmpty ? 'Start with one of the packages below.' : 'Nothing to close here today. The products estates like yours chose, if you want to add more.',
    persona: s.persona || 'architect', personaName: persona, setPersona: (e) => set({ persona: e.target.value }), personas: PERSONAS.map(p => ({ key: p, label: p })), moreByTab, hasMoreByTab: moreByTab.length > 0, pendingTitle: (s.order && s.order.title) || 'Hosted VPC order', dismissPending: () => set({ pendingDismissed: true }),
    estateName: est.name, isEmpty, isPartial, isMature, notEmpty: !isEmpty, stageKicker, floorVerdict,
    sS0: s.screen === 's0', sS1: s.screen === 's1', sS2: s.screen === 's2', sS3: s.screen === 's3', sS4: s.screen === 's4', sS5: s.screen === 's5', sS6: s.screen === 's6', sS7: s.screen === 's7', sS8: s.screen === 's8',
    heroVisible: ['s0', 's2', 's3'].includes(s.screen) && !(s.screen === 's3' && s.layer === 'ai'), inDept, overlayLegend: overlayLegend(s, R), hasOverlay: inDept, scrubT: s.scrubT == null ? 100 : s.scrubT, setScrub: (e) => set({ scrubT: +e.target.value }), showScrub: inDept && s.tab === 'observe', showForecast: inDept && s.tab === 'cost', fcT: s.fcT == null ? 0 : s.fcT, setFc: (e) => set({ fcT: +e.target.value }), fcLabel: (s.fcT || 0) === 0 ? 'today' : '+' + Math.round((s.fcT || 0) * 0.9) + ' days', heroRolled: s.screen === 's0', healthStrip: hp.strip, hasHealth: hp.strip.length > 0 && s.screen !== 's3', healthIncidents: hp.incidents.map((x, i) => ({ ...x, key: 'hi' + i, go: go('s3', { layer: 'cloud', tab: 'observe', obScope: 'cloud:' + x.cloud }) })), hasIncidents: hp.incidents.length > 0 && s.screen !== 's3',
    headStart: D.HEADSTART.map(h => ({ ...h, key: h.cat, go: go('s7', { browseCat: h.cat }) })), headStartVerdict: isEmpty ? 'AT&T already sees the metros, clouds and paths you could use. Tell us two things and the store composes the rest.' : `${est.name} is recognized. ${est.clouds} clouds, ${est.regions} regions, ${est.workloads.toLocaleString('en-US')} workloads already visible.`,
    modeTabs: [{ key: 'foryou', label: 'For you', active: !['s7', 's8'].includes(s.screen), click: () => { set({ mode: 'foryou' }); go('s2')(); } }, { key: 'browse', label: 'Browse the marketplace', active: ['s7', 's8'].includes(s.screen), click: () => { set({ mode: 'browse' }); go('s7')(); } }],
    intakeOrg: s.intakeOrg, setOrg: (e) => set({ intakeOrg: e.target.value }), intakeSource: s.intakeSource, setSource: (v) => () => set({ intakeSource: v }), srcCredential: s.intakeSource === 'credential', srcInventory: s.intakeSource === 'inventory', intakeProvider: s.intakeProvider, setProvider: (e) => set({ intakeProvider: e.target.value }), startScan: () => { set({ view: 'partial', screen: 's1', scanStep: 0 }); startScan(c); syncHash('s1'); }, credBorder: s.intakeSource === 'credential' ? 'var(--border-active)' : 'var(--border-secondary)', invBorder: s.intakeSource === 'inventory' ? 'var(--border-active)' : 'var(--border-secondary)',
    // hero
    heroSites, heroRegions, heroGroups: L.groups.map(g => ({ ...g, key: 'g' + g.cloud + g.y })), heroWorkloads, heroEdges, heroArcs, strata: strataMeta, showWorkloads: heroWorkloads.length > 0, internetY: L.internet.y, internetTy: L.internet.y + 19, bandFill, bandOpen: s.bandOpen, toggleBand: () => set({ bandOpen: !s.bandOpen, picked: [] }), bandLabel: s.bandOpen ? 'AT&T fabric  ‹' : 'AT&T fabric  ›', facilityRows, routePreview, hasRoute: !!routePreview, routeLabel: routePreview ? `${routePreview.a} to ${routePreview.b}: ${routePreview.ms} ms on the fabric` : 'Pick two metros to preview a route', ghost: L.ghost, regionDrilled: !!drilledRegion, clearRegionDrill: () => set({ regionDrill: null }), drillCount: s.drill.length,
    perfCard: hr ? { region: `${hr.cloud} ${hr.region}`, pub: `Public today ${hr.pub} ms`, fab: `on the fabric ${hr.fab} ms`, rel: hr.rel === 'warn' ? 'Reliability: degraded' : 'Reliability: healthy', relFill: hr.rel === 'warn' ? 'var(--warning)' : 'var(--success)', top: ((hrNode.y - 70) / 440 * 100) + '%', left: '58%', go: go('s3', { layer: 'cloud', tab: 'observe' }) } : null, hasPerf: !!hr,
    // floor
    rollup, floorFindings, hasFloorFindings: floorFindings.length > 0, packages, tailored, hasTailored: isMature,
    // department
    layerBar: D.LAYERS.map(l => ({ key: l.id, label: l.label, on: s.layer === l.id, go: () => { set({ layer: l.id, drill: [], regionDrill: null }); syncHash('s3', l.id, s.tab); scrollToResult('S3 Department'); }, bg: s.layer === l.id ? 'var(--cta)' : 'transparent', color: s.layer === l.id ? '#fff' : 'var(--text-heading)' })),
    backToPicture: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    layerLabel: layer.id === 'cloud' ? 'Network services' : layer.label, layerTagline: layer.id === 'cloud' ? 'The services layer' : layer.tagline, crumbs, verbTabs, showCrumbs: s.drill.length > 0, drillLabel, hasDrill: s.drill.length > 0, drillUp: () => set({ drill: s.drill.slice(0, -1) }), tConnect: s.tab === 'connect', tGovern: s.tab === 'govern', tObserve: s.tab === 'observe', tCost: s.tab === 'cost',
    ...connectVals(s, set, est, go, ob),
    connectFindings: deptFindings('connect'), hasConnectFindings: deptFindings('connect').length > 0, tabLabel: TAB_LABEL[s.tab] || 'Connect', noConnectFindings: deptFindings('connect').length === 0, connectOthers: ['govern', 'observe', 'cost'].map(t => ({ key: t, n: findingsFor(s.layer, t).length, label: `${findingsFor(s.layer, t).length} close on ${TAB_LABEL[t]}`, go: () => { set({ tab: t }); syncHash('s3', s.layer, t); scrollToResult('S3 Department'); } })).filter(x => x.n > 0), hasConnectOthers: ['govern', 'observe', 'cost'].some(t => findingsFor(s.layer, t).length > 0), mostChosen, levelTiles: sorted, levelCount: levelItems.length, levelSort: s.levelSort, setLevelSort: (e) => set({ levelSort: e.target.value }), levelQuery: s.levelQuery, setLevelQuery: (e) => set({ levelQuery: e.target.value }), levelTitle: drillInfo ? drillInfo.label : levelMapTitle(layer), levelMore: Math.max(0, levelItems.length - 60), hasLevelMore: levelItems.length > 60, catalogRow, visionRow, hasVision: visionRow.length > 0,
    hasSim: !!s.simulated || (s.customPolicies || []).some(p => p.state === 'simulated'),
    governVerdict, governFindings: deptFindings('govern'), policies, hasPolicies: policies.length > 0, examplePolicies0: [{ key: 'a', t: 'Tag PCI forces a private path', m: 'tag PCI', r: 'Private path required' }, { key: 'b', t: 'Tag Internet-facing gets NGFW plus AT&T egress', m: 'tag Internet-facing', r: 'Inline security inspection' }, { key: 'c', t: 'Branch Finance reaches only finance-tagged workloads', m: 'branch Finance', r: 'Segment intra-tag only' }], authorPolicy: go('s4', { compose: { ...cp, outcome: 'u1', control: ['Private path required'], source: ['Data center'], dest: ['Clouds'] } }), simulate: () => set({ simulated: true, enforced: false }), enforce: () => set({ enforced: true }), undo: () => set({ simulated: false, enforced: false }), simulated: s.simulated, enforced: s.enforced, canEnforce: s.simulated && !s.enforced, simulateText: s.enforced ? 'Enforced. Paths rerouted onto the fabric.' : s.simulated ? `Simulated: ${pciViol ? pciViol.split(' ')[0] : 0} paths reroute onto the fabric, 2 flows denied. Drawn dashed until enforced.` : 'Simulate shows what changes before enforce is enabled.', enforceBg: s.simulated && !s.enforced ? 'var(--cta)' : 'var(--bg-neutral)', enforceColor: s.simulated && !s.enforced ? '#fff' : 'var(--text-disabled)',
    kpis, hasKpis: kpis.length > 0, sankeyNodes, sankeyRibbons, sankeyW: sk ? sk.W : 900, sankeyH: sk ? sk.H : 260, sankeyVB: `0 0 ${sk ? sk.W : 900} ${sk ? sk.H : 260}`, flows, observeFindings: deptFindings('observe'), seeSavings: () => { set({ tab: 'cost' }); syncHash('s3', s.layer, 'cost'); }, observeVerdict: isEmpty ? 'No telemetry yet. It starts with the first attach.' : `${est.observedPct}% of paths send telemetry. ${flows.filter(f => f.deny).length} flows denied in the last minute by the vSRX pair.`, chipScope,
    ...costVals(s, set, est, ob, go),
    costVerdict, buckets, steerRecs: steerable, costFindings: deptFindings('cost'), hasBuckets: buckets.length > 0, bTotalF: fmt(bTotal), bFabF: fmt(bFab), bSaveF: fmt(bTotal - bFab),
    // compose
    ...wizardVals(s, est, cp, setC, outcome, constraint, summary, set, c),
    outcomeCards, hasOutcome: !!outcome, sourceChips: chipRow('source', D.COMPOSE_CHIPS.source), destChips: chipRow('dest', D.COMPOSE_CHIPS.dest), regionTabs, metroChips, resChips: chipRow('resiliency', D.COMPOSE_CHIPS.resiliency, true), controlChips: chipRow('control', D.COMPOSE_CHIPS.control), constraint, hasConstraint: !!constraint, summary, freeText: s.freeText, setFreeText: (e) => set({ freeText: e.target.value }), parseText: () => parseText(c, s.freeText), reviewOrder: () => { if (!summary.ready) return; set({ order: composed, screen: 's6', term: 36 }); window.scrollTo(0, 0); syncHash('s6'); }, reviewBg: summary.ready ? 'var(--cta)' : 'var(--bg-neutral)', reviewColor: summary.ready ? '#fff' : 'var(--text-disabled)',
    // review
    orderLines, orderPolicies, orderInspection, unpriced, hasUnpriced: unpriced.length > 0, pricedTotalF: fmt(pricedTotal) + '/mo', termTotalF: fmt(termTotal) + '/mo', termDisc, termLabel: s.term ? `${s.term}-month` : 'On-demand', termOptions, orderSave: ord.savings ? `save ${fmt(ord.savings)}/mo vs public egress` : '', hasOrderSave: !!ord.savings, orderTimeline: `${ord.days || 10} business days`, approver: s.approver, setApprover: (e) => set({ approver: e.target.value }), orderTitle: ord.title || 'Order', pathDesc: ord.pathDesc || '', submit: () => { set({ submitted: true, pendingDismissed: false, screen: 's2' }); window.scrollTo(0, 0); syncHash('s2'); }, saveProposal: () => set({ proposalSaved: true }), proposalSaved: !!s.proposalSaved, reviewShield: !!ord.shield, reviewWires: ord.wires || 1,
    // browse
    browseQuery: s.browseQuery, setQuery: (e) => set({ browseQuery: e.target.value }), browseSort: s.browseSort, setSort: (e) => set({ browseSort: e.target.value }), filtersOpen: s.filtersOpen, toggleFilters: () => set({ filtersOpen: !s.filtersOpen }), filterCount, filterLabel: filterCount ? `Filters (${filterCount})` : 'Filters', categories, curated, results, resultCount: results.length, browsing, backToMarket: () => set({ browseQuery: '', browseCat: null, filterProviders: [], priceCeil: 0 }), providerChips: providers.map(p => ({ key: p, label: p, on: s.filterProviders.includes(p), click: () => set({ filterProviders: s.filterProviders.includes(p) ? s.filterProviders.filter(x => x !== p) : [...s.filterProviders, p] }) })), priceChips: [1000, 2500, 5000].map(v => ({ key: 'p' + v, label: `Under ${fmt(v)}/mo`, on: s.priceCeil === v, click: () => set({ priceCeil: s.priceCeil === v ? 0 : v }) })), visionTiles, browseCatLabel: s.browseCat ? D.CATEGORIES.find(cc => cc.id === s.browseCat).label : q ? `Results for "${s.browseQuery}"` : 'Results',
    lmccHero: productCard(c, D.CATALOG.find(p => p.id === 'lmcc'), est), catalogAll: D.CATALOG,
    // product
    product: productDetail,
    // discover
    allRegions: est.regionsList, scanSteps, scanDone: s.scanStep >= 4, scanning: s.scanStep < 4, discoverVerdict, discoverKpis, estateChips, treeOrMap: s.treeOrMap, isTree: s.treeOrMap === 'tree', isMap: s.treeOrMap === 'map', treeBg: s.treeOrMap === 'tree' ? 'var(--bg-accent)' : 'transparent', treeColor: s.treeOrMap === 'tree' ? 'var(--link)' : 'var(--text-body)', mapBg: s.treeOrMap === 'map' ? 'var(--bg-accent)' : 'transparent', mapColor: s.treeOrMap === 'map' ? 'var(--link)' : 'var(--text-body)', showTree: () => set({ treeOrMap: 'tree' }), showMap: () => set({ treeOrMap: 'map' }), tree, mapRows, mapSites, mapH, mapVB: `0 0 1000 ${mapH}`, bigEstate, sitesCountLabel: est.sitesCount ? `${est.sitesCount.toLocaleString('en-US')} sites, grouped` : `${est.sites.length} sites`, chain, chainPolicies, hasChain: !!ow, chainRegion: ow ? `${ow.cloud} ${ow.region}` : '', closeChain: () => set({ openWorkload: null }),
    ...addendumVals(c, s, set, est, ob, inv, go, findingCard, totalSave, est0),
  };
}

function syncHash(screen, layer, tab) {
  try { history.replaceState(null, '', location.pathname + location.search + '#' + [screen, screen === 's3' ? layer : null, screen === 's3' ? tab : null].filter(Boolean).join('/')); } catch (e) { }
}

let scanTimer = null;
export function startScan(c) {
  clearInterval(scanTimer);
  c.setState({ scanStep: 0 });
  scanTimer = setInterval(() => { c.setState(st => { if (st.scanStep >= 4) { clearInterval(scanTimer); return null; } return { scanStep: st.scanStep + 1 }; }); }, 750);
}

function levelMapTitle(layer) { return { ai: 'Providers', cloud: 'Regions', net: 'Services by site', transport: 'Sites' }[layer.id]; }

function levelMap(s, est, layer, drillInfo, set) {
  const tile = (t, drillable, label) => ({ ...t, click: drillable ? () => set({ drill: [...s.drill, label] }) : null, drillable, cursor: drillable ? 'pointer' : 'default' });
  if (drillInfo) return drillInfo.rows.map(r => tile({ key: r.name, name: r.name, sub: r.access, size: r.count, exposed: r.priv ? 0 : r.count, meta: `${r.access} · ${r.priv ? 'private' : 'public'}`, dot: r.priv ? 'var(--success)' : 'var(--warning)' }, r.rollup, r.name));
  if (layer.id === 'cloud') {
    const extra = ['ap-south-1', 'ca-central-1', 'sa-east-1', 'northeurope', 'japaneast', 'asia-east1', 'australia-southeast1', 'eu-north-1', 'us-east-2', 'francecentral'].slice(0, est.regionsExtra || 0).map((r, i) => ({ region: r, cloud: ['AWS', 'Azure', 'GCP'][i % 3], wl: 3 + i, priv: (i * 37) % 100 < (est.privatePct || 0), tags: [] }));
    return [...est.regionsList, ...extra].map(r => ({ key: r.region, name: r.region, sub: r.cloud, size: r.wl || 0, exposed: r.priv ? 0 : (r.wl || 1), meta: `${(r.wl || 0).toLocaleString('en-US')} workloads · ${r.priv ? 'private' : 'public'}`, dot: r.priv ? 'var(--success)' : 'var(--warning)' }));
  }
  if (layer.id === 'ai') return ['OpenAI', 'Anthropic', 'AWS Bedrock', 'Google Vertex', 'CoreWeave', 'Azure OpenAI'].map((p, i) => ({ key: p, name: p, sub: 'Provider', size: 40 - i * 5, exposed: i < 4 ? 40 - i * 5 : 0, meta: `${(40 - i * 5)} GPU workloads · ${i < 4 ? 'public' : 'private'}`, dot: i < 4 ? 'var(--warning)' : 'var(--success)' }));
  const sites = est.sites.length ? est.sites : [{ name: 'No sites yet', access: '', priv: false }];
  return sites.map(st => tile({ key: st.name, name: st.name, sub: st.access, size: /\((\d[\d,]*)\)/.test(st.name) ? parseInt(/\((\d[\d,]*)\)/.exec(st.name)[1].replace(/,/g, ''), 10) : 1, exposed: st.priv ? 0 : 1, meta: `${st.cls || ''} · ${st.priv ? 'private' : 'public'}`, dot: st.priv ? 'var(--success)' : 'var(--warning)' }, !!st.rollup || /\(/.test(st.name), st.name));
}

function layerPolicies(s, est) {
  if (s.layer === 'cloud') return est.policies;
  if (s.layer === 'ai') return est.stage === 'empty' ? [] : [{ name: 'Data Science token limit', match: 'team Data Science', req: 'Limit 2M tokens/day', matched: 12, viol: 0, state: 'enforced' }, { name: 'Provider private path', match: 'tag AI', req: 'Private path required', matched: est.id === 'mature' ? 174 : 41, viol: est.id === 'mature' ? 174 : 41, state: 'authored' }];
  if (s.layer === 'net') return est.policies.filter(p => /Branch|Internet-facing/.test(p.match));
  return est.policies.filter(p => /Branch|region/.test(p.match));
}

function layerBuckets(s, est) {
  if (s.layer === 'cloud') return est.buckets;
  if (est.stage === 'empty') return [];
  if (s.layer === 'ai') return [{ id: 'tok', name: 'Public API egress to model providers', cloud: 'GCP', today: est.id === 'mature' ? 18400 : 6200, fabric: est.id === 'mature' ? 7100 : 2400 }, { id: 'keys', name: 'Token spend on unmanaged keys', cloud: 'providers', today: est.id === 'mature' ? 42000 : 9000, fabric: est.id === 'mature' ? 31000 : 6800 }];
  if (s.layer === 'net') return [{ id: 'bh', name: 'Internet backhaul from branches', cloud: 'ISP', today: est.id === 'trust' ? 96000 : 8400, fabric: est.id === 'trust' ? 52000 : 5100 }];
  return [{ id: 'mtm', name: 'Month-to-month circuits', cloud: 'AT&T', today: est.id === 'trust' ? 210000 : est.id === 'mature' ? 11200 : 6400, fabric: est.id === 'trust' ? 105000 : est.id === 'mature' ? 5600 : 3200 }];
}

function kpiTiles(s, est) {
  const m = est.id === 'mature' ? 1 : est.id === 'trust' ? 3.2 : 0.4;
  const v = (n, u) => Math.round(n * m).toLocaleString('en-US') + u;
  return [
    { key: 'th', l: 'Throughput', v: v(42, ' Gbps'), e: 'peak, last 24 h' },
    { key: 'lat', l: 'P95 latency', v: est.id === 'partial' ? '41 ms' : '11 ms', e: 'site to region' },
    { key: 'loss', l: 'Packet loss', v: est.id === 'partial' ? '0.4%' : '0.02%', e: 'fabric paths' },
    { key: 'eg', l: 'Egress', v: v(184, ' TB') , e: 'last 30 days' },
    { key: 'uc', l: 'Under control', v: `${est.observedPct}%`, e: 'paths with a policy' },
    { key: 'sv', l: 'Savings', v: est.savedMo ? fmt(est.savedMo) + '/mo' : 'None yet', e: 'identified' },
  ];
}

function productCard(c, p, est) {
  const price = p.price === null ? '' : p.price === 0 ? 'No charge' : `Starting at ${fmt(p.price)}/mo`;
  return { ...p, key: p.id, priceLine: price, hasPrice: !!price, proof: p.proof.map((x, i) => ({ key: i, label: x, head: ['Uptime', 'Latency', 'Support'][i] })), tagList: p.tags.map(t => ({ key: t, label: t })), open: () => { c.setState({ product: p.id, screen: 's8' }); window.scrollTo(0, 0); syncHash('s8'); }, choose: () => { c.setState({ order: productOrder(p, est), screen: 's6', term: 36 }); window.scrollTo(0, 0); syncHash('s6'); }, layerLabel: D.LAYERS.find(l => l.id === p.layer).label, mark: p.provider === 'AT&T' ? 'AT&T' : p.provider.split(',')[0].slice(0, 2).toUpperCase() };
}

const POLICY_FOR_CONTROL = { 'Private path required': { match: 'tag PCI', req: 'Private path required' }, 'No direct internet path': { match: 'tag Prod', req: 'No direct internet path' }, 'Inline inspection': { match: 'tag Internet-facing', req: 'Inline security inspection' }, 'Inline security inspection': { match: 'tag Internet-facing', req: 'Inline security inspection' }, 'Segment by tag': { match: 'branch Finance', req: 'Segment intra-tag only' }, 'Latency SLO': { match: 'tag GPU', req: 'Latency SLO 15 ms' }, 'Cost-aware routing': { match: 'region *', req: 'Cost-aware routing' } };

function composeOrder(cp, outcome, est) {
  if (!outcome) return { lines: [], policies: [], monthly: 0, savings: 0, days: 0 };
  const mult = { Standard: 1, Geodiversity: 1.6, Maximum: 2.2 }[cp.resiliency];
  const P = (id) => D.CATALOG.find(p => p.id === id);
  const lines = [];
  const add = (p, qty, note) => lines.push({ line: lines.length + 1, product: note ? `${p.name} (${note})` : p.name, qty, term: '36-month', monthly: Math.round((p.price || 0) * qty * mult), unpriced: p.price === null });
  if (outcome.id === 'u1') { add(P('netbond'), 1); if (cp.control.includes('Private path required')) add(P('hosted-vpc'), 1, cp.metros[0] || 'region'); }
  if (outcome.id === 'u2') { add(P('hosted-vpc'), 1, 'AWS us-east-1'); add(P('ngfw'), 1); }
  if (outcome.id === 'u3') { add(P('c2c'), 1); add(P('hub'), cp.metros.length || 1); }
  if (cp.control.includes('Inline inspection') && outcome.id !== 'u2') add(P('ngfw'), 1);
  if (cp.dest.includes('Neoclouds') || cp.dest.includes('AI providers')) add(P('neocloud'), 1);
  if (cp.resiliency === 'Maximum') add(P('lmcc'), 1);
  add(P('policy'), 1); add(P('observability'), 1);
  const policies = cp.control.map(k => POLICY_FOR_CONTROL[k]).filter(Boolean).map(p => ({ ...p, state: 'will be enforced on delivery' }));
  const savings = outcome.id === 'u2' || outcome.id === 'u3' || cp.source.includes('A cloud region') ? Math.round((est.buckets || []).filter(b => b.today > b.fabric).slice(0, outcome.id === 'u3' ? 2 : 1).reduce((a, b) => a + b.today - b.fabric, 0)) : 0;
  const monthly = lines.filter(l => !l.unpriced).reduce((a, l) => a + l.monthly, 0);
  const hosted = lines.some(l => /hosted/i.test(l.product));
  return { lines, policies, monthly, savings, days: hosted ? 10 : 5, title: outcome.name, pathDesc: `${cp.source.join(', ') || 'Source'} to ${cp.dest.join(', ') || 'destination'} · ${cp.resiliency}${cp.metros.length ? ' · ' + cp.metros.join(', ') : ''}`, shield: cp.control.includes('Inline inspection') || cp.control.includes('No direct internet path'), wires: cp.resiliency === 'Standard' ? 1 : 2 };
}

function packageOrder(pkg) {
  const lines = pkg.included.map((x, i) => ({ line: i + 1, product: x, qty: 1, term: '36-month', monthly: i === 0 ? pkg.od : 0, unpriced: false })).filter((l, i) => i === 0);
  lines[0].product = `${pkg.name} package`;
  return { lines, policies: [{ match: 'tag PCI', req: 'Private path required', state: 'will be enforced on delivery' }], monthly: pkg.od, savings: 0, days: 10, title: `${pkg.name} package`, pathDesc: pkg.promise, shield: pkg.id !== 'start', wires: pkg.id === 'start' ? 1 : 2 };
}

function productOrder(p, est) {
  const lines = [{ line: 1, product: p.name, qty: 1, term: '36-month', monthly: p.price || 0, unpriced: p.price === null }];
  if (p.id !== 'policy') lines.push({ line: 2, product: 'Policy engine', qty: 1, term: '36-month', monthly: 0, unpriced: true });
  if (p.id !== 'observability') lines.push({ line: lines.length + 1, product: 'Observability', qty: 1, term: '36-month', monthly: 0, unpriced: true });
  return { lines, policies: [{ match: 'tag PCI', req: 'Private path required', state: 'will be enforced on delivery' }], monthly: p.price || 0, savings: p.id === 'steer' ? (est.buckets || []).filter(b => b.today > b.fabric).reduce((a, b) => a + b.today - b.fabric, 0) : 0, days: p.stages ? 10 : 5, title: p.name, pathDesc: p.promise, shield: /ngfw|hosted|firewall/i.test(p.id + p.name), wires: p.id === 'lmcc' ? 2 : 1 };
}

function chooseTier(c, f, tierName, prod, est) {
  if (/^Author/.test(tierName) || /^Steer/.test(tierName) || /^Attach/.test(tierName) || /^Enable/.test(tierName) || /^Add/.test(tierName) && !prod) {
    const control = /private path/i.test(tierName) ? ['Private path required'] : /inspection/i.test(tierName) ? ['Inline inspection'] : /segment/i.test(tierName) ? ['Segment by tag'] : ['Cost-aware routing'];
    const outcome = /Steer/.test(tierName) ? 'u2' : 'u1';
    c.setState({ screen: 's4', compose: { outcome, source: outcome === 'u2' ? ['A cloud region'] : ['Data center'], dest: outcome === 'u2' ? ['The Internet'] : ['Clouds'], regionTab: 'US East', metros: ['Ashburn'], resiliency: 'Standard', control } });
    window.scrollTo(0, 0); syncHash('s4'); return;
  }
  const order = prod ? productOrder(prod, est) : { lines: [{ line: 1, product: tierName, qty: 1, term: '36-month', monthly: 0, unpriced: true }], policies: [], monthly: 0, savings: 0, days: 10, title: tierName, pathDesc: f.head };
  order.title = tierName;
  if (f.priced) order.savings = f.save;
  if (f.kind === 'pci') order.policies = [{ match: 'tag PCI', req: 'Private path required', state: 'will be enforced on delivery' }];
  if (f.kind === 'uninspected') order.policies = [{ match: 'tag Internet-facing', req: 'Inline security inspection', state: 'will be enforced on delivery' }];
  if (!order.policies.length) order.policies = [{ match: 'tag Prod', req: 'No direct internet path', state: 'will be enforced on delivery' }];
  c.setState({ order, screen: 's6', term: 36 }); window.scrollTo(0, 0); syncHash('s6');
}

function steerBucket(c, b, est) {
  c.setState({ screen: 's4', compose: { outcome: 'u2', source: ['A cloud region'], dest: ['The Internet'], regionTab: 'US East', metros: ['Ashburn'], resiliency: 'Standard', control: ['No direct internet path', 'Cost-aware routing'] }, steerBucket: b.name });
  window.scrollTo(0, 0); syncHash('s4');
}

function parseText(c, t) {
  const s = (t || '').toLowerCase();
  const outcome = /leave|egress|internet/.test(s) ? 'u2' : /two clouds|cloud to cloud|join|between/.test(s) ? 'u3' : 'u1';
  const control = [];
  if (/private/.test(s)) control.push('Private path required');
  if (/inspect|firewall|ngfw/.test(s)) control.push('Inline inspection');
  if (/no direct|block internet|egress/.test(s)) control.push('No direct internet path');
  if (/segment/.test(s)) control.push('Segment by tag');
  if (/latency|slo/.test(s)) control.push('Latency SLO');
  if (/cheap|cost|save/.test(s)) control.push('Cost-aware routing');
  const dest = /neocloud|coreweave|gpu/.test(s) ? ['Neoclouds'] : /openai|anthropic|model|ai provider/.test(s) ? ['AI providers'] : outcome === 'u2' ? ['The Internet'] : ['Clouds'];
  const resiliency = /maximum|max/.test(s) ? 'Maximum' : /geo|dual|two paths/.test(s) ? 'Geodiversity' : 'Standard';
  const metros = ['ashburn', 'dallas', 'chicago', 'san jose', 'frankfurt', 'atlanta', 'denver', 'london'].filter(m => s.includes(m)).map(m => m.replace(/\b\w/g, ch => ch.toUpperCase()));
  const ctl = control.length ? control : D.OUTCOMES.find(o => o.id === outcome).control.slice();
  const source = outcome === 'u1' ? ['Data center'] : ['A cloud region'];
  c.setState(st => ({ compose: { ...st.compose, outcome, control: ctl, dest, source, resiliency, metros: metros.length ? metros : st.compose.metros, prefilled: false, step: 0 }, parsedNote: `Understood: ${D.OUTCOMES.find(o => o.id === outcome).name.toLowerCase()} · from ${source.join(', ').toLowerCase()} · to ${dest.join(', ').toLowerCase()}${metros.length ? ' · via ' + metros.join(', ') : ''} · ${resiliency.toLowerCase()} resiliency · require ${ctl.join(', ').toLowerCase()}. Each step below is filled; correct anything I got wrong.` }));
}


const PERSONAS = ['Cloud & Platform Architect', 'Network Engineering', 'Security & Compliance', 'FinOps & SRE', 'Executive'];
const PERSONA_NAME = { architect: 'Cloud & Platform Architect', neteng: 'Network Engineering', security: 'Security & Compliance', finops: 'FinOps & SRE', exec: 'Executive' };
const PERSONA_TAB = { 'Cloud & Platform Architect': 'connect', 'Network Engineering': 'connect', 'Security & Compliance': 'govern', 'FinOps & SRE': 'cost', 'Executive': 'observe' };
const PERSONA_LINE = { 'Cloud & Platform Architect': 'see what I actually have across every cloud, one inventory.', 'Network Engineering': 'which paths are private, which still ride the internet.', 'Security & Compliance': 'where policy is enforced and where it is only written.', 'FinOps & SRE': 'where the money leaks and what closes it.', 'Executive': 'one number: how much of the estate is under AT&T control.' };
const REGION_OF_R = (r) => /^(us|ca|sa|eastus|centralus|westus)/.test(r) ? (/west/.test(r) && !/eu/.test(r) ? 'US West' : 'US East') : /^(eu|europe|west|north|france|uk)/.test(r) ? 'Europe' : 'APAC';
const FACET_DEFS = [
  { values: ['US East', 'US West', 'Europe', 'APAC'], test: (r, v) => REGION_OF_R(r.region) === v },
  { values: ['Data center', 'Branch', 'Campus'], test: (r, v, i) => ['Data center', 'Branch', 'Campus'][i % 3] === v },
  { values: ['Finance', 'Retail', 'Platform'], test: (r, v) => v === 'Finance' ? (r.tags || []).includes('Finance') : v === 'Platform' ? (r.tags || []).some(t => /Prod|AI|GPU/.test(t)) : !(r.tags || []).length || (r.tags || []).includes('Internet-facing') },
  { values: ['AWS', 'Azure', 'GCP'], test: (r, v) => r.cloud === v },
  { values: ['NetBond', 'DX', 'ER', 'Internet'], test: (r, v) => v === 'Internet' ? !r.priv : r.ramp === v },
];
function facetPass(r, i, chips) { return FACET_DEFS.every(f => { const sel = chips.filter(c => f.values.includes(c)); return !sel.length || sel.some(v => f.test(r, v, i)); }); }

// ---------- Addendum 01 ----------
function addendumVals(c, s, set, est, ob, inv, go, findingCard, totalSave, est0) {
  const obScope = s.obScope || 'all';
  const egressBase = egressBaseFor(est0, ob);
  const gpw = R.gbPerWlExport(est0, egressBase);
  const estR = (r) => ({ ...(est0.regionsList.find(x => x.region === r.region) || { ...r, fab: r.latency || 8, pub: r.latency || 60, wl: r.wl || 0 }), gbPerWl: gpw });
  const dark = s.theme === 'dark';
  const steered = s.steered || [];
  const isEmpty = est.stage === 'empty';
  const openMap = s.inv || {}, sel = s.invSel || [];
  const toggle = (id) => () => set({ inv: { ...openMap, [id]: !openMap[id] } });
  const allKeys = inv.flatMap(cl => [cl.id, ...cl.regions.flatMap(r => [r.id, ...r.vpcs.flatMap(v => [v.id, ...v.subnets.map(sn => sn.id), ...v.gws.filter(g => g.circuits).map(g => v.id + g.name)])])]);
  const chip = (t) => { const st = A.tagStyle(t, dark); return { key: t, label: t, bg: st.bg, border: st.border, color: st.color }; };
  const badge = (priv, label) => ({ label: label || (priv ? 'via the AT&T fabric' : 'public internet'), bg: priv ? (dark ? 'rgba(79,191,116,.12)' : '#eef8f0') : 'var(--bg-wash)', border: priv ? (dark ? 'rgba(79,191,116,.5)' : '#8fd4a4') : 'var(--border-secondary)', color: priv ? (dark ? '#8fe0a8' : '#1e7a3c') : 'var(--text-body)', icon: priv ? 'link' : 'globe' });
  const GW_TINT = { igw: '#0057b8', nat: '#5d6f80', endpoint: '#7b3fbf', dx: '#1e7a3c', tgw: '#00838f' };
  const tree = inv.map(cl => ({
    key: cl.id, name: cl.name, mark: cl.mark, hasMark: !!cl.mark, noMark: !cl.mark, notTag: true, isTag: false, initials: cl.initials, gpu: cl.gpu, sub: `${cl.regions.length} ${cl.regions.length === 1 ? 'region' : 'regions'} · ${cl.vpcs} VPC · ${cl.wl.toLocaleString('en-US')} workloads`,
    open: !!openMap[cl.id], toggle: toggle(cl.id), caret: openMap[cl.id] ? 'rotate(90deg)' : 'rotate(0deg)', badge: badge(cl.priv),
    regions: cl.regions.map(r => ({
      key: r.id, region: r.region, city: r.city, open: !!openMap[r.id], toggle: toggle(r.id), caret: openMap[r.id] ? 'rotate(90deg)' : 'rotate(0deg)', badge: badge(r.priv),
      askAndi: () => set({ andiScope: { kind: 'region', id: r.region, label: r.cloud + ' ' + r.region }, andiOpen: true }),
      ctl: () => set({ authoring: { match: 'region ' + r.region, scope: 'any cloud', req: ['Private path required'] }, screen: 's3', layer: 'cloud', tab: 'govern' }), pathShort: R.PATHS.find(p => p.id === R.regionPath(r)).short, lensDot: R.SCORE_COLOR[R.lensScore(estR(r), s.lens || 'security')], lensWord: R.SCORE_WORD[R.lensScore(estR(r), s.lens || 'security')], compareOpen: s.compareRegion === r.region, toggleCompare: () => set({ compareRegion: s.compareRegion === r.region ? null : r.region }), compare: R.compareRegion(estR(r), egressBase).map(p => ({ ...p, key: p.id, curBg: p.cur ? 'var(--bg-accent)' : 'transparent', curLabel: p.cur ? 'today' : '', egressF: fmt(p.egressMo), relScoreColor: R.SCORE_COLOR[p.relScore], secScoreColor: R.SCORE_COLOR[p.secScore], latScoreColor: R.SCORE_COLOR[p.latScore], costScoreColor: R.SCORE_COLOR[p.costScore] })),
      stats: [{ key: 'v', v: r.vpcs.length, l: 'VPC/VNet' }, { key: 's', v: r.subnets, l: 'Subnets' }, { key: 'l', v: r.latency + 'ms', l: r.priv ? 'Latency · fabric' : 'Latency · public' }],
      vpcs: r.vpcs.map(v => ({
        key: v.id, label: v.label, name: v.name, purpose: v.purpose, cidr: v.cidr, wl: v.wl, open: !!openMap[v.id], toggle: toggle(v.id), caret: openMap[v.id] ? 'rotate(90deg)' : 'rotate(0deg)',
        ctl: () => set({ authoring: { match: 'tag ' + (v.tags[0] || 'default'), scope: 'any cloud', req: ['Private path required'] }, screen: 's3', layer: 'cloud', tab: 'govern' }),
        selected: sel.includes(v.id), select: () => set({ invSel: sel.includes(v.id) ? sel.filter(x => x !== v.id) : [...sel, v.id] }), rowBg: sel.includes(v.id) ? 'var(--bg-accent)' : 'var(--bg-base)',
        tags: v.tags.map(chip), stats: [{ key: 'a', v: v.azs, l: 'AZs' }, { key: 's', v: v.subnets.length, l: 'Subnets' }], badge: badge(v.priv, v.priv ? 'Private' : 'Public'),
        azGroups: Array.from(new Set(v.subnets.map(sn => sn.az))).map(az => ({ key: az, az, subnets: v.subnets.filter(sn => sn.az === az).map(sn => ({ ...sn, key: sn.id, open: !!openMap[sn.id], toggle: toggle(sn.id), caret: openMap[sn.id] ? 'rotate(90deg)' : 'rotate(0deg)', wls: (sn.workloads || []).map(w => ({ ...w, key: w.id, ...R.endpointsFor(w, cl.name), open: !!openMap[w.id], toggle: toggle(w.id), caret: openMap[w.id] ? 'rotate(90deg)' : 'rotate(0deg)', ctl: () => set({ authoring: { match: 'tag ' + (w.tag || 'default'), scope: 'any cloud', req: ['Private path required'] }, screen: 's3', layer: 'cloud', tab: 'govern' }), tag: chip(w.tag || 'untagged'), dot: w.exposed ? 'var(--warning)' : 'var(--success)', dotLabel: w.exposed ? 'exposed' : 'private' })), moreWl: sn.wl > (sn.workloads || []).length ? `+${sn.wl - (sn.workloads || []).length} more` : '', hasMoreWl: sn.wl > (sn.workloads || []).length, tags: sn.tags.map(chip), pill: sn.pub ? { label: 'public', bg: 'var(--bg-wash)', border: 'var(--border-secondary)', color: 'var(--text-body)', dot: 'transparent', ring: 'var(--text-disabled)' } : { label: 'private', bg: dark ? 'rgba(79,191,116,.12)' : '#eef8f0', border: dark ? 'rgba(79,191,116,.5)' : '#8fd4a4', color: dark ? '#8fe0a8' : '#1e7a3c', dot: '#4fbf74', ring: '#4fbf74' } })) })),
        routeTables: v.routeTables.map(t => ({ ...t, key: t.name, hasViol: t.viol > 0, violLabel: t.viol ? `${t.viol} policy violation${t.viol > 1 ? 's' : ''}` : '' })),
        gws: v.gws.map(g => ({ ...g, key: g.name, tint: GW_TINT[g.kind], tileBg: GW_TINT[g.kind] + (dark ? '2e' : '18'), hasLock: !!g.lock, hasCircuits: !!(g.circuits && g.circuits.length), open: !!openMap[v.id + g.name], toggle: toggle(v.id + g.name), caret: openMap[v.id + g.name] ? 'rotate(90deg)' : 'rotate(0deg)', circuits: (g.circuits || []).map(cx => ({ ...cx, key: cx.id, dot: cx.status === 'Active' ? 'var(--success)' : 'var(--warning)' })) })),
        hasViol: v.violations > 0, violLabel: v.violations ? `${v.violations} policy violation${v.violations > 1 ? 's' : ''}` : '',
      })),
    })),
  }));
  const stats = A.inventoryStats(est, inv);
  const selWl = inv.flatMap(cl => cl.regions.flatMap(r => r.vpcs)).filter(v => sel.includes(v.id)).reduce((a, v) => a + v.wl, 0);
  const pubWl = est.regionsList.filter(r => !r.priv).reduce((a, r) => a + r.wl, 0);
  const attachN = selWl || pubWl;
  // station track
  const current = s.screen === 's1' ? 'discover' : s.screen === 's3' ? s.tab : s.screen === 's2' ? 'discover' : null;
  const goStop = (stop) => () => { if (stop === 'discover') { go('s1')(); return; } if (s.screen !== 's3') { go('s3', { layer: s.layer === 'ai' ? 'ai' : s.layer, tab: stop })(); return; } set({ tab: stop }); syncHash('s3', s.layer, stop); scrollToResult('S3 Department'); };
  const stations = A.STOPS.map((st, i) => { const cur = st === current; const done = !isEmpty && st === 'discover' && !cur; return { key: st, label: A.STOP_LABEL[st], cur, done, go: goStop(st), fill: cur ? 'var(--cta)' : done ? 'var(--success)' : 'transparent', ring: cur ? 'var(--cta)' : done ? 'var(--success)' : 'var(--border-primary)', color: cur ? 'var(--link)' : done ? 'var(--text-heading)' : 'var(--text-light)', weight: cur ? 700 : 500, notLast: i < A.STOPS.length - 1, flex: i < A.STOPS.length - 1 ? '1 1 0' : '0 0 auto', mark: done ? '✓' : cur ? '●' : '' }; });
  const onTable = (est.buckets || []).reduce((a, b) => a + Math.max(0, b.today - b.fabric), 0);
  const cta = A.stopCta(current || 'discover', est, ob, onTable);
  const ctaLabel = current === 'discover' && attachN ? `Attach ${attachN.toLocaleString('en-US')}` : cta.label;
  const stationCta = { label: ctaLabel, go: cta.next === 'compose' ? go('s4') : goStop(cta.next) };
  // observe
  const OBTABS = ['flow', 'trend', 'throughput', 'latency', 'loss', 'egress', 'control'];
  const obTab = s.obTab || 'flow';
  const obTabs = OBTABS.map(t => ({ key: t, label: t[0].toUpperCase() + t.slice(1), on: obTab === t, go: () => set({ obTab: t }), ub: obTab === t ? 'var(--cta)' : 'transparent', uc: obTab === t ? 'var(--link)' : 'var(--text-body)', uw: obTab === t ? 700 : 500 }));
  const trend = obTab === 'flow' ? null : A.trendBand(obTab, ob);
  const sk = ob.sankey;
  const skNodes = sk.nodes.map((n, i) => ({ ...n, key: 'k' + i, fill: n.side === 'm' ? (n.priv ? '#0057b8' : (dark ? '#5d6f80' : '#8a949c')) : (dark ? '#c5cfd9' : '#1a2431'), lx: n.side === 'r' ? n.x - 168 : n.x2 + 8, ly: n.y + Math.max(0, n.h / 2 - 8), align: n.side === 'r' ? 'right' : 'left', label: n.side === 'r' ? n.name : n.name }));
  const skRibbons = sk.ribbons.map((r, i) => ({ ...r, key: 'r' + i, fill: r.priv ? '#3374cc' : (dark ? '#5d6f80' : '#8a949c'), op: r.priv ? 0.55 : 0.3 }));
  const steer = (f) => () => { set({ steered: [...(s.steered || []), f.id], events: [...(s.events || []), { key: 'e' + Date.now(), t: new Date().toLocaleTimeString('en-US', { hour12: false }), text: `Steered ${f.name} onto the AT&T fabric · ${f.gbps} Gbps now under control` }] }); };
  const failover = (f) => () => set({ events: [...(s.events || []), { key: 'e' + Date.now(), t: new Date().toLocaleTimeString('en-US', { hour12: false }), text: `Failover test on ${f.name} · secondary path healthy` }] });
  const paths = ob.flows.map(f => ({ ...f, key: f.id, gbpsF: f.gbps.toFixed(1), latF: f.latency + 'ms', perGbF: '$' + f.perGb.toFixed(2) + '/GB', perGbBg: f.controlled ? 'var(--bg-accent)' : 'var(--bg-wash)', perGbColor: f.controlled ? 'var(--link)' : 'var(--text-body)', control: f.controlled ? 'AT&T-controlled' : 'Public', ctlBg: f.controlled ? (dark ? 'rgba(79,191,116,.12)' : '#eef8f0') : 'var(--bg-wash)', ctlColor: f.controlled ? (dark ? '#8fe0a8' : '#1e7a3c') : 'var(--text-body)', diverseF: f.diverse ? 'Yes' : 'No', canSteer: !f.controlled && f.steerable, canFailover: f.controlled, steer: steer(f), failover: failover(f) }));
  const groupBy = s.groupBy || 'Path';
  const records = (groupBy === 'None' ? ob.records.map(r => ({ ...r, time: '14:02:11' })) : ob.records).map(r => ({ ...r, actBg: r.deny ? (dark ? 'rgba(211,47,47,.2)' : '#fdecea') : 'var(--bg-wash)', actColor: r.deny ? 'var(--error)' : 'var(--text-body)' }));
  const briefPills = [{ key: 'a', label: 'Show public flows', go: () => set({ obTab: 'flow' }) }, { key: 'b', label: 'Steer worst offender', go: ob.worst ? steer(ob.worst) : () => {} }, { key: 'c', label: 'Review path diversity', go: () => set({ obTab: 'control' }) }];
  const briefQs = ['Which flow would save the most by steering to AT&T mid-mile?', 'What is driving the public egress spend?', 'Are any controlled flows single-homed (no failover)?'].map((q, i) => ({ key: 'q' + i, q }));
  const events = (s.events || []).slice().reverse();
  // AI Fabric insights
  const ai = A.aiInsights(est, s.aiMetric || 'tokens');
  const aiTab = s.aiTab || 'perf';
  const aiTabs = [['perf', 'Performance'], ['sav', 'Savings'], ['sec', 'Security']].map(([k, l]) => ({ key: k, label: l, on: aiTab === k, go: () => set({ aiTab: k }), border: aiTab === k ? 'var(--cta)' : 'transparent', color: aiTab === k ? 'var(--link)' : 'var(--text-body)' }));
  const aiTiles = ai.tiles.map(t => ({ ...t, hasUnit: !!t.u, border: t.on ? 'var(--cta)' : 'var(--border-secondary)', width: t.on ? '2px' : '1px', click: () => set({ aiMetric: t.key === 'spend' ? 'spend' : 'tokens' }) }));
  return {
    invTree: s.tagView ? tagTree(inv, tree, chip) : tree, tagView: !!s.tagView, cloudView: !s.tagView, toggleTagView: () => set({ tagView: !s.tagView }), tagViewUb: s.tagView ? 'var(--cta)' : 'transparent', tagViewColor: s.tagView ? 'var(--link)' : 'var(--text-body)', cloudViewUb: !s.tagView ? 'var(--cta)' : 'transparent', cloudViewColor: !s.tagView ? 'var(--link)' : 'var(--text-body)', hasTree: tree.length > 0, invStats: [{ key: 's', v: stats.sites, l: 'sites' }, { key: 'c', v: stats.clouds, l: 'clouds' }, { key: 'r', v: stats.regions, l: 'regions' }, { key: 'w', v: stats.workloads.toLocaleString('en-US'), l: 'workloads' }, { key: 'a', v: stats.attached, l: 'attached' }, { key: 'e', v: stats.exposed, l: 'exposed' }],
    expandAll: () => set({ inv: Object.fromEntries(allKeys.map(k => [k, true])) }), collapseAll: () => set({ inv: {} }), collapsedLabel: Object.values(openMap).some(Boolean) ? 'Expanded view' : 'Collapsed view',
    overflowRow: est.regionsExtra ? `${est.regionsExtra.toLocaleString('en-US')} smaller regions rolled up · ${Math.round(est.regionsExtra * 0.6)} on the fabric · ${Math.round(est.regionsExtra * 0.4)} public` : '', hasOverflow: !!est.regionsExtra, overflowW: est.regionsExtra ? '60%' : '0%',
    siteCards: est.sites.filter(st => !st.rollup).map((st, i) => ({ key: st.name, name: st.name, metro: st.metro, cidr: `10.${60 + i}.0.0/20`, selected: false })), siteRollups: est.sites.filter(st => st.rollup).map(st => ({ key: st.name, name: st.name, n: (st.name.match(/\(([\d,]+)\)/) || [])[1] || '', priv: st.priv, pctW: st.priv ? '100%' : '0%', fill: st.priv ? '#0057b8' : '#8a949c' })), hasSiteRollups: est.sites.some(st => st.rollup), sitesLine: `${stats.sites.toLocaleString('en-US')} premises · your own buildings, not a cloud`,
    discoverVerdictLine: isEmpty ? 'Nothing discovered yet. Connect an account or pick an inventory.' : `${est.regionsList.length - ob.pathsCovered} of your ${est.regionsList.length} cloud regions still ride the public internet. ${ob.pathsCovered} ${ob.pathsCovered === 1 ? 'is' : 'are'} on the AT&T fabric, across ${inv.length} clouds.`,
    advisorSave: fmt(totalSave || ob.savingsMo || 0) + '/mo', advisorSub: totalSave ? `on the table across ${est.findings.filter(f => f.priced).length} findings` : `already saved on the fabric · ${est.findings.length} open findings`, askAdvisor: go('s2'), hasAdvisor: !isEmpty && (totalSave > 0 || ob.savingsMo > 0), discoverHeadCols: !isEmpty && (totalSave > 0 || ob.savingsMo > 0) ? 'minmax(0,1fr) 300px' : 'minmax(0,1fr)',
    breakdownOpen: !!s.breakdownOpen, toggleBreakdown: () => set({ breakdownOpen: !s.breakdownOpen }), breakdownCaret: s.breakdownOpen ? 'rotate(90deg)' : 'rotate(0deg)',
    stations: s.screen === 's2' ? stations.map(st => ({ ...st, cur: false, fill: st.done || st.key === 'discover' ? 'var(--success)' : 'transparent', ring: st.done || st.key === 'discover' ? 'var(--success)' : 'var(--border-primary)', color: 'var(--text-heading)', weight: 500, mark: st.key === 'discover' ? '✓' : '' })) : stations, stationCta, showTrack: !isEmpty, showStationCta: s.screen !== 's4',
    obScopes: R.scopes(est0).map(sc => ({ ...sc, on: sc.key === obScope, go: () => set({ obScope: sc.key }), ub: sc.key === obScope ? 'var(--cta)' : 'transparent', uc: sc.key === obScope ? 'var(--link)' : 'var(--text-body)', uw: sc.key === obScope ? 700 : 500 })), obScopeLabel: (R.scopes(est0).find(x => x.key === obScope) || {}).label || 'Whole estate',
    obWindows: ['7d', '30d', '90d'].map(w => ({ key: w, label: w, on: (s.obWindow || '30d') === w, go: () => set({ obWindow: w }), ub: (s.obWindow || '30d') === w ? 'var(--cta)' : 'transparent', uc: (s.obWindow || '30d') === w ? 'var(--link)' : 'var(--text-body)', uw: (s.obWindow || '30d') === w ? 700 : 500 })),
    obTrends: R.trends(ob, s.obWindow || '30d').map(k => ({ ...k, hasUnit: !!k.u })), anomalies: R.anomalies(R.applyScope(est0, obScope), ob).map(a => ({ ...a, dot: a.sev === 'amber' ? 'var(--warning)' : 'var(--link)', go: a.region ? () => set({ obScope: 'cloud:' + (est0.regionsList.find(r => r.region === a.region) || {}).cloud }) : () => {} })), hasAnomalies: R.anomalies(R.applyScope(est0, obScope), ob).length > 0, insights: R.insights(R.applyScope(est0, obScope), ob), hasInsights: !isEmpty, iw: (() => { const w = R.insightWidgets(R.applyScope(est0, obScope), ob); if (!w) return {}; w.talkers = w.talkers.map(t => ({ ...t, enter: () => set({ hoverNode: 'reg' + t.region }), leave: () => set({ hoverNode: null }) })); return w; })(), hasIw: !!R.insightWidgets(R.applyScope(est0, obScope), ob),
    obVerdict: ob.verdict, obCoverage: ob.coverage, obKpis: ob.kpis.map(k => ({ ...k, hasUnit: !!k.u, hasE: !!k.e })), obTabs, obIsFlow: obTab === 'flow', trend, hasTrend: !!trend,
    skVB: `0 0 ${sk.W} ${sk.H}`, skNodes, skRibbons, skSub: ob.subVerdict, skFoot: `All flows · ${ob.flows.filter(f => f.kind === 'App').length} app flows, ${ob.flows.filter(f => f.kind !== 'App').length} cloud-to-cloud. Sites roll up by class; the records table lists cloud flows only.`,
    records, recordCount: `${records.length} groups`, groupBy, setGroupBy: (e) => set({ groupBy: e.target.value }), groupOptions: ['None', 'Source', 'Destination', 'Path', 'Action'].map(o => ({ key: o, label: o })),
    briefing: ob.briefing, briefPills, briefQs, paths, pathsSummary: ob.pathsSummary, restoreAll: () => set({ steered: [] }), hasSteered: steered.length > 0,
    events, eventCount: `${events.length} ${events.length === 1 ? 'event' : 'events'} this session`, hasEvents: events.length > 0,
    aiObserve: s.layer === 'ai' && s.tab === 'observe', netObserve: !(s.layer === 'ai' && s.tab === 'observe'), noEvents: events.length === 0, hasObserveFindings: est.findings.some(f => f.tab === 'observe' && (f.layer === s.layer || (f.layer === 'net' && s.layer === 'cloud'))), aiTiles, aiTabs, aiIsPerf: aiTab === 'perf', aiIsSav: aiTab === 'sav', aiIsSec: aiTab === 'sec', aiVB: `0 0 ${ai.sankey.W} ${ai.sankey.H}`, aiNodes: ai.sankey.nodes, aiRibbons: ai.sankey.ribbons.map((r, i) => ({ ...r, key: 'ar' + i })), aiHeads: ai.sankey.heads, aiDirect: ai.latency.direct + 'ms', aiRouted: ai.latency.routed + 'ms', aiDirectW: pct(ai.latency.direct, ai.latency.routed) + '%', aiShare: ai.share.map(x => ({ ...x, w: x.pct + '%', label: `${x.name} · ${x.pct}%` })),
  };
}


// ---------- Compose wizard + Govern grammar ----------
const STEP_LABELS = ['Outcome', 'Source', 'Destination', 'Metro', 'Resiliency', 'Control'];
const CARD_DESC = {
  source: { 'Data center': 'Sites tagged site/dc-* on AVPN, ASE or Dedicated Internet.', 'Sites': 'Offices, branches, plants and campuses.', 'Internet': 'Any site that only has an internet first mile. IPSec into the fabric.', 'A cloud region': 'Resources tagged prod, pci or finance inside a VPC or VNet.', 'AI workloads': 'Resources tagged gpu or ai: ml-infra/gpu-*, rd-helion/*.' },
  dest: { 'Clouds': 'Named resources in AWS, Azure, Google Cloud, Oracle: a region, a VPC, a tag.', 'Neoclouds': 'CoreWeave, Nebius, Lambda through Equinix Fabric.', 'AI providers': 'OpenAI, Anthropic, Bedrock, Vertex behind the AI Fabric gateway.', 'The Internet': 'Egress through inspection instead of the hyperscaler exit.', 'The WAN': 'Back to your sites over AVPN.' },
  resiliency: { 'Standard': 'One metro, one path. 99.99% uptime. The right default for most regions.', 'Geodiversity': 'Two metros, two on-ramps, active/standby. 99.995%.', 'Maximum': 'Two metros, two paths, managed failover. 99.999%. AWS Interconnect Last Mile.' },
  control: { 'Private path required': 'Traffic may never touch the public internet. Enforced on the path.', 'No direct internet path': 'Cloud workloads leave only through the fabric and its inspection.', 'Inline inspection': 'NGFW in path. Every session judged before it leaves.', 'Segment by tag': 'Workloads talk only to their own tag. East-west contained.', 'Latency SLO': 'A millisecond ceiling per tag; the fabric re-routes when it is at risk.', 'Cost-aware routing': 'When two paths meet policy, take the cheaper one.' },
};
const METRO_RAMPS = { Ashburn: 'NetBond · DX · ER · IX · 8 ms', Atlanta: 'NetBond · DX · 11 ms', 'New York': 'NetBond · DX · ER · 9 ms', Dallas: 'NetBond · DX · ER · 9 ms', Chicago: 'NetBond · DX · ER · 10 ms', Denver: 'NetBond · 14 ms', 'San Jose': 'NetBond · DX · ER · 7 ms', 'Los Angeles': 'NetBond · DX · 9 ms', Seattle: 'DX · ER · 11 ms', Frankfurt: 'NetBond · DX · ER · 9 ms', London: 'NetBond · DX · ER · 8 ms', Amsterdam: 'NetBond · DX · 10 ms', Singapore: 'NetBond · DX · 12 ms', Tokyo: 'DX · ER · 13 ms', Sydney: 'DX · 15 ms' };
const REGION_OF_METRO = (m) => Object.keys(D.COMPOSE_CHIPS.regions).find(r => D.COMPOSE_CHIPS.regions[r].includes(m)) || 'US East';
const REGION_GEO = { 'us-east-1': 'Ashburn', 'us-east-2': 'Chicago', 'us-west-2': 'Seattle', 'eu-central-1': 'Frankfurt', 'eu-west-1': 'London', 'ap-southeast-1': 'Singapore', eastus: 'Ashburn', westeurope: 'Amsterdam', centralus: 'Dallas', 'us-central1': 'Chicago', 'us-east-04': 'New York', 'uk-south': 'London' };

function prefillCompose(est) {
  const base = { outcome: null, source: [], dest: [], regionTab: 'US East', metros: [], resiliency: 'Standard', control: [], step: 0, prefilled: false };
  if (!est || est.stage === 'empty') return base;
  const r = est.regionsList.find(x => !x.priv) || est.regionsList[0];
  if (!r) return base;
  const metro = REGION_GEO[r.region] || 'Ashburn';
  const control = ['Private path required', ...(r.tags.includes('PCI') || r.tags.includes('Prod') ? ['No direct internet path'] : []), ...(r.tags.includes('GPU') ? ['Latency SLO'] : [])];
  return { outcome: 'u1', source: ['Data center'], dest: ['Clouds'], regionTab: REGION_OF_METRO(metro), metros: [metro], resiliency: r.tags.includes('PCI') ? 'Geodiversity' : 'Standard', control, step: 0, prefilled: true, prefillRegion: r.cloud + ' ' + r.region, prefillWl: r.wl };
}

function wizardVals(s, est, cp, setC, outcome, constraint, summary, set, c) {
  const step = cp.step || 0;
  const filled = [!!cp.outcome, cp.source.length > 0, cp.dest.length > 0, cp.metros.length > 0, !!cp.resiliency, cp.control.length > 0];
  const goStep = (i) => () => setC({ step: i });
  const steps = STEP_LABELS.map((l, i) => ({ key: l, n: i + 1, label: l, cur: i === step, done: filled[i] && i !== step, go: goStep(i), fill: i === step ? 'var(--cta)' : filled[i] ? 'var(--success)' : 'transparent', ring: i === step ? 'var(--cta)' : filled[i] ? 'var(--success)' : 'var(--border-primary)', color: i === step ? 'var(--link)' : filled[i] ? 'var(--text-heading)' : 'var(--text-light)', weight: i === step ? 700 : 500, mark: filled[i] && i !== step ? '✓' : String(i + 1), markColor: i === step || filled[i] ? '#fff' : 'var(--text-light)', notLast: i < 5, flex: i < 5 ? '1 1 0' : '0 0 auto' }));
  const card = (field, v, single, desc) => { const on = single ? cp[field] === v : cp[field].includes(v); return { key: v, label: v, desc: desc || '', on, click: () => { if (single) return setC({ [field]: v }); const arr = cp[field]; setC({ [field]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }); }, border: on ? 'var(--cta)' : 'var(--border-secondary)', bg: on ? 'var(--bg-accent)' : 'var(--bg-base)', check: on ? 'var(--cta)' : 'transparent', checkRing: on ? 'var(--cta)' : 'var(--border-primary)' }; };
  const stepMeta = [
    { q: 'What should this connection do?', help: 'One outcome per order. The choice sets the control that ships with the path; you can change it at step 6.' },
    { q: 'Where does the traffic start?', help: 'Pick every source that applies. Sites and data centers reach the fabric on the access you already have.' },
    { q: 'Where is it going?', help: 'The destination decides the on-ramp: NetBond, Direct Connect, ExpressRoute, or Equinix Fabric for neoclouds.' },
    { q: 'Through which AT&T metro?', help: 'A metro is where your path enters the fabric. Two metros are needed for geodiversity and maximum resiliency.' },
    { q: 'How much resiliency?', help: 'Standard is one path. The other two add a second metro and a second on-ramp; maximum adds managed failover.' },
    { q: 'What must always be true?', help: 'This is the policy. It ships with the path and is enforced from delivery; Govern shows it in the same words.' },
  ];
  const sentence = {
    src: cp.source.join(' and '), dst: cp.dest.join(' and '), metro: cp.metros.join(' and '), res: cp.resiliency ? cp.resiliency.toLowerCase() : '', ctl: cp.control.map(x => x.toLowerCase()).join(' and '),
    verb: outcome ? (outcome.id === 'u2' ? 'Let' : outcome.id === 'u3' ? 'Join' : 'Connect') : 'Connect', join: outcome && outcome.id === 'u2' ? 'reach' : outcome && outcome.id === 'u3' ? 'with' : 'to',
  };
  const slot = (v, i, empty) => ({ text: v || empty, filled: !!v, go: goStep(i), bg: v ? 'var(--bg-accent)' : 'transparent', color: v ? 'var(--link)' : 'var(--text-disabled)', border: v ? 'transparent' : 'var(--border-primary)' });
  const policySentence = { match: cp.source[0] ? (cp.source[0] === 'A cloud region' ? 'a cloud region' : cp.source[0] === 'AI workloads' ? 'tag GPU' : cp.source[0].toLowerCase()) : 'the source', scope: cp.dest[0] ? cp.dest[0].toLowerCase() : 'the destination', req: cp.control.map(x => x.toLowerCase()).join(' and ') || '…' };
  // Govern authoring
  const au = s.authoring || null;
  const A_MATCH0 = ['tag PCI', 'tag Prod', 'tag Internet-facing', 'branch Finance', 'tag GPU', 'region ap-*'];
  const A_MATCH = s.authoring && s.authoring.match && !A_MATCH0.includes(s.authoring.match) ? [s.authoring.match, ...A_MATCH0] : A_MATCH0;
  const A_SCOPE = ['any cloud', 'the Internet', 'a cloud region', 'the WAN', 'AI providers'];
  const aSet = (p) => set({ authoring: { ...(au || { match: null, scope: null, req: [] }), ...p } });
  const aCard = (field, v, single) => { const cur = au ? au[field] : (single ? null : []); const on = single ? cur === v : (cur || []).includes(v); return { key: v, label: v, desc: field === 'req' ? CARD_DESC.control[v] : '', on, click: () => { if (single) return aSet({ [field]: v }); aSet({ [field]: on ? cur.filter(x => x !== v) : [...(cur || []), v] }); }, border: on ? 'var(--cta)' : 'var(--border-secondary)', bg: on ? 'var(--bg-accent)' : 'var(--bg-base)', check: on ? 'var(--cta)' : 'transparent', checkRing: on ? 'var(--cta)' : 'var(--border-primary)' }; };
  const aReady = !!(au && au.match && au.scope && au.req && au.req.length);
  const commit = (state) => () => { if (!aReady) return; const matched = { 'tag PCI': 34, 'tag Prod': 478, 'tag Internet-facing': 19, 'branch Finance': 228, 'tag GPU': 174, 'region ap-*': 52 }[au.match] || (est.regionsList.find(r => 'region ' + r.region === au.match) || {}).wl || 40; const viol = state === 'simulated' ? Math.round(matched * 0.18) : 0; const pol = { name: `${au.match.replace(/^tag |^branch |^region /, '')} · ${au.req[0]}`, match: au.match, scope: au.scope, req: au.req.join(' and '), matched, viol, state, custom: true }; set({ customPolicies: [...(s.customPolicies || []), pol], authoring: null, simulated: state === 'simulated' ? true : s.simulated }); };
  const openAuthor = (m, r) => () => set({ authoring: { match: m || null, scope: 'any cloud', req: r ? [r] : [] } });
  const polSentence = (p) => ({ match: p.match, scope: p.scope || (/internet/i.test(p.req) ? 'the Internet' : 'any cloud'), req: p.req.toLowerCase() });
  return {
    wizSteps: steps, wizStep: step, wizNotLast: step < 5, backVis: step === 0 ? 'hidden' : 'visible', aNotReady: !aReady, wizQ: stepMeta[step].q, wizHelp: stepMeta[step].help, wizIsFirst: step === 0, wizIsLast: step === 5, wizNext: () => setC({ step: Math.min(5, step + 1) }), wizBack: () => setC({ step: Math.max(0, step - 1) }), wizNextLabel: step === 5 ? 'Review' : STEP_LABELS[step + 1], wizNextDisabled: !filled[step] || (step === 4 && !!constraint), wizNextBg: !filled[step] || (step === 4 && !!constraint) ? 'var(--bg-neutral)' : 'var(--cta)', wizNextColor: !filled[step] || (step === 4 && !!constraint) ? 'var(--text-disabled)' : '#fff',
    stepIs0: step === 0, stepIs1: step === 1, stepIs2: step === 2, stepIs3: step === 3, stepIs4: step === 4, stepIs5: step === 5,
    srcCards: D.COMPOSE_CHIPS.source.map(v => card('source', v, false, CARD_DESC.source[v])), dstCards: D.COMPOSE_CHIPS.dest.map(v => card('dest', v, false, CARD_DESC.dest[v])), resCards: D.COMPOSE_CHIPS.resiliency.map(v => card('resiliency', v, true, CARD_DESC.resiliency[v])), ctlCards: D.COMPOSE_CHIPS.control.map(v => card('control', v, false, CARD_DESC.control[v])),
    metroCards: (D.COMPOSE_CHIPS.regions[cp.regionTab] || []).map(m => ({ ...card('metros', m, false, METRO_RAMPS[m] || 'NetBond'), })),
    parsedNote: s.parsedNote || '', hasParsedNote: !!s.parsedNote && step === 0, prefilled: !!cp.prefilled && !s.parsedNote, prefillLine: cp.prefilled ? `Started from your estate: ${cp.prefillRegion} has ${cp.prefillWl} workloads on the public internet. Every step is filled; change what you like.` : '',
    slotRows: [['Outcome', outcome ? outcome.name : '', 0, 'Pick an outcome'], ['From', cp.source.join(', '), 1, 'Pick a source'], ['To', cp.dest.join(', '), 2, 'Pick a destination'], ['Via', cp.metros.join(', '), 3, 'Pick a metro'], ['Resiliency', cp.resiliency, 4, ''], ['Require', cp.control.join(', '), 5, 'Pick a control']].map(([label, v, i, empty]) => ({ key: label, label, text: v || empty, go: goStep(i), cur: step === i, weight: v ? 500 : 400, color: step === i ? 'var(--link)' : v ? 'var(--text-heading)' : 'var(--text-disabled)' })),
    sent: sentence, slotSrc: slot(sentence.src, 1, 'a source'), slotDst: slot(sentence.dst, 2, 'a destination'), slotMetro: slot(sentence.metro, 3, 'a metro'), slotRes: slot(sentence.res, 4, 'resiliency'), slotCtl: slot(sentence.ctl, 5, 'a control'), slotOutcome: slot(outcome ? outcome.name.toLowerCase() : '', 0, 'an outcome'),
    polSent: policySentence, hasConstraintNow: !!constraint && step === 4,
    // govern
    authoring: !!au, openAuthor: openAuthor(), closeAuthor: () => set({ authoring: null }), aMatch: A_MATCH.map(v => aCard('match', v, true)), aScope: A_SCOPE.map(v => aCard('scope', v, true)), aReq: D.COMPOSE_CHIPS.control.map(v => aCard('req', v, false)),
    aSent: { match: au && au.match || 'something', scope: au && au.scope || 'somewhere', req: au && au.req && au.req.length ? au.req.map(x => x.toLowerCase()).join(' and ') : '…', matchOn: !!(au && au.match), scopeOn: !!(au && au.scope), reqOn: !!(au && au.req && au.req.length) },
    aSimulate: commit('simulated'), aEnforce: commit('enforced'), aReady, aBg: aReady ? 'var(--cta)' : 'var(--bg-neutral)', aColor: aReady ? '#fff' : 'var(--text-disabled)',
    polRows: (s.layer === 'cloud' ? [...layerPolicies(s, est), ...(s.customPolicies || [])] : layerPolicies(s, est)).map((p, i) => ({ ...p, key: 'pr' + i, sent: polSentence(p), dot: p.state === 'enforced' ? 'var(--success)' : p.state === 'simulated' ? 'var(--warning)' : 'var(--text-disabled)', violColor: p.viol ? 'var(--error)' : 'var(--text-light)', hasViol: p.viol > 0, violLabel: p.viol ? `${p.viol} violations` : 'no violations', matchedLabel: `${p.matched} matched` })),
    examplePolicies: [{ key: 'a', t: 'Tag PCI forces a private path', m: 'tag PCI', r: 'Private path required', go: openAuthor('tag PCI', 'Private path required') }, { key: 'b', t: 'Internet-facing gets inspected', m: 'tag Internet-facing', r: 'Inline inspection', go: openAuthor('tag Internet-facing', 'Inline inspection') }, { key: 'c', t: 'Finance stays segmented', m: 'branch Finance', r: 'Segment by tag', go: openAuthor('branch Finance', 'Segment by tag') }],
  };
}


// ---------- Shell: elevator, top tabs, rail ----------
function shellVals(s, set, go, est, c) {
  const dark = s.theme === 'dark';
  const iconDir = dark ? 'brand/icons-dark' : 'brand/icons-light', iconLink = dark ? 'brand/icons-linkdark' : 'brand/icons-link';
  const wide = typeof window !== 'undefined' ? window.innerWidth >= 1440 : true;
  const andiOpen = s.andiOpen === undefined ? wide : !!s.andiOpen;
  const andiDocked = andiOpen && wide;
  const inAi = s.screen === 's3' && s.layer === 'ai';
  const top = s.screen === 's1' ? 'discover' : inAi ? 'ai' : 'net';
  const layerSubtitle = top === 'discover' || s.screen === 's7' || s.screen === 's8' ? 'All layers' : top === 'ai' ? 'AI Fabric layer' : 'Network services layer';
  const close = { elevatorOpen: false };
  const goTab = (screen, extra) => () => { go(screen, extra)(); set(close); };
  const topTabs = [
    { key: 'discover', label: 'Discover', current: top === 'discover', go: goTab('s1') },
    { key: 'net', label: 'Network services', current: top === 'net' && s.screen !== 's7' && s.screen !== 's8', go: goTab('s2', { layer: 'cloud' }), divider: true },
    { key: 'ai', label: 'AI Fabric', current: top === 'ai', go: goTab('s3', { layer: 'ai', tab: 'connect' }) },
  ].map(t => ({ ...t, border: t.current ? 'var(--cta)' : 'transparent', color: t.current ? 'var(--link)' : 'var(--text-heading)', weight: t.current ? 700 : 500 }));
  const railCur = s.screen === 's2' || s.screen === 's0' ? 'Home' : s.screen === 's3' ? ({ connect: 'Connect', govern: 'Govern', observe: 'Observe', cost: 'Cost' }[s.tab] || 'Home') : ['s4', 's5', 's6'].includes(s.screen) ? 'Connect' : null;
  const dataLayer = top === 'ai' ? 'ai' : 'cloud';
  const rail = [['Home', 'home', () => (top === 'ai' ? go('s3', { layer: 'ai', tab: 'connect' }) : go('s2', { layer: 'cloud' }))()], ['Connect', 'cable', go('s3', { layer: dataLayer, tab: 'connect' })], ['Govern', 'check-shield', go('s3', { layer: dataLayer, tab: 'govern' })], ['Observe', 'high-meter', go('s3', { layer: dataLayer, tab: 'observe' })], ['Cost', 'bill', go('s3', { layer: dataLayer, tab: 'cost' })]].map(([label, ic, fn]) => ({ key: label, label, done: label === 'Home' ? false : label === 'Connect' ? est.stage !== 'empty' : label === 'Govern' ? est.policiesEnforced > 0 : label === 'Observe' ? (est.observedPct || 0) > 0 : label === 'Cost' ? !!(s.steered && s.steered.length) : false, go: () => { fn(); set(close); }, cur: railCur === label, icon: (railCur === label ? iconLink : iconDir) + '/' + ic + '.svg', bg: railCur === label ? 'var(--bg-accent)' : 'transparent', color: railCur === label ? 'var(--link)' : 'var(--text-heading)', weight: railCur === label ? 700 : 500 }));
  const showRail = true;
  const storeCur = s.screen === 's7' || s.screen === 's8';
  const curLayer = top === 'ai' ? 'ai' : top === 'net' ? 'net' : null;
  const elevator = [
    { key: 'ai', name: 'AI Fabric', tag: 'The token layer', icon: iconDir + '/apis.svg', kicker: '', go: (e) => { e.preventDefault(); go('s3', { layer: 'ai', tab: 'connect' })(); set(close); }, href: '#' },
    { key: 'cloud', name: 'Cloud · NetBond Advanced', tag: 'The on-ramp layer, with control', icon: iconDir + '/cloud.svg', kicker: '', href: 'Elevator Boards.dc.html', go: () => {} },
    { key: 'net', name: 'Network services', tag: 'The services layer', icon: iconDir + '/hub.svg', kicker: '', go: (e) => { e.preventDefault(); go('s2', { layer: 'cloud' })(); set(close); }, href: '#' },
    { key: 'transport', name: 'Transport and access', tag: 'The physical layer', icon: iconDir + '/cable.svg', kicker: 'Vision', vision: true, go: (e) => e.preventDefault(), href: '#' },
  ].map(l => ({ ...l, cur: l.key === curLayer, notCur: l.key !== curLayer, bg: l.key === curLayer ? 'var(--bg-accent)' : 'transparent', hover: l.vision ? 'transparent' : l.key === curLayer ? 'var(--bg-accent)' : 'var(--bg-neutral)', op: l.vision ? 0.4 : 1, cursor: l.vision ? 'default' : 'pointer' }));
  // ---- AI Fabric UI shell (Figma page 113:51): pills, grouped rail, page title, range.
  const railCollapsed = !!s.railCollapsed;
  const pillBg = (on) => on ? 'var(--bg-accent)' : 'transparent';
  const pills = [
    { key: 'ai', label: 'AI Fabric', current: top === 'ai', go: goTab('s3', { layer: 'ai', tab: 'connect' }) },
    { key: 'net', label: 'NaaS', current: top !== 'ai', go: goTab('s2', { layer: 'cloud' }) },
  ].map(p => ({ ...p, bg: pillBg(p.current) }));
  const obTabNow = s.obTab || 'flow';
  const logsTab = (typeof OBTABS !== 'undefined' && OBTABS.includes('records')) ? 'records' : 'control';
  const item = (label, ic, fn, cur) => ({ key: label, label, cur: !!cur, go: () => { fn(); set(close); }, icon: (cur ? iconLink : iconDir) + '/' + ic + '.svg', bg: cur ? 'var(--bg-accent)' : 'transparent', color: cur ? 'var(--link)' : 'var(--text-body)' });
  const onS3 = (layer, tab) => s.screen === 's3' && s.layer === layer && s.tab === tab;
  const composeCur = ['s4', 's5', 's6'].includes(s.screen);
  const railGroups = top === 'ai'
    ? [
        { key: 'home', hasTitle: false, title: '', items: [item('AI Fabric', 'home', go('s3', { layer: 'ai', tab: 'connect' }), onS3('ai', 'connect'))] },
        { key: 'observe', hasTitle: true, title: 'Observe', items: [
          item('Security & Governance', 'check-shield', () => { go('s3', { layer: 'ai', tab: 'observe' })(); set({ aiTab: 'sec' }); }, onS3('ai', 'observe') && s.aiTab === 'sec'),
          item('Cost', 'bill', () => { go('s3', { layer: 'ai', tab: 'observe' })(); set({ aiTab: 'sav' }); }, onS3('ai', 'observe') && s.aiTab === 'sav'),
          item('Performance & Reliability', 'high-meter', () => { go('s3', { layer: 'ai', tab: 'observe' })(); set({ aiTab: 'perf' }); }, onS3('ai', 'observe') && (s.aiTab || 'perf') === 'perf'),
        ] },
        { key: 'deep', hasTitle: true, title: 'Deep dive', items: [
          item('Explore 360', 'search', go('s1'), s.screen === 's1'),
          item('Logs', 'checklist', () => { go('s3', { layer: 'ai', tab: 'observe' })(); set({ aiTab: 'sec' }); }, false),
        ] },
        { key: 'govern', hasTitle: true, title: 'Govern', items: [
          item('Policies', 'check-shield', go('s3', { layer: 'ai', tab: 'govern' }), onS3('ai', 'govern')),
          item('Budget & Limits', 'person-group', go('s3', { layer: 'ai', tab: 'cost' }), onS3('ai', 'cost')),
          item('Providers', 'apis', go('s3', { layer: 'ai', tab: 'connect' }), false),
          item('Virtual Keys', 'lock', go('s3', { layer: 'ai', tab: 'connect' }), false),
        ] },
      ]
    : [
        { key: 'home', hasTitle: false, title: '', items: [item('NaaS', 'home', go('s2', { layer: 'cloud' }), s.screen === 's2' || s.screen === 's0')] },
        { key: 'connect', hasTitle: true, title: 'Connect', items: [
          item('Fabric', 'cable', go('s3', { layer: 'cloud', tab: 'connect' }), onS3('cloud', 'connect')),
          item('Compose', 'plus', () => c.setState({ screen: 's4', compose: s.compose && s.compose.outcome ? s.compose : prefillCompose(est) }), composeCur),
          item('Marketplace', 'shopping-bag', go('s7'), storeCur),
        ] },
        { key: 'observe', hasTitle: true, title: 'Observe', items: [
          item('Traffic', 'high-meter', () => { go('s3', { layer: 'cloud', tab: 'observe' })(); set({ obTab: 'flow' }); }, onS3('cloud', 'observe') && obTabNow !== logsTab),
          item('Cost', 'bill', go('s3', { layer: 'cloud', tab: 'cost' }), onS3('cloud', 'cost')),
        ] },
        { key: 'deep', hasTitle: true, title: 'Deep dive', items: [
          item('Explore 360', 'search', go('s1'), s.screen === 's1'),
          item('Logs', 'checklist', () => { go('s3', { layer: 'cloud', tab: 'observe' })(); set({ obTab: logsTab }); }, onS3('cloud', 'observe') && obTabNow === logsTab),
        ] },
        { key: 'govern', hasTitle: true, title: 'Govern', items: [
          item('Policies', 'check-shield', go('s3', { layer: 'cloud', tab: 'govern' }), onS3('cloud', 'govern')),
        ] },
      ];
  const aiTitle = { sec: 'Security & Governance', sav: 'Cost', perf: 'Performance & Reliability' }[s.aiTab || 'perf'];
  const pageTitle = s.screen === 's1' ? 'Explore 360' : s.screen === 's4' ? 'Compose' : s.screen === 's5' ? 'Recommend' : s.screen === 's6' ? 'Review order' : storeCur ? 'Marketplace'
    : s.screen === 's3' ? (s.layer === 'ai' ? ({ connect: 'AI Fabric', govern: 'Policies', observe: aiTitle, cost: 'Budget & Limits' }[s.tab] || 'AI Fabric') : ({ connect: 'Fabric', govern: 'Policies', observe: (obTabNow === logsTab ? 'Logs' : 'Traffic'), cost: 'Cost' }[s.tab] || 'NaaS'))
    : 'NaaS';
  const rangeValue = s.obWindow || '30d';
  const setRange = (e) => set({ obWindow: e.target.value });
  const bellLabel = s.submitted ? 'Pending actions: 1 order in flight' : 'Notifications';
  return {
    demoOpen: !!s.demoOpen, toggleDemo: () => set({ demoOpen: !s.demoOpen }),
    pills, railGroups, pageTitle, rangeValue, setRange, bellLabel, railCollapsed, railExpanded: !railCollapsed, railToggleTitle: railCollapsed ? 'Expand navigation' : 'Collapse navigation', iconAndi: 'brand/andi-symbol.svg', iconCalendar: iconDir + '/checklist.svg', goBrowseClose: () => { go('s7')(); set({ demoOpen: false }); },
    topTabs, layerSubtitle, elevatorOpen: !!s.elevatorOpen, toggleElevator: () => set({ elevatorOpen: !s.elevatorOpen }), closeElevator: () => set(close), chevronRot: s.elevatorOpen ? 'rotate(180deg)' : 'rotate(0deg)', elevator,
    goDiscoverClose: goTab('s1'), goHomeClose: goTab('s2', { layer: 'cloud' }),
    showRail, toggleRail: () => set({ railCollapsed: !railCollapsed }), railW: railCollapsed ? '64px' : '240px', railJustify: railCollapsed ? 'center' : 'flex-start', railBtnPad: railCollapsed ? '0' : '0 12px', railToggleLabel: railCollapsed ? '›' : '‹', shellCols: (railCollapsed ? '64px' : '240px') + ' minmax(0,1fr)' + (andiDocked ? ' 340px' : ''), andiOpen, andiClosed: !andiOpen, andiDocked, andiFloating: andiOpen && !andiDocked, andiPos: andiDocked ? 'sticky' : 'fixed', andiRight: andiDocked ? 'auto' : '0', andiShadow: andiDocked ? 'none' : '-8px 0 32px rgba(0,0,0,.14)', andiZ: andiDocked ? '1' : '45', andiW: andiDocked ? 'auto' : '340px', toggleAndi: () => set({ andiOpen: !andiOpen }), shellBg: 'none', railTitle: top === 'ai' ? 'AI Fabric' : 'Network services', rail, storeCur, storeBg: storeCur ? 'var(--bg-accent)' : 'transparent', storeColor: storeCur ? 'var(--link)' : 'var(--text-heading)', storeIcon: (storeCur ? iconLink : iconDir) + '/shopping-bag.svg', iconSearch: iconDir + '/search.svg', iconBell: iconDir + '/bell.svg', iconPerson: iconDir + '/person.svg', iconGear: iconDir + '/gear.svg',
  };
}


// ---------- Round 2: Connect lenses, Cost arbitrage, tag tree ----------
function connectVals(s, set, est, go, ob) {
  const lens = s.lens || 'security';
  const lenses = R.LENSES.map(l => ({ ...l, key: l.id, on: l.id === lens, go: () => set({ lens: l.id }), ub: l.id === lens ? 'var(--cta)' : 'transparent', uc: l.id === lens ? 'var(--link)' : 'var(--text-body)', uw: l.id === lens ? 700 : 500 }));
  const lensQ = (R.LENSES.find(l => l.id === lens) || {}).q;
  const rs = est.regionsList;
  const sample = rs.find(r => !r.priv) || rs[0] || { fab: 8, pub: 60, wl: 100 };
  const cell = (p, l) => ({ security: { text: p.sec.split(' · ')[0], sub: p.sec.split(' · ').slice(1).join(' · '), score: p.secScore }, performance: { text: p.latLabel(sample).split(' · ')[0], sub: p.latLabel(sample).split(' · ')[1], score: p.latScore }, reliability: { text: p.relLabel.split(' · ')[0], sub: p.relLabel.split(' · ')[1], score: p.relScore }, cost: { text: '$' + p.egress.toFixed(2) + '/GB', sub: p.setup, score: p.costScore } }[l]);
  const matrix = R.PATHS.map(p => ({ key: p.id, name: p.name, short: p.short, tone: p.tone, count: rs.filter(r => R.regionPath(r) === p.id).length, cells: R.LENSES.map(l => ({ key: l.id, ...cell(p, l.id), color: R.SCORE_COLOR[cell(p, l.id).score], hi: l.id === lens })) }));
  const lensRegions = rs.map(r => ({ key: r.region, enter: () => set({ hoverNode: 'reg' + r.region, hoverRegion: r.region }), leave: () => set({ hoverNode: null, hoverRegion: null }), askAndi: () => set({ andiScope: { kind: 'region', id: r.region, label: r.cloud + ' ' + r.region }, andiOpen: true }), region: r.cloud + ' ' + r.region, path: R.PATHS.find(p => p.id === R.regionPath(r)).short, score: R.lensScore(r, lens), dot: R.SCORE_COLOR[R.lensScore(r, lens)], word: R.SCORE_WORD[R.lensScore(r, lens)] })).sort((a, b) => a.score - b.score);
  return { lenses, lens, lensQ, lensVerdict: R.lensVerdict(est, lens), matrix, matrixHeads: R.LENSES.map(l => ({ key: l.id, label: l.label, hi: l.id === lens, color: l.id === lens ? 'var(--link)' : 'var(--text-light)' })), lensRegions, hasLensRegions: rs.length > 0, isCloudLayer: s.layer === 'cloud', notCloudLayer: s.layer !== 'cloud' };
}
function egressBaseFor(est, ob) { const bucketToday = (est.buckets || []).reduce((a, b) => a + b.today, 0); return bucketToday || ob.egressMo || 0; }
function costVals(s, set, est, ob, go) {
  const base = egressBaseFor(est, ob);
  const bT = (est.buckets || []).reduce((a, b) => a + b.today, 0), bF = (est.buckets || []).reduce((a, b) => a + b.fabric, 0);
  const targetSave = bT > bF ? bT - bF : 0;
  const arb = R.arbitrage(est, base, targetSave);
  const fc = R.forecast({ ...ob, egressMo: base }, arb);
  const maxNow = Math.max(1, ...arb.map(a => a.saveN / 0.07 * 0.09));
  return { arbitrage: arb.map(a => ({ ...a, fabW: Math.round(a.saveN / 0.07 * 0.02 / maxNow * 100) + '%', premW: Math.round(a.saveN / maxNow * 100) + '%', enter: () => set({ hoverNode: 'reg' + a.regionId }), leave: () => set({ hoverNode: null }), attach: go('s4', { compose: { outcome: 'u1', source: ['Data center'], dest: ['Clouds'], regionTab: 'US East', metros: ['Ashburn'], resiliency: 'Standard', control: ['Private path required'], step: 5, prefilled: true, prefillRegion: a.region, prefillWl: a.wl } }) })), hasArbitrage: arb.length > 0, arbTotal: fmt(arb.reduce((a, r) => a + r.saveN, 0)), arbTotalYr: fmt(arb.reduce((a, r) => a + r.saveN, 0) * 12),
    destClasses: R.destClasses(ob, base, targetSave).map((d, i) => ({ ...d, op: [1, 0.75, 0.5, 0.3][i] || 0.3 })), forecast: fc, fcVB: `0 0 ${fc.W} ${fc.H}`, commitments: R.commitments(est, base).map(cm => ({ ...cm, short: /^Commit/.test(cm.verdict) ? 'Commit' : 'Stay metered' })), hasCommitments: R.commitments(est, base).length > 0 };
}
function tagTree(inv, tree, chip) {
  const groups = {};
  tree.forEach(cl => cl.regions.forEach(rg => rg.vpcs.forEach(vp => { const t = (vp.tags[0] || { label: 'untagged' }).label; groups[t] = groups[t] || { key: 'tag-' + t, name: t, tagChip: chip(t), regions: {}, wl: 0, priv: true }; const rk = cl.name + ' ' + rg.region; groups[t].regions[rk] = groups[t].regions[rk] || { ...rg, key: t + rk, region: rk, vpcs: [] }; groups[t].regions[rk].vpcs.push(vp); groups[t].wl += vp.wl || 0; if (!vp.priv) groups[t].priv = false; })));
  return Object.values(groups).map(g => ({ ...g, isTag: true, notTag: false, askAndi: () => {}, hasMark: false, noMark: false, gpu: false, open: true, toggle: () => {}, caret: 'rotate(90deg)', sub: (() => { const nr = Object.keys(g.regions).length, nc = new Set(Object.keys(g.regions).map(k => k.split(' ')[0])).size; return `${nr} region${nr === 1 ? '' : 's'} across ${nc} cloud${nc === 1 ? '' : 's'} · ${g.wl.toLocaleString('en-US')} workload${g.wl === 1 ? '' : 's'} · one policy covers all of it`; })(), badge: { label: g.priv ? 'all on the fabric' : 'some on the public internet', bg: g.priv ? '#eef8f0' : 'var(--bg-wash)', border: g.priv ? '#8fd4a4' : 'var(--border-secondary)', color: g.priv ? '#1e7a3c' : 'var(--text-body)' }, regions: Object.values(g.regions) })).sort((a, b) => b.wl - a.wl);
}


// ---------- Andi: the advice layer ----------
function andiVals(s, set, go, est, ob, x) {
  const { findingCard, sortF, findingsFor, isEmpty } = x;
  const scope = s.andiScope || null; // {kind:'region'|'tag'|'finding'|'flow', id, label}
  const screenFindings = s.screen === 's3' ? sortF(findingsFor(s.layer, s.tab)) : s.screen === 's2' || s.screen === 's1' ? sortF(est.findings) : [];
  let lead = '', sub = '', focus = null, qs = [], acts = [];
  if (s.screen === 's2' || s.screen === 's0') { lead = x.floorVerdict; sub = x.stageKicker.replace(/^For [^:]+: /, ''); qs = ['What should I do first?', 'Which region is the outlier?', 'How much is on the table?']; }
  else if (s.screen === 's1') { lead = x.discoverVerdict; sub = 'Open a cloud to see regions, VPCs, subnets, endpoints and resources. Tags are how you will control them.'; qs = ['Which VPCs are internet-exposed?', 'What does tag PCI touch?', 'Where are my sites attached?']; }
  else if (s.screen === 's3') {
    lead = { connect: x.connectVerdict, govern: x.governVerdict, observe: ob.verdict, cost: x.costVerdict }[s.tab] || '';
    sub = { connect: 'Compare the three paths on any region, or switch the lens to see performance, reliability and cost.', govern: 'Policies are sentences over tags and regions. Simulate before you enforce.', observe: ob.briefing, cost: 'Every figure derives from one egress base; the arbitrage table shows the arithmetic.' }[s.tab] || '';
    qs = { connect: ['Which region should I attach first?', 'What does NetBond give me over Direct Connect?', 'Where does latency vary by hour?'], govern: ['Which policy has violations?', 'What would enforcing PCI change?', 'Is anything internet-facing uninspected?'], observe: ['Which flow saves most if steered?', 'What is driving public egress?', 'Is any controlled flow single-homed?'], cost: ['Where is the biggest arbitrage?', 'Commit or stay metered?', 'What does the 90-day curve assume?'] }[s.tab] || [];
    if (s.tab === 'observe') acts = [{ key: 'a', label: 'Show public flows', go: () => set({ obTab: 'flow' }) }, { key: 'b', label: 'Steer worst offender', go: ob.worst ? () => set({ steered: [...(s.steered || []), ob.worst.id] }) : () => {} }, { key: 'c', label: 'Path diversity', go: () => set({ obTab: 'control' }) }];
  }
  else if (s.screen === 's4') { lead = s.parsedNote || (s.compose && s.compose.prefilled ? `Started from your estate: ${s.compose.prefillRegion} has ${s.compose.prefillWl} workloads on the public internet. Every step is filled; change what you like.` : 'Describe the outcome. AT&T composes the connection.'); sub = ['One outcome per order; the control ships with the path.', 'Pick every source that applies.', 'The destination decides the on-ramp.', 'Two metros for geodiversity or maximum resiliency.', 'Standard is one path; the other two add a second metro.', 'This is the policy, in Govern\'s words.'][(s.compose && s.compose.step) || 0]; qs = ['Why two metros?', 'What does inline inspection cost?', 'How long until it is live?']; }
  else if (s.screen === 's6') { lead = 'Review the order. Nothing is ordered until you submit.'; qs = ['What ships on day one?', 'Can I change the policy later?']; }
  else if (s.screen === 's7' || s.screen === 's8') { lead = 'Filter by what the path must do, not by product name.'; qs = ['Which products fit tag PCI?', 'What do estates like mine choose?']; }
  // scoped focus
  if (scope && scope.kind === 'region') { const r = est.regionsList.find(z => z.region === scope.id); if (r) { lead = `${r.cloud} ${r.region}: ${r.wl} workloads, ${r.priv ? 'on the fabric at ' + r.fab + ' ms' : 'on the public internet at ' + r.pub + ' ms'}. Tags ${r.tags.join(', ') || 'none'}.`; sub = r.priv ? 'Already attached. The remaining lever is policy: which tags may reach the internet.' : `Attaching it moves ${r.wl} workloads to $0.02/GB and ${r.fab} ms, deterministic.`; qs = ['Compare the three paths here', 'What would a private-path policy change?', 'Who owns these resources?']; } }
  if (scope && scope.kind === 'tag') { lead = `Tag ${scope.id} spans clouds. One policy covers every VPC carrying it.`; sub = 'When tag ' + scope.id + ' reaches any cloud, require a private path.'; qs = ['Author that policy', 'Which VPCs carry it?', 'Any of them internet-exposed?']; }
  const top = scope && scope.kind === 'finding' ? est.findings.find(f => f.kind === scope.id) : screenFindings[0];
  if (top) focus = findingCard(top);
  const more = screenFindings.filter(f => !top || f.kind !== top.kind).slice(0, 4).map(f => ({ key: f.kind, head: f.head, save: f.priced ? fmt(f.save) + '/mo' : '', go: () => set({ andiScope: { kind: 'finding', id: f.kind, label: f.head }, andiOpen: true }) }));
  const thread = (s.andiThread || []).filter(t => t.screen === s.screen + (s.tab || '')).slice(-6);
  const ask = (q) => () => set({ andiThread: [...(s.andiThread || []), { key: 'q' + Date.now(), screen: s.screen + (s.tab || ''), q, a: answer(q, est, ob, s) }] });
  return {
    andiLead: lead, andiSub: sub, hasAndiSub: !!sub, andiFocus: focus, hasAndiFocus: !!focus, andiMore: more, hasAndiMore: more.length > 0, andiQs: qs.map((q, i) => ({ key: 'q' + i, q, ask: ask(q) })), andiActs: acts, hasAndiActs: acts.length > 0,
    andiThread: thread, hasAndiThread: thread.length > 0, andiScopeLabel: scope ? scope.label : '', hasAndiScope: !!scope, clearAndiScope: () => set({ andiScope: null }),
    andiInput: s.andiInput || '', setAndiInput: (e) => set({ andiInput: e.target.value }), andiSend: () => { if (!s.andiInput) return; ask(s.andiInput)(); set({ andiInput: '' }); }, andiKey: (e) => { if (e.key === 'Enter' && s.andiInput) { ask(s.andiInput)(); set({ andiInput: '' }); } },
    andiIsEmpty: isEmpty,
  };
}
function answer(q, est, ob, s) {
  const l = q.toLowerCase();
  const pub = est.regionsList.filter(r => !r.priv);
  const worst = pub.slice().sort((a, b) => b.wl - a.wl)[0];
  if (/first|start/.test(l)) return worst ? `Attach ${worst.cloud} ${worst.region}: ${worst.wl} workloads on the public internet, the largest single gap. It closes cost, security and the latency spike at once.` : 'Everything is attached. The next lever is policy: enforce the simulated ones.';
  if (/outlier|latency|vary/.test(l)) { const w = est.regionsList.find(r => r.rel === 'warn') || worst; return w ? `${w.cloud} ${w.region}: ${w.pub} ms on the public path, ${w.fab} ms on the fabric. Public transit has no latency floor; it varies by hour.` : 'No outliers in this window.'; }
  if (/table|much|save|arbitrage|biggest/.test(l)) { const t = (est.buckets || []).reduce((a, b) => a + Math.max(0, b.today - b.fabric), 0); return `${fmt(t)}/mo is on the table across the public regions; the arbitrage table shows the arithmetic per region. ${fmt(ob.savingsMo)}/mo is already saved on the fabric.`; }
  if (/netbond|direct connect|expressroute|native/.test(l)) return 'NetBond: 99.99% with dual PE and managed failover, any cloud from one port, AT&T provisions both ends in about 10 days. Direct Connect or ExpressRoute: 99.9% on a single circuit unless you buy two, one cloud per port, you order the LOA and cross-connect, 4 to 8 weeks. Same $0.02/GB either way.';
  if (/exposed|internet-facing|uninspected/.test(l)) { const f = est.findings.find(x => /internet|exposed|inspect/i.test(x.head)); return f ? f.head + '. ' + f.ev : 'Nothing internet-facing is uninspected.'; }
  if (/pci/.test(l)) { const f = est.findings.find(x => x.kind === 'pci'); return f ? f.head + '. Enforcing "when tag PCI reaches any cloud, require private path" closes it; simulate first to see the affected paths dashed on the picture.' : 'No PCI-tagged workload touches the internet.'; }
  if (/violation/.test(l)) return 'Simulated policies show violations without changing traffic. Enforced ones show zero by definition; the count you see is what enforcement would have blocked.';
  if (/steer|flow/.test(l)) return ob.worst ? `${ob.worst.name}: ${ob.worst.gbps} Gbps at ${ob.worst.latency} ms on the public path. Steering it saves about ${fmt(Math.round(ob.worst.gbps * 190))}/mo and puts it under AT&T control.` : 'Every flow is already controlled.';
  if (/egress|driving/.test(l)) return `Object-storage reads and AI-endpoint traffic from ${pub.map(r => r.region).slice(0, 2).join(' and ') || 'the public regions'} at $0.09/GB. The same bytes on the fabric are $0.02.`;
  if (/single-homed|diversity|failover/.test(l)) return 'Controlled flows on a single metro have no second path. Geodiversity adds a second metro and on-ramp; maximum adds managed failover.';
  if (/commit|metered/.test(l)) return 'A committed on-ramp beats metered above about 100,000 GB/mo per region. Below that, stay metered; the table on Cost gives the verdict per region.';
  if (/90|curve|assume/.test(l)) return 'As-is grows 6% a month, the observed rate. The moved curve applies the arbitrage savings over the first 20 days and grows at 40% of that rate, since fabric bytes are cheaper to add.';
  if (/two metros|metro/.test(l)) return 'A metro is where your path enters the fabric. Two metros give two on-ramps; if one fails the other carries the path. Standard resiliency is one metro.';
  if (/inspection|firewall/.test(l)) return 'Inline inspection is the vSRX pair in the hosted VPC: from $2,400/mo per region, every session judged before it leaves.';
  if (/long|live|day one|ships/.test(l)) return 'About 10 business days for NetBond; AT&T provisions both ends. Telemetry starts with the first attach, so Observe fills in on day one.';
  if (/own|owner|who/.test(l)) return 'Owners come from the resource tags: payments-platform for PCI, platform-eng for Prod, ml-infra for GPU. Open a workload in the tree to see each one.';
  if (/site/.test(l)) return `${est.sites.filter(x => x.priv).length} of ${est.sites.length} sites reach the fabric on the access they already have. The rest are internet-only.`;
  if (/tag|vpc/.test(l)) return 'Switch the tree to By tag: one row per tag across every cloud, with the VPCs that carry it. A policy on the tag covers all of them.';
  if (/fit|choose|estates/.test(l)) return 'Hosted VPC with the vSRX pair is what estates this size choose most; the Marketplace filters by what the path must do.';
  if (/policy|change/.test(l)) return 'Yes. Policies live in Govern and change without re-ordering; the path stays, the rule changes.';
  return 'I can answer from what the traffic shows: paths, tags, spend and health. Try one of the questions below, or click a region, tag or finding to scope me to it.';
}


// ---------- Department overlays on the fabric picture ----------
const SLO = 100;
function overlayFor(e, s, est, ob, hp, R, steered, hoverKey) {
  if (s.screen !== 's3' || !e.region || e.ghost) return {};
  const r = est.regionsList.find(x => x.region === e.region.region) || e.region;
  const flows = ob.flows.filter(f => f.region === r.cloud + ' ' + r.region);
  const gbps = flows.reduce((a, f) => a + f.gbps, 0);
  const lat = r.priv ? r.fab : r.pub;
  const gb = Math.round(r.wl * (R.gbPerWlExport(est, (est.buckets || []).reduce((a, b) => a + b.today, 0) || ob.egressMo) || 42));
  const rate = r.priv ? 0.02 : 0.09;
  const dollars = Math.round(gb * rate);
  const premium = r.priv ? 0 : Math.round(gb * 0.07);
  const hovered = hoverKey === 'reg' + r.region;
  const tab = s.tab;
  const lens = s.lens || 'security';
  const score = R.lensScore(r, lens);
  const lensVal = { security: r.priv ? 'private' : 'public', performance: lat + ' ms', reliability: r.priv ? (r.ramp === 'DX' || r.ramp === 'ER' ? '99.9%' : '99.99%') : '99.5%', cost: '$' + rate.toFixed(2) + '/GB' }[lens];
  const lx = e.x2 - 200, ly = e.y2 - 22;
  if (tab === 'connect') return { stroke: R.SCORE_COLOR[score], w: 2.5, label: lensVal, lx, ly, hasLabel: true, compare: hovered ? R.compareRegion({ ...r, gbPerWl: gb / Math.max(1, r.wl) }).map((p, i) => ({ key: p.id, short: p.short, y: i * 16, w: Math.round(p.egressMo / Math.max(1, Math.max(...R.compareRegion({ ...r }).map(z => z.egressMo))) * 120), fill: p.tone, val: '$' + Math.round(p.egressMo / 1000) + 'k · ' + p.latMs + ' ms', cur: p.cur })) : null, hasCompare: hovered, cx: e.x2 - 150, cy: e.y2 + 8 };
  if (tab === 'observe') { const t = (s.scrubT == null ? 100 : s.scrubT) / 100; const g = gbps * (0.75 + 0.25 * Math.sin(t * 6.28 + r.region.length)) ; const l = Math.round(lat * (t > 0.6 && t < 0.75 && r.rel === 'warn' ? 1.4 : 1)); return { stroke: l > SLO ? 'var(--error)' : l > SLO * 0.6 ? 'var(--warning)' : '#0057b8', w: Math.max(1.5, Math.min(9, g * 1.6)), durS: (Math.max(0.6, 3 - g * 0.4)).toFixed(1) + 's', label: g.toFixed(1) + ' Gbps · ' + l + ' ms', lx, ly, hasLabel: true, pin: r.rel === 'warn' && t > 0.6 && t < 0.75, pinX: (e.x1 + e.x2) / 2, pinY: (e.y1 + e.y2) / 2 - 14, comet: true }; }
  if (tab === 'govern') { const pol = [...(s.customPolicies || [])].filter(p => p.state !== 'draft'); const tagHit = (r.tags || []).some(t => /PCI/i.test(t)) || pol.some(p => (r.tags || []).some(t => p.match.toLowerCase().includes(t.toLowerCase()))); const au = s.authoring; const authHit = au && au.match && ((/^tag /.test(au.match) && (r.tags || []).some(t => au.match.toLowerCase().includes(t.toLowerCase()))) || au.match === 'region ' + r.region); const viol = !r.priv && (r.tags || []).some(t => /PCI|Prod/i.test(t)); return { stroke: authHit ? '#00abeb' : tagHit ? '#0057b8' : 'var(--text-disabled)', w: authHit ? 4 : tagHit ? 2.5 : 1.5, gate: tagHit || authHit, gx: (e.x1 + e.x2) / 2, gy: (e.y1 + e.y2) / 2, gateFill: authHit ? '#00abeb' : s.enforced ? '#0057b8' : 'var(--bg-base)', gateCheck: authHit || s.enforced ? '#fff' : '#0057b8', violPulse: viol, pinX: e.x2 - 8, pinY: e.y2 - 12, label: tagHit ? (r.tags || []).filter(t => /PCI|Prod|Finance|GPU/i.test(t)).slice(0, 2).map(t => 'tag ' + t).join(' · ') : '', lx, ly, hasLabel: tagHit, opOverride: authHit ? 1 : (au && au.match ? 0.35 : null) }; }
  if (tab === 'cost') { const ft = (s.fcT || 0) / 100; const prem = Math.round(premium * (1 - ft)); return { stroke: r.priv ? '#0057b8' : 'var(--text-disabled)', w: Math.max(2, Math.min(10, dollars / 4000)), sleeve: prem > 0, sleeveW: Math.max(3, Math.min(14, prem / 2500)), label: '$' + (dollars >= 1000 ? (dollars / 1000).toFixed(1) + 'k' : dollars) + '/mo' + (prem ? ' · +$' + (prem / 1000).toFixed(1) + 'k' : ''), lx, ly, hasLabel: true, math: hovered ? gb.toLocaleString('en-US') + ' GB × $' + rate.toFixed(2) + (prem ? ' (fabric $0.02: −$' + prem.toLocaleString('en-US') + ')' : '') : '', hasMath: hovered && !!gb, cx: e.x2 - 150, cy: e.y2 + 8 }; }
  return {};
}
function overlayLegend(s, R) {
  if (s.screen !== 's3') return [];
  const tab = s.tab;
  if (tab === 'connect') return [{ key: 'g', sw: 'var(--success)', l: 'good' }, { key: 'f', sw: 'var(--warning)', l: 'fair' }, { key: 'p', sw: 'var(--error)', l: 'poor' }, { key: 'lens', sw: null, l: 'wire color = ' + (s.lens || 'security') + ' lens · hover a region to compare the three paths' }];
  if (tab === 'observe') return [{ key: 'w', sw: null, l: 'thickness = Gbps' }, { key: 'b', sw: '#0057b8', l: 'under SLO' }, { key: 'a', sw: 'var(--warning)', l: 'near SLO' }, { key: 'r', sw: 'var(--error)', l: 'over 100 ms' }, { key: 'd', sw: null, l: 'dashed = public path' }];
  if (tab === 'govern') return [{ key: 'g', sw: '#0057b8', l: 'gate = policy on this path' }, { key: 'o', sw: '#00abeb', l: 'matched by the policy you are authoring' }, { key: 'v', sw: 'var(--error)', l: 'violation' }, { key: 'd', sw: null, l: 'dashed = simulated' }];
  if (tab === 'cost') return [{ key: 'w', sw: null, l: 'thickness = $/mo' }, { key: 'r', sw: 'var(--error)', l: 'red sleeve = premium over the fabric rate' }, { key: 's', sw: null, l: 'slide the forecast to land the moves' }];
  return [];
}
