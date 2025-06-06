import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/sms';
import { supabase } from '@/lib/supabase';
import { cookies, headers } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { DateTime } from 'luxon';

const BUSINESS_TIMEZONE = 'America/New_York'; // All timestamps are stored in UTC in Supabase. Always convert to BUSINESS_TIMEZONE for display/SMS. // TODO: Make this user-configurable in the future

export const runtime = 'nodejs'; // Ensure server-only

// --- Helper to resolve client as object ---
function resolveClient(raw: any): { id: string; name: string; phone: string } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    if (raw.length > 0 && typeof raw[0] === 'object' && 'phone' in raw[0] && 'id' in raw[0] && 'name' in raw[0]) {
      return raw[0] as { id: string; name: string; phone: string };
    }
    return null;
  }
  if (typeof raw === 'object' && 'phone' in raw && 'id' in raw && 'name' in raw) {
    return raw as { id: string; name: string; phone: string };
  }
  return null;
}

// Helper to create a server-side Supabase client with correct cookies API
async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// --- Helper: Atomically set a boolean flag on a job row, only if not already set ---
async function atomicJobFlagUpdate(
  supabaseClient: any,
  jobId: string,
  flag: string,
  timestampField: string,
  owner_id?: string
) {
  let query = supabaseClient
    .from('jobs')
    .update({ [flag]: true, [timestampField]: new Date().toISOString() })
    .eq('id', jobId)
    .is(flag, false)
    .select();
  if (owner_id) query = query.eq('owner_id', owner_id);
  const { data, error } = await query;
  return { data, error };
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  try {
    const { to, body } = await req.json();
    if (!to || !body) {
      return NextResponse.json({ success: false, error: 'Missing to or body' }, { status: 400 });
    }
    // Get the logged-in user
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData?.user?.id || '053b4f10-b531-48f2-a173-bd10026b943d';
    // Look up client by phone number
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, owner_id')
      .eq('phone', to)
      .maybeSingle();
    if (clientError) {
      console.error('Error looking up client:', clientError);
      // Still allow sending, but log as unknown client
    }
    // Send SMS and log with client_id/owner_id
    const result = await sendSMS(to, body, {
      client_id: client?.id || null,
      owner_id,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}

// New handler for On-My-Way notification
export async function PUT(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Missing jobId' }, { status: 400 });
    }
    // Get the logged-in user
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData?.user?.id || '053b4f10-b531-48f2-a173-bd10026b943d';
    // Fetch job, client, and cleaner info, including on_my_way_sent and on_my_way_time
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, client_id, cleaner_id, owner_id, scheduled_start, status, on_my_way_sent, on_my_way_time, clients(id, name, phone), cleaners(id, name)')
      .eq('id', jobId)
      .single();
    if (jobError || !job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }
    // --- Edge QA: skip jobs in the past or with wrong status ---
    const now = DateTime.utc();
    const jobTime = DateTime.fromISO(job.scheduled_start, { zone: 'utc' });
    if (jobTime < now) {
      console.warn(`[OnMyWay] Job ${job.id} is scheduled in the past (${job.scheduled_start}), skipping.`);
      return NextResponse.json({ success: false, error: 'Job is in the past' }, { status: 400 });
    }
    if (job.status && job.status !== 'scheduled') {
      console.warn(`[OnMyWay] Job ${job.id} is not in 'scheduled' status (${job.status}), skipping.`);
      return NextResponse.json({ success: false, error: 'Job is not scheduled' }, { status: 400 });
    }
    if (job.on_my_way_sent) {
      return NextResponse.json({ success: false, error: 'On-My-Way SMS already sent', on_my_way_time: job.on_my_way_time }, { status: 409 });
    }
    if (!job.clients || !job.cleaners) {
      console.warn(`[OnMyWay] Job ${job.id} missing client or cleaner, skipping.`);
      return NextResponse.json({ success: false, error: 'Job must have both client and cleaner assigned' }, { status: 400 });
    }
    const client = resolveClient(job.clients);
    if (!client || !client.phone || !job.client_id) {
      console.warn(`[OnMyWay] Job ${job.id} missing client, phone, or client_id, skipping.`);
      return NextResponse.json({ success: false, error: 'Client does not have a phone number' }, { status: 400 });
    }
    // Compose message with local time zone
    const timeString = jobTime.setZone(BUSINESS_TIMEZONE).toFormat('h:mm a');
    const dateString = jobTime.setZone(BUSINESS_TIMEZONE).toFormat('ccc, LLL d');
    const message = `Hi ${client.name}, your cleaner is on the way and should arrive shortly! (Scheduled for ${dateString} at ${timeString})`;
    // Send SMS and log
    const result = await sendSMS(client.phone, message, { client_id: client.id, owner_id });
    if (result.success) {
      // --- ATOMIC FLAG UPDATE ---
      const { data, error } = await atomicJobFlagUpdate(supabase, jobId, 'on_my_way_sent', 'on_my_way_time', job.owner_id);
      if (error) {
        return NextResponse.json({ success: false, error: 'SMS sent but failed to update job', on_my_way_time: null }, { status: 500 });
      }
      if (!data || data.length === 0) {
        // Flag was already set by another process
        return NextResponse.json({ success: false, error: 'On-My-Way SMS already sent', on_my_way_time: job.on_my_way_time }, { status: 409 });
      }
      console.log(`[OnMyWay] Sent On-My-Way SMS for job ${job.id}`);
      return NextResponse.json({ success: true, on_my_way_time: data[0].on_my_way_time || new Date().toISOString() });
    } else {
      // TODO: Add retry logic for failed SMS
      return NextResponse.json({ success: false, error: result.error || 'Failed to send SMS', on_my_way_time: null }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err), on_my_way_time: null }, { status: 500 });
  }
}

