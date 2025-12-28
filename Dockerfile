# Multi-stage build for React + FastAPI application

# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

ARG VITE_LOGIN_URL=
ENV VITE_LOGIN_URL=${VITE_LOGIN_URL}

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Python backend with built frontend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies and uv
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh

# Add uv to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy backend code
COPY backend/ ./backend/

# Install Python dependencies
WORKDIR /app/backend
RUN uv sync --no-dev

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist /app/frontend/

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Set environment variables
ENV DATA_DIR=/app/data
ENV STATIC_DIR=/app/frontend

EXPOSE 8000

VOLUME /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/tasks || exit 1

WORKDIR /app/backend

# Start the application
CMD ["uv", "run", "--no-dev", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
