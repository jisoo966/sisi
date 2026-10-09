"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clearHandoff, handOff, readHandoff, rememberSaved } from "@/lib/worldHandoff";
import { NewStarSky } from "@/components/sisi/stars/NewStarSky";
import { CompanionCues } from "@/components/sisi/journey-v2/CompanionCues";
import { hintDone, markHint } from "@/lib/hints";
import { LOCAL_ONLY } from "@/lib/dataMode";
import { AnimatePresence, motion } from "framer-motion";
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
import { CloudField } from "@/components/sisi/journey-v2/CloudField";
import { MeadowStrip } from "@/components/sisi/journey-v2/MeadowStrip";
import { FAR_TREES, FRONT_TREES, GRASS, TOD_GRADE } from "@/lib/worldArt";
import { useTimeOfDay } from "@/lib/timeOfDay";
import { occludingSisi, worldCoord } from "@/lib/journeyWorld";
// CloudDrift (earlier clouds cut from slow-clouds.png) stays on disk, unused.
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
import { CaptureFAB } from "@/components/sisi/journey-v2/CaptureFAB";
import { WalkNote } from "@/components/sisi/journey-v2/WalkNote";
import { FirstHello } from "@/components/sisi/journey-v2/FirstHello";
import { VisitTime } from "@/components/sisi/journey-v2/VisitTime";
import { allowVisits, declineVisits, visitsAsked } from "@/lib/sisiVisits";
import { DailyPractice } from "@/components/sisi/journey-v2/DailyPractice";
// SpendTimeCTA (the old home button) stays on disk, unused.
import { SatchelDrawer } from "@/components/sisi/journey-v2/SatchelDrawer";
import { MomentCapture } from "@/components/sisi/journey-v2/MomentCapture";
import { CreateStarFlow } from "@/components/sisi/journey-v2/CreateStarFlow";
import { EveningReflection, eveningDue } from "@/components/sisi/journey-v2/EveningReflection";
import { awardStarlight, localDate } from "@/lib/starlight";
import { LandscapeGate } from "@/components/sisi/journey-v2/LandscapeGate";
import { useStarlightBalance } from "@/lib/useStarlight";
import { FIRST_STARLIGHT_LINE, markDiscoveryShown, onStarlight, pendingDiscovery } from "@/lib/starlight";
import { markGiftShown, nextPathGift } from "@/lib/pathGifts";
import { equipWorld } from "@/lib/worlds";
import { JourneyReveal, type Reveal } from "@/components/sisi/magic/JourneyReveal";
import { StarlightFeedback } from "@/components/sisi/magic/StarlightFeedback";
import { AmbientMagic } from "@/components/sisi/effects/AmbientMagic";
import { glintPoint, softGlint } from "@/lib/fx";
import { anchorElement } from "@/lib/fxAnchors";
import { useWeather, weatherLine, type Weather, type WeatherState } from "@/lib/weather";
import { useEquippedWorld, WORLD_LOOK } from "@/lib/worlds";
import { useSceneTheme } from "@/lib/sceneTheme";
import { PondFish } from "@/components/sisi/journey-v2/PondFish";
import { Butterflies } from "@/components/sisi/journey-v2/Butterflies";
import { envCoord } from "@/lib/journeyWorld";
import { WeatherLayer } from "@/components/sisi/weather/WeatherLayer";
import type { TimeOfDay } from "@/lib/timeOfDay";
import { entryForVisit } from "@/lib/starVisits";
import { ascentOptions } from "@/lib/useStarAscent";
import type { StarEntry } from "@/components/sisi/journey-v2/StarMemoryCard";
import { IconPlus, SecondaryButton, StarGlyph } from "@/components/ds";
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
import { loadSigns, loadStars, type Star, restStar, walkingStars } from "@/lib/myStars";
import { loadMoments } from "@/lib/momentStore";
import { readAndMarkVisit, suggestionFor, type Suggestion } from "@/lib/todaysSuggestion";
import { careByStar } from "@/lib/starCare";
import { logActivity } from "@/lib/starActivity";
import { primeKeyboard } from "@/lib/keyboard";

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
  midgroundVegetation: "/V2/parallax/journey-midground-vegetation.webp",
  walkingGround: "/V2/parallax/journey-walking-ground.webp",
  walkingPath: "/V2/parallax/journey-walking-path.webp",
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
  frontClouds: "/V2/ascent/cloud-bank-front-v3.webp", // versioned name: never served from an old cache
  rearClouds: "/V2/ascent/cloud-bank-rear-v3.webp",
};



/**
 * Walking path (journey-walking-path.webp, 2048×768, transparent).
 * Rendered at 40% of the stage height, natural aspect (never stretched).
 * Its band runs from row 355 to 464; the band's vertical CENTER (row 409.5)
 * is 46.68% above the image bottom → shifting by 0.4668 × 40% = 18.67% puts
 * the centre of the path exactly on --walking-baseline (where the paws are).
 * Band is ~5.7% of the stage tall: ±2.84% around the baseline.
 */
/** walking with a wish: how much walking gathers before its quiet moment
 *  (+1 Starlight once a day) — a first value to test; never shown */
