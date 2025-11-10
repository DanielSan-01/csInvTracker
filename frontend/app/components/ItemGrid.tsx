'use client';

import { useState, useEffect } from 'react';
import { CSItem, mockItems, Exterior } from '@/lib/mockData';
import ItemCard from './ItemCard';
import AddSkinForm, { NewSkinData } from './AddSkinForm';
import { calculateTradeProtectionDate } from '@/lib/utils';

export default function ItemGrid() {
  const [items, setItems] = useState<CSItem[]>(mockItems);
  const [selectedItem, setSelectedItem] = useState<CSItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CSItem | null>(null);

  // Load items from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('csInventoryItems');
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems);
        // Convert date strings back to Date objects
        const itemsWithDates = parsed.map((item: any) => ({
          ...item,
          tradableAfter: item.tradableAfter ? new Date(item.tradableAfter) : undefined,
        }));
        setItems(itemsWithDates);
      } catch (error) {
        console.error('Error loading saved items:', error);
      }
    }
  }, []);

  // Save items to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('csInventoryItems', JSON.stringify(items));
  }, [items]);

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
      float: newSkinData.float ?? 0.5, // Default float if not provided
      exterior: exterior, // Auto-determined from float
      paintSeed: newSkinData.paintSeed,
      price: newSkinData.price,
      cost: newSkinData.cost,
      imageUrl: newSkinData.imageUrl || `https://via.placeholder.com/300x200/4C1D95/FFFFFF?text=${encodeURIComponent(newSkinData.name)}`,
      game: 'Counter-Strike 2',
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

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">CS Inventory Tracker</h1>
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
            {selectedItem ? (
              <div className="sticky top-8">
                <ItemCard
                  item={selectedItem}
                  variant="detailed"
                  onEdit={() => handleEditClick(selectedItem)}
                />
              </div>
            ) : (
              <div className="bg-gray-900 border-2 border-gray-700 rounded-lg p-8 text-center">
                <p className="text-gray-400">Click an item to view details</p>
              </div>
            )}
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

