import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Upload,
  ArrowRight,
  Camera,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const QUICK_DISEASES = [
  {
    slug: 'early_leaf_spot',
    name: 'Early Leaf Spot',
    category: 'Fungal',
    scientific: 'Cercospora arachidicola',
    image: '/images/diseases/early_leaf_spot.jpg',
  },
  {
    slug: 'late_leaf_spot',
    name: 'Late Leaf Spot',
    category: 'Fungal',
    scientific: 'Phaeoisariopsis personata',
    image: '/images/diseases/late_leaf_spot.jpg',
  },
  {
    slug: 'rust',
    name: 'Groundnut Rust',
    category: 'Fungal',
    scientific: 'Puccinia arachidis',
    image: '/images/diseases/rust.jpg',
  },
  {
    slug: 'early_rust',
    name: 'Early Rust',
    category: 'Fungal',
    scientific: 'Speckled Pustules',
    image: '/images/diseases/early_rust.jpg',
  },
  {
    slug: 'nutrition_deficiency',
    name: 'Nutritional Chlorosis',
    category: 'Abiotic',
    scientific: 'Iron & Zinc Chlorosis',
    image: '/images/diseases/nutrition_deficiency.jpg',
  },
  {
    slug: 'healthy_leaf',
    name: 'Healthy Baseline',
    category: 'Healthy',
    scientific: 'Arachis hypogaea',
    image: '/images/diseases/healthy_leaf.jpg',
  },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const displayName = user?.user_name || 'Field Agronomist';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-[calc(100vh-4rem)] bg-transparent pt-6 pb-24 sm:py-8 sm:pb-12 px-4 sm:px-6 lg:px-8 font-sans"
    >
      <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
        {/* Main Glassmorphic Hero Container */}
        <div className="relative">
          {/* Ambient 3D Glow Blobs behind the hero */}
          <div className="absolute -top-16 -left-16 w-80 h-80 bg-gradient-to-br from-emerald-400/30 to-teal-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-gradient-to-br from-amber-400/25 to-emerald-300/20 rounded-full blur-3xl pointer-events-none" />

          <div className="glass-frost p-5 sm:p-10 lg:p-14 text-center space-y-5 sm:space-y-7 relative overflow-hidden rounded-3xl sm:rounded-[32px]">
            {/* Headline & Description — Concise operational greeting on mobile, full title on sm+ */}
            <div className="space-y-2.5 sm:space-y-4 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/5 border border-emerald-950/10 text-xs font-semibold text-agri-800">
                <span>Welcome back, {displayName}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-slate-900 leading-[1.15]">
                <span className="sm:hidden">Groundnut Disease Scanner &amp; Advisory</span>
                <span className="hidden sm:inline">
                  Plant-Aid: Real-Time Plant Disease Identification &amp; Treatment Recommendation System
                </span>
              </h1>
            </div>

            {/* Action CTAs */}
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/scan"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-sm sm:text-base shadow-md shadow-agri-900/15 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[48px] touch-target"
              >
                <Camera className="w-5 h-5 text-white shrink-0" />
                <span>Launch Live Scanner</span>
                <ArrowRight className="w-4 h-4 ml-1 shrink-0" />
              </Link>

              <Link
                to="/scan?mode=upload"
                className="glass-frost-pill w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl text-slate-800 hover:text-slate-950 font-semibold text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[48px] touch-target"
              >
                <Upload className="w-5 h-5 text-agri-700 shrink-0" />
                <span>Upload Specimen</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Disease Spotter Section — gradient glassmorphic surface */}
        <div className="relative">
          {/* Subtle ambient blur */}
          <div
            className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-emerald-100/30 blur-3xl"
            aria-hidden="true"
          />

          <div className="glass-frost relative overflow-hidden p-4 sm:p-6 md:p-8 rounded-3xl sm:rounded-[32px] space-y-4 sm:space-y-5 z-10">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-950/10 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center border border-emerald-200/60 shadow-xs shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase font-sans">
                    Groundnut Pathology Quick Spotter
                  </h2>
                  <p className="text-xs text-slate-600">
                    Tap any condition to inspect symptoms &amp; dosages
                  </p>
                </div>
              </div>
              <Link
                to="/guide"
                className="self-start sm:self-auto text-xs font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/70 transition-colors min-h-[40px] touch-target"
              >
                <span>Explore all classes</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </div>

            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
              {QUICK_DISEASES.map((d) => (
                <Link
                  key={d.slug}
                  to={`/guide?disease=${d.slug}`}
                  className="group relative flex flex-col justify-between p-2.5 sm:p-3 rounded-2xl bg-white/80 hover:bg-white border border-emerald-950/10 hover:border-emerald-500/40 shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1 backdrop-blur-md overflow-hidden"
                >
                  {/* Specimen Thumbnail with category chip */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 border border-emerald-950/10 mb-2.5">
                    <img
                      src={d.image}
                      alt={d.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute top-2 left-2">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-xs font-bold tracking-wide uppercase backdrop-blur-md shadow-xs border',
                          d.category === 'Healthy'
                            ? 'bg-emerald-950/85 text-emerald-200 border-emerald-400/30'
                            : d.category === 'Abiotic'
                            ? 'bg-amber-950/85 text-amber-200 border-amber-400/30'
                            : 'bg-slate-900/85 text-rose-200 border-rose-400/30'
                        )}
                      >
                        {d.category}
                      </span>
                    </div>
                  </div>

                  {/* Title & Micro details */}
                  <div className="space-y-1 px-0.5">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                      {d.name}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                      <span className="truncate italic text-xs text-slate-500">
                        {d.scientific}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
