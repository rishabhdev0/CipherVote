# CipherVote Governance

## Roles

- `SUPER_ADMIN`: manages user roles, emergency recovery, and system-level configuration.
- `ELECTION_COMMISSION`: creates elections, manages candidates, verifies voters, opens/closes elections, resolves disputes.
- `AUDITOR`: read-only access to audit, fraud, voter, election, and chain-sync records.
- `FRAUD_ANALYST`: reviews and resolves fraud logs, can trigger emergency actions with super admin oversight.
- `VOTER`: registers, verifies identity, casts one vote per election, and manages delegations where policy allows.

## Eligibility

Voters prove eligibility through the off-chain verification workflow and, for private eligibility, a future Merkle membership circuit. Backend voting requires:

- `Voter.status === VERIFIED`
- `Voter.isBlacklisted === false`
- identity checks complete
- election active and within time window
- constituency match or election constituency `ALL`
- no prior vote for the election

## Vote Privacy And Verifiability

Private vote internals stay in `Vote`. Public verification uses `VoteReceipt`, chain transaction coordinates, and receipt hash. Candidate names are not returned in vote receipts.

## Emergency Policy

Emergency pause may be triggered by configured fraud/oracle roles on-chain and fraud analyst or super admin off-chain. Resume requires election authority review.

## Finality

Production must set `BLOCK_CONFIRMATIONS` according to the target chain. Reorg handling must reconcile `ChainEvent` records before final publication.

## Audit Publication

Audit logs are append-only in the backend Prisma layer and hash-chained by `previousHash` and `entryHash`. Published audit roots should be anchored on-chain or notarized after each election.

## Retention

Sensitive uploaded files use private encrypted storage and must be deleted according to `UPLOAD_RETENTION_DAYS` after legal retention expires.
