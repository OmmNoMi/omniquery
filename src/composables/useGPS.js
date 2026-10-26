import { ref } from "vue";

export function useGPS() {
  const gpsStatus = ref("idle");
  const gpsCoords = ref(null);
  const gpsAccuracy = ref(null);
  const gpsErrorMessage = ref("");

  function captureGPS() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      gpsStatus.value = "unsupported";
      gpsErrorMessage.value = "Geolocation is not supported by your browser";
      return;
    }
    gpsStatus.value = "locating";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsCoords.value = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        gpsAccuracy.value = Math.round(pos.coords.accuracy);
        gpsStatus.value = "success";
        gpsErrorMessage.value = "";
      },
      (err) => {
        console.warn("[GPS Warning]", err);
        gpsStatus.value = "error";
        if (err.code === 1 || (err.message && err.message.toLowerCase().includes("denied"))) {
          gpsErrorMessage.value = "Allow location access to tag this interview";
        } else if (err.code === 2) {
          gpsErrorMessage.value = "Location unavailable. Please check device GPS settings.";
        } else if (err.code === 3) {
          gpsErrorMessage.value = "Location request timed out. Please try again.";
        } else {
          gpsErrorMessage.value = err.message || "Failed to acquire GPS location";
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  return {
    gpsStatus,
    gpsCoords,
    gpsAccuracy,
    gpsErrorMessage,
    captureGPS,
  };
}
