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
  ChevronDown,
  Filter,
  Undo2,
  XCircle,
  Ban,
  X,
  ArrowLeft,
  SlidersHorizontal,
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
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [statusFilters, setStatusFilters] = useState<string[]>(['all']);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  const isStatusActive = (status: string) => {
    if (status === 'all') {
      return statusFilters.includes('all') || statusFilters.length === 0;
    }
    return !statusFilters.includes('all') && statusFilters.includes(status);
  };

  const toggleStatusFilter = (status: string) => {
    if (status === 'all') {
      setStatusFilters(['all']);
      return;
    }

    if (statusFilters.includes('all')) {
      setStatusFilters([status]);
      return;
    }

    if (statusFilters.includes(status)) {
      const updated = statusFilters.filter((s) => s !== status);
      if (updated.length === 0) {
        setStatusFilters(['all']);
      } else {
        setStatusFilters(updated);
      }
    } else {
      setStatusFilters([...statusFilters, status]);
    }
  };

  const getStatusFilterLabel = () => {
    const isAll = statusFilters.includes('all') || statusFilters.length === 0;
    if (isAll) {
      return isCook ? 'All Active Prep' : 'All Tickets';
    }
    if (statusFilters.length === 1) {
      const s = statusFilters[0];
      if (isCook) {
        if (s === 'to_prep') return 'Start Prep';
        if (s === 'processing') return 'Processing';
        if (s === 'completed') return 'Complete';
      } else {
        if (s === 'to_confirm') return 'To Confirm';
        if (s === 'to_prep') return 'To Prep';
        if (s === 'processing') return 'Processing';
        if (s === 'to_serve') return 'To Serve';
        if (s === 'completed') return 'Completed';
        if (s === 'cancelled') return 'Cancelled';
      }
    }
    return `${statusFilters.length} Statuses Selected`;
  };

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
    const isAllStatus = statusFilters.includes('all') || statusFilters.length === 0;
    if (isCook) {
      if (isAllStatus) {
        // Show active tickets for cook (to_prep, processing, to_serve)
        if (order.status === 'cancelled') return false;
      } else {
        const matchPrep = statusFilters.includes('to_prep') && order.status === 'to_prep';
        const matchProcessing = statusFilters.includes('processing') && order.status === 'processing';
        const matchCompleted = statusFilters.includes('completed') && (order.status === 'to_serve' || order.status === 'completed');
        if (!matchPrep && !matchProcessing && !matchCompleted) return false;
      }
    } else {
      // Cashier and Admin
      if (!isAllStatus) {
        const matchesAny = statusFilters.some((status) => {
          if (status === 'to_confirm') {
            return order.status === 'to_confirm' || order.status === 'pending';
          }
          return order.status === status;
        });
        if (!matchesAny) return false;
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

  const activeStatusCount = orders.filter((o) => {
    if (isCook) {
      if (statusFilters.includes('all') || statusFilters.length === 0) return o.status !== 'cancelled';
      const matchPrep = statusFilters.includes('to_prep') && o.status === 'to_prep';
      const matchProcessing = statusFilters.includes('processing') && o.status === 'processing';
      const matchCompleted = statusFilters.includes('completed') && (o.status === 'to_serve' || o.status === 'completed');
      return matchPrep || matchProcessing || matchCompleted;
    } else {
      if (statusFilters.includes('all') || statusFilters.length === 0) return true;
      return statusFilters.some((s) => {
        if (s === 'to_confirm') return o.status === 'to_confirm' || o.status === 'pending';
        return o.status === s;
      });
    }
  }).length;

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
          <span
            title="Start Prep"
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-900 animate-pulse"
          >
            <Flame className="h-3 w-3 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Start Prep</span>
          </span>
        );
      }
      if (isProcessing) {
        return (
          <span
            title="Processing"
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-sky-900"
          >
            <ChefHat className="h-3 w-3 text-sky-600 shrink-0" />
            <span className="hidden sm:inline">Processing</span>
          </span>
        );
      }
      if (isToServe || isCompleted) {
        return (
          <span
            title="Complete"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-900"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Complete</span>
          </span>
        );
      }
      if (isToConfirm) {
        return (
          <span
            title="Awaiting Confirmation"
            className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-stone-600"
          >
            <Clock className="h-3 w-3 text-stone-500 shrink-0" />
            <span className="hidden sm:inline">Awaiting Confirmation</span>
          </span>
        );
      }
    }

    // Cashier & Admin Badges
    if (isToConfirm) {
      return (
        <span
          title="To Confirm"
          className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-rose-900 animate-pulse"
        >
          <AlertCircle className="h-3 w-3 text-rose-600 shrink-0" />
          <span className="hidden sm:inline">To Confirm</span>
        </span>
      );
    }
    if (isToPrep) {
      return (
        <span
          title="To Prep"
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-900"
        >
          <Clock className="h-3 w-3 text-amber-600 shrink-0" />
          <span className="hidden sm:inline">To Prep</span>
        </span>
      );
    }
    if (isProcessing) {
      return (
        <span
          title="Processing"
          className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-sky-900"
        >
          <ChefHat className="h-3 w-3 text-sky-600 shrink-0" />
          <span className="hidden sm:inline">Processing</span>
        </span>
      );
    }
    if (isToServe) {
      return (
        <span
          title="To Serve"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950 animate-bounce"
        >
          <Bell className="h-3 w-3 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline">To Serve</span>
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span
          title="Completed"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-800"
        >
          <Check className="h-3 w-3 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline">Completed</span>
        </span>
      );
    }
    return (
      <span
        title={order.status}
        className="rounded-full bg-stone-100 border border-stone-200 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-stone-600"
      >
        <span className="hidden sm:inline">{order.status}</span>
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
        className={`flex flex-col justify-between rounded-2xl sm:rounded-3xl border bg-white p-2.5 sm:p-4 md:p-5 shadow-xs transition hover:shadow-md ${
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
          <div className="flex items-center justify-between border-b border-stone-100 pb-2 sm:pb-3 gap-1">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <span className="font-mono text-[11px] sm:text-xs font-extrabold text-stone-900 truncate">
                #{order.orderNumber}
              </span>
              <span className="text-[9px] sm:text-[10px] text-stone-400 shrink-0">
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Channel badge */}
              <span
                title={isOnline ? 'Online Order' : 'In-Store Order'}
                className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide ${
                  isOnline
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                }`}
              >
                {isOnline ? (
                  <>
                    <Globe className="h-3 w-3 text-indigo-600 shrink-0" />
                    <span className="hidden sm:inline">Online</span>
                  </>
                ) : (
                  <>
                    <Store className="h-3 w-3 text-amber-600 shrink-0" />
                    <span className="hidden sm:inline">In-Store</span>
                  </>
                )}
              </span>

              {/* Role-adapted Status pill */}
              {renderStatusBadge(order)}
            </div>
          </div>

          {/* Time Spent & State Indicator Banner */}
          <div className="mt-2 sm:mt-3">
            {isToConfirm && (
              <div className="space-y-1.5 sm:space-y-2">
                {order.returnReason && (
                  <div className="rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border bg-amber-50 border-amber-300 text-amber-950 flex items-start gap-1.5 shadow-2xs">
                    <div className="grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-md sm:rounded-lg bg-amber-500 text-stone-950 shrink-0 mt-0.5">
                      <Undo2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </div>
                    <div className="min-w-0 text-[10px] sm:text-xs flex-1">
                      <span className="font-extrabold text-amber-900 block uppercase text-[9px] sm:text-[10px]">
                        Returned to Cashier
                      </span>
                      <p className="text-amber-800 text-[10px] sm:text-[11px] font-medium mt-0.5 line-clamp-2">
                        "{order.returnReason}"
                      </p>
                    </div>
                  </div>
                )}
                <div className="rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border bg-rose-50/80 border-rose-200 text-rose-950 flex items-center justify-between gap-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="grid h-5 w-5 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl bg-rose-600 text-white shrink-0 animate-pulse">
                      <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide text-rose-900 block truncate">
                        Self-Order
                      </span>
                      <span className="text-[9px] sm:text-[11px] font-medium text-rose-800 block truncate">
                        Review needed
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-[9px] sm:text-[10px] font-mono font-bold text-rose-900 shrink-0">
                    {formatDuration(pendingDurationMs)}
                  </div>
                </div>
              </div>
            )}

            {isToPrep && (
              <div
                className={`rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border flex items-center justify-between gap-1.5 shadow-2xs ${
                  isUrgent
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : isWarning
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className={`grid h-5 w-5 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl shrink-0 ${
                      isUrgent
                        ? 'bg-rose-600 text-white animate-bounce'
                        : isWarning
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-amber-400 text-stone-950'
                    }`}
                  >
                    {isUrgent ? <Flame className="h-3 w-3 sm:h-4 sm:w-4" /> : <Timer className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide text-amber-900 truncate">
                        {isCook ? 'Ready for Prep' : 'Kitchen Queue'}
                      </span>
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-stone-600 truncate hidden sm:block">
                      {isCook ? 'Press Start Prep' : 'Queued'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono text-[10px] sm:text-xs font-black text-amber-900">
                    {formatDuration(pendingDurationMs)}
                  </div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div
                className={`rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border space-y-1 shadow-2xs ${
                  isUrgent
                    ? 'bg-rose-50/80 border-rose-300'
                    : 'bg-sky-50/90 border-sky-200 text-sky-950'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] sm:text-xs">
                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                    <span className="grid h-4 w-4 sm:h-5 sm:w-5 place-items-center rounded-md bg-sky-600 text-white animate-spin shrink-0">
                      <ChefHat className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </span>
                    <span className="text-[9px] sm:text-[11px] font-bold text-sky-900 truncate">
                      {isCook ? 'Cooking:' : 'Preparing:'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] sm:text-xs font-black text-sky-800 shrink-0">
                    {formatDuration(processingDurationMs)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] sm:text-[11px] pt-1 border-t border-sky-200/70 text-stone-600">
                  <span className="flex items-center gap-1 text-[9px] sm:text-[10px]">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-stone-400" />
                    <span className="hidden sm:inline">Wait:</span>
                  </span>
                  <span className="font-mono font-bold text-stone-900 text-[10px] sm:text-xs">
                    {formatDuration(totalWaitDurationMs)}
                  </span>
                </div>
              </div>
            )}

            {isToServe && (
              <div className="rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-300 p-1.5 sm:p-2.5 text-emerald-950 flex items-center justify-between gap-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="grid h-5 w-5 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl bg-emerald-600 text-white shrink-0 animate-bounce">
                    <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide text-emerald-900 block truncate">
                      Ready to Serve!
                    </span>
                    <span className="text-[9px] sm:text-[11px] font-medium text-emerald-800 hidden sm:block truncate">
                      Kitchen complete
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono text-[10px] sm:text-xs font-black text-emerald-950">
                  {formatDuration(totalWaitDurationMs)}
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="rounded-xl sm:rounded-2xl bg-stone-50 p-1.5 sm:p-2.5 border border-stone-200 text-stone-700 flex items-center justify-between gap-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-md sm:rounded-lg bg-emerald-600 text-white shrink-0">
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide text-stone-800 block truncate">
                      Completed
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-[10px] sm:text-xs font-bold text-stone-900 shrink-0">
                  {formatDuration(totalWaitDurationMs)}
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="rounded-xl sm:rounded-2xl bg-rose-50/80 p-1.5 sm:p-2.5 border border-rose-200 text-rose-950 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-rose-900">
                  <span className="flex items-center gap-1">
                    <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-600" />
                    <span>Voided</span>
                  </span>
                  <span className="font-mono text-[9px] sm:text-[10px] text-rose-700">
                    {formatDuration(totalWaitDurationMs)}
                  </span>
                </div>
                {order.cancelReason && (
                  <div className="text-[9px] sm:text-[11px] font-semibold text-rose-900 line-clamp-1">
                    {order.cancelReason}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer & Dining Context */}
          <div className="mt-2 sm:mt-3 space-y-1 text-[10px] sm:text-xs">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 font-semibold text-stone-900 truncate">
                <UserIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-400 shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[140px]">
                  {order.customerName || (isOnline ? 'Online Guest' : 'Walk-in')}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {order.orderClassification === 'live_in_house' || order.tableNumber ? (
                  <span className="rounded-md bg-emerald-100 border border-emerald-300 px-1 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950 flex items-center gap-0.5 sm:gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>T#{order.tableNumber || 1}</span>
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-100 border border-amber-300 px-1 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-950 uppercase">
                    Adv
                  </span>
                )}
              </div>
            </div>

            {/* If Advance Booking: Show Reservation Details */}
            {order.advanceBooking && (
              <div className="rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-200/80 p-1.5 text-[9px] sm:text-[11px] text-amber-950 space-y-0.5">
                <div className="flex items-center justify-between font-bold">
                  <span>📅 {order.advanceBooking.arrivalTime}</span>
                  <span>👥 {order.advanceBooking.partySize || 2}</span>
                </div>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="my-2 sm:my-3 space-y-1 border-y border-stone-100 py-2 sm:py-3 text-[10px] sm:text-xs max-h-24 sm:max-h-36 overflow-y-auto pr-0.5">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-1">
                <div className="flex-1 pr-1 min-w-0">
                  <span className="font-medium text-stone-800 truncate block">
                    <span className="font-bold text-amber-800 mr-1">{item.quantity}x</span>
                    {item.name}
                  </span>
                  {item.specialInstructions && (
                    <p className="text-[8px] sm:text-[10px] italic text-amber-700 ml-2 font-semibold line-clamp-1">
                      "{item.specialInstructions}"
                    </p>
                  )}
                </div>
                <span className="font-mono text-stone-600 shrink-0 text-[10px] sm:text-xs">
                  ₱{item.totalPrice.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Financial & Payment Info */}
          <div className="flex items-center justify-between text-[9px] sm:text-xs">
            <span className="text-stone-500 uppercase font-bold text-[8px] sm:text-[10px] flex items-center gap-1 truncate max-w-[80px] sm:max-w-none">
              {order.paymentMethod}
            </span>
            <span className="font-mono text-xs sm:text-base font-extrabold text-stone-900">
              ₱{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Role-Specific Status Actions */}
        <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-stone-100 flex items-center justify-between gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onViewReceipt(order)}
            title="Print Receipt"
            className="flex items-center justify-center gap-1 rounded-lg sm:rounded-xl bg-stone-100 hover:bg-stone-200 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-800 transition active:scale-95 cursor-pointer shrink-0"
          >
            <Printer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Receipt</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 justify-end flex-wrap">
            {/* 1. TO CONFIRM (Cashier / Admin): Confirm & Cancel */}
            {isToConfirm && (
              <>
                {!isCook && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(order.id, 'to_prep')}
                    className="flex items-center gap-1 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 p-1.5 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-stone-950 transition shadow-xs active:scale-95 cursor-pointer shrink-0"
                    title="Confirm self-order and forward to kitchen cook"
                  >
                    <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Confirm</span>
                    <span className="hidden lg:inline"> &amp; Send</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCancelReason(CANCEL_REASONS[0]);
                    setCustomCancelNotes('');
                    setCancellingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 transition active:scale-95 cursor-pointer shrink-0"
                  title="Cancel order"
                >
                  <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </>
            )}

            {/* 2. TO PREP (Cook or Cashier): Start Prep (Cook) & Cancel */}
            {isToPrep && (
              <>
                {isCook && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(order.id, 'processing')}
                    className="flex items-center gap-1 rounded-lg sm:rounded-xl bg-sky-600 hover:bg-sky-500 text-white p-1.5 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shadow-sky-600/20 shrink-0"
                    title="Start cooking and preparation for this order"
                  >
                    <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Prep</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCancelReason(CANCEL_REASONS[0]);
                    setCustomCancelNotes('');
                    setCancellingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 transition active:scale-95 cursor-pointer shrink-0"
                  title="Cancel order before cooking starts"
                >
                  <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </>
            )}

            {/* 3. PROCESSING: Complete (Cook) & Void */}
            {isProcessing && (
              <>
                {isCook && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(order.id, 'to_serve')}
                    className="flex items-center gap-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shadow-emerald-600/20 shrink-0"
                    title="Mark kitchen preparation complete and ready for service"
                  >
                    <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Done</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setVoidReturnReason(RETURN_REASONS[0]);
                    setVoidReturnCustomNote('');
                    setVoidingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-rose-700 transition active:scale-95 cursor-pointer shrink-0"
                  title="Void order or return back to cashier"
                >
                  <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Void</span>
                </button>
              </>
            )}

            {/* 4. TO SERVE: Mark as Served (Cashier) & Void */}
            {isToServe && (
              <>
                {!isCook && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(order.id, 'completed')}
                    className="flex items-center gap-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 p-1.5 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-white transition shadow-xs active:scale-95 cursor-pointer shrink-0"
                    title="Mark order as served to customer"
                  >
                    <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Serve</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setVoidReturnReason(RETURN_REASONS[0]);
                    setVoidReturnCustomNote('');
                    setVoidingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-rose-700 transition active:scale-95 cursor-pointer shrink-0"
                  title="Void order or return back to cashier"
                >
                  <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Void</span>
                </button>
              </>
            )}

            {/* 5. COMPLETED: Void */}
            {isCompleted && (
              <button
                type="button"
                onClick={() => {
                  setVoidReturnReason(RETURN_REASONS[0]);
                  setVoidReturnCustomNote('');
                  setVoidingOrder(order);
                }}
                className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-stone-300 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-600 transition active:scale-95 cursor-pointer shrink-0"
                title="Void completed transaction"
              >
                <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-500" />
                <span className="hidden sm:inline">Void</span>
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            {isCook ? 'Kitchen Order Tickets' : 'Ticket Management'}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Channel Filter Modal Trigger Button */}
          <button
            id="ticket-channel-filter-btn"
            type="button"
            onClick={() => setIsChannelModalOpen(true)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 border text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs ${
              channelTab === 'in_store'
                ? 'border-amber-400 bg-amber-50/90 text-amber-950 hover:bg-amber-100 ring-1 ring-amber-400/40'
                : channelTab === 'online'
                ? 'border-indigo-400 bg-indigo-50/90 text-indigo-950 hover:bg-indigo-100 ring-1 ring-indigo-400/40'
                : channelTab === 'split'
                ? 'border-stone-800 bg-stone-900 text-white hover:bg-stone-800 ring-1 ring-stone-950'
                : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
            }`}
            title="Filter by Channel & Layout"
          >
            <SlidersHorizontal
              className={`h-3.5 w-3.5 ${
                channelTab === 'in_store'
                  ? 'text-amber-700'
                  : channelTab === 'online'
                  ? 'text-indigo-600'
                  : channelTab === 'split'
                  ? 'text-amber-400'
                  : 'text-stone-500'
              }`}
            />
            <div className="flex items-center gap-1.5">
              {channelTab === 'all' && (
                <>
                  <Layers className="h-3.5 w-3.5 text-stone-600" />
                  <span>Dine-in & Online</span>
                  <span className="rounded-full bg-stone-100 px-1.5 py-0.2 text-[10px] font-black text-stone-800 border border-stone-200">
                    {orders.length}
                  </span>
                </>
              )}
              {channelTab === 'in_store' && (
                <>
                  <Store className="h-3.5 w-3.5 text-amber-700" />
                  <span className="font-black text-amber-950">In-Store</span>
                  <span className="rounded-full bg-amber-200/90 px-1.5 py-0.2 text-[10px] font-black text-amber-950">
                    {inStoreOrdersAll.length}
                  </span>
                </>
              )}
              {channelTab === 'online' && (
                <>
                  <Globe className="h-3.5 w-3.5 text-indigo-700" />
                  <span className="font-black text-indigo-950">Online</span>
                  <span className="rounded-full bg-indigo-200/90 px-1.5 py-0.2 text-[10px] font-black text-indigo-950">
                    {onlineOrdersAll.length}
                  </span>
                  {pendingConfirmCount > 0 && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
                </>
              )}
              {channelTab === 'split' && (
                <>
                  <Columns className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-black text-white">Split View</span>
                </>
              )}
            </div>
            <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
          </button>

          {/* Search bar: compact icon toggle on mobile, full input on tablet/desktop */}
          {!isMobileSearchOpen && !searchQuery ? (
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              className="sm:hidden flex items-center justify-center h-8 w-8 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
              title="Search tickets"
            >
              <Search className="h-4 w-4 text-stone-500" />
            </button>
          ) : (
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket #, guest..."
                autoFocus={isMobileSearchOpen}
                className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-8 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              />
              {(searchQuery || isMobileSearchOpen) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsMobileSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 sm:hidden"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

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
      {/* Mobile: Single button that triggers status filter modal */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setIsStatusModalOpen(true)}
          className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-2xs transition active:scale-98 cursor-pointer ${
            !statusFilters.includes('all') && statusFilters.length > 0
              ? 'border-amber-400 bg-amber-50/70 text-amber-950 ring-1 ring-amber-400/50'
              : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <SlidersHorizontal className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-stone-500 font-medium shrink-0">Status:</span>
            <span className="font-black text-stone-900 truncate">
              {getStatusFilterLabel()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
              {activeStatusCount}
            </span>
            <span className="text-[11px] text-stone-400 font-normal">Tap to filter</span>
          </div>
        </button>
      </div>

      {/* Desktop & Tablet: Status Tabs (Multi-Select Enabled) */}
      {isCook ? (
        /* COOK STATUS TABS: Start Prep | Processing | Complete */
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
            <ChefHat className="h-3.5 w-3.5 text-orange-600" />
            Kitchen Status:
          </span>

          <button
            onClick={() => toggleStatusFilter('all')}
            className={`rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isStatusActive('all')
                ? 'bg-stone-900 text-white shadow-xs font-extrabold'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('all') && <Check className="h-3 w-3 text-amber-400 shrink-0" />}
            <span>All Active Prep ({toPrepCount + processingCount + toServeCount})</span>
          </button>

          <button
            onClick={() => toggleStatusFilter('to_prep')}
            title="Toggle Start Prep"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('to_prep')
                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs ring-2 ring-amber-600/30'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('to_prep') ? (
              <Check className="h-3.5 w-3.5 text-stone-950 shrink-0" />
            ) : (
              <Flame className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            )}
            <span>Start Prep</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_prep') ? 'bg-stone-950 text-amber-300' : 'bg-amber-100 text-amber-900'
            }`}>
              {toPrepCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('processing')}
            title="Toggle Processing"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('processing')
                ? 'bg-sky-600 text-white font-extrabold shadow-xs ring-2 ring-sky-600/30'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('processing') ? (
              <Check className="h-3.5 w-3.5 text-white shrink-0" />
            ) : (
              <ChefHat className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            )}
            <span>Processing</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('processing') ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900'
            }`}>
              {processingCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('completed')}
            title="Toggle Complete"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('completed')
                ? 'bg-emerald-600 text-white font-extrabold shadow-xs ring-2 ring-emerald-600/30'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('completed') ? (
              <Check className="h-3.5 w-3.5 text-white shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            )}
            <span>Complete</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('completed') ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
            }`}>
              {toServeCount + completedCount}
            </span>
          </button>

          {!isStatusActive('all') && (
            <button
              onClick={() => toggleStatusFilter('all')}
              className="text-[11px] font-bold text-stone-500 hover:text-stone-900 underline ml-1 cursor-pointer"
            >
              Reset to All
            </button>
          )}
        </div>
      ) : (
        /* CASHIER & ADMIN STATUS TABS: Multi-Select */
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-stone-500 mr-1 flex items-center gap-1">
            <Store className="h-3.5 w-3.5 text-amber-600" />
            Cashier Status:
          </span>

          <button
            onClick={() => toggleStatusFilter('all')}
            className={`rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isStatusActive('all')
                ? 'bg-stone-900 text-white shadow-xs font-extrabold'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('all') && <Check className="h-3 w-3 text-amber-400 shrink-0" />}
            <span>All ({orders.length})</span>
          </button>

          <button
            onClick={() => toggleStatusFilter('to_confirm')}
            title="Toggle To Confirm"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('to_confirm')
                ? 'bg-rose-600 text-white font-extrabold shadow-xs ring-2 ring-rose-600/30'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('to_confirm') ? (
              <Check className="h-3.5 w-3.5 text-white shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            )}
            <span>To Confirm</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_confirm') ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-900'
            }`}>
              {pendingConfirmCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('to_prep')}
            title="Toggle To Prep"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('to_prep')
                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs ring-2 ring-amber-600/30'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('to_prep') ? (
              <Check className="h-3.5 w-3.5 text-stone-950 shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            )}
            <span>To Prep</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_prep') ? 'bg-stone-950 text-amber-300' : 'bg-amber-100 text-amber-900'
            }`}>
              {toPrepCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('processing')}
            title="Toggle Processing"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('processing')
                ? 'bg-sky-600 text-white font-extrabold shadow-xs ring-2 ring-sky-600/30'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('processing') ? (
              <Check className="h-3.5 w-3.5 text-white shrink-0" />
            ) : (
              <ChefHat className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            )}
            <span>Processing</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('processing') ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900'
            }`}>
              {processingCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('to_serve')}
            title="Toggle To Serve"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('to_serve')
                ? 'bg-emerald-600 text-white font-extrabold shadow-xs ring-2 ring-emerald-600/30'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('to_serve') ? (
              <Check className="h-3.5 w-3.5 text-white shrink-0" />
            ) : (
              <Bell className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            )}
            <span>To Serve</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_serve') ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
            }`}>
              {toServeCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('completed')}
            title="Toggle Completed"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('completed')
                ? 'bg-stone-800 text-white font-extrabold shadow-xs ring-2 ring-stone-900/30'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('completed') ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Check className="h-3.5 w-3.5 text-stone-400 shrink-0" />
            )}
            <span>Completed</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('completed') ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'
            }`}>
              {completedCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('cancelled')}
            title="Toggle Cancelled"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('cancelled')
                ? 'bg-stone-800 text-white font-extrabold shadow-xs ring-2 ring-stone-900/30'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            {isStatusActive('cancelled') ? (
              <Check className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            ) : (
              <Ban className="h-3.5 w-3.5 text-rose-400 shrink-0" />
            )}
            <span>Cancelled</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('cancelled') ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'
            }`}>
              {cancelledCount}
            </span>
          </button>

          {!isStatusActive('all') && (
            <button
              onClick={() => toggleStatusFilter('all')}
              className="text-[11px] font-bold text-stone-500 hover:text-stone-900 underline ml-1 cursor-pointer"
            >
              Reset to All
            </button>
          )}
        </div>
      )}

      {/* Orders Display: Split Mode vs Unified Grid */}
      {channelTab === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column: On-the-Place Orders */}
          <div className="rounded-2xl sm:rounded-3xl border border-amber-200 bg-amber-50/40 p-2.5 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-2 sm:pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-amber-500 text-stone-950">
                  <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-xs sm:text-sm">In-Store Orders</h3>
                  <p className="text-[9px] sm:text-[10px] text-stone-500">Dine-In &amp; Counter Orders</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-200/80 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-amber-900">
                {filteredInStore.length}
              </span>
            </div>

            {filteredInStore.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-white/70 p-6 sm:p-8 text-center text-xs text-stone-500">
                No in-store orders match current filter.
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-4">
                {filteredInStore.map((order) => renderOrderCard(order))}
              </div>
            )}
          </div>

          {/* Right Column: Online Orders */}
          <div className="rounded-2xl sm:rounded-3xl border border-indigo-200 bg-indigo-50/40 p-2.5 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2 sm:pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-indigo-600 text-white">
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-xs sm:text-sm">Online Orders</h3>
                  <p className="text-[9px] sm:text-[10px] text-stone-500">Customer portal &amp; advance orders</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-200/80 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-indigo-900">
                {filteredOnline.length}
              </span>
            </div>

            {filteredOnline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-indigo-200 bg-white/70 p-6 sm:p-8 text-center text-xs text-stone-500">
                No online orders match current filter.
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 sm:gap-4">
                {filteredOnline.map((order) => renderOrderCard(order))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Unified Grid Mode (All, In-Store, or Online Tab) */
        <div>
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl sm:rounded-3xl border border-dashed border-stone-300 bg-white p-8 sm:p-12 text-center text-xs text-stone-500">
              No orders found matching current filter.
            </div>
          ) : (
            <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-3">
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

      {/* Ticket Status Filter Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-base text-stone-900">
                    Filter by Status
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Choose one or multiple statuses to display
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="text-xs font-bold text-stone-600">
                {isStatusActive('all')
                  ? 'Showing all tickets'
                  : `${statusFilters.length} status${statusFilters.length > 1 ? 'es' : ''} selected (${activeStatusCount} tickets)`}
              </div>
              <button
                type="button"
                onClick={() => toggleStatusFilter('all')}
                className="text-xs font-black text-amber-700 hover:text-amber-800 underline cursor-pointer"
              >
                {isStatusActive('all') ? 'All Selected' : 'Select All'}
              </button>
            </div>

            {/* Status Options Grid */}
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
              {isCook ? (
                /* Cook Options */
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('all')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('all')
                        ? 'border-stone-950 bg-stone-950 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('all') ? 'bg-amber-400 border-amber-400 text-stone-950' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('all') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-orange-500" />
                        <span>All Active Prep</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('all') ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'}`}>
                      {toPrepCount + processingCount + toServeCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('to_prep')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('to_prep')
                        ? 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-400'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('to_prep') ? 'bg-amber-500 border-amber-500 text-stone-950' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('to_prep') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-amber-700" />
                        <span>Start Prep</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('to_prep') ? 'bg-amber-200 text-amber-950' : 'bg-amber-100 text-amber-900'}`}>
                      {toPrepCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('processing')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('processing')
                        ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-400'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('processing') ? 'bg-sky-600 border-sky-600 text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('processing') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-sky-500" />
                        <span>Processing</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('processing') ? 'bg-sky-200 text-sky-950' : 'bg-sky-100 text-sky-900'}`}>
                      {processingCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('completed')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('completed')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-400'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('completed') ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('completed') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Complete</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('completed') ? 'bg-emerald-200 text-emerald-950' : 'bg-emerald-100 text-emerald-900'}`}>
                      {toServeCount + completedCount}
                    </span>
                  </button>
                </div>
              ) : (
                /* Cashier / Admin Options */
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('all')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('all')
                        ? 'border-stone-950 bg-stone-950 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('all') ? 'bg-amber-400 border-amber-400 text-stone-950' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('all') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-stone-400" />
                        <span>All Tickets</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('all') ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'}`}>
                      {orders.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('to_confirm')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('to_confirm')
                        ? 'border-rose-600 bg-rose-50 text-rose-950 ring-1 ring-rose-400'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('to_confirm') ? 'bg-rose-600 border-rose-600 text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('to_confirm') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                        <span>To Confirm</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('to_confirm') ? 'bg-rose-200 text-rose-950' : 'bg-rose-100 text-rose-900'}`}>
                      {pendingConfirmCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('to_prep')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('to_prep')
                        ? 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-400'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('to_prep') ? 'bg-amber-500 border-amber-500 text-stone-950' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('to_prep') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-700" />
                        <span>To Prep</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('to_prep') ? 'bg-amber-200 text-amber-950' : 'bg-amber-100 text-amber-900'}`}>
                      {toPrepCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('processing')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('processing')
                        ? 'border-sky-600 bg-sky-50 text-sky-950 ring-1 ring-sky-400'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('processing') ? 'bg-sky-600 border-sky-600 text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('processing') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-sky-500" />
                        <span>Processing</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('processing') ? 'bg-sky-200 text-sky-950' : 'bg-sky-100 text-sky-900'}`}>
                      {processingCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('to_serve')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('to_serve')
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-400'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('to_serve') ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('to_serve') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-emerald-500" />
                        <span>To Serve</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('to_serve') ? 'bg-emerald-200 text-emerald-950' : 'bg-emerald-100 text-emerald-900'}`}>
                      {toServeCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('completed')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('completed')
                        ? 'border-stone-800 bg-stone-100 text-stone-950 ring-1 ring-stone-400'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('completed') ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('completed') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-stone-600" />
                        <span>Completed</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('completed') ? 'bg-stone-300 text-stone-900' : 'bg-stone-200 text-stone-800'}`}>
                      {completedCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('cancelled')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('cancelled')
                        ? 'border-rose-700 bg-rose-50 text-rose-950 ring-1 ring-rose-400'
                        : 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('cancelled') ? 'bg-rose-700 border-rose-700 text-white' : 'border-stone-300 bg-white'
                      }`}>
                        {isStatusActive('cancelled') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-rose-500" />
                        <span>Cancelled</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('cancelled') ? 'bg-rose-200 text-rose-950' : 'bg-stone-200 text-stone-800'}`}>
                      {cancelledCount}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => toggleStatusFilter('all')}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                Reset to All
              </button>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded-xl bg-stone-950 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 transition cursor-pointer shadow-xs"
              >
                Done ({activeStatusCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Filter Modal */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            id="channel-filter-modal"
            className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 border border-stone-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-900 border border-amber-500/20">
                  <Layers className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-stone-900">
                    Filter by Channel & Layout
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Select order source stream or multi-column layout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChannelModalOpen(false)}
                className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Channel Options */}
            <div className="space-y-2.5">
              {/* Dine-in & Online Option */}
              <button
                type="button"
                onClick={() => {
                  setChannelTab('all');
                  setIsChannelModalOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl p-3.5 text-left text-xs font-bold transition cursor-pointer border ${
                  channelTab === 'all'
                    ? 'border-stone-950 bg-stone-950 text-white shadow-xs'
                    : 'border-stone-200 bg-stone-50/70 text-stone-800 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    channelTab === 'all' ? 'bg-amber-400 border-amber-400 text-stone-950' : 'border-stone-300 bg-white'
                  }`}>
                    {channelTab === 'all' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className={`h-4 w-4 ${channelTab === 'all' ? 'text-amber-400' : 'text-stone-600'}`} />
                      <span className="font-extrabold text-sm">Dine-in & Online</span>
                    </div>
                    <p className={`text-[11px] font-normal mt-0.5 ${channelTab === 'all' ? 'text-stone-300' : 'text-stone-500'}`}>
                      Combined feed of in-store and online customer orders
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                  channelTab === 'all' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'
                }`}>
                  {orders.length}
                </span>
              </button>

              {/* In-Store Option */}
              <button
                type="button"
                onClick={() => {
                  setChannelTab('in_store');
                  setIsChannelModalOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl p-3.5 text-left text-xs font-bold transition cursor-pointer border ${
                  channelTab === 'in_store'
                    ? 'border-amber-500 bg-amber-50/90 text-amber-950 shadow-xs ring-1 ring-amber-400'
                    : 'border-stone-200 bg-stone-50/70 text-stone-800 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    channelTab === 'in_store' ? 'bg-amber-500 border-amber-500 text-stone-950' : 'border-stone-300 bg-white'
                  }`}>
                    {channelTab === 'in_store' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-amber-700" />
                      <span className="font-extrabold text-sm">In-Store (On-the-Place)</span>
                    </div>
                    <p className={`text-[11px] font-normal mt-0.5 ${channelTab === 'in_store' ? 'text-amber-900/80' : 'text-stone-500'}`}>
                      Counter walk-ins, dine-in tables, and direct takeaway
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                  channelTab === 'in_store' ? 'bg-amber-200 text-amber-950' : 'bg-amber-100 text-amber-900'
                }`}>
                  {inStoreOrdersAll.length}
                </span>
              </button>

              {/* Online Orders Option */}
              <button
                type="button"
                onClick={() => {
                  setChannelTab('online');
                  setIsChannelModalOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl p-3.5 text-left text-xs font-bold transition cursor-pointer border ${
                  channelTab === 'online'
                    ? 'border-indigo-500 bg-indigo-50/90 text-indigo-950 shadow-xs ring-1 ring-indigo-400'
                    : 'border-stone-200 bg-stone-50/70 text-stone-800 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    channelTab === 'online' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-stone-300 bg-white'
                  }`}>
                    {channelTab === 'online' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-indigo-600" />
                      <span className="font-extrabold text-sm">Online Orders</span>
                      {pendingConfirmCount > 0 && (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                          {pendingConfirmCount} new
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] font-normal mt-0.5 ${channelTab === 'online' ? 'text-indigo-900/80' : 'text-stone-500'}`}>
                      Orders placed via customer mobile web ordering menu
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                  channelTab === 'online' ? 'bg-indigo-200 text-indigo-950' : 'bg-indigo-100 text-indigo-900'
                }`}>
                  {onlineOrdersAll.length}
                </span>
              </button>

              {/* Split View Option */}
              <button
                type="button"
                onClick={() => {
                  setChannelTab('split');
                  setIsChannelModalOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl p-3.5 text-left text-xs font-bold transition cursor-pointer border ${
                  channelTab === 'split'
                    ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                    : 'border-stone-200 bg-stone-50/70 text-stone-800 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                    channelTab === 'split' ? 'bg-amber-400 border-amber-400 text-stone-950' : 'border-stone-300 bg-white'
                  }`}>
                    {channelTab === 'split' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Columns className={`h-4 w-4 ${channelTab === 'split' ? 'text-amber-400' : 'text-stone-700'}`} />
                      <span className="font-extrabold text-sm">Dual Split View</span>
                    </div>
                    <p className={`text-[11px] font-normal mt-0.5 ${channelTab === 'split' ? 'text-stone-300' : 'text-stone-500'}`}>
                      Side-by-side synchronized workflow boards for In-Store and Online
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0 ${
                  channelTab === 'split' ? 'bg-amber-400 text-stone-950' : 'bg-stone-200 text-stone-800'
                }`}>
                  Side-by-Side
                </span>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsChannelModalOpen(false)}
                className="rounded-xl bg-stone-950 px-5 py-2 text-xs font-bold text-white hover:bg-stone-800 transition cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
