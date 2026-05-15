"use client";

import { useEffect } from "react";

export default function OneSignalInit({ userId }: { userId: string }) {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || typeof window === "undefined") return;

    // Load OneSignal SDK
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      const w = window as typeof window & { OneSignalDeferred?: ((os: unknown) => void)[] };
      w.OneSignalDeferred = w.OneSignalDeferred ?? [];
      w.OneSignalDeferred.push(async (OneSignal: unknown) => {
        const os = OneSignal as {
          init: (opts: Record<string, unknown>) => Promise<void>;
          login: (id: string) => Promise<void>;
        };
        await os.init({
          appId,
          safari_web_id: process.env.NEXT_PUBLIC_ONESIGNAL_SAFARI_ID,
          notifyButton: { enable: false },
          allowLocalhostAsSecureOrigin: true,
        });
        await os.login(userId);
      });
    };
  }, [userId]);

  return null;
}
