#!/bin/bash

# Deploy script for backend updates
SERVER="root@89.22.237.148"
PASSWORD="QcFrlePEIlT7"
REMOTE_PATH="/root/freezer-backend"

echo "🚀 Deploying backend updates..."

# Copy updated pair.ts to server
echo "📤 Copying updated files to server..."
scp -o StrictHostKeyChecking=no src/routes/pair.ts ${SERVER}:${REMOTE_PATH}/src/routes/

# Restart Docker container
echo "🔄 Restarting backend container..."
ssh -o StrictHostKeyChecking=no ${SERVER} << 'EOF'
cd /root/freezer-backend
docker-compose restart backend
echo "✅ Backend restarted"
docker-compose ps
EOF

echo "✅ Deployment complete!"
