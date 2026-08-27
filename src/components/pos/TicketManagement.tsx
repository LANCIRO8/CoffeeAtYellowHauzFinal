import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, User, StoreSettings, OrderStatus } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  RotateCcw,
  Globe,
  Store,
  Columns,
  Layers,
  ChefHat,
  Bell,
  User as UserIcon,
  Timer,
  Flame,
  Check,
  Utensils,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Undo2,
  XCircle,
  Ban,
  X,
  ArrowLeft,
} from 'lucide-react';

interface TicketManagementProps {
  activeStaff: User;
  settings: StoreSettings;
  onViewReceipt: (order: Order) => void;
}

type ChannelTab = 'all' | 'in_store' | 'online' | 'split';

const CANCEL_REASONS = [
  'Customer Changed Mind / Left',
  'Item Out of Stock / Kitchen Issue',
  'Duplicate Ticket Placed',
  'Wrong Table / Customer Details',
  'Payment Void / GCash Dispute',
  'Preparation Error / Barista Issue',
  'Customer Complaint / Dissatisfied',
  'Other / Custom Reason',
];

const RETURN_REASONS = [
  'Customer requested modification / changes',
  'Ingredient out of stock in kitchen',
  'Need recipe or allergen clarification',
  'Customer delayed arrival / hold prep',
  'Wrong table or guest information',
  'Other custom return reason',
];

