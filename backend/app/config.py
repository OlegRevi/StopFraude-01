from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment or .env file."""

    PORT: int = 8080
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"

    # Google Cloud / Firebase
    GOOGLE_CLOUD_PROJECT: Optional[str] = "stopfrauda-mvp"
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None
    FIREBASE_STORAGE_BUCKET: Optional[str] = None

    # Twilio
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_PRODUCT_ID: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_STANDARD_PRICE_ID: Optional[str] = "price_1UJfcGJ1UoEgWl0qmz3L1gi5"
    APP_SUCCESS_URL: str = "stopfrauda://paywall/success"
    APP_CANCEL_URL: str = "stopfrauda://paywall/cancel"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def is_twilio_configured(self) -> bool:
        return bool(
            self.TWILIO_ACCOUNT_SID
            and self.TWILIO_AUTH_TOKEN
            and self.TWILIO_PHONE_NUMBER
            and not self.TWILIO_ACCOUNT_SID.startswith("AC_dummy")
        )

    @property
    def is_stripe_configured(self) -> bool:
        return bool(
            self.STRIPE_SECRET_KEY
            and not self.STRIPE_SECRET_KEY.startswith("sk_test_dummy")
        )


settings = Settings()
