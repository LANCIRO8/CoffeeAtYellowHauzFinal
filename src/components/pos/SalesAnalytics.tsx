import React, { useState, useMemo, useEffect } from 'react';
import { AppStore } from '../../services/store';
import { Order, MenuItem, Category } from '../../types';
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
  ChevronDown,
  ChevronUp,
  Zap,
  CircleDot,
  Disc,
  DollarSign,
  Package,
  Crown,
  Sparkles,
  Percent,
  Flame,
  Turtle,
  SlidersHorizontal,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  X,
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

type TimeRange = 'today' | '7days' | '30days' | 'custom' | 'all';

// Coffee & Warm Yellow Hauz Palette for Category Charts
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
  '#06b6d4', // Cyan 500
  '#84cc16', // Lime 500
];

// Vibrant high-contrast palette for Best Sellers Chart
const BEST_SELLER_COLORS = [
  '#f59e0b', // #1 Gold / Amber
  '#0284c7', // #2 Sky Blue
  '#10b981', // #3 Emerald
  '#8b5cf6', // #4 Purple
  '#ec4899', // #5 Pink
  '#f97316', // #6 Orange
  '#14b8a6', // #7 Teal
  '#6366f1', // #8 Indigo
  '#94a3b8', // #9 Slate / Others
];

type AnalyticsSection = 'all' | 'movement' | 'distribution' | 'trends';
type ChartType = 'donut' | 'pie';
type MetricType = 'revenue' | 'quantity';

const sectionLabels: Record<AnalyticsSection, string> = {
  all: 'Complete Dashboard',
  movement: 'Fast & Slow Moving',
  distribution: 'Pie & Donut Charts',
  trends: 'Hourly Trends',
};

const timeRangeLabels: Record<TimeRange, string> = {
  today: 'Today',
  '7days': '7 Days',
  '30days': '30 Days',
  custom: 'Custom Range',
  all: 'All Time',
};

const SECTION_OPTIONS = [
  {
    id: 'all' as AnalyticsSection,
    label: 'Complete Dashboard',
    description: 'View all metrics, breakdown charts, and movement data',
    icon: Layers,
  },
  {
    id: 'movement' as AnalyticsSection,
    label: 'Fast & Slow Moving',
    description: 'Top velocity and underperforming menu items',
    icon: Flame,
    badge: 'Popular',
  },
  {
    id: 'distribution' as AnalyticsSection,
    label: 'Pie & Donut Charts',
    description: 'Category revenue and top-sellers distribution',
    icon: LucidePieChart,
  },
  {
    id: 'trends' as AnalyticsSection,
    label: 'Hourly Trends',
    description: 'Peak dining hours and ordering volume curve',
    icon: TrendingUp,
  },
];

const TIME_RANGE_OPTIONS: { id: TimeRange; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7days', label: '7 Days' },
  { id: '30days', label: '30 Days' },
  { id: 'custom', label: 'Custom' },
  { id: 'all', label: 'All Time' },
];

