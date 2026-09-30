"use client";

import { useEffect, useState } from "react";
import { onStarlight, starlightBalance } from "@/lib/starlight";

/** The cumulative Starlight balance, kept current (this tab and others). */
export function useStarlightBalance(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    starlightBalance().then(setN);
    return onStarlight((r) => setN(r.balance));
  }, []);
  return n;
}
