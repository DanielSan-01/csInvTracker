'use client';

import { useMemo } from 'react';
import { CSItem, shouldShowFloat } from '@/lib/mockData';

type ManualPricingStatus = {
  manualPricingItems: CSItem[];
  requiresManualPricing: boolean;
  manualPricingBannerMessage: string;
};

export function useManualPricingStatus(sortedItems: CSItem[]): ManualPricingStatus {
  const manualPricingItems = useMemo(() => {
    return sortedItems.filter((item) => {
      // Needs price if missing/zero or exceeds Steam wallet cap.
      const needsPrice = !item.price || item.price === 0 || item.priceExceedsSteamLimit;
      // Needs cost if null/undefined/zero.
      const needsCost = item.cost == null || item.cost === 0;
      // Needs float if it's a float-eligible item and still on sentinel default.
      const needsFloat = shouldShowFloat(item.type) && Math.abs(item.float - 0.5) < 0.000001;
      return needsPrice || needsCost || needsFloat;
    });
  }, [sortedItems]);

  const requiresManualPricing = manualPricingItems.length > 0;
  const manualPricingBannerMessage = useMemo(() => {
    if (!requiresManualPricing) {
      return '';
    }

    const countLabel = `Pricing estimates provided for ${manualPricingItems.length} item${manualPricingItems.length !== 1 ? 's' : ''}.`;
    return `${countLabel} Please review and correct any estimates manually.`;
  }, [requiresManualPricing, manualPricingItems.length]);

  return {
    manualPricingItems,
    requiresManualPricing,
    manualPricingBannerMessage,
  };
}
