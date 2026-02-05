# Build stage
FROM node:20.11.1-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY turbo.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Install dependencies
RUN npm ci --workspace=@imagenix/backend --workspace=@imagenix/shared-types

# Copy source code
COPY apps/backend ./apps/backend
COPY packages/shared-types ./packages/shared-types

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

# Build
RUN npm run build --workspace=@imagenix/shared-types
RUN npm run build --workspace=@imagenix/backend

# Production stage
FROM node:20.11.1-alpine AS production

WORKDIR /app

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# Set environment
ENV NODE_ENV=production

WORKDIR /app/apps/backend

# Expose port
EXPOSE 3001

# Start command
CMD ["node", "dist/main.js"]
