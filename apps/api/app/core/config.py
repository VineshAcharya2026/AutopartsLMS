from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env", "../../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://centercrm:centercrm@127.0.0.1:5432/centercrm"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me-in-production"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7
    fernet_key: str = "change-me-32-byte-base64-fernet-key=="
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,https://autoparts-lms.web.app,https://autoparts-lms.firebaseapp.com"
    cookie_secure: bool = False
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    storage_path: str = "./storage"
    upload_max_size_mb: int = 10
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""
    resend_api_key: str = ""
    resend_from_email: str = "noreply@centercrm.com"
    google_client_id: str = ""
    google_client_secret: str = ""
    oauth_redirect_uri: str = "http://127.0.0.1:8000/api/v1/auth/oauth/google/callback"
    frontend_oauth_callback_url: str = "http://localhost:3000/auth/callback"

    @property
    def resolved_oauth_redirect_uri(self) -> str:
        render_url = os.environ.get("RENDER_EXTERNAL_URL", "").strip()
        if render_url:
            return f"{render_url.rstrip('/')}/api/v1/auth/oauth/google/callback"
        return self.oauth_redirect_uri

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
os.environ.setdefault("DATABASE_URL", settings.database_url)
