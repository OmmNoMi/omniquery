import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGPS } from "../useGPS";

describe("useGPS", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles unsupported environment gracefully", () => {
    const originalGeo = navigator.geolocation;
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      configurable: true,
    });

    const { gpsStatus, captureGPS } = useGPS();
    captureGPS();
    expect(gpsStatus.value).toBe("unsupported");

    Object.defineProperty(navigator, "geolocation", {
      value: originalGeo,
      configurable: true,
    });
  });

  it("captures high accuracy latitude and longitude successfully", () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({
          coords: {
            latitude: 26.9124,
            longitude: 75.7873,
            accuracy: 8.4,
          },
        });
      }),
    };

    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
    });

    const { gpsStatus, gpsCoords, gpsAccuracy, captureGPS } = useGPS();
    captureGPS();

    expect(gpsStatus.value).toBe("success");
    expect(gpsCoords.value).toEqual({ latitude: 26.9124, longitude: 75.7873 });
    expect(gpsAccuracy.value).toBe(8);
  });

  it("sets error status on geolocation rejection or timeout", () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_, error) => {
        error({ code: 1, message: "User denied Geolocation" });
      }),
    };

    Object.defineProperty(navigator, "geolocation", {
      value: mockGeolocation,
      configurable: true,
    });

    const { gpsStatus, captureGPS } = useGPS();
    captureGPS();

    expect(gpsStatus.value).toBe("error");
  });
});
