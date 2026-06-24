# Run CipherVote Locally In VS Code

Open this folder in VS Code:

```powershell
C:\Users\ASUS\Downloads\CipherVote\CipherVote
```

Use `npm.cmd`, not `npm`, in PowerShell. Your machine blocks `npm.ps1` through the PowerShell execution policy.

## Required Software

- Node.js 18 or newer. Current detected version: Node 22.
- PostgreSQL running locally.
- MetaMask browser extension.
- VS Code.

Docker and `psql` were not detected on PATH, so the easiest path is to install PostgreSQL for Windows, or install Docker Desktop and run the included `docker-compose.yml`.

## Ports

- PostgreSQL: `5432`
- Hardhat chain: `8545`
- Backend API: `5000`
- Frontend: `3000`

At the time of this check, none of these ports were listening.

## One-Time Setup

1. Make sure PostgreSQL is running.

2. Check `backend/.env`.

   It must contain a real Postgres URL:

   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ciphervote"
   ```

   The database name should be `ciphervote`.

3. Install dependencies if needed:

   ```powershell
   npm.cmd --prefix backend install
   npm.cmd --prefix frontend install
   npm.cmd --prefix blockchain install
   ```

4. Prepare database:

   ```powershell
   npm.cmd --prefix backend run db:push
   npm.cmd --prefix backend run db:gen
   npm.cmd --prefix backend run db:seed
   ```

## Start The App

Open 4 VS Code terminals.

### Terminal 1: Local Blockchain

```powershell
npm.cmd --prefix blockchain run node
```

Keep this terminal open.

### Terminal 2: Deploy Contracts

```powershell
npm.cmd --prefix blockchain run deploy:local
```

This writes contract addresses to:

```text
blockchain/deployments/latest.json
```

The backend loads this file automatically.

### Terminal 3: Backend

```powershell
npm.cmd --prefix backend run dev
```

Backend should run at:

```text
http://localhost:5000
```

### Terminal 4: Frontend

```powershell
npm.cmd --prefix frontend run dev
```

Frontend should run at:

```text
http://localhost:3000
```

## MetaMask Local Network

Add a network:

- Network name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Import the first Hardhat private key:

```text
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Demo Logins

```text
admin@ciphervote.io / Admin@123456
ec@ciphervote.io / EC@123456
auditor@ciphervote.io / Audit@123456
rahul@demo.ciphervote.io / Voter@12345
```

## VS Code Tasks

This repo now includes `.vscode/tasks.json`.

Open Command Palette:

```text
Ctrl+Shift+P
```

Run:

```text
Tasks: Run Task
```

Useful tasks:

- `Install: all packages`
- `DB: push schema`
- `DB: seed demo data`
- `Blockchain: local node`
- `Blockchain: deploy local contracts`
- `Backend: dev server`
- `Frontend: dev server`
- `Check: all local tests`

## Current Project Shape

- `backend`: Express API, Prisma/PostgreSQL, auth, voter registration, voting routes, governance, audit, fraud, disputes.
- `frontend`: React/Vite UI for voters/admins.
- `blockchain`: Hardhat smart contracts and tests.
- `docs`: security, governance, incident response, key management, architecture notes.
- `ops`: Prometheus/alerting starter config.

## Known Local Gotchas

- Use `npm.cmd` in PowerShell.
- PostgreSQL must be running before Prisma commands work.
- Hardhat must keep running while backend/frontend use local chain.
- Frontend build may fail inside restricted sandboxes, but works in a normal VS Code terminal.
- If production privacy mode is enabled, encrypted voting requires a tally public key and ZKP assets.
