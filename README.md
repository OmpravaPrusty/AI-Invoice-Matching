# AI Invoice Matching

AI Invoice Matching is an enterprise-grade SaaS platform designed to help finance teams automate invoice validation and reconciliation. The application will support upload of purchase orders and supplier invoices, extract structured data with OCR and AI, compare documents, detect discrepancies, generate summaries, and produce downloadable comparison reports.

## Project Objective

The initial version focuses on:

- Purchase order and invoice upload
- OCR and AI-based data extraction
- AI document comparison
- Discrepancy detection
- Comparison history
- PDF report generation
- JWT authentication
- Dashboard experience

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

```text
backend/     # API services, business logic, and database models
frontend/    # React application and UI components
docs/        # Project requirements, architecture notes, and design references
```

## Project Principles

This repository is being established with a scalable and enterprise-ready foundation:

- Clear separation between frontend and backend responsibilities
- Maintainable folder structure for long-term growth
- Security-first configuration and environment management
- Documentation-driven development for collaboration
- Standardized Git workflow for team delivery

## Development Status

The current repository contains the initial project foundation only. Core application features and business logic will be added in subsequent iterations.

## Getting Started

1. Clone the repository.
2. Set up the backend environment and dependencies.
3. Set up the frontend environment and dependencies.
4. Configure environment variables for Supabase, OpenAI, and OCR services.
5. Start the development servers for local testing.

## OpenAI Connectivity Test

The repository includes a minimal connectivity test at `backend/test_openai.py`.

1. Copy `.env.example` to `.env` in the repository root.
2. Set `OPENAI_API_KEY` in `.env` and keep the file local.
3. Run the test from the repository root:

```powershell
.\backend\venv\Scripts\python.exe .\backend\test_openai.py
```

The expected successful output is:

```text
OpenAI connection works.
```

The test uses `OPENAI_MODEL` from `.env`, defaulting to `gpt-4o-mini`. Do not commit or share your API key.

## Branching Strategy

The repository will follow a structured branching model:

- main: production-ready code
- develop: integration branch for upcoming releases
- feature/\*: new feature work
- hotfix/\*: urgent fixes for production issues

## License

This project is licensed under the MIT License. See the LICENSE file for details.
