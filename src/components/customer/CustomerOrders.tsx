import React, { useState, useMemo, useEffect } from 'react';
import { CustomerAccount, Order, StoreSettings, CartItem, MenuItem } from '../../types';
import { AppStore } from '../../services/store';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChefHat,
  RotateCcw,
  Search,
  Printer,
  Sparkles,
  ArrowRight,
  Receipt,
  Utensils,
  Store,
  Calendar,
  CreditCard,
  ChevronRight,
} from 'lucide-react';

interface CustomerOrdersProps {
  customer: CustomerAccount | null;
  settings: StoreSettings;
  onNavigateMenu: () => void;
  onRequireLogin: () => void;
  onViewReceipt: (order: Order) => void;
  onViewReviewStatus: (order: Order) => void;
  onAddToCart?: (item: MenuItem) => void;
}

export const CustomerOrders: React.FC<CustomerOrdersProps> = ({
  customer,
  settings,
  onNavigateMenu,
  onRequireLogin,
  onViewReceipt,
  onViewReviewStatus,
  onAddToCart,
}) => {
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');
  const [now, setNow] = useState(Date.now());

  // Listen to live store updates & tick every 10s for live timers
  useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setOrders(AppStore.getOrders());
    });
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  // Filter orders for active customer or searched order
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // If logged in, filter by customer id or customer name
    if (customer) {
      result = result.filter(
        (o) =>
          o.customerId === customer.id ||
          (o.customerName && o.customerName.toLowerCase() === customer.fullName.toLowerCase())
      );
    }

    // Apply text search if entered
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          o.items.some((i) => i.name.toLowerCase().includes(q)) ||
          (o.tableNumber && `table ${o.tableNumber}`.includes(q))
      );
    }

    // Tab filter
    if (filterTab === 'active') {
      result = result.filter(
        (o) =>
          o.status === 'to_confirm' ||
          o.status === 'pending' ||
          o.status === 'to_prep' ||
          o.status === 'processing' ||
          o.status === 'to_serve'
      );
    } else if (filterTab === 'completed') {
      result = result.filter((o) => o.status === 'completed');
    }

    // Sort newest first
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [orders, customer, searchQuery, filterTab]);

  const activeCount = useMemo(() => {
    const isActiveStatus = (st: string) =>
      st === 'to_confirm' || st === 'pending' || st === 'to_prep' || st === 'processing' || st === 'to_serve';
    const base = customer
      ? orders.filter(
          (o) =>
            (o.customerId === customer.id ||
              (o.customerName && o.customerName.toLowerCase() === customer.fullName.toLowerCase())) &&
            isActiveStatus(o.status)
        )
      : orders.filter((o) => isActiveStatus(o.status));
    return base.length;
  }, [orders, customer]);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'to_confirm':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 border border-rose-300/80 px-3 py-1 text-xs font-extrabold text-rose-900 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>To Confirm (Cashier Review)</span>
          </span>
        );
      case 'to_prep':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300/80 px-3 py-1 text-xs font-extrabold text-amber-900 shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
            <span>Confirmed • Sent to Kitchen</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 border border-sky-300/80 px-3 py-1 text-xs font-extrabold text-sky-900 shadow-2xs">
            <ChefHat className="h-3.5 w-3.5 text-sky-600 animate-bounce" />
            <span>Kitchen Preparing</span>
          </span>
        );
      case 'to_serve':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300/80 px-3 py-1 text-xs font-extrabold text-emerald-950 shadow-2xs animate-pulse">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Ready to Serve / Pick Up!</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 border border-rose-300/80 px-3 py-1 text-xs font-bold text-rose-800">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>Cancelled / Voided</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getStepProgress = (status: Order['status']) => {
    const steps = [
      { key: 'placed', label: 'Placed' },
      { key: 'confirm', label: 'To Prep' },
      { key: 'prep', label: 'Processing' },
      { key: 'ready', label: 'To Serve' },
    ];

    let activeStepIdx = 0;
    if (status === 'to_confirm' || status === 'pending') activeStepIdx = 0;
    else if (status === 'to_prep') activeStepIdx = 1;
    else if (status === 'processing') activeStepIdx = 2;
    else if (status === 'to_serve' || status === 'completed') activeStepIdx = 3;
    else if (status === 'cancelled') activeStepIdx = 0;

    return (
      <div className="pt-2 pb-1">
        <div className="grid grid-cols-4 gap-2 relative">
          {steps.map((st, idx) => {
            const isDone = idx < activeStepIdx || (status === 'completed' && idx === 3);
            const isCurrent = idx === activeStepIdx && status !== 'completed' && status !== 'cancelled';
            return (
              <div key={st.key} className="flex flex-col items-center text-center">
                <div
                  className={`h-2 w-full rounded-full transition-all duration-300 mb-1.5 ${
                    isDone
                      ? 'bg-emerald-500'
                      : isCurrent
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-stone-200'
                  }`}
                />
                <span
                  className={`text-[10px] sm:text-[11px] font-bold ${
                    isCurrent
                      ? 'text-amber-800'
                      : isDone
                      ? 'text-emerald-800'
                      : 'text-stone-400'
                  }`}
                >
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Guest Notice if not logged in */}
      {!customer && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-extrabold text-stone-900">Browsing as Guest</p>
              <p className="text-[11px] text-stone-600">
                You can view recent orders or search for your ticket number below. Sign in to link orders to your account profile.
              </p>
            </div>
          </div>
          <button
            onClick={onRequireLogin}
            className="text-xs font-extrabold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
          >
            Sign In Now
          </button>
        </div>
      )}

      {/* Search & Tabs Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterTab('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              filterTab === 'all'
                ? 'bg-stone-900 text-amber-400 font-extrabold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            All Orders ({filteredOrders.length})
          </button>
          <button
            onClick={() => setFilterTab('active')}
            className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              filterTab === 'active'
                ? 'bg-stone-900 text-amber-400 font-extrabold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <span>In-Progress</span>
            {activeCount > 0 && (
              <span className="rounded-full bg-amber-500 text-stone-950 text-[10px] font-black px-1.5 py-0.2">
                {activeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              filterTab === 'completed'
                ? 'bg-stone-900 text-amber-400 font-extrabold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Completed / Past
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order # or item name..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-3.5 py-1.5 text-xs font-medium text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-4 shadow-2xs">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-stone-900 font-display">No Orders Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {searchQuery
                ? `No orders matching "${searchQuery}". Try a different ticket number.`
                : filterTab === 'active'
                ? 'You do not have any active orders being prepared right now.'
                : 'You haven’t placed any orders yet. Discover our specialty coffees and handcrafted beverages!'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onNavigateMenu}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-stone-950 hover:bg-amber-400 transition shadow-sm cursor-pointer"
            >
              <Utensils className="h-4 w-4" />
              <span>Browse Menu &amp; Place Order</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((ord) => {
            const isPending = ord.status === 'pending';
            const isProcessing = ord.status === 'processing';
            const isCompleted = ord.status === 'completed';
            const dateStr = new Date(ord.createdAt).toLocaleString('en-PH', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <div
                key={ord.id}
                className={`rounded-3xl border bg-white p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                  isPending
                    ? 'border-amber-300 ring-2 ring-amber-400/20'
                    : isProcessing
                    ? 'border-sky-300 ring-2 ring-sky-400/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Top Row: Ticket Number, Date, Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-black text-stone-900 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-lg">
                        {ord.orderNumber}
                      </span>
                      {ord.orderClassification === 'live_in_house' || ord.tableNumber ? (
                        <span className="rounded-md bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-950 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          <span>Live In-House Table #{ord.tableNumber || 1}</span>
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-500/15 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-950 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-amber-700" />
                          <span>Advance Booking</span>
                        </span>
                      )}
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700 capitalize">
                        {ord.orderType.replace('_', ' ')}
                      </span>
                    </div>
                    {ord.advanceBooking && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-amber-900 font-bold bg-amber-50 rounded-lg px-2.5 py-1 border border-amber-200/80 w-fit">
                        <span>📅 {ord.advanceBooking.bookingDate} at {ord.advanceBooking.arrivalTime}</span>
                        {ord.advanceBooking.partySize && (
                          <span>• 👥 {ord.advanceBooking.partySize} Guests</span>
                        )}
                        {ord.advanceBooking.seatingPreference && (
                          <span className="capitalize">• 🪑 {ord.advanceBooking.seatingPreference.replace('_', ' ')}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Clock className="h-3.5 w-3.5 text-stone-400" />
                      <span>Placed on {dateStr}</span>
                      {ord.customerName && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-stone-700">
                            {ord.customerName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">{getStatusBadge(ord.status)}</div>
                </div>

                {/* Live Progress Bar for Active/Pending Orders */}
                {!isCompleted && ord.status !== 'cancelled' && getStepProgress(ord.status)}

                {/* Items Summary */}
                <div className="space-y-2 rounded-2xl bg-stone-50/80 p-4 border border-stone-100">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-1">
                    Ordered Items ({ord.items.reduce((s, i) => s + i.quantity, 0)})
                  </div>
                  <div className="space-y-2 divide-y divide-stone-200/60">
                    {ord.items.map((it, idx) => {
                      const variantName =
                        typeof it.selectedVariant === 'string'
                          ? it.selectedVariant
                          : it.selectedVariant?.name;

                      return (
                        <div
                          key={idx}
                          className={`flex items-start justify-between gap-3 text-xs ${
                            idx > 0 ? 'pt-2' : ''
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-stone-800 flex items-center gap-1.5 flex-wrap">
                              <span className="rounded-md bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 text-[10px]">
                                {it.quantity}x
                              </span>
                              <span>{it.name}</span>
                              {variantName && (
                                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-amber-100/80 text-amber-800">
                                  {variantName}
                                </span>
                              )}
                            </div>
                            {it.specialInstructions && (
                              <p className="text-[11px] text-stone-500 italic pl-6">
                                Note: "{it.specialInstructions}"
                              </p>
                            )}
                          </div>
                          <span className="font-bold text-stone-900 font-mono shrink-0">
                            ₱{(it.totalPrice || it.unitPrice * it.quantity || 0).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Row: Total Amount, Payment Method, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Total Amount</span>
                      <span className="font-display text-lg font-extrabold text-stone-900">
                        ₱{ord.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-7 w-px bg-stone-200" />
                    <div>
                      <span className="text-stone-400 block text-[10px]">Payment Method</span>
                      <span className="font-bold text-stone-700 uppercase flex items-center gap-1">
                        <CreditCard className="h-3 w-3 text-stone-400" />
                        {ord.paymentMethod || 'Cash'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isPending ? (
                      <button
                        onClick={() => onViewReviewStatus(ord)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-stone-950 transition shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Clock className="h-3.5 w-3.5 text-stone-950" />
                        <span>Track Review Status</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onViewReceipt(ord)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-3.5 py-2 text-xs font-bold text-stone-800 transition cursor-pointer active:scale-95"
                      >
                        <Printer className="h-3.5 w-3.5 text-stone-600" />
                        <span>View Official Receipt</span>
                      </button>
                    )}

                    <button
                      onClick={onNavigateMenu}
                      className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Order Again</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
