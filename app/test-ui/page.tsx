import { redirect } from "next/navigation";
/** /test-ui — dev test page (deprecated in prod) */
export default function Page() {
  redirect("/journey");
}
