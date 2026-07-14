import { redirect } from "next/navigation";

/** /capture — 옛날 캡쳐 → 지금은 /moment */
export default function CapturePage() {
  redirect("/moment");
}
