export const PARTY_PRESETS = [
  {
    id: "BJP",
    name: "Bharatiya Janata Party",
    shortName: "BJP",
    color: "#f97316",
  },
  {
    id: "INC",
    name: "Indian National Congress",
    shortName: "INC",
    color: "#2563eb",
  },
  {
    id: "AAP",
    name: "Aam Aadmi Party",
    shortName: "AAP",
    color: "#16a34a",
  },
  {
    id: "BSP",
    name: "Bahujan Samaj Party",
    shortName: "BSP",
    color: "#4f46e5",
  },
  {
    id: "CPI_M",
    name: "Communist Party of India (Marxist)",
    shortName: "CPI(M)",
    color: "#dc2626",
  },
  {
    id: "NPP",
    name: "National People's Party",
    shortName: "NPP",
    color: "#0891b2",
  },
  {
    id: "IND",
    name: "Independent",
    shortName: "IND",
    color: "#64748b",
  },
];

export const NOTA_PARTY = {
  id: "NOTA",
  name: "None of the Above",
  shortName: "NOTA",
  color: "#475569",
  isNota: true,
};

export const CUSTOM_PARTY_ID = "CUSTOM";

export const partyLogoToken = (id) => `preset:${id}`;

export function partyInitials(name = "") {
  const cleaned = String(name || "").trim();
  if (!cleaned) return "P";
  const words = cleaned.split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return initials || cleaned.slice(0, 2).toUpperCase();
}

export function findPartyPreset(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  return (
    [...PARTY_PRESETS, NOTA_PARTY].find(
      (p) =>
        p.id.toLowerCase() === text ||
        p.name.toLowerCase() === text ||
        p.shortName.toLowerCase() === text,
    ) || null
  );
}

export function resolvePartyMark(party, partyLogoUrl) {
  const rawLogo = String(partyLogoUrl || "").trim();
  if (rawLogo.startsWith("preset:")) {
    const preset = findPartyPreset(rawLogo.replace("preset:", ""));
    if (preset) return preset;
  }

  const preset = findPartyPreset(party);
  if (preset) return preset;

  const customLogo =
    rawLogo.startsWith("data:image/") ||
    rawLogo.startsWith("https://") ||
    rawLogo.startsWith("http://")
      ? rawLogo
      : "";

  return {
    id: "CUSTOM",
    name: party || "Custom party",
    shortName: partyInitials(party),
    color: "#0f766e",
    logoUrl: customLogo,
  };
}
