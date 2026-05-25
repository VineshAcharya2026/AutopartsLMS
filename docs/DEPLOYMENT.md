# CenterCRM Production Deployment

Live frontend: **https://autoparts-lms.web.app**

Login requires a **public FastAPI backend** + **PostgreSQL**. Firebase Hosting (Spark) only serves static files — it cannot run the API.

Choose **Path A** (fastest, no Blaze) or **Path B** (all-in Firebase/GCP).

---

## Path A — Render API + Firebase Hosting (recommended now)

Works on the **free Spark** Firebase plan.

### Step 1: Deploy API + database on Render

1. Push this repo to GitHub: https://github.com/VineshAcharya2026/AutopartsLMS
2. Open [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect the repo — Render reads `render.yaml` and creates:
   - PostgreSQL (`centercrm-db`)
   - Web service (`centercrm-api`) from `docker/Dockerfile.api`
4. Wait for the first deploy (~5–10 min). Copy the API URL, e.g. `https://centercrm-api.onrender.com`
5. Verify: open `https://YOUR-API-URL/health` → should return `{"status":"ok"}`

### Step 2: Rebuild & redeploy Firebase frontend

In PowerShell from the repo root (replace with your Render API URL):

```powershell
cd "c:\Users\Lenovo\Desktop\Autoparts Super admin"
$env:FIREBASE_BUILD = "1"
$env:NEXT_PUBLIC_API_URL = "https://centercrm-api.onrender.com/api/v1"
$env:NEXT_PUBLIC_WS_URL = "wss://centercrm-api.onrender.com/ws/notifications"
npm run build -w @centercrm/web
firebase deploy --only hosting --project autoparts-lms
```

Or use the helper script:

```powershell
.\scripts\deploy-firebase.ps1 -ApiUrl "https://centercrm-api.onrender.com"
```

### Step 3: Test login

- https://autoparts-lms.web.app/login/master/
- Email: `master@centercrm.com` / Password: `Admin@123`

---

## Path B — Blaze + Firebase App Hosting + Cloud Run

Use this for **SSR Next.js**, same-origin `/backend` proxy, and GCP-native hosting.

### Step 1: Upgrade Firebase to Blaze

1. Open [Firebase usage & billing](https://console.firebase.google.com/project/autoparts-lms/usage/details)
2. Upgrade to **Blaze (pay-as-you-go)** — required for App Hosting and Cloud Run integration
3. Set a billing budget alert (recommended)

### Step 2: Deploy API to Cloud Run

Requires [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`).

```powershell
gcloud auth login
gcloud config set project autoparts-lms

# Create Cloud SQL PostgreSQL or use Neon/Supabase and store DATABASE_URL in Secret Manager
gcloud builds submit --config cloudbuild.yaml .
```

Set secrets in Cloud Run console: `DATABASE_URL`, `JWT_SECRET`, `FERNET_KEY`, `COOKIE_SECURE=true`.

### Step 3: Create App Hosting backend

```powershell
firebase apphosting:backends:create `
  --project autoparts-lms `
  --backend web `
  --primary-region us-central1 `
  --root-dir apps/web `
  --app 1:40533690644:web:cdfcc0c8b160fcac255a01
```

Update `apps/web/apphosting.yaml` — set `BACKEND_URL` to your Cloud Run URL:

```yaml
env:
  - variable: BACKEND_URL
    value: https://centercrm-api-XXXX.us-central1.run.app
    availability:
      - BUILD
      - RUNTIME
```

Deploy:

```powershell
firebase deploy --only apphosting:web --project autoparts-lms
```

Or use:

```powershell
.\scripts\deploy-apphosting.ps1 -BackendUrl "https://YOUR-CLOUD-RUN-URL"
```

---

## Environment variables reference

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | API | PostgreSQL connection |
| `JWT_SECRET` | API | Auth tokens |
| `FERNET_KEY` | API | Encrypt integration secrets |
| `CORS_ORIGINS` | API | Must include `https://autoparts-lms.web.app` |
| `COOKIE_SECURE` | API | Set `true` in production (HTTPS) |
| `NEXT_PUBLIC_API_URL` | Frontend build | Public API URL (Path A) |
| `NEXT_PUBLIC_WS_URL` | Frontend build | WebSocket URL (Path A) |
| `BACKEND_URL` | App Hosting | Cloud Run URL for `/backend` proxy (Path B) |

See `.env.production.example` for a full template.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Cannot reach the API" | Wrong `NEXT_PUBLIC_API_URL` — rebuild frontend after API deploy |
| CORS error in browser | Add `https://autoparts-lms.web.app` to API `CORS_ORIGINS` |
| 503 Database unavailable | Run migrations: API container runs `prisma migrate deploy` on start |
| Render cold start (~30s) | Free tier sleeps — first request may be slow |
| App Hosting fails | Confirm Blaze plan is active |

---

## Redeploy commands

```powershell
# Frontend only (after API URL is set)
.\scripts\deploy-firebase.ps1 -ApiUrl "https://YOUR-API-URL"

# Check Firebase login
firebase login:list
firebase projects:list
```
