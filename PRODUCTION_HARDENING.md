# CipherVote Production Hardening Map

This file tracks the production-grade work that must be complete before any real election use.

## Implemented in Code

- Wallet auth uses backend-issued nonces and `ethers.verifyMessage`.
- OTPs are stored as bcrypt hashes with expiry, attempts, purpose, and consumed status.
- Refresh tokens are stored as hashed sessions and rotated on refresh.
- Auth cookies are issued as `httpOnly`, `sameSite`, `secure` in production.
- CSRF double-submit protection is enforced for unsafe HTTP methods.
- JWT secrets fail startup in production if missing or unsafe.
- Backend vote casting validates election, candidate, voter status, identity checks, blacklist, constituency, prior vote, and fraud pre-check.
- Vote casting writes on-chain through `Voting.castVoteFor` and stores tx metadata.
- Contract ABIs are loaded from Hardhat artifacts when available.
- Voting event sync can reconcile `VoteCast` logs and confirmations.
- Election admin state changes are audit logged.
- User roles, voter status, election status, vote status, dispute status, delegation status, and document type are Prisma enums.
- Voter ID numbers are unique.
- Uploaded documents, dispute evidence, real delegations, chain events, and public vote receipts have dedicated tables.
- Audit logs include previous-hash and entry-hash fields for tamper-evident append-only verification.
- ZKP proof generation tooling exists for built circuit artifacts.
- Circuit public input order is tested against Solidity verifier expectations.
- Circuit setup verifies ptau checksum and rejects production setup without external entropy.
- Smart contracts enforce relayers, emergency pause, election active status, voter verification, candidate bounds, role-gated NFT minting, trusted audit writers, trusted anomaly reporters, owner-only result snapshots, and multisig owner/threshold rules.

## Required Production Environment

- `NODE_ENV=production`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`
- `RPC_URL`
- `PRIVATE_KEY`
- `CONTRACT_VOTING`
- `CONTRACT_ZKP_VERIFIER`
- `BACKEND_RELAYER_ADDRESS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_FROM`
- `SMTP_USER`
- `SMTP_PASS`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=strict`

## Required Commands

```bash
npm run build
npm test
npm run audit:security
```

```bash
cd blockchain
npm run compile
npm test
npm run slither
```

## Remaining P0 Work

- Replace localStorage fallback entirely with cookie-only frontend auth after migration testing.
- Implement real KYC/identity provider callbacks instead of manual flags.
- Wire frontend UI to call proof generation or run proof generation backend-side in an isolated worker.
- Add Merkle membership circuit for private voter eligibility.
- Add event indexer worker process that runs continuously, not only admin-triggered sync.
- Add chain reorg handling and minimum confirmation policy.
- Add row-level audit history for voter verification and admin role changes.
- Add test database integration tests for auth, OTP, refresh rotation, CSRF, and vote casting.
- Upgrade or replace vulnerable dependencies reported by `npm audit`.
- Install and run Slither in CI.
- Add deployment runbook for relayer private key custody, multisig ownership transfer, and emergency pause procedures.
