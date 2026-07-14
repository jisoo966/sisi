import { redirect } from "next/navigation";

/**
 * /collect — Legacy route, now merged into /messages
 * Messages page handles both the "opening" (What stayed?) state
 * and the chat conversation in a single flow with smooth transition.
 */
export default function CollectPage() {
  redirect("/messages");
}
