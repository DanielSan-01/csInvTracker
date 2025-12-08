'use client';

import { useState, useRef, useCallback } from 'react';
import { useSkinCatalog } from '@/hooks/useSkinCatalog';
import { CSItem } from '@/lib/mockData';
import type { SkinDto } from '@/lib/api';
import useOutsideClick from '@/app/hooks/useOutsideClick';
import SearchResultsDropdown from './global-search/SearchResultsDropdown';

interface NavbarSearchProps {
  userInventory: CSItem[];
  onAddSkin: (skin: SkinDto) => void;
  isLoggedIn?: boolean;
  actionLabel?: string;
  allowDuplicateSelection?: boolean;
}

export default function NavbarSearch({
  userInventory,
  onAddSkin,
  isLoggedIn = false,
  actionLabel = '+ Add',
  allowDuplicateSelection = false,
}: NavbarSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { skins, loading } = useSkinCatalog(searchTerm);
  const searchRef = useRef<HTMLDivElement>(null);
  useOutsideClick(searchRef, () => setShowResults(false));

  const isInInventory = useCallback(
    (skinId: number) => userInventory.some((item) => parseInt(item.id) === skinId),
    [userInventory]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowResults(true);
  };

  const handleAddClick = (skin: SkinDto) => {
    onAddSkin(skin);
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder=""
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setShowResults(true)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 pr-10 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
        />
        
        {/* Search Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <svg className="h-4 w-4 animate-spin text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {showResults && searchTerm.length >= 2 && (
        <div className="absolute z-50 mt-2 max-h-[500px] w-full overflow-y-auto rounded-xl border border-gray-700 bg-gray-800 shadow-2xl">
          <SearchResultsDropdown
            skins={skins}
            isLoading={loading}
            searchTerm={searchTerm}
            isLoggedIn={isLoggedIn}
            inventoryContains={isInInventory}
            allowDuplicateSelection={allowDuplicateSelection}
            actionLabel={actionLabel}
            onAdd={handleAddClick}
          />
        </div>
      )}
    </div>
  );
}




