import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, Category, User, Order, TableRequest, Reservation, Table, StaffTabType } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
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
} from 'lucide-react';

interface StaffNotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStaff?: User | null;
  initialTab?: 'all' | 'no_stock' | 'low_stock' | 'table_confirm' | 'order_confirm' | 'cancellations';
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
  const [activeTab, setActiveTab] = useState<'all' | 'no_stock' | 'low_stock' | 'table_confirm' | 'order_confirm' | 'cancellations'>(initialTab);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [restockingId, setRestockingId] = useState<number | null>(null);

  // Store data state
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [tableRequests, setTableRequests] = useState<TableRequest[]>(() => AppStore.getTableRequests());
  const [reservations, setReservations] = useState<Reservation[]>(() => AppStore.getReservations());
  const [categories, setCategories] = useState<Category[]>(() => AppStore.getCategories());

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
    });
    return () => unsub();
  }, []);

  const isAdmin = activeStaff?.role === 'admin';

  // 1. No Stock (Out of Stock): quantity <= 0 or isAvailable === false
  const noStockItems = useMemo(() => {
    return menuItems.filter((i) => (i.quantity ?? 0) <= 0 || i.isAvailable === false);
  }, [menuItems]);

  // 2. Low Stock: quantity > 0 and quantity <= 5
  const lowStockItems = useMemo(() => {
    return menuItems.filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 5 && i.isAvailable !== false);
  }, [menuItems]);

  // 3. Table Confirmations: pending table requests + pending reservations
  const pendingTableRequests = useMemo(() => {
    return tableRequests.filter((r) => r.status === 'pending');
  }, [tableRequests]);

  const pendingReservations = useMemo(() => {
    return reservations.filter((r) => r.status === 'pending');
  }, [reservations]);

  const totalTableConfirmationsCount = pendingTableRequests.length + pendingReservations.length;

  // 4. Order Confirmations: orders with status 'to_confirm' or 'pending'
  const pendingOrderConfirmations = useMemo(() => {
    return orders.filter((o) => o.status === 'to_confirm' || o.status === 'pending');
  }, [orders]);

  // 5. Customer Cancellation Requests: orders with cancellationRequested === true and status !== 'cancelled'
  const pendingCancellationRequests = useMemo(() => {
    return orders.filter((o) => o.cancellationRequested && o.status !== 'cancelled');
  }, [orders]);

  const totalAlertsCount =
    noStockItems.length +
    lowStockItems.length +
    totalTableConfirmationsCount +
    pendingOrderConfirmations.length +
    pendingCancellationRequests.length;

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

  const getTabLabel = (tabKey: typeof activeTab) => {
    switch (tabKey) {
      case 'all':
        return `All (${totalAlertsCount})`;
      case 'no_stock':
        return `No Stock (${noStockItems.length})`;
      case 'low_stock':
        return `Low Stock (${lowStockItems.length})`;
      case 'table_confirm':
        return `Table Confirmations (${totalTableConfirmationsCount})`;
      case 'order_confirm':
        return `Order Confirmations (${pendingOrderConfirmations.length})`;
      case 'cancellations':
        return `Cancel Requests (${pendingCancellationRequests.length})`;
      default:
        return 'All';
    }
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

          {/* Scrollable Notification List Body */}
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-5 space-y-3 sm:space-y-5 text-[11px] sm:text-sm">
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

            {activeTab === 'cancellations' && pendingCancellationRequests.length === 0 && totalAlertsCount > 0 && (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                <div className="grid h-10 w-10 sm:h-14 sm:w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 mb-2 border border-emerald-200">
                  <CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7 stroke-[2.2]" />
                </div>
                <h3 className="font-display font-extrabold text-xs sm:text-base text-stone-900">
                  No Pending Cancellation Requests
                </h3>
                <p className="text-[10px] sm:text-xs text-stone-500 max-w-sm mt-0.5">
                  There are currently no customer orders requesting cancellation.
                </p>
              </div>
            )}

            {/* SECTION 1: NO STOCK (OUT OF STOCK) */}
            {(activeTab === 'all' || activeTab === 'no_stock') && noStockItems.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex h-4.5 w-4.5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                      <Ban className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                    </span>
                    <h3 className="font-extrabold text-[11px] sm:text-sm text-rose-950">
                      Out of Stock ({noStockItems.length})
                    </h3>
                  </div>

                  {isAdmin && onNavigateTab && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('inventory');
                      }}
                      className="text-[9px] sm:text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Inventory</span>
                      <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
                  {noStockItems.map((item) => {
                    const cat = categories.find((c) => c.id === item.categoryId);
                    return (
                      <div
                        key={`no-stock-${item.id}`}
                        className="flex flex-col justify-between rounded-xl border border-rose-200 bg-rose-50/40 p-2 sm:p-3 shadow-2xs hover:border-rose-300 transition"
                      >
                        <div className="flex items-start gap-2 sm:gap-2.5">
                          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                            <img
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&auto=format&fit=crop&q=60'}
                              alt={item.name}
                              className="h-full w-full object-cover grayscale opacity-75"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-[10px] sm:text-xs text-stone-950 truncate">
                                {item.name}
                              </h4>
                              <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black text-white shrink-0">
                                0 STOCK
                              </span>
                            </div>
                            <p className="text-[9px] sm:text-[11px] text-stone-500 truncate mt-0.5">
                              {cat ? cat.name : 'Beverages'} • ₱{item.price.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-rose-200/80">
                            <button
                              onClick={() => handleQuickRestock(item, 10)}
                              disabled={restockingId === item.id}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 text-white font-extrabold text-[9px] sm:text-[11px] px-2 py-0.5 sm:py-1 hover:bg-emerald-700 transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                            >
                              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[3]" />
                              <span>+10 Restock</span>
                            </button>
                            <button
                              onClick={() => handleCustomRestock(item)}
                              className="rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 transition cursor-pointer"
                            >
                              Custom
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: LOW STOCK */}
            {(activeTab === 'all' || activeTab === 'low_stock') && lowStockItems.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex h-4.5 w-4.5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                      <AlertTriangle className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                    </span>
                    <h3 className="font-extrabold text-[11px] sm:text-sm text-amber-950">
                      Low Stock ({lowStockItems.length})
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
                  {lowStockItems.map((item) => {
                    const cat = categories.find((c) => c.id === item.categoryId);
                    return (
                      <div
                        key={`low-stock-${item.id}`}
                        className="flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/40 p-2 sm:p-3 shadow-2xs hover:border-amber-300 transition"
                      >
                        <div className="flex items-start gap-2 sm:gap-2.5">
                          <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                            <img
                              src={item.imageUrl || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&auto=format&fit=crop&q=60'}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-[10px] sm:text-xs text-stone-950 truncate">
                                {item.name}
                              </h4>
                              <span className="rounded-full bg-amber-200 border border-amber-400 px-1.5 py-0.2 text-[8px] sm:text-[10px] font-black text-amber-950 shrink-0">
                                {item.quantity} LEFT
                              </span>
                            </div>
                            <p className="text-[9px] sm:text-[11px] text-stone-500 truncate mt-0.5">
                              {cat ? cat.name : 'Item'} • ₱{item.price.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center justify-end gap-1 sm:gap-1.5 mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-amber-200/80">
                            <button
                              onClick={() => handleQuickRestock(item, 10)}
                              disabled={restockingId === item.id}
                              className="flex items-center gap-1 rounded-lg bg-stone-950 text-amber-400 font-extrabold text-[9px] sm:text-[11px] px-2 py-0.5 sm:py-1 hover:bg-stone-800 transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                            >
                              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[3]" />
                              <span>+10 Restock</span>
                            </button>
                            <button
                              onClick={() => handleCustomRestock(item)}
                              className="rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 transition cursor-pointer"
                            >
                              Custom
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 3: TABLE CONFIRMATIONS (TABLE REQUESTS & RESERVATIONS) */}
            {(activeTab === 'all' || activeTab === 'table_confirm') &&
              (pendingTableRequests.length > 0 || pendingReservations.length > 0) && (
                <div className="space-y-1.5 sm:space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="flex h-4.5 w-4.5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900 border border-indigo-300">
                        <Utensils className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                      </span>
                      <h3 className="font-extrabold text-[11px] sm:text-sm text-indigo-950">
                        Table Confirmations ({pendingTableRequests.length + pendingReservations.length})
                      </h3>
                    </div>
                  </div>

                  {/* A: Real-time In-Store Table Requests from Customers */}
                  {pendingTableRequests.map((req) => (
                    <div
                      key={`table-req-${req.id}`}
                      className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-2 sm:p-3 shadow-2xs space-y-1.5 sm:space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-xl bg-indigo-600 text-white font-mono font-black text-[11px] sm:text-sm">
                            #{req.requestedTableNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <span className="font-bold text-[10px] sm:text-xs text-stone-950">
                                {req.customerName || 'In-Store Guest'}
                              </span>
                              <span className="rounded-full bg-indigo-200 text-indigo-950 border border-indigo-300 text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 uppercase">
                                {req.type === 'change_table' ? 'Transfer' : 'Dine-In'}
                              </span>
                            </div>
                            <div className="text-[9px] sm:text-[11px] text-stone-600 mt-0.5">
                              Area: <span className="font-bold text-stone-800">{req.area === 'airconditioned' ? 'AC Room' : 'Main Area'}</span>
                              {req.currentTableNumber && ` • Prev: Table #${req.currentTableNumber}`}
                            </div>
                          </div>
                        </div>

                        <span className="text-[8px] sm:text-[10px] text-stone-500 font-mono shrink-0">
                          {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {req.notes && (
                        <p className="text-[9px] sm:text-[11px] bg-white/80 rounded-lg p-1.5 sm:p-2 border border-indigo-100 text-stone-700 italic">
                          "{req.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-indigo-100">
                        <button
                          onClick={() => handleDeclineTableRequest(req)}
                          className="flex items-center gap-1 rounded-xl border border-rose-300 bg-white px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Ban className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.2]" />
                          <span>Decline</span>
                        </button>
                        <button
                          onClick={() => handleApproveTableRequest(req)}
                          className="flex items-center gap-1 rounded-xl bg-emerald-600 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-extrabold hover:bg-emerald-700 transition cursor-pointer shadow-2xs"
                        >
                          <Check className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                          <span>Confirm & Bind</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* B: Pending Advance Table / Venue Reservations */}
                  {pendingReservations.map((res) => (
                    <div
                      key={`res-${res.id}`}
                      className="rounded-xl border border-amber-200 bg-amber-50/40 p-2 sm:p-3 shadow-2xs space-y-1.5 sm:space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 font-black text-[10px] sm:text-xs">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              <span className="font-bold text-[10px] sm:text-xs text-stone-950">
                                {res.customerName}
                              </span>
                              <span className="font-mono text-[8px] sm:text-[9px] text-amber-900 font-bold bg-amber-200 px-1 py-0.2 rounded">
                                #{res.reservationCode}
                              </span>
                              <span className="rounded-full bg-amber-200 text-amber-950 border border-amber-300 text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 uppercase">
                                {res.bookingType === 'venue' ? 'Event Nook' : `Table #${res.tableNumber}`}
                              </span>
                            </div>
                            <div className="text-[9px] sm:text-[11px] text-stone-600 mt-0.5">
                              Time: <span className="font-bold text-stone-800">{new Date(res.reservationAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> • Party: {res.guestCount} guests
                            </div>
                          </div>
                        </div>

                        <span className="text-[8px] sm:text-[10px] text-stone-500 font-mono shrink-0">
                          {new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {res.notes && (
                        <p className="text-[9px] sm:text-[11px] bg-white/80 rounded-lg p-1.5 sm:p-2 border border-amber-100 text-stone-700 italic">
                          "{res.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-amber-100">
                        <button
                          onClick={() => handleDeclineReservation(res)}
                          className="flex items-center gap-1 rounded-xl border border-rose-300 bg-white px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <X className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                          <span>Decline</span>
                        </button>
                        <button
                          onClick={() => handleConfirmReservation(res)}
                          className="flex items-center gap-1 rounded-xl bg-amber-500 text-stone-950 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-black hover:bg-amber-400 transition cursor-pointer shadow-2xs"
                        >
                          <Check className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                          <span>Confirm Booking</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* SECTION: CUSTOMER CANCELLATION REQUESTS */}
            {(activeTab === 'all' || activeTab === 'cancellations' || activeTab === 'order_confirm') &&
              pendingCancellationRequests.length > 0 && (
                <div className="space-y-2 sm:space-y-2.5 rounded-2xl border-2 border-rose-400 bg-rose-50/50 p-2.5 sm:p-3.5 shadow-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-rose-600 text-white shadow-2xs">
                        <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                      </span>
                      <div>
                        <h3 className="font-extrabold text-[11px] sm:text-sm text-rose-950 flex items-center gap-1.5">
                          <span>Customer Cancellation Requests</span>
                          <span className="rounded-full bg-rose-600 text-white text-[8px] sm:text-[9px] font-black px-1.5 sm:px-2 py-0.2 sm:py-0.5 animate-pulse">
                            {pendingCancellationRequests.length} REQUIRED
                          </span>
                        </h3>
                        <p className="text-[9px] sm:text-[11px] text-rose-900/80">
                          Customer requested cancellation. Staff or Admin confirmation is needed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {pendingCancellationRequests.map((order) => {
                      const isOnline = order.channel === 'online';
                      return (
                        <div
                          key={`cancellation-req-${order.id}`}
                          className="rounded-xl border border-rose-300 bg-white p-2.5 sm:p-3 shadow-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 sm:gap-2.5">
                              <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-rose-600 text-white font-mono font-black text-[11px] sm:text-xs">
                                #{order.orderNumber}
                              </div>
                              <div>
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <span className="font-bold text-[11px] sm:text-xs text-stone-950">
                                    {order.customerName || 'Guest Customer'}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black uppercase ${
                                      isOnline
                                        ? 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                                        : 'bg-amber-100 text-amber-950 border border-amber-300'
                                    }`}
                                  >
                                    {isOnline ? <Globe className="h-2 w-2" /> : <Store className="h-2 w-2" />}
                                    {isOnline ? 'Online' : `Table #${order.tableNumber || 'Dine-In'}`}
                                  </span>
                                </div>
                                <div className="text-[9px] sm:text-[11px] text-stone-600 mt-0.5">
                                  {order.items.length} items • Total: <span className="font-bold text-stone-900">₱{order.totalAmount.toFixed(2)}</span> • Status: <span className="uppercase font-bold text-amber-700">{order.status.replace('_', ' ')}</span>
                                </div>
                              </div>
                            </div>

                            <span className="text-[8px] sm:text-[10px] text-stone-500 font-mono shrink-0">
                              {order.cancellationRequestedAt
                                ? new Date(order.cancellationRequestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Customer Selected Reason Banner */}
                          <div className="rounded-lg bg-rose-50 border border-rose-200/90 p-2 text-[10px] sm:text-xs text-rose-950 space-y-0.5">
                            <div className="font-extrabold flex items-center gap-1 text-rose-900">
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                              <span>Customer Reason: "{order.cancellationReason || 'Requested via customer portal'}"</span>
                            </div>
                            {order.cancellationNotes && (
                              <p className="text-stone-700 italic pl-4.5 text-[10px] sm:text-[11px]">
                                Customer Note: "{order.cancellationNotes}"
                              </p>
                            )}
                          </div>

                          {/* Items summary */}
                          <div className="bg-stone-50 rounded-lg p-1.5 sm:p-2 border border-stone-200 space-y-0.5 text-[9px] sm:text-[11px]">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex items-center justify-between text-stone-800">
                                <span className="font-medium truncate">
                                  {it.quantity}x {it.name}
                                </span>
                                <span className="font-mono text-stone-600 font-bold shrink-0">
                                  ₱{it.totalPrice.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Actions for Staff and Admin */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-stone-100">
                            <button
                              type="button"
                              onClick={() => {
                                if (onViewOrderReceipt) {
                                  onViewOrderReceipt(order);
                                }
                              }}
                              className="text-[9px] sm:text-xs font-bold text-stone-600 hover:text-stone-950 underline cursor-pointer"
                            >
                              View Ticket
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeclineCustomerCancellation(order)}
                                className="flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-2.5 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                                title="Decline cancellation and keep preparing order"
                              >
                                <span>Decline Request</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmCustomerCancellation(order)}
                                className="flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[9px] sm:text-xs font-black transition cursor-pointer shadow-xs"
                                title="Confirm cancellation, void ticket, and restore inventory"
                              >
                                <Check className="h-3 w-3 stroke-[2.5]" />
                                <span>Confirm &amp; Cancel</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* SECTION 4: ORDER CONFIRMATIONS */}
            {(activeTab === 'all' || activeTab === 'order_confirm') && pendingOrderConfirmations.length > 0 && (
              <div className="space-y-1.5 sm:space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="flex h-4.5 w-4.5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <ClipboardList className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
                    </span>
                    <h3 className="font-extrabold text-[11px] sm:text-sm text-emerald-950">
                      Order Confirmations ({pendingOrderConfirmations.length})
                    </h3>
                  </div>

                  {onNavigateTab && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('tickets');
                      }}
                      className="text-[9px] sm:text-xs font-bold text-emerald-700 hover:text-emerald-950 underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>Kitchen Tickets</span>
                      <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 sm:space-y-2.5">
                  {pendingOrderConfirmations.map((order) => {
                    const isOnline = order.channel === 'online';
                    return (
                      <div
                        key={`order-confirm-${order.id}`}
                        className="rounded-xl border border-rose-200 bg-rose-50/40 p-2 sm:p-3 shadow-2xs space-y-1.5 sm:space-y-2 hover:border-rose-300 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 sm:gap-2.5">
                            <div className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-xl bg-stone-900 text-amber-400 font-mono font-black text-[10px] sm:text-xs">
                              #{order.orderNumber}
                            </div>
                            <div>
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <span className="font-bold text-[10px] sm:text-xs text-stone-950">
                                  {order.customerName || 'Guest Customer'}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black uppercase ${
                                    isOnline
                                      ? 'bg-indigo-100 text-indigo-950 border border-indigo-300'
                                      : 'bg-amber-100 text-amber-950 border border-amber-300'
                                  }`}
                                >
                                  {isOnline ? <Globe className="h-2 w-2" /> : <Store className="h-2 w-2" />}
                                  {isOnline ? 'Online' : `Table #${order.tableNumber || 'Dine-In'}`}
                                </span>
                              </div>
                              <div className="text-[9px] sm:text-[11px] text-stone-600 mt-0.5">
                                {order.items.length} items • Total: <span className="font-bold text-stone-900">₱{order.totalAmount.toFixed(2)}</span> • Payment: {order.paymentMethod?.toUpperCase()}
                              </div>
                            </div>
                          </div>

                          <span className="text-[8px] sm:text-[10px] text-stone-500 font-mono shrink-0">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Item list summary */}
                        <div className="bg-white/80 rounded-lg p-1.5 sm:p-2 border border-stone-200 space-y-0.5">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[9px] sm:text-[11px] text-stone-800">
                              <span className="font-medium truncate">
                                {it.quantity}x {it.name}
                              </span>
                              <span className="font-mono text-stone-600 font-bold shrink-0">
                                ₱{it.totalPrice.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-rose-200/80">
                          <button
                            onClick={() => {
                              if (onViewOrderReceipt) {
                                onViewOrderReceipt(order);
                              }
                            }}
                            className="text-[9px] sm:text-xs font-bold text-stone-600 hover:text-stone-950 underline cursor-pointer"
                          >
                            Details
                          </button>

                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <button
                              onClick={() => handleCancelOrder(order)}
                              className="flex items-center gap-1 rounded-xl border border-rose-300 bg-white px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-xs font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <X className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                              <span>Decline</span>
                            </button>
                            <button
                              onClick={() => handleConfirmOrderToPrep(order)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-600 text-white px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[9px] sm:text-xs font-extrabold hover:bg-emerald-700 transition cursor-pointer shadow-2xs"
                            >
                              <Flame className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 stroke-[2.4]" />
                              <span>Confirm & Prep</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                  {pendingOrderConfirmations.length}
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
                  {pendingCancellationRequests.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
