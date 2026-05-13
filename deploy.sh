#!/bin/bash

# Configuration
BRANCH="main"

echo "🚀 Starting VPS Deployment..."

# 1. Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin $BRANCH

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Build the project
echo "🏗️ Building the project..."
npm run build

# 4. Restart with PM2
echo "♻️ Restarting application with PM2..."
# If PM2 process already exists, restart it. Otherwise, start new.
pm2 restart dpdpa-guardian || pm2 start "npm run dev" --name dpdpa-guardian

echo "✅ Deployment Complete! App is running."
