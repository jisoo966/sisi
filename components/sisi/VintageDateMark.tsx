type Props = {
  date: Date | string;
  /** 'short' = "May 14" | 'long' = "14 May 2026" | 'relative' = "3 days ago" */
  format?: "short" | "long" | "chapter";
  /** Optional tint — defaults to warm neutral */
  tint?: boolean;
};

function formatDate(d: Date, fmt: Props["format"]): string {
  if (fmt === "long") {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  if (fmt === "chapter") {
    // e.g. "XIV · May" — quiet chapter-mark style
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "long" });
    // Roman numeral up to 31
    const ROMAN = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI","XXII","XXIII","XXIV","XXV","XXVI","XXVII","XXVIII","XXIX","XXX","XXXI"];
    return `${ROMAN[day] ?? day} · ${month}`;
  }
  // short default
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export default function VintageDateMark({ date, format = "short", tint = false }: Props) {
  const d = typeof date === "string" ? new Date(date) : date;
  const text = formatDate(d, format);

  return (
    <span
      className="inline-block font-garamond italic text-[#6B5648] leading-none"
      style={{
        fontSize: "0.72rem",
        letterSpacing: "0.04em",
        padding: tint ? "2px 8px" : undefined,
        background: tint ? "rgba(61,46,37,0.04)" : undefined,
        // Subtle warm border if tinted
        border: tint ? "1px solid rgba(61,46,37,0.07)" : undefined,
        borderRadius: tint ? "2px" : undefined,
      }}
    >
      {text}
    </span>
  );
}
