import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { db } from "../../services/db";
import { useAudioRecorder } from "../useAudioRecorder";

class MockMediaRecorder {
  static isTypeSupported = vi.fn(() => true);

  constructor(stream, options = {}) {
    this.stream = stream;
    this.options = options;
    this.state = "inactive";
    this.ondataavailable = null;
    this.onstop = null;
  }

  start(timeslice) {
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
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(["mock-audio-chunk"], { type: "audio/webm" }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  }
}

describe("useAudioRecorder", () => {
  let mockTrack;
  let mockStream;

  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.audio_recordings.clear();

    mockTrack = { stop: vi.fn() };
    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    };

    global.MediaRecorder = MockMediaRecorder;

    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    const { discardAudio } = useAudioRecorder();
    discardAudio();
  });

  it("starts recording and handles state transitions", async () => {
    const { isRecording, isPaused, startRecording, pauseRecording, resumeRecording } = useAudioRecorder();

    await startRecording();
    expect(isRecording.value).toBe(true);
    expect(isPaused.value).toBe(false);

    pauseRecording();
    expect(isPaused.value).toBe(true);

    resumeRecording();
    expect(isPaused.value).toBe(false);
  });

  it("toggles audio correctly through states", async () => {
    const { isRecording, isPaused, toggleAudio } = useAudioRecorder();

    await toggleAudio();
    expect(isRecording.value).toBe(true);
    expect(isPaused.value).toBe(false);

    toggleAudio(); // Pause
    expect(isPaused.value).toBe(true);

    toggleAudio(); // Resume
    expect(isPaused.value).toBe(false);
  });

  it("stops recording asynchronously and resolves with final Blob", async () => {
    const { startRecording, stopRecording, audioBlob } = useAudioRecorder();

    await startRecording();
    const resultBlob = await stopRecording();

    expect(resultBlob).toBeTruthy();
    expect(resultBlob).toBeInstanceOf(Blob);
    expect(resultBlob.size).toBeGreaterThan(0);
    expect(audioBlob.value).toBe(resultBlob);
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it("saves audio to IndexedDB and retrieves it by response_uid", async () => {
    const { startRecording, stopRecording, saveAudioForResponse, getAudioForResponse } = useAudioRecorder();

    await startRecording();
    const blob = await stopRecording();

    const testUid = "OQS-TEST-SURVEY-123";
    const saved = await saveAudioForResponse(testUid, blob);

    expect(saved).toBeTruthy();
    expect(saved.response_uid).toBe(testUid);
    expect(saved.status).toBe("pending");
    expect(saved.size).toBe(blob.size);

    const retrieved = await getAudioForResponse(testUid);
    expect(retrieved).toBeTruthy();
    expect(retrieved.response_uid).toBe(testUid);
    expect(retrieved.blob).toBeInstanceOf(Blob);
  });

  it("discards audio and clears internal chunks", async () => {
    const { startRecording, stopRecording, discardAudio, audioBlob } = useAudioRecorder();

    await startRecording();
    await stopRecording();
    expect(audioBlob.value).toBeTruthy();

    discardAudio();
    expect(audioBlob.value).toBeNull();
  });
});
