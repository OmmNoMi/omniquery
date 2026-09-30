import "fake-indexeddb/auto";

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
