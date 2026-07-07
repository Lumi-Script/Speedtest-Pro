# Use node:alpine as it's the smallest image for Node.js
FROM node:24-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# To optimize Docker layer caching, we move the heavy node_modules directory 
# out of the standalone output. This allows us to copy it as a separate layer 
# in the runner stage, preventing Docker from repulling a 50MB+ layer every time 
# your application code changes.
RUN mv .next/standalone/node_modules .next/standalone_node_modules

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public folder (needed for static assets like icon.svg)
COPY --from=builder /app/public ./public

# Copy the standalone node_modules as a distinct layer.
# This layer rarely changes and will remain cached unless you install new dependencies.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone_node_modules ./node_modules

# Copy the rest of the standalone output (application code and server.js).
# Because node_modules was moved, this layer is now extremely lightweight (< 5MB)
# and is the only layer that will need to be repulled when you change your code.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (also lightweight)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
