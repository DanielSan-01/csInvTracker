'use client';

import { useState, useEffect, useMemo } from 'react';
import { CSItem, CSSticker, shouldShowFloat } from '@/lib/mockData';
import AddSkinForm from './AddSkinForm';
import type { NewSkinData } from './add-skin/types';
import { useInventory } from '@/hooks/useInventory';
import { useUser } from '@/contexts/UserContext';
import { inventoryItemsToCSItems } from '@/lib/dataConverter';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  SkinDto,
  FloatStatus /* , adminApi */,
} from '@/lib/api';
// Removed fetchSteamInventory - now handled by backend
import { formatCurrency, calculateValveTradeLockDate } from '@/lib/utils';
import Navbar from './Navbar';
import SteamLoginButton from './SteamLoginButton';
import InventoryToast from './item-grid/InventoryToast';
import DeleteConfirmationModal from './item-grid/DeleteConfirmationModal';
import InventoryLoadingOverlay from './item-grid/InventoryLoadingOverlay';
import SteamLoadingOverlay from './item-grid/SteamLoadingOverlay';
import InventoryFilterInput from './item-grid/InventoryFilterInput';
import InventoryStatsGrid from './item-grid/InventoryStatsGrid';
import InventoryGridList from './item-grid/InventoryGridList';
import InventoryDetailPanel from './item-grid/InventoryDetailPanel';
import ExpandableDashboard from './item-grid/ExpandableDashboard';
import { useToast } from './item-grid/useToast';
import AnimatedBanner from './AnimatedBanner';
import BulkPriceEditorModal from './item-grid/BulkPriceEditorModal';
import InventorySortSelector, { sortItems, type SortOption } from './item-grid/InventorySortSelector';
import MarketSelector from './item-grid/MarketSelector';

