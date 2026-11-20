import { computed } from "vue";
import { useTranslation } from "./useTranslation";

// The signed-in user as the portal page boots them (omniquery/www/omniquery.html).
// It does not change while the page is open: signing in or out reloads it.
function booted(key) {
  return (typeof window !== "undefined" && window.frappe && window.frappe[key]) || "";
}

// Who is using the app: greet them by full name, and show the email only where it adds something (#51).
export function useSession() {
  const { __ } = useTranslation();

  const email = computed(() => {
    const user = booted("user");
    return user === "Guest" ? "" : user;
  });
  const displayName = computed(() => booted("user_fullname").trim() || email.value || __("Guest Surveyor"));
  const userInitial = computed(() => displayName.value.charAt(0).toUpperCase());

  return { email, displayName, userInitial };
}
