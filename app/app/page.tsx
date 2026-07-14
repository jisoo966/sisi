import { redirect } from "next/navigation";

/** /app — 옛날 dashboard route → 지금은 /journey */
export default function AppPage() {
  redirect("/journey");
}
