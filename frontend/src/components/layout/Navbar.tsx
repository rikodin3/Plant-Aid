import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  History,
  BookOpen,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Camera,
  Home,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PlantAidLogo } from './PlantAidLogo';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, requiresAuth: true },
    { name: 'History', path: '/history', icon: History, requiresAuth: true },
    { name: 'Disease Guide', path: '/guide', icon: BookOpen, requiresAuth: false },
    ...(isAdmin ? [{ name: 'Admin Console', path: '/admin', icon: ShieldCheck, requiresAuth: true }] : []),
  ];

  const visibleLinks = navLinks.filter((link) => !link.requiresAuth || isAuthenticated);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#e8f6f6]/65 backdrop-blur-xl border-b border-white/70 shadow-[0_4px_20px_-4px_rgba(15,87,87,0.05)]">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
            {/* Brand Logo */}
            <Link to={isAuthenticated ? '/dashboard' : '/'} className="group shrink-0">
              <PlantAidLogo size="sm" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-0.5 lg:space-x-1 shrink-0">
              {visibleLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-1.5 lg:space-x-2 px-2.5 lg:px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-agri-50 text-agri-800 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-agri-700' : 'text-slate-400'}`} />
                    <span className="whitespace-nowrap">{link.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Header Section (Desktop) */}
            <div className="hidden md:flex items-center space-x-3 shrink-0">
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-agri-100 text-agri-800 flex items-center justify-center text-xs font-bold">
                      {user?.user_name ? user.user_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="max-w-[120px] truncate">{user?.user_name || 'Account'}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4 text-slate-600 hover:text-rose-700" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/auth"
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth?mode=register"
                    className="px-4 py-2 text-sm font-medium text-white bg-agri-700 hover:bg-agri-800 rounded-lg shadow-sm transition-all"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Top-Right Compact Actions */}
            <div className="md:hidden flex items-center space-x-1.5">
              {!isAuthenticated ? (
                <Link
                  to="/auth"
                  className="px-3 py-1.5 rounded-xl bg-agri-700 text-white text-xs font-bold shadow-xs min-h-[36px] inline-flex items-center"
                >
                  Sign In
                </Link>
              ) : (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="h-10 w-10 rounded-xl text-slate-700 hover:bg-white/60 touch-target flex items-center justify-center"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Secondary Drawer (Admin & Sign Out when authenticated) */}
        {mobileMenuOpen && isAuthenticated && (
          <div className="md:hidden border-t border-white/70 bg-white/80 backdrop-blur-xl px-4 py-3 space-y-2 shadow-lg">
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-white/70"
              >
                <ShieldCheck className="w-4 h-4 text-agri-700" />
                <span>Admin Console</span>
              </Link>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50 font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out ({user?.user_name || 'Account'})</span>
            </button>
          </div>
        )}
      </header>

      {/* Thumb-Zone Mobile Bottom Navigation Bar (<md) */}
      {location.pathname !== '/auth' && (
        <nav
          aria-label="Mobile bottom navigation"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/70 backdrop-blur-xl border-t border-white/80 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,87,87,0.08)]"
        >
          <div className={`grid ${isAuthenticated ? 'grid-cols-5' : 'grid-cols-3'} items-center h-14 max-w-md mx-auto`}>
            <Link
              to={isAuthenticated ? '/dashboard' : '/'}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-semibold transition-colors touch-target ${
                location.pathname === '/dashboard' || location.pathname === '/'
                  ? 'text-agri-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAuthenticated ? (
                <LayoutDashboard className="w-4 h-4 shrink-0" />
              ) : (
                <Home className="w-4 h-4 shrink-0" />
              )}
              <span>Home</span>
            </Link>

            {isAuthenticated && (
              <Link
                to="/history"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-semibold transition-colors touch-target ${
                  location.pathname === '/history'
                    ? 'text-agri-800'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4 shrink-0" />
                <span>History</span>
              </Link>
            )}

            <Link
              to={isAuthenticated ? '/scan' : '/auth?mode=register'}
              aria-label="Scan Leaf"
              className="flex flex-col items-center justify-center -mt-3 touch-target"
            >
              <span
                className={`flex items-center justify-center w-11 h-11 rounded-2xl shadow-md transition-transform active:scale-95 ${
                  location.pathname === '/scan'
                    ? 'bg-agri-900 text-white ring-2 ring-emerald-400/50'
                    : 'bg-agri-700 text-white'
                }`}
              >
                <Camera className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold text-agri-900 mt-0.5">Scan</span>
            </Link>

            <Link
              to="/guide"
              className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-semibold transition-colors touch-target ${
                location.pathname === '/guide'
                  ? 'text-agri-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Guide</span>
            </Link>

            {isAuthenticated && (
              <Link
                to="/profile"
                className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-semibold transition-colors touch-target ${
                  location.pathname === '/profile'
                    ? 'text-agri-800'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserIcon className="w-4 h-4 shrink-0" />
                <span>Profile</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
};
