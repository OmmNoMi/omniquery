import "fake-indexeddb/auto";
import { Blob as NodeBlob } from "node:buffer";

// Ensure native cloneable Blob and compatible FormData in test environment
Object.defineProperty(NodeBlob, Symbol.hasInstance, {
  value: (inst) => inst && typeof inst.size === "number",
});
globalThis.Blob = NodeBlob;
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
  window.frappe = {
    csrf_token: "test_csrf_token",
    user: "test_surveyor@example.com",
    datetime: {
      now_datetime: () => new Date().toISOString(),
    },
  };
}
