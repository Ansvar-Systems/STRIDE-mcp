# STRIDE Patterns MCP Server
# Multi-stage build for Docker deployment
#
# Build: docker build -t stride-patterns-mcp .
# Run:   docker run -p 3000:3000 stride-patterns-mcp
#
# For a specific platform: docker buildx build --platform linux/amd64 -t stride-patterns-mcp .

# Build stage
FROM node:22-alpine AS builder

# Install build tools for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install build tools for native modules (better-sqlite3 needs rebuild)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only (better-sqlite3 is compiled here)
RUN npm ci --omit=dev && \
    npm cache clean --force

# Clean up build tools (native modules already compiled)
RUN apk del python3 make g++

# Security: create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Copy pre-built database
COPY data/patterns.db ./data/patterns.db

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start HTTP server (for Docker deployment)
CMD ["node", "dist/http-server.js"]
