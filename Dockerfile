# syntax=docker/dockerfile:1.7
# ----------------------------------------------------------------------------
# Multi-stage Dockerfile tuned for Next.js 14 `output: 'standalone'`.
# Used by Coolify (or any plain Docker host). Three stages so the final
# image only carries the runtime files — no node_modules from the build,
# no source code.
# ----------------------------------------------------------------------------

ARG NODE_VERSION=20-alpine

# 1. deps — install production-locked node_modules. Cached when package*.json
#    don't change, so most rebuilds skip straight to the build stage.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 2. builder — run `next build`. Standalone output lands at .next/standalone.
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Public env vars need to be present at build time so Next can inline them
# into the client bundle. Coolify forwards build-arg env vars when you tick
# "build-time" on the variable; the others stay as runtime-only secrets.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_BUNNY_LIBRARY_ID
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_R2_PUBLIC_URL
ARG NEXT_PUBLIC_SUPPORT_WHATSAPP
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_BUNNY_LIBRARY_ID=$NEXT_PUBLIC_BUNNY_LIBRARY_ID \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_R2_PUBLIC_URL=$NEXT_PUBLIC_R2_PUBLIC_URL \
    NEXT_PUBLIC_SUPPORT_WHATSAPP=$NEXT_PUBLIC_SUPPORT_WHATSAPP
RUN npm run build

# 3. runner — minimal production image. Standalone bundle includes only the
#    node_modules the server actually imports, so this layer stays tiny.
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root runtime user. Next standalone is happy with no extra perms.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Static assets + standalone server.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Coolify's container health-check uses HTTP probes; this also catches
# crash-on-boot before the proxy starts forwarding traffic.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/login" >/dev/null || exit 1

CMD ["node", "server.js"]
