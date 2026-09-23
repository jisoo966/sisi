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
import { ForegroundClusters } from "@/components/sisi/journey-v2/ForegroundClusters";
import { CloudDrift } from "@/components/sisi/journey-v2/CloudDrift";
import { LAYER_SPEED, worldClock } from "@/lib/worldMotion";
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
 * Layered parallax scene — Journey world.
 *
 * Every asset is a transparent PNG shipped by the artist with real alpha.
 * We never recolor, regenerate or merge them. Depth comes only from layout,
 * scale, opacity, layering, speed (and a CSS atmosphere filter on distant
 * layers). Target composition: ~70% open sky, ~30% landscape.
 *
 * Motion: one shared world clock (lib/worldMotion.ts), time-based px/s,
 * BASE_GROUND_SPEED = 32. Layer stack (back → front), each a SEPARATE asset:
 *   Fixed Sky          0 px/s     journey-sky-fixed.png, position:fixed
 *   Small clouds       1.5–2      single clouds, high, sparse
 *   Large clouds       2.5–3.5    2–3 visible max, long empty stretches
 *   Far silhouettes    7          tree-2 / tree-4, faint (62%), bluish
 *   Midground veg      13.5       behind the companion, lighter/softer
 *   Walking ground     32         dense meadow, mostly BELOW the path
 *   Walking path       32         SAME source value as the ground (locked)
 *   Companion          0          --companion-x (37%), paws on the path centre
 *   Foreground grass   42–48      single clumps every 4–9s of walking
 *   Foreground tree    50–58      tree-1, every 12–22s of walking
 *   Interface          → UILayer
 */
const PARALLAX_LAYERS = {
  skyFixed: "/V2/parallax/journey-sky-fixed.png",
  midgroundVegetation: "/V2/parallax/journey-midground-vegetation.png",
  walkingGround: "/V2/parallax/journey-walking-ground.png",
  walkingPath: "/V2/parallax/journey-walking-path.png",
};

/** Single clouds cut (pixels untouched) from slow-clouds.png. */
const CLOUDS = [1, 2, 3, 4, 5, 6].map((n) => ({
  src: `/V2/parallax/clouds/cloud-${n}.png`,
}));

/**
 * Foreground grass clumps cut (pixels untouched) from
 * journey-foreground-grass.png. `tall` clumps are the rare ones allowed to
 * reach the companion's lower body; the rest only cover the paws.
 */
const FOREGROUND_GRASS_CLUSTERS = [
  { src: "/V2/parallax/foreground-grass/cluster-1.png" },
  { src: "/V2/parallax/foreground-grass/cluster-2.png" },
  { src: "/V2/parallax/foreground-grass/cluster-3.png", tall: true },
  { src: "/V2/parallax/foreground-grass/cluster-4.png" },
  { src: "/V2/parallax/foreground-grass/cluster-5.png", tall: true },
  { src: "/V2/parallax/foreground-grass/cluster-6.png" },
];

/**
 * Trees — each tree has exactly ONE depth role (never the companion's plane):
 *   midground (behind, small, faint)  → tree-2, tree-4
 *   foreground (in front, big, dark) → tree-1
 * tree-3-night.png is reserved for the celestial / night phase.
 */
const MIDGROUND_TREE_SOURCES = [
  "/V2/parallax/trees/tree-2.png",
  "/V2/parallax/trees/tree-4.png",
];
const FOREGROUND_TREE_SOURCES = ["/V2/parallax/trees/tree-1.png"];

/**
 * Walking path (journey-walking-path.png, 2048×768, transparent).
 * Rendered at 40% of the stage height, natural aspect (never stretched).
 * Its band runs from row 355 to 464; the band's vertical CENTER (row 409.5)
 * is 46.68% above the image bottom → shifting by 0.4668 × 40% = 18.67% puts
 * the centre of the path exactly on --walking-baseline (where the paws are).
 * Band is ~5.7% of the stage tall: ±2.84% around the baseline.
 */
const PATH_HEIGHT_PCT = 0.4;
const PATH_BOTTOM = "calc(var(--walking-baseline) - 18.67%)";

/**
 * Dense meadow (walking ground) sits BELOW the path: its grass line
 * (26.95% above its bottom edge) goes 1% under the baseline, so its grass
 * tips tuck behind the path's lower edge and most of the meadow is below.
 */
const GROUND_BOTTOM = "calc(var(--walking-baseline) - 1% - 26.95%)";

/**
 * Foreground tree placement: tree-1's canopy spans the top ~75% of the
 * image and its trunk the bottom ~22%. At 66% stage height with its base at
 * 22%, the companion's body lines up with the TRUNK, so a passing tree
 * covers only ~10–25% of the companion, briefly.
 */
