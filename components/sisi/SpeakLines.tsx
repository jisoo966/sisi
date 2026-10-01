"use client";

import { motion } from "framer-motion";

/**
 * SpeakLines — three short strokes beside Sísí's face: she is saying this.
 * Shown whenever one of her speech bubbles is up (Journey, Moments).
 *
 * Drawn in the icon family's crayon hand (filled, slightly uneven strokes).
 * Position it with `style` / `className` at the front of her face (the
 * caller knows where it is); the strokes start a little way out from that
 * point. `facing="left"` mirrors the fan so it opens in front of her face.
 */
const STROKES = "M2.1 6.3Q1.6 6.3 1.4 6Q1.1 5.7 1 5.3Q0.9 4.8 1.2 4.5Q1.5 4.2 1.7 4Q2 3.9 2.2 3.7Q2.5 3.5 2.8 3.4Q3 3.2 3.3 3.2Q3.6 3.1 3.9 3Q4.2 2.9 4.4 2.8Q4.7 2.6 5 2.5Q5.2 2.3 5.5 2.2Q5.8 2.1 6.1 2Q6.3 2 6.6 1.9Q6.8 1.8 7.1 1.7Q7.3 1.5 7.6 1.3Q7.8 1.2 8 1Q8.2 0.8 8.5 0.6Q8.7 0.5 8.9 0.3Q9.2 0.2 9.4 0Q9.7 -0.1 9.9 -0.3Q10.1 -0.5 10.3 -0.7Q10.5 -0.9 10.9 -0.9Q11.3 -0.9 11.5 -0.7Q11.8 -0.5 11.9 -0.2Q11.9 0.1 11.8 0.4Q11.6 0.7 11.3 0.8Q11.1 1 10.9 1.2Q10.7 1.4 10.4 1.6Q10.2 1.8 10 2Q9.8 2.2 9.6 2.3Q9.4 2.5 9.1 2.6Q8.8 2.8 8.6 2.9Q8.3 3 8.1 3.1Q7.8 3.3 7.5 3.4Q7.3 3.6 7 3.7Q6.7 3.9 6.4 4Q6.1 4.1 5.8 4.2Q5.5 4.3 5.3 4.4Q5 4.5 4.8 4.7Q4.5 4.9 4.3 5.1Q4.1 5.3 3.8 5.5Q3.6 5.7 3.3 5.9Q3.1 6 2.8 6.2Q2.6 6.4 2.1 6.3ZM2.8 14.3Q2.3 13.9 2.2 13.4Q2.1 12.9 2.3 12.4Q2.5 11.9 3 11.8Q3.5 11.6 3.8 11.7Q4.1 11.8 4.4 11.9Q4.7 11.9 5 11.9Q5.3 11.9 5.6 11.9Q5.9 11.9 6.2 11.9Q6.5 11.9 6.8 12Q7.1 12.1 7.4 12.1Q7.7 12.2 8 12.2Q8.3 12.2 8.6 12.2Q8.9 12.2 9.2 12.3Q9.4 12.3 9.7 12.4Q10 12.4 10.3 12.5Q10.6 12.5 10.9 12.5Q11.2 12.5 11.5 12.5Q11.8 12.5 12.1 12.5Q12.5 12.5 12.8 12.5Q13.1 12.6 13.4 12.6Q13.7 12.6 14 12.5Q14.3 12.5 14.6 12.4Q14.9 12.4 15.2 12.6Q15.5 12.8 15.6 13.1Q15.7 13.4 15.6 13.7Q15.5 14 15.2 14.2Q14.9 14.4 14.6 14.4Q14.3 14.4 14 14.5Q13.7 14.5 13.4 14.5Q13.1 14.5 12.8 14.6Q12.4 14.6 12.1 14.6Q11.8 14.6 11.5 14.6Q11.2 14.5 10.9 14.4Q10.6 14.3 10.3 14.3Q10 14.3 9.7 14.3Q9.4 14.3 9.1 14.3Q8.7 14.2 8.4 14.2Q8.1 14.1 7.8 14.1Q7.5 14.1 7.2 14.1Q6.9 14.2 6.6 14.3Q6.3 14.4 6 14.4Q5.7 14.5 5.4 14.5Q5.1 14.5 4.8 14.5Q4.5 14.5 4.2 14.5Q3.9 14.6 3.6 14.7Q3.3 14.7 2.8 14.3ZM1 21.7Q0.7 21.2 0.8 20.7Q0.9 20.2 1.3 19.9Q1.6 19.5 2.1 19.6Q2.6 19.7 2.9 19.9Q3.1 20.1 3.3 20.3Q3.5 20.5 3.8 20.7Q4 20.9 4.3 21Q4.6 21.1 4.8 21.2Q5.1 21.3 5.4 21.4Q5.7 21.5 5.9 21.6Q6.2 21.8 6.5 21.9Q6.7 22.1 6.9 22.2Q7.2 22.4 7.4 22.5Q7.7 22.7 7.9 22.9Q8.2 23 8.4 23.3Q8.6 23.5 8.8 23.7Q9 23.9 9.2 24.1Q9.5 24.3 9.7 24.5Q10 24.6 10.3 24.7Q10.5 24.8 10.8 24.9Q11.1 25 11.3 25.2Q11.5 25.4 11.4 25.7Q11.4 26 11.2 26.2Q11 26.4 10.6 26.4Q10.3 26.5 10 26.3Q9.8 26.2 9.5 26Q9.3 25.9 9.1 25.7Q8.8 25.6 8.5 25.5Q8.2 25.4 8 25.3Q7.7 25.2 7.4 25Q7.1 24.9 6.9 24.8Q6.6 24.6 6.4 24.4Q6.2 24.3 5.9 24.1Q5.7 23.9 5.4 23.8Q5.1 23.6 4.9 23.5Q4.6 23.4 4.4 23.2Q4.1 23.1 3.9 22.9Q3.6 22.8 3.3 22.7Q3.1 22.5 2.8 22.5Q2.5 22.4 2.1 22.4Q1.8 22.3 1.5 22.3Q1.2 22.2 1 21.7Z";

export function SpeakLines({
  facing = "right",
  delay = 0.2,
  className = "",
  style,
}: {
  facing?: "left" | "right";
  /** seconds before the lines appear — match the bubble's own delay so they arrive together */
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.span
      className={`sisi-speak-lines is-${facing} ${className}`}
      aria-hidden
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay, duration: 0.32 } }}
      exit={{ opacity: 0 }}
    >
      <svg className="sisi-speak-lines-art" viewBox="0 0 20 26" width="20" height="26" fill="currentColor">
        <path d={STROKES} />
      </svg>
      <style jsx global>{`
        .sisi-speak-lines { position: absolute; display: block; width: 0; height: 0; pointer-events: none; }
        .sisi-speak-lines.is-left { transform: scaleX(-1); }
        /* a little air between her face and the strokes */
        .sisi-speak-lines-art { position: absolute; left: 7px; top: -13px; display: block; color: var(--paper-90); }
      `}</style>
    </motion.span>
  );
}
