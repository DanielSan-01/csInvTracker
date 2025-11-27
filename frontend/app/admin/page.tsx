'use client';

import { useState, useEffect, useCallback } from 'react';

import StatsTab from './components/StatsTab';
import UsersTab from './components/UsersTab';
import AddSkinTab from './components/AddSkinTab';
import AdminAuthGate from './components/AdminAuthGate';
import AdminHeader from './components/AdminHeader';
import AdminTabsNav from './components/AdminTabsNav';
import AdminErrorBanner from './components/AdminErrorBanner';
import AdminLoadingState from './components/AdminLoadingState';
import type { AdminStats, AdminUser, TabType, NewSkinFormState } from './types';
import { formatCurrency, formatDate } from './utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027/api';

const createInitialSkinState = (): NewSkinFormState => ({
  name: '',
  rarity: 'Covert',
  type: 'Knife',
  collection: '',
  weapon: '',
  imageUrl: '',
  defaultPrice: '',
  paintIndex: '',
});

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New skin form state
  const [newSkin, setNewSkin] = useState<NewSkinFormState>(() => createInitialSkinState());
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const handleSkinFieldChange = useCallback((field: keyof NewSkinFormState, value: string) => {
    setNewSkin((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleClearSkinForm = useCallback(() => {
    setNewSkin(createInitialSkinState());
    setCreateSuccess(false);
  }, []);

  useEffect(() => {
    if (!authorized) return;
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab, authorized, fetchUsers, fetchStats]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuthorize = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (authPassword === 'asd') {
      setAuthorized(true);
      setAuthPassword('');
      setAuthError(null);
      setError(null);
      setCreateSuccess(false);
    } else {
      setAuthError('Incorrect password');
    }
  };

  if (!authorized) {
    return (
      <AdminAuthGate
        password={authPassword}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthorize}
        error={authError}
      />
    );
  }

  const handleCreateSkin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateSuccess(false);
    setError(null);

    try {
      const skinData = {
        ...newSkin,
        defaultPrice: newSkin.defaultPrice ? parseFloat(newSkin.defaultPrice) : null,
        paintIndex: newSkin.paintIndex ? parseInt(newSkin.paintIndex) : null,
      };

      const response = await fetch(`${API_BASE_URL}/admin/skins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skinData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create skin');
      }

      setCreateSuccess(true);
      setNewSkin(createInitialSkinState());

      // Refresh stats if on stats tab
      if (activeTab === 'stats') {
        fetchStats();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create skin');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <AdminHeader />
        <AdminTabsNav activeTab={activeTab} onChange={setActiveTab} />
        <AdminErrorBanner message={error} />
        {loading && <AdminLoadingState />}

        {/* Stats Tab */}
        {!loading && activeTab === 'stats' && stats && (
          <StatsTab
            stats={stats}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {/* Users Tab */}
        {!loading && activeTab === 'users' && (
          <UsersTab
            users={users}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        )}

        {/* Add Skin Tab */}
        {activeTab === 'skins' && (
          <AddSkinTab
            newSkin={newSkin}
            onFieldChange={handleSkinFieldChange}
            onSubmit={handleCreateSkin}
            onClear={handleClearSkinForm}
            loading={createLoading}
            success={createSuccess}
          />
        )}
      </div>
    </div>
  );
}

