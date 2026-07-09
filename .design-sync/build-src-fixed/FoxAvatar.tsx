"use client";

// design-sync build shim: the real component (components/sisi/FoxAvatar.tsx)
// uses next/image, which bundles Next.js router internals that reference
// `process.env.*` at module scope and throw outside a Next.js app shell.
// Same props/markup/behavior, plain <img> instead of next/image — see
// .design-sync/NOTES.md.

export function FoxAvatar({ size = 48 }: { size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden bg-[#F2E5B5] flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/journey/ChatSiSiProfile.png"
        alt="sísí"
        width={size}
        height={size}
        className="object-cover"
      />
    </div>
  );
}
