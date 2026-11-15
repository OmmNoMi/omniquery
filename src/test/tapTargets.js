// WCAG 2.5.8 (target size, minimum): a pointer target is at least 24x24 CSS px. jsdom has no
// layout, so a spec reads the size from the element's Tailwind classes instead: h-*, min-h-*,
// w-*, size-* (frappe-ui Button sizes are h-7 / h-8 / h-10 ...). Only unprefixed classes count,
// because that is the size at 375px; `sm:h-10` does not help a phone.
const SPACING_PX = 4;

function classPx(token, prop) {
  const m = token.replace(/^!/, "").match(new RegExp(`^${prop}-(?:\\[(\\d+(?:\\.\\d+)?)px\\]|(\\d+(?:\\.5)?))$`));
  if (!m) return null;
  return m[1] !== undefined ? Number(m[1]) : Number(m[2]) * SPACING_PX;
}

// The height and width the classes give, in px; null where no class sets one. An `!important` class
// wins over the rest, as in CSS: a frappe-ui Button carries its own h-7, and a `!h-4` beats it.
export function classTargetSize(classList) {
  const tokens = String(classList).split(/\s+/).filter((t) => t && !t.includes(":"));
  const largest = (props) => {
    const sized = (group) => group.flatMap((t) => props.map((p) => classPx(t, p))).filter((v) => v !== null);
    const important = sized(tokens.filter((t) => t.startsWith("!")));
    const values = important.length ? important : sized(tokens);
    return values.length ? Math.max(...values) : null;
  };
  return { height: largest(["h", "min-h", "size"]), width: largest(["w", "min-w", "size"]) };
}

// A target that sets no height of its own is as tall as its tallest sized child (a link around an icon)
function targetSize(el) {
  const own = classTargetSize(el.getAttribute("class") || "");
  if (own.height !== null) return own;
  const childHeights = [...el.children].map((child) => classTargetSize(child.getAttribute("class") || "").height).filter((h) => h !== null);
  return { ...own, height: childHeights.length ? Math.max(...childHeights) : null };
}

// The buttons and links under `root` whose classes make them smaller than 24px, or that set no height
// at all: ["Settings & Configuration: 20x?px", ...]. Width is only checked where a class sets it.
export function smallTapTargets(root, min = 24) {
  return [...root.querySelectorAll("button, a[href], [role='button']")]
    .map((el) => ({ el, size: targetSize(el) }))
    .filter(({ size }) => size.height === null || size.height < min || (size.width !== null && size.width < min))
    .map(({ el, size }) => `${el.getAttribute("aria-label") || el.textContent.trim() || el.outerHTML.slice(0, 60)}: ${size.width ?? "?"}x${size.height ?? "?"}px`);
}
