import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/sms';
import { supabase } from '@/lib/supabase';

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

export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();
    if (!to || !message) {
      return NextResponse.json({ success: false, error: 'Missing to or message' }, { status: 400 });
    }
    // Optionally: Add server-side validation for phone number format here
    const result = await sendSMS(to, message);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}

// New handler for On-My-Way notification
export async function PUT(req: NextRequest) {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Missing jobId' }, { status: 400 });
    }
    // Fetch job, client, and cleaner info
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, client_id, cleaner_id, scheduled_start, clients(id, name, phone), cleaners(id, name)')
      .eq('id', jobId)
      .single();
    if (jobError || !job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }
    if (!job.clients || !job.cleaners) {
      return NextResponse.json({ success: false, error: 'Job must have both client and cleaner assigned' }, { status: 400 });
    }
    const client = resolveClient(job.clients);
    if (!client || !client.phone) {
      return NextResponse.json({ success: false, error: 'Client does not have a phone number' }, { status: 400 });
    }
    // Compose message
    const message = `Hi ${client.name}, your cleaner is on the way and should arrive shortly!`;
    // Send SMS and log
    const result = await sendSMS(client.phone, message, { client_id: client.id });
    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result.error || 'Failed to send SMS' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || String(err) }, { status: 500 });
  }
}

// POST /api/send-post-job-feedback
export async function PATCH(req: NextRequest) {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      console.error('[FeedbackSMS] Missing jobId in request body');
      return NextResponse.json({ success: false, error: 'Missing jobId' }, { status: 400 });
    }
    // Fetch job, client info, feedback_sent, and owner_id
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, client_id, status, feedback_sent, owner_id, clients(id, name, phone)')
      .eq('id', jobId)
      .single();
    if (jobError || !job) {
      console.error('[FeedbackSMS] Job not found or error:', jobError);
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }
    if (job.status !== 'completed') {
      console.warn('[FeedbackSMS] Job is not completed:', jobId, job.status);
      return NextResponse.json({ success: false, error: 'Job is not completed' }, { status: 400 });
    }
    if (job.feedback_sent) {
      console.warn('[FeedbackSMS] Feedback SMS already sent for job:', jobId);
      return NextResponse.json({ success: false, error: 'Feedback SMS already sent' }, { status: 409 });
    }
    const client = resolveClient(job.clients);
    console.log('[FeedbackSMS] Resolved client:', client);
    if (!client || !client.phone) {
      console.error('[FeedbackSMS] Client missing or has no phone:', client);
      return NextResponse.json({ success: false, error: 'Client does not have a phone number' }, { status: 400 });
    }
    // Compose feedback message (customize link as needed)
    const feedbackLink = 'https://your-feedback-form.com';
    const message = `Thank you, ${client.name}, for using our cleaning service! We value your feedback. Please let us know how we did: ${feedbackLink}`;
    // Send SMS and log
    const result = await sendSMS(client.phone, message, { client_id: client.id, owner_id: job.owner_id });
    if (result.success) {
      // Mark feedback_sent = true, filter by jobId and owner_id if available
      const updateQuery = supabase.from('jobs').update({ feedback_sent: true }).eq('id', jobId);
      if (job.owner_id) updateQuery.eq('owner_id', job.owner_id);
      const { error: updateError } = await updateQuery;
      if (updateError) {
        console.error('[FeedbackSMS] Failed to update feedback_sent:', updateError);
        return NextResponse.json({ success: false, error: 'SMS sent but failed to update feedback_sent' }, { status: 500 });
      }
      console.log('[FeedbackSMS] Feedback SMS sent and feedback_sent updated for job:', jobId);
      return NextResponse.json({ success: true });
    } else {
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