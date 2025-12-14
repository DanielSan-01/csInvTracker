'use client';

import type { ReactNode } from 'react';

import type { AdminUser } from '../types';

type UsersTabProps = {
  users: AdminUser[];
  formatCurrency: (value: number) => string;
  formatDate: (dateString?: string) => string;
  selectedUserId?: number | null;
  onSelectUser?: (user: AdminUser) => void;
};

const UsersTab = ({ users, formatCurrency, formatDate, selectedUserId, onSelectUser }: UsersTabProps) => {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
      <div className="border-b border-gray-700 p-6">
        <h2 className="text-xl font-bold">User Management</h2>
        <p className="mt-1 text-sm text-gray-400">Total: {users.length} users</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <TableHeaderCell>User</TableHeaderCell>
              <TableHeaderCell>Steam ID</TableHeaderCell>
              <TableHeaderCell>Items</TableHeaderCell>
              <TableHeaderCell>Value</TableHeaderCell>
              <TableHeaderCell>Cost</TableHeaderCell>
              <TableHeaderCell>Profit</TableHeaderCell>
              <TableHeaderCell>Last Login</TableHeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map((user) => {
              const displayName = user.username || user.steamId;
              const profit = user.totalValue - user.totalCost;
              const profitPercent =
                user.totalCost > 0 ? ((profit / user.totalCost) * 100).toFixed(1) : '0.0';
              const isSelected = selectedUserId === user.id;

              return (
                <tr
                  key={user.id}
                  className={`transition-colors hover:bg-gray-700/50 ${isSelected ? 'bg-gray-700/50' : ''} ${onSelectUser ? 'cursor-pointer' : ''}`}
                  onClick={() => onSelectUser?.(user)}
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 font-semibold text-gray-300">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{displayName}</div>
                        <div className="text-xs text-gray-400">
                          Joined {formatDate(user.createdAt)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{user.steamId}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{user.itemCount}</td>
                  <td className="px-6 py-4 text-sm text-green-300">
                    {formatCurrency(user.totalValue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-amber-300">
                    {formatCurrency(user.totalCost)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        profit >= 0
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {formatCurrency(profit)} ({profitPercent}%)
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                    {formatDate(user.lastLoginAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TableHeaderCell = ({ children }: { children: ReactNode }) => (
  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
    {children}
  </th>
);

export default UsersTab;


