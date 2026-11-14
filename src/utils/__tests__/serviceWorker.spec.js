import { describe, it, expect, vi, afterEach } from "vitest";
import { registerServiceWorker } from "../serviceWorker";

describe("registerServiceWorker (#45)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("registers the app's service worker for the whole site", async () => {
    const register = vi.fn().mockResolvedValue({});
    await registerServiceWorker({ serviceWorker: { register } });
    expect(register).toHaveBeenCalledWith("/api/method/omniquery.api.survey.get_service_worker", { scope: "/" });
  });

  it("logs a failed registration, since it means no offline mode", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("403");
    await registerServiceWorker({ serviceWorker: { register: vi.fn().mockRejectedValue(failure) } });
    expect(error).toHaveBeenCalledWith(expect.stringContaining("offline mode is off"), failure);
  });

  it("logs nothing when it works, and does nothing where service workers are missing", async () => {
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    await registerServiceWorker({ serviceWorker: { register: vi.fn().mockResolvedValue({}) } });
    await registerServiceWorker({});
    expect(log).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
