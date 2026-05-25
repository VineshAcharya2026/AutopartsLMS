from abc import ABC, abstractmethod
from typing import Any


class SmsProvider(ABC):
    @abstractmethod
    async def send_sms(self, to: str, body: str) -> dict[str, Any]:
        pass


class EmailProvider(ABC):
    @abstractmethod
    async def send_email(self, to: str, subject: str, body: str) -> dict[str, Any]:
        pass


class CallProvider(ABC):
    @abstractmethod
    async def log_call(self, to: str, outcome: str) -> dict[str, Any]:
        pass


class WhatsAppProvider(ABC):
    @abstractmethod
    async def send_message(self, to: str, body: str) -> dict[str, Any]:
        pass
