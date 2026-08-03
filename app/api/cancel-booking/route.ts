import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCancellationEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

// GET: Načíst detail rezervace podle ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Chybí ID rezervace.' }, { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Rezervace nebyla nalezena.' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Interní chyba serveru.' }, { status: 500 });
  }
}

// POST: Zrušit rezervaci zákazníkem
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Chybí ID rezervace.' }, { status: 400 });
    }

    // 1. Načíst objednávku
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Rezervace nebyla nalezena.' }, { status: 404 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({
        success: true,
        alreadyCancelled: true,
        message: 'Tato rezervace již byla zrušena.',
        order,
      });
    }

    // 2. Aktualizovat stav objednávky v Supabase na 'cancelled'
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (updateError) {
      console.error('[Cancel Booking Error] Order update failed:', updateError);
      return NextResponse.json({ error: 'Chyba při aktualizaci stavu rezervace.' }, { status: 500 });
    }

    // 3. Uvolnit termín v tabulce availability
    const { error: availError } = await supabaseAdmin
      .from('availability')
      .update({ is_booked: false, order_id: null })
      .eq('date', order.date)
      .eq('time', order.time);

    if (availError) {
      console.error('[Cancel Booking Error] Availability update failed:', availError);
    }

    // 4. Odeslat storno e-mail klientovi a barberovi (asynchronně)
    sendCancellationEmail({
      clientEmail: order.client_email,
      clientName: order.client_name,
      serviceTitle: order.service_title,
      date: order.date,
      time: order.time,
    }).catch((err) => console.error('[Cancel Booking Email Error]:', err));

    return NextResponse.json({
      success: true,
      message: 'Vaše rezervace byla úspěšně zrušena a termín byl uvolněn v kalendáři.',
      order: { ...order, status: 'cancelled' },
    });
  } catch (err: any) {
    console.error('[Cancel Booking API Error]:', err);
    return NextResponse.json({ error: err.message || 'Interní chyba serveru.' }, { status: 500 });
  }
}
