// mongodb-en-visuel r835: the one door of the console's box. lib/mongosh-bridge.mjs binds 127.0.0.1 only, which a published
// port cannot reach; this pipes the box's 0.0.0.0:8823 to it, bytes untouched, so the bridge's own checks (Host, Origin)
// judge every request as on a learner's machine. The compose publishes 8823 on the host's 127.0.0.1:8822 alone.
import net from 'node:net';
net.createServer(c => { const b = net.connect(8822, '127.0.0.1'); c.pipe(b).pipe(c);
  const end = () => { c.destroy(); b.destroy(); }; c.on('error', end); b.on('error', end); }).listen(8823, '0.0.0.0');
