# CenterCRM

Production multi-role SaaS CRM for centralized lead management, ingestion, routing, and communication.

## Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Pydantic v2
- **Database**: PostgreSQL + Prisma ORM (Python client)
- **Queue**: Redis + Celery
- **Real-time**: WebSockets + Redis pub/sub

## Quick Start

```bash
# Copy environment
cp .env.example .env

# Start infrastructure
docker compose -f docker/docker-compose.yml up -d postgres redis

# Database
cd packages/database
npm install
$env:DATABASE_URL="postgresql://centercrm:centercrm@localhost:5432/centercrm"
npx prisma migrate deploy
npx prisma db seed
# Or Python seed: python seed.py

# Backend
cd ../../apps/api
pip install -e ".[dev]"
prisma generate --schema=../../packages/database/prisma/schema.prisma
uvicorn app.main:app --reload --port 8000

# Workers
cd ../../workers
celery -A celery_app worker -l info -B

# Frontend
cd ../apps/web
npm install
npm run dev
```

## Default Login

- Email: `master@centercrm.com`
- Password: `Admin@123`

## Architecture

See `docs/ARCHITECTURE.md` for full system design.
