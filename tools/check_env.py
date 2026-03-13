#!/usr/bin/env python3
from __future__ import annotations

import os
import socket
from typing import Dict
from urllib.parse import urlparse


REQUIRED_VARS = [
    "DATABASE_URL",
    "DIRECT_URL",
    "AUTH_SECRET",
]


def check_required() -> Dict[str, str]:
    results: Dict[str, str] = {}
    for key in REQUIRED_VARS:
        value = os.environ.get(key)
        results[key] = "set" if value else "missing"
    auth_url = os.environ.get("AUTH_URL") or os.environ.get("NEXTAUTH_URL")
    results["AUTH_URL_OR_NEXTAUTH_URL"] = "set" if auth_url else "missing"
    return results


def check_database_socket() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
      return "DATABASE_URL missing"

    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port or 5432
    if not host:
        return "DATABASE_URL invalid"

    try:
        with socket.create_connection((host, port), timeout=2):
            return f"reachable ({host}:{port})"
    except OSError as exc:
        return f"unreachable ({host}:{port}) - {exc}"


def main() -> None:
    print("Pinly environment check")
    print("=======================")

    for key, status in check_required().items():
        print(f"{key}: {status}")

    storage_driver = os.environ.get("STORAGE_DRIVER", "local")
    print(f"STORAGE_DRIVER: {storage_driver}")
    if storage_driver == "vercel-blob":
        blob_status = "set" if os.environ.get("BLOB_READ_WRITE_TOKEN") else "missing"
        print(f"BLOB_READ_WRITE_TOKEN: {blob_status}")
    if storage_driver == "local" and os.environ.get("VERCEL"):
        print("STORAGE warning: local uploads are not supported on Vercel")

    max_upload_size = os.environ.get("MAX_UPLOAD_SIZE_MB", "(default)")
    print(f"MAX_UPLOAD_SIZE_MB: {max_upload_size}")
    if os.environ.get("ALLOW_DESTRUCTIVE_SEED"):
        print("ALLOW_DESTRUCTIVE_SEED: set (use only for intentional demo/staging reseeds)")

    print(f"DATABASE socket: {check_database_socket()}")


if __name__ == "__main__":
    main()
