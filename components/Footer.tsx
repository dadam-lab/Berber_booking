import React from 'react';
import { Lock, Scissors } from 'lucide-react';
import { CmsConfig } from '@/lib/types';

interface FooterProps {
  cmsConfig: CmsConfig;
  onOpenAdmin: () => void;
  isAdminAuthenticated: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  cmsConfig,
  onOpenAdmin,
  isAdminAuthenticated,
}) => {
  return (
    <footer className="bg-zinc-950 light:bg-zinc-100 border-t border-zinc-900 light:border-zinc-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
            <Scissors className="w-4 h-4 rotate-45" />
          </div>
          <span className="font-bold text-sm text-zinc-300 light:text-zinc-700 tracking-wider uppercase">
            {cmsConfig.shopName}
          </span>
        </div>

        {/* Copyright */}
        <div className="text-xs text-zinc-500 text-center">
          © {new Date().getFullYear()} {cmsConfig.shopName}. Všechna práva vyhrazena.
        </div>

        {/* Visually blended / subtle hidden link for Admin Panel access */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAdmin}
            title="Správa systému (Admin CMS)"
            className={`text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isAdminAuthenticated
                ? 'text-white font-bold hover:underline'
                : 'text-zinc-700 light:text-zinc-300 hover:text-zinc-500'
            }`}
          >
            <Lock className="w-3.5 h-3.5 opacity-60 hover:opacity-100 transition-opacity" />
            <span className="opacity-60 hover:opacity-100">
              {isAdminAuthenticated ? 'Admin CMS Active' : 'Administrace'}
            </span>
          </button>
        </div>

      </div>
    </footer>
  );
};
