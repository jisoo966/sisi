import { redirect } from "next/navigation";

/** /chat — 옛날 chat → 지금은 /messages */
export default function ChatPage() {
  redirect("/messages");
}
