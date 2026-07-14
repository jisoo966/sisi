import { redirect } from "next/navigation";
/** /postcards — 옛날 컬렉션 → 지금은 /gallery */
export default function Page() {
  redirect("/gallery");
}
