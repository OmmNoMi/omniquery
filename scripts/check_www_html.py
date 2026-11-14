#!/usr/bin/env python3
"""Structural guard for the in-DOM Vue templates under omniquery/www.

These templates are parsed by the BROWSER's native HTML5 parser, so they must
be valid HTML. Two mistakes that an SFC tolerates collapse the whole page here:
  * self-closing a non-void element (<f-combobox ... />)
  * nesting an interactive control in a control (<button> inside <button>)

Run before shipping: `python3 apps/omniquery/scripts/check_www_html.py`.
"""
import sys
from pathlib import Path

import html5lib

STRUCTURAL_ERRORS = {
	"unexpected-end-tag",
	"end-tag-too-early",
	"end-tag-too-early-named",
	"unexpected-start-tag-implies-end-tag",
	"expected-one-end-tag-but-got-another",
	"unexpected-end-tag-treated-as",
	"eof-in-tag",
	"unexpected-end-tag-before-html",
}

IGNORED_ERRORS = {"expected-tag-name", "expected-named-entity", "unexpected-char-after-body"}


def check_html_file(file_path):
	parser = html5lib.HTMLParser(strict=False)
	parser.parse(file_path.read_text(encoding="utf-8"))
	output = []
	for (line, column), code, data in parser.errors:
		if code in IGNORED_ERRORS or code not in STRUCTURAL_ERRORS:
			continue
		output.append(f"line {line}, col {column}: {code} {data or ''}".rstrip())
	return output


def main():
	root_directory = Path(__file__).resolve().parent.parent / "omniquery" / "www"
	has_failures = False
	for html_path in sorted(root_directory.glob("*.html")):
		errors = check_html_file(html_path)
		if errors:
			has_failures = True
			print(f"\n{html_path}:")
			for error in errors:
				print(f"  {error}")
	if has_failures:
		sys.exit(1)
	print("✓ Zero structural HTML5 errors found in omniquery/www/*.html")


if __name__ == "__main__":
	main()
