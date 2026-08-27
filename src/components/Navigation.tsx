import React, { useState, useEffect, useMemo } from 'react';
import { User, CustomerAccount, TableBinding, Table } from '../types';
import { AppStore } from '../services/store';
import { TableRequestModal } from './customer/TableRequestModal';
import {
  Coffee,
  ShoppingBag,
  Calendar,
  User as UserIcon,
  Monitor,
  LayoutGrid,
  ClipboardList,
  BarChart3,
  TrendingUp,
  Package,
  Settings,
  Bot,
  LogOut,
  Sparkles,
  Pin,
  PinOff,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Bell,
  AlertTriangle,
  Building,
  Home,
  Utensils,
  LayoutDashboard,
  ChefHat,
  Shield,
  Globe,
  Users,
  X,
  CheckCircle2,
} from 'lucide-react';

interface NavigationProps {
  appMode: 'customer' | 'staff';
  onSetAppMode: (mode: 'customer' | 'staff') => void;
  customerTab: 'home' | 'menu' | 'orders' | 'reservation' | 'venue' | 'account';
  onSetCustomerTab: (tab: 'home' | 'menu' | 'orders' | 'reservation' | 'venue' | 'account') => void;
  staffTab: 'dashboard' | 'pos' | 'tables' | 'tickets' | 'reports' | 'analytics' | 'inventory' | 'settings';
  onSetStaffTab: (tab: 'dashboard' | 'pos' | 'tables' | 'tickets' | 'reports' | 'analytics' | 'inventory' | 'settings') => void;
  activeStaff: User | null;
  activeCustomer: CustomerAccount | null;
  activeTableBinding?: TableBinding | null;
  onClearTableBinding?: () => void;
  onOpenTableBindingModal?: () => void;
  onBindTable?: (tableNumber: number) => void;
  onStaffLogout: () => void;
  onCustomerLogout?: () => void;
  onCustomerLoginClick: () => void;
  onOpenChatbot: () => void;
  cartCount: number;
  isPinned: boolean;
  onTogglePin: () => void;
  isNavVisible: boolean;
  onSetNavVisible: (visible: boolean) => void;
  onOpenLowStockModal?: () => void;
  onToggleCart?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  appMode,
  onSetAppMode,
  customerTab,
  onSetCustomerTab,
  staffTab,
  onSetStaffTab,
  activeStaff,
  activeCustomer,
  activeTableBinding,
  onClearTableBinding,
  onOpenTableBindingModal,
  onBindTable,
  onStaffLogout,
  onCustomerLogout,
  onCustomerLoginClick,
  onOpenChatbot,
  cartCount,
  isPinned,
  onTogglePin,
  isNavVisible,
  onSetNavVisible,
  onOpenLowStockModal,
  onToggleCart,
}) => {
  const [isHoverPeek, setIsHoverPeek] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [pendingTableRequestsCount, setPendingTableRequestsCount] = useState<number>(() => {
    return AppStore.getPendingTableRequests().length;
  });
  const [lowStockCount, setLowStockCount] = useState<number>(() => {
    return AppStore.getLowStockItems(5).length;
  });
  const [activeCustomerOrdersCount, setActiveCustomerOrdersCount] = useState<number>(() => {
    const orders = AppStore.getOrders();
    const isActiveStatus = (st: string) =>
      st === 'to_confirm' || st === 'pending' || st === 'to_prep' || st === 'processing' || st === 'to_serve';
    if (activeCustomer) {
      return orders.filter(
        (o) =>
          (o.customerId === activeCustomer.id ||
            (o.customerName && o.customerName.toLowerCase() === activeCustomer.fullName.toLowerCase())) &&
          isActiveStatus(o.status)
      ).length;
    }
    return orders.filter((o) => isActiveStatus(o.status)).length;
  });

  const tables: Table[] = useMemo(() => AppStore.getTables(), []);

  useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setLowStockCount(AppStore.getLowStockItems(5).length);
      setPendingTableRequestsCount(AppStore.getPendingTableRequests().length);
      const orders = AppStore.getOrders();
      const isActiveStatus = (st: string) =>
        st === 'to_confirm' || st === 'pending' || st === 'to_prep' || st === 'processing' || st === 'to_serve';
      if (activeCustomer) {
        setActiveCustomerOrdersCount(
          orders.filter(
            (o) =>
              (o.customerId === activeCustomer.id ||
                (o.customerName && o.customerName.toLowerCase() === activeCustomer.fullName.toLowerCase())) &&
              isActiveStatus(o.status)
          ).length
        );
      } else {
        setActiveCustomerOrdersCount(
          orders.filter((o) => isActiveStatus(o.status)).length
        );
      }
    });
    return () => unsub();
  }, [activeCustomer]);

  const handleTableConfirmedByCashier = (binding: TableBinding) => {
    if (onBindTable) {
      onBindTable(binding.tableNumber);
    }
  };

  const handleDineInClick = () => {
    if (onOpenTableBindingModal) {
      onOpenTableBindingModal();
    } else {
      setIsTableModalOpen(true);
    }
  };

  const handleOnlineClick = () => {
    if (onClearTableBinding) {
      onClearTableBinding();
    } else {
      AppStore.setActiveTableBinding(null);
    }
  };

  const shouldShowFullNav = isPinned || isNavVisible || isHoverPeek;

  // Active tab label for compact floating indicator
  const activeTabLabel =
    appMode === 'customer'
      ? customerTab === 'home'
        ? 'Home'
        : customerTab === 'menu'
        ? 'Menu & Ordering'
        : customerTab === 'orders'
        ? 'My Orders'
        : customerTab === 'reservation'
        ? 'Reserve Table'
        : customerTab === 'venue'
        ? 'Venue Rental'
        : 'My Account'
      : staffTab === 'dashboard'
      ? 'Dashboard'
      : staffTab === 'pos'
      ? 'Register'
      : staffTab === 'tables'
      ? 'Floor Plan'
      : staffTab === 'tickets'
      ? 'Order Tickets'
      : staffTab === 'reports'
      ? 'Sales Reports'
      : staffTab === 'analytics'
      ? 'Analytics'
      : staffTab === 'inventory'
      ? 'Inventory'
      : 'Settings';

  return (
    <>
      {/* Floating Compact Bar when Nav is Hidden/Unpinned */}
      {!shouldShowFullNav && (
        <div className="fixed top-2.5 right-4 z-40 flex items-center gap-1.5 rounded-full bg-stone-900/95 text-white shadow-xl backdrop-blur-md px-3 py-1.5 border border-stone-700/80 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => onSetNavVisible(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition cursor-pointer"
            title="Expand Navigation Bar"
          >
            <Coffee className="h-4 w-4" />
            <span className="hidden sm:inline font-display">Yellow Hauz</span>
            <span className="text-stone-500">•</span>
            <span className="text-white text-[11px] font-sans font-semibold bg-stone-800 px-2 py-0.5 rounded-full">
              {activeTabLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          </button>

          {/* In-App Low Stock Alert button in compact mode for Cashier/Admin */}
          {(activeStaff || appMode === 'staff') && lowStockCount > 0 && (
            <button
              onClick={onOpenLowStockModal}
              className="relative flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-1 text-[10px] font-extrabold text-rose-300 hover:bg-rose-500/30 transition cursor-pointer"
              title={`${lowStockCount} items have low stock`}
            >
              <Bell className="h-3 w-3 animate-bounce" />
              <span>{lowStockCount}</span>
            </button>
          )}

          <div className="h-3.5 w-px bg-stone-700 mx-1" />

          {/* Quick Chatbot */}
          <button
            onClick={onOpenChatbot}
            className="rounded-full p-1 text-amber-400 hover:bg-stone-800 transition cursor-pointer"
            title="AI Assistant"
          >
            <Bot className="h-3.5 w-3.5" />
          </button>

          {/* Pin Button */}
          <button
            onClick={() => {
              onTogglePin();
              onSetNavVisible(true);
            }}
            className="flex items-center gap-1 rounded-full bg-amber-500 text-stone-950 px-2.5 py-1 text-[11px] font-extrabold hover:bg-amber-400 shadow-xs transition cursor-pointer"
            title="Pin Navigation Bar to keep it permanently visible"
          >
            <Pin className="h-3 w-3 fill-stone-950" />
            <span className="text-[10px]">Pin</span>
          </button>
        </div>
      )}

      {/* Top Edge Hover Reveal Trigger Area when collapsed */}
      {!isPinned && !isNavVisible && (
        <div
          onMouseEnter={() => setIsHoverPeek(true)}
          onMouseLeave={() => setIsHoverPeek(false)}
          className="fixed top-0 left-0 right-0 h-2.5 z-30 cursor-pointer"
          title="Hover to reveal navigation"
        />
      )}

      {/* Full Navigation Header */}
      {shouldShowFullNav && (
        <header
          onMouseEnter={() => {
            if (!isPinned) setIsHoverPeek(true);
          }}
          onMouseLeave={() => {
            if (!isPinned) setIsHoverPeek(false);
          }}
          className={`sticky top-0 z-40 border-b border-stone-200/90 bg-white/95 backdrop-blur-md transition-all duration-200 ${
            !isPinned ? 'shadow-md ring-1 ring-black/5' : ''
          }`}
        >
          {/* Top Banner: Mode switcher, Pin toggle & quick identity */}
          <div className="border-b border-stone-100 bg-stone-900 text-white px-4 sm:px-8 py-2 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-display font-bold tracking-tight text-amber-400">
                <Coffee className="h-4 w-4" />
                <span>Coffee at Yellow Hauz</span>
              </div>
              <span className="hidden sm:inline text-stone-500">•</span>
              <span className="hidden sm:inline text-stone-400 text-[11px]">Davao City</span>
              <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Firestore Cloud DB
              </span>
            </div>

            {/* Global Controls & Mode Switcher */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Customer Dine-In vs Online Mode Toggle */}
              {appMode === 'customer' && (
                <div className="flex items-center rounded-full bg-stone-800 p-0.5 border border-stone-700 shadow-2xs">
                  <button
                    type="button"
                    onClick={handleDineInClick}
                    title={
                      activeTableBinding
                        ? `Dine-In Active (Table #${activeTableBinding.tableNumber}). Click to change table.`
                        : 'Switch to In-House Dine-In Table Ordering'
                    }
                    className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-1 text-[11px] font-bold transition cursor-pointer ${
                      activeTableBinding
                        ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs'
                        : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
                    }`}
                  >
                    <Utensils className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Dine-In</span>
                    {activeTableBinding ? (
                      <span className="flex items-center gap-1 rounded-full bg-stone-950/20 px-1.5 py-0.2 text-[10px] font-black">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>#{activeTableBinding.tableNumber}</span>
                      </span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    onClick={handleOnlineClick}
                    title="Switch to Online Ordering (Advance Booking)"
                    className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-1 text-[11px] font-bold transition cursor-pointer ${
                      !activeTableBinding
                        ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs'
                        : 'text-stone-300 hover:text-white hover:bg-stone-700/60'
                    }`}
                  >
                    <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>Online</span>
                  </button>
                </div>
              )}

              {/* Mode Switcher Pill */}
              <div className="flex items-center rounded-full bg-stone-800 p-0.5 border border-stone-700">
                <button
                  onClick={() => onSetAppMode('customer')}
                  title="Customer Store"
                  className={`flex items-center gap-1 rounded-full p-1.5 sm:px-3 sm:py-1 text-[11px] font-bold transition cursor-pointer ${
                    appMode === 'customer'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Store</span>
                </button>
                <button
                  onClick={() => onSetAppMode('staff')}
                  title="Staff POS Terminal"
                  className={`flex items-center gap-1 rounded-full p-1.5 sm:px-3 sm:py-1 text-[11px] font-bold transition cursor-pointer ${
                    appMode === 'staff'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Staff POS</span>
                </button>
              </div>

              {/* Chatbot Assistant */}
              <button
                onClick={onOpenChatbot}
                title="AI Assistant"
                className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 p-1.5 sm:px-2.5 sm:py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
              >
                <Bot className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Assistant</span>
              </button>

              {/* Low Stock Alerts in Top Banner for Cashier / Admin */}
              {(activeStaff || appMode === 'staff') && lowStockCount > 0 && (
                <button
                  onClick={onOpenLowStockModal}
                  className="flex items-center gap-1 rounded-full bg-rose-600/30 border border-rose-500/60 p-1.5 sm:px-2.5 sm:py-1 text-[11px] font-bold text-rose-200 hover:bg-rose-600/40 transition cursor-pointer"
                  title={`${lowStockCount} items low in stock`}
                >
                  <Bell className="h-3 w-3 text-rose-300 animate-bounce" />
                  <span className="text-[10px] font-bold">{lowStockCount}</span>
                  <span className="hidden sm:inline">Low Stock</span>
                </button>
              )}

              {/* Pending Table Requests Alert for Cashier */}
              {(activeStaff || appMode === 'staff') && pendingTableRequestsCount > 0 && (
                <button
                  onClick={() => onSetStaffTab('tables')}
                  className="flex items-center gap-1 rounded-full bg-amber-500 text-stone-950 px-2.5 py-1 text-[11px] font-black animate-pulse shadow-xs hover:bg-amber-400 transition cursor-pointer"
                  title={`${pendingTableRequestsCount} customer table requests waiting for cashier confirmation`}
                >
                  <Bell className="h-3.5 w-3.5 fill-stone-950" />
                  <span>{pendingTableRequestsCount} Table Req</span>
                </button>
              )}

              <div className="h-4 w-px bg-stone-700 hidden sm:block" />

              {/* Pin / Unpin Navbar Toggle */}
              <button
                onClick={onTogglePin}
                title={
                  isPinned
                    ? 'Navbar is Pinned (always visible). Click to unpin.'
                    : 'Navbar is Unpinned. Click to Pin permanently.'
                }
                className={`flex items-center gap-1.5 rounded-full p-1.5 sm:px-2.5 sm:py-1 text-[11px] font-bold border transition ${
                  isPinned
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-stone-200 hover:bg-stone-700'
                }`}
              >
                {isPinned ? (
                  <>
                    <Pin className="h-3 w-3 fill-amber-300 text-amber-300" />
                    <span className="hidden sm:inline">Pinned</span>
                  </>
                ) : (
                  <>
                    <PinOff className="h-3 w-3" />
                    <span className="hidden sm:inline">Unpinned</span>
                  </>
                )}
              </button>

              {/* Collapse / Hide Navbar Button */}
              <button
                onClick={() => {
                  if (isPinned) {
                    onTogglePin(); // Unpin when collapsing
                  }
                  onSetNavVisible(false);
                  setIsHoverPeek(false);
                }}
                title="Hide Navigation Bar"
                className="flex items-center gap-1 rounded-full bg-stone-800 border border-stone-700 p-1.5 sm:px-2.5 sm:py-1 text-[11px] font-bold text-stone-300 hover:text-white hover:bg-stone-700 transition"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Hide</span>
              </button>
            </div>
          </div>

          {/* Main Nav Bar */}
          <div className="mx-auto max-w-7xl px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
            {/* Navigation Tabs based on Mode */}
            {appMode === 'customer' ? (
              <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => onSetCustomerTab('home')}
                  title="Home"
                  className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold transition ${
                    customerTab === 'home'
                      ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Home className="h-4 w-4 text-stone-950" />
                  <span className="hidden sm:inline">Home</span>
                </button>
                <button
                  onClick={() => onSetCustomerTab('menu')}
                  title="Menu & Ordering"
                  className={`relative flex items-center gap-1.5 rounded-xl p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold transition ${
                    customerTab === 'menu'
                      ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Utensils className="h-4 w-4 text-stone-950" />
                  <span className="hidden sm:inline">Menu &amp; Ordering</span>
                  {cartCount > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-stone-950">
                      {cartCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onSetCustomerTab('orders')}
                  title="My Orders & Live Tracking"
                  className={`relative flex items-center gap-1.5 rounded-xl p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                    customerTab === 'orders'
                      ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <ShoppingBag className="h-4 w-4 text-stone-950" />
                  <span className="hidden sm:inline">My Orders</span>
                  {activeCustomerOrdersCount > 0 && (
                    <span className="flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-stone-950 animate-pulse">
                      <span>{activeCustomerOrdersCount}</span>
                      <span className="hidden md:inline text-[9px] font-bold">live</span>
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onSetCustomerTab('reservation')}
                  title="Reserve Table"
                  className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold transition ${
                    customerTab === 'reservation'
                      ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Calendar className="h-4 w-4 text-stone-950" />
                  <span className="hidden sm:inline">Reserve Table</span>
                </button>
                <button
                  onClick={() => onSetCustomerTab('venue')}
                  title="Venue Rental"
                  className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold transition ${
                    customerTab === 'venue'
                      ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Building className="h-4 w-4 text-stone-950" />
                  <span className="hidden sm:inline">Venue Rental</span>
                </button>
              </nav>
            ) : (
              <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {activeStaff && (
                  <>
                    {/* Cook: ONLY Kitchen Order Tickets is accessible */}
                    {activeStaff.role === 'cook' ? (
                      <button
                        id="nav-staff-tickets"
                        onClick={() => onSetStaffTab('tickets')}
                        title="Kitchen Order Tickets"
                        className="flex items-center gap-1.5 rounded-xl bg-orange-500 text-stone-950 font-extrabold shadow-sm px-3.5 py-1.5 text-xs transition"
                      >
                        <ChefHat className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        <span>Kitchen Tickets</span>
                        <span className="rounded-full bg-stone-950 text-orange-400 text-[10px] px-1.5 py-0.2 font-mono">
                          Cook Mode
                        </span>
                      </button>
                    ) : (
                      <>
                        {/* Admin Only: Executive Dashboard */}
                        {activeStaff.role === 'admin' && (
                          <button
                            id="nav-staff-dashboard"
                            onClick={() => onSetStaffTab('dashboard')}
                            title="Admin Dashboard"
                            className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition ${
                              staffTab === 'dashboard'
                                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <LayoutDashboard className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span className="hidden sm:inline">Dashboard</span>
                          </button>
                        )}

                        {/* Shared: Register (POS) */}
                        <button
                          id="nav-staff-pos"
                          onClick={() => onSetStaffTab('pos')}
                          title="Register (POS)"
                          className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition ${
                            staffTab === 'pos'
                              ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                              : 'text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <Monitor className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          <span className="hidden sm:inline">Register</span>
                        </button>

                        {/* Shared: Floor Plan / Tables */}
                        <button
                          id="nav-staff-tables"
                          onClick={() => onSetStaffTab('tables')}
                          title="Floor Plan / Tables"
                          className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition ${
                            staffTab === 'tables'
                              ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                              : 'text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <LayoutGrid className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          <span className="hidden sm:inline">Floor Plan</span>
                        </button>

                        {/* Shared: Active Order Tickets */}
                        <button
                          id="nav-staff-tickets"
                          onClick={() => onSetStaffTab('tickets')}
                          title="Active Order Tickets"
                          className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition ${
                            staffTab === 'tickets'
                              ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                              : 'text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <ClipboardList className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          <span className="hidden sm:inline">Tickets</span>
                        </button>

                        {/* Admin Only: Reports, Analytics, Inventory, Settings */}
                        {activeStaff.role === 'admin' && (
                          <>
                            <button
                              id="nav-staff-reports"
                              onClick={() => onSetStaffTab('reports')}
                              title="Sales Reports"
                              className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition ${
                                staffTab === 'reports'
                                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                : 'text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              <BarChart3 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              <span className="hidden sm:inline">Sales</span>
                            </button>
                            <button
                              id="nav-staff-analytics"
                              onClick={() => onSetStaffTab('analytics')}
                              title="Sales Analytics"
                              className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition ${
                                staffTab === 'analytics'
                                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                  : 'text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              <TrendingUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              <span className="hidden sm:inline">Analytics</span>
                            </button>
                            <button
                              id="nav-staff-inventory"
                              onClick={() => onSetStaffTab('inventory')}
                              title="Inventory Stock"
                              className={`relative flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition cursor-pointer ${
                                staffTab === 'inventory'
                                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                  : 'text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              <Package className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              <span className="hidden sm:inline">Inventory</span>
                              {lowStockCount > 0 && (
                                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white">
                                  {lowStockCount}
                                </span>
                              )}
                            </button>
                            <button
                              id="nav-staff-settings"
                              onClick={() => onSetStaffTab('settings')}
                              title="System Settings"
                              className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition cursor-pointer ${
                                staffTab === 'settings'
                                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                  : 'text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              <Settings className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              <span className="hidden sm:inline">Settings</span>
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </nav>
            )}

            {/* User Account / Auth Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {appMode === 'customer' ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Table Session / Mode Pill */}
                  {activeTableBinding ? (
                    <div className="flex items-center gap-1 rounded-xl bg-amber-500/15 border border-amber-500/40 pl-2 sm:pl-2.5 pr-1 sm:pr-1.5 py-1 text-xs font-bold text-amber-950 shadow-2xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-[11px] sm:text-xs">
                        Table #{activeTableBinding.tableNumber}
                      </span>
                      <span className="hidden md:inline text-[10px] text-amber-800/80 font-normal">
                        ({activeTableBinding.area === 'airconditioned' ? 'AC Room' : 'Main Area'})
                      </span>
                      {onClearTableBinding && (
                        <button
                          onClick={onClearTableBinding}
                          title="Switch to Online External Mode"
                          className="ml-1 rounded-md p-1 text-amber-800 hover:bg-amber-500/30 hover:text-stone-950 transition cursor-pointer"
                        >
                          <LogOut className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    onOpenTableBindingModal && (
                      <button
                        onClick={onOpenTableBindingModal}
                        title="Sitting in store? Bind session to your table"
                        className="hidden sm:flex items-center gap-1.5 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:border-stone-400 transition cursor-pointer"
                      >
                        <Utensils className="h-3.5 w-3.5 text-stone-950" />
                        <span>I'm at a Table</span>
                      </button>
                    )
                  )}

                  {onToggleCart && (
                    <button
                      onClick={onToggleCart}
                      title="Open Order Bag"
                      className="relative flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 transition cursor-pointer"
                    >
                      <ShoppingBag className="h-4 w-4 text-stone-950" />
                      <span className="hidden sm:inline">Bag</span>
                      {cartCount > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-stone-950">
                          {cartCount}
                        </span>
                      )}
                    </button>
                  )}

                  {activeCustomer ? (
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <button
                        onClick={() => onSetCustomerTab('account')}
                        title={`Account: ${activeCustomer.fullName || 'Customer'}`}
                        className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 p-1.5 sm:px-3 sm:py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 transition cursor-pointer"
                      >
                        <div className="grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[10px] font-extrabold text-stone-950">
                          {(activeCustomer.fullName || 'Customer').charAt(0)}
                        </div>
                        <span className="hidden sm:inline">{activeCustomer.fullName ? activeCustomer.fullName.split(' ')[0] : 'Account'}</span>
                      </button>
                      {onCustomerLogout && (
                        <button
                          onClick={onCustomerLogout}
                          title="Sign Out of Customer Account"
                          className="flex items-center gap-1 rounded-xl border border-stone-200 p-2 sm:px-2.5 sm:py-1.5 text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          <span className="hidden sm:inline">Sign Out</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={onCustomerLoginClick}
                      title="Customer Sign In"
                      className="flex items-center gap-1.5 rounded-xl bg-stone-900 p-2 sm:px-3.5 sm:py-1.5 text-xs font-bold text-white hover:bg-stone-800 shadow-xs"
                    >
                      <UserIcon className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Customer Sign In</span>
                    </button>
                  )}
                </div>
              ) : activeStaff ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span
                    className={`hidden sm:inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                      activeStaff.role === 'admin'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : activeStaff.role === 'cook'
                        ? 'bg-orange-100 text-orange-950 border border-orange-200 font-black'
                        : 'bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {activeStaff.role === 'admin' ? (
                      <Shield className="h-3 w-3 text-purple-700" />
                    ) : activeStaff.role === 'cook' ? (
                      <ChefHat className="h-3 w-3 text-orange-700" />
                    ) : null}
                    <span>
                      {activeStaff.role || 'Staff'} • {(activeStaff.fullName || activeStaff.name || 'Staff').split(' ')[0]}
                    </span>
                  </span>
                  <button
                    onClick={onStaffLogout}
                    title="Logout Staff"
                    className="flex items-center gap-1 rounded-xl border border-stone-200 p-2 sm:px-2.5 sm:py-1.5 text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
      )}

      {/* Live Table Request & Cashier Confirmation Modal for Customer Dine-In Ordering (fallback if not controlled by App) */}
      {!onOpenTableBindingModal && (
        <TableRequestModal
          isOpen={isTableModalOpen}
          onClose={() => setIsTableModalOpen(false)}
          onConfirmed={handleTableConfirmedByCashier}
          activeCustomer={activeCustomer}
          currentTableBinding={activeTableBinding}
        />
      )}
    </>
  );
};
