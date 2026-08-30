import React, { useState } from 'react';
import { MenuItem, Category, User } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  X,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface LowStockNotificationModalProps {
  isOpen?: boolean;
  onClose: () => void;
  categories?: Category[];
  activeStaff?: User | null;
  onNavigateToInventory?: () => void;
}

export const LowStockNotificationModal: React.FC<LowStockNotificationModalProps> = ({
  isOpen = true,
  onClose,
  categories = [],
  activeStaff = null,
  onNavigateToInventory,
}) => {
  const { showAlert, showPrompt, showConfirm } = useModal();
  const [items, setItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [filterType, setFilterType] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [restockingId, setRestockingId] = useState<number | null>(null);

  const availableCategories = categories.length > 0 ? categories : AppStore.getCategories();

  // Subscribe to changes
  React.useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setItems(AppStore.getMenuItems());
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const lowStockItems = items.filter((i) => (i.quantity ?? 0) <= 5);
  const outOfStockItems = items.filter((i) => (i.quantity ?? 0) <= 0);
  const criticalLowItems = items.filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 5);

  const displayedItems = lowStockItems.filter((item) => {
    if (filterType === 'out_of_stock' && (item.quantity ?? 0) > 0) return false;
    if (filterType === 'low_stock' && ((item.quantity ?? 0) <= 0 || (item.quantity ?? 0) > 5)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const cat = availableCategories.find((c) => c.id === item.categoryId);
      const catName = cat ? cat.name.toLowerCase() : '';
      return item.name.toLowerCase().includes(q) || catName.includes(q);
    }
    return true;
  });

  const isAdmin = activeStaff?.role === 'admin';

  const handleQuickRestock = async (item: MenuItem, amount: number) => {
    if (!isAdmin) {
      showAlert({
        title: 'Admin Permission Required',
        message: 'Only administrators have authorization to restock inventory levels.',
        type: 'warning',
      });
      return;
    }

    setRestockingId(item.id);
    const updated = AppStore.quickRestockItem(item.id, amount);
    setTimeout(() => {
      setRestockingId(null);
    }, 400);

    if (updated) {
      showAlert({
        title: 'Stock Replenished',
        message: `Added +${amount} units to "${item.name}". New inventory level: ${updated.quantity} units.`,
        type: 'success',
      });
    }
  };

  const handleCustomRestock = async (item: MenuItem) => {
    if (!isAdmin) {
      showAlert({
        title: 'Admin Permission Required',
        message: 'Only administrators have authorization to restock inventory levels.',
        type: 'warning',
      });
      return;
    }

    const input = await showPrompt({
      title: `Restock ${item.name}`,
      message: `Current stock is ${item.quantity} units. Enter the quantity to add to inventory:`,
      defaultValue: '15',
      placeholder: 'e.g. 20',
      inputType: 'number',
      confirmText: 'Add Stock',
      cancelText: 'Cancel',
      validate: (val) => {
        const n = parseInt(val, 10);
        if (isNaN(n) || n <= 0) return 'Please enter a valid positive number';
        if (n > 500) return 'Maximum batch add is 500 units';
        return null;
      },
    });

    if (input) {
      const qty = parseInt(input, 10);
      handleQuickRestock(item, qty);
    }
  };

  const handleBatchRestockAll = async () => {
    if (lowStockItems.length === 0) return;

    const confirmed = await showConfirm({
      title: 'Restock All Low Items?',
      message: `This will automatically add +15 units of stock to all ${lowStockItems.length} low-stock and out-of-stock items and mark them available.`,
      type: 'warning',
      confirmText: `Add +15 to ${lowStockItems.length} Items`,
      cancelText: 'Cancel',
    });

    if (confirmed) {
      const count = AppStore.batchRestockLowStock(5, 15);
      showAlert({
        title: 'Batch Restock Complete',
        message: `Successfully added +15 units to ${count} low-stock items!`,
        type: 'success',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-stone-900 text-white px-4 py-3 sm:px-5 sm:py-3.5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs shrink-0">
              <Bell className="h-4 w-4 stroke-[2.5]" />
              {lowStockItems.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-stone-950 ring-1 ring-stone-900 border border-amber-500 animate-pulse">
                  {lowStockItems.length}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-black text-amber-400">
                Low Stock In-App Alerts
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Summary Metric Pills & Filters */}
        <div className="bg-stone-50 border-b border-stone-200 px-4 py-2 sm:px-5 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-stone-200/70 p-0.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              <span>All Alerts</span>
              <span className="ml-1 rounded-full bg-stone-100 px-1.5 py-0.2 text-[10px] font-mono">
                {lowStockItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('out_of_stock')}
              className={`rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
                filterType === 'out_of_stock'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-rose-700'
              }`}
            >
              <span>Out of Stock</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  filterType === 'out_of_stock'
                    ? 'bg-rose-800 text-white'
                    : 'bg-rose-100 text-rose-800 font-extrabold'
                }`}
              >
                {outOfStockItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('low_stock')}
              className={`rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
                filterType === 'low_stock'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-amber-800'
              }`}
            >
              <span>Low (1–5)</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                  filterType === 'low_stock'
                    ? 'bg-stone-950 text-amber-400'
                    : 'bg-amber-100 text-amber-900 font-extrabold'
                }`}
              >
                {criticalLowItems.length}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter low stock items..."
              className="w-full rounded-lg border border-stone-300 bg-white pl-7 pr-2.5 py-1 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 space-y-2">
          {displayedItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center space-y-1.5">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
              <h4 className="font-bold text-stone-800 text-xs">
                {lowStockItems.length === 0
                  ? 'All Inventory Levels are Healthy!'
                  : 'No items match your search filter'}
              </h4>
              <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                {lowStockItems.length === 0
                  ? 'All drinks, food, and menu items currently have 6 or more units in stock.'
                  : 'Try clearing the search query or changing the filter.'}
              </p>
            </div>
          ) : (
            displayedItems.map((item) => {
              const cat = categories.find((c) => c.id === item.categoryId);
              const isOut = item.quantity <= 0;
              const isLow = item.quantity > 0 && item.quantity <= 5;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl p-2.5 sm:p-3 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isOut
                      ? 'bg-rose-50/70 border-rose-200 shadow-2xs'
                      : isLow
                      ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative shrink-0">
                      <img
                        src={item.imageUrl || '/images/latte.webp'}
                        alt={item.name}
                        className={`h-10 w-10 rounded-lg object-cover border bg-stone-100 ${
                          isOut ? 'border-rose-200 grayscale opacity-75' : isLow ? 'border-amber-300' : 'border-stone-200'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/latte.webp';
                        }}
                      />
                      {isOut ? (
                        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-white shadow-xs">
                          <AlertCircle className="h-2.5 w-2.5 stroke-[3]" />
                        </span>
                      ) : isLow ? (
                        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-stone-950 border border-amber-500 shadow-xs">
                          <AlertTriangle className="h-2 w-2 stroke-[3]" />
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
                          {item.name}
                        </span>
                        <span className="rounded-md bg-stone-100 px-1.5 py-0.2 text-[9px] font-semibold text-stone-600">
                          {cat?.name || 'Item'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs font-bold text-stone-700">
                          ₱{item.price.toFixed(2)}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                            isOut
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-amber-400 text-stone-950 border border-amber-500/80 shadow-2xs'
                          }`}
                        >
                          {isOut ? (
                            <>
                              <AlertCircle className="h-2.5 w-2.5" />
                              <span>0 left • Sold Out</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-2.5 w-2.5 text-stone-950" />
                              <span>Only {item.quantity} left • Low Stock</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Restock Actions (Admin Only) */}
                  {isAdmin ? (
                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <span className="text-[10px] font-bold uppercase text-stone-400 hidden md:inline mr-1">
                        Quick Restock:
                      </span>
                      <button
                        type="button"
                        disabled={restockingId === item.id}
                        onClick={() => handleQuickRestock(item, 5)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-bold text-stone-800 hover:bg-stone-50 hover:border-amber-400 active:scale-95 transition shadow-2xs cursor-pointer"
                        title="Add 5 units"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        disabled={restockingId === item.id}
                        onClick={() => handleQuickRestock(item, 10)}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-950 hover:bg-amber-100 active:scale-95 transition shadow-2xs cursor-pointer"
                        title="Add 10 units"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        disabled={restockingId === item.id}
                        onClick={() => handleQuickRestock(item, 25)}
                        className="rounded-lg bg-stone-900 px-2.5 py-1 text-xs font-bold text-amber-400 hover:bg-stone-800 active:scale-95 transition shadow-2xs cursor-pointer"
                        title="Add 25 units"
                      >
                        +25
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCustomRestock(item)}
                        className="rounded-lg border border-dashed border-stone-300 px-2 py-1 text-xs font-bold text-stone-600 hover:bg-stone-50 hover:border-stone-400 transition cursor-pointer"
                        title="Add custom quantity"
                      >
                        Custom...
                      </button>
                    </div>
                  ) : (
                    <div className="self-end sm:self-center">
                      <span className="rounded-lg bg-stone-100 border border-stone-200 px-2 py-1 text-[10px] font-bold text-stone-500">
                        Restock restricted to Admin
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-200 bg-stone-50 px-4 py-2.5 sm:px-5 flex items-center justify-end gap-2 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onNavigateToInventory && activeStaff?.role === 'admin' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToInventory();
                }}
                className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 transition cursor-pointer"
              >
                <Package className="h-3.5 w-3.5 text-amber-600" />
                <span>Open Inventory Hub</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-200/60 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
