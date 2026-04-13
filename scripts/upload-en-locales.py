#!/usr/bin/env python3
"""
Upload English locale namespace files to Azure Blob Storage.

Usage:
    python scripts/upload-en-locales.py                    # all namespaces
    python scripts/upload-en-locales.py --namespace pages   # single namespace
"""

import argparse
import sys

from locale_config import (
    BlobStorageClient,
    LOCALES_DIR,
    NAMESPACES,
    SOURCE_LOCALE,
)


def main():
    parser = argparse.ArgumentParser(description="Upload English locale files to Azure Blob Storage")
    parser.add_argument(
        "--namespace",
        type=str,
        default="",
        help=f"Upload only this namespace (choices: {', '.join(NAMESPACES)})",
    )
    args = parser.parse_args()

    namespaces = NAMESPACES
    if args.namespace:
        if args.namespace not in NAMESPACES:
            print(f"ERROR: Unknown namespace '{args.namespace}'. Valid: {', '.join(NAMESPACES)}")
            sys.exit(1)
        namespaces = [args.namespace]

    print(f"Uploading {SOURCE_LOCALE} locale files to Azure Blob Storage...\n")

    client = BlobStorageClient()
    if not client.ensure_container():
        sys.exit(1)

    uploaded = 0
    failed = 0

    for ns in namespaces:
        filepath = LOCALES_DIR / SOURCE_LOCALE / f"{ns}.json"
        if not filepath.exists():
            print(f"  SKIP: {ns}.json not found")
            continue

        data = filepath.read_bytes()
        blob_path = f"{SOURCE_LOCALE}/{ns}.json"
        print(f"  {blob_path} ({len(data):,} bytes)...", end=" ")

        if client.upload(blob_path, data):
            print("OK")
            uploaded += 1
        else:
            failed += 1

    print(f"\nDone: {uploaded} uploaded, {failed} failed")

    if uploaded > 0:
        print(f"\nVerify:")
        for ns in namespaces:
            print(f"  {client.base_url}/{client.container}/{SOURCE_LOCALE}/{ns}.json")


if __name__ == "__main__":
    main()
