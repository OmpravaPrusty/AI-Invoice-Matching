import os
from pathlib import Path
from typing import Optional

from supabase import create_client

from app.core.config import settings


class SupabaseStorage:
    def __init__(self):
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be configured.")

        self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    def upload_file(self, file_name: str, file_bytes: bytes, folder: str = "uploads") -> str:
        path = f"{folder}/{file_name}"
        self.client.storage.from_("documents").upload(
            path=path,
            file=file_bytes,
            file_options={"content-type": "application/octet-stream"},
        )
        return path

    def get_public_url(self, file_path: str) -> str:
        return self.client.storage.from_("documents").get_public_url(file_path)

    def download_file(self, file_path: str) -> bytes:
        response = self.client.storage.from_("documents").download(file_path)
        if isinstance(response, bytes):
            return response
        return response.read()