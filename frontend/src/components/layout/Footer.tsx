import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { PlantAidLogo } from './PlantAidLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-transparent text-slate-600 text-sm py-8 border-t border-slate-300/40 relative z-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <PlantAidLogo size="sm" showSubtitle={false} />
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 flex">
        <div className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white/70 backdrop-blur-md border border-emerald-950/10 shadow-xs text-slate-600 text-xs font-medium select-none">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>&copy; {new Date().getFullYear()} Plant-Aid. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};
