import { vi } from "vitest";

/**
 * window.matchMedia for a screen `width` pixels wide whose device prefers `features`, such as
 * { "prefers-color-scheme": "dark" } or { "prefers-reduced-motion": "reduce" }. Each query is answered
 * against them, as a browser would, so a wrong breakpoint or direction shows: (min-width: Npx) and
 * (max-width: Npx) by the width, (feature: value) by the preference, and anything else not at all.
 * change() moves the screen or the preference, and tells each listener whose answer changed, as turning
 * a phone on its side or switching the device to dark mode does: each in a task of its own, so what one
 * listener's change sets off (a render, a watcher awaiting it) runs before the next one hears, as in a
 * browser. Await it. vi.unstubAllGlobals() puts it back.
 */
export function fakeScreen({ width = 1024, ...features } = {}) {
  const screen = { width, ...features };
  const listeners = new Map();
  const answer = (query) => {
    const [, side, px] = query.match(/\((min|max)-width:\s*([\d.]+)px\)/) || [];
    if (side) return side === "min" ? screen.width >= Number(px) : screen.width <= Number(px);
    const [, feature, value] = query.match(/\(([\w-]+):\s*([\w-]+)\)/) || [];
    return Boolean(feature) && feature !== "width" && screen[feature] === value;
  };
  vi.stubGlobal("matchMedia", (query) => ({
    media: query,
    get matches() {
      return answer(query);
    },
    addEventListener: (_, fn) => listeners.set(fn, query),
    removeEventListener: (_, fn) => listeners.delete(fn),
    addListener: (fn) => listeners.set(fn, query),
    removeListener: (fn) => listeners.delete(fn),
  }));
  return {
    async change(next) {
      const before = new Map([...listeners].map(([fn, query]) => [fn, answer(query)]));
      Object.assign(screen, next);
      for (const [fn, matched] of before) {
        const query = listeners.get(fn);
        if (!query || answer(query) === matched) continue;
        fn({ matches: answer(query), media: query });
        await new Promise((resolve) => setTimeout(resolve));
      }
    },
  };
}
