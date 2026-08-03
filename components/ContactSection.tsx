import React from 'react';
import { MapPin, Phone, Mail, ExternalLink } from 'lucide-react';
import { CmsConfig } from '@/lib/types';

interface ContactSectionProps {
  cmsConfig: CmsConfig;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ cmsConfig }) => {
  return (
    <section id="kontakt" className="py-16 sm:py-20 px-3 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-zinc-800/60 light:border-zinc-200">
      <div className="bg-zinc-900/90 light:bg-zinc-50 rounded-3xl border border-zinc-800 light:border-zinc-300 p-6 sm:p-12 shadow-2xl space-y-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold uppercase tracking-widest">
            <MapPin className="w-3.5 h-3.5" />
            <span>Kde mě najdete</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white light:text-zinc-900 tracking-tight">
            Kontakt & Adresa
          </h2>
          <p className="text-sm text-zinc-400 light:text-zinc-600 leading-relaxed">
            {cmsConfig.contactDescription}
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
          <div className="p-6 rounded-2xl bg-zinc-950/80 light:bg-zinc-100 border border-zinc-800 light:border-zinc-300 flex flex-col items-center text-center space-y-3 hover:border-white/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-zinc-500 light:text-zinc-600 mb-1">Adresa Studio</h4>
              <p className="text-base font-bold text-white light:text-zinc-900">{cmsConfig.address}</p>
              <p className="text-xs text-zinc-400 light:text-zinc-600">{cmsConfig.postalCode} {cmsConfig.city}</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-950/80 light:bg-zinc-100 border border-zinc-800 light:border-zinc-300 flex flex-col items-center text-center space-y-3 hover:border-white/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-zinc-500 light:text-zinc-600 mb-1">Telefon</h4>
              <a href={`tel:${cmsConfig.phone}`} className="text-base font-bold text-white hover:underline">
                {cmsConfig.phone}
              </a>
              <p className="text-xs text-zinc-500 mt-1">Po-Pá | 8:00 - 20:00</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-950/80 light:bg-zinc-100 border border-zinc-800 light:border-zinc-300 flex flex-col items-center text-center space-y-3 hover:border-white/40 transition-all">
            <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-zinc-500 light:text-zinc-600 mb-1">E-mail</h4>
              <a href={`mailto:${cmsConfig.email}`} className="text-base font-bold text-white hover:underline break-all">
                {cmsConfig.email}
              </a>
              <p className="text-xs text-zinc-500 mt-1">Odpovídáme v den přijetí</p>
            </div>
          </div>
        </div>

        {/* Map Button & Recommendation Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 pt-4 border-t border-zinc-800/60 light:border-zinc-200">
          <div className="text-xs text-zinc-300 font-medium flex items-center gap-2 bg-zinc-950 border border-zinc-800 px-4 py-3 rounded-xl w-full sm:w-auto">
            <span>💡 Doporučujeme rezervaci termínu předem přes rezervační formulář.</span>
          </div>

          <a
            href={cmsConfig.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm transition-all shadow-md w-full sm:w-auto shrink-0 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Navigovat v Google Mapách</span>
          </a>
        </div>

      </div>
    </section>
  );
};
