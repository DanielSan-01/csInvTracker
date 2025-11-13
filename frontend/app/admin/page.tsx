'use client';

import { useState, useEffect } from 'react';

interface AdminUser {
  id: number;
  steamId: string;
  username?: string;
  createdAt: string;
  lastLoginAt: string;
  itemCount: number;
  totalValue: number;
  totalCost: number;
}

interface AdminStats {
  totalUsers: number;
  totalSkins: number;
  totalInventoryItems: number;
  totalInventoryValue: number;
  recentActivity: RecentActivity[];
}

interface RecentActivity {
  userName: string;
  skinName: string;
  action: string;
  timestamp: string;
}

type TabType = 'stats' | 'users' | 'skins';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027/api';

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
  const [newSkin, setNewSkin] = useState({
    name: '',
    rarity: 'Covert',
    type: 'Knife',
    collection: '',
    weapon: '',
    imageUrl: '',
    defaultPrice: '',
    paintIndex: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  useEffect(() => {
    if (!authorized) return;
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab, authorized]);

  const fetchUsers = async () => {
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
  };

  const fetchStats = async () => {
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
  };

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

  const handleCreateSkin = async (e: React.FormEvent) => {
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
      setNewSkin({
        name: '',
        rarity: 'Covert',
        type: 'Knife',
        collection: '',
        weapon: '',
        imageUrl: '',
        defaultPrice: '',
        paintIndex: '',
      });

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
        {createSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg text-green-400">
            Skin created successfully! It's now searchable for all users.
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
          </div>
        )}

        {/* Stats Tab */}
        {!loading && activeTab === 'stats' && stats && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Total Users</div>
                <div className="text-3xl font-bold text-blue-400">{stats.totalUsers}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Total Skins</div>
                <div className="text-3xl font-bold text-purple-400">{stats.totalSkins}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Inventory Items</div>
                <div className="text-3xl font-bold text-green-400">{stats.totalInventoryItems}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="text-gray-400 text-sm mb-2">Total Value</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {formatCurrency(stats.totalInventoryValue)}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold">Recent Activity</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Skin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {stats.recentActivity.map((activity, index) => (
                      <tr key={index} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {activity.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                            {activity.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{activity.skinName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(activity.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {!loading && activeTab === 'users' && (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold">User Management</h2>
              <p className="text-gray-400 text-sm mt-1">Total: {users.length} users</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Steam ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Profit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Last Login
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map((user) => {
                    const displayName = user.username || user.steamId;
                    const profit = user.totalValue - user.totalCost;
                    const profitPercent =
                      user.totalCost > 0
                        ? ((profit / user.totalCost) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 font-semibold">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{displayName}</div>
                              <div className="text-xs text-gray-400">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-300">
                          {user.steamId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                            {user.itemCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-400">
                          {formatCurrency(user.totalValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatCurrency(user.totalCost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div
                            className={`font-semibold ${
                              profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-400'
                            }`}
                          >
                            {formatCurrency(profit)}
                            {user.totalCost > 0 && (
                              <span className="text-xs ml-1">({profitPercent}%)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {formatDate(user.lastLoginAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Skin Tab */}
        {activeTab === 'skins' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-8">
              <h2 className="text-2xl font-bold mb-6">Add New Skin to Catalog</h2>
              <form onSubmit={handleCreateSkin} className="space-y-6">
                {/* Skin Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Skin Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSkin.name}
                    onChange={(e) => setNewSkin({ ...newSkin, name: e.target.value })}
                    placeholder="★ Karambit | Doppler"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                </div>

                {/* Rarity & Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Rarity *
                    </label>
                    <select
                      required
                      value={newSkin.rarity}
                      onChange={(e) => setNewSkin({ ...newSkin, rarity: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="Consumer Grade">Consumer Grade</option>
                      <option value="Industrial Grade">Industrial Grade</option>
                      <option value="Mil-Spec">Mil-Spec</option>
                      <option value="Restricted">Restricted</option>
                      <option value="Classified">Classified</option>
                      <option value="Covert">Covert</option>
                      <option value="Extraordinary">Extraordinary</option>
                      <option value="Contraband">Contraband</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Type *</label>
                    <select
                      required
                      value={newSkin.type}
                      onChange={(e) => setNewSkin({ ...newSkin, type: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="Knife">Knife</option>
                      <option value="Gloves">Gloves</option>
                      <option value="Rifle">Rifle</option>
                      <option value="Pistol">Pistol</option>
                      <option value="SMG">SMG</option>
                      <option value="Shotgun">Shotgun</option>
                      <option value="Sniper Rifle">Sniper Rifle</option>
                      <option value="Machine Gun">Machine Gun</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Weapon & Collection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Weapon</label>
                    <input
                      type="text"
                      value={newSkin.weapon}
                      onChange={(e) => setNewSkin({ ...newSkin, weapon: e.target.value })}
                      placeholder="Karambit"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Collection
                    </label>
                    <input
                      type="text"
                      value={newSkin.collection}
                      onChange={(e) => setNewSkin({ ...newSkin, collection: e.target.value })}
                      placeholder="The Chroma 2 Collection"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={newSkin.imageUrl}
                    onChange={(e) => setNewSkin({ ...newSkin, imageUrl: e.target.value })}
                    placeholder="https://community.akamai.steamstatic.com/..."
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                  {newSkin.imageUrl && (
                    <div className="mt-3">
                      <img
                        src={newSkin.imageUrl}
                        alt="Preview"
                        className="max-w-xs border border-gray-600 rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src = '';
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Default Price & Paint Index */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newSkin.defaultPrice}
                      onChange={(e) => setNewSkin({ ...newSkin, defaultPrice: e.target.value })}
                      placeholder="50.00"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Paint Index
                    </label>
                    <input
                      type="number"
                      value={newSkin.paintIndex}
                      onChange={(e) => setNewSkin({ ...newSkin, paintIndex: e.target.value })}
                      placeholder="418"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setNewSkin({
                        name: '',
                        rarity: 'Covert',
                        type: 'Knife',
                        collection: '',
                        weapon: '',
                        imageUrl: '',
                        defaultPrice: '',
                        paintIndex: '',
                      })
                    }
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createLoading ? 'Creating...' : 'Create Skin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

