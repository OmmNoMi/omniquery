import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";

// Ensure native cloneable Blob and compatible FormData in test environment
const DomBlob = globalThis.Blob;
Object.defineProperty(NodeBlob, Symbol.hasInstance, {
  value: (inst) => inst && typeof inst.size === "number",
});
globalThis.Blob = NodeBlob;
// happy-dom's FileReader reads only its own Blob, and a blob read back from fake-indexeddb is a
// Node Blob, so hand it the same bytes as a happy-dom Blob. A browser reads either.
if (typeof FileReader !== "undefined") {
  const readAsDataURL = FileReader.prototype.readAsDataURL;
  FileReader.prototype.readAsDataURL = function (blob) {
    if (blob instanceof DomBlob || typeof blob?.arrayBuffer !== "function") return readAsDataURL.call(this, blob);
    blob.arrayBuffer().then((bytes) => readAsDataURL.call(this, new DomBlob([bytes], { type: blob.type })));
  };
}
if (typeof FormData !== "undefined" && FormData.prototype) {
  const origAppend = FormData.prototype.append;
  FormData.prototype.append = function (name, value, filename) {
    if (filename && value && typeof value === "object" && typeof value.size === "number") {
      try {
        return origAppend.call(this, name, value, filename);
      } catch (e) {
        return origAppend.call(this, name, value);
      }
    }
    return origAppend.call(this, name, value, filename);
  };
}

// Global mock for Frappe window object
if (typeof window !== "undefined") {
  window.csrf_token = "test_csrf_token";
  window.frappe = {
    user: "test_surveyor@example.com",
    datetime: {
      now_datetime: () => new Date().toISOString(),
    },
  };
}

// Global Vue Test Utils config for frappe-ui (router mock)
import { config } from "@vue/test-utils";
import { createRouter, createMemoryHistory } from "vue-router";
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/", component: { template: "<div/>" } }],
});
config.global.plugins = [router];
config.global.provide = config.global.provide || {};
config.global.mocks = config.global.mocks || {};
config.global.mocks.$router = router;
