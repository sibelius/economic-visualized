/** Keep existing speed settings calibrated to 60 Hz, regardless of display refresh rate. */
const FRAME_MS = 1000 / 60;
const MAX_ELAPSED_MS = 100;

export function startTicker(step: () => void, speed: () => number, onFrame: () => void) {
  let previous = performance.now();
  let accumulator = 0;
  let raf = 0;
  let stopped = false;

  const loop = (now: number) => {
    if (stopped) return;
    // Limit catch-up when frames are suspended, e.g. in a background tab.
    const elapsed = Math.max(0, Math.min(now - previous, MAX_ELAPSED_MS));
    previous = now;
    accumulator += (elapsed / FRAME_MS) * speed();
    while (accumulator >= 1 - 1e-9) {
      step();
      accumulator = Math.max(0, accumulator - 1);
    }
    onFrame();
    if (!stopped) raf = requestAnimationFrame(loop);
  };

  raf = requestAnimationFrame(loop);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}
