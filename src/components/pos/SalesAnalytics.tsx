import React, { useState, useMemo, useEffect } from 'react';
import { AppStore } from '../../services/store';
import { Order, MenuItem, Category } from '../../types';
import { ProductMovementVelocity } from './ProductMovementVelocity';
import {
  PieChart as LucidePieChart,
  BarChart3,
  TrendingUp,
  Award,
  ShoppingBag,
  Clock,
  Store,
  Globe,
  CreditCard,
  Banknote,
  QrCode,
  Utensils,
  Calendar,
  Layers,
  ChevronRight,
  Zap,
  Flame,
  Turtle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

type TimeRange = 'today' | '7days' | '30days' | 'all';

// Coffee & Warm Yellow Hauz Palette for Charts
const CATEGORY_COLORS = [
  '#f59e0b', // Amber 500
  '#d97706', // Amber 600
  '#b45309', // Amber 700
  '#78350f', // Amber 900 / Espresso
  '#10b981', // Emerald 500 / Matcha
  '#6366f1', // Indigo 500
  '#ec4899', // Pink 500
  '#8b5cf6', // Violet 500
  '#14b8a6', // Teal 500
  '#f97316', // Orange 500
];

const PAYMENT_COLORS: Record<string, string> = {
  Cash: '#10b981', // Emerald
  GCash: '#0284c7', // Sky blue
  Maya: '#059669', // Mint
  Card: '#6366f1', // Indigo
  'Debit / Credit': '#6366f1',
  Other: '#78716c',
};

const ORDER_TYPE_COLORS: Record<string, string> = {
  'Dine-In': '#f59e0b', // Amber
  'Take-Out': '#0284c7', // Sky
  Delivery: '#8b5cf6', // Purple
};

const CHANNEL_COLORS: Record<string, string> = {
  'On-the-Place (In-Store)': '#f59e0b',
  'Online Storefront': '#6366f1',
};

type AnalyticsSection = 'all' | 'movement' | 'distribution' | 'trends';

export const SalesAnalytics: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [categories, setCategories] = useState<Category[]>(() => AppStore.getCategories());
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [analyticsSection, setAnalyticsSection] = useState<AnalyticsSection>('all');
  const [activePieTab, setActivePieTab] = useState<'category' | 'payment' | 'orderType' | 'channel'>('category');

  useEffect(() => {
    setOrders(AppStore.getOrders());
    setMenuItems(AppStore.getMenuItems());
    setCategories(AppStore.getCategories());
    const unsub = AppStore.subscribe(() => {
      setOrders(AppStore.getOrders());
      setMenuItems(AppStore.getMenuItems());
      setCategories(AppStore.getCategories());
    });
    return () => unsub();
  }, []);

  // Filter orders by status and date range
  const filteredCompletedOrders = useMemo(() => {
    const completed = orders.filter((o) => o.status === 'completed');
    if (timeRange === 'all') return completed;

    const now = new Date();
    return completed.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (timeRange === 'today') {
        return (
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      if (timeRange === '7days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (timeRange === '30days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      return true;
    });
  }, [orders, timeRange]);

  // Aggregate item sales
  const itemSales = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const order of filteredCompletedOrders) {
      for (const item of order.items) {
        const existing = map.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        map.set(item.name, existing);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredCompletedOrders]);

  // Total summary metrics
  const totalRevenue = useMemo(
    () => filteredCompletedOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [filteredCompletedOrders]
  );
  const avgOrderValue = useMemo(
    () => (filteredCompletedOrders.length ? totalRevenue / filteredCompletedOrders.length : 0),
    [filteredCompletedOrders, totalRevenue]
  );
  const totalItemsSold = useMemo(
    () => itemSales.reduce((sum, i) => sum + i.quantity, 0),
    [itemSales]
  );

  // 1. Pie Chart Data: Categories
  const categoryPieData = useMemo(() => {
    const catMap = new Map<string, number>();

    for (const order of filteredCompletedOrders) {
      for (const item of order.items) {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId || m.name === item.name);
        const cat = categories.find((c) => c.id === menuItem?.categoryId);
        const catName = cat?.name || 'Beverages';
        catMap.set(catName, (catMap.get(catName) || 0) + item.totalPrice);
      }
    }

    return Array.from(catMap.entries())
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        pct: totalRevenue > 0 ? ((value / totalRevenue) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCompletedOrders, menuItems, categories, totalRevenue]);

  // 2. Pie Chart Data: Payment Methods
  const paymentPieData = useMemo(() => {
    const pMap = new Map<string, { count: number; total: number }>();

    for (const order of filteredCompletedOrders) {
      let method = 'Cash';
      if (order.paymentMethod === 'gcash') method = 'GCash';
      else if (order.paymentMethod === 'card') method = 'Card';
      else if (order.paymentMethod === 'cash') method = 'Cash';
      else method = order.paymentMethod || 'Cash';

      const curr = pMap.get(method) || { count: 0, total: 0 };
      curr.count += 1;
      curr.total += order.totalAmount;
      pMap.set(method, curr);
    }

    return Array.from(pMap.entries()).map(([name, data]) => ({
      name,
      value: Math.round(data.total * 100) / 100,
      count: data.count,
      pct: totalRevenue > 0 ? ((data.total / totalRevenue) * 100).toFixed(1) : '0',
    }));
  }, [filteredCompletedOrders, totalRevenue]);

  // 3. Pie Chart Data: Order Type (Dine-in vs Take-out vs Delivery)
  const orderTypePieData = useMemo(() => {
    const oMap = new Map<string, { count: number; total: number }>();

    for (const order of filteredCompletedOrders) {
      let typeLabel = 'Dine-In';
      if (order.orderType === 'take_away') typeLabel = 'Take-Out';
      else if (order.orderType === 'delivery') typeLabel = 'Delivery';

      const curr = oMap.get(typeLabel) || { count: 0, total: 0 };
      curr.count += 1;
      curr.total += order.totalAmount;
      oMap.set(typeLabel, curr);
    }

    return Array.from(oMap.entries()).map(([name, data]) => ({
      name,
      value: Math.round(data.total * 100) / 100,
      count: data.count,
      pct: totalRevenue > 0 ? ((data.total / totalRevenue) * 100).toFixed(1) : '0',
    }));
  }, [filteredCompletedOrders, totalRevenue]);

  // 4. Pie Chart Data: Channel (In-Store vs Online)
  const channelPieData = useMemo(() => {
    const cMap = new Map<string, { count: number; total: number }>();

    for (const order of filteredCompletedOrders) {
      const isOnline = AppStore.getOrderChannel(order) === 'online';
      const chName = isOnline ? 'Online Storefront' : 'On-the-Place (In-Store)';

      const curr = cMap.get(chName) || { count: 0, total: 0 };
      curr.count += 1;
      curr.total += order.totalAmount;
      cMap.set(chName, curr);
    }

    return Array.from(cMap.entries()).map(([name, data]) => ({
      name,
      value: Math.round(data.total * 100) / 100,
      count: data.count,
      pct: totalRevenue > 0 ? ((data.total / totalRevenue) * 100).toFixed(1) : '0',
    }));
  }, [filteredCompletedOrders, totalRevenue]);

  // 5. Hourly & Daily Sales Trend Data
  const trendData = useMemo(() => {
    // Generate 24-hour slots
    const hourMap = new Map<number, { hourLabel: string; revenue: number; orders: number }>();
    for (let h = 7; h <= 22; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      hourMap.set(h, {
        hourLabel: `${displayHour} ${ampm}`,
        revenue: 0,
        orders: 0,
      });
    }

    for (const order of filteredCompletedOrders) {
      const d = new Date(order.createdAt);
      const h = d.getHours();
      if (hourMap.has(h)) {
        const item = hourMap.get(h)!;
        item.revenue += order.totalAmount;
        item.orders += 1;
      }
    }

    return Array.from(hourMap.values());
  }, [filteredCompletedOrders]);

  // 6. Top 6 Products Bar Data
  const topProductsBarData = useMemo(() => {
    return itemSales.slice(0, 6).map((item) => ({
      name: item.name.length > 15 ? item.name.slice(0, 14) + '…' : item.name,
      fullName: item.name,
      revenue: item.revenue,
      quantity: item.quantity,
    }));
  }, [itemSales]);

  // Channel breakdown metrics
  const inStoreOrders = filteredCompletedOrders.filter(
    (o) => AppStore.getOrderChannel(o) === 'in_store'
  );
  const onlineOrders = filteredCompletedOrders.filter(
    (o) => AppStore.getOrderChannel(o) === 'online'
  );
  const inStoreRevenue = inStoreOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const onlineRevenue = onlineOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const inStorePct = totalRevenue > 0 ? Math.round((inStoreRevenue / totalRevenue) * 100) : 0;
  const onlinePct = totalRevenue > 0 ? Math.round((onlineRevenue / totalRevenue) * 100) : 0;

  // Custom Chart Tooltips
  const CustomCurrencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-xl border border-stone-200 bg-stone-900 px-3.5 py-2.5 text-white shadow-xl text-xs">
          <p className="font-bold text-amber-400 mb-0.5">{data.name || label}</p>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-stone-300">Revenue:</span>
            <span className="font-extrabold text-amber-300">₱{Number(data.value).toFixed(2)}</span>
          </div>
          {data.payload?.pct && (
            <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400 mt-0.5">
              <span>Share:</span>
              <span className="font-bold">{data.payload.pct}%</span>
            </div>
          )}
          {data.payload?.count !== undefined && (
            <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400 mt-0.5">
              <span>Orders:</span>
              <span className="font-bold">{data.payload.count}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-stone-200 bg-stone-900 px-3.5 py-2.5 text-white shadow-xl text-xs">
          <p className="font-bold text-amber-400 mb-1">{data.fullName || label}</p>
          <div className="flex items-center justify-between gap-4 font-mono text-xs">
            <span className="text-stone-300">Total Sales:</span>
            <span className="font-bold text-amber-300">₱{Number(data.revenue).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400 mt-0.5">
            <span>Units Sold:</span>
            <span className="font-bold text-stone-200">{data.quantity} cups/plates</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-stone-200 bg-stone-900 px-3.5 py-2.5 text-white shadow-xl text-xs">
          <p className="font-bold text-amber-400 mb-0.5">{label}</p>
          <div className="flex items-center justify-between gap-4 font-mono text-xs">
            <span className="text-stone-300">Revenue:</span>
            <span className="font-extrabold text-amber-300">
              ₱{Number(payload[0].value).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400 mt-0.5">
            <span>Orders:</span>
            <span className="font-bold text-stone-200">{payload[0].payload.orders}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header with Time Range Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Executive Insights &amp; Visual Intelligence
          </span>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            Sales &amp; Channel Analytics
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Visual breakdown of revenue, category shares, payment methods, and sales trends.
          </p>
        </div>

        {/* Time Range Filter Pills */}
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 border border-stone-200 shadow-2xs">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: 'all', label: 'All Time' },
            ] as { id: TimeRange; label: string }[]
          ).map((range) => (
            <button
              key={range.id}
              type="button"
              onClick={() => setTimeRange(range.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                timeRange === range.id
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
            <span>Settled Revenue</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-stone-900 font-mono">
            ₱{totalRevenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Across {filteredCompletedOrders.length} completed transactions
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
            <span>Average Order Value (AOV)</span>
            <SparklesIcon className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-stone-900 font-mono">
            ₱{avgOrderValue.toFixed(2)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Per completed order</p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
            <span>Total Units Sold</span>
            <ShoppingBag className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-extrabold text-stone-900 font-mono">
            {totalItemsSold} Units
          </div>
          <p className="text-[11px] text-stone-500 mt-1">Across all categories</p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold uppercase">
            <span>Top Seller</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 font-display text-lg font-bold text-amber-900 line-clamp-1">
            {itemSales[0]?.name || 'N/A'}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            ₱{(itemSales[0]?.revenue || 0).toFixed(2)} ({itemSales[0]?.quantity || 0} sold)
          </p>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-2">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-stone-100 p-1.5 border border-stone-200">
          <button
            type="button"
            onClick={() => setAnalyticsSection('all')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
              analyticsSection === 'all'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Complete Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setAnalyticsSection('movement')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
              analyticsSection === 'movement'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-amber-900 hover:bg-amber-100/60'
            }`}
          >
            <Flame className="h-3.5 w-3.5 fill-amber-600 text-amber-600" />
            <span>Fast &amp; Slow Moving Products</span>
            <span className="rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[10px] font-black text-amber-950">
              New
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAnalyticsSection('distribution')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
              analyticsSection === 'distribution'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <LucidePieChart className="h-3.5 w-3.5" />
            <span>Category &amp; Payment Shares</span>
          </button>

          <button
            type="button"
            onClick={() => setAnalyticsSection('trends')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
              analyticsSection === 'trends'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Hourly Trends &amp; Channels</span>
          </button>
        </div>

        <div className="text-xs text-stone-500 hidden sm:block">
          Showing data for: <strong className="text-stone-800 capitalize">{timeRange === 'all' ? 'All Time' : timeRange}</strong>
        </div>
      </div>

      {/* FAST & SLOW MOVING PRODUCTS VELOCITY INTELLIGENCE */}
      {(analyticsSection === 'all' || analyticsSection === 'movement') && (
        <ProductMovementVelocity
          orders={filteredCompletedOrders}
          menuItems={menuItems}
          categories={categories}
          timeRange={timeRange}
        />
      )}

      {/* PRIMARY SECTION: Interactive Pie & Donut Charts */}
      {(analyticsSection === 'all' || analyticsSection === 'distribution') && (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
              <LucidePieChart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-stone-900">
                Distribution &amp; Share Breakdown
              </h3>
              <p className="text-xs text-stone-500">
                Interactive pie analysis by category, payment method, order type, and channel
              </p>
            </div>
          </div>

          {/* Pie Chart View Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-stone-100 p-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setActivePieTab('category')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activePieTab === 'category'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => setActivePieTab('payment')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activePieTab === 'payment'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Payment Methods
            </button>
            <button
              type="button"
              onClick={() => setActivePieTab('orderType')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activePieTab === 'orderType'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Dine-In vs Take-Out
            </button>
            <button
              type="button"
              onClick={() => setActivePieTab('channel')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                activePieTab === 'channel'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Channel Share
            </button>
          </div>
        </div>

        {/* Dynamic Pie Display */}
        <div className="grid gap-6 lg:grid-cols-12 items-center">
          {/* Chart Canvas */}
          <div className="lg:col-span-7 h-72 sm:h-80 w-full flex items-center justify-center">
            {totalRevenue === 0 ? (
              <div className="text-center text-stone-400 py-8">
                <LucidePieChart className="h-10 w-10 mx-auto text-stone-300 mb-2 opacity-60" />
                <p className="font-bold text-sm text-stone-600">No settled transactions found</p>
                <p className="text-xs text-stone-400">Complete POS or Online orders to see distribution</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomCurrencyTooltip />} />
                  <Pie
                    data={
                      activePieTab === 'category'
                        ? categoryPieData
                        : activePieTab === 'payment'
                        ? paymentPieData
                        : activePieTab === 'orderType'
                        ? orderTypePieData
                        : channelPieData
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={activePieTab === 'channel' ? 60 : 50}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(activePieTab === 'category'
                      ? categoryPieData
                      : activePieTab === 'payment'
                      ? paymentPieData
                      : activePieTab === 'orderType'
                      ? orderTypePieData
                      : channelPieData
                    ).map((entry, index) => {
                      let fill = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                      if (activePieTab === 'payment') {
                        fill = PAYMENT_COLORS[entry.name] || fill;
                      } else if (activePieTab === 'orderType') {
                        fill = ORDER_TYPE_COLORS[entry.name] || fill;
                      } else if (activePieTab === 'channel') {
                        fill = CHANNEL_COLORS[entry.name] || fill;
                      }
                      return <Cell key={`cell-${index}`} fill={fill} stroke="#ffffff" strokeWidth={2} />;
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Slices Legend & Ranked Breakdown */}
          <div className="lg:col-span-5 space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {(activePieTab === 'category'
              ? categoryPieData
              : activePieTab === 'payment'
              ? paymentPieData
              : activePieTab === 'orderType'
              ? orderTypePieData
              : channelPieData
            ).map((item, idx) => {
              let fill = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              if (activePieTab === 'payment') fill = PAYMENT_COLORS[item.name] || fill;
              else if (activePieTab === 'orderType') fill = ORDER_TYPE_COLORS[item.name] || fill;
              else if (activePieTab === 'channel') fill = CHANNEL_COLORS[item.name] || fill;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/70 p-2.5 hover:bg-stone-100/80 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: fill }}
                    />
                    <span className="font-bold text-xs text-stone-800 truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                    <span className="font-extrabold text-stone-900">₱{item.value.toFixed(2)}</span>
                    <span className="rounded-md bg-stone-200/70 px-1.5 py-0.5 text-[10px] font-bold text-stone-700">
                      {item.pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* SECONDARY GRIDS: Revenue Trend & Top Sellers */}
      {(analyticsSection === 'all' || analyticsSection === 'trends') && (
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hourly Sales Trend Area Chart */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-stone-900">
                  Hourly Sales Velocity
                </h3>
                <p className="text-xs text-stone-500">Peak dining &amp; beverage rush hours (7 AM - 10 PM)</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="hourLabel"
                  tick={{ fontSize: 10, fill: '#78716c' }}
                  interval={2}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₱${val}`}
                />
                <Tooltip content={<CustomTrendTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#amberGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Products Bar Chart */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-stone-900">
                  Top Selling Products (Revenue)
                </h3>
                <p className="text-xs text-stone-500">Highest grossing items in current timeframe</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            {topProductsBarData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-stone-400">
                <p className="text-xs">No items sold yet in this period</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProductsBarData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#78716c' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₱${val}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#44403c', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={85}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="revenue" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Channel Comparison Cards */}
      {(analyticsSection === 'all' || analyticsSection === 'trends') && (
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="font-display text-base font-bold text-stone-900">
              Channel Performance: POS On-the-Place vs Online Storefront
            </h3>
            <p className="text-xs text-stone-500">
              Direct comparison between in-store dine-in/counter registers and customer web orders
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-stone-400 font-medium">Filtered Settled Revenue</span>
            <div className="font-mono text-base font-extrabold text-amber-900">
              ₱{totalRevenue.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* On-the-Place card */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold">
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">On-the-Place (In-Store)</h4>
                  <span className="text-[11px] text-stone-500">Dine-in tables &amp; POS walk-in</span>
                </div>
              </div>
              <span className="font-mono text-lg font-extrabold text-amber-950">
                ₱{inStoreRevenue.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-stone-600">
                <span>{inStoreOrders.length} Orders</span>
                <span>{inStorePct}% of Total</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-amber-200/60">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${inStorePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Online card */}
          <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white font-bold">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">Online Storefront</h4>
                  <span className="text-[11px] text-stone-500">Customer web orders</span>
                </div>
              </div>
              <span className="font-mono text-lg font-extrabold text-indigo-950">
                ₱{onlineRevenue.toFixed(2)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-stone-600">
                <span>{onlineOrders.length} Orders</span>
                <span>{onlinePct}% of Total</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-indigo-200/60">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${onlinePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

