# UI Polish & Reminder Logic Safety – Feature Documentation

## Objective

Finalize the MVP by:
1. Improving UI clarity and responsiveness
2. Ensuring SMS reminders (day-before, day-of, on-my-way, feedback) are race-condition safe and reliably logged

This document outlines polish targets, edge-case handling, and logging standards to guide safe refactors and future enhancements.

---

## 1️⃣ UI Polish Guidelines

### 🎨 Layout & Spacing

- **JobCard.tsx**
  - Align status pills, badges, and buttons in a clean, consistent layout
  - Use `flex`, `gap`, and `items-center` for alignment
  - Ensure layout holds up on both desktop and mobile (≤ 375px)

### 📱 Mobile Responsiveness

- All major pages and modals (job form, cleaner list, client messaging) must:
  - Stack content vertically with responsive `w-full` containers
  - Avoid overflow issues with long names or badge text
  - Use `max-w-screen-sm` and `p-4` on mobile breakpoints

### ⚙️ Button States

| State          | Visual Cue                          | Notes                          |
|----------------|--------------------------------------|---------------------------------|
| Default        | Branded button style (e.g. `bg-blue`) | Clickable and active            |
| Disabled       | `bg-gray-300`, `cursor-not-allowed`   | Used after sending reminders    |
| Sent Timestamp | Small `text-xs` under button         | Shows `on_my_way_time` or `feedback_sent_at` |

Use `disabled={alreadySent}` and conditional classes based on flags in the job row.

---

## 2️⃣ Reminder Logic Safety

### ✅ Flags in `jobs` Table

| Column                  | Type          | Purpose                            |
|--------------------------|---------------|-------------------------------------|
| `day_before_reminder_sent` | `boolean`     | Prevents duplicate reminders       |
| `day_of_reminder_sent`     | `boolean`     | Prevents duplicate reminders       |
| `on_my_way_sent`           | `boolean`     | Ensures only one “On My Way” SMS   |
| `on_my_way_time`           | `timestamptz` | Timestamp of send                  |
| `feedback_sent`            | `boolean`     | Tracks if feedback SMS was sent    |
| `feedback_sent_at`         | `timestamptz` | Timestamp of feedback SMS send     |

---

### 🔐 Race Condition Prevention

Inside each SMS sender (Edge Function or API route):
- **Guard with a conditional check** (e.g. `where day_before_reminder_sent is false`)
- **Immediately update the flag** in the same transaction if SMS send is successful
- Example Supabase update:
  ```ts
  const { data, error } = await supabase
    .from('jobs')
    .update({ day_before_reminder_sent: true })
    .eq('id', job.id)
    .is('day_before_reminder_sent', false);
3️⃣ Edge Case Handling
Scenario	What to Do
Missing client or cleaner	Log warning, skip job
Phone number is null	Log and skip—don't crash
Job deleted or status wrong	Only send reminders for status = scheduled
SMS failure (Twilio error)	Log error, don't set sent flag

Use console.log() or logger.info() to print: job ID, type of reminder, recipient, and time.

4️⃣ SMS Logging (messages Table)
Every reminder must be logged in the messages table with:

Field	Example
direction	'outbound'
body	'Hi, your appointment is tomorrow at 10am'
client_id	From job row
phone	From clients.phone or cleaners.phone
sent_at	Current timestamp
owner_id	From job row

5️⃣ Manual Testing Scenarios
Case	Steps
Double-click on "Send On My Way"	Confirm only one SMS sent, UI shows correct timestamp
Reminder triggered for deleted job	Ensure it is skipped and logged
Invalid phone number	Graceful skip, with log
Feedback SMS for already-completed job	Skipped if feedback_sent = true
Mobile view (375px)	No layout overflow; buttons stack cleanly

6️⃣ Optional Enhancements
Retry queue for failed SMS

Admin “resend” button for reminders or feedback

Settings panel to edit SMS copy or review links

