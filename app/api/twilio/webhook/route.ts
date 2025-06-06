import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { isValidPhone, normalizePhone } from '@/lib/utils';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
// import type { Message } from '@/lib/types'; // Not used directly in this file

// Helper to create a server-side Supabase client with correct cookies API (for future use)
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

export async function POST(req: NextRequest) {
  try {
    // Twilio sends data as application/x-www-form-urlencoded
    const formData = await req.formData();
    const fromRaw = formData.get('From');
    const bodyRaw = formData.get('Body');
    const from = typeof fromRaw === 'string' ? fromRaw : String(fromRaw || '');
    const body = typeof bodyRaw === 'string' ? bodyRaw : String(bodyRaw || '');
    const sentAt = new Date().toISOString();

    if (!from || !body) {
      return NextResponse.json({ success: false, error: 'Missing From or Body' }, { status: 400 });
    }
    const phone = normalizePhone(from);
    if (!isValidPhone(phone)) {
      return NextResponse.json({ success: false, error: 'Invalid phone format' }, { status: 400 });
    }

    // Find client by phone number
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, owner_id')
      .eq('phone', phone)
      .maybeSingle();

    if (clientError) {
      console.error('Error looking up client:', clientError);
      return NextResponse.json({ success: false, error: 'Database error' }, { status: 500 });
    }

    // Always use fallback owner_id for webhook
    const fallbackOwnerId = '053b4f10-b531-48f2-a173-bd10026b943d';
    const isValidUUID = (val: any) => typeof val === 'string' && val.length === 36;
    const { error: insertError } = await supabaseAdmin.from('messages').insert([
      {
        client_id: isValidUUID(client?.id) ? client?.id : null,
        owner_id: fallbackOwnerId,
        body,
        direction: 'inbound',
        phone,
        sent_at: sentAt,
      },
    ]);
    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to log message' }, { status: 500 });
    }

    // Respond with JSON for success
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
} 