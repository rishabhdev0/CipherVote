#!/bin/bash
set -e
BUILD="./circuits/build"; PTAU="./circuits/ptau"
POT12_SHA256="1f38aa4f66e68f7d10c1ec8f14d2a076b9e2c6f874a9a915d2abfcb5c8fd05a8"
mkdir -p $BUILD $PTAU
echo "Compiling circuit..."
circom circuits/vote/vote.circom --r1cs --wasm --sym --output $BUILD -l ./node_modules
echo "Downloading ptau..."
[ ! -f "$PTAU/pot12.ptau" ] && wget -q https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau -O $PTAU/pot12.ptau
echo "${POT12_SHA256}  $PTAU/pot12.ptau" | sha256sum -c -
echo "Setting up..."
snarkjs groth16 setup $BUILD/vote.r1cs $PTAU/pot12.ptau $BUILD/vote_0000.zkey
if [ "$NODE_ENV" = "production" ] && [ -z "$ZKEY_ENTROPY" ]; then
  echo "ZKEY_ENTROPY is required for production circuit setup" >&2
  exit 1
fi
CONTRIBUTION="${ZKEY_ENTROPY:-$(openssl rand -hex 64)}"
echo "$CONTRIBUTION" | snarkjs zkey contribute $BUILD/vote_0000.zkey $BUILD/vote_final.zkey --name="${ZKEY_CONTRIBUTOR_NAME:-CipherVote Contributor}"
snarkjs zkey verify $BUILD/vote.r1cs $PTAU/pot12.ptau $BUILD/vote_final.zkey
snarkjs zkey export verificationkey $BUILD/vote_final.zkey $BUILD/verification_key.json
snarkjs zkey export solidityverifier $BUILD/vote_final.zkey $BUILD/VoteVerifier.sol
echo "✅ Circuit setup complete"
