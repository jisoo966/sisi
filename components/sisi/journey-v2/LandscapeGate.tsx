"use client";

/**
 * LandscapeGate — SiSi is portrait-first. When the device rotates to a
 * clearly landscape orientation (short viewport), show a minimal message
 * asking the user to turn upright.
 *
 * Rendered by CSS @media (orientation: landscape) rules in globals.css.
 * In portrait it is display:none; no logic needed.
 */
export function LandscapeGate() {
  return (
    <div className="journey-landscape-gate">
      <p
        style={{
          fontFamily: "var(--font-fraunces), Georgia, serif",
          fontSize: "clamp(18px, 4vw, 22px)",
          color: "var(--journey-navy)",
          marginBottom: 12,
          letterSpacing: "0.02em",
        }}
      >
        SiSi feels better this way <span style={{ opacity: 0.85 }}>✦</span>
      </p>
      <p
        style={{
          fontFamily: "var(--font-sentient), Georgia, serif",
          fontWeight: 300,
          letterSpacing: "-0.02em",
          fontSize: "clamp(13px, 3.5vw, 15px)",
          color: "rgba(31,42,68,0.65)",
          fontStyle: "italic",
        }}
      >
        turn your phone upright to keep walking.
      </p>
    </div>
  );
}
