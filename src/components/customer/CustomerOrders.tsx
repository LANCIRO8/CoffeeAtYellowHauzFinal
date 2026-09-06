import React, { useState, useMemo, useEffect } from 'react';
import { CustomerAccount, Order, StoreSettings, CartItem, MenuItem, TableBinding } from '../../types';
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
  Filter,
  X,
  ListFilter,
  Ban,
  AlertTriangle,
  Info,
  LogOut,
  UserCheck,
  LogIn,
  DoorOpen,
} from 'lucide-react';
import { CustomerOrderCancelModal } from './CustomerOrderCancelModal';

interface CustomerOrdersProps {
  customer: CustomerAccount | null;
  activeTableBinding?: TableBinding | null;
  onExitTable?: () => void;
  settings: StoreSettings;
  onNavigateMenu: () => void;
  onRequireLogin: () => void;
  onViewReceipt: (order: Order) => void;
  onViewReviewStatus: (order: Order) => void;
  onAddToCart?: (item: MenuItem) => void;
}

export const CustomerOrders: React.FC<CustomerOrdersProps> = ({
  customer,
  activeTableBinding,
  onExitTable,
  settings,
  onNavigateMenu,
  onRequireLogin,
  onViewReceipt,
  onViewReviewStatus,
  onAddToCart,
}) => {
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [tableBinding, setTableBinding] = useState<TableBinding | null>(
    () => (activeTableBinding !== undefined ? activeTableBinding : AppStore.getActiveTableBinding())
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');
  const [now, setNow] = useState(Date.now());
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [exitSuccessMsg, setExitSuccessMsg] = useState<string | null>(null);

  const handleWithdrawCancellation = (orderId: number) => {
    AppStore.withdrawOrderCancellation(orderId);
    setWithdrawSuccessMsg('Cancellation request withdrawn. Your order remains active.');
    setTimeout(() => setWithdrawSuccessMsg(null), 4000);
  };

  // Listen to live store updates & tick every 10s for live timers
  useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setOrders(AppStore.getOrders());
      setTableBinding(activeTableBinding !== undefined ? activeTableBinding : AppStore.getActiveTableBinding());
    });
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [activeTableBinding]);

  useEffect(() => {
    if (activeTableBinding !== undefined) {
      setTableBinding(activeTableBinding);
    }
  }, [activeTableBinding]);

  // Isolated customer visible orders (prevents shared history between different tables/guests)
  const visibleOrders = useMemo(() => {
    return AppStore.getCustomerVisibleOrders(customer, tableBinding);
  }, [orders, customer, tableBinding]);

  // Filter orders for active customer or searched order
  const filteredOrders = useMemo(() => {
    let result = [...visibleOrders];

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
  }, [visibleOrders, searchQuery, filterTab]);

  const activeCount = useMemo(() => {
    const isActiveStatus = (st: string) =>
      st === 'to_confirm' || st === 'pending' || st === 'to_prep' || st === 'processing' || st === 'to_serve';
    return visibleOrders.filter((o) => isActiveStatus(o.status)).length;
  }, [visibleOrders]);

  const handleExitTableClick = () => {
    if (!customer && visibleOrders.length > 0) {
      setShowExitConfirmModal(true);
    } else {
      handleConfirmExitTable();
    }
  };

  const handleConfirmExitTable = () => {
    const tblNum = tableBinding?.tableNumber;
    if (!customer) {
      AppStore.clearGuestTableOrders(tblNum);
    }
    if (onExitTable) {
      onExitTable();
    } else {
      AppStore.exitTable(Boolean(customer));
    }
    setTableBinding(null);
    setShowExitConfirmModal(false);
    setExitSuccessMsg(
      !customer
        ? `Exited Table ${tblNum ? `#${tblNum}` : ''}. Guest order history was cleared.`
        : `Exited Table ${tblNum ? `#${tblNum}` : ''}. Your order history is saved to your account.`
    );
    setTimeout(() => setExitSuccessMsg(null), 5000);
  };

  const getStatusBadge = (status: Order['status'], orderItem?: Order) => {
    if (orderItem?.cancellationRequested && status !== 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-900 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
          <span>Cancel Requested • Awaiting Approval</span>
        </span>
      );
    }

    switch (status) {
      case 'to_confirm':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300/80 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-900 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>To Confirm (Cashier Review)</span>
          </span>
        );
      case 'to_prep':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900 shadow-2xs">
            <Clock className="h-3 w-3 text-amber-600 animate-pulse" />
            <span>Confirmed • Sent to Kitchen</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-300/80 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-900 shadow-2xs">
            <ChefHat className="h-3 w-3 text-sky-600 animate-bounce" />
            <span>Kitchen Preparing</span>
          </span>
        );
      case 'to_serve':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300/80 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-950 shadow-2xs animate-pulse">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Ready to Serve / Pick Up!</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
            <AlertCircle className="h-3 w-3 text-rose-600" />
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
        <div className="grid grid-cols-4 gap-1.5 relative">
          {steps.map((st, idx) => {
            const isDone = idx < activeStepIdx || (status === 'completed' && idx === 3);
            const isCurrent = idx === activeStepIdx && status !== 'completed' && status !== 'cancelled';
            return (
              <div key={st.key} className="flex flex-col items-center text-center">
                <div
                  className={`h-1.5 w-full rounded-full transition-all duration-300 mb-1 ${
                    isDone
                      ? 'bg-emerald-500'
                      : isCurrent
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-stone-200'
                  }`}
                />
                <span
                  className={`text-[9px] sm:text-[10px] font-bold ${
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
    <div className="max-w-5xl mx-auto space-y-4 pb-20 text-xs">
      {/* Top Header Actions Bar */}
      <div className="flex items-center justify-between gap-2 bg-amber-500 p-2.5 sm:p-3 rounded-2xl border border-amber-400/80 shadow-2xs">
        {/* Left: Filter Modal Trigger Button */}
        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-400 px-3 py-1.5 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
          title="Filter Orders"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>
            {filterTab === 'all'
              ? 'All Orders'
              : filterTab === 'active'
              ? 'In-Progress'
              : 'Completed'}
          </span>
          {filterTab === 'active' && activeCount > 0 && (
            <span className="rounded-full bg-amber-500 text-stone-950 text-[10px] font-black px-1.5 py-0.2">
              {activeCount}
            </span>
          )}
        </button>

        {/* Right: Search Icon Toggle & Expandable Search Bar */}
        <div className="flex items-center gap-2">
          {isSearchOpen ? (
            <div className="relative flex items-center animate-in fade-in zoom-in-95 duration-150">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-stone-500 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket # or item..."
                className="w-48 sm:w-64 rounded-xl border border-stone-900/20 bg-white pl-8 pr-7 py-1.5 text-xs font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-950 shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 text-stone-500 hover:text-stone-800 cursor-pointer p-0.5"
                title="Close Search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="relative grid h-8 w-8 place-items-center rounded-xl bg-stone-950/15 hover:bg-stone-950/25 text-stone-950 transition active:scale-90 cursor-pointer"
              title="Search Orders"
            >
              <Search className="h-4 w-4" />
              {searchQuery && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-stone-950 ring-2 ring-amber-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div
          onClick={() => setIsFilterModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/20 text-amber-900">
                  <ListFilter className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-black text-stone-900 font-display">Filter Orders</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {/* Option: All Orders */}
              <button
                type="button"
                onClick={() => {
                  setFilterTab('all');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-amber-50 border-amber-400 text-stone-950 font-black'
                    : 'bg-stone-50 border-stone-200/80 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="h-4 w-4 text-stone-500" />
                  <span>All Orders</span>
                </div>
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] text-stone-700">
                  {visibleOrders.length}
                </span>
              </button>

              {/* Option: In-Progress */}
              <button
                type="button"
                onClick={() => {
                  setFilterTab('active');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  filterTab === 'active'
                    ? 'bg-amber-50 border-amber-400 text-stone-950 font-black'
                    : 'bg-stone-50 border-stone-200/80 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>In-Progress Orders</span>
                </div>
                {activeCount > 0 && (
                  <span className="rounded-full bg-amber-500 text-stone-950 px-2 py-0.5 text-[10px] font-black">
                    {activeCount}
                  </span>
                )}
              </button>

              {/* Option: Completed */}
              <button
                type="button"
                onClick={() => {
                  setFilterTab('completed');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  filterTab === 'completed'
                    ? 'bg-amber-50 border-amber-400 text-stone-950 font-black'
                    : 'bg-stone-50 border-stone-200/80 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Completed / Past Orders</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Success Notification */}
      {exitSuccessMsg && (
        <div className="rounded-xl border border-stone-300 bg-stone-100 p-3 text-xs font-bold text-stone-900 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{exitSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setExitSuccessMsg(null)}
            className="p-1 rounded-md text-stone-500 hover:text-stone-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Withdraw Success Notification */}
      {withdrawSuccessMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-bold text-emerald-900 flex items-center justify-between animate-in fade-in duration-150">
          <span>{withdrawSuccessMsg}</span>
          <button
            type="button"
            onClick={() => setWithdrawSuccessMsg(null)}
            className="p-1 rounded-md text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/60"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Session & Table Status Banner */}
      {tableBinding ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-stone-950 font-black text-sm">
                #{tableBinding.tableNumber}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-900 uppercase tracking-wide">
                    Dine-In • Table #{tableBinding.tableNumber}
                  </span>
                  {customer ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                      <UserCheck className="h-3 w-3" />
                      <span>Saved to Account ({customer.fullName})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                      <span>Guest Session</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  {customer ? (
                    <>
                      You are seated at Table #{tableBinding.tableNumber}. Your orders are permanently saved to your account.
                    </>
                  ) : (
                    <>
                      You are tracking orders for Table #{tableBinding.tableNumber}. Different tables do not share orders. If you exit this table, your guest history will be cleared. Sign up or sign in to save your history permanently.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {!customer && (
                <button
                  type="button"
                  onClick={onRequireLogin}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 text-xs font-black shadow-2xs transition active:scale-95 cursor-pointer"
                  title="Sign In to save your order history permanently"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Save to Account</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleExitTableClick}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-800 px-3 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer"
                title={customer ? 'Exit table (orders remain saved in account)' : 'Exit table (clears guest history)'}
              >
                <DoorOpen className="h-3.5 w-3.5 text-stone-500" />
                <span>Exit Table</span>
              </button>
            </div>
          </div>
        </div>
      ) : !customer ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-[11px] text-stone-700">
            <Info className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              Ordering as a guest. Different tables and guests do not share orders. Sign up or sign in to access your permanent order history across devices.
            </span>
          </div>
          <button
            type="button"
            onClick={onRequireLogin}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1 text-xs font-black shadow-2xs transition self-start sm:self-auto cursor-pointer"
          >
            <LogIn className="h-3 w-3" />
            <span>Sign In / Sign Up</span>
          </button>
        </div>
      ) : null}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 sm:p-10 text-center space-y-3 shadow-2xs">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-stone-900 font-display">No Orders Found</h3>
            <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
              {searchQuery
                ? `No orders matching "${searchQuery}". Try a different ticket number.`
                : filterTab === 'active'
                ? 'You do not have any active orders being prepared right now.'
                : !customer && tableBinding
                ? `No orders placed yet for Table #${tableBinding.tableNumber}. Different tables do not share order history.`
                : !customer
                ? 'No active orders in this session. If you recently dined at a table and exited as a guest, your temporary session was cleared. Sign in or sign up to keep a permanent record of all your orders!'
                : 'You haven’t placed any orders yet on this account. Discover our specialty coffees and handcrafted beverages!'}
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {!customer && (
              <button
                type="button"
                onClick={onRequireLogin}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-bold text-stone-900 hover:bg-amber-100 transition shadow-2xs cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5 text-amber-700" />
                <span>Sign In / Sign Up</span>
              </button>
            )}
            <button
              onClick={onNavigateMenu}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-stone-950 hover:bg-amber-400 transition shadow-xs cursor-pointer"
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>Browse Menu &amp; Place Order</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((ord) => {
            const isPending = ord.status === 'pending' || ord.status === 'to_confirm';
            const isProcessing = ord.status === 'processing' || ord.status === 'to_prep';
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
                className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-xs transition-all space-y-3 ${
                  isPending
                    ? 'border-amber-300 ring-2 ring-amber-400/20'
                    : isProcessing
                    ? 'border-sky-300 ring-2 ring-sky-400/20'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Top Row: Ticket Number, Date, Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-sm font-black text-stone-900 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-lg">
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
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-900 font-bold bg-amber-50 rounded-lg px-2 py-0.5 border border-amber-200/80 w-fit">
                        <span>📅 {ord.advanceBooking.bookingDate} at {ord.advanceBooking.arrivalTime}</span>
                        {ord.advanceBooking.partySize && (
                          <span>• 👥 {ord.advanceBooking.partySize} Guests</span>
                        )}
                        {ord.advanceBooking.seatingPreference && (
                          <span className="capitalize">• 🪑 {ord.advanceBooking.seatingPreference.replace('_', ' ')}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                      <Clock className="h-3 w-3 text-stone-400" />
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

                  <div className="flex items-center gap-2">{getStatusBadge(ord.status, ord)}</div>
                </div>

                {/* Live Progress Bar for Active/Pending Orders */}
                {!isCompleted && ord.status !== 'cancelled' && getStepProgress(ord.status)}

                {/* Cancellation Request Banner */}
                {ord.cancellationRequested && ord.status !== 'cancelled' && (
                  <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-950 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-950">
                          Cancellation Requested • Awaiting Staff / Admin Approval
                        </p>
                        <p className="text-[11px] text-rose-800">
                          Reason: <span className="font-semibold text-rose-900">"{ord.cancellationReason}"</span>
                          {ord.cancellationNotes && <span> — Note: {ord.cancellationNotes}</span>}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleWithdrawCancellation(ord.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer self-start sm:self-center shrink-0"
                    >
                      Withdraw Request
                    </button>
                  </div>
                )}

                {/* Staff declined note if any */}
                {ord.cancellationRejectedAt && !ord.cancellationRequested && ord.status !== 'cancelled' && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 flex items-start gap-2 text-[11px] text-amber-900">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Cancellation Request Declined: </span>
                      <span>{ord.cancellationRejectReason || 'Your order is already being prepared by our barista and kitchen team.'}</span>
                    </div>
                  </div>
                )}

                {/* Items Summary */}
                <div className="space-y-1.5 rounded-xl bg-stone-50/80 p-3 border border-stone-100">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 mb-1">
                    Ordered Items ({ord.items.reduce((s, i) => s + i.quantity, 0)})
                  </div>
                  <div className="space-y-1.5 divide-y divide-stone-200/60">
                    {ord.items.map((it, idx) => {
                      const variantName =
                        typeof it.selectedVariant === 'string'
                          ? it.selectedVariant
                          : it.selectedVariant?.name;

                      return (
                        <div
                          key={idx}
                          className={`flex items-start justify-between gap-2 text-xs ${
                            idx > 0 ? 'pt-1.5' : ''
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
                              <p className="text-[10px] text-stone-500 italic pl-5">
                                Note: "{it.specialInstructions}"
                              </p>
                            )}
                          </div>
                          <span className="font-bold text-stone-900 font-mono shrink-0 text-xs">
                            ₱{(it.totalPrice || it.unitPrice * it.quantity || 0).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Row: Total Amount, Payment Method, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase font-bold">Total</span>
                      <span className="font-display text-base font-extrabold text-stone-900">
                        ₱{ord.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-stone-200" />
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase font-bold">Payment</span>
                      <span className="font-bold text-stone-700 uppercase flex items-center gap-1 text-[11px]">
                        <CreditCard className="h-3 w-3 text-stone-400" />
                        {ord.paymentMethod || 'Cash'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {isPending ? (
                      <button
                        onClick={() => onViewReviewStatus(ord)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-stone-950 transition shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Clock className="h-3 w-3 text-stone-950" />
                        <span>Track Status</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onViewReceipt(ord)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-800 transition cursor-pointer active:scale-95"
                      >
                        <Printer className="h-3 w-3 text-stone-600" />
                        <span>Receipt</span>
                      </button>
                    )}

                    {/* Customer Cancel Button */}
                    {!isCompleted && ord.status !== 'cancelled' && (
                      ord.cancellationRequested ? (
                        <button
                          type="button"
                          onClick={() => handleWithdrawCancellation(ord.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-800 hover:bg-rose-100 transition cursor-pointer"
                          title="Click to withdraw cancellation request"
                        >
                          <RotateCcw className="h-3 w-3 text-rose-600" />
                          <span>Cancel Pending</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          id={`cancel-order-${ord.id}-btn`}
                          onClick={() => setCancellingOrder(ord)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer active:scale-95"
                          title="Request order cancellation"
                        >
                          <Ban className="h-3 w-3" />
                          <span>Cancel</span>
                        </button>
                      )
                    )}

                    <button
                      onClick={onNavigateMenu}
                      className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
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

      {/* Exit Table Confirmation Modal for Guests */}
      {showExitConfirmModal && tableBinding && (
        <div
          onClick={() => setShowExitConfirmModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-stone-900 font-display">
                  Exit Table #{tableBinding.tableNumber}?
                </h3>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  You are currently dining as a guest. Exiting the table will clear your order tracking and history for this visit.
                </p>
                <p className="text-[11px] text-amber-900 font-bold bg-amber-50 rounded-lg p-2 border border-amber-200">
                  Tip: If you sign up or sign in now, your orders and receipts will be saved permanently to your account!
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  onRequireLogin();
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2.5 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign Up / Sign In to Save Orders</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmExitTable}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 px-4 py-2 text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <DoorOpen className="h-4 w-4 text-rose-600" />
                <span>Exit Table &amp; Clear History</span>
              </button>
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full py-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 cursor-pointer"
              >
                Stay at Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Options Modal */}
      <CustomerOrderCancelModal
        isOpen={Boolean(cancellingOrder)}
        order={cancellingOrder}
        onClose={() => setCancellingOrder(null)}
        onSuccess={() => {
          setOrders(AppStore.getOrders());
        }}
      />
    </div>
  );
};
