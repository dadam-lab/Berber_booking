import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCancellationEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

/**
 * Resend Inbound Webhook Endpoint - Receives reply emails from clients asking to cancel appointments.
 */
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Extract sender email and email body/subject from Resend webhook payload
    const fromAddress = payload.from || payload.sender || payload.data?.from;
    const bodyText = payload.text || payload.html || payload.data?.text || '';
    const subject = payload.subject || payload.data?.subject || '';

    if (!fromAddress) {
      return NextResponse.json({ error: 'Chybí adresa odesílatele v webhooku.' }, { status: 400 });
    }

    // Clean up sender email (e.g., "Jan Novak <jan@example.com>" -> "jan@example.com")
    const match = fromAddress.match(/<([^>]+)>/);
    const clientEmail = (match ? match[1] : fromAddress).trim().toLowerCase();

    console.log(`[Inbound Email Webhook] Received reply from: ${clientEmail}, Subject: "${subject}"`);

    // Find latest active confirmed order for this client email
    const { data: activeOrder, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('client_email', clientEmail)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !activeOrder) {
      console.warn(`[Inbound Email] No active confirmed order found for email: ${clientEmail}`);
      return NextResponse.json({ message: 'Pro daného odesílatele nebyla nalezena aktivní rezervace.' });
    }

    // Update order status to 'cancelled'
    await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', activeOrder.id);

    // Free up availability slot (is_booked = false, order_id = null)
    await supabaseAdmin
      .from('availability')
      .update({ is_booked: false, order_id: null })
      .eq('date', activeOrder.date)
      .eq('time', activeOrder.time);

    // Notify barber & confirm to client via email
    await sendCancellationEmail({
      clientEmail: activeOrder.client_email,
      clientName: activeOrder.client_name,
      serviceTitle: activeOrder.service_title,
      date: activeOrder.date,
      time: activeOrder.time,
    });

    console.log(`[Inbound Email] Order ${activeOrder.id} successfully cancelled via inbound email.`);

    return NextResponse.json({
      success: true,
      message: `Objednávka pro ${activeOrder.client_name} (${activeOrder.date}) byla stornována.`,
    });
  } catch (err: any) {
    console.error('[Inbound Email Webhook Exception]:', err);
    return NextResponse.json({ error: err?.message || 'Chyba při zpracování příchozího e-mailu.' }, { status: 500 });
  }
}
