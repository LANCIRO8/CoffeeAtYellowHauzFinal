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
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const handleQuickRestock = (item: MenuItem) => {
    AppStore.quickRestockItem(item.id, 10);
    showAlert({
      title: 'Stock Replenished',
      message: `Added +10 units to ${item.name}. New stock: ${(item.quantity ?? 0) + 10} units.`,
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
        className="rounded-3xl border border-stone-200 bg-linear-to-r from-stone-900 via-stone-850 to-stone-900 text-white p-5 sm:p-7 shadow-md"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Welcome back, {activeStaff.fullName || 'Admin'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl font-medium">
              Real-time executive dashboard for <strong>{settings.storeName || 'Coffee at Yellow Hauz'}</strong>.
              Monitor revenue rushes, active kitchen tickets, table floor utilization, and store operations.
            </p>
          </div>

          {/* Time range selector & refresh */}
          <div className="flex flex-wrap items-center gap-2.5 bg-stone-800/80 p-1.5 rounded-2xl border border-stone-700/80">
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  timeRange === range.id
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
                }`}
              >
                {range.label}
              </button>
            ))}

            <button
              id="admin-dashboard-refresh-btn"
              onClick={handleRefresh}
              className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-700/60 transition cursor-pointer"
              title="Refresh Dashboard Data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Hub Navigation Cards */}
        <div className="mt-6 pt-5 border-t border-stone-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            id="admin-quick-pos"
            onClick={() => onNavigateTab('pos')}
            className="flex items-center gap-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 text-left transition cursor-pointer group"
          >
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 group-hover:bg-amber-500 group-hover:text-stone-950 transition">
              <Monitor className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">POS Register</div>
              <div className="text-[10px] text-stone-400">Ring Orders</div>
            </div>
          </button>

          <button
            id="admin-quick-tickets"
            onClick={() => onNavigateTab('tickets')}
            className="flex items-center gap-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 text-left transition cursor-pointer group relative"
          >
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 group-hover:bg-sky-500 group-hover:text-stone-950 transition">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Tickets</span>
                {pendingTickets.length > 0 && (
                  <span className="rounded-full bg-amber-500 text-stone-950 px-1.5 py-0.2 text-[9px] font-black">
                    {pendingTickets.length}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-stone-400">Active Kitchen</div>
            </div>
          </button>

          <button
            id="admin-quick-tables"
            onClick={() => onNavigateTab('tables')}
            className="flex items-center gap-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 text-left transition cursor-pointer group"
          >
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-500 group-hover:text-stone-950 transition">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Floor Plan</div>
              <div className="text-[10px] text-stone-400">{occupiedTables.length}/{tables.length} Occupied</div>
            </div>
          </button>

          <button
            id="admin-quick-inventory"
            onClick={() => onNavigateTab('inventory')}
            className="flex items-center gap-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 text-left transition cursor-pointer group relative"
          >
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 group-hover:bg-rose-500 group-hover:text-stone-950 transition">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>Inventory</span>
                {lowStockItems.length > 0 && (
                  <span className="rounded-full bg-rose-600 text-white px-1.5 py-0.2 text-[9px] font-black">
                    {lowStockItems.length}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-stone-400">{menuItems.length} Products</div>
            </div>
          </button>

          <button
            id="admin-quick-reports"
            onClick={() => onNavigateTab('reports')}
            className="flex items-center gap-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 text-left transition cursor-pointer group"
          >
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500 group-hover:text-stone-950 transition">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Sales Ledger</div>
              <div className="text-[10px] text-stone-400">Reports & CSV</div>
            </div>
          </button>

          <button
            id="admin-quick-settings"
            onClick={() => onNavigateTab('settings')}
            className="flex items-center gap-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 p-3 text-left transition cursor-pointer group"
          >
            <div className="p-2 rounded-xl bg-stone-700 text-stone-300 group-hover:bg-stone-200 group-hover:text-stone-950 transition">
              <Settings className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Store Config</div>
              <div className="text-[10px] text-stone-400">Staff PINs & Tax</div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Gross Revenue */}
        <div
          id="kpi-gross-revenue"
          className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Gross Sales</span>
            <div className="rounded-2xl bg-amber-500/10 p-2.5 text-amber-700">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              ₱{totalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
              <span>Subtotal: ₱{totalNetSubtotal.toFixed(2)}</span>
              <span className="font-semibold text-stone-700">VAT: ₱{totalVatCollected.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Completed Orders Volume */}
        <div
          id="kpi-orders-volume"
          className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs hover:border-sky-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Orders Volume</span>
            <div className="rounded-2xl bg-sky-500/10 p-2.5 text-sky-700">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {validCompletedOrders.length}{' '}
              <span className="text-sm font-semibold text-stone-400">tickets</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="rounded-lg bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                {inStoreOrders.length} In-Store
              </span>
              <span className="rounded-lg bg-sky-100 px-2 py-0.5 font-bold text-sky-800">
                {onlineOrders.length} Online
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Average Order Value (AOV) */}
        <div
          id="kpi-aov"
          className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs hover:border-emerald-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Avg Order Value</span>
            <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              ₱{averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 text-xs text-stone-500 flex items-center justify-between">
              <span>Discounts: ₱{totalDiscountsGiven.toFixed(2)}</span>
              <span className="font-bold text-emerald-700">Healthy Margin</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Floor Plan & Operations Health */}
        <div
          id="kpi-floor-plan"
          className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs hover:border-purple-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Floor Occupancy</span>
            <div className="rounded-2xl bg-purple-500/10 p-2.5 text-purple-700">
              <LayoutGrid className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              {occupiedTables.length} / {tables.length}{' '}
              <span className="text-sm font-semibold text-stone-400">tables</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-bold">{availableTables.length} Available</span>
              <span className="text-amber-700 font-bold">{reservedTables.length} Reserved</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live Analytics & Rush Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Sales Curve */}
        <div className="lg:col-span-2 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Hourly Sales Trend & Rush Curve (Today)
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Track morning coffee surges, lunch peaks, and evening traffic.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-xl border border-amber-200/60 self-start sm:self-auto">
              Realtime POS & Online
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: any) => [`₱${Number(value || 0).toFixed(2)}`, 'Sales Revenue']}
                  contentStyle={{
                    backgroundColor: '#1c1917',
                    borderColor: '#292524',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
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

        {/* Category Share Distribution */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-600" />
                Category Revenue Share
              </h2>
            </div>
            <p className="text-xs text-stone-400 -mt-3 mb-4">
              Revenue contribution per menu classification.
            </p>

            <div className="h-48 w-full">
              {categorySalesData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-400">
                  No transaction data for this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySalesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="revenue"
                    >
                      {categorySalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`₱${Number(val).toFixed(2)}`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#1c1917',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-1.5 mt-2 max-h-36 overflow-y-auto no-scrollbar pt-2 border-t border-stone-100">
            {categorySalesData.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Orders Feed */}
        <div className="lg:col-span-2 rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-600" />
                Live Orders & Receipts Stream
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Most recent orders across POS Register and Customer Online Storefront.
              </p>
            </div>

            <button
              id="admin-view-all-reports-btn"
              onClick={() => onNavigateTab('reports')}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 transition cursor-pointer"
            >
              <span>View All Reports</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-100">
            {orders.slice(0, 5).map((order) => {
              const channel = AppStore.getOrderChannel(order);
              const orderTime = new Date(order.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={order.id}
                  className="p-3.5 hover:bg-stone-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        channel === 'online' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {channel === 'online' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-stone-900">{order.orderNumber}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            order.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.status === 'processing'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {order.status}
                        </span>
                        <span className="text-[10px] font-bold text-stone-400">{orderTime}</span>
                      </div>

                      <div className="text-xs text-stone-600 font-medium mt-0.5">
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

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-stone-900 text-sm">
                        ₱{Number(order.totalAmount || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] font-bold uppercase text-stone-400">
                        {order.paymentMethod || 'Cash'}
                      </div>
                    </div>

                    <button
                      id={`admin-view-receipt-${order.id}`}
                      onClick={() => onViewReceipt(order)}
                      className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer"
                      title="View Full Receipt"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Critical Low Stock / Inventory Alerts */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Inventory Stock Alerts
              </h2>
              {lowStockItems.length > 0 && (
                <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-black">
                  {lowStockItems.length} low
                </span>
              )}
            </div>

            <p className="text-xs text-stone-400 -mt-3 mb-4">
              Products at or below safety reorder thresholds.
            </p>

            {lowStockItems.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200/60 p-5 text-center my-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="font-bold text-xs text-emerald-900">All Stocks Healthy</h3>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  No items are running critically low or out of stock.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-rose-100 bg-rose-50/40 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900">{item.name}</div>
                      <div className="text-[11px] font-bold text-rose-700 mt-0.5">
                        {item.quantity <= 0 ? (
                          <span className="text-rose-700 font-extrabold uppercase">Out of Stock (0)</span>
                        ) : (
                          <span>Only {item.quantity} units left (Min: {item.lowStockThreshold ?? 5})</span>
                        )}
                      </div>
                    </div>

                    <button
                      id={`admin-quick-restock-${item.id}`}
                      onClick={() => handleQuickRestock(item)}
                      className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-rose-800 text-[11px] font-extrabold hover:bg-rose-100 transition shadow-2xs cursor-pointer shrink-0"
                    >
                      +10 Restock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            id="admin-open-inventory-manager-btn"
            onClick={() => onNavigateTab('inventory')}
            className="w-full mt-4 flex items-center justify-center gap-1.5 rounded-2xl bg-stone-900 text-white py-2.5 text-xs font-bold hover:bg-stone-800 transition cursor-pointer"
          >
            <Package className="h-3.5 w-3.5" />
            <span>Open Inventory Ledger</span>
          </button>
        </div>
      </div>

      {/* 5. Reservations & Staff Performance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table & Venue Reservations */}
        <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                Table & Venue Reservations
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Upcoming guest bookings and private event reservations.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('tables')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 transition cursor-pointer"
            >
              View Floor Map
            </button>
          </div>

          {reservations.length === 0 ? (
            <div className="rounded-2xl bg-stone-50 border border-stone-200/70 p-6 text-center text-xs text-stone-400">
              No reservations recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5">
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
                    className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-stone-900">
                          {res.reservationCode}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isVenue
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isVenue ? 'Venue Rental' : `Table #${res.tableNumber || 1}`}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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

                      <div className="text-xs text-stone-700 font-semibold">
                        {res.customerName} • {res.guestCount} Guests •{' '}
                        <span className="text-stone-500">{dateFormatted}</span>
                      </div>
                      {res.notes && (
                        <div className="text-[11px] text-stone-500 italic line-clamp-1">
                          "{res.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {res.status === 'pending' && (
                        <button
                          id={`admin-confirm-res-${res.id}`}
                          onClick={() => handleConfirmReservation(res.id)}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
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
        <div className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" />
                Staff & Cashier Shift Performance
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Transactions and volume rung up by staff members.
              </p>
            </div>

            <button
              onClick={() => onNavigateTab('settings')}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 transition cursor-pointer"
            >
              Manage PINs
            </button>
          </div>

          <div className="divide-y divide-stone-100 border border-stone-100 rounded-2xl overflow-hidden">
            {cashierMetrics.map((staff, idx) => (
              <div
                key={`staff-${staff.id || idx}-${staff.name}`}
                className="p-3.5 flex items-center justify-between hover:bg-stone-50/60 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-2xl bg-amber-100 text-amber-900 font-extrabold flex items-center justify-center text-xs shrink-0">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <span>{staff.name}</span>
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.2 text-[9px] font-bold text-stone-600 uppercase">
                        {staff.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-400 font-medium">
                      {staff.ordersCount} transactions handled
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-extrabold text-stone-900 text-xs sm:text-sm">
                    ₱{staff.salesTotal.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-400 font-bold">Total Processed</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
