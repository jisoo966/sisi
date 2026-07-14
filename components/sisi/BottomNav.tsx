"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * BottomNav — 모든 tab 페이지에서 사용되는 공통 nav.
 *
 * 4 tabs: home / gallery / messages / my stars
 * 자동 activeTab 감지 (pathname 기반)
 * Light/dark theme 지원
 * 모든 페이지에서 *동일한 위치·간격·크기*로 렌더
 */

type Theme = "light" | "dark";

const TABS = [
  { href: "/journey", label: "home", icon: HomeIcon },
  { href: "/gallery", label: "gallery", icon: GalleryIcon },
  { href: "/messages", label: "messages", icon: MessagesIcon },
  { href: "/my-stars", label: "my stars", icon: StarIcon },
];

export function BottomNav({ theme = "light" }: { theme?: Theme }) {
  const pathname = usePathname();
  const isDark = theme === "dark";

  return (
    <nav
      className={`fixed bottom-[30px] left-[24px] right-[24px] z-50 flex items-center rounded-[25px] backdrop-blur-md px-[4px] py-[4px] h-[50px] shadow-lg ${
        isDark
          ? "bg-white/10 border border-white/15"
          : "bg-white/60 border border-white/60"
      }`}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        // pathname이 tab.href로 시작하면 active (drill-down에서도 유지)
        const isActive =
          pathname === tab.href ||
          (tab.href !== "/journey" && pathname.startsWith(tab.href + "/"));

        return (
          <NavItem
            key={tab.href}
            href={tab.href}
            label={tab.label}
            active={isActive}
            isDark={isDark}
          >
            <Icon />
          </NavItem>
        );
      })}
    </nav>
  );
}

/**
 * NavItem — 모든 탭 flex-1로 동일한 슬롯 크기.
 * Active는 슬롯 안에서만 pill fill (spacing 균일 유지).
 */
function NavItem({
  href,
  label,
  active,
  isDark,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  isDark: boolean;
  children: React.ReactNode;
}) {
  const activeBg = isDark
    ? "rgba(255, 255, 255, 0.2)"
    : "rgba(255, 255, 255, 0.85)";
  const activeColor = isDark ? "rgb(255, 255, 255)" : "rgb(31, 42, 68)";
  const inactiveColor = isDark ? "text-white/70" : "text-journey-navy/70";
  const inactiveHover = isDark ? "hover:text-white" : "hover:text-journey-navy";

  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex flex-1 items-center justify-center h-[41px] rounded-[20px] mx-[1px] transition-colors ${
        active ? "shadow-sm" : `${inactiveColor} ${inactiveHover}`
      }`}
      style={
        active
          ? { background: activeBg, color: activeColor }
          : undefined
      }
    >
      {children}
    </Link>
  );
}

// ─── Icons ───────────────────────────────

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12L12 3l9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}
