import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Disease, DiseaseHistoryLog, User
from app.security import create_access_token, hash_password
from seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_module_db():
    Base.metadata.create_all(bind=engine)
    seed_database()


@pytest.fixture
def auth_user():
    db: Session = SessionLocal()
    user = db.query(User).filter(User.email_address == "history_tester@example.com").first()
    if not user:
        user = User(
            user_name="History User",
            email_address="history_tester@example.com",
            phone_number="+17778889999",
            password_hash=hash_password("StrongPass123!"),
            account_status="ACTIVE",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    user_id = user.id
    db.close()
    return {"Authorization": f"Bearer {token}"}, user_id


def test_explicit_diagnosis_logging_success(auth_user):
    headers, user_id = auth_user
    payload = {
        "disease_id": "early_leaf_spot",
        "confidence_score": 0.94,
        "s3_storage_uri": "s3://plant-aid-media-bucket/frames/1/2026/09/03/explicit-frame.jpg",
        "bounding_box": {"x_min": 0.1, "y_min": 0.2, "x_max": 0.8, "y_max": 0.9},
    }

    res = client.post("/api/history", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert "log_id" in data
    assert data["status"] == "confirmed"
    assert "timestamp" in data


def test_explicit_diagnosis_logging_unauthorized():
    payload = {
        "disease_id": "early_leaf_spot",
        "confidence_score": 0.85,
        "s3_storage_uri": "s3://plant-aid-media-bucket/frames/1/test.jpg",
    }
    res = client.post("/api/history", json=payload)
    assert res.status_code == 401


def test_explicit_diagnosis_logging_invalid_confidence(auth_user):
    headers, _ = auth_user
    payload = {
        "disease_id": "early_leaf_spot",
        "confidence_score": 1.5,  # Invalid: > 1.0
        "s3_storage_uri": "s3://plant-aid-media-bucket/test.jpg",
    }
    res = client.post("/api/history", json=payload, headers=headers)
    assert res.status_code == 422


def test_paginated_history_dashboard(auth_user):
    headers, user_id = auth_user

    # Add 4 additional log items for testing pagination
    for i in range(4):
        client.post(
            "/api/history",
            json={
                "disease_id": "late_leaf_spot" if i % 2 == 0 else "rust",
                "confidence_score": 0.80 + (i * 0.03),
                "s3_storage_uri": f"s3://plant-aid-media-bucket/frames/user/frame_{i}.jpg",
            },
            headers=headers,
        )

    # Page 1, limit 2
    res_p1 = client.get("/api/history?page=1&limit=2", headers=headers)
    assert res_p1.status_code == 200
    p1 = res_p1.json()
    assert p1["page"] == 1
    assert p1["limit"] == 2
    assert len(p1["items"]) == 2
    assert p1["total"] >= 5
    assert p1["total_pages"] >= 3

    # Check presigned URL enrichment
    first_item = p1["items"][0]
    assert "media_url" in first_item
    assert first_item["media_url"] is not None

    # Page 2, limit 2
    res_p2 = client.get("/api/history?page=2&limit=2", headers=headers)
    assert res_p2.status_code == 200
    p2 = res_p2.json()
    assert p2["page"] == 2
    assert len(p2["items"]) == 2
    assert p2["items"][0]["id"] != p1["items"][0]["id"]


def test_history_filtering_by_disease(auth_user):
    headers, _ = auth_user
    res = client.get("/api/history?disease_id=rust", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert all(item["disease_id"] == "rust" for item in data["items"])


def test_history_filtering_by_date(auth_user):
    headers, _ = auth_user
    future_date = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).isoformat()
    res = client.get(f"/api/history?date_from={future_date}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 0


def test_get_single_history_item(auth_user):
    headers, _ = auth_user
    # Log an item
    create_res = client.post(
        "/api/history",
        json={
            "disease_id": "healthy_leaf",
            "confidence_score": 0.99,
            "s3_storage_uri": "s3://plant-aid-media-bucket/frames/single-test.jpg",
        },
        headers=headers,
    )
    log_id = create_res.json()["log_id"]

    get_res = client.get(f"/api/history/{log_id}", headers=headers)
    assert get_res.status_code == 200
    item = get_res.json()
    assert item["id"] == log_id
    assert item["disease_id"] == "healthy_leaf"
    assert item["media_url"] is not None

    # Test 404 for nonexistent
    assert client.get("/api/history/999999", headers=headers).status_code == 404


def test_delete_history_item(auth_user):
    headers, _ = auth_user
    # Log an item
    create_res = client.post(
        "/api/history",
        json={
            "disease_id": "nutrition_deficiency",
            "confidence_score": 0.88,
            "s3_storage_uri": "s3://plant-aid-media-bucket/frames/del-test.jpg",
        },
        headers=headers,
    )
    log_id = create_res.json()["log_id"]

    del_res = client.delete(f"/api/history/{log_id}", headers=headers)
    assert del_res.status_code == 204

    # Second delete returns 404
    assert client.delete(f"/api/history/{log_id}", headers=headers).status_code == 404

    # A soft-deleted record is hidden from the dashboard, its direct lookup, and the total count
    assert client.get(f"/api/history/{log_id}", headers=headers).status_code == 404
    listed = client.get("/api/history?limit=100", headers=headers).json()
    assert all(entry["id"] != log_id for entry in listed["items"])
    assert all(entry["id"] != log_id for entry in client.get("/api/history?page=2&limit=100", headers=headers).json()["items"])


def test_delete_is_soft_and_preserves_audit_row(auth_user):
    """Ticket 03 / NF.5: the row survives deletion in the database with a deletion marker."""
    headers, _ = auth_user
    create_res = client.post(
        "/api/history",
        json={
            "disease_id": "rust",
            "confidence_score": 0.93,
            "s3_storage_uri": "s3://plant-aid-media-bucket/frames/audit-test.jpg",
        },
        headers=headers,
    )
    log_id = create_res.json()["log_id"]

    total_before = client.get("/api/history?limit=1", headers=headers).json()["total"]

    assert client.delete(f"/api/history/{log_id}", headers=headers).status_code == 204

    # Gone from the user's view...
    assert client.get(f"/api/history/{log_id}", headers=headers).status_code == 404
    total_after = client.get("/api/history?limit=1", headers=headers).json()["total"]
    assert total_after == total_before - 1

    # ...but retained in the database for the audit trail.
    db: Session = SessionLocal()
    try:
        row = (
            db.query(DiseaseHistoryLog)
            .filter(DiseaseHistoryLog.id == log_id)
            .first()
        )
        assert row is not None
        assert row.deleted_at is not None
    finally:
        db.close()


def test_history_aliased_path(auth_user):
    headers, _ = auth_user
    # Verify /history alias works the same as /api/history
    res = client.get("/history?page=1&limit=5", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data


def test_history_log_normalizes_disease_reference(auth_user):
    """Ticket 01: slug, numeric index, and disease name all normalize to the canonical slug."""
    headers, _ = auth_user

    cases = [
        ("rust", "rust"),
        ("4", "late_leaf_spot"),
        ("Groundnut Rust", "rust"),
        ("early_leaf_spot", "early_leaf_spot"),
    ]
    for raw, expected in cases:
        res = client.post(
            "/api/history",
            json={
                "disease_id": raw,
                "confidence_score": 0.9,
                "s3_storage_uri": "s3://plant-aid-media-bucket/frames/normalize.jpg",
            },
            headers=headers,
        )
        assert res.status_code == 201, raw
        log_id = res.json()["log_id"]

        item = client.get(f"/api/history/{log_id}", headers=headers).json()
        assert item["disease_id"] == expected, raw

        # The dashboard filter agrees with the stored canonical key
        filtered = client.get(
            f"/api/history?disease_id={expected}", headers=headers
        ).json()
        assert any(entry["id"] == log_id for entry in filtered["items"]), raw


def test_history_log_rejects_unknown_disease_reference(auth_user):
    """Ticket 01: an uncatalogued disease reference is refused rather than stored as free text."""
    headers, _ = auth_user
    res = client.post(
        "/api/history",
        json={
            "disease_id": "not_a_real_disease",
            "confidence_score": 0.9,
            "s3_storage_uri": "s3://plant-aid-media-bucket/frames/unknown.jpg",
        },
        headers=headers,
    )
    assert res.status_code == 422
    assert "not_a_real_disease" in res.json()["detail"]


def test_history_log_with_image_b64_and_pagination_size(auth_user):
    headers, _ = auth_user
    # 1x1 transparent PNG data uri
    sample_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

    res = client.post(
        "/api/history",
        json={
            "disease_id": "early_leaf_spot",
            "confidence_score": 0.95,
            "image_b64": sample_b64,
        },
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert "log_id" in data

    # Verify pagination supports ?size= and computed fields total_count and pages
    paginated_res = client.get("/api/history?page=1&size=5", headers=headers)
    assert paginated_res.status_code == 200
    pdata = paginated_res.json()
    assert "total" in pdata
    assert "total_count" in pdata
    assert pdata["total"] == pdata["total_count"]
    assert "limit" in pdata
    assert "size" in pdata
    assert pdata["size"] == 5
    assert "total_pages" in pdata
    assert "pages" in pdata


def test_history_log_enriched_fields(auth_user):
    headers, _ = auth_user
    # Log a diseased leaf
    diseased_res = client.post(
        "/api/history",
        json={
            "disease_id": "early_leaf_spot",
            "confidence_score": 0.92,
            "s3_storage_uri": "s3://plant-aid-media-bucket/frames/user1/leaf-test-001.jpg",
        },
        headers=headers,
    )
    assert diseased_res.status_code == 201
    log_id = diseased_res.json()["log_id"]

    get_res = client.get(f"/api/history/{log_id}", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["leaf_status"] == "Diseased"
    assert data["image_identifier"] == "leaf-test-001.jpg"
    assert data["plant_species"] is not None
    assert data["scientific_name"] is not None
    assert len(data["remedies"]) > 0

    # Log a healthy leaf
    healthy_res = client.post(
        "/api/history",
        json={
            "disease_id": "healthy_leaf",
            "confidence_score": 0.98,
            "s3_storage_uri": "s3://plant-aid-media-bucket/frames/user1/healthy-sample.jpg",
        },
        headers=headers,
    )
    assert healthy_res.status_code == 201
    h_log_id = healthy_res.json()["log_id"]

    h_get_res = client.get(f"/api/history/{h_log_id}", headers=headers)
    assert h_get_res.status_code == 200
    h_data = h_get_res.json()
    assert h_data["leaf_status"] == "Healthy"
    assert h_data["image_identifier"] == "healthy-sample.jpg"


def test_history_export_csv_success(auth_user):
    headers, _ = auth_user
    res = client.get("/api/history/export", headers=headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "attachment; filename=" in res.headers.get("content-disposition", "")

    csv_text = res.text
    # Check that required headers are in the CSV
    assert "Log ID" in csv_text
    assert "Leaf Status" in csv_text
    assert "Image Identifier" in csv_text
    assert "Organic / Biological Treatments" in csv_text
    assert "Chemical / Fungicide Treatments" in csv_text
    assert "Preventive Cultural Practices" in csv_text
    assert "Consolidated Treatment Summary" in csv_text

    # Verify rows contain populated identifiers and statuses
    assert "Healthy" in csv_text or "Diseased" in csv_text

    # Verify sensitive cloud infrastructure and credentials are strictly excluded
    assert "s3://" not in csv_text
    assert "Image Storage URI" not in csv_text
    assert "Image Media URL" not in csv_text
    assert "X-Amz" not in csv_text


def test_history_export_csv_with_filter(auth_user):
    headers, _ = auth_user
    res = client.get("/api/history/export?disease_id=healthy_leaf", headers=headers)
    assert res.status_code == 200
    csv_text = res.text
    lines = [line.strip() for line in csv_text.splitlines() if line.strip()]
    # At least header + records
    assert len(lines) >= 2
    # Verify no rust or late leaf spot rows are in this filtered export
    for line in lines[1:]:
        assert "late_leaf_spot" not in line


def test_history_export_csv_unauthorized():
    res = client.get("/api/history/export")
    assert res.status_code == 401
