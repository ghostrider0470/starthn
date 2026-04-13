#!/usr/bin/env python3
"""
Generate BCP 47 locale codes for the LANGUAGES array in languages.ts.

Rules:
1. Compound codes (contain '-'): keep as-is, translatorCode = code
2. Simple code + countryCode: code becomes {code}-{countryCode}, translatorCode = old code
3. No countryCode (null): keep as-is, translatorCode = code
4. Special case: 'en' becomes 'en-US' with countryCode 'US'
"""

import re
import json
import sys
from pathlib import Path

LANGUAGES_TS = Path(__file__).parent.parent / "horizon-frontend" / "src" / "lib" / "languages.ts"

def parse_languages(content: str) -> list[dict]:
    """Parse the LANGUAGES array from TypeScript source."""
    # Extract the array content between [ and ]
    match = re.search(r'export const LANGUAGES: LanguageMeta\[\] = \[(.*?)\]', content, re.DOTALL)
    if not match:
        raise ValueError("Could not find LANGUAGES array")

    array_content = match.group(1)

    # Parse each object entry
    entries = []
    # Match each { ... } block
    for obj_match in re.finditer(r'\{([^}]+)\}', array_content):
        obj_str = obj_match.group(1)

        entry = {}
        # Extract code
        m = re.search(r"code:\s*'([^']+)'", obj_str)
        entry['code'] = m.group(1) if m else None

        # Extract name
        m = re.search(r"name:\s*'([^']*(?:\\'[^']*)*)'", obj_str)
        if not m:
            m = re.search(r'name:\s*"([^"]*)"', obj_str)
        entry['name'] = m.group(1) if m else None

        # Extract nativeName - handle unicode escapes
        m = re.search(r"nativeName:\s*'((?:[^'\\]|\\.)*)'", obj_str)
        if not m:
            m = re.search(r'nativeName:\s*"((?:[^"\\]|\\.)*)"', obj_str)
        entry['nativeName'] = m.group(1) if m else None

        # Extract countryCode
        m = re.search(r"countryCode:\s*'([^']+)'", obj_str)
        if m:
            entry['countryCode'] = m.group(1)
        elif re.search(r'countryCode:\s*null', obj_str):
            entry['countryCode'] = None
        else:
            entry['countryCode'] = None

        entries.append(entry)

    return entries


def transform_entry(entry: dict) -> dict:
    """Apply BCP 47 transformation rules."""
    old_code = entry['code']
    country = entry['countryCode']

    # Special case: en -> en-US
    if old_code == 'en':
        return {
            **entry,
            'code': 'en-US',
            'countryCode': 'US',
            'translatorCode': 'en',
        }

    # Rule 1: Already compound code (contains '-')
    if '-' in old_code:
        return {
            **entry,
            'translatorCode': old_code,
        }

    # Rule 3: No countryCode
    if country is None:
        return {
            **entry,
            'translatorCode': old_code,
        }

    # Rule 2: Simple code + countryCode -> {code}-{countryCode}
    new_code = f"{old_code}-{country}"
    return {
        **entry,
        'code': new_code,
        'translatorCode': old_code,
    }


def escape_ts_string(s: str) -> str:
    """Return the string as-is (it already contains TS-safe content from the source)."""
    return s.replace("'", "\\'") if s else s


def format_entry(entry: dict) -> str:
    """Format a single entry as a TypeScript object literal."""
    code = entry['code']
    name = entry['name']
    native = entry['nativeName']
    country = entry['countryCode']
    translator = entry['translatorCode']

    country_str = f"'{country}'" if country else 'null'

    return f"  {{ code: '{code}', name: '{name}', nativeName: '{native}', countryCode: {country_str}, translatorCode: '{translator}' }},"


def main():
    content = LANGUAGES_TS.read_text(encoding='utf-8')
    entries = parse_languages(content)

    transformed = [transform_entry(e) for e in entries]

    # Generate TypeScript output
    print("""\
/**
 * Comprehensive language metadata for all Azure Translator supported languages.
 * Source of truth for i18n-utils.ts and LanguageSwitcher.tsx.
 *
 * Codes are BCP 47 locale codes with region suffixes where applicable.
 * The translatorCode field stores the Azure Translator API code.
 *
 * To regenerate after Azure adds new languages, run:
 *   python scripts/translate-locales.py --dry-run
 */

export interface LanguageMeta {
  /** BCP 47 locale code (e.g. "en-US", "zh-Hans", "sr-Latn") */
  code: string
  /** English name */
  name: string
  /** Name in the language itself */
  nativeName: string
  /** ISO 3166-1 alpha-2 country code for flag emoji (null = no flag) */
  countryCode: string | null
  /** Azure Translator API code (e.g. "en", "zh-Hans", "sr-Latn") */
  translatorCode: string
}

/**
 * Convert a 2-letter ISO 3166-1 country code to a flag emoji.
 * Works in all modern browsers/OS via regional indicator symbols.
 */
export function countryCodeToEmoji(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('')
}

export const LANGUAGES: LanguageMeta[] = [""")

    for entry in transformed:
        print(format_entry(entry))

    print("""]

/** Quick lookup map: code → LanguageMeta */
export const LANGUAGE_MAP = new Map(LANGUAGES.map((l) => [l.code, l]))

/** Quick lookup map: translatorCode → LanguageMeta */
export const TRANSLATOR_CODE_MAP = new Map(LANGUAGES.map((l) => [l.translatorCode, l]))

/** All language codes as a flat array */
export const ALL_LANGUAGE_CODES = LANGUAGES.map((l) => l.code)

/** All Azure Translator codes as a flat array */
export const ALL_TRANSLATOR_CODES = LANGUAGES.map((l) => l.translatorCode)
""")

    # Print summary to stderr
    unchanged = [e for e in transformed if e['code'] == e['translatorCode']]
    changed = [e for e in transformed if e['code'] != e['translatorCode']]

    print("\n// === SUMMARY (stderr) ===", file=sys.stderr)
    print(f"// Total languages: {len(transformed)}", file=sys.stderr)
    print(f"// Codes changed: {len(changed)}", file=sys.stderr)
    print(f"// Codes unchanged: {len(unchanged)}", file=sys.stderr)
    print(f"//", file=sys.stderr)
    print(f"// First 10 entries:", file=sys.stderr)
    for e in transformed[:10]:
        arrow = f"{e['translatorCode']} -> {e['code']}" if e['code'] != e['translatorCode'] else f"{e['code']} (unchanged)"
        print(f"//   {arrow:30s}  {e['name']}", file=sys.stderr)
    print(f"//", file=sys.stderr)
    print(f"// Unchanged codes ({len(unchanged)}):", file=sys.stderr)
    for e in unchanged:
        reason = "compound" if '-' in e['translatorCode'] else "no countryCode"
        print(f"//   {e['code']:15s}  {e['name']:30s}  ({reason})", file=sys.stderr)


if __name__ == '__main__':
    main()
