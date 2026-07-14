/**
 * lib/myStars — Wish 데이터 모델 + hybrid persistence.
 *
 * *별* = 소원(wish). 하늘의 특정 position(x, y)에 자리잡음.
 * *Sign* = 그 별에 대한 journey entry.
 *
 * Persistence: 로그인 상태면 Supabase, 아니면 localStorage.
 * 모든 read/write 함수는 async.
 */

import { createClient } from "@/lib/supabase/client";

export type Timeframe = "this month" | "this season" | "this year" | "someday";

export type Star = {
  id: string;
  wish: string;
  timeframe: Timeframe;
  /** Sky position (0-100%) — sky 배경 이미지 상 x, y 위치 */
  x: number;
  y: number;
  /** 별 크기 (스몰/미디엄/라지, 시각적 다양성) */
  size: "sm" | "md" | "lg";
  createdAt: string; // ISO
};

export type Sign = {
  id: string;
  starId: string;
  text: string;
  createdAt: string; // ISO
};

const STARS_KEY = "sisi:stars";
const SIGNS_KEY = "sisi:signs";

// ─── Auth helper ─────────────────────────────────

/**
 * 현재 로그인 유저 반환 (없으면 null).
 * Supabase 응답 실패해도 조용히 null 반환 (오프라인 대응).
 */
async function getCurrentUser() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// ─── DB row ↔ Type mappers ───────────────────────

type StarRow = {
  id: string;
  wish: string;
  timeframe: Timeframe;
  x: string | number;
  y: string | number;
  size: "sm" | "md" | "lg";
  created_at: string;
};

function dbToStar(row: StarRow): Star {
  return {
    id: row.id,
    wish: row.wish,
    timeframe: row.timeframe,
    x: Number(row.x),
    y: Number(row.y),
    size: row.size,
    createdAt: row.created_at,
  };
}

type SignRow = {
  id: string;
  star_id: string;
  text: string;
  created_at: string;
};

function dbToSign(row: SignRow): Sign {
  return {
    id: row.id,
    starId: row.star_id,
    text: row.text,
    createdAt: row.created_at,
  };
}

// ─── Stars ─────────────────────────────────

/** 모든 별 반환 (최신 순). */
export async function loadStars(): Promise<Star[]> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stars")
      .select("id, wish, timeframe, x, y, size, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadStars error:", error);
      return [];
    }
    return (data as StarRow[]).map(dbToStar);
  }

  // localStorage fallback (익명 사용자)
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STARS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** 별 저장. */
export async function saveStar(star: Star): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { error } = await supabase.from("stars").insert({
      id: star.id,
      user_id: user.id,
      wish: star.wish,
      timeframe: star.timeframe,
      x: star.x,
      y: star.y,
      size: star.size,
    });
    if (error) console.error("saveStar error:", error);
    return;
  }

  // localStorage fallback
  const stars = await loadStars();
  stars.unshift(star);
  localStorage.setItem(STARS_KEY, JSON.stringify(stars));
}

/** ID로 별 하나 가져오기. */
export async function getStarById(id: string): Promise<Star | undefined> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stars")
      .select("id, wish, timeframe, x, y, size, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) return undefined;
    return dbToStar(data as StarRow);
  }

  const stars = await loadStars();
  return stars.find((s) => s.id === id);
}

/** 별 삭제 (그 별의 signs도 CASCADE로 자동 삭제). */
export async function deleteStar(id: string): Promise<void> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { error } = await supabase
      .from("stars")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) console.error("deleteStar error:", error);
    return;
  }

  // localStorage fallback
  const stars = await loadStars();
  const filtered = stars.filter((s) => s.id !== id);
  localStorage.setItem(STARS_KEY, JSON.stringify(filtered));
  const signs = await loadSigns();
  const filteredSigns = signs.filter((s) => s.starId !== id);
  localStorage.setItem(SIGNS_KEY, JSON.stringify(filteredSigns));
}

