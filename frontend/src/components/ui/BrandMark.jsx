import { clsx } from "clsx";

export default function BrandMark({ size = "md", className = "" }) {
  const sizes = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-14 w-14",
  };

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white shadow-sm",
        sizes[size] || sizes.md,
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        className="h-[72%] w-[72%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M24 5.5 9.5 12v6.5h29V12L24 5.5Z"
          fill="#2563eb"
        />
        <path
          d="M13 20.5h5v15h-5v-15Zm8.5 0h5v15h-5v-15Zm8.5 0h5v15h-5v-15Z"
          fill="#0f766e"
        />
        <path d="M9 38h30v4H9v-4Z" fill="#1e40af" />
        <path
          d="M24 11.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z"
          fill="#fff"
        />
        <path
          d="M31.5 29.5 34 32l5-5"
          stroke="#16a34a"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
