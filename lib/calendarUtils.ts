import { DaySchedule, DateSchedule, Reservation } from './types';

const parseTime = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const formatMinutes = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const generateTimeSlots = (startTime?: string, endTime?: string, stepMins = 15): string[] => {
  if (!startTime || !endTime) return [];
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const slots: string[] = [];
  for (let mins = start; mins + stepMins <= end; mins += stepMins) {
    slots.push(formatMinutes(mins));
  }
  return slots;
};

export function getScheduleForDate(
  dateStr: string,
  schedules: DaySchedule[],
  dateSchedules: DateSchedule[] = []
): DaySchedule | DateSchedule | undefined {
  // 1. Check explicitly saved dates from dateSchedules (Supabase DB availability)
  const exact = dateSchedules.find((ds) => ds.date === dateStr);
  if (exact) return exact;

  // 2. Only fallback to weekly schedule template if dateSchedules is completely empty (unconfigured initial state)
  if (dateSchedules.length === 0 && schedules && Array.isArray(schedules) && schedules.length > 0) {
    const d = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon...
    const weekly = schedules.find((s) => s.dayOfWeek === dayOfWeek);
    if (weekly && weekly.isOpen !== false) {
      return weekly;
    }
  }

  return undefined;
}

/**
 * Format date YYYY-MM-DD
 */
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse HH:mm to total minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes from midnight to HH:mm string
 */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculates free start time slots for a specific date and service duration.
 */
const getScheduleTimeSlots = (schedule: DaySchedule | DateSchedule | undefined): string[] => {
  if (!schedule) return [];
  if (schedule.isVacation) return [];
  if ('allSlots' in schedule && Array.isArray((schedule as any).allSlots) && (schedule as any).allSlots.length > 0) {
    return (schedule as any).allSlots;
  }
  if ('timeSlots' in schedule && schedule.timeSlots && schedule.timeSlots.length > 0) return schedule.timeSlots;
  if ('openTime' in schedule && schedule.openTime && schedule.closeTime) {
    return generateTimeSlots(schedule.openTime, schedule.closeTime, 15);
  }
  return [];
};

export function calculateFreeSlots(
  dateStr: string,
  serviceDuration: number,
  schedule: DaySchedule | DateSchedule | undefined,
  existingReservations: Reservation[],
  slotStepMins: number = 15,
  blockedDays: string[] = []
): string[] {
  if (!schedule || blockedDays.includes(dateStr) || schedule.isVacation) {
    return [];
  }

  const candidateSlots = ('timeSlots' in schedule && Array.isArray((schedule as DateSchedule).timeSlots))
    ? (schedule as DateSchedule).timeSlots
    : getScheduleTimeSlots(schedule as DaySchedule);

  if (candidateSlots.length === 0) return [];

  const dayBookings = existingReservations.filter(
    (r) => r.date === dateStr && r.status !== 'cancelled'
  );

  const bookedRanges = dayBookings.map((r) => {
    const startMins = timeToMinutes(r.time);
    const endMins = r.endTime ? timeToMinutes(r.endTime) : startMins + (r.durationMinutes || 45);
    return { start: startMins, end: endMins };
  });

  return candidateSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot);
    const slotEnd = slotStart + serviceDuration;

    return !bookedRanges.some((range) => slotStart < range.end && slotEnd > range.start);
  });
}

/**
 * Calculates day capacity percentage and heatmap status for a given month
 */
