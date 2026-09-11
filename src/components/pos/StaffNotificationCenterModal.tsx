import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, Category, User, Order, TableRequest, Reservation, Table, StaffTabType, RefillRequest } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import { AdminConfirmRefillModal } from './AdminConfirmRefillModal';
import {
  Bell,
  AlertTriangle,
  Plus,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Utensils,
  ClipboardList,
  Calendar,
  ChevronRight,
  Check,
  Ban,
  Store,
  Globe,
  Flame,
  Clock,
  ArrowDownWideNarrow,
  PackagePlus,
  Package,
  Coffee,
  ChefHat,
  Monitor,
} from 'lucide-react';

interface StaffNotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStaff?: User | null;
  initialTab?: 'all' | 'no_stock' | 'low_stock' | 'table_confirm' | 'order_confirm' | 'cancellations' | 'refills';
  onNavigateTab?: (tab: StaffTabType) => void;
  onViewOrderReceipt?: (order: Order) => void;
}

export const StaffNotificationCenterModal: React.FC<StaffNotificationCenterModalProps> = ({
  isOpen,
  onClose,
  activeStaff = null,
  initialTab = 'all',
  onNavigateTab,
  onViewOrderReceipt,
}) => {
  const { showAlert, showConfirm, showPrompt } = useModal();
  const [activeTab, setActiveTab] = useState<'all' | 'no_stock' | 'low_stock' | 'table_confirm' | 'order_confirm' | 'cancellations' | 'refills'>(initialTab);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [restockingId, setRestockingId] = useState<number | null>(null);

  // Store data state
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [tableRequests, setTableRequests] = useState<TableRequest[]>(() => AppStore.getTableRequests());
  const [reservations, setReservations] = useState<Reservation[]>(() => AppStore.getReservations());
  const [categories, setCategories] = useState<Category[]>(() => AppStore.getCategories());
  const [refillRequests, setRefillRequests] = useState<RefillRequest[]>(() => AppStore.getRefillRequests());

  // Refill Review Modal state for Admin
  const [selectedRefillForReview, setSelectedRefillForReview] = useState<RefillRequest | null>(null);
  const [isReviewRefillModalOpen, setIsReviewRefillModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Real-time synchronization subscription
  useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setMenuItems(AppStore.getMenuItems());
      setOrders(AppStore.getOrders());
      setTableRequests(AppStore.getTableRequests());
      setReservations(AppStore.getReservations());
      setCategories(AppStore.getCategories());
      setRefillRequests(AppStore.getRefillRequests());
    });
    return () => unsub();
  }, []);

  const isAdmin = activeStaff?.role === 'admin';

  // Relative and clock time formatters
  const formatRelativeTime = (timestamp: number | string | undefined) => {
    if (!timestamp) return 'Just now';
    const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    if (isNaN(time)) return 'Recently';
    const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
    if (diffSec < 30) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffSec / 86400);
    return `${days}d ago`;
  };

  const formatClockTime = (timestamp: number | string | undefined) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Track timestamps when stock becomes empty or low during the session
  const [stockAlertTimestamps, setStockAlertTimestamps] = useState<Record<number, number>>({});
  const initialMountTime = React.useRef<number>(Date.now());
  const prevQuantitiesRef = React.useRef<Record<number, number>>({});

  useEffect(() => {
    const currentQuantities: Record<number, number> = {};
    const newTimestamps: Record<number, number> = { ...stockAlertTimestamps };
    let hasChanges = false;

    menuItems.forEach((item) => {
      const currentQty = item.quantity ?? 0;
      currentQuantities[item.id] = currentQty;
      const prevQty = prevQuantitiesRef.current[item.id];

      // If quantity transitioned to out of stock or low stock during this session, mark now
      if (prevQty !== undefined && prevQty > 0 && currentQty <= 0) {
        newTimestamps[item.id] = Date.now();
        hasChanges = true;
      } else if (prevQty !== undefined && prevQty > 5 && currentQty <= 5) {
        newTimestamps[item.id] = Date.now();
        hasChanges = true;
      }
    });

    prevQuantitiesRef.current = currentQuantities;
    if (hasChanges) {
      setStockAlertTimestamps(newTimestamps);
    }
  }, [menuItems]);

  // 1. No Stock (Out of Stock): quantity <= 0 or isAvailable === false
  // Sorted newest / lowest stock first
  const noStockItems = useMemo(() => {
    return menuItems
      .filter((i) => (i.quantity ?? 0) <= 0 || i.isAvailable === false)
      .sort((a, b) => {
        const timeA = stockAlertTimestamps[a.id] || (initialMountTime.current - a.id * 1000);
        const timeB = stockAlertTimestamps[b.id] || (initialMountTime.current - b.id * 1000);
        return timeB - timeA;
      });
  }, [menuItems, stockAlertTimestamps]);

  // 2. Low Stock: quantity > 0 and quantity <= 5
  // Sorted newest / lowest stock first
  const lowStockItems = useMemo(() => {
    return menuItems
      .filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 5 && i.isAvailable !== false)
      .sort((a, b) => {
        const timeA = stockAlertTimestamps[a.id] || (initialMountTime.current - (a.id + 1000) * 1000);
        const timeB = stockAlertTimestamps[b.id] || (initialMountTime.current - (b.id + 1000) * 1000);
        return timeB - timeA;
      });
  }, [menuItems, stockAlertTimestamps]);

  // 3. Table Requests: sorted by newest createdAt
  const sortedTableRequests = useMemo(() => {
    return tableRequests
      .filter((r) => r.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tableRequests]);

  // 4. Reservations: sorted by newest createdAt
  const sortedReservations = useMemo(() => {
    return reservations
      .filter((r) => r.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reservations]);

  const totalTableConfirmationsCount = sortedTableRequests.length + sortedReservations.length;

  // Merged Table Confirmations - sorted by newest
  const sortedTableConfirmations = useMemo(() => {
    const list: Array<
      | { type: 'table_request'; timestamp: number; data: TableRequest }
      | { type: 'reservation'; timestamp: number; data: Reservation }
    > = [
      ...sortedTableRequests.map((req) => ({
        type: 'table_request' as const,
        timestamp: new Date(req.createdAt).getTime(),
        data: req,
      })),
      ...sortedReservations.map((res) => ({
        type: 'reservation' as const,
        timestamp: new Date(res.createdAt).getTime(),
        data: res,
      })),
    ];
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [sortedTableRequests, sortedReservations]);

  // 5. Order Confirmations: orders with status 'to_confirm' or 'pending' - sorted by newest createdAt
  const sortedOrderConfirmations = useMemo(() => {
    return orders
      .filter((o) => o.status === 'to_confirm' || o.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  // 6. Customer Cancellation Requests: orders with cancellationRequested === true and status !== 'cancelled' - sorted by newest cancellation request timestamp
  const sortedCancellationRequests = useMemo(() => {
    return orders
      .filter((o) => o.cancellationRequested && o.status !== 'cancelled')
      .sort((a, b) => {
        const timeA = new Date(a.cancellationRequestedAt || a.createdAt).getTime();
        const timeB = new Date(b.cancellationRequestedAt || b.createdAt).getTime();
        return timeB - timeA;
      });
  }, [orders]);

  // 7. Staff Refill Suggestions: refill requests with status === 'pending'
  const pendingRefillRequests = useMemo(() => {
    return refillRequests
      .filter((r) => r.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [refillRequests]);

  // Group pending refill requests by staff member
  interface StaffRefillGroup {
    staffKey: string;
    requestedBy: RefillRequest['requestedBy'];
    items: RefillRequest[];
    latestDate: string;
  }

  const pendingRefillGroups = useMemo<StaffRefillGroup[]>(() => {
    const map = new Map<string, StaffRefillGroup>();
    pendingRefillRequests.forEach((req) => {
      const staffKey = String(req.requestedBy.id || req.requestedBy.name);
      if (!map.has(staffKey)) {
        map.set(staffKey, {
          staffKey,
          requestedBy: req.requestedBy,
          items: [],
          latestDate: req.createdAt,
        });
      }
      const grp = map.get(staffKey)!;
      grp.items.push(req);
      if (new Date(req.createdAt).getTime() > new Date(grp.latestDate).getTime()) {
        grp.latestDate = req.createdAt;
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  }, [pendingRefillRequests]);

  // Unified notifications list - strictly sorted by newest timestamp first!
  const allUnifiedNotifications = useMemo(() => {
    const list: Array<
      | { type: 'order_confirm'; id: string; timestamp: number; data: Order }
      | { type: 'cancellation'; id: string; timestamp: number; data: Order }
      | { type: 'table_request'; id: string; timestamp: number; data: TableRequest }
      | { type: 'reservation'; id: string; timestamp: number; data: Reservation }
      | { type: 'no_stock'; id: string; timestamp: number; data: MenuItem }
      | { type: 'low_stock'; id: string; timestamp: number; data: MenuItem }
      | { type: 'refill_suggestion'; id: string; timestamp: number; data: RefillRequest }
    > = [];

    // Pending Refill Suggestions from Staff
    pendingRefillRequests.forEach((req) => {
      list.push({
        type: 'refill_suggestion',
        id: `refill-${req.id}`,
        timestamp: new Date(req.createdAt).getTime(),
        data: req,
      });
    });

    sortedOrderConfirmations.forEach((order) => {
      list.push({
        type: 'order_confirm',
        id: `order-${order.id}`,
        timestamp: new Date(order.createdAt).getTime(),
        data: order,
      });
    });

    sortedCancellationRequests.forEach((order) => {
      list.push({
        type: 'cancellation',
        id: `cancel-${order.id}`,
        timestamp: new Date(order.cancellationRequestedAt || order.createdAt).getTime(),
        data: order,
      });
    });

    sortedTableRequests.forEach((req) => {
      list.push({
        type: 'table_request',
        id: `table-req-${req.id}`,
        timestamp: new Date(req.createdAt).getTime(),
        data: req,
      });
    });

    sortedReservations.forEach((res) => {
      list.push({
        type: 'reservation',
        id: `res-${res.id}`,
        timestamp: new Date(res.createdAt).getTime(),
        data: res,
      });
    });

    noStockItems.forEach((item) => {
      const ts = stockAlertTimestamps[item.id] || (initialMountTime.current - 1800000 - item.id * 1000);
      list.push({
        type: 'no_stock',
        id: `no-stock-${item.id}`,
        timestamp: ts,
        data: item,
      });
    });

    lowStockItems.forEach((item) => {
      const ts = stockAlertTimestamps[item.id] || (initialMountTime.current - 3600000 - item.id * 1000);
      list.push({
        type: 'low_stock',
        id: `low-stock-${item.id}`,
        timestamp: ts,
        data: item,
      });
    });

    // Sort strictly by newest first (highest timestamp to lowest)
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [
    pendingRefillRequests,
    sortedOrderConfirmations,
    sortedCancellationRequests,
    sortedTableRequests,
    sortedReservations,
    noStockItems,
    lowStockItems,
    stockAlertTimestamps,
  ]);

  const totalAlertsCount =
    noStockItems.length +
    lowStockItems.length +
    pendingRefillRequests.length +
    totalTableConfirmationsCount +
    sortedOrderConfirmations.length +
    sortedCancellationRequests.length;

  if (!isOpen) return null;

  // Handlers for Stock Restock - Admin only (Cashier & Cook cannot restock)
  const handleQuickRestock = (item: MenuItem, amount: number) => {
    if (!isAdmin) return;
    setRestockingId(item.id);
    const updated = AppStore.quickRestockItem(item.id, amount);
    setTimeout(() => {
      setRestockingId(null);
    }, 400);

    if (updated) {
      showAlert({
        title: 'Stock Updated',
        message: `Added +${amount} units to "${item.name}". Current stock: ${updated.quantity}`,
        type: 'success',
      });
    }
  };

  const handleCustomRestock = async (item: MenuItem) => {
    if (!isAdmin) return;
    const res = await showPrompt({
      title: `Custom Restock: ${item.name}`,
      message: `Enter the number of units to add to current inventory (${item.quantity ?? 0} currently):`,
      defaultValue: '20',
      placeholder: 'e.g. 25',
      inputType: 'number',
    });

    if (res && !isNaN(Number(res)) && Number(res) > 0) {
      handleQuickRestock(item, Number(res));
    }
  };

  // Handlers for Table Requests
  const handleApproveTableRequest = async (req: TableRequest) => {
    const cashierUser: User = activeStaff || {
      id: 1,
      username: 'cashier',
      fullName: 'Cashier on Duty',
      employeeId: 'STAFF-01',
      role: 'cashier',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const res = AppStore.approveTableRequest(req.id, cashierUser);
    if (res) {
      showAlert({
        title: 'Table Request Approved',
        message: `Approved Table #${req.requestedTableNumber} for ${req.customerName || 'Guest'}.`,
        type: 'success',
      });
    } else {
      showAlert({
        title: 'Table Error',
        message: 'Could not approve table request.',
        type: 'danger',
      });
    }
  };

  const handleDeclineTableRequest = async (req: TableRequest) => {
    const cashierUser: User = activeStaff || {
      id: 1,
      username: 'cashier',
      fullName: 'Cashier on Duty',
      employeeId: 'STAFF-01',
      role: 'cashier',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const reason = await showPrompt({
      title: 'Decline Table Request',
      message: `Provide an optional reason for declining Table #${req.requestedTableNumber} request for ${req.customerName || 'Guest'}:`,
      placeholder: 'e.g. Table currently occupied or reserved',
    });

    if (reason !== null) {
      const res = AppStore.rejectTableRequest(req.id, cashierUser, reason || 'Declined by staff');
      if (res) {
        showAlert({
          title: 'Table Request Declined',
          message: `Declined table request for Table #${req.requestedTableNumber}.`,
          type: 'info',
        });
      }
    }
  };

  // Handlers for Reservations
  const handleConfirmReservation = async (res: Reservation) => {
    const confirmed = await showConfirm({
      title: 'Confirm Reservation',
      message: `Confirm booking #${res.reservationCode} for ${res.customerName} on Table #${res.tableNumber}?`,
      confirmText: 'Confirm Booking',
      type: 'success',
    });

    if (confirmed) {
      AppStore.updateReservationStatus(res.id, 'confirmed');
      showAlert({
        title: 'Reservation Confirmed',
        message: `Reservation #${res.reservationCode} for ${res.customerName} has been confirmed.`,
        type: 'success',
      });
    }
  };

  const handleDeclineReservation = async (res: Reservation) => {
    const confirmed = await showConfirm({
      title: 'Cancel/Decline Reservation',
      message: `Decline reservation #${res.reservationCode} for ${res.customerName}?`,
      confirmText: 'Decline Booking',
      type: 'danger',
    });

    if (confirmed) {
      AppStore.updateReservationStatus(res.id, 'cancelled');
      showAlert({
        title: 'Reservation Declined',
        message: `Reservation #${res.reservationCode} has been declined.`,
        type: 'info',
      });
    }
  };

  // Handlers for Orders
  const handleConfirmOrderToPrep = async (order: Order) => {
    const confirmed = await showConfirm({
      title: 'Send Order to Kitchen Prep',
      message: `Confirm Order #${order.orderNumber} (${order.customerName || 'Guest'}) and send to Kitchen Prep queue?`,
      confirmText: 'Send to Kitchen',
      type: 'success',
    });

    if (confirmed) {
      AppStore.updateOrderStatus(order.id, 'to_prep');
      showAlert({
        title: 'Order Confirmed',
        message: `Order #${order.orderNumber} sent to Kitchen Prep queue.`,
        type: 'success',
      });
    }
  };

  const handleCancelOrder = async (order: Order) => {
    const reason = await showPrompt({
      title: `Decline/Cancel Order #${order.orderNumber}`,
      message: 'Enter reason for cancellation (e.g. Item unavailable, customer request):',
      placeholder: 'Cancellation reason',
    });

    if (reason !== null) {
      AppStore.updateOrderStatus(order.id, 'cancelled', {
        cancelReason: reason || 'Cancelled by staff',
        cancelledBy: activeStaff?.fullName || 'Staff',
      });
      showAlert({
        title: 'Order Cancelled',
        message: `Order #${order.orderNumber} has been cancelled and stock returned.`,
        type: 'info',
      });
    }
  };

  const handleConfirmCustomerCancellation = async (order: Order) => {
    const confirmed = await showConfirm({
      title: `Approve Cancellation: Order #${order.orderNumber}`,
      message: `The customer requested to cancel Order #${order.orderNumber}.\n\nReason: "${order.cancellationReason || 'Customer requested'}"\n${order.cancellationNotes ? `Notes: "${order.cancellationNotes}"\n` : ''}\nConfirming will void the order and restore reserved stock back to inventory. Proceed with cancellation?`,
      type: 'danger',
      confirmText: 'Confirm & Cancel Order',
      cancelText: 'Keep Order Active',
    });

    if (confirmed) {
      AppStore.confirmOrderCancellation(
        order.id,
        activeStaff?.fullName || (isAdmin ? 'Admin' : 'Staff'),
        order.cancellationNotes
      );
      showAlert({
        title: 'Order Cancelled',
        message: `Order #${order.orderNumber} has been officially cancelled and its items returned to inventory.`,
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
      showAlert({
        title: 'Cancellation Declined',
        message: `The cancellation request for Order #${order.orderNumber} was declined. The order remains active in the queue.`,
        type: 'info',
      });
    }
  };

  // Handlers for Staff Refill Suggestions (Admin confirmation & quick approval)
  const handleQuickApproveRefill = (req: RefillRequest) => {
    if (!isAdmin) return;
    const staff = activeStaff || AppStore.getActiveStaff();
    const adminUser = staff
      ? { id: staff.id, name: staff.fullName || staff.name || 'Admin', role: staff.role }
      : { id: 1, name: 'Admin Manager', role: 'admin' };

    const success = AppStore.approveRefillRequest(
      req.id,
      req.suggestedQuantity,
      adminUser,
      'Approved via Admin Notifications'
    );

    if (success) {
      setRefillRequests(AppStore.getRefillRequests());
      showAlert({
        title: 'Refill Approved & Stock Added',
        message: `Approved +${req.suggestedQuantity} units for "${req.itemName}". Stock has been updated in the system!`,
        type: 'success',
      });
    }
  };

  const handleDeclineRefill = async (req: RefillRequest) => {
    if (!isAdmin) return;
    const staff = activeStaff || AppStore.getActiveStaff();
    const adminUser = staff
      ? { id: staff.id, name: staff.fullName || staff.name || 'Admin', role: staff.role }
      : { id: 1, name: 'Admin Manager', role: 'admin' };

    const declineNotes = await showPrompt({
      title: `Decline Refill: ${req.itemName}`,
      message: `Provide a reason to decline this refill request from ${req.requestedBy.name}:`,
      placeholder: 'e.g. Out of supplier stock, or existing stock is adequate',
      defaultValue: 'Declined by Admin',
    });

    if (declineNotes !== null) {
      const success = AppStore.rejectRefillRequest(
        req.id,
        adminUser,
        declineNotes.trim() || 'Declined by Admin'
      );

      if (success) {
        setRefillRequests(AppStore.getRefillRequests());
        showAlert({
          title: 'Refill Request Declined',
          message: `Refill suggestion for "${req.itemName}" has been declined.`,
          type: 'info',
        });
      }
    }
  };

  const handleBatchApproveStaffRefills = async (group: StaffRefillGroup) => {
    if (!isAdmin) return;
    const pendingItems = group.items.filter((i) => i.status === 'pending');
    if (pendingItems.length === 0) return;

    const confirmed = await showConfirm({
      title: `Approve All Refills from ${group.requestedBy.name}`,
      message: `Are you sure you want to approve all ${pendingItems.length} refill item(s) requested by ${group.requestedBy.name} with requested quantities?`,
      confirmText: `Approve All (${pendingItems.length})`,
    });

    if (confirmed) {
      const staff = activeStaff || AppStore.getActiveStaff();
      const adminUser = staff
        ? { id: staff.id, name: staff.fullName || staff.name || 'Admin', role: staff.role }
        : { id: 1, name: 'Admin Manager', role: 'admin' };

      pendingItems.forEach((item) => {
        AppStore.approveRefillRequest(
          item.id,
          item.suggestedQuantity,
          adminUser,
          'Batch approved via Notifications Center'
        );
      });
      setRefillRequests(AppStore.getRefillRequests());
      showAlert({
        title: 'All Refills Approved',
        message: `Approved ${pendingItems.length} refill item(s) from ${group.requestedBy.name}. Inventory stock has been updated!`,
        type: 'success',
      });
    }
  };

  const getTabLabel = (tabKey: typeof activeTab) => {
    switch (tabKey) {
      case 'all':
        return `All (${totalAlertsCount})`;
      case 'refills':
        return `Staff Refills (${pendingRefillRequests.length})`;
      case 'no_stock':
        return `No Stock (${noStockItems.length})`;
      case 'low_stock':
        return `Low Stock (${lowStockItems.length})`;
      case 'table_confirm':
        return `Table Confirmations (${totalTableConfirmationsCount})`;
      case 'order_confirm':
        return `Order Confirmations (${sortedOrderConfirmations.length})`;
      case 'cancellations':
        return `Cancel Requests (${sortedCancellationRequests.length})`;
      default:
        return 'All';
    }
  };

  const renderOrderCard = (order: Order, showCategoryBadge: boolean = false) => {
    const isOnline = order.channel === 'online' || !order.tableNumber;
    return (
      <div
        key={`order-${order.id}`}
        className="rounded-xl border border-stone-200 bg-white p-2.5 sm:p-3.5 shadow-2xs hover:border-emerald-300 transition space-y-2"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {showCategoryBadge && (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase">
                <ClipboardList className="h-3 w-3 text-emerald-600" />
                <span>Order Confirmation</span>
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold ${
                isOnline
                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              {isOnline ? <Globe className="h-2.5 w-2.5" /> : <Store className="h-2.5 w-2.5" />}
              <span>{isOnline ? 'Online Order' : `Table #${order.tableNumber || 'Dine-In'}`}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] text-stone-500 shrink-0 ml-auto">
            <Clock className="h-3 w-3 text-amber-600" />
            <span className="font-bold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              {formatRelativeTime(order.createdAt)}
            </span>
            <span className="text-stone-400">{formatClockTime(order.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-stone-900 text-amber-400 px-2 py-0.5 font-mono font-black text-[10px] sm:text-xs">
              #{order.orderNumber}
            </span>
            <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
              {order.customerName || 'Guest Customer'}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-stone-600">
            {order.items.length} {order.items.length === 1 ? 'item' : 'items'} • Total:{' '}
            <strong className="text-stone-900 font-extrabold">₱{order.totalAmount.toFixed(2)}</strong>
          </span>
        </div>

        {/* Order Items Preview */}
        <div className="bg-stone-50 rounded-lg p-2 text-[10px] sm:text-xs text-stone-700 space-y-1 max-h-24 overflow-y-auto border border-stone-100">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span>
                {item.quantity}x {item.name}
              </span>
              <span className="font-mono text-stone-500">₱{((item.unitPrice ?? item.totalPrice / (item.quantity || 1)) * (item.quantity ?? 1)).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1 gap-2 border-t border-stone-100">
          {onViewOrderReceipt && (
            <button
              onClick={() => onViewOrderReceipt(order)}
              className="text-[10px] sm:text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer"
            >
              Details
            </button>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => handleCancelOrder(order)}
              className="rounded-xl border border-stone-300 text-stone-700 px-2.5 py-1 text-[10px] sm:text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
            >
              Decline
            </button>
            <button
              onClick={() => handleConfirmOrderToPrep(order)}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold hover:bg-emerald-700 transition cursor-pointer shadow-2xs"
            >
              <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.4]" />
              <span>Confirm & Prep</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCancellationCard = (order: Order, showCategoryBadge: boolean = false) => {
    const isOnline = order.channel === 'online' || !order.tableNumber;
    const cancelTime = order.cancellationRequestedAt || order.createdAt;
    return (
      <div
        key={`cancellation-req-${order.id}`}
        className="rounded-xl border-2 border-rose-300 bg-white p-2.5 sm:p-3.5 shadow-xs space-y-2"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 text-white px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase animate-pulse">
              <Ban className="h-3 w-3" />
              <span>Cancellation Request • Action Required</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold ${
                isOnline
                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              {isOnline ? <Globe className="h-2.5 w-2.5" /> : <Store className="h-2.5 w-2.5" />}
              <span>{isOnline ? 'Online Order' : `Table #${order.tableNumber || 'Dine-In'}`}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] text-stone-500 shrink-0 ml-auto">
            <Clock className="h-3 w-3 text-rose-600" />
            <span className="font-bold text-rose-900 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
              {formatRelativeTime(cancelTime)}
            </span>
            <span className="text-stone-400">{formatClockTime(cancelTime)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-rose-100 text-rose-900 border border-rose-200 px-2 py-0.5 font-mono font-black text-[10px] sm:text-xs">
              #{order.orderNumber}
            </span>
            <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
              {order.customerName || 'Guest Customer'}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-stone-600">
            Total: <strong className="text-stone-900 font-extrabold">₱{order.totalAmount.toFixed(2)}</strong>
          </span>
        </div>

        {/* Customer Reason Banner */}
        <div className="rounded-lg bg-rose-50 border border-rose-200/80 p-2 text-[10px] sm:text-xs text-rose-900 space-y-0.5">
          <div className="font-bold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            <span>Reason: "{order.cancellationReason || 'Requested cancellation'}"</span>
          </div>
          {order.cancellationNotes && (
            <p className="text-stone-600 pl-4 italic">Customer Note: "{order.cancellationNotes}"</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-1 gap-2 border-t border-stone-100">
          {onViewOrderReceipt && (
            <button
              onClick={() => onViewOrderReceipt(order)}
              className="text-[10px] sm:text-xs font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer"
            >
              View Ticket
            </button>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => handleDeclineCustomerCancellation(order)}
              className="rounded-xl border border-stone-300 text-stone-700 px-2.5 py-1 text-[10px] sm:text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
            >
              Decline Request
            </button>
            <button
              onClick={() => handleConfirmCustomerCancellation(order)}
              className="flex items-center gap-1 rounded-xl bg-rose-600 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold hover:bg-rose-700 transition cursor-pointer shadow-2xs"
            >
              <Ban className="h-3 w-3 stroke-[2.4]" />
              <span>Confirm & Cancel</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTableRequestCard = (req: TableRequest, showCategoryBadge: boolean = false) => {
    return (
      <div
        key={`table-req-${req.id}`}
        className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-2.5 sm:p-3.5 shadow-2xs space-y-2"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 text-indigo-950 border border-indigo-300 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase">
              <Utensils className="h-3 w-3 text-indigo-600" />
              <span>Table Request</span>
            </span>
            <span className="rounded-md bg-indigo-200/80 text-indigo-950 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold">
              {req.type === 'change_table' ? 'Transfer Request' : 'Table Request'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] text-stone-500 shrink-0 ml-auto">
            <Clock className="h-3 w-3 text-indigo-600" />
            <span className="font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
              {formatRelativeTime(req.createdAt)}
            </span>
            <span className="text-stone-400">{formatClockTime(req.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-900 text-indigo-100 px-2 py-0.5 font-mono font-black text-[10px] sm:text-xs">
              Table #{req.requestedTableNumber}
            </span>
            <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
              {req.customerName || 'Guest'}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-stone-600 font-medium">
            {req.capacity ? `${req.capacity} guests` : 'Dine-In'}
            {req.currentTableNumber && ` (from Table #${req.currentTableNumber})`}
          </span>
        </div>

        {req.notes && (
          <p className="text-[10px] sm:text-xs text-stone-600 bg-white/80 rounded-lg p-1.5 border border-indigo-100">
            Note: {req.notes}
          </p>
        )}

        <div className="flex items-center justify-end pt-1 gap-1.5 border-t border-indigo-100">
          <button
            onClick={() => handleDeclineTableRequest(req)}
            className="rounded-xl border border-stone-300 bg-white text-stone-700 px-2.5 py-1 text-[10px] sm:text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={() => handleApproveTableRequest(req)}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold hover:bg-indigo-700 transition cursor-pointer shadow-2xs"
          >
            <Check className="h-3 w-3 stroke-[2.4]" />
            <span>Confirm & Bind</span>
          </button>
        </div>
      </div>
    );
  };

  const renderReservationCard = (res: Reservation, showCategoryBadge: boolean = false) => {
    return (
      <div
        key={`res-${res.id}`}
        className="rounded-xl border border-amber-200 bg-amber-50/40 p-2.5 sm:p-3.5 shadow-2xs space-y-2"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-950 border border-amber-300 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase">
              <Calendar className="h-3 w-3 text-amber-800" />
              <span>Advance Reservation</span>
            </span>
            <span className="rounded-md bg-amber-200/80 text-amber-950 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold">
              #{res.reservationCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] text-stone-500 shrink-0 ml-auto">
            <Clock className="h-3 w-3 text-amber-600" />
            <span className="font-bold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              {formatRelativeTime(res.createdAt)}
            </span>
            <span className="text-stone-400">{formatClockTime(res.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="font-extrabold text-stone-900 text-xs sm:text-sm">
            {res.customerName}
          </span>
          <span className="text-[10px] sm:text-xs text-stone-600 font-medium">
            {res.guestCount} guests • Table #{res.tableNumber}
          </span>
        </div>

        <div className="text-[10px] sm:text-xs text-stone-600 bg-white/80 rounded-lg p-1.5 border border-amber-100">
          Date & Time:{' '}
          <strong className="text-stone-900">
            {new Date(res.reservationAt).toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </strong>
          {res.notes && <p className="mt-0.5 italic">Note: "{res.notes}"</p>}
        </div>

        <div className="flex items-center justify-end pt-1 gap-1.5 border-t border-amber-100">
          <button
            onClick={() => handleDeclineReservation(res)}
            className="rounded-xl border border-stone-300 bg-white text-stone-700 px-2.5 py-1 text-[10px] sm:text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={() => handleConfirmReservation(res)}
            className="flex items-center gap-1 rounded-xl bg-amber-500 text-stone-950 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold hover:bg-amber-400 transition cursor-pointer shadow-2xs"
          >
            <Check className="h-3 w-3 stroke-[2.4]" />
            <span>Confirm Booking</span>
          </button>
        </div>
      </div>
    );
  };

  const renderNoStockCard = (item: MenuItem, showCategoryBadge: boolean = false) => {
    const category = categories.find((c) => c.id === item.categoryId);
    const alertTime = stockAlertTimestamps[item.id] || (initialMountTime.current - 1800000 - item.id * 1000);
    return (
      <div
        key={`no-stock-${item.id}`}
        className="rounded-xl border border-rose-200 bg-rose-50/40 p-2.5 sm:p-3 shadow-2xs hover:border-rose-300 transition space-y-2"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 text-rose-950 border border-rose-300 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase">
              <Ban className="h-3 w-3 text-rose-600" />
              <span>Out of Stock</span>
            </span>
            <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[8px] sm:text-[9px] font-black text-white">
              0 STOCK
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] text-stone-500 shrink-0 ml-auto">
            <Clock className="h-3 w-3 text-rose-600" />
            <span className="font-bold text-rose-900 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
              {formatRelativeTime(alertTime)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-9 w-9 rounded-lg object-cover border border-rose-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="min-w-0">
              <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                {item.name}
              </h4>
              <p className="text-[10px] sm:text-xs text-stone-500">
                {category?.name || 'Category'} • ₱{item.price.toFixed(2)}
              </p>
            </div>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleQuickRestock(item, 10)}
                disabled={restockingId === item.id}
                className="flex items-center gap-1 rounded-xl bg-rose-600 text-white px-2.5 py-1 text-[10px] sm:text-xs font-bold hover:bg-rose-700 transition cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                <span>+10 Restock</span>
              </button>
              <button
                onClick={() => handleCustomRestock(item)}
                className="rounded-xl border border-stone-300 bg-white px-2 py-1 text-[10px] sm:text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Custom
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-stone-500 italic">Notify Admin</span>
          )}
        </div>
      </div>
    );
  };

  const renderLowStockCard = (item: MenuItem, showCategoryBadge: boolean = false) => {
    const category = categories.find((c) => c.id === item.categoryId);
    const alertTime = stockAlertTimestamps[item.id] || (initialMountTime.current - 3600000 - item.id * 1000);
    return (
      <div
        key={`low-stock-${item.id}`}
        className="rounded-xl border border-amber-200 bg-amber-50/40 p-2.5 sm:p-3 shadow-2xs hover:border-amber-300 transition space-y-2"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-950 border border-amber-300 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase">
              <AlertTriangle className="h-3 w-3 text-amber-700" />
              <span>Low Stock Alert</span>
            </span>
            <span className="rounded-full bg-amber-200 border border-amber-400 px-2 py-0.5 text-[8px] sm:text-[9px] font-black text-amber-950">
              {item.quantity} LEFT
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] text-stone-500 shrink-0 ml-auto">
            <Clock className="h-3 w-3 text-amber-600" />
            <span className="font-bold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              {formatRelativeTime(alertTime)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-9 w-9 rounded-lg object-cover border border-amber-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="min-w-0">
              <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                {item.name}
              </h4>
              <p className="text-[10px] sm:text-xs text-stone-500">
                {category?.name || 'Category'} • ₱{item.price.toFixed(2)}
              </p>
            </div>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleQuickRestock(item, 10)}
                disabled={restockingId === item.id}
                className="flex items-center gap-1 rounded-xl bg-amber-500 text-stone-950 px-2.5 py-1 text-[10px] sm:text-xs font-bold hover:bg-amber-400 transition cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                <span>+10 Restock</span>
              </button>
              <button
                onClick={() => handleCustomRestock(item)}
                className="rounded-xl border border-stone-300 bg-white px-2 py-1 text-[10px] sm:text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Custom
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-stone-500 italic">Notify Admin</span>
          )}
        </div>
      </div>
    );
  };

  const renderRefillCard = (refill: RefillRequest, showCategoryBadge: boolean = false) => {
    const isBar = refill.station === 'bar';
    const isKitchen = refill.station === 'kitchen';
    const stationLabel = isBar ? 'Bar / Drinks' : isKitchen ? 'Kitchen / Food' : 'Counter / Register';

    return (
      <div
        key={`refill-item-${refill.id}`}
        id={`refill-notif-${refill.id}`}
        className="rounded-xl border-2 border-amber-300 bg-amber-50/40 p-2.5 sm:p-3.5 shadow-2xs hover:border-amber-400 transition space-y-2.5"
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 text-stone-950 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase shadow-2xs">
              <PackagePlus className="h-3 w-3" />
              <span>Staff Refill Suggestion</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-white text-stone-700 border border-stone-200 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold">
              {isBar ? <Coffee className="h-2.5 w-2.5 text-amber-700" /> : isKitchen ? <ChefHat className="h-2.5 w-2.5 text-rose-600" /> : <Monitor className="h-2.5 w-2.5 text-stone-700" />}
              <span>{stationLabel}</span>
            </span>
            <span className="rounded-full bg-amber-200 border border-amber-400 px-2 py-0.5 text-[8px] sm:text-[9px] font-extrabold text-amber-950">
              +{refill.suggestedQuantity} UNITS REQUESTED
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] text-stone-500 shrink-0 ml-auto">
            <Clock className="h-3 w-3 text-amber-600" />
            <span className="font-bold text-amber-900 bg-amber-100/80 border border-amber-200 px-1.5 py-0.5 rounded">
              {formatRelativeTime(refill.createdAt)}
            </span>
            <span className="text-stone-400">{formatClockTime(refill.createdAt)}</span>
          </div>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                {refill.itemName}
              </h4>
              {refill.categoryName && (
                <span className="text-[10px] sm:text-xs text-stone-500 font-medium">
                  • {refill.categoryName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-stone-600 flex-wrap">
              <span className="inline-flex items-center gap-1 font-semibold text-stone-800">
                Staff: <strong className="text-stone-900 underline decoration-amber-400 font-black">{refill.requestedBy.name}</strong>
                <span className="text-stone-500 text-[9px] uppercase font-bold">({refill.requestedBy.role})</span>
              </span>
              <span>•</span>
              <span>
                Current stock: <strong className="text-stone-900 font-bold">{refill.currentStock ?? 0} units</strong>
              </span>
            </div>

            {refill.notes && (
              <div className="rounded-lg bg-white border border-amber-200/90 px-2.5 py-1 text-[10px] sm:text-xs text-amber-950 italic">
                "{refill.notes}"
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons for Admin */}
        <div className="flex items-center justify-between pt-1 gap-2 border-t border-amber-200/80">
          {onNavigateTab ? (
            <button
              onClick={() => {
                onClose();
                onNavigateTab('refills');
              }}
              className="text-[10px] sm:text-xs font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
            >
              View in Supplies &amp; Refills
            </button>
          ) : <div />}

          {isAdmin ? (
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={() => handleDeclineRefill(refill)}
                className="rounded-xl border border-stone-300 bg-white text-stone-700 px-2.5 py-1 text-[10px] sm:text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
              >
                Decline
              </button>
              <button
                onClick={() => {
                  setSelectedRefillForReview(refill);
                  setIsReviewRefillModalOpen(true);
                }}
                className="rounded-xl border border-amber-400 bg-amber-100 text-amber-950 px-2.5 py-1 text-[10px] sm:text-xs font-extrabold hover:bg-amber-200 transition cursor-pointer"
              >
                Review / Adjust
              </button>
              <button
                onClick={() => handleQuickApproveRefill(refill)}
                className="flex items-center gap-1 rounded-xl bg-amber-500 text-stone-950 px-2.5 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black hover:bg-amber-400 transition cursor-pointer shadow-2xs"
              >
                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                <span>Approve (+{refill.suggestedQuantity})</span>
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-amber-800 italic">Pending Admin Confirmation</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Dark backdrop overlay */}
      <div
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Center modal dialog */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4 md:p-6">
        <div
          id="staff-notification-center-modal"
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-3xl rounded-2xl bg-white text-stone-900 shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 text-white px-3.5 sm:px-6 py-3 sm:py-3.5">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="relative grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 font-black shadow-xs">
                <Bell className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 fill-stone-950" />
                {totalAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 sm:h-4 sm:min-w-4 items-center justify-center rounded-full bg-rose-600 px-0.5 sm:px-1 text-[8px] sm:text-[9px] font-black text-white ring-2 ring-stone-900 animate-pulse">
                    {totalAlertsCount}
                  </span>
                )}
              </div>
              <h2 className="font-display text-xs sm:text-base font-black text-white leading-tight">
                Notifications
              </h2>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Single Filter Button to show filter modal */}
              <button
                id="open-notification-filter-btn"
                type="button"
                onClick={() => setIsFilterModalOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-stone-700 bg-stone-800/90 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-200 hover:bg-stone-700 hover:text-white transition cursor-pointer shadow-2xs"
                title="Filter Notifications"
              >
                <SlidersHorizontal className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-amber-400" />
                <span>Filter: {getTabLabel(activeTab)}</span>
              </button>

              <button
                id="close-staff-notifications-btn"
                onClick={onClose}
                className="rounded-xl p-1 sm:p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                title="Close Notifications"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          {/* Subheader bar with Sort indicator & Quick category filter chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 bg-stone-50 px-3 sm:px-6 py-2">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-stone-700 bg-white border border-stone-200 px-2.5 py-1 rounded-xl shadow-2xs">
              <ArrowDownWideNarrow className="h-3.5 w-3.5 text-amber-600" />
              <span>Sort: <strong className="text-stone-900 font-extrabold">Newest First</strong></span>
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                  activeTab === 'all'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                All ({totalAlertsCount})
              </button>
              <button
                id="notif-chip-refills"
                type="button"
                onClick={() => setActiveTab('refills')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                  activeTab === 'refills'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs font-extrabold'
                    : 'bg-white text-stone-600 hover:bg-amber-50 border border-stone-200'
                }`}
              >
                Refills ({pendingRefillRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('order_confirm')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                  activeTab === 'order_confirm'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-emerald-50 border border-stone-200'
                }`}
              >
                Orders ({sortedOrderConfirmations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cancellations')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                  activeTab === 'cancellations'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-rose-50 border border-stone-200'
                }`}
              >
                Cancels ({sortedCancellationRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('table_confirm')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                  activeTab === 'table_confirm'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-indigo-50 border border-stone-200'
                }`}
              >
                Tables ({sortedTableConfirmations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('no_stock')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                  activeTab === 'no_stock'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-rose-50 border border-stone-200'
                }`}
              >
                No Stock ({noStockItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('low_stock')}
                className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition cursor-pointer shrink-0 ${
                  activeTab === 'low_stock'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                    : 'bg-white text-stone-600 hover:bg-amber-50 border border-stone-200'
                }`}
              >
                Low Stock ({lowStockItems.length})
              </button>
            </div>
          </div>

          {/* Scrollable Notification List Body */}
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 space-y-3 text-[11px] sm:text-sm">
            {totalAlertsCount === 0 && (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <div className="grid h-10 w-10 sm:h-14 sm:w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 mb-2 border border-emerald-200">
                  <CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7 stroke-[2.2]" />
                </div>
                <h3 className="font-display font-extrabold text-xs sm:text-base text-stone-900">
                  All Systems Clear
                </h3>
                <p className="text-[10px] sm:text-xs text-stone-500 max-w-sm mt-0.5">
                  No active stock warnings, table requests, or pending orders.
                </p>
              </div>
            )}

            {/* TAB: ALL NOTIFICATIONS - Unified list sorted chronologically by newest first */}
            {activeTab === 'all' && allUnifiedNotifications.length > 0 && (
              <div className="space-y-2.5 sm:space-y-3">
                {allUnifiedNotifications.map((notif) => {
                  switch (notif.type) {
                    case 'order_confirm':
                      return renderOrderCard(notif.data, true);
                    case 'cancellation':
                      return renderCancellationCard(notif.data, true);
                    case 'table_request':
                      return renderTableRequestCard(notif.data, true);
                    case 'reservation':
                      return renderReservationCard(notif.data, true);
                    case 'no_stock':
                      return renderNoStockCard(notif.data, true);
                    case 'low_stock':
                      return renderLowStockCard(notif.data, true);
                    case 'refill_suggestion':
                      return renderRefillCard(notif.data, true);
                    default:
                      return null;
                  }
                })}
              </div>
            )}

            {/* TAB: ORDER CONFIRMATIONS */}
            {activeTab === 'order_confirm' && (
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <ClipboardList className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                    </span>
                    <h3 className="font-extrabold text-xs sm:text-sm text-emerald-950">
                      Pending Order Confirmations ({sortedOrderConfirmations.length})
                    </h3>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-stone-400 font-mono">Sorted by newest</span>
                </div>

                {sortedOrderConfirmations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-400 mb-2">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-stone-500">No pending orders awaiting confirmation.</p>
                  </div>
                ) : (
                  sortedOrderConfirmations.map((order) => renderOrderCard(order, false))
                )}
              </div>
            )}

            {/* TAB: CANCELLATIONS */}
            {activeTab === 'cancellations' && (
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                      <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                    </span>
                    <h3 className="font-extrabold text-xs sm:text-sm text-rose-950">
                      Customer Cancellation Requests ({sortedCancellationRequests.length})
                    </h3>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-stone-400 font-mono">Sorted by newest</span>
                </div>

                {sortedCancellationRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-400 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-xs text-stone-500">No pending cancellation requests.</p>
                  </div>
                ) : (
                  sortedCancellationRequests.map((order) => renderCancellationCard(order, false))
                )}
              </div>
            )}

            {/* TAB: TABLE CONFIRMATIONS */}
            {activeTab === 'table_confirm' && (
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
                      <Utensils className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                    </span>
                    <h3 className="font-extrabold text-xs sm:text-sm text-indigo-950">
                      Table Requests & Reservations ({sortedTableConfirmations.length})
                    </h3>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-stone-400 font-mono">Sorted by newest</span>
                </div>

                {sortedTableConfirmations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-400 mb-2">
                      <Utensils className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-stone-500">No pending table requests or reservations.</p>
                  </div>
                ) : (
                  sortedTableConfirmations.map((item) =>
                    item.type === 'table_request'
                      ? renderTableRequestCard(item.data, false)
                      : renderReservationCard(item.data, false)
                  )
                )}
              </div>
            )}

            {/* TAB: NO STOCK */}
            {activeTab === 'no_stock' && (
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                      <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                    </span>
                    <h3 className="font-extrabold text-xs sm:text-sm text-rose-950">
                      Out of Stock Items ({noStockItems.length})
                    </h3>
                  </div>
                  {isAdmin && onNavigateTab && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('inventory');
                      }}
                      className="text-[10px] sm:text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Inventory</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {noStockItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-stone-500">No items currently out of stock.</p>
                  </div>
                ) : (
                  noStockItems.map((item) => renderNoStockCard(item, false))
                )}
              </div>
            )}

            {/* TAB: LOW STOCK */}
            {activeTab === 'low_stock' && (
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-900 border border-amber-200">
                      <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                    </span>
                    <h3 className="font-extrabold text-xs sm:text-sm text-amber-950">
                      Low Stock Alerts ({lowStockItems.length})
                    </h3>
                  </div>
                  {isAdmin && onNavigateTab && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('inventory');
                      }}
                      className="text-[10px] sm:text-xs font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Inventory</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {lowStockItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-stone-500">No items with low stock warning.</p>
                  </div>
                ) : (
                  lowStockItems.map((item) => renderLowStockCard(item, false))
                )}
              </div>
            )}

            {/* TAB: STAFF REFILL SUGGESTIONS */}
            {activeTab === 'refills' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-stone-100 flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                      <PackagePlus className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                    </span>
                    <h3 className="font-extrabold text-xs sm:text-sm text-stone-900">
                      Staff Refill Suggestions ({pendingRefillRequests.length})
                    </h3>
                  </div>
                  <span className="text-[10px] sm:text-xs text-stone-500">
                    Requires Admin approval to officially update inventory
                  </span>
                </div>

                {pendingRefillRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-400 mb-2">
                      <Package className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-stone-600">No pending refill suggestions</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Staff refill suggestions will appear here for Admin review and confirmation.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {pendingRefillGroups.map((group) => {
                      const pendingGroupItems = group.items.filter((i) => i.status === 'pending');
                      if (pendingGroupItems.length === 0) return null;

                      return (
                        <div
                          key={`refill-group-${group.staffKey}`}
                          className="rounded-2xl border border-amber-200 bg-amber-50/20 p-3 sm:p-4 space-y-3 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-amber-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-xl bg-stone-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                                {group.requestedBy.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                                  <span>{group.requestedBy.name}</span>
                                  <span className="text-[9px] uppercase font-bold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                                    {group.requestedBy.role}
                                  </span>
                                </h4>
                                <p className="text-[10px] text-stone-500">
                                  {pendingGroupItems.length} refill item(s) requested • Latest {formatRelativeTime(group.latestDate)}
                                </p>
                              </div>
                            </div>

                            {isAdmin && pendingGroupItems.length > 1 && (
                              <button
                                onClick={() => handleBatchApproveStaffRefills(group)}
                                className="flex items-center gap-1 rounded-xl bg-amber-500 text-stone-950 px-2.5 py-1 text-[10px] sm:text-xs font-black hover:bg-amber-400 transition cursor-pointer shadow-2xs"
                              >
                                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                                <span>Approve All ({pendingGroupItems.length}) from {group.requestedBy.name}</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-2">
                            {pendingGroupItems.map((item) => renderRefillCard(item, false))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clean Footer Bar */}
          <div className="border-t border-stone-200 bg-stone-50 px-3.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-end">
            <button
              onClick={onClose}
              className="rounded-xl bg-stone-900 text-white px-3.5 sm:px-4 py-1.5 text-[11px] sm:text-xs font-bold hover:bg-stone-800 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE FILTER MODAL PICKER */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3">
          <div
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-2xs"
            onClick={() => setIsFilterModalOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-3.5 sm:p-5 shadow-2xl border border-stone-200 space-y-3 animate-in zoom-in-95 duration-150 text-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                <h3 className="font-display font-extrabold text-xs sm:text-base text-stone-900">
                  Filter Notifications
                </h3>
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {/* Option 1: All */}
              <button
                onClick={() => {
                  setActiveTab('all');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-stone-900 text-white border-stone-900'
                    : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5" />
                  <span>All Notifications</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${activeTab === 'all' ? 'bg-amber-400 text-stone-950' : 'bg-stone-200 text-stone-800'}`}>
                  {totalAlertsCount}
                </span>
              </button>

              {/* Option 2: No Stock */}
              <button
                onClick={() => {
                  setActiveTab('no_stock');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activeTab === 'no_stock'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Ban className="h-3.5 w-3.5 text-rose-500" />
                  <span>No Stock</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${activeTab === 'no_stock' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-800'}`}>
                  {noStockItems.length}
                </span>
              </button>

              {/* Option 3: Low Stock */}
              <button
                onClick={() => {
                  setActiveTab('low_stock');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activeTab === 'low_stock'
                    ? 'bg-amber-500 text-stone-950 border-amber-500'
                    : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>Low Stock</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${activeTab === 'low_stock' ? 'bg-stone-950 text-amber-300' : 'bg-amber-100 text-amber-900'}`}>
                  {lowStockItems.length}
                </span>
              </button>

              {/* Option 4: Table Confirmations */}
              <button
                onClick={() => {
                  setActiveTab('table_confirm');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activeTab === 'table_confirm'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Utensils className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Table Confirmations</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${activeTab === 'table_confirm' ? 'bg-white text-indigo-700' : 'bg-indigo-100 text-indigo-800'}`}>
                  {totalTableConfirmationsCount}
                </span>
              </button>

              {/* Option 5: Order Confirmations */}
              <button
                onClick={() => {
                  setActiveTab('order_confirm');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activeTab === 'order_confirm'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Order Confirmations</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${activeTab === 'order_confirm' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'}`}>
                  {sortedOrderConfirmations.length}
                </span>
              </button>

              {/* Option 6: Customer Cancellation Requests */}
              <button
                onClick={() => {
                  setActiveTab('cancellations');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activeTab === 'cancellations'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Ban className="h-3.5 w-3.5 text-rose-500" />
                  <span>Cancellation Requests</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${activeTab === 'cancellations' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-800'}`}>
                  {sortedCancellationRequests.length}
                </span>
              </button>

              {/* Option 7: Staff Refill Suggestions */}
              <button
                id="filter-opt-refills"
                onClick={() => {
                  setActiveTab('refills');
                  setIsFilterModalOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-[11px] sm:text-xs font-bold transition cursor-pointer ${
                  activeTab === 'refills'
                    ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold'
                    : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <PackagePlus className="h-3.5 w-3.5 text-amber-600" />
                  <span>Staff Refill Suggestions</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${activeTab === 'refills' ? 'bg-stone-950 text-amber-300' : 'bg-amber-100 text-amber-900'}`}>
                  {pendingRefillRequests.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Confirm/Review Refill Modal */}
      {isReviewRefillModalOpen && selectedRefillForReview && (
        <AdminConfirmRefillModal
          isOpen={isReviewRefillModalOpen}
          onClose={() => {
            setIsReviewRefillModalOpen(false);
            setSelectedRefillForReview(null);
          }}
          request={selectedRefillForReview}
          activeStaff={activeStaff}
          onSuccess={() => {
            setIsReviewRefillModalOpen(false);
            setSelectedRefillForReview(null);
            setRefillRequests(AppStore.getRefillRequests());
          }}
        />
      )}
    </div>
  );
};
