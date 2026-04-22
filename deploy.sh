#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# DXC Intelligent Analytics — One-Click Deploy Script
# Run this on the Oracle Cloud VM after cloning the repo.
# ═══════════════════════════════════════════════════════════════
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║  DXC Intelligent Analytics — Deploy          ║"
echo "╚══════════════════════════════════════════════╝"

# ── Check prerequisites ──────────────────────────────────────
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed. Run: sudo apt install docker.io docker-compose-plugin"; exit 1; }
command -v docker compose >/dev/null 2>&1 || { echo "❌ Docker Compose plugin not found."; exit 1; }

# ── Check env file ───────────────────────────────────────────
if [ ! -f .env.prod ]; then
  echo "⚠️  No .env.prod found. Creating from template..."
  cp .env.production .env.prod
  echo ""
  echo "📝 EDIT .env.prod with your real values:"
  echo "   - POSTGRES_PASSWORD (strong random password)"
  echo "   - DATABASE_URL (must match the password above)"
  echo "   - GROQ_API_KEY (from console.groq.com)"
  echo "   - CLOUDFLARE_TUNNEL_TOKEN (from Cloudflare Zero Trust)"
  echo ""
  echo "Then run this script again."
  exit 1
fi

# ── Also ensure backend/.env exists with GROQ key ────────────
if [ ! -f backend/.env ]; then
  echo "Creating backend/.env from .env.prod..."
  grep "GROQ_API_KEY" .env.prod > backend/.env
fi

# ── Build and deploy ─────────────────────────────────────────
echo ""
echo "🔨 Building containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod build

echo ""
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# ── Health check ─────────────────────────────────────────────
echo ""
echo "🏥 Health check..."
if curl -sf http://localhost/health > /dev/null 2>&1; then
  echo "  ✅ Backend: healthy"
else
  echo "  ⚠️  Backend not responding yet (may still be starting)"
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ Deployment complete!                     ║"
echo "║                                              ║"
echo "║  Local:  http://localhost                     ║"
echo "║  Public: Check your Cloudflare Tunnel URL    ║"
echo "║                                              ║"
echo "║  Logs:   docker compose -f docker-compose.prod.yml logs -f ║"
echo "║  Stop:   docker compose -f docker-compose.prod.yml down    ║"
echo "╚══════════════════════════════════════════════╝"
