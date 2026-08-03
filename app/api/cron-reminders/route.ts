import { NextResponse } from 'next/server';
import { supabaseAdmin, getSettingsMap } from '@/lib/supabase';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron Endpoint - Called daily to send appointment reminders to clients for tomorrow's bookings.
 */
export async function GET(request: Request) {
  try {
    // Optional Cron Authorization Header Check
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Neautorizovaný přístup ke cron endpointu.' }, { status: 401 });
    }

    const settings = await getSettingsMap();
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_APP_PASSWORD;
    const barberName = settings['barber_name'] || 'Barber Studio';
    const contactPhone = settings['contact_phone'] || '';

    if (!emailUser || !emailPass) {
      return NextResponse.json({ message: 'E-mailové údaje (EMAIL_USER / EMAIL_APP_PASSWORD) nejsou nastaveny.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    // Calculate tomorrow's date string in YYYY-MM-DD format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch all confirmed orders for tomorrow
    const { data: upcomingOrders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('date', tomorrowStr)
      .eq('status', 'confirmed');

    if (error) {
      console.error('[Cron Reminders Error] Failed to fetch orders:', error);
      return NextResponse.json({ error: 'Chyba načítání objednávek.' }, { status: 500 });
    }

    if (!upcomingOrders || upcomingOrders.length === 0) {
      return NextResponse.json({ message: 'Žádné zítřejší objednávky k projednání.' });
    }

    let sentCount = 0;

    for (const order of upcomingOrders) {
      const formattedDate = new Date(`${order.date}T${order.time}`).toLocaleDateString('cs-CZ', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0f172a; color: #f8fafc; padding: 25px; border-radius: 12px;">
          <h2 style="color: #f59e0b; border-bottom: 2px solid #334155; padding-bottom: 10px;">⏰ Připomínka zítřejší návštěvy - ${barberName}</h2>
          <p>Dobrý den, <strong>${order.client_name}</strong>,</p>
          <p>Připomínáme vaši zítřejší rezervaci:</p>

          <div style="background-color: #1e293b; padding: 18px; border-radius: 8px; margin: 18px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 4px 0;"><strong>Služba:</strong> ${order.service_title}</p>
            <p style="margin: 4px 0;"><strong>Termín:</strong> Zítra (${formattedDate}) v <strong>${order.time}</strong></p>
            <p style="margin: 4px 0;"><strong>Cena:</strong> ${order.service_price} Kč</p>
          </div>

          <p style="font-size: 0.9em; color: #94a3b8;">
            V případě potřeby změny volejte na: ${contactPhone || 'náš telefon'}.
          </p>
        </div>
      `;

      try {
        await transporter.sendMail({
          from: `"Rezervace Barber" <${emailUser}>`,
          to: order.client_email,
          subject: `⏰ Připomínka: Zítřejší termín v ${order.time} (${order.service_title})`,
          html,
        });
        sentCount++;
      } catch (err) {
        console.error(`[Cron Reminder Error] Failed for client ${order.client_email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Úspěšně rozesláno ${sentCount} připomínek pro datum ${tomorrowStr}.`,
    });
  } catch (err: any) {
    console.error('[Cron Endpoint Exception]:', err);
    return NextResponse.json({ error: err.message || 'Interní chyba v cron endpointu.' }, { status: 500 });
  }
}
