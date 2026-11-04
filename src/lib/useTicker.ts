"use client";

import { useEffect, useRef, useState } from "react";
import { startTicker } from "./ticker";

/**
 * Drives a simulation with requestAnimationFrame. `step` is called `speed`
 * times per 1/60 second while running, independent of display refresh rate.
 * Returns play/pause state and a frame counter you can use to trigger
 * re-renders when your sim state lives in a ref.
 */
export function useTicker(step: () => void, { speed = 1, autoplay = false }: { speed?: number; autoplay?: boolean } = {}) {
  const [running, setRunning] = useState(autoplay);
  const [frame, setFrame] = useState(0);
  const stepRef = useRef(step);
  stepRef.current = step;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    if (!running) return;
    return startTicker(
      () => stepRef.current(),
      () => speedRef.current,
      () => setFrame((f) => f + 1),
    );
  }, [running]);

  return {
    running,
    play: () => setRunning(true),
    pause: () => setRunning(false),
    toggle: () => setRunning((r) => !r),
    /** advance once and re-render */
    tick: () => {
      stepRef.current();
      setFrame((f) => f + 1);
    },
    /** force a re-render (e.g. after reset) */
    refresh: () => setFrame((f) => f + 1),
    frame,
  };
}
