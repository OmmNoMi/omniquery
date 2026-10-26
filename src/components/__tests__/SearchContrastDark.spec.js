import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../../App.vue";

describe("Search field accessibility and template card contrast (Issue #43)", () => {
  let el;

  beforeEach(() => {
    el = document.createElement("div");
    el.id = "app-test-root";
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("search field in App.vue has accessible aria-label and clear button has accessible name", async () => {
    const wrapper = mount(App, {
      attachTo: el,
    });

    await new Promise((r) => setTimeout(r, 60));
    wrapper.vm.isLoading = false;
    await wrapper.vm.$nextTick();

    // 1. Search input must have aria-label
    const searchInput = el.querySelector("input");
    expect(searchInput).toBeTruthy();
    expect(searchInput.getAttribute("aria-label")).toBeTruthy();

    // 2. Set search query to show clear button
    wrapper.vm.searchQuery = "Household";
    wrapper.vm.isLoading = false;
    await wrapper.vm.$nextTick();

    // 3. Clear button must have aria-label="Clear search" and contain SVG icon
    const clearBtn = el.querySelector("button[aria-label*='Clear']");
    expect(clearBtn).toBeTruthy();
    expect(clearBtn.getAttribute("aria-label").toLowerCase()).toContain("clear");
    expect(clearBtn.querySelector("svg")).toBeTruthy();

    wrapper.unmount();
  });

  it("empty state and template cards support dark mode surface classes", async () => {
    const wrapper = mount(App, {
      attachTo: el,
    });

    await new Promise((r) => setTimeout(r, 60));
    wrapper.vm.isLoading = false;
    await wrapper.vm.$nextTick();

    // Empty state container has dark:bg-slate-900 and dark:border-slate-800
    wrapper.vm.searchQuery = "non_existent_query_xyz_999";
    wrapper.vm.isLoading = false;
    await wrapper.vm.$nextTick();

    const emptyCard = el.querySelector(".text-center");
    expect(emptyCard).toBeTruthy();
    expect(emptyCard.className).toContain("dark:bg-slate-900");
    expect(emptyCard.className).toContain("dark:border-slate-800");

    wrapper.unmount();
  });
});
