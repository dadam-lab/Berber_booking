import React from 'react';
import { getGallery } from '@/lib/data';
import { GallerySection } from '@/components/GallerySection';

export async function GallerySectionServer() {
  const gallery = await getGallery();
  return <GallerySection gallery={gallery} />;
}
