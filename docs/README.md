## 📟 ONE-PAGER: SaaS MVP for Residential Cleaning Business

### 🚀 What We’re Building

We’re creating a **lightweight SaaS tool** to replace Jobber for a residential cleaning business. The client, Chris, is moving to Brazil and wants to **cut down from a \$350/month Jobber subscription** to a lean, focused solution that only includes the essential features he actually uses.

This MVP will allow Chris to:

* Assign jobs to cleaners
* Automatically send appointment reminders to clients and cleaners
* Keep two-way client communication via SMS
* Run his cleaning business remotely, simply, and cheaply

We are not building a bloated dashboard or full CRM — just a highly specific utility that replaces his current core workflow, without the overhead.

---

### 🎯 Who This Is For

Chris is the initial client. He runs a **high-ticket, W-2-based residential cleaning business** in the U.S. and is relocating abroad. He wants to **retain ownership** but **reduce involvement**. His employees do the cleanings; he just needs to coordinate remotely.

Long term, this could be expanded to help other similar cleaning businesses that also find tools like Jobber overpriced and overloaded.

---

### 🧠 Why This Matters

* Jobber is expensive and bloated for small teams
* Most cleaning businesses only need **scheduling + reminders + basic communication**
* There’s a gap in the market for a lean, opinionated SaaS tool that **just works**
* This MVP will solve Chris’s exact problem, and could generalize from there

---

### 🛠 How We’re Building It

* **Frontend**: Next.js (App Router) with Tailwind CSS
* **Backend/DB**: Supabase (Auth, DB, RLS)
* **SMS**: Twilio (for reminders + client communication)
* **Hosting**: Vercel (web app), Cron jobs or Edge functions for reminder scheduling

Cursor + ChatGPT will be used heavily to rapidly generate and refine code.

---

### 🧱 MVP Features (What’s In)

* Create jobs, assign to cleaner, set time/date
* Send SMS reminders:

  * To client: 1 day before + "on the way"
  * To cleaner: 1 day before
* View job schedule
* View/send messages to clients (outbound only)
* Basic admin dashboard (1 user)

---

### 👍 What’s Out (For Now)

* No client or cleaner login
* No payments or invoices
* No calendar syncing
* No mobile app
* No SMS reply handling (yet)

---

### 🛠 Strategy

* Build in 3 days using Cursor AI for code generation
* Start with **manual trigger buttons** for reminders
* Polish only once core flows are working
* Test with Chris and refine
