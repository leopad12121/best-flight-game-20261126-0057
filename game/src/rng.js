// A small seeded random source: one 32-bit state, advanced by a multiply-xor
// step, so the same seed always deals the same sky. Every spawn, gust and
// cloud in a flight comes from this one stream, which is what makes the
// screenshot scenes repeatable and the game fair to replay.

export function createRng(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    // Every step is coerced back to an unsigned 32-bit integer: in
    // JavaScript `^` yields a signed 32-bit value, and a negative state
    // would hand out negative draws. The result stays in [0, 1).
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    state = (state ^ (state >>> 15)) >>> 0;
    state = Math.imul(state, 2246822519) >>> 0;
    state = (state ^ (state >>> 13)) >>> 0;
    return state / 4294967296;
  }
  return {
    /** A float in [0, 1). */
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + (max - min) * next();
    },
    /** An integer in [min, max]. */
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    /** One element of an array, uniformly. */
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
  };
}
