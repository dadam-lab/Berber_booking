import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Fetch availability for client picker or admin calendar
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabaseAdmin.from('availability').select('*');

    if (date) {
      query = query.eq('date', date);
    } else if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    } else {
      // Default: fetch from today up to 365 days ahead
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('date', today);
    }

    const { data: dbSlots, error } = await query.order('time', { ascending: true });

    if (error) {
      console.error('[Availability GET Error]:', error);
      return NextResponse.json({ error: 'Chyba při načítání dostupnosti.' }, { status: 500 });
    }

    // Also fetch confirmed orders to ensure all booked slots are correctly flagged
    let ordersQuery = supabaseAdmin.from('orders').select('*').neq('status', 'cancelled');
    if (date) {
      ordersQuery = ordersQuery.eq('date', date);
    }
    const { data: dbOrders } = await ordersQuery;

    const bookedTimeMap = new Set<string>();
    if (dbOrders && dbOrders.length > 0) {
      dbOrders.forEach((ord: any) => {
        const timeKey = `${ord.date}_${(ord.time || '').substring(0, 5)}`;
        bookedTimeMap.add(timeKey);
      });
    }

    const availability = (dbSlots || []).map((slot: any) => {
      const timeKey = `${slot.date}_${(slot.time || '').substring(0, 5)}`;
      const isBooked = slot.is_booked || bookedTimeMap.has(timeKey);
      return {
        ...slot,
        is_booked: isBooked,
      };
    });

    return NextResponse.json({ availability });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Save or update availability slots for a date (or bulk apply to multiple dates)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetDates, timeSlots, isVacation, clearDay, replaceSlots } = body;

    // Validation
    if (!targetDates || !Array.isArray(targetDates) || targetDates.length === 0) {
      return NextResponse.json({ error: 'Nebyly vybrány žádné cílové dny.' }, { status: 400 });
    }

    for (const d of targetDates) {
      if (clearDay || replaceSlots) {
        // Delete non-booked slots for this date so old removed times don't linger
        await supabaseAdmin
          .from('availability')
          .delete()
          .eq('date', d)
          .eq('is_booked', false);
      }
    }

    const rowsToUpsert: any[] = [];

    for (const d of targetDates) {
      if (clearDay) {
        continue;
      }

      if (isVacation) {
        // Mark date as Vacation
        rowsToUpsert.push({
          date: d,
          time: '00:00:00',
          is_booked: false,
          is_vacation: true,
        });
      } else if (Array.isArray(timeSlots) && timeSlots.length > 0) {
        // Add 15-min slots selected by barber
        for (const t of timeSlots) {
          const formattedTime = t.length === 5 ? `${t}:00` : t;
          rowsToUpsert.push({
            date: d,
            time: formattedTime,
            is_booked: false,
            is_vacation: false,
          });
        }
      }
    }

    if (rowsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('availability')
        .upsert(rowsToUpsert, { onConflict: 'date,time' });

      if (upsertError) {
        console.error('[Availability Upsert Error]:', upsertError);
        return NextResponse.json({ error: 'Chyba při ukládání rozvrhu.' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Rozvrh byl úspěšně uložen pro ${targetDates.length} dní.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
