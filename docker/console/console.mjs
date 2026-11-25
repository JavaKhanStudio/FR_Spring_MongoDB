// r748 (from mongodb-en-visuel r654, Simon's 1C, 24 Nov: « real mongosh when the learner's bridge runs, the engine otherwise »):
// the bridge of lib/mongosh-console.js. A Node script the LEARNER runs: it starts their own mongosh on the URI they give, and
// lets a capsule's console type into it: each line the page sends is written to that mongosh, and what mongosh prints back,
// up to its next prompt, is the answer. No dependency: Node and mongosh, both installed for the course. It sits in lib/, not
// tools/, because the page offers it for download (a visuel serves ficelle/lib, never ficelle/tools).
//   node mongosh-bridge.mjs <uri> [--port 8822] [--mongosh mongosh]      (or --uri <uri>, as mongosh takes it)
//   node mongosh-bridge.mjs <uri> --charger <data.js> --admin <admin uri>  (mongodb-en-visuel r740)
// --charger: the page's « load the base » button (MongoshConsole.charge()) may have the bridge run that ONE file, named here
// by the learner, as --admin's login (mongosh <admin uri> --quiet <data.js>), then reopen <uri>'s session: a data script that
// creates <uri>'s user can run before <uri> logs in at all. The page sends no code and no path: POST /charger takes no
// argument, and /hello says only the file's name. Without --charger, /charger is 404.
// A capsule offers it under its own name with the command to type: MongoshConsole's bridgeFile { href, name, cmd }.
// Two-way on purpose, which docs/live-server.md's first bridge (one way, SSE) did not allow: Simon chose it on mongodb-en-visuel
// r654. What keeps it a door for a course page alone:
//   - it binds 127.0.0.1 only and answers a Host of 127.0.0.1 or localhost alone (no DNS rebinding);
//   - a request must come from a page of the course (SITES), checked on every call, CORS and Private Network Access alike:
//     the site's exact hosts and the project's own worker, never a pattern (mongodb-en-visuel r784: *.*.workers.dev let any
//     Cloudflare account's page type here);
//   - mongosh is a Node runtime: a line can call require('child_process'). So each mongosh starts under Node's permission
//     model (NODE_OPTIONS --permission, r784): no child process, no worker, no inspector, no file written, no file read but
//     its own executable and an empty folder it runs in, an environment of PATH, HOME and the like alone. The bridge tries
//     it at start (child_process, a file read, a file write must all be refused) and does not open its port otherwise: a
//     mongosh whose Node lacks --permission (2.14.0 has Node 24) is told to update, never run unconfined;
//   - it runs mongosh as the URI's user only: give it a read-only login and the server itself refuses a write;
//   - a few sessions at most, each closed after 30 min idle, a line of 64 KB at most.
// What piping mongosh taught (docs/live-server.md, « A console typed into the learner's mongosh »): with stdin piped (no TTY)
// mongosh is still a REPL: it prints its prompt « <db>> », a continuation prompt « | » for an open line, keeps variables and
// the « it » cursor, prints no colours under NO_COLOR and its banner unless --quiet; a line ends at the next prompt followed by
// ~60 ms of quiet.
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values: a, positionals } = parseArgs({ allowPositionals: true, options: {
  uri: { type: 'string' }, port: { type: 'string', default: '8822' }, mongosh: { type: 'string', default: 'mongosh' },
  charger: { type: 'string' }, admin: { type: 'string' } } });
