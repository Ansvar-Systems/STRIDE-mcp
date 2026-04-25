# STRIDE Patterns MCP Server — Hetzner / Kubernetes
#
# Image contract: docs/superpowers/specs/2026-04-25-mcp-infrastructure-standard-design.md §3
# Pattern: pure JS/TS (no native modules — node-sqlite3-wasm ships a precompiled .wasm)
#
# Build: docker build -t stride-patterns-mcp .
# Run:   docker run -p 3000:3000 stride-patterns-mcp

# ── Builder ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts && npm cache clean --force

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Non-root user (UID/GID 1001 per §3.1)
RUN addgroup -g 1001 -S nodejs \
 && adduser -u 1001 -S nodejs -G nodejs

# Production deps only — no compile needed because node-sqlite3-wasm is pure JS+WASM
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs data/patterns.db ./data/patterns.db

USER nodejs

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "dist/http-server.js"]
