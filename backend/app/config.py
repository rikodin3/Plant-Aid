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
    DATABASE_URL: str = Field(
        default=f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'plant_aid.db').replace(os.sep, '/')}",
        validation_alias=AliasChoices("PLANT_AID_DATABASE_URL", "DATABASE_URL"),
    )

    # AWS / Neon S3 Object Storage Settings
    AWS_ACCESS_KEY_ID: str = Field(
        "", validation_alias=AliasChoices("PLANT_AID_AWS_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID")
    )
    AWS_SECRET_ACCESS_KEY: str = Field(
        "", validation_alias=AliasChoices("PLANT_AID_AWS_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY")
    )
    AWS_REGION: str = Field(
        "us-east-2", validation_alias=AliasChoices("PLANT_AID_AWS_REGION", "AWS_REGION")
    )
    AWS_ENDPOINT_URL: str = Field(
        "",
        validation_alias=AliasChoices(
            "PLANT_AID_AWS_ENDPOINT_URL", "AWS_ENDPOINT_URL_S3", "AWS_ENDPOINT_URL"
        ),
    )
    S3_BUCKET_NAME: str = Field(
        "plant-aid-media-bucket",
        validation_alias=AliasChoices("PLANT_AID_S3_BUCKET_NAME", "S3_BUCKET_NAME"),
    )
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
    SMTP_HOST: str = Field("smtp.gmail.com", validation_alias=AliasChoices("PLANT_AID_SMTP_HOST", "SMTP_HOST"))
    SMTP_PORT: int = Field(587, validation_alias=AliasChoices("PLANT_AID_SMTP_PORT", "SMTP_PORT"))
    SMTP_USERNAME: str = Field("", validation_alias=AliasChoices("PLANT_AID_SMTP_USERNAME", "SMTP_USERNAME"))
    SMTP_PASSWORD: str = Field("", validation_alias=AliasChoices("PLANT_AID_SMTP_PASSWORD", "SMTP_PASSWORD"))
    SMTP_USE_STARTTLS: bool = Field(True, validation_alias=AliasChoices("PLANT_AID_SMTP_USE_STARTTLS", "SMTP_USE_STARTTLS"))
    SMTP_FROM_EMAIL: str = Field("noreply@groundnut-aid.org", validation_alias=AliasChoices("PLANT_AID_SMTP_FROM_EMAIL", "SMTP_FROM_EMAIL"))
    SMTP_FROM_NAME: str = Field("GroundNut-Aid Security", validation_alias=AliasChoices("PLANT_AID_SMTP_FROM_NAME", "SMTP_FROM_NAME"))
    SMTP_TIMEOUT_SECONDS: int = Field(10, validation_alias=AliasChoices("PLANT_AID_SMTP_TIMEOUT_SECONDS", "SMTP_TIMEOUT_SECONDS"))

    # Resend Configuration
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"

    # Google Apps Script HTTPS Relay Configuration (for cloud containers blocking SMTP port 587)
    GAS_WEBHOOK_URL: str = Field("", validation_alias=AliasChoices("PLANT_AID_GAS_WEBHOOK_URL", "GAS_WEBHOOK_URL"))

    # CORS Origins
    CORS_ORIGINS: str = Field("*", validation_alias=AliasChoices("PLANT_AID_CORS_ORIGINS", "CORS_ORIGINS"))

    # Legacy / Alternative Providers
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "no-reply@plant-aid.org"

    # ML Engine Settings
    ML_DEVICE: str = "auto"  # "auto" (cuda if available else cpu) | "cuda" | "cpu"
    ML_CONFIDENCE_THRESHOLD: float = 0.55  # Tau = 0.55 per Implementation.md §4.2
    ML_MODEL_PATH: str = Field(
        default=os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "ml", "convnext_tiny_groundnut.ts"
        ),
        validation_alias=AliasChoices("PLANT_AID_ML_MODEL_PATH", "ML_MODEL_PATH"),
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
            os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local"),
            ".env.local",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
