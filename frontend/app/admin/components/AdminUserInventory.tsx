'use client';

import { useMemo } from 'react';
import type { AdminInventoryItem } from '../types';
import { formatCurrency } from '../utils';

type Props = {
  items: AdminInventoryItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error?: string | null;
  onPageChange: (nextPage: number) => void;
  onFieldChange: (id: number, field: 'price' | 'cost' | 'float', value: number | null) => void;
  onSave: (id: number) => void;
};

export default function AdminUserInventory({
  items,
  total,
  page,
  pageSize,
  loading,
  error,
  onPageChange,
  onFieldChange,
  onSave,
}: Props) {
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Inventory</h3>
          <p className="text-sm text-gray-400">
            {loading
              ? 'Loading...'
              : `${total} items • Page ${page} of ${totalPages}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded border border-gray-600 px-3 py-1 text-sm text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev || loading}
          >
            Prev
          </button>
          <button
            className="rounded border border-gray-600 px-3 py-1 text-sm text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext || loading}
          >
            Next
          </button>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-700 bg-red-900/30 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50 text-xs uppercase tracking-wider text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Exterior</th>
              <th className="px-4 py-3 text-left">Float</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Cost</th>
              <th className="px-4 py-3 text-left">Profit</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700 text-sm text-gray-200">
            {items.map((item) => {
              const profit = (item.price ?? 0) - (item.cost ?? 0);
              return (
                <tr key={item.id} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{item.skinName}</div>
                    <div className="text-[11px] text-gray-400">{item.marketHashName}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{item.exterior}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="1"
                      className="w-24 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white focus:border-purple-500 focus:outline-none"
                      defaultValue={item.float}
                      onChange={(e) => onFieldChange(item.id, 'float', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white focus:border-purple-500 focus:outline-none"
                      defaultValue={item.price}
                      onChange={(e) => onFieldChange(item.id, 'price', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-24 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-sm text-white focus:border-purple-500 focus:outline-none"
                      defaultValue={item.cost ?? 0}
                      onChange={(e) => onFieldChange(item.id, 'cost', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-200">
                    {formatCurrency(profit)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="rounded bg-purple-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-purple-700"
                      onClick={() => onSave(item.id)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}

            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">
                  No items found.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

