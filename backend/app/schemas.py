import datetime
import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field


# --- User & Auth Schemas ---
class UserRegister(BaseModel):
    user_name: str = Field(..., min_length=2, max_length=100)
    email_address: EmailStr
    phone_number: str | None = Field(None, max_length=25)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    login_id: str | None = None  # Can be email or phone number
    email_address: EmailStr | None = None  # Backwards compatibility
    password: str

    def get_identifier(self) -> str:
        return (self.login_id or self.email_address or "").strip()


class TwoFactorChallengeResponse(BaseModel):
    session_id: str
    expires_in: int = 300
    message: str
    otp_code_dev: str | None = Field(
        None,
        description=(
            "DEBUG ONLY. Populated only when APP_DEBUG=True so local and automated flows can "
            "complete without a real SMS/email provider. It is always omitted in production."
        ),
    )


class TwoFactorVerifyRequest(BaseModel):
    session_id: str = Field(..., description="Opaque challenge session id issued by /auth/login or /auth/register")
    otp_code: str = Field(..., min_length=6, max_length=6)


class ResendOTPRequest(BaseModel):
    session_id: str = Field(..., description="Active challenge session id")


class ForgotPasswordRequest(BaseModel):
    email_address: EmailStr


class ResetPasswordRequest(BaseModel):
    email_address: EmailStr = Field(..., description="Registered email the reset code was sent to")
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6, max_length=72)


class MessageResponse(BaseModel):
    message: str
    otp_code_dev: str | None = Field(
        None,
        description=(
            "DEBUG ONLY. Populated only when APP_DEBUG=True so local and automated flows can "
            "complete without a real SMS/email provider. It is always omitted in production."
        ),
    )


class TokenResponse(BaseModel):
    token_type: str = "bearer"
    access_token: str
    expires_in: int
    user_id: int
    user_name: str
    email_address: str
    role: str = "user"


class UserResponse(BaseModel):
    id: int
    user_name: str
    email_address: str
    phone_number: str | None = None
    role: str = "user"
    is_2fa_enabled: bool
    account_status: str
    last_login_at: datetime.datetime | None = None
    created_at: datetime.datetime | None = None
    session_id: str | None = Field(
        None, description="Active challenge session id for verification"
    )
    otp_code_dev: str | None = Field(
        None, description="DEBUG ONLY OTP echo for automated testing"
    )

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    user_name: str | None = Field(None, min_length=2, max_length=100)
    phone_number: str | None = Field(None, max_length=25)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=72)


# --- Remedy & Disease Schemas ---
class RemedySchema(BaseModel):
    id: int
    disease_id: str
    remedy_type: str
    title: str
    description: str
    application_instructions: str | None = None
    category: str

    model_config = ConfigDict(from_attributes=True)


class DiseaseSchema(BaseModel):
    id: str
    numeric_id: int | None = None
    plant_species: str
    disease_name: str
    scientific_name: str | None = None
    severity_level: str
    remedies: list[RemedySchema] = []

    model_config = ConfigDict(from_attributes=True)


class GroupedRemediesSchema(BaseModel):
    organic_biological: list[RemedySchema] = []
    chemical_fungicide: list[RemedySchema] = []
    preventive_cultural: list[RemedySchema] = []


class DiseaseRemedyDetailResponse(BaseModel):
    disease_id: str
    numeric_id: int | None = None
    disease_name: str
    plant_species: str
    scientific_name: str | None = None
    severity_level: str
    remedies: list[RemedySchema] = []
    grouped_remedies: GroupedRemediesSchema


# --- Bounding Box & Inference Schemas ---
class BoundingBoxSchema(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float


class LesionBoundingBoxSchema(BoundingBoxSchema):
    confidence: float | None = None


class InferenceFramePayload(BaseModel):
    mime_type: str = "image/jpeg"
    encoding: str = "base64"
    image_b64: str
    capture_timestamp: str | None = None


class InferenceResponse(BaseModel):
    disease_id: int | str
    disease_name: str
    confidence: float
    confidence_score: float | None = None
    plant_species: str | None = None
    scientific_name: str | None = None
    bounding_box: BoundingBoxSchema | None = None
    bounding_boxes: list[LesionBoundingBoxSchema] = []
    cam_heatmap_b64: str | None = None
    frame_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_healthy_or_uncertain: bool = False
    s3_storage_uri: str | None = None
    remedies: list[RemedySchema] = []
    diagnosis_timestamp: datetime.datetime | None = None


# --- History Log Schemas ---
class HistoryLogCreate(BaseModel):
    disease_id: str
    disease_name: str | None = None
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    s3_storage_uri: str | None = None
    image_b64: str | None = None
    bounding_box: BoundingBoxSchema | None = None


class HistoryLogCreateResponse(BaseModel):
    log_id: int
    status: str = "confirmed"
    timestamp: datetime.datetime
    message: str = "Diagnosis history record successfully logged."


class HistoryLogResponse(BaseModel):
    id: int
    user_id: int
    disease_id: str
    disease_name: str
    confidence_score: float
    s3_storage_uri: str
    media_url: str | None = None
    bounding_box_json: str | None = None
    diagnosis_timestamp: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedHistoryResponse(BaseModel):
    items: list[HistoryLogResponse]
    total: int
    page: int
    limit: int
    total_pages: int

    @computed_field
    @property
    def total_count(self) -> int:
        return self.total

    @computed_field
    @property
    def pages(self) -> int:
        return self.total_pages

    @computed_field
    @property
    def size(self) -> int:
        return self.limit


# --- Admin & Governance Schemas ---
class UserRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(user|admin)$")


class UserStatusUpdate(BaseModel):
    account_status: str = Field(..., pattern="^(ACTIVE|SUSPENDED|PENDING_VERIFICATION)$")


class AdminUserItem(UserResponse):
    history_count: int = 0


class AdminPaginatedUsersResponse(BaseModel):
    items: list[AdminUserItem]
    total: int
    page: int
    limit: int
    total_pages: int


class AdminHistoryItem(HistoryLogResponse):
    user_name: str
    email_address: str


class AdminPaginatedHistoryResponse(BaseModel):
    items: list[AdminHistoryItem]
    total: int
    page: int
    limit: int
    total_pages: int


class RemedyCreate(BaseModel):
    disease_id: str = Field(..., min_length=1, max_length=50)
    remedy_type: str = Field(..., min_length=2, max_length=50)
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=5)
    application_instructions: str | None = None
    category: str = Field(..., min_length=2, max_length=100)


class RemedyUpdate(BaseModel):
    remedy_type: str | None = None
    title: str | None = None
    description: str | None = None
    application_instructions: str | None = None
    category: str | None = None

