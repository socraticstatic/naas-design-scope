import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { connections, impacted, sparkline, patterns, resolveDest, launchCards } from '../naas-connections.js';

const est = D.ESTATES.mature;
const inv = A.inventory(est);
const ob = A.observe(est, [], inv);

test('one connection per attached region, degraded first', () => {
  const c = connections(est, ob);
  assert.equal(c.total, est.regionsList.filter(r => r.priv).length);
  assert.equal(c.degraded, 1);
  assert.equal(c.rows[0].state, 'Degraded');
  assert.equal(c.rows[0].bgp, 'Flapping');
  assert.equal(c.rows[0].region, 'eu-central-1');
});
test('rows carry purchased capacity and sparklines', () => {
  const r = connections(est, ob).rows[0];
  assert.ok(r.cap >= 10); assert.ok(r.inD.startsWith('M')); assert.ok(r.outD.startsWith('M'));
  assert.ok(r.pct >= 0 && r.pct <= 100);
});
test('customer gateway reads possible impact with the account', () => {
  const r = connections(est, ob).rows.find(x => x.region === 'eu-central-1');
  const i = impacted(est, inv, r);
  assert.equal(i.kind, 'possible');
  assert.match(i.certainty, /Possible impact/);
  assert.match(i.certainty, /4102-8837-5510/);
  assert.ok(i.vpcs.length >= 1);
  assert.match(i.resilience, /Single path/);
});
test('healthy AT&T-terminated connection reads no impact', () => {
  const r = connections(est, ob).rows.find(x => x.region === 'us-east-1');
  const i = impacted(est, inv, r);
  assert.equal(i.kind, 'none');
  assert.ok(i.downstream.length >= 1, 'us-east-1 talks to eastus');
});
test('degraded AT&T-terminated dual path reads direct impact and access holds', () => {
  const est2 = { ...est, regionsList: est.regionsList.map(r => r.region === 'us-east-1' ? { ...r, link: 'degraded' } : r) };
  const ob2 = A.observe(est2, [], inv);
  const r = connections(est2, ob2).rows.find(x => x.region === 'us-east-1');
  const i = impacted(est2, A.inventory(est2), r);
  assert.equal(i.kind, 'direct'); assert.match(i.resilience, /Access holds/);
});
test('sparkline is deterministic', () => { assert.equal(sparkline(7, 24, 50, 20), sparkline(7, 24, 50, 20)); });
test('empty estate yields no rows', () => { const e = D.ESTATES.empty; const c = connections(e, A.observe(e, [], A.inventory(e))); assert.equal(c.rows.length, 0); });

test('five patterns in the fixed order, each with rows', () => {
  const p = patterns(est, ob, inv);
  assert.deepEqual(p.map(x => x.key), ['region', 'regions', 'clouds', 'internet', 'inbound']);
  assert.deepEqual(p.map(x => x.title), ['Stays in the region', 'Across regions', 'Across clouds', 'Out to the internet', 'Coming in']);
  for (const x of p) assert.ok(x.rows.length >= 1, x.key);
});
test('a private workload ip resolves to its resource name', () => {
  const w = inv[0].regions[0].vpcs[0].subnets.find(s => !s.pub).workloads[0];
  const hit = resolveDest(inv, w.ip);
  assert.ok(hit); assert.match(hit.name, new RegExp(w.name));
});
test('an unknown ip stays unresolved', () => { assert.equal(resolveDest(inv, '203.0.113.9'), null); });

test('four launch cards; Observe primary on a live estate, Connect on an empty one', () => {
  const c = launchCards({ est, ob, conns: connections(est, ob), totalSave: 12000, violations: 52, isEmpty: false });
  assert.deepEqual(c.map(x => x.key), ['connect', 'observe', 'govern', 'cost']);
  assert.equal(c.find(x => x.primary).key, 'observe');
  assert.match(c[1].value, /1 of \d+ connections/); assert.match(c[1].sub, /degraded/);
  const e = launchCards({ est: D.ESTATES.empty, ob: A.observe(D.ESTATES.empty, [], []), conns: { rows: [], degraded: 0, total: 0 }, totalSave: 0, violations: 0, isEmpty: true });
  assert.equal(e.find(x => x.primary).key, 'connect'); assert.equal(e[0].value, 'Nothing connected yet');
  assert.equal(c[1].door, 'See what is impacted'); assert.match(c[1].eyebrow, /Start here/); assert.equal(c[0].eyebrow, ''); assert.equal(e[0].door, 'Connect a cloud');
});

