from __future__ import annotations

import json
import logging
import os
from typing import Any

from google import genai

logger = logging.getLogger(__name__)
MODEL_NAME = "gemini-3.6-flash"

_api_key = os.getenv("GEMINI_API_KEY", "").strip()
gemini = genai.Client(api_key=_api_key) if _api_key else None


def _get_client() -> genai.Client | None:
    global gemini
    if gemini is None:
        api_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not api_key:
            return None
        gemini = genai.Client(api_key=api_key)
    return gemini


def generate_discrepancy_resolution(
    po_data: dict,
    invoice_data: dict,
    discrepancies: list,
) -> str:
    """Generate an AP-focused resolution without making the comparison fail."""
    if not discrepancies:
        return "No discrepancies were detected. AP can proceed with the normal approval workflow."

    client = _get_client()
    if client is None:
        return "AI resolution is unavailable because GEMINI_API_KEY is not configured. Review the listed variances manually."

    prompt = """You are an accounts-payable discrepancy analyst. Review the structured purchase order, invoice, and detected variances below.

Respond with exactly these two headings and concise plain text:
Root Cause Summary
<one short paragraph identifying the likely causes and business impact>

Recommended Action Steps
1. <specific AP action>
2. <specific AP action>

Do not invent facts. Base every statement on the supplied data. If a value is missing, say so.

PURCHASE ORDER:
{po}

INVOICE:
{invoice}

DETECTED VARIANCES:
{discrepancies}
""".format(
        po=json.dumps(po_data or {}, default=str, indent=2),
        invoice=json.dumps(invoice_data or {}, default=str, indent=2),
        discrepancies=json.dumps(discrepancies, default=str, indent=2),
    )

    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = (getattr(response, "text", "") or "").strip()
        return text or "AI returned no resolution. Review the listed variances manually."
    except Exception as exc:
        logger.warning("Gemini discrepancy resolution failed: %s", exc)
        return "AI resolution is temporarily unavailable. Review the listed variances manually."
