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
  Menu,
} from 'lucide-react';

interface NavigationProps {
  appMode: 'customer' | 'staff';
  onSetAppMode: (mode: 'customer' | 'staff') => void;
  customerTab: 'home' | 'menu' | 'orders' | 'reservation' | 'account';
  onSetCustomerTab: (tab: 'home' | 'menu' | 'orders' | 'reservation' | 'account') => void;
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
  const [isBurgerDrawerOpen, setIsBurgerDrawerOpen] = useState(false);
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
        ? 'Menu'
        : customerTab === 'orders'
        ? 'My Orders'
        : customerTab === 'reservation'
        ? 'Reservation'
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
              className="relative flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/50 px-2 py-1 text-[10px] font-extrabold text-amber-300 hover:bg-amber-500/30 transition cursor-pointer"
              title={`${lowStockCount} items have low stock`}
            >
              <Bell className="h-3 w-3 text-amber-400 animate-bounce" />
              <span className="font-black text-amber-200">{lowStockCount}</span>
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
          {/* Main Nav Bar */}
          <div className="mx-auto max-w-7xl px-3 sm:px-8 py-2 sm:py-3 flex items-center justify-between gap-2">
            {/* Left: Burger Menu Button + Brand Logo & Desktop Navigation Tabs */}
            <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
              {/* Hamburger / Burger Menu Button */}
              <button
                id="nav-burger-btn"
                type="button"
                onClick={() => setIsBurgerDrawerOpen(true)}
                title="Open Store & System Menu"
                className="relative flex items-center justify-center rounded-xl p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 transition cursor-pointer border border-stone-200/90 shadow-2xs"
              >
                <Menu className="h-5 w-5" />
                {(lowStockCount > 0 || pendingTableRequestsCount > 0) && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                )}
              </button>

              {/* Brand Logo & Tagline */}
              <div
                onClick={() => {
                  if (appMode === 'customer') onSetCustomerTab('home');
                  else onSetStaffTab('dashboard');
                }}
                className="flex items-center gap-2 cursor-pointer select-none group"
              >
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-2xs group-hover:scale-105 transition">
                  <Coffee className="h-4 w-4 fill-stone-950" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-xs sm:text-sm tracking-tight text-stone-900 leading-none">
                    Yellow Hauz
                  </span>
                  <span className="text-[10px] text-stone-400 font-semibold leading-none mt-0.5 hidden sm:inline">
                    Davao City
                  </span>
                </div>
              </div>

              {/* Desktop Navigation Tabs (Hidden on mobile since bottom navigation bar handles it) */}
              {appMode === 'customer' ? (
                <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => onSetCustomerTab('home')}
                    title="Home"
                    className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      customerTab === 'home'
                        ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Home className="h-4 w-4 text-stone-950" />
                    <span>Home</span>
                  </button>
                  <button
                    onClick={() => onSetCustomerTab('menu')}
                    title="Menu"
                    className={`relative flex items-center gap-1.5 rounded-xl p-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      customerTab === 'menu'
                        ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Utensils className="h-4 w-4 text-stone-950" />
                    <span>Menu</span>
                    {cartCount > 0 && (
                      <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-stone-950">
                        {cartCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => onSetCustomerTab('orders')}
                    title="My Orders & Live Tracking"
                    className={`relative flex items-center gap-1.5 rounded-xl p-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      customerTab === 'orders'
                        ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <ShoppingBag className="h-4 w-4 text-stone-950" />
                    <span>My Orders</span>
                    {activeCustomerOrdersCount > 0 && (
                      <span className="flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-stone-950 animate-pulse">
                        <span>{activeCustomerOrdersCount}</span>
                        <span className="hidden md:inline text-[9px] font-bold">live</span>
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => onSetCustomerTab('reservation')}
                    title="Reservation"
                    className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      customerTab === 'reservation'
                        ? 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Calendar className="h-4 w-4 text-stone-950" />
                    <span>Reservation</span>
                  </button>
                </nav>
              ) : (
                <nav className="hidden sm:flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {activeStaff && (
                    <>
                      {/* Cook: ONLY Kitchen Order Tickets is accessible */}
                      {activeStaff.role === 'cook' ? (
                        <button
                          id="nav-staff-tickets"
                          onClick={() => onSetStaffTab('tickets')}
                          title="Kitchen Order Tickets"
                          className="flex items-center gap-1.5 rounded-xl bg-orange-500 text-stone-950 font-extrabold shadow-sm px-3.5 py-1.5 text-xs transition cursor-pointer"
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
                              className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition cursor-pointer ${
                                staffTab === 'dashboard'
                                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                  : 'text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              <LayoutDashboard className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                              <span>Dashboard</span>
                            </button>
                          )}

                          {/* Shared: Register (POS) */}
                          <button
                            id="nav-staff-pos"
                            onClick={() => onSetStaffTab('pos')}
                            title="Register (POS)"
                            className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition cursor-pointer ${
                              staffTab === 'pos'
                                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <Monitor className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span>Register</span>
                          </button>

                          {/* Shared: Floor Plan / Tables */}
                          <button
                            id="nav-staff-tables"
                            onClick={() => onSetStaffTab('tables')}
                            title="Floor Plan / Tables"
                            className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition cursor-pointer ${
                              staffTab === 'tables'
                                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <LayoutGrid className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span>Floor Plan</span>
                          </button>

                          {/* Shared: Active Order Tickets */}
                          <button
                            id="nav-staff-tickets"
                            onClick={() => onSetStaffTab('tickets')}
                            title="Active Order Tickets"
                            className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition cursor-pointer ${
                              staffTab === 'tickets'
                                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                              : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <ClipboardList className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span>Tickets</span>
                          </button>

                          {/* Admin Only: Reports, Analytics, Inventory, Settings */}
                          {activeStaff.role === 'admin' && (
                            <>
                              <button
                                id="nav-staff-reports"
                                onClick={() => onSetStaffTab('reports')}
                                title="Sales Reports"
                                className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition cursor-pointer ${
                                  staffTab === 'reports'
                                    ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                    : 'text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                <BarChart3 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                <span>Sales</span>
                              </button>
                              <button
                                id="nav-staff-analytics"
                                onClick={() => onSetStaffTab('analytics')}
                                title="Sales Analytics"
                                className={`flex items-center gap-1.5 rounded-xl p-2 sm:px-3 sm:py-1.5 text-xs font-bold transition cursor-pointer ${
                                  staffTab === 'analytics'
                                    ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                    : 'text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                <TrendingUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                <span>Analytics</span>
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
                                <span>Inventory</span>
                                {lowStockCount > 0 && (
                                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-stone-950 border border-amber-500/60 shadow-2xs">
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
                                <span>Settings</span>
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </nav>
              )}
            </div>

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
                      className="flex items-center gap-1.5 rounded-xl bg-stone-900 p-2 sm:px-3.5 sm:py-1.5 text-xs font-bold text-white hover:bg-stone-800 shadow-xs cursor-pointer"
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

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible strictly on mobile screens < sm) */}
      <nav
        id="mobile-bottom-navbar"
        aria-label="Mobile Navigation"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-1.5 py-1.5 safe-area-pb"
      >
        {appMode === 'customer' ? (
          <div className="grid grid-cols-5 items-center justify-around gap-1">
            {/* 1. Home */}
            <button
              id="mobile-nav-home"
              onClick={() => onSetCustomerTab('home')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                customerTab === 'home'
                  ? 'text-amber-900 bg-amber-100/90 font-extrabold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Home className={`h-5 w-5 ${customerTab === 'home' ? 'text-amber-800' : 'text-stone-700'}`} />
              <span className="text-[10px] leading-tight font-medium mt-0.5">Home</span>
            </button>

            {/* 2. Menu */}
            <button
              id="mobile-nav-menu"
              onClick={() => onSetCustomerTab('menu')}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                customerTab === 'menu'
                  ? 'text-amber-900 bg-amber-100/90 font-extrabold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Utensils className={`h-5 w-5 ${customerTab === 'menu' ? 'text-amber-800' : 'text-stone-700'}`} />
              <span className="text-[10px] leading-tight font-medium mt-0.5">Menu</span>
            </button>

            {/* 3. Bag / Cart (Action button) */}
            <button
              id="mobile-nav-bag"
              onClick={onToggleCart}
              className="relative flex flex-col items-center justify-center py-1 px-1 rounded-xl text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
            >
              <div className="relative">
                <ShoppingBag className="h-5 w-5 text-stone-800" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-stone-950 shadow-xs animate-in zoom-in duration-150">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight font-bold mt-0.5">
                Bag {cartCount > 0 ? `(${cartCount})` : ''}
              </span>
            </button>

            {/* 4. Orders */}
            <button
              id="mobile-nav-orders"
              onClick={() => onSetCustomerTab('orders')}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                customerTab === 'orders'
                  ? 'text-amber-900 bg-amber-100/90 font-extrabold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <div className="relative">
                <ClipboardList className={`h-5 w-5 ${customerTab === 'orders' ? 'text-amber-800' : 'text-stone-700'}`} />
                {activeCustomerOrdersCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-stone-950 animate-pulse shadow-xs">
                    {activeCustomerOrdersCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight font-medium mt-0.5">Orders</span>
            </button>

            {/* 5. Account / Sign In / Reservation */}
            <button
              id="mobile-nav-account"
              onClick={() => {
                if (activeCustomer) {
                  onSetCustomerTab('account');
                } else {
                  onCustomerLoginClick();
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                customerTab === 'account'
                  ? 'text-amber-900 bg-amber-100/90 font-extrabold shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {activeCustomer ? (
                <div className="grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[10px] font-extrabold text-stone-950">
                  {activeCustomer.fullName ? activeCustomer.fullName.charAt(0) : 'U'}
                </div>
              ) : (
                <UserIcon className={`h-5 w-5 ${customerTab === 'account' ? 'text-amber-800' : 'text-stone-700'}`} />
              )}
              <span className="text-[10px] leading-tight font-medium mt-0.5 truncate max-w-[56px]">
                {activeCustomer ? (activeCustomer.fullName ? activeCustomer.fullName.split(' ')[0] : 'Account') : 'Sign In'}
              </span>
            </button>
          </div>
        ) : (
          /* Staff Mode Mobile Navigation Bar */
          <div className="flex items-center justify-around gap-1 overflow-x-auto no-scrollbar py-0.5">
            {activeStaff && activeStaff.role === 'cook' ? (
              <>
                <button
                  onClick={() => onSetStaffTab('tickets')}
                  className="flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-xl bg-orange-500 text-stone-950 font-black shadow-xs"
                >
                  <ChefHat className="h-5 w-5" />
                  <span className="text-[10px] leading-tight mt-0.5">Kitchen Tickets</span>
                </button>
                <button
                  onClick={onStaffLogout}
                  className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-[10px] leading-tight mt-0.5">Logout</span>
                </button>
              </>
            ) : (
              <>
                {/* Admin Dashboard */}
                {activeStaff?.role === 'admin' && (
                  <button
                    onClick={() => onSetStaffTab('dashboard')}
                    className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                      staffTab === 'dashboard'
                        ? 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="text-[9px] leading-tight mt-0.5">Dash</span>
                  </button>
                )}

                {/* POS / Register */}
                <button
                  onClick={() => onSetStaffTab('pos')}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                    staffTab === 'pos'
                      ? 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  <span className="text-[9px] leading-tight mt-0.5">POS</span>
                </button>

                {/* Tables Floor Plan */}
                <button
                  onClick={() => onSetStaffTab('tables')}
                  className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                    staffTab === 'tables'
                      ? 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {pendingTableRequestsCount > 0 && (
                    <span className="absolute -top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  )}
                  <span className="text-[9px] leading-tight mt-0.5">Tables</span>
                </button>

                {/* Tickets */}
                <button
                  onClick={() => onSetStaffTab('tickets')}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                    staffTab === 'tickets'
                      ? 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="text-[9px] leading-tight mt-0.5">Tickets</span>
                </button>

                {/* Admin: Sales Reports */}
                {activeStaff?.role === 'admin' && (
                  <button
                    onClick={() => onSetStaffTab('reports')}
                    className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                      staffTab === 'reports'
                        ? 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-[9px] leading-tight mt-0.5">Sales</span>
                  </button>
                )}

                {/* Admin: Inventory */}
                {activeStaff?.role === 'admin' && (
                  <button
                    onClick={() => onSetStaffTab('inventory')}
                    className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                      staffTab === 'inventory'
                        ? 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    {lowStockCount > 0 && (
                      <span className="absolute -top-1 right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-400 px-0.5 text-[8px] font-black text-stone-950">
                        {lowStockCount}
                      </span>
                    )}
                    <span className="text-[9px] leading-tight mt-0.5">Stock</span>
                  </button>
                )}

                {/* Admin: Settings */}
                {activeStaff?.role === 'admin' && (
                  <button
                    onClick={() => onSetStaffTab('settings')}
                    className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                      staffTab === 'settings'
                        ? 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-[9px] leading-tight mt-0.5">Config</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </nav>
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

      {/* BURGER SLIDE-OUT MENU DRAWER */}
      {isBurgerDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsBurgerDrawerOpen(false)}
          />

          {/* Drawer Slide-in Container */}
          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <div className="w-screen max-w-sm sm:max-w-md bg-stone-900 text-white shadow-2xl flex flex-col justify-between overflow-y-auto border-r border-stone-800 animate-in slide-in-from-left duration-200">
              {/* Drawer Top Bar */}
              <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/50">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-stone-950 shadow-md">
                    <Coffee className="h-5 w-5 fill-stone-950" />
                  </div>
                  <div>
                    <h2 className="font-display font-extrabold text-sm sm:text-base text-amber-400 leading-tight">
                      Coffee at Yellow Hauz
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-stone-400">Davao City</span>
                      <span className="text-stone-600">•</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Firestore Cloud DB
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  id="close-burger-menu-btn"
                  onClick={() => setIsBurgerDrawerOpen(false)}
                  className="rounded-xl p-2 text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                  title="Close Navigation Menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="p-4 sm:p-5 space-y-6 flex-1 overflow-y-auto">
                {/* 1. App Experience Switcher */}
                <div>
                  <label className="text-[11px] font-extrabold tracking-wider uppercase text-stone-400 mb-2.5 block">
                    App Experience Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-stone-800/90 rounded-2xl border border-stone-700/80">
                    <button
                      id="burger-mode-customer-btn"
                      onClick={() => {
                        onSetAppMode('customer');
                        setIsBurgerDrawerOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl transition cursor-pointer ${
                        appMode === 'customer'
                          ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                          : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
                      }`}
                    >
                      <ShoppingBag className="h-5 w-5 mb-1" />
                      <span className="text-xs font-bold">Store Mode</span>
                      <span className="text-[10px] opacity-80">Customer Ordering</span>
                    </button>
                    <button
                      id="burger-mode-staff-btn"
                      onClick={() => {
                        onSetAppMode('staff');
                        setIsBurgerDrawerOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl transition cursor-pointer ${
                        appMode === 'staff'
                          ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                          : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
                      }`}
                    >
                      <Monitor className="h-5 w-5 mb-1" />
                      <span className="text-xs font-bold">Staff POS</span>
                      <span className="text-[10px] opacity-80">Cashier / Admin / Cook</span>
                    </button>
                  </div>
                </div>

                {/* 2. Customer Dine-In vs Online Order (When in Customer Mode) */}
                {appMode === 'customer' && (
                  <div>
                    <label className="text-[11px] font-extrabold tracking-wider uppercase text-stone-400 mb-2.5 block">
                      Dining & Service Type
                    </label>
                    <div className="space-y-2">
                      <button
                        id="burger-dinein-btn"
                        onClick={() => {
                          handleDineInClick();
                          setIsBurgerDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                          activeTableBinding
                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                            : 'bg-stone-800/80 border-stone-700/80 text-stone-200 hover:bg-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              activeTableBinding ? 'bg-amber-500 text-stone-950' : 'bg-stone-700 text-stone-300'
                            }`}
                          >
                            <Utensils className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold">Dine-In Table Service</div>
                            <div className="text-[11px] text-stone-400">
                              {activeTableBinding
                                ? `Table #${activeTableBinding.tableNumber} (${
                                    activeTableBinding.area === 'airconditioned' ? 'AC Room' : 'Main Area'
                                  })`
                                : 'Select your table in café'}
                            </div>
                          </div>
                        </div>
                        {activeTableBinding ? (
                          <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-500/40">
                            Active
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400 font-bold">Select</span>
                        )}
                      </button>

                      <button
                        id="burger-online-btn"
                        onClick={() => {
                          handleOnlineClick();
                          setIsBurgerDrawerOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                          !activeTableBinding
                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                            : 'bg-stone-800/80 border-stone-700/80 text-stone-200 hover:bg-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              !activeTableBinding ? 'bg-amber-500 text-stone-950' : 'bg-stone-700 text-stone-300'
                            }`}
                          >
                            <Globe className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold">Online / Advance Booking</div>
                            <div className="text-[11px] text-stone-400">Pick up at store or advance reservation</div>
                          </div>
                        </div>
                        {!activeTableBinding && (
                          <span className="rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2 py-0.5 border border-amber-500/40">
                            Active
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Quick Utilities & Alerts */}
                <div>
                  <label className="text-[11px] font-extrabold tracking-wider uppercase text-stone-400 mb-2.5 block">
                    Quick Utilities
                  </label>
                  <div className="space-y-1.5">
                    {/* AI Chatbot Assistant */}
                    <button
                      id="burger-chatbot-btn"
                      onClick={() => {
                        setIsBurgerDrawerOpen(false);
                        onOpenChatbot();
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-stone-800/80 border border-stone-700/80 text-stone-200 hover:bg-stone-800 hover:text-amber-300 transition cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold">AI Barista & Store Assistant</div>
                        <div className="text-[11px] text-stone-400">Ask about brews, specialty beans, menu pairing</div>
                      </div>
                    </button>

                    {/* Low Stock Alerts */}
                    {(activeStaff || appMode === 'staff') && (
                      <button
                        id="burger-lowstock-btn"
                        onClick={() => {
                          setIsBurgerDrawerOpen(false);
                          if (onOpenLowStockModal) onOpenLowStockModal();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-800/80 border border-stone-700/80 text-stone-200 hover:bg-stone-800 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <Bell className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold">Low Stock Alerts</div>
                            <div className="text-[11px] text-stone-400">Ingredient & inventory threshold warnings</div>
                          </div>
                        </div>
                        {lowStockCount > 0 ? (
                          <span className="rounded-full bg-rose-500 text-white text-[11px] font-black px-2 py-0.5 animate-pulse">
                            {lowStockCount} low
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500">In Stock</span>
                        )}
                      </button>
                    )}

                    {/* Pending Table Requests */}
                    {(activeStaff || appMode === 'staff') && (
                      <button
                        id="burger-tables-btn"
                        onClick={() => {
                          setIsBurgerDrawerOpen(false);
                          onSetStaffTab('tables');
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-800/80 border border-stone-700/80 text-stone-200 hover:bg-stone-800 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <LayoutGrid className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold">Floor Plan & Table Manager</div>
                            <div className="text-[11px] text-stone-400">Customer table requests & live seating</div>
                          </div>
                        </div>
                        {pendingTableRequestsCount > 0 && (
                          <span className="rounded-full bg-amber-500 text-stone-950 text-[11px] font-black px-2 py-0.5 animate-bounce">
                            {pendingTableRequestsCount}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Navbar View Preferences */}
                <div>
                  <label className="text-[11px] font-extrabold tracking-wider uppercase text-stone-400 mb-2.5 block">
                    Navbar View Preferences
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="burger-pin-toggle-btn"
                      onClick={() => {
                        onTogglePin();
                      }}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        isPinned
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                      }`}
                    >
                      {isPinned ? <Pin className="h-3.5 w-3.5 fill-amber-300" /> : <PinOff className="h-3.5 w-3.5" />}
                      <span>{isPinned ? 'Pinned' : 'Unpinned'}</span>
                    </button>

                    <button
                      id="burger-hide-navbar-btn"
                      onClick={() => {
                        if (isPinned) onTogglePin();
                        onSetNavVisible(false);
                        setIsBurgerDrawerOpen(false);
                      }}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-stone-700 bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 text-xs font-bold transition cursor-pointer"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                      <span>Hide Navbar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-stone-800 text-center text-[10px] text-stone-500 bg-stone-950/40">
                Coffee at Yellow Hauz • Davao City POS & Online Ordering
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
