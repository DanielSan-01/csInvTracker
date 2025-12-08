'use client';

import { useState, useEffect } from 'react';
import ItemCard from '../ItemCard';
import type { CSItem } from '@/lib/mockData';

type InventoryGridListProps = {
  items: CSItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const ITEMS_PER_PAGE = 20;

export default function InventoryGridList({ items, selectedId, onSelect }: InventoryGridListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIndex, endIndex);

  // Reset to page 1 when items change (e.g., when filtering)
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);

  // Ensure current page is valid
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of grid when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {paginatedItems.map((item) => (
          <div key={item.id} data-item-id={item.id}>
          <ItemCard
            item={item}
            onClick={() => onSelect(item.id)}
            isSelected={selectedId === item.id}
            variant="grid"
          />
          </div>
        ))}
      </div>
      
      {items.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-400">No items found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                      page === currentPage
                        ? 'bg-purple-600 text-white'
                        : 'border border-gray-700 bg-gray-800 text-white hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="px-2 text-gray-400">...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-2 text-center text-sm text-gray-400">
          Showing {startIndex + 1}-{Math.min(endIndex, items.length)} of {items.length} items
        </div>
      )}
    </div>
  );
}


