import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Order, User, StoreSettings, OrderStatus } from '../../types';
import { AppStore, isDrinkOrderItem, getOrderFulfillmentBreakdown } from '../../services/store';
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
  Coffee,
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
  Grid2X2,
  Square,
  Grid3X3,
  LayoutGrid,
  ClipboardList,
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
  const isBarista = activeStaff.role === 'barista';
  const isCook = activeStaff.role === 'cook';
  const isCashier = activeStaff.role === 'cashier';
  const isAdmin = activeStaff.role === 'admin';

  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [channelTab, setChannelTab] = useState<ChannelTab>('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [stationFilter, setStationFilter] = useState<'all' | 'barista' | 'kitchen'>('all');
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
      if (isBarista) return 'All Active Bar';
      if (isCook) return 'All Active Kitchen';
      return 'All Tickets';
    }
    if (statusFilters.length === 1) {
      const s = statusFilters[0];
      if (isBarista) {
        if (s === 'to_prep') return 'Start Prep';
        if (s === 'processing') return 'Brewing / Processing';
        if (s === 'completed') return 'Drinks Ready';
      } else if (isCook) {
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

  // Grid column view mode for staff tickets: 1, 2, 3, or 4 columns (persisted in localStorage)
  const [gridColumns, setGridColumns] = useState<1 | 2 | 3 | 4>(() => {
    try {
      const saved = localStorage.getItem('yh_staff_ticket_grid_columns');
      if (saved === '1') return 1;
      if (saved === '2') return 2;
      if (saved === '3') return 3;
      if (saved === '4') return 4;
      return 2;
    } catch {
      return 2;
    }
  });

  const handleSetGridColumns = (cols: 1 | 2 | 3 | 4) => {
    setGridColumns(cols);
    try {
      localStorage.setItem('yh_staff_ticket_grid_columns', String(cols));
    } catch (e) {
      console.error(e);
    }
  };

  // Real-time ticker to update live customer wait times every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshOrders = () => {
    setOrders(AppStore.getOrders());
    setNow(Date.now());
  };

  const handleUpdateStatus = (orderId: number, nextStatus: OrderStatus) => {
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

  const menuItems = AppStore.getMenuItems();

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

  // Barista-specific queues (orders containing drink items)
  const baristaOrdersAll = orders.filter(
    (o) => getOrderFulfillmentBreakdown(o, menuItems).hasDrinks && o.status !== 'cancelled'
  );
  const baristaToPrepCount = orders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasDrinks && (o.baristaStatus === 'to_prep' || (!o.baristaStatus && o.status === 'to_prep'));
  }).length;
  const baristaProcessingCount = orders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasDrinks && o.baristaStatus === 'processing';
  }).length;
  const baristaCompletedCount = orders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasDrinks && (o.baristaStatus === 'ready' || o.status === 'to_serve' || o.status === 'completed');
  }).length;

  // Cook-specific queues (orders containing food items)
  const cookOrdersAll = orders.filter(
    (o) => getOrderFulfillmentBreakdown(o, menuItems).hasFood && o.status !== 'cancelled'
  );
  const cookToPrepCount = orders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasFood && (o.cookStatus === 'to_prep' || (!o.cookStatus && o.status === 'to_prep'));
  }).length;
  const cookProcessingCount = orders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasFood && o.cookStatus === 'processing';
  }).length;
  const cookCompletedCount = orders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasFood && (o.cookStatus === 'ready' || o.status === 'to_serve' || o.status === 'completed');
  }).length;

  const matchesFilter = (order: Order, targetChannel?: 'in_store' | 'online') => {
    if (targetChannel && getChannel(order) !== targetChannel) return false;
    if (channelTab !== 'all' && channelTab !== 'split' && getChannel(order) !== channelTab) {
      return false;
    }

    const breakdown = getOrderFulfillmentBreakdown(order, menuItems);
    const isAllStatus = statusFilters.includes('all') || statusFilters.length === 0;

    // Barista Role: only orders that include drinks
    if (isBarista) {
      if (!breakdown.hasDrinks) return false;
      if (order.status === 'cancelled') return false;
      if (!isAllStatus) {
        const matchPrep = statusFilters.includes('to_prep') && (order.baristaStatus === 'to_prep' || (!order.baristaStatus && order.status === 'to_prep'));
        const matchProcessing = statusFilters.includes('processing') && order.baristaStatus === 'processing';
        const matchCompleted = statusFilters.includes('completed') && (order.baristaStatus === 'ready' || order.status === 'to_serve' || order.status === 'completed');
        if (!matchPrep && !matchProcessing && !matchCompleted) return false;
      }
    } else if (isCook) {
      // Cook Role: only orders that include food
      if (!breakdown.hasFood) return false;
      if (order.status === 'cancelled') return false;
      if (!isAllStatus) {
        const matchPrep = statusFilters.includes('to_prep') && (order.cookStatus === 'to_prep' || (!order.cookStatus && order.status === 'to_prep'));
        const matchProcessing = statusFilters.includes('processing') && order.cookStatus === 'processing';
        const matchCompleted = statusFilters.includes('completed') && (order.cookStatus === 'ready' || order.status === 'to_serve' || order.status === 'completed');
        if (!matchPrep && !matchProcessing && !matchCompleted) return false;
      }
    } else {
      // Cashier and Admin: station filter check + multi-status filter
      if (stationFilter === 'barista' && !breakdown.hasDrinks) return false;
      if (stationFilter === 'kitchen' && !breakdown.hasFood) return false;

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
    const breakdown = getOrderFulfillmentBreakdown(o, menuItems);
    if (isBarista) {
      if (!breakdown.hasDrinks || o.status === 'cancelled') return false;
      if (statusFilters.includes('all') || statusFilters.length === 0) return true;
      const matchPrep = statusFilters.includes('to_prep') && (o.baristaStatus === 'to_prep' || (!o.baristaStatus && o.status === 'to_prep'));
      const matchProcessing = statusFilters.includes('processing') && o.baristaStatus === 'processing';
      const matchCompleted = statusFilters.includes('completed') && (o.baristaStatus === 'ready' || o.status === 'to_serve' || o.status === 'completed');
      return matchPrep || matchProcessing || matchCompleted;
    } else if (isCook) {
      if (!breakdown.hasFood || o.status === 'cancelled') return false;
      if (statusFilters.includes('all') || statusFilters.length === 0) return true;
      const matchPrep = statusFilters.includes('to_prep') && (o.cookStatus === 'to_prep' || (!o.cookStatus && o.status === 'to_prep'));
      const matchProcessing = statusFilters.includes('processing') && o.cookStatus === 'processing';
      const matchCompleted = statusFilters.includes('completed') && (o.cookStatus === 'ready' || o.status === 'to_serve' || o.status === 'completed');
      return matchPrep || matchProcessing || matchCompleted;
    } else {
      if (stationFilter === 'barista' && !breakdown.hasDrinks) return false;
      if (stationFilter === 'kitchen' && !breakdown.hasFood) return false;
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

    if (isBarista) {
      if (order.baristaStatus === 'ready' || isToServe || isCompleted) {
        return (
          <span
            title="Drinks Ready"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-900 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Drinks Ready</span>
          </span>
        );
      }
      if (order.baristaStatus === 'processing') {
        return (
          <span
            title="Brewing / Prepping"
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-sky-950"
          >
            <Coffee className="h-3 w-3 text-sky-900 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Brewing / Prepping</span>
          </span>
        );
      }
      if (order.baristaStatus === 'to_prep' || isToPrep) {
        return (
          <span
            title="Drinks To Prep"
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-950 animate-pulse"
          >
            <Coffee className="h-3 w-3 text-amber-900 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Start Prep</span>
          </span>
        );
      }
      if (isToConfirm) {
        return (
          <span
            title="Awaiting Confirmation"
            className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-stone-900"
          >
            <Clock className="h-3 w-3 text-stone-800 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Awaiting Confirmation</span>
          </span>
        );
      }
    }

    if (isCook) {
      if (order.cookStatus === 'ready' || isToServe || isCompleted) {
        return (
          <span
            title="Kitchen Ready"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-900 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Kitchen Ready</span>
          </span>
        );
      }
      if (order.cookStatus === 'processing') {
        return (
          <span
            title="Cooking / Processing"
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-sky-950"
          >
            <ChefHat className="h-3 w-3 text-sky-900 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Cooking</span>
          </span>
        );
      }
      if (order.cookStatus === 'to_prep' || isToPrep) {
        return (
          <span
            title="Start Prep"
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-950 animate-pulse"
          >
            <Flame className="h-3 w-3 text-amber-900 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Start Prep</span>
          </span>
        );
      }
      if (isToConfirm) {
        return (
          <span
            title="Awaiting Confirmation"
            className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-stone-900"
          >
            <Clock className="h-3 w-3 text-stone-800 stroke-[2.4] shrink-0" />
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
          className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-rose-950 animate-pulse"
        >
          <AlertCircle className="h-3 w-3 text-rose-900 stroke-[2.4] shrink-0" />
          <span className="hidden sm:inline">To Confirm</span>
        </span>
      );
    }
    if (isToPrep) {
      return (
        <span
          title="To Prep"
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-950"
        >
          <Clock className="h-3 w-3 text-amber-900 stroke-[2.4] shrink-0" />
          <span className="hidden sm:inline">To Prep</span>
        </span>
      );
    }
    if (isProcessing) {
      return (
        <span
          title="Processing"
          className="inline-flex items-center gap-1 rounded-full bg-sky-100 border border-sky-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-sky-950"
        >
          <ChefHat className="h-3 w-3 text-sky-900 stroke-[2.4] shrink-0" />
          <span className="hidden sm:inline">Processing</span>
        </span>
      );
    }
    if (isToServe) {
      return (
        <span
          title="To Serve"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-400 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950 animate-bounce"
        >
          <Bell className="h-3 w-3 text-emerald-900 stroke-[2.4] shrink-0" />
          <span className="hidden sm:inline">To Serve</span>
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span
          title="Completed"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950"
        >
          <Check className="h-3 w-3 text-emerald-900 stroke-[2.5] shrink-0" />
          <span className="hidden sm:inline">Completed</span>
        </span>
      );
    }
    return (
      <span
        title={order.status}
        className="rounded-full bg-stone-100 border border-stone-300 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-stone-900"
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
              <span className="text-[9px] sm:text-[10px] text-stone-600 font-semibold shrink-0">
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
                className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide ${
                  isOnline
                    ? 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                    : 'bg-amber-100 text-amber-950 border border-amber-400'
                }`}
              >
                {isOnline ? (
                  <>
                    <Globe className="h-3 w-3 text-indigo-900 stroke-[2.4] shrink-0" />
                    <span className="hidden sm:inline">Online</span>
                  </>
                ) : (
                  <>
                    <Store className="h-3 w-3 text-amber-950 stroke-[2.4] shrink-0" />
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
                        Ready for Prep
                      </span>
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-stone-600 truncate hidden sm:block">
                      Press Start Prep
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

          {/* Station Fulfillment Status Breakdown */}
          {(() => {
            const breakdown = getOrderFulfillmentBreakdown(order, menuItems);
            if (breakdown.hasDrinks && breakdown.hasFood) {
              return (
                <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-stone-200 bg-stone-50/90 p-1 text-[9px] sm:text-[10px]">
                  {/* Barista Status */}
                  <div
                    className={`flex items-center justify-between rounded-lg px-2 py-1 border font-bold ${
                      order.baristaStatus === 'ready'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                        : order.baristaStatus === 'processing'
                        ? 'border-sky-300 bg-sky-50 text-sky-950'
                        : 'border-amber-300 bg-amber-50 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <Coffee className="h-3 w-3 shrink-0 text-amber-700" />
                      <span className="truncate">Bar:</span>
                    </div>
                    <span className="shrink-0 uppercase font-black text-[8px] sm:text-[9px]">
                      {order.baristaStatus === 'ready' ? 'Ready' : order.baristaStatus === 'processing' ? 'Prep' : 'Queue'}
                    </span>
                  </div>

                  {/* Kitchen Cook Status */}
                  <div
                    className={`flex items-center justify-between rounded-lg px-2 py-1 border font-bold ${
                      order.cookStatus === 'ready'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                        : order.cookStatus === 'processing'
                        ? 'border-sky-300 bg-sky-50 text-sky-950'
                        : 'border-amber-300 bg-amber-50 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <ChefHat className="h-3 w-3 shrink-0 text-orange-700" />
                      <span className="truncate">Kitchen:</span>
                    </div>
                    <span className="shrink-0 uppercase font-black text-[8px] sm:text-[9px]">
                      {order.cookStatus === 'ready' ? 'Ready' : order.cookStatus === 'processing' ? 'Prep' : 'Queue'}
                    </span>
                  </div>
                </div>
              );
            } else if (breakdown.hasDrinks) {
              return (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-[9px] sm:text-[10px] text-amber-950 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Coffee className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                    <span>Bar Station (Drinks Only)</span>
                  </div>
                  <span className="uppercase font-black text-[8px] sm:text-[9px]">
                    {order.baristaStatus === 'ready' ? 'Ready' : order.baristaStatus === 'processing' ? 'Prep' : 'Queue'}
                  </span>
                </div>
              );
            } else if (breakdown.hasFood) {
              return (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-2.5 py-1 text-[9px] sm:text-[10px] text-emerald-950 font-bold">
                  <div className="flex items-center gap-1.5">
                    <ChefHat className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>Kitchen Station (Food Only)</span>
                  </div>
                  <span className="uppercase font-black text-[8px] sm:text-[9px]">
                    {order.cookStatus === 'ready' ? 'Ready' : order.cookStatus === 'processing' ? 'Prep' : 'Queue'}
                  </span>
                </div>
              );
            }
            return null;
          })()}

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
          <div className="my-2 sm:my-3 space-y-1 border-y border-stone-100 py-2 sm:py-3 text-[10px] sm:text-xs max-h-28 sm:max-h-36 overflow-y-auto pr-0.5">
            {order.items.map((item, idx) => {
              const isDrink = isDrinkOrderItem(item, menuItems);
              const isDimmed = (isBarista && !isDrink) || (isCook && isDrink);

              return (
                <div
                  key={idx}
                  className={`flex justify-between items-start gap-1 py-0.5 rounded px-1 transition ${
                    isDimmed ? 'opacity-40 bg-stone-100/50' : ''
                  }`}
                >
                  <div className="flex-1 pr-1 min-w-0">
                    <div className="flex items-center gap-1 font-medium text-stone-800 truncate">
                      <span className="font-bold text-amber-800 mr-0.5">{item.quantity}x</span>
                      <span className="truncate">{item.name}</span>
                      {isDrink ? (
                        <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 text-amber-900 px-1 py-0.2 text-[8px] font-bold shrink-0">
                          <Coffee className="h-2 w-2 text-amber-700" />
                          <span>Bar</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 text-emerald-900 px-1 py-0.2 text-[8px] font-bold shrink-0">
                          <Utensils className="h-2 w-2 text-emerald-700" />
                          <span>Kitchen</span>
                        </span>
                      )}
                    </div>
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
              );
            })}
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
            className={`flex items-center justify-center gap-1 rounded-lg sm:rounded-xl bg-stone-100 hover:bg-stone-200 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-800 transition active:scale-95 cursor-pointer shrink-0 ${
              gridColumns === 1 ? 'px-2.5 py-1.5' : ''
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Receipt</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 justify-end flex-wrap">
            {/* === BARISTA ROLE ACTIONS === */}
            {isBarista && (
              <>
                {/* Drinks to prep */}
                {(order.baristaStatus === 'to_prep' || (!order.baristaStatus && (isToPrep || isProcessing))) && (
                  <button
                    type="button"
                    onClick={() => {
                      AppStore.updateOrderBaristaStatus(order.id, 'processing', activeStaff.fullName);
                      refreshOrders();
                    }}
                    className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-amber-600 hover:bg-amber-500 text-white p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                      gridColumns === 1 ? 'px-3 py-1.5' : ''
                    }`}
                    title="Start preparing drinks at barista bar"
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Prep Drinks</span>
                  </button>
                )}

                {/* Drinks processing: click to complete drinks */}
                {order.baristaStatus === 'processing' && (
                  <button
                    type="button"
                    onClick={() => {
                      AppStore.updateOrderBaristaStatus(order.id, 'ready', activeStaff.fullName);
                      refreshOrders();
                    }}
                    className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                      gridColumns === 1 ? 'px-3 py-1.5' : ''
                    }`}
                    title="Complete drinks preparation"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Drinks Ready</span>
                  </button>
                )}

                {/* Drinks already ready */}
                {order.baristaStatus === 'ready' && (
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-950">
                      <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                      <span>Drinks Ready</span>
                    </span>
                    {getOrderFulfillmentBreakdown(order, menuItems).hasFood && order.cookStatus !== 'ready' && (
                      <span className="rounded-lg border border-amber-300 bg-amber-50 px-1.5 py-1 text-[9px] font-bold text-amber-950">
                        Wait Kitchen
                      </span>
                    )}
                  </div>
                )}

                {/* Void/Issue */}
                <button
                  type="button"
                  onClick={() => {
                    setVoidReturnReason(RETURN_REASONS[0]);
                    setVoidReturnCustomNote('');
                    setVoidingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 transition active:scale-95 cursor-pointer shrink-0"
                  title="Report issue or void ticket"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-600" />
                  <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Void</span>
                </button>
              </>
            )}

            {/* === COOK ROLE ACTIONS === */}
            {isCook && (
              <>
                {/* Food to prep */}
                {(order.cookStatus === 'to_prep' || (!order.cookStatus && (isToPrep || isProcessing))) && (
                  <button
                    type="button"
                    onClick={() => {
                      AppStore.updateOrderCookStatus(order.id, 'processing', activeStaff.fullName);
                      refreshOrders();
                    }}
                    className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-sky-600 hover:bg-sky-500 text-white p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                      gridColumns === 1 ? 'px-3 py-1.5' : ''
                    }`}
                    title="Start cooking kitchen dishes"
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Prep Food</span>
                  </button>
                )}

                {/* Food processing: click to complete food */}
                {order.cookStatus === 'processing' && (
                  <button
                    type="button"
                    onClick={() => {
                      AppStore.updateOrderCookStatus(order.id, 'ready', activeStaff.fullName);
                      refreshOrders();
                    }}
                    className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                      gridColumns === 1 ? 'px-3 py-1.5' : ''
                    }`}
                    title="Complete cooking and mark kitchen food ready"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Food Ready</span>
                  </button>
                )}

                {/* Food already ready */}
                {order.cookStatus === 'ready' && (
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-950">
                      <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                      <span>Food Ready</span>
                    </span>
                    {getOrderFulfillmentBreakdown(order, menuItems).hasDrinks && order.baristaStatus !== 'ready' && (
                      <span className="rounded-lg border border-amber-300 bg-amber-50 px-1.5 py-1 text-[9px] font-bold text-amber-950">
                        Wait Barista
                      </span>
                    )}
                  </div>
                )}

                {/* Void/Issue */}
                <button
                  type="button"
                  onClick={() => {
                    setVoidReturnReason(RETURN_REASONS[0]);
                    setVoidReturnCustomNote('');
                    setVoidingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 transition active:scale-95 cursor-pointer shrink-0"
                  title="Report issue or void ticket"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-600" />
                  <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Void</span>
                </button>
              </>
            )}

            {/* === CASHIER & ADMIN ACTIONS === */}
            {!isBarista && !isCook && (
              <>
                {/* 1. TO CONFIRM (Cashier / Admin): Confirm & Cancel */}
                {isToConfirm && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'to_prep')}
                      className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 p-1.5 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-stone-950 transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                        gridColumns === 1 ? 'px-3 py-1.5' : ''
                      }`}
                      title="Confirm order and send to Barista & Kitchen"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Confirm</span>
                      <span className="hidden lg:inline"> &amp; Send</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCancelReason(CANCEL_REASONS[0]);
                        setCustomCancelNotes('');
                        setCancellingOrder(order);
                      }}
                      className={`flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 transition active:scale-95 cursor-pointer shrink-0 ${
                        gridColumns === 1 ? 'px-2.5 py-1.5' : ''
                      }`}
                      title="Cancel order"
                    >
                      <XCircle className="h-3.5 w-3.5 text-rose-600" />
                      <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Cancel</span>
                    </button>
                  </>
                )}

                {/* 2. TO PREP & PROCESSING (Cashier / Admin): Can complete drinks, food, or override complete all */}
                {(isToPrep || isProcessing) && (() => {
                  const breakdown = getOrderFulfillmentBreakdown(order, menuItems);
                  return (
                    <>
                      {/* Split buttons if order has both */}
                      {breakdown.hasDrinks && breakdown.hasFood && (
                        <>
                          {order.baristaStatus !== 'ready' && (
                            <button
                              type="button"
                              onClick={() => {
                                AppStore.updateOrderBaristaStatus(order.id, 'ready', activeStaff.fullName);
                                refreshOrders();
                              }}
                              className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-950 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
                              title="Cashier mark drinks ready"
                            >
                              <Coffee className="h-3.5 w-3.5 text-amber-700" />
                              <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Ready Bar</span>
                            </button>
                          )}
                          {order.cookStatus !== 'ready' && (
                            <button
                              type="button"
                              onClick={() => {
                                AppStore.updateOrderCookStatus(order.id, 'ready', activeStaff.fullName);
                                refreshOrders();
                              }}
                              className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
                              title="Cashier mark food ready"
                            >
                              <ChefHat className="h-3.5 w-3.5 text-emerald-700" />
                              <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Ready Kitchen</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Complete All / Ready button */}
                      <button
                        type="button"
                        onClick={() => {
                          AppStore.completeAllOrderSections(order.id, activeStaff.fullName);
                          refreshOrders();
                        }}
                        className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shadow-emerald-600/20 shrink-0 ${
                          gridColumns === 1 ? 'px-3 py-1.5' : ''
                        }`}
                        title="Cashier complete all items and mark ready to serve"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>
                          {breakdown.hasDrinks && breakdown.hasFood ? 'Complete All' : breakdown.hasDrinks ? 'Complete Drinks' : 'Complete Food'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setVoidReturnReason(RETURN_REASONS[0]);
                          setVoidReturnCustomNote('');
                          setVoidingOrder(order);
                        }}
                        className={`flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 transition active:scale-95 cursor-pointer shrink-0 ${
                          gridColumns === 1 ? 'px-2.5 py-1.5' : ''
                        }`}
                        title="Cancel or void order"
                      >
                        <Ban className="h-3.5 w-3.5 text-rose-600" />
                        <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Void</span>
                      </button>
                    </>
                  );
                })()}

                {/* 3. TO SERVE: Mark as Served & Void */}
                {isToServe && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 p-1.5 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-white transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                        gridColumns === 1 ? 'px-3 py-1.5' : ''
                      }`}
                      title="Mark order as served to customer"
                    >
                      <Bell className="h-3.5 w-3.5" />
                      <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Serve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setVoidReturnReason(RETURN_REASONS[0]);
                        setVoidReturnCustomNote('');
                        setVoidingOrder(order);
                      }}
                      className={`flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-rose-700 transition active:scale-95 cursor-pointer shrink-0 ${
                        gridColumns === 1 ? 'px-2.5 py-1.5' : ''
                      }`}
                      title="Void order"
                    >
                      <Ban className="h-3.5 w-3.5 text-rose-600" />
                      <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Void</span>
                    </button>
                  </>
                )}

                {/* 4. COMPLETED: Void */}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoidReturnReason(RETURN_REASONS[0]);
                      setVoidReturnCustomNote('');
                      setVoidingOrder(order);
                    }}
                    className={`flex items-center gap-1 rounded-lg sm:rounded-xl border border-stone-300 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-600 transition active:scale-95 cursor-pointer shrink-0 ${
                      gridColumns === 1 ? 'px-2.5 py-1.5' : ''
                    }`}
                    title="Void completed transaction"
                  >
                    <Ban className="h-3.5 w-3.5 text-rose-500" />
                    <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Void</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-stone-900 flex items-center gap-2.5">
            {isBarista ? (
              <>
                <Coffee className="h-6 w-6 text-amber-700 shrink-0" />
                <span>Barista Station</span>
              </>
            ) : isCook ? (
              <>
                <ChefHat className="h-6 w-6 text-orange-600 shrink-0" />
                <span>Kitchen Station</span>
              </>
            ) : (
              <>
                <ClipboardList className="h-6 w-6 text-stone-900 shrink-0" />
                <span>Order Tickets</span>
              </>
            )}
          </h2>
          {(isBarista || isCook) && (
            <p className="text-xs text-stone-600 mt-0.5">
              {isBarista
                ? 'Brew and prepare drinks • Kitchen handles food orders'
                : 'Cook kitchen dishes • Barista handles drink orders'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Combined Filter Button (Station, Channel & Grid Layout) */}
          <button
            id="ticket-channel-filter-btn"
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 border text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs ${
              channelTab !== 'all' || stationFilter !== 'all'
                ? 'border-amber-400 bg-amber-50/90 text-amber-950 hover:bg-amber-100 ring-1 ring-amber-400/40'
                : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-400'
            }`}
            title="Filter Orders: Station, Channel & Grid Layout"
          >
            <SlidersHorizontal
              className={`h-3.5 w-3.5 ${
                channelTab !== 'all' || stationFilter !== 'all'
                  ? 'text-amber-700'
                  : 'text-stone-500'
              }`}
            />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-stone-900">Filter &amp; View</span>

              {/* Station Badge (if filtered) */}
              {(isCashier || isAdmin) && stationFilter !== 'all' && (
                <span className="rounded-md bg-amber-200/90 px-1.5 py-0.2 text-[10px] font-black text-amber-950 uppercase">
                  {stationFilter === 'barista' ? 'Bar' : 'Kitchen'}
                </span>
              )}

              {/* Channel Badge */}
              {channelTab === 'in_store' && (
                <span className="rounded-md bg-amber-200/90 px-1.5 py-0.2 text-[10px] font-black text-amber-950">
                  In-Store ({inStoreOrdersAll.length})
                </span>
              )}
              {channelTab === 'online' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-1.5 py-0.2 text-[10px] font-black text-indigo-950">
                  Online ({onlineOrdersAll.length})
                  {pendingConfirmCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  )}
                </span>
              )}
              {channelTab === 'split' && (
                <span className="rounded-md bg-stone-900 px-1.5 py-0.2 text-[10px] font-black text-amber-400">
                  Split
                </span>
              )}

              {/* Column Badge */}
              <span className="rounded-md bg-stone-100 border border-stone-200 px-1.5 py-0.2 text-[10px] font-bold text-stone-700 hidden sm:inline">
                {gridColumns} Col
              </span>
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
              ? 'border-amber-500 bg-amber-100/90 text-stone-950 ring-1 ring-amber-500/50'
              : 'border-stone-300 bg-white text-stone-900 hover:bg-stone-100'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <SlidersHorizontal className="h-4 w-4 text-stone-950 stroke-[2.4] shrink-0" />
            <span className="text-stone-700 font-bold shrink-0">Status:</span>
            <span className="font-black text-stone-950 truncate">
              {getStatusFilterLabel()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-full bg-amber-200 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-950">
              {activeStatusCount}
            </span>
            <span className="text-[11px] text-stone-600 font-semibold">Tap to filter</span>
          </div>
        </button>
      </div>

      {/* Desktop & Tablet: Status Tabs (Multi-Select Enabled) */}
      {isBarista ? (
        /* BARISTA STATUS TABS: Start Prep | Brewing / Prepping | Ready */
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-black text-stone-800 mr-1 flex items-center gap-1">
            <Coffee className="h-3.5 w-3.5 text-amber-800 stroke-[2.2]" />
            Bar Status:
          </span>

          <button
            onClick={() => toggleStatusFilter('all')}
            className={`rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isStatusActive('all')
                ? 'bg-stone-950 text-white shadow-xs font-extrabold'
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('all') && <Check className="h-3 w-3 text-amber-400 stroke-[2.5] shrink-0" />}
            <span>All Active Bar ({toPrepCount + processingCount + toServeCount})</span>
          </button>

          <button
            onClick={() => toggleStatusFilter('to_prep')}
            title="Toggle Start Prep"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('to_prep')
                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs ring-2 ring-amber-600/30'
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('to_prep') ? (
              <Check className="h-3.5 w-3.5 text-stone-950 stroke-[2.5] shrink-0" />
            ) : (
              <Flame className="h-3.5 w-3.5 text-amber-800 stroke-[2.2] shrink-0" />
            )}
            <span>Start Prep</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_prep') ? 'bg-stone-950 text-amber-300' : 'bg-amber-200 text-amber-950 border border-amber-300'
            }`}>
              {toPrepCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('processing')}
            title="Toggle Brewing / Prepping"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('processing')
                ? 'bg-sky-600 text-white font-extrabold shadow-xs ring-2 ring-sky-600/30'
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('processing') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <Coffee className="h-3.5 w-3.5 text-sky-800 stroke-[2.2] shrink-0" />
            )}
            <span>Brewing</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('processing') ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-950 border border-sky-300'
            }`}>
              {processingCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('completed')}
            title="Toggle Drinks Ready"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('completed')
                ? 'bg-emerald-600 text-white font-extrabold shadow-xs ring-2 ring-emerald-600/30'
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('completed') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800 stroke-[2.2] shrink-0" />
            )}
            <span>Drinks Ready</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('completed') ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
            }`}>
              {toServeCount + completedCount}
            </span>
          </button>

          {!isStatusActive('all') && (
            <button
              onClick={() => toggleStatusFilter('all')}
              className="text-[11px] font-extrabold text-stone-700 hover:text-stone-950 underline ml-1 cursor-pointer"
            >
              Reset to All
            </button>
          )}
        </div>
      ) : isCook ? (
        /* COOK STATUS TABS: Start Prep | Processing | Complete */
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-black text-stone-800 mr-1 flex items-center gap-1">
            <ChefHat className="h-3.5 w-3.5 text-stone-900 stroke-[2.2]" />
            Kitchen Status:
          </span>

          <button
            onClick={() => toggleStatusFilter('all')}
            className={`rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isStatusActive('all')
                ? 'bg-stone-950 text-white shadow-xs font-extrabold'
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('all') && <Check className="h-3 w-3 text-amber-400 stroke-[2.5] shrink-0" />}
            <span>All Active Prep ({toPrepCount + processingCount + toServeCount})</span>
          </button>

          <button
            onClick={() => toggleStatusFilter('to_prep')}
            title="Toggle Start Prep"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('to_prep')
                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs ring-2 ring-amber-600/30'
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('to_prep') ? (
              <Check className="h-3.5 w-3.5 text-stone-950 stroke-[2.5] shrink-0" />
            ) : (
              <Flame className="h-3.5 w-3.5 text-amber-800 stroke-[2.2] shrink-0" />
            )}
            <span>Start Prep</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_prep') ? 'bg-stone-950 text-amber-300' : 'bg-amber-200 text-amber-950 border border-amber-300'
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
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('processing') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <ChefHat className="h-3.5 w-3.5 text-sky-800 stroke-[2.2] shrink-0" />
            )}
            <span>Processing</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('processing') ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-950 border border-sky-300'
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
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('completed') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800 stroke-[2.2] shrink-0" />
            )}
            <span>Complete</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('completed') ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
            }`}>
              {toServeCount + completedCount}
            </span>
          </button>

          {!isStatusActive('all') && (
            <button
              onClick={() => toggleStatusFilter('all')}
              className="text-[11px] font-extrabold text-stone-700 hover:text-stone-950 underline ml-1 cursor-pointer"
            >
              Reset to All
            </button>
          )}
        </div>
      ) : (
        /* CASHIER & ADMIN STATUS TABS: Multi-Select */
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-black text-stone-800 mr-1 flex items-center gap-1">
            <Store className="h-3.5 w-3.5 text-stone-900 stroke-[2.2]" />
            Cashier Status:
          </span>

          <button
            onClick={() => toggleStatusFilter('all')}
            className={`rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isStatusActive('all')
                ? 'bg-stone-950 text-white shadow-xs font-extrabold'
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('all') && <Check className="h-3 w-3 text-amber-400 stroke-[2.5] shrink-0" />}
            <span>All ({orders.length})</span>
          </button>

          <button
            onClick={() => toggleStatusFilter('to_confirm')}
            title="Toggle To Confirm"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('to_confirm')
                ? 'bg-rose-600 text-white font-extrabold shadow-xs ring-2 ring-rose-600/30'
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('to_confirm') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-rose-700 stroke-[2.2] shrink-0" />
            )}
            <span>To Confirm</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_confirm') ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-950 border border-rose-300'
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
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('to_prep') ? (
              <Check className="h-3.5 w-3.5 text-stone-950 stroke-[2.5] shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-amber-800 stroke-[2.2] shrink-0" />
            )}
            <span>To Prep</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_prep') ? 'bg-stone-950 text-amber-300' : 'bg-amber-200 text-amber-950 border border-amber-300'
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
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('processing') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <ChefHat className="h-3.5 w-3.5 text-sky-800 stroke-[2.2] shrink-0" />
            )}
            <span>Processing</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('processing') ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-950 border border-sky-300'
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
                : 'bg-white border border-stone-300 text-stone-900 hover:bg-stone-100 hover:border-stone-400'
            }`}
          >
            {isStatusActive('to_serve') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <Bell className="h-3.5 w-3.5 text-emerald-800 stroke-[2.2] shrink-0" />
            )}
            <span>To Serve</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_serve') ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
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
              <div
                className={`grid gap-2 sm:gap-4 ${
                  gridColumns === 1
                    ? 'grid-cols-1 max-w-2xl mx-auto'
                    : gridColumns === 2
                    ? 'grid-cols-2'
                    : gridColumns === 3
                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4'
                }`}
              >
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
              <div
                className={`grid gap-2 sm:gap-4 ${
                  gridColumns === 1
                    ? 'grid-cols-1 max-w-2xl mx-auto'
                    : gridColumns === 2
                    ? 'grid-cols-2'
                    : gridColumns === 3
                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4'
                }`}
              >
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
            <div
              className={`grid gap-2 sm:gap-4 ${
                gridColumns === 1
                  ? 'grid-cols-1 max-w-3xl mx-auto'
                  : gridColumns === 2
                  ? 'grid-cols-2'
                  : gridColumns === 3
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4'
              }`}
            >
              {filteredOrders.map((order) => renderOrderCard(order))}
            </div>
          )}
        </div>
      )}

      {/* VOID ORDER MODAL (Shows "Back to Cashier" or "Cancel Order") */}
      {voidingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl bg-white p-3 sm:p-5 shadow-2xl border border-stone-200 space-y-2.5 sm:space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-2.5 sm:pb-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-lg sm:rounded-xl bg-rose-100 text-rose-700 shrink-0">
                  <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-xs sm:text-sm font-extrabold text-stone-900 truncate">
                    Void Ticket #{voidingOrder.orderNumber}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-stone-500">
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
                className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Summary Box */}
            <div className="rounded-lg sm:rounded-xl bg-stone-50 p-2 sm:p-2.5 border border-stone-200/80 text-[10px] sm:text-[11px] space-y-0.5 sm:space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 truncate">
                  Guest: {voidingOrder.customerName || 'Walk-in Guest'}
                </span>
                <span className="rounded-md bg-stone-200 px-1 sm:px-1.5 py-0.5 font-mono text-[8px] sm:text-[9px] font-bold text-stone-800 shrink-0">
                  {voidingOrder.items.length} Item(s)
                </span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-stone-500 truncate">
                Items: {voidingOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>

            <div className="text-[10px] sm:text-[11px] font-extrabold text-stone-700 uppercase tracking-wider">
              Choose Void Handling Method:
            </div>

            {/* Option 1: Back to Cashier */}
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-2.5 sm:p-3 space-y-2 sm:space-y-2.5 transition hover:border-amber-400">
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-md sm:rounded-lg bg-amber-500 text-stone-950 shrink-0">
                    <Undo2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <h4 className="text-[11px] sm:text-xs font-black text-amber-950 truncate">Option 1: Back to Cashier</h4>
                </div>
                <span className="rounded-md bg-amber-200 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold text-amber-900 uppercase shrink-0">
                  Revert Queue
                </span>
              </div>

              {/* Return Reason selection */}
              <div className="space-y-1.5 sm:space-y-2 pt-1 border-t border-amber-200/60">
                <label className="text-[9px] sm:text-[10px] font-bold text-amber-950 block">
                  Select Reason for Returning:
                </label>
                <div className="flex flex-wrap gap-1">
                  {RETURN_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setVoidReturnReason(r)}
                      className={`rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold transition cursor-pointer ${
                        voidReturnReason === r
                          ? 'bg-amber-500 text-stone-950 font-bold shadow-2xs'
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
                  placeholder="Optional note for cashier..."
                  className="w-full rounded-md sm:rounded-lg border border-amber-300 bg-white px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => handleReturnToCashier(voidingOrder)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-black text-stone-950 transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  <Undo2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Confirm &amp; Send Back to Cashier</span>
                </button>
              </div>
            </div>

            {/* Option 2: Permanently Cancel */}
            <div className="rounded-xl border border-rose-300 bg-rose-50/60 p-2.5 sm:p-3 space-y-2 sm:space-y-2.5 transition hover:border-rose-400">
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-md sm:rounded-lg bg-rose-600 text-white shrink-0">
                    <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <h4 className="text-[11px] sm:text-xs font-black text-rose-950 truncate">Option 2: Cancel Order</h4>
                </div>
                <span className="rounded-md bg-rose-200 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold text-rose-900 uppercase shrink-0">
                  Permanent Void
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleProceedToCancelFromVoid(voidingOrder)}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-black text-white transition active:scale-95 cursor-pointer shadow-2xs shadow-rose-600/20"
              >
                <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>Cancel Order &amp; Specify Reason...</span>
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
              {isBarista ? (
                /* Barista Options */
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
                        <Coffee className="h-4 w-4 text-amber-700" />
                        <span>All Active Bar</span>
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
                        <Coffee className="h-4 w-4 text-sky-600" />
                        <span>Brewing / Prepping</span>
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
                        <span>Drinks Ready</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('completed') ? 'bg-emerald-200 text-emerald-950' : 'bg-emerald-100 text-emerald-900'}`}>
                      {toServeCount + completedCount}
                    </span>
                  </button>
                </div>
              ) : isCook ? (
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

      {/* Unified Filter & Layout Settings Modal */}
      {isFilterModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFilterModalOpen(false);
          }}
        >
          <div
            id="channel-filter-modal"
            className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 border border-stone-200 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-900 border border-amber-500/20">
                  <SlidersHorizontal className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-stone-900">
                    Filter &amp; View Settings
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Configure station focus, order channels, and grid layout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Station Focus (Cashier & Admin) */}
            {(isCashier || isAdmin) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-600">
                    Station Focus
                  </span>
                  <span className="text-[11px] text-stone-400">Preparation department</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStationFilter('all')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition border cursor-pointer ${
                      stationFilter === 'all'
                        ? 'border-stone-950 bg-stone-950 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {stationFilter === 'all' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    <span>All Stations</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStationFilter('barista')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition border cursor-pointer ${
                      stationFilter === 'barista'
                        ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    <span>Bar</span>
                    {stationFilter === 'barista' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStationFilter('kitchen')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition border cursor-pointer ${
                      stationFilter === 'kitchen'
                        ? 'border-orange-600 bg-orange-600 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <ChefHat className="h-3.5 w-3.5" />
                    <span>Kitchen</span>
                    {stationFilter === 'kitchen' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>
                </div>
              </div>
            )}

            {/* Section 2: Order Channel Streams */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-600">
                  Order Source Stream
                </span>
                <span className="text-[11px] text-stone-400">Origin channel</span>
              </div>

              <div className="space-y-2">
                {/* Dine-in & Online */}
                <button
                  type="button"
                  onClick={() => setChannelTab('all')}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-left text-xs font-bold transition cursor-pointer border ${
                    channelTab === 'all'
                      ? 'border-stone-950 bg-stone-950 text-white shadow-xs'
                      : 'border-stone-200 bg-stone-50/70 text-stone-800 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        channelTab === 'all'
                          ? 'bg-amber-400 border-amber-400 text-stone-950'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {channelTab === 'all' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers
                          className={`h-4 w-4 ${
                            channelTab === 'all' ? 'text-amber-400' : 'text-stone-600'
                          }`}
                        />
                        <span className="font-extrabold text-sm">Dine-in &amp; Online</span>
                      </div>
                      <p
                        className={`text-[11px] font-normal mt-0.5 ${
                          channelTab === 'all' ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        Combined feed of in-store and online customer orders
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                      channelTab === 'all' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    {orders.length}
                  </span>
                </button>

                {/* In-Store */}
                <button
                  type="button"
                  onClick={() => setChannelTab('in_store')}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-left text-xs font-bold transition cursor-pointer border ${
                    channelTab === 'in_store'
                      ? 'border-amber-500 bg-amber-50/90 text-amber-950 shadow-xs ring-1 ring-amber-400'
                      : 'border-stone-200 bg-stone-50/70 text-stone-800 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        channelTab === 'in_store'
                          ? 'bg-amber-500 border-amber-500 text-stone-950'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {channelTab === 'in_store' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-amber-700" />
                        <span className="font-extrabold text-sm">In-Store (On-the-Place)</span>
                      </div>
                      <p
                        className={`text-[11px] font-normal mt-0.5 ${
                          channelTab === 'in_store' ? 'text-amber-900/80' : 'text-stone-500'
                        }`}
                      >
                        Counter walk-ins, dine-in tables, and direct takeaway
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                      channelTab === 'in_store'
                        ? 'bg-amber-200 text-amber-950'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {inStoreOrdersAll.length}
                  </span>
                </button>

                {/* Online Orders */}
                <button
                  type="button"
                  onClick={() => setChannelTab('online')}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-left text-xs font-bold transition cursor-pointer border ${
                    channelTab === 'online'
                      ? 'border-indigo-500 bg-indigo-50/90 text-indigo-950 shadow-xs ring-1 ring-indigo-400'
                      : 'border-stone-200 bg-stone-50/70 text-stone-800 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        channelTab === 'online'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
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
                      <p
                        className={`text-[11px] font-normal mt-0.5 ${
                          channelTab === 'online' ? 'text-indigo-900/80' : 'text-stone-500'
                        }`}
                      >
                        Orders placed via customer mobile web ordering menu
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                      channelTab === 'online'
                        ? 'bg-indigo-200 text-indigo-950'
                        : 'bg-indigo-100 text-indigo-900'
                    }`}
                  >
                    {onlineOrdersAll.length}
                  </span>
                </button>

                {/* Split View */}
                <button
                  type="button"
                  onClick={() => setChannelTab('split')}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-left text-xs font-bold transition cursor-pointer border ${
                    channelTab === 'split'
                      ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                      : 'border-stone-200 bg-stone-50/70 text-stone-800 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        channelTab === 'split'
                          ? 'bg-amber-400 border-amber-400 text-stone-950'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {channelTab === 'split' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Columns
                          className={`h-4 w-4 ${
                            channelTab === 'split' ? 'text-amber-400' : 'text-stone-700'
                          }`}
                        />
                        <span className="font-extrabold text-sm">Dual Split View</span>
                      </div>
                      <p
                        className={`text-[11px] font-normal mt-0.5 ${
                          channelTab === 'split' ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        Side-by-side synchronized workflow boards for In-Store and Online
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      channelTab === 'split'
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-200 text-stone-800'
                    }`}
                  >
                    Side-by-Side
                  </span>
                </button>
              </div>
            </div>

            {/* Section 3: Grid Layout Columns */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-600">
                  Ticket Grid Layout
                </span>
                <span className="text-[11px] text-stone-400">Card columns across screen</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { cols: 1 as const, label: '1 Col', Icon: Square },
                  { cols: 2 as const, label: '2 Cols', Icon: Grid2X2 },
                  { cols: 3 as const, label: '3 Cols', Icon: Grid3X3 },
                  { cols: 4 as const, label: '4 Cols', Icon: LayoutGrid },
                ].map(({ cols, label, Icon }) => (
                  <button
                    key={cols}
                    type="button"
                    onClick={() => handleSetGridColumns(cols)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border text-center transition cursor-pointer ${
                      gridColumns === cols
                        ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                    }`}
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-white border border-stone-200 shadow-2xs text-amber-700">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xs font-bold leading-none">{label}</div>
                    {gridColumns === cols && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-700">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setStationFilter('all');
                  setChannelTab('all');
                }}
                className="text-xs font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-xl bg-stone-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition cursor-pointer shadow-xs active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
