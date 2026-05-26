from typing import Any


def normalize_auto_parts_form(raw: dict[str, Any]) -> dict[str, Any]:
    """Map used-carparts.us quote form fields to CenterCRM ingest payload."""
    model = (raw.get("model") or raw.get("model_text") or "").strip()
    part_name = (raw.get("part_name") or raw.get("part") or "").strip()
    zip_code = (raw.get("zip_code") or raw.get("zip") or "").strip()
    comment = (raw.get("comment") or raw.get("notes") or "").strip()
    purchase = (raw.get("purchase") or raw.get("purchase_timeline") or "").strip()

    metadata: dict[str, Any] = dict(raw.get("metadata") or {})
    for key, value in (
        ("year", raw.get("year")),
        ("make", raw.get("brand") or raw.get("make")),
        ("brand", raw.get("brand")),
        ("model", model or None),
        ("part_name", part_name or None),
        ("vin", raw.get("vin")),
        ("zip_code", zip_code or None),
        ("purchase_timeline", purchase or None),
        ("comment", comment or None),
    ):
        if value not in (None, ""):
            metadata[key] = str(value).strip()

    message_parts = [p for p in (comment, purchase and f"Purchase: {purchase}") if p]
    message = raw.get("message") or (" · ".join(message_parts) if message_parts else None)

    return {
        "name": raw["name"],
        "phone": raw.get("phone") or raw.get("mobile"),
        "email": raw.get("email"),
        "course_interest": part_name or raw.get("course_interest"),
        "city": zip_code or raw.get("city"),
        "message": message,
        "source_website": raw.get("source_website") or "used-carparts.us",
        "campaign": raw.get("campaign"),
        "tags": raw.get("tags") or [],
        "metadata": metadata,
    }