const WALK_MOMENT_MS = 30_000;
const PATH_HEIGHT_PCT = 0.4;

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
  const todLive = useTimeOfDay();

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
  const introShown = useRef<string | null>(null);
  // Talking with Sísí (optionally starting from a thought).
  const [chatOpening, setChatOpening] = useState<string | null>(null);
  /** the wish the talk is about, when opened from its Star */
  const [chatStar, setChatStar] = useState<Star | null>(null);
  const openChat = (opening?: string, about?: Star) => {
    markHint("talk");
    setChatOpening(opening ?? null);
    setChatStar(about ?? null);
    setChatOpen(true);
  };


  // Auth-derived name (Supabase profile or guest localStorage).
  const [name, setName] = useState<string>("");
  // ── The first time (onboarding), in the world itself ──
  //   hello  Sísí stops: "Hello. I'm Sísí. What should I call you?" (a small paper for your name)
  //   walk   "Nice to meet you, …  Let's walk a little." — a few steps together
  //   tap    she looks up: "Every wish becomes a Star up there. Tap it." (the star beckons)
  //   sky    up in the Star World: the first wish, held to light (NewStarSky first)
  // then "Walk with it" brings you back down to this meadow, carrying it.
  const [first, setFirst] = useState<null | "hello" | "walk" | "tap" | "sky">(null);
  const [firstBorn, setFirstBorn] = useState<Star | null>(null);
  // ── After the first wish: Sísí shows the three places, one at a time, as you
  //    walk (the pencil · Moments · Stars), each lit softly where it lives ──
  // the first experience, after the first wish:
  //   1 · ask: "What makes this wish matter to you?" (answered now, or maybe later)
  //   2 · what it became: your Star with its first moment, side by side
  //   3 · "That's enough for today." — the Journey is just to be in
  const [tour, setTour] = useState<0 | 1 | 2 | 3>(0);
  /** the first moment, kept during the tour (step 2 shows it on its Star) */
  const [tourKept, setTourKept] = useState<string | null>(null);
  const tourPending = useRef(false);
  const tourRef = useRef(tour);
  tourRef.current = tour;
  // remembered across the tabs: if you follow a lit tab, the rest waits for
  // your return to the meadow (and is never shown again once finished)
  useEffect(() => {
    const saved = Number(localStorage.getItem("sisi:tour") ?? 0);
    // (the result card can't come back after a reload: go on to her last line)
    if (saved >= 1 && saved <= 3) setTour(saved === 2 ? 3 : (saved as 1 | 3));
  }, []);
  useEffect(() => {
    if (tour > 0) localStorage.setItem("sisi:tour", String(tour));
    else if (localStorage.getItem("sisi:tour")) localStorage.removeItem("sisi:tour");
  }, [tour]);
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("tour-moments", tour === 2 && !!tourKept);
    return () => el.classList.remove("tour-pencil", "tour-moments", "tour-stars", "tour-starlight");
  }, [tour]);
  /** the name being written into the greeting (first time) */
  const [draftName, setDraftName] = useState("");
  /** arriving: Sísí greets you once per part of the day, with one thing for today */
  const [helloLine, setHelloLine] = useState<Suggestion | null>(null);
  /** the day you were last here (read once, as you arrive) */
  const lastVisit = useRef<Date | null | undefined>(undefined);
  /** her question for the moment page, when she asked one */
  const [momentAsk, setMomentAsk] = useState<{ question: string; star: Star | null } | null>(null);
  const keepName = () => {
    const n = draftName.trim();
    if (!n) return;
    (document.activeElement as HTMLElement | null)?.blur?.(); // the keyboard steps down; she walks on
    localStorage.setItem("sisi:guest", "true");
    localStorage.setItem("sisi:guest-name", n);
    document.cookie = `sisi_guest=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setName(n);
    setFirst("walk");
  };
  useEffect(() => {
    if (localStorage.getItem("sisi:guest-onboarded") !== "true" && !localStorage.getItem("sisi:guest-name")) setFirst("hello");
  }, []);
  useEffect(() => {
    if (first !== "walk") return;
    // a few steps together, then she looks up — but never stopping behind a
    // passing tree: she walks on until it has cleared her
    let t: ReturnType<typeof setTimeout>;
    const lookUp = () => {
      const stage = document.querySelector<HTMLElement>(".journey-stage-v2");
      const cat = document.querySelector<HTMLElement>(".walking-cat");
      const sisiX = (stage?.offsetWidth ?? window.innerWidth) * 0.37;
      const half = (cat?.offsetWidth ?? 117) / 2;
      // the tree covers her, or one is about to: wait for open meadow
      if (occludingSisi(sisiX, half) || occludingSisi(sisiX + half * 4, half * 3)) t = setTimeout(lookUp, 400);
      else setFirst("tap");
    };
    t = setTimeout(lookUp, 5200);
    return () => clearTimeout(t);
  }, [first]);
  // the tabs step aside until the first Star is born (one thing at a time)
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("first-run", first !== null);
    return () => el.classList.remove("first-run");
  }, [first]);
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
  /** the first time Customize opens: Sísí says how Starlight grows, above the sheet */
  const [starlightLine, setStarlightLine] = useState(false);
  useEffect(() => {
    if (!satchelOpen) {
      if (starlightLine) {
        markHint("starlightTold"); // said once (closing the sheet counts as heard)
        setStarlightLine(false);
      }
      return;
    }
    if (hintDone("starlightTold")) return;
    const t = setTimeout(() => setStarlightLine(true), 650); // once the sheet has risen
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satchelOpen]);
  // Camera → keep a Moment or Sign.
  const [momentOpen, setMomentOpen] = useState(false);
  // Create a Star (+ Vision Postcard).
  const [createOpen, setCreateOpen] = useState(false);
  // Evening: SiSi pauses beneath the Star once, gently.
  const [eveningOpen, setEveningOpen] = useState(false);
  /** Any focused panel over the meadow (hides tools + tabs, pauses SiSi).
   *  The satchel and the evening reflection are only ever shown in the
   *  meadow — when one is merely "pending" (e.g. the evening offer arrives
   *  while you're among the Stars) it must not hide the tabs. */
  /** "Leave a small note" after a walk: the writing page, right here */
  const [noteOpen, setNoteOpen] = useState(false);
  /** the very first Starlight earned in the meadow: Sísí says what it is, once */
  const [firstLightLine, setFirstLightLine] = useState(false);
  const firstLightPending = useRef(false);
  /** after the first walk together, Sísí asks once if she may visit (Angel Messages) */
  const [visitAsk, setVisitAsk] = useState<null | "ask" | "time">(null);
  /** once, on a quiet walk: Sísí says what the pencil is for (it glows) */
  const [pencilLine, setPencilLine] = useState(false);
  const panelOpen = practiceOpen || momentOpen || noteOpen || visitAsk === "time" || createOpen || ((satchelOpen || eveningOpen) && isWalking);
  // Meadow star tapped → view the Current Star once we arrive above.
  const [viewCurrentOnArrival, setViewCurrentOnArrival] = useState(false);
  // Little Light note shown in the meadow (e.g. after a meaningful talk).
  const [meadowToast, setMeadowToast] = useState<string | null>(null);
  useEffect(() => {
    if (!meadowToast) return;
    const t = setTimeout(() => setMeadowToast(null), 3200);
    return () => clearTimeout(t);
  }, [meadowToast]);
  // Stars load async; until then (or if none exist) show a waiting star.
  const [starsLoaded, setStarsLoaded] = useState(false);
  // "Walk with it": the wish Sísí is carrying stays visible in the sky.
  const [carried, setCarried] = useState<Star | null>(null);
  /** the walk was finished: the carried Star brightens warmly once */
  const [walkWarm, setWalkWarm] = useState(0);
  const skyStar: Star | null = carried ?? featuredStar ?? (starsLoaded ? PLACEHOLDER_STAR : null);
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
      setToast("Your Star is resting in Moments.");
    }, 480 + 1600);
    setTimeout(() => setToast(null), 480 + 1600 + 3200);
  };
  const starEdited = (star: Star) => {
    const patch = { wish: star.wish, fulfilledAt: star.fulfilledAt ?? null };
    setAllStars((list) => list.map((s) => (s.id === star.id ? { ...s, ...patch } : s)));
    setOpenStar((o) => (o && o.star.id === star.id ? { ...o, star: { ...o.star, ...patch } } : o));
  };

  // Journey → Stars camera move (see lib/useStarAscent.ts). `busy` locks
  // input from the tap until the arrival (or the return) has settled.
  const { busy, env, starRevealed, landing, descendToGate } = useStarAscent(isStarView);
  const leavingRef = useRef(false);
  const goToStars = () => {
    if (busy || !isWalking || ascentPending) return;
    // Don't rise while a big foreground tree covers Sísí: stop new ones,
    // let the one passing clear her, then look up.
    const stage = document.querySelector<HTMLElement>(".journey-stage-v2");
    const cat = document.querySelector<HTMLElement>(".walking-cat");
    const sisiX = (stage?.offsetWidth ?? window.innerWidth) * 0.37;
    const half = (cat?.offsetWidth ?? 117) / 2;
    if (!occludingSisi(sisiX, half)) {
      enterStarView();
      return;
    }
    setAscentPending(true);
    const t0 = performance.now();
    const wait = () => {
      if (!occludingSisi(sisiX, half) || performance.now() - t0 > 3500) {
        setAscentPending(false);
        enterStarView();
      } else setTimeout(wait, 90);
    };
    wait();
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
    !(starDirty.current || newStarDirty.current) ||
    window.confirm("Leave without saving what you wrote?");

  // ── New Star (written inside the Star World) ──
  const [newStarOpen, setNewStarOpen] = useState(false);
  /** a new Star is written, born and first visited alone: the other stars stay
   *  out of sight until its Star screen is closed, then return one by one */
  const [hushSky, setHushSky] = useState(false);
  const newbornOpened = useRef(false);
  /** born, its Star screen not yet open (keep the sky hushed meanwhile) */
  const pendingBorn = useRef(false);
  const [newbornId, setNewbornId] = useState<string | null>(null);
  useEffect(() => {
    if (newStarOpen) setHushSky(true);
  }, [newStarOpen]);
  const newStarDirty = useRef(false);
  const pendingNewStar = useRef(false);
  /** From anywhere: rise to the Stars (if needed), then begin a new wish. */
  const startNewStar = () => {
    primeKeyboard(); // the keyboard rises with the card (iOS: only inside the tap)
    if (isStarView) {
      if (busy) return;
      setOpenStar(null);
      setRecenter((n) => n + 1);
      setNewStarOpen(true);
    } else if (isWalking && !busy) {
      pendingNewStar.current = true;
      enterStarView();
    }
  };
  useEffect(() => {
    if (!pendingNewStar.current || !isStarView || busy) return;
    pendingNewStar.current = false;
    setNewStarOpen(true);
  }, [isStarView, busy]);
  useEffect(() => {
    if (!isStarView) setNewStarOpen(false);
  }, [isStarView]);
  // the sky returns when the new Star's screen closes (or the wish is set aside)
  useEffect(() => {
    if (!hushSky) return;
    if (openStar) newbornOpened.current = true;
    else if (newbornOpened.current || (!newStarOpen && !pendingBorn.current)) {
      newbornOpened.current = false;
      setHushSky(false);
      setNewbornId(null);
    }
  }, [hushSky, openStar, newStarOpen]);
  const starBorn = (s: Star) => {
    pendingBorn.current = true;
    setNewbornId(s.id);
    setAllStars((list) => [s, ...list.filter((x) => x.id !== s.id)]);
    setNewStarOpen(false);
    newStarDirty.current = false;
    const stage = document.querySelector<HTMLElement>(".journey-stage-v2");
    const w = stage?.offsetWidth ?? window.innerWidth;
    const h = stage?.offsetHeight ?? window.innerHeight;
    // the new Star sits where the seed was born (the top of the path); the
    // birth already happened on the seed, so its own Star screen simply opens
    // ("Your journey begins here.") — one ending, not three
    setStarMode(entryForVisit(s.id, "created"));
    window.setTimeout(() => {
      const a = anchorElement(`star:${s.id}`);
      const sr = stage?.getBoundingClientRect();
      const at = a && sr ? { x: a.rect.left + a.rect.width / 2 - sr.left, y: a.rect.top + a.rect.height / 2 - sr.top } : { x: w * 0.5, y: h * 0.22 };
      pendingBorn.current = false;
      setOpenStar({ star: s, at });
    }, 380); // the seed's sky finishes fading first
  };
  // A Star brightens once when something is added to it.
  const [starPulse, setStarPulse] = useState<{ id: string; n: number } | null>(null);
  // the time given to each Star: read again whenever something is added to one,
  // or a Star's screen closes (a walk or a picture may have just finished)
  const [starCare, setStarCare] = useState<Record<string, number>>({});
  useEffect(() => {
    if (openStar) return;
    let live = true;
    loadSigns()
      .then((signs) => live && setStarCare(careByStar(signs)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [starPulse, openStar]);
  // Stars tab tapped again: close an open Star, or glide back to the Current Star.
  const [recenter, setRecenter] = useState(0);
  const reselectStars = () => {
    if (isLocked()) return;
    if (newStarOpen) {
      if (!okToLeaveStar()) return;
      setNewStarOpen(false);
    } else if (openStar) {
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
  const arriveFor = useRef(false);
  const [arriveStarId, setArriveStarId] = useState<string | null>(null);
  /** how a Star's paper opens on arrival (e.g. straight to "Reflect on today") */
  const [starMode, setStarMode] = useState<StarEntry>("journey");
  useEffect(() => {
    if (deepLink.current === null) {
      const q = new URLSearchParams(window.location.search);
      // /journey?walk=ID (the end of onboarding): you arrive walking with your first Star
      const walkId = q.get("walk");
      if (walkId) {
        loadStars().then((list) => {
          const s = list.find((x) => x.id === walkId);
          if (s) setCarried(s);
        });
        window.history.replaceState(null, "", "/journey");
      }
      deepLink.current = q.get("to") === "stars" ? "stars" : q.has("create") ? "create" : "none";
      if (deepLink.current === "stars" && q.get("star")) {
        setArriveStarId(q.get("star"));
        arriveFor.current = true;
      }
      if (deepLink.current !== "none") window.history.replaceState(null, "", "/journey");
    }
    if (deepLink.current === "none") return;
    const t = setTimeout(() => {
      if (deepLink.current === "stars") {
        // "Visit Star": a short sky transition straight to that Star
        if (arriveFor.current) ascentOptions.quickNext = true;
        enterStarView();
      }
      else if (deepLink.current === "create") startNewStar();
      deepLink.current = "none";
    }, arriveFor.current ? 500 : 1400); // "Visit Star": straight up, no lingering
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrived above after tapping the meadow star → show that star's summary.
  useEffect(() => {
    if (!viewCurrentOnArrival || !isStarView || busy || env !== "night" || !starRevealed) return;
    setViewCurrentOnArrival(false);
    const first = worldStars[0];
    const stage = document.querySelector<HTMLElement>(".journey-stage-v2");
    if (first?.id === PLACEHOLDER_STAR.id) setNewStarOpen(true);
    else if (first && stage) {
      setStarMode(entryForVisit(first.id, "sky"));
      setOpenStar({ star: first, at: { x: stage.offsetWidth * 0.5, y: stage.offsetHeight * 0.22 } });
    }
  }, [viewCurrentOnArrival, isStarView, busy, env, starRevealed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrived above from a Moment → open the Star it belongs to.
  useEffect(() => {
    // wait until the camera has actually landed in the Star World
    if (!arriveStarId || !isStarView || busy || env !== "night" || !starRevealed) return;
    const star = worldStars.find((s) => s.id === arriveStarId);
    if (!star && worldStars.length === 0) return; // stars still loading
    setArriveStarId(null);
    const stage = document.querySelector<HTMLElement>(".journey-stage-v2");
    const target = star ?? worldStars[0];
    if (target?.id === PLACEHOLDER_STAR.id) setNewStarOpen(true);
    else if (target && stage) {
      if (starMode !== "reflect") setStarMode(entryForVisit(target.id, "visit"));
      else entryForVisit(target.id, "visit");
      setOpenStar({ star: target, at: { x: stage.offsetWidth * 0.5, y: stage.offsetHeight * 0.22 } });
    }
  }, [arriveStarId, isStarView, busy, worldStars, env, starRevealed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Safe-area tint follows the environment actually on screen.
  usePageBg("var(--sisi-ink)");

  // The world walks only in the meadow, with no sheet open and no camera
  // move in progress (after a return, walking resumes once we've landed).
  // (the conversation slows the world instead of stopping it — see below)
  // Sísí fully stops only for: Star creation, the rise into the Star World,
  // a focused moment and a particularly meaningful line. Writing slows the
  // world to ~12% while she rests; talking as you walk slows it to ~40%.
  const [speaking, setSpeaking] = useState(false);
  const [walkLine, setWalkLine] = useState<null | "intro" | "done">(null);
  const walkLineRef = useRef(walkLine);
  walkLineRef.current = walkLine;
  // (walking with a wish never stops the world: Sísí keeps walking as she speaks)
  const stillLine = false;
  const writing = chatOpen || momentOpen || noteOpen || (eveningOpen && isWalking);
  // rising to the Stars puts an unopened capture away (it never waits to pop up later)
  useEffect(() => {
    if (isStarView) setMomentOpen(false);
  }, [isStarView]);

  // ── Starlight: the shared world grows with attention given to Stars ──
  const starlight = useStarlightBalance();
  // A newly found World (or a fulfilled Star's flower) is revealed only on
  // the unobstructed Journey — never during writing, chat or a Star activity.
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [revealLeaving, setRevealLeaving] = useState(false);
  const unobstructed =
    isWalking && !busy && !panelOpen && !chatOpen && !openStar && !newStarOpen && !menuOpen && !walkLine && leavingTo === null && !quiet;
  useEffect(() => {
    if (!unobstructed || reveal) return;
    const t = setTimeout(() => {
      const w = pendingDiscovery();
      if (w) return setReveal({ kind: "world", world: w });
      const g = nextPathGift();
      if (g) setReveal({ kind: "flower", id: g.id });
    }, 2600);
    return () => clearTimeout(t);
  }, [unobstructed, reveal]);
  const endReveal = () => {
    if (!reveal) return;
    if (reveal.kind === "world") markDiscoveryShown(reveal.world);
    else markGiftShown(reveal.id);
    setRevealLeaving(true);
    setTimeout(() => {
      setReveal(null);
      setRevealLeaving(false);
    }, 650);
  };
  // a fulfilled Star's flower simply appears and stays a moment
  useEffect(() => {
    if (reveal?.kind !== "flower") return;
    const t = setTimeout(endReveal, 6500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal]);
  const discovering = reveal?.kind === "world" && !revealLeaving;
  // ── Environment: selected World + local time of day + (optional) weather ──
  const world = useEquippedWorld();
  /** the ground Sísí walks on (Customize → the path) */
  const scene = useSceneTheme();
  const liveWeather = useWeather();
  // The time and the weather change only on the unobstructed Journey —
  // never while a sheet, a conversation, writing or a Star ceremony is open.
  const calm = isWalking && !busy && !writing && !panelOpen && !menuOpen && !chatOpen && !openStar && leavingTo === null;
  const [applied, setApplied] = useState<{ tod: TimeOfDay | null; wx: Weather | null }>({ tod: null, wx: null });
  useEffect(() => {
    if (!calm && applied.tod) return;
    let t = todLive;
    // after dark (per the weather service) the evening sky, whatever the clock says
    if (t && liveWeather && !liveWeather.isDay && t.phase !== "evening") t = { ...t, phase: "evening" };
    setApplied((a) => (a.tod === t && a.wx === liveWeather ? a : { tod: t, wx: liveWeather }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calm, todLive, liveWeather]);
  const tod = applied.tod;
  const wx = applied.wx?.state ?? null;
  useEffect(() => {
    const d = { clear: 1, partly: 1.5, cloudy: 2, fog: 1.2, drizzle: 1.5, rain: 1.8, snow: 1.6, windy: 1.3 }[wx ?? "clear"];
    envCoord.cloudDensity = WORLD_LOOK[world].clouds * d;
    envCoord.wind = wx === "windy" ? 1.7 : wx === "rain" ? 1.15 : 1;
    document.documentElement.style.setProperty("--sway-deg", wx === "windy" ? "1.9deg" : wx === "rain" || wx === "drizzle" ? "1.2deg" : "0.9deg");
  }, [wx, world]);
  // now and then (never every time), Sísí mentions the weather
  const prevWx = useRef<WeatherState | null>(null);
  const [wxLine, setWxLine] = useState<string | null>(null);
  useEffect(() => {
    if (!wx || wx === prevWx.current) return;
    const text = weatherLine(wx, prevWx.current);
    prevWx.current = wx;
    if (!text) return;
    const t1 = setTimeout(() => setWxLine(text), 4000);
    const t2 = setTimeout(() => setWxLine(null), 4000 + 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [wx]);
  // pause continuous animation while the app is hidden
  useEffect(() => {
    const on = () => document.documentElement.classList.toggle("app-hidden", document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  // Sísí pauses and notices a newly found place
  const worldPaused =
    !isWalking || practiceOpen || createOpen || busy || leavingTo !== null || (speaking && stillLine) || discovering || first === "tap"; // (she walks on, slowly, as she says hello; she stops only to look up)

  // Offer the evening reflection once, a little after arriving at night —
  // never in the middle of walking with a wish (that time is the wish's).
  useEffect(() => {
    if (!featuredStar || carried || !eveningDue()) return;
    const t = setTimeout(() => {
      if (eveningDue()) setEveningOpen(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [featuredStar, carried]);
  useEffect(() => {
    if (carried) setEveningOpen(false); // an offer not yet taken steps aside
  }, [carried]);

  // Drive the shared world clock: ease in (0 → 32px/s over 1.2s); when the
  // camera is about to look up, decelerate over 450ms.
  useEffect(() => {
    const clock = worldClock();
    if (worldPaused) clock.setWalking(false, isStarView ? 450 : leavingTo ? 420 : stillLine ? 900 : undefined);
    else if (writing) clock.setTarget(0.12, 800); // writing: the world barely drifts, Sísí rests
    else if (speaking) clock.setTarget(0.4, 800); // Slow Walk: talking as we walk
    // back to walking, gently (from a slow walk ~1s; from a standstill ~1.2s)
    else clock.setTarget(1, clock.getFactor() > 0.05 ? 1000 : 1200);
  }, [worldPaused, isStarView, leavingTo, writing, speaking, stillLine]);

  // ── "Walk with it" ──
  const startWalkWith = (s: Star) => {
    logActivity(s.id, "walk"); // the day you set out with it counts
    setCarried(s);
    setWalkLine(null);
    backToMeadow();
  };
  // once we've landed, Sísí says a few words, then lets you simply walk
  useEffect(() => {
    if (!carried || isStarView || busy || walkLine) return;
    if (introShown.current === carried.id) return;
    const id = carried.id;
    const t = setTimeout(() => {
      introShown.current = id; // only once it has actually been said
      setWalkLine("intro");
    }, 600);
    return () => clearTimeout(t);
  }, [carried, isStarView, busy, walkLine]);
  // Walking with a wish: once ~30 seconds of walking have gathered (paused
  // whenever she stops, a panel is open or the app is out of sight), the
  // Star warms, Sísí says one line, and — once a day, whichever wish — a
  // little Starlight. No buttons, no countdown; she simply keeps walking.
  const walkedMs = useRef(0);
  const walkMarked = useRef<string | null>(null);
  useEffect(() => {
    if (!carried) {
      walkedMs.current = 0;
      return;
    }
    if (walkMarked.current === carried.id) return;
    const t = window.setInterval(() => {
      const walkingNow = isWalking && !busy && !panelOpen && !chatOpen && !tourRef.current && document.visibilityState === "visible";
      if (!walkingNow) return;
      walkedMs.current += 1000;
      if (walkedMs.current < WALK_MOMENT_MS) return;
      walkMarked.current = carried.id;
      window.clearInterval(t);
      setWalkWarm((n) => n + 1);
      walkLineRef.current = "done"; // known at once (the award below may land before the render)
      setWalkLine("done");
      // once a day for walking, whichever wish (the shared "✦ +1" shows it)
      awardStarlight({ source: "walk_with_it_completed", sourceId: `walk:${localDate()}`, starId: carried.id });
    }, 1000);
    return () => window.clearInterval(t);
  }, [carried, isWalking, busy, panelOpen, chatOpen]);
  // the line rests a little while, then Sísí simply walks on
  useEffect(() => {
    if (walkLine !== "done") return;
    const t = setTimeout(() => {
      setWalkLine(null);
      // first her word on the first Starlight, then (once it has rested) may she visit?
      if (firstLightPending.current) {
        firstLightPending.current = false;
        setFirstLightLine(true);
        return;
      }
      if (!visitsAsked()) setVisitAsk("ask"); // the first walk together: may she visit?
    }, 9000);
    return () => clearTimeout(t);
  }, [walkLine]);
  useEffect(() => {
    if (walkLine !== "intro") return;
    const t = setTimeout(() => {
      setWalkLine(null);
      if (tourPending.current) {
        tourPending.current = false;
        setTour(1);
      }
    }, 7500);
    return () => clearTimeout(t);
  }, [walkLine]);
  const endCarry = () => {
    setWalkLine(null);
    setCarried(null);
    introShown.current = null;
  };
  const riseToStar = (id: string, mode: "quick" | "reflect") => {
    endCarry();
    setStarMode(mode === "reflect" ? "reflect" : "journey");
    setArriveStarId(id);
    setTimeout(() => goToStars(), 380);
  };

  // Nothing new passes in front while Sísí talks or is about to look up.
  const [ascentPending, setAscentPending] = useState(false);
  useEffect(() => {
    worldCoord.holdForeground = writing || ascentPending || isStarView || busy;
  }, [writing, ascentPending, isStarView, busy]);
  useEffect(() => () => {
    worldCoord.holdForeground = false;
  }, []);

  /** "See its moments": Moments opens on this Star's history */
  const momentsFor = useRef<string | null>(null);
  const goToMoments = (starId?: string) => {
    if (leavingTo) return;
    momentsFor.current = starId ?? null;
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
            router.push(momentsFor.current ? `/gallery?star=${encodeURIComponent(momentsFor.current)}` : "/gallery");
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

  // the first Starlight in the meadow (a walk, a note on the way): remember to say it
  useEffect(
    () =>
      onStarlight((r) => {
        if (r.awarded <= 0 || r.duplicate || hintDone("firstStarlight")) return;
        if (document.documentElement.classList.contains("sms-open")) return; // the Star screen says it
        markHint("firstStarlight");
        // a walk's own line comes first ("You made space…"); the award lands with it
        if (walkLineRef.current === "done") firstLightPending.current = true;
        else setFirstLightLine(true);
      }),
    [],
  );
  // while she explains the first Starlight, the tool where its worlds live glows
  const pointingAtWorlds = firstLightLine && !walkLine && tour === 0 && isWalking;
  useEffect(() => {
    document.documentElement.classList.toggle("first-light", pointingAtWorlds);
    return () => document.documentElement.classList.remove("first-light");
  }, [pointingAtWorlds]);
  // the pencil, said once: after ~10 quiet seconds of walking, when nothing
  // else is being said and no moment has been kept yet; it glows meanwhile
  useEffect(() => {
    if (pencilLine || first !== null || tour > 0 || !isWalking || busy || panelOpen || chatOpen) return;
    if (helloLine || walkLine || firstLightLine || visitAsk || hintDone("capture") || hintDone("pencilTold")) return;
    const t = setTimeout(() => setPencilLine(true), 10000);
    return () => clearTimeout(t);
  }, [pencilLine, first, tour, isWalking, busy, panelOpen, chatOpen, helloLine, walkLine, firstLightLine, visitAsk]);
  const pointingAtPencil = pencilLine && isWalking && !panelOpen && !chatOpen;
  useEffect(() => {
    document.documentElement.classList.toggle("pencil-told", pointingAtPencil);
    return () => document.documentElement.classList.remove("pencil-told");
  }, [pointingAtPencil]);
  /** what Starlight is: said once, and it waits for you (never on a timer) */
  const firstLightSeen = () => {
    setFirstLightLine(false);
    if (!visitsAsked()) setVisitAsk("ask");
  };
  // arriving: Sísí says hello herself, once per part of the day
  useEffect(() => {
    const g = tod?.greeting;
    if (first !== null || !g || !name || !isWalking || busy) return;
    const key = `${new Date().toDateString()} ${g}`;
    if (localStorage.getItem("sisi:hello-last") === key) return;
    localStorage.setItem("sisi:hello-last", key);
    if (lastVisit.current === undefined) lastVisit.current = readAndMarkVisit();
    let alive = true;
    let t2: ReturnType<typeof setTimeout> | undefined;
    const t1 = setTimeout(async () => {
      const [stars, moments] = await Promise.all([loadStars(), loadMoments()]);
      if (!alive) return;
      const sug = suggestionFor({
        greeting: g,
        name,
        stars: walkingStars(stars).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        moments,
        lastVisit: lastVisit.current ?? null,
      });
      setHelloLine(sug);
      // a suggestion waits a little longer (and × or a tap on her button puts it away)
      t2 = setTimeout(() => setHelloLine(null), sug.action ? 16000 : 7000);
    }, 900);
    return () => {
      alive = false;
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first, name, tod?.greeting, isWalking, busy]);
  // Bell dot badge — reappears if the guest saw the nudge previously.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.is_anonymous) return; // an anonymous account is still a guest
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
        if (user && !user.is_anonymous) {
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
      phaseClass={`${stageClass}${arrival ? " jl-arrived" : ""}${handoffFx ? " jl-handoff" : ""}${quiet || leavingTo ? " jl-quiet" : ""} world-${world}${wx ? ` wx-state-${wx}` : ""}`}
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
            reserveTop={newStarOpen}
            hushed={hushSky}
            keepId={newbornId}
            pulse={starPulse}
            locked={openStar !== null || leavingId !== null || newStarOpen}
            onSelect={(star, at) => {
              // a Star still waiting for its wish: tapping it is making the wish
              if (star.id === PLACEHOLDER_STAR.id) return startNewStar();
              setStarMode(entryForVisit(star.id, "sky"));
              setOpenStar({ star, at });
            }}
            leavingId={leavingId}
            recenter={recenter}
            skyBalance={starlight}
            care={starCare}
          />
        </div>

        {/* 1. Distant sky (day) — sky texture, small clouds, Current Star.
            Horizontally static; 0.15× during the ascent. */}
        <div className="jw-group jw-day">
          {/* Sky follows the local time (morning / afternoon / evening),
              crossfading slowly; fixed, no horizontal movement. */}
          <TimeOfDaySky tod={tod} />
          {/* clouds from the time-of-day pool — seeded, varied, continuous */}
          <CloudField zIndex={1} />
          {/* a place that closes over the sky (the forest): its own backdrop,
              tinted by the hour like everything else */}
          {scene.backdrop && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={scene.backdrop} className="jw-backdrop tod-grade" src={scene.backdrop} alt="" draggable={false} />
          )}
          {skyStar && (
            <SkyStarV2
              star={skyStar}
              carrying={!!carried && !isStarView}
              warm={walkWarm}
              selected={isStarView}
              disabled={busy || !isWalking || first === "hello"}
              beckon={first === "tap"}
              onTap={() => {
                if (busy || !isWalking || first === "hello") return;
                if (first) setFirst("sky"); // the first rise: the first wish waits up there
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
          {/* Far trees — 0.12–0.18×, faint, one every 2–4 widths of walking
              (not in a place with its own backdrop) */}
          {!scene.backdrop && <PassingSprites
            layer="far-trees"
            role="far"
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
          />}
          {/* distant weather: between the far landscape and the mid landscape */}
          {!isStarView && <WeatherLayer state={wx} depth="far" zIndex={1} />}
          <ParallaxLayer
            key={`mid-${scene.id}`}
            src={scene.midground}
            speed={scene.midgroundSpeed ?? LAYER_SPEED.midgroundVegetation}
            zIndex={2}
            align="bottom"
            heightPct={scene.midgroundHeight}
            bottom={scene.midgroundBottom}
            opacity={0.8}
            filter={`saturate(0.75) brightness(1.15) contrast(0.85) ${TOD_GRADE}`}
          />
          {/* the far shore's bigger trees (the theme's own art): ~2–2.5× Sísí's
              height, rooted behind the far bank; sparse and uneven, at 0.6× the
              bridge — between the far reeds and the bridge */}
          {scene.midTrees && (
            <PassingSprites
              key={`mid-trees-${scene.id}`}
              layer="mid-trees"
              role="far"
              art={scene.midTrees}
              ratio={[0.56, 0.64]}
              every={[2.2, 3.5]}
              first={[0.6, 1.2]}
              startInView
              height={[0.32, 0.42]}
              base={[0.5, 2.5]}
              max={2}
              filter={TOD_GRADE}
              zIndex={3}
              className="passing-trees"
            />
          )}
        </div>

        {/* middle weather: above the mid landscape, behind the ground and Sísí */}
        {!isStarView && (
          <div className="jw-wx jw-wx-mid">
            <WeatherLayer state={wx} depth="mid" />
            {/* rare, unannounced small magic — behind Sísí, only on the open Journey */}
            <AmbientMagic enabled={calm && !reveal && !toast} evening={tod?.phase === "evening"} />
          </div>
        )}

        {/* 3. Meadow — ground + path (locked, 32px/s) + companion. 0.75×
            during the ascent: the fox stays in the meadow and leaves
            through the bottom of the screen. */}
        <div className="jw-group jw-meadow">
          {/* behind the ground: its own leaf colour, so the backdrop never shows through */}
          {scene.floorFill && <div className="jw-floor" style={{ background: scene.floorFill }} aria-hidden />}
          <ParallaxLayer
            // the pond's surface: a 1–2px ripple over ~20s (never a current)
            className={scene.fish ? "tod-grade jw-pond-water" : "tod-grade"}
            key={`ground-${scene.id}`}
            src={scene.ground}
            speed={scene.groundSpeed ?? LAYER_SPEED.walkingGround}
            zIndex={1}
            align="bottom"
            heightPct={scene.groundHeight ?? 1}
            bottom={scene.groundBottom}
            drift={scene.groundDrift}
            seamOverlap={2}
          />
          {/* the bridge's light on the water: a faint band that breathes */}
          {scene.fish && <div className="jw-pond-light" aria-hidden />}
          {/* the continuous time-of-day grass line, just behind the path */}
          <MeadowStrip phase={tod?.phase ?? null} zIndex={2} override={scene.strip} speed={scene.stripSpeed} />
          {/* the near verge (forest): bright leaf tips along the path's lower edge */}
          {scene.verge && (
            <ParallaxLayer
              key={`verge-${scene.id}`}
              className="tod-grade"
              src={scene.verge.src}
              speed={36}
              zIndex={2}
              align="bottom"
              heightPct={scene.verge.heightPct}
              bottom={scene.verge.bottom}
              // its straight lower edge melts into the flowers below
              maskImage="linear-gradient(to bottom, #000 72%, transparent 100%)"
              seamOverlap={2}
            />
          )}
          {/* the forest's big trees, rooted on the path line behind Sísí (the path
              covers their roots); crowns run off the top */}
          {scene.bigTrees && (
            <ParallaxLayer
              key={`trees-${scene.id}`}
              className="tod-grade"
              src={scene.bigTrees.src}
              speed={LAYER_SPEED.walkingPath}
              zIndex={2}
              align="bottom"
              heightPct={scene.bigTrees.heightPct}
              bottom={scene.bigTrees.bottom}
              seamOverlap={2}
            />
          )}
          <ParallaxLayer
            className="jw-path tod-grade"
            key={`path-${scene.id}`}
            src={scene.path}
            speed={LAYER_SPEED.walkingPath}
            zIndex={2}
            align="bottom"
            heightPct={PATH_HEIGHT_PCT}
            bottom={scene.pathBottom}
            seamOverlap={2}
          />
          <WalkingCat
            onTap={isWalking && !busy ? () => openChat() : undefined}
            lookingUp={isStarView}
            rest={writing && !isStarView}
            lookingAtYou={landing}
            facing={catFacing}
            onWalkingChange={(w) => {
              catWalking.current = w;
            }}
          />
          {scene.butterflies && <Butterflies kinds={scene.butterflies} />}
          {/* the pond's own life: fish below the bridge, then its low near bank */}
          {scene.fish && (
            <PondFish srcs={scene.fish} bottom={GROUND_BOTTOM} waterSpeed={scene.groundSpeed ?? LAYER_SPEED.walkingGround} waterDrift={scene.groundDrift ?? 0} />
          )}
          {scene.foreground && (
            <ParallaxLayer
              className="tod-grade jw-pond-fore"
              src={scene.foreground}
              speed={scene.foregroundSpeed ?? LAYER_SPEED.walkingGround}
              zIndex={4}
              align="bottom"
              heightPct={scene.foregroundHeight ?? 1}
              bottom={scene.foregroundBottom ?? GROUND_BOTTOM}
              seamOverlap={2}
            />
          )}
        </div>

        {/* sparse foreground weather: in front of Sísí, behind the foreground plants */}
        {!isStarView && (
          <div className="jw-wx jw-wx-near">
            <WeatherLayer state={wx} depth="near" />
          </div>
        )}

        {/* 4. Foreground — grass clumps (42–48px/s) + trees (50–58px/s).
            1.15× during the ascent. */}
        <div className="jw-group jw-fore">
          {/* Grass accents — 1.15–1.35×, over the paws, changing often */}
          {/* (a pond has its own near bank: no meadow clumps over the water) */}
          {!scene.foreground && !scene.backdrop && <PassingSprites
            layer="grass"
            role="flora"
            // coral flowers stay a rare accent
            weights={[1, 0.8, 1, 1, 1, 0.3]}
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
          />}
          {/* Foreground trees — 1.55–1.9×, rare: one every 5–8 widths, never
              two at once; the trunk may cross Sísí, the canopy stays clear of
              the header and the CTA */}
          {/* (a pond has no trees standing in front of it) */}
          {!scene.foreground && !scene.backdrop && (
          <PassingSprites
            layer="front-trees"
            role="front"
            art={FRONT_TREES}
            ratio={[1.55, 1.9]}
            every={[5, 8]}
            first={[2.5, 4]}
            height={[0.48, 0.55]}
            // rooted in the grass in front of the path, not standing on it
            base={[-10, -8]}
            max={1}
            filter={TOD_GRADE}
            zIndex={2}
            className="passing-trees"
          />
          )}
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
        <div className={`journey-walk-ui jl-fade${isWalking && !busy && !panelOpen && !chatOpen ? "" : " is-hidden"}`}>
          <JourneyHeader
            isDark={false}
            hasNudge={hasNudge}
            onMenuClick={() => setMenuOpen(true)}
            onSatchelClick={() => !busy && setSatchelOpen(true)}
          />
          {/* capturing — the main action — within the thumb's reach */}
          {/* only while walking: in the Stars it is out of sight, and must not
              catch a tap meant for the Star's own choices above it */}
          <div style={{ opacity: isWalking && !busy && !first ? 1 : 0, pointerEvents: isWalking && !busy && !first ? undefined : "none", transition: "opacity 300ms ease" }}>
            <CaptureFAB
              onClick={() => {
                if (!isWalking || busy) return;
                primeKeyboard(); // the writing page opens with the keyboard (iOS: only inside the tap)
                setMomentOpen(true);
              }}
            />
          </div>
          {/* The one primary action on the home screen. */}
          {/* "Spend time with your Star" removed from the Journey: guidance
              now comes from Sísí as speech bubbles (CompanionCues). */}
        </div>

        {/* Tabs — in both worlds; hidden while the camera travels.
            Meadow: Stars ascends. Star World: Journey descends. */}
        {/* The dock stays on screen (fixed to the bottom safe area, never on
            the moving sky); faint and locked while the camera travels. */}
        {/* a busy near bank (pond, forest): a soft dark fade under the tabs so
            their names read — never an opaque bar */}
        {(scene.foreground || scene.backdrop) && isWalking && <div className="jw-nav-scrim" aria-hidden />}
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
            quiet={openStar || newStarOpen ? "detail" : dockDim ? "dim" : "clear"}
            onWake={wakeDock}
            onStarsSelect={() => {
              if (isLocked()) return;
              if (chatOpen) {
                // leave the talk first, then rise
                setChatOpen(false);
                setTimeout(() => goToStars(), 420);
                return;
              }
              if (isStarView) reselectStars();
              else if (isWalking && !busy) {
                lockRef.current = true;
                setAriaIntent("stars");
                goToStars();
              }
            }}
            onJourneySelect={() => {
              if (chatOpen) {
                setChatOpen(false); // back to the walk
                return;
              }
              if (isLocked() || !isStarView) return;
              if (!okToLeaveStar()) return;
              lockRef.current = true;
              setAriaIntent("journey");
              backToMeadow();
            }}
            onMomentsSelect={() => {
              if (isLocked()) return;
              if (chatOpen) {
                setChatOpen(false);
                setTimeout(() => goToMoments(), 420);
                return;
              }
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
              initialMode={starMode}
              onClose={() => {
                setOpenStar(null);
                setStarMode("journey");
              }}
              onWalkWith={(s) => {
                setStarMode("journey");
                startWalkWith(s);
              }}
              onReturnToJourney={() => {
                setStarMode("journey");
                backToMeadow();
              }}
              onRest={letStarRest}
              onTalk={(s) => openChat(undefined, s)}
              onEdited={starEdited}
              onCreateStar={startNewStar}
              onEntrySaved={(entry) => {
                setStarPulse((p) => ({ id: entry.starId, n: (p?.n ?? 0) + 1 }));
                // the same entry is a Moment: show its thread there briefly
                rememberSaved(`s-${entry.id}`);
              }}
              onDirty={(d) => {
                starDirty.current = d;
              }}
            />
          )}
        </AnimatePresence>

        {/* My Stars — a quiet way to begin a new wish, part of the night sky */}
        <div
          className={`stars-top${
            env === "night" && isStarView && !busy && !openStar && !newStarOpen && !leavingTo ? " is-shown" : ""
          }`}
        >
          <h2 className="stars-top-title">My Stars</h2>
          <SecondaryButton surface="dark" className="stars-new" onClick={startNewStar}>
            <IconPlus size={20} /> New Star
          </SecondaryButton>
        </div>

        <NewStarSky
          open={newStarOpen && isStarView}
          existing={allStars}
          first={first === "sky"}
          bornLine={first === "sky" ? "Your journey begins here. Let’s carry it with us, down to the meadow." : undefined}
          onClose={() => {
            if (!okToLeaveStar()) return;
            setNewStarOpen(false);
          }}
          onBorn={
            first === "sky"
              ? (s) => {
                  // the first Star stays in its moment: then you walk with it
                  setAllStars((list) => [s, ...list.filter((x) => x.id !== s.id)]);
                  setFirstBorn(s);
                }
              : starBorn
          }

          onDirty={(d) => {
            newStarDirty.current = d;
          }}
        />


        {/* a newly found World / a fulfilled Star's flower, just ahead of Sísí */}
        {reveal && isWalking && <JourneyReveal key={reveal.kind === "world" ? reveal.world : reveal.id} reveal={reveal} leaving={revealLeaving} />}
        <StarlightFeedback />

        {/* beside Sísí: the one-time "Tap Sísí" hint, or some days a thought */}
        <CompanionCues
          // the first-time words are said whatever the hour
          visible={
            (isWalking && !busy && !panelOpen && !chatOpen && !leavingTo && (env === "day" || first !== null) && !quiet && tour !== 2) ||
            // Customize, the first time: her words about Starlight, above the sheet
            (starlightLine && satchelOpen && isWalking)
          }
          onTalk={(opening) => openChat(opening)}
          onSpeaking={setSpeaking}
          line={
            starlightLine && satchelOpen
              ? {
                  key: "starlight-told",
                  text: "The more time we spend together, the more new worlds open.",
                  onDismiss: () => {
                    markHint("starlightTold");
                    setStarlightLine(false);
                  },
                }
              : first === "hello" || first === "walk" || first === "tap"
              ? {
                  key: `first-${first}`,
                  text:
                    first === "hello"
                      ? "Hello. I’m Sísí. This is a little place for your wishes, and the moments along the way. What should I call you?"
                      : first === "walk"
                        ? `Nice to meet you, ${name}. Let’s walk a little.`
                        : "Every wish becomes a Star. Tap it to make yours.",
                }
              : tour === 1 && isWalking && carried
              ? {
                  // the first moment, now — something answerable at once
                  key: "tour-ask",
                  text: "What makes this wish matter to you?",
                  actions: [
                    { label: "Write it", act: () => { primeKeyboard(); setNoteOpen(true); } },
                    { label: "Maybe later", quiet: true, act: () => setTour(3) },
                  ],
                }
              : tour === 3 && isWalking
              ? {
                  key: "tour-rest",
                  text: "That’s enough for today. Come back whenever you like.",
                  actions: [{ label: "Let’s walk", act: () => setTour(0) }],
                }
              : firstLightLine && !walkLine && tour === 0 // one voice: after her first walk with you
              ? {
                  key: "first-light",
                  text: FIRST_STARLIGHT_LINE,
                  // the worlds it opens live behind the tool up there (it glows while she says this)
                  actions: [
                    {
                      label: "Show me",
                      act: () => {
                        firstLightSeen();
                        setSatchelOpen(true);
                      },
                    },
                    { label: "Keep walking", quiet: true, act: firstLightSeen },
                  ],
                }
              : helloLine && !carried
              ? {
                  key: helloLine.key,
                  text: helloLine.text,
                  onDismiss: helloLine.action ? () => setHelloLine(null) : undefined,
                  actions: helloLine.action
                    ? [
                        {
                          label: helloLine.action.label,
                          act: () => {
                            const a = helloLine.action!;
                            setHelloLine(null);
                            setMomentAsk({ question: a.question, star: a.star });
                            primeKeyboard();
                            setMomentOpen(true);
                          },
                        },
                      ]
                    : undefined,
                }
              : visitAsk === "ask"
              ? {
                  key: "visit-ask",
                  text: "Can I visit you with a little note sometimes?",
                  actions: [
                    { label: "Yes, please", act: () => setVisitAsk("time") },
                    {
                      label: "Not now",
                      quiet: true,
                      act: () => {
                        declineVisits();
                        setVisitAsk(null);
                      },
                    },
                  ],
                }
              : discovering && reveal?.kind === "world"
              ? {
                  key: `discover-${reveal.world}`,
                  text: "We found a new place.",
                  placement: "sky",
                  actions: [
                    {
                      label: "Visit now",
                      act: (e) => {
                        softGlint(glintPoint(e?.currentTarget)); // the "Visit now" control
                        equipWorld(reveal.world);
                        endReveal();
                      },
                    },
                    { label: "Keep walking", act: endReveal, quiet: true },
                  ],
                }
              : pencilLine
              ? {
                  key: "pencil-told",
                  text: "When something small happens along the way, you can keep it here.",
                  actions: [
                    {
                      label: "Keep a moment",
                      act: () => {
                        markHint("pencilTold");
                        setPencilLine(false);
                        primeKeyboard();
                        setMomentOpen(true);
                      },
                    },
                    {
                      label: "Later",
                      quiet: true,
                      act: () => {
                        markHint("pencilTold");
                        setPencilLine(false);
                      },
                    },
                  ],
                }
              : wxLine && (!carried || !walkLine)
                ? { key: `wx-${wxLine}`, text: wxLine }
              : !carried || !walkLine
              ? null
              : walkLine === "intro"
                ? {
                    key: "walk-intro",
                    // the wish, said once as you set out — as it is written, already
                    // true (living in the end); then it simply rides along in the sky
                    text: (
                      <>
                        “{carried.wish.trim().replace(/[.。]$/, "")}.”
                        <br />
                        Let’s walk with it a little, today.
                      </>
                    ),
                  }
                : {
                    // the walk is time given to the wish (not progress toward it)
                    key: "walk-done",
                    text: "You made space for this wish today.",
                    // written right here, never a trip up to the Stars
                    actions: [{ label: "Leave a small note", act: () => { primeKeyboard(); setNoteOpen(true); setWalkLine(null); }, quiet: true }],
                  }
          }
        />

        {/* what it became: your Star, and the first moment on it (in Moments too) */}
        <AnimatePresence>
          {tour === 2 && tourKept && carried && isWalking && (
            <motion.section
              key="first-kept"
              className="first-kept"
              aria-label="Your first moment"
              initial={{ y: "130%" }}
              animate={{ y: 0, transition: { duration: 0.55, delay: 0.3, ease: [0.22, 1, 0.36, 1] } }}
              exit={{ y: "130%", transition: { duration: 0.35 } }}
            >
              <div className="first-kept-paper ds-paper ds-deckle">
                <p className="first-kept-wish">
                  <StarGlyph size={14} /> {carried.wish}
                </p>
                <p className="first-kept-text">“{tourKept}”</p>
                <p className="first-kept-meta">1 moment along the way · also in Moments</p>
                <button type="button" className="ds-btn ds-btn--primary ds-btn--block" onClick={() => setTour(3)}>
                  Keep walking
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        {/* the first time: your name, in the meadow */}
        <FirstHello open={first === "hello" && isWalking && !busy} value={draftName} onChange={setDraftName} onSubmit={keepName} />
        {/* the first Star is born: walk with it, down in the same meadow */}
        <AnimatePresence>
          {firstBorn && isStarView && (
            <motion.div
              key="first-walk"
              className="first-walk"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 2.4, duration: 0.6 } }}
              exit={{ opacity: 0 }}
            >
              <button
                type="button"
                className="ds-btn ds-btn--primary ds-on-dark ds-btn--block"
                onClick={() => {
                  const s = firstBorn;
                  localStorage.setItem("sisi:guest-onboarded", "true");
                  tourPending.current = true; // then Sísí shows the way around
                  setFirstBorn(null);
                  setFirst(null);
                  setNewStarOpen(false);
                  startWalkWith(s);
                }}
              >
                Walk with it
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* when Sísí may visit: then (only then) the system asks about notifications */}
        <VisitTime
          open={visitAsk === "time" && isWalking}
          onChoose={(t) => {
            setVisitAsk(null);
            allowVisits(t).then((ok) =>
              setMeadowToast(ok ? `Sísí will visit ${t === "morning" ? "in the mornings" : "in the evenings"}.` : "Notifications are off. You can turn them on in Settings."),
            );
          }}
          onSkip={() => {
            declineVisits();
            setVisitAsk(null);
          }}
          onAway={() => setVisitAsk(null)}
        />
        <PaperToast message={isStarView ? toast : meadowToast} />
        {carried && (
          <WalkNote
            open={noteOpen && isWalking}
            star={carried}
            onClose={() => setNoteOpen(false)}
            question={tour === 1 ? "What makes this wish matter to you?" : undefined}
            plain={tour === 1}
            onSaved={(e) => {
              rememberSaved(`s-${e.id}`);
              if (tourRef.current === 1) {
                setTourKept(e.text);
                setTour(2); // then what it became: the Star with its first moment
              }
            }}
          />
        )}

        <DailyPractice
          open={practiceOpen && isWalking}
          star={featuredStar}
          placeholder={isPlaceholderStar}
          onClose={() => setPracticeOpen(false)}
          onTalk={() => setChatOpen(true)}
          onCreateStar={startNewStar}
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
        <MomentCapture
          open={momentOpen && isWalking}
          star={featuredStar}
          question={momentAsk?.question}
          forStar={momentAsk?.star ?? null}
          onClose={() => {
            setMomentOpen(false);
            setMomentAsk(null);
          }}
        />
        <EveningReflection
          open={eveningOpen && isWalking && !chatOpen && !practiceOpen && !satchelOpen && !momentOpen}
          star={featuredStar}
          onClose={() => setEveningOpen(false)}
        />
      </UILayer>

      {/* Companion conversation — cat tap opens this. World pauses beneath. */}
      <CompanionSheet
        open={chatOpen}
        opening={chatOpening}
        onSeeJourney={(s) => {
          // close the talk, rise to the Stars, and open this Star
          setChatOpen(false);
          setArriveStarId(s.id);
          ascentOptions.quickNext = true; // a short sky transition
          setTimeout(() => goToStars(), 380);
        }}
        onClose={() => setChatOpen(false)}
        // the wish being talked about: from its Star, the one you walk with,
        // or your only one (with several, Sísí lets you choose)
        star={chatStar ?? carried ?? (pathStars.length === 1 ? featuredStar : null)}
        // ordinary conversation never earns Starlight
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
