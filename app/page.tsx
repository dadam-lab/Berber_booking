'use client';

import React, { useState, useEffect } from 'react';
import { CmsConfig, Service, GalleryItem, Reservation } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { HeroReservation } from '@/components/HeroReservation';
import { AboutSection } from '@/components/AboutSection';
import { GallerySection } from '@/components/GallerySection';
import { ContactSection } from '@/components/ContactSection';
import { Footer } from '@/components/Footer';
import { AdminModal } from '@/components/AdminModal';

const INITIAL_CMS_CONFIG: CmsConfig = {
  shopName: "BARBER STUDIO",
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
  ownerName: "Barber Studio",
  ownerTitle: "Zakladatel a barber",
  ownerPhotoUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=800",
  logoUrl: "",
  primaryColor: "#FFFFFF",
  secondaryColor: "#10B981",
  fontFamily: "Outfit",
  headingFontFamily: "Georgia",
  address: "Vodičkova 710/28",
  city: "Praha 1 - Nové Město",
  postalCode: "285 71",
  phone: "+420 777 888 999",
  email: "kasacekdadam@gmail.com",
  contactDescription: "Studio se nachází ve vysokém šedivém domě s nápisem \"Masáže\". Studio se nachází hned za hlavním vchodem. Zaparkovat můžete hned naproti vstupu do studia, nebo dál u autobusové zastávky.",
  googleMapsUrl: "https://maps.google.com/?q=Vodickova+28+Praha",
  instagramUrl: "https://instagram.com",
  facebookUrl: "https://facebook.com",
  personalInstagramUrl: "https://instagram.com",
  instagramEnabled: true,
  facebookEnabled: true,
  personalInstagramEnabled: true,
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUser: "kasacekdadam@gmail.com",
  smtpEmailSender: "kasacekdadam@gmail.com",
  emailUser: "kasacekdadam@gmail.com",
  emailAppPassword: "wxgc kyxf diyn ifeu",
  emailNotificationsEnabled: true,
  barberCalendarEmail: "kasacekdadam@gmail.com",
  googleCalendarId: "kasacekdadam@gmail.com",
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
  dateSchedules: []
};

const INITIAL_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'Master Haircut (Klasický střih)',
    description: 'Precizní pánský střih nůžkami i strojkem, úprava obočí, zaholení kontur břitvou a závěrečný styling.',
    price: 650,
    durationMinutes: 45,
    badge: 'Nejoblíbenější',
    active: true,
    category: 'Střihy'
  },
  {
    id: 'srv-2',
    name: 'Beard Trim & Sculpt (Úprava vousů)',
    description: 'Úprava délky a tvaru vousů, napaření horkým ručníkem (Hot Towel), zaholení břitvou a balzám na vousy.',
    price: 450,
    durationMinutes: 30,
    active: true,
    category: 'Vousy'
  },
  {
    id: 'srv-3',
    name: 'Gentleman Royal Combo (Střih + Vousy)',
    description: 'Kompletní péče pro muže: Master střih, péče o vousy s Hot Towel, masáž hlavy, káva / whisky a styling.',
    price: 990,
    durationMinutes: 75,
    badge: 'VIP Zážitek',
    active: true,
    category: 'Kombo'
  },
  {
    id: 'srv-4',
    name: 'Hot Towel Shave (Tradiční holení břitvou)',
    description: 'Rituální holení hlavy nebo tváře s napářkou horkým ručníkem, hustou pěnou a ošetřením kolínskou.',
    price: 500,
    durationMinutes: 40,
    active: true,
    category: 'Vousy'
  },
  {
    id: 'srv-5',
    name: 'Junior Cut (Dětský střih do 12 let)',
    description: 'Trpělivý a stylový střih pro mladé džentlmeny včetně lehké úpravy a dětského nápoje.',
    price: 450,
    durationMinutes: 30,
    active: true,
    category: 'Střihy'
  }
];

const INITIAL_GALLERY: GalleryItem[] = [
  {
    id: 'gal-1',
    title: 'Textured Crop Fade',
    category: 'Střihy',
    imageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'gal-2',
    title: 'Beard Sculpting & Hot Towel',
    category: 'Vousy',
    imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'gal-3',
    title: 'Classic Pompadour Shave',
    category: 'Střihy',
    imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'gal-4',
    title: 'Gentleman Hair Styling',
    category: 'Péče',
    imageUrl: 'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'gal-5',
    title: 'Sharp Contour Razor Work',
    category: 'Vousy',
    imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'gal-6',
    title: 'Barbershop Atmosphere',
    category: 'Interiér',
    imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=800'
  }
];

