# DocuFlow AI

DocuFlow AI is a modular document-to-Excel automation platform for supplier invoice processing. This repository is the starter monorepo for the product architecture described in the project brief.

## Architecture summary

- React + TypeScript frontend for authentication, workspace management, uploads, review, and export flows.
- Express.js API for workspaces, job orchestration, auth, billing controls, and export requests.
- Python extraction worker for OCR, PDF parsing, AI extraction, validation, and spreadsheet export.
- MongoDB for metadata, jobs, templates, and audit history.
- Redis + BullMQ for asynchronous document processing.
- Private object storage for original files, generated exports, and audit artifacts.

## Repository layout

- `apps/frontend` — Vite React web application
- `apps/api` — Node.js API server
- `services/worker` — Python document-processing worker
- `docs` — architecture notes and deployment references
- `ops` — Docker / infrastructure defaults

## Quick start

1. Install dependencies:
   `npm install`
2. Start MongoDB and Redis with Docker Compose:
   `docker compose up -d mongo redis`
3. Start the API:
   `npm run dev:api`
4. Start the frontend:
   `npm run dev:frontend`
5. Start the worker:
   `cd services/worker && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python -m src.app`

## Current milestone

The second development milestone includes:

- secure cookie-based authentication using JWT and bcrypt hashing
- protected workspace and job endpoints enforced with backend middleware
- file upload presigning with MIME/type and size validation
- a demo workspace and auth flow suitable for UI integration

## Production phase

This starter focuses on architecture, service boundaries, and a working foundation. The next phases add:

- authentication and RBAC
- upload validation and signed URLs
- queue-driven processing
- AI extraction contracts
- validation and review UI
- Excel export generation
- CI/CD pipeline

## Documentation

See `docs/architecture.md` for the Mermaid diagram and a deeper system design.
