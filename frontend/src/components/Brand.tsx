import type { SVGProps } from "react";

const YELLOW = "#fdda24";

/**
 * Agent Passport mark — an official "stamp/seal" (passport) whose center is a
 * four-point spark (Stellar) and whose edge ticks echo the credential's MRZ.
 * Ring + ticks render in currentColor; the spark uses `accent`.
 */
export function Mark({
  accent = YELLOW,
  ticks = true,
  ...props
}: SVGProps<SVGSVGElement> & { accent?: string; ticks?: boolean }) {
  const tickEls = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const r1 = 12.6;
    const r2 = 14.2;
    return (
      <line
        key={i}
        x1={16 + r1 * Math.cos(a)}
        y1={16 + r1 * Math.sin(a)}
        x2={16 + r2 * Math.cos(a)}
        y2={16 + r2 * Math.sin(a)}
        stroke="currentColor"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    );
  });
  return (
    <svg viewBox="0 0 32 32" width={24} height={24} fill="none" {...props}>
      <circle cx="16" cy="16" r="11.4" stroke="currentColor" strokeWidth="1.5" />
      {ticks && tickEls}
      {/* four-point spark */}
      <path
        d="M16 8.4C16.5 12.9 19.1 15.5 23.6 16C19.1 16.5 16.5 19.1 16 23.6C15.5 19.1 12.9 16.5 8.4 16C12.9 15.5 15.5 12.9 16 8.4Z"
        fill={accent}
      />
    </svg>
  );
}

/** Mark on a solid black chip — the app icon lockup. */
export function MarkChip({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: "#0a0a0a",
        color: "#ffffff",
      }}
    >
      <Mark width={size * 0.66} height={size * 0.66} />
    </span>
  );
}

/** Full wordmark: chip + "Agent Passport". */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <MarkChip size={30} />
      <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontWeight: 700, letterSpacing: "-0.02em", fontSize: 15 }}>Agent Passport</span>
        <span style={{ fontSize: 9.5, letterSpacing: "0.22em", color: "var(--color-faint)", fontFamily: "var(--font-mono)", marginTop: 3 }}>
          ZK · STELLAR
        </span>
      </span>
    </span>
  );
}

/** Large faint mark for section/hero backdrops. */
export function MarkWatermark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <Mark
      className={className}
      style={{ color: "#0a0a0a", ...style }}
      accent={YELLOW}
      width={520}
      height={520}
    />
  );
}