/** 별 부분 업데이트 (wish + timeframe 지원). */
export async function updateStar(
  id: string,
  updates: { wish?: string; timeframe?: Timeframe },
): Promise<void> {
  const trimmed = {
    ...(updates.wish !== undefined ? { wish: updates.wish.trim() } : {}),
    ...(updates.timeframe !== undefined ? { timeframe: updates.timeframe } : {}),
  };
  if (Object.keys(trimmed).length === 0) return;

  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { error } = await supabase
      .from("stars")
      .update({ ...trimmed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) console.error("updateStar error:", error);
    return;
  }

  // localStorage fallback
  const stars = await loadStars();
  const updated = stars.map((s) =>
    s.id === id ? { ...s, ...trimmed } : s,
  );
  localStorage.setItem(STARS_KEY, JSON.stringify(updated));
}

// ─── Signs ─────────────────────────────────

export async function loadSigns(): Promise<Sign[]> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("signs")
      .select("id, star_id, text, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadSigns error:", error);
      return [];
    }
    return (data as SignRow[]).map(dbToSign);
  }

  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SIGNS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export async function loadSignsForStar(starId: string): Promise<Sign[]> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("signs")
      .select("id, star_id, text, created_at")
      .eq("star_id", starId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadSignsForStar error:", error);
      return [];
    }
    return (data as SignRow[]).map(dbToSign);
  }

  const all = await loadSigns();
  return all
    .filter((s) => s.starId === starId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function addSign(starId: string, text: string): Promise<Sign> {
  const sign: Sign = {
    id: crypto.randomUUID(),
    starId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  const user = await getCurrentUser();

  if (user) {
    const supabase = createClient();
    const { error } = await supabase.from("signs").insert({
      id: sign.id,
      star_id: starId,
      user_id: user.id,
      text: sign.text,
    });
    if (error) console.error("addSign error:", error);
    return sign;
  }

  // localStorage fallback
  const signs = await loadSigns();
  signs.unshift(sign);
  localStorage.setItem(SIGNS_KEY, JSON.stringify(signs));
  return sign;
}

// ─── Sky position generator ───────────────

/**
 * 새 별을 만들 때 *sky 안 랜덤한 안전 위치* 생성.
 * 화면 가장자리·하단 (fox 있는 영역) 피함.
 * 기존 별과 너무 가깝지 않게 minimum spacing 유지.
 */
export function generateStarPosition(existingStars: Star[]): {
  x: number;
  y: number;
  size: Star["size"];
} {
  const MAX_ATTEMPTS = 20;
  const MIN_DISTANCE = 12; // %

  const safeX = { min: 10, max: 88 };
  const safeY = { min: 10, max: 55 }; // 하단은 fox 영역 → 피함

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const x = safeX.min + Math.random() * (safeX.max - safeX.min);
    const y = safeY.min + Math.random() * (safeY.max - safeY.min);

    const tooClose = existingStars.some((s) => {
      const dx = s.x - x;
      const dy = s.y - y;
      return Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE;
    });

    if (!tooClose) {
      const sizes: Star["size"][] = ["sm", "md", "md", "lg"];
      return {
        x,
        y,
        size: sizes[Math.floor(Math.random() * sizes.length)],
      };
    }
  }

  // Fallback: 그냥 랜덤 (많은 별 있을 때)
  return {
    x: safeX.min + Math.random() * (safeX.max - safeX.min),
    y: safeY.min + Math.random() * (safeY.max - safeY.min),
    size: "md",
  };
}

// ─── Helpers ──────────────────────────────

/**
 * 새 별 객체 생성 (아직 저장 안 됨 — sending 애니메이션 중 후에 saveStar 호출).
 * existingStars는 caller가 이미 로드한 state에서 전달 (position 겹침 방지용).
 */
export function createStar(
  wish: string,
  timeframe: Timeframe,
  existingStars: Star[] = [],
): Star {
  const pos = generateStarPosition(existingStars);
  return {
    id: crypto.randomUUID(),
    wish: wish.trim(),
    timeframe,
    x: pos.x,
    y: pos.y,
    size: pos.size,
    createdAt: new Date().toISOString(),
  };
}

/** 시간대별 정렬 (최신 위) */
export function starsByTimeframe(stars: Star[]): Record<Timeframe, Star[]> {
  const map: Record<Timeframe, Star[]> = {
    "this month": [],
    "this season": [],
    "this year": [],
    "someday": [],
  };
  for (const s of stars) {
    if (map[s.timeframe]) map[s.timeframe].push(s);
  }
  return map;
}
