import React, { Suspense } from 'react';
import { getServices, getReservations } from '@/lib/data';
import ClientHome from '@/components/ClientHome';
import { GallerySectionServer } from '@/components/GallerySectionServer';
import { GallerySkeleton } from '@/components/skeletons';

// Vynutit dynamicke renderovani pri kazdem requestu — zadna cache
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Paralelni nacteni sluzeb a rezervaci primo ze Supabase
  const [initialServices, initialReservations] = await Promise.all([
    getServices(),
    getReservations(),
  ]);

  return (
    <ClientHome
      initialServices={initialServices}
      initialReservations={initialReservations}
      gallerySlot={
        <Suspense fallback={<GallerySkeleton />}>
          {/* GallerySectionServer je async Server Component —
              Next.js ji streamuje az bude ready, mezitim ukazuje skeleton */}
          <GallerySectionServer />
        </Suspense>
      }
    />
  );
}
