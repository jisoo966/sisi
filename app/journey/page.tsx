"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  JourneyStage,
  WorldLayer,
  UILayer,
} from "@/components/sisi/journey-v2/JourneyStage";
import { ParallaxLayer } from "@/components/sisi/journey-v2/ParallaxLayer";
import { ForegroundOccluder } from "@/components/sisi/journey-v2/ForegroundOccluder";
// LEGACY — kept on disk for future use / recoverability:
//   LandscapeTrack, PanoramaBackground — earlier single-layer scrollers.
// import { LandscapeTrack } from "@/components/sisi/journey-v2/LandscapeTrack";
// import { PanoramaBackground } from "@/components/sisi/journey-v2/PanoramaBackground";
import { WalkingCat } from "@/components/sisi/journey-v2/WalkingCat";
import { SkyStarV2 } from "@/components/sisi/journey-v2/SkyStarV2";
import { SkyTrack } from "@/components/sisi/journey-v2/SkyTrack";
// LEGACY — SkyJourney (gradient-based placeholder sky) preserved for revert.
// import { SkyJourney } from "@/components/sisi/journey-v2/SkyJourney";
import { StarView } from "@/components/sisi/journey-v2/StarView";
import { JourneyHeader } from "@/components/sisi/journey-v2/JourneyHeader";
import { CaptureFAB } from "@/components/sisi/journey-v2/CaptureFAB";
import { LandscapeGate } from "@/components/sisi/journey-v2/LandscapeGate";
import { BottomNavV2 } from "@/components/sisi/journey-v2/BottomNavV2";
import { CompanionSheet } from "@/components/sisi/journey-v2/CompanionSheet";

import { MenuSheet } from "@/components/sisi/MenuSheet";
import { PostcardOptionsSheet } from "@/components/sisi/PostcardOptionsSheet";
import { GuestLoginNudge } from "@/components/sisi/GuestLoginNudge";
import { AngelMessageCard } from "@/components/sisi/AngelMessageCard";

import { usePageBg } from "@/lib/usePageBg";
import { useJourneyPhase } from "@/lib/useJourneyPhase";
import { createClient } from "@/lib/supabase/client";
import { ensureTodaysMessage, type AngelMessage } from "@/lib/angelMessages";
import { loadStars, type Star } from "@/lib/myStars";

// LEGACY — Journey v1 (video world + path-following fox + BottomNav).
// Preserved intentionally so the old world can be restored if v2 needs revert.
// See git history + JourneyScene.tsx / WalkingFoxRear.tsx / BottomNav.tsx.

/**
 * Layered parallax scene sources — Journey world.
 *
 * Every asset is a transparent PNG shipped by the artist with real alpha.
 * We never recolor, flatten, or add a background to them. Slower ratios read
 * as "far away"; faster ratios read as "close to camera".
 *
 * Layer stack (bottom → top):
 *   Sky            → SkyTrack (separate sky-group, vertical look-up asset)
 *   SlowClouds     ratio 0.08  (very slow drift, upper sky region)
 *   MidgroundVeg   ratio 0.25  (distant blue bushes / small trees)
 *   MainMeadow     ratio 0.50  (grass horizon with wildflowers)
 *   Companion      stationary at --companion-x (38% viewport width) + bob
 *   ForegroundTree ratio 1.15  (fast-scrolling trees, briefly occlude cat)
 *   Interface      → UILayer
 */
const PARALLAX_LAYERS = {
  slowClouds: "/V2/parallax/slow-clouds.png",
  midgroundVegetation: "/V2/parallax/midground-vegetation.png",
  mainMeadow: "/V2/parallax/main-meadow.png",
};

/**
 * Individual tree PNGs — used by the ForegroundOccluder to spawn one at a
 * time at random intervals (cinematic "we just walked past a tree" beats),
 * not a continuous strip. Each asset is a single tall transparent tree.
 *
 * tree-3-night.png (dark navy glow variant) is reserved for the celestial /
 * night phase — its baked-in ambient darkness reads correctly against the
 * star sky but would look muddy on the daytime blue.
 */
const FOREGROUND_TREE_SOURCES = [
  "/V2/parallax/trees/tree-1.png",
  "/V2/parallax/trees/tree-2.png",
  "/V2/parallax/trees/tree-4.png",
];

