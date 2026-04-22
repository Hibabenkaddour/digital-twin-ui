# DXC Intelligent Analytics — Deployment Guide

> Deploy the full platform on a free Oracle Cloud VM with a public Cloudflare Tunnel URL.

## Prerequisites

| What | How to get it |
|------|---------------|
| Oracle Cloud VM | [cloud.oracle.com](https://cloud.oracle.com) → Always Free Tier → Ubuntu 22.04 ARM (4 cores, 24GB RAM) |
| Cloudflare account | [dash.cloudflare.com](https://dash.cloudflare.com) → Free tier |
| Groq API key | [console.groq.com](https://console.groq.com) → Free tier |
| SSH access to VM | Your SSH key from Oracle Cloud |

---

## Step 1: Set Up the Oracle Cloud VM

```bash
# SSH into your VM
ssh ubuntu@<your-vm-ip>

# Install Docker
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo usermod -aG docker $USER
# Log out and back in for group change to take effect
exit
ssh ubuntu@<your-vm-ip>

# Verify Docker
docker --version
docker compose version
```

### Open firewall ports

In Oracle Cloud Console → Networking → Virtual Cloud Networks → Security Lists:
- Add **Ingress Rule**: Source `0.0.0.0/0`, Protocol TCP, Port **80**

> Note: Cloudflare Tunnel bypasses the firewall, but port 80 is needed for the health check.

---

## Step 2: Set Up Cloudflare Tunnel

1. Go to [one.dash.cloudflare.com](https://one.dash.cloudflare.com)
2. **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel**
3. Name it: `dxc-analytics`
4. Choose **Cloudflared** connector
5. Copy the tunnel token (starts with `eyJ...`)
6. Add a **Public Hostname**:
   - Subdomain: `dxc-analytics` (or whatever you want)
   - Domain: select your domain (or use `trycloudflare.com` for free)
   - Service: `http://localhost:80`
   - Under **Additional settings → HTTP Settings**: enable **WebSockets**

---

## Step 3: Clone and Configure

```bash
# Clone the repo
git clone https://github.com/Hibabenkaddour/digital-twin-ui.git
cd digital-twin-ui/digital_twin_2

# Create production env file
cp .env.production .env.prod
nano .env.prod
```

Fill in `.env.prod`:

```env
POSTGRES_USER=dxc_user
POSTGRES_PASSWORD=YourSuperStrongPassword123!
POSTGRES_DB=dxc_analytics
DATABASE_URL=postgresql://dxc_user:YourSuperStrongPassword123!@db:5432/dxc_analytics
GROQ_API_KEY=gsk_your_real_groq_key_here
ALLOWED_ORIGINS=*
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiYWJj...your_token_here
```

Also create the backend env:
```bash
echo "GROQ_API_KEY=gsk_your_real_groq_key_here" > backend/.env
```

---

## Step 4: Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

That's it. The script will:
1. Build the frontend (React → Nginx)
2. Build the backend (FastAPI + uvicorn)
3. Start PostgreSQL with auto-schema creation
4. Start the Cloudflare Tunnel
5. Run a health check

---

## Step 5: Verify

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test locally
curl http://localhost/health
# Should return: {"status":"ok"}
```

Open your public URL: `https://dxc-analytics.your-domain.com`

---

## How It Works

```
Employee browser
      │
      ▼
https://dxc-analytics.your-domain.com  (Cloudflare Tunnel, free SSL)
      │
      ▼
Nginx (Docker, port 80)
├── /              → React SPA (static files)
├── /view/pub_xxx  → React SPA (served by index.html, React Router handles it)  
├── /nlq/*         → FastAPI backend
├── /publish/*     → FastAPI backend
├── /ws/*          → WebSocket proxy → FastAPI backend
└── /analytics/*   → FastAPI backend
      │
      ▼
FastAPI (Docker, port 8000, internal)
      │
      ▼
PostgreSQL (Docker, port 5432, internal)
```

---

## Common Operations

### Update the app (after git push)
```bash
cd ~/digital-twin-ui/digital_twin_2
git pull origin digital_twin_2
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### View logs
```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f cloudflared
```

### Restart everything
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod restart
```

### Stop everything
```bash
docker compose -f docker-compose.prod.yml down
```

### Access the database directly
```bash
docker compose -f docker-compose.prod.yml exec db psql -U dxc_user -d dxc_analytics
```

---

## Security Notes

- `.env.prod` is gitignored — never commit real passwords
- PostgreSQL is internal only (no exposed port)
- Cloudflare provides free SSL/TLS, DDoS protection
- Backend runs read-only queries for published dashboards
- All services have `restart: always` — survives VM reboots
