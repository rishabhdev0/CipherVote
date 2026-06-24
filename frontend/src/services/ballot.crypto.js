import { ethers } from "ethers";

const enc = new TextEncoder();
const DEV_TALLY_KEY = "dev-tally-public-key-replace-before-production";

function b64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromB64(value) {
  const raw = atob(value.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function importTallyKey(publicKey) {
  return crypto.subtle.importKey(
    "spki",
    fromB64(publicKey),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

function looksLikeRealPublicKey(publicKey) {
  const value = String(publicKey || "").trim();
  if (!value || value === DEV_TALLY_KEY) return false;
  if (value.includes("BEGIN PUBLIC KEY")) return true;
  try {
    const clean = value.replace(/\s+/g, "");
    atob(clean);
    return clean.length > 200;
  } catch {
    return false;
  }
}

async function encryptWithTallyKey(payload, publicKey) {
  const aes = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aes,
    enc.encode(JSON.stringify(payload)),
  );
  const rawAes = await crypto.subtle.exportKey("raw", aes);
  const tallyKey = await importTallyKey(publicKey);
  const wrappedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    tallyKey,
    rawAes,
  );
  return {
    scheme: "RSA-OAEP-SHA256+AES-256-GCM",
    iv: b64(iv),
    wrappedKey: b64(wrappedKey),
    ciphertext: b64(ciphertext),
  };
}

function devEncrypt(payload) {
  if (import.meta.env.PROD)
    throw new Error("Production tally public key is required");
  return {
    scheme: "DEV_BASE64_NOT_FOR_PRODUCTION",
    ciphertext: btoa(unescape(encodeURIComponent(JSON.stringify(payload)))),
  };
}

export async function buildEncryptedBallot({
  election,
  candidate,
  walletAddress,
}) {
  const salt = ethers.hexlify(ethers.randomBytes(32));
  const isNota = Boolean(candidate.isNota);
  const payload = {
    electionId: election.id,
    candidateId: isNota ? "NOTA" : candidate.id,
    candidateBlockchainId: isNota ? 0 : candidate.blockchainId,
    isNota,
    salt,
    createdAt: new Date().toISOString(),
  };
  const publicKey =
    election.tallyPublicKey || import.meta.env.VITE_TALLY_PUBLIC_KEY;
  const useRealKey = looksLikeRealPublicKey(publicKey);
  if (import.meta.env.PROD && !useRealKey)
    throw new Error("A valid production tally public key is required");
  const envelope = useRealKey
    ? await encryptWithTallyKey(payload, publicKey)
    : devEncrypt(payload);
  const serialized = JSON.stringify(envelope);
  return {
    encryptedPayload: serialized,
    encryptionScheme: envelope.scheme,
    ballotCommitment: ethers.keccak256(ethers.toUtf8Bytes(serialized)),
    nullifierHash: ethers.keccak256(
      ethers.toUtf8Bytes(`${election.id}:${walletAddress || "wallet"}:${salt}`),
    ),
    salt,
  };
}
