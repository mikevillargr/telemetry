# Docker Deployment Guide

## Local Development with Docker

### Prerequisites

- Docker Desktop installed
- Docker Compose installed

### Quick Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Services

The Docker Compose setup includes:

- **web**: Next.js frontend (port 3000)
- **api**: Express backend (port 3001)
- **db**: PostgreSQL 16 with pgvector (port 5432)
- **redis**: Redis 7 (port 6379)
- **nginx**: Reverse proxy (port 80)

### Environment Variables

Copy `.env.docker` and update with your values:

```bash
cp .env.docker .env
```

Required variables:
- `JWT_SECRET` - Secret key for JWT tokens
- `ENCRYPTION_KEY` - AES-256-GCM encryption key
- `ANTHROPIC_API_KEY` - Anthropic API key for Sulu AI

### Database Setup

The database is initialized automatically on first run. To run migrations:

```bash
# Access the API container
docker-compose exec api sh

# Run Prisma migrations
npx prisma db push

# Exit container
exit
```

### Accessing Services

- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **Nginx**: http://localhost (routes to web/api)

### Development Mode

For development with hot reload:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Production Deployment

### VPS Setup

1. **Clone repository**
```bash
git clone https://github.com/mikevillargr/telemetry.git
cd telemetry
```

2. **Configure environment**
```bash
cp .env.docker .env
nano .env
```

Update with production values:
- Generate secure `JWT_SECRET`: `openssl rand -base64 32`
- Generate secure `ENCRYPTION_KEY`: `openssl rand -base64 32`
- Add your `ANTHROPIC_API_KEY`

3. **Start services**
```bash
docker-compose up -d
```

4. **Run database migrations**
```bash
docker-compose exec api npx prisma db push
```

5. **Check logs**
```bash
docker-compose logs -f
```

### SSL/HTTPS Setup

For production, configure SSL with Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone -d your-domain.com

# Update nginx.conf to use SSL
```

### Backup Strategy

**Database Backup**:
```bash
# Backup database
docker-compose exec db pg_dump -U grbi_user grbi > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T db psql -U grbi_user grbi
```

**Volume Backup**:
```bash
# Backup volumes
docker run --rm -v telemetry_pgdata:/data -v $(pwd):/backup alpine tar czf /backup/pgdata-backup.tar.gz /data

# Restore volumes
docker run --rm -v telemetry_pgdata:/data -v $(pwd):/backup alpine tar xzf /backup/pgdata-backup.tar.gz -C /
```

### Monitoring

**View logs**:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f api
```

**Check service status**:
```bash
docker-compose ps
```

**Resource usage**:
```bash
docker stats
```

### Troubleshooting

**Service won't start**:
```bash
# Check logs
docker-compose logs service-name

# Rebuild and restart
docker-compose up -d --build service-name
```

**Database connection issues**:
```bash
# Check if database is ready
docker-compose exec db pg_isready -U grbi_user

# Restart database
docker-compose restart db
```

**Port conflicts**:
```bash
# Check what's using ports
lsof -i :3000
lsof -i :3001
lsof -i :5432
lsof -i :6379
```

**Clear everything and start fresh**:
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

### Updating

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run migrations if needed
docker-compose exec api npx prisma db push
```

### Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Update regularly** - Keep dependencies updated
4. **Monitor logs** - Watch for suspicious activity
5. **Backup frequently** - Regular database and volume backups
6. **Use HTTPS** - SSL certificates in production
7. **Limit access** - Firewall rules, VPN for admin access

## Architecture

```
┌─────────────┐
│   Nginx     │ (Port 80)
│  (Proxy)    │
└──────┬──────┘
       │
   ┌───┴────────┐
   │            │
┌──▼──┐    ┌───▼────┐
│ Web │    │  API   │
│3000 │    │  3001  │
└──┬──┘    └───┬────┘
   │            │
   └────┬───────┘
        │
   ┌────┴──────────┐
   │               │
┌──▼──┐        ┌──▼────┐
│ DB  │        │ Redis │
│5432 │        │ 6379  │
└─────┘        └───────┘
```

## Support

For issues:
- Check logs: `docker-compose logs -f`
- Review this guide
- Open issue on GitHub
