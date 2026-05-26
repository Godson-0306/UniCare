# UniCare

Production-ready university health center management platform with a **Student Portal** (public) and **Internal Hospital Management System** (network-restricted, workstation-based).

## Architecture

| Layer | Stack |
|-------|--------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, shadcn-style UI, Zustand, Axios |
| Backend | Django 5, DRF, PostgreSQL (SQLite for local dev), Channels, Redis |
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

Stop any old `npm run dev` / `runserver` terminals before running `npm run dev` from the project root.

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

## Docker (PostgreSQL + Redis)

```bash
docker compose up --build
```

## API modules

- `POST /api/v1/auth/login/` — unified login (student, workstation, admin)
- `POST /api/v1/auth/student/login/` — matric number login (legacy)
- `POST /api/v1/auth/workstation/login/` — workstation login (legacy)
- `POST /api/v1/reception/` — patient search, visit creation
- `GET /api/v1/nurse/queue/` — nurse queue
- `GET /api/v1/doctor/queue/` — doctor queue
- `GET /api/v1/pharmacy/queue/` — dispensing queue
- `GET /api/v1/lab/queue/` — lab requests
- `GET /api/v1/student/*` — student portal data
- `POST /api/v1/student/emergency/` — emergency bypass

## Roles

`student`, `receptionist`, `nurse`, `doctor`, `pharmacist`, `lab_technician`, `duty_officer`, `admin`, `super_admin`

Hospital staff (except admin) use **workstation accounts**. Students authenticate with **matric number**. Admins use personal accounts.
