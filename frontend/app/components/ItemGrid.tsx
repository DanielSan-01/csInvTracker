'use client';

import { useState } from 'react';
import { CSItem, mockItems } from '@/lib/mockData';
import ItemCard from './ItemCard';

export default function ItemGrid() {
  const [selectedItem, setSelectedItem] = useState<CSItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = mockItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">CS Inventory Tracker</h1>
          
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
                />
              </div>
            ) : (
              <div className="bg-gray-900 border-2 border-gray-700 rounded-lg p-8 text-center">
                <p className="text-gray-400">Select an item to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

