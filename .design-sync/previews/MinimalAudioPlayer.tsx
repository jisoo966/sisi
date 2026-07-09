import { MinimalAudioPlayer } from 'sisi-app';

export function Default() {
  return (
    <div style={{ width: 320 }}>
      <MinimalAudioPlayer title="evening wind-down" category="meditation" src="/audio/ambient.mp3" accent="gold" />
    </div>
  );
}

export function Accents() {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ width: 260 }}>
        <MinimalAudioPlayer title="deep rest" src="/audio/ambient.mp3" accent="rose" />
      </div>
      <div style={{ width: 260 }}>
        <MinimalAudioPlayer title="morning clarity" src="/audio/ambient.mp3" accent="sage" />
      </div>
    </div>
  );
}
