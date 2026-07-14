import { redirect } from "next/navigation";

/**
 * /me — 옛날 profile 페이지. 이제 /gallery + /my-stars로 분리됨.
 * 자동 redirect.
 */
export default function MePage() {
  redirect("/gallery");
}
