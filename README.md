# Physis™

[![CI](https://github.com/Vanchik21/Diplom/actions/workflows/ci.yml/badge.svg)](https://github.com/Vanchik21/Diplom/actions/workflows/ci.yml)

> Interactive physics simulations based on the Predict–Observe–Explain methodology

**Repository:** [github.com/Vanchik21/Diplom](https://github.com/Vanchik21/Diplom)

**Stack:** Angular 18 · ASP.NET Core 9 · PostgreSQL 16 · Babylon.js · Entity Framework Core · JWT Auth

**Live demo:**
- Frontend: [diplom-frontend-five.vercel.app](https://diplom-frontend-five.vercel.app)
- Backend API: [diplom-production-cba6.up.railway.app](https://diplom-production-cba6.up.railway.app/api/health)

---

## Local setup

**Prerequisites:** PostgreSQL installed and running locally, .NET 9 SDK, Node.js 20+.

```powershell
# 1. Clone
git clone https://github.com/Vanchik21/Diplom.git
cd Diplom

# 2. Create the database
psql -U postgres -c "CREATE USER physis WITH PASSWORD 'physis_dev_password_2026';"
psql -U postgres -c "CREATE DATABASE physis OWNER physis;"

# 3. Create apps\backend\appsettings.Development.json
# Minimum content:
# {
#   "ConnectionStrings": { "Default": "Host=localhost;Port=5432;Database=physis;Username=physis;Password=physis_dev_password_2026" },
#   "Jwt": { "Secret": "<at-least-32-char-secret>" },
#   "AdminSeed": { "Email": "admin@physis.local", "UserName": "admin", "Password": "<your-admin-password>" }
# }

# 4. Run backend (migrations apply automatically)
cd apps\backend
dotnet run

# 5. Run frontend (separate terminal)
cd apps\frontend
npm install
npx ng serve
```

Frontend → http://localhost:4200
Backend  → http://localhost:5000

---

## Production deployment

The production stack is split across three providers, all on free tier:

| Layer | Provider | Why |
|---|---|---|
| **Frontend** | [Vercel](https://vercel.com) | Static SPA hosting, edge CDN, automatic HTTPS, free tier covers personal projects |
| **Backend** | [Railway](https://railway.com) | Native .NET 9 build via Railpack — no Dockerfile required, $5/month free credit |
| **Database** | [Neon](https://console.neon.tech) | Serverless Postgres 16, 0.5 GB free storage, scale-to-zero when idle |

### Architecture

```
Browser ──HTTPS──▶ Vercel CDN ──/api/* rewrite──▶ Railway container ──TLS 5432──▶ Neon Postgres
                   (Angular SPA)                   (ASP.NET Core 9)              (production branch)
```

Vercel's `rewrites` in `apps/frontend/vercel.json` proxy `/api/*` and `/uploads/*` to the Railway backend. This is a server-side proxy — to the browser, every request looks same-origin, so **no CORS configuration is needed**.

### One-time setup

**1. Database (Neon)**

1. Sign up at [console.neon.tech](https://console.neon.tech) via GitHub.
2. Create a project named `physis`, Postgres 16, region close to your users.
3. Copy the connection string. Convert it from URI to Npgsql format:
   ```
   Host=<host>;Database=<db>;Username=<user>;Password=<pwd>;SSL Mode=Require;Trust Server Certificate=true
   ```

**2. Backend (Railway)**

1. Sign up at [railway.com](https://railway.com) via GitHub.
2. **New Project → Deploy from GitHub repo → `Vanchik21/Diplom`**.
3. In the service Settings:
   - **Root Directory:** `apps/backend`
   - **Watch Paths:** `apps/backend/**`
4. In Variables, set:
   ```
   ConnectionStrings__Default = <Npgsql string from Neon>
   Jwt__Secret                = <64-char random hex; openssl rand -hex 32>
   Jwt__Issuer                = Physis
   Jwt__Audience              = Physis
   Jwt__AccessTokenExpirationMinutes  = 60
   Jwt__RefreshTokenExpirationDays    = 7
   AdminSeed__Email           = admin@physis.app
   AdminSeed__UserName        = admin
   AdminSeed__Password        = <strong password, 12+ chars>
   AllowedOrigins__0          = <Vercel URL — set after Vercel deploy>
   ASPNETCORE_ENVIRONMENT     = Production
   ```
5. In Settings → Networking → Public Networking → **Generate Domain**. Save the URL.
6. Trigger the first deployment. The build uses Railpack (auto-detects .NET 9):
   - `dotnet restore`
   - `dotnet publish --no-restore -c Release -o out`
   - `dotnet ./out/Physis.Api.dll` on `0.0.0.0:$PORT`
7. EF Core migrations apply automatically on first startup; the admin account is seeded.
8. Health check: `curl https://<railway-domain>/api/health` should return `{"status":"ok",...}`.

**3. Frontend (Vercel)**

1. Update `apps/frontend/vercel.json` — replace the Railway placeholder with your real domain:
   ```json
   "destination": "https://<railway-domain>/api/:path*"
   ```
   Commit and push.
2. Sign up at [vercel.com](https://vercel.com) via GitHub.
3. **New Project → Import `Vanchik21/Diplom`**.
4. Vercel auto-detects the configuration from `vercel.json`:
   - Framework: Angular
   - Root Directory: `apps/frontend`
   - Build Command: `npx ng build --configuration production`
   - Output: `dist/frontend/browser`
   - Install Command: `npm install --prefix=../..` (npm workspaces from monorepo root)
5. **Deploy**. The first build takes ~1 minute.
6. Copy the production URL (e.g. `diplom-frontend-five.vercel.app`).
7. Back in Railway, update `AllowedOrigins__0` to this URL and redeploy.

### Ongoing operations

**Deploying changes.** Just `git push origin main`. Vercel rebuilds only when `apps/frontend/**` changes; Railway only when `apps/backend/**` changes.

**Logs.**
- Backend HTTP + .NET stderr → Railway service → **Deployments** → click active → **HTTP Logs** / **Deploy Logs**.
- Frontend build output → Vercel project → **Deployments** → click deployment.
- Database queries → Neon project → **Monitoring** for slow queries; **SQL Editor** for ad-hoc inspection.

**Force a redeploy without code changes.** In either dashboard, last deployment menu → **Redeploy**.

**Rotate JWT secret.** Update `Jwt__Secret` in Railway, redeploy. All currently issued tokens become invalid; every signed-in user has to log in again.

### Code requirements

The backend reads its configuration from environment variables in production. The relevant pieces in `Program.cs`:

1. **PORT binding.** Railway injects `$PORT`; the app must listen on it:
   ```csharp
   var port = Environment.GetEnvironmentVariable("PORT");
   if (!string.IsNullOrWhiteSpace(port))
   {
       app.Urls.Clear();
       app.Urls.Add($"http://0.0.0.0:{port}");
   }
   ```
2. **Forwarded headers.** Required because the container sits behind Railway's reverse proxy:
   ```csharp
   app.UseForwardedHeaders(new ForwardedHeadersOptions
   {
       ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto,
   });
   ```
3. **Admin seed in production.** The seed block in `Program.cs` runs when `AdminSeed:*` are configured, regardless of `ASPNETCORE_ENVIRONMENT`. In production it only **creates** the account on first boot; password resets are intentionally skipped.

The frontend doesn't need any production-specific code — same code base, same builds, just hosted at a different origin.
