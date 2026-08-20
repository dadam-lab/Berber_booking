import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { getSettingsMap } from './supabase';
import { getGoogleCalendarUrl, getAppleCalendarUrl, generateICSContent } from './ics';

/**
 * Nodemailer Gmail Transporter using environment variables EMAIL_USER and EMAIL_APP_PASSWORD
 */
export function getTransporter() {
  const user = process.env.EMAIL_USER;
  const rawPass = process.env.EMAIL_APP_PASSWORD || '';
  const pass = rawPass.replace(/\s+/g, ''); // strip any spaces in Gmail App Password

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL connection for Serverless environments like Vercel
    auth: {
      user,
      pass,
    },
  });
}

function getBaseUrl() {
  const customUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (customUrl && customUrl.trim()) {
    let url = customUrl.trim().replace(/\/$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
  }
  return 'https://swbarbershop.cz';
}

/**
 * Send booking confirmation emails to both client and barber using Nodemailer.
 */
export async function sendBookingEmails(booking: {
  orderId: string;
  clientName: string;
  clientEmail: string;
  note?: string;
  serviceTitle: string;
  servicePrice: number;
  date: string;
  time: string;
}) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) {
    console.warn('[Nodemailer Email Warning] EMAIL_USER or EMAIL_APP_PASSWORD is missing. Skipping email sending.');
    return { success: false, reason: 'Missing EMAIL_USER or EMAIL_APP_PASSWORD' };
  }

  const settings = await getSettingsMap();
  const barberEmail = settings['contact_email'] || emailUser;
  const barberName = 'SW-Barber';
  const address = settings['contact_address'] || 'SW-Barber Studio';

  const formattedDate = new Date(`${booking.date}T${booking.time}`).toLocaleDateString('cs-CZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const baseUrl = getBaseUrl();
  const cancelUrl = `${baseUrl}/zrusit-rezervaci?id=${booking.orderId}`;

  // Calendar Event & Links
  const eventData = {
    title: `SW-Barber: ${booking.serviceTitle}`,
    description: `Rezervovaný termín v SW-Barber pro ${booking.clientName}.${booking.note ? ` Poznámka: ${booking.note}` : ''}`,
    location: address,
    startDate: booking.date,
    startTime: booking.time,
    durationMinutes: 45,
  };

  const googleCalUrl = getGoogleCalendarUrl(eventData);
  const outlookCalUrl = getAppleCalendarUrl(eventData);
  const icsContent = generateICSContent(eventData);

  // Header HTML (Clean SW-Barber text title, no logo image)
  const headerHtml = `
    <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="font-size: 22px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; text-transform: uppercase;">
        SW-Barber
      </div>
    </div>
  `;

  // 1. Client Confirmation HTML Email
  const clientHtml = `
    <div style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border-radius: 12px; border: 1px solid #27272a;">
      ${headerHtml}
      
      <h2 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 16px;">Potvrzení rezervace</h2>
      <p style="color: #e4e4e7; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
        Ahoj <strong>${booking.clientName}</strong>,<br/>
        tvůj termín byl úspěšně zaregistrován a těšíme se na tebe v SW-Barber.
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #121215; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; font-size: 14px;">
        <tbody>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #a1a1aa; width: 40%;">Služba</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; font-weight: bold; color: #ffffff; text-align: right;">${booking.serviceTitle} (${booking.servicePrice} Kč)</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #a1a1aa;">Datum a čas</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; font-weight: bold; color: #ffffff; text-align: right;">${formattedDate} v ${booking.time}</td>
          </tr>
          ${booking.note ? `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #a1a1aa;">Poznámka</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; font-weight: bold; color: #ffffff; text-align: right;">${booking.note}</td>
          </tr>
          ` : ''}
          <tr>
            <td colspan="2" style="padding: 14px 16px; background-color: #18181b; text-align: center; font-size: 14px; color: #a1a1aa;">
              Pokud chcete schůzku zrušit, můžete <a href="${cancelUrl}" style="color: #ffffff; font-weight: bold; text-decoration: underline;">zrušit rezervaci online</a>.
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Mobile Calendar Deep Links -->
      <div style="background-color: #121215; border: 1px solid #27272a; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
        <div style="font-size: 14px; font-weight: bold; color: #ffffff; margin-bottom: 12px;">
          📅 Uložit termín do kalendáře v mobilu
        </div>
        <div style="margin-bottom: 12px;">
          <a href="${googleCalUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: bold; display: inline-block; margin: 4px;">
            + Google Kalendář
          </a>
          <a href="${outlookCalUrl}" target="_blank" style="background-color: #27272a; color: #ffffff; border: 1px solid #3f3f46; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 13px; font-weight: bold; display: inline-block; margin: 4px;">
            + Apple / Outlook Kalendář
          </a>
        </div>
        <div style="font-size: 11px; color: #71717a; line-height: 1.4;">
          💡 V e-mailu je také přiložen soubor <strong>rezervace.ics</strong>. Na iPhone i Androidu stačí klepnout na přílohu pro přímé otevření aplikace Kalendář.
        </div>
      </div>

      <div style="background-color: #18181b; border-left: 3px solid #ffffff; padding: 14px 16px; border-radius: 4px; margin-top: 24px;">
        <p style="margin: 0; font-size: 14px; color: #e4e4e7;">
          <strong>Pokyny pro zákazníka:</strong> Prosíme, dorazte o 5 minut dříve před Vaším termínem.
        </p>
      </div>

      <div style="border-top: 1px solid #27272a; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #71717a;">
        © ${new Date().getFullYear()} SW-Barber. Všechna práva vyhrazena.
      </div>
    </div>
  `;

  const clientText = `Ahoj ${booking.clientName},

Tvoje rezervace v SW-Barber byla úspěšně potvrzena.

Služba: ${booking.serviceTitle} (${booking.servicePrice} Kč)
Termín: ${formattedDate} v ${booking.time}
${booking.note ? `Poznámka: ${booking.note}\n` : ''}Adresa: ${address}

Pro případné zrušení termínu navštivte: ${cancelUrl}

Těšíme se na vás!
SW-Barber`;

  // 2. Barber Notification HTML Email
  const barberHtml = `
    <div style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border-radius: 12px; border: 1px solid #27272a;">
      ${headerHtml}
      
      <h2 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 16px;">Nová rezervace!</h2>
      <p style="color: #e4e4e7; font-size: 15px; margin-bottom: 20px;">Vytvořena nová objednávka přes rezervační systém SW-Barber:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #121215; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; font-size: 14px;">
        <tbody>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #a1a1aa; width: 40%;">Klient</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; font-weight: bold; color: #ffffff; text-align: right;">${booking.clientName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #a1a1aa;">E-mail</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; font-weight: bold; color: #ffffff; text-align: right;">${booking.clientEmail}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #a1a1aa;">Služba</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; font-weight: bold; color: #ffffff; text-align: right;">${booking.serviceTitle} (${booking.servicePrice} Kč)</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; color: #a1a1aa;">Termín</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #27272a; font-weight: bold; color: #ffffff; text-align: right;">${booking.date} v ${booking.time}</td>
          </tr>
          ${booking.note ? `
          <tr>
            <td style="padding: 12px 16px; color: #a1a1aa;">Poznámka</td>
            <td style="padding: 12px 16px; font-weight: bold; color: #ffffff; text-align: right;">${booking.note}</td>
          </tr>
          ` : ''}
        </tbody>
      </table>

      <div style="border-top: 1px solid #27272a; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #71717a;">
        © ${new Date().getFullYear()} SW-Barber. Systém pro správu rezervací.
      </div>
    </div>
  `;

  const barberText = `Nová rezervace přes systém SW-Barber:

Klient: ${booking.clientName} (${booking.clientEmail})
Služba: ${booking.serviceTitle} (${booking.servicePrice} Kč)
Termín: ${booking.date} v ${booking.time}
${booking.note ? `Poznámka: ${booking.note}\n` : ''}`;

  const resendApiKey = process.env.RESEND_API_KEY || settings['resend_api_key'];
  const senderAddress = process.env.SENDER_EMAIL || settings['sender_email'] || emailUser;

  // Option A: Send via Resend API if RESEND_API_KEY is configured
  if (resendApiKey) {
    console.log('[Email Service] Using Resend API for email delivery...');
    const resend = new Resend(resendApiKey);

    let clientRes = null;
    let barberRes = null;
    let clientError = null;
    let barberError = null;

    try {
      clientRes = await resend.emails.send({
        from: `SW-Barber <${senderAddress}>`,
        reply_to: senderAddress,
        to: booking.clientEmail,
        subject: `SW-Barber | Potvrzení termínu - ${booking.serviceTitle}`,
        text: clientText,
        html: clientHtml,
        attachments: [
          {
            filename: 'rezervace.ics',
            content: Buffer.from(icsContent).toString('base64'),
          },
        ],
      });
      console.log(`[Resend API Success] Client email sent to ${booking.clientEmail}:`, clientRes);
    } catch (err: any) {
      console.error(`[Resend API Error] Failed sending client email:`, err);
      clientError = err?.message || String(err);
    }

    try {
      barberRes = await resend.emails.send({
        from: `SW-Barber <${senderAddress}>`,
        reply_to: booking.clientEmail,
        to: barberEmail,
        subject: `SW-Barber | Nová rezervace: ${booking.clientName} (${booking.date} ${booking.time})`,
        text: barberText,
        html: barberHtml,
      });
      console.log(`[Resend API Success] Barber email sent to ${barberEmail}:`, barberRes);
    } catch (err: any) {
      console.error(`[Resend API Error] Failed sending barber email:`, err);
      barberError = err?.message || String(err);
    }

    return { success: !clientError && !barberError, clientRes, barberRes, clientError, barberError };
  }

  // Option B: Fallback to Nodemailer Gmail SMTP
  const mailer = getTransporter();
  let clientRes = null;
  let barberRes = null;
  let clientError = null;
  let barberError = null;

  // 1. Send Client Confirmation Email
  try {
    clientRes = await mailer.sendMail({
      from: `"SW-Barber" <${emailUser}>`,
      replyTo: emailUser,
      to: booking.clientEmail,
      subject: `SW-Barber | Potvrzení termínu - ${booking.serviceTitle}`,
      text: clientText,
      html: clientHtml,
      attachments: [
        {
          filename: 'rezervace.ics',
          content: icsContent,
          contentType: 'text/calendar; charset=UTF-8',
        },
      ],
    });
    console.log(`[Nodemailer Success] Client email sent to ${booking.clientEmail}:`, clientRes.messageId);
  } catch (err: any) {
    console.error(`[Nodemailer Error] Failed sending client email to ${booking.clientEmail}:`, err);
    clientError = err?.message || String(err);
  }

  // 2. Send Barber Notification Email
  try {
    barberRes = await mailer.sendMail({
      from: `"SW-Barber" <${emailUser}>`,
      replyTo: booking.clientEmail,
      to: barberEmail,
      subject: `SW-Barber | Nová rezervace: ${booking.clientName} (${booking.date} ${booking.time})`,
      text: barberText,
      html: barberHtml,
    });
    console.log(`[Nodemailer Success] Barber email sent to ${barberEmail}:`, barberRes.messageId);
  } catch (err: any) {
    console.error(`[Nodemailer Error] Failed sending barber email to ${barberEmail}:`, err);
    barberError = err?.message || String(err);
  }

  return {
    success: !clientError && !barberError,
    clientRes,
    barberRes,
    clientError,
    barberError,
  };
}

