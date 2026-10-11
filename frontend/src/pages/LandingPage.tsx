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
    <div className="min-h-[85vh] flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8 bg-transparent relative overflow-hidden">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-10 relative z-10"
      >
        {/* Main Glassmorphic Hero Container */}
        <motion.div variants={itemVariants} className="relative">
          {/* Ambient 3D Glow Blobs behind the hero */}
          <div className="absolute -top-16 -left-16 w-80 h-80 bg-gradient-to-br from-emerald-400/30 to-teal-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-gradient-to-br from-amber-400/25 to-emerald-300/20 rounded-full blur-3xl pointer-events-none" />

          <div className="glass-frost p-5 sm:p-12 lg:p-16 text-center space-y-6 sm:space-y-8 relative overflow-hidden rounded-3xl sm:rounded-[32px]">
            {/* Headline & Description */}
            <div className="space-y-3.5 sm:space-y-4 max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-slate-900 leading-[1.15] sm:leading-[1.12]">
                Plant-Aid: Real-Time Plant Disease Identification &amp; Treatment Recommendation System
              </h1>
              <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Diagnose crop pathogens in real-time with high-accuracy computer vision.
                Receive tailored biological, chemical, and cultural remedies calibrated
                for field health.
              </p>
            </div>

            {/* Action CTAs */}
            <div className="pt-1 sm:pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                to={isAuthenticated ? '/scan' : '/auth?mode=register'}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-sm sm:text-base shadow-md shadow-agri-900/15 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[48px] touch-target"
              >
                <Scan className="w-5 h-5 text-white shrink-0" />
                <span>{isAuthenticated ? 'Launch Field Scanner' : 'Start Instant Scan'}</span>
                <ArrowRight className="w-4 h-4 ml-1 shrink-0" />
              </Link>

              <Link
                to="/guide"
                className="glass-frost-pill w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 sm:px-7 sm:py-4 rounded-2xl text-slate-800 hover:text-slate-950 font-semibold text-sm sm:text-base transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[48px] touch-target"
              >
                <BookOpen className="w-5 h-5 text-agri-700 shrink-0" />
                <span>Browse Disease Guide</span>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Feature Highlights Matrix with Reference Frosted Glass Aesthetic */}
        <motion.div variants={itemVariants} className="relative">
          {/* Ambient colorful blurred orbs shining through the 3 cards (matching reference image) */}
          <div className="absolute -top-12 left-8 w-72 h-72 bg-gradient-to-br from-emerald-400/30 to-teal-300/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-8 left-1/3 w-72 h-72 bg-gradient-to-br from-amber-400/30 to-orange-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-12 right-8 w-72 h-72 bg-gradient-to-br from-cyan-400/30 to-indigo-400/25 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 relative z-10">
            {/* Card 1: Instant Camera Scanner */}
            <Link
              to={isAuthenticated ? '/scan' : '/auth?mode=register'}
              className="glass-frost rounded-3xl sm:rounded-[28px] p-5 sm:p-7 flex flex-col space-y-3.5 sm:space-y-4 hover:shadow-[0_25px_50px_-12px_rgba(20,83,45,0.12),inset_0_1px_1px_rgba(255,255,255,1)] hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl glass-frost-pill flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform bg-gradient-to-br from-emerald-100/80 to-white/60">
                  <Scan className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="w-9 h-9 rounded-xl glass-frost-pill flex items-center justify-center text-slate-500 group-hover:text-emerald-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight group-hover:text-emerald-950 transition-colors">
                  Instant Camera Scanner
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 sm:mt-2 leading-relaxed">
                  Point your camera directly at groundnut leaves to detect infections with bounding box localization and confidence ratings.
                </p>
              </div>
            </Link>

            {/* Card 2: Targeted Remedies */}
            <Link
              to="/guide"
              className="glass-frost rounded-3xl sm:rounded-[28px] p-5 sm:p-7 flex flex-col space-y-3.5 sm:space-y-4 hover:shadow-[0_25px_50px_-12px_rgba(20,83,45,0.12),inset_0_1px_1px_rgba(255,255,255,1)] hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl glass-frost-pill flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform bg-gradient-to-br from-amber-100/80 to-white/60">
                  <BookOpen className="w-6 h-6 text-amber-700" />
                </div>
                <div className="w-9 h-9 rounded-xl glass-frost-pill flex items-center justify-center text-slate-500 group-hover:text-amber-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight group-hover:text-amber-950 transition-colors">
                  Targeted Remedies
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 sm:mt-2 leading-relaxed">
                  Actionable recommendations categorized by organic biocontrol, chemical fungicides, and preventive field cultural practices.
                </p>
              </div>
            </Link>

            {/* Card 3: Diagnosis History */}
            <Link
              to={isAuthenticated ? '/history' : '/auth?mode=register'}
              className="glass-frost rounded-3xl sm:rounded-[28px] p-5 sm:p-7 flex flex-col space-y-3.5 sm:space-y-4 hover:shadow-[0_25px_50px_-12px_rgba(20,83,45,0.12),inset_0_1px_1px_rgba(255,255,255,1)] hover:-translate-y-1.5 transition-all duration-300 group cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl glass-frost-pill flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform bg-gradient-to-br from-cyan-100/80 to-white/60">
                  <History className="w-6 h-6 text-teal-700" />
                </div>
                <div className="w-9 h-9 rounded-xl glass-frost-pill flex items-center justify-center text-slate-500 group-hover:text-teal-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight group-hover:text-teal-950 transition-colors">
                  Diagnosis History
                </h3>
                <p className="text-sm text-slate-600 mt-1.5 sm:mt-2 leading-relaxed">
                  Keep a structured log of confirmed field inspections with photographic evidence and timeline tracking across your crops.
                </p>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Project Authors & Academic Supervision Section */}
        <motion.div variants={itemVariants} className="relative">
          <div className="glass-frost p-4 sm:p-6 md:p-8 rounded-3xl sm:rounded-[32px] space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-950/10 pb-4 gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl glass-frost-pill text-emerald-800 flex items-center justify-center shadow-xs shrink-0">
                  <Users className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight uppercase font-sans">
                    Project Team &amp; Academic Supervision
                  </h2>
                  <p className="text-xs text-slate-500">
                    Engineering Contributors &amp; Course Faculty Mentorship
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="self-start sm:self-auto text-xs bg-white/70">
                Department of Information Technology
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Team Members Column */}
              <div className="lg:col-span-8 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-agri-900/80 flex items-center space-x-1.5">
                  <span>Team Members</span>
                  <span className="text-xs text-slate-500 font-normal">(Students)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Member 1: Donthula Nithin Teja */}
                  <div className="p-4 rounded-2xl bg-white/80 border border-emerald-950/10 shadow-xs hover:border-emerald-500/30 transition-all backdrop-blur-md flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        Donthula Nithin Teja
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Student Developer</div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</span>
                      <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50/70 border-emerald-300/80">
                        241IT028
                      </Badge>
                    </div>
                  </div>

                  {/* Member 2: Ghanta Bhavana Sri Sai */}
                  <div className="p-4 rounded-2xl bg-white/80 border border-emerald-950/10 shadow-xs hover:border-emerald-500/30 transition-all backdrop-blur-md flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        Ghanta Bhavana Sri Sai
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Student Developer</div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</span>
                      <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50/70 border-emerald-300/80">
                        242IT029
                      </Badge>
                    </div>
                  </div>

                  {/* Member 3: Yash Roshan */}
                  <div className="p-4 rounded-2xl bg-white/80 border border-emerald-950/10 shadow-xs hover:border-emerald-500/30 transition-all backdrop-blur-md flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        Yash Roshan
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Student Developer</div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</span>
                      <Badge variant="outline" className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50/70 border-emerald-300/80">
                        241IT083
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Instructor Column */}
              <div className="lg:col-span-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-agri-900/80 flex items-center space-x-1.5">
                  <span>Course Instructor</span>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/90 to-white/80 border border-emerald-200/80 shadow-xs hover:border-emerald-400/50 transition-all backdrop-blur-md flex flex-col justify-between space-y-3 h-[calc(100%-1.75rem)]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        Prof. Jaidhar C. D.
                      </div>
                      <div className="text-xs font-medium text-emerald-800">
                        Course Faculty &amp; Project Mentor
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-100/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Supervision</span>
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

        {/* Bottom Left Corner Copyright Claim */}
        <div className="pt-2 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="text-xs text-slate-500 font-medium pl-1 sm:pl-0">
            Groundnut Foliar Diagnostic &amp; Treatment Advisory System
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LandingPage;
