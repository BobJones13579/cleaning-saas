# 🏗️ SaaS MVP Architecture: Residential Cleaning Scheduler

## 🧰 Stack Overview

| Layer       | Technology         | Purpose                                  |
|-------------|--------------------|------------------------------------------|
| Frontend    | Next.js (App Router), Tailwind CSS | Admin UI (Chris only)             |
| Backend     | Supabase (Postgres + Auth + RLS)  | DB, authentication, access control |
| Messaging   | Twilio (or similar) | SMS reminders to clients and cleaners    |
| Hosting     | Vercel              | Deploying frontend (Next.js)             |
| Scheduling  | Vercel Cron Jobs or Supabase Edge Functions | Background reminders |

## 🗂️ File & Folder Structure

```bash
app/
├── layout.tsx                  # App shell layout w/ Navbar, metadata, etc.
├── page.tsx                    # Landing or dashboard redirect logic
├── login/                     # Login page (Supabase auth)
│   └── page.tsx
├── dashboard/                 # Admin dashboard (view jobs)
│   ├── layout.tsx
│   └── page.tsx
├── jobs/
│   ├── JobList.tsx            # Component: grouped list of jobs
│   ├── JobCard.tsx            # UI card for single job
│   └── JobFormModal.tsx       # Create/edit modal
├── clients/
│   ├── ClientList.tsx
│   └── ClientFormModal.tsx
├── cleaners/
│   ├── CleanerList.tsx
│   └── CleanerFormModal.tsx
├── components/
│   ├── Navbar.tsx
│   └── ToastNotification.tsx  # UX feedback messages
├── lib/
│   ├── supabase.ts            # Supabase client setup
│   ├── useJobs.ts             # Realtime data fetching
│   ├── sms.ts                 # Trigger Twilio messages (server actions)
│   └── utils.ts               # Date helpers, etc.
├── types/
│   └── index.ts               # TypeScript interfaces
public/
styles/
.env
```

## 🧠 What Each Part Does

### ✅ Frontend (Next.js)

- **`/dashboard`**: Main calendar view for upcoming jobs.
- **`/jobs/JobFormModal.tsx`**: Used to create or edit jobs.
- **`/clients`, `/cleaners`**: CRUD UI for managing contact info
- **`lib/useJobs.ts`**: Fetch jobs, subscribe to Supabase realtime updates
- **`lib/sms.ts`**: Triggers Twilio SMS functions via edge or serverless functions

### ✅ Backend (Supabase)

#### Tables:
- `auth.users`: Admin (Chris) login
- `clients`: Name, phone, address, notes
- `employees`: Name, phone, active status
- `services`: Types of cleaning offered
- `jobs`: Scheduled jobs linked to client/cleaner
- `job_assignments`: (future) Support for multiple cleaners per job
- `messages`: (optional) SMS history log

#### Row-Level Security (RLS):
- Only authenticated admin (`auth.uid()`) can access their data

## 📍 Where State Lives

| Type                    | Lives In                        | Notes                                               |
|-------------------------|----------------------------------|-----------------------------------------------------|
| Auth State              | Supabase + Next.js client hooks | Only Chris logs in                                  |
| UI State (modals etc.)  | Client-side via React state     | e.g., `isJobModalOpen`, form data                   |
| Data (Jobs, Clients)    | Supabase Postgres               | Fetched via `useEffect` or server actions           |
| Reminder Statuses       | Supabase or derived (future)    | Could log messages in `messages` table or rely on Twilio dashboard |

## 🔌 How Services Connect

```mermaid
graph TD;
  Chris[Admin (Chris)]
  UI[Next.js Admin UI]
  DB[(Supabase DB)]
  Auth[Supabase Auth]
  Twilio[Twilio SMS API]
  Vercel[Vercel Hosting]
  Cron[Vercel Cron / Edge]

  Chris --> UI
  UI --> Auth
  UI --> DB
  DB -->|jobs table| UI
  Cron --> DB
  Cron --> Twilio
  UI -->|trigger SMS| Twilio
```

## 🔄 Key Flows

### 1. **Create Job**
- Admin opens modal → fills details → submits
- Supabase stores job record
- SMS triggers manually or via scheduled function

### 2. **Reminders**
- Scheduled cron job queries upcoming jobs (e.g., 24h away)
- Sends SMS to cleaner + client

### 3. **Rescheduling**
- Admin updates job → triggers new SMS immediately

## 🧪 Testing Strategy

- ✅ Supabase RLS testing (with/without auth)
- ✅ Manual job creation/edit flow
- ✅ SMS delivery confirmed via Twilio dashboard
- ✅ Cron reminders verified in staging before prod

## 🌱 Scalability

- Multi-tenant support via `org_id` or `owner_id` (not needed for MVP)
- Cleaner logins (future): Add `employee_user_id` + cleaner RLS
- Client portal (future): Read-only views via `access_token` links