/**
 * Send cancellation email to client and barber using Nodemailer or Resend API.
 */
export async function sendCancellationEmail(details: {
  clientEmail: string;
  clientName: string;
  serviceTitle: string;
  date: string;
  time: string;
  reason?: string;
  cancelledByBarber?: boolean;
}) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_APP_PASSWORD;
  const settings = await getSettingsMap();
  const resendApiKey = process.env.RESEND_API_KEY || settings['resend_api_key'];
  const senderAddress = process.env.SENDER_EMAIL || settings['sender_email'] || emailUser;
  const barberEmail = settings['contact_email'] || emailUser || 'rezervace.swbarbershop@gmail.com';
  const baseUrl = getBaseUrl();
  const rebookUrl = baseUrl;

  const headerHtml = `
    <div style="border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="font-size: 22px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff; text-transform: uppercase;">
        SW-Barber
      </div>
    </div>
  `;

  const clientHtml = `
    <div style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border-radius: 12px; border: 1px solid #27272a;">
      ${headerHtml}
      
      <div style="display: inline-block; background-color: #27272a; color: #ef4444; border: 1px solid #ef4444; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: bold; margin-bottom: 16px;">
        STORNO REZERVACE
      </div>
      
      <h2 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 16px;">Rezervace byla zrušena</h2>
      
      <p style="color: #e4e4e7; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
        Dobrý den, Vaše rezervace pro <strong>${details.clientName}</strong> na službu <strong>${details.serviceTitle}</strong> dne <strong>${details.date} v ${details.time}</strong> byla zrušena.
      </p>

      ${details.reason ? `
      <div style="background-color: #1c1917; border-left: 3px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 14px; color: #f59e0b;">
        <strong>Důvod zrušení ze strany barbera:</strong> ${details.reason}
      </div>
      ` : ''}
      
      <div style="background-color: #121215; border: 1px solid #27272a; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
        <div style="font-size: 15px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">
          📅 Vyberte si nový vyhovující termín
        </div>
        <p style="color: #a1a1aa; font-size: 13px; margin-bottom: 16px;">
          Můžete si kdykoliv online vybrat náhradní termín v našem rezervačním kalendáři.
        </p>
        <a href="${rebookUrl}" target="_blank" style="background-color: #f59e0b; color: #09090b; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: bold; display: inline-block;">
          Objednat se na jiný termín
        </a>
      </div>

      <div style="border-top: 1px solid #27272a; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #71717a;">
        © ${new Date().getFullYear()} SW-Barber. Všechna práva vyhrazena.
      </div>
    </div>
  `;

  const clientText = `Dobrý den ${details.clientName},

Vaše rezervace v SW-Barber na službu ${details.serviceTitle} dne ${details.date} v ${details.time} byla zrušena.
${details.reason ? `\nDůvod zrušení ze strany barbera: ${details.reason}\n` : ''}
Pro výběr nového výhovujícího termínu navštivte: ${rebookUrl}

S pozdravem,
SW-Barber`;

  const barberHtml = `
    <div style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border-radius: 12px; border: 1px solid #27272a;">
      ${headerHtml}
      
      <div style="display: inline-block; background-color: #27272a; color: #ef4444; border: 1px solid #ef4444; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: bold; margin-bottom: 16px;">
        STORNO REZERVACE
      </div>
      
      <h2 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 16px;">Rezervace byla stornována</h2>
      
      <p style="color: #e4e4e7; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
        Rezervace klienta <strong>${details.clientName}</strong> (${details.clientEmail}) na službu <strong>${details.serviceTitle}</strong> dne <strong>${details.date} v ${details.time}</strong> byla zrušena.
      </p>

      ${details.reason ? `
      <div style="background-color: #1c1917; border-left: 3px solid #f59e0b; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 14px; color: #f59e0b;">
        <strong>Důvod:</strong> ${details.reason}
      </div>
      ` : ''}

      <div style="border-top: 1px solid #27272a; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #71717a;">
        © ${new Date().getFullYear()} SW-Barber. Všechna práva vyhrazena.
      </div>
    </div>
  `;

  const barberText = `Rezervace klienta ${details.clientName} (${details.clientEmail}) na službu ${details.serviceTitle} dne ${details.date} v ${details.time} byla zrušena.${details.reason ? ` Důvod: ${details.reason}` : ''}`;

  // Option A: Send via Resend API if configured
  if (resendApiKey) {
    const resend = new Resend(resendApiKey);
    try {
      await Promise.all([
        resend.emails.send({
          from: `SW-Barber <${senderAddress}>`,
          reply_to: senderAddress,
          to: details.clientEmail,
          subject: `SW-Barber | Storno rezervace - ${details.date} ${details.time}`,
          text: clientText,
          html: clientHtml,
        }),
        resend.emails.send({
          from: `SW-Barber <${senderAddress}>`,
          reply_to: details.clientEmail,
          to: barberEmail,
          subject: `SW-Barber | [Storno] Rezervace zrušena: ${details.clientName} (${details.date})`,
          text: barberText,
          html: barberHtml,
        }),
      ]);
      console.log('[Resend API Success] Cancellation emails sent.');
    } catch (err) {
      console.error('[Resend API Cancellation Error]:', err);
    }
    return;
  }

  // Option B: Fallback to Nodemailer Gmail SMTP
  if (!emailUser || !emailPass) return;
  try {
    const mailer = getTransporter();
    await Promise.all([
      mailer.sendMail({
        from: `"SW-Barber" <${emailUser}>`,
        replyTo: emailUser,
        to: details.clientEmail,
        subject: `SW-Barber | Storno rezervace - ${details.date} ${details.time}`,
        text: clientText,
        html: clientHtml,
      }),
      mailer.sendMail({
        from: `"SW-Barber" <${emailUser}>`,
        replyTo: details.clientEmail,
        to: barberEmail,
        subject: `SW-Barber | [Storno] Rezervace zrušena: ${details.clientName} (${details.date})`,
        text: barberText,
        html: barberHtml,
      }),
    ]);
    console.log('[Nodemailer Success] Cancellation emails sent.');
  } catch (err) {
    console.error('[Nodemailer Storno Error]:', err);
  }
}
