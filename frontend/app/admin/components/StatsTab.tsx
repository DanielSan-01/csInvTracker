'use client';

import type { ReactNode } from 'react';

import type { AdminStats } from '../types';

type StatsTabProps = {
  stats: AdminStats;
  formatCurrency: (value: number) => string;
  formatDate: (dateString?: string) => string;
};

const StatsTab = ({ stats, formatCurrency, formatDate }: StatsTabProps) => {
  return (
    <div className="space-y-6">
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


