'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, authApi } from '@/lib/api';

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use secure cookie-based authentication
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Check for authentication success in URL (after Steam login)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('authenticated') === 'true') {
      // Try to get token from cookie and store in localStorage as fallback
      // This helps with cross-domain cookie issues
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'auth_token_client' && value) {
            // Store in localStorage as fallback for cross-domain requests
            localStorage.setItem('auth_token', value);
            break;
          }
        }
      }
      
      // Refresh user data after successful authentication
      refreshUser();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

