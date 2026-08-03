import React, { useState } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { GalleryItem } from '@/lib/types';

interface GallerySectionProps {
  gallery: GalleryItem[];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ gallery }) => {
  const [activeModalImage, setActiveModalImage] = useState<GalleryItem | null>(null);

  return (
    <section id="galerie" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-800/60 light:border-zinc-200">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white light:text-zinc-900 tracking-tight">
          Galerie a střihy
        </h2>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {gallery.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveModalImage(item)}
            className="group relative rounded-2xl overflow-hidden border border-zinc-800 light:border-zinc-300 bg-zinc-900 cursor-pointer shadow-lg"
          >
            <div className="aspect-[4/3] w-full overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-0 group-hover:opacity-90 transition-opacity flex flex-col justify-end p-5">
              <span className="text-[10px] font-extrabold text-white uppercase tracking-widest mb-1">
                {item.category}
              </span>
              <h4 className="text-base font-bold text-white">{item.title}</h4>
              <div className="mt-2 text-xs text-zinc-200 flex items-center gap-1 font-medium">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Zobrazit detail</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Image Modal */}
      {activeModalImage && (
        <div
          onClick={() => setActiveModalImage(null)}
          className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl"
          >
            <button
              onClick={() => setActiveModalImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-950/80 text-zinc-300 hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <img
              src={activeModalImage.imageUrl}
              alt={activeModalImage.title}
              className="w-full max-h-[75vh] object-contain bg-zinc-950"
              referrerPolicy="no-referrer"
            />

            <div className="p-6 bg-zinc-900 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                  {activeModalImage.category}
                </span>
                <h3 className="text-lg font-bold text-zinc-100">{activeModalImage.title}</h3>
              </div>
              <button
                onClick={() => setActiveModalImage(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-bold"
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
