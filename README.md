# UniCare

Production-ready university health center management platform with a **Student Portal** (public) and **Internal Hospital Management System** (network-restricted, workstation-based).

## Architecture

| Layer | Stack |
|-------|--------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn-style UI, Zustand, Axios |
| Backend | Django 5, DRF, PostgreSQL, Channels, Redis, Daphne |
| Auth | JWT + refresh rotation, RBAC, hospital network middleware |
| Core model | **Visit** — reception → nurse → doctor → pharmacy/lab |

## Project structure

```
UniCare/
├── backend/                 # Django API
│   ├── config/              # Settings (base, development, production)
│   └── apps/
│       ├── accounts/        # User, StudentProfile, WorkstationAccount, auth
│       ├── visits/          # Visit, Queue, Vitals, Consultation
│       ├── clinical/        # Prescription, Lab, TreatmentSchedule
│       ├── appointments/
│       ├── notifications/
│       ├── emergency/
│       ├── chat/            # WebSocket notifications
│       └── audit/
├── frontend/                # Next.js student + hospital UIs
└── docker-compose.yml
```

## Quick start (local) — one link

**http://localhost:3000** is the only URL you need (UI + API proxy).

```bash
# One-time setup
cd backend
python -m pip install -r requirements/development.txt
python manage.py migrate
python manage.py seed_demo_data
cd ../frontend && npm install && cp .env.example .env.local
cd .. && npm install

# Every time you develop (starts API + web together)
npm run dev
```

- Home: http://localhost:3000  
- Sign in: http://localhost:3000/login  
- API (proxied): http://localhost:3000/api/v1/
- Health: http://localhost:3000/api/v1/health/
- OpenAPI: http://localhost:3000/api/v1/schema/
- API docs: http://localhost:3000/api/v1/docs/

Stop any old `npm run dev` / `runserver` terminals before running `npm run dev` from the project root. Local API development uses Daphne so HTTP and WebSocket behavior match Docker.

### Demo credentials

| Account | Username | Password |
|---------|----------|----------|
| Student | `U2024001` | `student123` |
| Reception | `reception_station` | `workstation123` |
| Nurse | `nurse_station` | `workstation123` |
| Doctor | `doctor_station` | `workstation123` |
| Pharmacy | `pharmacy_station` | `workstation123` |
| Lab | `lab_station` | `workstation123` |
| Admin | `admin` | `admin123` |

Hospital API calls require header `X-Hospital-Access-Token` (set in `.env` / `NEXT_PUBLIC_HOSPITAL_ACCESS_TOKEN`).

## Production hosting (Vercel frontend + Render API)

| Layer | Host | URL pattern |
|-------|------|-------------|
| Frontend (Next.js) | Vercel | `https://frontend-henna-ten-69.vercel.app` |
| API + WebSockets | Render | `https://unicare-backend.onrender.com` |
| Postgres + Redis | Render | provisioned by `render.yaml` |

Browser calls stay same-origin on Vercel (`/api/v1/*`). The Next.js route handler proxies to Render using `BACKEND_INTERNAL_URL`. WebSockets connect directly to Render via `NEXT_PUBLIC_WS_URL`.

### 1. Deploy backend on Render

1. Merge this repo (including `render.yaml`) to GitHub.
2. Open the Blueprint deeplink:  
   https://dashboard.render.com/blueprint/new?repo=https://github.com/Godson-0306/UniCare
3. Apply the Blueprint (creates `unicare-backend`, `unicare-db`, `unicare-redis`).
4. When prompted, set `HOSPITAL_ACCESS_SECRET` to a strong shared secret (you will reuse it on Vercel).
5. After the first deploy is live, confirm health at `https://unicare-backend.onrender.com/api/v1/health/`.

### 2. Configure Vercel project env

In the Vercel project that serves `frontend/` set:

| Variable | Value |
|----------|--------|
| `BACKEND_INTERNAL_URL` | `https://unicare-backend.onrender.com` |
| `NEXT_PUBLIC_API_URL` | `/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `wss://unicare-backend.onrender.com` |
| `NEXT_PUBLIC_HOSPITAL_ACCESS_TOKEN` | same value as Render `HOSPITAL_ACCESS_SECRET` |

Root Directory on Vercel must be `frontend`. Redeploy after saving env vars.

### 3. Smoke checks

- UI: https://frontend-henna-ten-69.vercel.app
- Proxied health: https://frontend-henna-ten-69.vercel.app/api/v1/health
- Direct API health: https://unicare-backend.onrender.com/api/v1/health/
- Sign-in with demo credentials after seeding (`python manage.py seed_demo_data` via Render shell if needed)

Free Render web services spin down after inactivity; the first request after idle can take ~30–60s.

## Docker (PostgreSQL + Redis)

```bash
docker compose up --build
```

## API modules

- `POST /api/v1/auth/login/` — unified login (student, workstation, admin)
- `POST /api/v1/auth/logout/` — blacklist refresh token on sign-out
- `POST /api/v1/auth/student/login/` — matric number login (legacy)
- `POST /api/v1/auth/workstation/login/` — workstation login (legacy)
- `POST /api/v1/reception/` — patient search, visit creation
- `GET /api/v1/nurse/queue/` — nurse queue
- `GET /api/v1/doctor/queue/` — doctor queue
- `GET /api/v1/pharmacy/queue/` — dispensing queue
- `GET /api/v1/lab/queue/` — lab requests
- `GET /api/v1/student/*` — student portal data
- `POST /api/v1/student/emergency/` — emergency bypass
- `GET /api/v1/health/` — readiness check
- `GET /api/v1/schema/` — OpenAPI schema
- `GET /api/v1/docs/` — Swagger UI

## Tests and CI

```bash
cd backend && pytest
cd frontend && npm run lint && npm run test
```

GitHub Actions runs backend pytest against PostgreSQL/Redis and frontend lint, Vitest, and build checks.

## Roles

`student`, `receptionist`, `nurse`, `doctor`, `pharmacist`, `lab_technician`, `duty_officer`, `admin`, `super_admin`

Hospital staff (except admin) use **workstation accounts**. Students authenticate with **matric number**. Admins use personal accounts.
