"""
Shared configuration and Azure Blob Storage client for locale scripts.

Secrets are read from environment variables with fallback to .env file.
"""

import base64
import hashlib
import hmac
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' package required. Install with: pip install requests")
    sys.exit(1)

# ── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
LOCALES_DIR = PROJECT_ROOT / "public" / "locales"
LANGUAGES_TS = PROJECT_ROOT / "src" / "lib" / "languages.ts"

SOURCE_LANG = "en"
SOURCE_LOCALE = "en-US"

NAMESPACES = [
    "common",
    "landing",
    "pages",
    "services",
    "innovation-lab",
    "auth",
    "seo",
    "blog",
]

# ── Environment ──────────────────────────────────────────────────────────────

def _load_dotenv():
    """Load .env file from project root if it exists (simple key=value parser)."""
    env_file = PROJECT_ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        print(f"ERROR: Environment variable '{name}' is required but not set.")
        print(f"  Set it in your shell or in {PROJECT_ROOT / '.env'}")
        sys.exit(1)
    return value

# ── Azure Blob Storage Client ────────────────────────────────────────────────

class BlobStorageClient:
    """Minimal Azure Blob Storage client using REST API (no SDK needed)."""

    API_VERSION = "2020-10-02"

    def __init__(self):
        self.account = _require_env("AZURE_STORAGE_ACCOUNT")
        self.key = _require_env("AZURE_STORAGE_KEY")
        self.container = os.environ.get("AZURE_STORAGE_CONTAINER", "locales")
        self.base_url = f"https://{self.account}.blob.core.windows.net"

    def _now(self) -> str:
        return datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")

    def _canon_headers(self, headers: dict) -> str:
        return "".join(
            f"{k}:{v}\n"
            for k, v in sorted(headers.items())
            if k.startswith("x-ms-")
        )

    def _sign(self, method: str, canon_headers_str: str, canon_resource: str,
              content_length: int = 0, content_type: str = "") -> str:
        sts = (
            f"{method}\n\n\n"
            f"{content_length if content_length else ''}\n"
            f"\n{content_type}\n"
            f"\n\n\n\n\n\n"
            f"{canon_headers_str}"
            f"{canon_resource}"
        )
        sig = base64.b64encode(
            hmac.new(
                base64.b64decode(self.key),
                sts.encode("utf-8"),
                hashlib.sha256,
            ).digest()
        ).decode()
        return f"SharedKey {self.account}:{sig}"

    def ensure_container(self) -> bool:
        """Create container with public blob access (idempotent)."""
        ms_headers = {
            "x-ms-blob-public-access": "blob",
            "x-ms-date": self._now(),
            "x-ms-version": self.API_VERSION,
        }
        ch = self._canon_headers(ms_headers)
        cr = f"/{self.account}/{self.container}\nrestype:container"
        auth = self._sign("PUT", ch, cr)

        headers = {**ms_headers, "Authorization": auth, "Content-Length": "0"}
        resp = requests.put(
            f"{self.base_url}/{self.container}?restype=container",
            headers=headers,
            timeout=30,
        )

        if resp.status_code == 201:
            print(f"  Container '{self.container}' created.")
            return True
        if resp.status_code == 409:
            print(f"  Container '{self.container}' already exists.")
            return True
        print(f"  Container creation failed ({resp.status_code}): {resp.text[:300]}")
        return False

    def upload(self, blob_path: str, data: bytes, content_type: str = "application/json") -> bool:
        """Upload a blob. Returns True on success."""
        ms_headers = {
            "x-ms-blob-cache-control": "public, max-age=86400",
            "x-ms-blob-content-type": content_type,
            "x-ms-blob-type": "BlockBlob",
            "x-ms-date": self._now(),
            "x-ms-version": self.API_VERSION,
        }
        ch = self._canon_headers(ms_headers)
        cr = f"/{self.account}/{self.container}/{blob_path}"
        auth = self._sign("PUT", ch, cr, content_length=len(data), content_type=content_type)

        headers = {
            **ms_headers,
            "Authorization": auth,
            "Content-Type": content_type,
            "Content-Length": str(len(data)),
        }
        try:
            resp = requests.put(
                f"{self.base_url}/{self.container}/{blob_path}",
                headers=headers,
                data=data,
                timeout=30,
            )
            if resp.status_code in (200, 201):
                return True
            print(f"    Upload failed for {blob_path} ({resp.status_code}): {resp.text[:200]}")
            return False
        except Exception as e:
            print(f"    Upload failed for {blob_path}: {e}")
            return False
