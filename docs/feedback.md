# Post-Job Feedback & Follow-Up – Feature Outline (Schema-Aware)

## Objective

Automatically send a follow-up SMS to clients after a job is marked as completed.  
The message should thank them, invite feedback, and optionally include a review link.

---

## 1️⃣ Supabase: `jobs` Table Structure

Your existing `jobs` table already includes what you need:

| Column            | Type          | Purpose                                      |
|-------------------|---------------|----------------------------------------------|
| `id`              | `uuid`        | Job ID                                       |
| `status`          | `text`        | Tracks job lifecycle (e.g., `scheduled`, `completed`) |
| `completed_at`    | `timestamptz` | When the job was marked as completed         |
| `owner_id`        | `uuid`        | Business owner reference                     |
| `client_id`       | `uuid`        | Client being serviced                        |

✅ You may want to add:

| Column                  | Type          | Purpose                                       |
|--------------------------|---------------|-----------------------------------------------|
| `feedback_sent`         | `boolean`     | True if a follow-up SMS has been sent         |
| `feedback_sent_at`      | `timestamptz` | Timestamp when follow-up SMS was sent         |

---

## 2️⃣ Trigger Logic

Send the follow-up SMS immediately **when the job is marked as completed**, either via:

- ✅ A Supabase **Edge Function**
- ✅ A manual UI action (triggered in `JobCard.tsx`)
- ✅ Or API logic tied to the job completion flow

For simplicity, use the **existing API flow** when marking jobs complete:
- On job completion, check if `feedback_sent = false`
- Send SMS
- Log message in `messages` table
- Update job row with `feedback_sent = true` and `feedback_sent_at = now()`

---

## 3️⃣ Message Example
Hi [ClientName], thanks for using Tranquil Cleaning! We’d love your feedback. Reply with comments or tap here to leave a review: [Link]
## 2️⃣ Trigger Logic

Send the follow-up SMS immediately **when the job is marked as completed**, either via:

- ✅ A Supabase **Edge Function**
- ✅ A manual UI action (triggered in `JobCard.tsx`)
- ✅ Or API logic tied to the job completion flow

For simplicity, use the **existing API flow** when marking jobs complete:
- On job completion, check if `feedback_sent = false`
- Send SMS
- Log message in `messages` table
- Update job row with `feedback_sent = true` and `feedback_sent_at = now()`

---

## 3️⃣ Message Example

Hi [ClientName], thanks for using Tranquil Cleaning! We’d love your feedback. Reply with comments or tap here to leave a review: [Link]
Optional: Use a shortened review link (e.g., Google Review page or Typeform).

4️⃣ Message Logging (messages Table)
Column	Value Example
direction	'outbound'
client_id	Pulled from job.client_id
phone	From clients.phone
body	"Thanks for using Tranquil Cleaning! We'd love your feedback."
sent_at	Timestamp at time of send
owner_id	Based on job ownership

5️⃣ Optional Enhancements
Trigger via Supabase scheduled function (e.g., X minutes after completion)

Show “Feedback Sent” badge in the UI

Track actual replies or reviews via Twilio inbound webhook or analytics

Notes
One feedback message per job only (use feedback_sent)

Message content should be friendly and simple

Avoid sending too soon after job start — ensure job is complete