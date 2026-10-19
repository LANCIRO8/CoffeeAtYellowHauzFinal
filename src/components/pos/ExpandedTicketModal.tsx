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
  Timer,
  CreditCard,
  Banknote,
  QrCode,
  Undo2,
  Sparkles,
} from 'lucide-react';
import { Order, User, OrderStatus } from '../../types';
import { AppStore, isDrinkOrderItem, getOrderFulfillmentBreakdown } from '../../services/store';

interface ExpandedTicketModalProps {
  order: Order;
  activeStaff: User;
  onClose: () => void;
  onViewReceipt: (order: Order) => void;
  onUpdateStatus: (orderId: number, nextStatus: OrderStatus) => void;
  onToggleItemServed: (orderId: number, itemIndex: number, unitIndex?: number) => void;
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
  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const menuItems = AppStore.getMenuItems();
  const tables = AppStore.getTables();
  const matchedTable = order.tableNumber
    ? tables.find((t) => t.tableNumber === order.tableNumber)
    : null;
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

  const totalUnitsCount = order.items.reduce((acc, it) => acc + (it.quantity || 1), 0);
  const servedUnitsCount = order.items.reduce((acc, it) => {
    const qty = it.quantity || 1;
    const s = it.servedUnits !== undefined ? it.servedUnits : it.isServed ? qty : 0;
    return acc + Math.min(qty, Math.max(0, s));
  }, 0);
  const allItemsServed = totalUnitsCount > 0 && servedUnitsCount >= totalUnitsCount;
  const servedCount = servedUnitsCount;

  const isServedAndPaid =
    order.paymentStatus === 'paid' &&
    (order.status === 'to_serve' || order.status === 'completed' || allItemsServed);
  const isHideCheckboxes = isServedAndPaid || isCompleted;

  // Calculate order timings identical to TicketManagement
  const createdTime = new Date(order.createdAt).getTime();
  const processingTime = order.processingStartedAt
    ? new Date(order.processingStartedAt).getTime()
    : null;
  const readyTime = order.readyToServeAt ? new Date(order.readyToServeAt).getTime() : null;
  const completedTime = order.completedAt ? new Date(order.completedAt).getTime() : null;

  let pendingDurationMs = 0;
  let processingDurationMs = 0;
  let totalWaitDurationMs = 0;

  if (isToConfirm || isToPrep) {
    pendingDurationMs = Math.max(0, now - createdTime);
    processingDurationMs = 0;
    totalWaitDurationMs = pendingDurationMs;
  } else if (isProcessing) {
    const prepStart = processingTime || createdTime;
    pendingDurationMs = Math.max(0, prepStart - createdTime);
    processingDurationMs = Math.max(0, now - prepStart);
    totalWaitDurationMs = Math.max(0, now - createdTime);
  } else if (isToServe) {
    const prepStart = processingTime || createdTime;
    const readyAt = readyTime || now;
    pendingDurationMs = Math.max(0, prepStart - createdTime);
    processingDurationMs = Math.max(0, readyAt - prepStart);
    totalWaitDurationMs = Math.max(0, now - createdTime);
  } else if (isCompleted) {
    const end = completedTime || now;
    const prepStart = processingTime || createdTime;
    pendingDurationMs = Math.max(0, prepStart - createdTime);
    processingDurationMs = Math.max(0, (readyTime || end) - prepStart);
    totalWaitDurationMs = Math.max(0, end - createdTime);
  } else {
    totalWaitDurationMs = Math.max(0, (completedTime || now) - createdTime);
  }

  const MAX_TICKET_TIMER_MS = 40 * 60 * 1000;
  const isActive = !isCompleted && !isCancelled;
  const isOverdue = isActive && totalWaitDurationMs >= MAX_TICKET_TIMER_MS;
  const isPriority = isActive && totalWaitDurationMs >= 30 * 60 * 1000 && !isOverdue;
  const isReminder = isActive && totalWaitDurationMs >= 15 * 60 * 1000 && !isPriority && !isOverdue;

