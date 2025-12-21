'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const isRefreshingRef = useRef(false);
  const hasProcessedAuthRef = useRef(false);

  const refreshUser = useCallback(async () => {
    // Prevent concurrent calls using ref (doesn't cause re-renders)
    if (isRefreshingRef.current) {
      return;
    }
    
    try {
      isRefreshingRef.current = true;
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
      isRefreshingRef.current = false;
    }
  }, []);

  // Load user on mount - only run once
  useEffect(() => {
    let mounted = true;
    
    const loadUser = async () => {
      if (isRefreshingRef.current) return;
      
      try {
        isRefreshingRef.current = true;
        setLoading(true);
        setError(null);
        
        const userData = await authApi.getCurrentUser();
        if (mounted) {
          setUser(userData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load user');
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          isRefreshingRef.current = false;
        }
      }
    };
    
    loadUser();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for authentication success in URL (after Steam login)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Prevent running multiple times (even across remounts during Fast Refresh)
    if (hasProcessedAuthRef.current) return;
    
    const params = new URLSearchParams(window.location.search);
    const authenticated = params.get('authenticated') === 'true';
    
    if (!authenticated) return;
    
    // Mark as processed immediately to prevent re-runs
    hasProcessedAuthRef.current = true;
    
    // Prevent concurrent refresh calls
    if (isRefreshingRef.current) return;
    
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
    
    // Clean up URL immediately to prevent re-triggering
    window.history.replaceState({}, '', window.location.pathname);
    
    // Refresh user data after successful authentication
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

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

