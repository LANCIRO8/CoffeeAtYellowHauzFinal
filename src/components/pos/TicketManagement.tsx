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
  AlertTriangle,
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
  Maximize2,
  Calendar,
  Banknote,
  CreditCard,
  QrCode,
} from 'lucide-react';
import { ExpandedTicketModal } from './ExpandedTicketModal';

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

export type DatePeriod =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'custom'
  | 'all_time';

export const DATE_PERIOD_OPTIONS: {
  id: DatePeriod;
  label: string;
  description: string;
}[] = [
  { id: 'today', label: 'Today', description: 'Orders placed today' },
  { id: 'yesterday', label: 'Yesterday', description: 'Orders placed yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days', description: 'Past 7 calendar days' },
  { id: 'last_30_days', label: 'Last 30 Days', description: 'Past 30 calendar days' },
  { id: 'custom', label: 'Custom Date', description: 'Pick specific date or range' },
  { id: 'all_time', label: 'All Time', description: 'All orders across all time' },
];

export const getDatePeriodLabel = (
  period: DatePeriod,
  customStart?: string,
  customEnd?: string
): string => {
  switch (period) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'last_7_days':
      return 'Last 7 Days';
    case 'last_30_days':
      return 'Last 30 Days';
    case 'custom':
      if (customStart && customEnd && customStart !== customEnd) {
        return `${customStart} to ${customEnd}`;
      }
      return customStart ? `Date: ${customStart}` : 'Custom Date';
    case 'all_time':
    default:
      return 'All Time';
  }
};

export const isOrderInDatePeriod = (
  orderDateIso: string,
  period: DatePeriod,
  customStart?: string,
  customEnd?: string
): boolean => {
  if (period === 'all_time') return true;
  if (!orderDateIso) return false;

  const orderDate = new Date(orderDateIso);
  if (isNaN(orderDate.getTime())) return true;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  const orderTime = orderDate.getTime();

  if (period === 'today') {
    return orderTime >= todayStart && orderTime <= todayEnd;
  }

  if (period === 'yesterday') {
    const yesterdayStart = todayStart - 86400000;
    const yesterdayEnd = todayStart - 1;
    return orderTime >= yesterdayStart && orderTime <= yesterdayEnd;
  }

  if (period === 'last_7_days') {
    const sevenDaysStart = todayStart - 6 * 86400000;
    return orderTime >= sevenDaysStart && orderTime <= todayEnd;
  }

  if (period === 'last_30_days') {
    const thirtyDaysStart = todayStart - 29 * 86400000;
    return orderTime >= thirtyDaysStart && orderTime <= todayEnd;
  }

  if (period === 'custom') {
    if (!customStart && !customEnd) return true;
    const startStr = customStart || customEnd;
    const endStr = customEnd || customStart;

    if (startStr && endStr) {
      const [sYear, sMonth, sDay] = startStr.split('-').map(Number);
      const [eYear, eMonth, eDay] = endStr.split('-').map(Number);

      const customStartTime = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0).getTime();
      const customEndTime = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999).getTime();

      return orderTime >= customStartTime && orderTime <= customEndTime;
    }
    return true;
  }

  return true;
};

