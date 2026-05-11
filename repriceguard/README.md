# RepriceGuard ⬡

> Glamsterdam Gas Repricing Vulnerability Scanner — built for the Ethereum Foundation ESP Grant Round

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)

---

## Run Locally (Quick Start)

### Requirements
- Node.js >= 18 (check: `node --version`)
- npm >= 9 (check: `npm --version`)

### Steps

```bash
# 1. Extract the zip
unzip repriceguard-nextjs.zip
cd repriceguard-next

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env.local
# Edit .env.local if needed (works out of the box without changes)

# 4. Start development server
npm run dev

# Open http://localhost:3000
```

### Production build (local test)

```bash
npm run build
npm run start
# Open http://localhost:3000
```

---

## Deploy to Hostinger

Hostinger supports Node.js apps via their **Node.js hosting** plan or **VPS**.

### Option A — Hostinger Node.js Hosting (hPanel)

1. **Buy/open** a Hostinger Node.js hosting plan
2. **Login to hPanel** → Websites → Manage
3. **Go to**: Advanced → Node.js
4. Set Node.js version to **20.x** or higher
5. Set startup file to: `server.js`
6. Set app root to: `public_html/repriceguard` (or your folder)

**Upload files:**
```bash
# Build first
npm run build

# The standalone folder contains everything needed:
# .next/standalone/ → upload this entire folder to Hostinger
# .next/static/     → upload to .next/static/ inside standalone
# public/           → upload to public/ inside standalone
```

**Via File Manager or FTP (FileZilla):**
```
Upload these to public_html/repriceguard/:
  ├── .next/standalone/*     (all files)
  ├── .next/static/          (copy into .next/ inside standalone)
  └── public/                (copy into root of standalone)
```

**Set environment variables in hPanel:**
- Go to: Node.js → Environment Variables
- Add: `NODE_ENV=production`
- Add: `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
- Add: `ETHERSCAN_API_KEY=your_key` (optional)
- Add: `PORT=3000` (or whatever Hostinger assigns)

**Start the app:**
- In hPanel Node.js panel, click **Restart** or set startup command to:
  ```
  node server.js
  ```

---

### Option B — Hostinger VPS (Recommended for full control)

```bash
# 1. SSH into your VPS
ssh root@your-vps-ip

# 2. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 (process manager)
npm install -g pm2

# 4. Upload project (from your local machine)
scp -r repriceguard-next/ root@your-vps-ip:/var/www/repriceguard/

# 5. On VPS — install & build
cd /var/www/repriceguard
npm install
cp .env.example .env.local
# Edit .env.local:
nano .env.local
# Set: NEXT_PUBLIC_APP_URL=https://yourdomain.com
# Set: NODE_ENV=production

npm run build

# 6. Start with PM2
pm2 start npm --name "repriceguard" -- run start:prod
pm2 save
pm2 startup

# 7. Setup Nginx reverse proxy
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/repriceguard
```

**Nginx config** (`/etc/nginx/sites-available/repriceguard`):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/repriceguard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Add SSL (free with Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### Option C — Docker on Hostinger VPS

```bash
# On VPS
docker build -t repriceguard .
docker run -d \
  --name repriceguard \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_APP_URL=https://yourdomain.com \
  -e ETHERSCAN_API_KEY=your_key \
  repriceguard
```

---

## Project Structure

```
repriceguard/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Main page (hero + scanner + EIP reference)
│   ├── layout.tsx              # Root layout + metadata
│   ├── globals.css             # Tailwind + custom CSS
│   └── api/
│       ├── scan/route.ts       # POST /api/scan — analysis engine
│       └── examples/route.ts  # GET  /api/examples — demo contracts
│
├── components/                 # React UI components
│   ├── ScanPanel.tsx           # Input tabs + progress animation
│   ├── ScanResults.tsx         # Severity summary + gas table + findings
│   ├── FindingCard.tsx         # Expandable vulnerability detail card
│   ├── GasTable.tsx            # Pre/post Glamsterdam gas comparison
│   └── SeverityBadge.tsx       # Critical/High/Medium/Info labels
│
├── lib/                        # Core analysis engine
│   ├── gasRules.ts             # Gas constants from actual EIP specs
│   ├── patterns.ts             # 7 vulnerability detectors
│   ├── analyzer.ts             # Orchestrates detection → ScanResult
│   └── examples.ts             # 6 demo Solidity contracts
│
├── types/
│   └── index.ts                # All TypeScript interfaces
│
├── .env.example                # Template — copy to .env.local
├── .env.local                  # Your local env (NOT committed to git)
├── next.config.ts              # Next.js config (standalone output)
├── Dockerfile                  # Production Docker image
├── package.json
└── tsconfig.json
```

---

## API Reference

### POST /api/scan
Analyzes a contract and returns vulnerability findings.

**Request:**
```json
{
  "mode": "source",       // "source" | "address" | "bytecode"
  "input": "pragma solidity ^0.8.0; ..."
}
```

**Response:**
```json
{
  "label": "Pasted Source",
  "findings": [
    {
      "id": "hardcoded-21000",
      "severity": "critical",
      "title": "Hardcoded 21,000 Gas Constant",
      "eips": ["EIP-2780"],
      "hits": [{ "line": 12, "text": "(bool ok,) = r.call{gas: 21000..." }],
      "gasImpact": { "old": 21000, "new": 31756, "direction": "up", "note": "..." },
      "remediation": "...",
      "codeExample": { "bad": "...", "good": "..." }
    }
  ],
  "gasTable": [...],
  "counts": { "critical": 1, "high": 2, "medium": 1, "info": 0 },
  "scannedAt": "2026-05-11T10:00:00.000Z",
  "linesAnalyzed": 48
}
```

### GET /api/examples?key=forwarder
Returns a demo contract. Keys: `forwarder`, `factory`, `multisig`, `defi`, `relayer`, `clean`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Your public URL |
| `NEXT_PUBLIC_APP_NAME` | `RepriceGuard` | App name in metadata |
| `ETHERSCAN_API_KEY` | *(empty)* | Enables live contract fetch. Get free at etherscan.io/apis |
| `RATE_LIMIT_RPM` | `20` | Max scan requests per IP per minute |
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Set to `production` for deployment |

---

## Vulnerabilities Detected

| Pattern | Severity | EIP |
|---------|----------|-----|
| Hardcoded `21000` gas in calls | **Critical** | EIP-2780 |
| Factory/CREATE with fixed gas | **Critical** | EIP-8037 |
| `.transfer()` / `.send()` | **High** | EIP-2780 + EIP-7708 |
| Hardcoded `2300` gas stipend | **High** | EIP-2780 |
| `gasleft()` gas assertions | **Medium** | EIP-8038 |
| Relayer base gas = 21,000 | **Medium** | EIP-2780 |
| KECCAK256-heavy contracts | **Info** | EIP-7904 |

---

## Grant Application

This project is submitted to the [Ethereum Foundation Glamsterdam Grants Round](https://esp.ethereum.foundation/applicants/wishlist/glamsterdam-round).

- **Category:** Impact Analysis + Developer Tooling
- **Budget:** $24,000 USD
- **Timeline:** 4 months
- **License:** MIT

---

## License

MIT License — free to use, modify, and deploy.
