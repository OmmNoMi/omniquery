import { ref } from "vue";
import { db } from "../services/db";

const isRecording = ref(false);
const isPaused = ref(false);
const audioBlob = ref(null);
let mediaRecorder = null;
let audioChunks = [];
let mediaStream = null;
let currentMimeType = "audio/webm";

function getSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/aac",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "audio/webm";
}

export function useAudioRecorder() {
  async function initStream() {
    if (mediaStream) return mediaStream;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1, // Mono: single source voice; saves 50% byte weight with zero vocal fidelity loss
        sampleRate: 48000, // 48 kHz full-band voice capture
        echoCancellation: true, // Hardware/browser acoustic echo cancellation
        noiseSuppression: true, // Filters out field environmental & wind noise
        autoGainControl: true, // Normalizes distant respondent speech levels
      },
    });
    return mediaStream;
  }

  function handleDataAvailable(e) {
    if (e.data && e.data.size > 0) {
      audioChunks.push(e.data);
    }
  }

  function handleRecorderStop() {
    if (audioChunks.length > 0) {
      audioBlob.value = new Blob(audioChunks, { type: currentMimeType });
    }
    isRecording.value = false;
    isPaused.value = false;
  }

  async function startRecording() {
    try {
      const stream = await initStream();
      if (!stream) return;
      audioChunks = [];
      currentMimeType = getSupportedMimeType();
      const recorderOptions = {
        mimeType: currentMimeType,
        audioBitsPerSecond: 48000, // 48 kbps Opus: perceptually transparent/lossless full-band voice compression
      };
      try {
        mediaRecorder = new MediaRecorder(stream, recorderOptions);
      } catch (optErr) {
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: currentMimeType });
        } catch (mimeErr) {
          mediaRecorder = new MediaRecorder(stream);
        }
      }
      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.onstop = handleRecorderStop;
      mediaRecorder.start(1000);
      isRecording.value = true;
      isPaused.value = false;
    } catch (e) {
      console.warn("Audio recording unavailable or denied:", e);
    }
  }

  function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.pause();
      isPaused.value = true;
    }
  }

  function resumeRecording() {
    if (mediaRecorder && mediaRecorder.state === "paused") {
      mediaRecorder.resume();
      isPaused.value = false;
    }
  }

  async function toggleAudio() {
    if (!isRecording.value) {
      await startRecording();
    } else if (isPaused.value) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }

  async function stopRecording() {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }
      isRecording.value = false;
      isPaused.value = false;
      return audioBlob.value;
    }

    return new Promise((resolve) => {
      const originalOnStop = mediaRecorder.onstop;
      mediaRecorder.onstop = (e) => {
        if (originalOnStop) originalOnStop(e);
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
        }
        resolve(audioBlob.value);
      };
      mediaRecorder.stop();
    });
  }

  function discardAudio() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try {
        mediaRecorder.stop();
      } catch (e) {}
    }
    if (mediaStream) {
      try {
        mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      mediaStream = null;
    }
    mediaRecorder = null;
    audioChunks = [];
    audioBlob.value = null;
    isRecording.value = false;
    isPaused.value = false;
  }

  async function saveAudioForResponse(responseUid, blob = null, mimeType = null) {
    const b = blob || audioBlob.value;
    if (!b || b.size === 0 || !responseUid) return null;
    const resolvedMime = mimeType || b.type || currentMimeType || "audio/webm";
    const ext = resolvedMime.includes("mp4") ? "mp4" : "webm";
    const record = {
      response_uid: responseUid,
      blob: b,
      mime_type: resolvedMime,
      file_name: `interview_${responseUid}.${ext}`,
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
