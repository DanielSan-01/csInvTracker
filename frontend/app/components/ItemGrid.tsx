'use client';

import { useState, useEffect, useMemo } from 'react';
import { CSItem } from '@/lib/mockData';
import AddSkinForm from './AddSkinForm';
import type { NewSkinData } from './add-skin/types';
import { useInventory } from '@/hooks/useInventory';
import { useFloatStatusPolling } from '@/hooks/useFloatStatusPolling';
import { useManualPricingStatus } from '@/hooks/useManualPricingStatus';
import { useUser } from '@/contexts/UserContext';
import { inventoryItemsToCSItems } from '@/lib/dataConverter';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  SkinDto,
} from '@/lib/api';
// Removed fetchSteamInventory - now handled by backend
import { formatCurrency, calculateValveTradeLockDate } from '@/lib/utils';
import { mapStickersForDto } from '@/lib/mapStickersForDto';
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
import FloatStatusToast from './item-grid/FloatStatusToast';
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
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [quickAddSkin, setQuickAddSkin] = useState<SkinDto | null>(null);
  const [editingItem, setEditingItem] = useState<CSItem | null>(null);
  const [isLoadingSteam, setIsLoadingSteam] = useState(false);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);
  const [steamId, setSteamId] = useState<string | null>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [deleteCandidate, setDeleteCandidate] = useState<CSItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [privateInventoryBanner, setPrivateInventoryBanner] = useState<string | null>(null);
  const [showBulkPriceEditor, setShowBulkPriceEditor] = useState(false);
  const [dismissedManualPricingBanner, setDismissedManualPricingBanner] = useState(false);
  const [showManualPricingBanner, setShowManualPricingBanner] = useState(false);
  const [pendingEditField, setPendingEditField] = useState<'price' | 'cost' | 'float' | null>(null);
  const { toast, showToast } = useToast();
  const { floatStatus } = useFloatStatusPolling();

  const {
    manualPricingItems,
    requiresManualPricing,
    manualPricingBannerMessage,
  } = useManualPricingStatus(sortedItems);

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
    
    const mappedStickers = mapStickersForDto(newSkinData.stickers);
    
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
      stickers: mappedStickers,
    };

    const quantity =
      newSkinData.type === 'Case' || newSkinData.type === 'Sticker'
        ? Math.min(1000, Math.max(1, Math.floor(newSkinData.quantity ?? 1)))
        : 1;

    let createdCount = 0;
    let lastCreated: ReturnType<typeof inventoryItemsToCSItems>[0] | null = null;

    for (let i = 0; i < quantity; i += 1) {
      const newItem = await createItem(createDto);
      if (newItem) {
        createdCount += 1;
        const csItem = inventoryItemsToCSItems([newItem])[0];
        if (csItem) {
          lastCreated = csItem;
        }
      }
    }

    if (createdCount > 0) {
      if (lastCreated) {
        setSelectedItemId(lastCreated.id);
      }
      showToast(
        `Added ${createdCount} ${createdCount === 1 ? 'item' : 'items'}${quantity > 1 ? ' (one per case/sticker)' : ''}.`,
        'success'
      );
      return true;
    }

    showToast('Failed to add skin. Please try again.', 'error');
    return false;
  };

  const handleUpdateSkin = async (id: string, updatedData: NewSkinData): Promise<boolean> => {
    const mappedStickers = mapStickersForDto(updatedData.stickers);
    
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
      stickers: mappedStickers,
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
    setEditingItem(item);
  };

  const handleRequestDelete = (item: CSItem) => {
    if (!user) {
      showToast('Please log in with Steam first!', 'error');
      return;
    }
    setDeleteCandidate(item);
  };

  const handleDeleteFromBulkEditor = (item: CSItem) => {
    setShowBulkPriceEditor(false);
    handleRequestDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    const success = await deleteItem(Number(deleteCandidate.id));
    setIsDeleting(false);
    if (success) {
      setDeleteCandidate(null);
      setSelectedItemId(null);
      showToast('Item deleted from inventory (server).', 'success');
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

  const refreshWithTimeout = async (timeoutMs = 15000) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      await Promise.race([
        refresh(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('inventory refresh timed out')), timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

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
    let progressPollInterval: ReturnType<typeof setInterval> | null = null;
    let releasedLoaderFromProgress = false;

    try {
      // Use the new refreshFromSteam endpoint which handles everything on the backend
      const { steamInventoryApi } = await import('@/lib/api');

      const pollSteamProgress = async () => {
        try {
          const status = await steamInventoryApi.getRefreshFromSteamStatus(user.id);
          if (!status) {
            if (progressPollInterval) {
              clearInterval(progressPollInterval);
              progressPollInterval = null;
            }
            return;
          }
          const pendingItems = Math.max(0, status.totalItems - status.imported - status.skipped - status.errors);
          if (status.imported > 0 && status.totalItems > 0 && !releasedLoaderFromProgress) {
            releasedLoaderFromProgress = true;
            setIsLoadingSteam(false);
            const progressParts: string[] = [];
            if (pendingItems > 0) {
              progressParts.push(`${pendingItems} on the way`);
            }
            if (status.skipped > 0) {
              progressParts.push(`${status.skipped} skipped`);
            }
            if (status.errors > 0) {
              progressParts.push(`${status.errors} error${status.errors !== 1 ? 's' : ''}`);
            }
            const progressSuffix = progressParts.length > 0 ? ` (${progressParts.join(', ')})` : '';
            showToast(
              `Imported ${status.imported} of ${status.totalItems} item${status.totalItems !== 1 ? 's' : ''}${progressSuffix}.`,
              'info'
            );
          }
        } catch {
          // Progress polling is best-effort and should not interrupt refresh flow.
        }
      };

      progressPollInterval = setInterval(() => {
        void pollSteamProgress();
      }, 1200);
      void pollSteamProgress();

      const result = await steamInventoryApi.refreshFromSteam(user.id);

      if (progressPollInterval) {
        clearInterval(progressPollInterval);
        progressPollInterval = null;
      }

      const totalItems = result.totalItems > 0
        ? result.totalItems
        : result.imported + result.skipped + result.errors;
      const pendingItems = Math.max(0, totalItems - result.imported - result.skipped - result.errors);

      if (totalItems > 0) {
        const progressParts: string[] = [];
        if (pendingItems > 0) {
          progressParts.push(`${pendingItems} on the way`);
        }
        if (result.skipped > 0) {
          progressParts.push(`${result.skipped} skipped`);
        }
        if (result.errors > 0) {
          progressParts.push(`${result.errors} error${result.errors !== 1 ? 's' : ''}`);
        }
        const progressSuffix = progressParts.length > 0 ? ` (${progressParts.join(', ')})` : '';
        showToast(
          `Imported ${result.imported} of ${totalItems} item${totalItems !== 1 ? 's' : ''}${progressSuffix}.`,
          result.imported > 0 ? 'success' : 'info'
        );
      } else {
        showToast('No items found in your Steam inventory.', 'info');
      }

      // Hide the Steam-specific loader as soon as we have import progress.
      setIsLoadingSteam(false);

      // Refresh inventory display in the background, but don't let a slow follow-up request block the UI.
      let inventoryRefreshTimedOut = false;
      try {
        await refreshWithTimeout();
      } catch (refreshError) {
        if (refreshError instanceof Error && refreshError.message === 'inventory refresh timed out') {
          inventoryRefreshTimedOut = true;
        } else {
          throw refreshError;
        }
      }

      if (result.errors > 0 && result.errorMessages.length > 0) {
        console.error('Import errors:', result.errorMessages);
        showToast(`${result.errors} error${result.errors !== 1 ? 's' : ''} occurred during import. Check console for details.`, 'error');
      }

      const skippedForCatalogMatch = result.errorMessages.filter((message) =>
        message.startsWith('No catalog match:')
      ).length;
      if (skippedForCatalogMatch > 0) {
        showToast(
          `${skippedForCatalogMatch} Steam item${skippedForCatalogMatch !== 1 ? 's were' : ' was'} skipped due to missing catalog match. Run "Import Complete Catalog (ByMykel)" in Admin.`,
          'info'
        );
      }

      if (inventoryRefreshTimedOut) {
        showToast('Steam refresh finished, but inventory update is taking longer than expected. Please refresh again.', 'info');
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
      if (progressPollInterval) {
        clearInterval(progressPollInterval);
      }
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

  const handleBulkDeleteFromEditor = async (itemsToDelete: CSItem[]): Promise<boolean> => {
    if (!user) {
      showToast('Please log in with Steam first!', 'error');
      return false;
    }

    if (itemsToDelete.length === 0) {
      showToast('No items selected to delete.', 'error');
      return false;
    }

    const confirmed = window.confirm(
      `Delete ${itemsToDelete.length} selected item${itemsToDelete.length !== 1 ? 's' : ''} from inventory? This cannot be undone.`
    );
    if (!confirmed) {
      return false;
    }

    try {
      setIsUpdating(true);
      let successCount = 0;
      let errorCount = 0;

      for (const item of itemsToDelete) {
        const success = await deleteItem(Number(item.id));
        if (success) {
          successCount += 1;
          if (selectedItemId === item.id) {
            setSelectedItemId(null);
          }
        } else {
          errorCount += 1;
        }
      }

      await refresh();

      if (successCount > 0) {
        showToast(
          `Deleted ${successCount} item${successCount !== 1 ? 's' : ''} from inventory (server)${errorCount > 0 ? ` (${errorCount} failed)` : ''}.`,
          errorCount > 0 ? 'info' : 'success'
        );
        return true;
      } else {
        showToast('Failed to delete selected items.', 'error');
        return false;
      }
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

      <FloatStatusToast summary={floatStatusSummary} />

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
        onDeleteItem={handleDeleteFromBulkEditor}
        onDeleteSelected={handleBulkDeleteFromEditor}
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
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-900/30 p-4 text-red-200" role="alert">
          <p className="font-semibold">Error loading inventory:</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => refresh()}
            className="mt-2 rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700"
          >
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
                title="Edit or delete skins that still need manual values"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Edit Skins{manualPricingItems.length > 0 ? ` (${manualPricingItems.length})` : ''}
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
                // Show modal on mobile when user explicitly taps an item
                if (window.innerWidth < 1024) {
                  setShowMobileModal(true);
                }
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
            showMobileModal={showMobileModal}
            onClose={() => {
              setShowMobileModal(false);
              // On mobile, just close the modal but keep item selected
              // On desktop, clearing selectedItemId is handled elsewhere if needed
            }}
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

