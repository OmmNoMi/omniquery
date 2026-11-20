import { vi } from "vitest";

// A GeolocationPositionError as the browser hands it over: the code, plus the constants every error carries
export const positionError = (code, message = "") => ({ code, message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });

/**
 * navigator.geolocation answering each getCurrentPosition with `answer`: coords such as
 * { latitude, longitude, accuracy } for a fix, or a positionError. Pass undefined for a browser with none.
 * Returns a function that puts the original back.
 */
export function fakeGeolocation(answer) {
  const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");
  const value =
    answer === undefined
      ? undefined
      : { getCurrentPosition: vi.fn((ok, fail) => ("code" in answer ? fail(answer) : ok({ coords: answer }))) };
  Object.defineProperty(navigator, "geolocation", { value, configurable: true });
  return () => (original ? Object.defineProperty(navigator, "geolocation", original) : delete navigator.geolocation);
}
