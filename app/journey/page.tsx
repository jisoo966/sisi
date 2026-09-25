"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearHandoff, handOff, readHandoff } from "@/lib/worldHandoff";
import { LOCAL_ONLY } from "@/lib/dataMode";
import { AnimatePresence } from "framer-motion";
import {
  JourneyStage,
  WorldLayer,
  UILayer,
} from "@/components/sisi/journey-v2/JourneyStage";
import { ParallaxLayer } from "@/components/sisi/journey-v2/ParallaxLayer";
// ForegroundOccluder / ForegroundClusters (earlier time-based spawners) stay
// on disk; the world now uses the distance-based PassingSprites.
import { PassingSprites } from "@/components/sisi/journey-v2/PassingSprites";
import { TimeOfDaySky } from "@/components/sisi/journey-v2/TimeOfDaySky";
import { FAR_TREES, FRONT_TREES, GRASS, TOD_GRADE } from "@/lib/worldArt";
import { useTimeOfDay } from "@/lib/timeOfDay";
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
// NightStar (single star) superseded by StarWorld; kept on disk.
import { StarWorld } from "@/components/sisi/journey-v2/StarWorld";
import { StarMemoryCard } from "@/components/sisi/journey-v2/StarMemoryCard";
import { PaperToast } from "@/components/sisi/journey-v2/PaperToast";
// LEGACY — SkyJourney (gradient-based placeholder sky) preserved for revert.
// import { SkyJourney } from "@/components/sisi/journey-v2/SkyJourney";
// StarView (auto-opening postcard) superseded by StarMemoryCard; kept on disk.
import { StarTrail } from "@/components/sisi/journey-v2/StarTrail";
import { JourneyHeader } from "@/components/sisi/journey-v2/JourneyHeader";
// CaptureFAB superseded by the quiet camera disc in JourneyHeader; kept on disk.
import { DailyPractice } from "@/components/sisi/journey-v2/DailyPractice";
import { SpendTimeCTA } from "@/components/sisi/journey-v2/SpendTimeCTA";
import { SatchelDrawer } from "@/components/sisi/journey-v2/SatchelDrawer";
import { MomentCapture } from "@/components/sisi/journey-v2/MomentCapture";
import { CreateStarFlow } from "@/components/sisi/journey-v2/CreateStarFlow";
import { EveningReflection, eveningDue } from "@/components/sisi/journey-v2/EveningReflection";
import { earnLight } from "@/lib/littleLights";
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
import { loadStars, type Star, restStar, walkingStars } from "@/lib/myStars";

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
  // Top (starry) part of sky-star.webp — its low-res painted clouds are left
  // out; the soft front cloud bank frames the bottom instead.
  nightSky: "/V2/ascent/night-sky-top.webp",
  frontClouds: "/V2/ascent/cloud-bank-front-v3.png", // versioned name: never served from an old cache
  rearClouds: "/V2/ascent/cloud-bank-rear-v3.png",
};

/** Single clouds cut (pixels untouched) from slow-clouds.png. */
const CLOUDS = [1, 2, 3, 4, 5, 6].map((n) => ({
  src: `/V2/parallax/clouds/cloud-${n}.png`,
}));


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
  // fallback only — lib/timeOfDay drives the live greeting
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
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
 *   .jw-night         Star World (night sky + StarWorld path)      0.15×
 *   .jw-day           day sky texture, small clouds, SkyStarV2     0.15×
 *   .jw-clouds-rear   rear cloud bank                              0.70×
 *   .jw-hills         far silhouettes + midground vegetation       0.35×
 *   .jw-meadow        ground + path (locked) + companion           0.75×
 *   .jw-fore          foreground grass + trees                     1.15×
 *   StarTrail         fox → star light trail (screen space)
 *   .jw-clouds-front  front cloud bank                             1.25×
 * UI: header / camera (meadow), nav (both worlds), StarMemoryCard (on tap).
 */
