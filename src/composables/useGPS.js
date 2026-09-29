import { ref } from "vue";

export function useGPS() {
  const gpsStatus = ref("idle");
  const gpsCoords = ref(null);
  const gpsAccuracy = ref(null);

  function captureGPS() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      gpsStatus.value = "unsupported";
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
      },
      (err) => {
        console.warn("[GPS Warning]", err);
        gpsStatus.value = "error";
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  return {
    gpsStatus,
    gpsCoords,
    gpsAccuracy,
    captureGPS,
  };
}
