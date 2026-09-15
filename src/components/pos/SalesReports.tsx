import React, { useState, useMemo, useEffect } from 'react';
import { Order, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import {
  DollarSign,
  TrendingUp,
  Printer,
  Calendar,
  Download,
  Filter,
  Globe,
  Store,
  Layers,
  Clock,
  RotateCcw,
  ArrowRight,
  Check,
  UserCheck,
  User,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  BarChart3,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export interface LedgerVisibleColumns {
  receipt: boolean;
  cashier: boolean;
  channel: boolean;
  date: boolean;
  guest: boolean;
  payment: boolean;
  subtotal: boolean;
  tax: boolean;
  total: boolean;
  action: boolean;
}

const DEFAULT_LEDGER_COLUMNS: LedgerVisibleColumns = {
  receipt: true,
  cashier: true,
  channel: true,
  date: true,
  guest: true,
  payment: true,
  subtotal: true,
  tax: true,
  total: true,
  action: true,
};

interface LedgerColumnConfig {
  key: keyof LedgerVisibleColumns;
  label: string;
  description: string;
}

const LEDGER_COLUMNS: LedgerColumnConfig[] = [
  { key: 'receipt', label: 'Receipt #', description: 'Unique order identifier' },
  { key: 'cashier', label: 'Cashier / Staff', description: 'Serving staff or cashier member' },
  { key: 'channel', label: 'Channel', description: 'In-store POS or Online storefront' },
  { key: 'date', label: 'Date / Time', description: 'Order creation timestamp' },
  { key: 'guest', label: 'Guest & Type', description: 'Customer name & order type' },
  { key: 'payment', label: 'Payment', description: 'Settlement method (Cash, Card, GCash)' },
  { key: 'subtotal', label: 'Subtotal', description: 'Order gross amount before tax' },
  { key: 'tax', label: 'VAT', description: 'Official value-added tax component' },
  { key: 'total', label: 'Total', description: 'Final settled payment total' },
  { key: 'action', label: 'Action', description: 'View full receipt breakdown' },
];

interface SalesReportsProps {
  settings: StoreSettings;
  onViewReceipt: (order: Order) => void;
}

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

export const SalesReports: React.FC<SalesReportsProps> = ({ settings, onViewReceipt }) => {
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());

  useEffect(() => {
    setOrders(AppStore.getOrders());
    const unsub = AppStore.subscribe(() => {
      setOrders(AppStore.getOrders());
    });
    return () => unsub();
  }, []);

  // Helper date utilities
  const formatDateForInput = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => formatDateForInput(new Date()), []);

  // Filter Modal & Column Filter Modal states
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [isColumnFilterModalOpen, setIsColumnFilterModalOpen] = useState<boolean>(false);

  // Column Visibility State with local storage persistence
  const [visibleColumns, setVisibleColumns] = useState<LedgerVisibleColumns>(() => {
    try {
      const saved = localStorage.getItem('yh_ledger_visible_cols_v1');
      if (saved) {
        return { ...DEFAULT_LEDGER_COLUMNS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_LEDGER_COLUMNS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('yh_ledger_visible_cols_v1', JSON.stringify(visibleColumns));
    } catch {
      // ignore
    }
  }, [visibleColumns]);

  const visibleColumnCount = useMemo(() => {
    return Object.values(visibleColumns).filter(Boolean).length;
  }, [visibleColumns]);

  const toggleColumn = (key: keyof LedgerVisibleColumns) => {
    setVisibleColumns((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && activeCount <= 1) {
        return prev;
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const handleApplyColumnPreset = (preset: 'minimal' | 'financial' | 'all') => {
    if (preset === 'minimal') {
      setVisibleColumns({
        receipt: true,
        cashier: false,
        channel: false,
        date: true,
        guest: false,
        payment: false,
        subtotal: false,
        tax: false,
        total: true,
        action: true,
      });
    } else if (preset === 'financial') {
      setVisibleColumns({
        receipt: true,
        cashier: false,
        channel: false,
        date: false,
        guest: false,
        payment: true,
        subtotal: true,
        tax: true,
        total: true,
        action: true,
      });
    } else {
      setVisibleColumns({
        receipt: true,
        cashier: true,
        channel: true,
        date: true,
        guest: true,
        payment: true,
        subtotal: true,
        tax: true,
        total: true,
        action: true,
      });
    }
  };

  // Date Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Channel, Dining Type & Cashier Filters
  const [channelFilter, setChannelFilter] = useState<'all' | 'in_store' | 'online'>('all');
  const [filterType, setFilterType] = useState<'all' | 'dine_in' | 'take_away' | 'delivery'>('all');
  const [cashierFilter, setCashierFilter] = useState<string>('all');

  // Count active filters modifying from default
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (datePreset !== 'today') count++;
    if (channelFilter !== 'all') count++;
    if (cashierFilter !== 'all') count++;
    if (filterType !== 'all') count++;
    return count;
  }, [datePreset, channelFilter, cashierFilter, filterType]);

  const isFilterModified = activeFilterCount > 0;

  const handleResetFilters = () => {
    setDatePreset('today');
    setStartDate(todayStr);
    setEndDate(todayStr);
    setChannelFilter('all');
    setCashierFilter('all');
    setFilterType('all');
  };

  // Table Column Sorting State
  type SortField =
    | 'receipt'
    | 'cashier'
    | 'channel'
    | 'date'
    | 'guest'
    | 'payment'
    | 'subtotal'
    | 'tax'
    | 'total';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Reset page to 1 whenever filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    channelFilter,
    filterType,
    cashierFilter,
    datePreset,
    startDate,
    endDate,
    sortField,
    sortDirection,
    pageSize,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (['date', 'total', 'subtotal', 'tax'].includes(field)) {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'completed');
  }, [orders]);

  // Unique list of Cashiers for Filter
  const cashierOptions = useMemo(() => {
    const map = new Map<string, { name: string; role?: string }>();
    
    // From users database
    AppStore.getUsers().forEach((u) => {
      const name = u.fullName || u.username;
      map.set(name, { name, role: u.role });
    });

    // From actual completed orders
    completedOrders.forEach((o) => {
      const name = o.cashierName || 'Staff Member';
      if (!map.has(name)) {
        map.set(name, { name, role: name.includes('Online') ? 'online' : 'staff' });
      }
    });

    return Array.from(map.values());
  }, [completedOrders]);

  // Apply Date Filter + Channel Filter + Dining Type Filter + Cashier Filter
  const filteredOrders = useMemo(() => {
    return completedOrders.filter((o) => {
      // 1. Channel Filter
      const ch = AppStore.getOrderChannel(o);
      if (channelFilter !== 'all' && ch !== channelFilter) return false;

      // 2. Dining Type Filter
      if (filterType !== 'all' && o.orderType !== filterType) return false;

      // 3. Cashier Filter
      if (cashierFilter !== 'all') {
        const orderCashier = o.cashierName || 'Staff Member';
        if (orderCashier.toLowerCase() !== cashierFilter.toLowerCase()) return false;
      }

      // 4. Date Filter
      if (datePreset === 'all') return true;

      const orderTime = new Date(o.createdAt).getTime();
      if (isNaN(orderTime)) return true;

      if (datePreset === 'today') {
        const start = new Date(`${todayStr}T00:00:00`).getTime();
        const end = new Date(`${todayStr}T23:59:59.999`).getTime();
        return orderTime >= start && orderTime <= end;
      }

      if (datePreset === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = formatDateForInput(y);
        const start = new Date(`${yStr}T00:00:00`).getTime();
        const end = new Date(`${yStr}T23:59:59.999`).getTime();
        return orderTime >= start && orderTime <= end;
      }

      if (datePreset === 'week') {
        const w = new Date();
        w.setDate(w.getDate() - 7);
        const wStr = formatDateForInput(w);
        const start = new Date(`${wStr}T00:00:00`).getTime();
        const end = new Date(`${todayStr}T23:59:59.999`).getTime();
        return orderTime >= start && orderTime <= end;
      }

      if (datePreset === 'month') {
        const m = new Date();
        m.setDate(m.getDate() - 30);
        const mStr = formatDateForInput(m);
        const start = new Date(`${mStr}T00:00:00`).getTime();
        const end = new Date(`${todayStr}T23:59:59.999`).getTime();
        return orderTime >= start && orderTime <= end;
      }

      if (datePreset === 'custom') {
        if (startDate && endDate) {
          const start = new Date(`${startDate}T00:00:00`).getTime();
          const end = new Date(`${endDate}T23:59:59.999`).getTime();
          return orderTime >= start && orderTime <= end;
        }
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00`).getTime();
          const end = new Date(`${startDate}T23:59:59.999`).getTime();
          return orderTime >= start && orderTime <= end;
        }
      }

      return true;
    });
  }, [completedOrders, channelFilter, filterType, cashierFilter, datePreset, startDate, endDate, todayStr]);

  // Aggregate Metrics
  const grossSales = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.subtotal, 0);
  }, [filteredOrders]);

  const totalTax = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.taxAmount, 0);
  }, [filteredOrders]);

  const totalDiscounts = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.discountAmount, 0);
  }, [filteredOrders]);

  const netRevenue = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  }, [filteredOrders]);

  // Channel Breakdown
  const inStoreCompleted = useMemo(
    () => filteredOrders.filter((o) => AppStore.getOrderChannel(o) === 'in_store'),
    [filteredOrders]
  );
  const onlineCompleted = useMemo(
    () => filteredOrders.filter((o) => AppStore.getOrderChannel(o) === 'online'),
    [filteredOrders]
  );

  const inStoreRevenue = useMemo(
    () => inStoreCompleted.reduce((sum, o) => sum + o.totalAmount, 0),
    [inStoreCompleted]
  );
  const onlineRevenue = useMemo(
    () => onlineCompleted.reduce((sum, o) => sum + o.totalAmount, 0),
    [onlineCompleted]
  );

  // Formatted date period label
  const periodLabel = useMemo(() => {
    if (datePreset === 'today') return `Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    if (datePreset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return `Yesterday (${y.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    }
    if (datePreset === 'week') return 'Last 7 Days';
    if (datePreset === 'month') return 'Last 30 Days';
    if (datePreset === 'all') return 'All Time Recorded';
    if (datePreset === 'custom') {
      if (startDate === endDate) {
        return new Date(`${startDate}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return `${new Date(`${startDate}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} – ${new Date(`${endDate}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    return 'Selected Period';
  }, [datePreset, startDate, endDate]);

  // Sorted Transactions based on active column and direction
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    return list.sort((a, b) => {
      let result = 0;
      switch (sortField) {
        case 'receipt':
          result = (a.orderNumber || '').localeCompare(b.orderNumber || '', undefined, { numeric: true });
          break;
        case 'cashier': {
          const nameA = a.cashierName || 'Staff Member';
          const nameB = b.cashierName || 'Staff Member';
          result = nameA.localeCompare(nameB);
          break;
        }
        case 'channel': {
          const chA = AppStore.getOrderChannel(a);
          const chB = AppStore.getOrderChannel(b);
          result = chA.localeCompare(chB);
          break;
        }
        case 'date': {
          const timeA = new Date(a.createdAt).getTime() || 0;
          const timeB = new Date(b.createdAt).getTime() || 0;
          result = timeA - timeB;
          break;
        }
        case 'guest': {
          const guestA = `${a.customerName || ''} ${a.orderType || ''}`.trim();
          const guestB = `${b.customerName || ''} ${b.orderType || ''}`.trim();
          result = guestA.localeCompare(guestB);
          break;
        }
        case 'payment': {
          const payA = a.paymentMethod || '';
          const payB = b.paymentMethod || '';
          result = payA.localeCompare(payB);
          break;
        }
        case 'subtotal':
          result = a.subtotal - b.subtotal;
          break;
        case 'tax':
          result = a.taxAmount - b.taxAmount;
          break;
        case 'total':
          result = a.totalAmount - b.totalAmount;
          break;
        default:
          result = 0;
      }
      return sortDirection === 'asc' ? result : -result;
    });
  }, [filteredOrders, sortField, sortDirection]);

  // Derived Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, safeCurrentPage, pageSize]);

  const startRecord = sortedOrders.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, sortedOrders.length);

  // Smart page numbers calculation with ellipsis
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (safeCurrentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Order Number',
      'Cashier / Server',
      'Sales Channel',
      'Date',
      'Time',
      'Customer Name',
      'Order Type',
      'Table Number',
      'Items Ordered',
      'Total Items Qty',
      'Payment Method',
      'Subtotal (PHP)',
      'VAT (PHP)',
      'Discount (PHP)',
      'Total Amount (PHP)',
      'Status',
    ];

    const rows = filteredOrders.map((o) => {
      const d = new Date(o.createdAt);
      const dateStr = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
      const timeStr = !isNaN(d.getTime())
        ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '';

      const itemsSummary = (o.items || [])
        .map((it) => {
          const varName = it.selectedVariant
            ? typeof it.selectedVariant === 'string'
              ? it.selectedVariant
              : it.selectedVariant.name
            : '';
          return `${it.quantity}x ${it.name}${varName ? ` (${varName})` : ''}`;
        })
        .join('; ');
      const totalQty = (o.items || []).reduce((sum, it) => sum + (it.quantity || 0), 0);
      const ch = AppStore.getOrderChannel(o);
      const channelLabel = ch === 'online' ? 'Online Storefront' : 'In-Store POS';

      return [
        escapeCsv(o.orderNumber),
        escapeCsv(o.cashierName || 'Staff Member'),
        escapeCsv(channelLabel),
        escapeCsv(dateStr),
        escapeCsv(timeStr),
        escapeCsv(o.customerName || 'Walk-in Guest'),
        escapeCsv(
          o.orderType === 'dine_in'
            ? 'Dine-In'
            : o.orderType === 'take_away'
            ? 'Take-Out'
            : 'Delivery'
        ),
        escapeCsv(o.tableNumber ? `Table ${o.tableNumber}` : '-'),
        escapeCsv(itemsSummary),
        escapeCsv(totalQty),
        escapeCsv(o.paymentMethod || 'Cash'),
        escapeCsv(Number(o.subtotal || 0).toFixed(2)),
        escapeCsv(Number(o.taxAmount || 0).toFixed(2)),
        escapeCsv(Number(o.discountAmount || 0).toFixed(2)),
        escapeCsv(Number(o.totalAmount || 0).toFixed(2)),
        escapeCsv(o.status || 'completed'),
      ].join(',');
    });

    // \uFEFF is the UTF-8 Byte Order Mark (BOM) to ensure Microsoft Excel and Google Sheets open the CSV with all columns in individual cells
    const csvContent =
      '\uFEFF' + [headers.map((h) => escapeCsv(h)).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `YellowHauz_SalesReport_${
      datePreset === 'custom' ? `${startDate}_to_${endDate}` : datePreset
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 sm:space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-stone-200 pb-3 sm:pb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-black shrink-0" />
          <div>
            <h2 className="font-display text-lg sm:text-2xl font-extrabold text-stone-900 leading-tight">
              Sales Reports
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Single Button for Period, Channel, and Staff Modal Filters */}
          <button
            type="button"
            id="open-sales-filter-modal-btn"
            onClick={() => setIsFilterModalOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold transition cursor-pointer shadow-2xs ${
              isFilterModified
                ? 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-500/30'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Filter className={`h-3.5 w-3.5 ${isFilterModified ? 'text-amber-600' : 'text-stone-500'}`} />
            <span>Filters</span>
            {isFilterModified && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-stone-950">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 disabled:opacity-50 transition cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-stone-600" />
            <span className="hidden xs:inline">Export CSV</span>
            <span className="xs:hidden">CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-amber-500 px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 rounded-2xl bg-stone-100/90 p-2 sm:p-2.5 border border-stone-200 text-[10px] sm:text-xs">
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-bold text-stone-700 border border-stone-200 shadow-2xs hover:bg-stone-50 cursor-pointer"
          >
            <Clock className="h-3 w-3 text-stone-400" />
            <span className="text-stone-500">Period:</span>
            <span className="text-stone-900 font-extrabold">{periodLabel}</span>
          </button>

          {channelFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-bold text-stone-700 border border-stone-200 shadow-2xs hover:bg-stone-50 cursor-pointer"
            >
              {channelFilter === 'online' ? (
                <Globe className="h-3 w-3 text-indigo-600" />
              ) : (
                <Store className="h-3 w-3 text-amber-600" />
              )}
              <span className="text-stone-500">Channel:</span>
              <span className="text-stone-900 font-extrabold capitalize">
                {channelFilter === 'online' ? 'Online' : 'In-Store'}
              </span>
            </button>
          )}

          {cashierFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-900 border border-amber-200 shadow-2xs hover:bg-amber-100 cursor-pointer"
            >
              <UserCheck className="h-3 w-3 text-amber-700" />
              <span className="text-stone-500">Staff:</span>
              <span className="font-extrabold">{cashierFilter}</span>
            </button>
          )}

          {filterType !== 'all' && (
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-bold text-stone-700 border border-stone-200 shadow-2xs hover:bg-stone-50 cursor-pointer"
            >
              <span className="text-stone-500">Type:</span>
              <span className="text-stone-900 font-extrabold capitalize">
                {filterType.replace('_', ' ')}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {isFilterModified && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] sm:text-[11px] font-bold text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-800 hover:underline px-1 py-0.5 cursor-pointer"
          >
            Edit Filters
          </button>
        </div>
      </div>

      {/* KPI Cards - fits in one row on mobile (grid-cols-3) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 lg:gap-4">
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-2 sm:p-4 lg:p-5 shadow-2xs">
          <span className="block text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 truncate">
            Revenue
          </span>
          <div className="mt-0.5 sm:mt-2 font-display text-xs sm:text-xl lg:text-2xl font-extrabold text-amber-900 font-mono truncate">
            ₱{netRevenue.toFixed(2)}
          </div>
          <p className="mt-0.5 sm:mt-1 text-[8px] sm:text-[11px] text-stone-400 truncate hidden xs:block">
            {filteredOrders.length} settled {filteredOrders.length === 1 ? 'order' : 'orders'}
          </p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-2.5 sm:p-4 lg:p-5 shadow-2xs">
          <span className="block text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 truncate">
            TAX (VAT)
          </span>
          <div className="mt-0.5 sm:mt-2 font-display text-xs sm:text-xl lg:text-2xl font-extrabold text-stone-900 font-mono truncate">
            ₱{totalTax.toFixed(2)}
          </div>
          <p className="mt-0.5 sm:mt-1 text-[8px] sm:text-[11px] text-stone-400 truncate hidden xs:block">
            Official sales tax
          </p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-2.5 sm:p-4 lg:p-5 shadow-2xs">
          <span className="block text-[9px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 truncate">
            Discounts
          </span>
          <div className="mt-0.5 sm:mt-2 font-display text-xs sm:text-xl lg:text-2xl font-extrabold text-emerald-700 font-mono truncate">
            ₱{totalDiscounts.toFixed(2)}
          </div>
          <p className="mt-0.5 sm:mt-1 text-[8px] sm:text-[11px] text-stone-400 truncate hidden xs:block">
            Senior / PWD / Promo
          </p>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <div className="p-3 sm:p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-stone-900">
              Transactions Ledger
            </h3>
            <p className="text-[10px] sm:text-xs text-stone-500 mt-0.5">
              Filtered for <span className="font-semibold text-stone-800">{periodLabel}</span>
              {cashierFilter !== 'all' && (
                <span className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-900">
                  <UserCheck className="h-3 w-3" /> Cashier: {cashierFilter}
                  <button
                    onClick={() => setCashierFilter('all')}
                    className="ml-1 hover:text-amber-950 font-black cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Column Filter Modal Button */}
            <button
              type="button"
              id="ledger-column-filter-btn"
              onClick={() => setIsColumnFilterModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 hover:text-stone-900 transition cursor-pointer"
              title="Filter visible table columns"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-stone-500" />
              <span>Columns</span>
              <span className="rounded-md bg-stone-100 px-1.5 py-0.2 font-mono text-[9px] sm:text-[10px] font-bold text-stone-700">
                {visibleColumnCount}/{LEDGER_COLUMNS.length}
              </span>
            </button>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-500">
              <label htmlFor="ledger-page-size-top" className="font-bold text-stone-600 hidden md:inline">
                Per page:
              </label>
              <select
                id="ledger-page-size-top"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] sm:text-xs font-bold text-stone-800 focus:border-amber-500 focus:outline-hidden"
              >
                <option value={10}>10 rows</option>
                <option value={15}>15 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>
            </div>

            <span className="text-[10px] sm:text-xs font-mono font-bold bg-stone-100 px-2 py-1 rounded-lg text-stone-600">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] sm:text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[9px] sm:text-[10px]">
              <tr>
                {/* Receipt # */}
                {visibleColumns.receipt && (
                  <th
                    onClick={() => handleSort('receipt')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer select-none group transition hover:bg-stone-100/80"
                    title="Sort by Receipt Number"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span className={sortField === 'receipt' ? 'text-amber-900 font-extrabold' : 'text-stone-600 group-hover:text-stone-900'}>
                        Receipt #
                      </span>
                      {sortField === 'receipt' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-amber-600 font-bold" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-amber-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-60 group-hover:opacity-100 group-hover:text-stone-500 transition-opacity" />
                      )}
                    </div>
                  </th>
                )}

                {/* Cashier / Staff */}
                {visibleColumns.cashier && (
                  <th
                    onClick={() => handleSort('cashier')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer select-none group transition hover:bg-stone-100/80"
                    title="Sort by Cashier / Staff Name"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span className={sortField === 'cashier' ? 'text-amber-900 font-extrabold' : 'text-stone-600 group-hover:text-stone-900'}>
                        Cashier / Staff
                      </span>
                      {sortField === 'cashier' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-amber-600 font-bold" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-amber-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-60 group-hover:opacity-100 group-hover:text-stone-500 transition-opacity" />
                      )}
                    </div>
                  </th>
                )}

                {/* Channel */}
                {visibleColumns.channel && (
                  <th
                    onClick={() => handleSort('channel')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer select-none group transition hover:bg-stone-100/80"
                    title="Sort by Channel"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span className={sortField === 'channel' ? 'text-amber-900 font-extrabold' : 'text-stone-600 group-hover:text-stone-900'}>
                        Channel
                      </span>
                      {sortField === 'channel' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-amber-600 font-bold" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-amber-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-60 group-hover:opacity-100 group-hover:text-stone-500 transition-opacity" />
                      )}
                    </div>
                  </th>
                )}

                {/* Date / Time */}
                {visibleColumns.date && (
                  <th
                    onClick={() => handleSort('date')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer select-none group transition hover:bg-stone-100/80"
                    title="Sort by Date / Time"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span className={sortField === 'date' ? 'text-amber-900 font-extrabold' : 'text-stone-600 group-hover:text-stone-900'}>
                        Date / Time
                      </span>
                      {sortField === 'date' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-amber-600 font-bold" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-amber-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-60 group-hover:opacity-100 group-hover:text-stone-500 transition-opacity" />
                      )}
                    </div>
                  </th>
                )}

                {/* Guest & Type */}
                {visibleColumns.guest && (
                  <th
                    onClick={() => handleSort('guest')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer select-none group transition hover:bg-stone-100/80"
                    title="Sort by Guest & Order Type"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span className={sortField === 'guest' ? 'text-amber-900 font-extrabold' : 'text-stone-600 group-hover:text-stone-900'}>
                        Guest &amp; Type
                      </span>
                      {sortField === 'guest' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-amber-600 font-bold" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-amber-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-60 group-hover:opacity-100 group-hover:text-stone-500 transition-opacity" />
                      )}
                    </div>
                  </th>
                )}

                {/* Payment */}
                {visibleColumns.payment && (
                  <th
                    onClick={() => handleSort('payment')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer select-none group transition hover:bg-stone-100/80"
                    title="Sort by Payment Method"
                  >
                    <div className="inline-flex items-center gap-1.5">
                      <span className={sortField === 'payment' ? 'text-amber-900 font-extrabold' : 'text-stone-600 group-hover:text-stone-900'}>
                        Payment
                      </span>
                      {sortField === 'payment' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-amber-600 font-bold" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-amber-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-60 group-hover:opacity-100 group-hover:text-stone-500 transition-opacity" />
                      )}
                    </div>
                  </th>
                )}

                {/* Subtotal */}
                {visibleColumns.subtotal && (
                  <th
                    onClick={() => handleSort('subtotal')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 text-right cursor-pointer select-none group transition hover:bg-stone-100/80"
                    title="Sort by Subtotal Amount"
                  >
                    <div className="inline-flex items-center justify-end w-full gap-1.5">
                      <span className={sortField === 'subtotal' ? 'text-amber-900 font-extrabold' : 'text-stone-600 group-hover:text-stone-900'}>
                        Subtotal
                      </span>
                      {sortField === 'subtotal' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-amber-600 font-bold" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-amber-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-60 group-hover:opacity-100 group-hover:text-stone-500 transition-opacity" />
                      )}
                    </div>
                  </th>
                )}

                {/* VAT */}
                {visibleColumns.tax && (
                  <th
                    onClick={() => handleSort('tax')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 text-right cursor-pointer select-none group transition hover:bg-stone-100/80"
                    title="Sort by VAT Tax Amount"
                  >
                    <div className="inline-flex items-center justify-end w-full gap-1.5">
                      <span className={sortField === 'tax' ? 'text-amber-900 font-extrabold' : 'text-stone-600 group-hover:text-stone-900'}>
                        VAT
                      </span>
                      {sortField === 'tax' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-amber-600 font-bold" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-amber-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-60 group-hover:opacity-100 group-hover:text-stone-500 transition-opacity" />
                      )}
                    </div>
                  </th>
                )}

                {/* Total */}
                {visibleColumns.total && (
                  <th
                    onClick={() => handleSort('total')}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 text-right cursor-pointer select-none group transition hover:bg-stone-100/80"
                    title="Sort by Total Net Amount"
                  >
                    <div className="inline-flex items-center justify-end w-full gap-1.5">
                      <span className={sortField === 'total' ? 'text-amber-900 font-extrabold' : 'text-stone-600 group-hover:text-stone-900'}>
                        Total
                      </span>
                      {sortField === 'total' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="h-3 w-3 text-amber-600 font-bold" />
                        ) : (
                          <ArrowDown className="h-3 w-3 text-amber-600 font-bold" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-stone-300 opacity-60 group-hover:opacity-100 group-hover:text-stone-500 transition-opacity" />
                      )}
                    </div>
                  </th>
                )}

                {/* Action */}
                {visibleColumns.action && (
                  <th className="px-3 sm:px-4 py-2.5 sm:py-3 text-center text-stone-400">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="px-4 py-10 sm:py-12 text-center text-stone-400">
                    <Calendar className="h-7 w-7 sm:h-8 sm:w-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-bold text-stone-600 text-xs sm:text-sm">No transactions found</p>
                    <p className="text-[10px] sm:text-[11px] text-stone-400 mt-0.5">
                      No settled orders found for the selected filter criteria ({periodLabel}).
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord) => {
                  const ch = AppStore.getOrderChannel(ord);
                  const isOnline = ch === 'online';
                  const orderDate = new Date(ord.createdAt);
                  const isOnlineCashier = (ord.cashierName || '').includes('Online');

                  return (
                    <tr key={ord.id} className="hover:bg-stone-50/70 transition">
                      {/* Receipt */}
                      {visibleColumns.receipt && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-mono font-bold text-stone-900 text-[11px] sm:text-xs">
                          {ord.orderNumber}
                        </td>
                      )}

                      {/* Cashier / Staff */}
                      {visibleColumns.cashier && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <div className="flex items-center gap-1.5 font-bold text-stone-900 text-[11px] sm:text-xs">
                            {isOnlineCashier ? (
                              <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-600 shrink-0" />
                            ) : (
                              <UserCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600 shrink-0" />
                            )}
                            <span className="truncate max-w-[120px] sm:max-w-[140px]">{ord.cashierName || 'Staff Member'}</span>
                          </div>
                          {ord.cashierId && (
                            <div className="text-[9px] sm:text-[10px] text-stone-400 font-mono">
                              ID #{ord.cashierId}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Channel */}
                      {visibleColumns.channel && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase ${
                              isOnline
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isOnline ? (
                              <>
                                <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                Online
                              </>
                            ) : (
                              <>
                                <Store className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                In-Store
                              </>
                            )}
                          </span>
                        </td>
                      )}

                      {/* Date / Time */}
                      {visibleColumns.date && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-stone-600">
                          <div className="font-semibold text-stone-800 text-[10px] sm:text-xs">
                            {orderDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[9px] sm:text-[10px] text-stone-400 font-mono">
                            {orderDate.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                      )}

                      {/* Guest & Type */}
                      {visibleColumns.guest && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                          <div className="font-bold text-stone-900 text-[11px] sm:text-xs">{ord.customerName}</div>
                          <div className="text-[9px] sm:text-[10px] text-stone-400 uppercase">
                            {ord.orderType.replace('_', ' ')} {ord.tableNumber ? `(T#${ord.tableNumber})` : ''}
                          </div>
                        </td>
                      )}

                      {/* Payment */}
                      {visibleColumns.payment && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 uppercase text-stone-700 font-bold text-[10px] sm:text-xs">
                          {ord.paymentMethod}
                        </td>
                      )}

                      {/* Subtotal */}
                      {visibleColumns.subtotal && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-mono text-stone-600 text-[11px] sm:text-xs">
                          ₱{ord.subtotal.toFixed(2)}
                        </td>
                      )}

                      {/* VAT */}
                      {visibleColumns.tax && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-mono text-stone-600 text-[11px] sm:text-xs">
                          ₱{ord.taxAmount.toFixed(2)}
                        </td>
                      )}

                      {/* Total */}
                      {visibleColumns.total && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-right font-mono font-bold text-stone-900 text-[11px] sm:text-xs">
                          ₱{ord.totalAmount.toFixed(2)}
                        </td>
                      )}

                      {/* Action */}
                      {visibleColumns.action && (
                        <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-center">
                          <button
                            onClick={() => onViewReceipt(ord)}
                            className="rounded-lg bg-stone-100 hover:bg-stone-200 px-2 py-1 text-[10px] sm:text-[11px] font-bold text-stone-800 transition cursor-pointer"
                          >
                            Receipt
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Footer */}
        {sortedOrders.length > 0 && (
          <div className="border-t border-stone-200 bg-stone-50/70 px-3 sm:px-5 py-2.5 sm:py-3.5 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-stone-500">
              <div>
                Showing <span className="font-bold text-stone-800">{startRecord}</span> to{' '}
                <span className="font-bold text-stone-800">{endRecord}</span> of{' '}
                <span className="font-bold text-stone-800">{sortedOrders.length}</span> entries
                {totalPages > 1 && (
                  <span className="ml-1.5 text-stone-400">
                    (Page <strong className="text-stone-700">{safeCurrentPage}</strong> of{' '}
                    <strong className="text-stone-700">{totalPages}</strong>)
                  </span>
                )}
              </div>

              <div className="h-3 w-px bg-stone-200 hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-stone-600">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-stone-800 shadow-2xs focus:border-amber-500 focus:outline-hidden"
                >
                  <option value={10}>10 rows</option>
                  <option value={15}>15 rows</option>
                  <option value={25}>25 rows</option>
                  <option value={50}>50 rows</option>
                  <option value={100}>100 rows</option>
                </select>
              </div>
            </div>

            {/* Numbered Pagination Buttons */}
            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="First Page"
                className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
              >
                <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>

              {/* Previous Page */}
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
                className="inline-flex h-7 sm:h-8 items-center gap-1 rounded-xl border border-stone-200 bg-white px-2 sm:px-2.5 text-[10px] sm:text-xs font-bold text-stone-700 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1 mx-0.5 sm:mx-1">
                {paginationRange.map((item, idx) => {
                  if (typeof item === 'string') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-1 text-[10px] sm:text-xs font-bold text-stone-400 select-none"
                      >
                        …
                      </span>
                    );
                  }
                  const isActive = item === safeCurrentPage;
                  return (
                    <button
                      key={`page-${item}`}
                      type="button"
                      onClick={() => setCurrentPage(item)}
                      className={`inline-flex h-7 sm:h-8 min-w-[28px] sm:min-w-[32px] items-center justify-center rounded-xl px-1.5 sm:px-2 text-[10px] sm:text-xs font-extrabold transition shadow-2xs cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-stone-950 font-black ring-2 ring-amber-500/20'
                          : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
                className="inline-flex h-7 sm:h-8 items-center gap-1 rounded-xl border border-stone-200 bg-white px-2 sm:px-2.5 text-[10px] sm:text-xs font-bold text-stone-700 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Last Page"
                className="inline-flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
              >
                <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. SALES REPORT FILTERS MODAL (Period, Channel, Staff, Dining Type)       */}
      {/* ========================================================================= */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl rounded-2xl sm:rounded-3xl border border-stone-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-4 sm:px-6 py-3.5 bg-stone-50/70">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <Filter className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-extrabold text-stone-900">
                    Sales Report Filters
                  </h3>
                  <p className="text-[10px] sm:text-xs text-stone-500">
                    Select period, sales channel, staff member, and dining type
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

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Section 1: Period / Date Preset */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                  Date Period:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'today', label: 'Today' },
                      { id: 'yesterday', label: 'Yesterday' },
                      { id: 'week', label: 'Last 7 Days' },
                      { id: 'month', label: 'Last 30 Days' },
                      { id: 'custom', label: 'Custom Date' },
                      { id: 'all', label: 'All Time' },
                    ] as const
                  ).map((preset) => {
                    const isActive = datePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setDatePreset(preset.id)}
                        className={`rounded-xl px-2.5 py-2 text-xs font-bold transition text-center cursor-pointer border ${
                          isActive
                            ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Pickers */}
                {datePreset === 'custom' && (
                  <div className="mt-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 mb-1">
                          From Date:
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 mb-1">
                          To Date:
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEndDate(startDate)}
                        className="rounded-lg bg-white border border-stone-200 px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
                      >
                        Single Day Only
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStartDate(todayStr);
                          setEndDate(todayStr);
                        }}
                        className="rounded-lg bg-white border border-stone-200 px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100 cursor-pointer"
                      >
                        Set to Today
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Channel */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-600" />
                  Sales Channel:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setChannelFilter('all')}
                    className={`rounded-xl px-2 py-2 text-xs font-bold text-center transition cursor-pointer border ${
                      channelFilter === 'all'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    All Channels
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelFilter('in_store')}
                    className={`rounded-xl px-2 py-2 text-xs font-bold text-center transition cursor-pointer border flex items-center justify-center gap-1 ${
                      channelFilter === 'in_store'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" />
                    In-Store
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannelFilter('online')}
                    className={`rounded-xl px-2 py-2 text-xs font-bold text-center transition cursor-pointer border flex items-center justify-center gap-1 ${
                      channelFilter === 'online'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Online
                  </button>
                </div>
              </div>

              {/* Section 3: Cashier / Staff Filter */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-amber-600" />
                  Staff / Cashier:
                </label>
                <select
                  value={cashierFilter}
                  onChange={(e) => setCashierFilter(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-900 focus:border-amber-500 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Cashiers / Servers</option>
                  {cashierOptions.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} {c.role === 'admin' ? '(Admin)' : c.role === 'cashier' ? '(Cashier)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section 4: Dining Type */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Dining Type:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['all', 'dine_in', 'take_away', 'delivery'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`rounded-xl px-2 py-2 text-xs font-bold capitalize text-center transition cursor-pointer border ${
                        filterType === type
                          ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-stone-200 px-4 sm:px-6 py-3 bg-stone-50/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-stone-500" />
                <span>Reset to Defaults</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-xl bg-amber-500 px-5 py-1.5 text-xs font-black text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TRANSACTIONS LEDGER COLUMN VISIBILITY MODAL                            */}
      {/* ========================================================================= */}
      {isColumnFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-stone-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-4 sm:px-6 py-3.5 bg-stone-50/70">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-extrabold text-stone-900">
                    Transactions Ledger Columns
                  </h3>
                  <p className="text-[10px] sm:text-xs text-stone-500">
                    Choose which columns appear in the transactions ledger ({visibleColumnCount} of {LEDGER_COLUMNS.length} visible)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsColumnFilterModalOpen(false)}
                className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Quick presets */}
              <div>
                <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyColumnPreset('all')}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer border ${
                      visibleColumnCount === LEDGER_COLUMNS.length
                        ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    All Columns (10/10)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyColumnPreset('financial')}
                    className="rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-700 transition cursor-pointer"
                  >
                    Financial Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyColumnPreset('minimal')}
                    className="rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-700 transition cursor-pointer"
                  >
                    Minimal View
                  </button>
                </div>
              </div>

              {/* Column checkboxes */}
              <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/90 overflow-hidden">
                {LEDGER_COLUMNS.map((col) => {
                  const isChecked = visibleColumns[col.key];
                  return (
                    <label
                      key={col.key}
                      className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-stone-50/80 cursor-pointer transition select-none"
                    >
                      <div className="pr-3">
                        <div className="text-xs sm:text-sm font-bold text-stone-900">{col.label}</div>
                        <div className="text-[10px] sm:text-[11px] text-stone-400">{col.description}</div>
                      </div>
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          toggleColumn(col.key);
                        }}
                        className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${
                          isChecked
                            ? 'bg-amber-500 border-amber-600 text-stone-950 shadow-2xs'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-stone-200 px-4 sm:px-6 py-3 bg-stone-50/70 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleApplyColumnPreset('all')}
                className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Show All Columns
              </button>
              <button
                type="button"
                onClick={() => setIsColumnFilterModalOpen(false)}
                className="rounded-xl bg-amber-500 px-5 py-1.5 text-xs font-black text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
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
