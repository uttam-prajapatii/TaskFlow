# 🚀 TaskFlow Development & Deployment Guide

A modern containerized workspace for TaskFlow featuring a React (Vite) Frontend and Bun (Express) Backend, integrated with MongoDB and Redis.

---

## 🛠️ Getting Started

### 1. Set Up Environment Variables

Before running the project, create your environment configuration files:

- **Docker (Root)**: Copy the root template to `.env`:
  ```bash
  cp .env.example .env
  ```
- **Local Backend (Backend)**: Copy the backend local template to `Backend/.env`:
  ```bash
  cp Backend/.env.example Backend/.env
  ```

### 2. Run the Stack (Docker Compose)

Start the entire local development stack (Frontend, Backend, Database, Cache) with live reloading active:

```bash
docker compose -f docker-compose.dev.yml up --build
```

> [!TIP]
> If you have recently changed dependencies in `package.json`, use the `-V` / `--renew-anon-volumes` flag to clear the package cache inside the container:
> `docker compose -f docker-compose.dev.yml up --build -V`

- **Frontend UI**: `http://localhost:5173` (Hot Module Replacement active)
- **Backend API**: `http://localhost:   ` (Watch mode active)
- **MongoDB**: `localhost:27017`
- **Redis**: `localhost:6379`

---

## 📋 Useful Commands

### Viewing Logs

View real-time logs for all running containers or target the backend logs specifically:

```bash
# Follow logs for all services
docker compose -f docker-compose.dev.yml logs -f

# Follow logs specifically for the backend service
docker compose -f docker-compose.dev.yml logs -f backend
```

### Local Dev Rebuilds

If you modify dependencies inside `package.json`, you must force-rebuild the containers to load the changes:

```bash
docker compose -f docker-compose.dev.yml build --no-cache
```

### Stopping the Stack

```bash
# Stop and retain volumes
docker compose -f docker-compose.dev.yml down

# Stop and wipe database/cache volumes
docker compose -f docker-compose.dev.yml down -v
```

---

## ⚙️ Environment Variables Reference

| Variable Name        | Default Value                      | Description                                                 |
| :------------------- | :--------------------------------- | :---------------------------------------------------------- |
| `NODE_ENV`           | `development`                      | Target run environment (`development`, `production`).       |
| `BACKEND_PORT`       | `5000`                             | Port bound to the host for the backend service.             |
| `FRONTEND_DEV_PORT`  | `5173`                             | Port bound to the host for Frontend React app in dev mode.  |
| `FRONTEND_PROD_PORT` | `3000`                             | Port bound to the host for Frontend React app in prod mode. |
| `MONGO_URI`          | `mongodb://mongodb:27017/taskflow` | Database connection connection URI.                         |
| `REDIS_URL`          | `redis://redis:6379`               | Cache connection URI.                                       |
| `VITE_API_URL`       | `http://localhost:5000`            | Target endpoint for frontend client requests.               |

---

## 🏗️ Project Structure

- **`docker-compose.dev.yml`**: Dev orchestration using volume binds for live reloading.
- **`docker-compose.prod.yml`**: Production orchestration using optimized multi-stage images.
- **`Backend/`**: Express API service running on Bun.
  - `src/utils/logger.js`: Winston log manager (outputs to `logs/combined.log` & `logs/error.log`).
  - `src/utils/errors.js`: Custom `AppError` subclasses.
  - `src/middlewares/`: Unified error logging and HTTP request trackers.
- **`Frontend/`**: React application built on Vite.
