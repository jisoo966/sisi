// Talk to Sísí through your running dev server (npm run dev), carrying the conversation state like the app does.
// Usage: node scripts/test-conversation.mjs
const say = ["I feel kind of empty tonight", "my dog is lying next to me", "ahri", "yeah", "idk", "she's snoring a little"];
let messages = [], meta = null;
const parseMeta = (a) => { const m = /§\s*META\s*(\{[\s\S]*\})\s*$/.exec(a); try { return m ? JSON.parse(m[1]) : null; } catch { return null; } };
const visible = (a) => a.replace(/§\s*META[\s\S]*$/, "").replace(/\[(?:SAVE|MOOD|ACTION|VISIT):[a-z0-9_]+\]|\[CHIPS:[^\]]*\]/gi, "").trim();
for (const u of say) {
  messages.push({ role: "user", content: u });
  const r = await fetch("http://localhost:3000/api/chat", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: "live-test", messages, summary: meta?.summary ?? "", entities: meta?.entities ?? [], topic: meta?.topic ?? "", stage: meta?.stage ?? "opening", currentStar: "A calmer, steadier life", stars: ["A calmer, steadier life"] }),
  });
  const txt = await r.text();
  let acc = "";
  for (const line of txt.split("\n")) if (line.startsWith("data: ") && !line.includes("[DONE]")) { try { acc += JSON.parse(line.slice(6)).text ?? ""; } catch {} }
  meta = parseMeta(acc) ?? meta;
  const reply = visible(acc);
  messages.push({ role: "assistant", content: reply });
  const markers = (acc.match(/\[[A-Z]+:[^\]]*\]/g) || []).join(" ");
  console.log(`\nUSER: ${u}\nSÍSÍ: ${reply}${markers ? `   ${markers}` : ""}\n   [stage=${meta?.stage} topic="${meta?.topic}" entities=${JSON.stringify(meta?.entities)}]`);
}
