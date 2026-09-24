/**
 * Data mode for this build.
 *
 * LOCAL_ONLY (default on the redesign branch): every star, sign, moment,
 * Little Light, satchel item and chat stays on this device (localStorage).
 * Nothing is read from or written to the production Supabase database, so
 * testing the redesign can never change hellosisi.co data.
 * Sign-in itself still works (it doesn't change any app data).
 *
 * To connect real data later, set NEXT_PUBLIC_SISI_DATA=supabase
 * (ideally pointing the Preview environment at a separate Supabase project).
 */
export const LOCAL_ONLY = process.env.NEXT_PUBLIC_SISI_DATA !== "supabase";
