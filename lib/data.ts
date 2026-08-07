import { getSettingsMap, supabaseAdmin } from '@/lib/supabase';
import { Service, GalleryItem, Reservation } from '@/lib/types';

/**
 * Načte nastavení CMS z Supabase — vždy čerstvá data, bez cache.
 */
export async function getSettings(): Promise<Record<string, string>> {
  return await getSettingsMap();
}

/**
 * Načte seznam služeb — vždy čerstvá data, bez cache.
 */
export async function getServices(): Promise<Service[]> {
  try {
    const { data: dbServices, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !dbServices) return [];

    return dbServices.map((item: any) => ({
      id: item.id,
      name: item.title,
      description: item.description || '',
      price: Number(item.price),
      durationMinutes: item.duration_minutes || 30,
      active: item.is_active ?? true,
      badge: item.badge || undefined,
      category: item.category || 'Střihy',
    }));
  } catch (err) {
    console.error('[getServices Error]:', err);
    return [];
  }
}

/**
 * Načte položky galerie — vždy čerstvá data, bez cache.
 */
export async function getGallery(): Promise<GalleryItem[]> {
  try {
    const { data: dbGallery, error } = await supabaseAdmin
      .from('gallery')
      .select('*')
      .order('order_index', { ascending: true });

    if (error || !dbGallery) return [];

    return dbGallery.map((item: any) => ({
      id: item.id,
      imageUrl: item.image_url,
      title: item.caption || 'Ukázka práce',
      category: item.category || 'Střihy',
    }));
  } catch (err) {
    console.error('[getGallery Error]:', err);
    return [];
  }
}

/**
 * Načte rezervace — vždy čerstvá data, bez cache.
 */
export async function getReservations(): Promise<Reservation[]> {
  try {
    const { data: dbOrders, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('date', { ascending: false });

    if (error || !dbOrders) return [];

    return dbOrders.map((item: any) => {
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
  } catch (err) {
    console.error('[getReservations Error]:', err);
    return [];
  }
}