export default function ItemGrid() {
  const { user, loading: userLoading } = useUser();
  const { items: backendItems, stats, loading, refreshing, error, createItem, updateItem, deleteItem, refresh } = useInventory(user?.id);
  const items = inventoryItemsToCSItems(backendItems);
  const [sortOption, setSortOption] = useState<SortOption>('price-high-low');
  const sortedItems = useMemo(() => {
    return sortItems(items, sortOption);
  }, [items, sortOption]);
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [quickAddSkin, setQuickAddSkin] = useState<SkinDto | null>(null);
  const [editingItem, setEditingItem] = useState<CSItem | null>(null);
  const [isLoadingSteam, setIsLoadingSteam] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  // CSV import temporarily disabled; keep state commented for future use.
  // const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<CSItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [privateInventoryBanner, setPrivateInventoryBanner] = useState<string | null>(null);
  const [showBulkPriceEditor, setShowBulkPriceEditor] = useState(false);
  const [dismissedManualPricingBanner, setDismissedManualPricingBanner] = useState(false);
  const [showManualPricingBanner, setShowManualPricingBanner] = useState(false);
  const [floatStatus, setFloatStatus] = useState<FloatStatus | null>(null);
  const [pendingEditField, setPendingEditField] = useState<'price' | 'cost' | 'float' | null>(null);
  const { toast, showToast } = useToast();

  const manualPricingItems = useMemo(() => {
    return sortedItems.filter(item => {
      // Needs price if missing/zero or exceeds Steam wallet cap
      const needsPrice = !item.price || item.price === 0 || item.priceExceedsSteamLimit;
      // Needs cost if null/undefined/zero
      const needsCost = item.cost == null || item.cost === 0;
      // Needs float if it's a float-eligible item and we're still on the default sentinel value
      const needsFloat = shouldShowFloat(item.type) && Math.abs(item.float - 0.5) < 0.000001;
      return needsPrice || needsCost || needsFloat;
    });
  }, [sortedItems]);

  const hasHighValueItems = manualPricingItems.some(item => item.priceExceedsSteamLimit);
  const requiresManualPricing = manualPricingItems.length > 0;
  const manualPricingBannerMessage = useMemo(() => {
    if (!requiresManualPricing) {
      return '';
    }

    const countLabel = `Pricing estimates provided for ${manualPricingItems.length} item${manualPricingItems.length !== 1 ? 's' : ''}.`;
    return `${countLabel} Please review and correct any estimates manually.`;
  }, [requiresManualPricing, manualPricingItems.length]);

  // Auto-import Steam inventory when user first logs in and has no items
  useEffect(() => {
    // Only auto-import if:
    // 1. User is logged in
    // 2. User has no inventory items
    // 3. Not currently loading
    // 4. Not already loading Steam inventory
    // 5. User just authenticated (check URL param)
    const params = new URLSearchParams(window.location.search);
    const justAuthenticated = params.get('authenticated') === 'true';
    
    if (
      user &&
      !userLoading &&
      !loading &&
      !isLoadingSteam &&
      items.length === 0 &&
      justAuthenticated
    ) {
      // Small delay to ensure user context is fully loaded
      const timer = setTimeout(() => {
        handleLoadFromSteam();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading, loading, isLoadingSteam, items.length]);

  // No more localStorage - data comes from backend!

  // Auto-select the first item to populate detail view
  useEffect(() => {
    if (sortedItems.length === 0) {
      setSelectedItemId(null);
      return;
    }

    setSelectedItemId(prev => {
      if (prev && sortedItems.some(item => item.id === prev)) {
        return prev;
      }
      return sortedItems[0].id;
    });
  }, [sortedItems]);

  // Arrow key navigation for item grid
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys when not typing in an input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if (!selectedItemId || sortedItems.length === 0) return;

      const currentIndex = sortedItems.findIndex(item => item.id === selectedItemId);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          newIndex = (currentIndex + 1) % sortedItems.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          newIndex = currentIndex === 0 ? sortedItems.length - 1 : currentIndex - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      setSelectedItemId(sortedItems[newIndex].id);
      
      // Scroll the selected item into view
      const selectedElement = document.querySelector(`[data-item-id="${sortedItems[newIndex].id}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, sortedItems]);

  useEffect(() => {
    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let api: typeof import('@/lib/api').steamInventoryApi | null = null;

    const shouldKeepPolling = (status: FloatStatus) =>
      status.isProcessing || status.pending > 0 || !!status.waitingForRateLimit;

    const pollOnce = async (): Promise<FloatStatus | null> => {
      try {
        if (!api) {
          ({ steamInventoryApi: api } = await import('@/lib/api'));
        }
        if (!api) {
          return null;
        }

        const status = await api.getFloatStatus();
        if (!isMounted) {
          return null;
        }
        setFloatStatus(status);

        // Stop polling automatically when there is no active work
        if (!shouldKeepPolling(status) && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }

        return status;
      } catch (err) {
        if (!isMounted) {
          return null;
        }
        console.debug('[ItemGrid] Failed to fetch float status', err);
        return null;
      }
    };

    const startPolling = async () => {
      const status = await pollOnce();

      // Only start interval if there is active work (queue or rate-limit wait) based on latest status
      if (!intervalId && status && shouldKeepPolling(status)) {
        intervalId = setInterval(pollOnce, 2000);
      }
    };

    startPolling();

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    // We intentionally only run this on mount; floatStatus is read inside to decide whether to keep polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedItem = useMemo(
    () => (selectedItemId ? sortedItems.find(item => item.id === selectedItemId) ?? null : null),
    [sortedItems, selectedItemId]
  );

  const floatStatusSummary = useMemo(() => {
    if (!floatStatus) {
      return {
        active: false,
        label: '',
        queued: 0,
        imageUrl: undefined as string | undefined,
        exterior: undefined as string | undefined,
        waiting: false,
        retrySeconds: null as number | null,
        message: null as string | null,
      };
    }

    const active = floatStatus.isProcessing || floatStatus.pending > 0;
    if (!active) {
      return {
        active: false,
        label: '',
        queued: 0,
        imageUrl: undefined as string | undefined,
        exterior: undefined as string | undefined,
        waiting: false,
        retrySeconds: null as number | null,
        message: null as string | null,
      };
    }

    const currentId = floatStatus.currentInventoryItemId?.toString() ?? null;
    const currentItem = currentId ? sortedItems.find(item => item.id === currentId) : null;
    const label =
      (currentItem?.name?.trim() ?? '') ||
      (floatStatus.currentName?.trim() ?? '') ||
      floatStatus.currentAssetId ||
      'Processing item';
    const queued = Math.max(0, floatStatus.pending - (floatStatus.isProcessing ? 1 : 0));
    const waiting = !!floatStatus.waitingForRateLimit;
    const rateLimitUntilMillis = floatStatus.rateLimitUntil ? new Date(floatStatus.rateLimitUntil).getTime() : null;
    const now = Date.now();
    const retrySeconds =
      waiting && rateLimitUntilMillis
        ? Math.max(0, Math.round((rateLimitUntilMillis - now) / 1000))
        : null;
    const message = floatStatus.lastStatusMessage?.trim() || null;

    return {
      active: true,
      label,
      queued,
      imageUrl: currentItem?.imageUrl,
      exterior: currentItem?.exterior,
      waiting,
      retrySeconds,
      message,
    };
  }, [floatStatus, sortedItems]);

  // Handler for GlobalSearchBar quick-add
  const handleQuickAddSkin = (skin: SkinDto) => {
    setEditingItem(null);
    setQuickAddSkin(skin);
    setShowAddForm(true);
    // The AddSkinForm will auto-populate with this skin's data via useSkinCatalog
    // We can pass the skinId via state later if needed
  };

  const handleAddSkin = async (newSkinData: NewSkinData): Promise<boolean> => {
    if (!user) {
      showToast('Please log in with Steam first!', 'error');
      return false;
    }
    
    // Convert NewSkinData to CreateInventoryItemDto
    const validStickers = newSkinData.stickers
      ?.filter((s: CSSticker) => s.name && s.name.trim().length > 0) // Only include stickers with names
      .map((s: CSSticker) => ({
        name: s.name,
        price: s.price,
        slot: s.slot,
        imageUrl: s.imageUrl,
      })) || [];
    
    console.log('[ItemGrid] Creating item with stickers:', validStickers);
    
    // Calculate tradableAfter using Valve time (9am GMT+1 = 8am UTC)
    let tradableAfter: string | undefined;
    if (newSkinData.tradeLockDays && newSkinData.tradeLockDays > 0) {
      const date = calculateValveTradeLockDate(newSkinData.tradeLockDays);
      tradableAfter = date.toISOString();
    }
    
    const createDto: CreateInventoryItemDto = {
      userId: user.id,
      skinId: newSkinData.skinId!, // Will be provided by updated AddSkinForm
      float: newSkinData.float ?? 0.5,
      paintSeed: newSkinData.paintSeed,
      price: newSkinData.price,
      cost: newSkinData.cost,
      imageUrl: undefined, // Image URL is auto-generated
      tradeProtected: newSkinData.tradeProtected ?? false,
      tradableAfter,
      stickers: validStickers.length > 0 ? validStickers : undefined,
    };

    const newItem = await createItem(createDto);
    if (newItem) {
      console.log('[ItemGrid] Created item response:', newItem);
      console.log('[ItemGrid] Stickers in created item:', newItem.stickers);
      // Select the newly added item
      const csItem = inventoryItemsToCSItems([newItem])[0];
      console.log('[ItemGrid] Converted CSItem:', csItem);
      console.log('[ItemGrid] Stickers in CSItem:', csItem?.stickers);
      if (csItem) {
        setSelectedItemId(csItem.id);
      }
      showToast('Skin added successfully.', 'success');
      return true;
    }

    showToast('Failed to add skin. Please try again.', 'error');
    return false;
  };

  const handleUpdateSkin = async (id: string, updatedData: NewSkinData): Promise<boolean> => {
    const validStickers = updatedData.stickers
      ?.filter((s: CSSticker) => s.name && s.name.trim().length > 0) // Only include stickers with names
      .map((s: CSSticker) => ({
        name: s.name,
        price: s.price,
        slot: s.slot,
        imageUrl: s.imageUrl,
      })) || [];
    
    console.log('[ItemGrid] Updating item with stickers:', validStickers);
    
    // Calculate tradableAfter using Valve time (9am GMT+1 = 8am UTC)
    let tradableAfter: string | undefined;
    if (updatedData.tradeLockDays && updatedData.tradeLockDays > 0) {
      const date = calculateValveTradeLockDate(updatedData.tradeLockDays);
      tradableAfter = date.toISOString();
    }
    
    const updateDto: UpdateInventoryItemDto = {
      float: updatedData.float ?? 0.5,
      paintSeed: updatedData.paintSeed,
      price: updatedData.price,
      cost: updatedData.cost,
      imageUrl: undefined, // Image URL is auto-generated
      tradeProtected: updatedData.tradeProtected ?? false,
      tradableAfter,
      stickers: validStickers.length > 0 ? validStickers : undefined,
    };

    setIsUpdating(true);
    const success = await updateItem(parseInt(id), updateDto);
    setIsUpdating(false);
    
    if (success) {
      // Force a refresh to ensure we have the latest data
      await refresh();
      setSelectedItemId(id);
      showToast('Skin updated successfully.', 'success');
      return true;
    }

    showToast('Failed to update skin. Please try again.', 'error');
    return false;
  };

  // Inline update handler for double-click editing
  const handleInlineUpdate = async (field: 'price' | 'cost' | 'float', value: number | null) => {
    if (!selectedItem || !user) return;

    const updateDto: UpdateInventoryItemDto = {
      price: field === 'price' ? (value ?? 0) : (selectedItem.price ?? 0),
      cost: field === 'cost' ? (value ?? undefined) : (selectedItem.cost ?? undefined),
      float: field === 'float' ? (value ?? 0.5) : (selectedItem.float ?? 0.5),
      tradeProtected: selectedItem.tradeProtected ?? false,
    };

    setIsUpdating(true);
    try {
      const success = await updateItem(parseInt(selectedItem.id), updateDto);
      if (success) {
        await refresh();
        showToast(`${field === 'price' ? 'Price' : field === 'cost' ? 'Cost' : 'Float'} updated successfully.`, 'success');
        // Clear any auto-edit flag so the input doesn't immediately re-enter edit mode
        setPendingEditField(null);
      } else {
        showToast(`Failed to update ${field}.`, 'error');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      showToast(`Failed to update ${field}.`, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditClick = (item: CSItem) => {
    console.log('[ItemGrid] Editing item:', item.id, 'stickers:', item.stickers);
    setEditingItem(item);
  };

  const handleRequestDelete = (item: CSItem) => {
    if (!user) {
      showToast('Please log in with Steam first!', 'error');
      return;
    }
    setDeleteCandidate(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    const success = await deleteItem(Number(deleteCandidate.id));
    setIsDeleting(false);
    if (success) {
      setDeleteCandidate(null);
      setSelectedItemId(null);
      showToast('Item deleted successfully.', 'success');
    } else {
      showToast('Failed to delete item. Please try again.', 'error');
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setDeleteCandidate(null);
  };

  const handleQuickEditFromGrid = (id: string, field: 'price' | 'cost' | 'float') => {
    setSelectedItemId(id);
    setPendingEditField(field);
  };

  /*
  // CSV import temporarily disabled.
  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      return;
    }

    setIsImportingCsv(true);

    try {
      const result = await adminApi.importInventoryFromCsv(user.id, file);

      // Refresh inventory
      await refresh();

      if (result.successCount > 0) {
        showToast(
          `Imported ${result.successCount} item${result.successCount !== 1 ? 's' : ''}.${result.failedCount > 0 ? ` ${result.failedCount} failed.` : ''}`,
          result.failedCount > 0 ? 'info' : 'success'
        );
      } else {
        showToast(`Import failed: ${result.errors.join(', ')}`, 'error');
      }
    } catch (error) {
      showToast(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsImportingCsv(false);
      // Reset file input
      event.target.value = '';
    }
  };
  */

  const handleLoadFromSteam = async () => {
    if (!user) {
      showToast('Please log in with Steam first!', 'error');
      return;
    }

    if (!user.steamId) {
      showToast('Steam ID not found. Please log in again.', 'error');
      return;
    }

    // Clear any existing private inventory banner
    setPrivateInventoryBanner(null);

    setIsLoadingSteam(true);
    try {
      console.log('Refreshing Steam inventory for user:', user.id);
      
      // Use the new refreshFromSteam endpoint which handles everything on the backend
      const { steamInventoryApi } = await import('@/lib/api');
      const result = await steamInventoryApi.refreshFromSteam(user.id);

      // Refresh inventory display
      await refresh();

      // Show results
      if (result.imported > 0) {
        showToast(
          `Successfully imported ${result.imported} item${result.imported !== 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`,
          'success'
        );
      } else if (result.skipped > 0) {
        showToast(
          `All ${result.skipped} item${result.skipped !== 1 ? 's' : ''} were skipped (already imported or not in catalog)`,
          'info'
        );
      } else {
        showToast('No items found in your Steam inventory.', 'info');
      }

      if (result.errors > 0 && result.errorMessages.length > 0) {
        console.error('Import errors:', result.errorMessages);
        showToast(`${result.errors} error${result.errors !== 1 ? 's' : ''} occurred during import. Check console for details.`, 'error');
      }

      // After a Steam refresh, surface the manual pricing banner if any items need it.
      if (requiresManualPricing) {
        setShowManualPricingBanner(true);
      }
    } catch (error) {
      console.error('Error refreshing from Steam:', error);
      
      // Try to parse error response to detect private inventory
      let errorMessage = 'Unknown error';
      let isPrivateInventory = false;
      let bannerMessage = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Try to parse JSON error if available (backend returns JSON error objects)
        try {
          // Error message might be a JSON string
          let parsed: unknown = null;

          try {
            parsed = JSON.parse(errorMessage);
          } catch {
            // If that fails, try to extract JSON from the message
            const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                parsed = JSON.parse(jsonMatch[0]);
              } catch {
                parsed = null;
              }
            }
          }

          if (parsed && typeof parsed === 'object') {
            const parsedRecord = parsed as Record<string, unknown>;
            const details = typeof parsedRecord.details === 'string' ? parsedRecord.details : undefined;
            const suggestion = typeof parsedRecord.suggestion === 'string' ? parsedRecord.suggestion : undefined;
            const errorField = typeof parsedRecord.error === 'string' ? parsedRecord.error : undefined;

            // Check if this is a private inventory error
            const detailsLower = (details ?? '').toLowerCase();
            const errorLower = (errorField ?? '').toLowerCase();

            if (
              detailsLower.includes('private') ||
              detailsLower.includes('inventory privacy') ||
              detailsLower.includes('not accessible') ||
              detailsLower.includes('success=0') ||
              errorLower.includes('private') ||
              errorLower.includes('inventory privacy') ||
              errorLower.includes('inventory is not accessible')
            ) {
              isPrivateInventory = true;
              bannerMessage = details ?? errorField ?? 'Your Steam inventory privacy is set to private.';
              if (suggestion) {
                bannerMessage += ` ${suggestion}`;
              } else {
                bannerMessage += ' Please make your inventory public in Steam settings: Steam > Settings > Privacy > Inventory Privacy > Public';
              }
            } else {
              errorMessage = details ?? errorField ?? errorMessage;
            }
          } else {
            // Check if error message indicates private inventory
            const errorLower = errorMessage.toLowerCase();
            if (
              errorLower.includes('private') ||
              errorLower.includes('inventory privacy') ||
              errorLower.includes('not accessible') ||
              errorLower.includes('success=0')
            ) {
              isPrivateInventory = true;
              bannerMessage = 'Your Steam inventory privacy is set to private. Please make your inventory public in Steam settings: Steam > Settings > Privacy > Inventory Privacy > Public';
            }
          }
        } catch (parseError) {
          // If parsing fails, check if error message indicates private inventory
          const errorLower = errorMessage.toLowerCase();
          if (
            errorLower.includes('private') ||
            errorLower.includes('inventory privacy') ||
            errorLower.includes('not accessible')
          ) {
            isPrivateInventory = true;
            bannerMessage = 'Your Steam inventory privacy is set to private. Please make your inventory public in Steam settings: Steam > Settings > Privacy > Inventory Privacy > Public';
          }
        }
      }
      
      if (isPrivateInventory) {
        // Show banner for private inventory
        setPrivateInventoryBanner(bannerMessage || 'Your Steam inventory privacy is set to private. Please make your inventory public in Steam settings: Steam > Settings > Privacy > Inventory Privacy > Public');
      } else {
      showToast(`Failed to refresh inventory from Steam: ${errorMessage}`, 'error');
      }
    } finally {
      setIsLoadingSteam(false);
    }
  };

  const handleRefreshPrices = async () => {
    if (!user) {
      showToast('Please log in first!', 'error');
      return;
    }

    setIsRefreshingPrices(true);
    try {
      console.log('Refreshing prices for user:', user.id);
      
      const { steamInventoryApi } = await import('@/lib/api');
      const result = await steamInventoryApi.refreshPrices(
        user.id,
        selectedMarkets.length > 0 ? selectedMarkets : undefined
      );

      // Refresh inventory display
      await refresh();

      // Show results
      if (result.updated > 0) {
        const marketSuffix =
          selectedMarkets.length > 0 ? ` (markets: ${selectedMarkets.join(', ')})` : '';
        showToast(
          `Successfully updated prices for ${result.updated} item${result.updated !== 1 ? 's' : ''}${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}${marketSuffix}`,
          'success'
        );
      } else if (result.skipped > 0) {
        const marketSuffix =
          selectedMarkets.length > 0 ? ` with markets ${selectedMarkets.join(', ')}` : '';
        showToast(
          `No prices updated. ${result.skipped} item${result.skipped !== 1 ? 's' : ''} skipped (no market data available${marketSuffix ? ` for ${marketSuffix}` : ''})`,
          'info'
        );
      } else {
        showToast('No items found to refresh prices for.', 'info');
      }

      if (result.rateLimited) {
        const warningMessage =
          result.infoMessages && result.infoMessages.length > 0
            ? result.infoMessages[0]
            : 'CSMarket rate limit reached. Some items may not have updated yet. Please try again shortly.';
        console.warn('CSMarket rate limit details:', result.infoMessages ?? [warningMessage]);
        showToast(warningMessage, 'info');
      } else if (result.infoMessages && result.infoMessages.length > 0) {
        console.info('CSMarket info:', result.infoMessages);
        showToast(result.infoMessages[0], 'info');
      }

      if (result.errors > 0 && result.errorMessages.length > 0) {
        console.error('Price refresh errors:', result.errorMessages);
        showToast(`${result.errors} error${result.errors !== 1 ? 's' : ''} occurred. Check console for details.`, 'error');
      }
    } catch (error) {
      console.error('Error refreshing prices:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to refresh prices: ${errorMessage}`, 'error');
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  // Float refresh is now driven by backend imports / inspect jobs only.

  const filteredItems = sortedItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter items that need pricing - simple check: price is 0 or cost is missing/0
  const itemsNeedingPricing = useMemo(() => {
    return sortedItems.filter(item => {
      // Simple check: price is 0 or missing
      const needsPrice = !item.price || item.price === 0;
      
      // Simple check: cost is null, undefined, or 0
      const needsCost = item.cost == null || item.cost === 0;
      
      // Item needs pricing if either price or cost is missing
      return needsPrice || needsCost;
    });
  }, [sortedItems]);

  const handleBulkPriceSave = async (updates: Array<{ id: number; data: UpdateInventoryItemDto }>) => {
    try {
      setIsUpdating(true);
      let successCount = 0;
      let errorCount = 0;

      // Update each item
      for (const { id, data } of updates) {
        try {
          await updateItem(id, data);
          successCount++;
        } catch (err) {
          console.error(`Error updating item ${id}:`, err);
          errorCount++;
        }
      }

      // Refresh inventory to show updated stats
      await refresh();

      if (successCount > 0) {
        showToast(
          `Successfully updated ${successCount} item${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
          errorCount > 0 ? 'info' : 'success'
        );
      } else {
        showToast('Failed to update items', 'error');
      }
    } catch (err) {
      console.error('Error in bulk price save:', err);
      showToast('An error occurred while saving updates', 'error');
    } finally {
      setIsUpdating(false);
    }
  };


  const statsSummary = useMemo(() => {
    if (!stats) {
      return {
        totalItems: '–',
        marketValue: '–',
        acquisitionCost: '–',
        netProfit: '–',
        netProfitPositive: null as boolean | null,
        avgProfitPercent: '–',
      };
    }

    const avg =
      stats.averageProfitPercent !== undefined && stats.averageProfitPercent !== null
        ? `${stats.averageProfitPercent >= 0 ? '+' : ''}${stats.averageProfitPercent.toFixed(2)}%`
        : '–';

    return {
      totalItems: stats.totalItems.toLocaleString(),
      marketValue: formatCurrency(stats.marketValue),
      acquisitionCost: formatCurrency(stats.acquisitionCost),
      netProfit: formatCurrency(stats.netProfit),
      netProfitPositive: stats.netProfit >= 0,
      avgProfitPercent: avg,
    };
  }, [stats]);

  return (
    <div className="relative min-h-screen bg-gray-950 pb-16">
      <Navbar
        isAuthenticated={!!user}
        authControl={<SteamLoginButton />}
        userInventory={sortedItems}
        onQuickAddSkin={handleQuickAddSkin}
        canAdd={!!user}
      />

      <InventoryToast toast={toast} />

      {floatStatusSummary.active && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 max-w-xs rounded-2xl border border-sky-400/20 bg-gray-950/95 px-4 py-3 shadow-xl shadow-black/60 backdrop-blur">
          <div className="flex items-center gap-3">
            {floatStatusSummary.imageUrl ? (
              <img
                src={floatStatusSummary.imageUrl}
                alt={floatStatusSummary.label}
                className="h-14 w-14 flex-none rounded-xl border border-white/10 object-cover shadow-inner shadow-black/40"
              />
            ) : (
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-[0.65rem] font-semibold uppercase tracking-wide text-sky-200">
                Float
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-wide text-sky-300/80">
                <span className="inline-flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${floatStatusSummary.waiting ? 'bg-amber-400 animate-pulse' : 'bg-sky-400 animate-pulse'}`} />
                  {floatStatusSummary.waiting ? 'Waiting on rate limit' : 'Fetching floats'}
                </span>
                {floatStatusSummary.queued > 0 && (
                  <span className="text-gray-400">{floatStatusSummary.queued} queued</span>
                )}
                {floatStatusSummary.waiting && floatStatusSummary.retrySeconds !== null && (
                  <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[0.65rem] text-sky-200">
                    {floatStatusSummary.retrySeconds}s
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold leading-snug text-white">
                {floatStatusSummary.label}
              </p>
              {floatStatusSummary.exterior && (
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {floatStatusSummary.exterior}
                </p>
              )}
              {floatStatusSummary.message && (
                <p className="mt-1 text-xs text-gray-400">
                  {floatStatusSummary.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Private Inventory Banner - Show prominently at top */}
      {privateInventoryBanner && (
        <div className="mx-auto mt-6 w-full max-w-7xl px-4 md:px-6">
          <AnimatedBanner
            message={privateInventoryBanner}
            intent="error"
            autoClose={false}
            onDismiss={() => setPrivateInventoryBanner(null)}
          />
        </div>
      )}

      {user && showManualPricingBanner && requiresManualPricing && !dismissedManualPricingBanner && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-4 md:px-6">
          <AnimatedBanner
            message={manualPricingBannerMessage}
            intent="warning"
            autoClose={false}
            onDismiss={() => setDismissedManualPricingBanner(true)}
          />
        </div>
      )}

      {deleteCandidate && (
        <DeleteConfirmationModal
          item={deleteCandidate}
          onCancel={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* Bulk Price Editor Modal */}
      <BulkPriceEditorModal
        items={manualPricingItems}
        isOpen={showBulkPriceEditor}
        onClose={() => setShowBulkPriceEditor(false)}
        onSave={handleBulkPriceSave}
      />

      {/* Loading overlays */}
      {isLoadingSteam && <SteamLoadingOverlay />}
      {!isLoadingSteam && (userLoading || loading) && (
        <InventoryLoadingOverlay
          username={user?.username}
          displayName={user?.displayName}
        />
      )}

      {/* Backend Error State */}
      {error && !loading && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200">
          <p className="font-semibold">Error loading inventory:</p>
          <p className="text-sm">{error}</p>
          <button onClick={() => refresh()} className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm">
            Retry
          </button>
        </div>
      )}

      <div className="mx-auto mt-8 w-full max-w-7xl px-4 md:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <InventoryFilterInput value={searchTerm} onChange={setSearchTerm} />
          </div>
          <div className="flex items-center gap-2">
          {user && (
              <>
              <MarketSelector
                value={selectedMarkets}
                onChange={setSelectedMarkets}
              />
              <button
                onClick={handleLoadFromSteam}
                disabled={isLoadingSteam}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh your inventory from Steam"
              >
                {isLoadingSteam ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh from Steam
                  </>
                )}
              </button>
              <button
                onClick={() => setShowBulkPriceEditor(true)}
                disabled={isUpdating || manualPricingItems.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Manually add or correct cost and float values (and prices where needed)"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Add Float & Cost{manualPricingItems.length > 0 ? ` (${manualPricingItems.length})` : ''}
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400 flex-shrink-0"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Skin
              </button>
              </>
            )}
          </div>
        </div>

        <InventoryStatsGrid
          totalItems={statsSummary.totalItems}
          marketValue={statsSummary.marketValue}
          acquisitionCost={statsSummary.acquisitionCost}
          netProfit={statsSummary.netProfit}
          netProfitPositive={statsSummary.netProfitPositive}
          avgProfitPercent={statsSummary.avgProfitPercent}
          isLoading={refreshing}
        />

        <ExpandableDashboard items={sortedItems} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Inventory</h2>
              <InventorySortSelector 
                currentSort={sortOption} 
                onSortChange={setSortOption} 
              />
            </div>
            <InventoryGridList
              items={filteredItems}
              selectedId={selectedItemId}
              onSelect={(id) => {
                setSelectedItemId(id);
                setPendingEditField(null);
              }}
              onQuickEdit={handleQuickEditFromGrid}
            />
          </div>
          <InventoryDetailPanel
            item={selectedItem}
            autoEditField={pendingEditField}
            onEdit={
              selectedItem && user ? () => handleEditClick(selectedItem) : undefined
            }
            onDelete={
              selectedItem && user ? () => handleRequestDelete(selectedItem) : undefined
            }
            onUpdate={selectedItem && user ? handleInlineUpdate : undefined}
          />
        </div>
      </div>

      {/* Add Skin Form Modal */}
      {showAddForm && (
        <AddSkinForm
          onAdd={handleAddSkin}
          onClose={() => {
            setShowAddForm(false);
            setQuickAddSkin(null);
          }}
          initialSkin={quickAddSkin ?? undefined}
        />
      )}

      {/* Edit Skin Form Modal */}
      {editingItem && (
        <AddSkinForm
          item={editingItem}
          onAdd={handleAddSkin}
          onUpdate={handleUpdateSkin}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

