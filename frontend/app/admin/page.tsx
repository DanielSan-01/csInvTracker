'use client';

import { useState, useEffect, useCallback } from 'react';

import StatsTab from './components/StatsTab';
import UsersTab from './components/UsersTab';
import AddSkinTab from './components/AddSkinTab';
import AdminHeader from './components/AdminHeader';
import AdminTabsNav from './components/AdminTabsNav';
import AdminErrorBanner from './components/AdminErrorBanner';
import AdminLoadingState from './components/AdminLoadingState';
import type { AdminStats, AdminUser, TabType, NewSkinFormState, AdminInventoryItem, AdminInventoryPage } from './types';
import { formatCurrency, formatDate } from './utils';
import AdminUserInventory from './components/AdminUserInventory';

const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027/api';
const API_BASE_URL = rawApiBase.endsWith('/api')
  ? rawApiBase
  : `${rawApiBase.replace(/\/+$/, '')}/api`;

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
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [inventoryPage, setInventoryPage] = useState<AdminInventoryItem[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [inventoryPageSize] = useState(25);
  const [inventoryPageNumber, setInventoryPageNumber] = useState(1);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [pendingEdits, setPendingEdits] = useState<Map<number, Partial<AdminInventoryItem>>>(new Map());

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include' });
      if (response.status === 401 || response.status === 403) {
        setAuthorized(false);
        throw new Error('Unauthorized');
      }
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
      const response = await fetch(`${API_BASE_URL}/admin/stats`, { credentials: 'include' });
      if (response.status === 401 || response.status === 403) {
        setAuthorized(false);
        throw new Error('Unauthorized');
      }
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const verifyAuth = async () => {
      setAuthChecking(true);
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
        if (!res.ok) {
          throw new Error('Unauthorized');
        }
        await res.json();
        setAuthorized(true);
        setError(null);
      } catch (err) {
        setAuthorized(false);
        setError('Admin access requires an authenticated, whitelisted account.');
      } finally {
        setAuthChecking(false);
      }
    };

    verifyAuth();
  }, []);

  useEffect(() => {
    if (!authorized) return;
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab, authorized, fetchUsers, fetchStats]);

  const fetchUserInventory = useCallback(
    async (userId: number, page: number) => {
      setInventoryLoading(true);
      setInventoryError(null);
      try {
        const skip = (page - 1) * inventoryPageSize;
        const res = await fetch(
          `${API_BASE_URL}/admin/users/${userId}/inventory?skip=${skip}&take=${inventoryPageSize}`,
          { credentials: 'include' }
        );
        if (res.status === 401 || res.status === 403) {
          setAuthorized(false);
          throw new Error('Unauthorized');
        }
        if (!res.ok) {
          throw new Error('Failed to fetch inventory');
        }
        const data: AdminInventoryPage = await res.json();
        setInventoryPage(data.items);
        setInventoryTotal(data.total);
        setInventoryPageNumber(page);
        setPendingEdits(new Map());
      } catch (err) {
        setInventoryError(err instanceof Error ? err.message : 'Failed to fetch inventory');
      } finally {
        setInventoryLoading(false);
      }
    },
    [inventoryPageSize]
  );

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
    fetchUserInventory(user.id, 1);
  };

  const handleInventoryPageChange = (nextPage: number) => {
    if (!selectedUser) return;
    fetchUserInventory(selectedUser.id, nextPage);
  };

  const handleInventoryFieldChange = (
    id: number,
    field: 'price' | 'cost' | 'float',
    value: number | null
  ) => {
    setPendingEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(id) || {};
      next.set(id, { ...current, [field]: value ?? 0 });
      return next;
    });
  };

  const handleInventorySave = async (id: number) => {
    if (!selectedUser) return;
    const pending = pendingEdits.get(id);
    if (!pending) return;
    setInventoryLoading(true);
    setInventoryError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${selectedUser.id}/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // Only send the fields we care about changing
          price: pending.price ?? inventoryPage.find((i) => i.id === id)?.price ?? 0,
          cost:
            pending.cost ??
            (inventoryPage.find((i) => i.id === id)?.cost ?? null),
          float:
            pending.float ??
            (inventoryPage.find((i) => i.id === id)?.float ?? 0.5),
          paintSeed: inventoryPage.find((i) => i.id === id)?.paintSeed ?? null,
          imageUrl: inventoryPage.find((i) => i.id === id)?.imageUrl ?? undefined,
          tradeProtected:
            inventoryPage.find((i) => i.id === id)?.tradeProtected ?? false,
          tradableAfter: inventoryPage.find((i) => i.id === id)?.tradableAfter ?? null,
          stickers: [],
        }),
      });
      if (res.status === 401 || res.status === 403) {
        setAuthorized(false);
        throw new Error('Unauthorized');
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to save item');
      }
      await fetchUserInventory(selectedUser.id, inventoryPageNumber);
    } catch (err) {
      setInventoryError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setInventoryLoading(false);
    }
  };

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl text-center">
          <h1 className="mb-2 text-3xl font-bold text-white">Admin Access</h1>
          <p className="mb-4 text-sm text-gray-300">
            {authChecking ? 'Checking your session...' : 'Log in with an approved Steam account to access the admin panel.'}
          </p>
          {error && !authChecking && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
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
        credentials: 'include',
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
            onImportComplete={fetchStats}
          />
        )}

        {/* Users Tab */}
        {!loading && activeTab === 'users' && (
          <UsersTab
            users={users}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            selectedUserId={selectedUser?.id}
            onSelectUser={handleSelectUser}
          />
        )}

        {/* Selected User Inventory */}
        {!loading && activeTab === 'users' && selectedUser && (
          <AdminUserInventory
            items={inventoryPage}
            total={inventoryTotal}
            page={inventoryPageNumber}
            pageSize={inventoryPageSize}
            loading={inventoryLoading}
            error={inventoryError}
            onPageChange={handleInventoryPageChange}
            onFieldChange={handleInventoryFieldChange}
            onSave={handleInventorySave}
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

