from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, EmailStr, Field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    center_id: str | None = None
    is_active: bool = True
    permissions: dict[str, bool] = Field(default_factory=dict)


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    center_id: str | None = None
    permissions: dict[str, bool] = Field(default_factory=dict)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    first_name: str | None = None
    last_name: str | None = None
    center_id: str | None = None
    is_active: bool | None = None
    permissions: dict[str, bool] | None = None
    password: str | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    center_id: str | None = None
    is_active: bool
    permissions: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True


class CenterCreate(BaseModel):
    name: str
    code: str
    settings: dict[str, Any] = Field(default_factory=dict)


class CenterUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    settings: dict[str, Any] | None = None


class CenterResponse(BaseModel):
    id: str
    name: str
    code: str
    settings: dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


class LeadCreate(BaseModel):
    name: str
    phone: str | None = None
    email: EmailStr | None = None
    source: str = "MANUAL"
    status: str = "NEW"
    priority: int = 0
    center_id: str | None = None
    assigned_admin_id: str | None = None
    assigned_agent_id: str | None = None
    follow_up_at: datetime | None = None
    course_interest: str | None = None
    city: str | None = None
    message: str | None = None
    source_website: str | None = None
    campaign: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class LeadUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    status: str | None = None
    priority: int | None = None
    assigned_admin_id: str | None = None
    assigned_agent_id: str | None = None
    follow_up_at: datetime | None = None
    course_interest: str | None = None
    city: str | None = None
    message: str | None = None
    tags: list[str] | None = None
    metadata: dict[str, Any] | None = None
    increment_attempt: bool = False
    attempt_outcome: str | None = None


class LeadAssignRequest(BaseModel):
    center_id: str | None = None
    assigned_admin_id: str | None = None
    assigned_agent_id: str | None = None


class LeadResponse(BaseModel):
    id: str
    name: str
    phone: str | None = None
    email: str | None = None
    source: str
    status: str
    priority: int
    attempt_count: int
    inquiry_count: int
    center_id: str | None = None
    assigned_admin_id: str | None = None
    assigned_agent_id: str | None = None
    follow_up_at: datetime | None = None
    course_interest: str | None = None
    city: str | None = None
    message: str | None = None
    source_website: str | None = None
    campaign: str | None = None
    tags: list[str]
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RemarkCreate(BaseModel):
    body: str


class RemarkResponse(BaseModel):
    id: str
    lead_id: str
    author_id: str
    body: str
    created_at: datetime

    class Config:
        from_attributes = True


class FollowUpCreate(BaseModel):
    scheduled_at: datetime
    notes: str | None = None


class FollowUpResponse(BaseModel):
    id: str
    lead_id: str
    agent_id: str
    scheduled_at: datetime
    completed_at: datetime | None = None
    notes: str | None = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class IngestLeadPayload(BaseModel):
    name: str
    phone: str | None = None
    email: EmailStr | None = None
    course_interest: str | None = None
    city: str | None = None
    message: str | None = None
    source_website: str | None = None
    campaign: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class IntegrationCreate(BaseModel):
    name: str
    type: str
    center_id: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class IntegrationResponse(BaseModel):
    id: str
    name: str
    type: str
    center_id: str | None = None
    api_key: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class RoutingRuleCreate(BaseModel):
    name: str
    center_id: str
    priority: int = 0
    conditions: dict[str, Any] = Field(default_factory=dict)
    assign_admin_id: str | None = None
    assign_agent_id: str | None = None
    is_active: bool = True


class RoutingRuleResponse(BaseModel):
    id: str
    name: str
    center_id: str
    priority: int
    conditions: dict[str, Any]
    assign_admin_id: str | None = None
    assign_agent_id: str | None = None
    is_active: bool

    class Config:
        from_attributes = True


class SmsSendRequest(BaseModel):
    lead_id: str
    body: str


class EmailSendRequest(BaseModel):
    lead_id: str
    subject: str
    body: str


class TemplateCreate(BaseModel):
    channel: str
    name: str
    subject: str | None = None
    body: str
    center_id: str | None = None


class TemplateResponse(BaseModel):
    id: str
    channel: str
    name: str
    subject: str | None = None
    body: str
    center_id: str | None = None

    class Config:
        from_attributes = True


class ScheduledMessageCreate(BaseModel):
    lead_id: str
    channel: str
    subject: str | None = None
    body: str
    scheduled_at: datetime


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    payload: dict[str, Any]
    read_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: str
    actor_id: str | None = None
    action: str
    entity_type: str
    entity_id: str
    before: dict[str, Any] | None = None
    after: dict[str, Any] | None = None
    ip_address: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class TrashRecordResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    snapshot: dict[str, Any]
    deleted_by_id: str
    restored_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_leads: int
    new_leads: int
    follow_ups_today: int
    overdue_tasks: int
    converted_leads: int
    leads_by_status: dict[str, int]
    leads_by_source: dict[str, int]
    agent_productivity: list[dict[str, Any]] = Field(default_factory=list)


class TimelineItem(BaseModel):
    id: str
    channel: str
    direction: str
    title: str
    body: str
    status: str | None = None
    created_at: datetime


TokenResponse.model_rebuild()
