import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

export interface ExpandableCardProps {
  id?: string;
  imageSrc?: string;
  title?: string;
  subtitle?: string;
  content?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export default function ExpandableProfileCard({
  id,
  imageSrc = '/images/diseases/healthy_leaf.jpg',
  title = 'Groundnut Foliage Specimen',
  subtitle = 'Field Pathology Reference',
  content,
  badge,
  className = '',
  defaultOpen = false,
  onOpen,
  onClose,
}: ExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const uniqueKey = id || title.replace(/\s+/g, '-').toLowerCase();
  const layoutId = `expandable-profile-card-${uniqueKey}`;

  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    onOpen?.();
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // Close on Escape key & lock background body scroll
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <motion.div
        layoutId={layoutId}
        onClick={handleOpen}
        className={`cursor-pointer relative h-48 sm:h-72 w-full overflow-hidden rounded-2xl bg-slate-950 group shadow-md hover:shadow-lg transition-shadow duration-300 ${className}`}
        whileHover="hover"
      >
        <motion.img
          layoutId={`image-${layoutId}`}
          src={imageSrc}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          variants={{
            hover: { scale: 1.06 },
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/15" />

        {badge && (
          <div className="absolute top-3 left-3 sm:top-3.5 sm:left-3.5 z-10">
            {badge}
          </div>
        )}

        <div className="absolute bottom-0 left-0 p-3.5 sm:p-6 w-full sm:translate-y-1 sm:group-hover:translate-y-0 transition-transform duration-300">
          <motion.p
            layoutId={`subtitle-${layoutId}`}
            className="text-emerald-200 text-xs font-medium mb-0.5 sm:mb-1 line-clamp-1 sm:line-clamp-2"
          >
            {subtitle}
          </motion.p>
          <motion.h2
            layoutId={`title-${layoutId}`}
            className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug"
          >
            {title}
          </motion.h2>
        </div>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-5 md:p-8 overflow-hidden">
            {/* Backdrop: covers navbar, full screen blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal dialog card */}
            <motion.div
              layoutId={layoutId}
              role="dialog"
              aria-modal="true"
              className="relative w-full max-w-4xl h-[88vh] md:h-[82vh] max-h-[820px] bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl overflow-hidden border border-white/80 z-10 flex flex-col md:flex-row shadow-2xl min-h-0"
            >
              {/* Floating Close Button: Pinned to top-right with 44x44px touch target */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 flex h-11 w-11 items-center justify-center bg-slate-900/75 hover:bg-slate-900 rounded-full border border-white/25 text-white transition-colors backdrop-blur-md touch-target cursor-pointer shadow-lg"
                title="Close"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Left Column: Specimen Image */}
              <div className="relative h-36 sm:h-56 md:h-full w-full md:w-1/2 shrink-0 overflow-hidden bg-slate-950">
                <motion.img
                  layoutId={`image-${layoutId}`}
                  src={imageSrc}
                  alt={title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent md:hidden" />
              </div>

              {/* Right Column: Scrollable Content with guaranteed scrollbar */}
              <div className="p-4 sm:p-6 md:p-8 w-full md:w-1/2 flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
                {/* Header: right clearance only on desktop (md:pr-12) where close button sits over this column */}
                <div className="md:pr-12 mb-3 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <motion.p
                      layoutId={`subtitle-${layoutId}`}
                      className="text-agri-700 text-xs font-semibold leading-relaxed"
                    >
                      {subtitle}
                    </motion.p>
                    {badge}
                  </div>

                  <motion.h3
                    layoutId={`title-${layoutId}`}
                    className="text-xl sm:text-2xl md:text-3xl font-normal tracking-tight text-slate-900 pb-3 border-b border-emerald-950/10 leading-snug"
                  >
                    {title}
                  </motion.h3>
                </div>

                {/* Scrollable Body Content */}
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: 0.15, duration: 0.3 }}
                  className="text-slate-700 text-sm leading-relaxed space-y-4 pb-4 grow-0 shrink-0"
                >
                  {content || (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Inspect foliar symptoms, lesion boundaries, and recommended agronomic interventions for this groundnut specimen.
                      </p>
                      <button
                        onClick={handleClose}
                        className="mt-1 px-5 py-2.5 bg-agri-700 text-white font-bold rounded-xl hover:bg-agri-800 transition-colors self-start shadow-xs text-xs cursor-pointer touch-target"
                      >
                        Close Inspection
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