export default function JourneyPage() {
  // Journey world state machine (walking ↔ star-view).
  const { isWalking, isStarView, enterStarView, backToWalking, stageClass } =
    useJourneyPhase();
  const router = useRouter();
  // Morning / afternoon / evening — sky, grass grade and greeting.
  const tod = useTimeOfDay();

  // ── Journey ⇄ Moments (one world across two pages) ──
  // Arriving from Moments: start on the exact meadow frame Moments left, with
  // the Journey-only layers (path, foreground, sky star, header) fading in.
  const [arrival] = useState(() => {
    const h = readHandoff("journey");
    if (h) worldClock().setDistance(h.ground);
    return h;
  });
  const [quiet, setQuiet] = useState(!!arrival);
  const [handoffFx, setHandoffFx] = useState(!!arrival);
  useEffect(() => {
    if (!arrival) return;
    let id2 = 0;
    const id = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setQuiet(false));
    });
    const t = setTimeout(() => {
      clearHandoff();
      setHandoffFx(false);
    }, 1400);
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(id2);
      clearTimeout(t);
    };
  }, [arrival]);
  // Leaving for Moments: the world eases to a stop, Sísí finishes her step,
  // turns left, and Moments takes over from that same frame.
  // "moments": from the meadow (turn left). "moments-down": from the Star
  // World straight down through the Cloud Gate — the meadow is never shown.
  const [leavingTo, setLeavingTo] = useState<"moments" | "moments-down" | null>(null);
  const [catFacing, setCatFacing] = useState<"left" | "right">("right");
  const catWalking = useRef(false);
  const pendingMoments = useRef(false);


  // Auth-derived name (Supabase profile or guest localStorage).
  const [name, setName] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [postcardSheetOpen, setPostcardSheetOpen] = useState(false);
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [hasNudge, setHasNudge] = useState(false);
  const [angelMessage, setAngelMessage] = useState<AngelMessage | null>(null);
  const [allStars, setAllStars] = useState<Star[]>([]);
  // Resting stars leave the path (they live on in Moments).
  const pathStars = walkingStars(allStars);
  const featuredStar: Star | null = pathStars[0] ?? null;
  const [chatOpen, setChatOpen] = useState(false);
  // "Spend time with your Star" — the one daily practice panel.
  const [practiceOpen, setPracticeOpen] = useState(false);
  // Travel satchel — optional customization drawer.
  const [satchelOpen, setSatchelOpen] = useState(false);
  // Camera → keep a Moment or Sign.
  const [momentOpen, setMomentOpen] = useState(false);
  // Create a Star (+ Vision Postcard).
  const [createOpen, setCreateOpen] = useState(false);
  // Evening: SiSi pauses beneath the Star once, gently.
  const [eveningOpen, setEveningOpen] = useState(false);
  /** Any focused panel over the meadow (hides tools + tabs, pauses SiSi). */
  const panelOpen = practiceOpen || satchelOpen || momentOpen || eveningOpen || createOpen;
  // Meadow star tapped → view the Current Star once we arrive above.
  const [viewCurrentOnArrival, setViewCurrentOnArrival] = useState(false);
  // Little Light note shown in the meadow (e.g. after a meaningful talk).
  const [meadowToast, setMeadowToast] = useState<string | null>(null);
  // Stars load async; until then (or if none exist) show a waiting star.
  const [starsLoaded, setStarsLoaded] = useState(false);
  const skyStar: Star | null = featuredStar ?? (starsLoaded ? PLACEHOLDER_STAR : null);
  const isPlaceholderStar = !featuredStar;
  /** Stars in the Star World, newest first (a waiting star if none yet). */
  const worldStars: Star[] = pathStars.length > 0 ? pathStars : skyStar ? [skyStar] : [];

  // The star whose memory card is open in the Star World.
  const [openStar, setOpenStar] = useState<{ star: Star; at: { x: number; y: number } } | null>(null);
  // "Let this star rest": the star drifting off the path, and a paper note.
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const letStarRest = (star: Star) => {
    setOpenStar(null); // paper slides down, thread retracts (≈0.45s)
    void restStar(star.id);
    setTimeout(() => setLeavingId(star.id), 480);
    setTimeout(() => {
      const now = new Date().toISOString();
      setAllStars((list) => list.map((s) => (s.id === star.id ? { ...s, restedAt: now } : s)));
      setLeavingId(null);
      setToast("your star is resting in moments.");
    }, 480 + 1600);
    setTimeout(() => setToast(null), 480 + 1600 + 3200);
  };
  const starEdited = (star: Star) => {
    setAllStars((list) => list.map((s) => (s.id === star.id ? { ...s, wish: star.wish } : s)));
    setOpenStar((o) => (o && o.star.id === star.id ? { ...o, star: { ...o.star, wish: star.wish } } : o));
  };

  // Journey → Stars camera move (see lib/useStarAscent.ts). `busy` locks
  // input from the tap until the arrival (or the return) has settled.
  const { busy, env, starRevealed, landing, descendToGate } = useStarAscent(isStarView);
  const leavingRef = useRef(false);
  const goToStars = () => {
    if (busy || !isWalking) return;
    enterStarView();
  };

  // ── Sky Dock (the same tabs over the Star World, quieter) ──
  // One explicit lock for every camera move / route change: no duplicate
  // animations, no queued navigations. It lifts once the destination settles.
  const lockRef = useRef(false); // set synchronously on tap, before any state lands
  const isLocked = () => busy || leavingTo !== null || leavingRef.current || lockRef.current;
  // The tab the user chose, announced at once (drawn under the clouds).
  const [ariaIntent, setAriaIntent] = useState<"journey" | "stars" | "moments" | null>(null);
  useEffect(() => {
    // the move has settled where it was headed → release the lock + intent
    if (busy || leavingTo) return;
    if (ariaIntent === "journey" && !isStarView) setAriaIntent(null);
    if (ariaIntent === "stars" && isStarView) setAriaIntent(null);
    if (!ariaIntent) lockRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, leavingTo, isStarView, ariaIntent]);
  // A tap that could not start a move (e.g. nothing to leave from) must
  // never leave the dock locked.
  useEffect(() => {
    if (!ariaIntent || busy || leavingTo) return;
    const t = setTimeout(() => {
      setAriaIntent(null);
      lockRef.current = false;
    }, 900);
    return () => clearTimeout(t);
  }, [ariaIntent, busy, leavingTo]);
  // Unsaved words in an open Star card → ask before leaving (read-only
  // content never asks).
  const starDirty = useRef(false);
  const okToLeaveStar = () =>
    !starDirty.current || window.confirm("Leave without saving your changes to this Star?");
  // Stars tab tapped again: close an open Star, or glide back to the Current Star.
  const [recenter, setRecenter] = useState(0);
  const reselectStars = () => {
    if (isLocked()) return;
    if (openStar) {
      if (!okToLeaveStar()) return;
      setOpenStar(null);
    } else {
      setRecenter((n) => n + 1);
    }
  };
  // Quiet after ~1.8s without exploring; clear again on any touch / wheel /
  // focus. Never hidden, never inert.
  const [dockDim, setDockDim] = useState(false);
  const dimTimer = useRef<ReturnType<typeof setTimeout>>();
  const wakeDock = () => {
    setDockDim(false);
    clearTimeout(dimTimer.current);
    dimTimer.current = setTimeout(() => {
      if (document.activeElement?.closest?.(".journey-nav")) return; // keyboard / SR on the dock
      setDockDim(true);
    }, 1800);
  };
  // Journey tab in the Star World: close any open memory card first
  // (paper slides down, line retracts), then descend.
  const backToMeadow = () => {
    if (busy || !isStarView || leavingRef.current) return;
    if (openStar) {
      leavingRef.current = true;
      setOpenStar(null);
      setTimeout(() => {
        leavingRef.current = false;
        backToWalking();
      }, 480);
      return;
    }
    backToWalking();
  };

  // Sky Dock dimming: runs while the Star World is settled; any touch,
  // click or wheel (exploring Stars, reaching for the dock) clears it.
  useEffect(() => {
    if (env !== "night" || busy) {
      clearTimeout(dimTimer.current);
      setDockDim(false);
      return;
    }
    wakeDock();
    const wake = () => wakeDock();
    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("wheel", wake, { passive: true });
    window.addEventListener("keydown", wake);
    return () => {
      clearTimeout(dimTimer.current);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("wheel", wake);
      window.removeEventListener("keydown", wake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [env, busy]);

  // Deep links: /journey?to=stars (Stars tab from another page) ascends;
  // /journey?create=1 (after onboarding) opens Create Star.
  // /journey?to=stars&star=ID (from a Moment) also opens that Star on arrival.
  const deepLink = useRef<"stars" | "create" | "none" | null>(null);
  const [arriveStarId, setArriveStarId] = useState<string | null>(null);
  useEffect(() => {
    if (deepLink.current === null) {
      const q = new URLSearchParams(window.location.search);
      deepLink.current = q.get("to") === "stars" ? "stars" : q.has("create") ? "create" : "none";
      if (deepLink.current === "stars" && q.get("star")) setArriveStarId(q.get("star"));
      if (deepLink.current !== "none") window.history.replaceState(null, "", "/journey");
    }
    if (deepLink.current === "none") return;
    const t = setTimeout(() => {
      if (deepLink.current === "stars") enterStarView();
      else if (deepLink.current === "create") setCreateOpen(true);
      deepLink.current = "none";
    }, 1400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrived above after tapping the meadow star → show that star's summary.
  useEffect(() => {
    if (!viewCurrentOnArrival || !isStarView || busy) return;
    setViewCurrentOnArrival(false);
    const first = worldStars[0];
    const stage = document.querySelector<HTMLElement>(".journey-stage-v2");
    if (first && stage) {
      setOpenStar({ star: first, at: { x: stage.offsetWidth * 0.5, y: stage.offsetHeight * 0.22 } });
    }
  }, [viewCurrentOnArrival, isStarView, busy]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrived above from a Moment → open the Star it belongs to.
  useEffect(() => {
    if (!arriveStarId || !isStarView || busy) return;
    const star = worldStars.find((s) => s.id === arriveStarId);
    if (!star && worldStars.length === 0) return; // stars still loading
    setArriveStarId(null);
    const stage = document.querySelector<HTMLElement>(".journey-stage-v2");
    const target = star ?? worldStars[0];
    if (target && stage) {
      setOpenStar({ star: target, at: { x: stage.offsetWidth * 0.5, y: stage.offsetHeight * 0.22 } });
    }
  }, [arriveStarId, isStarView, busy, worldStars]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safe-area tint follows the environment actually on screen.
  usePageBg(env === "night" ? "#03070a" : "#4384e3");

  // The world walks only in the meadow, with no sheet open and no camera
  // move in progress (after a return, walking resumes once we've landed).
  const worldPaused = !isWalking || chatOpen || practiceOpen || momentOpen || eveningOpen || busy || leavingTo !== null;

  // Offer the evening reflection once, a little after arriving at night.
  useEffect(() => {
    if (!featuredStar || !eveningDue()) return;
    const t = setTimeout(() => {
      if (eveningDue()) setEveningOpen(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [featuredStar]);

  // Drive the shared world clock: ease in (0 → 32px/s over 1.2s); when the
  // camera is about to look up, decelerate over 450ms.
  useEffect(() => {
    worldClock().setWalking(!worldPaused, isStarView ? 450 : leavingTo ? 420 : undefined);
  }, [worldPaused, isStarView, leavingTo]);

  const goToMoments = () => {
    if (leavingTo) return;
    if (isStarView) {
      // From the Star World: straight down through the clouds onto the
      // Memory Trail. Close any open Star first (glow softens, thread
      // retracts), then one continuous camera move.
      if (busy) return;
      setLeavingTo("moments-down");
      const hadCard = openStar !== null;
      setOpenStar(null);
      setTimeout(
        () =>
          descendToGate((t0, reduced) => {
            handOff("moments", worldClock().getDistance(), { via: "stars", t0, reduced });
            router.push("/gallery");
          }),
        hadCard ? 220 : 0,
      );
      return;
    }
    if (busy || !isWalking || panelOpen) return;
    setLeavingTo("moments");
  };
  useEffect(() => {
    if (!pendingMoments.current || !isWalking || busy) return;
    pendingMoments.current = false;
    const t = setTimeout(() => setLeavingTo("moments"), 300);
    return () => clearTimeout(t);
  }, [isWalking, busy]);
  useEffect(() => {
    if (leavingTo !== "moments") return;
    const t0 = performance.now();
    const timers: number[] = [];
    const waitIdle = () => {
      const elapsed = performance.now() - t0;
      // the ground eases out (~420ms); Sísí finishes her step, then idles
      if ((!catWalking.current && elapsed > 380) || elapsed > 1100) {
        setCatFacing("left");
        // a short hold so the turn reads, then Moments continues this frame
        timers.push(
          window.setTimeout(() => {
            handOff("moments", worldClock().getDistance());
            router.push("/gallery");
          }, 170),
        );
      } else {
        timers.push(window.setTimeout(waitIdle, 30));
      }
    };
    waitIdle();
    return () => timers.forEach(clearTimeout);
  }, [leavingTo, router]);
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
    // Angel messages are generated + stored server-side — skipped in
    // local-only mode so the redesign never writes to production data.
    if (LOCAL_ONLY) return;
    ensureTodaysMessage().then((msg) => {
      if (msg && !msg.read_at) setAngelMessage(msg);
    });
  }, []);

  // Featured star — most recent (walk-toward symbol in the sky).
  useEffect(() => {
    loadStars()
      .then((stars) => setAllStars(stars))
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
    <JourneyStage
      phaseClass={`${stageClass}${handoffFx ? " jl-handoff" : ""}${quiet || leavingTo ? " jl-quiet" : ""}`}
    >
      {/* ── WORLD LAYER — separate depth groups; each moves at its own
          parallax rate during the Journey → Stars camera move. ── */}
      <WorldLayer>
        {/* Star world (behind everything; revealed during full cloud cover).
            Distant-sky rate 0.15×. */}
        <div className="jw-group jw-night" aria-hidden={env !== "night"}>
          <StarWorld
            stars={worldStars}
            nightSkySrc={ASCENT_LAYERS.nightSky}
            revealed={starRevealed}
            active={isStarView && env === "night" && !busy}
            selectedId={openStar?.star.id ?? null}
            locked={openStar !== null || leavingId !== null}
            onSelect={(star, at) => setOpenStar({ star, at })}
            leavingId={leavingId}
            recenter={recenter}
          />
        </div>

        {/* 1. Distant sky (day) — sky texture, small clouds, Current Star.
            Horizontally static; 0.15× during the ascent. */}
        <div className="jw-group jw-day">
          {/* Sky follows the local time (morning / afternoon / evening),
              crossfading slowly; fixed, no horizontal movement. */}
          <TimeOfDaySky tod={tod} />
          <CloudDrift clouds={CLOUDS} zIndex={1} />
          {skyStar && (
            <SkyStarV2
              star={skyStar}
              selected={isStarView}
              disabled={busy || !isWalking}
              onTap={() => {
                if (busy || !isWalking) return;
                setViewCurrentOnArrival(true);
                goToStars();
              }}
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
          {/* Far trees — 0.12–0.18×, faint, one every 2–4 widths of walking */}
          <PassingSprites
            art={FAR_TREES}
            ratio={[0.12, 0.18]}
            every={[2, 4]}
            first={[0.8, 1.6]}
            startInView
            height={[0.13, 0.19]}
            base={[0.5, 2.5]}
            opacity={[0.35, 0.55]}
            zIndex={1}
            className="passing-trees"
          />
          <ParallaxLayer
            src={PARALLAX_LAYERS.midgroundVegetation}
            speed={LAYER_SPEED.midgroundVegetation}
            zIndex={2}
            align="bottom"
            heightPct={0.18}
            bottom="calc(var(--walking-baseline) - 1.5%)"
            opacity={0.8}
            filter={`saturate(0.75) brightness(1.15) contrast(0.85) ${TOD_GRADE}`}
          />
        </div>

        {/* 3. Meadow — ground + path (locked, 32px/s) + companion. 0.75×
            during the ascent: the fox stays in the meadow and leaves
            through the bottom of the screen. */}
        <div className="jw-group jw-meadow">
          <ParallaxLayer
            className="tod-grade"
            src={PARALLAX_LAYERS.walkingGround}
            speed={LAYER_SPEED.walkingGround}
            zIndex={1}
            align="bottom"
            heightPct={1}
            bottom={GROUND_BOTTOM}
            seamOverlap={2}
          />
          <ParallaxLayer
            className="jw-path tod-grade"
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
            lookingAtYou={landing}
            facing={catFacing}
            onWalkingChange={(w) => {
              catWalking.current = w;
            }}
          />
        </div>

        {/* 4. Foreground — grass clumps (42–48px/s) + trees (50–58px/s).
            1.15× during the ascent. */}
        <div className="jw-group jw-fore">
          {/* Grass accents — 1.15–1.35×, over the paws, changing often */}
          <PassingSprites
            art={GRASS}
            ratio={[1.15, 1.35]}
            every={[0.5, 1.3]}
            first={[0.3, 0.8]}
            height={[0.075, 0.11]}
            reach={[0.5, 3.2]}
            max={4}
            sway
            filter={TOD_GRADE}
            zIndex={1}
          />
          {/* Foreground trees — 1.55–1.9×, rare: one every 5–8 widths, never
              two at once; the trunk may cross Sísí, the canopy stays clear of
              the header and the CTA */}
          <PassingSprites
            art={FRONT_TREES}
            ratio={[1.55, 1.9]}
            every={[5, 8]}
            first={[2.5, 4]}
            height={[0.48, 0.55]}
            base={[-5, -3]}
            max={1}
            filter={TOD_GRADE}
            zIndex={2}
            className="passing-trees"
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
        {/* Meadow UI (header + camera) — stays mounted; fades out over
            300ms (0.5–0.8s into the ascent), back in after the return lands. */}
        <div className={`journey-walk-ui jl-fade${isWalking && !busy && !panelOpen ? "" : " is-hidden"}`}>
          <JourneyHeader
            dateStr={dateStr}
            greeting={tod?.greeting ?? greeting}
            name={name}
            isDark={false}
            hasNudge={hasNudge}
            onMenuClick={() => setMenuOpen(true)}
            onCameraClick={() => setMomentOpen(true)}
            onSatchelClick={() => !busy && setSatchelOpen(true)}
          />
          {/* The one primary action on the home screen. */}
          <SpendTimeCTA onClick={() => !busy && setPracticeOpen(true)} />
        </div>

        {/* Tabs — in both worlds; hidden while the camera travels.
            Meadow: Stars ascends. Star World: Journey descends. */}
        {/* The dock stays on screen (fixed to the bottom safe area, never on
            the moving sky); faint and locked while the camera travels. */}
        <div
          className={`journey-walk-ui journey-dock${panelOpen ? " is-hidden" : ""}${
            busy || leavingTo === "moments-down" ? " is-transit" : ""
          }`}
        >
          <BottomNavV2
            // Cream stones in both worlds — the dark variant disappeared
            // against the cloud bank at the bottom of the Star World.
            theme="light"
            // Selection is announced at once (ariaTab) but drawn only where
            // the world actually changes — under the Cloud Gate (env flips
            // there), or with the turn toward Moments.
            activeTab={leavingTo === "moments" ? "moments" : env === "night" ? "stars" : "journey"}
            ariaTab={leavingTo ? "moments" : ariaIntent ?? (isStarView ? "stars" : "journey")}
            dock={env === "night" ? "sky" : "ground"}
            // faint + locked while travelling (see .journey-dock.is-transit)
            quiet={openStar ? "detail" : dockDim ? "dim" : "clear"}
            onWake={wakeDock}
            onStarsSelect={() => {
              if (isLocked()) return;
              if (isStarView) reselectStars();
              else if (isWalking && !busy) {
                lockRef.current = true;
                setAriaIntent("stars");
                goToStars();
              }
            }}
            onJourneySelect={() => {
              if (isLocked() || !isStarView) return;
              if (!okToLeaveStar()) return;
              lockRef.current = true;
              setAriaIntent("journey");
              backToMeadow();
            }}
            onMomentsSelect={() => {
              if (isLocked()) return;
              if (isStarView && !okToLeaveStar()) return;
              lockRef.current = true;
              setAriaIntent("moments");
              goToMoments();
            }}
            still={!!arrival}
          />
        </div>

        {/* A star's memory — only when the user taps a star. */}
        <AnimatePresence>
          {openStar && isStarView && (
            <StarMemoryCard
              key={openStar.star.id}
              star={openStar.star}
              anchor={openStar.at}
              placeholder={openStar.star.id === PLACEHOLDER_STAR.id}
              onClose={() => setOpenStar(null)}
              onRest={letStarRest}
              onEdited={starEdited}
              onCreateStar={() => setCreateOpen(true)}
              onDirty={(d) => {
                starDirty.current = d;
              }}
            />
          )}
        </AnimatePresence>

        <PaperToast message={isStarView ? toast : meadowToast} />

        <DailyPractice
          open={practiceOpen && isWalking}
          star={featuredStar}
          placeholder={isPlaceholderStar}
          onClose={() => setPracticeOpen(false)}
          onTalk={() => setChatOpen(true)}
          onCreateStar={() => setCreateOpen(true)}
        />

        <CreateStarFlow
          open={createOpen}
          existing={allStars}
          onClose={() => setCreateOpen(false)}
          onCreated={(s) => {
            setAllStars((list) => [s, ...list.filter((x) => x.id !== s.id)]);
            setCreateOpen(false);
          }}
        />

        <SatchelDrawer open={satchelOpen && isWalking} onClose={() => setSatchelOpen(false)} />
        <MomentCapture open={momentOpen && isWalking} star={featuredStar} onClose={() => setMomentOpen(false)} />
        <EveningReflection
          open={eveningOpen && isWalking && !chatOpen && !practiceOpen && !satchelOpen && !momentOpen}
          star={featuredStar}
          onClose={() => setEveningOpen(false)}
        />
      </UILayer>

      {/* Companion conversation — cat tap opens this. World pauses beneath. */}
      <CompanionSheet
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        star={featuredStar}
        onMeaningful={async () => {
          if (await earnLight("talk", featuredStar?.id)) {
            setMeadowToast("A Little Light found you. ✦ +1");
            setTimeout(() => setMeadowToast(null), 3200);
          }
        }}
      />

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
