'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { CSItem, Exterior } from '@/lib/mockData';
import ItemCard from './ItemCard';
import AddSkinForm, { NewSkinData } from './AddSkinForm';
import GlobalSearchBar from './GlobalSearchBar';
import { useInventory } from '@/hooks/useInventory';
import { useUser } from '@/contexts/UserContext';
import { inventoryItemsToCSItems } from '@/lib/dataConverter';
import { CreateInventoryItemDto, UpdateInventoryItemDto, adminApi, SkinDto } from '@/lib/api';
import { fetchSteamInventory, convertSteamItemToCSItem } from '@/lib/steamApi';
import { getStoredSteamId } from '@/lib/steamAuth';

export default function ItemGrid() {
  const { user, loading: userLoading } = useUser();
  const { items: backendItems, loading, error, createItem, updateItem, deleteItem, refresh } = useInventory(user?.id);
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
  const [isImportingCsv, setIsImportingCsv] = useState(false);
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
    <div className="relative min-h-screen bg-gray-950 p-8 pb-16">
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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">CS Inventory Tracker</h1>
              {user ? (
                <p className="text-sm text-gray-400 mt-1">
                  Viewing <span className="text-purple-400 font-medium">{user.username}</span>'s inventory
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-1">
                  <span className="text-yellow-400">👆 Log in with Steam</span> to manage your inventory
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {steamId && user && (
                <button
                  onClick={handleLoadFromSteam}
                  disabled={isLoadingSteam}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {isLoadingSteam ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span>Load from Steam</span>
                    </>
                  )}
                </button>
              )}
              {user && (
                <>
                  <label className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {isImportingCsv ? 'Importing...' : 'Import CSV'}
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvImport}
                      disabled={isImportingCsv}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Skin
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Global Search Bar - Search ALL Skins */}
          <div className="mb-6 flex items-center justify-center">
            <GlobalSearchBar 
              userInventory={sortedItems}
              onAddSkin={handleQuickAddSkin}
              isLoggedIn={!!user}
            />
          </div>
          
          {/* Filter Your Inventory */}
          <div className="mb-4 flex items-center gap-3">
            <label className="text-sm text-gray-400 font-medium">Filter your inventory:</label>
            <input
              type="text"
              placeholder="Filter your items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>Total Items: <span className="text-white font-semibold">{sortedItems.length}</span></span>
            <span>Total Value: <span className="text-green-400 font-semibold">
              ${sortedItems.reduce((sum, item) => sum + item.price, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span></span>
          </div>
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

