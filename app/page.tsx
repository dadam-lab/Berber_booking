import ClientHome from '@/components/ClientHome';
import { getServices, getGallery } from '@/lib/data';

export const revalidate = 0;

export default async function Home() {
  const [initialServices, initialGallery] = await Promise.all([
    getServices(),
    getGallery(),
  ]);

  return (
    <ClientHome
      initialServices={initialServices}
      initialGallery={initialGallery}
    />
  );
}
