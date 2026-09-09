import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';

for (const id of ['partial', 'mature', 'trust']) {
  test(`${id}: exactly one attached region is degraded`, () => {
    const deg = D.ESTATES[id].regionsList.filter(r => r.link === 'degraded');
    assert.equal(deg.length, 1);
    assert.equal(deg[0].priv, true);
  });
  test(`${id}: DX and ER regions carry an account id`, () => {
    for (const r of D.ESTATES[id].regionsList.filter(r => r.priv && (r.ramp === 'DX' || r.ramp === 'ER'))) assert.ok(r.acct, r.region);
  });
}
test('empty estate has no regions', () => { assert.equal(D.ESTATES.empty.regionsList.length, 0); });
