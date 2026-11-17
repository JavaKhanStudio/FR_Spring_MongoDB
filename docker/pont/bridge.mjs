// r8 spike. Serves page.html and pushes what a real mongod reports to it, one way.
//   node bridge.mjs [--uri mongodb://127.0.0.1:27220] [--db lab] [--coll navires] [--port 8820] [--bind 127.0.0.1] [--root DIR | --site URL]
// One way by construction: Server-Sent Events, GET only, no request body is ever read, so a page
// cannot send a query through it. Binds 127.0.0.1 unless told (a container publishes it on the
// host's 127.0.0.1 instead) and refuses a foreign Host or Origin.
// Two sources: the change stream gives whole documents; the profiler gives reads and their plan.
// On a standalone there is no stream: a write seen by the profiler re-reads the collection, and a
// poll every 2 s catches what the profiler did not see (level 0, a rename made from admin).
// r71: --root serves a capsule's tree (its folder and ficelle/) from this one origin, because a
// hosted page cannot reach 127.0.0.1. The bridge's own files are under /pont/: page.html at /pont/,
// pont.js (what a page imports to listen) and flux.js (the SharedWorker that holds ONE stream for
// every tab: a browser opens about six HTTP/1.1 streams per origin and hangs the seventh).
// r233: --site URL serves the same tree fetched from where it is deployed (https://simonbedardprog.com/ficelle/mongodb/),
// so a course student needs no copy of the capsules: each file is fetched when the page asks for it, on the same rules
// as --root (GET only, no dot segment, a known type only), and an HTML page gets the same <meta name="pont">.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { parseArgs } from 'node:util';
import { BSON, MongoClient } from 'mongodb';

const { EJSON } = BSON;

const { values: a } = parseArgs({ options: {
  uri: { type: 'string', default: 'mongodb://127.0.0.1:27220' }, db: { type: 'string', default: 'lab' },
  coll: { type: 'string', default: 'navires' }, port: { type: 'string', default: '8820' },
  bind: { type: 'string', default: '127.0.0.1' }, root: { type: 'string' }, site: { type: 'string' } } });
