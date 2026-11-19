import { computed, toValue } from "vue";

// Roles that see the manager review view instead of the surveyor dashboard.
const MANAGER_ROLES = ["OmniQuery Manager", "OmniQuery Admin", "System Manager"];
const ADMIN_ROLES = ["OmniQuery Admin", "System Manager"];

// Single source for role checks in the field app. `source` is an optional
// roles array (or getter/ref, e.g. a prop); when empty it falls back to the
// roles the portal page boots into window.frappe.user_roles.
export function useUserRoles(source) {
  const roles = computed(() => {
    const given = toValue(source);
    if (Array.isArray(given) && given.length) return given;
    return (typeof window !== "undefined" && window.frappe && window.frappe.user_roles) || [];
  });

  const hasAny = (list) => list.some((role) => roles.value.includes(role));

  const isGuest = computed(() => roles.value.every((role) => role === "Guest"));
  const isManager = computed(() => hasAny(MANAGER_ROLES));
  const isSurveyor = computed(() => roles.value.includes("OmniQuery User"));

  return { roles, isGuest, isManager, isSurveyor, isAdmin: computed(() => hasAny(ADMIN_ROLES)) };
}
