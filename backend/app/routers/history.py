import csv
import datetime
import io
import json
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Disease, DiseaseHistoryLog, User
from app.schemas import (
    HistoryLogCreate,
    HistoryLogCreateResponse,
    HistoryLogResponse,
    PaginatedHistoryResponse,
    RemedySchema,
)
from app.security import get_current_user, get_now_utc
from app.services.disease_lookup import resolve_disease
from app.services.storage import storage_service

router = APIRouter(tags=["Disease History & Media Storage Management"])


def _extract_image_identifier(s3_storage_uri: str) -> str:
    """Extract filename or identifier from storage URI."""
    if not s3_storage_uri:
        return ""
    clean = s3_storage_uri.rstrip("/").split("?")[0]
    return clean.split("/")[-1] if "/" in clean else clean


def _to_response(log: DiseaseHistoryLog) -> HistoryLogResponse:
    """Helper to convert model to schema with active presigned media URL and enriched metadata."""
    resp = HistoryLogResponse.model_validate(log)
    resp.media_url = storage_service.generate_presigned_url(log.s3_storage_uri)
    resp.image_identifier = _extract_image_identifier(log.s3_storage_uri)

    is_healthy = (
        log.disease_id == "healthy_leaf"
        or "healthy" in (log.disease_name or "").lower()
    )
    resp.leaf_status = "Healthy" if is_healthy else "Diseased"

    disease = getattr(log, "disease", None)
    if disease:
        resp.plant_species = disease.plant_species
        resp.scientific_name = disease.scientific_name
        resp.severity_level = disease.severity_level
        if getattr(disease, "remedies", None):
            resp.remedies = [RemedySchema.model_validate(r) for r in disease.remedies]
    elif is_healthy:
        resp.severity_level = "NONE"

    return resp


def _format_remedies_by_category(remedies: list, is_healthy: bool) -> tuple[str, str, str, str]:
    """Group remedies into organic, chemical, preventive, and consolidated summary text."""
    if is_healthy:
        organic_parts = []
        cultural_parts = []
        if remedies:
            for r in remedies:
                title = getattr(r, "title", "") or ""
                desc = getattr(r, "description", "") or ""
                cat = (getattr(r, "category", "") or "").lower()
                text = f"{title}: {desc}" if desc else title
                if "organic" in cat or "biological" in cat:
                    organic_parts.append(text)
                else:
                    cultural_parts.append(text)

        organic_str = " | ".join(organic_parts) if organic_parts else "Rhizobium Bio-Fertilizer (Seed/soil inoculation to sustain vigor)"
        chemical_str = "None required (Foliage is healthy)"
        cultural_str = " | ".join(cultural_parts) if cultural_parts else "Maintain optimal irrigation, balanced NPK nutrition, and routine crop scouting."
        summary_str = "Healthy foliage baseline. No curative chemical intervention needed. Maintain preventive nutrition and crop scouting."
        return (organic_str, chemical_str, cultural_str, summary_str)

    if not remedies:
        return (
            "Consult local agricultural extension for organic bio-agents.",
            "Apply labeled fungicide if spread exceeds economic threshold.",
            "Remove and destroy infected crop debris; avoid overhead sprinkler irrigation.",
            "Disease detected. Initiate field sanitation and inspect surrounding foliage.",
        )

    organic_items = []
    chemical_items = []
    cultural_items = []
    all_summaries = []

    for r in remedies:
        title = getattr(r, "title", "") or ""
        desc = getattr(r, "description", "") or ""
        instr = getattr(r, "application_instructions", "") or ""
        cat = (getattr(r, "category", "") or "").lower()

        detail_parts = [title]
        if desc:
            detail_parts.append(desc)
        if instr:
            detail_parts.append(f"Instructions: {instr}")
        formatted_entry = " — ".join(detail_parts)

        if "organic" in cat or "biological" in cat:
            organic_items.append(formatted_entry)
        elif "chemical" in cat or "fungicide" in cat:
            chemical_items.append(formatted_entry)
        elif "preventive" in cat or "cultural" in cat:
            cultural_items.append(formatted_entry)
        else:
            cultural_items.append(formatted_entry)

        all_summaries.append(f"[{getattr(r, 'remedy_type', 'General')}] {title}: {desc}")

    organic_str = " | ".join(organic_items) if organic_items else "None specified"
    chemical_str = " | ".join(chemical_items) if chemical_items else "None specified"
    cultural_str = " | ".join(cultural_items) if cultural_items else "None specified"
    summary_str = " | ".join(all_summaries) if all_summaries else "Follow integrated pest management (IPM) guidelines."

    return (organic_str, chemical_str, cultural_str, summary_str)


