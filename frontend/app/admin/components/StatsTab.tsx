'use client';

import { useState, type ReactNode } from 'react';

import type { AdminStats } from '../types';

type StatsTabProps = {
  stats: AdminStats;
  formatCurrency: (value: number) => string;
  formatDate: (dateString?: string) => string;
  onImportComplete?: () => void;
};

const StatsTab = ({ stats, formatCurrency, formatDate, onImportComplete }: StatsTabProps) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleImportSkins = async () => {
    if (isImporting) return;

    setIsImporting(true);
    setImportStatus(null);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5027/api';
      const response = await fetch(`${API_BASE_URL}/admin/import-from-bymykel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to import skins');
      }

      const result = await response.json();
      setImportStatus({
        success: result.success,
        message: result.message || `Imported ${result.created || 0} skins, updated ${result.updated || 0} skins`,
      });

      // Refresh stats after import
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      setImportStatus({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to import skins',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Skin Catalog Management</h2>
            <p className="mt-1 text-sm text-gray-400">
              Import skins from ByMykel's CSGO API to populate the catalog ({stats.totalSkins} skins currently)
            </p>
          </div>
          <button
            onClick={handleImportSkins}
            disabled={isImporting}
            className="rounded-lg bg-purple-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting ? (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Importing...
              </span>
            ) : (
              'Import Skins from ByMykel'
            )}
          </button>
        </div>
        {importStatus && (
          <div
            className={`mt-4 rounded-lg border p-4 ${
              importStatus.success
                ? 'border-green-500/50 bg-green-500/10 text-green-400'
                : 'border-red-500/50 bg-red-500/10 text-red-400'
            }`}
          >
            <p className="text-sm font-medium">{importStatus.message}</p>
          </div>
        )}
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


