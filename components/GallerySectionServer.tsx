import React from 'react';
import { getCachedGallery } from '@/lib/data';
import { GallerySection } from '@/components/GallerySection';

export async function GallerySectionServer() {
  const gallery = await getCachedGallery();
  return <GallerySection gallery={gallery} />;
}
