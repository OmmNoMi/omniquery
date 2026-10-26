import { createApp } from "vue";
import App from "./App.vue";
import "./styles/main.css";

// Instant Theme & Text Scale Initializer (synchronizes both .dark and data-theme)
try {
  const theme = localStorage.getItem("omniquery_theme") || "light";
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");

  const textSize = localStorage.getItem("omniquery_text_size") || "md";
  document.documentElement.classList.add("text-scale-" + textSize);
} catch (e) {}

// Offline Service Worker Registration (silent, zero console spam)
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/api/method/omniquery.api.survey.get_service_worker", { scope: "/" })
      .catch(() => {});
  });
}

const app = createApp(App);
app.mount("#app");
