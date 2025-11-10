'use client';

import { useState, useEffect } from 'react';
import { CSItem, mockItems, Exterior } from '@/lib/mockData';
import ItemCard from './ItemCard';
import AddSkinForm, { NewSkinData } from './AddSkinForm';
import { calculateTradeProtectionDate } from '@/lib/utils';
import { fetchSteamInventory, convertSteamItemToCSItem } from '@/lib/steamApi';
import { getStoredSteamId } from '@/lib/steamAuth';

export default function ItemGrid() {
  const [items, setItems] = useState<CSItem[]>(mockItems);
  const [selectedItem, setSelectedItem] = useState<CSItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CSItem | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoadingSteam, setIsLoadingSteam] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);

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

  // Load items from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('csInventoryItems');
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems);
        // Check if localStorage has old mock data by checking for old item names
        const oldItemNames = ['AK-47 | Redline', 'AWP | Dragon Lore', 'M4A4 | Howl', 'Glock-18 | Fade', 'USP-S | Kill Confirmed', 'AWP | Asiimov'];
        const hasOldData = parsed && parsed.some((item: any) => oldItemNames.includes(item.name));
        
        if (hasOldData) {
          // Old mock data detected, clear localStorage and use new mockItems
          localStorage.removeItem('csInventoryItems');
          setItems(mockItems);
        } else if (parsed && parsed.length > 0) {
          // Valid saved data, use it
          const itemsWithDates = parsed.map((item: any) => ({
            ...item,
            tradableAfter: item.tradableAfter ? new Date(item.tradableAfter) : undefined,
          }));
          setItems(itemsWithDates);
        } else {
          // Empty array, use mockItems
          setItems(mockItems);
        }
      } catch (error) {
        console.error('Error loading saved items:', error);
        // On error, clear localStorage and use mockItems
        localStorage.removeItem('csInventoryItems');
        setItems(mockItems);
      }
    } else {
      // No localStorage data, use mockItems
      setItems(mockItems);
    }
    setIsInitialized(true);
  }, []);

  // Save items to localStorage whenever items change (but not on initial load)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('csInventoryItems', JSON.stringify(items));
    }
  }, [items, isInitialized]);

  // Auto-select the first item to populate detail view
  useEffect(() => {
    if (items.length > 0 && !selectedItem) {
      setSelectedItem(items[0]);
    }
  }, [items, selectedItem]);

  // Helper function to determine exterior from float
  const determineExterior = (float?: number): Exterior => {
    if (float === undefined) return 'Field-Tested';
    if (float < 0.07) return 'Factory New';
    if (float < 0.15) return 'Minimal Wear';
    if (float < 0.38) return 'Field-Tested';
    if (float < 0.45) return 'Well-Worn';
    return 'Battle-Scarred';
  };

  const handleAddSkin = (newSkinData: NewSkinData) => {
    const exterior = determineExterior(newSkinData.float);
    const tradableAfter = newSkinData.tradeProtected ? calculateTradeProtectionDate() : undefined;

    // Create new item
    const newItem: CSItem = {
      id: Date.now().toString(), // Simple ID generation
      name: newSkinData.name,
      rarity: newSkinData.rarity,
      type: newSkinData.type,
      float: newSkinData.float ?? 0.5, // Default float if not provided
      exterior: exterior, // Auto-determined from float
      paintSeed: newSkinData.paintSeed,
      price: newSkinData.price,
      cost: newSkinData.cost,
      imageUrl: newSkinData.imageUrl || `https://via.placeholder.com/300x200/4C1D95/FFFFFF?text=${encodeURIComponent(newSkinData.name)}`,
      tradeProtected: newSkinData.tradeProtected,
      tradableAfter: tradableAfter,
    };

    // Add to items list
    setItems([...items, newItem]);
    setShowAddForm(false);
    
    // Optionally select the new item
    setSelectedItem(newItem);
  };

  const handleUpdateSkin = (id: string, updatedData: NewSkinData) => {
    const exterior = determineExterior(updatedData.float);
    const existingItem = items.find(item => item.id === id);
    
    // If trade protection is being enabled, set the date. If disabled, clear it.
    // If it's already protected and staying protected, keep the existing date
    let tradableAfter = existingItem?.tradableAfter;
    if (updatedData.tradeProtected && !existingItem?.tradeProtected) {
      // Newly protected - set 7 days from now
      tradableAfter = calculateTradeProtectionDate();
    } else if (!updatedData.tradeProtected) {
      // Protection removed
      tradableAfter = undefined;
    }

    const updatedItem: CSItem = {
      ...existingItem!,
      name: updatedData.name,
      rarity: updatedData.rarity,
      type: updatedData.type,
      float: updatedData.float ?? existingItem?.float ?? 0.5,
      exterior: exterior,
      paintSeed: updatedData.paintSeed,
      price: updatedData.price,
      cost: updatedData.cost,
      imageUrl: updatedData.imageUrl || existingItem?.imageUrl || `https://via.placeholder.com/300x200/4C1D95/FFFFFF?text=${encodeURIComponent(updatedData.name)}`,
      tradeProtected: updatedData.tradeProtected,
      tradableAfter: tradableAfter,
    };

    setItems(items.map(item => item.id === id ? updatedItem : item));
    setEditingItem(null);
    
    // Update selected item if it was the one being edited
    if (selectedItem?.id === id) {
      setSelectedItem(updatedItem);
    }
  };

  const handleEditClick = (item: CSItem) => {
    setEditingItem(item);
  };

  const handleLoadFromSteam = async () => {
    if (!steamId) {
      alert('Please login with Steam first');
      return;
    }

    setIsLoadingSteam(true);
    try {
      console.log('Fetching Steam inventory for:', steamId);
      const steamItems = await fetchSteamInventory(steamId);
      console.log('Fetched Steam items:', steamItems);
      
      // Convert Steam items to CSItems
      const convertedItems: CSItem[] = steamItems
        .map((steamItem, index) => {
          const partial = convertSteamItemToCSItem(steamItem, index);
          return {
            ...partial,
            // Ensure all required fields are present
            id: partial.id || steamItem.assetid,
            name: partial.name || steamItem.marketName,
            rarity: partial.rarity || 'Consumer Grade',
            type: partial.type || 'Rifle',
            float: partial.float || 0.5,
            exterior: partial.exterior || 'Field-Tested',
            price: partial.price || 0,
            imageUrl: partial.imageUrl || '',
          } as CSItem;
        })
        .filter(item => item.name && item.imageUrl); // Filter out invalid items

      console.log('Converted items:', convertedItems);

      if (convertedItems.length > 0) {
        setItems(convertedItems);
        alert(`Loaded ${convertedItems.length} items from Steam inventory!`);
      } else {
        alert('No items found in your Steam inventory. This could mean:\n- Your inventory is empty\n- Items are in a different game context\n- Check browser console for details');
      }
    } catch (error) {
      console.error('Error loading Steam inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to load inventory from Steam.\n\nError: ${errorMessage}\n\nCheck browser console (F12) for more details.`);
    } finally {
      setIsLoadingSteam(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-gray-950 p-8 pb-16">
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
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">CS Inventory Tracker</h1>
            <div className="flex items-center gap-3">
              {steamId && (
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
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Skin
              </button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Looking for a specific item?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>Total Items: <span className="text-white font-semibold">{items.length}</span></span>
            <span>Total Value: <span className="text-green-400 font-semibold">
              ${items.reduce((sum, item) => sum + item.price, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  onClick={() => setSelectedItem(item)}
                  isSelected={selectedItem?.id === item.id}
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
                onEdit={() => handleEditClick(selectedItem)}
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
          onClose={() => setShowAddForm(false)}
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

