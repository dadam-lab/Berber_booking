import { CmsConfig } from '@/lib/types';

/**
 * Hlavní statická konfigurace webu a barbershopu.
 * Zde můžete kdykoliv přímo upravit texty, kontakty, otevírací dobu i fotky.
 */
export const SITE_CONFIG: CmsConfig = {
  shopName: "SW-BarberShop",
  tagline: "Tradiční řemeslo & Moderní styl",
  heroHeadline: "Exkluzivní péče o váš střih a vousy",
  heroSubheadline: "rezervujte službu a vyhovující termín během 1 minuty.",
  
  aboutTitle: "O mně",
  aboutText: "",
  aboutFeature1Title: "",
  aboutFeature1Text: "",
  aboutFeature2Title: "",
  aboutFeature2Text: "",
  aboutFeature3Title: "",
  aboutFeature3Text: "",

  ownerName: "Vít Sucharda",
  ownerTitle: "Zakladatel a barber",
  ownerPhotoUrl: "/barber-owner.jpg",
  logoUrl: "/logo.png",

  primaryColor: "#FFFFFF",
  secondaryColor: "#10B981",
  fontFamily: "Outfit",
  headingFontFamily: "Georgia",

  address: "Chrudimská 3",
  city: "Vrdy, Dolní Bučice",
  postalCode: "285 71",
  phone: "606 586 958",
  email: "rezervace.swbarbershop@gmail.com",
  contactDescription: "Studio se nachází ve vysokém šedivém domě s nápisem \"Masáže\" hned za hlavním vchodem. Zaparkovat můžete hned naproti vstupu do studia, nebo dál u autobusové zastávky.",
  googleMapsUrl: "https://www.google.com/maps/place/Chrudimsk%C3%A1+3,+285+71+Vrdy-Doln%C3%AD+Bu%C4%8Dice/@49.9252027,15.4599342,17z/data=!3m1!4b1!4m6!3m5!1s0x470c488d1ad2afb7:0x9b8d24072749c0a3!8m2!3d49.9251993!4d15.4625091!16s%2Fg%2F11csgh0c15?entry=ttu&g_ep=EgoyMDI2MDcyNy4wIKXMDSoASAFQAw%3D%3D",

  instagramUrl: "https://www.instagram.com/vit_sucharda/",
  facebookUrl: "https://facebook.com",
  personalInstagramUrl: "https://www.instagram.com/viit_sucharda/",
  instagramEnabled: true,
  facebookEnabled: true,
  personalInstagramEnabled: true,

  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUser: "rezervace.swbarbershop@gmail.com",
  smtpEmailSender: "rezervace.swbarbershop@gmail.com",
  emailUser: "rezervace.swbarbershop@gmail.com",
  emailAppPassword: "wxgc kyxf diyn ifeu",
  emailNotificationsEnabled: true,
  barberCalendarEmail: "rezervace.swbarbershop@gmail.com",
  googleCalendarId: "rezervace.swbarbershop@gmail.com",
  googleServiceAccountEmail: "",
  googlePrivateKey: "",
  googleCalendarSyncEnabled: true,
  barberCalendarIcalUrl: "",

  schedules: [
    { dayOfWeek: 1, dayName: 'Pondělí', isOpen: true, openTime: '09:00', closeTime: '19:00' },
    { dayOfWeek: 2, dayName: 'Úterý', isOpen: true, openTime: '09:00', closeTime: '19:00' },
    { dayOfWeek: 3, dayName: 'Středa', isOpen: true, openTime: '09:00', closeTime: '19:00' },
    { dayOfWeek: 4, dayName: 'Čtvrtek', isOpen: true, openTime: '09:00', closeTime: '20:00' },
    { dayOfWeek: 5, dayName: 'Pátek', isOpen: true, openTime: '09:00', closeTime: '20:00' },
    { dayOfWeek: 6, dayName: 'Sobota', isOpen: true, openTime: '10:00', closeTime: '17:00' },
    { dayOfWeek: 0, dayName: 'Neděle', isOpen: false, openTime: '10:00', closeTime: '15:00' },
  ],
  blockedDays: [],
  dateSchedules: [],
};

import { Service } from '@/lib/types';

export const DEFAULT_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'Klasický střih',
    description: 'Mytí, střih nůžkami i strojkem, úprava obočí, kontur a úprava vlasů stylingovým produktem.',
    price: 550,
    durationMinutes: 45,
    active: true,
    category: 'Střihy',
  },
  {
    id: 'srv-2',
    name: 'Úprava vousů Hot Towel',
    description: 'Tradiční holení břitvou s napářkou horkým ručníkem, vytvarování a ošetření olejem.',
    price: 400,
    durationMinutes: 30,
    active: true,
    category: 'Vousy',
  },
  {
    id: 'srv-3',
    name: 'VIP Kompletní balíček',
    description: 'Kombinace střihu vlasů, úpravy vousů horkým ručníkem, depilace voskem a masáže hlavy.',
    price: 850,
    durationMinutes: 60,
    badge: 'Nejoblíbenější',
    active: true,
    category: 'Kombo',
  },
  {
    id: 'srv-4',
    name: 'Juniorský střih (do 15 let)',
    description: 'Moderní dětský střih přizpůsobený přání zákazníka.',
    price: 400,
    durationMinutes: 30,
    active: true,
    category: 'Střihy',
  },
];
