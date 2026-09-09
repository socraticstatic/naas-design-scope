import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { buildMap, childrenOf, leftRoots, rightRoots, trail, litFor, deltaOf, shapeAt } from '../naas-flowmap.js';

const est = D.ESTATES.mature; const inv = A.inventory(est); const flows = A.observe(est, [], inv).flows;

test('roots: sites, tags, c2c on the left; destinations on the right', () => {
  const L = leftRoots(est, flows); assert.ok(L.some(x => x.kind === 'site') && L.some(x => x.kind === 'tag') && L.some(x => x.kind === 'c2c'));
  const R = rightRoots(est, flows); assert.ok(R.length >= 4); assert.ok(R.every(x => x.hasChildren));
});
test('opening a site class shows metros, a metro shows sites, a site shows its circuits', () => {
  const branch = leftRoots(est, flows).find(x => x.key === 'site:Branch');
  const metros = childrenOf(branch, est, inv, flows); assert.ok(metros.length >= 2); assert.equal(metros[0].kind, 'metro');
  const sites = childrenOf(metros[0], est, inv, flows); assert.ok(sites.length >= 1); assert.equal(sites[0].kind, 'sitename');
  const circuits = childrenOf(sites[0], est, inv, flows); assert.ok(circuits.length >= 1); assert.equal(circuits[0].kind, 'circuit'); assert.equal(circuits[0].hasChildren, false);
});
test('opening a tag goes region → vpc → subnet → workload, five levels', () => {
  const tag = leftRoots(est, flows).find(x => x.kind === 'tag');
  const regions = childrenOf(tag, est, inv, flows); assert.equal(regions[0].kind, 'tagregion');
  const vpcs = childrenOf(regions[0], est, inv, flows); assert.equal(vpcs[0].kind, 'vpc');
  const subnets = childrenOf(vpcs[0], est, inv, flows); assert.equal(subnets[0].kind, 'subnet');
  const wl = childrenOf(subnets[0], est, inv, flows); assert.equal(wl[0].kind, 'workload'); assert.match(wl[0].ip, /^\d+\./); assert.equal(wl[0].hasChildren, false);
  assert.equal(childrenOf(wl[0], est, inv, flows).length, 0);
});
test('destinations open honestly: ai endpoints are unresolved ips, object storage resolves per region', () => {
  const R = rightRoots(est, flows);
  const ai = childrenOf(R.find(x => x.name === 'AI endpoints'), est, inv, flows); assert.ok(ai.every(x => x.unresolved && /^\d+\./.test(x.name)));
  const obj = childrenOf(R.find(x => x.name === 'object storage'), est, inv, flows); assert.match(obj[0].name, /s3|blob|gcs/);
});
test('buildMap expands open keys in place and ribbons carry from/to', () => {
  const m0 = buildMap(est, inv, flows, {}); const n0 = m0.nodes.length;
  const m1 = buildMap(est, inv, flows, { open: ['site:Branch'] });
  assert.ok(m1.nodes.length > n0); assert.ok(!m1.nodes.some(x => x.key === 'site:Branch')); assert.ok(m1.nodes.some(x => x.kind === 'metro'));
  assert.ok(m1.ribbons.every(r => r.from && r.to)); assert.ok(m1.ribbons.some(r => r.from.startsWith('site:Branch/')));
  const m2 = buildMap(est, inv, flows, { open: ['site:Branch', m1.nodes.find(x => x.kind === 'metro').key] });
  assert.ok(m2.nodes.some(x => x.kind === 'sitename'));
});
test('filterRegion narrows, scrub scales, deltas and states exist', () => {
  const all = buildMap(est, inv, flows, {}); const one = buildMap(est, inv, flows, { filterRegion: 'eu-central-1' });
  assert.ok(one.total < all.total);
  const t = buildMap(est, inv, flows, { t: 0.5 }); assert.notEqual(Math.round(t.total * 100), Math.round(all.total * 100));
  assert.ok(all.nodes.every(x => typeof x.delta === 'number' && ['ok', 'degraded', 'slo'].includes(x.state)));
  assert.equal(deltaOf('x'), deltaOf('x')); assert.ok(shapeAt('x', 0.3) > 0.5 && shapeAt('x', 0.3) < 1.3);
});
test('trail walks root to leaf; litFor lights ribbons through a node', () => {
  const branch = leftRoots(est, flows).find(x => x.key === 'site:Branch'); const metro = childrenOf(branch, est, inv, flows)[0]; const site = childrenOf(metro, est, inv, flows)[0];
  const tr = trail(site.key, est, inv, flows); assert.deepEqual(tr.map(x => x.kind), ['site', 'metro', 'sitename']);
  const m = buildMap(est, inv, flows, {}); const lit = litFor(m, 'site:Branch'); assert.ok(lit.keys.has('site:Branch') && lit.keys.has('mid:fabric')); assert.ok(lit.ribbons.size >= 1);
});
import { PATTERNS, patternLit } from '../naas-flowmap.js';
test('a third band carries what stays in the region, and every ribbon carries a pattern', () => {
  const m = buildMap(est, inv, flows, {});
  assert.ok(m.nodes.some(x => x.key === 'mid:local') && m.nodes.some(x => x.key === 'dest:local'));
  assert.ok(m.localV > 0); assert.ok(m.ribbons.every(r => r.pattern));
  assert.deepEqual(PATTERNS.map(p => p[0]), ['region', 'regions', 'clouds', 'internet', 'inbound']);
  for (const [k] of PATTERNS) { const lit = patternLit(m, k); assert.ok(lit.ribbons.size >= 1, k); }
  assert.equal(patternLit(m, 'all'), null);
});
test('below the roots, an open node folds its siblings into one row', () => {
  const branch = leftRoots(est, flows).find(x => x.key === 'site:Branch'); const metro = childrenOf(branch, est, inv, flows)[0];
  const m = buildMap(est, inv, flows, { open: ['site:Branch', metro.key] });
  const metros = m.nodes.filter(x => x.kind === 'metro'); const roll = m.nodes.find(x => x.kind === 'rollup');
  assert.equal(metros.length, 0); assert.ok(roll && /other metros/.test(roll.name)); assert.equal(roll.foldsKey, metro.key);
  assert.ok(m.nodes.some(x => x.kind === 'sitename'));
  const m1 = buildMap(est, inv, flows, { open: ['site:Branch'] }); assert.ok(!m1.nodes.some(x => x.kind === 'rollup'), 'roots do not fold');
});
test('zoom on click: the focused subtree inflates, ribbons still attach', () => {
  const branch = leftRoots(est, flows).find(x => x.key === 'site:Branch'); const metro = childrenOf(branch, est, inv, flows)[0];
  const flat = buildMap(est, inv, flows, { open: ['site:Branch', metro.key] });
  const zoomed = buildMap(est, inv, flows, { open: ['site:Branch', metro.key], zoom: metro.key });
  const hFlat = flat.nodes.filter(x => x.kind === 'sitename').reduce((a, x) => a + x.h, 0); const hZoom = zoomed.nodes.filter(x => x.kind === 'sitename').reduce((a, x) => a + x.h, 0);
  assert.ok(zoomed.zf > 1); assert.ok(hZoom > hFlat * 1.5, `${hZoom} vs ${hFlat}`); assert.ok(zoomed.H <= 460, 'frame holds: ' + zoomed.H);
  assert.ok(zoomed.ribbons.every(r => r.d.startsWith('M')));
});