export const TicketManagement: React.FC<TicketManagementProps> = ({
  activeStaff,
  settings,
  onViewReceipt,
}) => {
  const { showAlert } = useModal();
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [channelTab, setChannelTab] = useState<ChannelTab>('all');
  const [isChannelsOpen, setIsChannelsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState<number>(() => Date.now());

  // Modals state for Void and Cancel
  const [voidingOrder, setVoidingOrder] = useState<Order | null>(null);
  const [voidReturnReason, setVoidReturnReason] = useState<string>(RETURN_REASONS[0]);
  const [voidReturnCustomNote, setVoidReturnCustomNote] = useState<string>('');

  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0]);
  const [customCancelNotes, setCustomCancelNotes] = useState<string>('');

  // Real-time ticker to update live customer wait times every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isCook = activeStaff.role === 'cook';
  const isCashier = activeStaff.role === 'cashier';
  const isAdmin = activeStaff.role === 'admin';

  const refreshOrders = () => {
    setOrders(AppStore.getOrders());
    setNow(Date.now());
  };

  const handleUpdateStatus = (orderId: number, nextStatus: OrderStatus) => {
    // Cook role validation for kitchen prep
    if (nextStatus === 'processing') {
      if (isCashier) {
        showAlert({
          title: 'Cook Action Required',
          message:
            'Only kitchen cooks can press "Start Prep" to begin food & beverage preparation. Please ask the cook or sign in as Cook.',
          type: 'warning',
        });
        return;
      }
    }

    AppStore.updateOrderStatus(orderId, nextStatus);
    refreshOrders();
  };

  const handleReturnToCashier = (order: Order) => {
    const finalReason =
      voidReturnReason === 'Other custom return reason' && voidReturnCustomNote.trim()
        ? voidReturnCustomNote.trim()
        : voidReturnCustomNote.trim()
        ? `${voidReturnReason}: ${voidReturnCustomNote.trim()}`
        : voidReturnReason;

    AppStore.updateOrderStatus(order.id, 'to_confirm', {
      returnReason: finalReason,
    });
    setVoidingOrder(null);
    setVoidReturnCustomNote('');
    refreshOrders();
    showAlert({
      title: 'Order Returned to Cashier',
      message: `Ticket #${order.orderNumber} has been returned to Cashier Review (To Confirm).`,
      type: 'success',
    });
  };

  const handleConfirmCancellation = (order: Order) => {
    const finalCancelReason = cancelReason;
    const finalNotes = customCancelNotes.trim();

    AppStore.updateOrderStatus(order.id, 'cancelled', {
      cancelReason: finalCancelReason,
      cancelNotes: finalNotes,
      cancelledBy: `${activeStaff.fullName} (${activeStaff.role})`,
    });

    setCancellingOrder(null);
    setVoidingOrder(null);
    setCustomCancelNotes('');
    refreshOrders();

    showAlert({
      title: 'Order Cancelled',
      message: `Ticket #${order.orderNumber} has been marked as cancelled. Any reserved stock has been restored to inventory.`,
      type: 'success',
    });
  };

  const handleProceedToCancelFromVoid = (order: Order) => {
    setVoidingOrder(null);
    setCancelReason(CANCEL_REASONS[0]);
    setCustomCancelNotes(voidReturnCustomNote || '');
    setCancellingOrder(order);
  };

  // Helper to categorize channel safely
  const getChannel = (order: Order): 'in_store' | 'online' => {
    return AppStore.getOrderChannel(order);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  };

  const getOrderTimings = (order: Order) => {
    const createdTime = new Date(order.createdAt).getTime();
    const processingTime = order.processingStartedAt
      ? new Date(order.processingStartedAt).getTime()
      : null;
    const readyTime = order.readyToServeAt ? new Date(order.readyToServeAt).getTime() : null;
    const completedTime = order.completedAt ? new Date(order.completedAt).getTime() : null;

    let pendingDurationMs = 0;
    let processingDurationMs = 0;
    let totalWaitDurationMs = 0;

    const isPendingOrConfirm = order.status === 'to_confirm' || order.status === 'pending';
    const isToPrep = order.status === 'to_prep';
    const isProcessing = order.status === 'processing';
    const isToServe = order.status === 'to_serve';
    const isCompleted = order.status === 'completed';

    if (isPendingOrConfirm || isToPrep) {
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

    const isUrgent =
      (isPendingOrConfirm || isToPrep || isProcessing || isToServe) &&
      totalWaitDurationMs >= 15 * 60 * 1000;
    const isWarning =
      (isPendingOrConfirm || isToPrep || isProcessing || isToServe) &&
      totalWaitDurationMs >= 8 * 60 * 1000 &&
      !isUrgent;

    return {
      pendingDurationMs,
      processingDurationMs,
      totalWaitDurationMs,
      isUrgent,
      isWarning,
    };
  };

  const inStoreOrdersAll = orders.filter((o) => getChannel(o) === 'in_store');
  const onlineOrdersAll = orders.filter((o) => getChannel(o) === 'online');
  const pendingConfirmCount = orders.filter(
    (o) => o.status === 'to_confirm' || o.status === 'pending'
  ).length;
  const toPrepCount = orders.filter((o) => o.status === 'to_prep').length;
  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const toServeCount = orders.filter((o) => o.status === 'to_serve').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  const matchesFilter = (order: Order, targetChannel?: 'in_store' | 'online') => {
    if (targetChannel && getChannel(order) !== targetChannel) return false;
    if (channelTab !== 'all' && channelTab !== 'split' && getChannel(order) !== channelTab) {
      return false;
    }

    // Role-specific status filter matching
    if (isCook) {
      if (statusFilter === 'all') {
        // Show active tickets for cook (to_prep, processing, to_serve)
        if (order.status === 'cancelled') return false;
      } else if (statusFilter === 'to_prep') {
        if (order.status !== 'to_prep') return false;
      } else if (statusFilter === 'processing') {
        if (order.status !== 'processing') return false;
      } else if (statusFilter === 'completed') {
        if (order.status !== 'to_serve' && order.status !== 'completed') return false;
      }
    } else {
      // Cashier and Admin
      if (statusFilter === 'to_confirm') {
        if (order.status !== 'to_confirm' && order.status !== 'pending') return false;
      } else if (statusFilter !== 'all') {
        if (order.status !== statusFilter) return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = order.orderNumber.toLowerCase().includes(q);
      const matchCustomer = order.customerName?.toLowerCase().includes(q);
      const matchTable = order.tableNumber ? String(order.tableNumber).includes(q) : false;
      const matchItems = order.items.some((i) => i.name.toLowerCase().includes(q));
      return matchNumber || matchCustomer || matchTable || matchItems;
    }
    return true;
  };

  const filteredOrders = orders.filter((o) => matchesFilter(o));
  const filteredInStore = orders.filter((o) => matchesFilter(o, 'in_store'));
  const filteredOnline = orders.filter((o) => matchesFilter(o, 'online'));

  // Render role-adapted status badge
  const renderStatusBadge = (order: Order) => {
    const st = order.status;
    const isToConfirm = st === 'to_confirm' || st === 'pending';
    const isToPrep = st === 'to_prep';
    const isProcessing = st === 'processing';
    const isToServe = st === 'to_serve';
    const isCompleted = st === 'completed';
    const isCancelled = st === 'cancelled';

    if (isCook) {
      if (isToPrep) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-900 animate-pulse">
            <Flame className="h-3 w-3 text-amber-600" />
            Start Prep
          </span>
        );
      }
      if (isProcessing) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-300 px-2.5 py-0.5 text-[10px] font-black text-sky-900">
            <ChefHat className="h-3 w-3 text-sky-600" />
            Processing
          </span>
        );
      }
      if (isToServe || isCompleted) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-900">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Complete
          </span>
        );
      }
      if (isToConfirm) {
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
            Awaiting Confirmation
          </span>
        );
      }
    }

    // Cashier & Admin Badges
    if (isToConfirm) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[10px] font-black text-rose-900 animate-pulse">
          <AlertCircle className="h-3 w-3 text-rose-600" />
          To Confirm
        </span>
      );
    }
    if (isToPrep) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-900">
          <Clock className="h-3 w-3 text-amber-600" />
          To Prep
        </span>
      );
    }
    if (isProcessing) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-300 px-2.5 py-0.5 text-[10px] font-black text-sky-900">
          <ChefHat className="h-3 w-3 text-sky-600" />
          Processing
        </span>
      );
    }
    if (isToServe) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black text-emerald-950 animate-bounce">
          <Bell className="h-3 w-3 text-emerald-600" />
          To Serve
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
          <Check className="h-3 w-3 text-emerald-600" />
          Completed
        </span>
      );
    }
    return (
      <span className="rounded-full bg-stone-100 border border-stone-200 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
        {order.status}
      </span>
    );
  };

  const renderOrderCard = (order: Order) => {
    const isToConfirm = order.status === 'to_confirm' || order.status === 'pending';
    const isToPrep = order.status === 'to_prep';
    const isProcessing = order.status === 'processing';
    const isToServe = order.status === 'to_serve';
    const isCompleted = order.status === 'completed';
    const isCancelled = order.status === 'cancelled';

    const channel = getChannel(order);
    const isOnline = channel === 'online';

    const { pendingDurationMs, processingDurationMs, totalWaitDurationMs, isUrgent, isWarning } =
      getOrderTimings(order);

    return (
      <div
        key={order.id}
        className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-xs transition hover:shadow-md ${
          isToServe
            ? 'border-emerald-400 ring-2 ring-emerald-500/20 bg-linear-to-b from-emerald-50/20 to-white'
            : isUrgent
            ? 'border-rose-400 ring-2 ring-rose-500/20'
            : isWarning
            ? 'border-amber-400 ring-1 ring-amber-500/20'
            : isToConfirm
            ? 'border-rose-300 ring-1 ring-rose-500/10'
            : isToPrep
            ? 'border-amber-300 ring-1 ring-amber-500/10'
            : isProcessing
            ? 'border-sky-300 ring-1 ring-sky-500/10'
            : 'border-stone-200/80'
        }`}
      >
        <div>
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-stone-900">
                {order.orderNumber}
              </span>
              <span className="text-[10px] text-stone-400">
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Channel badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                  isOnline
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                }`}
              >
                {isOnline ? (
                  <>
                    <Globe className="h-3 w-3 text-indigo-600" />
                    Online
                  </>
                ) : (
                  <>
                    <Store className="h-3 w-3 text-amber-600" />
                    In-Store
                  </>
                )}
              </span>

              {/* Role-adapted Status pill */}
              {renderStatusBadge(order)}
            </div>
          </div>

          {/* Time Spent & State Indicator Banner */}
          <div className="mt-3">
            {isToConfirm && (
              <div className="space-y-2">
                {order.returnReason && (
                  <div className="rounded-2xl p-2.5 border bg-amber-50 border-amber-300 text-amber-950 flex items-start gap-2 shadow-2xs">
                    <div className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500 text-stone-950 shrink-0 mt-0.5">
                      <Undo2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 text-xs flex-1">
                      <span className="font-extrabold text-amber-900 block uppercase text-[10px]">
                        Returned by Kitchen to Cashier
                      </span>
                      <p className="text-amber-800 text-[11px] font-medium mt-0.5">
                        "{order.returnReason}"
                      </p>
                      {order.returnedToCashierAt && (
                        <span className="text-[9px] text-amber-700/80">
                          Returned at{' '}
                          {new Date(order.returnedToCashierAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="rounded-2xl p-2.5 border bg-rose-50/80 border-rose-200 text-rose-950 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="grid h-7 w-7 place-items-center rounded-xl bg-rose-600 text-white shrink-0 animate-pulse">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-rose-900 block">
                        Customer Self-Order Placed
                      </span>
                      <span className="text-[11px] font-medium text-rose-800">
                        Cashier review &amp; confirmation required
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-mono font-bold text-rose-900 shrink-0">
                    {formatDuration(pendingDurationMs)}
                  </div>
                </div>
              </div>
            )}

            {isToPrep && (
              <div
                className={`rounded-2xl p-2.5 border flex items-center justify-between gap-2 shadow-2xs ${
                  isUrgent
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : isWarning
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`grid h-7 w-7 place-items-center rounded-xl shrink-0 ${
                      isUrgent
                        ? 'bg-rose-600 text-white animate-bounce'
                        : isWarning
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-amber-400 text-stone-950'
                    }`}
                  >
                    {isUrgent ? <Flame className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-900">
                        {isCook ? 'Ready For Cooking / Prep' : 'Queued For Kitchen'}
                      </span>
                      {isUrgent && (
                        <span className="rounded bg-rose-200 px-1 py-0.2 text-[9px] font-black text-rose-900">
                          HIGH WAIT
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-600">
                      {isCook
                        ? 'Review order & press Start Prep when ready'
                        : 'Cook should press Start Prep to proceed'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-xs font-black text-amber-900">
                    {formatDuration(pendingDurationMs)}
                  </div>
                  <span className="text-[9px] text-stone-400">Queue Time</span>
                </div>
              </div>
            )}

            {isProcessing && (
              <div
                className={`rounded-2xl p-2.5 border space-y-1.5 shadow-2xs ${
                  isUrgent
                    ? 'bg-rose-50/80 border-rose-300'
                    : 'bg-sky-50/90 border-sky-200 text-sky-950'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-sky-600 text-white animate-spin">
                      <ChefHat className="h-3 w-3" />
                    </span>
                    <span className="text-[11px] font-bold text-sky-900">
                      {isCook ? 'Active Kitchen Preparation:' : 'Cook is Cooking / Preparing:'}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black text-sky-800">
                    {formatDuration(processingDurationMs)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-sky-200/70 text-stone-600">
                  <span className="flex items-center gap-1 text-[10px]">
                    <Clock className="h-3 w-3 text-stone-400" />
                    Total Wait Time:
                  </span>
                  <span className="font-mono font-bold text-stone-900 text-xs">
                    {formatDuration(totalWaitDurationMs)}
                  </span>
                </div>
              </div>
            )}

            {isToServe && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-2.5 text-emerald-950 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-600 text-white shrink-0 animate-bounce">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-900 block">
                      Kitchen Complete — Ready to Serve!
                    </span>
                    <span className="text-[11px] font-medium text-emerald-800">
                      {isCook
                        ? 'Items completed by kitchen'
                        : 'Cook pressed complete • Ready to serve to customer'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono text-xs font-black text-emerald-950">
                  {formatDuration(totalWaitDurationMs)}
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="rounded-2xl bg-stone-50 p-2.5 border border-stone-200 text-stone-700 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-600 text-white shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-stone-800 block">
                      Order Completed &amp; Settled to Sales
                    </span>
                    <span className="font-mono text-xs font-bold text-stone-900">
                      Total Turnaround: {formatDuration(totalWaitDurationMs)}
                    </span>
                  </div>
                </div>
                <div className="text-right text-[9px] text-stone-400 font-semibold shrink-0">
                  <div>Prep: {formatDuration(processingDurationMs)}</div>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="rounded-2xl bg-rose-50/80 p-2.5 border border-rose-200 text-rose-950 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                  <span className="flex items-center gap-1.5">
                    <Ban className="h-3.5 w-3.5 text-rose-600" />
                    <span>Cancelled / Voided</span>
                  </span>
                  <span className="font-mono text-[10px] text-rose-700 font-semibold">
                    Turnaround: {formatDuration(totalWaitDurationMs)}
                  </span>
                </div>
                {order.cancelReason && (
                  <div className="text-[11px] font-semibold text-rose-900">
                    Reason: <span className="font-normal text-rose-800">{order.cancelReason}</span>
                  </div>
                )}
                {order.cancelNotes && (
                  <div className="text-[10px] italic text-rose-800 bg-white/70 rounded-lg p-1.5 border border-rose-200/60">
                    "{order.cancelNotes}"
                  </div>
                )}
                {order.cancelledBy && (
                  <div className="text-[9px] text-rose-600 font-medium">
                    Cancelled by: {order.cancelledBy}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer & Dining Context with Dual Mode Indicators */}
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                <UserIcon className="h-3.5 w-3.5 text-stone-400" />
                <span>{order.customerName || (isOnline ? 'Online Customer' : 'Walk-in Guest')}</span>
                {order.customerPhone && (
                  <span className="text-[10px] text-stone-400">({order.customerPhone})</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {order.orderClassification === 'live_in_house' || order.tableNumber ? (
                  <span className="rounded-md bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-950 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>Table #{order.tableNumber || 1} (Live)</span>
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-950 uppercase">
                    Advance Booking
                  </span>
                )}
              </div>
            </div>

            {/* If Advance Booking: Show Reservation Details */}
            {order.advanceBooking && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-200/80 p-2 text-[11px] text-amber-950 space-y-0.5">
                <div className="flex items-center justify-between font-bold">
                  <span>
                    📅 Target: {order.advanceBooking.bookingDate} at{' '}
                    {order.advanceBooking.arrivalTime}
                  </span>
                  <span>👥 {order.advanceBooking.partySize || 2} Guests</span>
                </div>
                {order.advanceBooking.seatingPreference && (
                  <div className="text-[10px] text-stone-600 capitalize">
                    Area: {order.advanceBooking.seatingPreference.replace('_', ' ')}
                    {order.advanceBooking.specialRequests && (
                      <span className="italic">
                        {' '}
                        — Note: "{order.advanceBooking.specialRequests}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="my-3 space-y-1.5 border-y border-stone-100 py-3 text-xs">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <span className="font-medium text-stone-800">
                    <span className="font-bold text-amber-800 mr-1.5">{item.quantity}x</span>
                    {item.name}
                  </span>
                  {item.specialInstructions && (
                    <p className="text-[10px] italic text-amber-700 ml-4 font-semibold">
                      "{item.specialInstructions}"
                    </p>
                  )}
                </div>
                <span className="font-mono text-stone-600">₱{item.totalPrice.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Financial & Payment Info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500 uppercase font-bold text-[10px] flex items-center gap-1">
              Paid via {order.paymentMethod}
              {order.cashierName && (
                <span className="text-stone-400 font-normal">({order.cashierName})</span>
              )}
            </span>
            <span className="font-mono text-base font-extrabold text-stone-900">
              ₱{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Role-Specific Status Actions */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => onViewReceipt(order)}
            className="flex items-center gap-1 rounded-xl bg-stone-100 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-800 transition active:scale-95 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Receipt</span>
          </button>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* 1. TO CONFIRM (Cashier / Admin): Confirm & Cancel */}
            {isToConfirm && (
              <>
                {!isCook && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'to_prep')}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-stone-950 transition shadow-xs active:scale-95 cursor-pointer"
                    title="Confirm self-order and forward to kitchen cook"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Send to Kitchen</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setCancelReason(CANCEL_REASONS[0]);
                    setCustomCancelNotes('');
                    setCancellingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 transition active:scale-95 cursor-pointer"
                  title="Cancel this unconfirmed order"
                >
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>Cancel</span>
                </button>
              </>
            )}

            {/* 2. TO PREP (Cook or Cashier): Start Prep (Cook) & Cancel */}
            {isToPrep && (
              <>
                {isCook && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'processing')}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-4 py-1.5 text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shadow-sky-600/20"
                    title="Start cooking and preparation for this order"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>Start Prep</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setCancelReason(CANCEL_REASONS[0]);
                    setCustomCancelNotes('');
                    setCancellingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 transition active:scale-95 cursor-pointer"
                  title="Cancel order before cooking starts"
                >
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>Cancel</span>
                </button>
              </>
            )}

            {/* 3. PROCESSING: Complete (Cook) & Void */}
            {isProcessing && (
              <>
                {isCook && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'to_serve')}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shadow-emerald-600/20"
                    title="Mark kitchen preparation complete and ready for service"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Complete</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setVoidReturnReason(RETURN_REASONS[0]);
                    setVoidReturnCustomNote('');
                    setVoidingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-extrabold text-rose-700 transition active:scale-95 cursor-pointer"
                  title="Void order or return back to cashier"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-600" />
                  <span>Void</span>
                </button>
              </>
            )}

            {/* 4. TO SERVE: Mark as Served (Cashier) & Void */}
            {isToServe && (
              <>
                {!isCook && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'completed')}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-extrabold text-white transition shadow-xs active:scale-95 cursor-pointer"
                    title="Mark order as served to customer and finalize in sales"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    <span>Mark as Served</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setVoidReturnReason(RETURN_REASONS[0]);
                    setVoidReturnCustomNote('');
                    setVoidingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-extrabold text-rose-700 transition active:scale-95 cursor-pointer"
                  title="Void order or return back to cashier"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-600" />
                  <span>Void</span>
                </button>
              </>
            )}

            {/* 5. COMPLETED: Void */}
            {isCompleted && (
              <button
                onClick={() => {
                  setVoidReturnReason(RETURN_REASONS[0]);
                  setVoidReturnCustomNote('');
                  setVoidingOrder(order);
                }}
                className="flex items-center gap-1 rounded-xl border border-stone-300 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 px-3 py-1.5 text-xs font-bold text-stone-600 transition active:scale-95 cursor-pointer"
                title="Void completed transaction"
              >
                <Ban className="h-3.5 w-3.5 text-rose-500" />
                <span>Void</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            {isCook ? 'Kitchen Order Tickets' : 'Ticket Management'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Animated Collapsible Channel Filter */}
          <div className="flex items-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {!isChannelsOpen ? (
                <motion.button
                  key="collapsed-channel-btn"
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => setIsChannelsOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 border border-stone-200/90 text-xs font-bold text-stone-800 transition active:scale-95 cursor-pointer shadow-2xs"
                  title="Click to expand channels filter"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-stone-500" />
                  <div className="flex items-center gap-1.5">
                    {channelTab === 'all' && (
                      <>
                        <Layers className="h-3.5 w-3.5 text-stone-600" />
                        <span>All Channels ({orders.length})</span>
                      </>
                    )}
                    {channelTab === 'in_store' && (
                      <>
                        <Store className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-amber-900 font-extrabold">In-Store ({inStoreOrdersAll.length})</span>
                      </>
                    )}
                    {channelTab === 'online' && (
                      <>
                        <Globe className="h-3.5 w-3.5 text-indigo-600" />
                        <span className="text-indigo-900 font-extrabold">Online ({onlineOrdersAll.length})</span>
                      </>
                    )}
                    {channelTab === 'split' && (
                      <>
                        <Columns className="h-3.5 w-3.5 text-stone-800" />
                        <span>Split View</span>
                      </>
                    )}
                  </div>
                </motion.button>
              ) : (
                <motion.div
                  key="expanded-channels-bar"
                  initial={{ opacity: 0, x: 30, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 30, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 border border-stone-200/90 shadow-2xs"
                >
                  <button
                    onClick={() => setChannelTab('all')}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      channelTab === 'all'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                    }`}
                    title="All Channels"
                  >
                    <Layers className="h-3.5 w-3.5 text-stone-500" />
                    <span>All</span>
                    <span className="rounded-full bg-stone-200 px-1.5 py-0.2 text-[10px] font-extrabold text-stone-700">
                      {orders.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setChannelTab('in_store')}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      channelTab === 'in_store'
                        ? 'bg-white text-amber-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                    }`}
                    title="On-the-Place (In-Store)"
                  >
                    <Store className="h-3.5 w-3.5 text-amber-600" />
                    <span>In-Store</span>
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-extrabold text-amber-800">
                      {inStoreOrdersAll.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setChannelTab('online')}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      channelTab === 'online'
                        ? 'bg-white text-indigo-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                    }`}
                    title="Online Orders"
                  >
                    <Globe className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Online</span>
                    <span className="rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-extrabold text-indigo-800">
                      {onlineOrdersAll.length}
                    </span>
                    {pendingConfirmCount > 0 && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setChannelTab(channelTab === 'split' ? 'all' : 'split')}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      channelTab === 'split'
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                    }`}
                    title="Dual Split View"
                  >
                    <Columns className="h-3.5 w-3.5" />
                    <span>Split</span>
                  </button>

                  <button
                    onClick={() => setIsChannelsOpen(false)}
                    className="flex items-center justify-center h-7 w-7 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition cursor-pointer ml-0.5"
                    title="Collapse channels"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket #, guest..."
              className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            onClick={refreshOrders}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95 cursor-pointer shadow-2xs"
            title="Refresh tickets"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Role-Adapted Ticket Status Navigation */}
      {isCook ? (
        /* COOK STATUS TABS: Start Prep | Processing | Complete */
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
            <ChefHat className="h-3.5 w-3.5 text-orange-600" />
            Kitchen Status:
          </span>

          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs font-extrabold'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            All Active Prep ({toPrepCount + processingCount + toServeCount})
          </button>

          <button
            onClick={() => setStatusFilter('to_prep')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'to_prep'
                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-700" />
            <span>Start Prep</span>
            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-black text-amber-900">
              {toPrepCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('processing')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'processing'
                ? 'bg-sky-600 text-white font-extrabold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <ChefHat className="h-3.5 w-3.5 text-sky-400" />
            <span>Processing</span>
            <span className="rounded-full bg-sky-100 px-1.5 py-0.2 text-[10px] font-black text-sky-900">
              {processingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Complete</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-black text-emerald-900">
              {toServeCount + completedCount}
            </span>
          </button>
        </div>
      ) : (
        /* CASHIER & ADMIN STATUS TABS: To Confirm | To Prep | Processing | To Serve */
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
            <Store className="h-3.5 w-3.5 text-amber-600" />
            Cashier Status:
          </span>

          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs font-extrabold'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            All ({orders.length})
          </button>

          <button
            onClick={() => setStatusFilter('to_confirm')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'to_confirm'
                ? 'bg-rose-600 text-white font-extrabold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
            <span>To Confirm</span>
            <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-black text-rose-900">
              {pendingConfirmCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('to_prep')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'to_prep'
                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-700" />
            <span>To Prep</span>
            <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-black text-amber-900">
              {toPrepCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('processing')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'processing'
                ? 'bg-sky-600 text-white font-extrabold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <ChefHat className="h-3.5 w-3.5 text-sky-400" />
            <span>Processing</span>
            <span className="rounded-full bg-sky-100 px-1.5 py-0.2 text-[10px] font-black text-sky-900">
              {processingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('to_serve')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'to_serve'
                ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Bell className="h-3.5 w-3.5 text-emerald-400" />
            <span>To Serve</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-black text-emerald-900">
              {toServeCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'completed'
                ? 'bg-stone-700 text-white font-extrabold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            Completed ({completedCount})
          </button>

          <button
            onClick={() => setStatusFilter('cancelled')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === 'cancelled'
                ? 'bg-stone-700 text-white font-extrabold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            Cancelled ({cancelledCount})
          </button>
        </div>
      )}

      {/* Orders Display: Split Mode vs Unified Grid */}
      {channelTab === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: On-the-Place Orders */}
          <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">On-the-Place (In-Store)</h3>
                  <p className="text-[10px] text-stone-500">Dine-In tables &amp; Counter Orders</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">
                {filteredInStore.length}
              </span>
            </div>

            {filteredInStore.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-white/70 p-8 text-center text-xs text-stone-500">
                No in-store orders match current filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInStore.map((order) => renderOrderCard(order))}
              </div>
            )}
          </div>

          {/* Right Column: Online Orders */}
          <div className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Online Orders</h3>
                  <p className="text-[10px] text-stone-500">Customer web portal &amp; advance orders</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-200/80 px-2.5 py-0.5 text-xs font-extrabold text-indigo-900">
                {filteredOnline.length}
              </span>
            </div>

            {filteredOnline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-8 text-center text-xs text-stone-500">
                No online orders match current filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOnline.map((order) => renderOrderCard(order))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Unified Grid Mode (All, In-Store, or Online Tab) */
        <div>
          {filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-xs text-stone-500">
              No orders found matching current filter.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => renderOrderCard(order))}
            </div>
          )}
        </div>
      )}

      {/* VOID ORDER MODAL (Shows "Back to Cashier" or "Cancel Order") */}
      {voidingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                  <Ban className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-stone-900">
                    Void Ticket #{voidingOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Stage:{' '}
                    <span className="font-bold text-stone-800 capitalize">
                      {voidingOrder.status === 'processing'
                        ? 'Active Kitchen Prep'
                        : voidingOrder.status === 'to_serve'
                        ? 'Ready to Serve'
                        : voidingOrder.status === 'completed'
                        ? 'Completed Order'
                        : voidingOrder.status}
                    </span>{' '}
                    • Total:{' '}
                    <span className="font-mono font-bold text-amber-800">
                      ₱{voidingOrder.totalAmount.toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVoidingOrder(null)}
                className="grid h-8 w-8 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Summary Box */}
            <div className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/80 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800">
                  Guest: {voidingOrder.customerName || 'Walk-in Guest'}
                </span>
                <span className="rounded-md bg-stone-200 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-800">
                  {voidingOrder.items.length} Item(s)
                </span>
              </div>
              <div className="text-[11px] text-stone-500 truncate">
                Items: {voidingOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>

            <div className="text-xs font-extrabold text-stone-700 uppercase tracking-wider">
              Choose Void Handling Method:
            </div>

            {/* Option 1: Back to Cashier */}
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/60 p-4 space-y-3 transition hover:border-amber-400">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 shrink-0">
                  <Undo2 className="h-5 w-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-amber-950">Option 1: Back to Cashier</h4>
                    <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                      Revert Queue
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Sends this ticket back to the Cashier Terminal (<span className="font-bold">To Confirm</span>). Cooking is paused so cashier staff can review, modify items, or attend to customer requests.
                  </p>
                </div>
              </div>

              {/* Return Reason selection */}
              <div className="space-y-2 pt-2 border-t border-amber-200/60">
                <label className="text-[11px] font-bold text-amber-950 block">
                  Select Reason for Returning:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {RETURN_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setVoidReturnReason(r)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                        voidReturnReason === r
                          ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                          : 'bg-white/90 border border-amber-200 text-amber-900 hover:bg-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={voidReturnCustomNote}
                  onChange={(e) => setVoidReturnCustomNote(e.target.value)}
                  placeholder="Optional extra note for cashier (e.g. 'Customer wants less sugar')..."
                  className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => handleReturnToCashier(voidingOrder)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-black text-stone-950 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <Undo2 className="h-4 w-4" />
                  <span>Confirm &amp; Send Back to Cashier</span>
                </button>
              </div>
            </div>

            {/* Option 2: Permanently Cancel */}
            <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/60 p-4 space-y-3 transition hover:border-rose-400">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-600 text-white shrink-0">
                  <XCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-rose-950">Option 2: Cancel Order</h4>
                    <span className="rounded-md bg-rose-200 px-2 py-0.5 text-[10px] font-extrabold text-rose-900 uppercase">
                      Permanent Void
                    </span>
                  </div>
                  <p className="text-xs text-rose-900/80 leading-relaxed">
                    Permanently cancels this order. Select the exact cancellation reason and notes for audit records. Restores stock to inventory.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleProceedToCancelFromVoid(voidingOrder)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-black text-white transition active:scale-95 cursor-pointer shadow-xs shadow-rose-600/20"
              >
                <Ban className="h-4 w-4" />
                <span>Cancel Order &amp; Specify Reason...</span>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setVoidingOrder(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-800 transition cursor-pointer"
              >
                Close / Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                  <XCircle className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-stone-900">
                    Cancel Ticket #{cancellingOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Customer: {cancellingOrder.customerName || 'Walk-in Guest'} • Total: ₱
                    {cancellingOrder.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setCancellingOrder(null);
                  setCustomCancelNotes('');
                }}
                className="grid h-8 w-8 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Select Reason */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800 block">
                Select Reason for Cancellation <span className="text-rose-500">*</span>:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {CANCEL_REASONS.map((reason) => {
                  const isSelected = cancelReason === reason;
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setCancelReason(reason)}
                      className={`flex items-center gap-2 rounded-xl p-2.5 text-left text-xs transition cursor-pointer border ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full border grid place-items-center shrink-0 ${
                          isSelected ? 'border-rose-600 bg-rose-600' : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="leading-tight">{reason}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                <span>Custom Notes / Specific Explanation (Optional):</span>
                <span className="text-[10px] text-stone-400 font-normal">Audit Log</span>
              </label>
              <textarea
                value={customCancelNotes}
                onChange={(e) => setCustomCancelNotes(e.target.value)}
                placeholder="e.g. Customer walked out before cooking started, processed refund..."
                rows={3}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50/50 p-3 text-xs text-stone-900 focus:border-rose-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Notice */}
            <div className="rounded-xl bg-amber-50 border border-amber-200/80 p-2.5 text-[11px] text-amber-950 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Cancelling will restore{' '}
                {cancellingOrder.items.reduce((s, i) => s + i.quantity, 0)} item(s) back to active
                inventory stock and free any occupied tables.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setCancellingOrder(null);
                  setCustomCancelNotes('');
                }}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Keep Ticket
              </button>
              <button
                type="button"
                onClick={() => handleConfirmCancellation(cancellingOrder)}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 text-xs font-black transition active:scale-95 cursor-pointer shadow-xs shadow-rose-600/20"
              >
                <Ban className="h-3.5 w-3.5" />
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
