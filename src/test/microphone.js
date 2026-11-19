import { vi } from "vitest";

// What each recorder delivers when it stops
export const CHUNK = "mock-audio-chunk";

// A MediaRecorder that, like a browser's, is inactive as soon as stop() returns but delivers its last
// chunk and its stop event a task later
export class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);

  constructor(stream, options = {}) {
    this.stream = stream;
    this.options = options;
    this.state = "inactive";
    this.ondataavailable = null;
    this.onstop = null;
  }

  start() {
    this.state = "recording";
  }

  pause() {
    this.state = "paused";
  }

  resume() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
    setTimeout(() => {
      this.ondataavailable?.({ data: new Blob([CHUNK], { type: "audio/webm" }) });
      this.onstop?.();
    });
  }
}

// A getUserMedia error as the browser names it
export const micError = (name) => Object.assign(new Error(name), { name });

// Gives the page a microphone with one track; returns the track, to check it was released
export function fakeMicrophone() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: vi.fn(() => [track]) };
  globalThis.MediaRecorder = MockMediaRecorder;
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    configurable: true,
  });
  return { track, stream };
}
