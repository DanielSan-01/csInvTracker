'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { CSItem, rarityBorderColors, rarityGradients, exteriorAbbr, formatPrice, formatFloat, getFloatColor } from '@/lib/mockData';
import { formatTimeRemaining } from '@/lib/utils';

interface ItemCardProps {
  item: CSItem;
  onClick?: () => void;
  onEdit?: () => void;
  variant?: 'grid' | 'detailed';
}

export default function ItemCard({ item, onClick, onEdit, variant = 'grid' }: ItemCardProps) {
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
    return (
      <div
        ref={cardRef}
        className="relative bg-gray-900 rounded-lg border-2 border-gray-700 p-6 transition-all"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Item Image with Gradient Background */}
        <div 
          ref={imageContainerRef}
          className={`relative w-full aspect-[4/3] mb-4 overflow-hidden rounded-t-lg bg-gradient-to-b ${rarityGradients[item.rarity]} border-b-2 border-gray-800`}
          style={{ opacity: imageLoaded ? 1 : 0.3, filter: imageLoaded ? 'brightness(1)' : 'brightness(0.5)' }}
        >
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
        {item.tradeProtected && item.tradableAfter && (
          <div className="flex flex-col gap-1 text-yellow-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold">Trade Protected</span>
            </div>
            <p className="text-xs text-yellow-300 ml-7">{timeRemaining} remaining</p>
          </div>
        )}

        {/* Edit Button - Bottom Right Corner */}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute bottom-4 right-4 w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors shadow-lg"
            aria-label="Edit item"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Grid variant (smaller card)
  return (
    <div
      ref={cardRef}
      className="relative bg-gray-900 rounded-lg border-2 border-gray-700 p-3 cursor-pointer transition-all"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Item Image with Gradient Background */}
      <div 
        ref={imageContainerRef}
        className={`relative w-full aspect-square mb-2 overflow-hidden rounded-t bg-gradient-to-b ${rarityGradients[item.rarity]} border-b-2 border-gray-800`}
        style={{ opacity: imageLoaded ? 1 : 0.3, filter: imageLoaded ? 'brightness(1)' : 'brightness(0.5)' }}
      >
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

