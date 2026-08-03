/**
 * Generates calendar URL links and .ics file strings for appointment integration.
 */

export interface CalendarEventData {
  title: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  durationMinutes: number;
}

function formatDateToICS(date: Date): string {
  return date
    .toISOString()
    .replace(/-|:|\.\d\d\d/g, '')
    .substring(0, 15) + 'Z';
}

/**
 * Generate Google Calendar Web URL
 */
export function getGoogleCalendarUrl(event: CalendarEventData): string {
  const start = new Date(`${event.startDate}T${event.startTime}:00`);
  const end = new Date(start.getTime() + event.durationMinutes * 60000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    details: event.description,
    location: event.location,
    dates: `${formatDateToICS(start)}/${formatDateToICS(end)}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Apple / Outlook web calendar URL or webcal protocol link
 */
export function getAppleCalendarUrl(event: CalendarEventData): string {
  const start = new Date(`${event.startDate}T${event.startTime}:00`);
  const end = new Date(start.getTime() + event.durationMinutes * 60000);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    body: event.description,
    location: event.location,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate raw .ics iCalendar file content string for download
 */
export function generateICSContent(event: CalendarEventData): string {
  const start = new Date(`${event.startDate}T${event.startTime}:00`);
  const end = new Date(start.getTime() + event.durationMinutes * 60000);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barber Studio//Booking System//CS',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:booking-${Date.now()}@barberstudio.cz`,
    `DTSTAMP:${formatDateToICS(new Date())}`,
    `DTSTART:${formatDateToICS(start)}`,
    `DTEND:${formatDateToICS(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
