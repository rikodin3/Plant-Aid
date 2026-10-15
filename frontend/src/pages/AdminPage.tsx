import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  ShieldCheck,
  History,
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Leaf,
  ExternalLink,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import {
  AdminUserItem,
  AdminPaginatedUsersResponse,
  AdminHistoryItem,
  AdminPaginatedHistoryResponse,
  Remedy,
  RemedyMutationPayload,
} from '../types';

const GROUNDNUT_DISEASES = [
  { id: 'early_leaf_spot', name: 'Groundnut Early Leaf Spot' },
  { id: 'early_rust', name: 'Groundnut Early Rust' },
  { id: 'late_leaf_spot', name: 'Groundnut Late Leaf Spot' },
  { id: 'rust', name: 'Groundnut Rust' },
  { id: 'nutrition_deficiency', name: 'Nutrition Deficiency' },
  { id: 'healthy_leaf', name: 'Healthy Leaf' },
];

const REMEDY_CATEGORIES = [
  'Organic / Biological',
  'Chemical / Fungicide',
  'Preventive Cultural Practice',
];

export const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'history' | 'remedies'>('users');

  // --- Users State ---
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [userPage, setUserPage] = useState(1);

  // --- Global History State ---
  const [historyItems, setHistoryItems] = useState<AdminHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDiseaseFilter, setHistoryDiseaseFilter] = useState('');
  const [historyPage, setHistoryPage] = useState(1);

  // --- Remedy State ---
  const [selectedDiseaseId, setSelectedDiseaseId] = useState('early_leaf_spot');
  const [remedies, setRemedies] = useState<Remedy[]>([]);
  const [remediesLoading, setRemediesLoading] = useState(false);
  const [editingRemedy, setEditingRemedy] = useState<Remedy | null>(null);
  const [isAddingRemedy, setIsAddingRemedy] = useState(false);
  const [remedyForm, setRemedyForm] = useState<RemedyMutationPayload>({
    disease_id: 'early_leaf_spot',
    remedy_type: 'Bio-Fungicide',
    title: '',
    description: '',
    application_instructions: '',
    category: 'Organic / Biological',
  });

  // Action status message
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- 1. Fetch Users ---
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (userSearch) params.set('search', userSearch);
      if (userRoleFilter) params.set('role', userRoleFilter);
      if (userStatusFilter) params.set('status', userStatusFilter);
      params.set('page', String(userPage));
      params.set('limit', '20');

      const res = await api.get<AdminPaginatedUsersResponse>(`/api/admin/users?${params.toString()}`);
      setUsers(res.data.items);
      setUsersTotal(res.data.total);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to fetch users list');
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, userRoleFilter, userStatusFilter, userPage]);

  // --- 2. Fetch Global History ---
  const fetchGlobalHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      if (historySearch) params.set('search', historySearch);
      if (historyDiseaseFilter) params.set('disease_id', historyDiseaseFilter);
      params.set('page', String(historyPage));
      params.set('limit', '20');

      const res = await api.get<AdminPaginatedHistoryResponse>(`/api/admin/history?${params.toString()}`);
      setHistoryItems(res.data.items);
      setHistoryTotal(res.data.total);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to fetch global history');
    } finally {
      setHistoryLoading(false);
    }
  }, [historySearch, historyDiseaseFilter, historyPage]);

  // --- 3. Fetch Remedies for Disease ---
  const fetchRemedies = useCallback(async (diseaseId: string) => {
    setRemediesLoading(true);
    try {
      const res = await api.get<{ remedies: Remedy[] }>(`/api/remedies/${diseaseId}`);
      setRemedies(res.data.remedies || []);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to fetch remedies catalog');
    } finally {
      setRemediesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab, fetchUsers]);

  useEffect(() => {
    if (activeTab === 'history') fetchGlobalHistory();
  }, [activeTab, fetchGlobalHistory]);

  useEffect(() => {
    if (activeTab === 'remedies') fetchRemedies(selectedDiseaseId);
  }, [activeTab, selectedDiseaseId, fetchRemedies]);

  // --- User Role Toggle ---
  const handleToggleRole = async (targetUser: AdminUserItem) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await api.patch(`/api/admin/users/${targetUser.id}/role`, { role: newRole });
      showNotification('success', `Updated ${targetUser.user_name}'s role to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to update user role');
    }
  };

  // --- User Status Toggle ---
  const handleToggleStatus = async (targetUser: AdminUserItem) => {
    const newStatus = targetUser.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/api/admin/users/${targetUser.id}/status`, { account_status: newStatus });
      showNotification(
        'success',
        `${targetUser.user_name}'s account is now ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`
      );
      fetchUsers();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to update account status');
    }
  };

  // --- Remedy Create / Edit / Delete ---
  const handleSaveRemedy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRemedy) {
        await api.put(`/api/admin/remedies/${editingRemedy.id}`, {
          remedy_type: remedyForm.remedy_type,
          title: remedyForm.title,
          description: remedyForm.description,
          application_instructions: remedyForm.application_instructions,
          category: remedyForm.category,
        });
        showNotification('success', 'Remedy protocol successfully updated');
      } else {
        await api.post('/api/admin/remedies', {
          ...remedyForm,
          disease_id: selectedDiseaseId,
        });
        showNotification('success', 'New treatment remedy added to catalog');
      }
      setIsAddingRemedy(false);
      setEditingRemedy(null);
      fetchRemedies(selectedDiseaseId);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to save remedy');
    }
  };

  const handleDeleteRemedy = async (remedyId: number) => {
    if (!window.confirm('Are you sure you want to delete this remedy recommendation?')) return;
    try {
      await api.delete(`/api/admin/remedies/${remedyId}`);
      showNotification('success', 'Remedy deleted successfully');
      fetchRemedies(selectedDiseaseId);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to delete remedy');
    }
  };

  const openAddRemedyModal = () => {
    setEditingRemedy(null);
    setRemedyForm({
      disease_id: selectedDiseaseId,
      remedy_type: 'Bio-Fungicide',
      title: '',
      description: '',
      application_instructions: '',
      category: 'Organic / Biological',
    });
    setIsAddingRemedy(true);
  };

  const openEditRemedyModal = (remedy: Remedy) => {
    setEditingRemedy(remedy);
    setRemedyForm({
      disease_id: remedy.disease_id,
      remedy_type: remedy.remedy_type || 'Treatment',
      title: remedy.title,
      description: remedy.description,
      application_instructions: remedy.application_instructions || '',
      category: remedy.category,
    });
    setIsAddingRemedy(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-transparent pt-6 pb-24 sm:py-8 sm:pb-12 px-4 sm:px-6 lg:px-8 font-sans"
    >
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Admin Header Console */}
        <Card
          glass
          className="p-4 sm:p-6 md:p-8 backdrop-blur-xl border border-emerald-950/10 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-agri-700 to-agri-900 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl font-normal text-slate-900 tracking-tight">
                    Platform Administration
                  </h1>
                  <p className="hidden sm:block text-sm text-slate-600 leading-relaxed">
                    Governance console for user authorization, detection logs, and remedy catalog management
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
              <Badge variant="warning" className="bg-amber-100/90 text-amber-900 border-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Super-User Active</span>
              </Badge>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-emerald-950/10">
            <div className="p-2 sm:p-3.5 rounded-xl sm:bg-white/70 sm:border sm:border-emerald-950/10 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-agri-700 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-600">
                  Operators
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums">{usersTotal}</div>
              </div>
            </div>

            <div className="p-2 sm:p-3.5 rounded-xl sm:bg-white/70 sm:border sm:border-emerald-950/10 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <History className="w-4 h-4 sm:w-5 sm:h-5 text-agri-700 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-600">
                  Detections
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums">{historyTotal}</div>
              </div>
            </div>

            <div className="p-2 sm:p-3.5 rounded-xl sm:bg-white/70 sm:border sm:border-emerald-950/10 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-agri-700 shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-600">
                  Classes
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-900 font-mono tabular-nums">{GROUNDNUT_DISEASES.length}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Floating Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl shadow-lg border backdrop-blur-md flex items-center space-x-3 ${
                notification.type === 'success'
                  ? 'bg-emerald-500/90 text-white border-emerald-400'
                  : 'bg-rose-500/90 text-white border-rose-400'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Administration Tabs */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
          <TabsList className="grid grid-cols-3 sm:inline-flex bg-white/85 backdrop-blur-md border border-emerald-950/10 p-1.5 rounded-2xl shadow-xs w-full sm:w-auto">
            <TabsTrigger value="users" className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-2 sm:px-4 py-2">
              <Users className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">Users</span>
              <span className="hidden sm:inline">User Governance</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-2 sm:px-4 py-2">
              <History className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">Records</span>
              <span className="hidden sm:inline">Global Detection Records</span>
            </TabsTrigger>
            <TabsTrigger value="remedies" className="flex items-center justify-center space-x-1.5 sm:space-x-2 px-2 sm:px-4 py-2">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">Remedies</span>
              <span className="hidden sm:inline">Remedy &amp; Treatment Catalog</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: USER GOVERNANCE */}
          <TabsContent value="users" className="space-y-4">
            <Card glass className="p-4 sm:p-6 backdrop-blur-xl border border-emerald-950/10 shadow-xs">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-4 sm:pb-6 border-b border-emerald-950/10">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by operator name, email, or phone..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-white/85 border border-slate-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600 transition"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="flex-1 sm:flex-initial min-h-[44px] px-3 py-2 rounded-xl bg-white/85 border border-slate-200 text-base sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-agri-600"
                  >
                    <option value="">All Roles</option>
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="flex-1 sm:flex-initial min-h-[44px] px-3 py-2 rounded-xl bg-white/85 border border-slate-200 text-base sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-agri-600"
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="PENDING_VERIFICATION">Pending</option>
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUsers}
                    title="Refresh user list"
                    className="min-h-[44px] min-w-[44px] p-2.5"
                  >
                    <RefreshCw className={`w-4 h-4 text-slate-600 ${usersLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Mobile Operators List (<md) */}
              <div className="md:hidden divide-y divide-slate-100 pt-2">
                {usersLoading ? (
                  <div className="py-10 text-center text-slate-500 text-sm">
                    <div className="w-6 h-6 border-2 border-agri-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading registered operators…
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-sm">
                    No operators found matching criteria.
                  </div>
                ) : (
                  users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <div key={u.id} className="py-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-agri-100 text-agri-800 flex items-center justify-center font-bold text-xs shrink-0">
                              {u.user_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-slate-900 truncate">
                                {u.user_name} {isSelf && <span className="text-xs text-agri-600 font-normal">(You)</span>}
                              </div>
                              <div className="text-xs text-slate-600 truncate">{u.email_address}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {u.role === 'admin' ? (
                              <Badge variant="warning" className="bg-amber-100/90 text-amber-900 border-amber-300 text-xs">
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-600 bg-white/80 text-xs">
                                User
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                          <div className="flex items-center gap-3">
                            {u.account_status === 'ACTIVE' ? (
                              <span className="inline-flex items-center space-x-1 font-semibold text-emerald-700">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span>Active</span>
                              </span>
                            ) : u.account_status === 'SUSPENDED' ? (
                              <span className="inline-flex items-center space-x-1 font-semibold text-rose-700">
                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                <span>Suspended</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 font-semibold text-amber-700">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span>Pending</span>
                              </span>
                            )}
                            <span className="font-mono tabular-nums">{u.history_count} scans</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={isSelf}
                              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                isSelf
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : u.role === 'admin'
                                  ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {u.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={isSelf}
                              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                isSelf
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : u.account_status === 'ACTIVE'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {u.account_status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Users Table (md+) */}
              <div className="hidden md:block overflow-x-auto pt-4">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="pb-3 font-bold">Operator</th>
                      <th scope="col" className="pb-3 font-bold">Role</th>
                      <th scope="col" className="pb-3 font-bold">Status</th>
                      <th scope="col" className="pb-3 font-bold">Scans Logged</th>
                      <th scope="col" className="pb-3 font-bold">Registered</th>
                      <th scope="col" className="pb-3 font-bold">Last Login</th>
                      <th scope="col" className="pb-3 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          <div className="w-6 h-6 border-2 border-agri-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading registered operators…
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No operators found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSelf = u.id === currentUser?.id;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3.5 pr-4">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-full bg-agri-100 text-agri-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {u.user_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate">
                                    {u.user_name} {isSelf && <span className="text-xs text-agri-600 font-normal">(You)</span>}
                                  </div>
                                  <div className="text-xs text-slate-500 truncate">{u.email_address}</div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 pr-4">
                              {u.role === 'admin' ? (
                                <Badge variant="warning" className="bg-amber-100/90 text-amber-900 border-amber-300">
                                  <ShieldCheck className="w-3 h-3 text-amber-700" />
                                  <span>Admin</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-600 bg-white/80">
                                  <span>User</span>
                                </Badge>
                              )}
                            </td>

                            <td className="py-3.5 pr-4">
                              {u.account_status === 'ACTIVE' ? (
                                <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span>Active</span>
                                </span>
                              ) : u.account_status === 'SUSPENDED' ? (
                                <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-rose-700">
                                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                                  <span>Suspended</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-amber-700">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  <span>Pending</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 pr-4">
                              <span className="font-mono text-xs font-bold text-slate-700 tabular-nums">
                                {u.history_count}
                              </span>
                            </td>

                            <td className="py-3.5 pr-4 text-xs text-slate-500 tabular-nums">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                            </td>

                            <td className="py-3.5 pr-4 text-xs tabular-nums">
                              {u.last_login_at ? (
                                <span className="text-slate-700" title={new Date(u.last_login_at).toISOString()}>
                                  {new Date(u.last_login_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Never</span>
                              )}
                            </td>

                            <td className="py-3.5 text-right space-x-2 whitespace-nowrap">
                              {/* Toggle Role Button */}
                              <button
                                onClick={() => handleToggleRole(u)}
                                disabled={isSelf}
                                title={isSelf ? 'Safety Lock: Cannot alter own admin role' : `Change role to ${u.role === 'admin' ? 'user' : 'admin'}`}
                                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-500 ${
                                  isSelf
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : u.role === 'admin'
                                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                {u.role === 'admin' ? 'Demote' : 'Promote'}
                              </button>

                              {/* Toggle Status Button */}
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={isSelf}
                                title={isSelf ? 'Safety Lock: Cannot suspend own account' : `${u.account_status === 'ACTIVE' ? 'Suspend' : 'Activate'} user`}
                                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agri-500 ${
                                  isSelf
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : u.account_status === 'ACTIVE'
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                {u.account_status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500">
                <div>
                  Showing {users.length} of {usersTotal} operators (Page {userPage})
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={userPage * 20 >= usersTotal}
                    onClick={() => setUserPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 2: GLOBAL DIAGNOSTIC RECORDS */}
          <TabsContent value="history" className="space-y-4">
            <Card glass className="p-4 sm:p-6 backdrop-blur-xl border border-emerald-950/10 shadow-xs">
              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-4 sm:pb-6 border-b border-emerald-950/10">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by operator, email, or disease name..."
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-white/85 border border-slate-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600 transition"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={historyDiseaseFilter}
                    onChange={(e) => setHistoryDiseaseFilter(e.target.value)}
                    className="flex-1 sm:flex-initial min-h-[44px] px-3 py-2 rounded-xl bg-white/85 border border-slate-200 text-base sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-agri-600"
                  >
                    <option value="">All Groundnut Diseases</option>
                    {GROUNDNUT_DISEASES.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchGlobalHistory}
                    title="Refresh history feed"
                    className="min-h-[44px] min-w-[44px] p-2.5"
                  >
                    <RefreshCw className={`w-4 h-4 text-slate-600 ${historyLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Mobile History List (<md) */}
              <div className="md:hidden divide-y divide-slate-100 pt-2">
                {historyLoading ? (
                  <div className="py-10 text-center text-slate-500 text-sm">
                    <div className="w-6 h-6 border-2 border-agri-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading global detection records...
                  </div>
                ) : historyItems.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-sm">
                    No detection records found.
                  </div>
                ) : (
                  historyItems.map((log) => {
                    const pct = Math.round(log.confidence_score * 100);
                    return (
                      <div key={log.id} className="py-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <Leaf className="w-4 h-4 text-agri-600 shrink-0" />
                            <span className="font-semibold text-sm text-slate-900 truncate">{log.disease_name}</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                            {pct}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                          <div className="truncate">
                            <span className="font-medium text-slate-800">{log.user_name}</span>
                            <span className="mx-1.5 text-slate-300">•</span>
                            <span>{new Date(log.diagnosis_timestamp).toLocaleDateString()}</span>
                          </div>
                          {log.media_url ? (
                            <a
                              href={log.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs text-agri-700 hover:text-agri-900 font-semibold underline underline-offset-2 shrink-0"
                            >
                              <span>Image</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500 shrink-0">Archived</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop History Table (md+) */}
              <div className="hidden md:block overflow-x-auto pt-4">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="pb-3 font-bold">Timestamp</th>
                      <th className="pb-3 font-bold">Operator</th>
                      <th className="pb-3 font-bold">Identified Condition</th>
                      <th className="pb-3 font-bold">Confidence</th>
                      <th className="pb-3 font-bold text-right">Media</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          <div className="w-6 h-6 border-2 border-agri-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading global detection records...
                        </td>
                      </tr>
                    ) : historyItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          No detection records found.
                        </td>
                      </tr>
                    ) : (
                      historyItems.map((log) => {
                        const pct = Math.round(log.confidence_score * 100);
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3.5 pr-4 text-xs text-slate-500 whitespace-nowrap">
                              {new Date(log.diagnosis_timestamp).toLocaleString()}
                            </td>

                            <td className="py-3.5 pr-4">
                              <div className="font-semibold text-slate-900">{log.user_name}</div>
                              <div className="text-xs text-slate-500 truncate max-w-[180px]">{log.email_address}</div>
                            </td>

                            <td className="py-3.5 pr-4">
                              <div className="flex items-center space-x-2">
                                <Leaf className="w-4 h-4 text-agri-600 flex-shrink-0" />
                                <span className="font-semibold text-slate-800">{log.disease_name}</span>
                              </div>
                            </td>

                            <td className="py-3.5 pr-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs font-bold text-slate-700">{pct}%</span>
                              </div>
                            </td>

                            <td className="py-3.5 text-right whitespace-nowrap">
                              {log.media_url ? (
                                <a
                                  href={log.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 text-xs text-agri-700 hover:text-agri-900 font-semibold underline underline-offset-2"
                                >
                                  <span>View Image</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-slate-500">Archived</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <div>
                  Showing {historyItems.length} of {historyTotal} records (Page {historyPage})
                </div>
                <div className="flex items-center space-x-2 self-end sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage * 20 >= historyTotal}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* TAB 3: REMEDY & TREATMENT CATALOG */}
          <TabsContent value="remedies" className="space-y-4">
            <Card glass className="p-4 sm:p-6 backdrop-blur-xl border border-emerald-950/10 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-emerald-950/10">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900">Disease Remedy Catalog</h2>
                  <p className="text-xs sm:text-sm text-slate-600">
                    Add, update, or remove biological, chemical, and cultural treatments served to farmers
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <select
                    value={selectedDiseaseId}
                    onChange={(e) => setSelectedDiseaseId(e.target.value)}
                    className="flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2 rounded-xl bg-white/85 border border-slate-200 text-base sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-agri-600"
                  >
                    {GROUNDNUT_DISEASES.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <Button
                    onClick={openAddRemedyModal}
                    className="min-h-[44px] flex items-center space-x-1.5 bg-agri-700 hover:bg-agri-800 text-white text-xs sm:text-sm px-4 py-2 rounded-xl shadow-xs shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Remedy</span>
                  </Button>
                </div>
              </div>

              {/* Remedies Grid */}
              <div className="pt-5 sm:pt-6">
                {remediesLoading ? (
                  <div className="py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-agri-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading remedies catalog...
                  </div>
                ) : remedies.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 bg-white/40 rounded-xl border border-dashed border-slate-200">
                    No remedies listed for this condition yet. Click &quot;Add Remedy&quot; above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {remedies.map((remedy) => {
                      const isOrganic = remedy.category.toLowerCase().includes('organic') || remedy.category.toLowerCase().includes('biological');
                      const isChemical = remedy.category.toLowerCase().includes('chemical') || remedy.category.toLowerCase().includes('fungicide');

                      return (
                        <div
                          key={remedy.id}
                          className="p-4 sm:p-5 rounded-2xl bg-white/85 border border-emerald-950/10 shadow-xs flex flex-col justify-between space-y-4 hover:border-agri-600/30 transition"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <Badge
                                variant={isOrganic ? 'optimal' : isChemical ? 'destructive' : 'warning'}
                                className="text-xs"
                              >
                                {remedy.category}
                              </Badge>
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => openEditRemedyModal(remedy)}
                                  className="h-11 w-11 rounded-xl text-agri-700 hover:text-agri-900 hover:bg-emerald-50 flex items-center justify-center transition touch-target cursor-pointer"
                                  title="Edit remedy"
                                  aria-label="Edit remedy"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRemedy(remedy.id)}
                                  className="h-11 w-11 rounded-xl text-rose-700 hover:text-rose-900 hover:bg-rose-50 flex items-center justify-center transition touch-target cursor-pointer"
                                  title="Delete remedy"
                                  aria-label="Delete remedy"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{remedy.title}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{remedy.description}</p>
                          </div>

                          {remedy.application_instructions && (
                            <div className="pt-3 border-t border-slate-100">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Application Protocol
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100/80 font-mono leading-relaxed">
                                {remedy.application_instructions}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal: Add / Edit Remedy Dialog */}
        <AnimatePresence>
          {isAddingRemedy && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
              >
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-agri-700 shrink-0" />
                    <h3 className="text-base font-bold text-slate-900">
                      {editingRemedy ? 'Edit Treatment Protocol' : 'Add Treatment Protocol'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingRemedy(false)}
                    className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 touch-target cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveRemedy} className="p-4 sm:p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Target Condition
                    </label>
                    <select
                      value={remedyForm.disease_id}
                      onChange={(e) => setRemedyForm({ ...remedyForm, disease_id: e.target.value })}
                      disabled={!!editingRemedy}
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600"
                    >
                      {GROUNDNUT_DISEASES.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={remedyForm.category}
                        onChange={(e) => setRemedyForm({ ...remedyForm, category: e.target.value })}
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600"
                      >
                        {REMEDY_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Remedy Type
                      </label>
                      <input
                        type="text"
                        value={remedyForm.remedy_type}
                        onChange={(e) => setRemedyForm({ ...remedyForm, remedy_type: e.target.value })}
                        placeholder="e.g. Bio-Fungicide"
                        required
                        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Treatment Title
                    </label>
                    <input
                      type="text"
                      value={remedyForm.title}
                      onChange={(e) => setRemedyForm({ ...remedyForm, title: e.target.value })}
                      placeholder="e.g. Trichoderma viride seed treatment"
                      required
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Description &amp; Mode of Action
                    </label>
                    <textarea
                      rows={3}
                      value={remedyForm.description}
                      onChange={(e) => setRemedyForm({ ...remedyForm, description: e.target.value })}
                      placeholder="Explain how this treatment controls the condition..."
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Application Protocol / Dosage (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={remedyForm.application_instructions}
                      onChange={(e) => setRemedyForm({ ...remedyForm, application_instructions: e.target.value })}
                      placeholder="e.g. 4g per kg seed or 2.5ml per liter water..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingRemedy(false)}
                      className="min-h-[42px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-agri-700 hover:bg-agri-800 text-white min-h-[42px]"
                    >
                      {editingRemedy ? 'Save Changes' : 'Add Treatment'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default AdminPage;