@router.post(
    "",
    response_model=HistoryLogCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Explicitly log confirmed diagnosis record",
)
def create_history_log_item(
    payload: HistoryLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Explicitly logs a confirmed plant disease diagnosis record (Task 4.3 per Implementation.md §6.2).
    Triggered when the user clicks 'Save Diagnosis' rather than on every ephemeral video frame.
    Enforces S3 compensation rollback if the database commit fails.
    """
    disease_obj = resolve_disease(db, payload.disease_id)
    if not disease_obj:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unknown disease reference '{payload.disease_id}'. Use a catalogued disease id, numeric index, or name.",
        )

    disease_name = payload.disease_name or disease_obj.disease_name

    # Import base64 decoding helper
    from app.routers.inference import _decode_base64_image

    raw_uri = (payload.s3_storage_uri or "").strip()
    is_valid_uri = (
        bool(raw_uri)
        and len(raw_uri) <= 500
        and (
            raw_uri.startswith("s3://")
            or raw_uri.startswith("/media/")
            or raw_uri.startswith("http://")
            or raw_uri.startswith("https://")
        )
    )
    s3_storage_uri = raw_uri if is_valid_uri else None
    image_b64_source = payload.image_b64 or (
        raw_uri if (raw_uri and not is_valid_uri) else None
    )

    if not s3_storage_uri and image_b64_source:
        image_bytes, mime_type = _decode_base64_image(image_b64_source)
        if image_bytes:
            frame_id = str(uuid.uuid4())
            s3_storage_uri = storage_service.upload_image(
                image_bytes=image_bytes,
                mime_type=mime_type,
                user_id=current_user.id,
                frame_id=frame_id,
            )
    if not s3_storage_uri:
        # Fallback storage URI if neither is provided
        s3_storage_uri = f"s3://plant-aid-storage/frames/{current_user.id}/{uuid.uuid4()}.jpg"

    bbox_json = (
        json.dumps(payload.bounding_box.model_dump())
        if payload.bounding_box
        else None
    )
    now = get_now_utc()

    log_entry = DiseaseHistoryLog(
        user_id=current_user.id,
        disease_id=disease_obj.id,
        disease_name=disease_name,
        confidence_score=payload.confidence_score,
        s3_storage_uri=s3_storage_uri,
        bounding_box_json=bbox_json,
        diagnosis_timestamp=now,
    )
    db.add(log_entry)
    try:
        db.commit()
        db.refresh(log_entry)
    except Exception:
        db.rollback()
        # Compensation rollback: delete newly uploaded media if database transaction fails
        if s3_storage_uri:
            storage_service.delete_object(s3_storage_uri)
        raise HTTPException(
            status_code=500,
            detail="Failed to persist diagnosis history record. Media compensation executed.",
        )

    return HistoryLogCreateResponse(
        log_id=log_entry.id,
        status="confirmed",
        timestamp=log_entry.diagnosis_timestamp,
    )


def _parse_dt(dt_str: Optional[str]) -> Optional[datetime.datetime]:
    """Helper to parse ISO datetime strings robustly across URL decodings and formats."""
    if not dt_str:
        return None
    clean = dt_str.strip().replace(" ", "+").replace("Z", "+00:00")
    try:
        dt = datetime.datetime.fromisoformat(clean)
        return dt.replace(tzinfo=None)
    except Exception:
        return None


def _get_visible_log_or_404(db: Session, log_id: int, user_id: int) -> DiseaseHistoryLog:
    """Fetches one of the caller's non-deleted history rows, or raises 404."""
    log = (
        db.query(DiseaseHistoryLog)
        .options(joinedload(DiseaseHistoryLog.disease).joinedload(Disease.remedies))
        .filter(
            DiseaseHistoryLog.id == log_id,
            DiseaseHistoryLog.user_id == user_id,
            DiseaseHistoryLog.deleted_at.is_(None),
        )
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="History log entry not found")
    return log


@router.get(
    "",
    response_model=PaginatedHistoryResponse,
    summary="Get paginated history dashboard records",
)
def get_user_history(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    size: Optional[int] = Query(None, ge=1, le=100, description="Items per page (alias for limit)"),
    disease_id: Optional[str] = Query(None, description="Filter by disease ID"),
    date_from: Optional[str] = Query(
        None, description="Filter records on or after this timestamp (ISO format)"
    ),
    date_to: Optional[str] = Query(
        None, description="Filter records on or before this timestamp (ISO format)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieves paginated diagnosis history records for the authenticated user (Task 4.4 per Implementation.md §6.2).
    Includes active, time-limited presigned URLs for image thumbnails and supports disease and date filtering.
    """
    actual_limit = size if size is not None else limit

    query = (
        db.query(DiseaseHistoryLog)
        .options(joinedload(DiseaseHistoryLog.disease).joinedload(Disease.remedies))
        .filter(
            DiseaseHistoryLog.user_id == current_user.id,
            DiseaseHistoryLog.deleted_at.is_(None),
        )
    )

    dt_from = _parse_dt(date_from)
    dt_to = _parse_dt(date_to)

    if disease_id:
        query = query.filter(DiseaseHistoryLog.disease_id == disease_id)
    if dt_from:
        query = query.filter(DiseaseHistoryLog.diagnosis_timestamp >= dt_from)
    if dt_to:
        query = query.filter(DiseaseHistoryLog.diagnosis_timestamp <= dt_to)

    total = query.count()
    total_pages = (total + actual_limit - 1) // actual_limit if total > 0 else 1

    records = (
        query.order_by(DiseaseHistoryLog.diagnosis_timestamp.desc())
        .offset((page - 1) * actual_limit)
        .limit(actual_limit)
        .all()
    )

    return PaginatedHistoryResponse(
        items=[_to_response(log) for log in records],
        total=total,
        page=page,
        limit=actual_limit,
        total_pages=total_pages,
    )


@router.get(
    "/export",
    summary="Export complete diagnosis history as an enriched CSV report",
    response_class=Response,
)
def export_user_history_csv(
    disease_id: Optional[str] = Query(None, description="Filter by disease ID"),
    date_from: Optional[str] = Query(
        None, description="Filter records on or after this timestamp (ISO format)"
    ),
    date_to: Optional[str] = Query(
        None, description="Filter records on or before this timestamp (ISO format)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exports the authenticated user's complete diagnosis history as a comprehensive, research-grade CSV.
    Includes image identifiers, leaf health status, confidence scores, coordinates, and detailed
    organic, chemical, and preventive cultural treatment recommendations.
    """
    query = (
        db.query(DiseaseHistoryLog)
        .options(joinedload(DiseaseHistoryLog.disease).joinedload(Disease.remedies))
        .filter(
            DiseaseHistoryLog.user_id == current_user.id,
            DiseaseHistoryLog.deleted_at.is_(None),
        )
    )

    dt_from = _parse_dt(date_from)
    dt_to = _parse_dt(date_to)

    if disease_id and disease_id != "all":
        query = query.filter(DiseaseHistoryLog.disease_id == disease_id)
    if dt_from:
        query = query.filter(DiseaseHistoryLog.diagnosis_timestamp >= dt_from)
    if dt_to:
        query = query.filter(DiseaseHistoryLog.diagnosis_timestamp <= dt_to)

    records = query.order_by(DiseaseHistoryLog.diagnosis_timestamp.desc()).all()

    output = io.StringIO()
    # Write UTF-8 BOM so spreadsheet viewers render unicode correctly
    output.write("\ufeff")
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    headers = [
        "Log ID",
        "Diagnosis Timestamp (UTC)",
        "Diagnosis Date",
        "Crop / Plant Species",
        "Leaf Status",
        "Condition Name",
        "Scientific Name",
        "Disease ID / Code",
        "Severity Level",
        "Confidence (%)",
        "Image Identifier",
        "Detection Bounding Box",
        "Treatment Required",
        "Organic / Biological Treatments",
        "Chemical / Fungicide Treatments",
        "Preventive Cultural Practices",
        "Consolidated Treatment Summary",
    ]
    writer.writerow(headers)

    for log in records:
        is_healthy = (
            log.disease_id == "healthy_leaf"
            or "healthy" in (log.disease_name or "").lower()
        )
        leaf_status = "Healthy" if is_healthy else "Diseased"
        treatment_req = "No (Healthy Foliage)" if is_healthy else "Yes"

        disease = getattr(log, "disease", None)
        plant_species = getattr(disease, "plant_species", None) or "Groundnut (Arachis hypogaea)"
        sci_name = getattr(disease, "scientific_name", None) or ("Arachis hypogaea L." if is_healthy else "Unknown")
        severity = getattr(disease, "severity_level", None) or ("NONE" if is_healthy else "MEDIUM")
        remedies = getattr(disease, "remedies", []) if disease else []

        organic_str, chemical_str, cultural_str, summary_str = _format_remedies_by_category(
            remedies, is_healthy
        )

        dt = log.diagnosis_timestamp
        dt_str = dt.isoformat() if dt else ""
        date_str = dt.strftime("%Y-%m-%d") if dt else ""

        conf_str = f"{log.confidence_score * 100:.1f}%"
        img_id = _extract_image_identifier(log.s3_storage_uri)

        bbox_str = "Full Leaf / Unspecified"
        if log.bounding_box_json:
            try:
                b = json.loads(log.bounding_box_json)
                if isinstance(b, dict) and "x_min" in b:
                    bbox_str = f"x_min={b.get('x_min', 0):.2f}, y_min={b.get('y_min', 0):.2f}, x_max={b.get('x_max', 0):.2f}, y_max={b.get('y_max', 0):.2f}"
                else:
                    bbox_str = log.bounding_box_json
            except Exception:
                bbox_str = log.bounding_box_json

        writer.writerow([
            log.id,
            dt_str,
            date_str,
            plant_species,
            leaf_status,
            log.disease_name,
            sci_name,
            log.disease_id,
            severity,
            conf_str,
            img_id,
            bbox_str,
            treatment_req,
            organic_str,
            chemical_str,
            cultural_str,
            summary_str,
        ])

    csv_data = output.getvalue()
    today_str = datetime.date.today().isoformat()
    filename = f"groundnut-aid-history-{today_str}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get(
    "/{log_id}",
    response_model=HistoryLogResponse,
    summary="Get single diagnosis history record",
)
def get_history_log_item(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves a single diagnosis history log record by ID with an active presigned media URL."""
    log = _get_visible_log_or_404(db, log_id, current_user.id)
    return _to_response(log)


@router.delete(
    "/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete diagnosis history record",
)
def delete_history_log_item(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Removes a diagnosis from the user's dashboard and cleans up associated S3 / disk media.
    The record itself is soft-deleted rather than dropped, so the audit trail survives (NF.5).
    """
    log = _get_visible_log_or_404(db, log_id, current_user.id)

    media_uri = log.s3_storage_uri
    log.deleted_at = get_now_utc()
    db.commit()

    # Clean up associated media object (Task 4.2)
    storage_service.delete_object(media_uri)
