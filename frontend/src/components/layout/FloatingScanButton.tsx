import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const FloatingScanButton: React.FC = () => {
  const location = useLocation();

  // Hide the floating button when on the landing page, scanner screen, or auth page
  if (location.pathname === '/' || location.pathname === '/scan' || location.pathname === '/auth') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="hidden md:block fixed bottom-6 right-6 z-50"
      >
        <Link
          to="/scan"
          aria-label="Scan Plant Leaf with Camera"
          title="Scan Plant Leaf"
          className="group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-agri-900 hover:bg-agri-950 active:bg-black text-white shadow-xl shadow-agri-950/40 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-emerald-700/40 focus:outline-none focus:ring-4 focus:ring-agri-700/50"
        >
          {/* Subtle outer ping animation ring */}
          <span className="absolute -inset-1 rounded-full bg-agri-900/30 group-hover:bg-agri-800/40 animate-pulse pointer-events-none" />
          
          <Camera className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-sm transition-transform duration-200 group-hover:scale-110" />
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};

export default FloatingScanButton;