const FG_TREE_HEIGHT_PCT = 0.66;
const FG_TREE_BASE = "22%";

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
 *         <WalkingCat>                   companion, driven by the world clock
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
  usePageBg(isWalking ? "#4384e3" : "#0d1620");

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

  // Drive the shared world clock: ease in on arrival (0 → 32px/s over 1.2s),
  // ease out when the chat opens or the camera looks up at the star.
  useEffect(() => {
    worldClock().setWalking(!worldPaused);
  }, [worldPaused]);
  useEffect(() => () => worldClock().reset(), []);

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
        {/* 1. FIXED SKY — position:fixed, covers the viewport, never moves
            (not horizontally, not during the look-up). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={PARALLAX_LAYERS.skyFixed}
          alt=""
          aria-hidden
          draggable={false}
          className="journey-sky-fixed"
        />

        {/* Vertical sky for the Star look-up only. Invisible while walking;
            fades in as the camera starts looking up (see globals.css). */}
        <div className="journey-sky-group">
          <SkyTrack />
        </div>

        {/* Landscape group — drops off-screen bottom when entering star-view. */}
        <div className="journey-landscape-group">
          {/* 2–3. Clouds — small distant (1.5–2px/s) + larger (2.5–3.5px/s) */}
          <CloudDrift clouds={CLOUDS} zIndex={1} />

          {/* 4. Far silhouettes — faint, bluish trees at 7px/s */}
          <ForegroundOccluder
            sources={MIDGROUND_TREE_SOURCES}
            speedMin={LAYER_SPEED.farVegetation - 0.6}
            speedMax={LAYER_SPEED.farVegetation + 0.6}
            intervalMin={14}
            intervalMax={30}
            initialDelay={4}
            heightPct={0.22}
            groundBase="calc(var(--walking-baseline) + 2%)"
            opacity={0.62}
            filter="saturate(0.7) brightness(1.2) contrast(0.8)"
            zIndex={2}
          />

          {/* 5. Midground vegetation — 13.5px/s, behind the companion,
              lighter and softer than the main ground. */}
          <ParallaxLayer
            src={PARALLAX_LAYERS.midgroundVegetation}
            speed={LAYER_SPEED.midgroundVegetation}
            zIndex={2}
            align="bottom"
            heightPct={0.18}
            bottom="calc(var(--walking-baseline) - 1.5%)"
            opacity={0.8}
            filter="saturate(0.75) brightness(1.15) contrast(0.85)"
          />

          {/* 6. Walking ground — 32px/s, natural aspect, mostly below the
              path; its grass tips tuck behind the path's lower edge. */}
          <ParallaxLayer
            src={PARALLAX_LAYERS.walkingGround}
            speed={LAYER_SPEED.walkingGround}
            zIndex={3}
            align="bottom"
            heightPct={1}
            bottom={GROUND_BOTTOM}
            seamOverlap={2}
          />

          {/* 7. Walking path — exactly 32px/s. Ground and path both derive
              their transform from the same shared groundDistance value. */}
          <ParallaxLayer
            src={PARALLAX_LAYERS.walkingPath}
            speed={LAYER_SPEED.walkingPath}
            zIndex={4}
            align="bottom"
            heightPct={PATH_HEIGHT_PCT}
            bottom={PATH_BOTTOM}
            seamOverlap={2}
          />

          {/* 8. Companion — 0px/s, paws on the path centre */}
          <WalkingCat onTap={isWalking ? () => setChatOpen(true) : undefined} />

          {/* 9. Foreground grass — 42–48px/s, one clump every 4–9s */}
          <ForegroundClusters
            clusters={FOREGROUND_GRASS_CLUSTERS}
            speedMin={LAYER_SPEED.foregroundGrass[0]}
            speedMax={LAYER_SPEED.foregroundGrass[1]}
            intervalMin={4}
            intervalMax={9}
            zIndex={7}
          />

          {/* 10. Foreground tree — 50–58px/s, every 12–22s of walking.
              Enters whole from the right, exits whole on the left. */}
          <ForegroundOccluder
            sources={FOREGROUND_TREE_SOURCES}
            speedMin={LAYER_SPEED.foregroundTree[0]}
            speedMax={LAYER_SPEED.foregroundTree[1]}
            intervalMin={12}
            intervalMax={22}
            initialDelay={9}
            heightPct={FG_TREE_HEIGHT_PCT}
            groundBase={FG_TREE_BASE}
            filter="brightness(0.78) contrast(1.15)"
            zIndex={8}
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
