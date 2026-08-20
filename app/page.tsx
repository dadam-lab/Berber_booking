import ClientHome from '@/components/ClientHome';
import { getServices, getGallery, getSettings } from '@/lib/data';

export const revalidate = 0;

export default async function Home() {
  const [initialServices, initialGallery, initialSettings] = await Promise.all([
    getServices(),
    getGallery(),
    getSettings(),
  ]);

  return (
    <ClientHome
      initialServices={initialServices}
      initialGallery={initialGallery}
      initialSettings={initialSettings}
    />
  );
}
