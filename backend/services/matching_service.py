"""Gemini PDF purchase-order and invoice matching service."""

from __future__ import annotations

import asyncio
import json
import os
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List

import httpx
from fastapi import HTTPException, status
from google import genai
from google.genai import types
from google.genai.errors import APIError


DEFAULT_MODEL = "gemini-3.6-flash"
MAX_RETRIES = 3
FILE_POLL_INTERVAL_SECONDS = 2
COMPARISON_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "summary": {"type": "OBJECT", "properties": {
            "po_number": {"type": "STRING"}, "invoice_number": {"type": "STRING"},
            "vendor_name": {"type": "STRING"}, "po_total": {"type": "NUMBER"},
            "invoice_total": {"type": "NUMBER"},
            "overall_status": {"type": "STRING", "enum": ["MATCHED", "PARTIAL_MATCH", "DISCREPANCY_FOUND"]},
        }, "required": ["po_number", "invoice_number", "vendor_name", "po_total", "invoice_total", "overall_status"]},
        "line_items": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
            "item_name": {"type": "STRING"}, "po_qty": {"type": "NUMBER"}, "inv_qty": {"type": "NUMBER"},
            "po_rate": {"type": "NUMBER"}, "inv_rate": {"type": "NUMBER"},
            "po_total": {"type": "NUMBER"}, "inv_total": {"type": "NUMBER"},
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


def _file_state_name(file_ref: Any) -> str:
    """Normalize enum and string file states returned by SDK versions."""
    state = getattr(file_ref, "state", None)
    return str(getattr(state, "name", state or "UNKNOWN")).upper()


def wait_for_files_active(
    client: genai.Client,
    files: List[Any],
    max_wait_seconds: int = 60,
) -> None:
    """Poll Gemini File API until every uploaded document is ACTIVE."""
    for uploaded_file in files:
        file_name = getattr(uploaded_file, "name", None)
        if not file_name:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini returned an uploaded file without a name.",
            )

        start_time = time.monotonic()
        file_ref = client.files.get(name=file_name)
        while _file_state_name(file_ref) == "PROCESSING":
            if time.monotonic() - start_time > max_wait_seconds:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=f"File {file_name} processing timed out on Gemini servers.",
                )
            time.sleep(FILE_POLL_INTERVAL_SECONDS)
            file_ref = client.files.get(name=file_name)

        state_name = _file_state_name(file_ref)
        if state_name == "FAILED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Gemini failed to process document: {file_name}",
            )
        if state_name != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini returned unexpected state {state_name} for {file_name}.",
            )


def _create_client() -> tuple[genai.Client, httpx.Client]:
    api_key = (os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API Key is missing from environment variables.",
        )

    transport = httpx.Client(
        timeout=httpx.Timeout(
            connect=30.0,
            read=300.0,
            write=120.0,
            pool=30.0,
        ),
    )
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(httpx_client=transport),
    ), transport


def run_gemini_matching(po_path: str, invoice_path: str) -> str:
    """Upload and compare two PDFs using Gemini's synchronous SDK API."""
    client, transport = _create_client()
    po_file: Any = None
    inv_file: Any = None

    try:
        po_file = client.files.upload(file=po_path)
        inv_file = client.files.upload(file=invoice_path)
        wait_for_files_active(client, [po_file, inv_file])

        model_name = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=COMPARISON_RESPONSE_SCHEMA,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
        )
        prompt = (
            "You are an expert AI Purchase Order and Invoice Auditor. Analyze both attached PDF documents in full detail. "
            "Return only JSON with summary, line_items, and matched_headers. summary must contain po_number, invoice_number, "
            "vendor_name, po_total, invoice_total, and overall_status (MATCHED, PARTIAL_MATCH, or DISCREPANCY_FOUND). "
            "line_items must contain every compared line item, including matching and mismatching items. Each line item must "
            "use the exact product or service description printed in the PDFs as item_name. Never use generic placeholders "
            "such as Item 1, Item 2, Item 1 Quantity, or Item 1 Total Amount. Include po_qty, inv_qty, po_rate, inv_rate, "
            "po_total, inv_total, status (MATCH or DISCREPANCY), and variance_reason. matched_headers must contain each "
            "matched document-level field with field, po_value, invoice_value, and match_confidence. Use 0 for missing "
            "numeric values and explain every mismatch in variance_reason."
        )

        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[po_file, inv_file, prompt],
                    config=config,
                )
                response_text = (getattr(response, "text", "") or "").strip()
                if not response_text:
                    raise ValueError("Gemini returned an empty response.")
                return response_text
            except (APIError, httpx.ReadTimeout, httpx.ConnectTimeout) as exc:
                if attempt == MAX_RETRIES:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=(
                            f"Gemini processing failed after {MAX_RETRIES} attempts: "
                            f"{type(exc).__name__}: {exc}"
                        ),
                    ) from exc
                time.sleep(attempt * 4)

        raise RuntimeError("Gemini matching exited without a response.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini processing error [{type(exc).__name__}]: {exc}",
        ) from exc
    finally:
        for uploaded_file in (po_file, inv_file):
            file_name = getattr(uploaded_file, "name", None)
            if file_name:
                try:
                    client.files.delete(name=file_name)
                except Exception:
                    pass
        try:
            client.close()
        finally:
            transport.close()


def compare_document_bytes(
    po_bytes: bytes,
    invoice_bytes: bytes,
    po_mime_type: str = "application/pdf",
    invoice_mime_type: str = "application/pdf",
) -> dict[str, Any]:
    """Compare raw document bytes using short-lived local staging files."""
    if not po_bytes or not invoice_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both PO and invoice documents are required.",
        )

    with tempfile.TemporaryDirectory(prefix="invoice-match-") as directory:
        suffixes = {"application/pdf": ".pdf", "image/png": ".png", "image/jpeg": ".jpg"}
        po_path = os.path.join(directory, f"purchase-order{suffixes.get(po_mime_type, '.pdf')}")
        invoice_path = os.path.join(directory, f"invoice{suffixes.get(invoice_mime_type, '.pdf')}")
        with open(po_path, "wb") as po_stream:
            po_stream.write(po_bytes)
        with open(invoice_path, "wb") as invoice_stream:
            invoice_stream.write(invoice_bytes)
        try:
            return json.loads(run_gemini_matching(po_path, invoice_path))
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini returned invalid JSON [{type(exc).__name__}]: {exc}",
            ) from exc


async def process_invoice_matching(po_path: Path, invoice_path: Path) -> Dict[str, Any]:
    """Async adapter used by the FastAPI router."""
    response_text = await asyncio.to_thread(
        run_gemini_matching,
        str(po_path),
        str(invoice_path),
    )
    try:
        result = json.loads(response_text)
    except json.JSONDecodeError as exc:
        raise ValueError("Gemini returned invalid comparison JSON.") from exc
    if not isinstance(result, dict):
        raise ValueError("Gemini returned an invalid comparison payload.")
    return result


__all__ = [
    "compare_document_bytes",
    "process_invoice_matching",
    "run_gemini_matching",
    "wait_for_files_active",
]
