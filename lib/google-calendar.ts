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

    const calendarId = process.env.GOOGLE_CALENDAR_ID || settings['google_calendar_id'] || 'primary';
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || settings['google_service_account_email'];
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || settings['google_private_key'];

    if (!calendarId || !clientEmail || !privateKey) {
      console.warn('[Google Calendar Warning] Service account credentials or Calendar ID missing. Skipping event creation.');
      return null;
    }

    // Fix quotes and escaped line breaks if private key is passed in single-line or wrapped format
    privateKey = privateKey.trim();
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
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

    console.log('[Google Calendar Success] Event created:', response.data.htmlLink, 'Event ID:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('[Google Calendar Error] Failed to create event:', error);
    return null;
  }
}

/**
 * Deletes an event from the Barber's Google Calendar using its Event ID or by searching date/client details.
 */
export async function deleteGoogleCalendarEvent(
  target:
    | string
    | {
        gcalEventId?: string;
        date?: string;
        time?: string;
        clientEmail?: string;
        clientName?: string;
      }
) {
  const gcalEventId = typeof target === 'string' ? target : target?.gcalEventId;
  const date = typeof target === 'object' ? target?.date : undefined;
  const time = typeof target === 'object' ? target?.time : undefined;
  const clientEmail = typeof target === 'object' ? target?.clientEmail : undefined;
  const clientName = typeof target === 'object' ? target?.clientName : undefined;

  if (!gcalEventId && !date) {
    console.warn('[Google Calendar Warning] Neither eventId nor date provided for deletion.');
    return false;
  }

  try {
    const settings = await getSettingsMap();

    const calendarId = process.env.GOOGLE_CALENDAR_ID || settings['google_calendar_id'] || 'primary';
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || settings['google_service_account_email'];
    let privateKey = process.env.GOOGLE_PRIVATE_KEY || settings['google_private_key'];

    if (!calendarId || !serviceAccountEmail || !privateKey) {
      console.warn('[Google Calendar Warning] Service account credentials missing. Cannot delete event.');
      return false;
    }

    privateKey = privateKey.trim();
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Method 1: Delete by exact eventId if available
    if (gcalEventId) {
      try {
        await calendar.events.delete({
          calendarId,
          eventId: gcalEventId,
        });
        console.log('[Google Calendar Success] Event deleted by ID:', gcalEventId);
        return true;
      } catch (err: any) {
        console.warn('[Google Calendar Warning] Direct delete by ID failed, trying search fallback:', err?.message || err);
      }
    }

    // Method 2: Search for event on that date and delete matching event
    if (date) {
      const timeMin = new Date(`${date}T00:00:00Z`).toISOString();
      const timeMax = new Date(`${date}T23:59:59Z`).toISOString();

      const listRes = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
      });

      const events = listRes.data.items || [];
      console.log(`[Google Calendar Search] Found ${events.length} events on ${date}`);

      for (const event of events) {
        if (!event.id) continue;
        let isMatch = false;

        if (clientName && (event.summary?.includes(clientName) || event.description?.includes(clientName))) {
          isMatch = true;
        }
        if (clientEmail && (event.description?.includes(clientEmail) || event.summary?.includes(clientEmail))) {
          isMatch = true;
        }
        if (time && event.start?.dateTime) {
          const eventTime = new Date(event.start.dateTime).toTimeString().substring(0, 5);
          if (eventTime === time.substring(0, 5)) {
            isMatch = true;
          }
        }

        if (isMatch || events.length === 1) {
          await calendar.events.delete({
            calendarId,
            eventId: event.id,
          });
          console.log('[Google Calendar Success] Event deleted via search fallback:', event.id, event.summary);
          return true;
        }
      }
    }

    return false;
  } catch (error: any) {
    console.error('[Google Calendar Error] Failed to delete event:', error?.message || error);
    return false;
  }
}
