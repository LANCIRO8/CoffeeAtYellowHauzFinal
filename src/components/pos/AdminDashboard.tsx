import React, { useState, useMemo } from 'react';
import {
  Category,
  MenuItem,
  Order,
  User,
  Reservation,
  StoreSettings,
  Table,
} from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  AlertTriangle,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowRight,
  Monitor,
  LayoutGrid,
  ClipboardList,
  BarChart3,
  Settings,
  Coffee,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Store,
  CreditCard,
  Smartphone,
  Banknote,
  Plus,
  Layers,
  ArrowDownRight,
  Eye,
  Search,
  Filter,
  Ban,
  TrendingDown,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

interface AdminDashboardProps {
  categories: Category[];
  menuItems: MenuItem[];
  settings: StoreSettings;
  activeStaff: User;
  onNavigateTab: (
    tab: 'dashboard' | 'pos' | 'tables' | 'tickets' | 'reports' | 'analytics' | 'inventory' | 'settings'
  ) => void;
  onViewReceipt: (order: Order) => void;
  onOpenLowStockModal?: () => void;
  onRefreshData?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  categories,
  menuItems,
  settings,
  activeStaff,
  onNavigateTab,
  onViewReceipt,
  onOpenLowStockModal,
  onRefreshData,
}) => {
  const { showConfirm, showAlert } = useModal();

  // Selected date filtering preset for executive metrics
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('today');
  const [dashboardChartTab, setDashboardChartTab] = useState<'category' | 'bestSellers'>('category');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('all');
  const [restockAmount, setRestockAmount] = useState<number>(10);

  // Live collections from Store
  const orders = useMemo(() => AppStore.getOrders(), [categories, menuItems]);
  const tables = useMemo(() => AppStore.getTables(), []);
  const reservations = useMemo(() => AppStore.getReservations(), []);
  const users = useMemo(() => AppStore.getUsers(), []);

  // Filter orders by selected time range
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (isNaN(orderDate.getTime())) return true;

      if (timeRange === 'today') {
        return orderDate >= startOfToday;
      }
      if (timeRange === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600000);
        return orderDate >= sevenDaysAgo;
      }
      if (timeRange === '30days') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000);
        return orderDate >= thirtyDaysAgo;
      }
      return true;
    });
  }, [orders, timeRange]);

  // Completed valid revenue orders
  const validCompletedOrders = useMemo(() => {
    return filteredOrders.filter((o) => o.status === 'completed' || o.status === 'processing');
  }, [filteredOrders]);

  // Financial KPIs
  const totalGrossRevenue = useMemo(() => {
    return validCompletedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [validCompletedOrders]);

  const totalNetSubtotal = useMemo(() => {
    return validCompletedOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  }, [validCompletedOrders]);

  const totalVatCollected = useMemo(() => {
    return validCompletedOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
  }, [validCompletedOrders]);

  const totalDiscountsGiven = useMemo(() => {
    return validCompletedOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  }, [validCompletedOrders]);

  const averageOrderValue = useMemo(() => {
    if (validCompletedOrders.length === 0) return 0;
    return totalGrossRevenue / validCompletedOrders.length;
  }, [validCompletedOrders, totalGrossRevenue]);

  // Channel breakdown
  const onlineOrders = useMemo(() => {
    return validCompletedOrders.filter((o) => AppStore.getOrderChannel(o) === 'online');
  }, [validCompletedOrders]);

  const inStoreOrders = useMemo(() => {
    return validCompletedOrders.filter((o) => AppStore.getOrderChannel(o) === 'in_store');
  }, [validCompletedOrders]);

  // Inventory calculations
  const lowStockItems = useMemo(() => {
    return menuItems.filter((i) => (i.quantity ?? 0) <= (i.lowStockThreshold ?? 5));
  }, [menuItems]);

  const outOfStockItems = useMemo(() => {
    return menuItems.filter((i) => (i.quantity ?? 0) <= 0);
  }, [menuItems]);

  // Table Floor Plan Utilization
  const occupiedTables = useMemo(() => {
    return tables.filter((t) => t.status === 'occupied');
  }, [tables]);

  const reservedTables = useMemo(() => {
    return tables.filter((t) => t.status === 'reserved');
  }, [tables]);

  const availableTables = useMemo(() => {
    return tables.filter((t) => t.status === 'available');
  }, [tables]);

  // Pending items requiring action
  const pendingTickets = useMemo(() => {
    return orders.filter((o) => o.status === 'pending' || o.status === 'processing');
  }, [orders]);

  const pendingReservations = useMemo(() => {
    return reservations.filter((r) => r.status === 'pending');
  }, [reservations]);

  const pendingCancellationRequests = useMemo(() => {
    return orders.filter(
      (o) => (o.cancellationRequested || o.cancellationRequestedAt) && !o.cancelledAt && o.status !== 'cancelled' && !o.cancellationRejectedAt
    );
  }, [orders]);

  // Filtered orders for the Live Orders stream
  const displayOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchNum = String(o.orderNumber).includes(q);
        const matchName = (o.customerName || '').toLowerCase().includes(q);
        if (!matchNum && !matchName) return false;
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Hourly Sales chart data (today)
  const hourlyData = useMemo(() => {
    const hoursMap: Record<number, { hour: string; sales: number; orders: number }> = {};
    for (let h = 7; h <= 22; h++) {
      const label = `${h === 12 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;
      hoursMap[h] = { hour: label, sales: 0, orders: 0 };
    }

    const todayOrders = orders.filter((o) => {
      const d = new Date(o.createdAt);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear() &&
        (o.status === 'completed' || o.status === 'processing')
      );
    });

    todayOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const h = d.getHours();
      if (hoursMap[h]) {
        hoursMap[h].sales += o.totalAmount || 0;
        hoursMap[h].orders += 1;
      }
    });

    return Object.values(hoursMap);
  }, [orders]);

  // Category Distribution Data
  const categorySalesData = useMemo(() => {
    const catMap: Record<string, { name: string; revenue: number; count: number }> = {};

    categories.forEach((c) => {
      catMap[c.id] = { name: c.name, revenue: 0, count: 0 };
    });

    validCompletedOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const product = menuItems.find((m) => m.id === it.menuItemId);
        const catId = product?.categoryId || 1;
        if (catMap[catId]) {
          catMap[catId].revenue += it.totalPrice || (it.unitPrice || 0) * it.quantity;
          catMap[catId].count += it.quantity;
        }
      });
    });

    return Object.values(catMap)
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [categories, menuItems, validCompletedOrders]);

  // Payment Method Breakdown
  const paymentBreakdown = useMemo(() => {
    const methods: Record<string, number> = { Cash: 0, GCash: 0, Card: 0 };
    validCompletedOrders.forEach((o) => {
      const pm = (o.paymentMethod || 'cash').toLowerCase();
      if (pm.includes('gcash')) methods.GCash += o.totalAmount || 0;
      else if (pm.includes('card')) methods.Card += o.totalAmount || 0;
      else methods.Cash += o.totalAmount || 0;
    });

    return [
      { name: 'Cash', value: methods.Cash, color: '#f59e0b' },
      { name: 'GCash QR', value: methods.GCash, color: '#3b82f6' },
      { name: 'Card', value: methods.Card, color: '#10b981' },
    ].filter((p) => p.value > 0);
  }, [validCompletedOrders]);

  // Top 5 Products by Sales
  const topProducts = useMemo(() => {
    const itemMap: Record<number, { id: number; name: string; qty: number; revenue: number; stock: number }> =
      {};

    validCompletedOrders.forEach((o) => {
      (o.items || []).forEach((it) => {
        if (!itemMap[it.menuItemId]) {
          const match = menuItems.find((m) => m.id === it.menuItemId);
          itemMap[it.menuItemId] = {
            id: it.menuItemId,
            name: it.name,
            qty: 0,
            revenue: 0,
            stock: match?.quantity ?? 0,
          };
        }
        itemMap[it.menuItemId].qty += it.quantity;
        itemMap[it.menuItemId].revenue += it.totalPrice || (it.unitPrice || 0) * it.quantity;
      });
    });

    return Object.values(itemMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [validCompletedOrders, menuItems]);

  // Cashier performance
  const cashierMetrics = useMemo(() => {
    const staffMap: Record<
      string,
      { id: number; name: string; role: string; ordersCount: number; salesTotal: number }
    > = {};

    users.forEach((u) => {
      staffMap[u.id] = {
        id: u.id,
        name: u.fullName || u.username,
        role: u.role,
        ordersCount: 0,
        salesTotal: 0,
      };
    });

    validCompletedOrders.forEach((o) => {
      const cId = o.cashierId || 1;
      if (staffMap[cId]) {
        staffMap[cId].ordersCount += 1;
        staffMap[cId].salesTotal += o.totalAmount || 0;
      }
    });

    return Object.values(staffMap).sort((a, b) => b.salesTotal - a.salesTotal);
  }, [users, validCompletedOrders]);

  // Handle Quick Restock 1-click
  const handleQuickRestock = (item: MenuItem, amount?: number) => {
    const qtyToAdd = amount ?? restockAmount ?? 10;
    AppStore.quickRestockItem(item.id, qtyToAdd);
    showAlert({
      title: 'Stock Replenished',
      message: `Added +${qtyToAdd} units to ${item.name}. New stock: ${(item.quantity ?? 0) + qtyToAdd} units.`,
      type: 'success',
    });
  };

  // Handle Confirm Reservation
  const handleConfirmReservation = (resId: number) => {
    AppStore.updateReservationStatus(resId, 'confirmed');
    showAlert({
      title: 'Reservation Confirmed',
      message: 'The reservation status has been set to Confirmed and synced to Firestore.',
      type: 'success',
    });
  };

  // Manual trigger reload
  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshData) onRefreshData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div id="admin-dashboard-root" className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 1. Header Banner & Executive Controls */}
      <div
        id="admin-dashboard-header"
        className="rounded-2xl sm:rounded-3xl border border-amber-400/80 bg-amber-500 text-stone-950 p-4 sm:p-7 shadow-md transition-all"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative h-12 w-12 sm:h-16 sm:w-16 overflow-hidden rounded-2xl bg-stone-950 border-2 border-stone-950/20 shadow-sm shrink-0 flex items-center justify-center">
              <img
                src="/images/Coffeatyellowhauz_logo.jpg"
                alt="Yellow Hauz Cafe"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <Coffee className="h-6 w-6 text-amber-400 fill-amber-400 absolute pointer-events-none -z-10" />
            </div>

            <div className="space-y-0.5 sm:space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-950/15 px-2 py-0.5 text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-stone-950">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-stone-950" />
                <span>Executive Command Center</span>
              </div>
              <h1 className="font-display text-lg sm:text-2xl lg:text-3xl font-black tracking-tight text-stone-950 leading-tight">
                Welcome back, {activeStaff.fullName || 'Admin'}
              </h1>
              <p className="text-[10px] sm:text-xs md:text-sm text-stone-900 max-w-2xl font-medium leading-tight sm:leading-normal">
                Real-time executive dashboard for <strong>{settings.storeName || 'Coffee at Yellow Hauz'}</strong>.
                Monitor revenue rushes, active kitchen tickets, table floor utilization, and store operations.
              </p>
            </div>
          </div>

          {/* Time range selector & refresh */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-stone-950/15 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-stone-950/20 self-start lg:self-center">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: '7days', label: '7 Days' },
                { id: '30days', label: '30 Days' },
                { id: 'all', label: 'All Time' },
              ] as const
            ).map((range) => (
              <button
                key={range.id}
                id={`admin-range-${range.id}`}
                onClick={() => setTimeRange(range.id)}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black transition cursor-pointer ${
                  timeRange === range.id
                    ? 'bg-stone-950 text-amber-400 shadow-xs'
                    : 'text-stone-900 hover:text-stone-950 hover:bg-stone-950/10'
                }`}
              >
                {range.label}
              </button>
            ))}

            <button
              id="admin-dashboard-refresh-btn"
              onClick={handleRefresh}
              className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl text-stone-900 hover:text-stone-950 hover:bg-stone-950/20 transition cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin text-stone-950' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Hub Navigation Cards */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-5 border-t border-stone-950/15 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          <button
            id="admin-quick-pos"
            onClick={() => onNavigateTab('pos')}
            className="flex items-center gap-2 rounded-xl sm:rounded-2xl bg-stone-950/10 hover:bg-stone-950/20 border border-stone-950/15 p-2 sm:p-3 text-left transition cursor-pointer group shadow-2xs"
          >
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-stone-950 text-amber-400 group-hover:scale-105 transition shrink-0">
              <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-stone-950">POS Register</div>
            </div>
          </button>

          <button
            id="admin-quick-tickets"
            onClick={() => onNavigateTab('tickets')}
            className="flex items-center gap-2 rounded-xl sm:rounded-2xl bg-stone-950/10 hover:bg-stone-950/20 border border-stone-950/15 p-2 sm:p-3 text-left transition cursor-pointer group relative shadow-2xs"
          >
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-stone-950 text-sky-400 group-hover:scale-105 transition shrink-0">
              <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-stone-950 flex items-center gap-1 sm:gap-1.5">
                <span>Tickets</span>
                {pendingTickets.length > 0 && (
                  <span className="rounded-full bg-stone-950 text-amber-400 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black">
                    {pendingTickets.length}
                  </span>
                )}
              </div>
            </div>
          </button>

          <button
            id="admin-quick-tables"
            onClick={() => onNavigateTab('tables')}
            className="flex items-center gap-2 rounded-xl sm:rounded-2xl bg-stone-950/10 hover:bg-stone-950/20 border border-stone-950/15 p-2 sm:p-3 text-left transition cursor-pointer group shadow-2xs"
          >
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-stone-950 text-emerald-400 group-hover:scale-105 transition shrink-0">
              <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-stone-950">Floor Plan</div>
            </div>
          </button>

          <button
            id="admin-quick-inventory"
            onClick={() => onNavigateTab('inventory')}
            className="flex items-center gap-2 rounded-xl sm:rounded-2xl bg-stone-950/10 hover:bg-stone-950/20 border border-stone-950/15 p-2 sm:p-3 text-left transition cursor-pointer group relative shadow-2xs"
          >
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-stone-950 text-rose-400 group-hover:scale-105 transition shrink-0">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-stone-950 flex items-center gap-1">
                <span>Inventory</span>
                {lowStockItems.length > 0 && (
                  <span className="rounded-full bg-rose-600 text-white px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black">
                    {lowStockItems.length}
                  </span>
                )}
              </div>
            </div>
          </button>

          <button
            id="admin-quick-reports"
            onClick={() => onNavigateTab('reports')}
            className="flex items-center gap-2 rounded-xl sm:rounded-2xl bg-stone-950/10 hover:bg-stone-950/20 border border-stone-950/15 p-2 sm:p-3 text-left transition cursor-pointer group shadow-2xs"
          >
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-stone-950 text-indigo-400 group-hover:scale-105 transition shrink-0">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-stone-950">Sales Ledger</div>
            </div>
          </button>

          <button
            id="admin-quick-settings"
            onClick={() => onNavigateTab('settings')}
            className="flex items-center gap-2 rounded-xl sm:rounded-2xl bg-stone-950/10 hover:bg-stone-950/20 border border-stone-950/15 p-2 sm:p-3 text-left transition cursor-pointer group shadow-2xs"
          >
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-stone-950 text-amber-200 group-hover:scale-105 transition shrink-0">
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-bold text-stone-950">Store Config</div>
            </div>
          </button>
        </div>
      </div>

      {/* Real-Time Operational Alerts & Critical Attention Hub */}
      {(pendingCancellationRequests.length > 0 ||
        lowStockItems.length > 0 ||
        pendingReservations.length > 0 ||
        pendingTickets.length > 0) && (
        <div className="rounded-2xl border border-stone-200 bg-white p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>Real-Time Operation Status &amp; Action Items</span>
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-stone-400">
              {pendingCancellationRequests.length + lowStockItems.length + pendingReservations.length} items requiring review
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. Cancellation Requests */}
            <button
              onClick={() => onNavigateTab('tickets')}
              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer ${
                pendingCancellationRequests.length > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-950 hover:bg-rose-100'
                  : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}
            >
              <div>
                <div className="text-[9px] sm:text-[11px] font-bold">Cancellation Requests</div>
                <div className="text-[11px] sm:text-sm font-black mt-0.5">
                  {pendingCancellationRequests.length}{' '}
                  <span className="text-[9px] font-normal text-stone-500">pending</span>
                </div>
              </div>
              <Ban className={`h-4 w-4 shrink-0 ${pendingCancellationRequests.length > 0 ? 'text-rose-600 animate-pulse' : 'text-stone-400'}`} />
            </button>

            {/* 2. Active Kitchen Tickets */}
            <button
              onClick={() => onNavigateTab('tickets')}
              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer ${
                pendingTickets.length > 0
                  ? 'bg-sky-50 border-sky-300 text-sky-950 hover:bg-sky-100'
                  : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}
            >
              <div>
                <div className="text-[9px] sm:text-[11px] font-bold">Kitchen Queue</div>
                <div className="text-[11px] sm:text-sm font-black mt-0.5">
                  {pendingTickets.length}{' '}
                  <span className="text-[9px] font-normal text-stone-500">active tickets</span>
                </div>
              </div>
              <ClipboardList className={`h-4 w-4 shrink-0 ${pendingTickets.length > 0 ? 'text-sky-600' : 'text-stone-400'}`} />
            </button>

            {/* 3. Pending Table Reservations */}
            <button
              onClick={() => onNavigateTab('tables')}
              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer ${
                pendingReservations.length > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
                  : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}
            >
              <div>
                <div className="text-[9px] sm:text-[11px] font-bold">Guest Bookings</div>
                <div className="text-[11px] sm:text-sm font-black mt-0.5">
                  {pendingReservations.length}{' '}
                  <span className="text-[9px] font-normal text-stone-500">awaiting</span>
                </div>
              </div>
              <Calendar className={`h-4 w-4 shrink-0 ${pendingReservations.length > 0 ? 'text-amber-600' : 'text-stone-400'}`} />
            </button>

            {/* 4. Stock Warnings */}
            <button
              onClick={() => onNavigateTab('inventory')}
              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer ${
                lowStockItems.length > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div>
                <div className="text-[9px] sm:text-[11px] font-bold">Stock Alerts</div>
                <div className="text-[11px] sm:text-sm font-black mt-0.5">
                  {lowStockItems.length === 0 ? (
                    <span className="text-emerald-700">Healthy</span>
                  ) : (
                    <span>{lowStockItems.length} items low</span>
                  )}
                </div>
              </div>
              <Package className={`h-4 w-4 shrink-0 ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Metric 1: Total Gross Revenue */}
        <div
          id="kpi-gross-revenue"
          className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3 sm:p-5 shadow-xs hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider truncate">Gross Sales</span>
            <div className="rounded-lg sm:rounded-2xl bg-amber-500/10 p-1.5 sm:p-2.5 text-amber-700 shrink-0">
              <DollarSign className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="font-display text-base sm:text-2xl lg:text-3xl font-extrabold text-stone-900 tracking-tight truncate">
              ₱{totalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[9px] sm:text-xs text-stone-500 gap-0.5">
              <span className="truncate">Sub: ₱{totalNetSubtotal.toFixed(0)}</span>
              <span className="font-semibold text-stone-700 truncate">VAT: ₱{totalVatCollected.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Completed Orders Volume */}
        <div
          id="kpi-orders-volume"
          className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3 sm:p-5 shadow-xs hover:border-sky-400 transition"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider truncate">Orders Volume</span>
            <div className="rounded-lg sm:rounded-2xl bg-sky-500/10 p-1.5 sm:p-2.5 text-sky-700 shrink-0">
              <ShoppingBag className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="font-display text-base sm:text-2xl lg:text-3xl font-extrabold text-stone-900 tracking-tight">
              {validCompletedOrders.length}{' '}
              <span className="text-xs sm:text-sm font-semibold text-stone-400">tickets</span>
            </div>
            <div className="mt-1 sm:mt-2 flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs flex-wrap">
              <span className="rounded-md sm:rounded-lg bg-amber-100 px-1 sm:px-2 py-0.2 sm:py-0.5 font-bold text-amber-800">
                {inStoreOrders.length} Store
              </span>
              <span className="rounded-md sm:rounded-lg bg-sky-100 px-1 sm:px-2 py-0.2 sm:py-0.5 font-bold text-sky-800">
                {onlineOrders.length} Online
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Average Order Value (AOV) */}
        <div
          id="kpi-aov"
          className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3 sm:p-5 shadow-xs hover:border-emerald-400 transition"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider truncate">Avg Order</span>
            <div className="rounded-lg sm:rounded-2xl bg-emerald-500/10 p-1.5 sm:p-2.5 text-emerald-700 shrink-0">
              <TrendingUp className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="font-display text-base sm:text-2xl lg:text-3xl font-extrabold text-stone-900 tracking-tight truncate">
              ₱{averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 sm:mt-2 text-[9px] sm:text-xs text-stone-500 flex flex-col sm:flex-row sm:items-center justify-between gap-0.5">
              <span className="truncate">Disc: ₱{totalDiscountsGiven.toFixed(0)}</span>
              <span className="font-bold text-emerald-700 truncate">Healthy Margin</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Floor Plan & Operations Health */}
        <div
          id="kpi-floor-plan"
          className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3 sm:p-5 shadow-xs hover:border-purple-400 transition"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-xs font-bold text-stone-500 uppercase tracking-wider truncate">Floor Occupancy</span>
            <div className="rounded-lg sm:rounded-2xl bg-purple-500/10 p-1.5 sm:p-2.5 text-purple-700 shrink-0">
              <LayoutGrid className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="font-display text-base sm:text-2xl lg:text-3xl font-extrabold text-stone-900 tracking-tight">
              {occupiedTables.length} / {tables.length}{' '}
              <span className="text-xs sm:text-sm font-semibold text-stone-400">tables</span>
            </div>
            <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:items-center justify-between text-[9px] sm:text-xs gap-0.5">
              <span className="text-emerald-700 font-bold truncate">{availableTables.length} Avail</span>
              <span className="text-amber-700 font-bold truncate">{reservedTables.length} Rsrvd</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Tender Breakdown: Cash vs GCash vs Card */}
      <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="font-display text-xs sm:text-base font-bold text-stone-900 flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-amber-600" />
              <span>Revenue by Tender Method &amp; Channel Split</span>
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-500">Breakdown of gross collections across payment types and order channels.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono font-bold text-stone-700 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200">
            <span>Period Total:</span>
            <span className="text-stone-950 font-black">₱{totalGrossRevenue.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Cash */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
                <Banknote className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] sm:text-xs font-bold text-amber-950">Cash Register</div>
                <div className="text-[9px] sm:text-[10px] text-amber-900/70">Physical counter cash</div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-xs sm:text-sm font-black text-amber-950">
                ₱{(paymentBreakdown.find((p) => p.name === 'Cash')?.value || 0).toFixed(2)}
              </div>
              <div className="text-[9px] text-amber-800 font-bold">
                {totalGrossRevenue > 0
                  ? `${Math.round(((paymentBreakdown.find((p) => p.name === 'Cash')?.value || 0) / totalGrossRevenue) * 100)}% share`
                  : '0%'}
              </div>
            </div>
          </div>

          {/* GCash */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold">
                <Smartphone className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] sm:text-xs font-bold text-sky-950">GCash Merchant QR</div>
                <div className="text-[9px] sm:text-[10px] text-sky-900/70">Digital e-wallet payments</div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-xs sm:text-sm font-black text-sky-950">
                ₱{(paymentBreakdown.find((p) => p.name === 'GCash QR')?.value || 0).toFixed(2)}
              </div>
              <div className="text-[9px] text-sky-800 font-bold">
                {totalGrossRevenue > 0
                  ? `${Math.round(((paymentBreakdown.find((p) => p.name === 'GCash QR')?.value || 0) / totalGrossRevenue) * 100)}% share`
                  : '0%'}
              </div>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 sm:p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] sm:text-xs font-bold text-emerald-950">Card Terminal / POS</div>
                <div className="text-[9px] sm:text-[10px] text-emerald-900/70">Debit &amp; Credit cards</div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-xs sm:text-sm font-black text-emerald-950">
                ₱{(paymentBreakdown.find((p) => p.name === 'Card')?.value || 0).toFixed(2)}
              </div>
              <div className="text-[9px] text-emerald-800 font-bold">
                {totalGrossRevenue > 0
                  ? `${Math.round(((paymentBreakdown.find((p) => p.name === 'Card')?.value || 0) / totalGrossRevenue) * 100)}% share`
                  : '0%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Analytics & Rush Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Hourly Sales Curve */}
        <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
            <div>
              <h2 className="font-display text-xs sm:text-base font-bold text-stone-900 flex items-center gap-1.5 sm:gap-2">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                <span>Hourly Sales Trend &amp; Rush Curve (Today)</span>
              </h2>
            </div>
            <span className="text-[9px] sm:text-xs font-mono font-bold bg-amber-50 text-amber-800 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border border-amber-200/60 self-start sm:self-auto">
              Realtime POS &amp; Online
            </span>
          </div>

          <div className="h-44 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`₱${Number(value || 0).toFixed(2)}`, 'Sales Revenue']}
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderColor: '#292524',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category & Best Seller Share Distribution */}
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h2 className="font-display text-xs sm:text-base font-bold text-stone-900 flex items-center gap-1.5 sm:gap-2">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                <span>{dashboardChartTab === 'category' ? 'Category Share' : 'Top Items Share'}</span>
              </h2>
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-[10px] sm:text-xs">
                <button
                  type="button"
                  onClick={() => setDashboardChartTab('category')}
                  className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium transition-all ${
                    dashboardChartTab === 'category'
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Categories
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardChartTab('bestSellers')}
                  className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-medium transition-all ${
                    dashboardChartTab === 'bestSellers'
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Best Sellers
                </button>
              </div>
            </div>

            <div className="h-40 sm:h-48 w-full">
              {(dashboardChartTab === 'category' ? categorySalesData : topProducts).length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] sm:text-xs text-stone-400">
                  No transaction data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardChartTab === 'category' ? categorySalesData : topProducts}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={68}
                      paddingAngle={4}
                      dataKey="revenue"
                      nameKey="name"
                    >
                      {(dashboardChartTab === 'category' ? categorySalesData : topProducts).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`₱${Number(val).toFixed(2)}`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#1c1917',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-1 sm:space-y-1.5 mt-2 max-h-32 sm:max-h-36 overflow-y-auto no-scrollbar pt-2 border-t border-stone-100">
            {(dashboardChartTab === 'category' ? categorySalesData : topProducts).slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-[10px] sm:text-xs">
                <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                  <span
                    className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-stone-700 font-semibold truncate">{c.name}</span>
                </div>
                <span className="font-mono font-bold text-stone-900">₱{c.revenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Live Command Center: Recent Orders, Reservations & Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Live Orders Feed */}
        <div className="lg:col-span-2 rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 sm:mb-4">
            <div>
              <h2 className="font-display text-xs sm:text-base font-bold text-stone-900 flex items-center gap-1.5 sm:gap-2">
                <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                <span>Live Orders &amp; Receipts Stream</span>
              </h2>
            </div>

            <button
              id="admin-view-all-reports-btn"
              onClick={() => onNavigateTab('reports')}
              className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-700 hover:text-amber-800 transition cursor-pointer self-start sm:self-auto"
            >
              <span>View Full Ledger</span>
              <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>

          {/* Interactive Search & Status Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3 pb-3 border-b border-stone-100">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search order # or guest name..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 text-[10px] sm:text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(['all', 'pending', 'processing', 'completed', 'cancelled'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[9px] sm:text-[11px] font-bold uppercase transition cursor-pointer shrink-0 ${
                    orderStatusFilter === st
                      ? 'bg-amber-500 text-stone-950 shadow-2xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-stone-100 overflow-hidden rounded-xl sm:rounded-2xl border border-stone-100">
            {displayOrders.length === 0 ? (
              <div className="p-6 text-center text-[10px] sm:text-xs text-stone-400">
                No orders match your search or filter.
              </div>
            ) : (
              displayOrders.slice(0, 5).map((order) => {
                const channel = AppStore.getOrderChannel(order);
                const orderTime = new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isCancellationPending =
                  (order.cancellationRequested || order.cancellationRequestedAt) &&
                  !order.cancelledAt &&
                  order.status !== 'cancelled' &&
                  !order.cancellationRejectedAt;

                return (
                  <div
                    key={order.id}
                    className="p-2.5 sm:p-3.5 hover:bg-stone-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div
                        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shrink-0 mt-0.5 ${
                          channel === 'online' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {channel === 'online' ? (
                          <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[10px] sm:text-xs text-stone-900">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`rounded-full px-1.5 sm:px-2 py-0.2 text-[8px] sm:text-[10px] font-extrabold uppercase ${
                              order.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'processing'
                                ? 'bg-amber-100 text-amber-800'
                                : order.status === 'cancelled'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {order.status}
                          </span>
                          {isCancellationPending && (
                            <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black animate-pulse">
                              Cancellation Requested
                            </span>
                          )}
                          <span className="text-[9px] sm:text-[10px] font-bold text-stone-400">{orderTime}</span>
                        </div>

                        <div className="text-[10px] sm:text-xs text-stone-600 font-medium mt-0.5">
                          <span className="font-semibold text-stone-800">{order.customerName || 'Walk-in Guest'}</span>
                          {order.tableNumber && (
                            <span className="text-stone-500"> • Table #{order.tableNumber}</span>
                          )}
                          <span className="text-stone-400">
                            {' '}
                            • {(order.items || []).reduce((acc, i) => acc + i.quantity, 0)} items
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 self-end sm:self-auto">
                      <div className="text-right">
                        <div className="font-mono font-extrabold text-stone-900 text-xs sm:text-sm">
                          ₱{Number(order.totalAmount || 0).toFixed(2)}
                        </div>
                        <div className="text-[8px] sm:text-[10px] font-bold uppercase text-stone-400">
                          {order.paymentMethod || 'Cash'}
                        </div>
                      </div>

                      <button
                        id={`admin-view-receipt-${order.id}`}
                        onClick={() => onViewReceipt(order)}
                        className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                        title="View Full Receipt"
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Critical Low Stock / Inventory Alerts */}
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="font-display text-xs sm:text-base font-bold text-stone-900 flex items-center gap-1.5 sm:gap-2">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                <span>Inventory Stock Alerts</span>
              </h2>
              {lowStockItems.length > 0 && (
                <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[8px] sm:text-[10px] font-black">
                  {lowStockItems.length} alerts
                </span>
              )}
            </div>

            {/* Quick Restock Amount Selector */}
            <div className="flex items-center justify-between gap-1 mb-2.5 p-1 bg-stone-100 rounded-xl text-[9px] sm:text-[10px] font-bold text-stone-600">
              <span className="px-1 text-stone-500">Restock Batch:</span>
              <div className="flex items-center gap-1">
                {[10, 25, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRestockAmount(amt)}
                    className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                      restockAmount === amt
                        ? 'bg-amber-500 text-stone-950 font-black shadow-2xs'
                        : 'bg-white hover:bg-stone-200 text-stone-700'
                    }`}
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200/60 p-4 sm:p-5 text-center my-3">
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600 mx-auto mb-1.5" />
                <h3 className="font-bold text-[11px] sm:text-xs text-emerald-900">All Stocks Healthy</h3>
                <p className="text-[10px] sm:text-[11px] text-emerald-700 mt-0.5">
                  No items are running critically low or out of stock.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 sm:max-h-72 overflow-y-auto pr-0.5">
                {lowStockItems.slice(0, 5).map((item) => {
                  const isOut = (item.quantity ?? 0) <= 0;
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 transition-all ${
                        isOut
                          ? 'border-rose-200 bg-rose-50/70'
                          : 'border-amber-300 bg-amber-50/70'
                      }`}
                    >
                      <div>
                        <div className="text-[11px] sm:text-xs font-bold text-stone-900">{item.name}</div>
                        <div className="text-[10px] sm:text-[11px] font-bold mt-0.5">
                          {isOut ? (
                            <span className="text-rose-700 font-extrabold uppercase">Out of Stock (0 left)</span>
                          ) : (
                            <span className="text-amber-900 font-extrabold">
                              Only {item.quantity} units left • Low Stock
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        id={`admin-quick-restock-${item.id}`}
                        onClick={() => handleQuickRestock(item, restockAmount)}
                        className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-extrabold transition shadow-2xs cursor-pointer shrink-0 border ${
                          isOut
                            ? 'bg-white border-rose-200 text-rose-800 hover:bg-rose-100'
                            : 'bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200'
                        }`}
                      >
                        +{restockAmount} Restock
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            id="admin-open-inventory-manager-btn"
            onClick={() => onNavigateTab('inventory')}
            className="w-full mt-3 sm:mt-4 flex items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl bg-stone-900 text-white py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold hover:bg-stone-800 transition cursor-pointer"
          >
            <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Open Inventory Ledger</span>
          </button>
        </div>
      </div>

      {/* 5. Reservations & Staff Performance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Table & Venue Reservations */}
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="font-display text-xs sm:text-base font-bold text-stone-900 flex items-center gap-1.5 sm:gap-2">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                <span>Table &amp; Venue Reservations</span>
              </h2>
            </div>

            <button
              onClick={() => onNavigateTab('tables')}
              className="text-[10px] sm:text-xs font-bold text-amber-700 hover:text-amber-800 transition cursor-pointer"
            >
              View Floor Map
            </button>
          </div>

          {reservations.length === 0 ? (
            <div className="rounded-xl sm:rounded-2xl bg-stone-50 border border-stone-200/70 p-5 sm:p-6 text-center text-[10px] sm:text-xs text-stone-400">
              No reservations recorded yet.
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-2.5">
              {reservations.slice(0, 4).map((res) => {
                const isVenue = res.bookingType === 'venue';
                const dateFormatted = new Date(res.reservationAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={res.id}
                    className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3"
                  >
                    <div className="space-y-0.5 sm:space-y-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[10px] sm:text-xs text-stone-900">
                          {res.reservationCode}
                        </span>
                        <span
                          className={`rounded-full px-1.5 sm:px-2 py-0.2 text-[8px] sm:text-[10px] font-bold ${
                            isVenue
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isVenue ? 'Venue Rental' : `Table #${res.tableNumber || 1}`}
                        </span>
                        <span
                          className={`rounded-full px-1.5 sm:px-2 py-0.2 text-[8px] sm:text-[10px] font-bold ${
                            res.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : res.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {res.status}
                        </span>
                      </div>

                      <div className="text-[10px] sm:text-xs text-stone-700 font-semibold">
                        {res.customerName} • {res.guestCount} Guests •{' '}
                        <span className="text-stone-500">{dateFormatted}</span>
                      </div>
                      {res.notes && (
                        <div className="text-[9px] sm:text-[11px] text-stone-500 italic line-clamp-1">
                          "{res.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {res.status === 'pending' && (
                        <button
                          id={`admin-confirm-res-${res.id}`}
                          onClick={() => handleConfirmReservation(res.id)}
                          className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-emerald-600 text-white text-[10px] sm:text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Staff & Cashier Shift Performance */}
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="font-display text-xs sm:text-base font-bold text-stone-900 flex items-center gap-1.5 sm:gap-2">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
                <span>Staff &amp; Cashier Shift Performance</span>
              </h2>
            </div>

            <button
              onClick={() => onNavigateTab('settings')}
              className="text-[10px] sm:text-xs font-bold text-amber-700 hover:text-amber-800 transition cursor-pointer"
            >
              Manage PINs
            </button>
          </div>

          <div className="divide-y divide-stone-100 border border-stone-100 rounded-xl sm:rounded-2xl overflow-hidden">
            {cashierMetrics.map((staff, idx) => (
              <div
                key={`staff-${staff.id || idx}-${staff.name}`}
                className="p-2.5 sm:p-3.5 flex items-center justify-between hover:bg-stone-50/60 transition"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-xl sm:rounded-2xl bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center text-[10px] sm:text-xs shrink-0">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs font-bold text-stone-900 flex items-center gap-1 sm:gap-1.5">
                      <span>{staff.name}</span>
                      <span className="rounded-md bg-stone-100 px-1 sm:px-1.5 py-0.2 text-[8px] sm:text-[9px] font-bold text-stone-600 uppercase">
                        {staff.role}
                      </span>
                    </div>
                    <div className="text-[9px] sm:text-[11px] text-stone-400 font-medium">
                      {staff.ordersCount} transactions handled
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-extrabold text-stone-900 text-xs sm:text-sm">
                    ₱{staff.salesTotal.toFixed(2)}
                  </div>
                  <div className="text-[8px] sm:text-[10px] text-stone-400 font-bold">Total Processed</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
