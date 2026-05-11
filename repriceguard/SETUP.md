# RepriceGuard — Setup Guide

## Step 1: Extract

```bash
unzip repriceguard-nextjs.zip
cd repriceguard-next
```

## Step 2: Install

```bash
npm install
```

## Step 3: Configure

```bash
cp .env.example .env.local
```

You don't need to change anything to run locally.
The app works immediately with the demo mode.

## Step 4: Run

```bash
npm run dev
```

Open: http://localhost:3000

## Step 5: Test the scanner

1. The ETH Forwarder example is pre-loaded
2. Click **"Scan for Glamsterdam Vulnerabilities"**
3. Watch the progress animation
4. See Critical + High findings with code examples

## Step 6: Deploy to Hostinger

See README.md → "Deploy to Hostinger" section.

Short version for VPS:
```bash
# Build
npm run build

# Start
npm run start:prod
```

Then point your domain to port 3000 via Nginx.
