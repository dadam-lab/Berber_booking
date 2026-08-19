import { NextResponse } from 'next/server';
import { getTransporter } from '@/lib/resend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const recipientEmail = body.recipientEmail || process.env.EMAIL_USER;

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Chybí cílový e-mail pro testovací zprávu.' }, { status: 400 });
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_APP_PASSWORD;

    if (!emailUser || !emailPass) {
      return NextResponse.json({
        error: 'Chybí proměnné prostředí EMAIL_USER nebo EMAIL_APP_PASSWORD ve Vercelu.',
      }, { status: 400 });
    }

    const mailer = getTransporter();
    const info = await mailer.sendMail({
      from: `"SW-Barber Test" <${emailUser}>`,
      to: recipientEmail,
      subject: 'SW-Barber | Testovací e-mail z Vercelu',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #09090b; color: #fff; border-radius: 8px;">
          <h2 style="color: #f59e0b;">SW-Barber Test E-mailu</h2>
          <p>Tento e-mail potvrzuje, že Nodemailer SMTP spojení přes Gmail funguje správně na Vercelu!</p>
          <p>Odesílatel: <strong>${emailUser}</strong></p>
          <p>Příjemce: <strong>${recipientEmail}</strong></p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Testovací e-mail byl úspěšně odeslán na ${recipientEmail}`,
      messageId: info.messageId,
    });
  } catch (err: any) {
    console.error('[Test Email Error]:', err);
    return NextResponse.json({ error: err?.message || 'Chyba při odesílání testovacího e-mailu.' }, { status: 500 });
  }
}
