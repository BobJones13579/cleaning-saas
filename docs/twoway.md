# Two-Way Client SMS Communication – Feature Outline (Schema-Aware)

## Objective

Let Chris (admin) receive and respond to client SMS messages directly in the app using Twilio and Supabase. Messages should be logged, viewable, and tied to actual `clients`.

---

## 1️⃣ Supabase: `messages` Table Structure

You're already using a proper `messages` table. Here's what each column represents:

| Column         | Type      | Purpose                                                  |
|----------------|-----------|----------------------------------------------------------|
| `id`           | `uuid`    | Primary key                                              |
| `owner_id`     | `uuid`    | Links to the business owner                              |
| `client_id`    | `uuid`    | Foreign key to `clients.id`, can be `null` for unknowns  |
| `phone`        | `text`    | The phone number involved in the message (inbound or out)|
| `body`         | `text`    | SMS message content                                      |
| `direction`    | `text`    | `'inbound'` or `'outbound'`                              |
| `sent_at`      | `timestamptz` | Timestamp of when the message was received or sent   |

---

## 2️⃣ Twilio Webhook (Inbound Capture)

- Create a `POST /api/twilio-webhook` endpoint
- Twilio sends: `From`, `To`, and `Body`
- Match `From` to `clients.phone` to populate `client_id` if possible
- Insert new row into `messages` with:
  - `direction: 'inbound'`
  - `phone: From`
  - `client_id`: matched from phone (if exists)
  - `owner_id`: always present
  - `sent_at`: use current timestamp

---

## 3️⃣ Admin Message View (UI)

- New page: `Messages.tsx` or section inside dashboard
- Group messages by `client_id` or `phone`
- Display latest messages per thread
- Click on a thread to view full conversation:
  - Sorted by `sent_at`
  - Include sender/receiver context (based on `direction`)
  - Pull `client.name` if `client_id` exists

---

## 4️⃣ Sending Replies

- Admin replies via a message input box
- Use `/api/send-sms` to send the SMS
- Log that message in `messages` with:
  - `direction: 'outbound'`
  - `client_id`, `phone`, `body`, `owner_id`, `sent_at`

---

## 5️⃣ Optional Enhancements

- Show badge/indicator for new inbound messages (unread)
- Allow filtering or searching by phone or client name
- Include job context (e.g., link to the job tied to that client)
- Handle messages from unknown numbers (no `client_id`)
- Add delivery status if needed (e.g., `status: delivered/failed`)

---

## Notes

- The system assumes 1 business (1 `owner_id`) for now
- All SMS sent/received must be logged for context and compliance
- Be cautious of edge cases: non-matching numbers, SMS spam, etc.
