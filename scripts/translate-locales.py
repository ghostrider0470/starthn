#!/usr/bin/env python3
"""
Translate locale namespace files from English and upload to Azure Blob Storage.

Usage:
    python scripts/translate-locales.py                           # all namespaces, all languages
    python scripts/translate-locales.py --langs de,fr,es          # specific languages
    python scripts/translate-locales.py --namespace common        # single namespace
    python scripts/translate-locales.py --force                   # overwrite existing
    python scripts/translate-locales.py --dry-run                 # preview without translating
    python scripts/translate-locales.py --upload-only             # skip translation, upload existing
    python scripts/translate-locales.py --local                   # write locally instead of uploading
"""

import argparse
import json
import os
import re
import sys
import time
import uuid
from pathlib import Path

import requests

from locale_config import (
    BlobStorageClient,
    LANGUAGES_TS,
    LOCALES_DIR,
    NAMESPACES,
    SOURCE_LANG,
    SOURCE_LOCALE,
    _require_env,
)

# ── Azure Translator Configuration ──────────────────────────────────────────

ENDPOINT = "https://api.cognitive.microsofttranslator.com"
API_VERSION = "3.0"

# API limits
MAX_ELEMENTS_PER_REQUEST = 100
MAX_CHARS_PER_REQUEST = 45_000
REQUEST_DELAY = 0.3

# ── BCP 47 ↔ Azure Translator Code Mapping ─────────────────────────────────


def _load_language_map() -> tuple[dict[str, str], dict[str, str]]:
    """
    Parse languages.ts to build:
      locale_to_translator: { "de-DE": "de", "zh-Hans": "zh-Hans", ... }
      translator_to_locale: { "de": "de-DE", "zh-Hans": "zh-Hans", ... }
    """
    locale_to_translator: dict[str, str] = {}
    translator_to_locale: dict[str, str] = {}

    if not LANGUAGES_TS.exists():
        print(f"WARNING: {LANGUAGES_TS} not found. Using Azure codes as locale codes.")
        return locale_to_translator, translator_to_locale

    text = LANGUAGES_TS.read_text(encoding="utf-8")
    code_pattern = re.compile(r"code:\s*'([^']+)'")
    translator_pattern = re.compile(r"translatorCode:\s*'([^']+)'")

    for locale_code, trans_code in zip(code_pattern.findall(text), translator_pattern.findall(text)):
        locale_to_translator[locale_code] = trans_code
        translator_to_locale[trans_code] = locale_code

    return locale_to_translator, translator_to_locale


LOCALE_TO_TRANSLATOR, TRANSLATOR_TO_LOCALE = _load_language_map()

# ── Interpolation Protection ────────────────────────────────────────────────

_INTERP_RE = re.compile(r"\{\{([^}]+)\}\}")
_RESTORE_RE = re.compile(r'<span class="notranslate">\{\{([^}]+)\}\}</span>')
_STRAY_OPEN_RE = re.compile(r'<span class=["\']notranslate["\']>')


def protect_interpolations(text: str) -> str:
    """Replace {{var}} with XML placeholder that Azure won't translate."""
    return _INTERP_RE.sub(r'<span class="notranslate">{{\1}}</span>', text)


def restore_interpolations(text: str) -> str:
    """Restore XML placeholders back to {{var}} syntax."""
    text = _RESTORE_RE.sub(r"{{\1}}", text)
    text = _STRAY_OPEN_RE.sub("", text)
    return text.replace("</span>", "")

# ── JSON Flattening / Unflattening ──────────────────────────────────────────


def flatten_json(obj: dict, prefix: str = "") -> list[tuple[str, str]]:
    """Flatten nested JSON to (dotpath, value) pairs for leaf strings."""
    items: list[tuple[str, str]] = []
    for key, value in obj.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            items.extend(flatten_json(value, path))
        elif isinstance(value, str):
            items.append((path, value))
    return items


def unflatten_json(items: list[tuple[str, str]], template: dict) -> dict:
    """Rebuild nested JSON from flat pairs, preserving template structure."""
    result = json.loads(json.dumps(template))
    for path, value in items:
        keys = path.split(".")
        node = result
        for k in keys[:-1]:
            node = node[k]
        node[keys[-1]] = value
    return result

# ── Azure Translator API ────────────────────────────────────────────────────


def fetch_supported_languages() -> list[str]:
    """Fetch all language codes Azure Translator supports."""
    url = f"{ENDPOINT}/languages?api-version={API_VERSION}&scope=translation"
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return sorted(resp.json().get("translation", {}).keys())


