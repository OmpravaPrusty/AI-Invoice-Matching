# AI Invoice Matching

AI Invoice Matching is an enterprise-grade SaaS platform designed for finance teams to streamline invoice review and validation. The application will help users upload purchase orders (POs) and supplier invoices, extract structured data using OCR and OpenAI, compare both documents, detect discrepancies, generate AI summaries, and export comparison reports.

## Project Objective

Build a secure, scalable, and audit-friendly web application that reduces manual effort in invoice matching while improving accuracy and consistency across finance operations.

## Version 1 Scope

- Purchase order and invoice upload
- OCR and AI-based data extraction
- AI document comparison
- Discrepancy detection
- Comparison history
- PDF report generation
- JWT-based authentication
- Dashboard experience

## Future Scope

The following capabilities are intentionally out of scope for Version 1:

- GRN
- Three-way matching
- ERP integration
- Approval workflow
- Supplier portal
- Email notifications

## Technology Stack

- Frontend: React, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy
- Database: Supabase PostgreSQL
- Storage: Supabase Storage
- AI: OpenAI API
- OCR: Tesseract OCR
- Authentication: JWT
- Version Control: Git and GitHub

## Repository Structure

- backend/ - API services and business logic foundation
- frontend/ - React application foundation
- docs/ - product and architecture documentation

## Project Status

The repository currently contains the initial project foundation only. No application business logic or UI implementation has been added yet.

## Development Approach

This foundation is being established with enterprise-grade practices in mind:

- Clear project structure
- Secure configuration handling
- Scalable folder organization
- Professional documentation and licensing
- Git-based collaboration workflow

## Getting Started

1. Clone the repository.
2. Set up the frontend and backend environments separately.
3. Configure required environment variables.
4. Start the development servers for local development.

## Contribution Guidelines

- Follow conventional commits for all changes.
- Keep features modular and well-documented.
- Prefer small, reviewable pull requests.
- Ensure new work is backed by tests where applicable.
