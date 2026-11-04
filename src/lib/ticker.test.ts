import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { startTicker } from "./ticker.ts";

let now = 0;
let nextId = 0;
const pending = new Map<number, FrameRequestCallback>();
const originalRaf = globalThis.requestAnimationFrame;
const originalCancel = globalThis.cancelAnimationFrame;

beforeEach(() => {
  now = 0;
  nextId = 0;
  pending.clear();
  mock.method(performance, "now", () => now);
  globalThis.requestAnimationFrame = (callback) => {
    pending.set(++nextId, callback);
    return nextId;
  };
  globalThis.cancelAnimationFrame = (id) => { pending.delete(id); };
});

afterEach(() => {
  mock.restoreAll();
  globalThis.requestAnimationFrame = originalRaf;
  globalThis.cancelAnimationFrame = originalCancel;
});

function frame(time: number) {
  now = time;
  const callbacks = [...pending.values()];
  pending.clear();
  callbacks.forEach((callback) => callback(now));
}

for (const hz of [30, 60, 120, 144]) {
  test(`advances at the same rate on a ${hz} Hz display`, () => {
    let steps = 0;
    const stop = startTicker(() => { steps++; }, () => 0.12, () => {});
    for (let i = 1; i <= hz * 10; i++) frame(i * 1000 / hz);
    assert.equal(steps, 72);
    stop();
  });
}

test("uses the latest speed without restarting", () => {
  let speed = 1;
  let steps = 0;
  const stop = startTicker(() => { steps++; }, () => speed, () => {});
  frame(1000 / 60);
  assert.equal(steps, 1);
  speed = 2;
  frame(2000 / 60);
  assert.equal(steps, 3);
  stop();
});

test("caps catch-up after a long gap", () => {
  let steps = 0;
  const stop = startTicker(() => { steps++; }, () => 1, () => {});
  frame(60_000);
  assert.equal(steps, 6);
  frame(60_000 + 1000 / 60);
  assert.equal(steps, 7);
  stop();
});

test("cancels pending frames and starts fresh on resume", () => {
  let steps = 0;
  const start = () => startTicker(() => { steps++; }, () => 1, () => {});
  const stop = start();
  frame(1000 / 60);
  stop();
  assert.equal(pending.size, 0);
  frame(60_000);
  assert.equal(steps, 1);
  const stopAgain = start();
  frame(60_000 + 1000 / 60);
  assert.equal(steps, 2);
  stopAgain();
});

test("renders each animation frame even at fractional speed", () => {
  let steps = 0;
  let renders = 0;
  const stop = startTicker(() => { steps++; }, () => 0.1, () => { renders++; });
  for (let i = 1; i <= 10; i++) frame(i * 1000 / 60);
  assert.equal(steps, 1);
  assert.equal(renders, 10);
  stop();
});