const SHOWN = 200;
const HERE = new URL('.', import.meta.url).pathname;
const OWN = { '/pont/': 'page.html', '/pont/pont.js': 'pont.js', '/pont/flux.js': 'flux.js' };
const ROOT = a.root ? path.resolve(a.root) : null;
const SITE = a.site ? new URL(a.site.endsWith('/') ? a.site : a.site + '/') : null;
if (ROOT && SITE) { console.error('--root or --site, not both'); process.exit(2); }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg', '.jplax': 'application/json', '.atlas': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };
// A file of the tree, or null: no dot segment (.git, .atelier), no way out of the root, a known type only.
function fileOf(url) {
  let p; try { p = decodeURIComponent(new URL(url, 'http://x').pathname); } catch { return null; }
  if (p.split('/').some((s) => s.startsWith('.')) || p.includes('\\') || p.includes('\0')) return null;
  let f = path.join(ROOT, p);
  if (f !== ROOT && !f.startsWith(ROOT + path.sep)) return null;
  try { if (fs.statSync(f).isDirectory()) { if (!p.endsWith('/')) return { redirect: p + '/' }; f = path.join(f, 'index.html'); } } catch { return null; }
  const type = TYPES[path.extname(f).toLowerCase()];
  try { return type && fs.statSync(f).isFile() ? { f, type } : null; } catch { return null; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const client = new MongoClient(a.uri, { appName: 'bridge', directConnection: true, serverSelectionTimeoutMS: 1500 });
const db = client.db(a.db);
const coll = db.collection(a.coll);

const clients = new Set();
const frame = (type, data) => `event: ${type}\ndata: ${EJSON.stringify(data, { relaxed: true })}\n\n`;
const send = (type, data) => { const f = frame(type, data); for (const c of clients) c.write(f); };

const status = { server: false, version: null, stream: 'starting', profiler: 'starting', db: a.db, coll: a.coll };
const setStatus = (patch) => { Object.assign(status, patch); send('status', status); };
// r125: the collection's indexes go with every snapshot (a capsule draws a carnet for each), as listIndexes gives them
const readIndexes = async () => { try { return (await coll.indexes()).map(({ name, key }) => ({ name, key })); } catch { return []; } };
const readSnapshot = async () => ({
  docs: await coll.find().sort({ $natural: -1 }).limit(SHOWN).toArray(),
  count: await coll.countDocuments(), shownMax: SHOWN, indexes: await readIndexes() });
let lastSig = null;
const sigOf = (s) => `${s.count}:${EJSON.stringify(s.docs[0]?._id ?? null)}`;
const sendSnapshot = async () => { try { const s = await readSnapshot(); lastSig = sigOf(s); send('snapshot', s); } catch { /* a loop below reports the server lost */ } };
let countTimer = null;
const sendCountSoon = () => { countTimer ??= setTimeout(async () => { countTimer = null;
  try { send('count', { count: await coll.countDocuments() }); } catch { /* same */ } }, 150); };
let resyncTimer = null;
const resyncSoon = () => { resyncTimer ??= setTimeout(() => { resyncTimer = null; sendSnapshot(); }, 100); };

function onChange(e) {
  if (e.operationType === 'dropDatabase') {
    // It puts the profiling level back to 0: arm it now, the tail below only notices later.
    db.command({ profile: 2 }).catch(() => {});
    return send('clear', { why: 'dropDatabase' }), sendCountSoon();
  }
  if (e.operationType === 'rename' && e.to?.coll === a.coll && e.to?.db === a.db) return resyncSoon(), sendCountSoon();   // renamed INTO ours
  if (e.ns?.coll !== a.coll) return;
  if (['insert', 'update', 'replace'].includes(e.operationType)) { if (e.fullDocument) send('upsert', { op: e.operationType, doc: e.fullDocument }); }
  else if (e.operationType === 'delete') send('remove', { id: e.documentKey._id });
  else if (e.operationType === 'rename') send('clear', { why: 'rename', to: `${e.to?.db}.${e.to?.coll}` });
  else if (e.operationType === 'drop') send('clear', { why: 'drop' });
  sendCountSoon();
}

async function streamLoop() {
  let token;
  for (;;) {
    let cs;
    try {
      cs = db.watch([], { fullDocument: 'updateLookup', maxAwaitTimeMS: 500, ...(token ? { startAfter: token } : {}) });
      let e = await cs.tryNext();          // opens the stream, so what the read below misses still arrives
      setStatus({ server: true, stream: 'live' });
      await sendSnapshot();
      for (;;) {
        if (e) {
          token = e._id; onChange(e);
          if (e.operationType === 'invalidate') break;   // dropDatabase ends a database's stream: open it again after
        } else token = cs.resumeToken ?? token;
        e = await cs.tryNext();
        if (cs.closed) break;
      }
    } catch (err) {
      if (err.code === 40573) { setStatus({ server: true, stream: 'none: a standalone has no change stream' }); return; }
      setStatus({ server: false, stream: 'lost' });
      await sleep(500);
    } finally { await cs?.close().catch(() => {}); }
  }
}

// A profile entry says what the server did, in its own words. Reads are only here.
function opOf(p) {
  if (p.ns === `${a.db}.system.profile`) return null;
  // r125: a find's later batches add to its counts (a capsule sums them by cursorid); their own command says nothing new
  if (p.op === 'getmore') return p.ns === `${a.db}.${a.coll}` ? { verb: 'getMore', ns: p.ns, cursorid: p.cursorid ?? null, docsExamined: p.docsExamined ?? null,
    keysExamined: p.keysExamined ?? null, nreturned: p.nreturned ?? null } : null;
  const verb = p.op === 'command' ? Object.keys(p.command ?? {})[0] : p.op;
  if (p.op === 'command' && ['profile', 'hello', 'isMaster', 'ping', 'endSessions', 'buildInfo', 'getParameter', 'atlasVersion'].includes(verb)) return null;
  return { verb, ns: p.ns, plan: p.planSummary ?? null, millis: p.millis, docsExamined: p.docsExamined ?? null, keysExamined: p.keysExamined ?? null,
    nreturned: p.nreturned ?? null, ninserted: p.ninserted ?? null, nModified: p.nModified ?? null, ndeleted: p.ndeleted ?? null,
    // r125: what was asked, so a page can write it back: a find's parts (its profile op is 'query'), the keys of createIndexes
    ...(p.op === 'query' ? { cursorid: p.cursorid ?? null, find: pick(p.command, ['filter', 'projection', 'sort', 'skip', 'limit']) } : {}),
    ...(verb === 'createIndexes' ? { keys: (p.command.indexes ?? []).map((i) => i.key) } : {}),
    ...(verb === 'dropIndexes' ? { index: p.command.index ?? null } : {}) };
}
const pick = (o = {}, ks) => Object.fromEntries(ks.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

// r125: which documents a find gave back. The profiler counts them (nreturned) but does not name them, so the same find is
// run again, as the bridge (appName 'bridge', which the tail skips), keeping only the _ids: its filter, sort, skip, limit
// and collation; its projection is dropped (an _id: 0 would hide the ids). Up to SHOWN; a later write may differ.
async function idsOf(c = {}) {
  try {
    let cur = coll.find(c.filter ?? {}, { projection: { _id: 1 }, ...(c.collation ? { collation: c.collation } : {}), ...(c.hint ? { hint: c.hint } : {}) });
    if (c.sort) cur = cur.sort(c.sort);
    if (c.skip) cur = cur.skip(c.skip);
    cur = cur.limit(Math.min(c.limit ? Math.abs(c.limit) : SHOWN, SHOWN));
    return (await cur.toArray()).map((d) => d._id);
  } catch { return null; }
}

async function profilerLoop() {
  const prof = db.collection('system.profile');
  let since = null; let seen = new Set();
  for (;;) {
    try {
      // Level 2 alone: it records everything without touching the server-wide slowms, and it is per database.
      await db.command({ profile: 2 });
      since ??= (await db.command({ hello: 1 })).localTime;
      setStatus({ server: true, profiler: 'live' });
      // A tailable cursor on an empty result dies at once, and a dropped database takes the collection
      // with it, so it is reopened. $gte with a memory of the last millisecond: two entries can share one.
      const cur = prof.find({ ts: { $gte: since }, appName: { $ne: 'bridge' } }, { tailable: true, awaitData: true, maxAwaitTimeMS: 200 });
      for await (const p of cur) {
        const key = EJSON.stringify(p);
        if (p.ts > since) { since = p.ts; seen = new Set(); }
        if (seen.has(key)) continue;
        seen.add(key);
        const op = opOf(p);
        if (!op) continue;
        if (p.ns === `${a.db}.${a.coll}` && p.op === 'query') op.ids = await idsOf(p.command);
        send('op', op);
        if (['createIndexes', 'dropIndexes', 'drop'].includes(op.verb) || p.op === 'command' && p.command?.dropIndexes) send('indexes', { indexes: await readIndexes() });
        if (status.stream.startsWith('none') && p.ns === `${a.db}.${a.coll}` && (p.ninserted || p.nModified || p.ndeleted || p.upsert || op.verb === 'drop')) resyncSoon();
      }
      await sleep(100);
    } catch { setStatus({ server: false, profiler: 'lost' }); await sleep(500); }
  }
}

// r71: a student's db.setProfilingLevel(0) leaves the tail open on nothing. Read the level each
// second and say it on the page; never set it back (it is the student's call), except where the
// tail reopens on its own (a dropDatabase put it to 0, which the student did not ask for).
const LEVELS = { 0: 'coupé (niveau 0) : les lectures ne s’affichent plus', 1: 'niveau 1 : seules les opérations lentes s’affichent' };
async function levelLoop() {
  for (;;) {
    try {
      const { was } = await db.command({ profile: -1 });
      const want = LEVELS[was] ?? 'live';
      if (status.profiler !== want && (status.profiler === 'live' || Object.values(LEVELS).includes(status.profiler))) setStatus({ profiler: want });
    } catch { /* the profiler loop reports a lost server */ }
    await sleep(1000);
  }
}
// r71: on a standalone, what the profiler did not see (level 0, a rename run from admin) is caught
// by comparing the count and the newest _id every 2 s. A replica set's stream needs none of it.
async function pollLoop() {
  for (;;) {
    await sleep(2000);
    if (!status.stream.startsWith('none')) continue;
    try { if (sigOf(await readSnapshot()) !== lastSig) await sendSnapshot(); } catch { /* reported elsewhere */ }
  }
}

// r125: a page of the tree learns it is served by the bridge from this tag, without a request a static host would 404
const MARK = `<meta name="pont" content="${a.db}.${a.coll}">`;
// r233: a file of the deployed tree, fetched at its own path under --site. A path with no extension and no slash is
// a folder (the host redirects it): sent to path + '/' here, so the page's relative imports resolve against the folder.
const CF_CHECK = /<script>(?:(?!<\/script>)[\s\S])*?\/cdn-cgi\/challenge-platform\/[\s\S]*?<\/script>/g;
async function sendRemote(res, url) {
  let p; try { p = new URL(url, 'http://x').pathname; } catch { res.writeHead(404).end(); return; }
  const segs = decodeURIComponent(p).split('/');
  if (segs.some((s) => s.startsWith('.')) || p.includes('\\') || p.includes('%00')) { res.writeHead(404).end(); return; }
  const last = segs.at(-1);
  if (last && !path.extname(last)) { res.writeHead(301, { location: p + '/' }).end(); return; }
  const type = last ? TYPES[path.extname(last).toLowerCase()] : TYPES['.html'];
  if (!type) { res.writeHead(404).end(); return; }
  let r;
  try { r = await fetch(new URL(p.replace(/^\//, ''), SITE), { redirect: 'follow', signal: AbortSignal.timeout(20000) }); }
  catch { res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }).end(`Le pont n'a pas pu joindre ${SITE.origin} : il lui faut Internet pour servir les capsules.`); return; }
  if (!r.ok) { res.writeHead(r.status === 404 ? 404 : 502).end(); return; }
  const head = { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
  // r257: the host (Cloudflare) adds its bot check to each page, a script loading /cdn-cgi/challenge-platform/... from the
  // page's origin, which here is the bridge: a 404 in the student's console. It checks nothing on 127.0.0.1, so it goes.
  if (type.startsWith('text/html')) { res.writeHead(200, head).end((await r.text()).replace(CF_CHECK, '').replace('</head>', MARK + '</head>')); return; }
  res.writeHead(200, head).end(Buffer.from(await r.arrayBuffer()));
}
function sendFile(res, f, type) {
  if (ROOT && type.startsWith('text/html') && !f.startsWith(HERE)) {
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(fs.readFileSync(f, 'utf8').replace('</head>', MARK + '</head>')); return;
  }
  res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  fs.createReadStream(f).pipe(res);
}

const srv = http.createServer(async (req, res) => {
  const here = [`127.0.0.1:${a.port}`, `localhost:${a.port}`];
  const origin = req.headers.origin;
  if (!here.includes(req.headers.host) || (origin && !here.some((h) => origin === `http://${h}`))) { res.writeHead(403).end(); return; }
  if (req.method !== 'GET') { res.writeHead(405, { allow: 'GET' }).end(); return; }
  const url = req.url.split('?')[0];
  if (OWN[url] || (url === '/' && !ROOT && !SITE)) { const f = path.join(HERE, OWN[url] ?? 'page.html'); sendFile(res, f, TYPES[path.extname(f)]); return; }
  if (url === '/snapshot') {
    try { res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(EJSON.stringify(await readSnapshot(), { relaxed: true })); }
    catch { res.writeHead(503).end(); }
    return;
  }
  if (url !== '/events' && SITE) { await sendRemote(res, req.url); return; }
  if (url !== '/events') {
    const hit = ROOT && fileOf(req.url);
    if (hit?.redirect) { res.writeHead(301, { location: hit.redirect }).end(); return; }
    if (hit) { sendFile(res, hit.f, hit.type); return; }
    res.writeHead(404).end(); return;
  }
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
  clients.add(res);
  req.on('close', () => clients.delete(res));
  res.write(frame('status', status));
  try { res.write(frame('snapshot', await readSnapshot())); } catch { /* the page shows the status */ }
});

srv.listen(+a.port, a.bind, () => console.log(`http://127.0.0.1:${a.port}/  ${a.uri} ${a.db}.${a.coll}${ROOT ? '  root ' + ROOT : ''}${SITE ? '  site ' + SITE : ''}`));
try { await client.connect(); } catch { /* the loops report it and keep trying */ }
try { setStatus({ version: (await db.admin().command({ buildInfo: 1 })).version }); } catch { /* shown as unknown */ }
streamLoop(); profilerLoop(); levelLoop(); pollLoop();