export const SalesAnalytics: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [categories, setCategories] = useState<Category[]>(() => AppStore.getCategories());
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [customStartDate, setCustomStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [analyticsSection, setAnalyticsSection] = useState<AnalyticsSection>('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  
  // Interactive chart controls
  const [chartShape, setChartShape] = useState<ChartType>('donut');
  const [categoryMetric, setCategoryMetric] = useState<MetricType>('revenue');
  const [bestSellerMetric, setBestSellerMetric] = useState<MetricType>('revenue');
  const [bestSellerTopCount, setBestSellerTopCount] = useState<number>(6);

  // Fast & Slow Moving Items Controls (Independent per chart)
  const [fastMetric, setFastMetric] = useState<MetricType>('quantity');
  const [fastLimit, setFastLimit] = useState<number>(5);
  const [fastCategoryFilter, setFastCategoryFilter] = useState<string>('all');

  const [slowMetric, setSlowMetric] = useState<MetricType>('quantity');
  const [slowLimit, setSlowLimit] = useState<number>(5);
  const [slowCategoryFilter, setSlowCategoryFilter] = useState<string>('all');

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
      if (timeRange === 'custom') {
        const orderTime = orderDate.getTime();
        const start = new Date(`${customStartDate}T00:00:00`).getTime();
        const end = new Date(`${customEndDate}T23:59:59.999`).getTime();
        return orderTime >= start && orderTime <= end;
      }
      return true;
    });
  }, [orders, timeRange, customStartDate, customEndDate]);

  // Aggregate item sales
  const itemSales = useMemo(() => {
    const map = new Map<string, { menuItemId?: number; name: string; quantity: number; revenue: number; categoryName: string }>();

    for (const order of filteredCompletedOrders) {
      for (const item of order.items) {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId || m.name === item.name);
        const cat = categories.find((c) => c.id === menuItem?.categoryId);
        const catName = cat?.name || 'Beverages';

        const existing = map.get(item.name) || {
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: 0,
          revenue: 0,
          categoryName: catName,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        map.set(item.name, existing);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredCompletedOrders, menuItems, categories]);

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

  // 1. Pie Chart Data: Categories (Revenue & Quantity Share)
  const categoryPieData = useMemo(() => {
    const catMap = new Map<string, { revenue: number; quantity: number; itemCount: number }>();

    for (const order of filteredCompletedOrders) {
      for (const item of order.items) {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId || m.name === item.name);
        const cat = categories.find((c) => c.id === menuItem?.categoryId);
        const catName = cat?.name || 'Beverages';
        
        const curr = catMap.get(catName) || { revenue: 0, quantity: 0, itemCount: 0 };
        curr.revenue += item.totalPrice;
        curr.quantity += item.quantity;
        curr.itemCount += 1;
        catMap.set(catName, curr);
      }
    }

    const totalMetricValue = categoryMetric === 'revenue' ? totalRevenue : totalItemsSold;

    return Array.from(catMap.entries())
      .map(([name, data]) => {
        const val = categoryMetric === 'revenue' ? data.revenue : data.quantity;
        return {
          name,
          value: categoryMetric === 'revenue' ? Math.round(val * 100) / 100 : val,
          revenue: data.revenue,
          quantity: data.quantity,
          pct: totalMetricValue > 0 ? ((val / totalMetricValue) * 100).toFixed(1) : '0',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredCompletedOrders, menuItems, categories, totalRevenue, totalItemsSold, categoryMetric]);

  // 2. Pie Chart Data: Best Sellers Share
  const bestSellersPieData = useMemo(() => {
    if (itemSales.length === 0) return [];

    const sortedByMetric = [...itemSales].sort((a, b) =>
      bestSellerMetric === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity
    );

    const topItems = sortedByMetric.slice(0, bestSellerTopCount);
    const otherItems = sortedByMetric.slice(bestSellerTopCount);

    const totalMetricValue = bestSellerMetric === 'revenue' ? totalRevenue : totalItemsSold;

    const dataList = topItems.map((item, idx) => {
      const val = bestSellerMetric === 'revenue' ? item.revenue : item.quantity;
      return {
        name: item.name,
        fullName: item.name,
        categoryName: item.categoryName,
        value: bestSellerMetric === 'revenue' ? Math.round(val * 100) / 100 : val,
        revenue: item.revenue,
        quantity: item.quantity,
        rank: idx + 1,
        pct: totalMetricValue > 0 ? ((val / totalMetricValue) * 100).toFixed(1) : '0',
        color: BEST_SELLER_COLORS[idx % BEST_SELLER_COLORS.length],
        isOther: false,
      };
    });

    if (otherItems.length > 0) {
      const othersRevenue = otherItems.reduce((sum, i) => sum + i.revenue, 0);
      const othersQuantity = otherItems.reduce((sum, i) => sum + i.quantity, 0);
      const othersVal = bestSellerMetric === 'revenue' ? othersRevenue : othersQuantity;

      dataList.push({
        name: `Other (${otherItems.length} items)`,
        fullName: `All Other ${otherItems.length} Products Combined`,
        categoryName: 'Various Categories',
        value: bestSellerMetric === 'revenue' ? Math.round(othersVal * 100) / 100 : othersVal,
        revenue: othersRevenue,
        quantity: othersQuantity,
        rank: 999,
        pct: totalMetricValue > 0 ? ((othersVal / totalMetricValue) * 100).toFixed(1) : '0',
        color: '#94a3b8',
        isOther: true,
      });
    }

    return dataList;
  }, [itemSales, bestSellerMetric, bestSellerTopCount, totalRevenue, totalItemsSold]);

  // 3. Hourly & Daily Sales Trend Data
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

  // 4. Movement Timeframe Days
  const movementTimeframeDays = useMemo(() => {
    switch (timeRange) {
      case 'today':
        return 1;
      case '7days':
        return 7;
      case '30days':
        return 30;
      case 'custom': {
        const start = new Date(`${customStartDate}T00:00:00`).getTime();
        const end = new Date(`${customEndDate}T23:59:59.999`).getTime();
        return Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)));
      }
      case 'all':
      default:
        return 30;
    }
  }, [timeRange, customStartDate, customEndDate]);

  // 5. Aggregated Movement for all Menu Items (Fast vs Slow Velocity)
  const allMovementItems = useMemo(() => {
    const salesMap = new Map<
      number | string,
      { unitsSold: number; revenue: number; orderCount: number; lastSoldDate: string | null }
    >();

    for (const order of filteredCompletedOrders) {
      for (const item of order.items) {
        const key = item.menuItemId || item.name;
        const curr = salesMap.get(key) || {
          unitsSold: 0,
          revenue: 0,
          orderCount: 0,
          lastSoldDate: null,
        };
        curr.unitsSold += item.quantity;
        curr.revenue += item.totalPrice;
        curr.orderCount += 1;
        if (!curr.lastSoldDate || new Date(order.createdAt) > new Date(curr.lastSoldDate)) {
          curr.lastSoldDate = order.createdAt;
        }
        salesMap.set(key, curr);
      }
    }

    return menuItems.map((menuItem) => {
      const cat = categories.find((c) => c.id === menuItem.categoryId);
      const categoryName = cat ? cat.name : 'Other';
      const sale = salesMap.get(menuItem.id) || salesMap.get(menuItem.name) || {
        unitsSold: 0,
        revenue: 0,
        orderCount: 0,
        lastSoldDate: null,
      };

      const velocity = Math.round((sale.unitsSold / movementTimeframeDays) * 10) / 10;
      const stock = menuItem.quantity || 0;
      const daysOfStockLeft = velocity > 0 ? Math.round(stock / velocity) : null;
      const pctOfTotalUnits = totalItemsSold > 0 ? (sale.unitsSold / totalItemsSold) * 100 : 0;
      const pctOfTotalRevenue = totalRevenue > 0 ? (sale.revenue / totalRevenue) * 100 : 0;

      let movementType: 'fast' | 'steady' | 'slow' | 'dormant' = 'steady';
      if (sale.unitsSold === 0) {
        movementType = 'dormant';
      } else if (sale.unitsSold >= (timeRange === 'today' ? 3 : timeRange === '7days' ? 6 : 10)) {
        movementType = 'fast';
      } else if (sale.unitsSold <= (timeRange === 'today' ? 1 : timeRange === '7days' ? 2 : 3)) {
        movementType = 'slow';
      }

      let stockAlert: 'low_stock' | 'overstock' | 'healthy' = 'healthy';
      if (movementType === 'fast' && (stock <= 5 || (daysOfStockLeft !== null && daysOfStockLeft <= 3))) {
        stockAlert = 'low_stock';
      } else if ((movementType === 'slow' || movementType === 'dormant') && stock >= 15) {
        stockAlert = 'overstock';
      }

      return {
        id: menuItem.id,
        name: menuItem.name,
        shortName: menuItem.name.length > 15 ? menuItem.name.slice(0, 14) + '…' : menuItem.name,
        categoryName,
        categoryId: menuItem.categoryId,
        price: menuItem.price,
        stock,
        unitsSold: sale.unitsSold,
        revenue: sale.revenue,
        orderCount: sale.orderCount,
        lastSoldDate: sale.lastSoldDate,
        velocity,
        daysOfStockLeft,
        pctOfTotalUnits: Number(pctOfTotalUnits.toFixed(1)),
        pctOfTotalRevenue: Number(pctOfTotalRevenue.toFixed(1)),
        movementType,
        stockAlert,
      };
    });
  }, [menuItems, categories, filteredCompletedOrders, movementTimeframeDays, totalItemsSold, totalRevenue, timeRange]);

  // Fast Moving Items (Filtered and sorted by fast controls)
  const fastMovingItems = useMemo(() => {
    let items = allMovementItems;
    if (fastCategoryFilter !== 'all') {
      items = items.filter(
        (i) => i.categoryName === fastCategoryFilter || String(i.categoryId) === fastCategoryFilter
      );
    }
    const sorted = [...items]
      .filter((i) => i.unitsSold > 0)
      .sort((a, b) => {
        if (fastMetric === 'revenue') return b.revenue - a.revenue;
        return b.unitsSold - a.unitsSold;
      });
    return sorted.slice(0, fastLimit);
  }, [allMovementItems, fastCategoryFilter, fastMetric, fastLimit]);

  // Slow Moving Items (Filtered and sorted by slow controls, including 0 sales)
  const slowMovingItems = useMemo(() => {
    let items = allMovementItems;
    if (slowCategoryFilter !== 'all') {
      items = items.filter(
        (i) => i.categoryName === slowCategoryFilter || String(i.categoryId) === slowCategoryFilter
      );
    }
    const sorted = [...items].sort((a, b) => {
      if (slowMetric === 'revenue') {
        if (a.revenue !== b.revenue) return a.revenue - b.revenue;
        return a.unitsSold - b.unitsSold;
      }
      if (a.unitsSold !== b.unitsSold) return a.unitsSold - b.unitsSold;
      return a.revenue - b.revenue;
    });
    return sorted.slice(0, slowLimit);
  }, [allMovementItems, slowCategoryFilter, slowMetric, slowLimit]);

  // 7. Top 6 Products Bar Data
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
  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-2xl border border-stone-700 bg-stone-900/95 backdrop-blur-md px-4 py-3 text-white shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-1.5">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: payload[0].color || '#f59e0b' }}
            />
            <p className="font-extrabold text-amber-400 text-sm truncate">{data.name}</p>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-stone-400">Total Revenue:</span>
            <span className="font-extrabold text-amber-300">₱{Number(data.revenue || data.value || 0).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
            <span className="text-stone-400">Units Sold:</span>
            <span className="font-bold text-stone-200">{data.quantity || 0} units</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400 pt-1 border-t border-stone-800/80">
            <span>Sales Share:</span>
            <span className="font-extrabold text-emerald-400 text-xs">{data.pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBestSellerTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-2xl border border-stone-700 bg-stone-900/95 backdrop-blur-md px-4 py-3 text-white shadow-2xl text-xs space-y-1.5 min-w-[220px]">
          <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: data.color || '#f59e0b' }}
              />
              <p className="font-extrabold text-amber-400 text-sm truncate">{data.fullName || data.name}</p>
            </div>
            {data.rank && data.rank <= 3 && (
              <span className="rounded-full bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-black shrink-0">
                #{data.rank} Top
              </span>
            )}
          </div>
          <div className="text-[11px] text-stone-400 font-medium">
            Category: <span className="text-stone-200">{data.categoryName || 'Beverages'}</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-stone-400">Gross Sales:</span>
            <span className="font-extrabold text-amber-300">₱{Number(data.revenue).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
            <span className="text-stone-400">Total Volume:</span>
            <span className="font-bold text-stone-200">{data.quantity} cups/orders</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400 pt-1 border-t border-stone-800/80">
            <span>Share of Sales:</span>
            <span className="font-extrabold text-emerald-400 text-xs">{data.pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomCurrencyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="rounded-2xl border border-stone-700 bg-stone-900/95 px-3.5 py-2.5 text-white shadow-xl text-xs space-y-1">
          <p className="font-bold text-amber-400">{data.name || label}</p>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-stone-400">Revenue:</span>
            <span className="font-extrabold text-amber-300">₱{Number(data.value).toFixed(2)}</span>
          </div>
          {data.payload?.pct && (
            <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400">
              <span>Share:</span>
              <span className="font-bold text-emerald-400">{data.payload.pct}%</span>
            </div>
          )}
          {data.payload?.count !== undefined && (
            <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400">
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
        <div className="rounded-2xl border border-stone-700 bg-stone-900/95 px-3.5 py-2.5 text-white shadow-xl text-xs space-y-1">
          <p className="font-bold text-amber-400">{data.fullName || label}</p>
          <div className="flex items-center justify-between gap-4 font-mono text-xs">
            <span className="text-stone-400">Total Sales:</span>
            <span className="font-bold text-amber-300">₱{Number(data.revenue).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400">
            <span>Units Sold:</span>
            <span className="font-bold text-stone-200">{data.quantity} units</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomMovementTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-2xl border border-stone-700 bg-stone-900/95 px-4 py-3 text-white shadow-xl text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between gap-2 border-b border-stone-700 pb-1.5">
            <span className="font-bold text-amber-400 truncate">{data.name}</span>
            <span className="rounded-md bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-300">
              {data.categoryName}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-stone-400">Total Revenue:</span>
            <span className="font-bold text-amber-300">₱{Number(data.revenue).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 font-mono">
            <span className="text-stone-400">Units Sold:</span>
            <span className="font-bold text-stone-100">{data.unitsSold} units</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-400">Daily Velocity:</span>
            <span className="font-bold text-emerald-400">{data.velocity} / day</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-stone-800">
            <span className="text-stone-400">Current Stock:</span>
            <span className={`font-bold ${data.stock <= 5 ? 'text-rose-400' : 'text-stone-200'}`}>
              {data.stock} units
            </span>
          </div>
          {data.daysOfStockLeft !== null && (
            <div className="flex items-center justify-between gap-4 text-[10px] text-stone-400">
              <span>Est. Supply:</span>
              <span className="font-semibold text-stone-300">{data.daysOfStockLeft} days</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-2xl border border-stone-700 bg-stone-900/95 px-3.5 py-2.5 text-white shadow-xl text-xs space-y-1">
          <p className="font-bold text-amber-400">{label}</p>
          <div className="flex items-center justify-between gap-4 font-mono text-xs">
            <span className="text-stone-400">Revenue:</span>
            <span className="font-extrabold text-amber-300">
              ₱{Number(payload[0].value).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-[11px] text-stone-400">
            <span>Orders:</span>
            <span className="font-bold text-stone-200">{payload[0].payload.orders}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16">
      {/* Header with Title and Single "Section & Time Filter" Modal Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-stone-200 pb-3.5 sm:pb-5">
        <div>
          <h2 className="font-display text-lg sm:text-2xl font-extrabold text-stone-900 flex items-center gap-2 sm:gap-2.5">
            <LucidePieChart className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
            <span>Analytics</span>
          </h2>
        </div>

        {/* Single Button Modal Trigger for Section View & Time Filter */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            id="btn-analytics-filter-modal"
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-stone-200 shadow-2xs hover:border-amber-400 hover:bg-stone-50 transition-all cursor-pointer group"
          >
            <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-800 group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
              <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-stone-600">Filters &amp; View</span>
              <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-black text-stone-900">
                <span>{timeRangeLabels[timeRange]}</span>
                <span className="text-stone-300">•</span>
                <span className="text-amber-800">{sectionLabels[analyticsSection]}</span>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-400 ml-1 group-hover:text-stone-700 transition-colors" />
          </button>
        </div>
      </div>

      {/* Combined Section View & Time Filter Modal */}
      {isFilterModalOpen && (
        <div
          id="modal-analytics-filters"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-stone-200 flex flex-col space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-amber-500/15 text-amber-800">
                  <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-stone-900">Data View &amp; Time Filters</h3>
                  <p className="text-[10px] sm:text-xs text-stone-500">Configure dashboard display and time range</p>
                </div>
              </div>
              <button
                id="btn-close-analytics-filter-modal"
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Section View Selector */}
            <div className="space-y-2 sm:space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-600" />
                  <span>Section View</span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                  {sectionLabels[analyticsSection]}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SECTION_OPTIONS.map((opt) => {
                  const isSelected = analyticsSection === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnalyticsSection(opt.id)}
                      className={`flex items-start gap-2.5 sm:gap-3 rounded-2xl p-2.5 sm:p-3 text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/80 text-stone-950 shadow-2xs'
                          : 'border-stone-200 bg-stone-50/50 hover:bg-stone-100/70 text-stone-700'
                      }`}
                    >
                      <div
                        className={`mt-0.5 grid h-6 w-6 sm:h-7 sm:w-7 shrink-0 place-items-center rounded-xl ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 font-bold'
                            : 'bg-stone-200/80 text-stone-600'
                        }`}
                      >
                        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] sm:text-xs font-extrabold text-stone-900 truncate">
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black text-emerald-800 shrink-0">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-stone-500 leading-tight mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Filter Selector */}
            <div className="space-y-2 sm:space-y-2.5 pt-2.5 sm:pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-600" />
                  <span>Time Filter</span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                  {timeRangeLabels[timeRange]}
                </span>
              </div>

              {/* Time Range Pills */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {TIME_RANGE_OPTIONS.map((range) => {
                  const isSelected = timeRange === range.id;
                  return (
                    <button
                      key={range.id}
                      type="button"
                      onClick={() => setTimeRange(range.id)}
                      className={`rounded-xl py-1.5 sm:py-2 px-1.5 sm:px-2 text-center text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
                      }`}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Date Pickers when custom is active */}
              {timeRange === 'custom' && (
                <div className="rounded-2xl bg-amber-50/50 p-2.5 sm:p-3 border border-amber-200 space-y-2 mt-2">
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 block">
                    Custom Date Range
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[9px] sm:text-[10px] font-bold text-stone-500 block mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        max={customEndDate || todayStr}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-stone-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] sm:text-[10px] font-bold text-stone-500 block mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        min={customStartDate}
                        max={todayStr}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] sm:text-xs font-semibold text-stone-800 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-stone-100 pt-3">
              <div className="text-[10px] sm:text-[11px] text-stone-400">
                Active:{' '}
                <span className="font-bold text-stone-700">
                  {sectionLabels[analyticsSection]}
                </span>{' '}
                ({timeRangeLabels[timeRange]})
              </div>
              <button
                id="btn-apply-analytics-filter"
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-xl bg-stone-900 px-4 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold text-white hover:bg-stone-800 transition-colors shadow-xs cursor-pointer"
              >
                Apply &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL PIE & DONUT CHARTS SHOWCASE: Category Share & Best Sellers Share */}
      {(analyticsSection === 'all' || analyticsSection === 'distribution') && (
        <div className="space-y-6">
          {/* Main Dual Donut / Pie Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* CHART 1: Category Sales Share (Donut / Pie Chart) */}
            <div className="rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs flex flex-col justify-between space-y-3.5 sm:space-y-5">
              <div>
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-stone-100 pb-3 sm:pb-4">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-700">
                      <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xs sm:text-base font-extrabold text-stone-900 flex items-center gap-1 sm:gap-1.5">
                        <span>Category Sales Share</span>
                      </h3>
                      <p className="text-[10px] sm:text-xs text-stone-500">
                        {categoryMetric === 'revenue' ? 'Revenue distribution' : 'Unit volume share'} by menu category
                      </p>
                    </div>
                  </div>

                  {/* Chart Customizer (Metric & Donut/Pie Toggles) */}
                  <div className="flex items-center gap-1 sm:gap-1.5 self-start sm:self-auto">
                    {/* Metric Toggle */}
                    <div className="flex items-center gap-0.5 rounded-xl bg-stone-100 p-0.5 border border-stone-200 text-[10px] sm:text-[11px]">
                      <button
                        type="button"
                        onClick={() => setCategoryMetric('revenue')}
                        className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                          categoryMetric === 'revenue'
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                        title="View share by Gross Revenue (₱)"
                      >
                        ₱ Sales
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryMetric('quantity')}
                        className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                          categoryMetric === 'quantity'
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                        title="View share by Volume (Units Sold)"
                      >
                        Qty Units
                      </button>
                    </div>

                    {/* Donut vs Pie Toggle */}
                    <div className="flex items-center gap-0.5 rounded-xl bg-stone-100 p-0.5 border border-stone-200 text-[10px] sm:text-[11px]">
                      <button
                        type="button"
                        onClick={() => setChartShape('donut')}
                        className={`p-1 rounded-lg transition-all cursor-pointer ${
                          chartShape === 'donut'
                            ? 'bg-white text-amber-700 shadow-2xs'
                            : 'text-stone-400 hover:text-stone-700'
                        }`}
                        title="Donut Chart View"
                      >
                        <Disc className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartShape('pie')}
                        className={`p-1 rounded-lg transition-all cursor-pointer ${
                          chartShape === 'pie'
                            ? 'bg-white text-amber-700 shadow-2xs'
                            : 'text-stone-400 hover:text-stone-700'
                        }`}
                        title="Solid Pie Chart View"
                      >
                        <CircleDot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chart Graphic + Center Callout */}
                <div className="relative h-60 sm:h-72 w-full flex items-center justify-center my-2 sm:my-3">
                  {categoryPieData.length === 0 ? (
                    <div className="text-center text-stone-400 py-8">
                      <LucidePieChart className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-stone-300 mb-2 opacity-60" />
                      <p className="font-bold text-xs sm:text-sm text-stone-600">No category sales found</p>
                      <p className="text-[10px] sm:text-xs text-stone-400">Complete transactions to view category pie</p>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<CustomCategoryTooltip />} />
                          <Pie
                            data={categoryPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={chartShape === 'donut' ? 62 : 0}
                            outerRadius={95}
                            paddingAngle={chartShape === 'donut' ? 3 : 1}
                            dataKey="value"
                            animationDuration={600}
                          >
                            {categoryPieData.map((_, index) => (
                              <Cell
                                key={`cat-cell-${index}`}
                                fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                stroke="#ffffff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Donut Center Total Overlay */}
                      {chartShape === 'donut' && categoryPieData.length > 0 && (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                            {categoryMetric === 'revenue' ? 'Total Sales' : 'Total Units'}
                          </span>
                          <span className="font-display font-black text-stone-900 text-sm sm:text-lg font-mono">
                            {categoryMetric === 'revenue'
                              ? `₱${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              : `${totalItemsSold}`}
                          </span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md mt-0.5">
                            {categoryPieData.length} Categories
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Category Breakdown Ranked Table */}
              <div className="space-y-1.5 sm:space-y-2 pt-2.5 sm:pt-3 border-t border-stone-100 max-h-48 overflow-y-auto pr-1">
                {categoryPieData.map((item, idx) => {
                  const fill = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/70 p-2 sm:p-2.5 hover:bg-amber-50/50 hover:border-amber-200 transition text-[11px] sm:text-xs"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <span
                          className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: fill }}
                        />
                        <span className="font-bold text-stone-800 truncate text-[11px] sm:text-xs">{item.name}</span>
                        <span className="text-[9px] sm:text-[10px] text-stone-400 font-mono">
                          ({item.quantity} sold)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 font-mono text-[11px] sm:text-xs">
                        <span className="font-extrabold text-stone-900">₱{item.revenue.toFixed(2)}</span>
                        <span className="rounded-md bg-stone-200/80 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-stone-800">
                          {item.pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CHART 2: Best Sellers Sales Share (Donut / Pie Chart) */}
            <div className="rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs flex flex-col justify-between space-y-3.5 sm:space-y-5">
              <div>
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-stone-100 pb-3 sm:pb-4">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-700">
                      <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-xs sm:text-base font-extrabold text-stone-900 flex items-center gap-1 sm:gap-1.5">
                        <span>Best Sellers Sales Share</span>
                        <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500 fill-amber-400" />
                      </h3>
                      <p className="text-[10px] sm:text-xs text-stone-500">
                        Top {bestSellerTopCount} revenue leaders vs other catalog items
                      </p>
                    </div>
                  </div>

                  {/* Chart Customizer (Metric & Top N Count) */}
                  <div className="flex items-center gap-1 sm:gap-1.5 self-start sm:self-auto">
                    {/* Metric Toggle */}
                    <div className="flex items-center gap-0.5 rounded-xl bg-stone-100 p-0.5 border border-stone-200 text-[10px] sm:text-[11px]">
                      <button
                        type="button"
                        onClick={() => setBestSellerMetric('revenue')}
                        className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                          bestSellerMetric === 'revenue'
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                        title="Top sellers by Gross Revenue (₱)"
                      >
                        ₱ Revenue
                      </button>
                      <button
                        type="button"
                        onClick={() => setBestSellerMetric('quantity')}
                        className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                          bestSellerMetric === 'quantity'
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                        title="Top sellers by Volume (Cups/Units)"
                      >
                        Qty Sold
                      </button>
                    </div>

                    {/* Top 5 / Top 8 Selector */}
                    <select
                      value={bestSellerTopCount}
                      onChange={(e) => setBestSellerTopCount(Number(e.target.value))}
                      className="rounded-xl border border-stone-200 bg-stone-100 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-stone-700 focus:outline-none cursor-pointer"
                    >
                      <option value={5}>Top 5</option>
                      <option value={6}>Top 6</option>
                      <option value={8}>Top 8</option>
                    </select>
                  </div>
                </div>

                {/* Chart Graphic + Center Callout */}
                <div className="relative h-60 sm:h-72 w-full flex items-center justify-center my-2 sm:my-3">
                  {bestSellersPieData.length === 0 ? (
                    <div className="text-center text-stone-400 py-8">
                      <Award className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-stone-300 mb-2 opacity-60" />
                      <p className="font-bold text-xs sm:text-sm text-stone-600">No item sales recorded</p>
                      <p className="text-[10px] sm:text-xs text-stone-400">Products sold will appear in this donut chart</p>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<CustomBestSellerTooltip />} />
                          <Pie
                            data={bestSellersPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={chartShape === 'donut' ? 62 : 0}
                            outerRadius={95}
                            paddingAngle={chartShape === 'donut' ? 3 : 1}
                            dataKey="value"
                            animationDuration={600}
                          >
                            {bestSellersPieData.map((entry, index) => (
                              <Cell
                                key={`bs-cell-${index}`}
                                fill={entry.color}
                                stroke="#ffffff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Donut Center Best Seller Highlight */}
                      {chartShape === 'donut' && bestSellersPieData.length > 0 && (
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                          <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                            <Crown className="h-2.5 w-2.5 fill-amber-500" /> #1 Best Seller
                          </span>
                          <span className="font-display font-black text-stone-900 text-xs sm:text-sm truncate max-w-[130px]">
                            {bestSellersPieData[0]?.name}
                          </span>
                          <span className="font-mono text-[9px] sm:text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md mt-0.5">
                            {bestSellersPieData[0]?.pct}% of all sales
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Best Sellers Ranked Breakdown */}
              <div className="space-y-1.5 sm:space-y-2 pt-2.5 sm:pt-3 border-t border-stone-100 max-h-48 overflow-y-auto pr-1">
                {bestSellersPieData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50/70 p-2 sm:p-2.5 hover:bg-amber-50/50 hover:border-amber-200 transition text-[11px] sm:text-xs"
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: item.color }}
                      />
                      {!item.isOther && item.rank && item.rank <= 3 && (
                        <span
                          className={`grid h-3.5 w-3.5 sm:h-4 sm:w-4 place-items-center rounded-full text-[8px] sm:text-[9px] font-black shrink-0 ${
                            item.rank === 1
                              ? 'bg-amber-400 text-stone-950'
                              : item.rank === 2
                              ? 'bg-stone-300 text-stone-900'
                              : 'bg-amber-700 text-white'
                          }`}
                        >
                          {item.rank}
                        </span>
                      )}
                      <span className="font-bold text-stone-800 truncate text-[11px] sm:text-xs">{item.name}</span>
                      <span className="text-[9px] sm:text-[10px] text-stone-400 font-mono shrink-0">
                        {item.quantity} sold
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 font-mono text-[11px] sm:text-xs">
                      <span className="font-extrabold text-stone-900">₱{item.revenue.toFixed(2)}</span>
                      <span className="rounded-md bg-stone-200/80 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-stone-800">
                        {item.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FAST & SLOW MOVING PRODUCT VELOCITY CHARTS */}
      {(analyticsSection === 'all' || analyticsSection === 'movement') && (
        <div className="space-y-6">
          {/* DUAL CHARTS GRID (Split View) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* CHART 1: FAST MOVING ITEMS */}
            <div className="rounded-3xl border border-emerald-200/80 bg-linear-to-b from-emerald-50/30 to-white p-3.5 sm:p-6 shadow-xs flex flex-col justify-between space-y-3.5 sm:space-y-5">
                <div className="space-y-3 sm:space-y-4">
                  {/* Fast Movers Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-emerald-100 pb-3 sm:pb-3.5">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700">
                        <Flame className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <h4 className="font-display text-xs sm:text-base font-extrabold text-stone-900 flex items-center gap-1.5 sm:gap-2">
                          <span>Fast Moving Items</span>
                          <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold border border-emerald-200">
                            High Velocity
                          </span>
                        </h4>
                        <p className="text-[10px] sm:text-xs text-stone-500">
                          {fastMetric === 'quantity'
                            ? 'Highest volume sales & fastest turnover'
                            : 'Top grossing revenue drivers'}
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right font-mono self-start sm:self-auto">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400">Total Fast Units</span>
                      <p className="text-xs sm:text-sm font-extrabold text-emerald-800">
                        {fastMovingItems.reduce((sum, i) => sum + i.unitsSold, 0)} sold
                      </p>
                    </div>
                  </div>

                  {/* Fast Movers Dedicated Filter Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 rounded-2xl bg-emerald-50/70 p-1.5 sm:p-2 border border-emerald-100 text-[10px] sm:text-xs">
                    {/* Category Filter */}
                    <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-white px-2 sm:px-2.5 py-0.5 sm:py-1 border border-emerald-200/80 text-[10px] sm:text-xs shadow-2xs">
                      <Filter className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-600" />
                      <select
                        value={fastCategoryFilter}
                        onChange={(e) => setFastCategoryFilter(e.target.value)}
                        className="bg-transparent font-bold text-stone-700 outline-none cursor-pointer text-[10px] sm:text-xs"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {/* Metric Toggle */}
                      <div className="flex items-center gap-0.5 rounded-xl bg-white p-0.5 border border-emerald-200/80 text-[10px] sm:text-xs shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setFastMetric('quantity')}
                          className={`rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                            fastMetric === 'quantity'
                              ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                          title="View by Units Sold (Volume)"
                        >
                          Qty Units
                        </button>
                        <button
                          type="button"
                          onClick={() => setFastMetric('revenue')}
                          className={`rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                            fastMetric === 'revenue'
                              ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                          title="View by Gross Revenue (₱)"
                        >
                          ₱ Sales
                        </button>
                      </div>

                      {/* Item Count Toggle */}
                      <div className="flex items-center gap-0.5 rounded-xl bg-white p-0.5 border border-emerald-200/80 text-[10px] sm:text-xs shadow-2xs">
                        {[5, 8, 10].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setFastLimit(count)}
                            className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                              fastLimit === count
                                ? 'bg-emerald-100 text-emerald-900 font-extrabold'
                                : 'text-stone-500 hover:text-stone-800'
                            }`}
                          >
                            Top {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fast Moving Bar Chart */}
                  <div className="h-60 sm:h-72 w-full">
                    {fastMovingItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 py-8">
                        <Flame className="h-6 w-6 sm:h-8 sm:w-8 text-stone-300 mb-2 opacity-50" />
                        <p className="text-xs sm:text-sm font-bold text-stone-600">No fast moving items found</p>
                        <p className="text-[10px] sm:text-xs text-stone-400">Adjust category or date filter</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={fastMovingItems}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 9, fill: '#78716c' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => (fastMetric === 'revenue' ? `₱${val}` : `${val}`)}
                          />
                          <YAxis
                            type="category"
                            dataKey="shortName"
                            tick={{ fontSize: 10, fill: '#1c1917', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            width={90}
                          />
                          <Tooltip content={<CustomMovementTooltip />} />
                          <Bar
                            dataKey={fastMetric === 'revenue' ? 'revenue' : 'unitsSold'}
                            fill="#10b981"
                            radius={[0, 8, 8, 0]}
                          >
                            {fastMovingItems.map((_, idx) => (
                              <Cell
                                key={`fast-cell-${idx}`}
                                fill={idx === 0 ? '#059669' : idx === 1 ? '#10b981' : '#34d399'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Fast Moving Detail List */}
                <div className="space-y-1.5 sm:space-y-2 border-t border-emerald-100/70 pt-2.5 sm:pt-3.5 max-h-56 overflow-y-auto pr-1">
                  {fastMovingItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-stone-100 bg-white/80 p-2 sm:p-2.5 hover:bg-emerald-50/40 transition text-[11px] sm:text-xs"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <span
                          className={`grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-lg font-bold text-[10px] sm:text-[11px] shrink-0 ${
                            idx === 0
                              ? 'bg-amber-400 text-stone-950 shadow-2xs font-extrabold'
                              : idx === 1
                              ? 'bg-stone-200 text-stone-800'
                              : idx === 2
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-900 truncate">{item.name}</span>
                            <span className="rounded-md bg-stone-100 px-1.5 py-0.2 text-[9px] font-semibold text-stone-500 shrink-0">
                              {item.categoryName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono mt-0.5">
                            <span className="text-emerald-700 font-bold">⚡ {item.velocity} / day</span>
                            <span>•</span>
                            <span className={item.stock <= 5 ? 'text-rose-600 font-bold' : 'text-stone-600'}>
                              {item.stock <= 5 ? `⚠️ Low stock: ${item.stock} left` : `Stock: ${item.stock}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 font-mono text-right">
                        <div>
                          <div className="font-extrabold text-stone-900">
                            {fastMetric === 'revenue' ? `₱${item.revenue.toFixed(2)}` : `${item.unitsSold} sold`}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {fastMetric === 'revenue' ? `${item.unitsSold} units` : `₱${item.revenue.toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            {/* CHART 2: SLOW MOVING ITEMS */}
            <div className="rounded-3xl border border-rose-200/80 bg-linear-to-b from-rose-50/30 to-white p-3.5 sm:p-6 shadow-xs flex flex-col justify-between space-y-3.5 sm:space-y-5">
                <div className="space-y-3 sm:space-y-4">
                  {/* Slow Movers Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-rose-100 pb-3 sm:pb-3.5">
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-2xl bg-rose-500/10 text-rose-700">
                        <Turtle className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <h4 className="font-display text-xs sm:text-base font-extrabold text-stone-900 flex items-center gap-1.5 sm:gap-2">
                          <span>Slow Moving Items</span>
                          <span className="rounded-full bg-rose-100 text-rose-800 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold border border-rose-200">
                            Turnover Alert
                          </span>
                        </h4>
                        <p className="text-[10px] sm:text-xs text-stone-500">
                          Lowest turnover, stagnant inventory &amp; zero-sale candidates
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right font-mono self-start sm:self-auto">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400">Dormant Items</span>
                      <p className="text-xs sm:text-sm font-extrabold text-rose-800">
                        {slowMovingItems.filter((i) => i.unitsSold === 0).length} items (0 sold)
                      </p>
                    </div>
                  </div>

                  {/* Slow Movers Dedicated Filter Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 rounded-2xl bg-rose-50/70 p-1.5 sm:p-2 border border-rose-100 text-[10px] sm:text-xs">
                    {/* Category Filter */}
                    <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-white px-2 sm:px-2.5 py-0.5 sm:py-1 border border-rose-200/80 text-[10px] sm:text-xs shadow-2xs">
                      <Filter className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rose-600" />
                      <select
                        value={slowCategoryFilter}
                        onChange={(e) => setSlowCategoryFilter(e.target.value)}
                        className="bg-transparent font-bold text-stone-700 outline-none cursor-pointer text-[10px] sm:text-xs"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {/* Metric Toggle */}
                      <div className="flex items-center gap-0.5 rounded-xl bg-white p-0.5 border border-rose-200/80 text-[10px] sm:text-xs shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setSlowMetric('quantity')}
                          className={`rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                            slowMetric === 'quantity'
                              ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                          title="View by Units Sold (Volume)"
                        >
                          Qty Units
                        </button>
                        <button
                          type="button"
                          onClick={() => setSlowMetric('revenue')}
                          className={`rounded-lg px-2 sm:px-2.5 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                            slowMetric === 'revenue'
                              ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                          title="View by Gross Revenue (₱)"
                        >
                          ₱ Sales
                        </button>
                      </div>

                      {/* Item Count Toggle */}
                      <div className="flex items-center gap-0.5 rounded-xl bg-white p-0.5 border border-rose-200/80 text-[10px] sm:text-xs shadow-2xs">
                        {[5, 8, 10].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setSlowLimit(count)}
                            className={`rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 font-bold transition-all cursor-pointer ${
                              slowLimit === count
                                ? 'bg-rose-100 text-rose-900 font-extrabold'
                                : 'text-stone-500 hover:text-stone-800'
                            }`}
                          >
                            Top {count}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Slow Moving Bar Chart */}
                  <div className="h-60 sm:h-72 w-full">
                    {slowMovingItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 py-8">
                        <Turtle className="h-6 w-6 sm:h-8 sm:w-8 text-stone-300 mb-2 opacity-50" />
                        <p className="text-xs sm:text-sm font-bold text-stone-600">No slow moving items found</p>
                        <p className="text-[10px] sm:text-xs text-stone-400">All items have healthy velocity</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={slowMovingItems}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 9, fill: '#78716c' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => (slowMetric === 'revenue' ? `₱${val}` : `${val}`)}
                          />
                          <YAxis
                            type="category"
                            dataKey="shortName"
                            tick={{ fontSize: 10, fill: '#1c1917', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            width={90}
                          />
                          <Tooltip content={<CustomMovementTooltip />} />
                          <Bar
                            dataKey={slowMetric === 'revenue' ? 'revenue' : 'unitsSold'}
                            fill="#f43f5e"
                            radius={[0, 8, 8, 0]}
                          >
                            {slowMovingItems.map((entry, idx) => (
                              <Cell
                                key={`slow-cell-${idx}`}
                                fill={entry.unitsSold === 0 ? '#94a3b8' : idx < 2 ? '#f43f5e' : '#fb7185'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Slow Moving Detail List */}
                <div className="space-y-1.5 sm:space-y-2 border-t border-rose-100/70 pt-2.5 sm:pt-3.5 max-h-56 overflow-y-auto pr-1">
                  {slowMovingItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-stone-100 bg-white/80 p-2 sm:p-2.5 hover:bg-rose-50/40 transition text-[11px] sm:text-xs"
                    >
                      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <span
                          className={`grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-lg font-bold text-[10px] sm:text-[11px] shrink-0 ${
                            item.unitsSold === 0
                              ? 'bg-stone-200 text-stone-600'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.unitsSold === 0 ? '💤' : '🐢'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-900 truncate text-[11px] sm:text-xs">{item.name}</span>
                            <span className="rounded-md bg-stone-100 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-semibold text-stone-500 shrink-0">
                              {item.categoryName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-stone-500 font-mono mt-0.5">
                            <span className={item.stock >= 15 ? 'text-amber-700 font-bold' : 'text-stone-600'}>
                              Stock on hand: {item.stock}
                            </span>
                            {item.stock >= 15 && (
                              <span className="rounded-sm bg-amber-100 text-amber-800 px-1 py-0.2 text-[8px] sm:text-[9px] font-bold">
                                Overstock Risk
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 font-mono text-right text-[11px] sm:text-xs">
                        <div>
                          <div
                            className={`font-extrabold ${
                              item.unitsSold === 0 ? 'text-stone-400' : 'text-stone-900'
                            }`}
                          >
                            {item.unitsSold} sold
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-stone-400 font-bold">
                            ₱{item.revenue.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </div>
        </div>
      )}

      {/* SECONDARY GRIDS: Revenue Trend & Top Sellers Bar Chart */}
      {(analyticsSection === 'all' || analyticsSection === 'trends') && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Hourly Sales Trend Area Chart */}
          <div className="rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 sm:pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <h3 className="font-display text-xs sm:text-base font-bold text-stone-900">
                    Hourly Sales Velocity
                  </h3>
                  <p className="text-[10px] sm:text-xs text-stone-500">Peak dining &amp; beverage rush hours (7 AM - 10 PM)</p>
                </div>
              </div>
            </div>

            <div className="h-56 sm:h-64 w-full">
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
                    tick={{ fontSize: 9, fill: '#78716c' }}
                    interval={2}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#78716c' }}
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
          <div className="rounded-3xl border border-stone-200 bg-white p-3.5 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 sm:pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div>
                  <h3 className="font-display text-xs sm:text-base font-bold text-stone-900">
                    Top Selling Products (Revenue Leaderboard)
                  </h3>
                  <p className="text-[10px] sm:text-xs text-stone-500">Highest grossing menu items in current period</p>
                </div>
              </div>
            </div>

            <div className="h-56 sm:h-64 w-full">
              {topProductsBarData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-stone-400">
                  <p className="text-[10px] sm:text-xs">No items sold yet in this period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProductsBarData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 9, fill: '#78716c' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `₱${val}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 9, fill: '#44403c', fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
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

