#!/usr/bin/env python3
"""
Split translation.json into 8 i18next namespace files.

Reads public/locales/en/translation.json and produces:
  common.json, landing.json, pages.json, services.json,
  innovation-lab.json, auth.json, seo.json, blog.json

Key transformations:
  - common/landing: keys unchanged from their top-level sections
  - pages: strips 'pages.' prefix (excluding services, innovationLab, auth)
  - services: strips 'pages.services.' prefix
  - innovation-lab: strips 'pages.innovationLab.' prefix
  - auth: strips 'auth.' prefix, merges pages.auth (strips 'pages.auth.'), and setup
  - seo: strips outermost 'seo.' prefix
  - blog: strips 'blogUi.' prefix
"""

import json
import sys
from pathlib import Path

LOCALES_DIR = Path(__file__).resolve().parent.parent / "public" / "locales" / "en-US"
SOURCE = LOCALES_DIR / "translation.json"

# Which top-level keys go into each namespace
COMMON_KEYS = [
    "nav", "footer", "header", "mobileNav", "sideNav",
    "languageSwitcher", "common", "homePage", "caseStudyCard", "blogCard",
]

LANDING_KEYS = ["hero", "services", "credibility", "partners", "faq"]

# pages.* sub-keys that go into the 'pages' namespace (everything except services, innovationLab, auth)
PAGES_EXCLUDE = {"services", "innovationLab", "auth"}

def main():
    if not SOURCE.exists():
        print(f"ERROR: {SOURCE} not found", file=sys.stderr)
        sys.exit(1)

    with open(SOURCE, "r", encoding="utf-8") as f:
        data = json.load(f)

    namespaces = {}

    # 1. common — top-level keys kept as-is
    common = {}
    for key in COMMON_KEYS:
        if key in data:
            common[key] = data[key]
    namespaces["common"] = common

    # 2. landing — top-level keys kept as-is
    landing = {}
    for key in LANDING_KEYS:
        if key in data:
            landing[key] = data[key]
    namespaces["landing"] = landing

    # 3. pages — pages.* minus services/innovationLab/auth, strip 'pages.' prefix
    pages = {}
    if "pages" in data:
        for key, value in data["pages"].items():
            if key not in PAGES_EXCLUDE:
                pages[key] = value
    namespaces["pages"] = pages

    # 4. services — pages.services.*, strip 'pages.services.' prefix
    services = {}
    if "pages" in data and "services" in data["pages"]:
        services = data["pages"]["services"]
    namespaces["services"] = services

    # 5. innovation-lab — pages.innovationLab.*, strip 'pages.innovationLab.' prefix
    innovation_lab = {}
    if "pages" in data and "innovationLab" in data["pages"]:
        innovation_lab = data["pages"]["innovationLab"]
    namespaces["innovation-lab"] = innovation_lab

    # 6. auth — top-level auth.* + setup + pages.auth.*
    auth = {}
    if "auth" in data:
        for key, value in data["auth"].items():
            auth[key] = value
    if "setup" in data:
        auth["setup"] = data["setup"]
    if "pages" in data and "auth" in data["pages"]:
        for key, value in data["pages"]["auth"].items():
            auth[key] = value
    namespaces["auth"] = auth

    # 7. seo — strip outermost 'seo.' prefix
    seo = {}
    if "seo" in data:
        seo = data["seo"]
    namespaces["seo"] = seo

    # 8. blog — blogUi.*, strip 'blogUi.' prefix
    blog = {}
    if "blogUi" in data:
        blog = data["blogUi"]
    namespaces["blog"] = blog

    # Validate: count all keys at leaf level
    source_leaves = count_leaves(data)
    output_leaves = sum(count_leaves(ns) for ns in namespaces.values())

    # Check for orphan keys (top-level keys not assigned to any namespace)
    all_assigned_top_keys = set(COMMON_KEYS) | set(LANDING_KEYS) | {"pages", "seo", "auth", "setup", "blogUi"}
    orphans = set(data.keys()) - all_assigned_top_keys
    if orphans:
        print(f"WARNING: Orphan top-level keys not assigned to any namespace: {orphans}", file=sys.stderr)
        sys.exit(1)

    print(f"Source leaf count: {source_leaves}")
    print(f"Output leaf count: {output_leaves}")

    if source_leaves != output_leaves:
        print(f"WARNING: Leaf count mismatch! Diff: {source_leaves - output_leaves}", file=sys.stderr)

    # Write namespace files
    for name, content in namespaces.items():
        output_path = LOCALES_DIR / f"{name}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
            f.write("\n")
        size = output_path.stat().st_size
        print(f"  {name}.json: {size:,} bytes ({count_leaves(content)} leaves)")

    print("\nDone! All namespace files written to:", LOCALES_DIR)


def count_leaves(obj):
    """Count leaf (non-dict) values recursively."""
    if not isinstance(obj, dict):
        return 1
    return sum(count_leaves(v) for v in obj.values())


if __name__ == "__main__":
    main()
