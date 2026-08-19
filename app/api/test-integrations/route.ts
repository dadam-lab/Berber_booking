import { NextResponse } from 'next/server';
import { sendBookingEmails } from '@/lib/resend';
import { createGoogleCalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const testEmail = body.testEmail || process.env.EMAIL_USER || 'rezervace.swbarbershop@gmail.com';

    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 1);
    const dateStr = testDate.toISOString().split('T')[0];
    const timeStr = '12:00';

    console.log('[Test Integrations] Running test for:', { testEmail, dateStr, timeStr });

    // 1. Test Email
    let emailResult: any = null;
    let emailError: any = null;
    try {
      emailResult = await sendBookingEmails({
        orderId: 'TEST-ORDER-123',
        clientName: 'Testovací Zákazník',
        clientEmail: testEmail,
        note: 'Testovací rezervace ze zkušebního skriptu',
        serviceTitle: 'Testovací Střih',
        servicePrice: 500,
        date: dateStr,
        time: timeStr,
      });
    } catch (err: any) {
      emailError = err?.message || String(err);
    }

    // 2. Test Google Calendar
    let calResult: any = null;
    let calError: any = null;
    try {
      calResult = await createGoogleCalendarEvent({
        summary: 'Testovací Střih',
        description: 'Testovací událost pro ověření Google Calendar API',
        date: dateStr,
        time: timeStr,
        durationMinutes: 30,
        clientEmail: testEmail,
        clientName: 'Testovací Zákazník',
      });
    } catch (err: any) {
      calError = err?.message || String(err);
    }

    return NextResponse.json({
      success: true,
      envCheck: {
        hasEmailUser: !!process.env.EMAIL_USER,
        emailUser: process.env.EMAIL_USER || 'MISSING',
        hasEmailPassword: !!process.env.EMAIL_APP_PASSWORD,
        hasGoogleCalendarId: !!process.env.GOOGLE_CALENDAR_ID,
        googleCalendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        hasGoogleServiceAccountEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'MISSING',
        hasGooglePrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      },
      emailResult,
      emailError,
      calResult,
      calError,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to run test' }, { status: 500 });
  }
}
