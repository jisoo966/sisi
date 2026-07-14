"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

/**
 * MenuSheet — CHANI 스타일 full-page overlay 메뉴.
 *   - 전체 화면 크림 배경
 *   - X 오른쪽 상단
 *   - 항목들 오른쪽 정렬, 큰 여백
 *   - Sentient Light 폰트
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
  const [musicOn, setMusicOn] = useState(true);

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

  // Music state load — default ON (off only if explicitly turned off)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sisi-music-on");
    setMusicOn(saved !== "off");
  }, [open]);

  function toggleMusic() {
    const next = !musicOn;
    setMusicOn(next);
    localStorage.setItem("sisi-music-on", next ? "on" : "off");
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
          className="fixed inset-0 z-[100] overflow-hidden bg-[#f7f2e3]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* X close — top right */}
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="absolute top-[52px] right-[24px] z-10 h-10 w-10 flex items-center justify-center text-journey-navy/80 hover:text-journey-navy transition"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Content — right-aligned list, generous vertical rhythm */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex min-h-screen flex-col justify-center px-[32px] pt-[100px] pb-[80px]"
          >
            {/* Profile — small top card feel */}
            {(name || email) && (
              <div className="text-right mb-[48px]">
                <p className="font-sentient text-[24px] text-journey-navy">
                  {name || "friend"}
                </p>
                {email && (
                  <p className="font-sentient italic text-[13px] text-journey-navy/50 mt-1">
                    {email}
                  </p>
                )}
              </div>
            )}

            {/* Menu items — right-aligned, big tap targets, big spacing */}
            <nav className="flex flex-col items-end gap-[28px]">
              <MenuItem onClick={toggleMusic}>
                <span className="flex items-center gap-3">
                  AMBIENT MUSIC
                  <span
                    className={`text-[13px] tracking-wider ${
                      musicOn ? "text-journey-navy/70" : "text-journey-navy/30"
                    }`}
                  >
                    {musicOn ? "ON" : "OFF"}
                  </span>
                </span>
              </MenuItem>

              <MenuLink href="/privacy" onClose={onClose}>
                PRIVACY POLICY
              </MenuLink>

              <MenuLink href="/terms" onClose={onClose}>
                TERMS OF SERVICE
              </MenuLink>

              <MenuItem onClick={signOut}>
                <span className="text-journey-oxblood">SIGN OUT</span>
              </MenuItem>
            </nav>

            {/* Footer */}
            <p className="text-right font-sentient italic text-[11px] text-journey-navy/40 mt-[48px]">
              sísí v1.0
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Menu item — right-aligned typography with tracking */
function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="font-sentient text-[20px] tracking-[0.1em] text-journey-navy hover:opacity-70 transition-opacity"
    >
      {children}
    </button>
  );
}

function MenuLink({
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
      className="font-sentient text-[20px] tracking-[0.1em] text-journey-navy hover:opacity-70 transition-opacity"
    >
      {children}
    </Link>
  );
}
