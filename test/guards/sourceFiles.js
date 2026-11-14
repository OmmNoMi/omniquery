import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set(["__tests__", "test", "tests", "node_modules", "dist", "__pycache__"]);

// The app's own source files under each root, without tests, build output or dependencies.
export function getSourceFiles(roots, extensions = [".vue", ".js"]) {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(fullPath);
      } else if (extensions.some((ext) => entry.name.endsWith(ext)) && !/\.(spec|test)\.[jt]s$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  };
  [].concat(roots).forEach(walk);
  return files;
}
