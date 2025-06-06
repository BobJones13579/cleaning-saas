# Automated Appointment Reminders – Feature Outline (Schema-Aware)

## Objective

Automatically send SMS reminders to clients and cleaners for upcoming jobs.  
Reminders should be sent **the day before** and optionally **day-of**, using Twilio and Supabase. Messages must be logged for compliance and visibility.

---

## 1️⃣ Supabase: `jobs` Table Structure

Your existing `jobs` table already supports reminders:

| Column                      | Type          | Purpose                                                           |
|-----------------------------|---------------|-------------------------------------------------------------------|
| `id`                        | `uuid`        | Primary key                                                       |
| `owner_id`                  | `uuid`        | Links to the business owner                                       |
| `client_id`                 | `uuid`        | Foreign key to `clients.id`                                       |
| `cleaner_id`                | `uuid`        | Foreign key to `cleaners.id`                                      |
| `scheduled_start`           | `timestamptz` | When the job is scheduled                                         |
| `day_before_reminder_sent` | `bool`        | Marks if the client received a day-before SMS                    |
| `day_of_reminder_sent`     | `bool`        | Marks if the client received a day-of SMS                         |

No schema changes are needed unless you want to customize reminder timing.

---

## 2️⃣ Reminder Logic (Scheduled Function)

- **Supabase Edge Function or Cron Job** runs daily (e.g. 10:00 AM EST)
- Queries `jobs` where:
  - `scheduled_start = tomorrow`
  - `day_before_reminder_sent = false`
- For each matching job:
  - Fetch `client.phone` and `cleaner.phone`
  - Send SMS using `sendSMS()` to each party:
    - Client: appointment reminder
    - Cleaner: job assignment + client address (optional)
  - Insert an outbound row into the `messages` table with:
    - `owner_id`, `client_id`, `phone`, `body`, `direction: 'outbound'`, `sent_at`
  - Mark `day_before_reminder_sent = true`

---

## 3️⃣ Logging Messages (via `messages` Table)

All reminders are logged in your existing `messages` table:

| Column     | Value Example                                                  |
|------------|----------------------------------------------------------------|
| `direction`| `'outbound'`                                                   |
| `client_id`| From the `jobs` table                                          |
| `phone`    | Pulled from `clients.phone` or `cleaners.phone`               |
| `body`     | `"Hi! Just a reminder your cleaning is tomorrow at 3 PM."`    |
| `sent_at`  | Timestamp at time of send                                      |
| `owner_id` | Based on job ownership                                         |

---

## 4️⃣ Optional Enhancements

- Add customizable reminder time (e.g., 24h or 2h before)
- Send follow-up message if job is marked as completed
- Include cleaner name in client message
- Skip sending if client has already replied or confirmed

---

## Notes

- Only jobs with `scheduled_start` tomorrow and `day_before_reminder_sent = false` will be included
- Be careful of timezones — normalize times to UTC or local EST logic
- System assumes jobs, clients, and cleaners are properly linked in advance
- Twilio SMS logs should match Supabase `messages` log for traceability
