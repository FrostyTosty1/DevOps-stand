# ---------- Build stage: compile React app ----------
FROM node:20-alpine AS build

WORKDIR /app
# Cache deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then npm i -g pnpm && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm i; fi

# Copy sources and build
COPY . .
# Vite builds into /app/dist by default
RUN npm run build

# ---------- Runtime stage: Nginx to serve static ----------
FROM nginx:1.27-alpine AS runtime

# Copy our nginx config (adds /api proxy to backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Copy built static files
COPY --from=build /app/dist /usr/share/nginx/html

# Expose 80 (we’ll map to 5173 outside)
EXPOSE 80

# Healthcheck: static index should be served
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

# Nginx is the entrypoint in this image
