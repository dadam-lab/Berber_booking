import React from 'react';
import { Instagram } from 'lucide-react';
import { CmsConfig } from '@/lib/types';

interface AboutSectionProps {
  cmsConfig: CmsConfig;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ cmsConfig }) => {
  return (
    <section id="o-mne" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-800/60 light:border-zinc-200">
      <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
        
        {/* Photo Card Centered */}
        <div className="w-full relative">
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 light:border-zinc-300 shadow-2xl group">
            <img
              src={cmsConfig.ownerPhotoUrl}
              alt={cmsConfig.ownerName}
              className="w-full h-[480px] object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-85" />

            {/* Overlay badge with Name and Title */}
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl backdrop-blur-md bg-zinc-900/80 border border-zinc-700/80 text-center">
              <h4 className="text-xl font-bold text-zinc-100">{cmsConfig.ownerName}</h4>
              <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider mt-1">{cmsConfig.ownerTitle}</p>
            </div>
          </div>

          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Instagram Links Under Photo */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          {cmsConfig.instagramEnabled !== false && cmsConfig.instagramUrl && (
            <a
              href={cmsConfig.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-amber-400 font-semibold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
            >
              <Instagram className="w-4 h-4 text-amber-500" />
              <span>Instagram Studia</span>
            </a>
          )}
          {cmsConfig.personalInstagramEnabled !== false && cmsConfig.personalInstagramUrl && (
            <a
              href={cmsConfig.personalInstagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-amber-400 font-semibold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
            >
              <Instagram className="w-4 h-4 text-amber-500" />
              <span>Osobní IG Barbera</span>
            </a>
          )}
        </div>

      </div>
    </section>
  );
};
