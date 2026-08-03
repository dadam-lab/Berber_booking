import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCancellationEmail } from '@/lib/resend';

export const dynamic = 'force-dynamic';

// GET: List all orders
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) {
      console.error('[Orders GET Error]:', error);
      return NextResponse.json({ error: error.message || 'Chyba načítání objednávek.' }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update order status (e.g. cancel order from Admin)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Chybí ID nebo nový status.' }, { status: 400 });
    }

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error || !order) {
      console.error('[Orders PUT Error]:', error);
      return NextResponse.json({ error: error?.message || 'Chyba aktualizace stavu objednávky.' }, { status: 500 });
    }

    // If order was cancelled, release slot in availability table
    if (status === 'cancelled') {
      await supabaseAdmin
        .from('availability')
        .update({ is_booked: false, order_id: null })
        .eq('date', order.date)
        .eq('time', order.time);

      // Send cancellation email
      sendCancellationEmail({
        clientEmail: order.client_email,
        clientName: order.client_name,
        serviceTitle: order.service_title,
        date: order.date,
        time: order.time,
      }).catch((err) => console.error('Cancellation email error:', err));
    }

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
