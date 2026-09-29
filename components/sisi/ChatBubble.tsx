"use client";

import { FoxAvatar } from "./FoxAvatar";

type Props = {
  from: "sisi" | "user";
  text: React.ReactNode;
  time?: string;
};

export function ChatBubble({ from, text, time }: Props) {
  const isSisi = from === "sisi";

  if (isSisi) {
    return (
      <div className="flex items-start gap-3 max-w-[85%]">
        <FoxAvatar size={48} />
        <div className="flex flex-col pt-1">
          {/* Glass morphic bubble — 시스템 통일 */}
          <div className="rounded-[20px] bg-paper/60 backdrop-blur-md border border-paper/50 px-[18px] py-[14px] shadow-sm">
            <p className="t-body text-journey-navy">
              {text}
            </p>
          </div>
          {time && (
            <p className="t-meta text-journey-navy/60 mt-2 ml-1">
              {time}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end max-w-full">
      <div className="flex flex-col items-end max-w-[75%]">
        {/* User bubble — glass purple (매칭 있는 primary CTA 톤) */}
        <div className="rounded-[14px_14px_4px_14px] bg-sisi-blue/20 px-[16px] py-[10px]">
          <p className="t-body text-journey-navy">{text}</p>
        </div>
        {time && (
          <p className="t-meta text-journey-navy/60 mt-2 mr-1">
            {time}
          </p>
        )}
      </div>
    </div>
  );
}

export function ChoiceButton({
  variant = "filled",
  children,
  onClick,
}: {
  variant?: "filled" | "outline";
  children: React.ReactNode;
  onClick?: () => void;
}) {
  if (variant === "filled") {
    return (
      <button
        onClick={onClick}
        className="ds-btn ds-btn--primary"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="ds-btn ds-btn--secondary"
    >
      {children}
    </button>
  );
}
