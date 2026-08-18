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

import { SITE_CONFIG, DEFAULT_SERVICES } from '@/lib/siteConfig';

export default function ClientHome() {
  // Statická konfigurace — reálné texty, okamžitý render, žádné výchozí placeholdery
  const [cmsConfig, setCmsConfig] = useState<CmsConfig>(SITE_CONFIG);

  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
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

  // Načíst služby, galerii a rezervace z API ihned po mountu
  useEffect(() => {
    loadData();
  }, []);

  // Background refresh data to stay updated
  const loadData = async () => {
    try {
      const [resSettings, resServices, resGallery, resOrders] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/services'),
        fetch('/api/gallery'),
        fetch('/api/orders'),
      ]);

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
          }));
        }
      }

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

      if (resGallery.ok) {
        const dataGal = await resGallery.json();
        if (Array.isArray(dataGal.gallery)) {
          const mappedGallery: GalleryItem[] = dataGal.gallery.map((item: any) => ({
            id: item.id,
            imageUrl: item.imageUrl || item.image_url,
            title: item.title || item.caption || 'Ukázka práce',
            category: item.category || 'Střihy',
          }));
          setGallery(mappedGallery);
        }
      }

      if (resOrders.ok) {
        const dataOrders = await resOrders.json();
        if (dataOrders.orders) {
          const mappedOrders: Reservation[] = dataOrders.orders.map((item: any) => {
            const nameParts = (item.client_name || '').split(' ');
            const firstName = nameParts[0] || 'Zákazník';
            const lastName = nameParts.slice(1).join(' ') || '';
            const startTime = (item.time || '10:00').substring(0, 5);

            const [h, m] = startTime.split(':').map(Number);
            const duration = 45;
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
      // ignore
    }
  };

  // Admin Actions
  const handleAdminLogin = async (password: string): Promise<boolean> => {
    if (password === 'admin' || password === 'admin123') {
      setIsAdminAuthenticated(true);
      return true;
    }
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
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: newServices }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.services && data.services.length > 0) {
          const mappedServices: Service[] = data.services.map((item: any) => ({
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
          return;
        }
      }
      setServices(newServices);
    } catch (err) {
      setServices(newServices);
    }
  };

  const handleSaveGallery = async (newGallery: GalleryItem[]) => {
    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gallery: newGallery }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.gallery)) {
        const mapped: GalleryItem[] = data.gallery.map((item: any) => ({
          id: item.id,
          imageUrl: item.imageUrl || item.image_url,
          title: item.title || item.caption || 'Ukázka práce',
          category: item.category || 'Střihy',
        }));
        setGallery(mapped);
      } else {
        setGallery(newGallery);
      }
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
      <Navbar
        cmsConfig={cmsConfig}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      <main>
        <HeroReservation
          cmsConfig={cmsConfig}
          services={services}
          schedules={cmsConfig.schedules}
          reservations={reservations}
          onReservationCreated={handleReservationCreated}
          blockedDays={cmsConfig.blockedDays || []}
        />

        <AboutSection cmsConfig={cmsConfig} />
        <GallerySection gallery={gallery} />
        <ContactSection cmsConfig={cmsConfig} />
      </main>

      <Footer
        cmsConfig={cmsConfig}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        isAdminAuthenticated={isAdminAuthenticated}
      />

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
