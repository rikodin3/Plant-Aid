import base64
import uuid
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.limiter import limiter
from app.models import Disease, User
from app.schemas import (
    BoundingBoxSchema,
    InferenceFramePayload,
    InferenceResponse,
    LesionBoundingBoxSchema,
    RemedySchema,
)
from app.security import get_current_user, get_now_utc
from app.services.ml_engine import ml_engine
from app.services.storage import storage_service

router = APIRouter(tags=["Real-Time Model Inference"])

# Accepted media types, identified by byte signature rather than by the caller-supplied
# Content-Type header or data-URI prefix (Implementation.md §4.2 step 1, NF.4).
_IMAGE_SIGNATURES = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
)
_ALLOWED_IMAGE_TYPES = "JPEG or PNG"


def _sniff_image_type(image_bytes: bytes) -> Optional[str]:
    """Returns the media type implied by the file's magic bytes, or None if unsupported."""
    for signature, mime_type in _IMAGE_SIGNATURES:
        if image_bytes.startswith(signature):
            return mime_type
    return None


def _require_supported_image(image_bytes: bytes) -> str:
    """Rejects payloads whose content is not a JPEG or PNG, independent of the declared type."""
    mime_type = _sniff_image_type(image_bytes)
    if not mime_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file content. Only {_ALLOWED_IMAGE_TYPES} images are accepted.",
        )
    return mime_type


def _decode_base64_image(base64_str: str) -> tuple[bytes, str]:
    """Helper to decode a base64 payload and derive its media type from the actual bytes."""
    try:
        base64_data = base64_str.split(",", 1)[1] if "," in base64_str else base64_str
        image_bytes = base64.b64decode(base64_data, validate=True)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 encoded image string",
        )

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No image bytes provided."
        )

    return image_bytes, _require_supported_image(image_bytes)


def _get_remedies_for_disease(
    db: Session, class_key: str, disease_id: int
) -> list[RemedySchema]:
    """Helper to resolve remedies matching disease slug or numeric index."""
    disease_obj = db.query(Disease).filter(Disease.id == class_key).first()
    if not disease_obj:
        disease_obj = db.query(Disease).filter(Disease.numeric_id == disease_id).first()
    if disease_obj and disease_obj.remedies:
        return [RemedySchema.model_validate(r) for r in disease_obj.remedies]
    return []


def _build_inference_response(
    prediction: dict,
    remedies_list: list[RemedySchema],
    frame_id: str,
    s3_storage_uri: Optional[str] = None,
) -> InferenceResponse:
    """
    Single construction path for the §4.3 response, shared by the streaming and upload
    endpoints so their payloads cannot drift apart.
    """
    return InferenceResponse(
        disease_id=prediction["disease_id"],
        disease_name=prediction["disease_name"],
        plant_species=prediction["plant_species"],
        scientific_name=prediction.get("scientific_name"),
        confidence=prediction["confidence_score"],
        confidence_score=prediction["confidence_score"],
        bounding_box=(
            BoundingBoxSchema(**prediction["bounding_box"])
            if prediction.get("bounding_box")
            else None
        ),
        bounding_boxes=[
            LesionBoundingBoxSchema(**b)
            for b in prediction.get("bounding_boxes", [])
            if b
        ],
        cam_heatmap_b64=prediction.get("cam_heatmap_b64"),
        frame_id=frame_id,
        is_healthy_or_uncertain=prediction["is_healthy_or_uncertain"],
        s3_storage_uri=s3_storage_uri,
        remedies=remedies_list,
        diagnosis_timestamp=get_now_utc(),
    )


@router.post("/frame", response_model=InferenceResponse, summary="Stream frame inference")
@limiter.limit(settings.RATE_LIMIT_INFERENCE)
async def process_inference_frame(
    request: Request,
    payload: InferenceFramePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Real-Time Leaf Frame Inference endpoint (Task 5.5 per Implementation.md §4.3).
    Receives base64 video frame, executes two-layer localization (Leaf ROI + infection focus),
    calibrates confidence against tau = 0.55, and returns normalized bounding box without persistent DB write.
    Requires a verified Bearer JWT per NF.3.
    """
    image_bytes, _ = _decode_base64_image(payload.image_b64)
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No image bytes provided."
        )

    # 1. Run ML Engine Inference (CPU mode)
    prediction = ml_engine.predict(image_bytes)

    # 2. Query Remedies
    remedies_list = _get_remedies_for_disease(
        db, prediction["class_key"], prediction["disease_id"]
    )

    return _build_inference_response(
        prediction=prediction,
        remedies_list=remedies_list,
        frame_id=str(uuid.uuid4()),
    )


@router.post("/predict", response_model=InferenceResponse, summary="File or Form inference")
@limiter.limit(settings.RATE_LIMIT_INFERENCE)
async def predict_plant_disease(
    request: Request,
    file: Optional[UploadFile] = File(None),
    base64_image: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Multipart/Form upload inference endpoint.
    Uploads the frame to media storage and returns the diagnosis plus the storage URI.
    It deliberately does not write a history row: persistence happens only through the
    explicit POST /history call, per Implementation.md §6.2.
    """
    image_bytes = None
    mime_type = "image/jpeg"

    if file:
        image_bytes = await file.read()
        # The declared content type is caller-controlled, so the bytes decide instead.
        mime_type = _require_supported_image(image_bytes)
    elif base64_image:
        image_bytes, mime_type = _decode_base64_image(base64_image)

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image provided. Upload a file or pass base64 image data.",
        )

    # 1. Run inference using ML Engine
    prediction = ml_engine.predict(image_bytes)

    # 2. Upload raw frame to S3 / media storage with hierarchical key
    frame_id = str(uuid.uuid4())
    s3_uri = storage_service.upload_image(
        image_bytes=image_bytes,
        mime_type=mime_type,
        user_id=current_user.id,
        frame_id=frame_id,
    )

    # 3. Query remedies from Database
    remedies_list = _get_remedies_for_disease(
        db, prediction["class_key"], prediction["disease_id"]
    )

    # 4. No history write here by design: the client persists through POST /history so that
    #    ephemeral uploads do not spam the dashboard (Implementation.md §6.2).
    return _build_inference_response(
        prediction=prediction,
        remedies_list=remedies_list,
        frame_id=frame_id,
        s3_storage_uri=s3_uri,
    )
