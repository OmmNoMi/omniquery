import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";

// A Geolocation question through the real app: the alert it shows and what the submit sends (#27).
// Only the server is faked, at frappe-ui's call(), and the browser's geolocation.
let batchPush;
vi.mock("frappe-ui", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    call: vi.fn(async (method, args) => {
      if (method === "omniquery.api.survey.get_bootstrap_data") return { is_unassigned: false, templates: [] };
      if (method === "omniquery.api.sync.batch_push") return batchPush(args.submissions);
      return {};
    }),
  };
});

import App from "../../App.vue";
import { db } from "../../services/db";
import { useTranslation } from "../../composables/useTranslation";
import { fakeGeolocation, positionError } from "../../test/geolocation";

const template = {
  name: "TMPL-GPS",
  title: "Location Survey",
  version: 1,
  sections: [{ section_code: "sec_1", section_title: "Where" }],
  questions: [
    { question_code: "q_name", section_code: "sec_1", label_en: "Name" },
    { question_code: "q_loc", section_code: "sec_1", label_en: "Location", field_type: "Geolocation" },
  ],
};
// the Location question card (Survey.vue ids each card qc_<question_code>)
const card = () => document.querySelector("#qc_q_loc");
const gpsButton = () => [...card().querySelectorAll("button")].find((b) => /GPS/.test(b.textContent));
const alerts = () => [...card().querySelectorAll("[role='alert']")];

async function settle() {
  await flushPromises();
  await vi.waitFor(() => {
    if (document.body.textContent.includes("Loading surveys")) throw new Error("still loading");
  });
  await flushPromises();
}

describe("the location of an interview (#27)", () => {
  let wrapper, restore;

  beforeEach(async () => {
    useTranslation().setLanguage("en");
    await Promise.all([db.wal.clear(), db.responses.clear(), db.templates.clear()]);
    batchPush = vi.fn(async (subs) => ({ results: subs.map((s) => ({ idempotency_key: s.idempotency_key, status: "SUCCESS" })) }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    window.history.replaceState({}, "", "/omniquery");
    window.scrollTo = vi.fn();
    wrapper = mount(App, { attachTo: document.body });
    await settle();
    const s = wrapper.vm.s;
    s.activeTemplate = template;
    s.currentDraftId = "OQS-TEST-GPS";
    s.responses = { q_name: "Sunita" };
    await nextTick();
  });
  afterEach(() => {
    restore?.();
    wrapper?.unmount();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("names the reason on the question, once, and asks again from Retry GPS", async () => {
    restore = fakeGeolocation(positionError(3));
    gpsButton().click();
    await nextTick();

    expect(alerts(), "one live region: frappe-ui's Alert").toHaveLength(1);
    expect(alerts()[0].textContent).toContain("Location timed out");
    expect(alerts()[0].textContent, "a timeout is not a permission problem").not.toMatch(/denied|blocked/i);
    expect(gpsButton().textContent.trim()).toBe("Retry GPS");

    restore();
    restore = fakeGeolocation(positionError(1));
    gpsButton().click();
    await nextTick();
    expect(alerts()[0].textContent).toContain("Location access is blocked");

    restore();
    restore = fakeGeolocation({ latitude: 26.9, longitude: 75.8, accuracy: 7.6 });
    gpsButton().click();
    await nextTick();
    expect(alerts()).toHaveLength(0);
  });

  it("says a browser without geolocation cannot share one", async () => {
    restore = fakeGeolocation(undefined);
    gpsButton().click();
    await nextTick();
    expect(alerts()[0].textContent).toContain("Location is not supported");
  });

  it("sends the fix with its accuracy and status when the interview is submitted", async () => {
    restore = fakeGeolocation({ latitude: 0, longitude: 32.5, accuracy: 7.6 });
    gpsButton().click();
    await wrapper.vm.s.submitForm();
    await vi.waitFor(() => expect(batchPush).toHaveBeenCalled());

    expect(batchPush.mock.calls[0][0][0]).toMatchObject({ gps_latitude: 0, gps_longitude: 32.5, gps_accuracy: 8, gps_status: "Captured" });
  });

  it("sends why there is no location when the surveyor denied it", async () => {
    restore = fakeGeolocation(positionError(1));
    gpsButton().click();
    await wrapper.vm.s.submitForm();
    await vi.waitFor(() => expect(batchPush).toHaveBeenCalled());

    expect(batchPush.mock.calls[0][0][0]).toMatchObject({ gps_latitude: null, gps_accuracy: null, gps_status: "Denied" });
  });
});
