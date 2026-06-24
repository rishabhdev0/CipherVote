import { resolvePartyMark } from "../../utils/partyCatalog";

const sizes = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-sm",
};

export default function PartyMark({
  party,
  logoUrl,
  size = "md",
  className = "",
}) {
  const mark = resolvePartyMark(party, logoUrl);
  const sizeClass = sizes[size] || sizes.md;

  if (mark.logoUrl) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white ${sizeClass} ${className}`}
        title={mark.name}
      >
        <img
          src={mark.logoUrl}
          alt={`${mark.name} logo`}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border font-semibold ${sizeClass} ${className}`}
      style={{
        borderColor: `${mark.color}33`,
        backgroundColor: `${mark.color}12`,
        color: mark.color,
      }}
      title={mark.name}
    >
      {mark.shortName}
    </span>
  );
}
