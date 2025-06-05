# ✅ MVP Build Plan: Residential Cleaning Scheduler

Each task is designed to be atomic, testable, and independent. Follow the order sequentially.

---
<!-- 
## 🧱 Setup & Configuration

### 1. Initialize Next.js Project
- Create new project with App Router, TypeScript, Tailwind CSS
- ✅ Output: Running dev server with Tailwind styles working

### 2. Set Up Supabase Project
- Create Supabase project and enable Auth
- ✅ Output: Project URL and anon/service keys available

### 3. Connect Supabase to Next.js
- Install Supabase JS client
- Set up `lib/supabase.ts`
- ✅ Output: Test client connection in a route

--- -->

## 🔐 Authentication

<!-- ### 4. Implement Login Page
- Create `/login/page.tsx`
- Use Supabase email/password login
- ✅ Output: Redirect to dashboard on login -->

<!-- ### 5. Add Auth Guard
- Create middleware to protect `/dashboard` and inner routes
- ✅ Output: Redirects unauthenticated users to login

--- -->
<!-- 
## 📦 Database & RLS (in Supabase)

### 6. Create `clients` table
- Define schema (name, phone, address, etc.)
- Add RLS: only owner can read/write
- ✅ Output: CRUD works via Supabase Studio

### 7. Create `cleaners` table
- Define schema (name, phone)
- Add RLS: only owner can read/write
- ✅ Output: Visible and editable only by admin

### 8. Create `jobs` table
- Define fields (client_id, cleaner_id, datetime, notes, status)
- Add RLS: only owner can read/write
- ✅ Output: Can insert jobs via Supabase Studio

--- -->

<!-- ## 📄 Frontend Pages & Forms

### 9. Build Layout and Navbar
- Create app shell with top nav and layout routes
- ✅ Output: Navbar with links to Dashboard / Clients / Cleaners -->
<!-- 
### 10. Build Dashboard Job List
- Display list of jobs sorted by date
- Use dummy data first
- ✅ Output: Job list renders with placeholders -->

<!-- ### 11. Add Job Creation Modal
- Modal form for job creation (client, cleaner, time, notes)
- ✅ Output: Submits new job to DB -->
<!-- 
### 12. Add Job Edit Modal
- Reuse modal to prefill fields for editing
- ✅ Output: Save changes updates job -->

<!-- ### 13. Display Job Status + Notes
- Show job status badge and any notes in job card
- ✅ Output: Can view/edit job details -->

---

## 👥 Clients & Cleaners UI
<!-- 
### 14. Build Client List Page
- Table or list view of all clients
- ✅ Output: Shows name, phone, address

### 15. Add Client Create/Edit Modal
- Modal form for adding/updating clients
- ✅ Output: New client appears in list -->

<!-- ### 16. Build Cleaners List Page
- Similar list for cleaners
- ✅ Output: Cleaner name + phone rendered

### 17. Add Cleaner Create/Edit Modal
- Modal for adding/updating cleaner info
- ✅ Output: Cleaners can be edited in UI -->

---

## ✉️ SMS & Reminder Logic

### 18. Set Up Twilio SDK
- Add `lib/sms.ts` to send SMS via Twilio
- ✅ Output: Hardcoded SMS can be sent to test number

<!-- ### 19. Trigger SMS on Job Creation
- Send SMS to client + cleaner when job created
- ✅ Output: Confirmation SMS sent after create

### 20. Add Manual “On My Way” Button
- Button on job card to trigger one-off SMS
- ✅ Output: Sends “on my way” text -->

### 21. Schedule Reminder Cron
- Vercel cron job or Supabase Edge function
- Runs every hour/day to send upcoming reminders
- ✅ Output: Job reminders sent 24h and 1h in advance

---

<!-- ## ✅ Final Touches

### 22. Add Toast Notifications
- Display success/error feedback for create/edit
- ✅ Output: Toast shows after any form submit -->

### 23. Deploy to Vercel
- Connect to GitHub, push to Vercel
- ✅ Output: Production site live

### 24. Verify RLS & Auth Security
- Attempt queries without login
- ✅ Output: 401 or empty response

---

Let me know if you want a parallel "issue tracker" or labels like `client`, `backend`, `sms`, `ui`.