export const TicketManagement: React.FC<TicketManagementProps> = ({
  activeStaff,
  settings,
  onViewReceipt,
}) => {
  const { showAlert, showConfirm, showPrompt } = useModal();
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

  // Date period filter state
  const [datePeriod, setDatePeriod] = useState<DatePeriod>(() => {
    try {
      const saved = localStorage.getItem('yh_staff_ticket_date_period') as DatePeriod;
      if (
        saved &&
        ['today', 'yesterday', 'last_7_days', 'last_30_days', 'custom', 'all_time'].includes(saved)
      ) {
        return saved;
      }
    } catch {}
    const allOrders = AppStore.getOrders();
    if (allOrders.length > 0) {
      const hasToday = allOrders.some((o) => isOrderInDatePeriod(o.createdAt, 'today'));
      if (!hasToday) return 'all_time';
    }
    return 'today';
  });
  const [customDateStart, setCustomDateStart] = useState<string>(() => {
    try {
      return localStorage.getItem('yh_staff_ticket_custom_start') || '';
    } catch {
      return '';
    }
  });
  const [customDateEnd, setCustomDateEnd] = useState<string>(() => {
    try {
      return localStorage.getItem('yh_staff_ticket_custom_end') || '';
    } catch {
      return '';
    }
  });
  const [isDatePeriodMenuOpen, setIsDatePeriodMenuOpen] = useState(false);
  const datePeriodMenuRef = useRef<HTMLDivElement>(null);

  // Close date period dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (datePeriodMenuRef.current && !datePeriodMenuRef.current.contains(e.target as Node)) {
        setIsDatePeriodMenuOpen(false);
      }
    };
    if (isDatePeriodMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDatePeriodMenuOpen]);

  const handleSetDatePeriod = (period: DatePeriod) => {
    setDatePeriod(period);
    try {
      localStorage.setItem('yh_staff_ticket_date_period', period);
    } catch {}
    if (period !== 'custom') {
      setIsDatePeriodMenuOpen(false);
    }
  };

  const handleSetCustomDates = (start: string, end: string) => {
    setCustomDateStart(start);
    setCustomDateEnd(end);
    try {
      localStorage.setItem('yh_staff_ticket_custom_start', start);
      localStorage.setItem('yh_staff_ticket_custom_end', end);
    } catch {}
  };

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
        if (s === 'to_prep') return 'Preparing';
        if (s === 'processing') return 'Preparing';
        if (s === 'to_serve') return 'Served';
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

  // Payment status filter: 'all' | 'paid' | 'nyp'
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'nyp'>('all');

  // Ticket timer filter: 'all' | 'reminder' | 'priority' | 'overdue'
  const [timerFilter, setTimerFilter] = useState<'all' | 'reminder' | 'priority' | 'overdue'>('all');

  // Receive Payment Modal state for NYP tickets
  const [tenderOrder, setTenderOrder] = useState<Order | null>(null);
  const [tenderMethod, setTenderMethod] = useState<'cash' | 'gcash' | 'card'>('cash');
  const [tenderAmountPaidInput, setTenderAmountPaidInput] = useState<string>('');

  const openReceivePayment = (order: Order) => {
    setTenderOrder(order);
    setTenderMethod(order.paymentMethod || 'cash');
    setTenderAmountPaidInput(order.totalAmount.toFixed(2));
  };

  const handleAddTenderAmount = (amt: number) => {
    const cur = parseFloat(tenderAmountPaidInput) || 0;
    setTenderAmountPaidInput((cur + amt).toFixed(2));
  };

  const handleTenderNumpad = (val: string) => {
    if (val === 'CLEAR') {
      setTenderAmountPaidInput('0');
      return;
    }
    if (val === 'BACK') {
      setTenderAmountPaidInput((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (val === 'EXACT') {
      if (tenderOrder) setTenderAmountPaidInput(tenderOrder.totalAmount.toFixed(2));
      return;
    }
    setTenderAmountPaidInput((prev) => {
      if (prev === '0' && val !== '.') return val;
      if (val === '.' && prev.includes('.')) return prev;
      return prev + val;
    });
  };

  const handleConfirmReceivePayment = async () => {
    if (!tenderOrder) return;
    const totalAmount = tenderOrder.totalAmount;
    const tenderedNumber = parseFloat(tenderAmountPaidInput) || 0;

    if (tenderMethod === 'cash' && tenderedNumber < totalAmount) {
      showAlert({
        title: 'Insufficient Payment',
        message: `Tendered cash (₱${tenderedNumber.toFixed(2)}) is less than total amount due (₱${totalAmount.toFixed(2)}).`,
        type: 'error',
      });
      return;
    }

    const changeAmount = tenderMethod === 'cash' ? Math.max(0, tenderedNumber - totalAmount) : 0;
    const amountPaid = tenderMethod === 'cash' ? tenderedNumber : totalAmount;

    const updated = AppStore.markOrderAsPaid(tenderOrder.id, {
      paymentMethod: tenderMethod,
      amountPaid,
      changeAmount,
    });

    refreshOrders();
    setTenderOrder(null);

    const isConfirmed = await showConfirm({
      title: 'Payment Successful (PAID)',
      message: `Payment received for Ticket #${tenderOrder.orderNumber}!\n\n• Amount Paid: ₱${amountPaid.toFixed(2)}\n• Method: ${tenderMethod.toUpperCase()}\n${tenderMethod === 'cash' ? `• Change: ₱${changeAmount.toFixed(2)}\n` : ''}• State: PAID\n\nWould you like to print or view the receipt now?`,
      type: 'success',
      confirmText: 'Print Receipt',
      cancelText: 'Done',
    });

    if (isConfirmed && updated) {
      onViewReceipt(updated);
    }
  };

  // Expanded Ticket Modal state
  const [expandedOrder, setExpandedOrder] = useState<Order | null>(null);
  const activeExpandedOrder = expandedOrder
    ? orders.find((o) => o.id === expandedOrder.id) || null
    : null;

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

  const handleToggleItemServed = (orderId: number, itemIndex: number) => {
    AppStore.toggleOrderItemServed(orderId, itemIndex, activeStaff.fullName);
    refreshOrders();
  };

  const handleToggleAllServed = (orderId: number, served: boolean) => {
    AppStore.markAllOrderItemsServed(orderId, served, activeStaff.fullName);
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

  const handleApproveCustomerCancellation = async (order: Order) => {
    const confirmed = await showConfirm({
      title: `Approve Cancellation: Order #${order.orderNumber}`,
      message: `The customer requested to cancel Order #${order.orderNumber}.\n\nReason: "${order.cancellationReason || 'Customer requested'}"\n${order.cancellationNotes ? `Notes: "${order.cancellationNotes}"\n` : ''}\nConfirming will void this order and return reserved stock to inventory. Proceed?`,
      type: 'danger',
      confirmText: 'Approve & Cancel Order',
      cancelText: 'Keep Order Active',
    });

    if (confirmed) {
      AppStore.confirmOrderCancellation(
        order.id,
        activeStaff.fullName || 'Staff',
        order.cancellationNotes
      );
      refreshOrders();
      showAlert({
        title: 'Order Cancelled',
        message: `Order #${order.orderNumber} has been officially cancelled and stock returned.`,
        type: 'success',
      });
    }
  };

  const handleDeclineCustomerCancellation = async (order: Order) => {
    const declineReason = await showPrompt({
      title: `Decline Cancellation: Order #${order.orderNumber}`,
      message: 'Enter a note explaining why this cancellation cannot be approved (e.g. Order already prepared):',
      placeholder: 'Reason for declining cancellation request',
      defaultValue: 'Order is already being prepared in the kitchen.',
    });

    if (declineReason !== null) {
      AppStore.rejectOrderCancellation(order.id, declineReason.trim() || undefined);
      refreshOrders();
      showAlert({
        title: 'Cancellation Declined',
        message: `The customer's cancellation request was declined. They have been notified, and the order continues in the queue.`,
        type: 'info',
      });
    }
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

    const isActive = isPendingOrConfirm || isToPrep || isProcessing || isToServe;

    // Ticket Timer thresholds per official rules:
    // 15mins is yellow so Reminder
    // 30mins is red so Priority
    // 40mins is the max so Overdue
    const isOverdue = isActive && totalWaitDurationMs >= 40 * 60 * 1000;
    const isPriority = isActive && totalWaitDurationMs >= 30 * 60 * 1000 && !isOverdue;
    const isReminder = isActive && totalWaitDurationMs >= 15 * 60 * 1000 && !isPriority && !isOverdue;

    const timerTier: 'normal' | 'reminder' | 'priority' | 'overdue' = isOverdue
      ? 'overdue'
      : isPriority
      ? 'priority'
      : isReminder
      ? 'reminder'
      : 'normal';

    const timerLabel: 'Normal' | 'Reminder' | 'Priority' | 'Overdue' = isOverdue
      ? 'Overdue'
      : isPriority
      ? 'Priority'
      : isReminder
      ? 'Reminder'
      : 'Normal';

    const isUrgent = isOverdue || isPriority;
    const isWarning = isReminder;

    return {
      pendingDurationMs,
      processingDurationMs,
      totalWaitDurationMs,
      isOverdue,
      isPriority,
      isReminder,
      isUrgent,
      isWarning,
      timerTier,
      timerLabel,
    };
  };

  const menuItems = AppStore.getMenuItems();

  // Subset of orders filtered by selected date period
  const dateFilteredOrders = orders.filter((o) =>
    isOrderInDatePeriod(o.createdAt, datePeriod, customDateStart, customDateEnd)
  );

  const inStoreOrdersAll = dateFilteredOrders.filter((o) => getChannel(o) === 'in_store');
  const onlineOrdersAll = dateFilteredOrders.filter((o) => getChannel(o) === 'online');
  const pendingConfirmCount = dateFilteredOrders.filter(
    (o) => o.status === 'to_confirm' || o.status === 'pending'
  ).length;
  const toPrepCount = dateFilteredOrders.filter((o) => o.status === 'to_prep').length;
  const processingCount = dateFilteredOrders.filter((o) => o.status === 'processing').length;
  const toServeCount = dateFilteredOrders.filter((o) => o.status === 'to_serve').length;
  const completedCount = dateFilteredOrders.filter((o) => o.status === 'completed').length;
  const cancelledCount = dateFilteredOrders.filter((o) => o.status === 'cancelled').length;

  // Barista-specific queues (orders containing drink items)
  const baristaOrdersAll = dateFilteredOrders.filter(
    (o) => getOrderFulfillmentBreakdown(o, menuItems).hasDrinks && o.status !== 'cancelled'
  );
  const baristaToPrepCount = dateFilteredOrders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasDrinks && (o.baristaStatus === 'to_prep' || (!o.baristaStatus && o.status === 'to_prep'));
  }).length;
  const baristaProcessingCount = dateFilteredOrders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasDrinks && o.baristaStatus === 'processing';
  }).length;
  const baristaCompletedCount = dateFilteredOrders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasDrinks && (o.baristaStatus === 'ready' || o.status === 'to_serve' || o.status === 'completed');
  }).length;

  // Cook-specific queues (orders containing food items)
  const cookOrdersAll = dateFilteredOrders.filter(
    (o) => getOrderFulfillmentBreakdown(o, menuItems).hasFood && o.status !== 'cancelled'
  );
  const cookToPrepCount = dateFilteredOrders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasFood && (o.cookStatus === 'to_prep' || (!o.cookStatus && o.status === 'to_prep'));
  }).length;
  const cookProcessingCount = dateFilteredOrders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasFood && o.cookStatus === 'processing';
  }).length;
  const cookCompletedCount = dateFilteredOrders.filter((o) => {
    const b = getOrderFulfillmentBreakdown(o, menuItems);
    return b.hasFood && (o.cookStatus === 'ready' || o.status === 'to_serve' || o.status === 'completed');
  }).length;

  // Active orders timer counts (Reminder >= 15m, Priority >= 30m, Overdue >= 40m)
  const activeOrdersAll = dateFilteredOrders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  );
  const reminderCount = activeOrdersAll.filter((o) => getOrderTimings(o).isReminder).length;
  const priorityCount = activeOrdersAll.filter((o) => getOrderTimings(o).isPriority).length;
  const overdueCount = activeOrdersAll.filter((o) => getOrderTimings(o).isOverdue).length;

  const matchesFilter = (order: Order, targetChannel?: 'in_store' | 'online') => {
    if (!isOrderInDatePeriod(order.createdAt, datePeriod, customDateStart, customDateEnd)) {
      return false;
    }
    if (targetChannel && getChannel(order) !== targetChannel) return false;
    if (channelTab !== 'all' && channelTab !== 'split' && getChannel(order) !== channelTab) {
      return false;
    }

    // Payment state filter: 'all' | 'paid' | 'nyp'
    if (paymentFilter === 'paid' && order.paymentStatus !== 'paid') return false;
    if (paymentFilter === 'nyp' && order.paymentStatus !== 'nyp') return false;

    // Ticket timer status filter: 'all' | 'reminder' | 'priority' | 'overdue'
    if (timerFilter !== 'all') {
      const timings = getOrderTimings(order);
      if (timerFilter === 'reminder' && !timings.isReminder) return false;
      if (timerFilter === 'priority' && !timings.isPriority) return false;
      if (timerFilter === 'overdue' && !timings.isOverdue) return false;
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

  const filteredOrders = dateFilteredOrders.filter((o) => matchesFilter(o));
  const filteredInStore = dateFilteredOrders.filter((o) => matchesFilter(o, 'in_store'));
  const filteredOnline = dateFilteredOrders.filter((o) => matchesFilter(o, 'online'));

  const nypCount = dateFilteredOrders.filter((o) => o.paymentStatus === 'nyp' && o.status !== 'cancelled').length;
  const paidCount = dateFilteredOrders.filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled').length;

  const activeStatusCount = dateFilteredOrders.filter((o) => {
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
            title="Drinks Served"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-400 dark:border-emerald-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-900 dark:text-emerald-400 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Served</span>
          </span>
        );
      }
      if (order.baristaStatus === 'processing' || order.baristaStatus === 'to_prep' || isProcessing || isToPrep) {
        return (
          <span
            title="Preparing Drinks"
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950/70 border border-sky-400 dark:border-sky-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-sky-950 dark:text-sky-300"
          >
            <Coffee className="h-3 w-3 text-sky-900 dark:text-sky-400 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Preparing</span>
          </span>
        );
      }
      if (isToConfirm) {
        return (
          <span
            title="To Confirm"
            className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-400 dark:border-rose-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-rose-950 dark:text-rose-300 animate-pulse"
          >
            <Clock className="h-3 w-3 text-rose-900 dark:text-rose-400 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">To Confirm</span>
          </span>
        );
      }
    }

    if (isCook) {
      if (order.cookStatus === 'ready' || isToServe || isCompleted) {
        return (
          <span
            title="Food Served"
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-400 dark:border-emerald-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-900 dark:text-emerald-400 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Served</span>
          </span>
        );
      }
      if (order.cookStatus === 'processing' || order.cookStatus === 'to_prep' || isProcessing || isToPrep) {
        return (
          <span
            title="Preparing Food"
            className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950/70 border border-sky-400 dark:border-sky-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-sky-950 dark:text-sky-300"
          >
            <ChefHat className="h-3 w-3 text-sky-900 dark:text-sky-400 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">Preparing</span>
          </span>
        );
      }
      if (isToConfirm) {
        return (
          <span
            title="To Confirm"
            className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-400 dark:border-rose-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-rose-950 dark:text-rose-300 animate-pulse"
          >
            <Clock className="h-3 w-3 text-rose-900 dark:text-rose-400 stroke-[2.4] shrink-0" />
            <span className="hidden sm:inline">To Confirm</span>
          </span>
        );
      }
    }

    // Cashier & Admin Badges
    if (isToConfirm) {
      return (
        <span
          title="To Confirm"
          className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950/70 border border-rose-400 dark:border-rose-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-rose-950 dark:text-rose-300 animate-pulse"
        >
          <AlertCircle className="h-3 w-3 text-rose-900 dark:text-rose-400 stroke-[2.4] shrink-0" />
          <span className="hidden sm:inline">To Confirm</span>
        </span>
      );
    }
    if (isProcessing || isToPrep) {
      return (
        <span
          title="Preparing"
          className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950/70 border border-sky-400 dark:border-sky-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-sky-950 dark:text-sky-300"
        >
          <ChefHat className="h-3 w-3 text-sky-900 dark:text-sky-400 stroke-[2.4] shrink-0" />
          <span className="hidden sm:inline">Preparing</span>
        </span>
      );
    }
    if (isToServe || isCompleted) {
      return (
        <span
          title="Served"
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-400 dark:border-emerald-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950 dark:text-emerald-300"
        >
          <Check className="h-3 w-3 text-emerald-900 dark:text-emerald-400 stroke-[2.5] shrink-0" />
          <span className="hidden sm:inline">Served</span>
        </span>
      );
    }
    return (
      <span
        title={order.status}
        className="rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 px-1.5 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-stone-900 dark:text-stone-300"
      >
        <span className="hidden sm:inline">{order.status}</span>
      </span>
    );
  };

  // Render payment status badge
  const renderPaymentBadge = (order: Order) => {
    if (order.status === 'cancelled') return null;
    const isNyp = order.paymentStatus === 'nyp';
    if (isNyp) {
      return (
        <span
          title="Not Yet Paid (NYP) - Payment is pending/deferred"
          className="inline-flex items-center gap-0.5 sm:gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide bg-amber-500/15 border border-amber-500 text-amber-950 dark:text-amber-300 animate-pulse"
        >
          <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-700 dark:text-amber-400 stroke-[2.5]" />
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

  const renderOrderCard = (order: Order) => {
    const isToConfirm = order.status === 'to_confirm' || order.status === 'pending';
    const isToPrep = order.status === 'to_prep';
    const isProcessing = order.status === 'processing';
    const isToServe = order.status === 'to_serve';
    const isCompleted = order.status === 'completed';
    const isCancelled = order.status === 'cancelled';

    const channel = getChannel(order);
    const isOnline = channel === 'online';

    const {
      pendingDurationMs,
      processingDurationMs,
      totalWaitDurationMs,
      isOverdue,
      isPriority,
      isReminder,
      isUrgent,
      isWarning,
      timerTier,
      timerLabel,
    } = getOrderTimings(order);

    const allItemsServed = order.items.length > 0 && order.items.every((it) => it.isServed);
    const servedCount = order.items.filter((it) => it.isServed).length;

    const isServedAndPaid =
      order.paymentStatus === 'paid' &&
      (order.status === 'to_serve' || order.status === 'completed' || allItemsServed);
    const isHideCheckboxes = isServedAndPaid || isCompleted;

    return (
      <div
        key={order.id}
        onClick={() => setExpandedOrder(order)}
        title={`Click to expand ticket #${order.orderNumber}`}
        className={`group flex flex-col justify-between rounded-2xl sm:rounded-3xl border bg-white dark:bg-stone-900 p-2.5 sm:p-4 md:p-5 shadow-xs transition hover:shadow-md cursor-pointer hover:border-amber-400 dark:hover:border-amber-600 ${
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
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2 sm:pb-3 gap-1">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setExpandedOrder(order)}
                title="Expand ticket in modal"
                className="font-mono text-[11px] sm:text-xs font-extrabold text-stone-900 dark:text-stone-100 truncate hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer text-left"
              >
                #{order.orderNumber}
              </button>
              <span className="text-[9px] sm:text-[10px] text-stone-600 dark:text-stone-400 font-semibold shrink-0">
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>

              {/* Ticket Timer Status Badge */}
              {!isCompleted && !isCancelled && (
                <span
                  title={
                    isOverdue
                      ? `Overdue: ${formatDuration(totalWaitDurationMs)} (exceeded 40 mins max limit)`
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
              {/* Channel badge */}
              <span
                title={isOnline ? 'Online Order' : 'In-Store Order'}
                className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide ${
                  isOnline
                    ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-300 border border-amber-400 dark:border-amber-800'
                }`}
              >
                {isOnline ? (
                  <>
                    <Globe className="h-3 w-3 text-indigo-900 dark:text-indigo-300 stroke-[2.4] shrink-0" />
                    <span className="hidden sm:inline">Online</span>
                  </>
                ) : (
                  <>
                    <Store className="h-3 w-3 text-amber-950 dark:text-amber-300 stroke-[2.4] shrink-0" />
                    <span className="hidden sm:inline">In-Store</span>
                  </>
                )}
              </span>

              {/* Payment status badge (NYP or Paid) */}
              {renderPaymentBadge(order)}

              {/* Role-adapted Status pill */}
              {renderStatusBadge(order)}

              {/* Expand ticket modal button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedOrder(order);
                }}
                title="Expand ticket in modal"
                aria-label={`Expand ticket #${order.orderNumber}`}
                className="grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-md sm:rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-amber-100 hover:border-amber-300 hover:text-stone-950 dark:hover:bg-stone-700 transition cursor-pointer shrink-0"
              >
                <Maximize2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.4]" />
              </button>
            </div>
          </div>

          {/* Time Spent & State Indicator Banner */}
          <div className="mt-2 sm:mt-3">
            {/* Customer Cancellation Requested Alert Banner */}
            {order.cancellationRequested && !isCancelled && (
              <div className="mb-2 rounded-xl sm:rounded-2xl border-2 border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60 p-2 sm:p-2.5 text-rose-950 dark:text-rose-200 shadow-xs animate-in fade-in-0 duration-150">
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
                {/* Quick Staff Action Buttons for Cancellation */}
                {!isBarista && !isCook && (
                  <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-rose-200 dark:border-rose-800/80">
                    <button
                      type="button"
                      onClick={() => handleApproveCustomerCancellation(order)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white py-1 px-2 text-[10px] sm:text-xs font-black transition active:scale-95 cursor-pointer shadow-2xs"
                      title="Approve customer cancellation and void ticket"
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                      <span>Approve &amp; Void</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeclineCustomerCancellation(order)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 py-1 px-2 text-[10px] sm:text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
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
                  <div className="rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 flex items-start gap-1.5 shadow-2xs">
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
                <div className="rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border bg-rose-50/80 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200 flex items-center justify-between gap-1.5 shadow-2xs">
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
                  <div className="text-right text-[9px] sm:text-[10px] font-mono font-bold text-rose-900 dark:text-rose-300 shrink-0">
                    {formatDuration(pendingDurationMs)}
                  </div>
                </div>
              </div>
            )}

            {isToPrep && (
              <div
                className={`rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border flex items-center justify-between gap-1.5 shadow-2xs ${
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
                      <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide truncate ${
                        isOverdue
                          ? 'text-red-900 dark:text-red-300'
                          : isPriority
                          ? 'text-rose-900 dark:text-rose-300'
                          : 'text-amber-900 dark:text-amber-300'
                      }`}>
                        {isOverdue
                          ? 'Overdue (40m Max Exceeded)'
                          : isPriority
                          ? 'Priority (30m+ Wait)'
                          : isReminder
                          ? 'Reminder (15m+ Wait)'
                          : 'Ready for Prep'}
                      </span>
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-stone-600 dark:text-stone-400 truncate hidden sm:block">
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
                  <div className={`font-mono text-[10px] sm:text-xs font-black ${
                    isOverdue
                      ? 'text-red-900 dark:text-red-300'
                      : isPriority
                      ? 'text-rose-900 dark:text-rose-300'
                      : 'text-amber-900 dark:text-amber-300'
                  }`}>
                    {formatDuration(pendingDurationMs)}
                  </div>
                </div>
              </div>
            )}

            {isProcessing && (
              <div
                className={`rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 border space-y-1 shadow-2xs ${
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
                  <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                    <span className={`grid h-4 w-4 sm:h-5 sm:w-5 place-items-center rounded-md text-white shrink-0 ${
                      isOverdue
                        ? 'bg-red-600 animate-pulse'
                        : isPriority
                        ? 'bg-rose-600'
                        : 'bg-sky-600 animate-spin'
                    }`}>
                      {isOverdue ? (
                        <AlertTriangle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      ) : (
                        <ChefHat className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      )}
                    </span>
                    <span className={`text-[9px] sm:text-[11px] font-bold truncate ${
                      isOverdue
                        ? 'text-red-900 dark:text-red-300'
                        : isPriority
                        ? 'text-rose-900 dark:text-rose-300'
                        : 'text-sky-900 dark:text-sky-300'
                    }`}>
                      {isCook ? 'Cooking:' : 'Preparing:'}
                    </span>
                  </div>
                  <span className={`font-mono text-[10px] sm:text-xs font-black shrink-0 ${
                    isOverdue
                      ? 'text-red-800 dark:text-red-300'
                      : isPriority
                      ? 'text-rose-800 dark:text-rose-300'
                      : 'text-sky-800 dark:text-sky-300'
                  }`}>
                    {formatDuration(processingDurationMs)}
                  </span>
                </div>

                <div className={`flex items-center justify-between text-[9px] sm:text-[11px] pt-1 border-t ${
                  isOverdue
                    ? 'border-red-200/80 dark:border-red-800/80 text-red-900 dark:text-red-300'
                    : isPriority
                    ? 'border-rose-200/80 dark:border-rose-800/80 text-rose-900 dark:text-rose-300'
                    : isReminder
                    ? 'border-amber-200/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-300'
                    : 'border-sky-200/70 dark:border-sky-800/70 text-stone-600 dark:text-stone-400'
                }`}>
                  <span className="flex items-center gap-1 text-[9px] sm:text-[10px]">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-stone-400 dark:text-stone-500" />
                    <span className="hidden sm:inline">Wait:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    {(isOverdue || isPriority || isReminder) && (
                      <span className={`rounded-sm px-1 py-0.2 text-[8px] font-black uppercase ${
                        isOverdue
                          ? 'bg-red-600 text-white'
                          : isPriority
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-400 text-stone-950'
                      }`}>
                        {timerLabel}
                      </span>
                    )}
                    <span className="font-mono font-bold text-stone-900 dark:text-stone-200 text-[10px] sm:text-xs">
                      {formatDuration(totalWaitDurationMs)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isToServe && (
              <div className="rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 p-1.5 sm:p-2.5 text-emerald-950 dark:text-emerald-200 flex items-center justify-between gap-1.5 shadow-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="grid h-5 w-5 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl bg-emerald-600 text-white shrink-0">
                    <Check className="h-3 w-3 sm:h-4 sm:w-4 stroke-[3]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wide text-emerald-900 dark:text-emerald-300 block truncate">
                      Served
                    </span>
                    <span className="text-[9px] sm:text-[11px] font-medium text-emerald-800 dark:text-emerald-400 hidden sm:block truncate">
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
              <div className="rounded-xl sm:rounded-2xl bg-stone-50 dark:bg-stone-800/80 p-1.5 sm:p-2.5 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 flex items-center justify-between gap-1.5 shadow-2xs">
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
              <div className="rounded-xl sm:rounded-2xl bg-rose-50/80 dark:bg-rose-950/60 p-1.5 sm:p-2.5 border border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200 space-y-1 shadow-2xs">
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

          {/* Station Fulfillment Status Breakdown */}
          {(() => {
            const breakdown = getOrderFulfillmentBreakdown(order, menuItems);
            if (breakdown.hasDrinks && breakdown.hasFood) {
              return (
                <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl border border-stone-200 dark:border-stone-700/80 bg-stone-50/90 dark:bg-stone-800/80 p-1 text-[9px] sm:text-[10px]">
                  {/* Barista Status */}
                  <div
                    className={`flex items-center justify-between rounded-lg px-2 py-1 border font-bold ${
                      order.baristaStatus === 'ready'
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300'
                        : order.baristaStatus === 'processing'
                        ? 'border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-950 dark:text-sky-300'
                        : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <Coffee className="h-3 w-3 shrink-0 text-amber-700 dark:text-amber-400" />
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
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300'
                        : order.cookStatus === 'processing'
                        ? 'border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 text-sky-950 dark:text-sky-300'
                        : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <ChefHat className="h-3 w-3 shrink-0 text-orange-700 dark:text-orange-400" />
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
                <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/60 px-2.5 py-1 text-[9px] sm:text-[10px] text-amber-950 dark:text-amber-300 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Coffee className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>Bar Station (Drinks Only)</span>
                  </div>
                  <span className="uppercase font-black text-[8px] sm:text-[9px]">
                    {order.baristaStatus === 'ready' ? 'Ready' : order.baristaStatus === 'processing' ? 'Prep' : 'Queue'}
                  </span>
                </div>
              );
            } else if (breakdown.hasFood) {
              return (
                <div className="mt-2 flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/60 px-2.5 py-1 text-[9px] sm:text-[10px] text-emerald-950 dark:text-emerald-300 font-bold">
                  <div className="flex items-center gap-1.5">
                    <ChefHat className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
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
              <div className="flex items-center gap-1 font-semibold text-stone-900 dark:text-stone-100 truncate">
                <UserIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-400 shrink-0" />
                <span className="truncate max-w-[90px] sm:max-w-[140px]">
                  {order.customerName || (isOnline ? 'Online Guest' : 'Walk-in')}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {allItemsServed && (
                  <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-0.5">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                    <span>All Served</span>
                  </span>
                )}
                {order.orderClassification === 'live_in_house' || order.tableNumber ? (
                  <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 px-1 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-emerald-950 dark:text-emerald-300 flex items-center gap-0.5 sm:gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>T#{order.tableNumber || 1}</span>
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 px-1 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black text-amber-950 dark:text-amber-300 uppercase">
                    Adv
                  </span>
                )}
              </div>
            </div>

            {/* If Advance Booking: Show Reservation Details */}
            {order.advanceBooking && (
              <div className="rounded-lg sm:rounded-xl bg-amber-500/10 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/70 p-1.5 text-[9px] sm:text-[11px] text-amber-950 dark:text-amber-300 space-y-0.5">
                <div className="flex items-center justify-between font-bold">
                  <span>📅 {order.advanceBooking.arrivalTime}</span>
                  <span>👥 {order.advanceBooking.partySize || 2}</span>
                </div>
              </div>
            )}
          </div>

          {/* Items List Header */}
          <div className="flex items-center justify-between mt-2 pt-1 px-0.5 text-[9px] sm:text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <span>Items</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-black transition-colors ${
                  allItemsServed
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80'
                    : servedCount > 0
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300/70 dark:border-amber-800/60'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                }`}
              >
                {servedCount}/{order.items.length} served
              </span>
            </span>

            {order.items.length > 1 && !isToConfirm && !isCancelled && !isHideCheckboxes && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleAllServed(order.id, !allItemsServed);
                }}
                className="text-[9px] font-bold text-amber-800 dark:text-amber-400 hover:text-amber-950 dark:hover:text-amber-300 underline underline-offset-2 transition cursor-pointer"
                title={allItemsServed ? 'Mark all items as unserved' : 'Mark all items as served'}
              >
                {allItemsServed ? 'Unserve all' : 'Serve all'}
              </button>
            )}
          </div>

          {/* Items List with Served Checkboxes */}
          <div className="my-1.5 sm:my-2 space-y-1.5 border-y border-stone-100 dark:border-stone-800 py-1.5 sm:py-2.5 text-[10px] sm:text-xs max-h-36 sm:max-h-48 overflow-y-auto pr-0.5">
            {order.items.map((item, idx) => {
              const isDrink = isDrinkOrderItem(item, menuItems);
              const isDimmed = (isBarista && !isDrink) || (isCook && isDrink);
              const isServed = Boolean(item.isServed);

              return (
                <div
                  key={idx}
                  className={`group/item flex items-start gap-1.5 sm:gap-2 py-1 px-1.5 rounded-lg transition-all ${
                    isServed
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleItemServed(order.id, idx);
                      }}
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
                      className={`mt-0.5 shrink-0 h-4.5 w-4.5 rounded-md flex items-center justify-center transition-all border ${
                        isToConfirm || isCancelled
                          ? 'opacity-40 cursor-not-allowed border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-transparent'
                          : isServed
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs cursor-pointer'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-transparent cursor-pointer'
                      }`}
                    >
                      {isServed ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : (
                        <Check className="h-2.5 w-2.5 opacity-0 group-hover/item:opacity-40 text-stone-500 transition-opacity" />
                      )}
                    </button>
                  )}

                  <div className="flex-1 pr-1 min-w-0">
                    <div className="flex items-center gap-1 font-medium text-stone-800 dark:text-stone-200 flex-wrap">
                      <span
                        className={`font-bold mr-0.5 transition-colors ${
                          isServed ? 'text-stone-400 dark:text-stone-500' : 'text-amber-800 dark:text-amber-400'
                        }`}
                      >
                        {item.quantity}x
                      </span>
                      <span
                        className={`truncate font-semibold transition-all ${
                          isServed ? 'line-through text-stone-400 dark:text-stone-500' : 'text-stone-800 dark:text-stone-200'
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
                      {isServed && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider shrink-0 border border-emerald-200 dark:border-emerald-800/60">
                          <Check className="h-2 w-2 stroke-[3]" />
                          <span>Served</span>
                        </span>
                      )}
                    </div>
                    {item.specialInstructions && (
                      <p
                        className={`text-[8px] sm:text-[10px] italic ml-1 font-semibold line-clamp-1 transition-colors ${
                          isServed ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        "{item.specialInstructions}"
                      </p>
                    )}
                    {item.servedAt && isServed && (
                      <p className="text-[8px] text-emerald-700 dark:text-emerald-400 font-medium ml-1">
                        Served {new Date(item.servedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {item.servedBy ? ` • ${item.servedBy}` : ''}
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-mono text-stone-600 dark:text-stone-400 shrink-0 text-[10px] sm:text-xs ${
                      isServed ? 'line-through text-stone-400 dark:text-stone-500' : ''
                    }`}
                  >
                    ₱{item.totalPrice.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Financial & Payment Info */}
          <div className="flex items-center justify-between text-[9px] sm:text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-stone-500 dark:text-stone-400 uppercase font-bold text-[8px] sm:text-[10px] flex items-center gap-1 truncate max-w-[80px] sm:max-w-none">
                {order.paymentMethod}
              </span>
              {order.paymentStatus === 'nyp' ? (
                <span className="rounded bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-1 py-0.2 text-[8px] sm:text-[9px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-tight">
                  NYP
                </span>
              ) : (
                <span className="rounded bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 px-1 py-0.2 text-[8px] sm:text-[9px] font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-tight">
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
        <div className="mt-2.5 sm:mt-4 pt-2 sm:pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewReceipt(order);
              }}
              title="Print Receipt"
              className={`flex items-center justify-center gap-1 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition active:scale-95 cursor-pointer shrink-0 ${
                gridColumns === 1 ? 'px-2.5 py-1.5' : ''
              }`}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Receipt</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedOrder(order);
              }}
              title="Expand ticket in modal"
              className={`flex items-center justify-center gap-1 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-amber-950 dark:text-amber-200 border border-amber-300/80 dark:border-amber-800/80 transition active:scale-95 cursor-pointer shrink-0 ${
                gridColumns === 1 ? 'px-2.5 py-1.5' : ''
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 stroke-[2.2]" />
              <span className={gridColumns === 1 ? 'inline' : 'hidden md:inline'}>Expand</span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 justify-end flex-wrap">
            {/* === BARISTA ROLE ACTIONS === */}
            {isBarista && (
              <>
                {/* Drinks to prep */}
                {(order.baristaStatus === 'to_prep' || (!order.baristaStatus && (isToPrep || isProcessing))) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
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
                    onClick={(e) => {
                      e.stopPropagation();
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
                    <span className="flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[10px] font-black text-emerald-950 dark:text-emerald-300">
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                      <span>Drinks Ready</span>
                    </span>
                    {getOrderFulfillmentBreakdown(order, menuItems).hasFood && order.cookStatus !== 'ready' && (
                      <span className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-1 text-[9px] font-bold text-amber-950 dark:text-amber-300">
                        Wait Kitchen
                      </span>
                    )}
                  </div>
                )}

                {/* Void/Issue */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVoidReturnReason(RETURN_REASONS[0]);
                    setVoidReturnCustomNote('');
                    setVoidingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 dark:text-rose-300 transition active:scale-95 cursor-pointer shrink-0"
                  title="Report issue or void ticket"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
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
                    onClick={(e) => {
                      e.stopPropagation();
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
                    onClick={(e) => {
                      e.stopPropagation();
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
                    <span className="flex items-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 text-[10px] font-black text-emerald-950 dark:text-emerald-300">
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                      <span>Food Ready</span>
                    </span>
                    {getOrderFulfillmentBreakdown(order, menuItems).hasDrinks && order.baristaStatus !== 'ready' && (
                      <span className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-1 text-[9px] font-bold text-amber-950 dark:text-amber-300">
                        Wait Barista
                      </span>
                    )}
                  </div>
                )}

                {/* Void/Issue */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setVoidReturnReason(RETURN_REASONS[0]);
                    setVoidReturnCustomNote('');
                    setVoidingOrder(order);
                  }}
                  className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 dark:text-rose-300 transition active:scale-95 cursor-pointer shrink-0"
                  title="Report issue or void ticket"
                >
                  <Ban className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Void</span>
                </button>
              </>
            )}

            {/* === CASHIER & ADMIN ACTIONS === */}
            {!isBarista && !isCook && (
              <>
                {/* NYP Direct Collect Payment Button */}
                {order.paymentStatus === 'nyp' && !isCancelled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openReceivePayment(order);
                    }}
                    className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-black transition shadow-xs active:scale-95 cursor-pointer ring-1 ring-amber-600/30 shrink-0 ${
                      gridColumns === 1 ? 'px-3 py-1.5' : ''
                    }`}
                    title={`Collect payment for ticket #${order.orderNumber}`}
                  >
                    <Banknote className="h-3.5 w-3.5 shrink-0" />
                    <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Collect Payment</span>
                    <span className={gridColumns === 1 ? 'hidden' : 'sm:hidden'}>Collect</span>
                  </button>
                )}

                {/* 1. TO CONFIRM (Cashier / Admin): Confirm & Cancel */}
                {isToConfirm && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(order.id, 'processing');
                      }}
                      className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-amber-500 hover:bg-amber-400 p-1.5 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-stone-950 transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                        gridColumns === 1 ? 'px-3 py-1.5' : ''
                      }`}
                      title="Confirm order and set to Preparing"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                      <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Confirm</span>
                      <span className="hidden lg:inline"> &amp; Prep</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelReason(CANCEL_REASONS[0]);
                        setCustomCancelNotes('');
                        setCancellingOrder(order);
                      }}
                      className={`flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 dark:text-rose-300 transition active:scale-95 cursor-pointer shrink-0 ${
                        gridColumns === 1 ? 'px-2.5 py-1.5' : ''
                      }`}
                      title="Cancel order"
                    >
                      <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
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
                              onClick={(e) => {
                                e.stopPropagation();
                                AppStore.updateOrderBaristaStatus(order.id, 'ready', activeStaff.fullName);
                                refreshOrders();
                              }}
                              className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-950 dark:text-amber-200 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
                              title="Cashier mark drinks ready"
                            >
                              <Coffee className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                              <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Ready Bar</span>
                            </button>
                          )}
                          {order.cookStatus !== 'ready' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                AppStore.updateOrderCookStatus(order.id, 'ready', activeStaff.fullName);
                                refreshOrders();
                              }}
                              className="flex items-center gap-1 rounded-lg sm:rounded-xl border border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 p-1.5 sm:px-2.5 sm:py-1.5 text-[10px] sm:text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
                              title="Cashier mark food ready"
                            >
                              <ChefHat className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                              <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Ready Kitchen</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* Serve All / Complete items button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          AppStore.completeAllOrderSections(order.id, activeStaff.fullName);
                          refreshOrders();
                        }}
                        className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-extrabold transition shadow-xs active:scale-95 cursor-pointer shadow-emerald-600/20 shrink-0 ${
                          gridColumns === 1 ? 'px-3 py-1.5' : ''
                        }`}
                        title="Check all items and mark ticket as Served"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>
                          {breakdown.hasDrinks && breakdown.hasFood ? 'Serve All' : breakdown.hasDrinks ? 'Serve Drinks' : 'Serve Food'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVoidReturnReason(RETURN_REASONS[0]);
                          setVoidReturnCustomNote('');
                          setVoidingOrder(order);
                        }}
                        className={`flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-rose-700 dark:text-rose-300 transition active:scale-95 cursor-pointer shrink-0 ${
                          gridColumns === 1 ? 'px-2.5 py-1.5' : ''
                        }`}
                        title="Cancel or void order"
                      >
                        <Ban className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Void</span>
                      </button>
                    </>
                  );
                })()}

                {/* 3. SERVED (to_serve): Mark as Completed & Void */}
                {isToServe && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(order.id, 'completed');
                      }}
                      className={`flex items-center gap-1 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-500 p-1.5 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-white transition shadow-xs active:scale-95 cursor-pointer shrink-0 ${
                        gridColumns === 1 ? 'px-3 py-1.5' : ''
                      }`}
                      title="All items served — click to finalize/complete order"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Complete</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVoidReturnReason(RETURN_REASONS[0]);
                        setVoidReturnCustomNote('');
                        setVoidingOrder(order);
                      }}
                      className={`flex items-center gap-1 rounded-lg sm:rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold text-rose-700 dark:text-rose-300 transition active:scale-95 cursor-pointer shrink-0 ${
                        gridColumns === 1 ? 'px-2.5 py-1.5' : ''
                      }`}
                      title="Void order"
                    >
                      <Ban className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      <span className={gridColumns === 1 ? 'inline' : 'hidden sm:inline'}>Void</span>
                    </button>
                  </>
                )}

                {/* 4. COMPLETED: Void */}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVoidReturnReason(RETURN_REASONS[0]);
                      setVoidReturnCustomNote('');
                      setVoidingOrder(order);
                    }}
                    className={`flex items-center gap-1 rounded-lg sm:rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:border-rose-300 dark:border-rose-800 hover:text-rose-700 dark:hover:text-rose-300 p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-600 dark:text-stone-300 transition active:scale-95 cursor-pointer shrink-0 ${
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
          <h2 className="font-display text-2xl font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            {isBarista ? (
              <>
                <Coffee className="h-6 w-6 text-amber-700 dark:text-amber-400 shrink-0" />
                <span>Barista Station</span>
              </>
            ) : isCook ? (
              <>
                <ChefHat className="h-6 w-6 text-orange-600 dark:text-orange-400 shrink-0" />
                <span>Kitchen Station</span>
              </>
            ) : (
              <>
                <ClipboardList className="h-6 w-6 text-stone-900 dark:text-stone-100 shrink-0" />
                <span>Order Tickets</span>
              </>
            )}
          </h2>
          {(isBarista || isCook) && (
            <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
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
              channelTab !== 'all' || stationFilter !== 'all' || datePeriod !== 'all_time' || paymentFilter !== 'all' || timerFilter !== 'all'
                ? 'border-amber-400 dark:border-amber-600 bg-amber-50/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 ring-1 ring-amber-400/40'
                : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
            title="Filter Orders: Station, Channel, Payment Status, Ticket Timer, Date Period & Grid Layout"
          >
            <SlidersHorizontal
              className={`h-3.5 w-3.5 ${
                channelTab !== 'all' || stationFilter !== 'all' || datePeriod !== 'all_time' || paymentFilter !== 'all' || timerFilter !== 'all'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-stone-500 dark:text-stone-400'
              }`}
            />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-stone-900 dark:text-stone-100">Filter &amp; View</span>

              {/* Station Badge (if filtered) */}
              {(isCashier || isAdmin) && stationFilter !== 'all' && (
                <span className="rounded-md bg-amber-200/90 dark:bg-amber-900/70 px-1.5 py-0.2 text-[10px] font-black text-amber-950 dark:text-amber-200 uppercase">
                  {stationFilter === 'barista' ? 'Bar' : 'Kitchen'}
                </span>
              )}

              {/* Payment Status Badge (if filtered) */}
              {paymentFilter !== 'all' && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-200/90 dark:bg-amber-900/70 px-1.5 py-0.2 text-[10px] font-black text-amber-950 dark:text-amber-200">
                  <Banknote className="h-2.5 w-2.5" />
                  <span>{paymentFilter === 'nyp' ? 'NYP' : 'Paid'}</span>
                </span>
              )}

              {/* Ticket Timer Badge (if filtered) */}
              {timerFilter !== 'all' && (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.2 text-[10px] font-black ${
                    timerFilter === 'reminder'
                      ? 'bg-amber-300 dark:bg-amber-800 text-stone-950 dark:text-amber-100'
                      : timerFilter === 'priority'
                      ? 'bg-rose-600 text-white'
                      : 'bg-red-600 text-white animate-pulse'
                  }`}
                >
                  <Timer className="h-2.5 w-2.5" />
                  <span>{timerFilter === 'reminder' ? '15m' : timerFilter === 'priority' ? '30m' : '40m'}</span>
                </span>
              )}

              {/* Date Period Badge */}
              {datePeriod !== 'all_time' && (
                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-200/90 dark:bg-amber-900/70 px-1.5 py-0.2 text-[10px] font-black text-amber-950 dark:text-amber-200">
                  <Calendar className="h-2.5 w-2.5" />
                  <span>{getDatePeriodLabel(datePeriod, customDateStart, customDateEnd)}</span>
                </span>
              )}

              {/* Channel Badge */}
              {channelTab === 'in_store' && (
                <span className="rounded-md bg-amber-200/90 dark:bg-amber-900/70 px-1.5 py-0.2 text-[10px] font-black text-amber-950 dark:text-amber-200">
                  In-Store ({inStoreOrdersAll.length})
                </span>
              )}
              {channelTab === 'online' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 px-1.5 py-0.2 text-[10px] font-black text-indigo-950 dark:text-indigo-200">
                  Online ({onlineOrdersAll.length})
                  {pendingConfirmCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  )}
                </span>
              )}
              {channelTab === 'split' && (
                <span className="rounded-md bg-stone-900 dark:bg-stone-100 px-1.5 py-0.2 text-[10px] font-black text-amber-400 dark:text-stone-950">
                  Split
                </span>
              )}

              {/* Column Badge */}
              <span className="rounded-md bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 px-1.5 py-0.2 text-[10px] font-bold text-stone-700 dark:text-stone-300 hidden sm:inline">
                {gridColumns} Col
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
          </button>

          {/* Quick Date Period Filter Dropdown */}
          <div className="relative" ref={datePeriodMenuRef}>
            <button
              id="ticket-date-period-filter-btn"
              type="button"
              onClick={() => setIsDatePeriodMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 border text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs ${
                datePeriod !== 'all_time'
                  ? 'border-amber-400 dark:border-amber-600 bg-amber-50/90 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 ring-1 ring-amber-400/40'
                  : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750'
              }`}
              title="Filter Tickets by Date Period"
            >
              <Calendar className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span className="font-extrabold truncate max-w-[120px] sm:max-w-none">
                {getDatePeriodLabel(datePeriod, customDateStart, customDateEnd)}
              </span>
              <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${isDatePeriodMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Floating Dropdown Menu */}
            {isDatePeriodMenuOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 z-40 w-72 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-2 shadow-xl space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Date Period
                  </span>
                  {datePeriod !== 'all_time' && (
                    <button
                      type="button"
                      onClick={() => handleSetDatePeriod('all_time')}
                      className="text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Reset (All Time)
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {DATE_PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSetDatePeriod(opt.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition cursor-pointer ${
                        datePeriod === opt.id
                          ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                          : 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold'
                      }`}
                    >
                      <div>
                        <div className="font-bold leading-tight">{opt.label}</div>
                        <div
                          className={`text-[10px] ${
                            datePeriod === opt.id
                              ? 'text-stone-900/80 font-normal'
                              : 'text-stone-500 dark:text-stone-400 font-normal'
                          }`}
                        >
                          {opt.description}
                        </div>
                      </div>
                      {datePeriod === opt.id && <Check className="h-4 w-4 stroke-[3] shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>

                {/* Custom Date Pickers when 'custom' is active */}
                {datePeriod === 'custom' && (
                  <div className="mt-2 pt-2 border-t border-stone-100 dark:border-stone-800 p-1 space-y-2 bg-stone-50/70 dark:bg-stone-850 rounded-xl">
                    <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 block px-1">
                      Custom Range:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9px] font-bold text-stone-400 block mb-0.5">Start Date</label>
                        <input
                          type="date"
                          value={customDateStart}
                          onChange={(e) => handleSetCustomDates(e.target.value, customDateEnd)}
                          className="w-full text-[11px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-1 text-stone-800 dark:text-stone-200"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-stone-400 block mb-0.5">End Date</label>
                        <input
                          type="date"
                          value={customDateEnd}
                          onChange={(e) => handleSetCustomDates(customDateStart, e.target.value)}
                          className="w-full text-[11px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-1 text-stone-800 dark:text-stone-200"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDatePeriodMenuOpen(false)}
                      className="w-full rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-1 text-xs font-bold transition active:scale-95 cursor-pointer mt-1"
                    >
                      Apply Range
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search bar: compact icon toggle on mobile, full input on tablet/desktop */}
          {!isMobileSearchOpen && !searchQuery ? (
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              className="sm:hidden flex items-center justify-center h-8 w-8 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750 transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
              title="Search tickets"
            >
              <Search className="h-4 w-4 text-stone-500 dark:text-stone-400" />
            </button>
          ) : (
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket #, guest..."
                autoFocus={isMobileSearchOpen}
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 pl-9 pr-8 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:border-amber-500 focus:outline-none"
              />
              {(searchQuery || isMobileSearchOpen) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsMobileSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-2 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 sm:hidden"
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
              ? 'border-amber-500 bg-amber-100/90 dark:bg-amber-950/80 text-stone-950 dark:text-amber-200 ring-1 ring-amber-500/50'
              : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <SlidersHorizontal className="h-4 w-4 text-stone-950 dark:text-stone-100 stroke-[2.4] shrink-0" />
            <span className="text-stone-700 dark:text-stone-300 font-bold shrink-0">Status:</span>
            <span className="font-black text-stone-950 dark:text-stone-100 truncate">
              {getStatusFilterLabel()}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="rounded-full bg-amber-200 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-2 py-0.5 text-[10px] font-black text-amber-950 dark:text-amber-300">
              {activeStatusCount}
            </span>
            <span className="text-[11px] text-stone-600 dark:text-stone-400 font-semibold">Tap to filter</span>
          </div>
        </button>
      </div>

      {/* Desktop & Tablet: Status Tabs (Multi-Select Enabled) */}
      {isBarista ? (
        /* BARISTA STATUS TABS: Start Prep | Brewing / Prepping | Ready */
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-black text-stone-800 dark:text-stone-200 mr-1 flex items-center gap-1">
            <Coffee className="h-3.5 w-3.5 text-amber-800 dark:text-amber-400 stroke-[2.2]" />
            Bar Status:
          </span>

          <button
            onClick={() => toggleStatusFilter('all')}
            className={`rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isStatusActive('all')
                ? 'bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs font-extrabold'
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
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
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('to_prep') ? (
              <Check className="h-3.5 w-3.5 text-stone-950 stroke-[2.5] shrink-0" />
            ) : (
              <Flame className="h-3.5 w-3.5 text-amber-800 dark:text-amber-400 stroke-[2.2] shrink-0" />
            )}
            <span>Start Prep</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_prep') ? 'bg-stone-950 text-amber-300 dark:bg-white/20 dark:text-amber-300' : 'bg-amber-200 dark:bg-amber-950/80 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
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
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('processing') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <Coffee className="h-3.5 w-3.5 text-sky-800 dark:text-sky-400 stroke-[2.2] shrink-0" />
            )}
            <span>Brewing</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('processing') ? 'bg-white/20 text-white' : 'bg-sky-100 dark:bg-sky-950/80 text-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
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
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('completed') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400 stroke-[2.2] shrink-0" />
            )}
            <span>Drinks Ready</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('completed') ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}>
              {toServeCount + completedCount}
            </span>
          </button>

          {!isStatusActive('all') && (
            <button
              onClick={() => toggleStatusFilter('all')}
              className="text-[11px] font-extrabold text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white underline ml-1 cursor-pointer"
            >
              Reset to All
            </button>
          )}
        </div>
      ) : isCook ? (
        /* COOK STATUS TABS: Start Prep | Processing | Complete */
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-black text-stone-800 dark:text-stone-200 mr-1 flex items-center gap-1">
            <ChefHat className="h-3.5 w-3.5 text-stone-900 dark:text-stone-200 stroke-[2.2]" />
            Kitchen Status:
          </span>

          <button
            onClick={() => toggleStatusFilter('all')}
            className={`rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isStatusActive('all')
                ? 'bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs font-extrabold'
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
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
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('to_prep') ? (
              <Check className="h-3.5 w-3.5 text-stone-950 stroke-[2.5] shrink-0" />
            ) : (
              <Flame className="h-3.5 w-3.5 text-amber-800 dark:text-amber-400 stroke-[2.2] shrink-0" />
            )}
            <span>Start Prep</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_prep') ? 'bg-stone-950 text-amber-300 dark:bg-white/20 dark:text-amber-300' : 'bg-amber-200 dark:bg-amber-950/80 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
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
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('processing') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <ChefHat className="h-3.5 w-3.5 text-sky-800 dark:text-sky-400 stroke-[2.2] shrink-0" />
            )}
            <span>Processing</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('processing') ? 'bg-white/20 text-white' : 'bg-sky-100 dark:bg-sky-950/80 text-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
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
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('completed') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400 stroke-[2.2] shrink-0" />
            )}
            <span>Complete</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('completed') ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}>
              {toServeCount + completedCount}
            </span>
          </button>

          {!isStatusActive('all') && (
            <button
              onClick={() => toggleStatusFilter('all')}
              className="text-[11px] font-extrabold text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white underline ml-1 cursor-pointer"
            >
              Reset to All
            </button>
          )}
        </div>
      ) : (
        /* CASHIER & ADMIN STATUS TABS: Multi-Select */
        <div className="hidden sm:flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-black text-stone-800 dark:text-stone-200 mr-1 flex items-center gap-1">
            <Store className="h-3.5 w-3.5 text-stone-900 dark:text-stone-300 stroke-[2.2]" />
            Cashier Status:
          </span>

          <button
            onClick={() => toggleStatusFilter('all')}
            className={`rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              isStatusActive('all')
                ? 'bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs font-extrabold'
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
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
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('to_confirm') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-rose-700 dark:text-rose-400 stroke-[2.2] shrink-0" />
            )}
            <span>To Confirm</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_confirm') ? 'bg-white/20 text-white' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
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
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('to_prep') ? (
              <Check className="h-3.5 w-3.5 text-stone-950 stroke-[2.5] shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-amber-800 dark:text-amber-400 stroke-[2.2] shrink-0" />
            )}
            <span>To Prep</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_prep') ? 'bg-stone-950 text-amber-300 dark:bg-white/20 dark:text-amber-300' : 'bg-amber-200 dark:bg-amber-950/80 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
            }`}>
              {toPrepCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('processing')}
            title="Toggle Preparing"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('processing')
                ? 'bg-sky-600 text-white font-extrabold shadow-xs ring-2 ring-sky-600/30'
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('processing') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <ChefHat className="h-3.5 w-3.5 text-sky-800 dark:text-sky-400 stroke-[2.2] shrink-0" />
            )}
            <span>Preparing</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('processing') ? 'bg-white/20 text-white' : 'bg-sky-100 dark:bg-sky-950/80 text-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
            }`}>
              {processingCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('to_serve')}
            title="Toggle Served"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('to_serve')
                ? 'bg-emerald-600 text-white font-extrabold shadow-xs ring-2 ring-emerald-600/30'
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('to_serve') ? (
              <Check className="h-3.5 w-3.5 text-white stroke-[2.5] shrink-0" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400 stroke-[2.2] shrink-0" />
            )}
            <span>Served</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('to_serve') ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}>
              {toServeCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('completed')}
            title="Toggle Completed"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('completed')
                ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-950 font-extrabold shadow-xs ring-2 ring-stone-900/30'
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('completed') ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600 shrink-0" />
            ) : (
              <Check className="h-3.5 w-3.5 text-stone-400 dark:text-stone-400 shrink-0" />
            )}
            <span>Completed</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('completed') ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
            }`}>
              {completedCount}
            </span>
          </button>

          <button
            onClick={() => toggleStatusFilter('cancelled')}
            title="Toggle Cancelled"
            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              isStatusActive('cancelled')
                ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-950 font-extrabold shadow-xs ring-2 ring-stone-900/30'
                : 'bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-400 dark:hover:border-stone-600'
            }`}
          >
            {isStatusActive('cancelled') ? (
              <Check className="h-3.5 w-3.5 text-rose-400 dark:text-rose-600 shrink-0" />
            ) : (
              <Ban className="h-3.5 w-3.5 text-rose-400 dark:text-rose-400 shrink-0" />
            )}
            <span>Cancelled</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
              isStatusActive('cancelled') ? 'bg-white/20 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-600'
            }`}>
              {cancelledCount}
            </span>
          </button>

          {!isStatusActive('all') && (
            <button
              onClick={() => toggleStatusFilter('all')}
              className="text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 underline ml-1 cursor-pointer"
            >
              Reset to All
            </button>
          )}
        </div>
      )}

      {/* Active Filter Chips (shown only when Payment Status or Ticket Timer filter is applied from the filter modal) */}
      {(paymentFilter !== 'all' || timerFilter !== 'all') && (
        <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
          <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 flex items-center gap-1">
            <SlidersHorizontal className="h-3 w-3" />
            <span>Active Filters:</span>
          </span>
          {paymentFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 shadow-2xs">
              <Banknote className="h-3 w-3 text-amber-700 dark:text-amber-400" />
              <span>Payment: {paymentFilter === 'nyp' ? 'Not Yet Paid' : 'Paid'}</span>
              <button
                type="button"
                onClick={() => setPaymentFilter('all')}
                className="hover:text-amber-950 dark:hover:text-white cursor-pointer ml-0.5 rounded p-0.5"
                title="Clear payment filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {timerFilter !== 'all' && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs ${
                timerFilter === 'reminder'
                  ? 'bg-amber-400/20 text-amber-950 dark:text-amber-200 border-amber-400'
                  : timerFilter === 'priority'
                  ? 'bg-rose-500/20 text-rose-950 dark:text-rose-200 border-rose-500'
                  : 'bg-red-500/20 text-red-950 dark:text-red-200 border-red-500 ring-1 ring-red-500/50'
              }`}
            >
              {timerFilter === 'reminder' ? (
                <Timer className="h-3 w-3 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
              ) : timerFilter === 'priority' ? (
                <Flame className="h-3 w-3 text-rose-600 dark:text-rose-400" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400 stroke-[2.8]" />
              )}
              <span>
                Timer:{' '}
                {timerFilter === 'reminder'
                  ? '15m Reminder'
                  : timerFilter === 'priority'
                  ? '30m Priority'
                  : '40m Overdue'}
              </span>
              <button
                type="button"
                onClick={() => setTimerFilter('all')}
                className="hover:opacity-100 opacity-70 cursor-pointer ml-0.5 rounded p-0.5"
                title="Clear timer filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer ml-1"
          >
            Adjust in Filter Modal
          </button>
          <button
            type="button"
            onClick={() => {
              setPaymentFilter('all');
              setTimerFilter('all');
            }}
            className="text-[11px] font-bold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 underline cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Orders Display: Split Mode vs Unified Grid */}
      {channelTab === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column: On-the-Place Orders */}
          <div className="rounded-2xl sm:rounded-3xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 p-2.5 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-amber-800/60 pb-2 sm:pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-amber-500 text-stone-950">
                  <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">In-Store Orders</h3>
                  <p className="text-[9px] sm:text-[10px] text-stone-500 dark:text-stone-400">Dine-In &amp; Counter Orders</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-200/80 dark:bg-amber-900/60 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-amber-900 dark:text-amber-200">
                {filteredInStore.length}
              </span>
            </div>

            {filteredInStore.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 dark:border-amber-800/80 bg-white/70 dark:bg-stone-800/50 p-6 sm:p-8 text-center text-xs text-stone-500 dark:text-stone-400">
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
          <div className="rounded-2xl sm:rounded-3xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 p-2.5 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-200/80 dark:border-indigo-800/60 pb-2 sm:pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-indigo-600 text-white">
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">Online Orders</h3>
                  <p className="text-[9px] sm:text-[10px] text-stone-500 dark:text-stone-400">Customer portal &amp; advance orders</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-200/80 dark:bg-indigo-900/60 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
                {filteredOnline.length}
              </span>
            </div>

            {filteredOnline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-800/80 bg-white/70 dark:bg-stone-800/50 p-6 sm:p-8 text-center text-xs text-stone-500 dark:text-stone-400">
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
            <div className="rounded-2xl sm:rounded-3xl border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-8 sm:p-12 text-center text-xs text-stone-500 dark:text-stone-400 space-y-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-stone-800 dark:text-stone-200">
                  No orders found for {getDatePeriodLabel(datePeriod, customDateStart, customDateEnd)}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Try choosing a different date period or check All Time.
                </p>
              </div>
              {datePeriod !== 'all_time' && orders.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSetDatePeriod('all_time')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-stone-950 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  <span>View All Time ({orders.length} Total Tickets)</span>
                </button>
              )}
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
          <div className="w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl bg-white dark:bg-stone-900 p-3 sm:p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-2.5 sm:space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-2.5 sm:pb-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-lg sm:rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 shrink-0">
                  <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-xs sm:text-sm font-extrabold text-stone-900 dark:text-stone-100 truncate">
                    Void Ticket #{voidingOrder.orderNumber}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-stone-500 dark:text-stone-400">
                    Stage:{' '}
                    <span className="font-bold text-stone-800 dark:text-stone-200 capitalize">
                      {voidingOrder.status === 'processing'
                        ? 'Active Kitchen Prep'
                        : voidingOrder.status === 'to_serve'
                        ? 'Ready to Serve'
                        : voidingOrder.status === 'completed'
                        ? 'Completed Order'
                        : voidingOrder.status}
                    </span>{' '}
                    • Total:{' '}
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-400">
                      ₱{voidingOrder.totalAmount.toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVoidingOrder(null)}
                className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Summary Box */}
            <div className="rounded-lg sm:rounded-xl bg-stone-50 dark:bg-stone-800/60 p-2 sm:p-2.5 border border-stone-200/80 dark:border-stone-700/80 text-[10px] sm:text-[11px] space-y-0.5 sm:space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                  Guest: {voidingOrder.customerName || 'Walk-in Guest'}
                </span>
                <span className="rounded-md bg-stone-200 dark:bg-stone-700 px-1 sm:px-1.5 py-0.5 font-mono text-[8px] sm:text-[9px] font-bold text-stone-800 dark:text-stone-200 shrink-0">
                  {voidingOrder.items.length} Item(s)
                </span>
              </div>
              <div className="text-[9px] sm:text-[10px] text-stone-500 dark:text-stone-400 truncate">
                Items: {voidingOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>

            <div className="text-[10px] sm:text-[11px] font-extrabold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Choose Void Handling Method:
            </div>

            {/* Option 1: Back to Cashier */}
            <div className="rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 sm:p-3 space-y-2 sm:space-y-2.5 transition hover:border-amber-400">
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-md sm:rounded-lg bg-amber-500 text-stone-950 shrink-0">
                    <Undo2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <h4 className="text-[11px] sm:text-xs font-black text-amber-950 dark:text-amber-200 truncate">Option 1: Back to Cashier</h4>
                </div>
                <span className="rounded-md bg-amber-200 dark:bg-amber-900/60 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold text-amber-900 dark:text-amber-300 uppercase shrink-0">
                  Revert Queue
                </span>
              </div>

              {/* Return Reason selection */}
              <div className="space-y-1.5 sm:space-y-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                <label className="text-[9px] sm:text-[10px] font-bold text-amber-950 dark:text-amber-200 block">
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
                          : 'bg-white/90 dark:bg-stone-800 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-300 hover:bg-white dark:hover:bg-stone-750'
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
                  className="w-full rounded-md sm:rounded-lg border border-amber-300 dark:border-amber-700/70 bg-white dark:bg-stone-800 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
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
            <div className="rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/20 p-2.5 sm:p-3 space-y-2 sm:space-y-2.5 transition hover:border-rose-400">
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-md sm:rounded-lg bg-rose-600 text-white shrink-0">
                    <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </div>
                  <h4 className="text-[11px] sm:text-xs font-black text-rose-950 dark:text-rose-200 truncate">Option 2: Cancel Order</h4>
                </div>
                <span className="rounded-md bg-rose-200 dark:bg-rose-900/60 px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold text-rose-900 dark:text-rose-300 uppercase shrink-0">
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
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-stone-900 p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400">
                  <XCircle className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-extrabold text-stone-900 dark:text-stone-100">
                    Cancel Ticket #{cancellingOrder.orderNumber}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
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
                className="grid h-8 w-8 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Select Reason */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
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
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 font-bold shadow-2xs'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full border grid place-items-center shrink-0 ${
                          isSelected ? 'border-rose-600 bg-rose-600' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
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
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
                <span>Custom Notes / Specific Explanation (Optional):</span>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 font-normal">Audit Log</span>
              </label>
              <textarea
                value={customCancelNotes}
                onChange={(e) => setCustomCancelNotes(e.target.value)}
                placeholder="e.g. Customer walked out before cooking started, processed refund..."
                rows={3}
                className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 p-3 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-rose-500 focus:bg-white dark:focus:bg-stone-800 focus:outline-none"
              />
            </div>

            {/* Notice */}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 p-2.5 text-[11px] text-amber-950 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Cancelling will restore{' '}
                {cancellingOrder.items.reduce((s, i) => s + i.quantity, 0)} item(s) back to active
                inventory stock and free any occupied tables.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setCancellingOrder(null);
                  setCustomCancelNotes('');
                }}
                className="rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
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

      {/* EXPANDED TICKET MODAL */}
      {activeExpandedOrder && (
        <ExpandedTicketModal
          order={activeExpandedOrder}
          activeStaff={activeStaff}
          onClose={() => setExpandedOrder(null)}
          onViewReceipt={onViewReceipt}
          onUpdateStatus={handleUpdateStatus}
          onToggleItemServed={handleToggleItemServed}
          onToggleAllServed={handleToggleAllServed}
          onCompleteAllSections={(orderId) => {
            AppStore.completeAllOrderSections(orderId, activeStaff.fullName);
            refreshOrders();
          }}
          onUpdateBaristaStatus={(orderId, status) => {
            AppStore.updateOrderBaristaStatus(orderId, status, activeStaff.fullName);
            refreshOrders();
          }}
          onUpdateCookStatus={(orderId, status) => {
            AppStore.updateOrderCookStatus(orderId, status, activeStaff.fullName);
            refreshOrders();
          }}
          onOpenVoidModal={(ord) => {
            setVoidReturnReason(RETURN_REASONS[0]);
            setVoidReturnCustomNote('');
            setVoidingOrder(ord);
          }}
          onOpenCancelModal={(ord) => {
            setCancelReason(CANCEL_REASONS[0]);
            setCustomCancelNotes('');
            setCancellingOrder(ord);
          }}
          onApproveCancellation={handleApproveCustomerCancellation}
          onDeclineCancellation={handleDeclineCustomerCancellation}
          onReceivePayment={(ord) => {
            setExpandedOrder(null);
            openReceivePayment(ord);
          }}
          formatDuration={formatDuration}
          now={now}
        />
      )}

      {/* RECEIVE PAYMENT / TENDER MODAL */}
      {tenderOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-stone-900 p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-stone-950 font-black shadow-xs">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                      Receive Payment
                    </h3>
                    <span className="rounded-md bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 text-[9px] font-black text-amber-900 dark:text-amber-300 uppercase">
                      Ticket #{tenderOrder.orderNumber}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {tenderOrder.customerName || 'Walk-in Guest'} • {tenderOrder.orderType === 'dine_in' ? `Dine-In (Table #${tenderOrder.tableNumber || 1})` : 'Takeaway'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTenderOrder(null)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total Due Banner */}
            <div className="rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block">Total Amount Due</span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  {tenderOrder.items.length} item{tenderOrder.items.length === 1 ? '' : 's'} • State: <strong className="underline">NOT YET PAID (NYP)</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-200">
                  ₱{tenderOrder.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash' as const, label: 'Cash', icon: Banknote },
                  { id: 'gcash' as const, label: 'GCash', icon: QrCode },
                  { id: 'card' as const, label: 'Card', icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = tenderMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setTenderMethod(m.id);
                        if (m.id !== 'cash' && tenderOrder) {
                          setTenderAmountPaidInput(tenderOrder.totalAmount.toFixed(2));
                        }
                      }}
                      className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        isSel
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-stone-950 dark:text-amber-200 font-black shadow-xs ring-2 ring-amber-500/20'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-750'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-bold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Tender Input & Quick Amounts */}
            {tenderMethod === 'cash' ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      Tendered Cash Amount (₱)
                    </label>
                    {parseFloat(tenderAmountPaidInput) > 0 && parseFloat(tenderAmountPaidInput) < tenderOrder.totalAmount && (
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        Short by ₱{(tenderOrder.totalAmount - parseFloat(tenderAmountPaidInput)).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-mono text-base font-bold text-stone-400">₱</span>
                    <input
                      type="number"
                      step="any"
                      value={tenderAmountPaidInput}
                      onChange={(e) => setTenderAmountPaidInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 pl-8 pr-4 py-2 font-mono text-lg font-black text-stone-900 dark:text-stone-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Cash Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTenderNumpad('EXACT')}
                    className="rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 px-2.5 py-1 text-xs font-bold text-stone-800 dark:text-stone-200 cursor-pointer"
                  >
                    Exact (₱{tenderOrder.totalAmount.toFixed(2)})
                  </button>
                  {[20, 50, 100, 200, 500, 1000].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => {
                        const current = parseFloat(tenderAmountPaidInput) || 0;
                        setTenderAmountPaidInput((current + denom).toFixed(2));
                      }}
                      className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer"
                    >
                      +{denom}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleTenderNumpad('CLEAR')}
                    className="rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* Change calculation display */}
                <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 p-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-600 dark:text-stone-300">Change Due:</span>
                  <span className={`font-mono text-xl font-black ${
                    (parseFloat(tenderAmountPaidInput) || 0) >= tenderOrder.totalAmount
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-stone-400'
                  }`}>
                    ₱{Math.max(0, (parseFloat(tenderAmountPaidInput) || 0) - tenderOrder.totalAmount).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 p-3.5 text-xs text-stone-600 dark:text-stone-300 space-y-1">
                <p className="font-bold text-stone-900 dark:text-stone-100">
                  {tenderMethod === 'gcash' ? 'GCash Digital Wallet' : 'Credit / Debit Card Terminal'}
                </p>
                <p>
                  Please confirm transaction on terminal / mobile app for <strong>₱{tenderOrder.totalAmount.toFixed(2)}</strong>.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setTenderOrder(null)}
                className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750 cursor-pointer"
              >
                Keep as NYP
              </button>
              <button
                type="button"
                onClick={handleConfirmReceivePayment}
                disabled={tenderMethod === 'cash' && (parseFloat(tenderAmountPaidInput) || 0) < tenderOrder.totalAmount}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 px-5 py-2.5 text-xs font-black shadow-md transition active:scale-95 cursor-pointer"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Confirm Payment (Mark as PAID)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Status Filter Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-amber-100 dark:bg-amber-950/50 p-2 text-amber-900 dark:text-amber-400">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-base text-stone-900 dark:text-stone-100">
                    Filter by Status
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    Choose one or multiple statuses to display
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Payment Filter for Cashier & Admin in Mobile Modal */}
            {!isBarista && !isCook && (
              <div className="space-y-1.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-850 border border-stone-200 dark:border-stone-750">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                  Payment Status Filter:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentFilter('all')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                      paymentFilter === 'all'
                        ? 'bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 font-black shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-750'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentFilter('nyp')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                      paymentFilter === 'nyp'
                        ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                        : 'text-amber-800 dark:text-amber-400 hover:bg-amber-100/50'
                    }`}
                  >
                    NYP ({nypCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentFilter('paid')}
                    className={`py-1.5 px-2 text-xs font-bold rounded-lg transition cursor-pointer text-center ${
                      paymentFilter === 'paid'
                        ? 'bg-emerald-600 text-white font-black shadow-xs'
                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/50'
                    }`}
                  >
                    Paid ({paidCount})
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="text-xs font-bold text-stone-600 dark:text-stone-400">
                {isStatusActive('all')
                  ? 'Showing all tickets'
                  : `${statusFilters.length} status${statusFilters.length > 1 ? 'es' : ''} selected (${activeStatusCount} tickets)`}
              </div>
              <button
                type="button"
                onClick={() => toggleStatusFilter('all')}
                className="text-xs font-black text-amber-700 dark:text-amber-400 hover:text-amber-800 underline cursor-pointer"
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
                        ? 'border-stone-950 dark:border-stone-100 bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('all') ? 'bg-amber-400 border-amber-400 text-stone-950' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('all') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                        <span>All Active Bar</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('all') ? 'bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'}`}>
                      {toPrepCount + processingCount + toServeCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('to_prep')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('to_prep')
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-1 ring-amber-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('to_prep') ? 'bg-amber-500 border-amber-500 text-stone-950' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('to_prep') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                        <span>Start Prep</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('to_prep') ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300'}`}>
                      {toPrepCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('processing')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('processing')
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 ring-1 ring-sky-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('processing') ? 'bg-sky-600 border-sky-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('processing') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        <span>Brewing / Prepping</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('processing') ? 'bg-sky-200 dark:bg-sky-900/60 text-sky-950 dark:text-sky-200' : 'bg-sky-100 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300'}`}>
                      {processingCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('completed')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('completed')
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('completed') ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('completed') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                        <span>Drinks Ready</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('completed') ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'}`}>
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
                        ? 'border-stone-950 dark:border-stone-100 bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('all') ? 'bg-amber-400 border-amber-400 text-stone-950' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('all') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                        <span>All Active Prep</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('all') ? 'bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'}`}>
                      {toPrepCount + processingCount + toServeCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('to_prep')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('to_prep')
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-1 ring-amber-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('to_prep') ? 'bg-amber-500 border-amber-500 text-stone-950' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('to_prep') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                        <span>Start Prep</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('to_prep') ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300'}`}>
                      {toPrepCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('processing')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('processing')
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 ring-1 ring-sky-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('processing') ? 'bg-sky-600 border-sky-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('processing') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                        <span>Preparing</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('processing') ? 'bg-sky-200 dark:bg-sky-900/60 text-sky-950 dark:text-sky-200' : 'bg-sky-100 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300'}`}>
                      {processingCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('completed')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('completed')
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('completed') ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('completed') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                        <span>Complete</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('completed') ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'}`}>
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
                        ? 'border-stone-950 dark:border-stone-100 bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('all') ? 'bg-amber-400 border-amber-400 text-stone-950' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('all') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-stone-400" />
                        <span>All Tickets</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('all') ? 'bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'}`}>
                      {orders.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('to_confirm')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('to_confirm')
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 ring-1 ring-rose-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('to_confirm') ? 'bg-rose-600 border-rose-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('to_confirm') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                        <span>To Confirm</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('to_confirm') ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-950 dark:text-rose-200' : 'bg-rose-100 dark:bg-rose-950/50 text-rose-900 dark:text-rose-300'}`}>
                      {pendingConfirmCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('to_prep')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('to_prep')
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-1 ring-amber-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('to_prep') ? 'bg-amber-500 border-amber-500 text-stone-950' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('to_prep') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                        <span>To Prep</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('to_prep') ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200' : 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300'}`}>
                      {toPrepCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('processing')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('processing')
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-200 ring-1 ring-sky-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('processing') ? 'bg-sky-600 border-sky-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('processing') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <ChefHat className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                        <span>Preparing</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('processing') ? 'bg-sky-200 dark:bg-sky-900/60 text-sky-950 dark:text-sky-200' : 'bg-sky-100 dark:bg-sky-950/50 text-sky-900 dark:text-sky-300'}`}>
                      {processingCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('to_serve')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('to_serve')
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('to_serve') ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('to_serve') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                        <span>Served</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('to_serve') ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'}`}>
                      {toServeCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('completed')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('completed')
                        ? 'border-stone-800 dark:border-stone-300 bg-stone-100 dark:bg-stone-800 text-stone-950 dark:text-stone-100 ring-1 ring-stone-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('completed') ? 'bg-stone-800 dark:bg-stone-200 border-stone-800 dark:border-stone-200 text-white dark:text-stone-950' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('completed') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-stone-600 dark:text-stone-400" />
                        <span>Completed</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('completed') ? 'bg-stone-300 dark:bg-stone-700 text-stone-900 dark:text-stone-100' : 'bg-stone-200 dark:bg-stone-750 text-stone-800 dark:text-stone-300'}`}>
                      {completedCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatusFilter('cancelled')}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-bold transition cursor-pointer border ${
                      isStatusActive('cancelled')
                        ? 'border-rose-700 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 ring-1 ring-rose-400'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        isStatusActive('cancelled') ? 'bg-rose-700 border-rose-700 text-white' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}>
                        {isStatusActive('cancelled') && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-rose-500 dark:text-rose-400" />
                        <span>Cancelled</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isStatusActive('cancelled') ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-950 dark:text-rose-200' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-300'}`}>
                      {cancelledCount}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => toggleStatusFilter('all')}
                className="text-xs font-bold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer"
              >
                Reset to All
              </button>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded-xl bg-stone-950 dark:bg-stone-100 px-5 py-2 text-xs font-bold text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-stone-200 transition cursor-pointer shadow-xs"
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
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-stone-900 p-5 sm:p-6 shadow-2xl space-y-4 border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-900 dark:text-amber-400 border border-amber-500/20">
                  <SlidersHorizontal className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100">
                    Filter &amp; View Settings
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                    Configure stations, channels, payment status, ticket timer, and grid layout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Station Focus (Cashier & Admin) */}
            {(isCashier || isAdmin) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    Station Focus
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-stone-500">Preparation department</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStationFilter('all')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition border cursor-pointer ${
                      stationFilter === 'all'
                        ? 'border-stone-950 dark:border-stone-100 bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
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
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
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
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
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
                <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Order Source Stream
                </span>
                <span className="text-[11px] text-stone-400 dark:text-stone-500">Origin channel</span>
              </div>

              <div className="space-y-2">
                {/* Dine-in & Online */}
                <button
                  type="button"
                  onClick={() => setChannelTab('all')}
                  className={`flex w-full items-center justify-between rounded-xl p-3 text-left text-xs font-bold transition cursor-pointer border ${
                    channelTab === 'all'
                      ? 'border-stone-950 dark:border-stone-100 bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs'
                      : 'border-stone-200 dark:border-stone-750 bg-stone-50/70 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-300 dark:hover:border-stone-650'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        channelTab === 'all'
                          ? 'bg-amber-400 border-amber-400 text-stone-950'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}
                    >
                      {channelTab === 'all' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Layers
                          className={`h-4 w-4 ${
                            channelTab === 'all' ? 'text-amber-400 dark:text-amber-700' : 'text-stone-600 dark:text-stone-400'
                          }`}
                        />
                        <span className="font-extrabold text-sm">Dine-in &amp; Online</span>
                      </div>
                      <p
                        className={`text-[11px] font-normal mt-0.5 ${
                          channelTab === 'all' ? 'text-stone-300 dark:text-stone-700' : 'text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        Combined feed of in-store and online customer orders
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                      channelTab === 'all' ? 'bg-white/20 text-white dark:bg-stone-900/20 dark:text-stone-900' : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
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
                      ? 'border-amber-500 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 shadow-xs ring-1 ring-amber-400'
                      : 'border-stone-200 dark:border-stone-750 bg-stone-50/70 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-300 dark:hover:border-stone-650'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        channelTab === 'in_store'
                          ? 'bg-amber-500 border-amber-500 text-stone-950'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}
                    >
                      {channelTab === 'in_store' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                        <span className="font-extrabold text-sm">In-Store (On-the-Place)</span>
                      </div>
                      <p
                        className={`text-[11px] font-normal mt-0.5 ${
                          channelTab === 'in_store' ? 'text-amber-900/80 dark:text-amber-300/80' : 'text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        Counter walk-ins, dine-in tables, and direct takeaway
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                      channelTab === 'in_store'
                        ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200'
                        : 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300'
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
                      ? 'border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 shadow-xs ring-1 ring-indigo-400'
                      : 'border-stone-200 dark:border-stone-750 bg-stone-50/70 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-300 dark:hover:border-stone-650'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        channelTab === 'online'
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}
                    >
                      {channelTab === 'online' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-extrabold text-sm">Online Orders</span>
                        {pendingConfirmCount > 0 && (
                          <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                            {pendingConfirmCount} new
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] font-normal mt-0.5 ${
                          channelTab === 'online' ? 'text-indigo-900/80 dark:text-indigo-300/80' : 'text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        Orders placed via customer mobile web ordering menu
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-black shrink-0 ${
                      channelTab === 'online'
                        ? 'bg-indigo-200 dark:bg-indigo-900/60 text-indigo-950 dark:text-indigo-200'
                        : 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-300'
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
                      ? 'border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs'
                      : 'border-stone-200 dark:border-stone-750 bg-stone-50/70 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750 hover:border-stone-300 dark:hover:border-stone-650'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        channelTab === 'split'
                          ? 'bg-amber-400 border-amber-400 text-stone-950'
                          : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'
                      }`}
                    >
                      {channelTab === 'split' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Columns
                          className={`h-4 w-4 ${
                            channelTab === 'split' ? 'text-amber-400 dark:text-amber-700' : 'text-stone-700 dark:text-stone-300'
                          }`}
                        />
                        <span className="font-extrabold text-sm">Dual Split View</span>
                      </div>
                      <p
                        className={`text-[11px] font-normal mt-0.5 ${
                          channelTab === 'split' ? 'text-stone-300 dark:text-stone-700' : 'text-stone-500 dark:text-stone-400'
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
                        : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    Side-by-Side
                  </span>
                </button>
              </div>
            </div>

            {/* Payment Status Filter (Cashier & Admin) */}
            {!isBarista && !isCook && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Payment Status</span>
                  </span>
                  <span className="text-[11px] text-stone-400 dark:text-stone-500">
                    {paymentFilter === 'all' ? 'All Tickets' : paymentFilter === 'nyp' ? 'Not Yet Paid Only' : 'Paid Only'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentFilter('all')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition border cursor-pointer ${
                      paymentFilter === 'all'
                        ? 'border-stone-950 dark:border-stone-100 bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    {paymentFilter === 'all' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    <span>All ({dateFilteredOrders.filter((o) => o.status !== 'cancelled').length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentFilter('nyp')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition border cursor-pointer ${
                      paymentFilter === 'nyp'
                        ? 'border-amber-500 bg-amber-500 text-stone-950 shadow-xs font-black ring-1 ring-amber-600/40'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-amber-800 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-950/40'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>NYP ({nypCount})</span>
                    {paymentFilter === 'nyp' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentFilter('paid')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs font-bold transition border cursor-pointer ${
                      paymentFilter === 'paid'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs font-black ring-1 ring-emerald-600/40'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-950/40'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Paid ({paidCount})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Ticket Timer Urgency Filter Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Ticket Timer Status</span>
                </span>
                <span className="text-[11px] text-stone-400 dark:text-stone-500">
                  {timerFilter === 'all'
                    ? 'All Active'
                    : timerFilter === 'reminder'
                    ? '15m Reminder (Yellow)'
                    : timerFilter === 'priority'
                    ? '30m Priority (Red)'
                    : '40m Overdue (Max)'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTimerFilter('all')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition border cursor-pointer ${
                    timerFilter === 'all'
                      ? 'border-stone-950 dark:border-stone-100 bg-stone-950 dark:bg-stone-100 text-white dark:text-stone-950 shadow-xs'
                      : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-200'
                  }`}
                >
                  {timerFilter === 'all' && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  <span>All Active ({activeOrdersAll.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimerFilter('reminder')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition border cursor-pointer ${
                    timerFilter === 'reminder'
                      ? 'border-amber-500 bg-amber-400 text-stone-950 shadow-xs font-black ring-1 ring-amber-500/50'
                      : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  <Timer className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>15m Reminder ({reminderCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimerFilter('priority')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition border cursor-pointer ${
                    timerFilter === 'priority'
                      ? 'border-rose-600 bg-rose-600 text-white shadow-xs font-black ring-1 ring-rose-700/50'
                      : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-rose-700 dark:text-rose-400'
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>30m Priority ({priorityCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimerFilter('overdue')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-2 text-xs font-bold transition border cursor-pointer ${
                    timerFilter === 'overdue'
                      ? 'border-red-600 bg-red-600 text-white shadow-xs font-black ring-2 ring-red-700 animate-pulse'
                      : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-red-700 dark:text-red-400'
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 stroke-[2.8]" />
                  <span>40m Overdue ({overdueCount})</span>
                </button>
              </div>
            </div>

            {/* Section 3: Date Period */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Date Period</span>
                </span>
                <span className="text-[11px] text-stone-400 dark:text-stone-500">
                  {getDatePeriodLabel(datePeriod, customDateStart, customDateEnd)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DATE_PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSetDatePeriod(opt.id)}
                    className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      datePeriod === opt.id
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/20 text-stone-950 dark:text-amber-100 ring-1 ring-amber-500/30'
                        : 'border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/70 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-750'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black">{opt.label}</span>
                      {datePeriod === opt.id && <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 stroke-[3]" />}
                    </div>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal mt-0.5 line-clamp-1">
                      {opt.description}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers */}
              {datePeriod === 'custom' && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-2.5 space-y-2">
                  <span className="text-[11px] font-bold text-amber-950 dark:text-amber-200 block">
                    Pick Custom Date or Range:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 block mb-0.5">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customDateStart}
                        onChange={(e) => handleSetCustomDates(e.target.value, customDateEnd)}
                        className="w-full text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-1.5 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 dark:text-stone-400 block mb-0.5">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customDateEnd}
                        onChange={(e) => handleSetCustomDates(customDateStart, e.target.value)}
                        className="w-full text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-1.5 text-stone-900 dark:text-stone-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Grid Layout Columns */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-600 dark:text-stone-400">
                  Ticket Grid Layout
                </span>
                <span className="text-[11px] text-stone-400 dark:text-stone-500">Card columns across screen</span>
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
                        ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500 text-stone-950 dark:text-amber-200 font-black shadow-xs ring-2 ring-amber-500/20'
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-750 font-semibold'
                    }`}
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs text-amber-700 dark:text-amber-400">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xs font-bold leading-none">{label}</div>
                    {gridColumns === cols && (
                      <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-700 dark:text-amber-400">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setStationFilter('all');
                  setChannelTab('all');
                  setPaymentFilter('all');
                  setTimerFilter('all');
                  handleSetDatePeriod('all_time');
                }}
                className="text-xs font-bold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-xl bg-stone-950 dark:bg-stone-100 px-6 py-2.5 text-xs font-bold text-white dark:text-stone-950 hover:bg-stone-800 dark:hover:bg-stone-200 transition cursor-pointer shadow-xs active:scale-95"
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
