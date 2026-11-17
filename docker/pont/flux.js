// r71: ONE event stream for every tab of this origin. A browser opens about six HTTP/1.1
// connections per origin, and an EventSource holds one for good: a seventh tab would hang.
// This SharedWorker holds the stream and copies each event to every tab (pont.js connects them).
// A tab that joins late gets the last status and a fresh /snapshot, never a replay.
const KINDS = ['status', 'snapshot', 'upsert', 'remove', 'clear', 'count', 'op', 'indexes'];
const ports = new Set();
let es = null, open = false, status = null;
const all = (m) => { for (const p of ports) p.postMessage(m); };
function start() {
  es = new EventSource('/events');
  es.onopen = () => { open = true; all({ type: 'open' }); };
  es.onerror = () => { open = false; all({ type: 'error' }); };
  for (const k of KINDS) es.addEventListener(k, (e) => { const data = JSON.parse(e.data); if (k === 'status') status = data; all({ type: k, data }); });
}
onconnect = (e) => {
  const p = e.ports[0];
  ports.add(p);
  p.onmessage = (m) => { if (m.data === 'bye') ports.delete(p); };
  p.start();
  if (!es) { start(); return; }
  if (open) p.postMessage({ type: 'open' });
  if (status) p.postMessage({ type: 'status', data: status });
  fetch('/snapshot').then((r) => (r.ok ? r.json() : null)).then((data) => data && p.postMessage({ type: 'snapshot', data })).catch(() => {});
};
