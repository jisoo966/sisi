import { redirect } from "next/navigation";

/** /journey/tune-shadow — dev-only shadow tuning (deprecated in production) */
export default function TuneShadowPage() {
  redirect("/journey");
}
