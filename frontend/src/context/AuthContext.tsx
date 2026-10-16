import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  User,
  TokenResponse,
  TwoFactorChallengeResponse,
  MessageResponse,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<TwoFactorChallengeResponse>;
  verify2FA: (sessionId: string, otpCode: string) => Promise<TokenResponse>;
  resendOTP: (sessionId: string) => Promise<TwoFactorChallengeResponse>;
  register: (name: string, email: string, password: string, phone?: string | null) => Promise<User>;
  forgotPassword: (email: string) => Promise<MessageResponse>;
  resetPassword: (email: string, otpCode: string, newPassword: string) => Promise<MessageResponse>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<User>;
  changePassword: (payload: ChangePasswordPayload) => Promise<MessageResponse>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('plant_aid_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('plant_aid_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Hydrate user profile on initial mount if token exists
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (token) {
        try {
          const res = await api.get<User>('/api/auth/me');
          setUser(res.data);
          localStorage.setItem('plant_aid_user', JSON.stringify(res.data));
        } catch (err: any) {
          // Only clear session on 401 Unauthorized (expired or invalid token)
          // Do not log out on transient network errors, slow connection, or server spin-up
          if (err.response?.status === 401) {
            setToken(null);
            setUser(null);
            localStorage.removeItem('plant_aid_token');
            localStorage.removeItem('plant_aid_user');
          }
        }
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, [token]);

  // Automatic Idle Timeout: log out directly after 10 minutes of inactivity if authenticated
  useEffect(() => {
    if (!token) return;

    const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleIdleLogout = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('plant_aid_token');
      localStorage.removeItem('plant_aid_user');
      navigate('/auth', { replace: true });
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleIdleLogout, IDLE_TIMEOUT_MS);
    };

    // Start timer on initial mount or token change
    resetTimer();

    // Listen to all interaction events across the window
    const activityEvents = [
      'mousemove',
      'mousedown',
      'pointermove',
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    let lastActivity = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // Throttle timer resets to at most once every 500ms for efficiency
      if (now - lastActivity > 500) {
        lastActivity = now;
        resetTimer();
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
    };
  }, [token, navigate]);


  // Initiate login: returns 2FA challenge response containing session_id
  const login = async (identifier: string, password: string): Promise<TwoFactorChallengeResponse> => {
    const payload = identifier.includes('@')
      ? { email_address: identifier, password }
      : { phone_number: identifier, password };

    const res = await api.post<TwoFactorChallengeResponse>('/api/auth/login', payload);
    return res.data;
  };

  // Resend 2FA verification OTP
  const resendOTP = async (sessionId: string): Promise<TwoFactorChallengeResponse> => {
    const res = await api.post<TwoFactorChallengeResponse>('/api/auth/resend-otp', {
      session_id: sessionId,
    });
    return res.data;
  };

  // Complete 2FA challenge with OTP code
  const verify2FA = async (sessionId: string, otpCode: string): Promise<TokenResponse> => {
    const res = await api.post<TokenResponse>('/api/auth/verify-2fa', {
      session_id: sessionId,
      otp_code: otpCode.trim(),
    });

    const { access_token, user_id, user_name, email_address, role } = res.data;
    const userData: User = { id: user_id, user_name, email_address, role: role || 'user' };

    setToken(access_token);
    setUser(userData);
    localStorage.setItem('plant_aid_token', access_token);
    localStorage.setItem('plant_aid_user', JSON.stringify(userData));

    return res.data;
  };

  // Register new account
  const register = async (name: string, email: string, password: string, phone?: string | null): Promise<User> => {
    const payload = {
      user_name: name,
      email_address: email,
      password: password,
      phone_number: phone || null,
    };
    const res = await api.post<User>('/api/auth/register', payload);
    return res.data;
  };

  // Request a password reset OTP
  const forgotPassword = async (email: string): Promise<MessageResponse> => {
    const res = await api.post<MessageResponse>('/api/auth/forgot-password', {
      email_address: email,
    });
    return res.data;
  };

  // Complete the password reset with OTP + new password
  const resetPassword = async (email: string, otpCode: string, newPassword: string): Promise<MessageResponse> => {
    const res = await api.post<MessageResponse>('/api/auth/reset-password', {
      email_address: email,
      otp_code: otpCode.trim(),
      new_password: newPassword,
    });
    return res.data;
  };

  // Update authenticated user profile details
  const updateProfile = async (payload: UpdateProfilePayload): Promise<User> => {
    const res = await api.patch<User>('/api/auth/me', payload);
    setUser(res.data);
    localStorage.setItem('plant_aid_user', JSON.stringify(res.data));
    return res.data;
  };

  // Update authenticated user password
  const changePassword = async (payload: ChangePasswordPayload): Promise<MessageResponse> => {
    const res = await api.post<MessageResponse>('/api/auth/change-password', payload);
    return res.data;
  };

  // Logout
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('plant_aid_token');
    localStorage.removeItem('plant_aid_user');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isAdmin,
        loading,
        login,
        verify2FA,
        resendOTP,
        register,
        forgotPassword,
        resetPassword,
        updateProfile,
        changePassword,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
