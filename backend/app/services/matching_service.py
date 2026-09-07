"""Compatibility imports for the canonical matching service."""

from services.matching_service import (
    compare_document_bytes,
    process_invoice_matching,
    run_gemini_matching,
    wait_for_files_active,
)


class GeminiServiceError(RuntimeError):
    """Legacy error name retained for existing router imports."""


__all__ = [
    "GeminiServiceError",
    "compare_document_bytes",
    "process_invoice_matching",
    "run_gemini_matching",
    "wait_for_files_active",
]
