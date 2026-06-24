# CipherVote Incident Response

## Severity

- Critical: vote casting failure, suspected key compromise, chain reorg affecting confirmed receipts, emergency pause, audit-chain break.
- High: identity review compromise, fraud spike, RPC instability, failed blockchain sync, unauthorized privileged action attempt.
- Medium: frontend outage, non-sensitive upload failure, delayed notifications.

## Immediate Actions

1. Trigger `/api/fraud/emergency/pause` for vote-integrity or key-risk incidents.
2. Preserve logs, audit roots, deployment files, and chain event ranges.
3. Rotate relayer/API credentials if key exposure is suspected.
4. Run blockchain sync reconciliation before resuming.
5. Publish an incident note with affected election ids, time range, and remediation.

## Resume Criteria

- Emergency state is cleared by authorized fraud/super-admin role.
- Chain sync is healthy and finality threshold is met.
- Audit hash chain validates from last anchored root.
- A governance action records the resume decision.
