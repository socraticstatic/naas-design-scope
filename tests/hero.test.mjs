import test from 'node:test';
import assert from 'node:assert/strict';
import { heroLayout } from '../naas-logic.js';
const est = { stage: 'partial', sites: [{ name: 'A', priv: true }, { name: 'B', priv: false }], regionsList: [{ cloud: 'AWS', region: 'us-east-1', wl: 10, priv: true, tags: [] }, { cloud: 'AWS', region: 'us-west-2', wl: 5, priv: false, tags: [] }], arcs: [], regionsExtra: 0 };
test('band shrinks and a lane sits beneath it', () => {
  const L = heroLayout(est, {});
  assert.equal(L.bandH, 300); assert.deepEqual(L.lane, { x: 560, y: 340, w: 240, h: 76 });
  assert.equal(L.strata[3].y + L.strata[3].h, 324);
});
test('public edges enter and leave through the lane; private edges use the band', () => {
  const L = heroLayout(est, {});
  const pubIn = L.edges.find(e => e.id === 'in1'), privIn = L.edges.find(e => e.id === 'in0');
  assert.equal(pubIn.viaLane, true); assert.ok(pubIn.y2 >= 340 && pubIn.y2 <= 416);
  assert.equal(privIn.viaLane, false); assert.ok(privIn.y2 <= 324);
  const pubOut = L.edges.find(e => e.kind === 'egress' && !e.priv), inet = L.edges.find(e => e.internet);
  assert.ok(pubOut.viaLane && pubOut.y1 >= 340); assert.ok(inet.y1 >= 340);
});
