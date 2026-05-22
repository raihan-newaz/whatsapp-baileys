# WhatsApp Marketing Automation SaaS

A full-stack SaaS platform for WhatsApp bulk messaging, built with:

- **Frontend**: Next.js + Tailwind CSS + Shadcn UI → Deployed on **Vercel**
- **Backend**: Node.js + Express + whatsapp-web.js + BullMQ → Deployed on **DigitalOcean**
- **Database**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Queue**: Redis + BullMQ

## Project Structure
```
WhatsApp/
├── frontend/     # Next.js App (Vercel)
└── backend/      # Node.js API (DigitalOcean)
```

## Getting Started

### 1. Configure Supabase Keys

**Frontend** — edit `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://bzfgcnpbgmgsicxlckij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

**Backend** — edit `backend/.env`:
```
SUPABASE_URL=https://bzfgcnpbgmgsicxlckij.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

> Get your keys from: https://supabase.com/dashboard/project/bzfgcnpbgmgsicxlckij/settings/api

### 2. Install Redis locally (for development)

**Windows (WSL recommended):**
```bash
sudo apt install redis-server
sudo service redis-server start
```

### 3. Run the Backend

```bash
cd backend
npm run dev
```

### 4. Run the Frontend

```bash
cd frontend
npm run dev
```

Visit: http://localhost:3000

## Dashboard Modules

| Module | Path |
|--------|------|
| Overview | `/dashboard` |
| WhatsApp Manager | `/dashboard/whatsapp` |
| Contacts | `/dashboard/contacts` |
| Campaigns | `/dashboard/campaigns` |
| Message Logs | `/dashboard/logs` |
| Templates | `/dashboard/templates` |
| Analytics | `/dashboard/analytics` |
| WooCommerce | `/dashboard/woocommerce` |
| Billing | `/dashboard/billing` |
| Settings | `/dashboard/settings` |

## Deploying to Production

### Frontend → Vercel
1. Push `frontend/` to a GitHub repo
2. Import to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard

### Backend → DigitalOcean
1. Create a Droplet (Ubuntu 22.04, minimum 2GB RAM for Puppeteer)
2. Install Node.js 20, Redis, and Chrome dependencies:
   ```bash
   sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libcairo2 libcups2 libfontconfig1 libgdk-pixbuf2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libxss1 fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
   ```
3. Clone repo, run `npm install`, set up `.env`
4. Use PM2 to keep it running: `pm2 start npm -- start`
