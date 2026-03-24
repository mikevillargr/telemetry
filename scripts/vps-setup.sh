#!/bin/bash

# VPS Setup Script
# Run this on your VPS to prepare it for deployment

set -e

echo "=== VPS Setup Script for Telemetry ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root"
    exit 1
fi

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
echo "Installing required packages..."
apt install -y curl git ufw fail2ban

# Install Docker
echo "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $USER
else
    echo "Docker is already installed"
fi

# Install Docker Compose
echo "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose is already installed"
fi

# Configure firewall
echo "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configure fail2ban
echo "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl start fail2ban

# Create project directory
echo "Creating project directory..."
mkdir -p /root/telemetry
cd /root/telemetry

# Set up Git
echo "Setting up Git..."
git config --global user.name "Telemetry Deploy"
git config --global user.email "deploy@telemetry.local"

# Create .env file template
echo "Creating .env template..."
cat > .env.template << 'EOF'
# JWT Configuration
JWT_SECRET=
JWT_EXPIRES_IN=7d

# Encryption Key
ENCRYPTION_KEY=

# Anthropic API Key
ANTHROPIC_API_KEY=

# Database
DATABASE_URL=

# Redis
REDIS_URL=

# App
API_PORT=3001
NODE_ENV=production
EOF

echo ""
echo "=== VPS Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Clone the repository: git clone https://github.com/mikevillargr/telemetry.git"
echo "2. Copy .env.template to .env and fill in the values"
echo "3. Run: docker-compose up -d"
echo "4. Run: docker-compose exec api npx prisma db push"
echo ""
echo "Security features enabled:"
echo "- UFW firewall configured"
echo "- Fail2ban installed and configured"
echo "- Docker and Docker Compose installed"
echo ""