def translate_batch(texts: list[str], target_lang: str, max_retries: int = 5) -> list[str]:
    """Translate a batch of texts to target language via Azure Translator."""
    subscription_key = _require_env("AZURE_TRANSLATOR_KEY")
    region = os.environ.get("AZURE_TRANSLATOR_REGION", "northeurope")

    url = f"{ENDPOINT}/translate"
    params = {
        "api-version": API_VERSION,
        "from": SOURCE_LANG,
        "to": target_lang,
        "textType": "html",
    }
    headers = {
        "Ocp-Apim-Subscription-Key": subscription_key,
        "Ocp-Apim-Subscription-Region": region,
        "Content-Type": "application/json",
        "X-ClientTraceId": str(uuid.uuid4()),
    }
    body = [{"text": t} for t in texts]

    for attempt in range(max_retries):
        resp = requests.post(url, params=params, headers=headers, json=body, timeout=30)
        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", 2 ** attempt))
            wait = max(retry_after, 2 ** attempt)
            print(f"    Rate limited, waiting {wait}s (attempt {attempt + 1}/{max_retries})...")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return [item["translations"][0]["text"] for item in resp.json()]

    # Final attempt without retry
    resp = requests.post(url, params=params, headers=headers, json=body, timeout=30)
    resp.raise_for_status()
    return [item["translations"][0]["text"] for item in resp.json()]

# ── Translation Logic ───────────────────────────────────────────────────────


def translate_namespace(
    flat_items: list[tuple[str, str]],
    template: dict,
    target_lang: str,
    namespace: str,
) -> dict:
    """Translate all flat items to target language, batching API calls."""
    protected = [(path, protect_interpolations(val)) for path, val in flat_items]

    # Build batches respecting element count and character limits
    batches: list[list[tuple[int, str, str]]] = []
    current_batch: list[tuple[int, str, str]] = []
    current_chars = 0

    for i, (path, text) in enumerate(protected):
        text_len = len(text)
        if (len(current_batch) >= MAX_ELEMENTS_PER_REQUEST
                or current_chars + text_len > MAX_CHARS_PER_REQUEST):
            if current_batch:
                batches.append(current_batch)
            current_batch = []
            current_chars = 0
        current_batch.append((i, path, text))
        current_chars += text_len

    if current_batch:
        batches.append(current_batch)

    translated: dict[int, str] = {}

    for batch_idx, batch in enumerate(batches):
        texts = [text for _, _, text in batch]
        indices = [i for i, _, _ in batch]

        results = translate_batch(texts, target_lang)
        for idx, result_text in zip(indices, results):
            translated[idx] = restore_interpolations(result_text)

        if batch_idx < len(batches) - 1:
            time.sleep(REQUEST_DELAY)

        done = min((batch_idx + 1) * MAX_ELEMENTS_PER_REQUEST, len(flat_items))
        pct = int(done / len(flat_items) * 100)
        print(f"    [{target_lang}/{namespace}] {done}/{len(flat_items)} strings ({pct}%)", end="\r")

    print()

    translated_flat = [(path, translated[i]) for i, (path, _) in enumerate(flat_items)]
    return unflatten_json(translated_flat, template)

# ── Target Language Resolution ──────────────────────────────────────────────


def resolve_target_pairs(raw_langs: list[str] | None) -> list[tuple[str, str]]:
    """Resolve user input to list of (azure_code, bcp47_locale) pairs."""
    if raw_langs:
        pairs: list[tuple[str, str]] = []
        for raw in raw_langs:
            if raw in LOCALE_TO_TRANSLATOR:
                pairs.append((LOCALE_TO_TRANSLATOR[raw], raw))
            elif raw in TRANSLATOR_TO_LOCALE:
                pairs.append((raw, TRANSLATOR_TO_LOCALE[raw]))
            else:
                pairs.append((raw, raw))
        return pairs

    print("Fetching supported languages from Azure...")
    return [
        (az_code, TRANSLATOR_TO_LOCALE.get(az_code, az_code))
        for az_code in fetch_supported_languages()
    ]


def filter_exclusions(
    pairs: list[tuple[str, str]],
    exclude_raw: list[str],
    skip_source: bool = True,
) -> list[tuple[str, str]]:
    """Remove excluded languages and optionally the source language."""
    exclude_azure: set[str] = set()
    exclude_locale: set[str] = set()

    if skip_source:
        exclude_azure.add(SOURCE_LANG)
        exclude_locale.add(SOURCE_LOCALE)

    for ex in exclude_raw:
        if ex in LOCALE_TO_TRANSLATOR:
            exclude_azure.add(LOCALE_TO_TRANSLATOR[ex])
            exclude_locale.add(ex)
        elif ex in TRANSLATOR_TO_LOCALE:
            exclude_azure.add(ex)
            exclude_locale.add(TRANSLATOR_TO_LOCALE[ex])
        else:
            exclude_azure.add(ex)
            exclude_locale.add(ex)

    return [(az, loc) for az, loc in pairs if az not in exclude_azure and loc not in exclude_locale]

