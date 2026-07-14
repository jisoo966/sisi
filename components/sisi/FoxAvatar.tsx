"use client";

import Image from "next/image";

export function FoxAvatar({ size = 48 }: { size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden bg-[#F2E5B5] flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src="/journey/ChatSiSiProfile.png"
        alt="sísí"
        width={size}
        height={size}
        className="object-cover"
      />
    </div>
  );
}
