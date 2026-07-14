import { redirect } from "next/navigation";

/** /upgrade — 옛날 pricing (Stripe 나중에) */
export default function UpgradePage() {
  redirect("/journey");
}