export default function Home() {
  // App Data State
  const [cmsConfig, setCmsConfig] = useState<CmsConfig>(INITIAL_CMS_CONFIG);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [gallery, setGallery] = useState<GalleryItem[]>(INITIAL_GALLERY);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  // Admin Modal & Auth State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Dynamic CSS variables & Theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');

    if (cmsConfig.primaryColor) {
      root.style.setProperty('--primary-color', cmsConfig.primaryColor);
    }
    if (cmsConfig.secondaryColor) {
      root.style.setProperty('--secondary-color', cmsConfig.secondaryColor);
    }
  }, [cmsConfig]);

  // Initial Data Fetching from Supabase API endpoints (Parallelized via Promise.all)
  const loadData = async () => {
    try {
      const [resSettings, resServices, resGallery, resOrders] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/services'),
        fetch('/api/gallery'),
        fetch('/api/orders'),
      ]);

      // 1. Settings
      if (resSettings.ok) {
        const dataS = await resSettings.json();
        if (dataS.settings) {
          const s = dataS.settings;
          setCmsConfig((prev) => ({
            ...prev,
            shopName: s.shop_name || s.barber_name || prev.shopName,
            tagline: s.tagline || prev.tagline,
            heroHeadline: s.hero_headline || prev.heroHeadline,
            heroSubheadline: s.hero_subheadline || prev.heroSubheadline,
            aboutTitle: s.about_title || prev.aboutTitle,
            aboutText: s.about_text || s.barber_bio || prev.aboutText,
            ownerName: s.owner_name || s.barber_name || prev.ownerName,
            ownerTitle: s.owner_title || s.barber_role || prev.ownerTitle,
            ownerPhotoUrl: s.owner_photo_url || s.barber_avatar || prev.ownerPhotoUrl,
            logoUrl: s.logo_url !== undefined ? s.logo_url : prev.logoUrl,
            phone: s.contact_phone || prev.phone,
            email: s.contact_email || prev.email,
            address: s.contact_address || prev.address,
            city: s.city || prev.city,
            postalCode: s.postal_code || prev.postalCode,
            contactDescription: s.contact_description || prev.contactDescription,
            googleMapsUrl: s.google_maps_url || s.google_maps_iframe || prev.googleMapsUrl,
            instagramUrl: s.instagram_url !== undefined ? s.instagram_url : prev.instagramUrl,
            personalInstagramUrl: s.personal_instagram_url !== undefined ? s.personal_instagram_url : prev.personalInstagramUrl,
            instagramEnabled: s.instagram_enabled !== undefined ? s.instagram_enabled === 'true' : prev.instagramEnabled,
            personalInstagramEnabled: s.personal_instagram_enabled !== undefined ? s.personal_instagram_enabled === 'true' : prev.personalInstagramEnabled,
            primaryColor: s.primary_color || prev.primaryColor,
            secondaryColor: s.secondary_color || prev.secondaryColor,
            scheduleTemplates: s.schedule_templates ? (() => {
              try { return JSON.parse(s.schedule_templates); } catch (e) { return prev.scheduleTemplates; }
            })() : prev.scheduleTemplates,
          }));
        }
      }

      // 2. Services
      if (resServices.ok) {
        const dataServ = await resServices.json();
        if (dataServ.services && dataServ.services.length > 0) {
          const mappedServices: Service[] = dataServ.services.map((item: any) => ({
            id: item.id,
            name: item.title,
            description: item.description || '',
            price: Number(item.price),
            durationMinutes: item.duration_minutes || 30,
            active: item.is_active ?? true,
            badge: item.badge || undefined,
            category: item.category || 'Střihy',
          }));
          setServices(mappedServices);
        }
      }

      // 3. Gallery
      if (resGallery.ok) {
        const dataGal = await resGallery.json();
        if (dataGal.gallery && dataGal.gallery.length > 0) {
          const mappedGallery: GalleryItem[] = dataGal.gallery.map((item: any) => ({
            id: item.id,
            imageUrl: item.image_url,
            title: item.caption || 'Ukázka práce',
            category: item.category || 'Střihy',
          }));
          setGallery(mappedGallery);
        }
      }

      // 4. Orders / Reservations
      if (resOrders.ok) {
        const dataOrders = await resOrders.json();
        if (dataOrders.orders) {
          const mappedOrders: Reservation[] = dataOrders.orders.map((item: any) => {
            const nameParts = (item.client_name || '').split(' ');
            const firstName = nameParts[0] || 'Zákazník';
            const lastName = nameParts.slice(1).join(' ') || '';
            const startTime = (item.time || '10:00').substring(0, 5);

            // Calculate end time
            const [h, m] = startTime.split(':').map(Number);
            const duration = 45; // default
            const totalMins = h * 60 + m + duration;
            const endH = Math.floor(totalMins / 60);
            const endM = totalMins % 60;
            const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

            return {
              id: item.id,
              serviceId: item.service_id,
              serviceName: item.service_title,
              servicePrice: Number(item.service_price),
              durationMinutes: duration,
              date: item.date,
              time: startTime,
              endTime: endTimeStr,
              firstName,
              lastName,
              email: item.client_email,
              note: item.note,
              status: item.status || 'confirmed',
              createdAt: item.created_at,
            };
          });
          setReservations(mappedOrders);
        }
      }
    } catch (err) {
      console.log('Using local fallback state:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Admin Actions
  const handleAdminLogin = async (password: string): Promise<boolean> => {
    if (password === 'admin' || password === 'admin123') {
      setIsAdminAuthenticated(true);
      return true;
    }
    // Check against settings table
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const serverPass = data.settings?.admin_password || 'admin';
        if (password === serverPass) {
          setIsAdminAuthenticated(true);
          return true;
        }
      }
    } catch (err) {
      // ignore
    }
    return false;
  };

  const handleSaveCms = async (updatedConfig: Partial<CmsConfig>, newAdminPassword?: string) => {
    try {
      const merged = { ...cmsConfig, ...updatedConfig };
      const settingsPayload: Record<string, string> = {
        shop_name: merged.shopName || '',
        tagline: merged.tagline || '',
        hero_headline: merged.heroHeadline || '',
        hero_subheadline: merged.heroSubheadline || '',
        about_title: merged.aboutTitle || '',
        about_text: merged.aboutText || '',
        owner_name: merged.ownerName || '',
        owner_title: merged.ownerTitle || '',
        owner_photo_url: merged.ownerPhotoUrl || '',
        logo_url: merged.logoUrl || '',
        contact_phone: merged.phone || '',
        contact_email: merged.email || '',
        contact_address: merged.address || '',
        city: merged.city || '',
        postal_code: merged.postalCode || '',
        contact_description: merged.contactDescription || '',
        google_maps_url: merged.googleMapsUrl || '',
        instagram_url: merged.instagramUrl || '',
        personal_instagram_url: merged.personalInstagramUrl || '',
        instagram_enabled: String(merged.instagramEnabled ?? true),
        personal_instagram_enabled: String(merged.personalInstagramEnabled ?? true),
        primary_color: merged.primaryColor || '#FFFFFF',
        secondary_color: merged.secondaryColor || '#10B981',
      };

      if (updatedConfig.scheduleTemplates !== undefined) {
        settingsPayload.schedule_templates = JSON.stringify(updatedConfig.scheduleTemplates);
      }

      if (newAdminPassword) {
        settingsPayload.admin_password = newAdminPassword;
      }

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsPayload }),
      });

      setCmsConfig((prev) => ({ ...prev, ...updatedConfig }));
    } catch (err) {
      setCmsConfig((prev) => ({ ...prev, ...updatedConfig }));
    }
  };

  const handleSaveServices = async (newServices: Service[]) => {
    try {
      for (const srv of newServices) {
        await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: srv.name,
            description: srv.description,
            price: srv.price,
            duration_minutes: srv.durationMinutes,
            is_active: srv.active,
          }),
        });
      }
      setServices(newServices);
    } catch (err) {
      setServices(newServices);
    }
  };

  const handleSaveGallery = async (newGallery: GalleryItem[]) => {
    try {
      await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gallery: newGallery }),
      });
      setGallery(newGallery);
    } catch (err) {
      setGallery(newGallery);
    }
  };

  const handleUpdateReservationStatus = async (id: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    }
  };

  const handleDeleteReservation = async (id: string) => {
    try {
      await fetch(`/api/orders?id=${id}`, { method: 'DELETE' });
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setReservations((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleReservationCreated = (newRes: Reservation) => {
    setReservations((prev) => [newRes, ...prev]);
  };

  return (
    <div className="min-h-screen transition-colors duration-300 font-sans bg-zinc-950 text-zinc-100">
      {/* Header Navbar */}
      <Navbar
        cmsConfig={cmsConfig}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Main Single-Page Content */}
      <main>
        {/* Multi-step Hero Reservation Section */}
        <HeroReservation
          cmsConfig={cmsConfig}
          services={services}
          schedules={cmsConfig.schedules}
          reservations={reservations}
          onReservationCreated={handleReservationCreated}
          blockedDays={cmsConfig.blockedDays || []}
        />

        {/* Scrollable Sections */}
        <AboutSection cmsConfig={cmsConfig} />
        <GallerySection gallery={gallery} />
        <ContactSection cmsConfig={cmsConfig} />
      </main>

      {/* Footer with hidden Admin link */}
      <Footer
        cmsConfig={cmsConfig}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Integrated Admin & CMS Modal */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        cmsConfig={cmsConfig}
        services={services}
        gallery={gallery}
        reservations={reservations}
        isAuthenticated={isAdminAuthenticated}
        onLogin={handleAdminLogin}
        onSaveCms={handleSaveCms}
        onSaveServices={handleSaveServices}
        onSaveGallery={handleSaveGallery}
        onUpdateReservationStatus={handleUpdateReservationStatus}
        onDeleteReservation={handleDeleteReservation}
        onRefreshData={loadData}
      />
    </div>
  );
}
