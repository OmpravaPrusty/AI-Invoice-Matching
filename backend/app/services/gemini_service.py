from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

from google import genai
from google.genai import errors, types

from app.core.config import settings

logger = logging.getLogger(__name__)
DEFAULT_MODEL = "gemini-3.6-flash"
REQUEST_TIMEOUT_SECONDS = 120
REQUEST_TIMEOUT_MS = REQUEST_TIMEOUT_SECONDS * 1000
MAX_RETRIES = 3
RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}
RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "OBJECT", "properties": {
            "po_number": {"type": "STRING"}, "invoice_number": {"type": "STRING"},
            "vendor_name": {"type": "STRING"}, "po_total": {"type": "NUMBER"},
            "invoice_total": {"type": "NUMBER"},
            "overall_status": {"type": "STRING", "enum": ["MATCHED", "PARTIAL_MATCH", "DISCREPANCY_FOUND"]},
        }, "required": ["po_number", "invoice_number", "vendor_name", "po_total", "invoice_total", "overall_status"]},
        "line_items": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
            "item_name": {"type": "STRING"}, "po_qty": {"type": "NUMBER"},
            "inv_qty": {"type": "NUMBER"}, "po_rate": {"type": "NUMBER"},
            "inv_rate": {"type": "NUMBER"}, "po_total": {"type": "NUMBER"},
            "inv_total": {"type": "NUMBER"},
            "status": {"type": "STRING", "enum": ["MATCH", "DISCREPANCY"]},
            "variance_reason": {"type": "STRING"},
        }, "required": ["item_name", "po_qty", "inv_qty", "po_rate", "inv_rate", "po_total", "inv_total", "status", "variance_reason"]}},
        "matched_headers": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
            "field": {"type": "STRING"}, "po_value": {"type": "STRING"},
            "invoice_value": {"type": "STRING"}, "match_confidence": {"type": "STRING"},
        }, "required": ["field", "po_value", "invoice_value", "match_confidence"]}},
    },
    "required": ["summary", "line_items", "matched_headers"],
}
AUDIT_PROMPT = """You are a meticulous invoice matching auditor. Extract the exact product or service description printed for every line item from the purchase order and invoice; never invent labels such as Item 1 or Item 1 Quantity. Compare quantities, unit prices, line totals, identifiers, vendor, dates, taxes, shipping, and totals. Return only JSON matching the schema. Include every line item in line_items, including matching items, with the exact PDF description in item_name. Include matched document-level fields in matched_headers. Use 0 for missing numeric values and explain discrepancies in variance_reason."""


def _api_key() -> str:
    api_key = (settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")).strip()
    if not api_key or api_key == "your_free_gemini_key_here":
        raise RuntimeError("GEMINI_API_KEY is missing. Configure it before starting Gemini.")
    return api_key


def _client() -> genai.Client:
    return genai.Client(api_key=_api_key(), http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS))


def _parse_json(response: Any) -> dict[str, Any]:
    raw = (getattr(response, "text", "") or "").strip()
    if not raw:
        raise ValueError("Gemini returned an empty response.")
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("Gemini returned invalid JSON.") from exc
    if not isinstance(result, dict) or not isinstance(result.get("summary"), dict) or not isinstance(result.get("line_items"), list) or not isinstance(result.get("matched_headers"), list):
        raise ValueError("Gemini returned an incomplete comparison.")
    return result


async def _generate_with_retry(client: genai.Client, contents: list[dict[str, Any]]) -> Any:
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=RESPONSE_SCHEMA,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )
    for attempt in range(MAX_RETRIES):
        try:
            return await client.aio.models.generate_content(
                model=settings.GEMINI_MODEL or DEFAULT_MODEL,
                contents=contents,
                config=config,
            )
        except errors.APIError as exc:
            status_code = getattr(exc, "code", None)
            logger.warning("Gemini API error status=%s attempt=%s/%s body=%s", status_code, attempt + 1, MAX_RETRIES, getattr(exc, "response_json", None))
            if status_code not in RETRYABLE_STATUS_CODES or attempt == MAX_RETRIES - 1:
                raise
        except (TimeoutError, OSError) as exc:
            logger.warning("Transient Gemini network error attempt=%s/%s: %s", attempt + 1, MAX_RETRIES, exc)
            if attempt == MAX_RETRIES - 1:
                raise
        await asyncio.sleep(2**attempt)
    raise RuntimeError("Gemini request failed after retries.")


async def process_invoice_matching(po_bytes: bytes, invoice_bytes: bytes) -> dict[str, Any]:
    if not po_bytes or not invoice_bytes:
        raise ValueError("Both purchase order and invoice files are required.")
    contents = [{"role": "user", "parts": [
        {"text": AUDIT_PROMPT}, {"text": "PURCHASE ORDER DOCUMENT"},
        {"inline_data": {"mime_type": "application/pdf", "data": po_bytes}},
        {"text": "VENDOR INVOICE DOCUMENT"},
        {"inline_data": {"mime_type": "application/pdf", "data": invoice_bytes}},
    ]}]
    client = _client()
    try:
        return _parse_json(await _generate_with_retry(client, contents))
    except errors.APIError as exc:
        logger.error("Gemini comparison failed status=%s body=%s", getattr(exc, "code", None), getattr(exc, "response_json", None))
        raise RuntimeError("Gemini could not process the documents.") from exc
    finally:
        close = getattr(client, "close", None)
        if close:
            close()


class GeminiService:
    def __init__(self, api_key: str | None = None) -> None:
        self.client = genai.Client(api_key=api_key or _api_key(), http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS))
        self.model = settings.GEMINI_MODEL or DEFAULT_MODEL

    def ping(self) -> str:
        response = self.client.models.generate_content(model=self.model, contents="Hello! Confirm connection.", config=types.GenerateContentConfig(automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)))
        return response.text or ""

    def extract_document_text(self, document_text: str) -> str:
        response = self.client.models.generate_content(model=self.model, contents=document_text, config=types.GenerateContentConfig(response_mime_type="application/json", automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)))
        return response.text or ""

    def extract_invoice_json(self, document_text: str) -> dict[str, Any]:
        return {"raw_response": self.extract_document_text(document_text)}
