from typing import Any

from prisma import Json


def to_prisma_json(value: Any) -> Json:
    """Wrap dict/list values for Prisma Python Json fields."""
    if isinstance(value, Json):
        return value
    return Json(value)
