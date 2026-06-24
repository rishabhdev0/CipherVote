# CipherVote Operations

## Required production controls

- Store deployer and relayer keys in a managed secret store or HSM-backed wallet.
- Transfer contract ownership to a multisig after deployment.
- Keep `BACKEND_RELAYER_ADDRESS` separate from deployer/admin wallets.
- Run `npm run db:migrate` before starting backend containers.
- Run `/api/health` from monitoring every 30 seconds.
- Run `npm run retention:dry-run` before scheduled document deletion.
- Keep encrypted database and private upload volume backups.
- Test restore from backup before every production election.
- Use `scripts/backup-postgres.ps1` and `scripts/restore-postgres.ps1` for database backup drills.
- Monitor `GET /api/health` plus container CPU, memory, disk, RPC latency, block sync lag, fraud log volume, and failed login spikes.

## Incident response

- Use EmergencyControl pause for suspected active fraud or contract compromise.
- Preserve audit logs, chain events, and private upload hashes before remediation.
- Rotate JWT, refresh, PII, SMTP, and relayer secrets after compromise.
- Publish final incident timeline and audit-root hashes after resolution.
