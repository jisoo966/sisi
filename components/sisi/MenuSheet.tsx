"use client";

import { haptic, hapticsEnabled, hapticsSupported, setHapticsEnabled } from "@/lib/haptics";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FocusPaper, IconChevronRight, IconMusic, SecondaryButton } from "@/components/ds";
import { WeatherSettingRow } from "@/components/sisi/weather/WeatherSetting";
import { createClient } from "@/lib/supabase/client";

/**
 * MenuSheet — account & settings on the shared FocusPaper
 * (design system: rows in Sentient, meta in Inter, one secondary action).
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
  // gentle vibration for a few meaningful moments (lib/haptics)
  const [vibOn, setVibOn] = useState(true);
  const [vibSupported, setVibSupported] = useState(true);
  useEffect(() => {
    setVibOn(hapticsEnabled());
    setVibSupported(hapticsSupported());
  }, []);

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

  // Music state — BackgroundMusic is the source of truth for whether audio
  // is ACTUALLY playing (autoplay is usually blocked until a user gesture,
  // so localStorage intent alone doesn't reflect reality). Seed from
  // localStorage for the initial paint, then let BackgroundMusic's
  // "sisi:music-state" broadcast correct it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sisi-music-on");
    setMusicOn(saved !== "off");
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ on: boolean }>).detail;
      setMusicOn(detail.on);
    }
    window.addEventListener("sisi:music-state", handler);
    return () => window.removeEventListener("sisi:music-state", handler);
  }, [open]);

  function toggleMusic() {
    const next = !musicOn;
    localStorage.setItem("sisi-music-on", next ? "on" : "off");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sisi:music-toggle", { detail: { on: next } }),
      );
    }
    // Don't optimistically setMusicOn(next) here — wait for BackgroundMusic's
    // "sisi:music-state" event, which reflects whether play() actually
    // succeeded (it can still be blocked without a fresh user gesture).
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/");
  }

  return (
    <FocusPaper open={open} onClose={onClose} title="Menu" titleId="menu-title" closeLabel="Close menu" className="menu-focus">
      {(name || email) && (
        <div className="menu-profile">
          <p className="t-card-title" style={{ margin: 0 }}>{name || "Friend"}</p>
          {email && <p className="t-meta" style={{ margin: "4px 0 0", color: "var(--ink-60)" }}>{email}</p>}
        </div>
      )}
      <nav className="menu-list" aria-label="Menu">
        <button type="button" role="switch" aria-checked={musicOn} className="menu-row" onClick={toggleMusic}>
          <span className="menu-row-icon"><IconMusic size={20} /></span>
          <span className="menu-row-label">Ambient music</span>
          <Toggle on={musicOn} />
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={vibOn && vibSupported}
          disabled={!vibSupported}
          className="menu-row"
          onClick={() => {
            const next = !vibOn;
            setHapticsEnabled(next);
            setVibOn(next);
            if (next) haptic("select");
          }}
        >
          <span className="menu-row-label">
            Vibration
            {!vibSupported && <span className="menu-row-sub">Not available on this device</span>}
          </span>
          <Toggle on={vibOn && vibSupported} />
        </button>
        <WeatherSettingRow />
        <Link href="/privacy" onClick={onClose} className="menu-row">
          <span className="menu-row-label">Privacy policy</span>
          <IconChevronRight size={18} />
        </Link>
        <Link href="/terms" onClick={onClose} className="menu-row">
          <span className="menu-row-label">Terms of service</span>
          <IconChevronRight size={18} />
        </Link>
      </nav>
      <div className="ds-actions">
        <SecondaryButton block onClick={signOut}>Sign out</SecondaryButton>
      </div>
      <p className="t-helper menu-version">Sísí v1.0</p>
      <style jsx global>{`
        .menu-profile { padding: 4px 0 16px; border-bottom: 1px solid var(--ink-08); margin-bottom: 4px; }
        .menu-list { display: flex; flex-direction: column; }
        .menu-row {
          display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px; padding: 0 2px;
          border: 0; border-bottom: 1px solid var(--ink-08); background: none; color: var(--sisi-ink);
          font-family: var(--font-editorial); font-size: var(--text-dialogue); text-align: left; text-decoration: none; cursor: pointer;
        }
        .menu-row-icon { display: inline-flex; color: var(--ink-80); }
        .menu-row-label { flex: 1; }
        .menu-row-sub { display: block; font-family: var(--font-ui); font-size: var(--text-meta); color: var(--ink-60); }
        .menu-row:disabled { cursor: default; opacity: 0.7; }
        .menu-version { margin: 16px 0 0; text-align: center; color: var(--ink-60); }
        .menu-toggle { position: relative; flex: none; width: 44px; height: 26px; border-radius: 999px; background: var(--ink-14); transition: background var(--motion-instant) ease; }
        .menu-toggle.is-on { background: var(--sisi-blue); }
        .menu-toggle-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--sisi-paper); box-shadow: 0 1px 2px rgba(16, 45, 50, 0.2); transition: transform var(--motion-bubble) var(--ease-sisi); }
        .menu-toggle.is-on .menu-toggle-knob { transform: translateX(18px); }
      `}</style>
    </FocusPaper>
  );
}

/** On/off switch — selected state uses Sísí Blue */
function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`menu-toggle${on ? " is-on" : ""}`} aria-hidden>
      <span className="menu-toggle-knob" />
    </span>
  );
}