// POST /api/send-post-job-feedback
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      console.error('[FeedbackSMS] Missing jobId in request body');
      return NextResponse.json({ success: false, error: 'Missing jobId' }, { status: 400 });
    }
    // Get the logged-in user
    const { data: userData } = await supabase.auth.getUser();
    const owner_id = userData?.user?.id || '053b4f10-b531-48f2-a173-bd10026b943d';
    // Fetch job, client info, feedback_sent, and owner_id
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, client_id, status, scheduled_start, feedback_sent, owner_id, clients(id, name, phone)')
      .eq('id', jobId)
      .single();
    if (jobError || !job) {
      console.error('[FeedbackSMS] Job not found or error:', jobError);
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }
    // --- Edge QA: skip jobs in the past or with wrong status ---
    const now = DateTime.utc();
    const jobTime = DateTime.fromISO(job.scheduled_start, { zone: 'utc' });
    if (jobTime < now) {
      console.warn(`[FeedbackSMS] Job ${job.id} is scheduled in the past (${job.scheduled_start}), skipping.`);
      return NextResponse.json({ success: false, error: 'Job is in the past' }, { status: 400 });
    }
    if (job.status !== 'completed') {
      console.warn(`[FeedbackSMS] Job is not completed: ${job.id}, status: ${job.status}`);
      return NextResponse.json({ success: false, error: 'Job is not completed' }, { status: 400 });
    }
    if (job.feedback_sent) {
      console.warn(`[FeedbackSMS] Feedback SMS already sent for job: ${job.id}`);
      return NextResponse.json({ success: false, error: 'Feedback SMS already sent' }, { status: 409 });
    }
    const client = resolveClient(job.clients);
    if (!client || !client.phone || !job.client_id) {
      console.error(`[FeedbackSMS] Client missing, no phone, or no client_id: ${job.id}`);
      return NextResponse.json({ success: false, error: 'Client does not have a phone number' }, { status: 400 });
    }
    // Compose feedback message (customize link as needed)
    const feedbackLink = 'https://your-feedback-form.com';
    const timeString = jobTime.setZone(BUSINESS_TIMEZONE).toFormat('h:mm a');
    const dateString = jobTime.setZone(BUSINESS_TIMEZONE).toFormat('ccc, LLL d');
    const message = `Thank you, ${client.name}, for using our cleaning service! We value your feedback. (Job completed on ${dateString} at ${timeString}) Please let us know how we did: ${feedbackLink}`;
    // Send SMS and log
    const result = await sendSMS(client.phone, message, { client_id: client.id, owner_id });
    if (result.success) {
      // --- ATOMIC FLAG UPDATE ---
      const { data, error } = await atomicJobFlagUpdate(supabase, jobId, 'feedback_sent', 'feedback_sent_at', job.owner_id);
      if (error) {
        console.error('[FeedbackSMS] Failed to update feedback_sent:', error);
        return NextResponse.json({ success: false, error: 'SMS sent but failed to update feedback_sent' }, { status: 500 });
      }
      if (!data || data.length === 0) {
        // Flag was already set by another process
        return NextResponse.json({ success: false, error: 'Feedback SMS already sent' }, { status: 409 });
      }
      console.log(`[FeedbackSMS] Sent feedback SMS for job ${job.id}`);
      return NextResponse.json({ success: true });
    } else {
      // TODO: Add retry logic for failed SMS
      console.error('[FeedbackSMS] Failed to send SMS:', result.error);
      return NextResponse.json({ success: false, error: result.error || 'Failed to send SMS' }, { status: 500 });
    }
  } catch (err: any) {
    console.error('[FeedbackSMS] Unexpected error:', err);
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}

// GET handler is likely not needed, but left for review. Remove if not required.
// export function GET() {
//   return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
// }

// TODO: Implement day-of reminder logic with the same atomic flag pattern as above. 