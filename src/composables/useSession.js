import { ref, computed, inject, provide } from "vue";

const SESSION_KEY = Symbol("omniquery_session");

function resolveInitialUser() {
  if (typeof window === "undefined" || !window.frappe) return "";
  return window.frappe.user || "";
}

function resolveInitialFullName(user) {
  if (typeof window === "undefined" || !window.frappe) return "";
  const f = window.frappe;
  if (f.user_info && user && f.user_info[user]?.fullname) {
    return f.user_info[user].fullname;
  }
  if (f.boot?.user?.full_name) {
    return f.boot.user.full_name;
  }
  if (f.user_full_name) {
    return f.user_full_name;
  }
  return "";
}

function resolveInitialImage(user) {
  if (typeof window === "undefined" || !window.frappe) return "";
  const f = window.frappe;
  if (f.user_info && user && f.user_info[user]?.image) {
    return f.user_info[user].image;
  }
  if (f.boot?.user?.image) {
    return f.boot.user.image;
  }
  if (f.user_image) {
    return f.user_image;
  }
  return "";
}

export function createSession() {
  const user = ref(resolveInitialUser());
  const fullName = ref(resolveInitialFullName(user.value));
  const userImage = ref(resolveInitialImage(user.value));

  const isGuest = computed(() => {
    return !user.value || user.value === "Guest";
  });

  const email = computed(() => {
    if (isGuest.value) return "";
    return user.value;
  });

  const displayName = computed(() => {
    if (isGuest.value) return "Guest Surveyor";
    if (fullName.value && fullName.value.trim()) return fullName.value.trim();
    if (user.value === "Administrator") return "Administrator";
    return user.value || "Surveyor";
  });

  const userInitial = computed(() => {
    const name = displayName.value || "S";
    return name.charAt(0).toUpperCase();
  });

  function setBootstrapUser(bootUserName) {
    if (bootUserName && bootUserName !== "Guest Surveyor") {
      fullName.value = bootUserName;
    }
  }

  function setSessionUser(newUser, newFullName = "", newImage = "") {
    user.value = newUser || "";
    if (newFullName) fullName.value = newFullName;
    if (newImage) userImage.value = newImage;
  }

  return {
    user,
    fullName,
    userImage,
    isGuest,
    email,
    displayName,
    userInitial,
    setBootstrapUser,
    setSessionUser,
  };
}

let globalSession = null;

export function useSession() {
  const injected = inject(SESSION_KEY, null);
  if (injected) return injected;
  if (!globalSession) {
    globalSession = createSession();
  } else {
    // Refresh against any newly configured window.frappe boot values
    const current = resolveInitialUser();
    if (current && current !== globalSession.user.value) {
      globalSession.setSessionUser(
        current,
        resolveInitialFullName(current),
        resolveInitialImage(current)
      );
    } else {
      const fn = resolveInitialFullName(globalSession.user.value);
      if (fn && fn !== globalSession.fullName.value) {
        globalSession.fullName.value = fn;
      }
    }
  }
  return globalSession;
}

export function provideSession(sessionInstance) {
  const session = sessionInstance || useSession();
  provide(SESSION_KEY, session);
  return session;
}
