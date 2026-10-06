import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('veridoc_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('veridoc_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          setUser(res.user);
        } catch (err) {
          console.warn('Session verification failed, logging out');
          localStorage.removeItem('veridoc_token');
          localStorage.removeItem('veridoc_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    localStorage.setItem('veridoc_token', data.token);
    localStorage.setItem('veridoc_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await authService.register(name, email, password);
    localStorage.setItem('veridoc_token', data.token);
    localStorage.setItem('veridoc_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const loginWithGoogle = async (googleData) => {
    const data = await authService.googleLogin(googleData);
    localStorage.setItem('veridoc_token', data.token);
    localStorage.setItem('veridoc_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const [appMode, setAppModeState] = useState(() => {
    const saved = localStorage.getItem('veridoc_app_mode');
    if (saved === 'student' || saved === 'doctor') return saved;
    return localStorage.getItem('veridoc_student_mode') === 'true' ? 'student' : 'doctor';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', appMode);
  }, [appMode]);

  const setAppMode = (mode) => {
    const val = mode === 'student' ? 'student' : 'doctor';
    setAppModeState(val);
    localStorage.setItem('veridoc_app_mode', val);
    localStorage.setItem('veridoc_student_mode', String(val === 'student'));
    document.documentElement.setAttribute('data-mode', val);
  };

  const toggleStudentMode = () => {
    setAppMode(appMode === 'doctor' ? 'student' : 'doctor');
  };

  const studentMode = appMode === 'student';

  const logout = () => {
    localStorage.removeItem('veridoc_token');
    localStorage.removeItem('veridoc_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (newUserData) => {
    setUser(prev => {
      const merged = { ...prev, ...newUserData };
      localStorage.setItem('veridoc_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      loginWithGoogle,
      logout,
      updateUser,
      appMode,
      setAppMode,
      studentMode,
      toggleStudentMode
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