  // Cap displayed durations at 40 minutes max per requirements
  totalWaitDurationMs = Math.min(totalWaitDurationMs, MAX_TICKET_TIMER_MS);
  pendingDurationMs = Math.min(pendingDurationMs, MAX_TICKET_TIMER_MS);
  processingDurationMs = Math.min(processingDurationMs, MAX_TICKET_TIMER_MS);

  const timerLabel = isOverdue
    ? 'Overdue'
    : isPriority
    ? 'Priority'
    : isReminder
    ? 'Reminder'
    : 'Normal';

  const renderPaymentBadge = () => {
    if (order.paymentStatus === 'nyp') {
      return (
        <span
          title="Not Yet Paid (Collect payment at cashier)"
          className="inline-flex items-center gap-0.5 sm:gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide bg-amber-500/15 border border-amber-500 text-amber-950 dark:text-amber-200 animate-pulse"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-600 dark:bg-amber-400" />
          <span>NYP</span>
        </span>
      );
    }
    return (
      <span
        title="Payment completed (Paid)"
        className="inline-flex items-center gap-0.5 sm:gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide bg-emerald-500/15 border border-emerald-500 text-emerald-950 dark:text-emerald-300"
      >
        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-700 dark:text-emerald-400 stroke-[3]" />
        <span>Paid</span>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 bg-stone-950/75 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-stone-900 shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Focus Ticket Top Header Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-900/90 px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] sm:text-xs px-2.5 py-0.5 uppercase tracking-wider shadow-xs">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
              <span>Focus Ticket</span>
            </span>
            <span
              id="expanded-ticket-title"
              className="font-mono text-sm sm:text-base font-black text-stone-950 dark:text-stone-50 tracking-tight"
            >
              #{order.orderNumber}
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium hidden sm:inline">
              • Active Ticket View
            </span>
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
              title="Close focus view (Esc)"
              className="grid h-8 w-8 place-items-center rounded-xl text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Ticket View Container */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 space-y-4">
          {/* Authentic Order Ticket Card matching Order Tickets */}
          <div
            className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border bg-white dark:bg-stone-900 p-3.5 sm:p-5 md:p-6 shadow-sm transition ${
              allItemsServed && !isCompleted && !isCancelled
                ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/25 bg-linear-to-b from-emerald-50/20 to-white dark:from-emerald-950/25 dark:to-stone-900'
                : isToServe
                ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20 bg-linear-to-b from-emerald-50/20 to-white dark:from-emerald-950/20 dark:to-stone-900'
                : isOverdue
                ? 'border-red-600 dark:border-red-500 ring-4 ring-red-600/40 bg-red-50/25 dark:bg-red-950/20 animate-pulse'
                : isPriority
                ? 'border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/30 bg-rose-50/15 dark:bg-rose-950/15'
                : isReminder
                ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-500/25 bg-amber-50/15 dark:bg-amber-950/15'
                : isToConfirm
                ? 'border-rose-300 dark:border-rose-700/60 ring-1 ring-rose-500/10'
                : isToPrep
                ? 'border-amber-300 dark:border-amber-700/60 ring-1 ring-amber-500/10'
                : isProcessing
                ? 'border-sky-300 dark:border-sky-700/60 ring-1 ring-sky-500/10'
                : 'border-stone-200/80 dark:border-stone-800'
            }`}
          >
            <div>
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5 sm:pb-3 gap-1 flex-wrap">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                  <span className="font-mono text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 truncate">
                    #{order.orderNumber}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-stone-600 dark:text-stone-400 font-semibold shrink-0">
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {/* Channel badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide shrink-0 ${
                      isOnline
                        ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-300 border border-amber-400 dark:border-amber-800'
                    }`}
                  >
                    {isOnline ? (
                      <>
                        <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.4]" />
                        <span>Online</span>
                      </>
                    ) : (
                      <>
                        <Store className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.4]" />
                        <span>In-Store</span>
                      </>
                    )}
                  </span>

                  {/* Order Type badge */}
                  <span className="rounded-md bg-stone-200/80 dark:bg-stone-800 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-stone-800 dark:text-stone-200 capitalize shrink-0">
                    {order.orderType.replace('_', ' ')}
                  </span>

                  {/* Table Badge if applicable */}
                  {order.tableNumber && (
                    <span className="rounded-md bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-400/50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black shrink-0">
                      Table #{order.tableNumber}{' '}
                      {matchedTable?.areaName ? `(${matchedTable.areaName})` : ''}
                    </span>
                  )}

                  {/* Ticket Timer Status Badge */}
                  {!isCompleted && !isCancelled && (
                    <span
                      title={
                        isOverdue
                          ? `Overdue: ${formatDuration(totalWaitDurationMs)} (40 mins max reached)`
                          : isPriority
                          ? `Priority: ${formatDuration(totalWaitDurationMs)} (exceeded 30 mins)`
                          : isReminder
                          ? `Reminder: ${formatDuration(totalWaitDurationMs)} (exceeded 15 mins)`
                          : `Wait timer: ${formatDuration(totalWaitDurationMs)}`
                      }
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide shrink-0 ${
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
                          <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.8]" />
                          <span>Overdue</span>
                        </>
                      ) : isPriority ? (
                        <>
                          <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.5]" />
                          <span>Priority</span>
                        </>
                      ) : isReminder ? (
                        <>
                          <Timer className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.5]" />
                          <span>Reminder</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>{formatDuration(totalWaitDurationMs)}</span>
                        </>
                      )}
                      {(isOverdue || isPriority || isReminder) && (
                        <span className="font-mono text-[9px] sm:text-[10px] opacity-95">
                          {formatDuration(totalWaitDurationMs)}
                        </span>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {renderPaymentBadge()}
                </div>
              </div>

              {/* Time Spent & State Indicator Banner */}
              <div className="mt-2.5 sm:mt-3">
                {/* Customer Cancellation Requested Alert Banner */}
                {order.cancellationRequested && !isCancelled && (
                  <div className="mb-2.5 rounded-xl sm:rounded-2xl border-2 border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 p-2.5 sm:p-3 text-rose-950 dark:text-rose-200 shadow-xs animate-in fade-in-0 duration-150">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <div className="grid h-6 w-6 place-items-center rounded-lg bg-rose-600 text-white shrink-0 animate-pulse mt-0.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-rose-900 dark:text-rose-300 block">
                            Customer Requested Cancellation
                          </span>
                          <p className="text-[10px] sm:text-[11px] font-semibold text-rose-800 dark:text-rose-400 leading-tight mt-0.5">
                            Reason: {order.cancellationReason || 'Customer requested'}
                            {order.cancellationNotes ? ` — "${order.cancellationNotes}"` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Quick Action Buttons for Cancellation */}
                    {!isBarista && !isCook && (
                      <div className="mt-2 flex items-center gap-2 pt-2 border-t border-rose-200 dark:border-rose-800/80">
                        <button
                          type="button"
                          onClick={() => onApproveCancellation(order)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white py-1.5 px-2.5 text-[10px] sm:text-xs font-black transition active:scale-95 cursor-pointer shadow-2xs"
                          title="Approve customer cancellation and void ticket"
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                          <span>Approve &amp; Void</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeclineCancellation(order)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 py-1.5 px-2.5 text-[10px] sm:text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                          title="Decline request and notify customer"
                        >
                          <X className="h-3 w-3" />
                          <span>Decline Request</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isToConfirm && (
                  <div className="space-y-1.5 sm:space-y-2">
                    {order.returnReason && (
                      <div className="rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 flex items-start gap-1.5 shadow-2xs">
                        <div className="grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-md sm:rounded-lg bg-amber-500 text-stone-950 shrink-0 mt-0.5">
                          <Undo2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </div>
                        <div className="min-w-0 text-[10px] sm:text-xs flex-1">
                          <span className="font-extrabold text-amber-900 dark:text-amber-300 block uppercase text-[9px] sm:text-[10px]">
                            Returned to Cashier
                          </span>
                          <p className="text-amber-800 dark:text-amber-400 text-[10px] sm:text-[11px] font-medium mt-0.5 line-clamp-2">
                            "{order.returnReason}"
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border bg-rose-50/80 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200 flex items-center justify-between gap-1.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="grid h-5 w-5 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl bg-rose-600 text-white shrink-0 animate-pulse">
                          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide text-rose-900 dark:text-rose-300 block truncate">
                            Self-Order
                          </span>
                          <span className="text-[9px] sm:text-[11px] font-medium text-rose-800 dark:text-rose-400 block truncate">
                            Review needed
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-[10px] sm:text-xs font-mono font-bold text-rose-900 dark:text-rose-300 shrink-0">
                        {formatDuration(pendingDurationMs)}
                      </div>
                    </div>
                  </div>
                )}

                {isToPrep && (
                  <div
                    className={`rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border flex items-center justify-between gap-1.5 shadow-2xs ${
                      isOverdue
                        ? 'bg-red-100 dark:bg-red-950/80 border-red-500 text-red-950 dark:text-red-100'
                        : isPriority
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                        : isReminder
                        ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-700 text-amber-950 dark:text-amber-200'
                        : 'bg-amber-50/70 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className={`grid h-5 w-5 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl shrink-0 ${
                          isOverdue
                            ? 'bg-red-600 text-white animate-bounce'
                            : isPriority
                            ? 'bg-rose-600 text-white animate-bounce'
                            : isReminder
                            ? 'bg-amber-500 text-stone-950 animate-pulse'
                            : 'bg-amber-400 text-stone-950'
                        }`}
                      >
                        {isOverdue ? (
                          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 stroke-[2.8]" />
                        ) : isPriority ? (
                          <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <Timer className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide truncate ${
                              isOverdue
                                ? 'text-red-900 dark:text-red-300'
                                : isPriority
                                ? 'text-rose-900 dark:text-rose-300'
                                : 'text-amber-900 dark:text-amber-300'
                            }`}
                          >
                            {isOverdue
                              ? 'Overdue (40m Max Exceeded)'
                              : isPriority
                              ? 'Priority (30m+ Wait)'
                              : isReminder
                              ? 'Reminder (15m+ Wait)'
                              : 'Ready for Prep'}
                          </span>
                        </div>
                        <div className="text-[9px] sm:text-[11px] text-stone-600 dark:text-stone-400 truncate">
                          {isOverdue
                            ? 'Exceeded 40m max • Immediate action'
                            : isPriority
                            ? 'Exceeded 30m • High priority'
                            : isReminder
                            ? 'Exceeded 15m • Prep soon'
                            : 'Press Start Prep'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono text-[10px] sm:text-xs font-black ${
                          isOverdue
                            ? 'text-red-900 dark:text-red-300'
                            : isPriority
                            ? 'text-rose-900 dark:text-rose-300'
                            : 'text-amber-900 dark:text-amber-300'
                        }`}
                      >
                        {formatDuration(pendingDurationMs)}
                      </div>
                    </div>
                  </div>
                )}

                {isProcessing && (
                  <div
                    className={`rounded-xl sm:rounded-2xl p-2 sm:p-2.5 border space-y-1 shadow-2xs ${
                      isOverdue
                        ? 'bg-red-50/90 dark:bg-red-950/70 border-red-400 dark:border-red-700 text-red-950 dark:text-red-200'
                        : isPriority
                        ? 'bg-rose-50/80 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                        : isReminder
                        ? 'bg-amber-50/80 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                        : 'bg-sky-50/90 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800 text-sky-950 dark:text-sky-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] sm:text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`grid h-4 w-4 sm:h-5 sm:w-5 place-items-center rounded-md text-white shrink-0 ${
                            isOverdue
                              ? 'bg-red-600 animate-pulse'
                              : isPriority
                              ? 'bg-rose-600'
                              : 'bg-sky-600 animate-spin'
                          }`}
                        >
                          {isOverdue ? (
                            <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          ) : (
                            <ChefHat className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          )}
                        </span>
                        <span
                          className={`text-[9px] sm:text-[11px] font-bold truncate ${
                            isOverdue
                              ? 'text-red-900 dark:text-red-300'
                              : isPriority
                              ? 'text-rose-900 dark:text-rose-300'
                              : 'text-sky-900 dark:text-sky-300'
                          }`}
                        >
                          {isCook ? 'Cooking:' : 'Preparing:'}
                        </span>
                        {(isOverdue || isPriority || isReminder) && (
                          <span
                            className={`rounded-sm px-1 py-0.2 text-[8px] font-black uppercase ${
                              isOverdue
                                ? 'bg-red-600 text-white'
                                : isPriority
                                ? 'bg-rose-500 text-white'
                                : 'bg-amber-400 text-stone-950'
                            }`}
                          >
                            {timerLabel}
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-mono text-[10px] sm:text-xs font-black shrink-0 ${
                          isOverdue
                            ? 'text-red-800 dark:text-red-300'
                            : isPriority
                            ? 'text-rose-800 dark:text-rose-300'
                            : 'text-sky-800 dark:text-sky-300'
                        }`}
                      >
                        {formatDuration(processingDurationMs)}
                      </span>
                    </div>
                  </div>
                )}

                {isToServe && (
                  <div className="rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-2 sm:p-2.5 text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-1.5 shadow-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="grid h-5 w-5 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl bg-emerald-600 text-white shrink-0">
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 stroke-[3]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide text-emerald-900 dark:text-emerald-300 block truncate">
                          Served
                        </span>
                        <span className="text-[9px] sm:text-[11px] font-medium text-emerald-800 dark:text-emerald-400 block truncate">
                          All items checked &amp; served
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono text-[10px] sm:text-xs font-black text-emerald-950 dark:text-emerald-200">
                      {formatDuration(totalWaitDurationMs)}
                    </div>
                  </div>
                )}

                {isCompleted && (
                  <div className="rounded-xl sm:rounded-2xl bg-stone-50 dark:bg-stone-800/80 p-2 sm:p-2.5 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 flex items-center justify-between gap-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-md sm:rounded-lg bg-emerald-600 text-white shrink-0">
                        <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide text-stone-800 dark:text-stone-200 block truncate">
                          Completed
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px] sm:text-xs font-bold text-stone-900 dark:text-stone-100 shrink-0">
                      {formatDuration(totalWaitDurationMs)}
                    </div>
                  </div>
                )}

                {isCancelled && (
                  <div className="rounded-xl sm:rounded-2xl bg-rose-50/80 dark:bg-rose-950/60 p-2 sm:p-2.5 border border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200 space-y-1 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-rose-900 dark:text-rose-300">
                      <span className="flex items-center gap-1">
                        <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-600 dark:text-rose-400" />
                        <span>Voided</span>
                      </span>
                      <span className="font-mono text-[9px] sm:text-[10px] text-rose-700 dark:text-rose-400">
                        {formatDuration(totalWaitDurationMs)}
                      </span>
                    </div>
                    {order.cancelReason && (
                      <div className="text-[9px] sm:text-[11px] font-semibold text-rose-900 dark:text-rose-300 line-clamp-1">
                        {order.cancelReason}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Customer & Dining Context */}
              <div className="mt-2.5 sm:mt-3 space-y-1.5 text-[10px] sm:text-xs">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-semibold text-stone-900 dark:text-stone-100 truncate">
                    <UserIcon className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">
                      {order.customerName || (isOnline ? 'Online Guest' : 'Walk-in')}
                    </span>
                    {order.customerPhone && (
                      <span className="text-stone-500 text-[10px] hidden sm:inline">
                        • {order.customerPhone}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {allItemsServed && (
                      <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-0.5">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                        <span>All Served</span>
                      </span>
                    )}
                    {order.orderClassification === 'live_in_house' || order.tableNumber ? (
                      <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <span>T#{order.tableNumber || 1}</span>
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-950 dark:text-amber-300 uppercase">
                        Adv
                      </span>
                    )}
                  </div>
                </div>

                {/* Optional Delivery Address */}
                {order.deliveryAddress && (
                  <div className="flex items-start gap-1 text-[10px] sm:text-[11px] text-stone-600 dark:text-stone-400">
                    <MapPin className="h-3 w-3 text-stone-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{order.deliveryAddress}</span>
                  </div>
                )}

                {/* If Advance Booking: Show Reservation Details */}
                {order.advanceBooking && (
                  <div className="rounded-lg sm:rounded-xl bg-amber-500/10 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/70 p-2 text-[10px] sm:text-[11px] text-amber-950 dark:text-amber-300 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>📅 {order.advanceBooking.arrivalTime}</span>
                      <span>👥 {order.advanceBooking.partySize || 2} Guests</span>
                    </div>
                    {order.advanceBooking.specialRequests && (
                      <p className="text-[10px] italic text-amber-800 dark:text-amber-400">
                        "{order.advanceBooking.specialRequests}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Items List with Live Served Checkboxes */}
              <div className="my-2 sm:my-3 space-y-1.5 border-y border-stone-100 dark:border-stone-800 py-2 sm:py-3 text-[10px] sm:text-xs max-h-60 sm:max-h-72 overflow-y-auto pr-0.5">
                {/* Header bar for served count & batch toggle */}
                <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-stone-100/80 dark:border-stone-800/80 text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400 font-bold">
                  <span>
                    Items ({totalUnitsCount}) •{' '}
                    <strong className="text-stone-800 dark:text-stone-200">
                      {servedUnitsCount}/{totalUnitsCount} served
                    </strong>
                  </span>
                  {totalUnitsCount > 1 && !isToConfirm && !isCancelled && !isHideCheckboxes && (
                    <button
                      type="button"
                      onClick={() => onToggleAllServed(order.id, !allItemsServed)}
                      className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-200 transition cursor-pointer"
                    >
                      {allItemsServed ? (
                        <>
                          <Square className="h-3 w-3" />
                          <span>Unserve all</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-3 w-3" />
                          <span>Serve all</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {order.items.flatMap((item, itemIdx) => {
                  const qty = Math.max(1, item.quantity || 1);
                  const currentServedUnits =
                    item.servedUnits !== undefined
                      ? item.servedUnits
                      : item.isServed
                      ? qty
                      : 0;
                  const unitPrice =
                    item.unitPrice ||
                    (item.totalPrice && qty > 0 ? item.totalPrice / qty : 0);
                  const isDrink = isDrinkOrderItem(item, menuItems);
                  const isDimmed = (isBarista && !isDrink) || (isCook && isDrink);

                  return Array.from({ length: qty }, (_, u) => {
                    const isUnitServed = u < currentServedUnits;

                    return (
                      <div
                        key={`${itemIdx}-${u}`}
                        className={`group/item flex items-start gap-2 sm:gap-2.5 py-1.5 px-2 rounded-xl transition-all ${
                          isUnitServed
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60'
                            : isDimmed
                            ? 'opacity-40 bg-stone-100/50 dark:bg-stone-800/50 border border-transparent'
                            : 'hover:bg-stone-50 dark:hover:bg-stone-800/50 border border-transparent'
                        }`}
                      >
                        {/* Served Checkbox (Hidden when ticket is served & paid or completed) */}
                        {!isHideCheckboxes && (
                          <button
                            type="button"
                            disabled={isToConfirm || isCancelled}
                            onClick={() => onToggleItemServed(order.id, itemIdx, u)}
                            title={
                              isCancelled
                                ? 'Order is cancelled'
                                : isToConfirm
                                ? 'Confirm order first before marking items as served'
                                : isUnitServed
                                ? 'Served (Click to mark unserved)'
                                : 'Click to mark item as served'
                            }
                            aria-label={`Mark ${item.name} as ${isUnitServed ? 'unserved' : 'served'}`}
                            className={`mt-0.5 shrink-0 h-6 w-6 sm:h-7 sm:w-7 rounded-xl flex items-center justify-center transition-all border-2 ${
                              isToConfirm || isCancelled
                                ? 'opacity-40 cursor-not-allowed border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-transparent'
                                : isUnitServed
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs cursor-pointer'
                                : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-transparent cursor-pointer'
                            }`}
                          >
                            {isUnitServed ? (
                              <Check className="h-4 w-4 stroke-[3]" />
                            ) : (
                              <Check className="h-3.5 w-3.5 opacity-0 group-hover/item:opacity-40 text-stone-500 transition-opacity" />
                            )}
                          </button>
                        )}

                        <div className="flex-1 pr-1 min-w-0">
                          <div className="flex items-center gap-1 font-medium text-stone-800 dark:text-stone-200 flex-wrap">
                            <span
                              className={`truncate font-semibold transition-all ${
                                isUnitServed
                                  ? 'line-through text-stone-400 dark:text-stone-500'
                                  : 'text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.name}
                            </span>
                            {isDrink ? (
                              <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 px-1 py-0.2 text-[8px] font-bold shrink-0 border border-amber-200 dark:border-amber-800/60">
                                <Coffee className="h-2 w-2 text-amber-700 dark:text-amber-400" />
                                <span>Bar</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 px-1 py-0.2 text-[8px] font-bold shrink-0 border border-emerald-200 dark:border-emerald-800/60">
                                <Utensils className="h-2 w-2 text-emerald-700 dark:text-emerald-400" />
                                <span>Kitchen</span>
                              </span>
                            )}
                          </div>
                          {item.specialInstructions && (
                            <p
                              className={`text-[8px] sm:text-[10px] italic ml-1 font-semibold line-clamp-1 transition-colors ${
                                isUnitServed
                                  ? 'text-stone-400 dark:text-stone-500 line-through'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              "{item.specialInstructions}"
                            </p>
                          )}
                        </div>

                        <span
                          className={`font-mono text-stone-600 dark:text-stone-400 shrink-0 text-[10px] sm:text-xs ${
                            isUnitServed ? 'line-through text-stone-400 dark:text-stone-500' : ''
                          }`}
                        >
                          ₱{unitPrice.toFixed(2)}
                        </span>
                      </div>
                    );
                  });
                })}
              </div>

              {/* Financial & Payment Info */}
              <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-stone-500 dark:text-stone-400 uppercase font-bold text-[9px] sm:text-[10px] flex items-center gap-1">
                    {getPaymentIcon()}
                    <span>{order.paymentMethod}</span>
                  </span>
                  {order.paymentStatus === 'nyp' ? (
                    <span className="rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-tight">
                      NYP
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-tight">
                      Paid
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                  ₱{order.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Role-Specific Status Actions */}
            {(() => {
              const hasBaristaActions =
                isBarista &&
                (order.baristaStatus === 'to_prep' ||
                  (!order.baristaStatus && (isToPrep || isProcessing)) ||
                  order.baristaStatus === 'processing' ||
                  order.baristaStatus === 'ready');
              const hasCookActions =
                isCook &&
                (order.cookStatus === 'to_prep' ||
                  (!order.cookStatus && (isToPrep || isProcessing)) ||
                  order.cookStatus === 'processing' ||
                  order.cookStatus === 'ready');
              const hasCashierActions =
                !isBarista &&
                !isCook &&
                ((order.paymentStatus === 'nyp' && !isCancelled && onReceivePayment) ||
                  isToConfirm ||
                  isToPrep ||
                  isProcessing ||
                  isToServe ||
                  (isCompleted && activeStaff.role === 'admin'));

              if (!hasBaristaActions && !hasCookActions && !hasCashierActions) {
                return null;
              }

              return (
                <div className="mt-3.5 sm:mt-5 pt-3 sm:pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end gap-1.5 sm:gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end flex-wrap">
                    {/* === BARISTA ROLE ACTIONS === */}
                    {isBarista && (
                      <>
                        {(order.baristaStatus === 'to_prep' ||
                          (!order.baristaStatus && (isToPrep || isProcessing))) && (
                          <button
                            type="button"
                            onClick={() => onUpdateBaristaStatus?.(order.id, 'processing')}
                            className="flex items-center gap-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shrink-0"
                            title="Start preparing drinks at barista bar"
                          >
                            <Coffee className="h-3.5 w-3.5" />
                            <span>Prep Drinks</span>
                          </button>
                        )}

                        {order.baristaStatus === 'processing' && (
                          <button
                            type="button"
                            onClick={() => onUpdateBaristaStatus?.(order.id, 'ready')}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shrink-0"
                            title="Complete drinks preparation"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Drinks Ready</span>
                          </button>
                        )}

                        {order.baristaStatus === 'ready' && (
                          <div className="flex items-center gap-1">
                            <span className="flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[10px] font-black text-emerald-950 dark:text-emerald-300">
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                              <span>Drinks Ready</span>
                            </span>
                            {breakdown.hasFood && order.cookStatus !== 'ready' && (
                              <span className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-1 text-[9px] font-bold text-amber-950 dark:text-amber-300">
                                Wait Kitchen
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* === COOK ROLE ACTIONS === */}
                    {isCook && (
                      <>
                        {(order.cookStatus === 'to_prep' ||
                          (!order.cookStatus && (isToPrep || isProcessing))) && (
                          <button
                            type="button"
                            onClick={() => onUpdateCookStatus?.(order.id, 'processing')}
                            className="flex items-center gap-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-1.5 text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shrink-0"
                            title="Start cooking kitchen dishes"
                          >
                            <Flame className="h-3.5 w-3.5" />
                            <span>Prep Food</span>
                          </button>
                        )}

                        {order.cookStatus === 'processing' && (
                          <button
                            type="button"
                            onClick={() => onUpdateCookStatus?.(order.id, 'ready')}
                            className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shrink-0"
                            title="Complete cooking and mark kitchen food ready"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Food Ready</span>
                          </button>
                        )}

                        {order.cookStatus === 'ready' && (
                          <div className="flex items-center gap-1">
                            <span className="flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[10px] font-black text-emerald-950 dark:text-emerald-300">
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                              <span>Food Ready</span>
                            </span>
                            {breakdown.hasDrinks && order.baristaStatus !== 'ready' && (
                              <span className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-1 text-[9px] font-bold text-amber-950 dark:text-amber-300">
                                Wait Barista
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* === CASHIER & ADMIN ACTIONS === */}
                    {!isBarista && !isCook && (
                      <>
                        {/* NYP Direct Collect Payment Button */}
                        {order.paymentStatus === 'nyp' && !isCancelled && onReceivePayment && (
                          <button
                            type="button"
                            onClick={() => onReceivePayment(order)}
                            className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3.5 py-1.5 text-xs font-black transition shadow-xs active:scale-95 cursor-pointer ring-1 ring-amber-600/30 shrink-0"
                            title={`Collect payment for ticket #${order.orderNumber}`}
                          >
                            <Banknote className="h-3.5 w-3.5 shrink-0" />
                            <span>Collect Payment</span>
                          </button>
                        )}

                        {/* 1. TO CONFIRM: Confirm & Prep, Cancel */}
                        {isToConfirm && (
                          <>
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(order.id, 'processing')}
                              className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-stone-950 transition shadow-xs active:scale-95 cursor-pointer shrink-0"
                              title="Confirm order and set to Preparing"
                            >
                              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                              <span>Confirm &amp; Prep</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenCancelModal(order)}
                              className="flex items-center gap-1 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-3 py-1.5 text-xs font-bold transition cursor-pointer shrink-0"
                              title="Cancel ticket"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>Cancel</span>
                            </button>
                          </>
                        )}

                        {/* 2. TO PREP & PROCESSING: Void only */}
                        {(isToPrep || isProcessing) && (
                          <button
                            type="button"
                            onClick={() => onOpenVoidModal(order)}
                            className="flex items-center gap-1 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0"
                            title="Void ticket"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>Void</span>
                          </button>
                        )}

                        {/* 3. SERVED (to_serve): Mark as Completed, Void */}
                        {isToServe && (
                          <>
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(order.id, 'completed')}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-extrabold text-white transition shadow-xs active:scale-95 cursor-pointer shrink-0"
                              title="All items served — click to finalize/complete order"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Complete Order</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenVoidModal(order)}
                              className="flex items-center gap-1 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer shrink-0"
                              title="Void ticket"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>Void</span>
                            </button>
                          </>
                        )}

                        {/* 4. COMPLETED: Void option for Admin */}
                        {isCompleted && activeStaff.role === 'admin' && (
                          <button
                            type="button"
                            onClick={() => onOpenVoidModal(order)}
                            className="flex items-center gap-1 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-rose-50 text-stone-700 dark:text-stone-300 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                            title="Void completed order"
                          >
                            <Ban className="h-3.5 w-3.5 text-rose-500" />
                            <span>Void</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
