"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

/**
 * MenuSheet — 아래에서 슬라이드업 되는 프로필 & 설정 sheet.
 *   - Profile (이름 + 이메일)
 *   - Ambient music toggle
 *   - Angel messages, Sísí voice (placeholder v1.1)
 *   - Privacy · Terms
 *   - Sign out
 *
 * 사용법:
 *   const [open, setOpen] = useState(false);
 *   <MenuSheet open={open} onClose={() => setOpen(false)} />
 */
export function MenuSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Profile load
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.display_name) setName(profile.display_name);
      } catch {
        // ignore
      }
    })();
  }, [open]);

  // Music state load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sisi-music-on");
    setMusicOn(saved === "on");
  }, [open]);

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    localStorage.setItem("sisi-music-on", next ? "on" : "off");

    // Audio 조작 — audio 요소는 body에 있음 (BackgroundMusic이 관리)
    // 여기선 localStorage만 바꾸고 BackgroundMusic이 반응하게 함
    // 간단히 이 시점 재생 시도:
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sisi:music-toggle", { detail: { on: next } }),
      );
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />

          {/* Sheet */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.3}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            className="relative z-10 w-full max-w-[520px] rounded-t-[24px] bg-[#f7f2e3] shadow-2xl pt-[10px] pb-[36px] max-h-[85vh] overflow-y-auto"
          >
            {/* Drag handle */}
            <div className="mx-auto mb-[16px] h-[4px] w-[40px] rounded-full bg-journey-navy/20" />

            {/* Profile */}
            <div className="px-[24px] pb-[20px]">
              <p className="font-sentient text-[24px] text-journey-navy">
                {name || "friend"}
              </p>
              {email && (
                <p className="font-sentient italic text-[13px] text-journey-navy/50 mt-[2px]">
                  {email}
                </p>
              )}
            </div>

            <Divider />

            {/* Settings — music */}
            <SettingRow
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              }
              label="ambient music"
            >
              <Toggle on={musicOn} onChange={toggleMusic} />
            </SettingRow>

            <SettingRow
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              }
              label="angel messages"
              hint="coming soon"
              disabled
            />

            <Divider />

            {/* Legal links */}
            <LinkRow href="/privacy" onClose={onClose}>
              privacy policy
            </LinkRow>
            <LinkRow href="/terms" onClose={onClose}>
              terms of service
            </LinkRow>

            <Divider />

            {/* Sign out */}
            <button
              onClick={signOut}
              className="w-full px-[24px] py-[14px] text-left font-sentient text-[15px] text-journey-oxblood hover:bg-journey-navy/5 transition-colors flex items-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              sign out
            </button>

            {/* Footer */}
            <p className="mt-[16px] px-[24px] font-sentient italic text-[11px] text-journey-navy/40">
              sísí v1.0
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Divider() {
  return <div className="mx-[24px] h-px bg-journey-navy/10" />;
}

function SettingRow({
  icon,
  label,
  hint,
  disabled,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between px-[24px] py-[14px] ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3 text-journey-navy">
        {icon}
        <span className="font-sentient text-[15px]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {hint && (
          <span className="font-sentient italic text-[12px] text-journey-navy/40">
            {hint}
          </span>
        )}
        {children}
      </div>
    </div>
  );
}

function LinkRow({
  href,
  onClose,
  children,
}: {
  href: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center justify-between px-[24px] py-[14px] hover:bg-journey-navy/5 transition-colors"
    >
      <span className="font-sentient text-[15px] text-journey-navy">
        {children}
      </span>
      <span className="text-journey-navy/40">›</span>
    </Link>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      className={`relative h-[26px] w-[46px] rounded-full transition-colors ${
        on ? "bg-journey-purple" : "bg-journey-navy/20"
      }`}
    >
      <motion.div
        animate={{ x: on ? 22 : 2 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-sm"
      />
    </button>
  );
}
