import { redirect } from "next/navigation";

/** /journey/tune — dev-only fox path tuning (deprecated in production) */
export default function TunePage() {
  redirect("/journey");
}
