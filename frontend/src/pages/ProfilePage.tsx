import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  LogOut,
  Download,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Camera,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { User, HistoryLog, PaginatedHistoryResponse } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/card';

export const ProfilePage: React.FC = () => {
  const { user: initialUser, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(initialUser);

  // Editable profile state
  const [fullName, setFullName] = useState<string>(initialUser?.user_name || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(initialUser?.phone_number || '');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Diagnostic activity state
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
  const [totalScans, setTotalScans] = useState<number>(0);
  const [loadingActivity, setLoadingActivity] = useState<boolean>(true);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchProfileAndActivity = async () => {
      try {
        const res = await api.get<User>('/api/auth/me');
        setProfile(res.data);
        setFullName(res.data.user_name || '');
        setPhoneNumber(res.data.phone_number || '');
      } catch (err) {
        console.warn('Using local authenticated profile state', err);
      }

      setLoadingActivity(true);
      try {
        const histRes = await api.get<PaginatedHistoryResponse>('/api/history?page=1&limit=100');
        const items = histRes.data.items || [];
        setHistoryLogs(items);
        setTotalScans(histRes.data.total ?? histRes.data.total_count ?? items.length);
      } catch (err) {
        console.warn('Could not load diagnostic activity summary', err);
      } finally {
        setLoadingActivity(false);
      }
    };

    fetchProfileAndActivity();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const displayName = profile?.user_name || initialUser?.user_name || 'Farmer';
  const displayEmail = profile?.email_address || initialUser?.email_address || '';
  const isAdmin = (profile?.role || initialUser?.role) === 'admin';

  const memberSinceText = useMemo(() => {
    const rawDate = profile?.created_at || initialUser?.created_at;
    if (!rawDate) return null;
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [profile?.created_at, initialUser?.created_at]);

  // Compute diagnostic breakdown from fetched logs
  const activityStats = useMemo(() => {
    if (historyLogs.length === 0) {
      return {
        healthyCount: 0,
        diseasedCount: 0,
        healthyPct: 0,
        diseasedPct: 0,
        topCondition: 'No scans logged',
        lastScanDate: null as string | null,
      };
    }

    let healthy = 0;
    const counts: Record<string, number> = {};

    for (const log of historyLogs) {
      const isHealthyLeaf =
        log.disease_id === 'healthy_leaf' ||
        log.disease_name.toLowerCase().includes('healthy');
      if (isHealthyLeaf) {
        healthy += 1;
      }
      const label = log.disease_name || log.disease_id;
      counts[label] = (counts[label] || 0) + 1;
    }

    const diseased = historyLogs.length - healthy;
    const healthyPct = Math.round((healthy / historyLogs.length) * 100);
    const diseasedPct = 100 - healthyPct;

    let topCondition = 'None';
    let maxCount = 0;
    for (const [name, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        topCondition = name;
      }
    }

    const latestRaw = historyLogs[0]?.diagnosis_timestamp;
    const lastScanDate = latestRaw
      ? new Date(latestRaw).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

    return {
      healthyCount: healthy,
      diseasedCount: diseased,
      healthyPct,
      diseasedPct,
      topCondition,
      lastScanDate,
    };
  }, [historyLogs]);

  // Export CSV handler
  const handleExportCsv = () => {
    if (historyLogs.length === 0) return;

    const headers = ['Log ID', 'Diagnosis Timestamp', 'Condition Name', 'Disease ID', 'Confidence (%)'];
    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = historyLogs.map((log) => [
      log.id,
      log.diagnosis_timestamp,
      log.disease_name,
      log.disease_id,
      (log.confidence_score * 100).toFixed(1),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map(escapeCsv).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `groundnut-aid-history-${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Profile form dirty check & submit
  const baselineName = profile?.user_name || initialUser?.user_name || '';
  const baselinePhone = profile?.phone_number || initialUser?.phone_number || '';
  const isProfileDirty =
    fullName.trim() !== baselineName.trim() ||
    phoneNumber.trim() !== baselinePhone.trim();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNumber.trim();

    if (trimmedName.length < 2) {
      setProfileFeedback({
        type: 'error',
        message: 'Full name must be at least 2 characters.',
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = await updateProfile({
        user_name: trimmedName,
        phone_number: trimmedPhone ? trimmedPhone : null,
      });
      setProfile(updated);
      setFullName(updated.user_name || '');
      setPhoneNumber(updated.phone_number || '');
      setProfileFeedback({
        type: 'success',
        message: 'Profile details saved.',
      });
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || 'Unable to update profile details. Please try again.';
      setProfileFeedback({
        type: 'error',
        message: typeof detail === 'string' ? detail : 'Invalid profile input.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResetProfileForm = () => {
    setFullName(baselineName);
    setPhoneNumber(baselinePhone);
    setProfileFeedback(null);
  };

  // Password form submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'Enter your current password to continue.',
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: 'error',
        message: 'New password and confirmation do not match.',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordFeedback({
        type: 'success',
        message: res.message || 'Password updated successfully.',
      });
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || 'Could not update password. Verify your current password.';
      setPasswordFeedback({
        type: 'error',
        message: typeof detail === 'string' ? detail : 'Password update failed.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen bg-transparent pt-4 pb-24 sm:py-8 sm:pb-12 px-4 sm:px-6 lg:px-8 font-sans"
    >
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* 1. Minimal Profile Header */}
        <Card glass className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between gap-3 sm:gap-5">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-agri-800 text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-xs shrink-0 select-none">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 space-y-0.5 sm:space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                    {displayName}
                  </h1>
                  {isAdmin && (
                    <Badge
                      variant="warning"
                      className="bg-amber-100/90 text-amber-900 border-amber-300"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>Administrator</span>
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs sm:text-sm text-slate-600">
                  <span className="truncate max-w-full">{displayEmail}</span>
                  {memberSinceText && (
                    <>
                      <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                        •
                      </span>
                      <span className="hidden sm:inline text-xs sm:text-sm text-slate-500">
                        Member since {memberSinceText}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="shrink-0 min-h-[42px] px-3 sm:px-4"
            >
              <LogOut className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </Card>

        {/* 2. Diagnostic Activity & Field Data Export */}
        <Card glass className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Detection Activity &amp; Field Records
              </h2>
              <p className="hidden sm:block text-sm text-slate-600">
                Summary of your saved foliage detections and downloadable CSV report.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={loadingActivity || historyLogs.length === 0}
                className="min-h-[42px] w-full sm:w-auto"
              >
                <Download className="w-4 h-4 text-agri-700 shrink-0" />
                <span>Export CSV</span>
              </Button>
              <Button variant="secondary" size="sm" asChild className="min-h-[42px] w-full sm:w-auto">
                <Link to="/history">
                  <span>View History</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </Button>
            </div>
          </div>

          {loadingActivity ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-emerald-950/10">
              {[0, 1, 2, 3].map((idx) => (
                <div key={idx} className="space-y-2 animate-pulse">
                  <div className="h-3 w-20 bg-slate-200/80 rounded" />
                  <div className="h-7 w-14 bg-slate-200/80 rounded" />
                </div>
              ))}
            </div>
          ) : totalScans === 0 ? (
            <div className="pt-4 sm:pt-5 border-t border-emerald-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  No field detections saved yet
                </p>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Scan groundnut foliage and save confirmed results to populate your farm log and enable CSV exports.
                </p>
              </div>
              <Button size="sm" asChild className="w-full sm:w-auto min-h-[44px] shrink-0">
                <Link to="/scan">
                  <Camera className="w-4 h-4" />
                  <span>Open Scanner</span>
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4 sm:gap-x-6 pt-4 sm:pt-5 border-t border-emerald-950/10">
              <div className="space-y-0.5 sm:space-y-1">
                <div className="text-xs font-medium text-slate-600">Saved Scans</div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {totalScans}
                </div>
                {activityStats.lastScanDate && (
                  <div className="text-xs text-slate-500">
                    Last: {activityStats.lastScanDate}
                  </div>
                )}
              </div>

              <div className="space-y-0.5 sm:space-y-1">
                <div className="text-xs font-medium text-slate-600">Healthy Canopy</div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono tabular-nums">
                  {activityStats.healthyCount}
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  {activityStats.healthyPct}% of log
                </div>
              </div>

              <div className="space-y-0.5 sm:space-y-1">
                <div className="text-xs font-medium text-slate-600">Pathology Detected</div>
                <div className="text-xl sm:text-2xl font-bold text-amber-800 font-mono tabular-nums">
                  {activityStats.diseasedCount}
                </div>
                <div className="text-xs text-slate-500 font-mono tabular-nums">
                  {activityStats.diseasedPct}% of log
                </div>
              </div>

              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <div className="text-xs font-medium text-slate-600">Most Frequent</div>
                <div
                  className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2"
                  title={activityStats.topCondition}
                >
                  {activityStats.topCondition}
                </div>
                <div className="text-xs text-slate-500">Primary logged class</div>
              </div>
            </div>
          )}
        </Card>

        {/* 3. Editable Personal Information */}
        <Card glass className="p-4 sm:p-6 md:p-8">
          <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-6">
            <div className="space-y-0.5 sm:space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Personal Information
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Manage your display name and contact phone number.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 pt-3.5 sm:pt-4 border-t border-emerald-950/10">
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-full-name"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Full Name
                </label>
                <input
                  id="profile-full-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (profileFeedback) setProfileFeedback(null);
                  }}
                  placeholder="Enter your name"
                  className="w-full h-11 px-3.5 rounded-xl border border-emerald-950/15 bg-white/85 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="profile-phone"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Phone Number
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  maxLength={25}
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (profileFeedback) setProfileFeedback(null);
                  }}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-11 px-3.5 rounded-xl border border-emerald-950/15 bg-white/85 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600 focus:bg-white transition-all"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label
                  htmlFor="profile-email"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="profile-email"
                    type="email"
                    value={displayEmail}
                    disabled
                    readOnly
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-100/80 text-slate-600 text-base sm:text-sm cursor-not-allowed select-all"
                  />
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Your email address is tied to 2FA verification and cannot be changed here.
                </p>
              </div>
            </div>

            {profileFeedback && (
              <div
                role="status"
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold border ${
                  profileFeedback.type === 'success'
                    ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50/90 text-rose-900 border-rose-200'
                }`}
              >
                {profileFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{profileFeedback.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              {isProfileDirty && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetProfileForm}
                  disabled={isSavingProfile}
                  className="min-h-[42px]"
                >
                  Discard
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!isProfileDirty || isSavingProfile}
                className="min-h-[42px]"
              >
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>

        {/* 4. Password & Security Controls */}
        <Card glass className="p-4 sm:p-6 md:p-8">
          <form onSubmit={handlePasswordSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-0.5 sm:space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Password &amp; Security
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Update your account password. Choose a strong password with at least 8 characters.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 pt-3.5 sm:pt-4 border-t border-emerald-950/10">
              <div className="sm:col-span-2 space-y-1.5">
                <label
                  htmlFor="current-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (passwordFeedback) setPasswordFeedback(null);
                    }}
                    placeholder="Enter current password"
                    className="w-full h-11 pl-3.5 pr-11 rounded-xl border border-emerald-950/15 bg-white/85 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg touch-target cursor-pointer"
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordFeedback) setPasswordFeedback(null);
                    }}
                    placeholder="At least 8 characters"
                    className="w-full h-11 pl-3.5 pr-11 rounded-xl border border-emerald-950/15 bg-white/85 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-lg touch-target cursor-pointer"
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirm-password"
                  type={showNewPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordFeedback) setPasswordFeedback(null);
                  }}
                  placeholder="Re-enter new password"
                  className="w-full h-11 px-3.5 rounded-xl border border-emerald-950/15 bg-white/85 text-slate-900 placeholder-slate-400 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-agri-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            {passwordFeedback && (
              <div
                role="status"
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold border ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200'
                    : 'bg-rose-50/90 text-rose-900 border-rose-200'
                }`}
              >
                {passwordFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{passwordFeedback.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                size="sm"
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="min-h-[42px]"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </motion.div>
  );
};

export default ProfilePage;
