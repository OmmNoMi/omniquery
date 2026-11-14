// Registered after load so it never competes with the bundle. A failure means no offline mode, so it is logged.
export function registerServiceWorker(nav = navigator) {
  if (!("serviceWorker" in nav)) return Promise.resolve();
  return nav.serviceWorker
    .register("/api/method/omniquery.api.survey.get_service_worker", { scope: "/" })
    .catch((err) => console.error("OmniQuery service worker registration failed; offline mode is off", err));
}
