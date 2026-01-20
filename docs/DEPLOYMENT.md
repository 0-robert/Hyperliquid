# HyperGate Deployment Guide

This guide covers deploying the HyperGate backend server with PostgreSQL and Redis.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 20+ (for local development/building)
- Access to a Hyperliquid RPC endpoint

## Quick Start (Docker Compose)

### 1. Configure Environment

```bash
# Copy the production environment template
cp .env.production.example .env.production

# Edit with your secure credentials
nano .env.production
```

**Required variables:**
- `POSTGRES_PASSWORD` - Strong password for PostgreSQL
- `REDIS_PASSWORD` - Strong password for Redis
- `HYPERLIQUID_RPC_URL` - RPC endpoint (e.g., `https://api.hyperliquid.xyz/evm`)
- `CORS_ORIGINS` - Your frontend domain(s)

### 2. Start Services

```bash
# Start all services (PostgreSQL, Redis, Server)
docker compose --env-file .env.production up -d

# View logs
docker compose logs -f

# Check health
curl http://localhost:3001/health
```

### 3. Run Database Migrations

```bash
# First time only - run Prisma migrations
docker compose exec server npx prisma migrate deploy
```

## Production Deployment Options

### Option A: Docker Compose (Single Server)

Good for small to medium deployments. All services run on one server.

```bash
# Production deployment
docker compose --env-file .env.production up -d --build
```

### Option B: Managed Services

For production, consider using managed database services:

**PostgreSQL:**
- [Neon](https://neon.tech) - Serverless Postgres (free tier available)
- [Supabase](https://supabase.com) - Postgres with extras
- [Railway](https://railway.app) - Simple deployments
- AWS RDS / Google Cloud SQL / Azure Database

**Redis:**
- [Upstash](https://upstash.com) - Serverless Redis (free tier available)
- [Redis Cloud](https://redis.com/cloud) - Managed Redis
- AWS ElastiCache / Google Memorystore

With managed services, update your `.env.production`:

```bash
DATABASE_URL=postgresql://user:password@your-postgres-host.com:5432/hypergate
REDIS_URL=redis://:password@your-redis-host.com:6379
```

### Option C: Cloud Platforms

**Railway:**
1. Connect your GitHub repo
2. Add PostgreSQL and Redis plugins
3. Set environment variables
4. Deploy

**Render:**
1. Create a new Web Service
2. Add PostgreSQL and Redis
3. Set environment variables
4. Deploy from GitHub

**Fly.io:**
```bash
# Install flyctl
fly launch
fly postgres create
fly redis create
fly secrets set DATABASE_URL=... REDIS_URL=...
fly deploy
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   HyperGate     │
│   (React App)   │     │   API Server    │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │PostgreSQL│  │  Redis   │  │Hyperliquid│
            │(Deposits)│  │(RateLim) │  │  (RPC)   │
            └──────────┘  └──────────┘  └──────────┘
```

## Health Checks

The server exposes health check endpoints:

- `GET /health` - Full health status (database, Redis, blockchain)
- `GET /health/live` - Liveness probe (is the server running?)
- `GET /health/ready` - Readiness probe (can it handle traffic?)

Example response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "uptime": 3600,
    "services": {
      "database": "connected",
      "redis": "connected",
      "blockchain": "connected"
    }
  }
}
```

## Scaling Considerations

### Horizontal Scaling

The server is stateless and can be horizontally scaled:

1. Run multiple server instances behind a load balancer
2. All instances share the same PostgreSQL and Redis
3. Redis handles distributed rate limiting

### Database

- Enable connection pooling (PgBouncer) for many concurrent connections
- Set up read replicas for high read traffic
- Regular backups (automated with managed services)

### Redis

- Use Redis Cluster for high availability
- Configure persistence (AOF) for data durability
- Monitor memory usage

## Security Checklist

- [ ] Use strong, unique passwords for PostgreSQL and Redis
- [ ] Enable SSL/TLS for database connections in production
- [ ] Set restrictive CORS_ORIGINS (not `*`)
- [ ] Use HTTPS for the API endpoint (via reverse proxy/load balancer)
- [ ] Keep Docker images updated
- [ ] Never commit `.env.production` to git
- [ ] Set up rate limiting (enabled by default with Redis)
- [ ] Monitor logs for suspicious activity

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker compose ps postgres

# Check logs
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U hypergate -d hypergate -c "SELECT 1"
```

### Redis Connection Failed

```bash
# Check Redis is running
docker compose ps redis

# Test connection
docker compose exec redis redis-cli -a $REDIS_PASSWORD ping
```

### Server Won't Start

```bash
# Check server logs
docker compose logs server

# Rebuild the image
docker compose build --no-cache server
```

### Migrations Failed

```bash
# Run migrations manually
docker compose exec server npx prisma migrate deploy

# Reset database (WARNING: data loss)
docker compose exec server npx prisma migrate reset
```

## Monitoring

Consider adding:

- **Prometheus + Grafana** for metrics
- **ELK Stack** or **Loki** for log aggregation
- **Sentry** for error tracking

## Backup & Recovery

### PostgreSQL Backup

```bash
# Create backup
docker compose exec postgres pg_dump -U hypergate hypergate > backup.sql

# Restore
docker compose exec -T postgres psql -U hypergate hypergate < backup.sql
```

### Redis Backup

Redis with AOF persistence stores data in `/data`. Back up this volume:

```bash
docker compose exec redis redis-cli -a $REDIS_PASSWORD BGSAVE
```
