import React, { useEffect } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  Globe,
  Store,
  ChefHat,
  Coffee,
  Check,
  Utensils,
  AlertCircle,
  AlertTriangle,
  Ban,
  Calendar,
  User as UserIcon,
  Phone,
  MapPin,
  Flame,
  CheckSquare,
  Square,
  Receipt,
  Timer,
  Info,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react';
import { Order, User, OrderStatus } from '../../types';
import { AppStore, isDrinkOrderItem, getOrderFulfillmentBreakdown } from '../../services/store';

interface ExpandedTicketModalProps {
  order: Order;
  activeStaff: User;
  onClose: () => void;
  onViewReceipt: (order: Order) => void;
  onUpdateStatus: (orderId: number, nextStatus: OrderStatus) => void;
  onToggleItemServed: (orderId: number, itemIndex: number) => void;
  onToggleAllServed: (orderId: number, served: boolean) => void;
  onCompleteAllSections: (orderId: number) => void;
  onUpdateBaristaStatus?: (orderId: number, status: 'to_prep' | 'processing' | 'ready') => void;
  onUpdateCookStatus?: (orderId: number, status: 'to_prep' | 'processing' | 'ready') => void;
  onOpenVoidModal: (order: Order) => void;
  onOpenCancelModal: (order: Order) => void;
  onApproveCancellation: (order: Order) => void;
  onDeclineCancellation: (order: Order) => void;
  onReceivePayment?: (order: Order) => void;
  formatDuration: (ms: number) => string;
  now: number;
}

