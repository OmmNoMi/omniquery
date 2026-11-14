import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { db, audioRecordingsFor } from "../../services/db";
import { useAudioRecorder } from "../useAudioRecorder";
import { fakeMicrophone, micError, CHUNK } from "../../test/microphone";

describe("useAudioRecorder", () => {
  let mockTrack;
  let mockStream;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await db.audio_recordings.clear();

    ({ track: mockTrack, stream: mockStream } = fakeMicrophone());
  });

  afterEach(() => {
    useAudioRecorder().discardAudio();
  });

  it("moves through recording and paused, and isRecording/isPaused follow the one state", async () => {
    const { state, isRecording, isPaused, startRecording, pauseRecording, resumeRecording } = useAudioRecorder();

    await startRecording();
    expect([state.value, isRecording.value, isPaused.value]).toEqual(["recording", true, false]);

    pauseRecording();
    expect([state.value, isRecording.value, isPaused.value]).toEqual(["paused", true, true]);

    resumeRecording();
    expect([state.value, isRecording.value, isPaused.value]).toEqual(["recording", true, false]);
  });

  it("toggles between recording and paused", async () => {
    const { isRecording, isPaused, toggleAudio } = useAudioRecorder();

    await toggleAudio();
    expect(isRecording.value).toBe(true);
    await toggleAudio();
    expect(isPaused.value).toBe(true);
    await toggleAudio();
    expect(isPaused.value).toBe(false);
  });

  it("stops with the recording and releases the microphone", async () => {
    const { state, startRecording, stopRecording, audioBlob } = useAudioRecorder();

    await startRecording();
    const blob = await stopRecording();

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(audioBlob.value).toBe(blob);
    expect(mockTrack.stop).toHaveBeenCalled();
    expect(state.value).toBe("idle");
  });

  it("never hands an earlier recording to the next response", async () => {
    const { startRecording, stopRecording, discardAudio } = useAudioRecorder();

    await startRecording();
    await stopRecording();
    expect(await stopRecording(), "nothing recorded since the last stop").toBeNull();

    // leaving a survey mid-recording: the recorder's late stop event must not refill the blob
    await startRecording();
    discardAudio();
    expect(await stopRecording(), "a discarded recording stays discarded").toBeNull();
  });

  it("settles a stop interrupted by leaving with nothing, instead of leaving it waiting forever", async () => {
    const { startRecording, stopRecording, discardAudio, audioBlob } = useAudioRecorder();
    await startRecording();
    const stopping = stopRecording();
    discardAudio(); // left before the browser delivered the recording
    expect(await stopping).toBeNull();
    await new Promise((resolve) => setTimeout(resolve));
    expect(audioBlob.value, "the late stop event does not bring it back").toBeNull();
  });

  it("keeps recording when the recording before was left halfway through stopping", async () => {
    const { isRecording, startRecording, stopRecording, discardAudio } = useAudioRecorder();
    await startRecording();
    stopRecording();
    discardAudio(); // left before the browser delivered the recording
    await startRecording();
    await new Promise((resolve) => setTimeout(resolve));
    expect(isRecording.value, "the old recorder's stop event does not end the new recording").toBe(true);
  });

  it("starts the next recording clean when the last one was discarded a moment before", async () => {
    const { startRecording, stopRecording, discardAudio } = useAudioRecorder();
    await startRecording();
    discardAudio();
    await startRecording(); // before the discarded recorder has delivered its last chunk
    const blob = await stopRecording();
    expect(blob.size, "only the new recording's audio").toBe(new Blob([CHUNK]).size);
  });

  it("does not start a recording when the surveyor left while the browser was asking", async () => {
    let allow;
    navigator.mediaDevices.getUserMedia.mockReturnValue(new Promise((resolve) => (allow = resolve)));
    const { state, isRecording, startRecording, discardAudio } = useAudioRecorder();

    const starting = startRecording();
    expect(state.value).toBe("requesting");
    discardAudio(); // the survey was left
    allow(mockStream);
    await starting;

    expect(isRecording.value).toBe(false);
    expect(state.value).toBe("idle");
    expect(mockTrack.stop, "the late stream is released").toHaveBeenCalled();
  });

  it("asks for the microphone once, however often it is tapped", async () => {
    const { startRecording } = useAudioRecorder();
    await Promise.all([startRecording(), startRecording()]);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "no-device"],
    ["NotReadableError", "error"],
  ])("puts a %s from getUserMedia in the %s state", async (name, expected) => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(micError(name));
    const { state, isRecording, startRecording } = useAudioRecorder();
    await startRecording();
    expect(state.value).toBe(expected);
    expect(isRecording.value).toBe(false);
  });

  it("is unsupported where the browser has no getUserMedia", async () => {
    Object.defineProperty(navigator, "mediaDevices", { value: undefined, configurable: true });
    const { state, startRecording } = useAudioRecorder();
    await startRecording();
    expect(state.value).toBe("unsupported");
  });

  it("clears a microphone error on discard", async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(micError("NotAllowedError"));
    const { state, startRecording, discardAudio } = useAudioRecorder();
    await startRecording();
    discardAudio();
    expect(state.value).toBe("idle");
  });

  it("saves a recording for a response and reads it back", async () => {
    const { startRecording, stopRecording, saveAudioForResponse, getAudioForResponse } = useAudioRecorder();
    await startRecording();
    const blob = await stopRecording();

    const saved = await saveAudioForResponse("OQS-TEST-SURVEY-123", blob);
    expect(saved).toMatchObject({ response_uid: "OQS-TEST-SURVEY-123", response_name: "OQS-TEST-SURVEY-123", status: "pending", size: blob.size });

    const retrieved = await getAudioForResponse("OQS-TEST-SURVEY-123");
    expect(retrieved.blob).toBeInstanceOf(Blob);
  });

  it("keeps the recording made before a draft was left when more is recorded after resuming", async () => {
    const { saveAudioForResponse } = useAudioRecorder();
    const uid = "OQS-WATER-001";
    await saveAudioForResponse(uid, new Blob(["before leaving"], { type: "audio/webm" }));
    await saveAudioForResponse(uid, new Blob(["after resuming"], { type: "audio/webm" }));
    await saveAudioForResponse(`${uid}0`, new Blob(["another response"], { type: "audio/webm" }));

    const parts = await audioRecordingsFor(uid).sortBy("response_uid");
    expect(parts.map((p) => [p.response_uid, p.response_name, p.file_name])).toEqual([
      [uid, uid, `interview_${uid}.webm`],
      [`${uid}~2`, uid, `interview_${uid}_part2.webm`],
    ]);
  });
});
