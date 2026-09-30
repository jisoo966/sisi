"use client";

/**
 * lib/ritualAudio — the sound of Picture it.
 *
 *   voice   Sísí's calm prerecorded lines (/audio/picture-it/<id>.mp3,
 *           made once with scripts/generate-picture-it-voice.mjs)
 *   music   the ambient track, low and continuous
 *
 * Everything runs through one Web Audio graph (iOS ignores
 * HTMLAudioElement.volume, and only a context unlocked by a tap may play
 * later), so it must be prepared from the tap that begins the ritual.
 * While Sísí speaks, the music is ducked ~25%. No sound on text changes.
 * The app's own background music is suspended during the ritual and
 * resumed after (the person's music setting is never changed).
 *
 * If a voice file is missing (before the lines are generated) the line is
 * spoken by the browser's speech synthesis as a stand-in, and a warning is
 * logged — the finished experience uses the recorded voice.
 */

export type VoiceId =
  | "together"
  | "close-eyes"
  | "breathe-in"
  | "breathe-out"
  | "picture"
  | "ordinary"
  | "where"
  | "see"
  | "doing"
  | "notice"
  | "feel"
  | "stay"
  | "no-need"
  | "open-eyes"
  | "keep-feeling";

/**
 * Sísí's recorded lines (voice "Misa – Sweet & Calm", ElevenLabs), cut one
 * file per line into /public/audio/picture-it/. These strings are also the
 * on-screen captions, so they must match what she says.
 */
export const VOICE_LINES: Record<VoiceId, string> = {
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

const VOICE_SRC = (id: VoiceId) => `/audio/picture-it/${id}.mp3`;
const MUSIC_SRC = "/audio/ambient.mp3";
const MUSIC_LEVEL = 0.16; // low
const DUCK = 0.75; // −25% while Sísí speaks
const VOICE_LEVEL = 0.9;

/** Is sound on for the app? (the Ambient music setting in the Menu) */
export function appSoundOn(): boolean {
  try {
    return localStorage.getItem("sisi-music-on") !== "off";
  } catch {
    return true;
  }
}

type AC = AudioContext;

export class RitualAudio {
  private ctx: AC | null = null;
  private musicGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private musicSrc: AudioBufferSourceNode | null = null;
  private musicBuf: Promise<AudioBuffer | null> | null = null;
  private voices = new Map<VoiceId, Promise<AudioBuffer | null>>();
  private speaking = 0;
  private stopped = false;

  constructor(private opts: { voice: boolean; music: boolean }) {}

  /** Call inside the tap that begins the ritual. */
  prepare() {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      void this.ctx.resume();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.ctx.destination);
      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = VOICE_LEVEL;
      this.voiceGain.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
    window.dispatchEvent(new CustomEvent("sisi:music-suspend"));
    if (this.opts.music) this.musicBuf = this.load(MUSIC_SRC);
    if (this.opts.voice) (Object.keys(VOICE_LINES) as VoiceId[]).forEach((id) => this.voices.set(id, this.load(VOICE_SRC(id))));
  }

  private async load(src: string): Promise<AudioBuffer | null> {
    if (!this.ctx) return null;
    try {
      const res = await fetch(src);
      if (!res.ok) return null;
      const data = await res.arrayBuffer();
      return await this.ctx.decodeAudioData(data);
    } catch {
      return null;
    }
  }

  private ramp(g: GainNode | null, to: number, seconds: number) {
    if (!g || !this.ctx) return;
    const now = this.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(to, now + seconds);
  }

  /** the ambient music begins quietly and keeps going */
  async startMusic() {
    if (!this.opts.music || !this.ctx || this.musicSrc) return;
    const buf = await this.musicBuf;
    if (!buf || this.stopped || !this.ctx || !this.musicGain) return;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.connect(this.musicGain);
    s.start();
    this.musicSrc = s;
    this.ramp(this.musicGain, MUSIC_LEVEL * (this.speaking ? DUCK : 1), 3.5);
  }

  private duck(on: boolean) {
    this.speaking = Math.max(0, this.speaking + (on ? 1 : -1));
    if (this.musicSrc) this.ramp(this.musicGain, MUSIC_LEVEL * (this.speaking ? DUCK : 1), on ? 0.35 : 0.8);
  }

  /** Sísí says one line. Resolves when she has finished. */
  async say(id: VoiceId): Promise<void> {
    if (!this.opts.voice || this.stopped) return;
    const buf = await (this.voices.get(id) ?? Promise.resolve(null));
    if (this.stopped) return;
    this.duck(true);
    try {
      if (buf && this.ctx && this.voiceGain) {
        const s = this.ctx.createBufferSource();
        s.buffer = buf;
        s.connect(this.voiceGain);
        await new Promise<void>((resolve) => {
          s.onended = () => resolve();
          s.start();
        });
      } else {
        await speakFallback(VOICE_LINES[id]);
      }
    } finally {
      this.duck(false);
    }
  }

  /** everything fades away; the app's music returns if it was playing */
  stop() {
    if (this.stopped) return;
    this.stopped = true;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      // ignore
    }
    this.ramp(this.musicGain, 0, 1.2);
    this.ramp(this.voiceGain, 0, 0.6);
    const ctx = this.ctx;
    setTimeout(() => {
      try {
        this.musicSrc?.stop();
        void ctx?.close();
      } catch {
        // ignore
      }
      window.dispatchEvent(new CustomEvent("sisi:music-resume"));
    }, 1300);
  }
}

/** stand-in until the recorded lines exist (logged once per line) */
const warned = new Set<string>();
function speakFallback(text: string): Promise<void> {
  if (!warned.has(text)) {
    warned.add(text);
    console.warn(`Picture it: recorded voice missing for “${text}” — using speech synthesis. Run: npm run voice:picture-it`);
  }
  return new Promise((resolve) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return resolve();
      const u = new SpeechSynthesisUtterance(text.replace("…", ""));
      u.rate = 0.82;
      u.pitch = 0.95;
      u.volume = 0.9;
      u.lang = "en-US";
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
      setTimeout(resolve, 9000); // never hang the ritual
    } catch {
      resolve();
    }
  });
}
