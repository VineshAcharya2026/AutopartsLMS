from abc import ABC, abstractmethod
from typing import Any


class EmailInboxProvider(ABC):
    @abstractmethod
    async def fetch_unread(self) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    async def mark_processed(self, external_id: str) -> None:
        pass
