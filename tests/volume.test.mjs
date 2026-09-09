import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../naas-data.js';
import * as S from '../naas-sites.js';
import { volumeList, metroOf } from '../naas-volume.js';
const est = D.ESTATES.trust;
test('every site in a metro is generated, the sample is its head', () => {
  const m = S.siteTree(est).find(c => c.cls === 'Branch').children.slice().sort((a, b) => b.count - a.count)[0];
  const all = S.metroSites(m); assert.equal(all.length, m.count); assert.ok(m.count > 100);
  assert.deepEqual(all.slice(0, 6).map(x => x.id), m.sites.map(x => x.id));
});
test('volume list: worst first, searchable, filterable, paged, bulk-countable', () => {
  const m = S.siteTree(est).find(c => c.cls === 'Branch').children.slice().sort((a, b) => b.count - a.count)[0];
  const v = volumeList(est, { cls: 'Branch', metro: m.name }); assert.ok(v); assert.equal(v.counts.total, m.count); assert.equal(v.shownCount, 60); assert.ok(v.hasMore);
  assert.ok(['degraded', 'public'].includes(v.rows[0].state));
  const q = volumeList(est, { cls: 'Branch', metro: m.name }, { q: v.rows[3].id.toLowerCase() }); assert.equal(q.matching, 1);
  const pub = volumeList(est, { cls: 'Branch', metro: m.name }, { path: 'public' }); assert.equal(pub.matching, v.counts.public); assert.equal(pub.bulk.attach, v.counts.public);
  const p2 = volumeList(est, { cls: 'Branch', metro: m.name }, { page: 2 }); assert.equal(p2.shownCount, Math.min(120, m.count));
  const sel = volumeList(est, { cls: 'Branch', metro: m.name }, { sel: v.rows.slice(0, 5).map(x => x.id) }); assert.equal(sel.selectedCount, 5); assert.match(sel.bulk.label, /5 selected/);
  assert.equal(volumeList(est, { cls: 'Branch', metro: 'Nowhere' }), null);
  const atm = S.siteTree(est).find(c => c.cls === 'Edge').children[0]; const va = volumeList(est, { cls: 'Edge', metro: atm.name }); assert.equal(va.counts.total, 48); assert.match(va.title, /ATMs/);
});
