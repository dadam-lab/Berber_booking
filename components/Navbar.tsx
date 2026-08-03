import React from 'react';
import { Scissors, CalendarCheck } from 'lucide-react';
import { CmsConfig } from '@/lib/types';

interface NavbarProps {
  cmsConfig: CmsConfig;
  onOpenAdmin: () => void;
  isAdminAuthenticated: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  cmsConfig,
  onOpenAdmin,
  isAdminAuthenticated,
}) => {
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 transition-colors duration-300 backdrop-blur-md bg-zinc-950/90 light:bg-white/90 border-b border-zinc-800/80 light:border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-2.5 sm:gap-3 text-left group cursor-pointer"
        >
          {cmsConfig.logoUrl ? (
            <img
              src={cmsConfig.logoUrl}
              alt="Logo"
              className="h-8 sm:h-10 w-auto rounded object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 sm:w-6 sm:h-6 rotate-45" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-sm sm:text-lg tracking-wider text-white light:text-zinc-900 group-hover:text-zinc-200 transition-colors uppercase">
              {cmsConfig.shopName}
            </h1>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-medium tracking-widest uppercase hidden sm:block">
              {cmsConfig.city}
            </p>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300 light:text-zinc-700">
          <button
            onClick={() => scrollToSection('rezervace')}
            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <CalendarCheck className="w-4 h-4 text-white" />
            Rezervace
          </button>
          <button
            onClick={() => scrollToSection('o-mne')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            O mně
          </button>
          <button
            onClick={() => scrollToSection('galerie')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Galerie
          </button>
          <button
            onClick={() => scrollToSection('kontakt')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Kontakt
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Reserve CTA (Visible on both mobile & desktop) */}
          <button
            onClick={() => scrollToSection('rezervace')}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
          >
            Rezervovat
          </button>
        </div>
      </div>
    </header>
  );
};
