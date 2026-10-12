import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PlantAidLogo } from './PlantAidLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-transparent text-slate-600 text-sm pt-6 pb-24 md:py-8 border-t border-slate-300/40 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        <PlantAidLogo size="sm" showSubtitle={false} />
        <div className="glass-frost-pill inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-slate-700 text-xs font-medium select-none">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>&copy; {new Date().getFullYear()} GroundNut-Aid. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};