export function calculateMonthHeatmap(
  year: number,
  month: number, // 0-indexed month (0 = Jan)
  schedules: DaySchedule[],
  existingReservations: Reservation[],
  defaultServiceDuration: number = 45,
  blockedDays: string[] = [],
  dateSchedules: DateSchedule[] = []
) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayISO = formatDateISO(new Date());

  const result: Record<
    string,
    {
      status: 'green' | 'orange' | 'red' | 'closed' | 'full' | 'past';
      bookedPercent: number;
      freeSlotsCount: number;
      isVacation?: boolean;
      isNoSlots?: boolean;
    }
  > = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateISO = formatDateISO(dateObj);

    const sched = getScheduleForDate(dateISO, schedules, dateSchedules);

    if (dateISO < todayISO) {
      result[dateISO] = { status: 'past', bookedPercent: 100, freeSlotsCount: 0 };
      continue;
    }

    if (blockedDays.includes(dateISO) || sched?.isVacation) {
      result[dateISO] = { status: 'closed', bookedPercent: 100, freeSlotsCount: 0, isVacation: true };
      continue;
    }

    const totalPossibleSlots = getScheduleTimeSlots(sched as DaySchedule).length;

    if (!sched || totalPossibleSlots === 0) {
      result[dateISO] = { status: 'closed', bookedPercent: 100, freeSlotsCount: 0, isNoSlots: true };
      continue;
    }

    const freeSlots = calculateFreeSlots(dateISO, defaultServiceDuration, sched as DaySchedule, existingReservations, 15, blockedDays);
    const bookedSlotsCount = Math.max(0, totalPossibleSlots - freeSlots.length);
    const bookedPercent = totalPossibleSlots === 0 ? 100 : Math.min(100, Math.round((bookedSlotsCount / totalPossibleSlots) * 100));

    let status: 'green' | 'orange' | 'red' | 'closed' | 'full' = 'green';

    if (freeSlots.length === 0) {
      status = 'full';
    } else if (freeSlots.length === 1) {
      status = 'red'; // Zbývá poslední 1 termín
    } else if (bookedPercent >= 50) {
      status = 'orange'; // Zabrána více než polovina (>= 50 %)
    } else {
      status = 'green'; // Zabrána méně než polovina (< 50 %)
    }

    result[dateISO] = {
      status,
      bookedPercent,
      freeSlotsCount: freeSlots.length,
    };
  }

  return result;
}

/**
 * Generate iCal (.ics string) for Apple Calendar / Outlook download
 */
export function generateICSContent(reservation: {
  id: string;
  serviceName: string;
  date: string;
  time: string;
  endTime: string;
  shopName: string;
  address: string;
  city: string;
  note?: string;
}): string {
  const startClean = `${reservation.date.replace(/-/g, '')}T${reservation.time.replace(':', '')}00`;
  const endClean = `${reservation.date.replace(/-/g, '')}T${reservation.endTime.replace(':', '')}00`;
  const nowClean = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Barber Studio//NONSGML v1.0//CS',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:res-${reservation.id}@barberstudio.cz`,
    `DTSTAMP:${nowClean}`,
    `DTSTART:${startClean}`,
    `DTEND:${endClean}`,
    `SUMMARY:Rezervace: ${reservation.serviceName} - ${reservation.shopName}`,
    `DESCRIPTION:Vaše rezervace v ${reservation.shopName}. Služba: ${reservation.serviceName}.${reservation.note ? ' Poznámka: ' + reservation.note : ''}`,
    `LOCATION:${reservation.address}, ${reservation.city}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generate Google Calendar Web Add URL
 */
export function generateGoogleCalendarUrl(reservation: {
  serviceName: string;
  date: string;
  time: string;
  endTime: string;
  shopName: string;
  address: string;
  city: string;
  note?: string;
}): string {
  const startISO = `${reservation.date.replace(/-/g, '')}T${reservation.time.replace(':', '')}00`;
  const endISO = `${reservation.date.replace(/-/g, '')}T${reservation.endTime.replace(':', '')}00`;

  const title = encodeURIComponent(`Rezervace Barbershop: ${reservation.serviceName}`);
  const details = encodeURIComponent(
    `Vaše schůzka v ${reservation.shopName}.\nSlužba: ${reservation.serviceName}\n${reservation.note ? 'Poznámka: ' + reservation.note : ''}`
  );
  const location = encodeURIComponent(`${reservation.address}, ${reservation.city}`);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=${location}`;
}
