'use client';

import { useState, useEffect, useCallback } from 'react';

import StatsTab from './components/StatsTab';
import UsersTab from './components/UsersTab';
import AddSkinTab from './components/AddSkinTab';
import type { AdminStats, AdminUser, TabType, NewSkinFormState } from './types';

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
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-900/80 backdrop-blur-xl border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold mb-2 text-center text-white">Admin Access</h1>
          <p className="text-gray-400 text-center mb-6">
            Enter the admin password to manage users and skins.
          </p>
          <form onSubmit={handleAuthorize} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
            </div>
            {authError && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/40 rounded-lg px-3 py-2">
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-all"
            >
              Unlock Admin Panel
            </button>
          </form>
        </div>
      </div>
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-gray-400">Manage users, skins, and system settings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'stats'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            📊 Statistics
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'users'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            👥 Users
          </button>
          <button
            onClick={() => setActiveTab('skins')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'skins'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            🎨 Add Skin
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Success Display */}
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        )}

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

