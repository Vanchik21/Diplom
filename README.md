# Physis™

> Interactive physics simulations based on the Predict–Observe–Explain methodology

**Repository:** [github.com/Vanchik21/Diplom](https://github.com/Vanchik21/Diplom)

**Stack:** Angular 18 · ASP.NET Core 9 · PostgreSQL 16 · Babylon.js · Entity Framework Core · JWT Auth

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
