import React, { Suspense } from 'react';
import { getCachedServices, getReservationsData } from '@/lib/data';
import ClientHome from '@/components/ClientHome';
import { GallerySectionServer } from '@/components/GallerySectionServer';
import { GallerySkeleton } from '@/components/skeletons';

// Staticka ISR revalidace stranky kazdou hodinu
export const revalidate = 3600;

export default async function Home() {
  // Paralelni nacteni sluzeb a rezervaci
  const [initialServices, initialReservations] = await Promise.all([
    getCachedServices(),
    getReservationsData(),
  ]);

  return (
    <ClientHome
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
