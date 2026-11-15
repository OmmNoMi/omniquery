import { createApp } from "vue";
import App from "./App.vue";
import "./styles/main.css";
import { registerServiceWorker } from "./utils/serviceWorker";

window.addEventListener("load", () => registerServiceWorker());

const app = createApp(App);
app.mount("#app");
