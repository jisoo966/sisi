import { redirect } from "next/navigation";
/** /test-stickers — dev test page (deprecated in prod) */
export default function Page() {
  redirect("/journey");
}
