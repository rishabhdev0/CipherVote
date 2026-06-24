# CipherVote Key Management

## Required Controls

- Deployer, owner, verifier, relayer, fraud reporter, and audit-anchor keys must be separate.
- Production owner roles should be transferred to `GOVERNANCE_MULTISIG_ADDRESS` during deployment.
- Backend relayer private key must be stored in KMS/HSM or equivalent managed secret storage.
- Rotate relayer keys after incidents, staff changes, or governance-approved schedules.
- Never reuse test mnemonic/private keys in staging or production.

## Rotation Checklist

1. Create governance action for the rotation.
2. Add the new address to the relevant contract role.
3. Update backend secret reference.
4. Confirm health checks and canary transaction.
5. Remove the old address from contract roles.
6. Anchor the audit root after completion.
