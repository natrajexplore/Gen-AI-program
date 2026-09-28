# NetVerse Academy: one image serving the API and the built site on port 8000.
#   docker build -t netverse .
#   docker run -p 8000:8000 --env-file .env -v netverse-data:/app/backend/data netverse

# ---- 1. build the frontend
FROM node:24-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- 2. Python runtime
FROM python:3.11-slim
COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    STATIC_DIR=/app/frontend/dist

WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend/app ./app
COPY --from=web /web/dist /app/frontend/dist

# Drafts database lives in a volume; run as an unprivileged user.
RUN useradd --create-home netverse && mkdir -p /app/backend/data && chown netverse /app/backend/data
USER netverse
VOLUME /app/backend/data
EXPOSE 8000

# Behind a reverse proxy, set FORWARDED_ALLOW_IPS to the proxy's address so rate limits see real client IPs.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
