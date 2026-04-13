#!/usr/bin/env python3
"""
Azure Translator script for Horizon Tech i18n.

Translates horizon-frontend/public/locales/en/translation.json into target languages
using the Azure Translator API.

Usage:
    python translate.py                          # Translate to all configured languages
    python translate.py --dry-run                # Preview without API calls
    python translate.py --force                  # Overwrite existing translations
    python translate.py --key YOUR_KEY --region eastus  # Override credentials
    python translate.py --languages bs de fr     # Override target languages

Environment variables:
    AZURE_TRANSLATOR_KEY     - Azure Translator API key
    AZURE_TRANSLATOR_REGION  - Azure Translator region (e.g., 'westeurope')
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: 'requests' package is required. Install with: pip install requests")
    sys.exit(1)

# ── Configuration ────────────────────────────────────────────────────────────

TARGET_LANGUAGES = ["bs"]  # Add more: "de", "fr", "ar", "tr", "ja", etc.

BATCH_SIZE = 50  # Azure allows up to 100, staying conservative

LOCALES_DIR = Path(__file__).parent.parent / "horizon-frontend" / "public" / "locales"
SOURCE_LANG = "en"
SOURCE_FILE = LOCALES_DIR / SOURCE_LANG / "translation.json"

AZURE_ENDPOINT = "https://api.cognitive.microsofttranslator.com"
AZURE_API_VERSION = "3.0"

# ── Placeholder Protection ──────────────────────────────────────────────────

# Matches {{variable}} interpolation tokens
INTERPOLATION_RE = re.compile(r"\{\{.*?\}\}")

# Matches <tagName>...</tagName> (e.g., <gradient>text</gradient>)
XML_TAG_RE = re.compile(r"<(\w+)>(.*?)</\1>", re.DOTALL)

# Marker format: Unicode brackets unlikely to appear in translations
MARKER_TEMPLATE = "\u27E6{}\u27E7"  # ⟦0⟧, ⟦1⟧, etc.


def protect_placeholders(text: str) -> tuple[str, list[str]]:
    """Replace interpolation tokens and XML tags with numbered markers.

    Returns the modified text and a list of original tokens for restoration.
    """
    placeholders = []

    def replace_match(match):
        idx = len(placeholders)
        placeholders.append(match.group(0))
        return MARKER_TEMPLATE.format(idx)

    # First pass: protect XML-like tags (preserve inner text for translation)
    def replace_xml(match):
        tag = match.group(1)
        inner = match.group(2)
        open_idx = len(placeholders)
        placeholders.append(f"<{tag}>")
        close_idx = len(placeholders)
        placeholders.append(f"</{tag}>")
        return MARKER_TEMPLATE.format(open_idx) + inner + MARKER_TEMPLATE.format(close_idx)

    text = XML_TAG_RE.sub(replace_xml, text)

    # Second pass: protect {{interpolation}} tokens
    text = INTERPOLATION_RE.sub(replace_match, text)

    return text, placeholders


def restore_placeholders(text: str, placeholders: list[str]) -> str:
    """Restore original tokens from numbered markers."""
    for idx, original in enumerate(placeholders):
        marker = MARKER_TEMPLATE.format(idx)
        text = text.replace(marker, original)
    return text


# ── JSON Traversal ───────────────────────────────────────────────────────────

def flatten_json(obj: dict, prefix: str = "") -> list[tuple[str, str]]:
    """Recursively flatten nested JSON into (dotted_key, value) pairs.

    Only includes string leaf values.
    """
    entries = []
    for key, value in obj.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            entries.extend(flatten_json(value, full_key))
        elif isinstance(value, str):
            entries.append((full_key, value))
    return entries


def unflatten_json(entries: list[tuple[str, str]]) -> dict:
    """Rebuild nested JSON from (dotted_key, value) pairs."""
    result = {}
    for dotted_key, value in entries:
        keys = dotted_key.split(".")
        current = result
        for k in keys[:-1]:
            current = current.setdefault(k, {})
        current[keys[-1]] = value
    return result


# ── Azure Translator API ────────────────────────────────────────────────────

def translate_batch(
    texts: list[str],
    target_langs: list[str],
    api_key: str,
    region: str,
) -> dict[str, list[str]]:
    """Translate a batch of texts to multiple target languages.

    Returns a dict mapping language code to list of translated strings.
    """
    url = f"{AZURE_ENDPOINT}/translate"
    params = {
        "api-version": AZURE_API_VERSION,
        "from": SOURCE_LANG,
        "to": target_langs,
    }
    headers = {
        "Ocp-Apim-Subscription-Key": api_key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
    }
    body = [{"Text": t} for t in texts]

    response = requests.post(url, params=params, headers=headers, json=body, timeout=30)
    response.raise_for_status()

    data = response.json()

    # Organize results by language
    results: dict[str, list[str]] = {lang: [] for lang in target_langs}
    for item in data:
        for translation in item["translations"]:
            results[translation["to"]].append(translation["text"])

    return results


# ── Main Logic ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Translate Horizon Tech i18n files using Azure Translator API"
    )
    parser.add_argument(
        "--key",
        help="Azure Translator API key (overrides AZURE_TRANSLATOR_KEY env var)",
    )
    parser.add_argument(
        "--region",
        help="Azure Translator region (overrides AZURE_TRANSLATOR_REGION env var)",
    )
    parser.add_argument(
        "--languages",
        nargs="+",
        help=f"Target languages (default: {TARGET_LANGUAGES})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be translated without making API calls",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing translation files",
    )
    args = parser.parse_args()

    # Resolve credentials
    api_key = args.key or os.environ.get("AZURE_TRANSLATOR_KEY")
    region = args.region or os.environ.get("AZURE_TRANSLATOR_REGION")
    target_langs = args.languages or TARGET_LANGUAGES

    # Filter out source language
    target_langs = [lang for lang in target_langs if lang != SOURCE_LANG]

    if not target_langs:
        print("No target languages specified (or all were 'en').")
        sys.exit(1)

    if not args.dry_run and (not api_key or not region):
        print("Error: Azure credentials required.")
        print("  Set AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION env vars")
        print("  or use --key and --region arguments.")
        sys.exit(1)

    # Check for existing files (unless --force)
    if not args.force and not args.dry_run:
        existing = []
        for lang in target_langs:
            target_file = LOCALES_DIR / lang / "translation.json"
            if target_file.exists():
                existing.append(lang)
        if existing:
            print(f"Translation files already exist for: {', '.join(existing)}")
            print("Use --force to overwrite.")
            sys.exit(1)

    # Load source JSON
    if not SOURCE_FILE.exists():
        print(f"Error: Source file not found: {SOURCE_FILE}")
        sys.exit(1)

    with open(SOURCE_FILE, "r", encoding="utf-8") as f:
        source_json = json.load(f)

    # Flatten to (key, value) pairs
    flat_entries = flatten_json(source_json)
    print(f"Found {len(flat_entries)} translatable strings")
    print(f"Target languages: {', '.join(target_langs)}")

    if args.dry_run:
        print("\n── Dry Run ──────────────────────────────────────")
        for key, value in flat_entries:
            has_placeholders = INTERPOLATION_RE.search(value) or XML_TAG_RE.search(value)
            marker = " [has placeholders]" if has_placeholders else ""
            print(f"  {key}: {value[:80]}{'...' if len(value) > 80 else ''}{marker}")
        print(f"\nWould translate {len(flat_entries)} strings × {len(target_langs)} languages")
        print(f"Estimated API calls: {(len(flat_entries) + BATCH_SIZE - 1) // BATCH_SIZE}")
        return

    # Protect placeholders
    keys = [k for k, _ in flat_entries]
    protected_texts = []
    all_placeholders = []

    for _, value in flat_entries:
        protected, placeholders = protect_placeholders(value)
        protected_texts.append(protected)
        all_placeholders.append(placeholders)

    # Translate in batches
    translated: dict[str, list[str]] = {lang: [] for lang in target_langs}

    total_batches = (len(protected_texts) + BATCH_SIZE - 1) // BATCH_SIZE
    for batch_idx in range(total_batches):
        start = batch_idx * BATCH_SIZE
        end = min(start + BATCH_SIZE, len(protected_texts))
        batch = protected_texts[start:end]

        print(f"  Translating batch {batch_idx + 1}/{total_batches} ({len(batch)} strings)...")

        results = translate_batch(batch, target_langs, api_key, region)
        for lang in target_langs:
            translated[lang].extend(results[lang])

    # Restore placeholders and write output files
    for lang in target_langs:
        restored_entries = []
        for i, key in enumerate(keys):
            restored_text = restore_placeholders(translated[lang][i], all_placeholders[i])
            restored_entries.append((key, restored_text))

        output_json = unflatten_json(restored_entries)
        output_dir = LOCALES_DIR / lang
        output_dir.mkdir(parents=True, exist_ok=True)
        output_file = output_dir / "translation.json"

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_json, f, ensure_ascii=False, indent=2)
            f.write("\n")

        print(f"  Wrote {output_file}")

    print(f"\nDone! Translated {len(flat_entries)} strings into {len(target_langs)} language(s).")


if __name__ == "__main__":
    main()
