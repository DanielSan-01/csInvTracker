'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { CSItem, Exterior, rarityBorderColors, rarityGradients, exteriorAbbr, formatPrice, formatFloat, getFloatColor, calculateProfit, calculateProfitPercentage } from '@/lib/mockData';
import { formatTimeRemaining } from '@/lib/utils';

interface ItemCardProps {
  item: CSItem;
  onClick?: () => void;
  onEdit?: () => void;
  variant?: 'grid' | 'detailed';
  isSelected?: boolean;
}

const rarityBadgeClasses: Record<CSItem['rarity'], string> = {
  'Consumer Grade': 'bg-slate-500/15 border-slate-400/60 text-slate-100',
  'Industrial Grade': 'bg-blue-500/15 border-blue-400/60 text-blue-100',
  'Mil-Spec': 'bg-sky-500/15 border-sky-400/60 text-sky-100',
  'Restricted': 'bg-purple-500/15 border-purple-400/60 text-purple-100',
  'Classified': 'bg-pink-500/15 border-pink-400/60 text-pink-100',
  'Covert': 'bg-rose-500/15 border-rose-400/60 text-rose-100',
  'Extraordinary': 'bg-amber-500/15 border-amber-400/60 text-amber-100',
  'Contraband': 'bg-orange-500/15 border-orange-400/60 text-orange-100'
};

const exteriorDetails: Record<Exterior, { label: string; description: string }> = {
  'Factory New': {
    label: 'Factory New',
    description: 'Minimal to no wear. Almost pristine condition straight from the factory.'
  },
  'Minimal Wear': {
    label: 'Minimal Wear',
    description: 'Light wear mostly noticeable on edges. Still in excellent shape.'
  },
  'Field-Tested': {
    label: 'Field-Tested',
    description: 'Balanced wear pattern. Noticeable scratches but still solid presentation.'
  },
  'Well-Worn': {
    label: 'Well-Worn',
    description: 'Heavy surface wear with faded paint. Shows extensive use.'
  },
  'Battle-Scarred': {
    label: 'Battle-Scarred',
    description: 'Severe wear with large scratches and faded paint. A veteran of many matches.'
  }
};

const infoPillBase =
  'px-3 py-1.5 rounded-full border border-gray-700 bg-gray-800/60 text-xs text-gray-200 flex items-center gap-2';

function formatProfitDisplay(profit?: number, profitPercent?: number) {
  if (profit === undefined) return { label: 'Profit', value: '—', className: 'text-gray-400' };
  if (profit === 0) return { label: 'Break-even', value: '$0.00', className: 'text-gray-300' };

  const className = profit > 0 ? 'text-emerald-400' : 'text-rose-400';
  const value = `${profit > 0 ? '+' : ''}${formatPrice(profit)}`;
  const percent = profitPercent !== undefined ? ` (${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(1)}%)` : '';

  return { label: 'Profit', value: `${value}${percent}`, className };
}

