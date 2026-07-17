# Use the official lightweight Bun Alpine image
FROM oven/bun:alpine

WORKDIR /app

# Copy dependency specifications first to leverage Docker layer caching
COPY package.json bun.lock ./

# Install production dependencies only (supports fast and lightweight images)
RUN bun install --production --frozen-lockfile

# Copy the source code
COPY . .

# Expose port 5000 (default port defined in server.js)
EXPOSE 5000

# Define default environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Run the backend server using Bun
CMD ["bun", "src/server.js"]
