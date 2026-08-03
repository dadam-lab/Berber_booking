import { google } from 'googleapis';
import { getSettingsMap } from './supabase';

/**
 * Creates an event in the Barber's Google Calendar using a Service Account JWT.
 * Credentials can be set via environment variables or Supabase settings table.
 */
export async function createGoogleCalendarEvent(booking: {
  summary: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  clientEmail: string;
  clientName: string;
}) {
  try {
    const settings = await getSettingsMap();

    const calendarId = process.env.GOOGLE_CALENDAR_ID || settings['google_calendar_id'];
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || settings['google_service_account_email'];
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || settings['google_private_key'];

    if (!calendarId || !clientEmail || !privateKey) {
      console.warn('[Google Calendar Warning] Service account credentials or Calendar ID missing. Skipping event creation.');
      return null;
    }

    // Fix escaped line breaks if private key is passed in single-line format
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Calculate start and end ISO timestamps
    const startDateTime = new Date(`${booking.date}T${booking.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + booking.durationMinutes * 60000);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `✂️ ${booking.summary} - ${booking.clientName}`,
        description: `Rezervace z webu:\nKlient: ${booking.clientName} (${booking.clientEmail})\nDetail: ${booking.description}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: 'Europe/Prague',
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: 'Europe/Prague',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'email', minutes: 1440 },
          ],
        },
      },
    });

    console.log('[Google Calendar Success] Event created:', response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error('[Google Calendar Error] Failed to create event:', error);
    return null;
  }
}
