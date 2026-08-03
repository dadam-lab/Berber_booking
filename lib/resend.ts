import nodemailer from 'nodemailer';
import { getSettingsMap } from './supabase';

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
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return 'http://localhost:3000';
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
  const barberName = settings['barber_name'] || 'Barber Studio';
  const logoUrl = settings['logo_url'] || '';

  const formattedDate = new Date(`${booking.date}T${booking.time}`).toLocaleDateString('cs-CZ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const baseUrl = getBaseUrl();
  const cancelUrl = `${baseUrl}/zrusit-rezervaci?id=${booking.orderId}`;

  // Header HTML (Logo + Barber Shop Name in the corner)
  const headerHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="font-size: 20px; font-weight: bold; letter-spacing: 1px; color: #ffffff; text-transform: uppercase;">
        ${barberName}
      </div>
      ${logoUrl ? `<img src="${logoUrl}" alt="${barberName}" style="max-height: 40px; max-width: 120px; object-fit: contain;" />` : ''}
    </div>
  `;

  // 1. Send confirmation to Client (Black background, white elements)
  const clientHtml = `
    <div style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border-radius: 12px; border: 1px solid #27272a;">
      ${headerHtml}
      
      <h2 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 16px;">Potvrzení rezervace</h2>
      <p style="color: #e4e4e7; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
        Ahoj <strong>${booking.clientName}</strong>,<br/>
        tvůj termín byl úspěšně zaregistrován a těšíme se na tebe.
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
              Pokud chcete schůzku zrušit, <a href="${cancelUrl}" style="color: #ffffff; font-weight: bold; text-decoration: underline;">klikněte ZDE</a>.
            </td>
          </tr>
        </tbody>
      </table>

      <div style="background-color: #18181b; border-left: 3px solid #ffffff; padding: 14px 16px; border-radius: 4px; margin-top: 24px;">
        <p style="margin: 0; font-size: 14px; color: #e4e4e7;">
          <strong>Pokyny pro zákazníka:</strong> Prosíme, dorazte o 5 minut dříve před Vaším termínem.
        </p>
      </div>

      <div style="border-top: 1px solid #27272a; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #71717a;">
        © ${new Date().getFullYear()} ${barberName}. Všechna práva vyhrazena.
      </div>
    </div>
  `;

  // 2. Send notification to Barber (Black background, white elements)
  const barberHtml = `
    <div style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border-radius: 12px; border: 1px solid #27272a;">
      ${headerHtml}
      
      <h2 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 16px;">Nová rezervace!</h2>
      <p style="color: #e4e4e7; font-size: 15px; margin-bottom: 20px;">Vytvořena nová objednávka přes rezervační systém:</p>
      
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
        © ${new Date().getFullYear()} ${barberName}. Systém pro správa rezervací.
      </div>
    </div>
  `;

  try {
    const mailer = getTransporter();
    const [clientRes, barberRes] = await Promise.all([
      mailer.sendMail({
        from: `"${barberName}" <${emailUser}>`,
        to: booking.clientEmail,
        subject: `Potvrzení termínu - ${booking.serviceTitle}`,
        html: clientHtml,
      }),
      mailer.sendMail({
        from: `"${barberName}" <${emailUser}>`,
        to: barberEmail,
        subject: `Nová rezervace: ${booking.clientName} (${booking.date} ${booking.time})`,
        html: barberHtml,
      }),
    ]);

    return { success: true, clientRes, barberRes };
  } catch (error) {
    console.error('[Nodemailer Error] Failed to send emails:', error);
    return { success: false, error };
  }
}

/**
 * Send cancellation email to client and barber using Nodemailer.
 */
export async function sendCancellationEmail(details: {
  clientEmail: string;
  clientName: string;
  serviceTitle: string;
  date: string;
  time: string;
}) {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_APP_PASSWORD;

  if (!emailUser || !emailPass) return;

  const settings = await getSettingsMap();
  const barberEmail = settings['contact_email'] || emailUser;
  const barberName = settings['barber_name'] || 'Barber Studio';
  const logoUrl = settings['logo_url'] || '';

  const headerHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #27272a; padding-bottom: 16px; margin-bottom: 24px;">
      <div style="font-size: 20px; font-weight: bold; letter-spacing: 1px; color: #ffffff; text-transform: uppercase;">
        ${barberName}
      </div>
      ${logoUrl ? `<img src="${logoUrl}" alt="${barberName}" style="max-height: 40px; max-width: 120px; object-fit: contain;" />` : ''}
    </div>
  `;

  const html = `
    <div style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border-radius: 12px; border: 1px solid #27272a;">
      ${headerHtml}
      
      <div style="display: inline-block; background-color: #27272a; color: #ef4444; border: 1px solid #ef4444; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: bold; margin-bottom: 16px;">
        STORNO REZERVACE
      </div>
      
      <h2 style="color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 16px;">Rezervace byla zrušena</h2>
      
      <p style="color: #e4e4e7; font-size: 15px; line-height: 1.5; margin-bottom: 20px;">
        Rezervace pro <strong>${details.clientName}</strong> na službu <strong>${details.serviceTitle}</strong> dne <strong>${details.date} v ${details.time}</strong> byla zrušena.
      </p>
      
      <div style="background-color: #121215; border: 1px solid #27272a; padding: 16px; border-radius: 8px; font-size: 14px; color: #a1a1aa; margin-top: 20px;">
        Termín v kalendáři byl automaticky uvolněn pro ostatní zákazníky.
      </div>

      <div style="border-top: 1px solid #27272a; margin-top: 32px; padding-top: 16px; text-align: center; font-size: 12px; color: #71717a;">
        © ${new Date().getFullYear()} ${barberName}. Všechna práva vyhrazena.
      </div>
    </div>
  `;

  try {
    const mailer = getTransporter();
    await Promise.all([
      mailer.sendMail({
        from: `"${barberName}" <${emailUser}>`,
        to: details.clientEmail,
        subject: `Storno rezervace - ${details.date} ${details.time}`,
        html,
      }),
      mailer.sendMail({
        from: `"${barberName}" <${emailUser}>`,
        to: barberEmail,
        subject: `[Storno] Rezervace zrušena: ${details.clientName} (${details.date})`,
        html,
      }),
    ]);
  } catch (err) {
    console.error('[Nodemailer Storno Error]:', err);
  }
}


