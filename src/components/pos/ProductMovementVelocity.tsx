import React, { useState, useMemo } from 'react';
import { MenuItem, Category, Order } from '../../types';
import {
  Flame,
  Turtle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  Layers,
  Sparkles,
  Search,
  Filter,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Tag,
  Lightbulb,
  CheckCircle2,
  Clock,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  Zap,
  ArrowRight,
  Info,
  ShieldAlert,
  Archive,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

export type MovementClass = 'all' | 'fast' | 'steady' | 'slow' | 'dormant' | 'risk';

export interface ProductMovementItem {
  id: number;
  name: string;
  categoryName: string;
  categoryId: number;
  price: number;
  imageUrl?: string;
  currentStock: number;
  unitsSold: number;
  revenue: number;
  orderCount: number;
  lastSoldDate: string | null;
  velocityScore: number; // units per day in current timeframe
  pctOfTotalUnits: number;
  pctOfTotalRevenue: number;
  movementClass: 'fast' | 'steady' | 'slow' | 'dormant';
  turnoverStatus: 'stockout_risk' | 'overstock_risk' | 'healthy' | 'low_stock_steady';
  estimatedDaysRemaining: number | null;
  recommendations: string[];
}

interface ProductMovementVelocityProps {
  orders: Order[];
  menuItems: MenuItem[];
  categories: Category[];
  timeRange: 'today' | '7days' | '30days' | 'custom' | 'all';
}

export const ProductMovementVelocity: React.FC<ProductMovementVelocityProps> = ({
  orders,
  menuItems,
  categories,
  timeRange,
}) => {
  // Filter & Search states
  const [selectedClass, setSelectedClass] = useState<MovementClass>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'units' | 'revenue' | 'stock' | 'velocity' | 'risk'>('units');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [thresholdMode, setThresholdMode] = useState<'auto' | 'standard' | 'high_volume'>('auto');
  const [showRecommendationPanel, setShowRecommendationPanel] = useState<boolean>(true);

  // Timeframe length in days for velocity calculations
  const timeframeDays = useMemo(() => {
    switch (timeRange) {
      case 'today':
        return 1;
      case '7days':
        return 7;
      case '30days':
        return 30;
      case 'all':
      default:
        return 60; // baseline window for all-time
    }
  }, [timeRange]);

  // Aggregate item sales from completed orders
  const movementData = useMemo(() => {
    const totalMenuUnits = orders.reduce((sum, o) => {
      return sum + o.items.reduce((s, i) => s + i.quantity, 0);
    }, 0);

    const totalMenuRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Map of sales aggregated per menuItemId or item name
    const salesMap = new Map<
      number | string,
      { unitsSold: number; revenue: number; orderCount: number; lastSoldDate: string | null }
    >();

    for (const order of orders) {
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

    // Determine thresholds based on menuItems distribution
    const salesCounts = menuItems.map((item) => {
      const sale = salesMap.get(item.id) || salesMap.get(item.name);
      return sale ? sale.unitsSold : 0;
    });

    const nonZeroSales = salesCounts.filter((c) => c > 0);
    const avgSales = nonZeroSales.length
      ? nonZeroSales.reduce((a, b) => a + b, 0) / nonZeroSales.length
      : 0;

    let fastThreshold = 3;
    let slowThreshold = 1;

    if (thresholdMode === 'auto') {
      if (timeRange === 'today') {
        fastThreshold = Math.max(2, Math.round(avgSales * 1.2));
        slowThreshold = 1;
      } else if (timeRange === '7days') {
        fastThreshold = Math.max(4, Math.round(avgSales * 1.3));
        slowThreshold = Math.max(1, Math.floor(avgSales * 0.4));
      } else {
        fastThreshold = Math.max(6, Math.round(avgSales * 1.25));
        slowThreshold = Math.max(2, Math.floor(avgSales * 0.35));
      }
    } else if (thresholdMode === 'standard') {
      fastThreshold = timeRange === 'today' ? 2 : timeRange === '7days' ? 5 : 10;
      slowThreshold = timeRange === 'today' ? 0 : timeRange === '7days' ? 1 : 2;
    } else {
      // high volume preset
      fastThreshold = timeRange === 'today' ? 4 : timeRange === '7days' ? 8 : 15;
      slowThreshold = timeRange === 'today' ? 1 : timeRange === '7days' ? 2 : 4;
    }

    // Build ProductMovementItem list
    const items: ProductMovementItem[] = menuItems.map((menuItem) => {
      const category = categories.find((c) => c.id === menuItem.categoryId);
      const categoryName = category ? category.name : 'Other / Specialty';
      const sale = salesMap.get(menuItem.id) || salesMap.get(menuItem.name);

      const unitsSold = sale ? sale.unitsSold : 0;
      const revenue = sale ? sale.revenue : 0;
      const orderCount = sale ? sale.orderCount : 0;
      const lastSoldDate = sale ? sale.lastSoldDate : null;

      const velocityScore = Math.round((unitsSold / timeframeDays) * 10) / 10;
      const pctOfTotalUnits = totalMenuUnits > 0 ? (unitsSold / totalMenuUnits) * 100 : 0;
      const pctOfTotalRevenue = totalMenuRevenue > 0 ? (revenue / totalMenuRevenue) * 100 : 0;

      // Classify movement
      let movementClass: 'fast' | 'steady' | 'slow' | 'dormant' = 'dormant';
      if (unitsSold === 0) {
        movementClass = 'dormant';
      } else if (unitsSold >= fastThreshold) {
        movementClass = 'fast';
      } else if (unitsSold <= slowThreshold) {
        movementClass = 'slow';
      } else {
        movementClass = 'steady';
      }

      // Calculate turnover risk & days remaining
      const currentStock = menuItem.quantity || 0;
      let turnoverStatus: 'stockout_risk' | 'overstock_risk' | 'healthy' | 'low_stock_steady' = 'healthy';
      let estimatedDaysRemaining: number | null = null;

      if (velocityScore > 0) {
        estimatedDaysRemaining = Math.round(currentStock / velocityScore);
      }

      if (movementClass === 'fast' && (currentStock <= 5 || (estimatedDaysRemaining !== null && estimatedDaysRemaining <= 3))) {
        turnoverStatus = 'stockout_risk';
      } else if ((movementClass === 'slow' || movementClass === 'dormant') && currentStock >= 15) {
        turnoverStatus = 'overstock_risk';
      } else if (movementClass === 'steady' && currentStock <= 3) {
        turnoverStatus = 'low_stock_steady';
      } else {
        turnoverStatus = 'healthy';
      }

      // Generate strategic recommendations
      const recommendations: string[] = [];
      if (movementClass === 'fast') {
        if (turnoverStatus === 'stockout_risk') {
          recommendations.push('🚨 Urgent reorder required: Stock depleted by high customer velocity');
        } else {
          recommendations.push('⭐ High velocity anchor item: Maintain safety buffer & feature as recommended pairing');
        }
        recommendations.push('💡 Ideal candidate for upselling combos and barista favorites menu board');
      } else if (movementClass === 'slow') {
        if (turnoverStatus === 'overstock_risk') {
          recommendations.push('⚠️ Overstock risk: Tied capital. Create combo discount with top-selling coffee');
        } else {
          recommendations.push('📉 Low velocity: Test promotional pricing or reposition on menu layout');
        }
        recommendations.push('🔍 Review customer feedback or taste profile to optimize recipe');
      } else if (movementClass === 'dormant') {
        if (currentStock > 0) {
          recommendations.push('⚠️ Zero sales with stock on hand: Run special "Item of the Week" promo');
        } else {
          recommendations.push('💤 Inactive item with 0 inventory: Consider seasonal rotation or menu cleanup');
        }
      } else {
        recommendations.push('✅ Stable velocity: Consistent steady performer meeting baseline demand');
      }

      return {
        id: menuItem.id,
        name: menuItem.name,
        categoryName,
        categoryId: menuItem.categoryId,
        price: menuItem.price,
        imageUrl: menuItem.imageUrl,
        currentStock,
        unitsSold,
        revenue,
        orderCount,
        lastSoldDate,
        velocityScore,
        pctOfTotalUnits,
        pctOfTotalRevenue,
        movementClass,
        turnoverStatus,
        estimatedDaysRemaining,
        recommendations,
      };
    });

    return {
      items,
      totalMenuUnits,
      totalMenuRevenue,
      fastThreshold,
      slowThreshold,
      avgSales: Math.round(avgSales * 10) / 10,
    };
  }, [orders, menuItems, categories, timeframeDays, timeRange, thresholdMode]);

  // Movement counts & summary metrics
  const summaryMetrics = useMemo(() => {
    const all = movementData.items;
    const fast = all.filter((i) => i.movementClass === 'fast');
    const steady = all.filter((i) => i.movementClass === 'steady');
    const slow = all.filter((i) => i.movementClass === 'slow');
    const dormant = all.filter((i) => i.movementClass === 'dormant');
    const stockoutRisks = all.filter((i) => i.turnoverStatus === 'stockout_risk');
    const overstockRisks = all.filter((i) => i.turnoverStatus === 'overstock_risk');

    const fastRevenue = fast.reduce((s, i) => s + i.revenue, 0);
    const slowRevenue = slow.reduce((s, i) => s + i.revenue, 0);
    const fastUnits = fast.reduce((s, i) => s + i.unitsSold, 0);
    const slowUnits = slow.reduce((s, i) => s + i.unitsSold, 0);

    const tiedUpCapitalSlow = slow.reduce((s, i) => s + i.currentStock * i.price, 0);
    const tiedUpCapitalDormant = dormant.reduce((s, i) => s + i.currentStock * i.price, 0);

    const topFastMover = [...fast].sort((a, b) => b.unitsSold - a.unitsSold)[0];
    const slowestWithStock = [...slow, ...dormant]
      .filter((i) => i.currentStock > 0)
      .sort((a, b) => b.currentStock - a.currentStock)[0];

    return {
      totalProducts: all.length,
      fastCount: fast.length,
      steadyCount: steady.length,
      slowCount: slow.length,
      dormantCount: dormant.length,
      stockoutRisksCount: stockoutRisks.length,
      overstockRisksCount: overstockRisks.length,
      fastRevenue,
      slowRevenue,
      fastUnits,
      slowUnits,
      fastRevenuePct:
        movementData.totalMenuRevenue > 0
          ? ((fastRevenue / movementData.totalMenuRevenue) * 100).toFixed(1)
          : '0',
      tiedUpCapital: tiedUpCapitalSlow + tiedUpCapitalDormant,
      topFastMover,
      slowestWithStock,
    };
  }, [movementData]);

  // Filter & Sort Items
  const filteredAndSortedItems = useMemo(() => {
    let list = [...movementData.items];

    // Filter by Movement Classification
    if (selectedClass === 'fast') {
      list = list.filter((i) => i.movementClass === 'fast');
    } else if (selectedClass === 'steady') {
      list = list.filter((i) => i.movementClass === 'steady');
    } else if (selectedClass === 'slow') {
      list = list.filter((i) => i.movementClass === 'slow');
    } else if (selectedClass === 'dormant') {
      list = list.filter((i) => i.movementClass === 'dormant');
    } else if (selectedClass === 'risk') {
      list = list.filter(
        (i) => i.turnoverStatus === 'stockout_risk' || i.turnoverStatus === 'overstock_risk'
      );
    }

    // Filter by Category
    if (selectedCategory !== 'all') {
      list = list.filter((i) => String(i.categoryId) === selectedCategory);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.categoryName.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'units':
          comparison = b.unitsSold - a.unitsSold;
          break;
        case 'revenue':
          comparison = b.revenue - a.revenue;
          break;
        case 'stock':
          comparison = b.currentStock - a.currentStock;
          break;
        case 'velocity':
          comparison = b.velocityScore - a.velocityScore;
          break;
        case 'risk':
          const riskWeight = (item: ProductMovementItem) => {
            if (item.turnoverStatus === 'stockout_risk') return 3;
            if (item.turnoverStatus === 'overstock_risk') return 2;
            if (item.turnoverStatus === 'low_stock_steady') return 1;
            return 0;
          };
          comparison = riskWeight(b) - riskWeight(a);
          break;
        default:
          comparison = b.unitsSold - a.unitsSold;
      }
      return sortDirection === 'desc' ? comparison : -comparison;
    });

    return list;
  }, [movementData.items, selectedClass, selectedCategory, searchQuery, sortField, sortDirection]);

  // Chart Data: Fast vs Slow Comparison Top 10
  const comparisonChartData = useMemo(() => {
    const fastItems = movementData.items
      .filter((i) => i.movementClass === 'fast')
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 6)
      .map((i) => ({
        name: i.name.length > 13 ? i.name.slice(0, 12) + '…' : i.name,
        fullName: i.name,
        unitsSold: i.unitsSold,
        stock: i.currentStock,
        revenue: i.revenue,
        category: i.categoryName,
        type: 'Fast-Moving',
        fill: '#10b981', // Emerald
      }));

    const slowItems = movementData.items
      .filter((i) => i.movementClass === 'slow' || (i.movementClass === 'dormant' && i.currentStock > 0))
      .sort((a, b) => a.unitsSold - b.unitsSold || b.currentStock - a.currentStock)
      .slice(0, 6)
      .map((i) => ({
        name: i.name.length > 13 ? i.name.slice(0, 12) + '…' : i.name,
        fullName: i.name,
        unitsSold: i.unitsSold,
        stock: i.currentStock,
        revenue: i.revenue,
        category: i.categoryName,
        type: i.unitsSold === 0 ? 'Zero-Sales' : 'Slow-Moving',
        fill: i.unitsSold === 0 ? '#ef4444' : '#f59e0b', // Red / Amber
      }));

    return [...fastItems, ...slowItems];
  }, [movementData.items]);

  const handleSortToggle = (field: 'units' | 'revenue' | 'stock' | 'velocity' | 'risk') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div id="product-movement-velocity-container" className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-amber-200/70 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-extrabold text-amber-900 uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5 text-amber-600 fill-amber-600" />
              Inventory Velocity &amp; Demand Intelligence
            </span>
            <span className="rounded-full bg-stone-200/80 px-2.5 py-0.5 text-[11px] font-bold text-stone-700">
              Benchmark: Fast &gt;={movementData.fastThreshold} | Slow &lt;={movementData.slowThreshold} units
            </span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-black text-stone-900 tracking-tight">
            Fast-Moving &amp; Slow-Moving Products Matrix
          </h2>
          <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
            Real-time movement classification identifying café bestsellers, stagnant menu items, stockout risks,
            and tied-up inventory capital to optimize purchasing and menu profitability.
          </p>
        </div>

        {/* Sensitivity & Recommendation Toggle */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 rounded-2xl bg-white p-1.5 border border-stone-200 shadow-2xs text-xs">
            <span className="text-stone-400 font-bold px-2 text-[11px]">Sensitivity:</span>
            <button
              type="button"
              onClick={() => setThresholdMode('auto')}
              className={`rounded-xl px-2.5 py-1 font-bold transition ${
                thresholdMode === 'auto'
                  ? 'bg-amber-500 text-stone-950 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Adaptive Auto
            </button>
            <button
              type="button"
              onClick={() => setThresholdMode('standard')}
              className={`rounded-xl px-2.5 py-1 font-bold transition ${
                thresholdMode === 'standard'
                  ? 'bg-amber-500 text-stone-950 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setThresholdMode('high_volume')}
              className={`rounded-xl px-2.5 py-1 font-bold transition ${
                thresholdMode === 'high_volume'
                  ? 'bg-amber-500 text-stone-950 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              High Volume
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowRecommendationPanel((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition shadow-2xs ${
              showRecommendationPanel
                ? 'border-amber-400 bg-amber-100/70 text-amber-950'
                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <span>Strategic Advice</span>
          </button>
        </div>
      </div>

      {/* KPI TILES FOR MOVEMENT SEGMENTS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Fast Movers KPI */}
        <div
          onClick={() => setSelectedClass('fast')}
          className={`cursor-pointer rounded-3xl border p-5 transition-all shadow-xs ${
            selectedClass === 'fast'
              ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
              : 'border-stone-200 bg-white hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <Flame className="h-4 w-4 fill-emerald-600 text-emerald-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Fast-Moving (🚀)
              </span>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
              {summaryMetrics.fastRevenuePct}% Revenue
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-2xl font-black text-stone-900 font-mono">
              {summaryMetrics.fastCount} <span className="text-sm font-bold text-stone-500">Items</span>
            </span>
            <span className="font-mono text-xs font-bold text-emerald-700">
              {summaryMetrics.fastUnits} Units Sold
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-emerald-100/60 pt-2 text-[11px] text-stone-600">
            <span className="truncate">Top: <strong>{summaryMetrics.topFastMover?.name || 'N/A'}</strong></span>
            <span className="font-mono font-bold text-stone-800 shrink-0">₱{summaryMetrics.fastRevenue.toFixed(0)}</span>
          </div>
        </div>

        {/* Steady Movers KPI */}
        <div
          onClick={() => setSelectedClass('steady')}
          className={`cursor-pointer rounded-3xl border p-5 transition-all shadow-xs ${
            selectedClass === 'steady'
              ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
              : 'border-stone-200 bg-white hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                Steady Movers (⚖️)
              </span>
            </div>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black text-indigo-800">
              Stable Core
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-2xl font-black text-stone-900 font-mono">
              {summaryMetrics.steadyCount} <span className="text-sm font-bold text-stone-500">Items</span>
            </span>
            <span className="font-mono text-xs font-bold text-indigo-700">Healthy Turnover</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-indigo-100/60 pt-2 text-[11px] text-stone-600">
            <span>Moderate sales volume</span>
            <span className="font-bold text-stone-700">Baseline Demand</span>
          </div>
        </div>

        {/* Slow Movers KPI */}
        <div
          onClick={() => setSelectedClass('slow')}
          className={`cursor-pointer rounded-3xl border p-5 transition-all shadow-xs ${
            selectedClass === 'slow'
              ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
              : 'border-stone-200 bg-white hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 text-amber-800">
                <Turtle className="h-4 w-4 text-amber-700" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Slow-Moving (🐢)
              </span>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
              Lagging Sales
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-2xl font-black text-stone-900 font-mono">
              {summaryMetrics.slowCount} <span className="text-sm font-bold text-stone-500">Items</span>
            </span>
            <span className="font-mono text-xs font-bold text-amber-800">
              {summaryMetrics.slowUnits} Units Sold
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-amber-100/60 pt-2 text-[11px] text-stone-600">
            <span>Avg &lt;= {movementData.slowThreshold} units</span>
            <span className="font-mono font-bold text-amber-900">₱{summaryMetrics.slowRevenue.toFixed(0)} Rev</span>
          </div>
        </div>

        {/* Dormant / Zero Sales & Risk Alerts KPI */}
        <div
          onClick={() => setSelectedClass('risk')}
          className={`cursor-pointer rounded-3xl border p-5 transition-all shadow-xs ${
            selectedClass === 'risk'
              ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
              : 'border-stone-200 bg-white hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 text-rose-700">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Stock &amp; Sales Risks
              </span>
            </div>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800">
              Action Needed
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-2xl font-black text-stone-900 font-mono">
              {summaryMetrics.stockoutRisksCount + summaryMetrics.overstockRisksCount}{' '}
              <span className="text-sm font-bold text-stone-500">Alerts</span>
            </span>
            <span className="font-mono text-xs font-bold text-rose-700">
              {summaryMetrics.dormantCount} Zero-Sales
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-rose-100/60 pt-2 text-[11px] text-stone-600">
            <span>Tied Capital in Stagnant Stock:</span>
            <span className="font-mono font-bold text-rose-900">₱{summaryMetrics.tiedUpCapital.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* STRATEGIC AI & BUSINESS RECOMMENDATION PANEL */}
      {showRecommendationPanel && (
        <div className="rounded-3xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-extrabold text-stone-900">
                  Manager Action Plan &amp; Velocity Optimization
                </h3>
                <p className="text-xs text-stone-500">
                  Automated strategies to maximize high-velocity items and turnaround slow movers
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRecommendationPanel(false)}
              className="text-stone-400 hover:text-stone-700 text-xs font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Action 1: Stockout Safeguards for Fast Movers */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <Flame className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                <span>Fast-Movers Safeguard</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed">
                {summaryMetrics.stockoutRisksCount > 0
                  ? `🚨 ${summaryMetrics.stockoutRisksCount} top-selling item(s) are near stockout! Restock immediately to protect recurring revenue.`
                  : `Top performers (${summaryMetrics.topFastMover?.name || 'Beverages'}) represent ${summaryMetrics.fastRevenuePct}% of sales. Maintain batch buffers.`}
              </p>
              <div className="pt-1 text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                <span>Recommended: Increase batch size by 20%</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Action 2: Slow-Moving Turnaround & Bundles */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                <Tag className="h-4 w-4 text-amber-700" />
                <span>Slow-Mover Bundling Strategy</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed">
                {summaryMetrics.overstockRisksCount > 0
                  ? `Bundle lagging items (${summaryMetrics.slowestWithStock?.name || 'Pastries'}) as a ₱30 discount combo with ${summaryMetrics.topFastMover?.name || 'Spanish Latte'}.`
                  : 'Bundle low-turnover food items with popular cold brews to liquidate stock before expiry.'}
              </p>
              <div className="pt-1 text-[11px] font-bold text-amber-900 flex items-center gap-1">
                <span>Recommended: Launch "Café Pair" Combo</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>

            {/* Action 3: Menu Rationalization & Deadstock Cleanup */}
            <div className="rounded-2xl border border-stone-300 bg-stone-50/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                <Archive className="h-4 w-4 text-stone-600" />
                <span>Menu Optimization</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed">
                {summaryMetrics.dormantCount > 0
                  ? `${summaryMetrics.dormantCount} items logged 0 sales in this period. Review recipes, price points, or rotate out for seasonal items.`
                  : 'All menu items logged transactions. Inventory turnover is healthy across categories.'}
              </p>
              <div className="pt-1 text-[11px] font-bold text-stone-800 flex items-center gap-1">
                <span>Recommended: Check Menu Availability</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISUAL CHART: FAST MOVERS VS SLOW MOVERS SIDE-BY-SIDE */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-stone-900">
                Movement Comparison: Top Fast Movers vs Lagging Items
              </h3>
              <p className="text-xs text-stone-500">
                Direct comparison of units sold across high-demand bestsellers and slow-moving items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Fast-Moving
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Slow-Moving
            </span>
            <span className="flex items-center gap-1.5 text-rose-700">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> Zero Sales
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {comparisonChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-stone-400 text-xs">
              No product sales data in this timeframe
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#44403c', fontWeight: 600 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#78716c' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Units Sold', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#a8a29e' }}
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-stone-200 bg-stone-900 px-3.5 py-2.5 text-white shadow-xl text-xs">
                          <p className="font-bold text-amber-400 mb-1">{data.fullName}</p>
                          <div className="flex items-center justify-between gap-4 font-mono">
                            <span className="text-stone-300">Category:</span>
                            <span className="text-stone-200">{data.category}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 font-mono">
                            <span className="text-stone-300">Status:</span>
                            <span
                              className={`font-bold ${
                                data.type === 'Fast-Moving'
                                  ? 'text-emerald-400'
                                  : data.type === 'Zero-Sales'
                                  ? 'text-rose-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {data.type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 font-mono mt-1 border-t border-stone-800 pt-1">
                            <span className="text-stone-300">Units Sold:</span>
                            <span className="font-extrabold text-amber-300">{data.unitsSold} units</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 font-mono">
                            <span className="text-stone-300">Current Stock:</span>
                            <span className="font-bold text-stone-200">{data.stock} in stock</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 font-mono">
                            <span className="text-stone-300">Total Revenue:</span>
                            <span className="font-bold text-emerald-300">₱{data.revenue.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="unitsSold" radius={[6, 6, 0, 0]}>
                  {comparisonChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* FILTER & EXPLORATION TOOLBAR */}
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
        {/* Row 1: Classification Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-stone-100 p-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setSelectedClass('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedClass === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              All Items ({movementData.items.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedClass('fast')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedClass === 'fast'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Flame className="h-3.5 w-3.5 fill-current" />
              Fast-Moving ({summaryMetrics.fastCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedClass('steady')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedClass === 'steady'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 hover:bg-indigo-50'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Steady ({summaryMetrics.steadyCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedClass('slow')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedClass === 'slow'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:bg-amber-50'
              }`}
            >
              <Turtle className="h-3.5 w-3.5" />
              Slow-Moving ({summaryMetrics.slowCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedClass('dormant')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedClass === 'dormant'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              Zero-Sales ({summaryMetrics.dormantCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedClass('risk')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                selectedClass === 'risk'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Stock Risks ({summaryMetrics.stockoutRisksCount + summaryMetrics.overstockRisksCount})
            </button>
          </div>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 rounded-2xl bg-stone-100 p-1 border border-stone-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`rounded-xl px-3 py-1.5 transition ${
                viewMode === 'cards'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Grid Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded-xl px-3 py-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Data Table
            </button>
          </div>
        </div>

        {/* Row 2: Search, Category & Sorting */}
        <div className="grid gap-3 sm:grid-cols-12 items-center">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product or category..."
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/60 pl-9 pr-4 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs text-stone-900 focus:bg-white focus:border-amber-500 focus:outline-none transition font-medium"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Buttons */}
          <div className="sm:col-span-5 flex flex-wrap items-center justify-end gap-1 text-xs">
            <span className="text-[11px] font-bold text-stone-400 mr-1">Sort By:</span>
            <button
              type="button"
              onClick={() => handleSortToggle('units')}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition flex items-center gap-1 ${
                sortField === 'units'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Units Sold</span>
              {sortField === 'units' && (sortDirection === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
            </button>
            <button
              type="button"
              onClick={() => handleSortToggle('revenue')}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition flex items-center gap-1 ${
                sortField === 'revenue'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Revenue</span>
              {sortField === 'revenue' && (sortDirection === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
            </button>
            <button
              type="button"
              onClick={() => handleSortToggle('stock')}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition flex items-center gap-1 ${
                sortField === 'stock'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Stock Level</span>
              {sortField === 'stock' && (sortDirection === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
            </button>
            <button
              type="button"
              onClick={() => handleSortToggle('risk')}
              className={`rounded-xl px-2.5 py-1.5 font-bold transition flex items-center gap-1 ${
                sortField === 'risk'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Risk Priority</span>
              {sortField === 'risk' && (sortDirection === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />)}
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCT LISTING: GRID CARDS VIEW */}
      {viewMode === 'cards' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedItems.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-400">
              <Package className="h-12 w-12 mx-auto text-stone-300 mb-3 opacity-60" />
              <p className="font-bold text-sm text-stone-700">No products match your filter</p>
              <p className="text-xs text-stone-400 mt-1">Try selecting a different movement tab or clear your search.</p>
            </div>
          ) : (
            filteredAndSortedItems.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col justify-between rounded-3xl border bg-white p-5 transition-all hover:shadow-md ${
                  item.movementClass === 'fast'
                    ? 'border-emerald-200/80 hover:border-emerald-400'
                    : item.movementClass === 'slow'
                    ? 'border-amber-200/80 hover:border-amber-400'
                    : item.movementClass === 'dormant'
                    ? 'border-rose-200/80 hover:border-rose-400'
                    : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <div>
                  {/* Top Bar: Movement Badge & Stock Risk Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Movement Badge */}
                    {item.movementClass === 'fast' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                        <Flame className="h-3.5 w-3.5 fill-emerald-600 text-emerald-600" />
                        Fast-Moving
                      </span>
                    )}
                    {item.movementClass === 'steady' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800">
                        <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                        Steady-Mover
                      </span>
                    )}
                    {item.movementClass === 'slow' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                        <Turtle className="h-3.5 w-3.5 text-amber-700" />
                        Slow-Moving
                      </span>
                    )}
                    {item.movementClass === 'dormant' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                        <Archive className="h-3.5 w-3.5 text-rose-600" />
                        Zero Sales
                      </span>
                    )}

                    {/* Stock Alert Badge */}
                    {item.turnoverStatus === 'stockout_risk' && (
                      <span className="rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white animate-pulse">
                        Stockout Risk
                      </span>
                    )}
                    {item.turnoverStatus === 'overstock_risk' && (
                      <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-black text-stone-950">
                        Overstock Risk
                      </span>
                    )}
                    {item.turnoverStatus === 'low_stock_steady' && (
                      <span className="rounded-md bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-800">
                        Low Stock
                      </span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex items-start gap-3">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-14 w-14 rounded-2xl object-cover border border-stone-200 shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-stone-100 border border-stone-200 grid place-items-center text-stone-400 shrink-0 font-bold text-base">
                        {item.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-stone-900 text-sm line-clamp-1">{item.name}</h4>
                      <p className="text-[11px] text-stone-500 mt-0.5">{item.categoryName}</p>
                      <div className="font-mono text-xs font-bold text-amber-900 mt-1">
                        ₱{item.price.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Quantitative Stats Matrix */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-stone-50 p-2.5 border border-stone-100 font-mono text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Units Sold</span>
                      <span className="text-sm font-extrabold text-stone-900">{item.unitsSold}</span>
                      <span className="text-[9px] text-stone-400 block">{item.pctOfTotalUnits.toFixed(1)}% share</span>
                    </div>
                    <div className="border-x border-stone-200 px-1">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Revenue</span>
                      <span className="text-sm font-extrabold text-amber-950">₱{item.revenue.toFixed(0)}</span>
                      <span className="text-[9px] text-stone-400 block">{item.orderCount} orders</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">In Stock</span>
                      <span
                        className={`text-sm font-extrabold ${
                          item.currentStock <= 5 ? 'text-rose-600' : 'text-stone-800'
                        }`}
                      >
                        {item.currentStock}
                      </span>
                      <span className="text-[9px] text-stone-400 block">
                        {item.estimatedDaysRemaining !== null ? `~${item.estimatedDaysRemaining}d supply` : 'stagnant'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommendations Footer */}
                <div className="mt-4 pt-3 border-t border-stone-100">
                  <div className="flex items-start gap-1.5 text-[11px] text-stone-600 leading-snug">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{item.recommendations[0]}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PRODUCT LISTING: HIGH DENSITY DATA TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-200 bg-stone-50/80 font-bold uppercase tracking-wider text-stone-500 text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Product &amp; Category</th>
                  <th className="px-4 py-3.5">Movement Status</th>
                  <th className="px-4 py-3.5 text-right">Units Sold</th>
                  <th className="px-4 py-3.5 text-right">Sales Revenue</th>
                  <th className="px-4 py-3.5 text-center">Velocity</th>
                  <th className="px-4 py-3.5 text-right">Current Stock</th>
                  <th className="px-4 py-3.5">Stock Turnover Status</th>
                  <th className="px-5 py-3.5">Strategic Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAndSortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-stone-400">
                      No products found
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/70 transition">
                      {/* Product & Category */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-9 w-9 rounded-xl object-cover border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-xl bg-stone-100 border border-stone-200 grid place-items-center text-stone-500 font-bold text-xs shrink-0">
                              {item.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-stone-900 block">{item.name}</span>
                            <span className="text-[11px] text-stone-500">{item.categoryName} • ₱{item.price.toFixed(2)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Movement Status */}
                      <td className="px-4 py-3.5">
                        {item.movementClass === 'fast' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                            <Flame className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                            Fast-Moving
                          </span>
                        )}
                        {item.movementClass === 'steady' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                            <TrendingUp className="h-3 w-3" />
                            Steady
                          </span>
                        )}
                        {item.movementClass === 'slow' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                            <Turtle className="h-3 w-3" />
                            Slow-Moving
                          </span>
                        )}
                        {item.movementClass === 'dormant' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                            <Archive className="h-3 w-3" />
                            Zero Sales
                          </span>
                        )}
                      </td>

                      {/* Units Sold */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        <span className="font-extrabold text-stone-900 text-xs">{item.unitsSold}</span>
                        <span className="text-[10px] text-stone-400 block">{item.pctOfTotalUnits.toFixed(1)}%</span>
                      </td>

                      {/* Sales Revenue */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        <span className="font-bold text-amber-950 text-xs">₱{item.revenue.toFixed(2)}</span>
                        <span className="text-[10px] text-stone-400 block">{item.orderCount} orders</span>
                      </td>

                      {/* Velocity */}
                      <td className="px-4 py-3.5 text-center font-mono">
                        <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-800">
                          {item.velocityScore}/day
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        <span
                          className={`font-extrabold text-xs ${
                            item.currentStock <= 5 ? 'text-rose-600' : 'text-stone-900'
                          }`}
                        >
                          {item.currentStock} units
                        </span>
                      </td>

                      {/* Stock Turnover Status */}
                      <td className="px-4 py-3.5">
                        {item.turnoverStatus === 'stockout_risk' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800">
                            <AlertTriangle className="h-3 w-3" /> Stockout Risk
                          </span>
                        )}
                        {item.turnoverStatus === 'overstock_risk' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
                            <ShieldAlert className="h-3 w-3" /> Overstock Risk
                          </span>
                        )}
                        {item.turnoverStatus === 'low_stock_steady' && (
                          <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                            Low Stock
                          </span>
                        )}
                        {item.turnoverStatus === 'healthy' && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Balanced
                          </span>
                        )}
                      </td>

                      {/* Strategic Action */}
                      <td className="px-5 py-3.5 text-stone-600 text-[11px] max-w-xs truncate">
                        {item.recommendations[0]}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