# ── Main ────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Translate locale files via Azure Translator")
    parser.add_argument("--langs", type=str, default="",
                        help="Comma-separated language codes (default: all)")
    parser.add_argument("--namespace", type=str, default="",
                        help="Translate only this namespace")
    parser.add_argument("--force", action="store_true",
                        help="Overwrite existing translations")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview without making API calls")
    parser.add_argument("--exclude", type=str, default="",
                        help="Comma-separated language codes to exclude")
    parser.add_argument("--upload-only", action="store_true",
                        help="Skip translation, upload existing local files")
    parser.add_argument("--local", action="store_true",
                        help="Write locally instead of uploading")
    args = parser.parse_args()

    # Resolve namespaces
    if args.namespace:
        if args.namespace not in NAMESPACES:
            print(f"ERROR: Unknown namespace '{args.namespace}'. Valid: {', '.join(NAMESPACES)}")
            sys.exit(1)
        namespaces = [args.namespace]
    else:
        namespaces = NAMESPACES

    # Load source files
    ns_data: dict[str, tuple[dict, list[tuple[str, str]]]] = {}
    total_strings = 0

    for ns in namespaces:
        source_file = LOCALES_DIR / SOURCE_LOCALE / f"{ns}.json"
        if not source_file.exists():
            print(f"ERROR: Source file not found: {source_file}")
            sys.exit(1)
        source_json = json.loads(source_file.read_text(encoding="utf-8"))
        flat_items = flatten_json(source_json)
        ns_data[ns] = (source_json, flat_items)
        total_strings += len(flat_items)
        print(f"  {ns}.json: {len(flat_items)} strings")

    print(f"\nTotal strings per language: {total_strings}")

    # Resolve target languages
    raw_langs = [l.strip() for l in args.langs.split(",") if l.strip()] if args.langs else None
    exclude_raw = [e.strip() for e in args.exclude.split(",") if e.strip()] if args.exclude else []

    target_pairs = resolve_target_pairs(raw_langs)
    target_pairs = filter_exclusions(target_pairs, exclude_raw, skip_source=not args.upload_only)

    print(f"Target languages: {len(target_pairs)}")
    print(f"Namespaces: {', '.join(namespaces)}")

    # Dry run
    if args.dry_run:
        for ns in namespaces:
            existing = [loc for _, loc in target_pairs if (LOCALES_DIR / loc / f"{ns}.json").exists()]
            print(f"\n  {ns}.json:")
            print(f"    Existing: {len(existing)}")
            print(f"    New: {len(target_pairs) - len(existing)}")
        if not args.force:
            print(f"\nExisting files would be SKIPPED (use --force to overwrite)")
        return

    blob_client = BlobStorageClient() if not args.local else None

    # Upload-only mode
    if args.upload_only:
        assert blob_client is not None
        uploaded = err_count = 0
        for _, locale in target_pairs:
            for ns in namespaces:
                local_file = LOCALES_DIR / locale / f"{ns}.json"
                if not local_file.exists():
                    continue
                if blob_client.upload(f"{locale}/{ns}.json", local_file.read_bytes()):
                    uploaded += 1
                else:
                    err_count += 1
            print(f"  Uploaded {locale}: {len(namespaces)} namespaces")
        print(f"\nUploaded: {uploaded}, Errors: {err_count}")
        return

    # Translate
    skipped: list[str] = []
    completed: list[str] = []
    errors: list[tuple[str, str]] = []

    for idx, (azure_code, locale) in enumerate(target_pairs):
        lang_dir = LOCALES_DIR / locale

        if not args.force:
            if all((lang_dir / f"{ns}.json").exists() for ns in namespaces):
                skipped.append(locale)
                continue

        print(f"\n[{idx + 1}/{len(target_pairs)}] Translating to: {locale} (Azure: {azure_code})")

        try:
            for ns in namespaces:
                output_file = lang_dir / f"{ns}.json"
                if output_file.exists() and not args.force:
                    print(f"    {ns}.json: exists, skipping")
                    continue

                source_json, flat_items = ns_data[ns]
                translated = translate_namespace(flat_items, source_json, azure_code, ns)
                output_bytes = json.dumps(translated, ensure_ascii=False, indent=2).encode("utf-8") + b"\n"

                if args.local:
                    lang_dir.mkdir(parents=True, exist_ok=True)
                    output_file.write_bytes(output_bytes)
                    print(f"    Saved: {output_file.relative_to(LOCALES_DIR.parent.parent)}")
                else:
                    assert blob_client is not None
                    if blob_client.upload(f"{locale}/{ns}.json", output_bytes):
                        print(f"    Uploaded: {locale}/{ns}.json")
                    else:
                        raise RuntimeError(f"Failed to upload {locale}/{ns}.json")

            completed.append(locale)
        except Exception as e:
            errors.append((locale, str(e)))
            print(f"    ERROR: {e}")

    # Summary
    print(f"\n{'=' * 60}")
    print(f"DONE — Completed: {len(completed)}")
    if skipped:
        print(f"  Skipped (already exist): {len(skipped)}")
    if errors:
        print(f"  Errors: {len(errors)}")
        for locale, err in errors:
            print(f"    {locale}: {err}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
