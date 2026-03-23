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

    supabase_url_status = "set" if os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") else "missing"
    supabase_service_role_status = "set" if os.environ.get("SUPABASE_SERVICE_ROLE_KEY") else "missing"
    print("UPLOAD_BACKEND: supabase")
    print(f"SUPABASE_URL_OR_NEXT_PUBLIC_SUPABASE_URL: {supabase_url_status}")
    print(f"SUPABASE_SERVICE_ROLE_KEY: {supabase_service_role_status}")
    print(f"SUPABASE_STORAGE_BUCKET: {os.environ.get('SUPABASE_STORAGE_BUCKET', 'media')}")

    max_upload_size = os.environ.get("MAX_UPLOAD_SIZE_MB", "(default)")
    print(f"MAX_UPLOAD_SIZE_MB: {max_upload_size}")
    rate_limit_driver = os.environ.get("RATE_LIMIT_DRIVER", "(database default)")
    print(f"RATE_LIMIT_DRIVER: {rate_limit_driver}")
    if os.environ.get("ALLOW_DESTRUCTIVE_SEED"):
        print("ALLOW_DESTRUCTIVE_SEED: set (use only for intentional demo/staging reseeds)")

    google_client_id_set = bool(os.environ.get("GOOGLE_CLIENT_ID"))
    google_client_secret_set = bool(os.environ.get("GOOGLE_CLIENT_SECRET"))
    google_ui_enabled = os.environ.get("NEXT_PUBLIC_GOOGLE_AUTH_ENABLED", "false").lower() == "true"
    print(f"NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: {'true' if google_ui_enabled else 'false'}")
    if google_client_id_set or google_client_secret_set:
        google_id = "set" if os.environ.get("GOOGLE_CLIENT_ID") else "missing"
        google_secret = "set" if os.environ.get("GOOGLE_CLIENT_SECRET") else "missing"
        print(f"GOOGLE_CLIENT_ID: {google_id}")
        print(f"GOOGLE_CLIENT_SECRET: {google_secret}")
    if google_ui_enabled and not (google_client_id_set and google_client_secret_set):
        print("GOOGLE_AUTH warning: UI is enabled but Google client credentials are incomplete")
    if rate_limit_driver == "memory" and os.environ.get("NODE_ENV") == "production":
        print("RATE_LIMIT warning: memory mode is not suitable for multi-instance production deployments")

    print(f"DATABASE socket: {check_database_socket()}")


if __name__ == "__main__":
    main()