import { records } from '../naas-connections.js';
test('records carry one pattern each and resolve private destinations', () => {
  const all = records(est, inv, ob, 'all');
  assert.ok(all.length >= 10);
  for (const k of ['region', 'regions', 'clouds', 'internet', 'inbound']) assert.ok(records(est, inv, ob, k).every(r => r.pattern === k) && records(est, inv, ob, k).length >= 1, k);
  const priv = all.find(r => r.pattern === 'region'); assert.match(priv.dstName, /\//);
  const pub = all.find(r => r.pattern === 'internet'); assert.match(pub.dstName, /^\d+\.\d+\.\d+\.\d+$/);
  assert.equal(records(D.ESTATES.empty, [], ob, 'all').length, 0);
});

import { siteDrillRows, regionDrillRows, splitSources, destPattern } from '../naas-connections.js';
test('left drill: class → metros → sites → paths, context kept', () => {
  const l1 = siteDrillRows(est, ['Branch']);
  assert.equal(l1.level, 'metro'); assert.ok(l1.rows.length >= 2); assert.ok(l1.rows[0].drillKey);
  const l2 = siteDrillRows(est, ['Branch', l1.rows[0].drillKey]);
  assert.equal(l2.level, 'site'); assert.ok(l2.rows.length >= 1); assert.match(l2.rows[0].name, /^BR-/);
  const l3 = siteDrillRows(est, ['Branch', l1.rows[0].drillKey, l2.rows[0].drillKey]);
  assert.equal(l3.level, 'path'); assert.ok(l3.rows.length >= 1); assert.ok(l3.rows[0].leaf); assert.match(l3.rows[0].access, /ms/);
  const named = siteDrillRows(est, ['Data center']);
  assert.equal(named.level, 'site'); assert.equal(named.rows[0].name, 'Ashburn DC');
  const dcPaths = siteDrillRows(est, ['Data center', 'Ashburn DC']);
  assert.equal(dcPaths.level, 'path');
  assert.equal(siteDrillRows(est, []), null);
});
test('right drill: region → VPCs → subnets → workloads, other regions fold', () => {
  const r1 = regionDrillRows(est, inv, ['us-east-1']);
  assert.equal(r1.level, 'vpc'); assert.equal(r1.rows[0].pinned, true); assert.ok(r1.rows[1].child && r1.rows[1].drill); assert.ok(r1.rows[r1.rows.length - 1].other);
  const r2 = regionDrillRows(est, inv, ['us-east-1', r1.rows[1].drill]);
  assert.equal(r2.level, 'subnet'); assert.match(r2.rows[1].region, /\d+\.\d+\.\d+\.\d+\/24/);
  const r3 = regionDrillRows(est, inv, ['us-east-1', r1.rows[1].drill, r2.rows[1].drill]);
  assert.equal(r3.level, 'workload'); assert.ok(r3.rows[1].leaf); assert.match(r3.rows[1].wlLabel, /^\d+\./);
  assert.equal(regionDrillRows(est, inv, ['nope']), null);
});
test('sankey split by metro and by region', () => {
  const s1 = splitSources(est, ob.flows, 'site:Branch'); assert.ok(s1 && s1.nodes.length >= 2); assert.equal(s1.nodes[0].kind, 'sitemetro');
  const tag = ob.flows.find(f => f.kind === 'App').from;
  const s2 = splitSources(est, ob.flows, 'tag:' + tag); assert.ok(s2 && s2.nodes.length >= 1); assert.equal(s2.nodes[0].kind, 'tagregion');
  assert.equal(splitSources(est, ob.flows, null), null);
  assert.equal(destPattern('object storage'), 'regions'); assert.equal(destPattern('Cloud regions (from sites)'), 'inbound');
});
test('a named top-level site drills straight to its paths', () => { const r = siteDrillRows(est, ['Ashburn DC']); assert.equal(r.level, 'path'); assert.ok(r.rows.length >= 1); });
test('each pattern carries connectivity, security and cost', () => { for (const x of patterns(est, ob, inv)) { assert.match(x.sub, /on the fabric · .* · \$\d\.\d\d\/GB/); assert.ok(x.connectivity && x.security && x.cost); } });
