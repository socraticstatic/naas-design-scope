import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as A from '../naas-addendum.js';
import { facilities, ports, circuits, fabricRows } from '../naas-fabric.js';
const est = D.ESTATES.mature; const inv = A.inventory(est); const ob = A.observe(est, [], inv);
test('the fabric opens to facilities, a facility to ports, a port to circuits that land on sites', () => {
  const f = facilities(est, inv, ob); assert.ok(f.length >= 3); assert.ok(f.some(x => x.state === 'degraded'));
  const l1 = fabricRows(est, inv, ob, ['fab']); assert.equal(l1.level, 'facility'); assert.ok(l1.rows[0].drill);
  const l2 = fabricRows(est, inv, ob, ['fab', l1.rows[0].drill]); assert.equal(l2.level, 'port'); assert.ok(l2.rows.length >= 1); assert.match(l2.rows[0].name, /port 1/);
  const l3 = fabricRows(est, inv, ob, ['fab', l1.rows[0].drill, l2.rows[0].drill]); assert.equal(l3.level, 'circuit'); assert.ok(l3.rows.length >= 1); assert.ok(l3.rows[0].leaf); assert.ok(l3.rows[0].site);
  assert.equal(fabricRows(est, inv, ob, []), null); assert.equal(fabricRows(est, inv, ob, ['fab', 'Nowhere']), null);
});
