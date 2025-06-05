import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidPhone, normalizePhone } from '@/lib/utils';
// import type { Message } from '@/lib/types'; // Not used directly in this file

export async function POST(req: NextRequest) {
  try {
    // Twilio sends data as application/x-www-form-urlencoded
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const sentAt = new Date(); // Twilio does not send timestamp by default

    if (!from || !body) {
      return NextResponse.json({ error: 'Missing From or Body' }, { status: 400 });
    }
    const phone = normalizePhone(from);
    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 });
    }

    // Find client by phone number
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id, owner_id')
      .eq('phone', phone)
      .maybeSingle();

    if (clientError) {
      console.error('Error looking up client:', clientError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Insert message (even if client not found, but client_id and owner_id will be null)
    const isValidUUID = (val: any) => typeof val === 'string' && val.length === 36;
    const { error: insertError } = await supabaseAdmin.from('messages').insert([
      {
        client_id: isValidUUID(client?.id) ? client?.id : null,
        owner_id: isValidUUID(client?.owner_id) ? client?.owner_id : null,
        body,
        direction: 'inbound',
        phone,
        sent_at: sentAt.toISOString(),
      },
    ]);
    if (insertError) {
      console.error('Error inserting message:', insertError);
      return NextResponse.json({ error: 'Failed to log message' }, { status: 500 });
    }

    // Respond 200 OK for Twilio
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 