import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import * as R from '../naas-round2.js';
import { connections } from '../naas-connections.js';
import { buildMap, leftRoots, childrenOf } from '../naas-flowmap.js';
import { gauges, queue, panelFor } from '../naas-observe-dash.js';

const est = D.ESTATES.mature; const inv = A.inventory(est); const ob = A.observe(est, [], inv); const flows = ob.flows;
const conns = connections(est, ob); const hp = R.health(est, ob, []);
const map = buildMap(est, inv, flows, {});
const ctx = { est, inv, flows, map, conns };

test('gauges: one ring per connection with used against purchased', () => { const g = gauges(conns); assert.equal(g.length, conns.total); assert.match(g[0].dash, /^\d+(\.\d+)? \d+(\.\d+)?$/); assert.equal(g[0].state, 'Degraded'); });
test('queue: degraded first, then saturating, blind, over SLO, each with one action', () => {
  const q = queue(est, ob, conns, hp); assert.equal(q[0].state, 'Degraded'); assert.ok(q.some(r => r.state === 'Saturating') && q.some(r => r.state === 'Blind'));
  assert.ok(q.every(r => r.action && r.actionLabel && r.where));
});
test('panel for a connection: overview, impact, records, actions', () => {
  const p = panelFor('cx-eu-central-1', ctx); assert.equal(p.kind, 'connection'); assert.ok(p.overview.length >= 6); assert.equal(p.impact.kind, 'possible'); assert.ok(p.records.length >= 1); assert.ok(p.actions.length >= 2);
});
test('panel for a workload leaf resolves the resource; for an ai endpoint stays unresolved', () => {
  const tag = leftRoots(est, flows).find(x => x.kind === 'tag'); const reg = childrenOf(tag, est, inv, flows)[0]; const vpc = childrenOf(reg, est, inv, flows)[0]; const sn = childrenOf(vpc, est, inv, flows)[0]; const wl = childrenOf(sn, est, inv, flows)[0];
  const m = buildMap(est, inv, flows, { open: [tag.key, reg.key, vpc.key, sn.key] });
  const p = panelFor(wl.key, { ...ctx, map: m }); assert.equal(p.kind, 'workload'); assert.ok(p.overview.some(x => x[0] === 'Resource')); assert.equal(p.trail.length, 5);
  const ai = m.nodes.find(x => x.name === 'AI endpoints'); const m2 = buildMap(est, inv, flows, { open: [ai.key] }); const ep = m2.nodes.find(x => x.kind === 'endpoint'); const p2 = panelFor(ep.key, { ...ctx, map: m2 }); assert.ok(p2.overview.some(x => x[1] === 'unresolved · public'));
});
test('panel for nothing is null', () => { assert.equal(panelFor(null, ctx), null); assert.equal(panelFor('nope', ctx), null); });
test('panel describes an opened node from its trail', () => {
  const m = buildMap(est, inv, flows, { open: ['site:Branch'] });
  const p = panelFor('site:Branch', { ...ctx, map: m }); assert.ok(p); assert.equal(p.kind, 'site'); assert.ok(p.overview.some(x => x[0] === 'Opened'));
});
