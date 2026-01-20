# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++

# Copy server package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy server source code
COPY . ./

# Generate Prisma client and build
RUN npx prisma generate && npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy Prisma generated client to where the compiled code expects it
COPY --from=builder /app/src/generated ./dist/generated

# Copy Prisma schema for migrations
COPY --from=builder /app/prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hypergate -u 1001 -G nodejs

USER hypergate

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost:3001/health/live || exit 1

# Start the application
CMD ["node", "dist/index.js"]
