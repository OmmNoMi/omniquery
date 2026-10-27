#!/usr/bin/env python3
"""
scripts/check_no_glyphs.py

Enforces the OmmNoMi Zero-Glyph & No-Emoji Policy across:
  - src/ (Vue components, composables, scripts)
  - omniquery/api/ (backend API responses and copy)
  - omniquery/locale/ (localization files such as hi.csv)
  - Desk JS (omniquery/public/js/ and omniquery/omniquery/doctype/**/*.js)
  - .husky/pre-commit (developer workflow hooks)

Persona Protected:
  - Field surveyors on low-end Android (where emojis render unpredictably or read aloud inappropriately)
  - Screen-reader users (who hear emoji names such as 'building', 'clipboard' rather than intent)

Usage:
  python3 scripts/check_no_glyphs.py [--fix] [paths...]
"""

import os
import sys
import unicodedata
from pathlib import Path


def is_glyph_or_emoji(ch: str) -> bool:
    """Return True if character falls into an emoji, dingbat, or symbol range."""
    cp = ord(ch)

    # 1. Emojis & Pictographs (Emoticons, Miscellaneous Symbols & Pictographs, Transport, Supplemental)
    if 0x1F000 <= cp <= 0x1FAFF:
        return True

    # 2. Miscellaneous Symbols (e.g. ⚡, ☀️, ★, ☆, ⚠️)
    if 0x2600 <= cp <= 0x26FF:
        return True

    # 3. Dingbats (e.g. ✕, ➕, ✓, ✔)
    if 0x2700 <= cp <= 0x27BF:
        return True

    # 4. Miscellaneous Technical (e.g. ⏳, ⏰)
    if 0x2300 <= cp <= 0x23FF:
        return True

    # 5. Geometric Shapes (e.g. ▶, ◀, ▼, ▾, ▲)
    if 0x25A0 <= cp <= 0x25FF:
        return True

    # 6. Supplemental Arrows and Symbols (e.g. ⬇️, ⭐)
    if 0x2B00 <= cp <= 0x2BFF:
        return True

    # 7. Supplemental Arrows / Symbols (2900-297F)
    if 0x2900 <= cp <= 0x297F:
        return True

    # 8. Variation Selectors (FE0E, FE0F) and special emoji marks (203C, 2049, 2122, 2139)
    if cp in (0x203C, 0x2049, 0x2122, 0x2139, 0xFE0E, 0xFE0F):
        return True

    return False


DEFAULT_SCAN_TARGETS = [
    "src",
    "omniquery/api",
    "omniquery/locale",
    "omniquery/public/js",
    "omniquery/omniquery/doctype",
    ".husky/pre-commit",
]

TARGET_EXTENSIONS = {".vue", ".js", ".ts", ".py", ".csv", ".sh", ".html"}


def get_files_to_scan(base_dir: Path, custom_targets=None):
    targets = custom_targets if custom_targets else DEFAULT_SCAN_TARGETS
    files = []
    for target in targets:
        target_path = Path(target)
        p = target_path if target_path.is_absolute() else (base_dir / target)
        if not p.exists():
            continue
        if p.is_file():
            files.append(p)
        else:
            for root, dirs, filenames in os.walk(p):
                # Exclude build, cache, and test fixtures if any
                dirs[:] = [
                    d
                    for d in dirs
                    if d not in ("node_modules", "dist", "__pycache__", ".git")
                ]
                for fn in filenames:
                    ext = Path(fn).suffix
                    if ext in TARGET_EXTENSIONS or fn in ("pre-commit",):
                        files.append(Path(root) / fn)
    return sorted(set(files))


def scan_file(file_path: Path):
    violations = []
    try:
        content = file_path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return [(0, "FILE_ERROR", str(e))]

    for line_idx, line in enumerate(content.splitlines(), start=1):
        line_violations = []
        for col_idx, ch in enumerate(line, start=1):
            if is_glyph_or_emoji(ch):
                name = unicodedata.name(ch, f"U+{ord(ch):04X}")
                line_violations.append((col_idx, ch, name, ord(ch)))
        if line_violations:
            violations.append((line_idx, line_violations, line))

    return violations


def main():
    # Resolve omniquery app root directory
    script_dir = Path(__file__).resolve().parent
    base_dir = script_dir.parent

    custom_paths = sys.argv[1:] if len(sys.argv) > 1 else None
    files_to_scan = get_files_to_scan(base_dir, custom_paths)

    total_violations = 0
    violating_files = 0

    print("==========================================================")
    print("  [Zero-Glyph & No-Emoji Guard] Scanning files...")
    print("==========================================================")

    for file_path in files_to_scan:
        violations = scan_file(file_path)
        if violations:
            violating_files += 1
            try:
                rel_path = file_path.relative_to(base_dir)
            except ValueError:
                rel_path = file_path
            print(f"\n[VIOLATION] {rel_path} ({len(violations)} lines affected):")
            for line_idx, line_viols, line_text in violations:
                glyph_summary = ", ".join(
                    f"'{ch}' (U+{cp:04X} {name})" for _, ch, name, cp in line_viols
                )
                print(f"  Line {line_idx}: {glyph_summary}")
                print(f"    > {line_text.strip()[:100]}")
                total_violations += len(line_viols)

    print("\n----------------------------------------------------------")
    if total_violations == 0:
        print(f"[SUCCESS] Zero emojis/glyphs detected across {len(files_to_scan)} files.")
        print("==========================================================")
        sys.exit(0)
    else:
        print(
            f"[FAILED] Found {total_violations} emoji/glyph violation(s) across {violating_files} file(s)."
        )
        print("Replace emojis and glyphs with Lucide icons (<lucide-icon>) or accessible text.")
        print("==========================================================")
        sys.exit(1)


if __name__ == "__main__":
    main()
