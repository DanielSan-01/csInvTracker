'use client';

import { useState, useRef, useEffect } from 'react';
import { useSkinCatalog } from '@/hooks/useSkinCatalog';
import { CSItem } from '@/lib/mockData';

interface GlobalSearchBarProps {
  userInventory: CSItem[];
  onAddSkin: (skinId: number, skinName: string) => void;
  isLoggedIn?: boolean;
}

export default function GlobalSearchBar({ userInventory, onAddSkin, isLoggedIn = false }: GlobalSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { skins, loading } = useSkinCatalog(searchTerm);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isInInventory = (skinId: number) => {
    return userInventory.some(item => parseInt(item.id) === skinId);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowResults(true);
  };

  const handleAddClick = (skinId: number, skinName: string) => {
    onAddSkin(skinId, skinName);
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder='Search all skins... Try "bfk doppler ph4" or "ak redline"'
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setShowResults(true)}
          className="w-full px-5 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors text-lg"
        />
        
        {/* Search Icon */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Search Tips */}
      {searchTerm.length === 0 && (
        <div className="mt-2 text-xs text-gray-500 px-2">
          💡 <span className="font-medium">Quick tips:</span> Use shortcuts like <span className="text-blue-400">"kara"</span> for Karambit, <span className="text-blue-400">"ph4"</span> for Phase 4, <span className="text-blue-400">"dlore"</span> for Dragon Lore
        </div>
      )}

      {/* Results Dropdown */}
      {showResults && searchTerm.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-[500px] overflow-y-auto">
          {skins.length === 0 && !loading ? (
            <div className="p-6 text-center text-gray-400">
              <p className="text-lg mb-2">🔍 No skins found</p>
              <p className="text-sm">Try: "Karambit Doppler", "AWP Dragon Lore", or "AK-47 Redline"</p>
            </div>
          ) : (
            <div className="py-2">
              {skins.map((skin) => {
                const inInventory = isInInventory(skin.id);
                
                return (
                  <div
                    key={skin.id}
                    className="px-4 py-3 hover:bg-gray-700 transition-colors flex items-center justify-between group"
                  >
                    {/* Skin Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {skin.imageUrl && (
                        <img
                          src={skin.imageUrl}
                          alt={skin.name}
                          className="w-16 h-12 object-contain bg-gray-900 rounded"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{skin.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${getRarityColor(skin.rarity)}`}>
                            {skin.rarity}
                          </span>
                          <span className="text-xs text-gray-400">{skin.type}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {!isLoggedIn ? (
                      <span className="px-4 py-2 text-sm text-gray-500 font-medium">
                        Login to add
                      </span>
                    ) : inInventory ? (
                      <span className="px-4 py-2 text-sm text-green-400 font-medium">
                        ✓ In Inventory
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddClick(skin.id, skin.name)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'Consumer Grade':
      return 'bg-gray-600 text-gray-100';
    case 'Industrial Grade':
      return 'bg-blue-600 text-blue-100';
    case 'Mil-Spec':
    case 'Mil-Spec Grade':
      return 'bg-blue-500 text-blue-100';
    case 'Restricted':
      return 'bg-purple-600 text-purple-100';
    case 'Classified':
      return 'bg-pink-600 text-pink-100';
    case 'Covert':
      return 'bg-red-600 text-red-100';
    case 'Contraband':
    case 'Extraordinary':
      return 'bg-yellow-600 text-yellow-100';
    default:
      return 'bg-gray-600 text-gray-100';
  }
}

