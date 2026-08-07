import React, { Suspense } from 'react';
import { getCachedSettings, getCachedServices, getReservationsData } from '@/lib/data';
import ClientHome from '@/components/ClientHome';
import { GallerySectionServer } from '@/components/GallerySectionServer';
import { GallerySkeleton } from '@/components/skeletons';

// Cache stranky s revalidaci kazdou hodinu (3600s)
export const revalidate = 3600;

export default async function Home() {
  // Paralelni nacteni mezipameti z Next.js Data Cache (rychlost v radu ~1-5ms)
  const [initialSettings, initialServices, initialReservations] = await Promise.all([
    getCachedSettings(),
    getCachedServices(),
    getReservationsData(),
  ]);

  return (
    <ClientHome
      initialSettings={initialSettings}
      initialServices={initialServices}
      initialReservations={initialReservations}
      gallerySlot={
        <Suspense fallback={<GallerySkeleton />}>
          <GallerySectionServer />
        </Suspense>
      }
    />
  );
}