export default function ItemCard({ item, onClick, onEdit, variant = 'grid', isSelected = false }: ItemCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);

  // Update trade protection countdown
  useEffect(() => {
    if (item.tradableAfter) {
      const updateCountdown = () => {
        setTimeRemaining(formatTimeRemaining(item.tradableAfter!));
      };
      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [item.tradableAfter]);

  // Image load animation
  useEffect(() => {
    if (imageLoaded && imageContainerRef.current) {
      // Light up animation when image loads
      gsap.fromTo(
        imageContainerRef.current,
        { opacity: 0.3, filter: 'brightness(0.5)' },
        {
          opacity: 1,
          filter: 'brightness(1)',
          duration: 0.8,
          ease: 'power2.out',
        }
      );
    }
  }, [imageLoaded]);

  // Check if image is loaded
  useEffect(() => {
    const img = new Image();
    img.src = item.imageUrl;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(true); // Still animate even if image fails
  }, [item.imageUrl]);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20, scale: 0.95 },
        { 
          opacity: 1, 
          y: 0, 
          scale: 1, 
          duration: 0.5, 
          ease: 'power2.out',
          delay: Math.random() * 0.2 // Stagger effect
        }
      );
    }
  }, []);

  const handleMouseEnter = () => {
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: -5,
        scale: 1.02,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1.1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  };

  if (variant === 'detailed') {
    const profit = item.cost !== undefined ? calculateProfit(item.price, item.cost) : undefined;
    const profitPercent =
      item.cost !== undefined ? calculateProfitPercentage(item.price, item.cost) : undefined;
    const profitDisplay = formatProfitDisplay(profit, profitPercent);
    const exteriorInfo = exteriorDetails[item.exterior];

    return (
      <div ref={cardRef} className="relative flex flex-col gap-6 transition-all">
        {/* Preview image */}
        <div
          className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-lg"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            ref={imageContainerRef}
            className={`relative w-full aspect-[16/9] bg-gradient-to-b ${rarityGradients[item.rarity]}`}
            style={{ opacity: imageLoaded ? 1 : 0.3, filter: imageLoaded ? 'brightness(1)' : 'brightness(0.5)' }}
          >
            <div
              ref={imageRef}
              className="w-full h-full bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: item.imageUrl ? `url("${item.imageUrl}")` : 'none' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950/60 via-gray-950/0 to-gray-950/40 pointer-events-none" />
          </div>

          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide ${rarityBadgeClasses[item.rarity]}`}>
              {item.rarity}
            </span>
            <span className={`px-2.5 py-1 rounded-full border border-white/30 bg-black/40 text-xs font-semibold text-white`}>
              {exteriorAbbr[item.exterior]} · {exteriorInfo.label}
            </span>
            {item.type && (
              <span className={infoPillBase}>
                <svg className="w-3.5 h-3.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 00-2 2v7.5A1.5 1.5 0 004.5 15h11a.5.5 0 100-1h-11a.5.5 0 01-.5-.5V11h5a3 3 0 003-3V4H5zm7 0v4a2 2 0 01-2 2H4V6a2 2 0 012-2h6z" />
                </svg>
                {item.type}
              </span>
            )}
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2">
            {item.tradeProtected && item.tradableAfter ? (
              <span className="px-3 py-1.5 rounded-full border border-amber-400/60 bg-amber-500/15 text-xs font-medium text-amber-200 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 3a.75.75 0 01.75.75v3.17l2.03 2.03a.75.75 0 11-1.06 1.06l-2.25-2.25A.75.75 0 019.25 9V5.75A.75.75 0 0110 5z" clipRule="evenodd" />
                </svg>
                Trade locked
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/10 text-xs font-medium text-emerald-200 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-7.5 9a.75.75 0 01-1.079.082l-3.5-3.25a.75.75 0 011.02-1.1l2.907 2.701 7.023-8.43a.75.75 0 011.052-.143z" clipRule="evenodd" />
                </svg>
                Trade ready
              </span>
            )}
          </div>
        </div>

        {/* Item information */}
        <div className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900/70 p-6 shadow-inner shadow-black/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-gray-400">
                <span>Inventory Item</span>
                <span className="text-gray-600">•</span>
                <span>{item.type}</span>
              </div>
              <h2 className="text-3xl font-semibold text-white">{item.name}</h2>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="text-xs uppercase tracking-wide text-gray-400">Market Value</div>
              <div className="text-4xl font-bold text-emerald-400">{formatPrice(item.price)}</div>
              {item.cost !== undefined && (
                <div className="text-xs text-gray-400">
                  Cost basis: <span className="text-gray-200">{formatPrice(item.cost)}</span>
                </div>
              )}
              <div className={`text-sm font-medium ${profitDisplay.className}`}>
                {profitDisplay.label}: {profitDisplay.value}
              </div>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-500/50 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-200 hover:bg-blue-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Item
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Float value</span>
              <span className="font-mono text-base text-white">{formatFloat(item.float, 6)}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full ${getFloatColor(item.float)}`}
                style={{ width: `${Math.min(item.float, 1) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">{exteriorInfo.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
            <div className={infoPillBase}>
              <svg className="w-4 h-4 text-indigo-300" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 01.894.553l2.382 4.764 5.258.764a1 1 0 01.554 1.706l-3.807 3.71.899 5.239a1 1 0 01-1.451 1.054L10 16.347l-4.729 2.487A1 1 0 013.82 18.5l.899-5.24-3.808-3.707A1 1 0 011.465 8.08l5.258-.765L9.106 2.553A1 1 0 0110 2z" />
              </svg>
              {item.rarity}
            </div>
            <div className={infoPillBase}>
              <svg className="w-4 h-4 text-sky-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v2a4 4 0 002 3.465v1.535a2 2 0 002 2h1.055a3 3 0 002.83 2H13a2 2 0 002-2v-3a2 2 0 002-2V5a2 2 0 00-2-2H4zm5 9.917V9a1 1 0 112 0v6a1 1 0 01-1 1h-.945a3 3 0 01-1.055-.183z" clipRule="evenodd" />
              </svg>
              Exterior: {item.exterior}
            </div>
            <div className={infoPillBase}>
              <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 3a1 1 0 00-1 1v1H4a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1V4a1 1 0 10-2 0v1H7V4a1 1 0 00-1-1zm0 4h8v2H6V7zm0 4h3v2H6v-2zm5 0h3v2h-3v-2z" clipRule="evenodd" />
              </svg>
              Type: {item.type}
            </div>
            {item.paintSeed && (
              <div className={infoPillBase}>
                <svg className="w-4 h-4 text-pink-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 01.832.445l4.5 6.5a1 1 0 01.168.555V15a1 1 0 01-1 1h-10a1 1 0 01-1-1V9.5a1 1 0 01.168-.555l4.5-6.5A1 1 0 0110 2zm0 3.236L6.5 9.5V14h7v-4.5L10 5.236z" />
                </svg>
                Paint seed: {item.paintSeed}
              </div>
            )}
          </div>

          {item.tradeProtected && item.tradableAfter && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a8 8 0 00-8 8v3a3 3 0 003 3h1v-3H5v-3a5 5 0 1110 0v3h-1v3h1a3 3 0 003-3v-3a8 8 0 00-8-8zm-1 11a1 1 0 112 0v1a1 1 0 11-2 0v-1z" clipRule="evenodd" />
              </svg>
              Trade lock expires in {timeRemaining}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid variant (smaller card)
  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer group ${
        isSelected
          ? 'border-blue-500 shadow-lg shadow-blue-500/20'
          : 'border-gray-800 hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-500/10'
      }`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Title at top */}
      <div className="absolute top-0 inset-x-0 z-10 p-3 bg-gradient-to-b from-black/80 via-black/60 to-transparent">
        <h3 className="text-base font-bold text-white drop-shadow-lg line-clamp-2 leading-tight">
          {item.name}
        </h3>
      </div>

      {/* Item Image with Gradient Background */}
      <div 
        ref={imageContainerRef}
        className={`relative w-full aspect-[4/3] min-h-[240px] mb-20 overflow-hidden bg-gradient-to-b ${rarityGradients[item.rarity]}`}
        style={{ opacity: imageLoaded ? 1 : 0.3, filter: imageLoaded ? 'brightness(1)' : 'brightness(0.5)' }}
      >
        <div
          ref={imageRef}
          className="w-full h-full bg-contain bg-center bg-no-repeat scale-90"
          style={{ backgroundImage: item.imageUrl ? `url("${item.imageUrl}")` : 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent pointer-events-none" />

        {/* Compact badges in corners */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${rarityBadgeClasses[item.rarity]}`}>
            {item.rarity.split(' ')[0]}
          </span>
          <span className="px-1.5 py-0.5 rounded border border-gray-500/40 bg-black/60 text-[9px] font-medium text-gray-300 uppercase">
            {item.type}
          </span>
        </div>

        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
          <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-gray-100 border border-white/20">
            {formatFloat(item.float, 3)}
          </span>
          {item.tradeProtected && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/30 px-1.5 py-0.5 text-[9px] text-amber-200 border border-amber-500/40">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a8 8 0 00-8 8v3a3 3 0 003 3h1v-3H5v-3a5 5 0 1110 0v3h-1v3h1a3 3 0 003-3v-3a8 8 0 00-8-8zm-1 11a1 1 0 112 0v1a1 1 0 11-2 0v-1z" clipRule="evenodd" />
              </svg>
              Lock
            </span>
          )}
        </div>
      </div>

      {/* Price info at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-black/70 px-2.5 py-2 backdrop-blur-sm">
          {/* Price and Cost */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-bold text-emerald-400">{formatPrice(item.price)}</p>
            {item.cost !== undefined && (
              <p className="text-[10px] text-gray-400">Cost {formatPrice(item.cost)}</p>
            )}
          </div>
          
          {/* Profit and Wear */}
          {item.cost !== undefined && item.cost !== null && (() => {
            const cost = item.cost as number;
            const profit = calculateProfit(item.price, cost);
            return (
              <div className="flex items-center justify-between gap-2">
                <div className={`text-[10px] font-semibold ${profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  Profit {profit >= 0 ? '+' : ''}
                  {formatPrice(profit)}
                </div>
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${getFloatColor(item.float)} text-white`}>
                  {exteriorAbbr[item.exterior]}
                </span>
              </div>
            );
          })()}
          
          {/* Float bar at bottom */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="relative flex-1 h-1.5 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 overflow-hidden">
              {/* Float indicator */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                style={{ left: `${Math.min(item.float * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

