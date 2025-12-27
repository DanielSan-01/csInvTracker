'use client';

import { useEffect, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import InventoryStatsGrid from '../components/item-grid/InventoryStatsGrid';
import InventoryGridList from '../components/item-grid/InventoryGridList';
import InventoryDetailPanel from '../components/item-grid/InventoryDetailPanel';
import AnimatedBanner from '../components/AnimatedBanner';
import type { CSItem } from '@/lib/mockData';
import { inventoryItemsToCSItems } from '@/lib/dataConverter';
import type { InventoryItemDto, InventoryStatsDto, User } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export default function DemoPage() {
  const [items, setItems] = useState<CSItem[]>([]);
  const [stats, setStats] = useState<InventoryStatsDto | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);

  // Load pink panther (user 1) inventory and stats once from the backend
  useEffect(() => {
    let isMounted = true;

    const loadDemoData = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiModule = await import('@/lib/api');
        const [inventory, inventoryStats, demoUser] = await Promise.all([
          apiModule.inventoryApi.getInventoryItems(1),
          apiModule.inventoryApi.getStats(1),
          apiModule.usersApi.getUserById(1),
        ]);

        if (!isMounted) return;

        const csItems = inventoryItemsToCSItems(inventory as InventoryItemDto[]);
        setItems(csItems);
        setStats(inventoryStats as InventoryStatsDto);
        setUser(demoUser as User);
        if (csItems.length > 0) {
          setSelectedItemId(csItems[0].id);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('[Demo] Failed to load demo inventory', err);
        setError('Failed to load demo inventory. Please try again later.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDemoData();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedItem = useMemo(
    () => (selectedItemId ? items.find((item) => item.id === selectedItemId) ?? null : null),
    [items, selectedItemId]
  );

  const statsSummary = useMemo(() => {
    if (!stats) {
      return {
        totalItems: '–',
        marketValue: '–',
        acquisitionCost: '–',
        netProfit: '–',
        netProfitPositive: null as boolean | null,
        avgProfitPercent: '–',
      };
    }

    const avg =
      stats.averageProfitPercent !== undefined && stats.averageProfitPercent !== null
        ? `${stats.averageProfitPercent >= 0 ? '+' : ''}${stats.averageProfitPercent.toFixed(2)}%`
        : '–';

    return {
      totalItems: stats.totalItems.toLocaleString(),
      marketValue: formatCurrency(stats.marketValue),
      acquisitionCost: formatCurrency(stats.acquisitionCost),
      netProfit: formatCurrency(stats.netProfit),
      netProfitPositive: stats.netProfit >= 0,
      avgProfitPercent: avg,
    };
  }, [stats]);

  // Local-only delete
  const handleLocalDelete = () => {
    if (!selectedItemId) return;
    setItems((prev) => prev.filter((item) => item.id !== selectedItemId));
    setSelectedItemId((prev) => {
      const remaining = items.filter((item) => item.id !== prev);
      return remaining.length > 0 ? remaining[0].id : null;
    });
  };

  // Local-only inline update (price, cost, or float)
  const handleLocalUpdate = (field: 'price' | 'cost' | 'float', value: number | null) => {
    if (!selectedItemId) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== selectedItemId) return item;
        if (field === 'price') {
          return { ...item, price: value ?? 0 };
        }
        if (field === 'cost') {
          return { ...item, cost: value ?? undefined };
        }
        if (field === 'float') {
          return { ...item, float: value ?? 0.5 };
        }
        return item;
      })
    );
  };

  const handleResetDemo = () => {
    // Simply reload the page to fetch fresh data from backend
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-950 pb-16">
      <Navbar
        isAuthenticated={false}
        authControl={null}
        userInventory={items}
        onQuickAddSkin={undefined}
        canAdd={false}
      />

      <div className="mx-auto mt-4 w-full max-w-7xl px-4 md:px-6">
        <AnimatedBanner
          message="Demo mode: You are viewing a local copy of pink panther's inventory. Changes here are not saved to any real account."
          intent="info"
          autoClose={false}
          onDismiss={undefined}
        />
      </div>

      <div className="mx-auto mt-4 w-full max-w-7xl px-4 md:px-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {user && (
              <>
                {user.avatarMediumUrl && (
                  <img
                    src={user.avatarMediumUrl}
                    alt={user.displayName ?? user.username ?? 'Demo user'}
                    className="h-10 w-10 rounded-full border border-gray-700"
                  />
                )}
                <div>
                  <div className="text-sm font-semibold text-white">
                    Demo: {user.displayName ?? user.username ?? 'Pink Panther'}
                  </div>
                  <div className="text-xs text-gray-400">User ID 1 – local sandbox only</div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleResetDemo}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-100 transition-colors hover:bg-gray-700"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset demo
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/50 bg-red-900/30 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <InventoryStatsGrid
          totalItems={statsSummary.totalItems}
          marketValue={statsSummary.marketValue}
          acquisitionCost={statsSummary.acquisitionCost}
          netProfit={statsSummary.netProfit}
          netProfitPositive={statsSummary.netProfitPositive}
          avgProfitPercent={statsSummary.avgProfitPercent}
          isLoading={loading}
        />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <InventoryGridList
              items={items}
              selectedId={selectedItemId}
              onSelect={(id) => {
                setSelectedItemId(id);
                // Show modal on mobile when user explicitly taps an item
                if (window.innerWidth < 1024) {
                  setShowMobileModal(true);
                }
              }}
            />
          </div>
          <InventoryDetailPanel
            item={selectedItem}
            onEdit={undefined}
            onDelete={handleLocalDelete}
            onUpdate={handleLocalUpdate}
            autoEditField={null}
            showMobileModal={showMobileModal}
            onClose={() => {
              setShowMobileModal(false);
              // On mobile, just close the modal but keep item selected
              // On desktop, clearing selectedItemId is handled elsewhere if needed
            }}
          />
        </div>
      </div>
    </div>
  );
}


