import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendCancellationEmail } from '@/lib/resend';
import { deleteGoogleCalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetDates, timeSlots, cancelAllInSlots, reason } = body;

    if (!targetDates || !Array.isArray(targetDates) || targetDates.length === 0) {
      return NextResponse.json({ error: 'Vyberte alespoň jeden den pro zrušení termínů.' }, { status: 400 });
    }

    const selectedSlots = Array.isArray(timeSlots) ? timeSlots : [];
    const formattedSlots = selectedSlots.map((t) => (t.length === 5 ? `${t}:00` : t));

    // 1. Fetch confirmed orders on target dates
    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .in('date', targetDates)
      .neq('status', 'cancelled');

    if (!cancelAllInSlots && formattedSlots.length > 0) {
      query = query.in('time', formattedSlots);
    }

    const { data: ordersToCancel, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Bulk Cancel Fetch Error]:', fetchError);
      return NextResponse.json({ error: 'Chyba při načítání rezervací ke zrušení.' }, { status: 500 });
    }

    let cancelledOrdersCount = 0;

    // 2. Process cancellation for each affected order
    if (ordersToCancel && ordersToCancel.length > 0) {
      for (const order of ordersToCancel) {
        // Update order status in Supabase
        await supabaseAdmin
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', order.id);

        // Delete Google Calendar event (try ID or search fallback)
        deleteGoogleCalendarEvent({
          gcalEventId: order.gcal_event_id,
          date: order.date,
          time: order.time,
          clientEmail: order.client_email,
          clientName: order.client_name,
        }).catch((err) => console.error(`[Bulk Cancel GCal Delete Error for ${order.id}]:`, err));

        // Send cancellation email to client and barber with custom reason
        sendCancellationEmail({
          clientEmail: order.client_email,
          clientName: order.client_name,
          serviceTitle: order.service_title,
          date: order.date,
          time: (order.time || '').substring(0, 5),
          reason: reason || undefined,
          cancelledByBarber: true,
        }).catch((err) => console.error(`[Bulk Cancel Email Error for ${order.id}]:`, err));

        cancelledOrdersCount++;
      }
    }

    // 3. Update availability table to unbook slots
    let availQuery = supabaseAdmin
      .from('availability')
      .update({ is_booked: false, order_id: null })
      .in('date', targetDates);

    if (!cancelAllInSlots && formattedSlots.length > 0) {
      availQuery = availQuery.in('time', formattedSlots);
    }

    const { error: availError } = await availQuery;
    if (availError) {
      console.error('[Bulk Cancel Availability Update Error]:', availError);
    }

    return NextResponse.json({
      success: true,
      message: `Úspěšně zrušeno ${cancelledOrdersCount} rezervací pro ${targetDates.length} dnů.`,
      cancelledOrdersCount,
      affectedDatesCount: targetDates.length,
    });
  } catch (err: any) {
    console.error('[Bulk Cancel API Error]:', err);
    return NextResponse.json({ error: err?.message || 'Chyba při rušení termínů.' }, { status: 500 });
  }
}
