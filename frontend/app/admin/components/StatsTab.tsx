'use client';

import { useState, type ReactNode } from 'react';

import type { AdminStats } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027/api';

type StatsTabProps = {
  stats: AdminStats;
  formatCurrency: (value: number) => string;
  formatDate: (dateString?: string) => string;
  onImportComplete?: () => void;
};

const StatsTab = ({ stats, formatCurrency, formatDate, onImportComplete }: StatsTabProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefreshCatalog = async () => {
    setRefreshing(true);
    setRefreshMessage(null);
    setRefreshError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/admin/refresh-from-steam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to refresh catalog');
      }

      setRefreshMessage(
        `✅ Success! Found ${data.totalItemsFound} items. ` +
        `Created ${data.created}, Updated ${data.updated}, Skipped ${data.skipped}. ` +
        `Catalog now has MarketHashName populated and latest images from Steam.`
      );

      // Refresh stats after catalog update
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Failed to refresh catalog from Steam');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Catalog Refresh Section */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Catalog Management</h2>
            <p className="mt-1 text-sm text-gray-400">
              Refresh catalog from Steam to update MarketHashName and images
            </p>
          </div>
          <button
            onClick={handleRefreshCatalog}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh from Steam
              </>
            )}
          </button>
        </div>
        {refreshMessage && (
          <div className="mt-4 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {refreshMessage}
          </div>
        )}
        {refreshError && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {refreshError}
          </div>
        )}
        <div className="mt-4 text-xs text-gray-500">
          <p>This will:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Fetch items from all user Steam inventories</li>
            <li>Update existing skins with MarketHashName (for accurate matching)</li>
            <li>Update images from Steam (always up-to-date)</li>
            <li>Create new skins for items not in catalog</li>
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Users" value={stats.totalUsers.toString()} accent="text-blue-400" />
        <StatTile label="Total Skins" value={stats.totalSkins.toString()} accent="text-purple-400" />
        <StatTile
          label="Inventory Items"
          value={stats.totalInventoryItems.toString()}
          accent="text-green-400"
        />
        <StatTile
          label="Total Value"
          value={formatCurrency(stats.totalInventoryValue)}
          accent="text-yellow-400"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-xl font-bold">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
                <TableHeaderCell>Skin</TableHeaderCell>
                <TableHeaderCell>Timestamp</TableHeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {stats.recentActivity.map((activity, index) => (
                <tr key={`${activity.userName}-${activity.timestamp}-${index}`} className="transition-colors hover:bg-gray-700/50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">{activity.userName}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                      {activity.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{activity.skinName}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                    {formatDate(activity.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

type StatTileProps = {
  label: string;
  value: string;
  accent: string;
};

const StatTile = ({ label, value, accent }: StatTileProps) => (
  <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
    <div className="mb-2 text-sm text-gray-400">{label}</div>
    <div className={`text-3xl font-bold ${accent}`}>{value}</div>
  </div>
);

const TableHeaderCell = ({ children }: { children: ReactNode }) => (
  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
    {children}
  </th>
);

export default StatsTab;


