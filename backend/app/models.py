import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utcnow() -> datetime.datetime:
    """
    Single UTC "now" helper for the whole backend (column defaults, token expiry, log
    timestamps). Stored timezone-naive to match the DateTime columns and SQLite.
    """
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(100), nullable=False)
    email_address = Column(String(255), unique=True, index=True, nullable=False)
    phone_number = Column(String(25), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    is_2fa_enabled = Column(Boolean, default=True)
    active_2fa_otp = Column(String(10), nullable=True)
    otp_expiry_time = Column(DateTime, nullable=True)
    active_session_id = Column(String(64), unique=True, index=True, nullable=True)
    failed_otp_attempts = Column(Integer, default=0, nullable=False)
    otp_resend_count = Column(Integer, default=0, nullable=False)
    account_status = Column(String(20), default="PENDING_VERIFICATION")
    role = Column(String(20), default="user", nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    history_logs = relationship(
        "DiseaseHistoryLog", back_populates="user", cascade="all, delete-orphan"
    )


class Disease(Base):
    __tablename__ = "diseases"

    id = Column(
        String(50), primary_key=True, index=True
    )  # e.g. early_leaf_spot or TOMATO_LATE_BLIGHT
    numeric_id = Column(
        Integer, unique=True, nullable=True, index=True
    )  # 1-based index matching labels.json
    plant_species = Column(String(100), nullable=False, index=True)
    disease_name = Column(String(150), nullable=False)
    scientific_name = Column(String(150), nullable=True)
    severity_level = Column(
        String(50), nullable=False, default="MEDIUM"
    )  # LOW, MEDIUM, HIGH, SEVERE

    remedies = relationship(
        "Remedy", back_populates="disease", cascade="all, delete-orphan"
    )


class Remedy(Base):
    __tablename__ = "remedies"

    id = Column(Integer, primary_key=True, index=True)
    disease_id = Column(String(50), ForeignKey("diseases.id"), nullable=False)
    remedy_type = Column(
        String(50), nullable=False
    )  # e.g. Biological, Chemical, Cultural
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    application_instructions = Column(Text, nullable=True)
    category = Column(
        String(100), nullable=False
    )  # Organic / Biological, Chemical / Fungicide, Preventive Cultural Practice

    disease = relationship("Disease", back_populates="remedies")


class DiseaseHistoryLog(Base):
    __tablename__ = "disease_history_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    disease_id = Column(String(50), ForeignKey("diseases.id"), nullable=False)
    disease_name = Column(String(150), nullable=False)
    confidence_score = Column(Float, nullable=False)
    s3_storage_uri = Column(String(500), nullable=False)
    bounding_box_json = Column(Text, nullable=True)
    diagnosis_timestamp = Column(DateTime, default=utcnow)
    # Soft deletion (Implementation.md §6.3, NF.5): a user-removed diagnosis disappears from
    # the dashboard but the audit record is retained rather than hard-deleted.
    deleted_at = Column(DateTime, nullable=True, default=None)

    user = relationship("User", back_populates="history_logs")
    disease = relationship("Disease", foreign_keys=[disease_id])
