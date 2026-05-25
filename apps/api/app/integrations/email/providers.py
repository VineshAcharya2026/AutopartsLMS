from typing import Any

from app.integrations.email.base import EmailInboxProvider


class GmailProvider(EmailInboxProvider):
    def __init__(self, config: dict[str, Any]):
        self.config = config

    async def fetch_unread(self) -> list[dict[str, Any]]:
        # OAuth integration placeholder — returns empty until credentials configured
        return []

    async def mark_processed(self, external_id: str) -> None:
        pass


class OutlookProvider(EmailInboxProvider):
    def __init__(self, config: dict[str, Any]):
        self.config = config

    async def fetch_unread(self) -> list[dict[str, Any]]:
        return []

    async def mark_processed(self, external_id: str) -> None:
        pass


class ImapProvider(EmailInboxProvider):
    def __init__(self, config: dict[str, Any]):
        self.config = config

    async def fetch_unread(self) -> list[dict[str, Any]]:
        return []

    async def mark_processed(self, external_id: str) -> None:
        pass


def get_email_provider(integration_type: str, config: dict[str, Any]) -> EmailInboxProvider:
    providers = {
        "GMAIL": GmailProvider,
        "OUTLOOK": OutlookProvider,
        "IMAP": ImapProvider,
    }
    cls = providers.get(integration_type)
    if not cls:
        raise ValueError(f"Unsupported email provider: {integration_type}")
    return cls(config)
