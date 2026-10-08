"use client";

import { useEffect } from "react";
import { startCloudSave } from "@/lib/cloudSave";

/** Quiet backup (lib/cloudSave). Restored from the backup → read it all fresh, once. */
export function CloudSave() {
  useEffect(() => {
    startCloudSave().then((restored) => {
      if (restored) window.location.reload();
    });
  }, []);
  return null;
}
