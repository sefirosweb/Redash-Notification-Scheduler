# ── Stage 1: Build React frontend ──────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Runtime (Python + Nginx + Supervisor) ─────────────────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Backend
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
RUN mkdir -p /app/data

# Frontend static files
COPY --from=frontend-builder /app/dist /var/www/html

# Nginx: replace default site with single-container config
RUN rm -f /etc/nginx/sites-enabled/default
COPY docker/nginx-single.conf /etc/nginx/conf.d/default.conf

# Nginx: redirect logs to stdout/stderr
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
 && ln -sf /dev/stderr /var/log/nginx/error.log

# Supervisor config
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

VOLUME ["/app/data"]
EXPOSE 80

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