const URI = a.uri ?? positionals[0];
if (!URI || !/^mongodb(\+srv)?:\/\//.test(URI)) { console.error('Donnez l’URL de connexion, comme à mongosh : node <ce fichier> mongodb://utilisateur:motdepasse@localhost:27017/base'); process.exit(2); }   // push-check: allow (a placeholder, no real login)
if (a.charger && !/^mongodb(\+srv)?:\/\//.test(a.admin ?? '')) { console.error('--charger demande --admin : l’URL d’un compte qui peut créer la base, comme à mongosh'); process.exit(2); }
if (a.charger && !existsSync(a.charger)) { console.error(`Fichier introuvable : ${a.charger} (lancez la commande depuis le dossier où il est, ou donnez son chemin)`); process.exit(2); }
const PORT = +a.port, MAX = 4, IDLE = 30 * 60e3, LINE = 64 * 1024, WAIT = 20e3, QUIET = 60;
// the pages that may type: the live site, the course's own worker by its exact host (r784: never a *.workers.dev pattern,
// which any Cloudflare account can serve), and a checkout served on this machine (any port)
const SITES = new Set(['https://simonbedardprog.com', 'https://www.simonbedardprog.com', 'https://ficelle-mongodb.simonbedardprog.workers.dev']);
const allowed = o => SITES.has(o) || /^http:\/\/(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(o);
const HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const who = (() => { try { const u = new URL(URI); return { user: decodeURIComponent(u.username), db: u.pathname.slice(1) }; } catch { return { user: '', db: '' }; } })();
let version = '?';
try { version = execFileSync(a.mongosh, ['--version'], { encoding: 'utf8' }).trim(); }
catch { console.error(`mongosh introuvable (${a.mongosh}) : installez-le, ou donnez son chemin avec --mongosh`); process.exit(2); }

// r784: every mongosh the bridge starts is confined by Node's permission model. It may read its own executable (its startup
// snapshot) and the empty folder it runs in, nothing else; it writes nothing (its history is lost: a warning it prints at start
// is dropped from the banner); child_process, worker_threads and the inspector are refused. --allow-addons stays: mongosh
// loads its own native modules, and with no file written none can be planted. Its environment is the few names it needs, so a
// line reads no token from the learner's shell.
const which = cmd => { if (isAbsolute(cmd) || cmd.includes('/') || cmd.includes('\\')) return resolve(cmd);
  for (const d of (process.env.PATH ?? '').split(delimiter)) for (const x of process.platform === 'win32' ? ['.exe', '.cmd', ''] : [''])
    if (d && existsSync(join(d, cmd + x))) return join(d, cmd + x);
  return cmd; };
const EXE = (() => { try { return realpathSync(which(a.mongosh)); } catch { return which(a.mongosh); } })();
const JAIL = mkdtempSync(join(tmpdir(), 'pont-mongosh-'));
const KEEP = ['PATH', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'SystemRoot', 'SYSTEMROOT', 'TEMP', 'TMP', 'TMPDIR', 'LANG'];
const quote = p => `"${p.replace(/[\\"]/g, '\\$&')}"`;   // NODE_OPTIONS reads \ and " escaped inside quotes
const confined = (...reads) => ({ cwd: JAIL, env: { ...Object.fromEntries(KEEP.filter(k => process.env[k] != null).map(k => [k, process.env[k]])),
  NO_COLOR: '1', NODE_OPTIONS: ['--permission', '--allow-addons', ...[EXE, JAIL, ...reads].map(p => `--allow-fs-read=${quote(p)}`)].join(' ') } });
// what the confinement makes mongosh say once at start, not for the learner: the warnings that it writes no file, and the
// prompt redrawn with cursor codes (« ESC[1G » back to column 1: what stood before it on that line is gone, as on a screen)
const NOISE = /^(Warning: Could not access file: Access to this API has been restricted\.|Access to FileSystemWrite is restricted\.|REPL session history will not be persisted\.).*\n?/gm;
const CURSOR = s => s.replace(/[^\n]*\x1b\[1G/g, '').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
{ // the proof, before the port opens: three escapes, each must be refused
  const probe = "for (const [k, f] of [['spawn', () => require('child_process').execFileSync(process.execPath, ['--version'])], " +
    "['read', () => require('fs').readFileSync(require('os').homedir())], ['write', () => require('fs').writeFileSync('x', 'x')]]) " +
    "{ try { f(); print('OPEN ' + k) } catch (e) { print((e.code === 'ERR_ACCESS_DENIED' ? 'SHUT ' : 'OPEN ') + k) } }";
  let out = '';
  try { out = execFileSync(a.mongosh, ['--nodb', '--quiet', '--eval', probe], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...confined() }); }
  catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
  if (!['spawn', 'read', 'write'].every(k => out.includes('SHUT ' + k))) {
    console.error(`Ce mongosh (${version}) ne se laisse pas enfermer (option --permission de Node) : mettez-le à jour (sa dernière version).\n${out.trim().slice(0, 400)}`);
    rmSync(JAIL, { recursive: true, force: true }); process.exit(2);
  }
}

// a prompt ends what mongosh prints: « LOG_FLOTTE_MN> » (the database's name, then >) or « | », a line still open
const PROMPT = /(?:^|\n)([^\n]*> |\| )$/;
const clean = s => CURSOR(s.replace(/\r/g, '')).replace(NOISE, '');
const sessions = new Map();
function open() {
  const p = spawn(a.mongosh, [URI], { stdio: ['pipe', 'pipe', 'pipe'], ...confined() });
  const s = { id: randomUUID(), p, buf: '', wait: null, used: Date.now(), closed: false };
  const take = d => { s.buf += clean(d.toString('utf8')); s.wait?.(); };
  p.stdout.on('data', take); p.stderr.on('data', take);
  const gone = () => { s.closed = true; sessions.delete(s.id); s.wait?.(); };
  p.on('exit', gone); p.on('error', gone);
  sessions.set(s.id, s);
  return s;
}
// what mongosh prints until its next prompt, the prompt apart (mongosh is quiet for QUIET ms after it)
function answer(s) {
  return new Promise(done => {
    let quiet = null; const t0 = Date.now();
    const end = () => { clearTimeout(quiet); clearTimeout(cap); s.wait = null; const m = PROMPT.exec(s.buf);
      const out = m ? s.buf.slice(0, m.index) : s.buf, prompt = m ? m[1] : '';
      s.buf = ''; done({ out: out.replace(/\n$/, ''), prompt, closed: s.closed, ms: Date.now() - t0 }); };
    const check = () => { clearTimeout(quiet); if (s.closed) return end(); if (PROMPT.test(s.buf)) quiet = setTimeout(end, QUIET); };
    const cap = setTimeout(end, WAIT);
    s.wait = check; check();
  });
}
// the --charger file run once as --admin, start to end (mongosh exits after a file); its last lines are the answer
let loading = null;
const CHARGER = a.charger && resolve(a.charger);   // read by name under the confinement, from the bridge's folder (r784)
function charge() {
  return loading ??= new Promise(done => {
    const p = spawn(a.mongosh, [a.admin, '--quiet', CHARGER], { stdio: ['ignore', 'pipe', 'pipe'], ...confined(CHARGER) });
    let out = ''; const take = d => { out = (out + clean(d.toString('utf8'))).slice(-8192); };
    p.stdout.on('data', take); p.stderr.on('data', take);
    const cap = setTimeout(() => p.kill(), 120e3);
    const end = code => { clearTimeout(cap); loading = null; done({ ok: code === 0, out: out.replace(/\n$/, '') }); };
    p.on('exit', end); p.on('error', e => { out += String(e.message || e); end(1); });
  });
}
setInterval(() => { for (const s of sessions.values()) if (Date.now() - s.used > IDLE) s.p.kill(); }, 60e3).unref();

const body = req => new Promise((ok, ko) => { let b = ''; req.on('data', d => { b += d; if (b.length > LINE) { ko(new Error('too long')); req.destroy(); } });
  req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { ko(e); } }); });
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (!HOSTS.has(req.headers.host) || !origin || !allowed(origin)) { res.writeHead(403).end(); return; }
  const head = { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin', 'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET, POST', 'Cache-Control': 'no-store' };
  const send = (code, o) => res.writeHead(code, { ...head, 'Content-Type': 'application/json' }).end(JSON.stringify(o));
  if (req.method === 'OPTIONS') { res.writeHead(204, head).end(); return; }
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && url.pathname === '/hello') return send(200, { ok: true, mongosh: version, ...who, ...(a.charger ? { charger: basename(a.charger) } : {}) });
    if (req.method !== 'POST') return send(404, { error: 'not found' });
    const q = await body(req);
    if (url.pathname === '/open') {
      if (sessions.size >= MAX) for (const s of [...sessions.values()].sort((x, y) => x.used - y.used).slice(0, sessions.size - MAX + 1)) s.p.kill();
      const s = open(), r = await answer(s);
      return send(r.closed ? 502 : 200, { id: s.id, banner: r.out, prompt: r.prompt, closed: r.closed });
    }
    if (url.pathname === '/charger') {
      if (!a.charger) return send(404, { error: 'no --charger' });
      const r = await charge();
      return send(r.ok ? 200 : 502, r);
    }
    if (url.pathname === '/run') {
      const s = sessions.get(q.id);
      if (!s) return send(410, { error: 'session closed' });
      if (typeof q.line !== 'string' || q.line.length > LINE) return send(400, { error: 'line' });
      s.used = Date.now(); s.buf = '';
      s.p.stdin.write(q.line.replace(/\r/g, '') + '\n');
      return send(200, await answer(s));
    }
    send(404, { error: 'not found' });
  } catch (e) { send(400, { error: String(e.message || e) }); }
});
server.listen(PORT, '127.0.0.1', () => console.log(`Pont de la console : http://127.0.0.1:${PORT}, ${version}${who.user ? `, en ${who.user}` : ''}${a.charger ? `, ${basename(a.charger)} prêt à charger` : ''}. Laissez ce terminal ouvert ; Ctrl+C l’arrête.`));
const bye = () => { for (const s of sessions.values()) s.p.kill(); rmSync(JAIL, { recursive: true, force: true }); process.exit(0); };
process.on('SIGINT', bye); process.on('SIGTERM', bye);
