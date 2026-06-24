# 🗳️ CipherVote

**A blockchain-backed secure voting platform with Election Commission workflows, voter verification, candidate approval, encrypted ballot receipts, smart contract anchoring, audit logging, and governance controls.**

CipherVote is a full-stack academic prototype designed to demonstrate how digital elections can combine modern web security, role-based administration, and blockchain-backed integrity checks.

> ⚠️ CipherVote is built for learning, demos, and final-year project evaluation. It is **not certified for real public elections** without independent security audits, production identity verification, legal review, operational monitoring, and formal governance procedures.

---

## 📖 Table of Contents

- [🎯 Overview](#-overview)
- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ System Architecture](#️-system-architecture)
- [🔄 Voting Workflow](#-voting-workflow)
- [⛓️ Blockchain Role](#️-blockchain-role)
- [🔐 Security Model](#-security-model)
- [🚀 Getting Started](#-getting-started)
- [🔑 Environment Variables](#-environment-variables)
- [📁 Project Structure](#-project-structure)
- [🧪 Testing](#-testing)
- [🚢 Deployment Notes](#-deployment-notes)
- [⚠️ Known Limitations](#️-known-limitations)
- [🗺️ Roadmap](#️-roadmap)
- [📄 License](#-license)

---

## 🎯 Overview

CipherVote provides a controlled election platform where:

- voters register with wallet-bound accounts
- candidates apply for official participation
- the Election Commission verifies voters and candidates
- eligible voters are selected into election-specific rolls
- vote receipts and lifecycle actions can be anchored on-chain
- vote counts stay sealed until the election is closed/certified
- voters and candidates can view declared winners after result publication

The system follows a **hybrid blockchain architecture**:

- the database handles workflow, user profiles, review queues, and UI state
- smart contracts handle critical election integrity checks when configured
- encrypted ballot receipts reduce direct exposure of voter-to-candidate linkage

---

## ✨ Features

### 🏛️ Election Commission Dashboard

- create and manage elections
- review voter registrations
- approve or reject candidate applications
- select voters into election rolls
- rebuild eligibility roots
- activate, pause, close, and certify elections
- view audit logs, fraud review, disputes, and governance actions

### 🧑‍💼 Candidate Workspace

- submit candidate application
- choose predefined party or custom party
- add party/logo metadata
- track EC approval status
- view assigned election
- see winner/tie result after declaration
- live vote counts remain sealed during active elections

### 🧑‍ voter Workspace

- create wallet-bound user account
- register as voter
- submit identity details
- track approval/rejection status
- view active eligible elections
- cast encrypted ballot
- receive public receipt hash
- view NFT credential and participation status

### ⛓️ Blockchain Layer

- Solidity smart contracts
- Hardhat local network
- election lifecycle contract
- voter registry contract
- voting contract with duplicate-vote/nullifier checks
- soulbound voter NFT credential contract
- emergency pause and audit support
- local deployment scripts

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Query |
| UI | Custom civic dashboard design, lucide-react icons, handmade CipherVote mark |
| Backend | Node.js, Express.js, Prisma |
| Database | PostgreSQL |
| Authentication | JWT, httpOnly cookies, CSRF protection |
| Blockchain | Solidity, Hardhat, ethers.js, OpenZeppelin |
| Privacy Prototype | encrypted ballot envelope, nullifier, eligibility root, ZKP plumbing |
| Testing | Node test runner, Hardhat tests, Vite build checks |

---

## 🏗️ System Architecture

```text
User / Election Commission
        |
        v
React Frontend + MetaMask
        |
        v
Node.js / Express Backend
        |
        +--------------------+
        |                    |
        v                    v
PostgreSQL Database     Smart Contracts
Workflow data           Election/Vote state
Review queues           Voter registry
Audit metadata          Vote receipt events
```

### 🧩 Component Responsibilities

| Component | Responsibility |
| --- | --- |
| Frontend | user interface, wallet connection, dashboards, voting screens |
| Backend | authentication, authorization, validation, EC workflows, contract calls |
| Database | user profiles, election metadata, review history, encrypted receipt records |
| Blockchain | election state, voter registry checks, vote uniqueness, receipt anchoring |

---

## 🔄 Voting Workflow

```text
1. User creates account
2. User connects MetaMask wallet
3. User chooses voter or candidate flow
4. Voter submits identity details
5. Candidate submits application details
6. Election Commission reviews submissions
7. EC approves voters and candidates
8. EC creates election and selects eligible voters
9. EC rebuilds eligibility root
10. EC activates election
11. Voter casts encrypted ballot
12. Backend validates DB + contract state
13. Voting contract checks duplicate vote/nullifier state
14. Contract emits vote receipt event
15. Backend stores receipt metadata
16. Results are declared after close/certification
```

---

## ⛓️ Blockchain Role

CipherVote uses blockchain where it matters most for election integrity.

### Blockchain helps with:

- immutable vote receipt events
- duplicate vote prevention
- voter registry verification
- election lifecycle anchoring
- candidate chain identifiers
- nullifier tracking
- soulbound voter credential records
- auditability of critical operations

### Database still handles:

- login accounts
- EC review workflow
- identity metadata
- dashboard search/filtering
- notifications
- encrypted ballot metadata
- audit log indexing

This approach keeps the platform usable while making critical vote operations verifiable through contract state.

---

## 🔐 Security Model

Implemented safeguards include:

- Prisma parameterized database queries
- JWT access/refresh separation
- httpOnly cookies
- CSRF protection
- role-based backend authorization
- Election Commission permission boundaries
- voter/candidate wallet binding
- API, auth, and voting rate limits
- input validation on critical routes
- private upload storage
- file signature validation
- sealed vote counts before result declaration
- tamper-evident audit log support
- blockchain state checks before vote casting

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- MetaMask
- Git

### 1. Clone the Repository

```powershell
git clone https://github.com/rishabhdev0/CipherVote.git
cd CipherVote
```

### 2. Install Dependencies

```powershell
npm install
npm.cmd --prefix backend install
npm.cmd --prefix frontend install
npm.cmd --prefix blockchain install
```

### 3. Create Environment Files

```powershell
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
copy blockchain\.env.example blockchain\.env
```

Update `backend/.env` with your PostgreSQL `DATABASE_URL`.

### 4. Setup Database

```powershell
npm.cmd --prefix backend run db:migrate
npm.cmd --prefix backend run db:gen
npm.cmd --prefix backend run db:seed
```

The seed creates only system accounts. It does **not** create fake voters, fake candidates, fake elections, or fake votes.

### 5. Run Local Blockchain

Terminal 1:

```powershell
npm.cmd --prefix blockchain run node
```

Terminal 2:

```powershell
npm.cmd --prefix blockchain run deploy:local
```

### 6. Run Backend

Terminal 3:

```powershell
npm.cmd --prefix backend run dev
```

Backend API:

```text
http://localhost:5000/api
```

### 7. Run Frontend

Terminal 4:

```powershell
npm.cmd --prefix frontend run dev
```

Frontend app:

```text
http://localhost:3000
```

---

## 🔑 Environment Variables

Environment files are ignored by Git.

Commit only:

```text
backend/.env.example
frontend/.env.example
blockchain/.env.example
```

Never commit:

```text
backend/.env
frontend/.env
blockchain/.env
private keys
database passwords
JWT secrets
uploaded voter documents
Hardhat generated artifacts
```

---

## 📁 Project Structure

```text
CipherVote/
  backend/
    prisma/                 database schema and migrations
    src/
      config/               environment, logger, contract loading
      middleware/           auth, security, validation, rate limits
      routes/               Express API routes
      services/             blockchain, fraud, identity, upload, ZKP services
      sockets/              Socket.IO setup
      utils/                seed, retention, repair helpers

  blockchain/
    contracts/              Solidity smart contracts
    scripts/                deployment and ZKP helper scripts
    test/                   Hardhat tests
    circuits/               ZKP/Circom prototype files

  frontend/
    src/
      components/           layout and reusable UI
      context/              auth, wallet, socket context
      hooks/                React Query hooks
      pages/                public, voter, candidate, admin screens
      services/             API client services
      styles/               global Tailwind styles
      utils/                formatters and constants

  docs/                     governance, operations, key management notes
  ops/                      monitoring and alerting examples
  scripts/                  static scan, load, backup, restore helpers
```

---

## 🧪 Testing

Recommended checks before pushing:

```powershell
npm.cmd --prefix backend run check
npm.cmd --prefix backend test
npm.cmd --prefix frontend run build
npm.cmd --prefix blockchain test
npm.cmd run static:scan
```

Current test coverage includes:

- backend auth/security tests
- backend authorization tests
- backend input validation tests
- service-level security tests
- smart contract permission boundary tests
- voting integrity contract tests
- frontend production build check
- static secret/security scan

---

## 🚢 Deployment Notes

Production deployment requires:

- managed PostgreSQL
- production secret manager
- audited smart contracts
- production RPC provider
- multisig/timelock ownership
- HTTPS-only cookies
- strict CORS allowlist
- production identity verification provider
- monitoring and alerting
- incident response plan
- backup and restore process

---

## ⚠️ Known Limitations

CipherVote is still a prototype. Before real elections, it needs:

- independent smart contract audit
- complete MACI-style coercion resistance
- production ZKP proof ceremony and proof-vector testing
- production identity verification integration
- formal governance process
- operational monitoring
- legal and compliance review
- stronger chain event indexing

---

## 🗺️ Roadmap

- full MACI-inspired encrypted command flow
- stronger ZKP eligibility proof generation
- production proof vectors
- multisig/timelock deployment workflow
- chain event indexer
- accessibility audit
- mobile UI polish
- result challenge/recount process
- production monitoring dashboard

---

## 📄 License

This project is licensed under the **MIT License**.

See [LICENSE](./LICENSE) for details.
