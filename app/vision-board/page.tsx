import { redirect } from "next/navigation";

/** /vision-board — 옛날 vision board (deprecated) */
export default function VisionBoardPage() {
  redirect("/gallery");
}
