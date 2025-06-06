# On-My-Way Notifications – Feature Outline (Schema-Aware)

## Objective

Allow an admin (or cleaner) to click a button that sends an SMS to the client indicating the cleaner is en route.  
This helps clients prepare and improves service visibility. The message must be logged for compliance and traceability.

---

## 1️⃣ Supabase: `jobs` Table Structure

To support on-my-way tracking, the `jobs` table can include the following fields:

| Column           | Type         | Purpose                                             |
|------------------|--------------|-----------------------------------------------------|
| `on_my_way_sent` | `bool`       | Tracks whether the on-my-way message has been sent |
| `on_my_way_time` | `timestamptz`| Timestamp of when the SMS was sent                 |

If these columns do not exist yet, add them via migration.

---

## 2️⃣ Trigger Logic (Button Click)

- From the Jobs UI, when a user clicks **“Send On My Way SMS”**, it triggers a call to:
POST /api/send-on-my-way

- The request includes the `job_id`
- The backend:
1. Fetches job info (including client + cleaner)
2. Sends a standardized SMS to the client:
   ```
   Hi [Client Name], your cleaner is on the way and should arrive shortly!
   ```
3. Logs the message in the `messages` table
4. Updates the job:
   - `on_my_way_sent = true`
   - `on_my_way_time = current timestamp`

---

## 3️⃣ Message Logging (via `messages` Table)

Each SMS must be inserted into the `messages` table:

| Field       | Value                                                   |
|-------------|---------------------------------------------------------|
| `direction` | `'outbound'`                                            |
| `phone`     | Pulled from `clients.phone`                             |
| `body`      | "Hi [name], your cleaner is on the way..."              |
| `client_id` | From `jobs.client_id`                                   |
| `owner_id`  | From `jobs.owner_id`                                    |
| `sent_at`   | `new Date().toISOString()` at send time                 |

---

## 4️⃣ UI Behavior

- Show the **“Send On My Way SMS”** button only if the job is not already marked as sent
- After sending:
- Disable the button
- Optionally display: `Sent at [on_my_way_time]`
- Consider showing a green check or “✓ Sent” badge

---

## Notes

- You may reuse the `sendSMS()` helper to avoid duplication
- All logs must go through Supabase to maintain integrity
- You can log cleaner-side usage later if authentication is added

