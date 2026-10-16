import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Compass,
  Scan,
  BookOpen,
} from 'lucide-react';
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-[calc(100vh-4rem)] bg-transparent pt-3 pb-24 sm:py-8 sm:pb-12 px-3.5 sm:px-6 lg:px-8 font-sans"
    >
      <div className="max-w-5xl mx-auto space-y-3.5 sm:space-y-6">
        {/* Main Glassmorphic Hero Container */}
        <div className="relative">
          {/* Ambient 3D Glow Blobs behind the hero — desktop only */}
          <div className="hidden sm:block absolute -top-16 -left-16 w-80 h-80 bg-gradient-to-br from-[#75BDBD]/35 to-[#A6D9D9]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="hidden sm:block absolute -bottom-16 -right-16 w-80 h-80 bg-gradient-to-br from-[#2D8686]/25 to-[#75BDBD]/30 rounded-full blur-3xl pointer-events-none" />

          <div className="glass-frost p-5 sm:p-12 lg:p-16 text-center space-y-4 sm:space-y-8 relative overflow-hidden rounded-2xl sm:rounded-[32px]">
            {/* Headline & Description */}
            <div className="space-y-2.5 sm:space-y-4 max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-[#0F5757] font-gilroy tracking-tight leading-tight">
                Groundnut disease detection and recommendation system
              </h1>
              <p className="text-sm sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
                Detect groundnut crop diseases in real-time with high accuracy and reliable remedies.
              </p>
            </div>

            {/* Action CTAs */}
            <div className="pt-1 sm:pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4">
              <Link
                to="/scan"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-sm sm:text-base shadow-md shadow-agri-900/15 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[46px] sm:min-h-[48px] touch-target"
              >
                <Scan className="w-5 h-5 text-white shrink-0" />
                <span>Start Instant Scan</span>
                <ArrowRight className="w-4 h-4 ml-1 shrink-0" />
              </Link>

              <Link
                to="/guide"
                className="glass-frost-pill w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 sm:px-7 sm:py-4 rounded-xl sm:rounded-2xl text-slate-800 hover:text-slate-950 font-semibold text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[46px] sm:min-h-[48px] touch-target"
              >
                <BookOpen className="w-5 h-5 text-agri-700 shrink-0" />
                <span>Browse Disease Guide</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Disease Spotter Section */}
        <div className="relative">
          <div className="glass-frost relative overflow-hidden p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-[32px] space-y-3.5 sm:space-y-5 z-10">
            <div className="relative z-10 flex items-center justify-between gap-2 border-b border-emerald-950/10 pb-3 sm:pb-4">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100/90 text-emerald-800 flex items-center justify-center shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight uppercase font-sans truncate">
                    Groundnut Pathology Quick Spotter
                  </h2>
                  <p className="hidden sm:block text-xs text-slate-600">
                    Tap any condition to inspect symptoms &amp; dosages
                  </p>
                </div>
              </div>
              <Link
                to="/guide"
                className="shrink-0 text-xs font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center space-x-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-50/90 hover:bg-emerald-100/90 border border-emerald-200/70 transition-colors min-h-[38px] sm:min-h-[40px] touch-target"
              >
                <span className="sm:hidden">All 6</span>
                <span className="hidden sm:inline">Explore all classes</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </div>

            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
              {QUICK_DISEASES.map((d) => (
                <Link
                  key={d.slug}
                  to={`/guide?disease=${d.slug}`}
                  className="group relative flex flex-col justify-between p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-950/[0.03] sm:bg-white/80 hover:bg-white transition-all duration-300 sm:hover:-translate-y-1 overflow-hidden"
                >
                  {/* Specimen Thumbnail with category chip */}
                  <div className="relative aspect-[4/3] sm:aspect-square w-full rounded-lg sm:rounded-xl overflow-hidden bg-slate-900 mb-2 sm:mb-2.5">
                    <img
                      src={d.image}
                      alt={d.name}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                      <span
                        className={cn(
                          'px-1.5 sm:px-2 py-0.5 rounded-md text-[11px] sm:text-xs font-bold tracking-wide uppercase backdrop-blur-md border',
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
                  <div className="space-y-0.5 sm:space-y-1 px-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug truncate">
                        {d.name}
                      </div>
                      <ArrowRight className="sm:hidden w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                    <div className="hidden sm:flex items-center justify-between text-xs text-slate-600 pt-0.5">
                      <span className="truncate italic text-xs text-slate-600">
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
