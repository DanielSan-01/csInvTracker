'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { CSItem, rarityBorderColors, exteriorAbbr, formatPrice, formatFloat, getFloatColor } from '@/lib/mockData';

interface ItemCardProps {
  item: CSItem;
  onClick?: () => void;
  variant?: 'grid' | 'detailed';
}

export default function ItemCard({ item, onClick, variant = 'grid' }: ItemCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

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
    return (
      <div
        ref={cardRef}
        className={`relative bg-gray-900 rounded-lg border-2 ${rarityBorderColors[item.rarity]} p-6 cursor-pointer transition-all`}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Item Image */}
        <div className="relative w-full aspect-[4/3] mb-4 overflow-hidden rounded-lg bg-gray-800">
          <div
            ref={imageRef}
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${item.imageUrl})` }}
          />
        </div>

        {/* Item Name and Rarity */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400 text-xl">★</span>
            <h3 className="text-xl font-bold text-white">{item.name}</h3>
          </div>
          <p className="text-sm text-gray-400">{item.rarity}</p>
        </div>

        {/* Float Value with Visual Indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Float:</span>
            <span className="text-sm font-mono text-white">{formatFloat(item.float, 3)}</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getFloatColor(item.float)}`}
              style={{ width: `${(item.float / 1) * 100}%` }}
            />
          </div>
          {item.paintSeed && (
            <p className="text-xs text-gray-500 mt-1">Paint Seed: {item.paintSeed}</p>
          )}
        </div>

        {/* Exterior Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${rarityBorderColors[item.rarity]} border text-white`}>
            {exteriorAbbr[item.exterior]}
          </span>
          <span className="text-sm text-gray-400">{item.exterior}</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-green-400">{formatPrice(item.price)}</p>
        </div>

        {/* Trade Protection Badge */}
        {item.tradeProtected && (
          <div className="flex items-center gap-2 text-yellow-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Trade Protected</span>
          </div>
        )}
      </div>
    );
  }

  // Grid variant (smaller card)
  return (
    <div
      ref={cardRef}
      className={`relative bg-gray-900 rounded-lg border-2 ${rarityBorderColors[item.rarity]} p-3 cursor-pointer transition-all`}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Item Image */}
      <div className="relative w-full aspect-square mb-2 overflow-hidden rounded bg-gray-800">
        <div
          ref={imageRef}
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${item.imageUrl})` }}
        />
      </div>

      {/* Item Name */}
      <h3 className="text-sm font-semibold text-white mb-1 truncate">{item.name}</h3>

      {/* Float and Exterior */}
      <div className="flex items-center justify-between mb-2">
        <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${rarityBorderColors[item.rarity]} border text-white`}>
          {exteriorAbbr[item.exterior]}
        </span>
        <span className="text-xs font-mono text-gray-400">{formatFloat(item.float, 3)}</span>
      </div>

      {/* Price */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-green-400">{formatPrice(item.price)}</p>
        {item.tradeProtected && (
          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  );
}

