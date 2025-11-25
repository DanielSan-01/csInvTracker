'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CSItem, Exterior } from '@/lib/mockData';
import ItemCard from './ItemCard';
import StatCard from './StatCard';
import AddSkinForm, { NewSkinData } from './AddSkinForm';
import GlobalSearchBar from './GlobalSearchBar';
import { useInventory } from '@/hooks/useInventory';
import { useUser } from '@/contexts/UserContext';
import { inventoryItemsToCSItems } from '@/lib/dataConverter';
import { CreateInventoryItemDto, UpdateInventoryItemDto, SkinDto /* , adminApi */ } from '@/lib/api';
import { fetchSteamInventory } from '@/lib/steamApi';
import { getStoredSteamId } from '@/lib/steamAuth';
import { formatCurrency } from '@/lib/utils';
import Navbar from './Navbar';
import SteamLoginButton from './SteamLoginButton';

export default function ItemGrid() {
  const { user, loading: userLoading } = useUser();
  const { items: backendItems, stats, loading, error, createItem, updateItem, deleteItem, refresh } = useInventory(user?.id);
  const items = inventoryItemsToCSItems(backendItems);
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }, [items]);
  
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [quickAddSkin, setQuickAddSkin] = useState<SkinDto | null>(null);
  const [editingItem, setEditingItem] = useState<CSItem | null>(null);
  const [isLoadingSteam, setIsLoadingSteam] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);
  // CSV import temporarily disabled; keep state commented for future use.
  // const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CSItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Steam ID on mount and listen for changes
  useEffect(() => {
    const loadSteamId = () => {
      const stored = getStoredSteamId();
      if (stored) {
        setSteamId(stored);
      }
    };
    
    loadSteamId();
    
    // Check periodically in case Steam ID was just set
    const interval = setInterval(loadSteamId, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // No more localStorage - data comes from backend!

  // Auto-select the first item to populate detail view
  useEffect(() => {
    if (sortedItems.length === 0) {
      setSelectedItemId(null);
      return;
    }

    setSelectedItemId(prev => {
      if (prev && sortedItems.some(item => item.id === prev)) {
        return prev;
      }
      return sortedItems[0].id;
    });
  }, [sortedItems]);

  const selectedItem = useMemo(
    () => (selectedItemId ? sortedItems.find(item => item.id === selectedItemId) ?? null : null),
    [sortedItems, selectedItemId]
  );

  // Handler for GlobalSearchBar quick-add
  const handleQuickAddSkin = (skin: SkinDto) => {
    setEditingItem(null);
    setQuickAddSkin(skin);
    setShowAddForm(true);
    // The AddSkinForm will auto-populate with this skin's data via useSkinCatalog
    // We can pass the skinId via state later if needed
  };

  const handleAddSkin = async (newSkinData: NewSkinData): Promise<boolean> => {
    if (!user) {
      showToast('Please log in with Steam first!', 'error');
      return false;
    }
    
    // Convert NewSkinData to CreateInventoryItemDto
    const createDto: CreateInventoryItemDto = {
      userId: user.id,
      skinId: newSkinData.skinId!, // Will be provided by updated AddSkinForm
      float: newSkinData.float ?? 0.5,
      paintSeed: newSkinData.paintSeed,
      price: newSkinData.price,
      cost: newSkinData.cost,
      imageUrl: newSkinData.imageUrl,
      tradeProtected: newSkinData.tradeProtected ?? false,
    };

    const newItem = await createItem(createDto);
    if (newItem) {
      // Select the newly added item
      const csItem = inventoryItemsToCSItems([newItem])[0];
      if (csItem) {
        setSelectedItemId(csItem.id);
      }
      showToast('Skin added successfully.', 'success');
      return true;
    }

    showToast('Failed to add skin. Please try again.', 'error');
    return false;
  };

  const handleUpdateSkin = async (id: string, updatedData: NewSkinData): Promise<boolean> => {
    const updateDto: UpdateInventoryItemDto = {
      float: updatedData.float ?? 0.5,
      paintSeed: updatedData.paintSeed,
      price: updatedData.price,
      cost: updatedData.cost,
      imageUrl: updatedData.imageUrl,
      tradeProtected: updatedData.tradeProtected ?? false,
    };

    const success = await updateItem(parseInt(id), updateDto);
    if (success) {
      setSelectedItemId(id);
      showToast('Skin updated successfully.', 'success');
      return true;
    }

    showToast('Failed to update skin. Please try again.', 'error');
    return false;
  };

  const handleEditClick = (item: CSItem) => {
    setEditingItem(item);
  };

  const handleRequestDelete = (item: CSItem) => {
    if (!user) {
      showToast('Please log in with Steam first!', 'error');
      return;
    }
    setDeleteCandidate(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    const success = await deleteItem(Number(deleteCandidate.id));
    setIsDeleting(false);
    if (success) {
      setDeleteCandidate(null);
      setSelectedItemId(null);
      showToast('Item deleted successfully.', 'success');
    } else {
      showToast('Failed to delete item. Please try again.', 'error');
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setDeleteCandidate(null);
  };

  /*
  // CSV import temporarily disabled.
  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }

    setIsImportingCsv(true);

    try {
      const result = await adminApi.importInventoryFromCsv(user.id, file);

      // Refresh inventory
      await refresh();

      if (result.successCount > 0) {
        showToast(
          `Imported ${result.successCount} item${result.successCount !== 1 ? 's' : ''}.${result.failedCount > 0 ? ` ${result.failedCount} failed.` : ''}`,
          result.failedCount > 0 ? 'info' : 'success'
        );
      } else {
        showToast(`Import failed: ${result.errors.join(', ')}`, 'error');
      }
    } catch (error) {
      showToast(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsImportingCsv(false);
      // Reset file input
      event.target.value = '';
    }
  };
  */

  const handleLoadFromSteam = async () => {
    if (!steamId) {
      showToast('Please log in with Steam first!', 'error');
      return;
    }

    setIsLoadingSteam(true);
    try {
      console.log('Fetching Steam inventory for:', steamId);
      const steamItems = await fetchSteamInventory(steamId);
      console.log('Fetched Steam items:', steamItems);
      
      // Note: Steam inventory loading is currently disabled when using backend.
      // To implement this, we would need to:
      // 1. Match Steam items to skins in our catalog by name
      // 2. Create inventory items via the backend API
      // 3. Handle items that don't exist in our catalog yet
      
      showToast(`Found ${steamItems.length} item${steamItems.length !== 1 ? 's' : ''} in Steam inventory. Steam import is coming soon!`, 'info');
    } catch (error) {
      console.error('Error loading Steam inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to load inventory from Steam: ${errorMessage}`, 'error');
    } finally {
      setIsLoadingSteam(false);
    }
  };

  const filteredItems = sortedItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-gray-950 pb-16">
      <Navbar
        isAuthenticated={!!user}
        onLoadFromSteam={steamId && user ? handleLoadFromSteam : undefined}
        isLoadingSteam={isLoadingSteam}
        authControl={<SteamLoginButton />}
      />

      {toast && (
        <div className="fixed top-6 left-1/2 z-[60] w-full max-w-lg -translate-x-1/2 px-4">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm transition-opacity ${
              toast.type === 'success'
                ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                : toast.type === 'error'
                  ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
                  : 'border-blue-400/40 bg-blue-500/15 text-blue-200'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-gray-950/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/40 bg-gray-900/95 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-200">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <h3 className="text-lg font-semibold">Delete item?</h3>
            </div>
            <p className="text-sm text-gray-300">
              Are you sure you want to remove <span className="font-medium text-white">{deleteCandidate.name}</span> from your inventory? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-800 transition-colors disabled:opacity-60"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60"
                disabled={isDeleting}
              >
                {isDeleting && (
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V2.5A9.5 9.5 0 003.5 12H4zm2 5.291A7.962 7.962 0 014 12H2.5c0 3.31 1.344 6.31 3.52 8.477L6 17.291z" />
                  </svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backend Loading State */}
      {loading && user && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-gray-950/95 backdrop-blur-sm">
          <svg className="h-10 w-10 animate-spin text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-purple-400 font-medium">Loading {user.username}'s inventory...</p>
        </div>
      )}

      {/* Backend Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200">
          <p className="font-semibold">Error loading inventory:</p>
          <p className="text-sm">{error}</p>
          <button onClick={() => refresh()} className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">
            Retry
          </button>
        </div>
      )}

      {isLoadingSteam && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-gray-950/85 backdrop-blur-sm">
          <svg className="h-10 w-10 animate-spin text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V1.5A10.5 10.5 0 002.5 12H4zm2 5.291A7.962 7.962 0 014 12H2.5c0 3.31 1.344 6.31 3.52 8.477L6 17.291z" />
          </svg>
          <div className="text-sm font-medium text-blue-200">Loading inventory from Steam…</div>
          <p className="text-xs text-gray-400">This may take a moment if you have a large inventory.</p>
        </div>
      )}

      <div className="mx-auto mt-8 w-full max-w-7xl px-4 md:px-6">
        {/* Global Search Bar - Search ALL Skins */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="md:flex-1">
            <GlobalSearchBar
              userInventory={sortedItems}
              onAddSkin={handleQuickAddSkin}
              isLoggedIn={!!user}
            />
          </div>
          {user && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Skin
            </button>
          )}
        </div>

        {/* Filter Your Inventory */}
        <div className="mb-6 flex items-center">
          <div className="relative w-full max-w-md">
            <label htmlFor="inventory-filter" className="sr-only">
              Filter your inventory
            </label>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.6-4.15a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z" />
              </svg>
            </span>
            <input
              id="inventory-filter"
              type="text"
              placeholder="Filter your items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-10 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 text-sm text-gray-400 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Items"
            value={stats ? stats.totalItems.toLocaleString() : '–'}
            valueClassName="type-heading-xl"
          />
          <StatCard
            label="Market Value"
            value={stats ? formatCurrency(stats.marketValue) : '–'}
            valueClassName="type-heading-xl"
          />
          <StatCard
            label="Acquisition Cost"
            value={stats ? formatCurrency(stats.acquisitionCost) : '–'}
            valueClassName="type-heading-xl"
          />
          <StatCard
            label="Net Profit"
            value={stats ? formatCurrency(stats.netProfit) : '–'}
            valueClassName={`type-heading-xl ${stats ? (stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400') : ''}`}
            secondaryValue={
              stats?.averageProfitPercent !== undefined && stats?.averageProfitPercent !== null
                ? `${stats.averageProfitPercent >= 0 ? '+' : ''}${stats.averageProfitPercent.toFixed(2)}%`
                : '–'
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Item Grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedItemId(item.id)}
                  isSelected={selectedItemId === item.id}
                  variant="grid"
                />
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No items found</p>
              </div>
            )}
          </div>

          {/* Right Panel - Detailed View */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8 space-y-6">
            {selectedItem ? (
              <ItemCard
                item={selectedItem}
                variant="detailed"
                onEdit={user ? () => handleEditClick(selectedItem) : undefined}
                onDelete={user ? () => handleRequestDelete(selectedItem) : undefined}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 p-10 text-center text-sm text-gray-400">
                Select an item from the grid to view detailed stats.
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Skin Form Modal */}
      {showAddForm && (
        <AddSkinForm
          onAdd={handleAddSkin}
          onClose={() => {
            setShowAddForm(false);
            setQuickAddSkin(null);
          }}
          initialSkin={quickAddSkin ?? undefined}
        />
      )}

      {/* Edit Skin Form Modal */}
      {editingItem && (
        <AddSkinForm
          item={editingItem}
          onAdd={handleAddSkin}
          onUpdate={handleUpdateSkin}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

