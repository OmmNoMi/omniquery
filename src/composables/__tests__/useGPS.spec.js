import { describe, it, expect, afterEach, vi } from "vitest";
import { useGPS } from "../useGPS";
import { fakeGeolocation, positionError } from "../../test/geolocation";

// What a response records about its location: the fix, or why there is none (#27)
describe("useGPS", () => {
  let restore;
  afterEach(() => {
    restore?.();
    vi.restoreAllMocks();
  });

  it("reports a browser without geolocation as Unsupported", () => {
    restore = fakeGeolocation(undefined);
    const { gpsStatus, gpsReport, captureGPS } = useGPS();
    captureGPS();
    expect(gpsStatus.value).toBe("unsupported");
    expect(gpsReport.value).toEqual({ status: "Unsupported" });
  });

  it("reports Not captured before the surveyor asks for a location", () => {
    expect(useGPS().gpsReport.value).toEqual({ status: "Not captured" });
  });

  it("records the fix with its accuracy, rounded to the metre", () => {
    restore = fakeGeolocation({ latitude: 26.9124, longitude: 75.7873, accuracy: 8.4 });
    const { gpsStatus, gpsReport, captureGPS } = useGPS();
    captureGPS();
    expect(gpsStatus.value).toBe("success");
    expect(gpsReport.value).toEqual({ latitude: 26.9124, longitude: 75.7873, accuracy: 8, status: "Captured" });
  });

  it("keeps a coordinate of 0 and an accuracy of 0", () => {
    restore = fakeGeolocation({ latitude: 0, longitude: 32.5, accuracy: 0 });
    const { gpsReport, captureGPS } = useGPS();
    captureGPS();
    expect(gpsReport.value).toEqual({ latitude: 0, longitude: 32.5, accuracy: 0, status: "Captured" });
  });

  it.each([
    [1, "denied", "Denied"],
    [2, "unavailable", "Unavailable"],
    [3, "timeout", "Timed out"],
  ])("names error code %i as %s and reports it as %s", (code, state, status) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    restore = fakeGeolocation(positionError(code));
    const { gpsStatus, gpsReport, captureGPS } = useGPS();
    captureGPS();
    expect(gpsStatus.value).toBe(state);
    expect(gpsReport.value).toEqual({ status });
  });

  it("reads the error code, not the browser's wording", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    restore = fakeGeolocation(positionError(2, "User denied access to the GPS chip"));
    const { gpsStatus, captureGPS } = useGPS();
    captureGPS();
    expect(gpsStatus.value).toBe("unavailable");
  });

  it("keeps the last fix when a retry fails", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    restore = fakeGeolocation({ latitude: 26.9, longitude: 75.8, accuracy: 5 });
    const { gpsStatus, gpsReport, captureGPS } = useGPS();
    captureGPS();
    restore();
    restore = fakeGeolocation(positionError(3));
    captureGPS();
    expect(gpsStatus.value).toBe("timeout");
    expect(gpsReport.value).toEqual({ latitude: 26.9, longitude: 75.8, accuracy: 5, status: "Captured" });
  });
});
