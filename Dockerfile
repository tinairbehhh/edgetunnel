# Dockerfile (v2) — for Hostless. Built successfully already; this version
# removes the hardcoded PORT env to avoid conflict with Hostless's runtime
# PORT injection, and trims the image size for faster deploys.

FROM node:20-slim

WORKDIR /app

# Copy project files
COPY package.json server.js ./
COPY _worker.js ./
COPY img.png ./
COPY README.md LICENSE CHANGELOG ./

# No runtime npm dependencies — uses Node 20 built-in
# Request / Response / Headers / fetch / Readable.toWeb.
RUN npm install --omit=dev --no-audit --no-fund || true

# Runtime env. HOST fixed to 0.0.0.0 so the server binds to all interfaces
# (required by Hostless routing). PORT is NOT set here — Hostless injects it
# at runtime; server.js falls back to 8080 only when nothing is injected.
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# EXPOSE is informational only. Hostless routes traffic to whatever port
# process.env.PORT resolves to inside the container.
EXPOSE 8080

CMD ["node", "server.js"]
