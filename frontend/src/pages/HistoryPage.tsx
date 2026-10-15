import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Trash2,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Scan,
  BookOpen,
} from 'lucide-react';
import api from '../services/api';
import { HistoryLog, PaginatedHistoryResponse, Remedy } from '../types';
import { TreatmentPlanModal } from '../components/treatment/TreatmentPlanModal';
import { Surface } from '../components/ui/Surface';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import ExpandableProfileCard from '../components/watermelon/original';

const getDiseaseImage = (name: string, fallbackUrl?: string | null): string => {
  if (fallbackUrl && fallbackUrl.trim().length > 0 && !fallbackUrl.includes('placeholder')) {
    return fallbackUrl;
  }
  const lower = name.toLowerCase();
  if (lower.includes('early leaf spot')) return '/images/diseases/early_leaf_spot.jpg';
  if (lower.includes('late leaf spot')) return '/images/diseases/late_leaf_spot.jpg';
  if (lower.includes('early rust')) return '/images/diseases/early_rust.jpg';
  if (lower.includes('rust')) return '/images/diseases/rust.jpg';
  if (lower.includes('nutri') || lower.includes('chlorosis')) return '/images/diseases/nutrition_deficiency.jpg';
  if (lower.includes('healthy')) return '/images/diseases/healthy_leaf.jpg';
  return '/images/diseases/early_leaf_spot.jpg';
};

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<HistoryLog[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [diseaseFilter, setDiseaseFilter] = useState<string>('all');

  // Deletion modal
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Selected item for remedy inspection
  const [selectedLog, setSelectedLog] = useState<HistoryLog | null>(null);
  const [remediesForModal, setRemediesForModal] = useState<Remedy[]>([]);
  const [remediesLoading, setRemediesLoading] = useState<boolean>(false);
  const remediesCacheRef = useRef<Record<string, Remedy[]>>({});

  // Fetch paginated history from FastAPI backend
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/history?page=${page}&limit=9`;
      if (diseaseFilter !== 'all') {
        url += `&disease_id=${diseaseFilter}`;
      }

      const res = await api.get<PaginatedHistoryResponse>(url);
      setHistoryItems(res.data.items || []);
      setTotalCount(res.data.total ?? res.data.total_count ?? 0);
      setTotalPages(res.data.total_pages ?? res.data.pages ?? 1);
    } catch (err) {
      console.error('Failed to load history items', err);
    } finally {
      setLoading(false);
    }
  }, [page, diseaseFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Handle Soft-Delete
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/history/${deleteId}`);
      setDeleteId(null);
      await fetchHistory();
    } catch (err) {
      console.error('Failed to soft-delete item', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle inspect remedies modal
  const handleInspectRemedies = async (item: HistoryLog) => {
    const cacheKey = String(item.disease_id);
    if (remediesCacheRef.current[cacheKey]) {
      setRemediesForModal(remediesCacheRef.current[cacheKey]);
      setRemediesLoading(false);
      setSelectedLog(item);
      return;
    }

    setRemediesLoading(true);
    setSelectedLog(item);
    try {
      const res = await api.get<any>(`/api/remedies/${item.disease_id}`);
      const list: Remedy[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.remedies)
        ? res.data.remedies
        : [];
      remediesCacheRef.current[cacheKey] = list;
      setRemediesForModal(list);
    } catch (err) {
      console.error('Failed to fetch remedies for history record', err);
      setRemediesForModal([]);
    } finally {
      setRemediesLoading(false);
    }
  };

  // Filter items based on client-side search query
  const filteredItems = historyItems.filter((item) => {
    if (!searchQuery) return true;
    return item.disease_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-transparent pt-3 pb-24 sm:py-8 sm:pb-12 px-3.5 sm:px-6 lg:px-8 font-sans"
    >
      <div className="max-w-6xl mx-auto space-y-3.5 sm:space-y-6">
        {/* Header Console */}
        <Surface className="p-3.5 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 pb-3 sm:pb-6 border-b border-emerald-950/10">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-3xl font-normal text-slate-900 tracking-tight">
                Specimen Detection History
              </h1>
              <p className="hidden sm:block text-sm text-slate-600 leading-relaxed">
                Select any saved specimen to inspect high-resolution foliage details and verified remedies.
              </p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="pt-3 sm:pt-6 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by disease name..."
                className="w-full min-h-[42px] sm:min-h-[44px] pl-9 pr-4 py-2 rounded-xl border border-emerald-950/10 bg-white/90 sm:bg-white/75 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex sm:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
              <span className="hidden sm:flex text-xs font-semibold text-slate-500 items-center space-x-1 pl-1 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter:</span>
              </span>

              {[
                { id: 'all', label: 'All Records' },
                { id: 'healthy_leaf', label: 'Healthy' },
                { id: 'early_leaf_spot', label: 'Early Spot' },
                { id: 'late_leaf_spot', label: 'Late Spot' },
                { id: 'rust', label: 'Rust' },
                { id: 'nutrition_deficiency', label: 'Chlorosis' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setDiseaseFilter(f.id);
                    setPage(1);
                  }}
                  className={`shrink-0 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all min-h-[38px] sm:min-h-[40px] touch-target cursor-pointer ${
                    diseaseFilter === f.id
                      ? 'bg-agri-800 text-white shadow-xs'
                      : 'bg-white/85 sm:bg-white/70 text-slate-700 hover:bg-white/95 border border-emerald-950/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </Surface>

        {/* History Records Grid */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm">
            <div className="w-8 h-8 border-4 border-agri-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>Retrieving verified farm logs...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <Surface className="py-12 sm:py-16 px-4 text-center space-y-4 border-dashed border-2">
            <Scan className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mx-auto" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">No Detection Records Found</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              {searchQuery || diseaseFilter !== 'all'
                ? 'No historical logs match your current search and filter settings.'
                : 'Detections are saved explicitly from the Live Scanner. Start scanning crops to build your history.'}
            </p>
            <div className="pt-2">
              <Button asChild size="default" className="min-h-[44px]">
                <Link to="/scan" className="flex items-center space-x-2">
                  <Scan className="w-4 h-4" />
                  <span>Start Crop Scan</span>
                </Link>
              </Button>
            </div>
          </Surface>
        ) : (
          <>
            {/* Mobile Compact Diagnostic Log List (<sm) */}
            <div className="sm:hidden space-y-2.5">
              {filteredItems.map((item) => {
                const isHealthy = item.disease_name.toLowerCase().includes('healthy');
                const imageSrc = getDiseaseImage(item.disease_name, item.media_url);

                return (
                  <div
                    key={`mobile-${item.id}`}
                    className="glass-frost flex items-center gap-3 p-3 rounded-2xl"
                  >
                    <img
                      src={imageSrc}
                      alt={item.disease_name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-emerald-950/10 bg-slate-900"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                            isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        <h2 className="text-sm font-bold text-slate-900 truncate">
                          {item.disease_name}
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {new Date(item.diagnosis_timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        •{' '}
                        {new Date(item.diagnosis_timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-emerald-950/5 text-agri-800 border border-emerald-950/10">
                          {(item.confidence_score * 100).toFixed(0)}% Match
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleInspectRemedies(item)}
                        className="min-h-[42px] px-3 py-2 rounded-xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs touch-target cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>Remedies</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(item.id)}
                        className="h-[42px] w-[42px] rounded-xl border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 transition-colors flex items-center justify-center touch-target cursor-pointer"
                        aria-label={`Delete ${item.disease_name} record`}
                        title="Delete log entry"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop Specimen Card Grid (sm+) */}
            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredItems.map((item) => {
                const isHealthy = item.disease_name.toLowerCase().includes('healthy');
                const imageSrc = getDiseaseImage(item.disease_name, item.media_url);

                return (
                  <ExpandableProfileCard
                    key={item.id}
                    id={`history-item-${item.id}`}
                    imageSrc={imageSrc}
                    title={item.disease_name}
                    subtitle={`${new Date(item.diagnosis_timestamp).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })} • ${(item.confidence_score * 100).toFixed(0)}% Match`}
                    badge={
                      <Badge
                        variant={isHealthy ? 'optimal' : 'warning'}
                        className="shadow-sm backdrop-blur-md"
                      >
                        {isHealthy ? 'Healthy Foliage' : 'Pathogen Detected'}
                      </Badge>
                    }
                    content={
                      <div className="space-y-5">
                        {/* Telemetry info */}
                        <div className="p-4 rounded-2xl bg-emerald-950/5 border border-emerald-950/10 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Confidence Score</span>
                            <span className="font-mono font-bold text-agri-800 text-sm">
                              {(item.confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isHealthy
                                  ? 'bg-emerald-600'
                                  : item.confidence_score > 0.8
                                  ? 'bg-amber-500'
                                  : 'bg-rose-600'
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(10, item.confidence_score * 100))}%`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {new Date(item.diagnosis_timestamp).toLocaleDateString(undefined, {
                                dateStyle: 'medium',
                              })}
                            </span>
                            <span className="font-mono">
                              {new Date(item.diagnosis_timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Diagnostic Notes */}
                        <div>
                          <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider mb-1.5">
                            Field Assessment
                          </h4>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {isHealthy
                              ? 'Clean foliage profile verified with zero detected lesion chlorosis. Maintain scheduled irrigation and weekly crop inspection.'
                              : `AI vision detector flagged foliage symptoms consistent with ${item.disease_name}. Review curative and preventive field interventions below.`}
                          </p>
                        </div>

                        {/* Interactive Controls */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-emerald-950/10">
                          <button
                            type="button"
                            onClick={() => handleInspectRemedies(item)}
                            className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 shadow-xs touch-target cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4 shrink-0" />
                            <span>Inspect Full Treatment Plan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="min-h-[44px] py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 touch-target cursor-pointer"
                            title="Delete log entry"
                          >
                            <Trash2 className="w-4 h-4 shrink-0" />
                            <span>Delete</span>
                          </button>
                        </div>

                        <div className="pt-1">
                          <Link
                            to={`/guide?disease=${item.disease_id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-agri-700 hover:text-agri-800 hover:underline py-1"
                          >
                            <BookOpen className="w-3.5 h-3.5 shrink-0" />
                            <span>Open Disease Guide entry for {item.disease_name}</span>
                          </Link>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <Surface className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-semibold text-slate-600">
            <div>
              Showing page <span className="font-mono font-bold text-slate-900">{page}</span> of{' '}
              <span className="font-mono font-bold text-slate-900">{totalPages}</span> (Total{' '}
              {totalCount} records)
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
                className="h-11 w-11 rounded-xl border border-emerald-950/10 bg-white/80 hover:bg-white disabled:opacity-40 transition-colors touch-target flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
                className="h-11 w-11 rounded-xl border border-emerald-950/10 bg-white/80 hover:bg-white disabled:opacity-40 transition-colors touch-target flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </Surface>
        )}

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteId && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
                onClick={() => !isDeleting && setDeleteId(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="relative z-10 max-w-sm w-full"
              >
                <Surface className="w-full p-6 space-y-4 shadow-2xl text-center bg-white">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">
                      Confirm Record Soft Deletion
                    </h3>
                    <p className="text-xs text-slate-500">
                      This detection log will be archived and hidden from your active history
                      dashboard.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteId(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteConfirm}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Archiving...' : 'Delete'}
                    </Button>
                  </div>
                </Surface>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Full Treatment Plan Modal */}
        <TreatmentPlanModal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          diseaseName={selectedLog?.disease_name || ''}
          diseaseId={selectedLog?.disease_id || ''}
          confidenceScore={selectedLog?.confidence_score || 0}
          remedies={remediesForModal}
          isLoading={remediesLoading}
        />
      </div>
    </motion.div>
  );
};
