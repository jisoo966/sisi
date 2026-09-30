"use client";

/**
 * lib/weather — "Match my weather" (optional, off by default).
 *
 * The Journey = selected World + local time of day + a gentle weather layer.
 * Location is asked for ONLY after the person chooses "Use my location";
 * otherwise a city they pick, otherwise clear weather. Coordinates are
 * rounded (~1 km), kept on this device, never shown and never sent to
 * analytics. Weather is fetched when the Journey opens or the app returns
 * to the foreground — at most once every 30 minutes — and the last good
 * result is cached. No continuous tracking.
 *
 * Data: Open-Meteo (https://open-meteo.com), CC BY 4.0 — attribution shown
 * in the setting. The free API is for non-commercial use; a commercial
 * launch needs an Open-Meteo API plan (customer-api.open-meteo.com + key).
 */

import { useEffect, useState } from "react";

export type WeatherState = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "windy";
export type Weather = { state: WeatherState; isDay: boolean; wind: number; at: number };
export type Place = { name: string; lat: number; lon: number; source: "location" | "city" };
export type WeatherSettings = {
  enabled: boolean;
  /** the first-time choice has been made (never ask again unprompted) */
  asked: boolean;
  /** location permission was declined: offer a city instead, don't re-ask */
  locationDenied: boolean;
  place: Place | null;
};

const SETTINGS = "sisi:weather-settings";
const CACHE = "sisi:weather-cache";
const EVENT = "sisi:weather";
export const REFRESH_MS = 30 * 60 * 1000;

const DEFAULTS: WeatherSettings = { enabled: false, asked: false, locationDenied: false, place: null };

export function weatherSettings(): WeatherSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(SETTINGS) ?? "{}") ?? {}) };
  } catch {
    return DEFAULTS;
  }
}
export function saveWeatherSettings(patch: Partial<WeatherSettings>): WeatherSettings {
  const next = { ...weatherSettings(), ...patch };
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT));
  return next;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Ask the browser for a position — only ever called from "Use my location". */
export function requestLocation(): Promise<Place | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ name: "Near you", lat: round(p.coords.latitude), lon: round(p.coords.longitude), source: "location" }),
      () => resolve(null),
      { maximumAge: 6 * 60 * 60 * 1000, timeout: 12000, enableHighAccuracy: false },
    );
  });
}

export type CityResult = { name: string; region: string; lat: number; lon: number };
export async function searchCity(q: string): Promise<CityResult[]> {
  if (q.trim().length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=en&format=json`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const j = (await r.json()) as { results?: { name: string; admin1?: string; country?: string; latitude: number; longitude: number }[] };
  return (j.results ?? []).map((c) => ({
    name: c.name,
    region: [c.admin1, c.country].filter(Boolean).join(", "),
    lat: round(c.latitude),
    lon: round(c.longitude),
  }));
}

/** WMO weather code (+ wind) → one of the gentle Sísí states. */
export function mapWeather(code: number, windKmh: number, cloud: number): WeatherState {
  let s: WeatherState;
  if (code === 45 || code === 48) s = "fog";
  else if (code >= 51 && code <= 57) s = "drizzle";
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) s = "rain"; // storms → gentle rain
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) s = "snow";
  else if (code === 3) s = "cloudy";
  else if (code === 1 || code === 2) s = "partly";
  else s = cloud >= 85 ? "cloudy" : cloud >= 40 ? "partly" : "clear";
  if (windKmh >= 32 && (s === "clear" || s === "partly" || s === "cloudy")) s = "windy";
  return s;
}

function readCache(): Weather | null {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE) ?? "null");
    return v && typeof v.at === "number" ? v : null;
  } catch {
    return null;
  }
}

let inflight: Promise<Weather | null> | null = null;
/** Current weather for the chosen place (cached; ≤ once per 30 minutes). */
export async function currentWeather(force = false): Promise<Weather | null> {
  const s = weatherSettings();
  if (!s.enabled || !s.place) return null;
  const cached = readCache();
  if (!force && cached && Date.now() - cached.at < REFRESH_MS) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { lat, lon } = s.place!;
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=weather_code,is_day,cloud_cover,precipitation,rain,snowfall,wind_speed_10m&timezone=auto`;
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { current: { weather_code: number; is_day: number; cloud_cover: number; wind_speed_10m: number } };
      const c = j.current;
      const w: Weather = { state: mapWeather(c.weather_code, c.wind_speed_10m, c.cloud_cover), isDay: c.is_day === 1, wind: c.wind_speed_10m, at: Date.now() };
      localStorage.setItem(CACHE, JSON.stringify(w));
      return w;
    } catch {
      return cached; // keep the last good sky; otherwise clear
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * The weather to show (null = the World as it is, clear). Refreshes on
 * mount and when the app returns to the foreground after 30+ minutes.
 */
export function useWeather(): Weather | null {
  const [w, setW] = useState<Weather | null>(null);
  useEffect(() => {
    let alive = true;
    const load = (force = false) => currentWeather(force).then((x) => alive && setW(x));
    load();
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const c = readCache();
      if (!c || Date.now() - c.at >= REFRESH_MS) load();
    };
    const onChange = () => {
      if (!weatherSettings().enabled) setW(null);
      else load(true);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(EVENT, onChange);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(EVENT, onChange);
    };
  }, []);
  return w;
}

/* ── the occasional line (not every time the app opens) ─────────────── */

const LINE_KEY = "sisi:weather-lines";
export function weatherLine(state: WeatherState, previous: WeatherState | null): string | null {
  const text =
    state === "rain" || state === "drizzle"
      ? "The rain found us, too."
      : state === "snow"
        ? "The path feels quieter today."
        : state === "fog"
          ? "We don’t have to see the whole way yet."
          : (state === "clear" || state === "partly") && (previous === "rain" || previous === "drizzle")
            ? "The sky is opening again."
            : null;
  if (!text) return null;
  // at most once a day per line, and only some days
  try {
    const seen = JSON.parse(localStorage.getItem(LINE_KEY) ?? "{}") as Record<string, string>;
    const today = new Date().toDateString();
    if (seen[text] === today || Math.random() > 0.45) return null;
    seen[text] = today;
    localStorage.setItem(LINE_KEY, JSON.stringify(seen));
  } catch {
    return null;
  }
  return text;
}