export const ExpandedTicketModal: React.FC<ExpandedTicketModalProps> = ({
  order,
  activeStaff,
  onClose,
  onViewReceipt,
  onUpdateStatus,
  onToggleItemServed,
  onToggleAllServed,
  onCompleteAllSections,
  onUpdateBaristaStatus,
  onUpdateCookStatus,
  onOpenVoidModal,
  onOpenCancelModal,
  onApproveCancellation,
  onDeclineCancellation,
  onReceivePayment,
  formatDuration,
  now,
}) => {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const menuItems = AppStore.getMenuItems();
  const tables = AppStore.getTables();
  const matchedTable = order.tableNumber ? tables.find((t) => t.tableNumber === order.tableNumber) : null;
  const breakdown = getOrderFulfillmentBreakdown(order, menuItems);

  const isBarista = activeStaff.role === 'barista';
  const isCook = activeStaff.role === 'cook';

  const isToConfirm = order.status === 'to_confirm' || order.status === 'pending';
  const isToPrep = order.status === 'to_prep';
  const isProcessing = order.status === 'processing';
  const isToServe = order.status === 'to_serve';
  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';

  const channel = AppStore.getOrderChannel(order);
  const isOnline = channel === 'online';

  const allItemsServed = order.items.length > 0 && order.items.every((it) => it.isServed);
  const servedCount = order.items.filter((it) => it.isServed).length;

  const isServedAndPaid =
    order.paymentStatus === 'paid' &&
    (order.status === 'to_serve' || order.status === 'completed' || allItemsServed);
  const isHideCheckboxes = isServedAndPaid || isCompleted;

  const createdTime = new Date(order.createdAt).getTime();
  const totalWaitMs = Math.max(0, now - createdTime);
  const isActive = !isCompleted && !isCancelled;

  // Ticket timer rules: 15m yellow (Reminder), 30m red (Priority), 40m max (Overdue)
  const isOverdue = isActive && totalWaitMs >= 40 * 60 * 1000;
  const isPriority = isActive && totalWaitMs >= 30 * 60 * 1000 && !isOverdue;
  const isReminder = isActive && totalWaitMs >= 15 * 60 * 1000 && !isPriority && !isOverdue;

  const getStatusBadge = () => {
    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-200 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 px-3 py-1 text-xs font-bold text-stone-700 dark:text-stone-300">
          <Ban className="h-3.5 w-3.5 text-stone-500" />
          <span>Cancelled</span>
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-400 dark:border-emerald-700 px-3 py-1 text-xs font-black text-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Completed</span>
        </span>
      );
    }
    if (isToServe) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-400 dark:border-emerald-700 px-3 py-1 text-xs font-black text-emerald-950 dark:text-emerald-300 animate-pulse">
          <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 stroke-[3]" />
          <span>Served • Ready</span>
        </span>
      );
    }
    if (isProcessing || isToPrep) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 dark:bg-sky-950/70 border border-sky-400 dark:border-sky-700 px-3 py-1 text-xs font-black text-sky-950 dark:text-sky-300">
          <ChefHat className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 animate-bounce" />
          <span>Preparing</span>
        </span>
      );
    }
    if (isToConfirm) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-400 dark:border-rose-700 px-3 py-1 text-xs font-black text-rose-950 dark:text-rose-300 animate-pulse">
          <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          <span>To Confirm (Cashier Review)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 dark:bg-stone-800 px-3 py-1 text-xs font-bold text-stone-700 dark:text-stone-300">
        {order.status}
      </span>
    );
  };

  const getPaymentIcon = () => {
    switch (order.paymentMethod) {
      case 'card':
        return <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
      case 'gcash':
        return <QrCode className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />;
      default:
        return <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expanded-ticket-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900/80 px-4 sm:px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
            <span
              id="expanded-ticket-title"
              className="font-mono text-base sm:text-lg font-black text-stone-950 dark:text-stone-50 tracking-tight"
            >
              #{order.orderNumber}
            </span>

            {/* Channel badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wide ${
                isOnline
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-300 border border-amber-400 dark:border-amber-800'
              }`}
            >
              {isOnline ? (
                <>
                  <Globe className="h-3 w-3 stroke-[2.4]" />
                  <span>Online Storefront</span>
                </>
              ) : (
                <>
                  <Store className="h-3 w-3 stroke-[2.4]" />
                  <span>In-Store POS</span>
                </>
              )}
            </span>

            {/* Order Type badge */}
            <span className="rounded-md bg-stone-200/80 dark:bg-stone-800 px-2 py-0.5 text-[10px] sm:text-xs font-bold text-stone-800 dark:text-stone-200 capitalize">
              {order.orderType.replace('_', ' ')}
            </span>

            {/* Table Badge if applicable */}
            {order.tableNumber && (
              <span className="rounded-md bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-400/50 px-2 py-0.5 text-[10px] sm:text-xs font-black">
                Table #{order.tableNumber} {matchedTable?.areaName ? `(${matchedTable.areaName})` : ''}
              </span>
            )}

            {/* Status badge */}
            {getStatusBadge()}

            {/* Payment status badge */}
            {order.paymentStatus === 'nyp' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-400 dark:border-amber-700 px-2.5 py-0.5 text-[10px] sm:text-xs font-black text-amber-950 dark:text-amber-300 uppercase animate-pulse">
                <span>⚠️ NYP • Unpaid</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-700 px-2.5 py-0.5 text-[10px] sm:text-xs font-black text-emerald-950 dark:text-emerald-300 uppercase">
                <Check className="h-3 w-3 stroke-[3]" />
                <span>Paid</span>
              </span>
            )}

            {/* Ticket Timer Status badge if active */}
            {isActive && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wide shrink-0 ${
                  isOverdue
                    ? 'bg-red-600 text-white animate-pulse shadow-xs ring-1 ring-red-700'
                    : isPriority
                    ? 'bg-rose-600 text-white shadow-xs'
                    : isReminder
                    ? 'bg-amber-400 dark:bg-amber-500 text-stone-950 shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                }`}
              >
                {isOverdue ? (
                  <>
                    <AlertTriangle className="h-3 w-3 stroke-[2.8]" />
                    <span>Overdue ({formatDuration(totalWaitMs)})</span>
                  </>
                ) : isPriority ? (
                  <>
                    <Flame className="h-3 w-3" />
                    <span>Priority ({formatDuration(totalWaitMs)})</span>
                  </>
                ) : isReminder ? (
                  <>
                    <Timer className="h-3 w-3 stroke-[2.5]" />
                    <span>Reminder ({formatDuration(totalWaitMs)})</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3" />
                    <span>Wait: {formatDuration(totalWaitMs)}</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onViewReceipt(order)}
              title="Print Receipt"
              className="flex items-center gap-1 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 px-2.5 py-1.5 text-xs font-bold text-stone-800 dark:text-stone-200 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
              <span className="hidden sm:inline">Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close modal"
              className="grid h-8 w-8 place-items-center rounded-xl text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Customer Cancellation Request Alert Banner */}
          {order.cancellationRequested && !isCancelled && (
            <div className="rounded-2xl border-2 border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 p-3 sm:p-4 text-rose-950 dark:text-rose-200 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-rose-900 dark:text-rose-300">
                    Customer Cancellation Request Pending Review
                  </h4>
                  <p className="text-xs font-medium text-rose-800 dark:text-rose-400 mt-1">
                    Reason: <span className="font-bold">"{order.cancellationReason || 'Customer requested'}"</span>
                    {order.cancellationNotes ? ` — Note: "${order.cancellationNotes}"` : ''}
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-500 mt-0.5">
                    Requested on: {order.cancellationRequestedAt ? new Date(order.cancellationRequestedAt).toLocaleTimeString() : 'Recently'}
                  </p>
                </div>
              </div>
              {!isBarista && !isCook && (
                <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-rose-200 dark:border-rose-800">
                  <button
                    type="button"
                    onClick={() => onDeclineCancellation(order)}
                    className="rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-stone-900 hover:bg-rose-100 text-rose-800 dark:text-rose-200 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    Decline Request
                  </button>
                  <button
                    type="button"
                    onClick={() => onApproveCancellation(order)}
                    className="flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 text-xs font-black transition cursor-pointer shadow-xs"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    <span>Approve &amp; Void Ticket</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Not Yet Paid (NYP) Alert Banner */}
          {order.paymentStatus === 'nyp' && !isCancelled && (
            <div className="rounded-2xl border-2 border-amber-400 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/60 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 shrink-0 font-black text-sm shadow-xs">
                  ⚠️
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200 block">
                    Ticket Is Not Yet Paid (NYP)
                  </span>
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold block truncate">
                    Total Due: ₱{order.totalAmount.toFixed(2)} • Customer has deferred payment
                  </span>
                </div>
              </div>
              {onReceivePayment && !isCancelled && (
                <button
                  type="button"
                  onClick={() => onReceivePayment(order)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3.5 py-1.5 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Banknote className="h-3.5 w-3.5" />
                  <span>Receive Payment</span>
                </button>
              )}
            </div>
          )}

          {/* Metadata Cards Grid: Customer, Table/Service, Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Customer Details Card */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-850 p-3 sm:p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                <UserIcon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Customer</span>
              </div>
              <p className="text-sm font-black text-stone-900 dark:text-stone-100 truncate">
                {order.customerName || (isOnline ? 'Online Customer' : 'Walk-in Guest')}
              </p>
              {order.customerPhone && (
                <div className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400">
                  <Phone className="h-3 w-3 text-stone-400" />
                  <span>{order.customerPhone}</span>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="flex items-start gap-1 text-xs text-stone-600 dark:text-stone-400 pt-0.5">
                  <MapPin className="h-3 w-3 text-stone-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{order.deliveryAddress}</span>
                </div>
              )}
              {order.guestCount && (
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                  👥 {order.guestCount} Guest{order.guestCount > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Service & Staff Card */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-850 p-3 sm:p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                <Store className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Service / Staff</span>
              </div>
              <p className="text-sm font-black text-stone-900 dark:text-stone-100 truncate">
                {order.cashierName || 'Staff Member'}
              </p>
              <div className="text-xs text-stone-600 dark:text-stone-400">
                {order.tableNumber ? (
                  <span>
                    Table: <strong className="text-stone-900 dark:text-stone-200">#{order.tableNumber}</strong>{' '}
                    {matchedTable?.areaName ? `(${matchedTable.areaName})` : ''}
                  </span>
                ) : (
                  <span>Counter / Take-Away</span>
                )}
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 capitalize">
                Type: {order.orderType.replace('_', ' ')}
              </div>
              {order.orderClassification && (
                <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                  {order.orderClassification === 'live_in_house' ? '🏠 Live In-House' : '📅 Advance Booking'}
                </div>
              )}
            </div>

            {/* Timeline & Durations Card */}
            <div
              className={`rounded-2xl border p-3 sm:p-3.5 space-y-2.5 transition ${
                isOverdue
                  ? 'border-red-500 bg-red-50/70 dark:bg-red-950/40 text-red-950 dark:text-red-100 ring-2 ring-red-500/30'
                  : isPriority
                  ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/25'
                  : isReminder
                  ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/25'
                  : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-850'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  {isOverdue ? (
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 stroke-[2.8]" />
                  ) : isPriority ? (
                    <Flame className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  ) : (
                    <Timer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  )}
                  <span>Wait Timer</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {isActive && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${
                        isOverdue
                          ? 'bg-red-600 text-white animate-pulse'
                          : isPriority
                          ? 'bg-rose-600 text-white'
                          : isReminder
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {isOverdue
                        ? 'Overdue (40m Max)'
                        : isPriority
                        ? 'Priority (30m+)'
                        : isReminder
                        ? 'Reminder (15m+)'
                        : 'Normal Wait'}
                    </span>
                  )}
                  <span className="font-mono text-xs font-black text-stone-900 dark:text-stone-100">
                    {formatDuration(totalWaitMs)}
                  </span>
                </div>
              </div>

              {/* Threshold Milestone Tracker */}
              {isActive && (
                <div className="space-y-1 pt-1.5 border-t border-stone-200/80 dark:border-stone-700/80">
                  <div className="flex justify-between text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    <span>0m</span>
                    <span
                      className={
                        totalWaitMs >= 15 * 60 * 1000
                          ? 'text-amber-700 dark:text-amber-400 font-black'
                          : ''
                      }
                    >
                      15m Reminder (Yellow)
                    </span>
                    <span
                      className={
                        totalWaitMs >= 30 * 60 * 1000
                          ? 'text-rose-700 dark:text-rose-400 font-black'
                          : ''
                      }
                    >
                      30m Priority (Red)
                    </span>
                    <span
                      className={
                        totalWaitMs >= 40 * 60 * 1000
                          ? 'text-red-700 dark:text-red-400 font-black animate-pulse'
                          : ''
                      }
                    >
                      40m Max Overdue
                    </span>
                  </div>
                  {/* Progress Bar (capped at 40m max) */}
                  <div className="h-2 w-full rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden flex">
                    {/* Segment 1: 0 - 15m (37.5%) */}
                    <div className="w-[37.5%] h-full bg-stone-300 dark:bg-stone-650 relative border-r border-white dark:border-stone-900">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, (totalWaitMs / (15 * 60 * 1000)) * 100)}%` }}
                      />
                    </div>
                    {/* Segment 2: 15 - 30m (37.5%) */}
                    <div className="w-[37.5%] h-full bg-stone-300 dark:bg-stone-650 relative border-r border-white dark:border-stone-900">
                      <div
                        className="h-full bg-amber-400"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, ((totalWaitMs - 15 * 60 * 1000) / (15 * 60 * 1000)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    {/* Segment 3: 30 - 40m (25%) */}
                    <div className="w-[25%] h-full bg-stone-300 dark:bg-stone-650 relative">
                      <div
                        className={`h-full ${isOverdue ? 'bg-red-600 animate-pulse' : 'bg-rose-500'}`}
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, ((totalWaitMs - 30 * 60 * 1000) / (10 * 60 * 1000)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1 text-[11px] text-stone-600 dark:text-stone-400 pt-1 border-t border-stone-200/60 dark:border-stone-800">
                <div className="flex justify-between">
                  <span>Ordered:</span>
                  <span className="font-medium text-stone-900 dark:text-stone-200">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {order.confirmedAt && (
                  <div className="flex justify-between">
                    <span>Confirmed:</span>
                    <span className="font-medium text-stone-900 dark:text-stone-200">
                      {new Date(order.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {order.processingStartedAt && (
                  <div className="flex justify-between">
                    <span>Prep Started:</span>
                    <span className="font-medium text-stone-900 dark:text-stone-200">
                      {new Date(order.processingStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {order.readyToServeAt && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>Served:</span>
                    <span>
                      {new Date(order.readyToServeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {order.completedAt && (
                  <div className="flex justify-between text-stone-900 dark:text-stone-200 font-bold">
                    <span>Completed:</span>
                    <span>
                      {new Date(order.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advance Booking Reservation Section if present */}
          {order.advanceBooking && (
            <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/40 p-3 sm:p-4 text-amber-950 dark:text-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                  <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>Advance Table Booking Details</span>
                </h4>
                <span className="rounded-full bg-amber-200 dark:bg-amber-900/80 px-2 py-0.5 text-[10px] font-black">
                  Scheduled
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-bold">Booking Date</span>
                  <span className="font-bold">{order.advanceBooking.bookingDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-bold">Arrival Time</span>
                  <span className="font-bold">{order.advanceBooking.arrivalTime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-bold">Party Size</span>
                  <span className="font-bold">👥 {order.advanceBooking.partySize} Guests</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block font-bold">Seating</span>
                  <span className="font-bold capitalize">{order.advanceBooking.seatingPreference?.replace('_', ' ') || 'Any Area'}</span>
                </div>
              </div>
              {order.advanceBooking.specialRequests && (
                <p className="text-xs italic bg-white/70 dark:bg-stone-900/70 p-2 rounded-xl border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200">
                  Special Request: "{order.advanceBooking.specialRequests}"
                </p>
              )}
            </div>
          )}

          {/* Order Items Table Section with Live Checkboxes */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-850 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100">
                  Ordered Items ({order.items.reduce((acc, it) => acc + it.quantity, 0)})
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                    allItemsServed
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80'
                      : servedCount > 0
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {servedCount}/{order.items.length} served
                </span>
              </div>

              {order.items.length > 1 && !isToConfirm && !isCancelled && !isHideCheckboxes && (
                <button
                  type="button"
                  onClick={() => onToggleAllServed(order.id, !allItemsServed)}
                  className="flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-300 underline underline-offset-2 transition cursor-pointer"
                  title={allItemsServed ? 'Mark all items as unserved' : 'Mark all items as served'}
                >
                  {allItemsServed ? (
                    <>
                      <Square className="h-3.5 w-3.5" />
                      <span>Unserve all items</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-3.5 w-3.5" />
                      <span>Serve all items</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {order.items.map((item, idx) => {
                const isDrink = isDrinkOrderItem(item, menuItems);
                const isDimmed = (isBarista && !isDrink) || (isCook && isDrink);
                const isServed = Boolean(item.isServed);
                const variantName =
                  typeof item.selectedVariant === 'string'
                    ? item.selectedVariant
                    : item.selectedVariant?.name;

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 sm:p-4 transition-colors ${
                      isServed
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                        : isDimmed
                        ? 'opacity-40 bg-stone-50/40 dark:bg-stone-900/40'
                        : 'hover:bg-stone-50/60 dark:hover:bg-stone-800/40'
                    }`}
                  >
                    {/* Served Checkbox (Hidden when ticket is served & paid or completed) */}
                    {!isHideCheckboxes && (
                      <button
                        type="button"
                        disabled={isToConfirm || isCancelled}
                        onClick={() => onToggleItemServed(order.id, idx)}
                        title={
                          isCancelled
                            ? 'Order is cancelled'
                            : isToConfirm
                            ? 'Confirm order first before marking items as served'
                            : isServed
                            ? 'Served (Click to mark unserved)'
                            : 'Click to mark item as served'
                        }
                        aria-label={`Mark ${item.name} as ${isServed ? 'unserved' : 'served'}`}
                        className={`mt-0.5 shrink-0 h-5 w-5 rounded-lg flex items-center justify-center transition-all border ${
                          isToConfirm || isCancelled
                            ? 'opacity-40 cursor-not-allowed border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-transparent'
                            : isServed
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs cursor-pointer'
                            : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-transparent cursor-pointer'
                        }`}
                      >
                        {isServed ? (
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        ) : (
                          <Check className="h-3 w-3 opacity-0 text-stone-500" />
                        )}
                      </button>
                    )}

                    {/* Quantity pill */}
                    <span
                      className={`font-mono text-xs font-black px-2 py-0.5 rounded-md shrink-0 ${
                        isServed
                          ? 'bg-stone-200/70 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {item.quantity}x
                    </span>

                    {/* Item details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-bold ${
                            isServed
                              ? 'line-through text-stone-400 dark:text-stone-500'
                              : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {item.name}
                        </span>

                        {variantName && (
                          <span className="rounded bg-stone-100 dark:bg-stone-800 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                            {variantName}
                          </span>
                        )}

                        {/* Station Pill */}
                        {isDrink ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-300 px-1.5 py-0.5 text-[9px] font-black border border-amber-300 dark:border-amber-800">
                            <Coffee className="h-2.5 w-2.5 text-amber-700 dark:text-amber-400" />
                            <span>Bar</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 text-[9px] font-black border border-emerald-300 dark:border-emerald-800">
                            <Utensils className="h-2.5 w-2.5 text-emerald-700 dark:text-emerald-400" />
                            <span>Kitchen</span>
                          </span>
                        )}

                        {/* Served Badge */}
                        {isServed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.2 text-[9px] font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-800">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                            <span>Served</span>
                          </span>
                        )}
                      </div>

                      {item.specialInstructions && (
                        <p
                          className={`text-[11px] italic font-medium ${
                            isServed ? 'text-stone-400 line-through' : 'text-amber-800 dark:text-amber-400'
                          }`}
                        >
                          Note: "{item.specialInstructions}"
                        </p>
                      )}

                      {isServed && item.servedAt && (
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          Served at {new Date(item.servedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {item.servedBy ? ` • By ${item.servedBy}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Price column */}
                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono text-xs sm:text-sm font-extrabold ${
                          isServed ? 'line-through text-stone-400' : 'text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        ₱{(item.totalPrice || item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                          ₱{item.unitPrice.toFixed(2)} ea
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Station Status Overview (Drinks & Kitchen) */}
          {(breakdown.hasDrinks || breakdown.hasFood) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {breakdown.hasDrinks && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-amber-950 dark:text-amber-200">
                      <Coffee className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                      <span>Barista Station ({breakdown.drinkItems.length} Drinks)</span>
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 capitalize">
                      {order.baristaStatus || 'Pending'}
                    </span>
                  </div>
                  {order.baristaCompletedAt && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      ✓ Drinks Ready at {new Date(order.baristaCompletedAt).toLocaleTimeString()} by {order.baristaCompletedBy || 'Barista'}
                    </p>
                  )}
                  {/* Quick Bar Button */}
                  {isBarista && order.baristaStatus !== 'ready' && !isCancelled && !isToConfirm && (
                    <button
                      type="button"
                      onClick={() => onUpdateBaristaStatus?.(order.id, 'ready')}
                      className="w-full flex items-center justify-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 py-1.5 text-xs font-extrabold transition cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Drinks Ready</span>
                    </button>
                  )}
                </div>
              )}

              {breakdown.hasFood && (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/30 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-emerald-950 dark:text-emerald-200">
                      <ChefHat className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      <span>Kitchen Cook Station ({breakdown.foodItems.length} Dishes)</span>
                    </span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black bg-emerald-100 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 capitalize">
                      {order.cookStatus || 'Pending'}
                    </span>
                  </div>
                  {order.cookCompletedAt && (
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                      ✓ Kitchen Food Ready at {new Date(order.cookCompletedAt).toLocaleTimeString()} by {order.cookCompletedBy || 'Cook'}
                    </p>
                  )}
                  {/* Quick Cook Button */}
                  {isCook && order.cookStatus !== 'ready' && !isCancelled && !isToConfirm && (
                    <button
                      type="button"
                      onClick={() => onUpdateCookStatus?.(order.id, 'ready')}
                      className="w-full flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 text-xs font-extrabold transition cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Food Ready</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cancellation or Void Notes if present */}
          {isCancelled && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-950 dark:text-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-300">
                <Ban className="h-4 w-4" />
                <span>Ticket Cancellation Details</span>
              </div>
              <p>Reason: <strong className="font-semibold">{order.cancelReason || 'Not specified'}</strong></p>
              {order.cancelNotes && <p>Notes: "{order.cancelNotes}"</p>}
              {order.cancelledBy && <p>Cancelled by: {order.cancelledBy}</p>}
              {order.cancelledAt && <p>Time: {new Date(order.cancelledAt).toLocaleString()}</p>}
            </div>
          )}

          {/* Payment Breakdown & Financials */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-850 p-4 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
                  {getPaymentIcon()}
                  <span className="uppercase">{order.paymentMethod}</span>
                </span>
                {order.paymentStatus === 'nyp' ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-400 dark:border-amber-700 px-2 py-0.5 text-[10px] font-black text-amber-950 dark:text-amber-300 uppercase animate-pulse">
                    ⚠️ Not Yet Paid (NYP)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-700 px-2 py-0.5 text-[10px] font-black text-emerald-950 dark:text-emerald-300 uppercase">
                    ✓ Paid
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm sm:text-base font-black text-amber-900 dark:text-amber-300">
                  Total: ₱{order.totalAmount.toFixed(2)}
                </span>
                {order.paymentStatus === 'nyp' && onReceivePayment && !isCancelled && !isBarista && !isCook && (
                  <button
                    type="button"
                    onClick={() => onReceivePayment(order)}
                    className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    <span>Collect</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-stone-600 dark:text-stone-400">
              <div>
                <span>Subtotal:</span>{' '}
                <strong className="text-stone-900 dark:text-stone-200">₱{order.subtotal.toFixed(2)}</strong>
              </div>
              {order.discountAmount > 0 && (
                <div className="text-rose-600 dark:text-rose-400">
                  <span>Discount:</span>{' '}
                  <strong>-₱{order.discountAmount.toFixed(2)}</strong>
                </div>
              )}
              <div>
                <span>Tax ({order.taxRate}%):</span>{' '}
                <strong className="text-stone-900 dark:text-stone-200">₱{order.taxAmount.toFixed(2)}</strong>
              </div>
              {order.paymentMethod === 'cash' && order.amountPaid ? (
                <div>
                  <span>Tendered / Change:</span>{' '}
                  <strong className="text-stone-900 dark:text-stone-200">
                    ₱{order.amountPaid.toFixed(2)} / ₱{(order.changeAmount || 0).toFixed(2)}
                  </strong>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Controls Bar */}
        <div className="flex items-center justify-between gap-2 border-t border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 px-4 sm:px-6 py-3.5 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750 transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onViewReceipt(order)}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 px-3.5 py-2 text-xs font-bold text-stone-800 dark:text-stone-200 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
              <span>Print Receipt</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* CASHIER / ADMIN ACTIONS */}
            {!isBarista && !isCook && (
              <>
                {order.paymentStatus === 'nyp' && onReceivePayment && !isCancelled && (
                  <button
                    type="button"
                    onClick={() => onReceivePayment(order)}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2 text-xs font-black transition cursor-pointer shadow-xs active:scale-95"
                  >
                    <Banknote className="h-4 w-4" />
                    <span>Receive Payment (₱{order.totalAmount.toFixed(2)})</span>
                  </button>
                )}

                {/* 1. TO CONFIRM: Confirm & Prep, Cancel */}
                {isToConfirm && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order.id, 'processing')}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2 text-xs font-extrabold transition cursor-pointer shadow-xs active:scale-95"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Confirm &amp; Start Prep</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenCancelModal(order)}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Cancel Ticket</span>
                    </button>
                  </>
                )}

                {/* 2. PROCESSING: Serve All, Void */}
                {(isToPrep || isProcessing) && (
                  <>
                    <button
                      type="button"
                      onClick={() => onCompleteAllSections(order.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-extrabold transition cursor-pointer shadow-xs active:scale-95"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span>Serve All Items</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenVoidModal(order)}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Void Ticket</span>
                    </button>
                  </>
                )}

                {/* 3. TO SERVE: Complete Order, Void */}
                {isToServe && (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order.id, 'completed')}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-extrabold transition cursor-pointer shadow-xs active:scale-95"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Complete Order</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenVoidModal(order)}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>Void</span>
                    </button>
                  </>
                )}

                {/* 4. COMPLETED: Void */}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={() => onOpenVoidModal(order)}
                    className="flex items-center gap-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-rose-50 text-stone-700 dark:text-stone-300 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                  >
                    <Ban className="h-3.5 w-3.5 text-rose-500" />
                    <span>Void</span>
                  </button>
                )}
              </>
            )}

            {/* BARISTA ROLE ACTIONS */}
            {isBarista && (
              <>
                {order.baristaStatus === 'to_prep' && (
                  <button
                    type="button"
                    onClick={() => onUpdateBaristaStatus?.(order.id, 'processing')}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2 text-xs font-extrabold transition cursor-pointer shadow-xs"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>Start Brewing</span>
                  </button>
                )}
                {order.baristaStatus === 'processing' && (
                  <button
                    type="button"
                    onClick={() => onUpdateBaristaStatus?.(order.id, 'ready')}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-extrabold transition cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Drinks Ready</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenVoidModal(order)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Report Issue / Void</span>
                </button>
              </>
            )}

            {/* COOK ROLE ACTIONS */}
            {isCook && (
              <>
                {order.cookStatus === 'to_prep' && (
                  <button
                    type="button"
                    onClick={() => onUpdateCookStatus?.(order.id, 'processing')}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 text-xs font-extrabold transition cursor-pointer shadow-xs"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>Start Cooking</span>
                  </button>
                )}
                {order.cookStatus === 'processing' && (
                  <button
                    type="button"
                    onClick={() => onUpdateCookStatus?.(order.id, 'ready')}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-extrabold transition cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Food Ready</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenVoidModal(order)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Report Issue / Void</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
