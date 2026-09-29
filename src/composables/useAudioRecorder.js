import { ref } from "vue";

const isRecording = ref(false);
const isPaused = ref(false);
const audioBlob = ref(null);
let mediaRecorder = null;
let audioChunks = [];
let mediaStream = null;

export function useAudioRecorder() {
  async function initStream() {
    if (mediaStream) return mediaStream;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return null;
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return mediaStream;
  }

  function handleDataAvailable(e) {
    if (e.data && e.data.size > 0) {
      audioChunks.push(e.data);
    }
  }

  function handleRecorderStop() {
    audioBlob.value = new Blob(audioChunks, { type: "audio/webm" });
    isRecording.value = false;
    isPaused.value = false;
  }

  async function startRecording() {
    try {
      const stream = await initStream();
      if (!stream) return;
      audioChunks = [];
      mediaRecorder = new MediaRecorder(stream);
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

  function toggleAudio() {
    if (!isRecording.value) {
      startRecording();
    } else if (isPaused.value) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    return audioBlob.value;
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
  };
}
