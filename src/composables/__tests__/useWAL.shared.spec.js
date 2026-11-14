import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { useWAL } from "../useWAL";

// App (via useSurveyApp) and FilledFormsModal both call useWAL(): they must share one queue,
// not each run a 15s sync loop that pushes the same WAL entries (#49)
function consumer(seen) {
  return defineComponent({
    setup() {
      seen.push(useWAL());
      return () => h("div");
    },
  });
}

describe("useWAL is one shared instance", () => {
  afterEach(() => vi.restoreAllMocks());

  it("gives every component the same state and starts one sync loop", () => {
    const setSpy = vi.spyOn(globalThis, "setInterval");
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const seen = [];
    const a = mount(consumer(seen));
    const b = mount(consumer(seen));

    expect(seen[0]).toBe(seen[1]);
    expect(setSpy.mock.calls.filter(([, ms]) => ms === 15000)).toHaveLength(1);

    a.unmount();
    expect(clearSpy, "still in use by the second component").not.toHaveBeenCalled();
    b.unmount();
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
