import re
from typing import Any


EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}")


def extract_email(text: str) -> str | None:
    match = EMAIL_RE.search(text)
    return match.group(0).lower() if match else None


def extract_phone(text: str) -> str | None:
    match = PHONE_RE.search(text)
    return match.group(0) if match else None


def extract_name(subject: str, body: str) -> str:
    for line in (subject, body):
        if not line:
            continue
        for prefix in ("Name:", "From:", "Customer:"):
            if prefix.lower() in line.lower():
                return line.split(":", 1)[1].strip()[:100]
    return subject[:100] or "Unknown Lead"


def extract_field(body: str, field: str) -> str | None:
    pattern = rf"{field}\s*[:=]\s*(.+)"
    match = re.search(pattern, body, re.IGNORECASE)
    return match.group(1).strip() if match else None


def parse_email_content(*, subject: str, body: str, from_address: str) -> dict[str, Any]:
    combined = f"{subject}\n{body}"
    return {
        "name": extract_name(subject, body),
        "email": extract_email(combined) or extract_email(from_address),
        "phone": extract_phone(combined),
        "course_interest": extract_field(body, "course") or extract_field(body, "interest"),
        "city": extract_field(body, "city"),
        "message": body[:2000] if body else subject,
        "source": "EMAIL",
    }
