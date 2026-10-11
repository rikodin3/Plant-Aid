import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sprout,
  FlaskConical,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { Remedy } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface TreatmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  diseaseName: string;
  diseaseId: string;
  scientificName?: string | null;
  confidenceScore: number;
  remedies: Remedy[];
  isLoading?: boolean;
}

export const TreatmentPlanModal: React.FC<TreatmentPlanModalProps> = ({
  isOpen,
  onClose,
  diseaseName,
  diseaseId,
  scientificName,
  confidenceScore,
  remedies,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'organic' | 'chemical' | 'preventive'>('organic');

  // Preserve last valid props so exit animation doesn't flash empty content when parent clears state
  const cachedPropsRef = useRef({
    diseaseName,
    diseaseId,
    scientificName,
    confidenceScore,
    remedies,
  });

  if (isOpen && diseaseName) {
    cachedPropsRef.current = {
      diseaseName,
      diseaseId,
      scientificName,
      confidenceScore,
      remedies,
    };
  }

  const displayDiseaseName = diseaseName || cachedPropsRef.current.diseaseName;
  const displayScientificName =
    scientificName !== undefined ? scientificName : cachedPropsRef.current.scientificName;
  const displayConfidence =
    confidenceScore > 0 ? confidenceScore : cachedPropsRef.current.confidenceScore;
  const displayRemedies =
    remedies && remedies.length > 0 ? remedies : cachedPropsRef.current.remedies;

  // Reset to organic tab when modal opens for a new specimen
  useEffect(() => {
    if (isOpen) {
      setActiveTab('organic');
    }
  }, [isOpen, diseaseId]);

  // Close on Escape key in capture phase so underlying card modal doesn't also close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const isHealthy = displayDiseaseName.toLowerCase().includes('healthy');
  const safeRemedies = Array.isArray(displayRemedies) ? displayRemedies : [];

  // Group remedies
  const organicRemedies = safeRemedies.filter(
    (r) =>
      r.category.toLowerCase().includes('organic') ||
      r.category.toLowerCase().includes('biological')
  );
  const chemicalRemedies = safeRemedies.filter(
    (r) =>
      r.category.toLowerCase().includes('chemical') ||
      r.category.toLowerCase().includes('fungicide')
  );
  const preventiveRemedies = safeRemedies.filter(
    (r) =>
      r.category.toLowerCase().includes('cultural') ||
      r.category.toLowerCase().includes('preventive')
  );

  const tabs = [
    {
      id: 'organic' as const,
      label: 'Organic & Bio',
      shortLabel: 'Organic',
      icon: Sprout,
      iconColor: 'text-emerald-600',
    },
    {
      id: 'chemical' as const,
      label: 'Chemical Shield',
      shortLabel: 'Chemical',
      icon: FlaskConical,
      iconColor: 'text-agri-700',
    },
    {
      id: 'preventive' as const,
      label: 'Cultural Care',
      shortLabel: 'Cultural',
      icon: Shield,
      iconColor: 'text-agri-700',
    },
  ];

  const renderRemedyList = (
    items: Remedy[],
    defaultTitle: string,
    fallbackTitle: string,
    fallbackDescription: string
  ) => {
    if (items.length > 0) {
      return items.map((remedy, idx) => (
        <motion.div
          key={remedy.id || idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.28,
            delay: idx * 0.05,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="p-4 sm:p-5 rounded-2xl border border-emerald-950/10 bg-[#f7faf7] space-y-2.5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {remedy.title || remedy.treatment_name || defaultTitle}
            </h4>
            {remedy.dosage && (
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-100/90 text-agri-800 font-bold border border-emerald-200/80">
                {remedy.dosage}
              </span>
            )}
          </div>
          {remedy.description && (
            <p className="text-sm text-slate-700 leading-relaxed">{remedy.description}</p>
          )}
          {remedy.application_instructions && (
            <div className="text-xs sm:text-sm text-agri-950 leading-relaxed bg-white p-3.5 rounded-xl border border-emerald-950/10">
              <span className="font-bold text-agri-800">Application: </span>
              {remedy.application_instructions}
            </div>
          )}
        </motion.div>
      ));
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="p-4 sm:p-5 rounded-2xl border border-emerald-950/10 bg-[#f7faf7] space-y-2"
      >
        <h4 className="text-sm sm:text-base font-bold text-slate-900">{fallbackTitle}</h4>
        <p className="text-sm text-slate-700 leading-relaxed">{fallbackDescription}</p>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] overflow-y-auto flex items-center justify-center p-2.5 sm:p-6">
          {/* Smooth Animated Backdrop */}
          <motion.div
            key="treatment-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Smooth Spring-Animated Modal Card */}
          <motion.div
            key="treatment-modal-dialog"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.94, y: 16, filter: 'blur(4px)' }}
            transition={{
              type: 'spring',
              stiffness: 360,
              damping: 28,
              mass: 0.85,
            }}
            className="relative z-10 bg-white/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/80 text-slate-900 ring-1 ring-emerald-950/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — Botanical Sage & Frosted Glass matching rest of Plant-Aid */}
            <div className="p-4 sm:p-6 md:p-7 bg-gradient-to-br from-[#edf4ed] via-[#f3f8f3] to-emerald-50/60 border-b border-emerald-950/10 relative shrink-0">
              <button
                onClick={onClose}
                className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/85 hover:bg-white border border-emerald-950/10 text-slate-600 hover:text-slate-900 transition-colors shadow-xs touch-target cursor-pointer"
                aria-label="Close modal"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1.5 pr-12">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isHealthy ? 'optimal' : 'default'}>
                    <span>Agronomic Treatment Plan</span>
                  </Badge>
                  <span className="text-xs font-mono font-semibold text-agri-800 bg-white/80 px-2.5 py-0.5 rounded-full border border-emerald-950/10">
                    {(displayConfidence * 100).toFixed(1)}% Match
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-normal text-slate-900 tracking-tight pt-1 leading-snug">
                  {displayDiseaseName}
                </h3>
                {displayScientificName && (
                  <p className="text-xs italic text-slate-600 font-mono">{displayScientificName}</p>
                )}
              </div>

              {/* Pill Tab Selector with Sliding Motion Indicator — never truncates on mobile */}
              {!isHealthy && (
                <div className="grid grid-cols-3 gap-1 sm:gap-1.5 mt-4 sm:mt-5 p-1 rounded-2xl bg-emerald-950/5 border border-emerald-950/5 text-xs font-semibold relative">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative min-h-[44px] py-2 px-1.5 sm:px-3 rounded-xl flex items-center justify-center gap-1 sm:gap-1.5 transition-colors cursor-pointer z-10 touch-target ${
                          isActive
                            ? 'text-agri-950 font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="treatment-plan-active-tab"
                            transition={{
                              type: 'spring',
                              stiffness: 420,
                              damping: 32,
                            }}
                            className="absolute inset-0 rounded-xl bg-white shadow-xs border border-emerald-950/5 -z-10"
                          />
                        )}
                        <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${tab.iconColor} shrink-0`} />
                        <span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
                        <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Body / Smooth Animated Tab Content */}
            <div className="p-4 sm:p-6 md:p-7 overflow-y-auto flex-1 bg-white/80 custom-scrollbar">
              {isHealthy ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                  className="p-5 sm:p-6 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-center space-y-3"
                >
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-bold text-emerald-950">Crop Canopy is Healthy</h4>
                  <p className="text-sm text-emerald-900/85 max-w-md mx-auto leading-relaxed">
                    No active fungal pustules, necrotic spots, or chlorotic halos detected. Continue
                    standard agronomic irrigation, maintain weed-free crop borders, and schedule
                    regular weekly monitoring.
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading-skeleton"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3.5"
                    >
                      {[0, 1].map((skeletonIdx) => (
                        <div
                          key={skeletonIdx}
                          className="p-4 sm:p-5 rounded-2xl border border-emerald-950/10 bg-[#f7faf7] space-y-3 animate-pulse"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="h-4 w-44 bg-emerald-950/10 rounded-md" />
                            <div className="h-5 w-20 bg-emerald-950/10 rounded-lg" />
                          </div>
                          <div className="h-3 w-full bg-emerald-950/10 rounded-md" />
                          <div className="h-3 w-4/5 bg-emerald-950/10 rounded-md" />
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-3.5"
                    >
                      {activeTab === 'organic' &&
                        renderRemedyList(
                          organicRemedies,
                          'Organic Bio-Control',
                          'Bio-Control Recommendation',
                          'Foliar spray with Trichoderma viride or Pseudomonas fluorescens at 5g/L water during early morning or overcast weather to suppress foliar mycelium expansion.'
                        )}

                      {activeTab === 'chemical' &&
                        renderRemedyList(
                          chemicalRemedies,
                          'Chemical Fungicide Treatment',
                          'Targeted Fungicide Spray',
                          'Apply protective contact fungicide such as Mancozeb 75% WP (2 g/L) or Chlorothalonil 75% WP (2 g/L) at the onset of initial symptoms. Repeat at 14-day intervals if wet humid conditions persist.'
                        )}

                      {activeTab === 'preventive' &&
                        renderRemedyList(
                          preventiveRemedies,
                          'Cultural & Preventive Practice',
                          'Crop Sanitation & Spacing',
                          'Maintain 30×10 cm optimum planting distance for aeration, destroy post-harvest crop stubbles, rotate with non-leguminous crops like sorghum or pearl millet for 2 seasons.'
                        )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#edf4ed]/70 border-t border-emerald-950/10 flex items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
              <span className="text-xs text-slate-600 font-medium leading-snug">
                Always wear protective gear during field spraying
              </span>
              <Button size="sm" onClick={onClose} className="shrink-0 min-h-[44px] px-5">
                Done
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

