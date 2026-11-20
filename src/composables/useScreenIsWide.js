import { breakpointsTailwind, createSharedComposable, useBreakpoints } from "@vueuse/core";

// Whether the screen is at least Tailwind's sm breakpoint (640px) wide, read the way frappe-ui's
// Sidebar reads it. One listener serves every component on the page, so when a phone is turned on its
// side they all change in the same render, not one after another as each listener's change event fires.
export const useScreenIsWide = createSharedComposable(() => useBreakpoints(breakpointsTailwind).greaterOrEqual("sm"));
