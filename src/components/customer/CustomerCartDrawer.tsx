import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CartItem, CustomerAccount, MenuItem, StoreSettings, TableBinding, Category } from '../../types';
import { AppStore } from '../../services/store';
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Coffee,
  Check,
  Flame,
  Snowflake,
  Sun,
  Sparkles,
  Utensils,
  Globe,
  Lock,
  Search,
  CupSoda,
  Egg,
  SlidersHorizontal,
} from 'lucide-react';

interface CustomerCartDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (itemId: number, delta: number) => void;
  onRemoveItem: (itemId: number) => void;
  onClearCart: () => void;
  onUpdateItemInstructions?: (itemId: number, text: string) => void;
  onAddToCart?: (item: MenuItem) => void;
  settings: StoreSettings;
  activeTableBinding?: TableBinding | null;
  activeCustomer?: CustomerAccount | null;
  onProceedToCheckout: () => void;
  onRequireLogin?: () => void;
}

export const CustomerCartDrawer: React.FC<CustomerCartDrawerProps> = ({
  isOpen,
  onToggle,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onUpdateItemInstructions,
  onAddToCart,
  settings,
  activeTableBinding,
  activeCustomer,
  onProceedToCheckout,
  onRequireLogin,
}) => {
  const drawerRef = useRef<HTMLElement>(null);
  const [editingInstructionsId, setEditingInstructionsId] = useState<number | null>(null);
  const [instructionText, setInstructionText] = useState('');
  
  // Add-ons modal & filtering state
  const [isAddonsModalOpen, setIsAddonsModalOpen] = useState(false);
  const [isAddonFilterModalOpen, setIsAddonFilterModalOpen] = useState(false);
  const [addonsCategoryFilter, setAddonsCategoryFilter] = useState<'all' | 'drinks' | 'food'>('all');
  const [addonsSearchQuery, setAddonsSearchQuery] = useState('');
  const [recentlyAddedAddonId, setRecentlyAddedAddonId] = useState<number | null>(null);

  // Live store menu items & categories for dynamic add-on inventory
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [categories, setCategories] = useState<Category[]>(() => AppStore.getCategories());

  useEffect(() => {
    const unsubscribe = AppStore.subscribe(() => {
      setMenuItems(AppStore.getMenuItems());
      setCategories(AppStore.getCategories());
    });
    return unsubscribe;
  }, []);

  // Filter all add-on menu items (Category 8 Food Add-ons, Category 17 Drink Add-ons, or categories with "add-on")
  const allAddonItems = useMemo(() => {
    const addOnCategoryIds = new Set(
      categories
        .filter((c) => {
          const name = c.name.toLowerCase();
          return (
            name.includes('add-on') ||
            name.includes('addon') ||
            name.includes('extra') ||
            c.id === 8 ||
            c.id === 17
          );
        })
        .map((c) => c.id)
    );

    return menuItems.filter(
      (item) =>
        item.isAvailable &&
        (addOnCategoryIds.has(item.categoryId) || item.categoryId === 8 || item.categoryId === 17)
    );
  }, [menuItems, categories]);

  // Drink add-ons vs Food add-ons
  const drinkAddonItems = useMemo(
    () => allAddonItems.filter((i) => i.categoryId === 17 || i.name.toLowerCase().includes('milk') || i.name.toLowerCase().includes('jelly') || i.name.toLowerCase().includes('syrup') || i.name.toLowerCase().includes('water')),
    [allAddonItems]
  );

  const foodAddonItems = useMemo(
    () => allAddonItems.filter((i) => i.categoryId === 8 || i.name.toLowerCase().includes('rice') || i.name.toLowerCase().includes('egg') || i.name.toLowerCase().includes('chips') || i.name.toLowerCase().includes('cheese') || i.name.toLowerCase().includes('bits')),
    [allAddonItems]
  );

  // Filtered add-ons for the selector sheet
  const displayAddonItems = useMemo(() => {
    let list = allAddonItems;
    if (addonsCategoryFilter === 'drinks') {
      list = drinkAddonItems;
    } else if (addonsCategoryFilter === 'food') {
      list = foodAddonItems;
    }

    if (addonsSearchQuery.trim()) {
      const q = addonsSearchQuery.toLowerCase().trim();
      list = list.filter(
        (item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allAddonItems, drinkAddonItems, foodAddonItems, addonsCategoryFilter, addonsSearchQuery]);

  // Quick popular add-ons recommendation list
  const popularAddons = useMemo(() => {
    return allAddonItems.slice(0, 6);
  }, [allAddonItems]);

  const handleAddAddonItem = (item: MenuItem) => {
    setRecentlyAddedAddonId(item.id);
    setTimeout(() => setRecentlyAddedAddonId(null), 1200);

    if (onAddToCart) {
      onAddToCart(item);
    } else {
      const existing = cart.find((ci) => ci.item.id === item.id);
      if (existing) {
        onUpdateQuantity(item.id, 1);
      }
    }
  };

  const getAddonCartQuantity = (itemId: number) => {
    const found = cart.find((ci) => ci.item.id === itemId);
    return found ? found.quantity : 0;
  };

  // Handle pressing outside the cart drawer or pressing Escape to auto-collapse
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // If clicked inside the drawer, do nothing
      if (drawerRef.current && drawerRef.current.contains(target)) {
        return;
      }

      // If clicked on any cart trigger button or similar trigger, ignore to avoid conflict
      if (
        target.closest('#header-bag-btn') ||
        target.closest('#toggle-bag-btn') ||
        target.closest('#header-cart-btn') ||
        target.closest('#toggle-cart-btn') ||
        target.closest('#mobile-nav-cart') ||
        target.closest('#mobile-nav-bag')
      ) {
        return;
      }

      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isAddonsModalOpen) {
          setIsAddonsModalOpen(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isAddonsModalOpen, onClose]);

  const totalItemCount = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0),
    [cart]
  );

  const taxRate = settings.tax_rate || 12;
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleStartEditInstructions = (item: CartItem) => {
    setEditingInstructionsId(item.item.id);
    setInstructionText(item.specialInstructions || '');
  };

  const handleSaveInstructions = (itemId: number) => {
    if (onUpdateItemInstructions) {
      onUpdateItemInstructions(itemId, instructionText.trim());
    }
    setEditingInstructionsId(null);
    setInstructionText('');
  };

  const getTemperatureBadge = (temp?: string) => {
    if (!temp) return null;
    const t = temp.toLowerCase();
    if (t.includes('hot')) {
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[9px] font-bold">
          <Flame className="h-2.5 w-2.5" /> Hot
        </span>
      );
    }
    if (t.includes('ice') || t.includes('cold') || t.includes('blend')) {
      return (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 text-sky-800 px-1.5 py-0.5 text-[9px] font-bold">
          <Snowflake className="h-2.5 w-2.5" /> Cold
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-stone-100 text-stone-700 px-1.5 py-0.5 text-[9px] font-bold">
        <Sun className="h-2.5 w-2.5" /> {temp}
      </span>
    );
  };

  return (
    <>
      {/* Floating Collapsible Trigger Tab on Right Edge (Visible on desktop when collapsed, hidden in mobile view) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          title="Open Order Cart"
          className="hidden sm:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 items-center gap-2 rounded-l-2xl bg-amber-500 hover:bg-amber-400 py-3.5 pl-3 pr-2.5 text-stone-950 font-extrabold shadow-[-4px_4px_16px_rgba(0,0,0,0.18)] transition transform hover:-translate-x-1 active:scale-95 cursor-pointer border-y border-l border-amber-600/30 group"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5 stroke-[2.3] transition group-hover:scale-110" />
            {totalItemCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-stone-950 px-1 text-[9px] font-black text-amber-400">
                {totalItemCount}
              </span>
            )}
          </div>
          <div className="flex flex-col items-start text-left leading-tight pr-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-800">
              Your Cart
            </span>
            <span className="font-mono text-xs font-black">
              ₱{totalAmount.toFixed(2)}
            </span>
          </div>
          <ChevronLeft className="h-4 w-4 text-stone-900 transition group-hover:-translate-x-0.5" />
        </button>
      )}

      {/* Backdrop overlay for automatic collapse on outside click */}
      {isOpen && (
        <div
          id="cart-drawer-backdrop"
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 z-40 bg-stone-950/30 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
        />
      )}

      {/* Collapsible Right-Side Cart Panel */}
      <aside
        ref={drawerRef}
        aria-label="Customer Order Cart"
        className={`fixed top-0 right-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-0 z-40 sm:z-50 w-full sm:w-[390px] md:w-[420px] bg-white border-l border-stone-200/90 shadow-[-12px_0_30px_rgba(0,0,0,0.18)] flex flex-col transition-transform duration-300 ease-in-out font-sans ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Pull-tab on Left Edge of open drawer to quickly collapse (Desktop only) */}
        <button
          onClick={onClose}
          title="Collapse Cart"
          className="hidden sm:flex absolute -left-9 top-1/2 -translate-y-1/2 items-center justify-center h-20 w-9 rounded-l-xl bg-white border-y border-l border-stone-200 text-stone-600 hover:text-stone-950 hover:bg-stone-50 shadow-[-6px_2px_12px_rgba(0,0,0,0.08)] transition cursor-pointer"
        >
          <ChevronRight className="h-5 w-5 stroke-[2.5]" />
        </button>

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-3.5 sm:px-5 py-3 sm:py-4 bg-stone-50/80">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs shrink-0">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="font-display text-sm sm:text-base font-bold text-stone-900">
                  Your Order Cart
                </h3>
                <span className="rounded-full bg-amber-200/80 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-950">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onClose}
              title="Collapse cart"
              className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition cursor-pointer"
            >
              <span>Collapse</span>
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        {/* Dual Mode Session Indicator Bar */}
        <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between text-[11px] sm:text-xs">
          {activeTableBinding ? (
            <div className="flex items-center gap-1.5 text-amber-950 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Dine-In • Table #{activeTableBinding.tableNumber}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-stone-700 font-medium">
              <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" />
              <span>Online Order • Table Selection at Checkout</span>
            </div>
          )}
          {!activeTableBinding && (
            <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-amber-800 tracking-wider">
              Dine-In / Online
            </span>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 divide-y divide-stone-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 border border-amber-200/60 mb-3">
                <Coffee className="h-8 w-8 text-amber-600 stroke-[1.7]" />
              </div>
              <p className="font-display font-bold text-stone-800 text-base">
                Your cart is empty
              </p>
              <p className="text-xs text-stone-500 mt-1 max-w-[240px] leading-relaxed">
                Browse our handcrafted espresso, iced specials, adobo flakes, and desserts to start your order.
              </p>
              <button
                onClick={() => {
                  setAddonsCategoryFilter('all');
                  setIsAddonsModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100/90 px-3.5 py-2 text-xs font-bold text-amber-950 hover:bg-amber-200 transition cursor-pointer shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-800" />
                <span>Browse Add-ons & Extras</span>
              </button>
            </div>
          ) : (
            <>
              {cart.map((ci) => {
                const itemTotal = ci.item.price * ci.quantity;
                const isEditingNotes = editingInstructionsId === ci.item.id;
                const isDrink = ci.item.categoryId >= 9 && ci.item.categoryId <= 17;

                return (
                  <div key={ci.item.id} className="pt-3.5 first:pt-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      {/* Item Image Thumbnail */}
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200/80">
                        <img
                          src={ci.item.imageUrl || '/images/latte.webp'}
                          alt={ci.item.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/latte.webp';
                          }}
                        />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                            {ci.item.name}
                          </h4>
                          {getTemperatureBadge(ci.item.temperature)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs font-extrabold text-amber-700">
                            ₱{ci.item.price.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            × {ci.quantity} = ₱{itemTotal.toFixed(2)}
                          </span>
                        </div>

                        {/* Special Instructions display */}
                        {ci.specialInstructions && !isEditingNotes && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-600 bg-stone-50 rounded-md px-2 py-0.5 border border-stone-200/60">
                            <span className="font-semibold text-stone-700">Note:</span>
                            <span className="italic truncate">{ci.specialInstructions}</span>
                            <button
                              onClick={() => handleStartEditInstructions(ci)}
                              className="ml-auto text-amber-700 hover:text-amber-900"
                              title="Edit Note"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Stepper Controls & Delete */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50 overflow-hidden shadow-2xs">
                          <button
                            onClick={() => onUpdateQuantity(ci.item.id, -1)}
                            title="Decrease quantity"
                            className="p-1.5 text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition active:scale-95 cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-stone-900 font-mono">
                            {ci.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(ci.item.id, 1)}
                            title="Increase quantity"
                            className="p-1.5 text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition active:scale-95 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!ci.specialInstructions && !isEditingNotes && (
                            <button
                              onClick={() => handleStartEditInstructions(ci)}
                              title="Add special note"
                              className="p-1 text-stone-400 hover:text-amber-700 transition"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onRemoveItem(ci.item.id)}
                            title="Remove item"
                            className="p-1 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Note Editing Form Inline */}
                    {isEditingNotes && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={instructionText}
                          onChange={(e) => setInstructionText(e.target.value)}
                          placeholder="e.g. Less ice, extra hot, no onions..."
                          className="flex-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveInstructions(ci.item.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleSaveInstructions(ci.item.id)}
                          className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-bold text-stone-950 hover:bg-amber-400 transition"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setEditingInstructionsId(null)}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-bold text-stone-600 hover:bg-stone-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer Calculation & Checkout */}
        {cart.length > 0 && (
          <div className="border-t border-stone-200 bg-stone-50/90 p-3.5 sm:p-5 space-y-2.5 sm:space-y-3">
            <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-stone-600">
              <div className="flex justify-between items-center">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-stone-800">
                  ₱{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-stone-500">
                <span>
                  <span className="sm:hidden">VAT ({taxRate}%):</span>
                  <span className="hidden sm:inline">VAT ({taxRate}% inclusive):</span>
                </span>
                <span className="font-mono">₱{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-stone-900 pt-1.5 sm:pt-2 border-t border-stone-200">
                <span className="font-display">Total:</span>
                <span className="font-mono text-sm sm:text-base font-extrabold text-amber-700">
                  ₱{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Require Login Banner for Online Orders */}
            {!activeCustomer && !activeTableBinding && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2 sm:p-2.5 flex items-center justify-between gap-2 text-stone-800">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-lg bg-amber-500/20 text-amber-800 shrink-0">
                    <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-bold text-stone-900 leading-tight truncate">Login Required</p>
                    <p className="text-[9px] sm:text-[10px] text-stone-500 truncate">Sign in to checkout online</p>
                  </div>
                </div>
                {onRequireLogin && (
                  <button
                    type="button"
                    onClick={onRequireLogin}
                    className="shrink-0 rounded-lg bg-amber-500 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-extrabold text-stone-950 hover:bg-amber-400 transition cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
              <button
                id="cart-addons-footer-btn"
                onClick={() => {
                  setAddonsCategoryFilter('all');
                  setIsAddonsModalOpen(true);
                }}
                title="Add Add-ons"
                className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-amber-300 bg-amber-100/90 hover:bg-amber-200 px-2.5 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs font-extrabold text-amber-950 transition cursor-pointer shadow-2xs"
              >
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-800" />
                <span>+ Add-ons</span>
              </button>

              <button
                onClick={onClearCart}
                title="Clear all items in cart"
                className="rounded-xl border border-stone-200 bg-white px-2.5 sm:px-3 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  if (!activeTableBinding && !activeCustomer) {
                    if (onRequireLogin) {
                      onRequireLogin();
                    }
                    return;
                  }
                  onProceedToCheckout();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-amber-500 py-2.5 sm:py-3 text-[11px] sm:text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition active:scale-98 cursor-pointer"
              >
                {!activeTableBinding && !activeCustomer ? (
                  <>
                    <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="sm:hidden">Log In</span>
                    <span className="hidden sm:inline">Log In to Checkout</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Checkout</span>
                    <span className="hidden sm:inline">Proceed to Checkout</span>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Interactive Add-ons Slide-Over Overlay Panel */}
        {isAddonsModalOpen && (
          <div
            id="addons-selector-panel"
            className="absolute inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-250 font-sans"
          >
            {/* Add-ons Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 bg-white">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddonsModalOpen(false)}
                  title="Back"
                  className="grid h-8 w-8 place-items-center rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="font-display text-sm font-bold text-stone-900">
                  Add-ons &amp; Extras
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsAddonsModalOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Bar & Single Button Filter */}
            <div className="p-3 border-b border-stone-200 bg-stone-50 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  value={addonsSearchQuery}
                  onChange={(e) => setAddonsSearchQuery(e.target.value)}
                  placeholder="Search add-ons..."
                  className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-7 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none shadow-2xs"
                />
                {addonsSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAddonsSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Single Filter Button Modal Trigger */}
              <button
                id="btn-addons-filter"
                type="button"
                onClick={() => setIsAddonFilterModalOpen(true)}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border transition cursor-pointer shadow-2xs shrink-0 ${
                  addonsCategoryFilter !== 'all'
                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-amber-700" />
                <span>Filter:</span>
                <span className="font-extrabold text-stone-900">
                  {addonsCategoryFilter === 'all'
                    ? 'All'
                    : addonsCategoryFilter === 'drinks'
                    ? 'Drinks'
                    : 'Food'}
                </span>
              </button>
            </div>

            {/* Filter Modal */}
            {isAddonFilterModalOpen && (
              <div
                id="modal-addons-filter"
                className="absolute inset-0 z-60 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-2xs"
                onClick={() => setIsAddonFilterModalOpen(false)}
              >
                <div
                  className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-xl border border-stone-200 space-y-3 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-amber-700" />
                      <h4 className="text-xs font-bold text-stone-900">Filter Add-ons</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddonFilterModalOpen(false)}
                      className="p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAddonsCategoryFilter('all');
                        setIsAddonFilterModalOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        addonsCategoryFilter === 'all'
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>All Add-ons</span>
                      <span className="text-[10px] font-mono opacity-80">({allAddonItems.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAddonsCategoryFilter('drinks');
                        setIsAddonFilterModalOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        addonsCategoryFilter === 'drinks'
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CupSoda className="h-3.5 w-3.5" />
                        <span>Drink Add-ons</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">({drinkAddonItems.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAddonsCategoryFilter('food');
                        setIsAddonFilterModalOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        addonsCategoryFilter === 'food'
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Egg className="h-3.5 w-3.5" />
                        <span>Food Add-ons</span>
                      </div>
                      <span className="text-[10px] font-mono opacity-80">({foodAddonItems.length})</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add-ons List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {displayAddonItems.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-1.5">
                  <p className="text-xs font-bold text-stone-600">No add-ons found</p>
                  <p className="text-[11px] text-stone-400">
                    Try searching for another keyword or change filter
                  </p>
                </div>
              ) : (
                displayAddonItems.map((addon) => {
                  const qtyInCart = getAddonCartQuantity(addon.id);
                  const isRecentlyAdded = recentlyAddedAddonId === addon.id;
                  const isDrinkAddon = addon.categoryId === 17 || addon.name.toLowerCase().includes('milk') || addon.name.toLowerCase().includes('jelly');

                  return (
                    <div
                      key={addon.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border p-2 transition ${
                        qtyInCart > 0
                          ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-100 border border-stone-200/80">
                        <img
                          src={addon.imageUrl || '/images/latte.webp'}
                          alt=""
                          aria-hidden="true"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/latte.webp';
                          }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {addon.name}
                          </h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            isDrinkAddon
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {isDrinkAddon ? 'Drink' : 'Food'}
                          </span>
                        </div>
                        <p className="font-mono text-xs font-extrabold text-amber-700 mt-0.5">
                          ₱{addon.price.toFixed(2)}
                        </p>
                      </div>

                      {/* Action Controls */}
                      <div className="shrink-0 flex items-center">
                        {qtyInCart > 0 ? (
                          <div className="flex items-center rounded-lg border border-amber-400 bg-amber-100 overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(addon.id, -1)}
                              title="Decrease"
                              className="p-1 text-amber-900 hover:bg-amber-200 transition active:scale-95 cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-mono font-black text-stone-950">
                              {qtyInCart}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddAddonItem(addon)}
                              title="Increase"
                              className="p-1 text-amber-900 hover:bg-amber-200 transition active:scale-95 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddAddonItem(addon)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold transition cursor-pointer shadow-2xs ${
                              isRecentlyAdded
                                ? 'bg-emerald-500 text-white animate-bounce'
                                : 'bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95'
                            }`}
                          >
                            {isRecentlyAdded ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Added</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add-ons Done / Back Footer */}
            <div className="border-t border-stone-200 bg-stone-50 p-3 flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-stone-800">
                <span className="font-mono">{totalItemCount} items</span>
                <span className="mx-1.5 text-stone-300">•</span>
                <span className="font-mono text-amber-700">₱{totalAmount.toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddonsModalOpen(false)}
                className="flex items-center gap-1 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-stone-800 transition cursor-pointer shadow-xs"
              >
                <span>Back to Cart</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
