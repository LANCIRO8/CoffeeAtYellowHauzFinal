import React, { useMemo, useState } from 'react';
import { CartItem, CustomerAccount, StoreSettings, TableBinding } from '../../types';
import {
  ShoppingBag,
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
  User,
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
  settings,
  activeTableBinding,
  activeCustomer,
  onProceedToCheckout,
  onRequireLogin,
}) => {
  const [editingInstructionsId, setEditingInstructionsId] = useState<number | null>(null);
  const [instructionText, setInstructionText] = useState('');

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
      {/* Floating Collapsible Trigger Tab on Right Edge (Visible when collapsed, or floating hint) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          title="Open Order Bag"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2 rounded-l-2xl bg-amber-500 hover:bg-amber-400 py-3.5 pl-3 pr-2.5 text-stone-950 font-extrabold shadow-[-4px_4px_16px_rgba(0,0,0,0.18)] transition transform hover:-translate-x-1 active:scale-95 cursor-pointer border-y border-l border-amber-600/30 group"
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5 stroke-[2.3] transition group-hover:scale-110" />
            {totalItemCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-stone-950 px-1 text-[9px] font-black text-amber-400">
                {totalItemCount}
              </span>
            )}
          </div>
          <div className="flex flex-col items-start text-left leading-tight pr-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-stone-800">
              Your Bag
            </span>
            <span className="font-mono text-xs font-black">
              ₱{totalAmount.toFixed(2)}
            </span>
          </div>
          <ChevronLeft className="h-4 w-4 text-stone-900 transition group-hover:-translate-x-0.5" />
        </button>
      )}

      {/* Collapsible Right-Side Cart Panel (No blur, no background overlay) */}
      <aside
        aria-label="Customer Order Cart"
        className={`fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[390px] md:w-[420px] bg-white border-l border-stone-200/90 shadow-[-12px_0_30px_rgba(0,0,0,0.14)] flex flex-col transition-transform duration-300 ease-in-out font-sans ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Pull-tab on Left Edge of open drawer to quickly collapse */}
        <button
          onClick={onClose}
          title="Collapse Cart"
          className="absolute -left-9 top-1/2 -translate-y-1/2 flex items-center justify-center h-20 w-9 rounded-l-xl bg-white border-y border-l border-stone-200 text-stone-600 hover:text-stone-950 hover:bg-stone-50 shadow-[-6px_2px_12px_rgba(0,0,0,0.08)] transition cursor-pointer"
        >
          <ChevronRight className="h-5 w-5 stroke-[2.5]" />
        </button>

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 bg-stone-50/80">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-stone-900">
                  Your Order Bag
                </h3>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-black text-amber-950">
                  {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Freshly prepared at Yellow Hauz
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            title="Collapse cart"
            className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition cursor-pointer"
          >
            <span>Collapse</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Dual Mode Session Indicator Bar */}
        <div className="px-5 py-2.5 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between text-xs">
          {activeTableBinding ? (
            <div className="flex items-center gap-1.5 text-amber-950 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Dine-In • Table #{activeTableBinding.tableNumber}</span>
              <span className="text-[10px] text-amber-800 font-normal">
                ({activeTableBinding.area === 'airconditioned' ? 'AC Room' : 'Main Area'})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-stone-700 font-medium">
              <Globe className="h-3.5 w-3.5 text-amber-600" />
              <span>Online Order</span>
            </div>
          )}
          <span className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider">
            {activeTableBinding ? 'Direct Kitchen Prep' : 'Advance Booking'}
          </span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 divide-y divide-stone-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 border border-amber-200/60 mb-3">
                <Coffee className="h-8 w-8 text-amber-600 stroke-[1.7]" />
              </div>
              <p className="font-display font-bold text-stone-800 text-base">
                Your bag is empty
              </p>
              <p className="text-xs text-stone-500 mt-1 max-w-[240px] leading-relaxed">
                Browse our handcrafted espresso, iced specials, adobo flakes, and desserts to start your order.
              </p>
            </div>
          ) : (
            cart.map((ci) => {
              const itemTotal = ci.item.price * ci.quantity;
              const isEditingNotes = editingInstructionsId === ci.item.id;

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
            })
          )}
        </div>

        {/* Footer Calculation & Checkout */}
        {cart.length > 0 && (
          <div className="border-t border-stone-200 bg-stone-50/90 p-5 space-y-3">
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between items-center">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-stone-800">
                  ₱{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-stone-500">
                <span>VAT ({taxRate}% inclusive):</span>
                <span className="font-mono">₱{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span className="font-display">Total Due:</span>
                <span className="font-mono text-base font-extrabold text-amber-700">
                  ₱{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Require Login Banner for Online Orders */}
            {!activeCustomer && !activeTableBinding && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-2.5 flex items-center justify-between gap-2 text-stone-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500/20 text-amber-800 shrink-0">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 leading-tight truncate">Login Required</p>
                    <p className="text-[10px] text-stone-500 truncate">Sign in to checkout online</p>
                  </div>
                </div>
                {onRequireLogin && (
                  <button
                    type="button"
                    onClick={onRequireLogin}
                    className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-extrabold text-stone-950 hover:bg-amber-400 transition cursor-pointer"
                  >
                    Sign In
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onClearCart}
                title="Clear all items in bag"
                className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
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
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs sm:text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition active:scale-98 cursor-pointer"
              >
                {!activeTableBinding && !activeCustomer ? (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Log In to Checkout</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
