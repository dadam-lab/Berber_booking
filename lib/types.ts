export interface Service {
  id: string;
  name: string;
  description: string;
  price: number; // in CZK
  durationMinutes: number; // e.g. 30, 45, 60, 90
  badge?: string; // e.g. "Nejoblíbenější", "Express", "VIP"
  active: boolean;
  category?: string;
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  dayName: string;
  isOpen?: boolean; // legacy fallback flag
  timeSlots?: string[]; // Explicit 15-minute start times for the day
  isVacation?: boolean; // If true, this day is closed for all reservations
  openTime?: string; // Optional fallback for legacy data
  closeTime?: string; // Optional fallback for legacy data
}

export interface DateSchedule {
  date: string; // YYYY-MM-DD
  timeSlots: string[];
  allSlots?: string[];
  isVacation?: boolean;
}

export interface Reservation {
  id: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (start time)
  endTime: string; // HH:mm
  firstName: string;
  lastName: string;
  email: string;
  note?: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
  reminderSent?: boolean;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  status: 'green' | 'yellow' | 'orange' | 'red' | 'closed' | 'full' | 'past';
  bookedPercent: number;
  freeSlotCount: number;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  timeSlots: string[];
}

export interface CmsConfig {
  shopName: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  aboutTitle: string;
  aboutText: string;
  aboutFeature1Title: string;
  aboutFeature1Text: string;
  aboutFeature2Title: string;
  aboutFeature2Text: string;
  aboutFeature3Title: string;
  aboutFeature3Text: string;
  ownerName: string;
  ownerTitle: string;
  ownerPhotoUrl: string;
  logoUrl?: string;
  primaryColor: string; // Hex e.g. #C9A050
  secondaryColor?: string; // Hex e.g. #10B981
  fontFamily: string; // 'Outfit', 'Montserrat', 'Inter'
  headingFontFamily?: string; // 'Georgia', 'Playfair Display', 'Cinzel', 'Cormorant Garamond'
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  contactDescription: string;
  googleMapsUrl: string;
  instagramUrl?: string;
  facebookUrl?: string;
  personalInstagramUrl?: string;
  instagramEnabled: boolean;
  facebookEnabled: boolean;
  personalInstagramEnabled?: boolean;
  
  // SMTP & Email settings
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpEmailSender: string;
  emailNotificationsEnabled: boolean;
  emailUser?: string;
  emailAppPassword?: string;
  
  // Barber Calendar sync
  barberCalendarEmail: string;
  googleCalendarSyncEnabled: boolean;
  barberCalendarIcalUrl?: string;
  googleCalendarId?: string;
  googleServiceAccountEmail?: string;
  googlePrivateKey?: string;

  // Working Hours & Blocked Vacation Days
  schedules: DaySchedule[];
  blockedDays?: string[]; // Array of YYYY-MM-DD dates marked as closed/vacation
  dateSchedules?: DateSchedule[];
  scheduleTemplates?: ScheduleTemplate[];
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string; // 'Cut', 'Beard', 'VIP', 'Style'
  imageUrl: string;
}

export interface AdminAuthState {
  isAuthenticated: boolean;
  token?: string;
}

