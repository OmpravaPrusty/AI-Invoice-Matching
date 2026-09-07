"""Public import path for the Gemini invoice-matching service."""

from app.services.gemini_service import process_invoice_matching

__all__ = ["process_invoice_matching"]
