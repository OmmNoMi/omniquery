import { describe, it, expect, afterEach } from "vitest";
import { ref } from "vue";
import { useUserRoles } from "../useUserRoles";

describe("useUserRoles", () => {
  afterEach(() => {
    delete window.frappe;
  });

  it("falls back to the roles the portal page boots into window.frappe", () => {
    window.frappe = { user_roles: ["All", "Guest", "OmniQuery Manager"] };
    const { isManager, isSurveyor, isGuest } = useUserRoles(() => []);
    expect(isManager.value).toBe(true);
    expect(isSurveyor.value).toBe(false);
    expect(isGuest.value).toBe(false);
  });

  it("treats no roles, or only Guest, as a guest", () => {
    expect(useUserRoles().isGuest.value).toBe(true);
    expect(useUserRoles(["Guest"]).isGuest.value).toBe(true);
  });

  it("reacts when the given roles change", () => {
    const roles = ref(["OmniQuery User"]);
    const { isManager, isSurveyor } = useUserRoles(roles);
    expect(isSurveyor.value).toBe(true);
    roles.value = ["OmniQuery Admin"];
    expect(isManager.value).toBe(true);
    expect(isSurveyor.value).toBe(false);
  });
});
