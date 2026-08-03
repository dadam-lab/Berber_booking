import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendBookingEmails } from '@/lib/resend';
import { createGoogleCalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_name, client_email, note, service_id, date, time } = body;

    // 1. Basic validation
    if (!client_name || !client_email || !service_id || !date || !time) {
      return NextResponse.json(
        { error: 'Chybí povinná pole v žádosti (jméno, email, služba, datum nebo čas).' },
        { status: 400 }
      );
    }

    // 2. Fetch service details
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Vybraná služba nebyla nalezena.' }, { status: 404 });
    }

    // Format time to HH:mm:ss for PostgreSQL TIME column matching (e.g. '14:00' -> '14:00:00')
    const formattedTime = time.length === 5 ? `${time}:00` : time;

    // 3. Verify that slot is not already booked in orders table
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('date', date)
      .eq('time', formattedTime)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existingOrder) {
      return NextResponse.json(
        { error: 'Tento termín byl v mezičase obsazen jiným zákazníkem.' },
        { status: 409 }
      );
    }

    // Check availability slot if configured
    const { data: slot } = await supabaseAdmin
      .from('availability')
      .select('*')
      .eq('date', date)
      .eq('time', formattedTime)
      .maybeSingle();

    if (slot) {
      if (slot.is_booked) {
        return NextResponse.json(
          { error: 'Tento termín byl v mezičase obsazen jiným zákazníkem.' },
          { status: 409 }
        );
      }
      if (slot.is_vacation) {
        return NextResponse.json(
          { error: 'V tento den má barber dovolenou.' },
          { status: 400 }
        );
      }
    }

    // 4. Create Order in Supabase
    const { data: newOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        client_name,
        client_email,
        note: note || '',
        service_id,
        service_title: service.title,
        service_price: service.price,
        date,
        time: formattedTime,
        status: 'confirmed',
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      console.error('[Booking Error] Order creation failed:', orderError);
      return NextResponse.json({ error: 'Chyba při vytváření objednávky v databázi.' }, { status: 500 });
    }

    // 5. Update or insert slot in availability table to booked
    if (slot) {
      await supabaseAdmin
        .from('availability')
        .update({ is_booked: true, order_id: newOrder.id })
        .eq('id', slot.id);
    } else {
      await supabaseAdmin
        .from('availability')
        .upsert({
          date,
          time: formattedTime,
          is_booked: true,
          is_vacation: false,
          order_id: newOrder.id,
        }, { onConflict: 'date,time' });
    }

    // 6. Send Booking Emails (Awaited for Vercel Serverless execution)
    try {
      await sendBookingEmails({
        orderId: newOrder.id,
        clientName: client_name,
        clientEmail: client_email,
        note,
        serviceTitle: service.title,
        servicePrice: service.price,
        date,
        time,
      });
    } catch (emailErr) {
      console.error('[Booking Email Error]:', emailErr);
    }

    // 7. Sync event to Barber Google Calendar via Service Account API (Async)
    createGoogleCalendarEvent({
      summary: service.title,
      description: note ? `Poznámka: ${note}` : 'Bez poznámky',
      date,
      time,
      durationMinutes: service.duration_minutes || 30,
      clientEmail: client_email,
      clientName: client_name,
    }).catch((err) => console.error('Google Calendar sync background error:', err));

    return NextResponse.json({
      success: true,
      message: 'Rezervace byla úspěšně vytvořena.',
      order: newOrder,
      service,
    });
  } catch (error: any) {
    console.error('[API Booking Error]:', error);
    return NextResponse.json({ error: error?.message || 'Interní serverová chyba.' }, { status: 500 });
  }
}
