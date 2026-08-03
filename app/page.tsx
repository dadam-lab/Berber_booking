import React from 'react';
import { getSettingsMap, supabaseAdmin } from '@/lib/supabase';
import { Service, GalleryItem, Reservation } from '@/lib/types';
import ClientHome from '@/components/ClientHome';

export const dynamic = 'force-dynamic';
export const revalidate = 5; // Revalidate static edge cache every 5s for 30ms mobile load speed

export default async function Home() {
  let initialSettings: Record<string, string> = {};
  let initialServices: Service[] = [];
  let initialGallery: GalleryItem[] = [];
  let initialReservations: Reservation[] = [];

  try {
    const [settingsMap, { data: dbServices }, { data: dbGallery }, { data: dbOrders }] = await Promise.all([
      getSettingsMap(),
      supabaseAdmin.from('services').select('*').order('created_at', { ascending: true }),
      supabaseAdmin.from('gallery').select('*').order('order_index', { ascending: true }),
      supabaseAdmin.from('orders').select('*').order('date', { ascending: false }),
    ]);

    initialSettings = settingsMap || {};

    if (dbServices && dbServices.length > 0) {
      initialServices = dbServices.map((item: any) => ({
        id: item.id,
        name: item.title,
        description: item.description || '',
        price: Number(item.price),
        durationMinutes: item.duration_minutes || 30,
        active: item.is_active ?? true,
        badge: item.badge || undefined,
        category: item.category || 'Střihy',
      }));
    }

    if (dbGallery && dbGallery.length > 0) {
      initialGallery = dbGallery.map((item: any) => ({
        id: item.id,
        imageUrl: item.image_url,
        title: item.caption || 'Ukázka práce',
        category: item.category || 'Střihy',
      }));
    }

    if (dbOrders && dbOrders.length > 0) {
      initialReservations = dbOrders.map((item: any) => {
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
    }
  } catch (err) {
    console.error('[SSR Data Fetch Error]:', err);
  }

  return (
    <ClientHome
      initialSettings={initialSettings}
      initialServices={initialServices}
      initialGallery={initialGallery}
      initialReservations={initialReservations}
    />
  );
}
