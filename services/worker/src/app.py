from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel

from .models import ExtractionRequest
from .processor import extract_invoice_metadata, write_export_stub

app = FastAPI(title='DocuFlow AI Worker', version='0.1.0')


class HealthResponse(BaseModel):
    ok: bool
    service: str
    status: str


@app.get('/health', response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(ok=True, service='docuflow-worker', status='healthy')


@app.post('/extract')
def extract(payload: ExtractionRequest) -> dict[str, Any]:
    candidate = extract_invoice_metadata(payload)
    export_path = write_export_stub(os.getenv('EXPORT_DIR', './exports'), candidate)
    return {
        'job_id': payload.job_id,
        'workspace_id': payload.workspace_id,
        'record': candidate.model_dump(),
        'export_path': str(export_path),
    }


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('src.app:app', host='0.0.0.0', port=8000, reload=True)
