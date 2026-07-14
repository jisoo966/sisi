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
          <div className="rounded-[20px] bg-white/85 backdrop-blur-sm px-[18px] py-[14px] shadow-sm">
            <p className="font-sentient text-[16px] leading-[1.4] text-journey-navy">
              {text}
            </p>
          </div>
          {time && (
            <p className="font-sentient text-[12px] text-journey-navy/60 mt-2 ml-1">
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
        <div className="rounded-[20px] bg-journey-cobalt/90 px-[20px] py-[12px] shadow-sm">
          <p className="font-sentient text-[16px] text-white">{text}</p>
        </div>
        {time && (
          <p className="font-sentient text-[12px] text-journey-navy/60 mt-2 mr-1">
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
        className="font-sentient rounded-[20px] bg-journey-cobalt/90 hover:bg-journey-cobalt text-white px-[28px] h-[42px] text-[15px] transition shadow-sm"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="font-sentient rounded-[20px] border border-journey-cobalt text-journey-cobalt bg-white/80 hover:bg-white px-[28px] h-[42px] text-[15px] transition"
    >
      {children}
    </button>
  );
}
