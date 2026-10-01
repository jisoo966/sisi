/**
 * @deprecated Picture it's sound now lives in lib/ritualAudio (recorded
 * voice + ambient bed) and vibration in lib/haptics (one haptic language).
 */
export { RitualAudio, VOICE_LINES, appSoundOn } from "./ritualAudio";
export { haptic, hapticsEnabled, hapticsSupported, setHapticsEnabled } from "./haptics";
