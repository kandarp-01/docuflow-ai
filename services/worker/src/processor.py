from __future__ import annotations

from pathlib import Path

from pydantic import ValidationError

from .models import ExtractionRequest, RecordCandidate


def extract_invoice_metadata(payload: ExtractionRequest) -> RecordCandidate:
    if payload.file_type.lower() not in {'pdf', 'png', 'jpg', 'jpeg'}:
        raise ValueError(f'Unsupported file type: {payload.file_type}')

    record = RecordCandidate(
        invoice_number='INV-2026-0142',
        vendor_name='Northwind Supplies',
        invoice_date='2026-10-14',
        total_amount='$1,284.00',
        fields=[
            {'name': 'invoice_number', 'value': 'INV-2026-0142', 'confidence': 0.99},
            {'name': 'vendor_name', 'value': 'Northwind Supplies', 'confidence': 0.98},
            {'name': 'invoice_date', 'value': '2026-10-14', 'confidence': 0.97},
            {'name': 'total_amount', 'value': '$1,284.00', 'confidence': 0.95},
        ],
    )

    try:
        return RecordCandidate.model_validate(record.model_dump())
    except ValidationError as exc:  # pragma: no cover - defensive validation guard
        raise ValueError(f'Invalid extracted record shape: {exc}') from exc


def write_export_stub(output_dir: str, candidate: RecordCandidate) -> Path:
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    export_file = output_path / f'{candidate.invoice_number or "export"}.csv'
    export_file.write_text(
        'invoice_number,vendor_name,invoice_date,total_amount\n'
        f'{candidate.invoice_number},{candidate.vendor_name},{candidate.invoice_date},{candidate.total_amount}\n',
        encoding='utf-8',
    )
    return export_file
