# GitHub Secrets Configuration

This document lists all GitHub Secrets required for automated deployment to VPS.

## Required GitHub Secrets

Go to: **Settings → Secrets and variables → Actions → New repository secret**

### Application Secrets

| Secret Name | Description | How to Generate |
|-------------|-------------|-----------------|
| `JWT_SECRET` | Secret key for JWT token authentication | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | AES-256-GCM encryption key for sensitive data | `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Anthropic API key for Sulu AI | Get from https://console.anthropic.com/ |

### Database Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@host:5432/telemetry` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |

### VPS Deployment Secrets

| Secret Name | Description | How to Generate |
|-------------|-------------|-----------------|
| `VPS_HOST` | VPS IP address or hostname | Your VPS IP (e.g., `123.45.67.89`) |
| `VPS_USER` | SSH username for VPS | Usually `root` or your username |
| `VPS_SSH_KEY` | Private SSH key for VPS access | Copy from `~/.ssh/id_rsa` |
| `VPS_SSH_PORT` | SSH port (default 22) | Usually `22` |

## Setting Up SSH Key for VPS

### 1. Generate SSH Key Pair (if you don't have one)

```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key
```

### 2. Add Public Key to VPS

```bash
# Copy public key
cat ~/.ssh/github_actions_key.pub

# Add to VPS authorized_keys
ssh user@your-vps-ip "mkdir -p ~/.ssh && echo 'PUBLIC_KEY_HERE' >> ~/.ssh/authorized_keys"
```

### 3. Add Private Key to GitHub Secrets

```bash
# Copy private key
cat ~/.ssh/github_actions_key

# Paste into GitHub Secret: VPS_SSH_KEY
```

**Important:** Include the entire private key including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines.

## Setting Up VPS

### 1. Update System

```bash
ssh root@your-vps-ip
apt update && apt upgrade -y
```

### 2. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker $USER
```

### 3. Create Project Directory

```bash
mkdir -p /root/telemetry
cd /root/telemetry
```

## Testing SSH Connection

```bash
# Test SSH connection from local machine
ssh -i ~/.ssh/github_actions_key root@your-vps-ip "echo 'SSH connection successful'"
```

## Security Best Practices

1. **Never commit secrets** - Always use GitHub Secrets
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Rotate secrets regularly** - Every 90 days
4. **Limit access** - Only grant necessary permissions
5. **Monitor usage** - Check GitHub Actions logs regularly
6. **Use SSH keys** - Never use passwords for automation

## Troubleshooting

### SSH Connection Issues

```bash
# Test SSH connection
ssh -i ~/.ssh/github_actions_key -v root@your-vps-ip

# Check authorized_keys on VPS
ssh root@your-vps-ip "cat ~/.ssh/authorized_keys"
```

### Docker Issues on VPS

```bash
# Check Docker is running
ssh root@your-vps-ip "docker ps"

# Check Docker logs
ssh root@your-vps-ip "docker-compose logs -f"
```

### GitHub Actions Issues

- Check workflow logs in Actions tab
- Verify all secrets are set correctly
- Ensure SSH key has correct permissions (600)
- Check VPS firewall allows SSH access
