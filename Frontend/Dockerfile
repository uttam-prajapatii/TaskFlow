# ==========================================
# Stage 1: Build the React application
# ==========================================
FROM oven/bun:alpine AS builder

WORKDIR /app

# Copy lockfile and package config first to leverage Docker layer caching
COPY package.json bun.lock ./

# Install dependencies using Bun
RUN bun install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Run build script (produces optimized build inside /app/dist)
RUN bun run build

# ==========================================
# Stage 2: Serve using high-performance Nginx
# ==========================================
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy build output from Stage 1 to Nginx HTML root directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Overwrite default Nginx server configuration with our custom setup
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
