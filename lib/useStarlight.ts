"use client";

import { useEffect, useState } from "react";
import { onStarlight, starlightBalance, starlightEarned } from "@/lib/starlight";

/** The Starlight there is to spend, kept current (this tab and others). */
export function useStarlightBalance(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    starlightBalance().then(setN);
    return onStarlight((r) => setN(r.balance));
  }, []);
  return n;
}

/** All Starlight ever gathered (spending never lowers it): the sky's glow. */
export function useStarlightEarned(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    starlightEarned().then(setN);
    return onStarlight(() => {
      starlightEarned().then(setN);
    });
  }, []);
  return n;
}
