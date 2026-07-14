import { redirect } from "next/navigation";

/** /my-stars/tune-star — dev-only star tuning (deprecated in production) */
export default function TuneStarPage() {
  redirect("/my-stars");
}