/** 시간대별 인사 */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** "Jul 14, 2026" 포맷 */
function formatDate(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * JourneyPage v2 — one persistent world with a cinematic look-up transition.
 *
 * Layer architecture:
 *   <JourneyStage phaseClass>            responsive viewport root + phase class
 *     <WorldLayer>                       everything that moves
 *       <sky-group>                      translates up/down between phases
 *         <SkyJourney>                   250dvh tall vertical sky asset
 *       <landscape-group>                translates down in star-view
 *         <PanoramaBackground paused>    wide illustrated environment, drifts
 *         <WalkingCat paused>            fox video with alpha, feet on baseline
 *       <SkyStarV2 phase onTap>          moves upper-right ↔ center
 *     <UILayer>                          fixed above world, does not move
 *       <JourneyHeader>                  greeting + bell + menu (walking only)
 *       <CaptureFAB>                     camera (walking only)
 *       <StarView>                       celestial content (star-view only)
 *
 * All positions and timings live in globals.css (--sky-height, --*-translate-*,
 * --look-up-duration). Tune globally without touching component code.
 */
export default function JourneyPage() {
  // Journey world state machine (walking ↔ star-view).
  const { phase, isWalking, isStarView, enterStarView, backToWalking, stageClass } =
    useJourneyPhase();

  // Match the safe area above the panorama with the current phase's sky tone.
  // Walking phase = day cream/butter; star-view = celestial black.
  usePageBg(isWalking ? "#F5E9C8" : "#0d1620");

  // Auth-derived name (Supabase profile or guest localStorage).
  const [name, setName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [postcardSheetOpen, setPostcardSheetOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [hasNudge, setHasNudge] = useState(false);
  const [angelMessage, setAngelMessage] = useState<AngelMessage | null>(null);
  const [featuredStar, setFeaturedStar] = useState<Star | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  // World "paused" derives from ANY of: not walking phase, or chat sheet open.
  // Cat + landscape freeze together in either case.
  const worldPaused = !isWalking || chatOpen;

  // Date/greeting — mount only to avoid SSR/client timezone hydration flash.
  const [greeting, setGreeting] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  useEffect(() => {
    setGreeting(getGreeting());
    setDateStr(formatDate());
  }, []);

  // Bell dot badge — reappears if the guest saw the nudge previously.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return;
      const seen = localStorage.getItem("sisi:guest-nudge-seen") === "true";
      setHasNudge(seen);
    })();
  }, []);

  // Angel message — today's letter if unread.
  useEffect(() => {
    ensureTodaysMessage().then((msg) => {
      if (msg && !msg.read_at) setAngelMessage(msg);
    });
  }, []);

  // Featured star — most recent (walk-toward symbol in the sky).
  useEffect(() => {
    loadStars().then((stars) => {
      if (stars.length > 0) setFeaturedStar(stars[0]);
    });
  }, []);

  // Name from Supabase profile or guest storage.
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.display_name) setName(profile.display_name);
        } else {
          const guestName = localStorage.getItem("sisi:guest-name");
          if (guestName) setName(guestName);
        }
      } catch {
        // fail silent — the app still works without a name.
      }
    })();
  }, []);

  return (
    <JourneyStage phaseClass={stageClass}>
      {/* ── WORLD LAYER — sky + landscape groups (moved by phase class) ── */}
      <WorldLayer>
        {/* Sky group — three sliced webps stacked as one continuous artwork.
            Height derives from the stacked slices; group translates as a
            single unit driven by phase-star-view CSS in globals.css. */}
        <div className="journey-sky-group">
          <SkyTrack />
        </div>

        {/* Landscape group — drops off-screen bottom when entering star-view.
            The horizontal LandscapeTrack lives INSIDE this vertical group so
            the two transforms compose (group translateY + track translateX). */}
        <div className="journey-landscape-group">
          {/* ── LAYER STACK (bottom → top) ──────────────────────
           *  1. Sky            — handled by SkyTrack (sky-group above)
           *  2. SlowClouds     ratio 0.08
           *  3. MidgroundVeg   ratio 0.25
           *  4. MainMeadow     ratio 0.50
           *  5. Companion      anchored at 38% viewport width + walking bob
           *  6. ForegroundTree ratio 1.15  (sparse clusters → occasional occlusion)
           *  7. Interface      handled by UILayer
           * All layers pause together via `worldPaused`. */}

          {/* 2. Slow clouds — top of sky, barely moves */}
          <ParallaxLayer
            src={PARALLAX_LAYERS.slowClouds}
            ratio={0.08}
            paused={worldPaused}
            zIndex={1}
            align="top"
            heightPct={0.45}   /* only upper sky region */
            speedVariation={0.10}
          />

          {/* 3. Midground vegetation — distant blue bushes near horizon */}
          <ParallaxLayer
            src={PARALLAX_LAYERS.midgroundVegetation}
            ratio={0.25}
            paused={worldPaused}
            zIndex={2}
            align="bottom"
            heightPct={0.32}   /* only lower-middle band */
          />

          {/* 4. Main meadow — grass horizon + sky (opaque base of the world) */}
          <ParallaxLayer
            src={PARALLAX_LAYERS.mainMeadow}
            ratio={0.50}
            paused={worldPaused}
            zIndex={3}
            align="bottom"
            heightPct={1}      /* fills viewport */
          />

          {/* 5. Companion — stationary at --companion-x + walking bob */}
          <WalkingCat
            paused={worldPaused}
            onTap={isWalking ? () => setChatOpen(true) : undefined}
          />

          {/* Occasional trees — planted BEHIND the cat, rooted at the same
              grass horizon the cat walks on (--walking-baseline) so their
              trunks emerge from the ground rather than growing up from the
              bottom of the screen.
              Depth:
                ratio 0.35  → clearly slower than the main meadow (0.50),
                so trees read as "farther back than the cat".
                zIndex 2    → renders BEHIND cat (z 5) and behind the main
                meadow silhouette (z 3); above sky + midground vegetation.
              Sizing:
                heightPct 0.45 → tree canopy above the cat but not looming.
                                  Feels like a normal tree we walk past, not a
                                  wall of foliage in front of the camera. */}
          <ForegroundOccluder
            sources={FOREGROUND_TREE_SOURCES}
            ratio={0.35}
            paused={worldPaused}
            intervalMin={14}
            intervalMax={26}
            initialDelayMs={5000}
            heightPct={0.45}
            groundBase="var(--walking-baseline)"
            zIndex={2}
          />
        </div>

        {/* Current star — anchored to viewport, not to a group. Its position
            transitions between walking (upper-right) and star-view (center). */}
        {featuredStar && (
          <SkyStarV2
            star={featuredStar}
            phase={phase}
            onTap={isWalking ? enterStarView : backToWalking}
          />
        )}
      </WorldLayer>

      {/* ── UI LAYER — stationary; children swap by phase ── */}
      <UILayer>
        {/* Header shown in walking. Fades out in star-view. */}
        {isWalking && (
          <JourneyHeader
            dateStr={dateStr}
            greeting={greeting}
            name={name}
            isDark={false}
            hasNudge={hasNudge}
            onBellClick={() => setNudgeOpen(true)}
            onMenuClick={() => setMenuOpen(true)}
          />
        )}

        {/* Capture only in walking phase */}
        {isWalking && (
          <CaptureFAB onClick={() => setPostcardSheetOpen(true)} />
        )}

        {/* Three-tab nav — only in walking phase (star-view is immersive) */}
        {isWalking && <BottomNavV2 theme="light" />}

        {/* Star view UI only in star-view phase */}
        <AnimatePresence>
          {isStarView && featuredStar && (
            <StarView
              key={featuredStar.id}
              star={featuredStar}
              onBack={backToWalking}
            />
          )}
        </AnimatePresence>
      </UILayer>

      {/* Companion conversation — cat tap opens this. World pauses beneath. */}
      <CompanionSheet open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Contextual overlays — sheets, cards */}
      <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />
      <PostcardOptionsSheet
        open={postcardSheetOpen}
        onClose={() => setPostcardSheetOpen(false)}
      />
      <GuestLoginNudge open={nudgeOpen} onClose={() => setNudgeOpen(false)} />
      <AngelMessageCard
        message={angelMessage}
        onRead={() => setAngelMessage(null)}
      />

      {/* Portrait-first: minimal landscape message via CSS-only @media. */}
      <LandscapeGate />
    </JourneyStage>
  );
}
