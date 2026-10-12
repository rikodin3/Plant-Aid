import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PlantAidIcon } from '../components/layout/PlantAidLogo';
import { TwoFactorChallengeResponse } from '../types';
import api from '../services/api';

export const AuthPage: React.FC = () => {
  const { login, verify2FA, resendOTP, register, forgotPassword, resetPassword, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const queryMode = queryParams.get('mode');
  const initialMode =
    queryMode === 'register' || queryMode === 'forgot' ? queryMode : 'login';

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Flow State
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 2FA Challenge State
  const [challenge, setChallenge] = useState<TwoFactorChallengeResponse | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);

  // Pre-warm backend & serverless Postgres connection while user types credentials
  useEffect(() => {
    api.get('/api/health').catch(() => {});
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 2FA countdown timer
  useEffect(() => {
    if (!challenge) return;

    setSecondsRemaining(challenge.expires_in || 300);
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [challenge]);

  // Resend cooldown timer
  useEffect(() => {
    if (!challenge || resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [challenge, resendCooldown]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter your email or phone number and password.');
      return;
    }

    setLoading(true);
    try {
      const challengeRes = await login(identifier.trim(), password);
      setChallenge(challengeRes);
      setResendCooldown(60);
      setOtpCode('');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Invalid login credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Name, email address, and password are required.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const regUser = await register(name.trim(), email.trim(), password, phone.trim() || null);
      if (regUser.session_id) {
        setChallenge({
          session_id: regUser.session_id,
          expires_in: 300,
          message: `Verification code sent to ${email.trim()}. Please enter your 6-digit code to activate your account.`,
        });
        setSecondsRemaining(300);
        setResendCooldown(60);
        setOtpCode('');
        setSuccessMsg(`Account created! A 6-digit verification code was sent to ${email.trim()}.`);
      } else {
        setSuccessMsg('Account registered successfully! Please sign in below.');
        setMode('login');
        setIdentifier(email.trim());
        setPassword('');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to register account. User may already exist.');
    } finally {
      setLoading(false);
    }
  };

  // Resend 2FA OTP
  const handleResendOTP = async () => {
    if (!challenge || resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    setErrorMsg(null);
    try {
      const res = await resendOTP(challenge.session_id);
      setSuccessMsg(res.message || 'A fresh verification code has been dispatched to your email.');
      setSecondsRemaining(res.expires_in || 300);
      setResendCooldown(60);
      setOtpCode('');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // Submit 2FA Verification
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the valid 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await verify2FA(challenge.session_id, otpCode);
      const destination = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Invalid 2FA code or session expired.');
    } finally {
      setLoading(false);
    }
  };

  // Enter Forgot Password mode
  const enterForgotMode = () => {
    setMode('forgot');
    setForgotStep('email');
    setResetOtp('');
    setNewPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Submit Forgot Password (Step 1: request reset code)
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setSuccessMsg(res.message);
      setForgotStep('reset');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to request a reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Password Reset (Step 2: verify code + set new password)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!resetOtp.trim() || resetOtp.trim().length !== 6) {
      setErrorMsg('Please enter the valid 6-digit reset code.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim(), resetOtp, newPassword);
      setSuccessMsg('Password reset successful! You can now sign in with your new password.');
      setMode('login');
      setIdentifier(email.trim());
      setPassword('');
      setForgotStep('email');
      setResetOtp('');
      setNewPassword('');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMsg(typeof detail === 'string' ? detail : 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[85vh] flex items-center justify-center py-4 sm:py-12 px-3.5 sm:px-6 lg:px-8 bg-transparent">
      <div className="glass-frost max-w-md w-full space-y-5 sm:space-y-8 p-5 sm:p-10 rounded-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <Link to="/" className="hidden sm:inline-flex items-center justify-center group mb-2" title="Return to Home">
            <PlantAidIcon size={48} className="transition-transform group-hover:scale-105 shadow-sm rounded-xl" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold sm:font-normal text-slate-900 tracking-tight">
            {challenge
              ? 'Two-Factor Authentication'
              : mode === 'forgot'
              ? 'Reset Your Password'
              : mode === 'login'
              ? 'Sign In to GroundNut-Aid'
              : 'Create Farm Account'}
          </h1>
          <p className="text-xs text-slate-600 max-w-xs mx-auto">
            {challenge
              ? 'Enter the 6-digit security code dispatched to your registered contact.'
              : mode === 'forgot'
              ? 'Verify your email with a 6-digit code, then set a new password.'
              : mode === 'login'
              ? 'Access real-time crop disease diagnosis, remedies, and field records.'
              : 'Join agricultural professionals diagnosing groundnut foliage with AI.'}
          </p>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{successMsg}</span>
          </div>
        )}

        {/* 2FA Challenge View */}
        {challenge ? (
          <form onSubmit={handleVerify2FA} className="space-y-5 sm:space-y-6" autoComplete="off">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-agri-50/60 border border-agri-200/80 text-center space-y-1.5">
              <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-agri-700 mx-auto" />
              <div className="text-xs font-semibold text-agri-900">Active Challenge Session</div>
              <p className="text-xs text-agri-700">
                Session expires in{' '}
                <span className="font-mono font-bold text-agri-900">{formatTimer(secondsRemaining)}</span>
              </p>
            </div>

            <div>
              <label htmlFor={`otp-code-${challenge.session_id}`} className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                6-Digit Verification Code
              </label>
              <input
                id={`otp-code-${challenge.session_id}`}
                name={`otp_code_${challenge.session_id}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] rounded-xl border border-slate-300 focus:ring-2 focus:ring-agri-500 focus:border-agri-500 bg-white"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                disabled={loading || secondsRemaining === 0}
              />
              <div className="flex items-center justify-between text-xs text-slate-600 mt-2 px-0.5">
                <span>Didn't receive the email?</span>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || resendLoading}
                  className="py-1 font-semibold text-agri-700 hover:text-agri-900 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Code'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || secondsRemaining === 0 || otpCode.length !== 6}
              className="w-full py-3.5 px-4 rounded-xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 touch-target flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Verifying 2FA Code...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Proceed to Field App</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setChallenge(null);
                setOtpCode('');
                setErrorMsg(null);
              }}
              className="w-full py-2 text-center text-xs text-slate-600 hover:text-slate-900 font-medium touch-target"
            >
              ← Cancel and return to sign in
            </button>
          </form>
        ) : mode === 'forgot' ? (
          /* Forgot Password Flow */
          forgotStep === 'email' ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 leading-snug">
                Enter the email address linked to your account and we will dispatch a 6-digit
                reset code.
              </p>
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agronomist@farm.org"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:ring-2 focus:ring-agri-500 focus:border-agri-500"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 touch-target flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Requesting Reset Code...</span>
                ) : (
                  <>
                    <span>Send Reset Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="w-full py-2 text-center text-xs text-slate-600 hover:text-slate-900 font-medium touch-target"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 sm:space-y-5" autoComplete="off">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-agri-50/60 border border-agri-200/80 text-center space-y-1.5">
                <KeyRound className="w-7 h-7 sm:w-8 sm:h-8 text-agri-700 mx-auto" />
                <div className="text-xs font-semibold text-agri-900">Reset Code Dispatched</div>
                <p className="text-xs text-agri-700">
                  Enter the 6-digit code sent to{' '}
                  <span className="font-semibold">{email.trim()}</span>
                </p>
              </div>

              <div>
                <label htmlFor="reset-otp" className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  6-Digit Reset Code
                </label>
                <input
                  id="reset-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] rounded-xl border border-slate-300 focus:ring-2 focus:ring-agri-500 focus:border-agri-500 bg-white"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:ring-2 focus:ring-agri-500 focus:border-agri-500"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || resetOtp.length !== 6}
                className="w-full py-3.5 px-4 rounded-xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 touch-target flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Resetting Password...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setForgotStep('email');
                  setResetOtp('');
                  setNewPassword('');
                  setErrorMsg(null);
                }}
                className="w-full py-2 text-center text-xs text-slate-600 hover:text-slate-900 font-medium touch-target"
              >
                ← Use a different email address
              </button>
            </form>
          )
        ) : (
          /* Normal Login / Register Tabs */
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`py-2.5 min-h-[40px] text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`py-2.5 min-h-[40px] text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>

            {mode === 'login' ? (
              /* Login Form */
              <form onSubmit={handleLoginSubmit} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address or Phone Number
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="farmer@groundnut-aid.org"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:ring-2 focus:ring-agri-500 focus:border-agri-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:ring-2 focus:ring-agri-500 focus:border-agri-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 transition-colors touch-target cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={enterForgotMode}
                    className="py-1.5 px-1 text-xs font-semibold text-agri-700 hover:text-agri-900 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-3 px-4 rounded-xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 touch-target flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Continue with 2FA Challenge</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="User Name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:ring-2 focus:ring-agri-500 focus:border-agri-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="agronomist@farm.org"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:ring-2 focus:ring-agri-500 focus:border-agri-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone Number <span className="text-slate-500 font-normal">(Optional for SMS 2FA)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:ring-2 focus:ring-agri-500 focus:border-agri-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:ring-2 focus:ring-agri-500 focus:border-agri-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 transition-colors touch-target cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-3 px-4 rounded-xl bg-agri-700 hover:bg-agri-800 text-white font-bold text-sm shadow-md transition-colors disabled:opacity-50 touch-target flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Registering Account...</span>
                  ) : (
                    <>
                      <span>Create Account & Enable 2FA</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
