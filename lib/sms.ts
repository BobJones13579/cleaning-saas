import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

// --- Twilio Credentials from environment variables ---
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!;

// --- Supabase Admin Credentials from environment variables ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// --- Initialize Twilio and Supabase clients ---
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Type for logging messages ---
interface LogMessageOptions {
  client_id: string | null;
  owner_id: string | null; // Must be provided by API route
}

/**
 * Send an SMS via Twilio and log the outbound message in Supabase.
 * @param to - Recipient phone number (E.164 format recommended)
 * @param body - Message content
 * @param options - Optional: client_id and owner_id for logging
 * @returns {Promise<{ success: boolean; error?: string }>} Result of the operation
 */
export async function sendSMS(
  to: string,
  body: string,
  options: LogMessageOptions // owner_id and client_id are now required
): Promise<{ success: boolean; error?: string }> {
  try {
    // --- Send SMS via Twilio ---
    const message = await twilioClient.messages.create({
      from: TWILIO_PHONE_NUMBER,
      to,
      body,
    });

    // --- Log the outbound message in Supabase ---
    const { error: insertError } = await supabase.from('messages').insert([
      {
        client_id: options.client_id,
        owner_id: options.owner_id, // Required
        body,
        direction: 'outbound',
        phone: to,
        sent_at: new Date().toISOString(),
      },
    ]);
    if (insertError) {
      // Log error but still return success for SMS sent
      console.error('[sendSMS] Failed to log message in Supabase:', insertError);
      return { success: true, error: 'SMS sent but failed to log message' };
    }
    return { success: true };
  } catch (err: any) {
    console.error('[sendSMS] Error sending SMS:', err);
    return { success: false, error: err.message || String(err) };
  }
}

// --- Optionally, export types for use elsewhere ---
export type { LogMessageOptions }; 