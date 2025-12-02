'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { CSItem, Exterior } from '@/lib/mockData';
import { formatPrice } from '@/lib/mockData';
import { formatTimeRemaining } from '@/lib/utils';

export type ItemCardAnimation = {
  cardRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLDivElement | null>;
  imageContainerRef: React.RefObject<HTMLDivElement | null>;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  imageLoaded: boolean;
  timeRemaining: string;
};

export function useItemCardAnimation(item: CSItem): ItemCardAnimation {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!item.tradableAfter) return;

    const updateCountdown = () => {
      setTimeRemaining(formatTimeRemaining(item.tradableAfter!));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [item.tradableAfter]);

  useEffect(() => {
    if (!imageLoaded || !imageContainerRef.current) return;

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
  }, [imageLoaded]);

  useEffect(() => {
    if (!item.imageUrl) {
      setImageLoaded(true);
      return;
    }

    const img = new Image();
    img.src = item.imageUrl;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(true);
  }, [item.imageUrl]);

  useEffect(() => {
    if (!cardRef.current) return;

    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 20, scale: 0.95 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
        delay: Math.random() * 0.2,
      }
    );
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

  return {
    cardRef,
    imageRef,
    imageContainerRef,
    handleMouseEnter,
    handleMouseLeave,
    imageLoaded,
    timeRemaining,
  };
}

export const exteriorDetails: Record<Exterior, { label: string; description: string }> = {
  'Factory New': {
    label: 'Factory New',
    description: 'Minimal to no wear. Almost pristine condition straight from the factory.',
  },
  'Minimal Wear': {
    label: 'Minimal Wear',
    description: 'Light wear mostly noticeable on edges. Still in excellent shape.',
  },
  'Field-Tested': {
    label: 'Field-Tested',
    description: 'Balanced wear pattern. Noticeable scratches but still solid presentation.',
  },
  'Well-Worn': {
    label: 'Well-Worn',
    description: 'Heavy surface wear with faded paint. Shows extensive use.',
  },
  'Battle-Scarred': {
    label: 'Battle-Scarred',
    description: 'Severe wear with large scratches and faded paint. A veteran of many matches.',
  },
};

export const infoPillBase =
  'px-3 py-1.5 rounded-full border border-gray-700 bg-gray-800/60 text-xs text-gray-200 flex items-center gap-2';

export function formatProfitDisplay(profit?: number, profitPercent?: number) {
  if (profit === undefined) return { label: 'Profit', value: '—', className: 'text-gray-400' };
  if (profit === 0) return { label: 'Break-even', value: '$0.00', className: 'text-gray-300' };

  const className = profit > 0 ? 'text-emerald-400' : 'text-rose-400';
  const value = `${profit > 0 ? '+' : ''}${formatPrice(profit)}`;
  const percent =
    profitPercent !== undefined ? ` (${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(1)}%)` : '';

  return { label: 'Profit', value: `${value}${percent}`, className };
}

export function resolveDisplayType(item: CSItem): string {
  const normalize = (value?: string | null) => (value ?? '').toLowerCase();
  const name = normalize(item.name);
  const weapon = normalize(item.weapon);
  const type = normalize(item.type);

  const heuristics: Array<{ match: RegExp; label: string }> = [
    { match: /gloves?/, label: 'Gloves' },
    { match: /(knife|bayonet)/, label: 'Knife' },
    { match: /(agent|commander|operator)/, label: 'Agent' },
    { match: /sticker/, label: 'Sticker' },
    { match: /patch/, label: 'Patch' },
    { match: /music kit/, label: 'Music Kit' },
    { match: /keychain/, label: 'Keychain' },
    { match: /graffiti/, label: 'Graffiti' },
    { match: /case/, label: 'Case' },
    { match: /key/, label: 'Key' },
    { match: /collectible/, label: 'Collectible' },
  ];

  for (const { match, label } of heuristics) {
    if (match.test(name) || match.test(weapon) || match.test(type)) {
      return label;
    }
  }

  if (item.type) return item.type;
  if (item.weapon) return item.weapon;
  return 'Unknown';
}

