#!/usr/bin/env node
/**
 * Generate Sísí's Picture it voice lines once, with ElevenLabs.
 *
 *   npm run voice:picture-it            (skips lines that already exist)
 *   npm run voice:picture-it -- --force (re-records every line)
 *
 * Reads ELEVENLABS_API_KEY and ELEVENLABS_VOICE_SISI_SOFT from .env.local.
 * The current files were recorded in the ElevenLabs app (voice “Misa – Sweet
 * & Calm”) as one take and cut per line; running this replaces them.
 * Writes public/audio/picture-it/<id>.mp3 — commit these files; the app
 * plays them (lib/ritualAudio.ts). Keep the lines in sync with VOICE_LINES.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const env = Object.fromEntries(
  readFileSync(join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const KEY = env.ELEVENLABS_API_KEY;
const VOICE = env.ELEVENLABS_VOICE_SISI_SOFT;
if (!KEY || !VOICE) {
  console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_SISI_SOFT in .env.local");
  process.exit(1);
}

// keep in sync with VOICE_LINES in lib/ritualAudio.ts
const LINES = {
  together: "Let’s picture it together.",
  "close-eyes": "If it feels comfortable, gently close your eyes.",
  "breathe-in": "Take a slow breath in…",
  "breathe-out": "And softly, let it go.",
  picture: "Now, picture an ordinary day where your wish is already part of your life.",
  ordinary: "Nothing extraordinary. Just a quiet, real moment in your day.",
  where: "Where are you?",
  see: "What do you see around you?",
  doing: "What are you doing?",
  notice: "Notice how it feels to be there.",
  feel: "How do you feel in this version of your life?",
  stay: "Stay here for a little while.",
  "no-need": "You don’t need to make anything happen. Just let yourself be here.",
  "open-eyes": "And when you’re ready, slowly open your eyes.",
  "keep-feeling": "Keep a little of that feeling with you. We’ll keep walking toward it together.",
};

const out = join(root, "public/audio/picture-it");
mkdirSync(out, { recursive: true });
const force = process.argv.includes("--force");

for (const [id, text] of Object.entries(LINES)) {
  const file = join(out, `${id}.mp3`);
  if (existsSync(file) && !force) {
    console.log(`✓ ${id} (exists)`);
    continue;
  }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      // calm, steady, unhurried
      voice_settings: { stability: 0.7, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 0.88 },
    }),
  });
  if (!res.ok) {
    console.error(`✗ ${id}: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${id}`);
}
console.log("Done. Listen to each file once before committing.");
