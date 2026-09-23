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
// SkyTrack (tall vertical sky) is no longer used by the ascent; kept on disk.
// import { SkyTrack } from "@/components/sisi/journey-v2/SkyTrack";
import { NightStar } from "@/components/sisi/journey-v2/NightStar";
// LEGACY — SkyJourney (gradient-based placeholder sky) preserved for revert.
// import { SkyJourney } from "@/components/sisi/journey-v2/SkyJourney";
import { StarView } from "@/components/sisi/journey-v2/StarView";
import { StarTrail } from "@/components/sisi/journey-v2/StarTrail";
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
import { useStarAscent } from "@/lib/useStarAscent";
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

/**
 * Journey → Stars camera move assets.
 *   nightSky     — the star world (sky-star.webp, unchanged)
 *   front/rear   — cloud banks cut from the existing painted cloud bands of
 *                  sky-vertical.png and the tall "sky journey" cloud image:
 *                  same pixels, sky colour keyed to transparency so the
 *                  clouds can pass in front of other layers. Replace with
 *                  artist-painted transparent banks at the same paths.
 */
const ASCENT_LAYERS = {
  nightSky: "/V2/ascent/night-sky.webp",
  frontClouds: "/V2/ascent/cloud-bank-front.png",
  rearClouds: "/V2/ascent/cloud-bank-rear.png",
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

/** Shown in the sky when the user has not made a wish yet. */
const PLACEHOLDER_STAR: Star = {
  id: "waiting",
  wish: "",
  timeframe: "someday",
  x: 0,
  y: 0,
  size: "md",
  createdAt: new Date(0).toISOString(),
};

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
 * JourneyPage v2 — one persistent world.
 *
 * World (back → front), each a separate depth group moved by
 * lib/useStarAscent.ts during the Journey → Stars camera move:
 *   .jw-night         star world (night sky + NightStar)          0.15×
 *   .jw-day           day sky texture, small clouds, SkyStarV2     0.15×
 *   .jw-clouds-rear   rear cloud bank                              0.70×
 *   .jw-hills         far silhouettes + midground vegetation       0.35×
 *   .jw-meadow        ground + path (locked) + companion           0.75×
 *   .jw-fore          foreground grass + trees                     1.15×
 *   StarTrail         fox → star light trail (screen space)
 *   .jw-clouds-front  front cloud bank                             1.25×
 * UI: header / camera / nav (fade out 300ms), StarView (postcard).
 */
export default function JourneyPage() {
  // Journey world state machine (walking ↔ star-view).
  const { isWalking, isStarView, enterStarView, backToWalking, stageClass } =
    useJourneyPhase();


  // Auth-derived name (Supabase profile or guest localStorage).
  const [name, setName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [postcardSheetOpen, setPostcardSheetOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [hasNudge, setHasNudge] = useState(false);
  const [angelMessage, setAngelMessage] = useState<AngelMessage | null>(null);
  const [featuredStar, setFeaturedStar] = useState<Star | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  // Stars load async; until then (or if none exist) show a waiting star.
  const [starsLoaded, setStarsLoaded] = useState(false);
  const skyStar: Star | null = featuredStar ?? (starsLoaded ? PLACEHOLDER_STAR : null);
  const isPlaceholderStar = !featuredStar;

  // Journey → Stars camera move (see lib/useStarAscent.ts). `busy` locks
  // input from the tap until the arrival (or the return) has settled.
  const { busy, env, starRevealed } = useStarAscent(isStarView);
  const goToStars = () => {
    if (busy || !isWalking) return;
    enterStarView();
  };
  const backToMeadow = () => {
    if (busy || !isStarView) return;
    backToWalking();
  };

  // Safe-area tint follows the environment actually on screen.
  usePageBg(env === "night" ? "#03070a" : "#4384e3");

  // The world walks only in the meadow, with no sheet open and no camera
  // move in progress (after a return, walking resumes once we've landed).
  const worldPaused = !isWalking || chatOpen || busy;

  // Drive the shared world clock: ease in (0 → 32px/s over 1.2s); when the
  // camera is about to look up, decelerate over 450ms.
  useEffect(() => {
    worldClock().setWalking(!worldPaused, isStarView ? 450 : undefined);
  }, [worldPaused, isStarView]);
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
    loadStars()
      .then((stars) => {
        if (stars.length > 0) setFeaturedStar(stars[0]);
      })
      .finally(() => setStarsLoaded(true));
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
      {/* ── WORLD LAYER — separate depth groups; each moves at its own
          parallax rate during the Journey → Stars camera move. ── */}
      <WorldLayer>
        {/* Star world (behind everything; revealed during full cloud cover).
            Distant-sky rate 0.15×. */}
        <div className="jw-group jw-night" aria-hidden={env !== "night"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASCENT_LAYERS.nightSky} alt="" draggable={false} className="jw-night-sky" />
          <NightStar revealed={starRevealed} />
        </div>

        {/* 1. Distant sky (day) — sky texture, small clouds, Current Star.
            Horizontally static; 0.15× during the ascent. */}
        <div className="jw-group jw-day">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PARALLAX_LAYERS.skyFixed}
            alt=""
            aria-hidden
            draggable={false}
            className="journey-sky-fixed"
          />
          <CloudDrift clouds={CLOUDS} zIndex={1} />
          {skyStar && (
            <SkyStarV2
              star={skyStar}
              selected={isStarView}
              disabled={busy || !isWalking}
              onTap={goToStars}
            />
          )}
        </div>

        {/* Rear clouds — 0.70×, above the far sky, behind the land. */}
        <div className="jw-group jw-clouds-rear" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASCENT_LAYERS.rearClouds} alt="" draggable={false} className="jw-cloud-bank jw-cloud-bank--rear" />
        </div>

        {/* 2. Distant hills — far silhouettes (7px/s) + midground vegetation
            (13.5px/s). 0.35× during the ascent. */}
        <div className="jw-group jw-hills">
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
            zIndex={1}
          />
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
        </div>

        {/* 3. Meadow — ground + path (locked, 32px/s) + companion. 0.75×
            during the ascent: the fox stays in the meadow and leaves
            through the bottom of the screen. */}
        <div className="jw-group jw-meadow">
          <ParallaxLayer
            src={PARALLAX_LAYERS.walkingGround}
            speed={LAYER_SPEED.walkingGround}
            zIndex={1}
            align="bottom"
            heightPct={1}
            bottom={GROUND_BOTTOM}
            seamOverlap={2}
          />
          <ParallaxLayer
            src={PARALLAX_LAYERS.walkingPath}
            speed={LAYER_SPEED.walkingPath}
            zIndex={2}
            align="bottom"
            heightPct={PATH_HEIGHT_PCT}
            bottom={PATH_BOTTOM}
            seamOverlap={2}
          />
          <WalkingCat
            onTap={isWalking && !busy ? () => setChatOpen(true) : undefined}
            lookingUp={isStarView}
          />
        </div>

        {/* 4. Foreground — grass clumps (42–48px/s) + trees (50–58px/s).
            1.15× during the ascent. */}
        <div className="jw-group jw-fore">
          <ForegroundClusters
            clusters={FOREGROUND_GRASS_CLUSTERS}
            speedMin={LAYER_SPEED.foregroundGrass[0]}
            speedMax={LAYER_SPEED.foregroundGrass[1]}
            intervalMin={4}
            intervalMax={9}
            zIndex={1}
          />
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
            zIndex={2}
          />
        </div>

        {/* Trail of light from the fox to its star (0.45–1.1s, before the
            camera moves). Screen-space. */}
        {isStarView && busy && <StarTrail />}

        {/* Front clouds — 1.25×, over everything in the world; they cover
            ~99% of the screen while the environment switches beneath. */}
        <div className="jw-group jw-clouds-front" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ASCENT_LAYERS.frontClouds} alt="" draggable={false} className="jw-cloud-bank jw-cloud-bank--front" />
        </div>
      </WorldLayer>

      {/* ── UI LAYER — stationary; children swap by phase ── */}
      <UILayer>
        {/* Journey UI — stays mounted; fades out over 300ms (0.5–0.8s into
            the ascent) and back in after the return lands. */}
        <div className={`journey-walk-ui${isWalking && !busy ? "" : " is-hidden"}`}>
          <JourneyHeader
            dateStr={dateStr}
            greeting={greeting}
            name={name}
            isDark={false}
            hasNudge={hasNudge}
            onBellClick={() => setNudgeOpen(true)}
            onMenuClick={() => setMenuOpen(true)}
          />
          <CaptureFAB onClick={() => setPostcardSheetOpen(true)} />
          <BottomNavV2 theme="light" onStarsSelect={goToStars} />
        </div>

        {/* Star view UI only in star-view phase */}
        <AnimatePresence>
          {isStarView && skyStar && (
            <StarView
              key={skyStar.id}
              star={skyStar}
              placeholder={isPlaceholderStar}
              onBack={backToMeadow}
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
