import { ref, computed } from "vue";
import { db, audioRecordingsFor, recordingKey } from "../services/db";

// One recorder for the whole app. `state` is the only source of truth; the header, the session and
// the microphone alert all read from it (#37):
// idle | requesting | recording | paused | denied | unsupported | no-device | error
const state = ref("idle");
const isRecording = computed(() => state.value === "recording" || state.value === "paused");
const isPaused = computed(() => state.value === "paused");
const audioBlob = ref(null); // the last recording stopRecording() returned
let mediaRecorder = null;
let audioChunks = [];
let mediaStream = null;
let currentMimeType = "audio/webm";
// Bumped each time the microphone is released, so a permission prompt answered after the surveyor
// left the survey does not start a recording that nothing on screen can stop
let session = 0;
// Resolves the stopRecording() in progress. The browser stops a recorder asynchronously, so the
// surveyor can leave in between: release() then settles it with null rather than leave it hanging.
let finishStop = null;

function getSupportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4", "audio/aac"];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t)) || "audio/webm";
}

// The getUserMedia failure, as a state the alert can explain
function failureState(error) {
  if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError" || error?.name === "SecurityError") return "denied";
  if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") return "no-device";
  return "error";
}

function createRecorder(stream) {
  currentMimeType = getSupportedMimeType();
  // 48 kbps Opus is transparent for voice; older browsers reject the options, so fall back step by step
  for (const options of [{ mimeType: currentMimeType, audioBitsPerSecond: 48000 }, { mimeType: currentMimeType }, undefined]) {
    try {
      return new MediaRecorder(stream, options);
    } catch (e) {}
  }
  return null;
}

// Stops the recorder and the microphone without keeping what was recorded. The recorder's handlers
// are detached first, so its late stop event cannot fill audioBlob for whoever records next.
function release() {
  session++;
  const finish = finishStop;
  finishStop = null;
  finish?.(null);
  if (mediaRecorder) {
    mediaRecorder.ondataavailable = null;
    mediaRecorder.onstop = null;
    if (mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch (e) {}
    }
    mediaRecorder = null;
  }
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  audioChunks = [];
  state.value = "idle";
}

export function useAudioRecorder() {
  async function startRecording() {
    if (isRecording.value || state.value === "requesting") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      state.value = "unsupported";
      return;
    }
    const mine = session;
    state.value = "requesting";
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // mono: one voice, half the bytes
          sampleRate: 48000, // full-band voice
          echoCancellation: true,
          noiseSuppression: true, // field and wind noise
          autoGainControl: true, // evens out a distant respondent
        },
      });
    } catch (e) {
      console.warn("Microphone unavailable:", e);
      if (mine === session) state.value = failureState(e);
      return;
    }
    if (mine !== session) {
      // the surveyor left while the browser was asking for permission
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const recorder = createRecorder(stream);
    if (!recorder) {
      stream.getTracks().forEach((track) => track.stop());
      state.value = "unsupported";
      return;
    }
    mediaStream = stream;
    mediaRecorder = recorder;
    audioChunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) audioChunks.push(e.data);
    };
    recorder.start(1000);
    state.value = "recording";
  }

  function pauseRecording() {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.pause();
      state.value = "paused";
    }
  }

  function resumeRecording() {
    if (mediaRecorder?.state === "paused") {
      mediaRecorder.resume();
      state.value = "recording";
    }
  }

  async function toggleAudio() {
    if (!isRecording.value) await startRecording();
    else if (isPaused.value) resumeRecording();
    else pauseRecording();
  }

  // Stops recording and releases the microphone. Resolves with what was recorded since the last
  // start, or null when nothing was: never with an older recording.
  async function stopRecording() {
    const recorder = mediaRecorder;
    if (!recorder || recorder.state === "inactive") {
      release();
      return null;
    }
    return new Promise((resolve) => {
      finishStop = resolve;
      recorder.onstop = () => {
        finishStop = null;
        const blob = audioChunks.length > 0 ? new Blob(audioChunks, { type: currentMimeType }) : null;
        audioBlob.value = blob;
        release();
        resolve(blob);
      };
      recorder.stop();
    });
  }

  // Drops the recording in progress, if any, and clears a microphone error
  function discardAudio() {
    release();
    audioBlob.value = null;
  }

  // Saves a recording for a response. A response that already has one gets the next part, so a
  // draft recorded before and after resuming keeps both (#37).
  async function saveAudioForResponse(responseUid, blob = null, mimeType = null) {
    const b = blob || audioBlob.value;
    if (!b || b.size === 0 || !responseUid) return null;
    const resolvedMime = mimeType || b.type || currentMimeType || "audio/webm";
    const ext = resolvedMime.includes("mp4") ? "mp4" : "webm";
    const part = (await audioRecordingsFor(responseUid).count()) + 1;
    const record = {
      response_uid: recordingKey(responseUid, part),
      response_name: responseUid,
      blob: b,
      mime_type: resolvedMime,
      file_name: part > 1 ? `interview_${responseUid}_part${part}.${ext}` : `interview_${responseUid}.${ext}`,
      size: b.size,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    await db.audio_recordings.put(record);
    return record;
  }

  async function getAudioForResponse(responseUid) {
    if (!responseUid) return null;
    return await db.audio_recordings.get(responseUid);
  }

  return {
    state,
    isRecording,
    isPaused,
    audioBlob,
    startRecording,
    pauseRecording,
    resumeRecording,
    toggleAudio,
    stopRecording,
    discardAudio,
    saveAudioForResponse,
    getAudioForResponse,
  };
}
