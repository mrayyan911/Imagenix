# Build stage
FROM node:20.11.1-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY turbo.json ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies
RUN npm ci --workspace=@imagenix/frontend

# Copy source code
COPY apps/frontend ./apps/frontend

# Build arguments for environment
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

# Build
RUN npm run build --workspace=@imagenix/frontend

# Production stage
FROM node:20.11.1-alpine AS production

WORKDIR /app

# Copy production files
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

# Set environment
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

# Expose port
EXPOSE 3000

# Start command
CMD ["node", "apps/frontend/server.js"]
