'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, usersApi } from '@/lib/api';
import { getStoredSteamId } from '@/lib/steamAuth';

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
  const [currentSteamId, setCurrentSteamId] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const steamId = getStoredSteamId();
      if (!steamId) {
        setUser(null);
        setCurrentSteamId(null);
        return;
      }

      // Only fetch if Steam ID changed
      if (steamId === currentSteamId && user) {
        setLoading(false);
        return;
      }

      // Get or create user by Steam ID
      const userData = await usersApi.getOrCreateUserBySteamId(steamId);
      setUser(userData);
      setCurrentSteamId(steamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
      setUser(null);
      setCurrentSteamId(null);
    } finally {
      setLoading(false);
    }
  }, [currentSteamId, user]);

  // Load user on mount only
  useEffect(() => {
    const steamId = getStoredSteamId();
    if (steamId) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []); // Empty dependency - only run once on mount

  // Listen for Steam ID changes (manual polling) - disabled for now to prevent flickering
  // User must manually refresh or we can add event-based system later

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

