# CipherVote

Blockchain-backed secure voting platform with Election Commission workflows, voter verification, candidate approval, encrypted ballot receipts, smart contract anchoring, audit logging, and governance controls.

CipherVote is built as a final-year / academic prototype for demonstrating how a modern election system can combine web application security, role-based administration, and blockchain-backed integrity checks. It is not certified for real public elections without independent audits, production identity verification, formal governance, operational monitoring, and legal review.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Voting Flow](#voting-flow)
- [Blockchain Role](#blockchain-role)
- [Security Model](#security-model)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment Notes](#deployment-notes)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)

## Overview

CipherVote provides a controlled digital election workflow:

- public users create wallet-bound accounts
- voters submit identity details for Election Commission review
- candidates apply for participation in draft elections
- the Election Commission approves voters and candidates
- eligible voters are selected into election rolls
- eligibility roots and vote receipts are anchored through smart contracts when local blockchain is running
- encrypted ballots are submitted without exposing live candidate counts
- results are published only after close/certification conditions are met

The application uses a hybrid architecture. The database stores workflow records and UI state, while configured smart contracts are used as the authority for election lifecycle, voter registry checks, candidate IDs, nullifier/double-vote prevention, and receipt metadata.

## Features

### Election Commission

- role-based EC/admin workspace
- voter review and manual approval
- candidate application review
- election creation and lifecycle controls
- voter roll selection per election
- eligibility root rebuild
- governance and audit log screens
- fraud review and dispute workflow foundations

### Voter

- wallet-bound account registration
- voter profile and identity submission
- verification status dashboard
- election eligibility view
- encrypted ballot casting flow
- receipt hash display after vote confirmation
- NFT credential status screen

### Candidate

- candidate application workspace
- party selection and party logo support
- EC approval status tracking
- election assignment visibility
- sealed vote-count view while election is active
- declared winner/tie result visibility after certification

### Blockchain

- Solidity contracts for voting, election management, voter registry, audit, emergency controls, delegation, result tally, multisig, and soulbound voter credentials
- Hardhat local network support
- local deployment script
- backend contract address auto-loading from deployment output
- chain-first checks for critical vote actions

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Query |
| UI | Custom civic dashboard design, lucide-react icons, handmade CipherVote mark |
| Backend | Node.js, Express, Prisma |
| Database | PostgreSQL |
| Auth | JWT access/refresh tokens, httpOnly cookies, CSRF protection |
| Blockchain | Solidity, Hardhat, ethers.js, OpenZeppelin |
| Privacy Prototype | encrypted ballot envelope, nullifier, eligibility root, ZKP plumbing |
| Testing | Node test runner, Hardhat tests, build checks |

## Architecture

```text
User Browser
  |
  | React + MetaMask
  v
Frontend App
  |
  | HTTPS/API requests + wallet address/signature data
  v
Backend API
  |
  | Prisma workflow data
  v
PostgreSQL

Backend API
  |
  | ethers.js contract calls
  v
Hardhat / EVM Network
  |
  | Voting, ElectionManager, VoterRegistry, NFT contracts
  v
Smart Contract State
```

## Voting Flow

```text
1. User creates an account
2. User connects MetaMask wallet
3. User registers as voter or applies as candidate
4. Election Commission reviews the submission
5. EC approves voters and candidates
6. EC creates an election and selects eligible voters
7. EC rebuilds eligibility root
8. EC activates election during configured timeline
9. Voter opens election and selects ballot option
10. Frontend creates encrypted ballot payload and receipt material
11. Backend verifies voter, election, roll, and chain state
12. Backend submits vote transaction to configured Voting contract
13. Contract checks active election, verified voter, nullifier, and duplicate vote status
14. Contract emits vote receipt event
15. Backend stores receipt metadata
16. Result is sealed until close/certification
```

## Blockchain Role

CipherVote does not use blockchain only as a label. When contracts are configured, the backend checks contract state before critical actions.

The blockchain is used for:

- election lifecycle anchoring
- candidate chain identifiers
- voter registry verification
- eligibility root anchoring
- one-vote / nullifier checks
- vote receipt transaction metadata
- soulbound credential minting and participation tracking

The database is still used for:

- user accounts
- EC review workflow
- identity evidence references
- dashboards and search
- notifications
- audit metadata
- encrypted ballot storage and receipt indexing

This keeps the application usable while moving critical vote integrity toward chain authority.

## Security Model

Implemented safeguards include:

- Prisma parameterized database access
- input validation on critical write routes
- JWT access/refresh token separation
- httpOnly cookie auth
- CSRF protection
- role-based authorization
- Election Commission permission boundaries
- API/auth/vote rate limits
- wallet-bound voter and candidate workflows
- private upload directory ignored from Git
- file signature checks for uploads
- audit logging with tamper-evident hash-chain support
- sealed vote counts before result declaration
- chain-state validation before vote casting

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- MetaMask
- Git

### Install Dependencies

```powershell
npm install
npm.cmd --prefix backend install
npm.cmd --prefix frontend install
npm.cmd --prefix blockchain install
```

### Create Environment Files

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
copy blockchain\.env.example blockchain\.env
```

Update `backend/.env` with your local PostgreSQL connection string.

### Database Setup

```powershell
npm.cmd --prefix backend run db:migrate
npm.cmd --prefix backend run db:gen
npm.cmd --prefix backend run db:seed
```

The seed creates system accounts only. It does not create fake voters, fake candidates, fake elections, or fake votes.

### Run Local Blockchain

Terminal 1:

```powershell
npm.cmd --prefix blockchain run node
```

Terminal 2:

```powershell
npm.cmd --prefix blockchain run deploy:local
```

The deployment writes contract addresses into:

```text
blockchain/deployments/latest.json
```

This file is ignored by Git because it is local runtime output.

### Run Backend

Terminal 3:

```powershell
npm.cmd --prefix backend run dev
```

API URL:

```text
http://localhost:5000/api
```

### Run Frontend

Terminal 4:

```powershell
npm.cmd --prefix frontend run dev
```

App URL:

```text
http://localhost:3000
```

### MetaMask Local Network

Add a local network:

```text
Network name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency symbol: ETH
```

Import test accounts from the Hardhat node output for local testing only.

## Environment Variables

Environment files are intentionally ignored by Git.

Required local files:

```text
backend/.env
frontend/.env
blockchain/.env
```

Safe templates are committed:

```text
backend/.env.example
frontend/.env.example
blockchain/.env.example
```

Never commit private keys, production RPC keys, database passwords, JWT secrets, or uploaded voter documents.

## Project Structure

```text
CipherVote/
  backend/
    prisma/                 database schema and migrations
    src/
      config/               environment, logger, contract loading
      middleware/           auth, security, validation, rate limits
      routes/               API routes
      services/             blockchain, fraud, identity, upload, ZKP services
      sockets/              Socket.IO event layer
      utils/                seed, retention, repair helpers

  blockchain/
    contracts/              Solidity contracts
    scripts/                deployment and ZKP helper scripts
    test/                   Hardhat contract tests
    circuits/               Circom/ZKP scaffolding

  frontend/
    src/
      components/           layout and reusable UI
      context/              auth, web3, socket context
      hooks/                React Query hooks
      pages/                public, voter, candidate, admin pages
      services/             API client services
      styles/               global Tailwind styles
      utils/                formatters and constants

  docs/                     architecture, governance, operations notes
  ops/                      operational planning docs
  scripts/                  static scan and smoke/load helpers
```

## Scripts

### Root

```powershell
npm run static:scan
npm run test:p2
```

### Backend

```powershell
npm.cmd --prefix backend run dev
npm.cmd --prefix backend run check
npm.cmd --prefix backend test
npm.cmd --prefix backend run db:migrate
npm.cmd --prefix backend run db:seed
```

### Frontend

```powershell
npm.cmd --prefix frontend run dev
npm.cmd --prefix frontend run build
```

### Blockchain

```powershell
npm.cmd --prefix blockchain run node
npm.cmd --prefix blockchain run deploy:local
npm.cmd --prefix blockchain test
```

## Testing

Recommended checks before pushing:

```powershell
npm.cmd --prefix backend run check
npm.cmd --prefix backend test
npm.cmd --prefix frontend run build
npm.cmd --prefix blockchain test
npm run static:scan
```

## Deployment Notes

Production deployment requires:

- managed PostgreSQL
- real secret manager
- production RPC provider
- audited smart contract deployment
- multisig/timelock ownership
- production identity verification provider
- HTTPS-only cookies
- strict CORS allowlist
- monitoring and alerting
- incident response process
- backup and restore process

## Known Limitations

CipherVote is a prototype and still needs hardening before real elections:

- full MACI-style coercion resistance is not implemented
- ZKP proof generation and verification requires production ceremony hardening
- identity verification is manual/provider-pluggable, not nationally integrated
- local Hardhat chain is for development only
- smart contracts require independent audit
- operational key management must be defined before deployment

## Roadmap

- full MACI-inspired encrypted command flow
- production ZKP proof vectors
- multisig and timelock deployment workflow
- stronger chain event indexer
- independent contract audit
- production monitoring dashboard
- formal election dispute and recount process
- mobile-responsive polish and accessibility audit

## License

Academic prototype. Add a formal license before public production reuse.
