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
