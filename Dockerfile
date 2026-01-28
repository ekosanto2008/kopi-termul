FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Hardcoded Environment Variables to bypass Build Argument Issues
ENV NEXT_PUBLIC_SUPABASE_URL="https://xzgmzviakdwkzpxdrvzr.supabase.co"
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Z216dmlha2R3a3pweGRydnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjQ0MDcsImV4cCI6MjA4NDkwMDQwN30.mxw6w3CvSgNxnz2i1K1X0DHCk2J-tj6DSA_ItMfuyjc"
ENV NEXT_PUBLIC_BASE_URL="https://kopi-termul-production.up.railway.app"

# For Midtrans, replace these placeholders with real keys before pushing, or rely on Dashboard Variables (might fail if ARG issue persists)
ARG MIDTRANS_IS_PRODUCTION
ARG NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
ENV MIDTRANS_IS_PRODUCTION=${MIDTRANS_IS_PRODUCTION:-false}
ENV NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=${NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}

# Disable telemetry during build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
