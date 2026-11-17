// r71: what a page (the spike's, a capsule's) imports to hear the bridge, served at /pont/pont.js.
//   import { ecouter } from '/pont/pont.js';
//   ecouter({ open() {}, error() {}, status(s) {}, snapshot(s) {}, upsert(u) {}, remove(r) {}, clear(c) {}, count(c) {}, op(o) {}, indexes(i) {} });   // indexes: r125
// Through the SharedWorker /pont/flux.js, so every tab shares one stream. Where a browser has no
// SharedWorker (Chrome on Android), each tab opens its own: past about six tabs, the next one hangs.
const KINDS = ['status', 'snapshot', 'upsert', 'remove', 'clear', 'count', 'op', 'indexes'];
export function ecouter(on) {
  const fire = (type, data) => on[type]?.(data);
  if (typeof SharedWorker === 'function') {
    const w = new SharedWorker('/pont/flux.js', { name: 'pont' });
    w.port.onmessage = (m) => fire(m.data.type, m.data.data);
    w.port.start();
    addEventListener('pagehide', () => w.port.postMessage('bye'));
    addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });   // back from the bfcache: its port was let go
    return 'partagé';
  }
  const es = new EventSource('/events');
  es.onopen = () => fire('open');
  es.onerror = () => fire('error');
  for (const k of KINDS) es.addEventListener(k, (e) => fire(k, JSON.parse(e.data)));
  return 'direct';
}
