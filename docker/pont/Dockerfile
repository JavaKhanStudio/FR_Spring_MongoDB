# r71: the bridge as an image, so a student needs no Node and no npm: `docker compose build` runs
# npm ci in here. The capsule tree it serves (--root) is mounted at run time, read-only.
FROM node:24-alpine
WORKDIR /pont
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY bridge.mjs page.html pont.js flux.js ./
USER node
EXPOSE 8820
ENTRYPOINT ["node", "/pont/bridge.mjs"]
