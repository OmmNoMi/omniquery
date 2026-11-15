import { computed, ref } from "vue";

// GeolocationPositionError codes (W3C Geolocation API)
const ERROR_STATES = { 1: "denied", 2: "unavailable", 3: "timeout" };

// The words the server stores in gps_status (omniquery/services/location.py)
const SERVER_STATUS = {
  denied: "Denied",
  unavailable: "Unavailable",
  timeout: "Timed out",
  unsupported: "Unsupported",
};

/**
 * gpsStatus: idle | locating | success | denied | unavailable | timeout | unsupported.
 * gpsReport is what a response records: the last fix with its accuracy, or why there is none (#27).
 */
export function useGPS() {
  const gpsStatus = ref("idle");
  const gpsCoords = ref(null);
  const gpsAccuracy = ref(null);

  const gpsReport = computed(() => {
    if (gpsCoords.value) return { ...gpsCoords.value, accuracy: gpsAccuracy.value, status: "Captured" };
    return { status: SERVER_STATUS[gpsStatus.value] || "Not captured" };
  });

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
        gpsStatus.value = ERROR_STATES[err.code] || "unavailable";
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  return {
    gpsStatus,
    gpsCoords,
    gpsAccuracy,
    gpsReport,
    captureGPS,
  };
}
