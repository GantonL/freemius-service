# ── Stage 1: Cache dependencies ──────────────────────────────────────────────
FROM denoland/deno:2.2.2 AS deps

WORKDIR /app

# Copy only the manifest first to cache the dependency download layer
COPY deno.json ./

# Pre-cache all remote imports
RUN deno install --entrypoint src/main.ts || true

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM denoland/deno:2.2.2

WORKDIR /app

# Copy pre-cached deps from previous stage
COPY --from=deps /root/.cache/deno /root/.cache/deno

# Copy source
COPY . .

# Pre-compile for faster startup
RUN deno cache src/main.ts

# Railway / Docker sets PORT at runtime
ENV PORT=8000
EXPOSE 8000

# Run as non-root for security
USER deno

CMD ["run", "--allow-net", "--allow-env", "--allow-read", "src/main.ts"]
