// deno-lint-ignore-file no-explicit-any
// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DateTime } from "https://esm.sh/luxon@3.4.3";

// --- Config ---
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");
if (!supabaseUrl || !supabaseKey || !twilioSid || !twilioToken || !twilioFrom) {
  throw new Error("Missing environment variables for Supabase or Twilio");
}
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Time zone handling ---
// All timestamps are stored in UTC in Supabase. Always convert to BUSINESS_TIMEZONE for display/SMS.
const BUSINESS_TIMEZONE = "America/New_York"; // TODO: Make this user-configurable in the future

function normalizePhone(phone: string): string {
  return phone.replace(/[^+\d]/g, "");
}

async function sendSMS(to: string, message: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  const body = new URLSearchParams({
    To: to,
    From: twilioFrom,
    Body: message
  });
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${twilioSid}:${twilioToken}`),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Twilio error: ${err}`);
  }
  return await resp.json();
}

// Fetch jobs scheduled for tomorrow, where day_before_reminder_sent is false or null
async function fetchTomorrowJobs() {
  // --- Calculate tomorrow's range in BUSINESS_TIMEZONE, not UTC ---
  const tz = BUSINESS_TIMEZONE;
  const startOfTomorrow = DateTime.now().setZone(tz).plus({ days: 1 }).startOf('day');
  const endOfTomorrow = startOfTomorrow.plus({ days: 1 });
  const startISO = startOfTomorrow.toUTC().toISO();
  const endISO = endOfTomorrow.toUTC().toISO();
  // --- Use UTC timestamps in query, but range is business-local ---
  const { data, error } = await supabase
    .from("jobs")
    .select(`id, scheduled_start, client_id, cleaner_id, owner_id, day_before_reminder_sent, address, status, clients(id, name, phone, address), cleaners(id, name, phone)`)
    .gte("scheduled_start", startISO)
    .lt("scheduled_start", endISO)
    .or("day_before_reminder_sent.is.false,day_before_reminder_sent.is.null");
  if (error) {
    throw new Error("Failed to fetch jobs: " + error.message);
  }
  return data || [];
}

// Log SMS to messages table
async function logSMS({
  phone,
  body,
  client_id,
  owner_id,
  direction = 'outbound',
}: {
  phone: string,
  body: string,
  client_id?: string,
  owner_id?: string,
  direction?: string,
}) {
  const { error } = await supabase.from("messages").insert([
    {
      phone,
      body,
      client_id: client_id || null,
      owner_id: owner_id || 'system', // fallback if not available
      direction,
      sent_at: new Date().toISOString(),
    },
  ]);
  if (error) {
    throw new Error(`Failed to log SMS: ${error.message}`);
  }
}

// Send day-before reminder for a single job
async function sendDayBeforeReminderForJob(job: any) {
  // --- Edge QA: skip jobs in the past or with wrong status ---
  const nowEastern = DateTime.now().setZone(BUSINESS_TIMEZONE);
  const jobTimeEastern = DateTime.fromISO(job.scheduled_start).setZone(BUSINESS_TIMEZONE);
  if (jobTimeEastern < nowEastern) {
    console.log(`[DayBefore] Skipping job ${job.id}: scheduled in the past (${job.scheduled_start})`);
    // TODO: Insert into reminder_skips table (job_id, function_type, reason, timestamp)
    return 0;
  }
  if (job.status && job.status !== "scheduled") {
    console.warn(`[DayBefore] Job ${job.id} is not in 'scheduled' status (${job.status}), skipping.`);
    return 0;
  }
  // --- Format time for SMS in business time zone ---
  const timeString = jobTimeEastern.toFormat("h:mm a");
  const dateString = jobTimeEastern.toFormat("ccc, LLL d");
  const client = Array.isArray(job.clients) ? job.clients[0] : job.clients;
  const cleaner = Array.isArray(job.cleaners) ? job.cleaners[0] : job.cleaners;
  let messageCount = 0;

  // --- ATOMIC FLAG CHECK: Only proceed if flag is false ---
  const { data: updatedJobs, error: updateFlagError } = await supabase
    .from("jobs")
    .update({ day_before_reminder_sent: true })
    .eq("id", job.id)
    .is("day_before_reminder_sent", false)
    .select();
  if (updateFlagError) {
    console.error(`[DayBefore] Failed to atomically update flag for job ${job.id}:`, updateFlagError);
    return 0;
  }
  if (!updatedJobs || updatedJobs.length === 0) {
    // Flag was already set, skip sending
    console.log(`[DayBefore] Reminder already sent for job ${job.id}, skipping.`);
    return 0;
  }

  // --- Client SMS ---
  if (!client || !client.name || !client.phone || !job.client_id) {
    console.warn(`[DayBefore] No client, phone, or client_id for job ${job.id} – skipping client SMS.`);
  } else {
    const clientMsg = `Hi ${client.name}, this is a reminder your cleaning is scheduled for ${dateString} at ${timeString}.`;
    try {
      await sendSMS(normalizePhone(client.phone), clientMsg);
      await logSMS({
        phone: normalizePhone(client.phone),
        body: clientMsg,
        client_id: job.client_id,
        owner_id: job.owner_id,
      });
      messageCount++;
      console.log(`[DayBefore] Sent client SMS for job ${job.id}`);
    } catch (err) {
      console.error(`[DayBefore] Error sending/logging client SMS for job ${job.id}:`, err);
      // TODO: Add retry queue for failed SMS/log
    }
  }

  // --- Cleaner SMS ---
  if (!cleaner || !cleaner.name || !cleaner.phone || !job.cleaner_id) {
    console.warn(`[DayBefore] No cleaner, phone, or cleaner_id for job ${job.id} – skipping cleaner SMS.`);
  } else {
    const cleanerMsg = `Hi ${cleaner.name}, you have a cleaning job on ${dateString} at ${timeString} (${client?.address || "the client's address"}).`;
    try {
      await sendSMS(normalizePhone(cleaner.phone), cleanerMsg);
      await logSMS({
        phone: normalizePhone(cleaner.phone),
        body: cleanerMsg,
        client_id: job.client_id,
        owner_id: job.owner_id,
      });
      messageCount++;
      console.log(`[DayBefore] Sent cleaner SMS for job ${job.id}`);
    } catch (err) {
      console.error(`[DayBefore] Error sending/logging cleaner SMS for job ${job.id}:`, err);
      // TODO: Add retry queue for failed SMS/log
    }
  }

  return messageCount;
}

serve(async (_req) => {
  try {
    const jobs = await fetchTomorrowJobs();
    let totalMessages = 0;
    for (const job of jobs) {
      totalMessages += await sendDayBeforeReminderForJob(job);
    }
    return new Response(JSON.stringify({
      success: true,
      message: `Queued ${totalMessages} day-before reminder SMS messages for jobs scheduled tomorrow.`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("Error sending day-before reminders:", err);
    return new Response(JSON.stringify({
      success: false,
      error: String(err)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}); 