#!/usr/bin/env python3
"""
Fast translation: English → Bosnian, Serbian (Latin), Croatian.

Usage:
    python scripts/translate-fast.py            # translate all 3
    python scripts/translate-fast.py --force    # overwrite existing
"""

import subprocess
import sys
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MAIN_SCRIPT = os.path.join(SCRIPT_DIR, "translate-locales.py")

FAST_LANGS = "bs-BA,sr-Latn,hr-HR"

args = [sys.executable, MAIN_SCRIPT, "--langs", FAST_LANGS, "--force"]

# Pass through any extra args (like --dry-run)
args.extend(sys.argv[1:])

print(f"Fast translate: EN → {FAST_LANGS}")
print(f"Running: {' '.join(args)}\n")

sys.exit(subprocess.call(args))
