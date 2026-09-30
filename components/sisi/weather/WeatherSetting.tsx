"use client";

import { useEffect, useRef, useState } from "react";
import {
  ModalDialog,
  ModalPortal,
  PrimaryButton,
  SecondaryButton,
  TextAction,
} from "@/components/ds";
import {
  requestLocation,
  saveWeatherSettings,
  searchCity,
  weatherSettings,
  type CityResult,
  type WeatherSettings,
} from "@/lib/weather";

/**
 * "Match my weather" — a row for the menu.
 *
 *   Match my weather  [toggle]
 *   Let the Journey reflect the weather around you.
 *
 * Turning it on the first time asks, in Sísí's words:
 *   Let Sísí notice the weather around you?
 *   Use my location · Choose a city · Not now
 * The browser's location prompt appears only after "Use my location".
 * If it's declined we don't ask again: a city can be chosen instead,
 * otherwise the Journey simply stays clear.
 */

export function WeatherSettingRow() {
  const [s, setS] = useState<WeatherSettings>(() => weatherSettings());
  const [ask, setAsk] = useState(false);
  const [city, setCity] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => setS(weatherSettings()), []);

  const toggle = () => {
    if (s.enabled) return setS(saveWeatherSettings({ enabled: false }));
    if (s.place) return setS(saveWeatherSettings({ enabled: true }));
    setNote(null);
    setAsk(true);
  };

  const useLocation = async () => {
    setLocating(true);
    const place = await requestLocation();
    setLocating(false);
    if (place) {
      setS(saveWeatherSettings({ enabled: true, asked: true, place }));
      setAsk(false);
    } else {
      // declined or unavailable: never ask again unprompted; offer a city
      setS(saveWeatherSettings({ asked: true, locationDenied: true }));
      setNote("That’s all right. You can choose a city instead.");
    }
  };

  return (
    <>
      <button type="button" role="switch" aria-checked={s.enabled} className="menu-row wx-row" onClick={toggle}>
        <span className="wx-row-text">
          <span className="menu-row-label">Match my weather</span>
          <span className="ds-helper">
            {s.enabled && s.place ? `${s.place.name === "Near you" ? "Near you" : s.place.name} · ` : ""}Let the Journey reflect the weather around you.
          </span>
        </span>
        <span className={`menu-toggle${s.enabled ? " is-on" : ""}`} aria-hidden>
          <span className="menu-toggle-knob" />
        </span>
      </button>
      {s.enabled && (
        <div className="wx-sub">
          <button type="button" className="ds-text-action wx-change" onClick={() => setCity(true)}>
            Change place
          </button>
          <span className="t-helper wx-credit">
            Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>
          </span>
        </div>
      )}

      <ModalPortal open={ask} onClose={() => setAsk(false)} labelledBy="wx-ask">
        <ModalDialog
          onClose={() => setAsk(false)}
          actions={
            <div className="ds-actions">
              {!s.locationDenied && (
                <PrimaryButton block loading={locating} onClick={useLocation}>
                  Use my location
                </PrimaryButton>
              )}
              <SecondaryButton
                block
                onClick={() => {
                  setAsk(false);
                  setCity(true);
                }}
              >
                Choose a city
              </SecondaryButton>
              <TextAction
                onClick={() => {
                  saveWeatherSettings({ asked: true });
                  setAsk(false);
                }}
              >
                Not now
              </TextAction>
            </div>
          }
        >
          <h2 id="wx-ask" className="t-card-title" style={{ margin: 0 }}>
            Let Sísí notice the weather around you?
          </h2>
          <p className="ds-helper" style={{ margin: "10px 0 0" }}>
            {note ?? "Only the weather is used. Your location stays on this device and is never shown."}
          </p>
        </ModalDialog>
      </ModalPortal>

      <CityPicker
        open={city}
        onClose={() => setCity(false)}
        onPick={(c) => {
          setS(saveWeatherSettings({ enabled: true, asked: true, place: { name: c.name, lat: c.lat, lon: c.lon, source: "city" } }));
          setCity(false);
        }}
      />
      <style jsx global>{`
        .wx-row { align-items: center; }
        .wx-row-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .wx-sub { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .wx-change { margin: 2px 0 0 -12px; }
      `}</style>
    </>
  );
}

function CityPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (c: CityResult) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [busy, setBusy] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(t.current);
    if (q.trim().length < 2) return setResults([]);
    t.current = setTimeout(async () => {
      setBusy(true);
      try {
        setResults(await searchCity(q));
      } catch {
        setResults([]);
      }
      setBusy(false);
    }, 350);
  }, [q]);
  return (
    <ModalPortal open={open} onClose={onClose} labelledBy="wx-city">
      <ModalDialog onClose={onClose} title={<h2 id="wx-city" className="t-card-title" style={{ margin: 0 }}>Choose a city</h2>}>
        <input
          className="ds-field"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Seoul, Lisbon, Portland…"
          aria-label="City"
          autoComplete="off"
          data-autofocus
        />
        <ul className="wx-cities" aria-busy={busy}>
          {results.map((c) => (
            <li key={`${c.name}-${c.lat}-${c.lon}`}>
              <button type="button" className="ds-star-row" onClick={() => onPick(c)}>
                <span className="ds-star-row-main">
                  <span className="ds-star-row-title">{c.name}</span>
                  {c.region && <span className="t-meta" style={{ color: "var(--ink-60)" }}>{c.region}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {q.trim().length >= 2 && !busy && results.length === 0 && <p className="ds-helper">No places with that name yet.</p>}
        <p className="t-helper wx-credit">
          Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a> (CC BY 4.0)
        </p>
        <style jsx global>{`
          .wx-cities { list-style: none; margin: 12px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
          .wx-credit { margin: 16px 0 0; color: var(--ink-60); }
          .wx-credit a { color: inherit; }
        `}</style>
      </ModalDialog>
    </ModalPortal>
  );
}
