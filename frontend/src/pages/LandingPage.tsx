import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Scan,
  BookOpen,
  ArrowRight,
  ArrowUpRight,
  History,
  GraduationCap,
  Users,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center pt-3 pb-20 sm:py-10 px-3.5 sm:px-6 lg:px-8 bg-transparent relative overflow-hidden">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-10 relative z-10"
      >
        {/* Main Glassmorphic Hero Container */}
        <motion.div variants={itemVariants} className="relative">
          {/* Ambient 3D Glow Blobs behind the hero — desktop only */}
          <div className="hidden sm:block absolute -top-16 -left-16 w-80 h-80 bg-gradient-to-br from-emerald-400/25 to-emerald-300/15 rounded-full blur-3xl pointer-events-none" />
          <div className="hidden sm:block absolute -bottom-16 -right-16 w-80 h-80 bg-gradient-to-br from-amber-400/20 to-emerald-300/15 rounded-full blur-3xl pointer-events-none" />

          <div className="glass-frost p-5 sm:p-12 lg:p-16 text-center space-y-4 sm:space-y-8 relative overflow-hidden rounded-2xl sm:rounded-[32px]">
            {/* Headline & Description */}
            <div className="space-y-2.5 sm:space-y-4 max-w-3xl mx-auto">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl inline-flex items-baseline justify-center leading-none tracking-tight">
                <span className="font-bold text-slate-900 font-gilroy">Plant</span>
                <span className="text-amber-600 font-bold text-[0.9em] mx-1 sm:mx-1.5">·</span>
                <span className="font-cursive font-bold text-[1.2em] text-[#b88a44] tracking-normal ml-0.5 select-none">
                  Aid
                </span>
              </h1>
              <p className="text-sm sm:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
                Diagnose groundnut crop diseases in real-time with high-accuracy and reliable remedies
              </p>
            </div>

            {/* Action CTAs */}
            <div className="pt-1 sm:pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4">
              <Link
                to={isAuthenticated ? '/scan' : '/auth?mode=register'}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-sm sm:text-base shadow-md shadow-agri-900/15 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[46px] sm:min-h-[48px] touch-target"
              >
                <Scan className="w-5 h-5 text-white shrink-0" />
                <span>{isAuthenticated ? 'Launch Field Scanner' : 'Start Instant Scan'}</span>
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
        </motion.div>

        {/* Feature Highlights Matrix — Compact horizontal rows on mobile, 3-col cards on md+ */}
        <motion.div variants={itemVariants} className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-5 relative z-10">
            {/* Card 1: Instant Camera Scanner */}
            <Link
              to={isAuthenticated ? '/scan' : '/auth?mode=register'}
              className="glass-frost rounded-2xl sm:rounded-[28px] p-3.5 sm:p-7 flex flex-row md:flex-col items-center md:items-stretch gap-3.5 md:gap-0 md:space-y-4 hover:shadow-[0_25px_50px_-12px_rgba(20,83,45,0.12),inset_0_1px_1px_rgba(255,255,255,1)] md:hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center justify-between shrink-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-100/90 border border-emerald-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Scan className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800" />
                </div>
                <div className="hidden md:flex w-9 h-9 rounded-xl glass-frost-pill items-center justify-center text-slate-600 group-hover:text-emerald-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight group-hover:text-emerald-950 transition-colors">
                  Instant Camera Scanner
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-2 leading-relaxed line-clamp-2 md:line-clamp-none">
                  Point your camera directly at groundnut leaves to detect infections.
                </p>
              </div>

              <ArrowUpRight className="md:hidden w-4 h-4 text-slate-400 group-hover:text-emerald-700 shrink-0" />
            </Link>

            {/* Card 2: Targeted Remedies */}
            <Link
              to="/guide"
              className="glass-frost rounded-2xl sm:rounded-[28px] p-3.5 sm:p-7 flex flex-row md:flex-col items-center md:items-stretch gap-3.5 md:gap-0 md:space-y-4 hover:shadow-[0_25px_50px_-12px_rgba(20,83,45,0.12),inset_0_1px_1px_rgba(255,255,255,1)] md:hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center justify-between shrink-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-100/90 border border-amber-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-800" />
                </div>
                <div className="hidden md:flex w-9 h-9 rounded-xl glass-frost-pill items-center justify-center text-slate-600 group-hover:text-amber-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight group-hover:text-amber-950 transition-colors">
                  Targeted Remedies
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-2 leading-relaxed line-clamp-2 md:line-clamp-none">
                  Recommendations categorized by organic biocontrol, chemical fungicides, and preventive field cultural practices.
                </p>
              </div>

              <ArrowUpRight className="md:hidden w-4 h-4 text-slate-400 group-hover:text-amber-700 shrink-0" />
            </Link>

            {/* Card 3: Diagnosis History */}
            <Link
              to={isAuthenticated ? '/history' : '/auth?mode=register'}
              className="glass-frost rounded-2xl sm:rounded-[28px] p-3.5 sm:p-7 flex flex-row md:flex-col items-center md:items-stretch gap-3.5 md:gap-0 md:space-y-4 hover:shadow-[0_25px_50px_-12px_rgba(20,83,45,0.12),inset_0_1px_1px_rgba(255,255,255,1)] md:hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center justify-between shrink-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-100/90 border border-emerald-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <History className="w-5 h-5 sm:w-6 sm:h-6 text-agri-800" />
                </div>
                <div className="hidden md:flex w-9 h-9 rounded-xl glass-frost-pill items-center justify-center text-slate-600 group-hover:text-agri-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight group-hover:text-agri-950 transition-colors">
                  Diagnosis History
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-2 leading-relaxed line-clamp-2 md:line-clamp-none">
                  Keep a structured log of field inspections with images and timeline tracking across your crops.
                </p>
              </div>

              <ArrowUpRight className="md:hidden w-4 h-4 text-slate-400 group-hover:text-agri-700 shrink-0" />
            </Link>
          </div>
        </motion.div>

        {/* Project Authors & Academic Supervision Section */}
        <motion.div variants={itemVariants} className="relative">
          <div className="glass-frost p-3.5 sm:p-6 md:p-8 rounded-2xl sm:rounded-[32px] space-y-3.5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-950/10 pb-3 sm:pb-4 gap-2 sm:gap-3">
              <div className="flex items-center space-x-2.5 sm:space-x-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100/90 text-emerald-800 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight uppercase font-sans">
                    Project Team &amp; Academic Supervision
                  </h2>
                  <p className="hidden sm:block text-xs text-slate-600">
                    Engineering Contributors &amp; Course Faculty Mentorship
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto text-xs bg-white/90 text-slate-700">
                Department of Information Technology
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5">
              {/* Team Members Column */}
              <div className="lg:col-span-8 space-y-2 sm:space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-agri-900 flex items-center space-x-1.5">
                  <span>Team Members</span>
                  <span className="text-xs text-slate-600 font-normal">(Students)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {/* Member 1: Donthula Nithin Teja */}
                  <div className="py-2.5 px-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/[0.03] sm:bg-white/85 flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-2 sm:space-y-3">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        Donthula Nithin Teja
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">Student Developer</div>
                    </div>
                    <div className="sm:pt-2 sm:border-t sm:border-slate-200/70 flex items-center justify-between shrink-0">
                      <span className="hidden sm:inline text-xs font-semibold text-slate-600 uppercase tracking-wider">Roll No</span>
                      <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 border-emerald-300">
                        241IT028
                      </Badge>
                    </div>
                  </div>

                  {/* Member 2: Ghanta Bhavana Sri Sai */}
                  <div className="py-2.5 px-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/[0.03] sm:bg-white/85 flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-2 sm:space-y-3">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        Ghanta Bhavana Sri Sai
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">Student Developer</div>
                    </div>
                    <div className="sm:pt-2 sm:border-t sm:border-slate-200/70 flex items-center justify-between shrink-0">
                      <span className="hidden sm:inline text-xs font-semibold text-slate-600 uppercase tracking-wider">Roll No</span>
                      <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 border-emerald-300">
                        242IT029
                      </Badge>
                    </div>
                  </div>

                  {/* Member 3: Yash Roshan */}
                  <div className="py-2.5 px-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-950/[0.03] sm:bg-white/85 flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-2 sm:space-y-3">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        Yash Roshan
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">Student Developer</div>
                    </div>
                    <div className="sm:pt-2 sm:border-t sm:border-slate-200/70 flex items-center justify-between shrink-0">
                      <span className="hidden sm:inline text-xs font-semibold text-slate-600 uppercase tracking-wider">Roll No</span>
                      <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 border-emerald-300">
                        241IT083
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Instructor Column */}
              <div className="lg:col-span-4 space-y-2 sm:space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-agri-900 flex items-center space-x-1.5">
                  <span>Course Instructor</span>
                </div>

                <div className="py-2.5 px-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/80 flex flex-row sm:flex-col items-center sm:items-stretch justify-between gap-2 sm:space-y-3 sm:h-[calc(100%-1.75rem)]">
                  <div className="flex items-center space-x-2.5 sm:space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shrink-0">
                      <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        Prof. Jaidhar C. D.
                      </div>
                      <div className="text-xs font-medium text-emerald-800">
                        Course Faculty &amp; Project Mentor
                      </div>
                    </div>
                  </div>

                  <div className="sm:pt-2 sm:border-t sm:border-emerald-200/60 flex items-center justify-between shrink-0">
                    <span className="hidden sm:inline text-xs font-semibold text-slate-600 uppercase tracking-wider">Supervision</span>
                    <Badge variant="optimal" className="text-xs font-semibold">
                      <Award className="w-3 h-3 text-emerald-700 mr-0.5" />
                      <span>Academic Guide</span>
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
