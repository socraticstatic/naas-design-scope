// naas-paths.js — the route between a site and a cloud region, hop by hop.
// Pure data. Explore 360 uses it for "Sites that reach it" on a region row,
// "Paths" on a site row, the inline trace, and Jump. Added 2026-09-09.
import * as S from './naas-sites.js';

export const SLO = 100;
const PER_SITE = { 'Data center': 6, Campus: 2.5, Plant: 1.5, Office: 0.8, Branch: 0.04, Edge: 0.005, Field: 0.3 };
const METRO_GEO = { Frankfurt: 'eu', London: 'eu', Paris: 'eu', Amsterdam: 'eu', Singapore: 'ap', Tokyo: 'ap', Sydney: 'ap', Mumbai: 'ap' };
export const geoOfMetro = (m) => METRO_GEO[m] || 'us';
export const geoOfRegion = (r) => /^(us|ca|sa|eastus|centralus|westus|us-)/.test(r) ? 'us' : /^(eu|europe|west|north|france|uk|germany)/.test(r) ? 'eu' : 'ap';
const AGG = new Set(['Branch', 'Edge', 'Office', 'Field']);

/** Every site as a flat list, each carrying its class and access. */
export function allSites(est) {
  return S.siteTree(est).flatMap(cl => cl.children.flatMap(ch => ch.kind === 'metro'
    ? ch.sites.map(x => ({ ...x, cls: cl.cls, clsLabel: cl.label, unit: cl.unit, access: ch.access, metroName: ch.name }))
    : [{ ...ch, cls: cl.cls, clsLabel: cl.label, unit: cl.unit, metroName: ch.metro }]));
}

/** Traffic a site sends toward a region: class weight × geography × the region's share of its geography. */
export function gbps(est, site, region) {
  const same = geoOfMetro(site.metro) === geoOfRegion(region.region);
  const geoWl = est.regionsList.filter(r => geoOfRegion(r.region) === geoOfRegion(region.region)).reduce((a, r) => a + r.wl, 0) || 1;
  return +((PER_SITE[site.cls] || 0.5) * (same ? 1 : 0.12) * (region.wl / geoWl)).toFixed(3);
}

const worst = (a, b) => ['ok', 'warn', 'bad'].indexOf(a) >= ['ok', 'warn', 'bad'].indexOf(b) ? a : b;

/** The hops from a site to a region with cumulative latency and a state per hop. */
export function path(site, region) {
  const metro = site.metro === 'Various' ? 'nearest' : site.metro;
  const hops = []; let ms = 0;
  hops.push({ kind: 'site', name: site.name, sub: site.clsLabel || site.cls, ms: 0, state: 'ok' });
  ms += site.ms || 0;
  hops.push({ kind: 'access', name: site.access || 'Access', sub: site.priv ? 'private first mile' : 'public first mile', ms, state: site.priv ? 'ok' : 'warn' });
  if (AGG.has(site.cls)) { ms += 1; hops.push({ kind: 'hub', name: `${metro} hub`, sub: 'branch aggregation', ms, state: 'ok' }); }
  ms += 2; hops.push({ kind: 'pop', name: `${metro} PoP`, sub: 'AT&T on-net', ms, state: 'ok' });
  if (region.priv) {
    ms += Math.max(2, (region.fab || 8) - 4); hops.push({ kind: 'fabric', name: 'AT&T fabric', sub: 'deterministic path', ms, state: region.rel === 'warn' ? 'warn' : 'ok' });
    ms += 1; hops.push({ kind: 'ramp', name: `${region.ramp || 'NetBond'} on-ramp`, sub: region.city || 'private on-ramp', ms, state: 'ok' });
  } else {
    ms += Math.max(4, (region.pub || 60) - 2); hops.push({ kind: 'public', name: 'Public internet', sub: 'no path control', ms, state: ms > SLO ? 'bad' : 'warn' });
  }
  ms += 1; hops.push({ kind: 'region', name: `${region.cloud} ${region.region}`, sub: region.priv ? 'private path' : 'public path', ms, state: region.rel === 'warn' ? 'warn' : 'ok' });
  const state = hops.reduce((a, h) => worst(a, h.state), 'ok');
  const badIdx = hops.findIndex(h => h.state === state && state !== 'ok');
  return { hops, ms, state, badIdx };
}

/** Sites that reach a region, ranked by traffic. */
export function regionSites(est, region, limit = 8) {
  const rows = allSites(est).map(site => ({ site, gbps: gbps(est, site, region) })).filter(x => x.gbps > 0.0005).sort((a, b) => b.gbps - a.gbps);
  return { rows: rows.slice(0, limit), more: Math.max(0, rows.length - limit), total: rows.length, gbps: +rows.reduce((a, x) => a + x.gbps, 0).toFixed(1) };
}

/** Regions a site reaches, ranked by traffic. */
export function siteRegions(est, site, limit = 8) {
  const rows = est.regionsList.map(region => ({ region, gbps: gbps(est, site, region) })).filter(x => x.gbps > 0.0005).sort((a, b) => b.gbps - a.gbps);
  return { rows: rows.slice(0, limit), more: Math.max(0, rows.length - limit), total: rows.length, gbps: +rows.reduce((a, x) => a + x.gbps, 0).toFixed(1) };
}

/** Resolve a typed name to a region, site, or VPC. */
export function resolve(est, inv, q) {
  const needle = (q || '').trim().toLowerCase(); if (!needle) return null;
  const region = est.regionsList.find(r => r.region.toLowerCase() === needle) || est.regionsList.find(r => r.region.toLowerCase().includes(needle) || `${r.cloud} ${r.region}`.toLowerCase().includes(needle));
  if (region) { const cl = inv.find(c => c.regions.some(r => r.region === region.region)); const rg = cl && cl.regions.find(r => r.region === region.region); return { kind: 'region', region, cloudId: cl && cl.id, regionId: rg && rg.id, label: `${region.cloud} ${region.region}` }; }
  const sites = allSites(est); const site = sites.find(x => x.name.toLowerCase() === needle || x.id.toLowerCase() === needle) || sites.find(x => x.name.toLowerCase().includes(needle) || (x.address || '').toLowerCase().includes(needle));
  if (site) return { kind: 'site', site, label: site.name };
  for (const cl of inv) for (const rg of cl.regions) for (const v of rg.vpcs) if (v.name.toLowerCase().includes(needle)) return { kind: 'vpc', cloudId: cl.id, regionId: rg.id, vpcId: v.id, label: v.name };
  return null;
}
