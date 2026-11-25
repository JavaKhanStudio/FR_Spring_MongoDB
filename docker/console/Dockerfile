# mongodb-en-visuel r835 (Simon's pick A): achille's side console on the course's own MongoDB, nothing to launch by hand.
# Ficelle's lib/mongosh-bridge.mjs (laid here as console.mjs, unchanged) in a container of its own. It still confines every
# mongosh it starts (Node's --permission, r784), and the container is a second wall: a line that escaped would land in this
# box, with no file of the learner's mounted and no Docker socket. The official mongosh build (its own Node 24, which has
# --permission), not npm's: npm's mongosh needs its whole node_modules readable, which the confinement forbids.
FROM node:24-bookworm-slim
ARG TARGETARCH
ARG MONGOSH=2.14.0
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && arch=$([ "$TARGETARCH" = arm64 ] && echo arm64 || echo x64) \
 && curl -fsSL "https://downloads.mongodb.com/compass/mongosh-$MONGOSH-linux-$arch.tgz" | tar -xz -C /opt \
 && ln -s "/opt/mongosh-$MONGOSH-linux-$arch/bin/mongosh" /usr/local/bin/mongosh \
 && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY console.mjs forward.mjs saboteur-v2-donnees.js ./
USER node
# the bridge listens on 127.0.0.1:8822 inside the box (it binds nothing else); forward.mjs alone faces the network, on 8823,
# which the compose publishes on the host's 127.0.0.1:8822 only, so the Host the browser sends is the one the bridge accepts
ENTRYPOINT ["sh", "-c", "node forward.mjs & exec node console.mjs \"$@\"", "console"]
