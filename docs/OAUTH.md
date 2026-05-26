# Google OAuth Setup

CenterCRM supports **Sign in with Google** on all role login portals. OAuth does not auto-create users — the Google account email must match an existing active user created by Master Admin.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Go to **APIs & Services → OAuth consent screen**
   - User type: External (or Internal for Workspace)
   - Add scopes: `openid`, `email`, `profile`
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://autoparts-lms.web.app`
   - **Authorized redirect URIs:**
     - `http://127.0.0.1:8000/api/v1/auth/oauth/google/callback` (local API)
     - `https://YOUR-API-URL/api/v1/auth/oauth/google/callback` (production API)

Copy the **Client ID** and **Client secret**.

## 2. Environment variables

Add to your API `.env` (see [`.env.example`](../.env.example)):

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=http://127.0.0.1:8000/api/v1/auth/oauth/google/callback
FRONTEND_OAUTH_CALLBACK_URL=http://localhost:3000/auth/callback
```

Production (Render / Cloud Run):

```env
OAUTH_REDIRECT_URI=https://centercrm-api.onrender.com/api/v1/auth/oauth/google/callback
FRONTEND_OAUTH_CALLBACK_URL=https://autoparts-lms.web.app/auth/callback
```

After changing env vars, restart the API. Rebuild Firebase frontend if `FRONTEND_OAUTH_CALLBACK_URL` changes.

## 3. User requirements

- User must already exist in CenterCRM with the **same email** as their Google account
- User must sign in through the correct portal (Master / Admin / Agent)
- Users without a password can only use Google sign-in
- Users with a password can use either method

## 4. Verify

1. `GET /api/v1/auth/oauth/status` → `{ "google_enabled": true }`
2. Open `/login/master/` → **Sign in with Google** button appears
3. Sign in with a Google account matching `master@centercrm.com` (or your provisioned user)

## 5. Security notes

- OAuth uses PKCE + one-time exchange codes (60s TTL)
- Google tokens are encrypted at rest with `FERNET_KEY`
- Refresh tokens for Google are stored in `oauth_accounts` for future Gmail integration
