# CipherVote Production Voting Architecture

CipherVote production mode is a hybrid encrypted-ballot architecture.

## Blockchain-First Authority Model

- The database stores account profiles, EC review workflow, document metadata, UI state, and off-chain encrypted ballot material.
- The blockchain is the authority for election lifecycle, voter registry verification, eligibility root anchoring, candidate identifiers, nullifier usage, and final vote receipt anchoring.
- Backend APIs must treat database values as a local cache when contract addresses are configured. Before vote casting, the backend re-reads ElectionManager, VoterRegistry, and Voting contracts and rejects DB/chain mismatch.
- Public election responses may include a `chainState` object so the frontend can surface when a local database record is out of sync with the contract state.
- Candidate chain IDs must come from the contract transaction result. If a draft voting window is refreshed before adding a candidate, the backend must still store the nested `addCandidate.blockchainId`.

## MACI-Inspired Coercion-Resistance Direction

CipherVote is currently MACI-inspired, not a full MACI implementation. The strongest production direction is to follow the MACI model used in real Ethereum public-goods funding systems: voters submit encrypted commands, nullifiers prevent duplicate final votes, and ZK proofs allow tally verification without revealing voter choices.

For an election-grade version, CipherVote should add:

- Coordinator public key registration per election.
- Encrypted vote commands that can be superseded by a later valid command from the same voter.
- Nullifier-based final vote uniqueness without exposing voter identity.
- ZK tally proofs proving that encrypted commands were processed correctly.
- Deniable public receipts so a voter cannot prove their candidate choice to a coercer.
- Ceremony and key-management rules for coordinator keys, tally keys, and proof artifacts.

## Security Decisions

- Voters authenticate with wallet nonce/signature and normal application credentials.
- The backend may verify eligibility and prevent duplicate participation, but it must not receive plaintext candidate selections in production privacy mode.
- Ballot choice is encrypted client-side to the election tally key and submitted as an encrypted payload plus a ballot commitment.
- The voter participation record, public receipt, and encrypted ballot are stored as separate records so the database does not directly link a voter to a candidate.
- Eligibility is represented by per-election commitments in a Merkle tree. The election `merkleRoot` is frozen before activation.
- ZK proofs bind election id, candidate range, voter nullifier, eligibility root, and ballot commitment.
- Results are not certified until the election is closed, the challenge window has elapsed, disputes are resolved, and governance execution approves certification.

## Threat Model

- Malicious backend: must not learn plaintext candidate choices in privacy mode.
- Database leak: must not reveal voter-to-candidate linkage.
- Malicious admin: election lifecycle requires governance approval and timelock.
- Chain reorg: receipts store chain id, block number, transaction hash, log index, and confirmations when on-chain anchoring is configured.
- Replay/double vote: voter participation is unique per election and ballot nullifiers are globally unique on-chain when contracts are configured.
- Voter coercion: this codebase does not yet implement full MACI-style coercion-resistant revoting or deniable receipts; that must be handled before coercion-sensitive public elections.

## Non-Negotiable Production Settings

- `BALLOT_PRIVACY_MODE=encrypted`
- `REQUIRE_ZKP=true`
- `REQUIRE_GOVERNANCE_FOR_ELECTIONS=true`
- `GOVERNANCE_REQUIRED_APPROVALS>=2`
- `GOVERNANCE_TIMELOCK_MINUTES` set to a real operational delay
- production secrets stored in a secret manager, not `.env` files
