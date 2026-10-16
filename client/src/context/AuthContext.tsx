import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export interface User {
  id?: string;
  email: string;
  displayName: string;
  microsoftOid?: string;
  isDemo?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  login: (userData: User, token: string, isDemo?: boolean) => void;
  loginAsDemo: () => Promise<User>;
  logout: () => Promise<void>;
  checkProfileStatus: () => Promise<{ hasConfiguredProfile: boolean; activeProfile: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isDemo: false,
  login: () => {},
  loginAsDemo: async () => ({ email: '', displayName: '' }),
  logout: async () => {},
  checkProfileStatus: async () => ({ hasConfiguredProfile: false, activeProfile: null }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const isLoggedOut = localStorage.getItem('ppqa_logged_out') === 'true';
    if (isLoggedOut) {
      return null;
    }
    const stored = localStorage.getItem('ppqa_user');
    const token = localStorage.getItem('ppqa_token');
    if (stored && token) {
      try {
        const parsed = JSON.parse(stored);
        const isDemo = localStorage.getItem('ppqa_is_demo') === 'true';
        return { ...parsed, isDemo: parsed.isDemo || isDemo };
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const isDemo = !!user?.isDemo;

  const login = (userData: User, token: string, demo = false) => {
    const enrichedUser: User = { ...userData, isDemo: demo || !!userData.isDemo };
    localStorage.removeItem('ppqa_logged_out');
    localStorage.setItem('ppqa_token', token);
    localStorage.setItem('ppqa_user', JSON.stringify(enrichedUser));
    if (enrichedUser.isDemo) {
      localStorage.setItem('ppqa_is_demo', 'true');
    } else {
      localStorage.removeItem('ppqa_is_demo');
    }
    setUser(enrichedUser);
  };

  const loginAsDemo = async (): Promise<User> => {
    const res = await apiClient.post('/auth/demo');
    const demoUser = res.data.user || {
      displayName: 'Demo QA Engineer',
      email: 'demo@contoso.onmicrosoft.com',
      isDemo: true,
    };
    login(demoUser, res.data.token, true);
    return demoUser;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network error on logout
    }
    localStorage.setItem('ppqa_logged_out', 'true');
    localStorage.removeItem('ppqa_token');
    localStorage.removeItem('ppqa_user');
    localStorage.removeItem('ppqa_is_demo');
    setUser(null);
  };

  const checkProfileStatus = async (): Promise<{ hasConfiguredProfile: boolean; activeProfile: any }> => {
    try {
      const res = await apiClient.get('/azure-profiles/status');
      return {
        hasConfiguredProfile: !!res.data?.hasConfiguredProfile,
        activeProfile: res.data?.activeProfile || null,
      };
    } catch (e) {
      return { hasConfiguredProfile: false, activeProfile: null };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isDemo,
        login,
        loginAsDemo,
        logout,
        checkProfileStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


