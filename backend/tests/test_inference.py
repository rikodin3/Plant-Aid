import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import base64
import io
from PIL import Image
import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import torch

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.limiter import limiter
from app.main import app
from app.models import DiseaseHistoryLog, User
from app.security import create_access_token, hash_password
from app.services.ml_engine import MLEngine, ml_engine
from seed import seed_database

client = TestClient(app)


def _create_synthetic_leaf_b64(color=(34, 139, 34)) -> str:
    """Creates a base64 encoded synthetic RGB image with a centered leaf-green rectangle."""
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    # Fill center with green color
    arr[40:160, 40:160] = color
    pil_img = Image.fromarray(arr)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def _create_synthetic_leaf_png_b64() -> str:
    """Creates the same synthetic leaf encoded as PNG, for content-sniffing tests."""
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    arr[40:160, 40:160] = (34, 139, 34)
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@pytest.fixture(scope="module", autouse=True)
def setup_module():
    Base.metadata.create_all(bind=engine)
    seed_database()


@pytest.fixture
def auth_user():
    db: Session = SessionLocal()
    user = db.query(User).filter(User.email_address == "inference_tester@example.com").first()
    if not user:
        user = User(
            user_name="Inference Tester",
            email_address="inference_tester@example.com",
            phone_number="+15551112222",
            password_hash=hash_password("Pass12345!"),
            account_status="ACTIVE",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    user_id = user.id
    db.close()
    return {"Authorization": f"Bearer {token}"}, user_id


def test_ml_engine_cpu_device_and_fallback():
    """Task 5.1: Verify engine loads cleanly and runs safely in Fallback mode if weights absent."""
    assert str(ml_engine.device) in ("cpu", "cuda")
    assert len(ml_engine.classes) == 6
    assert "early_leaf_spot" in ml_engine.classes
    assert "healthy_leaf" in ml_engine.classes
    assert ml_engine.is_fallback is True or ml_engine.model is not None


def test_ml_engine_device_auto_fallback_without_crash(monkeypatch):
    """Task 5.1: Verify engine gracefully falls back to CPU if CUDA is requested on non-CUDA hardware."""
    monkeypatch.setattr(settings, "ML_DEVICE", "cuda")
    engine_inst = MLEngine()
    expected_device = "cuda" if torch.cuda.is_available() else "cpu"
    assert str(engine_inst.device) == expected_device


def test_layer1_leaf_roi_extraction():
    """Task 5.2: Layer 1 HSV green-mask leaf segmentation extracts tight bounding box."""
    arr = np.zeros((100, 100, 3), dtype=np.uint8)
    arr[20:80, 20:80] = [34, 139, 34]  # Forest Green

    roi = ml_engine.extract_leaf_roi(arr)
    assert roi["detected"] is True
    assert 0.15 <= roi["x_min"] <= 0.25
    assert 0.15 <= roi["y_min"] <= 0.25
    assert 0.75 <= roi["x_max"] <= 0.85
    assert 0.75 <= roi["y_max"] <= 0.85


def test_layer1_leaf_roi_non_leaf_fallback():
    """Task 5.2: Non-green image safely defaults to centered ROI."""
    arr = np.zeros((100, 100, 3), dtype=np.uint8)
    arr[:] = [200, 0, 0]  # Solid red background

    roi = ml_engine.extract_leaf_roi(arr)
    assert roi["detected"] is False
    assert roi["x_min"] == 0.1
    assert roi["y_min"] == 0.1


def test_non_plant_image_returns_no_groundnut_plant_seen():
    """Verify non-plant / non-foliage image returns 'No groundnut plant seen' with 0.0 confidence."""
    arr = np.zeros((200, 200, 3), dtype=np.uint8)
    arr[:] = [240, 240, 240]  # Blank white canvas / desk
    pil_img = Image.fromarray(arr)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG")
    image_bytes = buf.getvalue()

    pred = ml_engine.predict(image_bytes)
    assert pred["disease_name"] == "No groundnut plant seen"
    assert pred["confidence"] == 0.0
    assert pred["disease_id"] == 0


def test_layer2_gradcam_heatmap_and_leaf_roi_intersection():
    """Task 5.3: Layer 2 Grad-CAM attention heatmap is bounded and intersected with Leaf ROI mask."""
    # Synthetic frame with green leaf canvas and centered spot
    arr = np.zeros((100, 100, 3), dtype=np.uint8)
    arr[20:80, 20:80] = [34, 139, 34]
    arr[40:55, 40:55] = [139, 69, 19]  # Brown necrotic spot (lesion)

    roi = ml_engine.extract_leaf_roi(arr)
    assert roi["detected"] is True

    heatmap, cam_b64 = ml_engine.compute_gradcam_heatmap(
        image_np=arr,
        winning_class_idx=0,
        leaf_mask=roi["mask"],
        is_healthy=False,
    )

    # Values must be normalized in [0, 1]
    assert heatmap.shape == (100, 100)
    assert float(heatmap.min()) >= 0.0
    assert float(heatmap.max()) <= 1.0

    # Outside leaf mask must be zeroed out (intersection property)
    outside_mask = roi["mask"] == 0
    assert np.all(heatmap[outside_mask] == 0.0)

    # Optional base64 CAM heatmap mask must be valid JPEG data
    assert cam_b64 is not None
    decoded_cam = base64.b64decode(cam_b64)
    pil_cam = Image.open(io.BytesIO(decoded_cam))
    assert pil_cam.size == (100, 100)

    # Bounding box must be bounded within leaf ROI
    bbox = ml_engine.compute_two_layer_bbox(
        image_np=arr,
        leaf_roi=roi,
        is_healthy=False,
        heatmap=heatmap,
    )
    assert roi["x_min"] <= bbox["x_min"] < bbox["x_max"] <= roi["x_max"]
    assert roi["y_min"] <= bbox["y_min"] < bbox["y_max"] <= roi["y_max"]


def test_confidence_calibration_uncertainty_flag():
    """Task 5.4: Verify tau = 0.55 calibration sets is_healthy_or_uncertain appropriately."""
    b64_img = _create_synthetic_leaf_b64()
    image_bytes = base64.b64decode(b64_img)
    pred = ml_engine.predict(image_bytes)

    assert "is_healthy_or_uncertain" in pred
    assert isinstance(pred["is_healthy_or_uncertain"], bool)
    if pred["class_key"] == "healthy_leaf" or pred["confidence"] < 0.55:
        assert pred["is_healthy_or_uncertain"] is True
    else:
        assert pred["is_healthy_or_uncertain"] is False


def test_streaming_frame_endpoint_contract(auth_user):
    """Task 5.5: POST /api/inference/frame matches exact contract without writing to history DB."""
    headers, _ = auth_user
    db: Session = SessionLocal()
    count_before = db.query(DiseaseHistoryLog).count()
    db.close()

    payload = {
        "mime_type": "image/jpeg",
        "encoding": "base64",
        "image_b64": _create_synthetic_leaf_b64(),
        "capture_timestamp": "2026-09-07T12:00:00Z",
    }

    res = client.post("/api/inference/frame", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Exact contract check
    assert "disease_id" in data
    assert "disease_name" in data
    assert "confidence" in data
    assert "bounding_box" in data
    assert "frame_id" in data
    assert "is_healthy_or_uncertain" in data
    assert "cam_heatmap_b64" in data
    assert len(data["remedies"]) > 0

    bbox = data["bounding_box"]
    assert 0.0 <= bbox["x_min"] <= bbox["x_max"] <= 1.0
    assert 0.0 <= bbox["y_min"] <= bbox["y_max"] <= 1.0

    # Verify ephemeral stream did NOT write to persistent history table
    db = SessionLocal()
    count_after = db.query(DiseaseHistoryLog).count()
    db.close()
    assert count_after == count_before


def test_inference_endpoints_require_jwt(auth_user):
    """Ticket 02: both inference endpoints demand a Bearer JWT per NF.3 / Implementation.md §8."""
    payload = {
        "mime_type": "image/jpeg",
        "encoding": "base64",
        "image_b64": _create_synthetic_leaf_b64(),
    }

    assert client.post("/api/inference/frame", json=payload).status_code == 401
    assert client.post(
        "/api/inference/frame",
        json=payload,
        headers={"Authorization": "Bearer not-a-real-token"},
    ).status_code == 401

    image_bytes = base64.b64decode(_create_synthetic_leaf_b64())
    assert client.post(
        "/api/inference/predict",
        files={"file": ("leaf.jpg", image_bytes, "image/jpeg")},
    ).status_code == 401


def test_multipart_predict_endpoint(auth_user):
    """Task 5.5 + Ticket 02: authenticated upload returns a storage URI and writes no history row."""
    headers, _ = auth_user
    img_b64 = _create_synthetic_leaf_b64()
    image_bytes = base64.b64decode(img_b64)

    db: Session = SessionLocal()
    count_before = db.query(DiseaseHistoryLog).count()
    db.close()

    res = client.post(
        "/api/inference/predict",
        files={"file": ("leaf.jpg", image_bytes, "image/jpeg")},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["s3_storage_uri"] is not None
    assert "disease_name" in data
    assert data["confidence"] > 0.0

    # Persistence is the caller's explicit decision, not a side effect of uploading.
    db = SessionLocal()
    count_after = db.query(DiseaseHistoryLog).count()
    db.close()
    assert count_after == count_before


def test_frame_response_matches_documented_contract(auth_user):
    """Task 5.5 + Ticket 07: assert the §4.3 response shape and field types, not just key presence."""
    headers, _ = auth_user
    payload = {
        "mime_type": "image/jpeg",
        "encoding": "base64",
        "image_b64": _create_synthetic_leaf_b64(),
    }

    res = client.post("/api/inference/frame", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Documented §4.3 contract fields, by type
    assert isinstance(data["disease_id"], int)
    assert isinstance(data["disease_name"], str) and data["disease_name"]
    assert isinstance(data["confidence"], float)
    assert 0.0 <= data["confidence"] <= 1.0
    assert isinstance(data["frame_id"], str) and data["frame_id"]
    assert isinstance(data["is_healthy_or_uncertain"], bool)

    bbox = data["bounding_box"]
    assert set(bbox.keys()) == {"x_min", "y_min", "x_max", "y_max"}
    for key, value in bbox.items():
        assert isinstance(value, float), key
        assert 0.0 <= value <= 1.0, key
    assert bbox["x_min"] < bbox["x_max"]
    assert bbox["y_min"] < bbox["y_max"]

    # Enrichment the §5 flow depends on
    assert isinstance(data["scientific_name"], str) and data["scientific_name"]
    assert isinstance(data["plant_species"], str) and data["plant_species"]
    assert isinstance(data["confidence_score"], float)
    assert data["confidence_score"] == data["confidence"]
    assert isinstance(data["cam_heatmap_b64"], str) and data["cam_heatmap_b64"]

    assert isinstance(data["remedies"], list) and data["remedies"]
    for remedy in data["remedies"]:
        assert isinstance(remedy["title"], str)
        assert isinstance(remedy["description"], str)
        assert isinstance(remedy["category"], str)


def test_inference_aliased_routes(auth_user):
    """Verify both /api/inference/frame and /inference/frame are accessible."""
    headers, _ = auth_user
    payload = {
        "mime_type": "image/jpeg",
        "encoding": "base64",
        "image_b64": _create_synthetic_leaf_b64(),
    }
    res = client.post("/inference/frame", json=payload, headers=headers)
    assert res.status_code == 200
    assert "disease_id" in res.json()


def test_upload_validation_sniffs_content_not_declared_type(auth_user):
    """Ticket 04 / NF.4: only real JPEG or PNG bytes pass, whatever the caller declares."""
    headers, _ = auth_user

    # A valid PNG is accepted even though the declared type says otherwise
    png_b64 = _create_synthetic_leaf_png_b64()
    res = client.post(
        "/api/inference/frame",
        json={
            "mime_type": "image/jpeg",
            "encoding": "base64",
            "image_b64": f"data:image/jpeg;base64,{png_b64}",
        },
        headers=headers,
    )
    assert res.status_code == 200

    # Not-an-image bytes claiming to be a JPEG are refused on both endpoints
    fake_bytes = b"this is definitely not a jpeg"
    res = client.post(
        "/api/inference/predict",
        files={"file": ("leaf.jpg", fake_bytes, "image/jpeg")},
        headers=headers,
    )
    assert res.status_code == 400
    assert "JPEG or PNG" in res.json()["detail"]

    res = client.post(
        "/api/inference/frame",
        json={
            "mime_type": "image/jpeg",
            "encoding": "base64",
            "image_b64": base64.b64encode(fake_bytes).decode("utf-8"),
        },
        headers=headers,
    )
    assert res.status_code == 400
    assert "JPEG or PNG" in res.json()["detail"]

    # A valid PNG upload passes content sniffing on the multipart path too
    png_bytes = base64.b64decode(png_b64)
    res = client.post(
        "/api/inference/predict",
        files={"file": ("leaf.bin", png_bytes, "application/octet-stream")},
        headers=headers,
    )
    assert res.status_code == 200


def test_inference_returns_multiple_bounding_boxes(auth_user):
    """Verify that multi-lesion localization returns an array of bounding_boxes."""
    headers, _ = auth_user
    payload = {
        "mime_type": "image/jpeg",
        "encoding": "base64",
        "image_b64": _create_synthetic_leaf_b64(),
    }
    res = client.post("/api/inference/frame", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "bounding_box" in data
    assert "bounding_boxes" in data
    assert isinstance(data["bounding_boxes"], list)
    if data["bounding_box"] is not None:
        assert len(data["bounding_boxes"]) >= 1
        first_box = data["bounding_boxes"][0]
        assert first_box["x_min"] == data["bounding_box"]["x_min"]
        assert first_box["y_min"] == data["bounding_box"]["y_min"]


def test_rate_limiting_auth_endpoint():
    """Task 5.6: Verify rate limiting returns HTTP 429 Too Many Requests upon exceeding threshold."""
    # settings.RATE_LIMIT_LOGIN is 10/minute
    # Make rapid requests with invalid credentials until rate limit is triggered
    status_codes = []
    for _ in range(15):
        res = client.post(
            "/api/auth/login",
            json={"email_address": "ratelimit_tester@example.com", "password": "WrongPassword!"},
        )
        status_codes.append(res.status_code)
        if res.status_code == 429:
            break

    assert 429 in status_codes


def test_rate_limiting_inference_endpoint(auth_user):
    """Task 5.6 + Ticket 05: the inference limit is enforced against the JWT subject."""
    headers, user_id = auth_user

    db: Session = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    token = create_access_token({"sub": str(user.id)})
    db.close()

    payload = {
        "mime_type": "image/jpeg",
        "encoding": "base64",
        "image_b64": _create_synthetic_leaf_b64(),
    }

    # A distinct user gets its own bucket rather than sharing one with the rest of the suite
    status_codes = []
    for _ in range(int(settings.RATE_LIMIT_INFERENCE.split("/")[0]) + 5):
        res = client.post(
            "/api/inference/frame",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        status_codes.append(res.status_code)
        if res.status_code == 429:
            break

    assert 429 in status_codes
