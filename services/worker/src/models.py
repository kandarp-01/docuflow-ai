from __future__ import annotations

from pydantic import BaseModel, Field


class ExtractionRequest(BaseModel):
    job_id: str
    workspace_id: str
    template_id: str
    document_key: str
    file_type: str


class ExtractedField(BaseModel):
    name: str
    value: str | None = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    status: str = Field(default='CONFIRMED')


class RecordCandidate(BaseModel):
    invoice_number: str | None = None
    vendor_name: str | None = None
    invoice_date: str | None = None
    total_amount: str | None = None
    fields: list[ExtractedField] = Field(default_factory=list)
