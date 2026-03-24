# VPS Deployment Guide

This guide covers deploying Telemetry to a VPS using automated GitHub Actions or manual deployment scripts.

## Prerequisites

- VPS with Ubuntu 20.04+ or Debian 11+
- GitHub repository access
- SSH access to VPS
- Docker and Docker Compose installed on VPS

## Quick Start

### Option 1: Automated Deployment (GitHub Actions)

1. **Set up GitHub Secrets** (see [GITHUB_SECRETS.md](./GITHUB_SECRETS.md))
2. **Go to Actions tab** → "Deploy to VPS" → "Run workflow"
3. **Select environment** (production/staging)
4. **Click "Run workflow"**

### Option 2: Manual Deployment

1. **Set up VPS** (run setup script on VPS)
2. **Run deploy script** (run locally)

## Detailed Setup

### Step 1: Set Up VPS

SSH into your VPS and run the setup script:

```bash
# Upload setup script to VPS
scp scripts/vps-setup.sh root@your-vps-ip:/root/

# SSH into VPS
ssh root@your-vps-ip

# Run setup script
chmod +x /root/vps-setup.sh
./vps-setup.sh
```

The setup script will:
- Update system packages
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Install fail2ban for security
- Create project directory

### Step 2: Configure GitHub Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP address |
| `VPS_USER` | SSH username (usually `root`) |
| `VPS_SSH_KEY` | Your SSH private key |
| `VPS_SSH_PORT` | SSH port (default `22`) |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Generate: `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |

### Step 3: Set Up SSH Key

Generate SSH key pair for GitHub Actions:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key

# Copy public key
cat ~/.ssh/github_actions_key.pub

# Add to VPS authorized_keys
ssh root@your-vps-ip "mkdir -p ~/.ssh && echo 'PUBLIC_KEY_HERE' >> ~/.ssh/authorized_keys"

# Copy private key to GitHub Secrets
cat ~/.ssh/github_actions_key
```

### Step 4: Deploy

#### Using GitHub Actions (Recommended)

1. Go to **Actions** tab
2. Select **"Deploy to VPS"** workflow
3. Click **"Run workflow"**
4. Select environment (production/staging)
5. Click **"Run workflow"**

The workflow will:
- Create `.env` file on VPS
- Pull latest code
- Build Docker images
- Start containers
- Run database migrations
- Verify deployment

#### Using Manual Script

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Set environment variables
export VPS_HOST="your-vps-ip"
export VPS_USER="root"
export VPS_SSH_PORT="22"

# Run deploy script
./scripts/deploy.sh production
```

## Deployment Workflow

### GitHub Actions Workflow

The `.github/workflows/deploy.yml` workflow:

1. **Triggers:**
   - Manual dispatch (Actions tab)
   - Push to main branch

2. **Steps:**
   - Checkout code
   - Setup SSH connection
   - Create `.env` file on VPS
   - Pull latest code
   - Build Docker images
   - Start containers
   - Run database migrations
   - Verify deployment
   - Health checks

### Manual Deployment Script

The `scripts/deploy.sh` script:

1. Checks for `.env` file
2. Creates `.env` on VPS
3. Clones/pulls repository
4. Builds Docker images
5. Starts containers
6. Runs migrations
7. Verifies deployment

## Post-Deployment

### Verify Services

```bash
# Check container status
ssh root@your-vps-ip "cd /root/telemetry && docker-compose ps"

# Check logs
ssh root@your-vps-ip "cd /root/telemetry && docker-compose logs -f"

# Test API
curl http://your-vps-ip:3001/health

# Test Web
curl http://your-vps-ip:3000
```

### Configure Domain (Optional)

1. **Point domain to VPS IP** in DNS settings
2. **Configure SSL** with Let's Encrypt:

```bash
ssh root@your-vps-ip

# Install certbot
apt install certbot python3-certbot-nginx

# Generate certificate
certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

3. **Update nginx.conf** to use SSL

## Monitoring

### View Logs

```bash
# All services
ssh root@your-vps-ip "cd /root/telemetry && docker-compose logs -f"

# Specific service
ssh root@your-vps-ip "cd /root/telemetry && docker-compose logs -f api"
ssh root@your-vps-ip "cd /root/telemetry && docker-compose logs -f web"
```

### Check Resource Usage

```bash
# Container stats
ssh root@your-vps-ip "cd /root/telemetry && docker stats"

# Disk usage
ssh root@your-vps-ip "df -h"

# Memory usage
ssh root@your-vps-ip "free -h"
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
ssh root@your-vps-ip "cd /root/telemetry && docker-compose logs api"

# Restart containers
ssh root@your-vps-ip "cd /root/telemetry && docker-compose restart"

# Rebuild and restart
ssh root@your-vps-ip "cd /root/telemetry && docker-compose up -d --build"
```

### Database Connection Issues

```bash
# Check database is running
ssh root@your-vps-ip "cd /root/telemetry && docker-compose ps db"

# Check database logs
ssh root@your-vps-ip "cd /root/telemetry && docker-compose logs db"

# Re-run migrations
ssh root@your-vps-ip "cd /root/telemetry && docker-compose exec api npx prisma db push"
```

### SSH Connection Issues

```bash
# Test SSH connection
ssh -v root@your-vps-ip

# Check authorized_keys
ssh root@your-vps-ip "cat ~/.ssh/authorized_keys"

# Check SSH service
ssh root@your-vps-ip "systemctl status ssh"
```

## Security

### Firewall Rules

```bash
# Check firewall status
ssh root@your-vps-ip "ufw status"

# Allow additional ports
ssh root@your-vps-ip "ufw allow 3000/tcp"
ssh root@your-vps-ip "ufw allow 3001/tcp"
```

### Fail2Ban Status

```bash
# Check fail2ban status
ssh root@your-vps-ip "fail2ban-client status"

# Check banned IPs
ssh root@your-vps-ip "fail2ban-client status sshd"
```

### Backup Strategy

```bash
# Backup database
ssh root@your-vps-ip "cd /root/telemetry && docker-compose exec db pg_dump -U grbi_user grbi > backup.sql"

# Backup volumes
ssh root@your-vps-ip "docker run --rm -v telemetry_pgdata:/data -v /root/backups:/backup alpine tar czf /backup/pgdata-backup.tar.gz /data"
```

## Updates

### Update Application

```bash
# Using GitHub Actions
# Just run the workflow again

# Using manual script
./scripts/deploy.sh production
```

### Update System

```bash
ssh root@your-vps-ip
apt update && apt upgrade -y
```

## Rollback

```bash
# Rollback to previous commit
ssh root@your-vps-ip << 'ENDSSH'
    cd /root/telemetry
    git log --oneline -10
    git reset --hard <commit-hash>
    docker-compose up -d --build
ENDSSH
```

## Support

For issues:
- Check GitHub Actions logs
- Check VPS logs: `docker-compose logs -f`
- Review this guide
- Open issue on GitHub
