import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  PackagePlus,
  Coffee,
  ChefHat,
  Monitor,
  Store,
  AlertCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  Check,
  Layers,
} from 'lucide-react';
import { MenuItem, Category, User, RefillStation, RefillUrgency } from '../../types';
import { AppStore } from '../../services/store';

interface RefillRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItem?: MenuItem | null;
  activeStaff?: User | null;
  categories: Category[];
  onSubmitSuccess: () => void;
}

const COMMON_UNITS = [
  'pcs',
  'cartons',
  'packs',
  'bottles',
  'bags',
  'kg',
  'liters',
  'trays',
  'boxes',
  'bundles',
  'cans',
];

export const RefillRequestModal: React.FC<RefillRequestModalProps> = ({
  isOpen,
  onClose,
  preselectedItem,
  activeStaff,
  categories,
  onSubmitSuccess,
}) => {
  // Determine default station based on staff role
  const defaultStation: RefillStation = useMemo(() => {
    if (activeStaff?.role === 'barista') return 'bar';
    if (activeStaff?.role === 'cook') return 'kitchen';
    if (activeStaff?.role === 'cashier') return 'counter';
    return 'bar';
  }, [activeStaff]);

  // Mode: catalog item vs custom ingredient/supply
  const [sourceMode, setSourceMode] = useState<'catalog' | 'custom'>('catalog');

  // Selected catalog item
  const [catalogItems, setCatalogItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(preselectedItem || null);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Form fields
  const [customItemName, setCustomItemName] = useState('');
  const [station, setStation] = useState<RefillStation>(defaultStation);
  const [unit, setUnit] = useState<string>('pcs');
  const [suggestedQuantity, setSuggestedQuantity] = useState<number>(10);
  const [urgency, setUrgency] = useState<RefillUrgency>('normal');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset or update when preselectedItem or modal opens
  useEffect(() => {
    if (isOpen) {
      setCatalogItems(AppStore.getMenuItems());
      if (preselectedItem) {
        setSelectedMenuItem(preselectedItem);
        setSourceMode('catalog');
        const cat = categories.find((c) => c.id === preselectedItem.categoryId);
        const isDrink = (cat?.name || '').toLowerCase().includes('coffee') || (cat?.name || '').toLowerCase().includes('drink');
        setStation(isDrink ? 'bar' : 'kitchen');
      } else {
        setSelectedMenuItem(null);
        setStation(defaultStation);
      }
      setSuggestedQuantity(10);
      setUrgency('normal');
      setNotes('');
      setErrorMessage('');
      setUnit('pcs');
    }
  }, [isOpen, preselectedItem, defaultStation, categories]);

  // Filter catalog items
  const filteredCatalogItems = useMemo(() => {
    if (!catalogSearch.trim()) return catalogItems.slice(0, 30);
    const q = catalogSearch.toLowerCase();
    return catalogItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q)
    );
  }, [catalogItems, catalogSearch]);

  if (!isOpen) return null;

  const currentItemStock = selectedMenuItem ? (selectedMenuItem.quantity ?? 0) : 0;
  const itemName = sourceMode === 'catalog' ? (selectedMenuItem?.name || '') : customItemName.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!itemName) {
      setErrorMessage('Please specify an item name or select an item from the catalog.');
      return;
    }

    if (suggestedQuantity <= 0) {
      setErrorMessage('Suggested quantity must be at least 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      const staffName = activeStaff?.fullName || activeStaff?.name || 'Staff Member';
      const staffRole = (activeStaff?.role || 'cashier') as 'cashier' | 'cook' | 'barista' | 'admin';

      let categoryName: string | undefined = undefined;
      if (sourceMode === 'catalog' && selectedMenuItem) {
        const cat = categories.find((c) => c.id === selectedMenuItem.categoryId);
        categoryName = cat?.name;
      } else {
        categoryName =
          station === 'bar'
            ? 'Bar & Beverage Supply'
            : station === 'kitchen'
            ? 'Kitchen Food & Ingredients'
            : station === 'counter'
            ? 'Counter & Packaging'
            : 'General Store';
      }

      AppStore.createRefillRequest({
        menuItemId: sourceMode === 'catalog' && selectedMenuItem ? selectedMenuItem.id : null,
        itemName,
        categoryName,
        station,
        unit,
        currentStock: currentItemStock,
        suggestedQuantity,
        urgency,
        notes: notes.trim() || undefined,
        requestedBy: {
          id: activeStaff?.id || 99,
          name: staffName,
          role: staffRole,
          employeeId: activeStaff?.employeeId || `${staffRole.toUpperCase().slice(0, 3)}-01`,
        },
      });

      onSubmitSuccess();
      onClose();
    } catch (err) {
      console.error('Error submitting refill request:', err);
      setErrorMessage('Failed to submit suggestion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50/90 px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-stone-950 shadow-xs">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                Suggest Item to Refill
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                Sent to Admin for purchase &amp; final quantity confirmation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Source Toggle: Catalog item vs Custom ingredient */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">
              Item Source
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSourceMode('catalog')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
                  sourceMode === 'catalog'
                    ? 'bg-white text-stone-950 shadow-xs font-extrabold'
                    : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-amber-600" />
                <span>Existing Menu Item</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceMode('custom')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
                  sourceMode === 'custom'
                    ? 'bg-white text-stone-950 shadow-xs font-extrabold'
                    : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Ingredient / Supply</span>
              </button>
            </div>
          </div>

          {/* Catalog Item Picker */}
          {sourceMode === 'catalog' ? (
            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500">
                Select Item from Catalog <span className="text-rose-500">*</span>
              </label>

              {selectedMenuItem ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl border-2 border-amber-500 bg-amber-50/50">
                  <div className="flex items-center gap-2.5">
                    {selectedMenuItem.imageUrl && (
                      <img
                        src={selectedMenuItem.imageUrl}
                        alt={selectedMenuItem.name}
                        className="h-10 w-10 rounded-lg object-cover border border-amber-200"
                      />
                    )}
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold text-stone-900">
                        {selectedMenuItem.name}
                      </div>
                      <div className="text-[10px] text-stone-500 font-medium">
                        Current System Stock: <strong className="text-amber-800">{selectedMenuItem.quantity ?? 0} units</strong>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMenuItem(null)}
                    className="text-xs font-bold text-amber-800 hover:underline px-2 py-1"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search item to refill..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 py-2 text-xs font-medium text-stone-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
                    {filteredCatalogItems.length === 0 ? (
                      <div className="p-3 text-center text-xs text-stone-400">No items found</div>
                    ) : (
                      filteredCatalogItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedMenuItem(item);
                            const cat = categories.find((c) => c.id === item.categoryId);
                            const isDrink = (cat?.name || '').toLowerCase().includes('coffee') || (cat?.name || '').toLowerCase().includes('drink');
                            setStation(isDrink ? 'bar' : 'kitchen');
                          }}
                          className="w-full flex items-center justify-between p-2 hover:bg-amber-50 text-left transition cursor-pointer"
                        >
                          <span className="text-xs font-bold text-stone-800">{item.name}</span>
                          <span className="text-[10px] font-mono font-semibold text-stone-500">
                            Stock: {item.quantity ?? 0}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Custom Supply Input */
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500">
                Item / Ingredient / Supply Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Oat Milk (Barista 1L), Espresso Beans (1kg), Eggs (Tray 30), Cooking Oil"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          )}

          {/* Station Selector */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">
              Station / Department
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStation('bar')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border transition cursor-pointer ${
                  station === 'bar'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-extrabold shadow-2xs'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Coffee className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Bar &amp; Drinks</span>
              </button>

              <button
                type="button"
                onClick={() => setStation('kitchen')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border transition cursor-pointer ${
                  station === 'kitchen'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-extrabold shadow-2xs'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <ChefHat className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Kitchen &amp; Food</span>
              </button>

              <button
                type="button"
                onClick={() => setStation('counter')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border transition cursor-pointer ${
                  station === 'counter'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 font-extrabold shadow-2xs'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Monitor className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Front Counter</span>
              </button>
            </div>
          </div>

          {/* Suggested Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">
                Suggested Quantity <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSuggestedQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 font-bold text-stone-700 hover:bg-stone-100"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={suggestedQuantity}
                  onChange={(e) => setSuggestedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center font-mono font-extrabold rounded-xl border border-stone-200 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSuggestedQuantity((q) => q + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 font-bold text-stone-700 hover:bg-stone-100"
                >
                  +
                </button>
              </div>
              {/* Quick pills */}
              <div className="flex items-center gap-1 mt-1.5">
                {[5, 10, 20, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSuggestedQuantity(num)}
                    className="flex-1 rounded-md bg-stone-100 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-amber-100 hover:text-amber-900"
                  >
                    +{num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs font-bold text-stone-800 focus:border-amber-500 focus:outline-none"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1.5">
              Urgency / Stock Condition
            </label>
            <div className="grid grid-cols-4 gap-1 text-[10px] font-extrabold">
              <button
                type="button"
                onClick={() => setUrgency('low')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  urgency === 'low'
                    ? 'border-stone-500 bg-stone-100 text-stone-900 ring-1 ring-stone-400'
                    : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                Low
              </button>
              <button
                type="button"
                onClick={() => setUrgency('normal')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  urgency === 'normal'
                    ? 'border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-400'
                    : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setUrgency('high')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  urgency === 'high'
                    ? 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-400'
                    : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                High Low Stock
              </button>
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  urgency === 'urgent'
                    ? 'border-rose-500 bg-rose-50 text-rose-950 ring-1 ring-rose-400'
                    : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                🚨 Out of Stock
              </button>
            </div>
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-stone-500 mb-1">
              Notes for Admin / Reason for Refill
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Only 1 carton left, needed for high morning rush; please buy Barista edition."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-medium text-stone-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Workflow Explanation Banner */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-300/60 p-2.5 text-[11px] text-amber-950 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Admin Confirmation Workflow</span>
            </div>
            <p className="text-amber-800">
              Your suggestion will be submitted to the Admin refill queue. When Admin buys the supplies, they will decide the final quantity and confirm it into the official system stock.
            </p>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 px-4 sm:px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
          >
            <PackagePlus className="h-4 w-4" />
            <span>Submit Refill Suggestion</span>
          </button>
        </div>
      </div>
    </div>
  );
};
