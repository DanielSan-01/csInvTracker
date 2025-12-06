'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { CSItem } from '@/lib/mockData';
import { formatPrice, calculateProfitPercentage } from '@/lib/mockData';
import { resolveDisplayType } from '../ItemCardShared';

type ExpandableDashboardProps = {
  items: CSItem[];
};

// Color palette for pie chart - consistent colors for each category
const CATEGORY_COLORS: Record<string, string> = {
  'Knives': '#3B82F6',      // Blue
  'Gloves': '#8B5CF6',      // Purple
  'Weapon Skins': '#EC4899', // Pink
  'Agents': '#10B981',      // Green
  'Stickers': '#F59E0B',    // Amber
  'Cases': '#EF4444',       // Red
  'Other': '#06B6D4',       // Cyan
};

// Fallback colors for any categories not in the map
const FALLBACK_COLORS = [
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#14B8A6', // Teal
];

// Group item types into categories
function categorizeType(type: string): string {
  const normalized = type.toLowerCase();
  
  if (normalized.includes('knife')) return 'Knives';
  if (normalized.includes('glove')) return 'Gloves';
  if (normalized.includes('rifle') || normalized.includes('pistol') || 
      normalized.includes('smg') || normalized.includes('sniper') || 
      normalized.includes('shotgun') || normalized.includes('machine gun')) {
    return 'Weapon Skins';
  }
  if (normalized.includes('agent')) return 'Agents';
  if (normalized.includes('sticker')) return 'Stickers';
  if (normalized.includes('case') || normalized.includes('crate')) return 'Cases';
  
  return 'Other';
}

export default function ExpandableDashboard({ items }: ExpandableDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [breakdownMode, setBreakdownMode] = useState<'value' | 'volume'>('value');

  // Calculate item type breakdown
  const typeBreakdown = useMemo(() => {
    if (breakdownMode === 'volume') {
      // Volume breakdown (count of items)
      const typeCounts: Record<string, number> = {};
      
      items.forEach(item => {
        const category = categorizeType(resolveDisplayType(item));
        typeCounts[category] = (typeCounts[category] || 0) + 1;
      });

      const total = items.length;
      return Object.entries(typeCounts)
        .map(([name, count]) => ({
          name,
          value: count,
          percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      // Value breakdown (sum of prices)
      const typeValues: Record<string, number> = {};
      
      items.forEach(item => {
        const category = categorizeType(resolveDisplayType(item));
        typeValues[category] = (typeValues[category] || 0) + (item.price || 0);
      });

      const totalValue = Object.values(typeValues).reduce((sum, val) => sum + val, 0);
      return Object.entries(typeValues)
        .map(([name, value]) => ({
          name,
          value: value,
          percentage: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : '0',
        }))
        .sort((a, b) => b.value - a.value);
    }
  }, [items, breakdownMode]);

  // Find best and worst performers (by profit percentage)
  const { bestPerformer, worstPerformer } = useMemo(() => {
    const itemsWithProfit = items
      .filter(item => item.cost != null && item.cost > 0)
      .map(item => ({
        item,
        profitPercent: calculateProfitPercentage(item.price, item.cost) ?? 0,
        profit: item.price - (item.cost ?? 0),
      }));

    if (itemsWithProfit.length === 0) {
      return { bestPerformer: null, worstPerformer: null };
    }

    const best = itemsWithProfit.reduce((max, current) => 
      current.profitPercent > max.profitPercent ? current : max
    );
    
    const worst = itemsWithProfit.reduce((min, current) => 
      current.profitPercent < min.profitPercent ? current : min
    );

    return {
      bestPerformer: best.item,
      worstPerformer: worst.item,
      bestStats: { profitPercent: best.profitPercent, profit: best.profit },
      worstStats: { profitPercent: worst.profitPercent, profit: worst.profit },
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Expand/Collapse Button */}
      <div className="flex w-full justify-end">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label={isExpanded ? 'Collapse dashboard' : 'Expand dashboard'}
        >
          <svg
            className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/50 p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pie Chart */}
            <div className="flex flex-col overflow-hidden">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Inventory Breakdown</h3>
                <div className="flex gap-2 rounded-lg border border-gray-700 bg-gray-800/50 p-1">
                  <button
                    onClick={() => setBreakdownMode('value')}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      breakdownMode === 'value'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Value
                  </button>
                  <button
                    onClick={() => setBreakdownMode('volume')}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      breakdownMode === 'volume'
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Volume
                  </button>
                </div>
              </div>
              {typeBreakdown.length > 0 ? (
                <div className="flex-1 min-h-0 w-full">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <Pie
                        data={typeBreakdown}
                        cx="50%"
                        cy="40%"
                        labelLine={false}
                        label={false}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F3F4F6',
                        }}
                        formatter={(value: number) => 
                          breakdownMode === 'value' 
                            ? [formatPrice(value), 'Value']
                            : [`${value} items`, 'Count']
                        }
                      />
                      <Legend
                        wrapperStyle={{ color: '#D1D5DB', fontSize: '11px', paddingTop: '10px' }}
                        iconSize={8}
                        layout="horizontal"
                        verticalAlign="bottom"
                        formatter={(value) => `${value} (${typeBreakdown.find(t => t.name === value)?.percentage}%)`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No data available</p>
              )}
            </div>

            {/* Best & Worst Performers */}
            <div className="flex flex-col gap-6">
              {/* Best Performer */}
              {bestPerformer && (
                <div className="rounded-lg border border-green-500/30 bg-green-950/20 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-400">
                    Best Performer
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <img
                        src={bestPerformer.imageUrl}
                        alt={bestPerformer.name}
                        className="h-20 w-20 rounded border border-gray-700 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80/374151/9CA3AF?text=No+Image';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{bestPerformer.name}</p>
                      <p className="text-xs text-gray-400">{resolveDisplayType(bestPerformer)}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Price:</span>
                          <span className="font-medium text-green-400">{formatPrice(bestPerformer.price)}</span>
                        </div>
                        {bestPerformer.cost != null && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Cost:</span>
                              <span className="font-medium text-gray-300">{formatPrice(bestPerformer.cost)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Profit:</span>
                              <span className="font-medium text-green-400">
                                {formatPrice(bestPerformer.price - bestPerformer.cost)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Profit %:</span>
                              <span className="font-medium text-green-400">
                                {calculateProfitPercentage(bestPerformer.price, bestPerformer.cost)?.toFixed(2) ?? '0.00'}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Worst Performer */}
              {worstPerformer && (
                <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-4">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-red-400">
                    Worst Performer
                  </h3>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <img
                        src={worstPerformer.imageUrl}
                        alt={worstPerformer.name}
                        className="h-20 w-20 rounded border border-gray-700 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80/374151/9CA3AF?text=No+Image';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{worstPerformer.name}</p>
                      <p className="text-xs text-gray-400">{resolveDisplayType(worstPerformer)}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Price:</span>
                          <span className="font-medium text-red-400">{formatPrice(worstPerformer.price)}</span>
                        </div>
                        {worstPerformer.cost != null && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Cost:</span>
                              <span className="font-medium text-gray-300">{formatPrice(worstPerformer.cost)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Loss:</span>
                              <span className="font-medium text-red-400">
                                {formatPrice(worstPerformer.price - worstPerformer.cost)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Loss %:</span>
                              <span className="font-medium text-red-400">
                                {calculateProfitPercentage(worstPerformer.price, worstPerformer.cost)?.toFixed(2) ?? '0.00'}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!bestPerformer && !worstPerformer && (
                <p className="text-sm text-gray-400">No items with cost data available for performance analysis</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

