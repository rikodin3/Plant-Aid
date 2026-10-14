import os

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "GroundNut-Aid API"
    APP_DEBUG: bool = True

    # Security / JWT
    SECRET_KEY: str = Field(
        default="super-secret-plant-aid-jwt-key-change-in-production",
        validation_alias=AliasChoices("PLANT_AID_SECRET_KEY", "SECRET_KEY"),
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 60 minutes per Implementation.md §2.2
    OTP_EXPIRE_MINUTES: int = 5  # 5-min TTL per Implementation.md §2.2
    MAX_OTP_ATTEMPTS: int = 5  # 5 failed attempts cap per Implementation.md §2.2

    # Database
    DATABASE_URL: str = (
        f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'plant_aid.db').replace(os.sep, '/')}"
    )

    # AWS S3 Settings
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "plant-aid-media-bucket"
    S3_PRESIGNED_EXPIRATION_SECONDS: int = (
        900  # 15 minutes TTL per Implementation.md §6.2
    )

    # Media Storage Fallback
    UPLOAD_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "uploads"
    )

    # 2FA OTP Provider (smtp | resend | console | twilio | sendgrid)
    OTP_PROVIDER: str = "smtp"
    OTP_ALLOW_CONSOLE_FALLBACK: bool = True
    MAX_OTP_RESENDS: int = 3

    # SMTP Configuration (Gmail App Password, Brevo, AWS SES, custom relay)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_STARTTLS: bool = True
    SMTP_FROM_EMAIL: str = "noreply@groundnut-aid.org"
    SMTP_FROM_NAME: str = "GroundNut-Aid Security"
    SMTP_TIMEOUT_SECONDS: int = 10

    # Resend Configuration
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"

    # Google Apps Script HTTPS Relay Configuration (for cloud containers blocking SMTP port 587)
    GAS_WEBHOOK_URL: str = ""

    # Legacy / Alternative Providers
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "no-reply@plant-aid.org"

    # ML Engine Settings
    ML_DEVICE: str = "auto"  # "auto" (cuda if available else cpu) | "cuda" | "cpu"
    ML_CONFIDENCE_THRESHOLD: float = 0.55  # Tau = 0.55 per Implementation.md §4.2
    ML_MODEL_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "ml", "convnext_tiny_groundnut.ts"
    )
    ML_LABELS_PATH: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "ml", "labels.json"
    )

    # Rate Limiting Settings
    RATE_LIMIT_INFERENCE: str = "60/minute"
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_PASSWORD_RESET: str = "5/minute"

    @model_validator(mode="after")
    def validate_production_secret(self) -> "Settings":
        if not self.APP_DEBUG and "change-in-production" in self.SECRET_KEY:
            import warnings

            warnings.warn(
                "CRITICAL SECURITY WARNING: Insecure default SECRET_KEY detected in production! "
                "Set PLANT_AID_SECRET_KEY or SECRET_KEY in your environment.",
                UserWarning,
                stacklevel=2,
            )
        return self

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        env_prefix="PLANT_AID_",
        extra="ignore",
    )


settings = Settings()
