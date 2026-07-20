# TaskFlow Docker Deployment Guide

This project contains Docker configurations to support both **local development** and **production environments** for both Frontend (Vite + React) and Backend (Bun + Express) services.

---

## Local Development (with Live Reloading)

For local development, we use bind mounts to sync code changes instantly. This runs Vite's dev server and Bun's backend hot-reloader.

To build and start the development stack:

```bash
docker compose -f docker-compose.dev.yml up --build
```

- **Frontend Application**: `http://localhost:5173` (Hot Module Replacement active)
- **Backend API**: `http://localhost:5000` (Bun reload-on-save active)
- **MongoDB**: `http://localhost:27017`
- **Redis**: `http://localhost:6379`

### When to Rebuild in Dev?
- **Code Changes**: Do NOT rebuild. Saving files on your host machine will instantly sync to the container and trigger a hot reload.
- **Dependency Changes**: Rebuild is required whenever you add packages to `package.json` or update lockfiles. Run:
  ```bash
  docker compose -f docker-compose.dev.yml build --no-cache
  ```

---

## Production Deployment

For production, we use multi-stage builds. The Frontend is compiled to static assets and served by a high-performance Nginx server, and the Backend is bundled in production mode.

To build and run the production stack:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- **Frontend Application**: `http://localhost:3000` (Served via Nginx)
- **Backend API**: `http://localhost:5000` (Production environment)

---

## Structure of Docker Configuration

- **`docker-compose.dev.yml`**: Development orchestration mapping source volumes and running development Dockerfiles.
- **`docker-compose.prod.yml`**: Production orchestration using pre-built optimized image configurations.
- **`Frontend/Dockerfile.dev`**: Fast-build development container running Vite.
- **`Frontend/Dockerfile`**: Two-stage production build container serving through Nginx.
- **`Backend/Dockerfile.dev`**: Development container running Bun in watch mode.
- **`Backend/Dockerfile`**: Production container running backend using Bun in production mode.
- **`.dockerignore`**: Excludes dependencies (`node_modules`) and local build directories (`dist`) from the build context to speed up docker context sending.
