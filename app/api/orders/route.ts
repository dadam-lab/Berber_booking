import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCancellationEmail } from '@/lib/resend';
import { deleteGoogleCalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    return NextResponse.json(
      { orders: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update order status (e.g. cancel order from Admin)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status, reason } = body;

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

    // If order was cancelled, release slot in availability table & delete Google Calendar event
    if (status === 'cancelled') {
      await supabaseAdmin
        .from('availability')
        .update({ is_booked: false, order_id: null })
        .eq('date', order.date)
        .eq('time', order.time);

      deleteGoogleCalendarEvent({
        gcalEventId: order.gcal_event_id,
        date: order.date,
        time: order.time,
        clientEmail: order.client_email,
        clientName: order.client_name,
      }).catch((gcalErr) => console.error('[Orders PUT GCal Delete Error]:', gcalErr));

      // Send cancellation email
      sendCancellationEmail({
        clientEmail: order.client_email,
        clientName: order.client_name,
        serviceTitle: order.service_title,
        date: order.date,
        time: order.time,
        reason: reason || undefined,
        cancelledByBarber: true,
      }).catch((err) => console.error('Cancellation email error:', err));
    }

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Delete a single order by ID or purge past orders
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const purge = searchParams.get('purge');

    if (id) {
      // Find order to clear availability and remove Google Calendar event
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (order) {
        await supabaseAdmin
          .from('availability')
          .update({ is_booked: false, order_id: null })
          .eq('date', order.date)
          .eq('time', order.time);

        deleteGoogleCalendarEvent({
          gcalEventId: order.gcal_event_id,
          date: order.date,
          time: order.time,
          clientEmail: order.client_email,
          clientName: order.client_name,
        }).catch((err) => console.error('[Orders DELETE GCal Error]:', err));
      }

      const { error } = await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Orders DELETE Error]:', error);
        return NextResponse.json({ error: error.message || 'Chyba při mazání rezervace.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Rezervace byla úspěšně smazána z databáze.' });
    }

    if (purge === 'past') {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Select past orders to unbook availability
      const { data: pastOrders } = await supabaseAdmin
        .from('orders')
        .select('id')
        .lt('date', todayStr);

      if (pastOrders && pastOrders.length > 0) {
        const pastIds = pastOrders.map((o) => o.id);
        await supabaseAdmin
          .from('availability')
          .update({ is_booked: false, order_id: null })
          .in('order_id', pastIds);
      }

      const { error } = await supabaseAdmin
        .from('orders')
        .delete()
        .lt('date', todayStr);

      if (error) {
        console.error('[Orders PURGE Error]:', error);
        return NextResponse.json({ error: error.message || 'Chyba při promazávání uplynulých rezervací.' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Uplynulé rezervace byly úspěšně promazány.' });
    }

    return NextResponse.json({ error: 'Chybí ID rezervace nebo parametr purge.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

