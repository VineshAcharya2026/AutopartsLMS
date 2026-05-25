# CenterCRM Architecture

See the project README for setup instructions.

## Services

- **apps/web** — Next.js 14 frontend with role-based dashboards
- **apps/api** — FastAPI backend with JWT auth and RBAC
- **packages/database** — Prisma schema and migrations
- **workers** — Celery background tasks (email polling, scheduled comms)

## Lead Flow

1. Lead ingested via form/webhook/email/CSV/manual
2. Duplicate detection merges inquiry history
3. Routing rules assign center/admin/agent
4. Notifications sent via WebSocket
5. Agents follow up via SMS/email/calls
