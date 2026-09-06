import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  PackagePlus,
  Coffee,
  ChefHat,
  Monitor,
  Search,
  Filter,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Sparkles,
  Info,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Store,
} from 'lucide-react';
import { MenuItem, Category, User, RefillStation } from '../../types';
import { AppStore } from '../../services/store';
import { RefillRequestModal } from './RefillRequestModal';
import { RefillSuggestionsView } from './RefillSuggestionsView';

interface StaffInventoryManagerProps {
  categories: Category[];
  activeStaff?: User | null;
}

export const StaffInventoryManager: React.FC<StaffInventoryManagerProps> = ({
  categories,
  activeStaff: propActiveStaff,
}) => {
  const activeStaff = propActiveStaff || AppStore.getActiveStaff();
  const staffRole = activeStaff?.role || 'cashier';

  // Sub-tabs: 'stock' (Items & Current stock) vs 'suggestions' (Refill requests tracker)
  const [activeSubTab, setActiveSubTab] = useState<'stock' | 'suggestions'>('stock');

  // Live state
  const [items, setItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState<'all' | RefillStation>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'out_of_stock' | 'low_stock' | 'in_stock'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');

  // Refill request modal
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [selectedItemForRefill, setSelectedItemForRefill] = useState<MenuItem | null>(null);

  // Subscribe to AppStore updates
  useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setItems(AppStore.getMenuItems());
    });
    return () => unsub();
  }, []);

  // Helper to determine item station
  const getItemStation = (item: MenuItem): RefillStation => {
    const category = categories.find((c) => c.id === item.categoryId);
    const catName = (category?.name || '').toLowerCase();
    const itemName = item.name.toLowerCase();

    if (
      catName.includes('coffee') ||
      catName.includes('drink') ||
      catName.includes('tea') ||
      catName.includes('espresso') ||
      catName.includes('beverage') ||
      itemName.includes('latte') ||
      itemName.includes('americano') ||
      itemName.includes('cappuccino') ||
      itemName.includes('brew')
    ) {
      return 'bar';
    }

    if (
      catName.includes('food') ||
      catName.includes('pasta') ||
      catName.includes('rice') ||
      catName.includes('breakfast') ||
      catName.includes('meal') ||
      catName.includes('sandwich') ||
      catName.includes('pastr') ||
      catName.includes('snack')
    ) {
      return 'kitchen';
    }

    return 'counter';
  };

  // KPIs
  const kpis = useMemo(() => {
    const outOfStock = items.filter((i) => (i.quantity ?? 0) <= 0 || i.isAvailable === false).length;
    const lowStock = items.filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 5 && i.isAvailable !== false).length;
    const pendingRefills = AppStore.getPendingRefillRequestsCount();
    return {
      total: items.length,
      outOfStock,
      lowStock,
      pendingRefills,
    };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const cat = categories.find((c) => c.id === item.categoryId);
        const matchesCat = (cat?.name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }

      // Station filter
      if (stationFilter !== 'all') {
        const itemStation = getItemStation(item);
        if (itemStation !== stationFilter) return false;
      }

      // Category filter
      if (selectedCategoryId !== 'all' && item.categoryId !== selectedCategoryId) {
        return false;
      }

      // Stock level filter
      const qty = item.quantity ?? 0;
      const isAvailable = item.isAvailable !== false;
      if (stockLevelFilter === 'out_of_stock') {
        if (qty > 0 && isAvailable) return false;
      } else if (stockLevelFilter === 'low_stock') {
        if (qty <= 0 || qty > 5 || !isAvailable) return false;
      } else if (stockLevelFilter === 'in_stock') {
        if (qty <= 5 || !isAvailable) return false;
      }

      return true;
    });
  }, [items, searchQuery, stationFilter, selectedCategoryId, stockLevelFilter, categories]);

  const handleOpenRefillFor = (item?: MenuItem | null) => {
    setSelectedItemForRefill(item || null);
    setIsSuggestModalOpen(true);
  };

  const getRoleHeaderInfo = () => {
    switch (staffRole) {
      case 'cook':
        return {
          title: 'Kitchen Supplies & Stock Refills',
          subtitle: 'Check ingredient levels and suggest items to be refilled by Admin for cooking and prep.',
          badge: 'Kitchen Cook Station',
          icon: ChefHat,
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'barista':
        return {
          title: 'Coffee Bar Supplies & Stock Refills',
          subtitle: 'Monitor coffee beans, syrups, milks, and suggest refills to Admin before rush hours.',
          badge: 'Coffee Bar Station',
          icon: Coffee,
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'cashier':
      default:
        return {
          title: 'Front Counter Supplies & Stock Refills',
          subtitle: 'Track packaging, cups, and retail stock, and suggest items for Admin restocking.',
          badge: 'Cashier & Counter Station',
          icon: Monitor,
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        };
    }
  };

  const headerInfo = getRoleHeaderInfo();
  const HeaderIcon = headerInfo.icon;

  return (
    <div className="min-h-screen bg-stone-100/70 p-3 sm:p-6 space-y-5">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white p-5 sm:p-7 shadow-xs border border-stone-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-amber-500 text-stone-950 shadow-sm shrink-0">
              <HeaderIcon className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 font-display tracking-tight">
                  {headerInfo.title}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${headerInfo.badgeColor}`}>
                  {headerInfo.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
                {headerInfo.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            <button
              id="staff-suggest-refill-btn"
              onClick={() => handleOpenRefillFor(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm shadow-sm transition active:scale-95 cursor-pointer"
            >
              <PackagePlus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>+ Suggest Item Refill</span>
            </button>
          </div>
        </div>

        {/* Notice for Staff */}
        <div className="mt-4 p-3 sm:p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950">
          <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Staff Refill Workflow: </span>
            <span>
              Your submitted items act as recommendations for the Admin. The Admin purchases the stock and officially confirms the final quantity added to the POS system.
            </span>
          </div>
        </div>

        {/* KPI Mini Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
          <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Total Items</div>
              <div className="text-lg sm:text-xl font-black text-stone-900 mt-0.5">{kpis.total}</div>
            </div>
            <Package className="h-5 w-5 text-stone-400" />
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/70 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Out of Stock</div>
              <div className="text-lg sm:text-xl font-black text-rose-800 mt-0.5">{kpis.outOfStock}</div>
            </div>
            <AlertCircle className="h-5 w-5 text-rose-500" />
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Low Stock (≤5)</div>
              <div className="text-lg sm:text-xl font-black text-amber-900 mt-0.5">{kpis.lowStock}</div>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>

          <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200/70 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">Pending Refills</div>
              <div className="text-lg sm:text-xl font-black text-sky-900 mt-0.5">{kpis.pendingRefills}</div>
            </div>
            <Clock className="h-5 w-5 text-sky-600" />
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 mt-5 border-t border-stone-100 pt-4">
          <button
            id="tab-staff-stock-overview"
            onClick={() => setActiveSubTab('stock')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
              activeSubTab === 'stock'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Current Stock &amp; Supplies</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-stone-700 text-white text-[10px]">
              {items.length}
            </span>
          </button>

          <button
            id="tab-staff-refill-requests"
            onClick={() => setActiveSubTab('suggestions')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer relative ${
              activeSubTab === 'suggestions'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <PackagePlus className="h-4 w-4" />
            <span>Refill Suggestions &amp; Status</span>
            {kpis.pendingRefills > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                {kpis.pendingRefills}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: Current Stock & Supplies Overview */}
      {activeSubTab === 'stock' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="rounded-3xl bg-white p-4 shadow-xs border border-stone-200 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search item, syrup, ingredient, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 rounded-2xl border border-stone-200 focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Station Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200/80">
                <button
                  onClick={() => setStationFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    stationFilter === 'all'
                      ? 'bg-white text-stone-950 font-black shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  All Stations
                </button>
                <button
                  onClick={() => setStationFilter('bar')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    stationFilter === 'bar'
                      ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Coffee className="h-3.5 w-3.5" />
                  <span>Coffee Bar</span>
                </button>
                <button
                  onClick={() => setStationFilter('kitchen')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    stationFilter === 'kitchen'
                      ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <ChefHat className="h-3.5 w-3.5" />
                  <span>Kitchen</span>
                </button>
                <button
                  onClick={() => setStationFilter('counter')}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    stationFilter === 'counter'
                      ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Counter / POS</span>
                </button>
              </div>
            </div>

            {/* Second row: Stock status filters & category dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-stone-500 mr-1">Stock Level:</span>
                <button
                  onClick={() => setStockLevelFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    stockLevelFilter === 'all'
                      ? 'bg-stone-800 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  onClick={() => setStockLevelFilter('out_of_stock')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    stockLevelFilter === 'out_of_stock'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  Out of Stock ({kpis.outOfStock})
                </button>
                <button
                  onClick={() => setStockLevelFilter('low_stock')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    stockLevelFilter === 'low_stock'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  Low Stock ({kpis.lowStock})
                </button>
                <button
                  onClick={() => setStockLevelFilter('in_stock')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    stockLevelFilter === 'in_stock'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  In Stock
                </button>
              </div>

              {/* Category selector */}
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-stone-500">Category:</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedCategoryId(v === 'all' ? 'all' : parseInt(v, 10));
                  }}
                  className="bg-stone-50 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="all">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredItems.map((item) => {
              const qty = item.quantity ?? 0;
              const isOutOfStock = qty <= 0 || item.isAvailable === false;
              const isLowStock = !isOutOfStock && qty <= 5;
              const category = categories.find((c) => c.id === item.categoryId);
              const station = getItemStation(item);

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl bg-white p-4 border transition-all hover:shadow-md flex flex-col justify-between ${
                    isOutOfStock
                      ? 'border-rose-300 bg-rose-50/20'
                      : isLowStock
                      ? 'border-amber-300 bg-amber-50/20'
                      : 'border-stone-200'
                  }`}
                >
                  <div>
                    {/* Item Top badges */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-stone-100 text-stone-700 border border-stone-200">
                        {category?.name || 'General'}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                          station === 'bar'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : station === 'kitchen'
                            ? 'bg-orange-50 text-orange-900 border-orange-200'
                            : 'bg-stone-100 text-stone-800 border-stone-200'
                        }`}
                      >
                        {station === 'bar' ? (
                          <>
                            <Coffee className="h-3 w-3" /> Bar
                          </>
                        ) : station === 'kitchen' ? (
                          <>
                            <ChefHat className="h-3 w-3" /> Kitchen
                          </>
                        ) : (
                          <>
                            <Monitor className="h-3 w-3" /> Counter
                          </>
                        )}
                      </span>
                    </div>

                    {/* Item Name & Details */}
                    <div className="flex items-start gap-3">
                      <div className="relative h-14 w-14 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200/80 flex items-center justify-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="h-6 w-6 text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2">
                          {item.name}
                        </h3>
                        <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                          {item.description || 'Café inventory item'}
                        </p>
                      </div>
                    </div>

                    {/* Stock Status Bar */}
                    <div className="mt-3.5 p-2.5 rounded-2xl bg-stone-50 border border-stone-200/60 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                          Current Stock
                        </span>
                        <span className="font-extrabold text-stone-900 text-base">
                          {qty} <span className="text-xs font-normal text-stone-500">units</span>
                        </span>
                      </div>

                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-rose-500 text-white shadow-2xs animate-pulse">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-400 text-stone-950 border border-amber-500/60">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action: Suggest Refill */}
                  <div className="mt-3 pt-2.5 border-t border-stone-100">
                    <button
                      id={`suggest-refill-btn-${item.id}`}
                      onClick={() => handleOpenRefillFor(item)}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98 ${
                        isOutOfStock
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-2xs'
                          : isLowStock
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow-2xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                      }`}
                    >
                      <PackagePlus className="h-3.5 w-3.5" />
                      <span>{isOutOfStock ? 'Suggest Urgent Refill' : 'Suggest Refill'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="rounded-3xl bg-white p-12 text-center border border-stone-200 space-y-3">
              <Package className="h-12 w-12 text-stone-300 mx-auto" />
              <h3 className="font-extrabold text-stone-800 text-base">No inventory items found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No items match your current filter. You can also suggest custom raw supplies or packaging not listed in the catalog.
              </p>
              <button
                onClick={() => handleOpenRefillFor(null)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-stone-950 text-xs font-black shadow-xs hover:bg-amber-400"
              >
                <PackagePlus className="h-4 w-4" />
                <span>Suggest Custom Supply Refill</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Refill Suggestions & Status Tracker */}
      {activeSubTab === 'suggestions' && (
        <div className="space-y-4">
          <RefillSuggestionsView
            activeStaff={activeStaff}
            onOpenSuggestModal={handleOpenRefillFor}
            categories={categories}
          />
        </div>
      )}

      {/* Suggest Refill Modal */}
      <RefillRequestModal
        isOpen={isSuggestModalOpen}
        onClose={() => {
          setIsSuggestModalOpen(false);
          setSelectedItemForRefill(null);
        }}
        preselectedItem={selectedItemForRefill}
        activeStaff={activeStaff}
        categories={categories}
        onSubmitSuccess={() => {
          setIsSuggestModalOpen(false);
          setSelectedItemForRefill(null);
          // Refresh item list
          setItems(AppStore.getMenuItems());
          setActiveSubTab('suggestions');
        }}
      />
    </div>
  );
};
