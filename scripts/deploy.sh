#!/bin/bash

# Deploy Script - Run this locally to deploy to VPS
# Usage: ./scripts/deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
VPS_HOST=${VPS_HOST:-"your-vps-ip"}
VPS_USER=${VPS_USER:-"root"}
VPS_SSH_PORT=${VPS_SSH_PORT:-"22"}
VPS_PATH="/root/telemetry"

echo "=== Deploying Telemetry to VPS ==="
echo "Environment: $ENVIRONMENT"
echo "VPS: $VPS_USER@$VPS_HOST:$VPS_SSH_PORT"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found"
    echo "Please create .env file with your environment variables"
    exit 1
fi

# Create .env file on VPS
echo "Creating .env file on VPS..."
ssh -p $VPS_SSH_PORT $VPS_USER@$VPS_HOST << ENDSSH
    mkdir -p $VPS_PATH
    cd $VPS_PATH
    
    cat > .env << 'ENVEOF'
$(cat .env)
ENVEOF
ENDSSH

# Deploy code to VPS
echo "Deploying code to VPS..."
ssh -p $VPS_SSH_PORT $VPS_USER@$VPS_HOST << ENDSSH
    cd $VPS_PATH
    
    # Clone or pull repository
    if [ ! -d ".git" ]; then
        git clone https://github.com/mikevillargr/telemetry.git .
    else
        git fetch origin
        git reset --hard origin/main
        git clean -fd
    fi
ENDSSH

# Build and start Docker containers
echo "Building and starting Docker containers..."
ssh -p $VPS_SSH_PORT $VPS_USER@$VPS_HOST << ENDSSH
    cd $VPS_PATH
    
    # Stop existing containers
    docker-compose down || true
    
    # Remove old images
    docker system prune -f
    
    # Build and start new containers
    docker-compose up -d --build
ENDSSH

# Wait for containers to start
echo "Waiting for containers to start..."
sleep 15

# Run database migrations
echo "Running database migrations..."
ssh -p $VPS_SSH_PORT $VPS_USER@$VPS_HOST << ENDSSH
    cd $VPS_PATH
    docker-compose exec -T api npx prisma db push
ENDSSH

# Verify deployment
echo "Verifying deployment..."
ssh -p $VPS_SSH_PORT $VPS_USER@$VPS_HOST << ENDSSH
    cd $VPS_PATH
    
    echo "=== Container Status ==="
    docker-compose ps
    
    echo ""
    echo "=== API Logs (last 10 lines) ==="
    docker-compose logs --tail=10 api
    
    echo ""
    echo "=== Web Logs (last 10 lines) ==="
    docker-compose logs --tail=10 web
ENDSSH

echo ""
echo "=== Deployment Complete ==="
echo "Web: http://$VPS_HOST:3000"
echo "API: http://$VPS_HOST:3001"
echo ""
