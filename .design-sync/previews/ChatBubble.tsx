import { ChatBubble } from 'sisi-app';

export function SisiMessage() {
  return (
    <div style={{ width: 360, background: '#F5EFE6', padding: 20 }}>
      <ChatBubble
        from="sisi"
        text="what is meant for you is on its way. take a slow breath — you don't have to rush this."
        time="9:41 AM"
      />
    </div>
  );
}

export function UserMessage() {
  return (
    <div style={{ width: 360, background: '#F5EFE6', padding: 20 }}>
      <ChatBubble from="user" text="I keep worrying I'm behind." time="9:42 AM" />
    </div>
  );
}

export function Conversation() {
  return (
    <div style={{ width: 380, background: '#F5EFE6', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ChatBubble from="sisi" text="how are you feeling tonight?" time="9:40 PM" />
      <ChatBubble from="user" text="a little anxious about tomorrow." time="9:41 PM" />
      <ChatBubble from="sisi" text="that's okay. you're allowed to feel that and still trust the timing." time="9:41 PM" />
    </div>
  );
}
