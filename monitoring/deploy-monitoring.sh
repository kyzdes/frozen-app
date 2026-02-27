#!/bin/bash

SERVER="${SERVER:-root@<monitoring-host>}"
REMOTE_PATH="/root/monitoring"

echo "🚀 Deploying monitoring stack to server..."

# 1. Create directory on server
echo "📁 Creating monitoring directory..."
ssh -o StrictHostKeyChecking=accept-new ${SERVER} "mkdir -p ${REMOTE_PATH}"

# 2. Copy all files to server
echo "📤 Copying configuration files..."
scp -r -o StrictHostKeyChecking=accept-new . ${SERVER}:${REMOTE_PATH}/

# 3. Set up Nginx configuration
echo "🔧 Setting up Nginx..."
ssh -o StrictHostKeyChecking=accept-new ${SERVER} << 'EOF'
# Copy Nginx config
cp /root/monitoring/nginx-monitor.conf /etc/nginx/sites-available/monitor
ln -sf /etc/nginx/sites-available/monitor /etc/nginx/sites-enabled/

# Get SSL certificate for monitor subdomain
certbot certonly --nginx -d monitor.moone.dev --non-interactive --agree-tos --email admin@moone.dev || echo "SSL cert already exists or failed"

# Test and reload Nginx
nginx -t && systemctl reload nginx
EOF

# 4. Start monitoring stack
echo "🐳 Starting monitoring containers..."
ssh -o StrictHostKeyChecking=accept-new ${SERVER} << 'EOF'
cd /root/monitoring
docker compose up -d

echo "⏳ Waiting for services to start..."
sleep 15

echo "📊 Checking container status..."
docker compose ps

echo ""
echo "✅ Monitoring deployment complete!"
echo ""
echo "🌐 Access Grafana at: https://monitor.moone.dev"
echo "👤 Username: admin"
echo "🔑 Password: (check .env file)"
EOF

echo ""
echo "🎉 All done! Monitoring is ready."
