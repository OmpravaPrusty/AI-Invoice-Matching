"""Quiet Gemini connectivity diagnostic for Python 3.12+.

Run from the backend directory with ``python test_gemini.py``.
"""

from __future__ import annotations

import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv
from google import genai
from google.genai import errors, types

DEFAULT_MODEL = "gemini-3.6-flash"
MAX_ATTEMPTS = 3
RETRYABLE_STATUS_CODES = frozenset({429, 503, 504})
PLACEHOLDER_KEYS = frozenset(
    {"", "your_free_gemini_key_here", "your_gemini_api_key_here"},
)


def silence_transport_loggers() -> None:
    """Prevent SDK transport details from leaking into the diagnostic output."""
    for logger_name in ("httpx", "httpcore"):
        transport_logger = logging.getLogger(logger_name)
        transport_logger.setLevel(logging.WARNING)
        transport_logger.propagate = False
        transport_logger.addHandler(logging.NullHandler())


def load_environment() -> None:
    backend_directory = Path(__file__).resolve().parent
    load_dotenv(backend_directory / ".env", override=False)
    load_dotenv(backend_directory.parent / ".env", override=False)


def resolve_api_key() -> str | None:
    for variable_name in ("GEMINI_API_KEY", "VITE_GEMINI_API_KEY"):
        value = os.getenv(variable_name, "").strip()
        if value not in PLACEHOLDER_KEYS:
            return value
    return None


def resolve_model() -> str:
    return os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def generate_connection_check(client: genai.Client, model: str) -> Any:
    config = types.GenerateContentConfig(
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )
    return client.models.generate_content(
        model=model,
        contents="Reply with a short confirmation that the Gemini connection is working.",
        config=config,
    )


def api_status(error: errors.APIError) -> int | None:
    status_code = getattr(error, "code", None)
    return status_code if isinstance(status_code, int) else None


def request_with_retry(client: genai.Client, model: str) -> Any:
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return generate_connection_check(client, model)
        except errors.APIError as error:
            if api_status(error) not in RETRYABLE_STATUS_CODES or attempt == MAX_ATTEMPTS:
                raise
        except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RequestError):
            if attempt == MAX_ATTEMPTS:
                raise
        time.sleep(attempt * 3)
    raise RuntimeError("Gemini request failed after retries.")


def close_client(client: genai.Client) -> None:
    close = getattr(client, "close", None)
    if callable(close):
        close()


def main() -> int:
    silence_transport_loggers()
    load_environment()
    api_key = resolve_api_key()
    if not api_key:
        print("❌ Gemini connection failed: GEMINI_API_KEY is not set.")
        return 1

    client: genai.Client | None = None
    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                httpx_client=httpx.Client(
                    timeout=httpx.Timeout(
                        connect=15.0,
                        read=120.0,
                        write=30.0,
                        pool=10.0,
                    ),
                ),
            ),
        )
        request_with_retry(client, resolve_model())
        print("✅ Gemini is connected.")
        return 0
    except errors.APIError as error:
        message = str(error).strip() or "API request failed."
    except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RequestError) as error:
        message = str(error).strip() or "Network request failed."
    except Exception as error:
        message = str(error).strip() or "Unexpected error."
    finally:
        if client is not None:
            close_client(client)

    print(f"❌ Gemini connection failed: {message}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
