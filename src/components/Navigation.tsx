import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, CustomerAccount, TableBinding, Table, Order, StaffTabType, OrderItem, OrderStatus } from '../types';
import { AppStore } from '../services/store';
import { TableRequestModal } from './customer/TableRequestModal';
import { StaffNotificationCenterModal } from './pos/StaffNotificationCenterModal';
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
  PackagePlus,
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
  Ban,
  ChevronRight,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Clock,
  AlertCircle,
  Receipt,
  ArrowRight,
} from 'lucide-react';

interface NavigationProps {
  appMode: 'customer' | 'staff';
  onSetAppMode: (mode: 'customer' | 'staff') => void;
  customerTab: 'home' | 'menu' | 'orders' | 'reservation' | 'account';
  onSetCustomerTab: (tab: 'home' | 'menu' | 'orders' | 'reservation' | 'account') => void;
  staffTab: StaffTabType;
  onSetStaffTab: (tab: StaffTabType) => void;
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
  onViewOrderReceipt?: (order: Order) => void;
  isDarkMode?: boolean;
  onSetDarkMode?: (isDark: boolean) => void;
  isCustomerCartOpen?: boolean;
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
  onViewOrderReceipt,
  isDarkMode: isDarkModeProp,
  onSetDarkMode,
  isCustomerCartOpen,
}) => {
  const [internalDarkMode, setInternalDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const isDarkMode = isDarkModeProp !== undefined ? isDarkModeProp : internalDarkMode;

  const handleSetTheme = (dark: boolean) => {
    if (onSetDarkMode) {
      onSetDarkMode(dark);
    } else {
      setInternalDarkMode(dark);
      if (dark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  };

  const [isHoverPeek, setIsHoverPeek] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isBurgerDrawerOpen, setIsBurgerDrawerOpen] = useState(false);
  const [isStaffNotificationModalOpen, setIsStaffNotificationModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (!isCurrentlyFullscreen) {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } else {
        const doc = document as any;
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed or restricted in iframe:', err);
    }
  };
  const [notificationInitialTab, setNotificationInitialTab] = useState<
    'all' | 'no_stock' | 'low_stock' | 'table_confirm' | 'order_confirm' | 'cancellations'
  >('all');

  // Real-time notification counters for Staff and Admin
  const [noStockCount, setNoStockCount] = useState<number>(() => {
    return AppStore.getMenuItems().filter((i) => (i.quantity ?? 0) <= 0 || i.isAvailable === false).length;
  });
  const [lowStockCount, setLowStockCount] = useState<number>(() => {
    return AppStore.getMenuItems().filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 5 && i.isAvailable !== false).length;
  });
  const [pendingTableRequestsCount, setPendingTableRequestsCount] = useState<number>(() => {
    return AppStore.getPendingTableRequests().length;
  });
  const [pendingReservationsCount, setPendingReservationsCount] = useState<number>(() => {
    return AppStore.getReservations().filter((r) => r.status === 'pending').length;
  });
  const [pendingOrderConfirmationsCount, setPendingOrderConfirmationsCount] = useState<number>(() => {
    return AppStore.getOrders().filter((o) => o.status === 'to_confirm' || o.status === 'pending').length;
  });
  const [pendingCancellationRequestsCount, setPendingCancellationRequestsCount] = useState<number>(() => {
    return AppStore.getOrders().filter((o) => o.cancellationRequested && o.status !== 'cancelled').length;
  });
  const [pendingRefillCount, setPendingRefillCount] = useState<number>(() => {
    return AppStore.getPendingRefillRequestsCount();
  });

  const [activeCustomerOrdersCount, setActiveCustomerOrdersCount] = useState<number>(() => {
    return AppStore.getActiveCustomerOrdersCount(activeCustomer, activeTableBinding || null);
  });

  const [customerOrders, setCustomerOrders] = useState<Order[]>(() => {
    return AppStore.getCustomerVisibleOrders(activeCustomer, activeTableBinding || null);
  });
  const [isCustomerNotificationsOpen, setIsCustomerNotificationsOpen] = useState(false);
  const [hasReadCustomerNotifications, setHasReadCustomerNotifications] = useState(false);
  const customerNotificationsDropdownRef = useRef<HTMLDivElement>(null);

  const tables: Table[] = useMemo(() => AppStore.getTables(), []);

  // Combined counts
  const totalTableConfirmationsCount = pendingTableRequestsCount + pendingReservationsCount;
  const totalStaffNotificationsCount =
    noStockCount +
    lowStockCount +
    pendingRefillCount +
    totalTableConfirmationsCount +
    pendingOrderConfirmationsCount +
    pendingCancellationRequestsCount;

  useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      const menuItems = AppStore.getMenuItems();
      setNoStockCount(menuItems.filter((i) => (i.quantity ?? 0) <= 0 || i.isAvailable === false).length);
      setLowStockCount(menuItems.filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 5 && i.isAvailable !== false).length);
      setPendingTableRequestsCount(AppStore.getPendingTableRequests().length);
      setPendingReservationsCount(AppStore.getReservations().filter((r) => r.status === 'pending').length);
      setPendingRefillCount(AppStore.getPendingRefillRequestsCount());
      
      const orders = AppStore.getOrders();
      setPendingOrderConfirmationsCount(
        orders.filter((o) => o.status === 'to_confirm' || o.status === 'pending').length
      );
      setPendingCancellationRequestsCount(
        orders.filter((o) => o.cancellationRequested && o.status !== 'cancelled').length
      );

      const custOrders = AppStore.getCustomerVisibleOrders(activeCustomer, activeTableBinding || null);
      setCustomerOrders(custOrders);
      setActiveCustomerOrdersCount(
        AppStore.getActiveCustomerOrdersCount(activeCustomer, activeTableBinding || null)
      );
    });
    return () => unsub();
  }, [activeCustomer, activeTableBinding]);

  // Close customer notifications on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        customerNotificationsDropdownRef.current &&
        !customerNotificationsDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCustomerNotificationsOpen(false);
      }
    };
    if (isCustomerNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomerNotificationsOpen]);

  // Derived customer notifications
  const hasUnreadCustomerAlerts =
    activeCustomerOrdersCount > 0 || (!hasReadCustomerNotifications && customerOrders.length > 0);

  const sortedCustomerOrders = useMemo(() => {
    const isActive = (st: string) =>
      st === 'to_confirm' ||
      st === 'pending' ||
      st === 'to_prep' ||
      st === 'processing' ||
      st === 'to_serve';

    return [...customerOrders].sort((a, b) => {
      const aActive = isActive(a.status);
      const bActive = isActive(b.status);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    });
  }, [customerOrders]);

  const formatCustomerOrderTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getCustomerOrderStatusInfo = (status: OrderStatus, orderType: string, tableNumber?: number | null) => {
    switch (status) {
      case 'to_confirm':
      case 'pending':
        return {
          title: 'Awaiting Cashier Confirmation',
          description: 'Your order was received and is waiting for store confirmation before heading to the kitchen.',
          badgeText: 'To Confirm',
          badgeClass: isDarkMode
            ? 'bg-amber-950/80 text-amber-300 border-amber-800'
            : 'bg-amber-100 text-amber-900 border-amber-300',
          dotClass: 'bg-amber-500 animate-pulse',
          step: 1,
        };
      case 'to_prep':
      case 'processing':
        return {
          title: 'Kitchen is Preparing Your Order',
          description: 'Our chefs and baristas are currently preparing your drinks and dishes.',
          badgeText: 'In Kitchen Prep',
          badgeClass: isDarkMode
            ? 'bg-sky-950/80 text-sky-300 border-sky-800'
            : 'bg-sky-100 text-sky-900 border-sky-300',
          dotClass: 'bg-sky-500 animate-pulse',
          step: 2,
        };
      case 'to_serve':
        return {
          title: '🎉 Order is Ready!',
          description:
            orderType === 'dine_in'
              ? tableNumber
                ? `Server is delivering directly to Table #${tableNumber}.`
                : 'Your dine-in order is ready to be served.'
              : orderType === 'delivery'
              ? 'Your order is on the way with our delivery rider.'
              : 'Packed and waiting for you at the pick-up counter.',
          badgeText: 'Ready to Serve / Pick Up',
          badgeClass: isDarkMode
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700 ring-2 ring-emerald-500/20'
            : 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-2 ring-emerald-500/20',
          dotClass: 'bg-emerald-500 animate-ping',
          step: 3,
        };
      case 'completed':
        return {
          title: 'Order Served & Completed',
          description: 'Served and settled. Thank you for dining with Yellow Hauz!',
          badgeText: 'Completed',
          badgeClass: isDarkMode
            ? 'bg-stone-800 text-stone-300 border-stone-700'
            : 'bg-stone-100 text-stone-700 border-stone-200',
          dotClass: 'bg-stone-400',
          step: 4,
        };
      case 'cancelled':
        return {
          title: 'Order Cancelled',
          description: 'This order has been cancelled.',
          badgeText: 'Cancelled',
          badgeClass: isDarkMode
            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
            : 'bg-rose-100 text-rose-800 border-rose-200',
          dotClass: 'bg-rose-500',
          step: 0,
        };
      default:
        return {
          title: 'Order Status Update',
          description: 'Your order status has been updated.',
          badgeText: status,
          badgeClass: isDarkMode
            ? 'bg-stone-800 text-stone-300 border-stone-700'
            : 'bg-stone-100 text-stone-700 border-stone-200',
          dotClass: 'bg-amber-500',
          step: 1,
        };
    }
  };

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
      AppStore.exitTable(Boolean(activeCustomer));
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
        ? 'Orders'
        : customerTab === 'reservation'
        ? 'Reserve'
        : 'My Account'
      : staffTab === 'dashboard'
      ? 'Dashboard'
      : staffTab === 'pos'
      ? 'Cashier'
      : staffTab === 'tables'
      ? 'Tables'
      : staffTab === 'tickets'
      ? 'Order Tickets'
      : staffTab === 'reports'
      ? 'Sales Reports'
      : staffTab === 'analytics'
      ? 'Analytics'
      : staffTab === 'inventory'
      ? 'Inventory'
      : staffTab === 'refills'
      ? 'Supplies & Refills'
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
            <img
              src="/images/Coffeatyellowhauz_logo.jpg"
              alt="Yellow Hauz Logo"
              className="h-5 w-5 rounded-full object-cover border border-amber-400/60 shadow-xs"
              onError={(e) => {
                // Fallback to coffee icon if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <span className="hidden sm:inline font-display">Yellow Hauz</span>
            <span className="text-stone-500">•</span>
            <span className="text-white text-[11px] font-sans font-semibold bg-stone-800 px-2 py-0.5 rounded-full">
              {activeTabLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          </button>

          {/* In-App Alerts / Notification Center button in compact mode for Staff/Admin */}
          {(activeStaff || appMode === 'staff') && (
            <button
              id="compact-staff-notifications-btn"
              onClick={() => {
                setNotificationInitialTab('all');
                setIsStaffNotificationModalOpen(true);
              }}
              className={`relative flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold transition cursor-pointer ${
                totalStaffNotificationsCount > 0
                  ? 'bg-amber-500/20 border border-amber-500/60 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
              title={`Staff Notifications: ${totalStaffNotificationsCount} active alerts (${noStockCount} no stock, ${lowStockCount} low stock, ${totalTableConfirmationsCount} table requests, ${pendingOrderConfirmationsCount} orders)`}
            >
              <Bell className={`h-3 w-3 ${totalStaffNotificationsCount > 0 ? 'text-amber-400 animate-bounce' : 'text-stone-400'}`} />
              <span className="font-black">{totalStaffNotificationsCount}</span>
            </button>
          )}

          <div className="h-3.5 w-px bg-stone-700 mx-1" />

          {/* Quick Chatbot / Customer Concierge */}
          <button
            id="nav-quick-concierge-btn"
            onClick={onOpenChatbot}
            className="rounded-full p-1 text-amber-400 hover:bg-stone-800 transition cursor-pointer"
            title="Yellow Hauz Concierge & AI Barista"
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
          <div className="mx-auto max-w-7xl px-3 sm:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
            {/* Left: Burger Menu Button + Brand Logo & Desktop Navigation Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar">
              {/* Hamburger / Burger Menu Button */}
              <button
                id="nav-burger-btn"
                type="button"
                onClick={() => setIsBurgerDrawerOpen(true)}
                title="Open Store & System Menu"
                className="relative flex items-center justify-center rounded-xl p-1.5 sm:p-2 text-stone-700 hover:text-stone-950 hover:bg-stone-100 transition cursor-pointer border border-stone-200/90 shadow-2xs"
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
                <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-amber-500 shadow-xs border border-amber-400/40 group-hover:scale-105 transition shrink-0 flex items-center justify-center">
                  <img
                    src="/images/Coffeatyellowhauz_logo.jpg"
                    alt="Coffee at Yellow Hauz"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Coffee className="h-4 w-4 fill-stone-950 text-stone-950 absolute pointer-events-none -z-10" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-black text-xs sm:text-sm tracking-tight text-stone-900 leading-none">
                    Yellow Hauz
                  </span>
                </div>
              </div>

              {/* Desktop Navigation Tabs (Hidden on mobile since bottom navigation bar handles it) */}
              {appMode === 'customer' ? (
                <nav className="hidden sm:flex items-center gap-1">
                  <button
                    onClick={() => onSetCustomerTab('home')}
                    title="Home"
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      customerTab === 'home'
                        ? isDarkMode
                          ? 'bg-[#78350f] text-white font-extrabold shadow-2xs'
                          : 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                        : isDarkMode
                        ? 'text-stone-300 hover:text-amber-200 hover:bg-stone-800'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Home className={`h-4 w-4 ${customerTab === 'home' ? (isDarkMode ? 'text-white' : 'text-stone-950') : (isDarkMode ? 'text-stone-300' : 'text-stone-950')}`} />
                    <span>Home</span>
                  </button>
                  <button
                    onClick={() => onSetCustomerTab('menu')}
                    title="Menu"
                    className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      customerTab === 'menu'
                        ? isDarkMode
                          ? 'bg-[#78350f] text-white font-extrabold shadow-2xs'
                          : 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                        : isDarkMode
                        ? 'text-stone-300 hover:text-amber-200 hover:bg-stone-800'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Utensils className={`h-4 w-4 ${customerTab === 'menu' ? (isDarkMode ? 'text-white' : 'text-stone-950') : (isDarkMode ? 'text-stone-300' : 'text-stone-950')}`} />
                    <span>Menu</span>
                    {cartCount > 0 && (
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${isDarkMode ? 'bg-[#78350f] text-white' : 'bg-amber-500 text-stone-950'}`}>
                        {cartCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => onSetCustomerTab('orders')}
                    title="Orders & Live Tracking"
                    className={`relative flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      customerTab === 'orders'
                        ? isDarkMode
                          ? 'bg-[#78350f] text-white font-extrabold shadow-2xs'
                          : 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                        : isDarkMode
                        ? 'text-stone-300 hover:text-amber-200 hover:bg-stone-800'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <ShoppingBag className={`h-4 w-4 ${customerTab === 'orders' ? (isDarkMode ? 'text-white' : 'text-stone-950') : (isDarkMode ? 'text-stone-300' : 'text-stone-950')}`} />
                    <span>Orders</span>
                  </button>
                  <button
                    onClick={() => onSetCustomerTab('reservation')}
                    title="Reserve"
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-bold transition cursor-pointer ${
                      customerTab === 'reservation'
                        ? isDarkMode
                          ? 'bg-[#78350f] text-white font-extrabold shadow-2xs'
                          : 'bg-amber-100 text-amber-900 font-extrabold shadow-2xs'
                        : isDarkMode
                        ? 'text-stone-300 hover:text-amber-200 hover:bg-stone-800'
                        : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Calendar className={`h-4 w-4 ${customerTab === 'reservation' ? (isDarkMode ? 'text-white' : 'text-stone-950') : (isDarkMode ? 'text-stone-300' : 'text-stone-950')}`} />
                    <span>Reserve</span>
                  </button>
                </nav>
              ) : (
                <nav className="hidden sm:flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {activeStaff && (
                    <>
                      {/* Cook: Kitchen Order Tickets & Supplies/Refills */}
                      {activeStaff.role === 'cook' ? (
                        <>
                          <button
                            id="nav-staff-tickets"
                            onClick={() => onSetStaffTab('tickets')}
                            title="Kitchen Order Tickets"
                            className={`flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                              staffTab === 'tickets'
                                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-sm'
                                : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <ChefHat className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span>Kitchen Tickets</span>
                            <span className="rounded-full bg-stone-950 text-amber-400 text-[10px] px-1.5 py-0.2 font-mono">
                              Cook
                            </span>
                          </button>
                          <button
                            id="nav-staff-cook-refills"
                            onClick={() => onSetStaffTab('refills')}
                            title="Check Supplies & Suggest Item Refills"
                            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                              staffTab === 'refills'
                                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <PackagePlus className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-amber-700" />
                            <span>Supplies &amp; Refills</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Shared: Cashier (POS) */}
                          <button
                            id="nav-staff-pos"
                            onClick={() => onSetStaffTab('pos')}
                            title="Cashier (POS)"
                            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                              staffTab === 'pos'
                                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <Monitor className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span>Cashier</span>
                          </button>

                          {/* Shared: Tables */}
                          <button
                            id="nav-staff-tables"
                            onClick={() => onSetStaffTab('tables')}
                            title="Tables"
                            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                              staffTab === 'tables'
                                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <LayoutGrid className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span>Tables</span>
                          </button>

                          {/* Shared: Active Order Tickets */}
                          <button
                            id="nav-staff-tickets"
                            onClick={() => onSetStaffTab('tickets')}
                            title="Active Order Tickets"
                            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                              staffTab === 'tickets'
                                ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                              : 'text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            <ClipboardList className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            <span>Tickets</span>
                          </button>

                          {/* Non-Admin Staff (Barista, Cashier): Separate Staff Stock & Refills */}
                          {activeStaff.role !== 'admin' && (
                            <button
                              id="nav-staff-refills"
                              onClick={() => onSetStaffTab('refills')}
                              title="Check Stock & Suggest Item Refills"
                              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                                staffTab === 'refills'
                                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                  : 'text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              <PackagePlus className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-amber-700" />
                              <span>Stock &amp; Refills</span>
                            </button>
                          )}

                          {/* Admin Only: Reports, Analytics, Inventory */}
                          {activeStaff.role === 'admin' && (
                            <>
                              <button
                                id="nav-staff-reports"
                                onClick={() => onSetStaffTab('reports')}
                                title="Sales Reports"
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
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
                                title="Analytics"
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                                  staffTab === 'analytics'
                                    ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                    : 'text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                <TrendingUp className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-black" />
                                <span>Analytics</span>
                              </button>
                              <button
                                id="nav-staff-inventory"
                                onClick={() => onSetStaffTab('inventory')}
                                title="Inventory Stock & Refill Approvals"
                                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                                  staffTab === 'inventory'
                                    ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                    : 'text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                <Package className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                                <span>Inventory</span>
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
            <div className="flex items-center gap-1 sm:gap-1.5">
              {appMode === 'customer' ? (
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {/* Table Session / Mode Pill */}
                  {activeTableBinding && (
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
                  )}

                  {/* Top Nav Customer Order Notifications Action Button & Popover */}
                  <div className="relative" ref={customerNotificationsDropdownRef}>
                    <button
                      type="button"
                      id="menu-notifications-btn"
                      onClick={() => {
                        setIsCustomerNotificationsOpen((prev) => !prev);
                        if (!isCustomerNotificationsOpen) {
                          setHasReadCustomerNotifications(true);
                        }
                      }}
                      title={
                        activeCustomerOrdersCount > 0
                          ? `Order Alerts (${activeCustomerOrdersCount} active ${
                              activeCustomerOrdersCount === 1 ? 'order' : 'orders'
                            })`
                          : 'Order Alerts & Notifications'
                      }
                      className={`relative flex items-center justify-center rounded-xl border p-2 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95 ${
                        isCustomerNotificationsOpen
                          ? isDarkMode
                            ? 'border-amber-400 bg-amber-950/70 text-amber-200 ring-2 ring-amber-400/30'
                            : 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30'
                          : activeCustomerOrdersCount > 0
                          ? isDarkMode
                            ? 'border-amber-500/70 bg-amber-950/40 text-amber-100 hover:bg-amber-900/50 ring-2 ring-amber-400/20'
                            : 'border-amber-400/90 bg-amber-500/15 text-stone-950 hover:bg-amber-100 ring-2 ring-amber-400/20'
                          : isDarkMode
                          ? 'border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-950'
                      }`}
                    >
                      <div className="relative">
                        <Bell
                          className={`h-4 w-4 ${
                            activeCustomerOrdersCount > 0
                              ? isDarkMode
                                ? 'text-amber-400 fill-amber-500/40'
                                : 'text-amber-700 fill-amber-500'
                              : isDarkMode
                              ? 'text-stone-300'
                              : 'text-stone-700'
                          }`}
                        />
                        {hasUnreadCustomerAlerts && (
                          <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[8px] font-black text-stone-950 ring-1 ring-white animate-pulse">
                            {activeCustomerOrdersCount > 0 ? activeCustomerOrdersCount : '•'}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Customer Notifications & Live Order Tracking Popover */}
                    {isCustomerNotificationsOpen && (
                      <div
                        id="customer-notifications-popover"
                        className={`fixed sm:absolute right-2 sm:right-0 top-14 sm:top-12 z-50 w-[calc(100vw-1rem)] max-w-sm sm:w-96 rounded-2xl border p-3 sm:p-3.5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 font-sans ${
                          isDarkMode
                            ? 'bg-[#181511] border-[#2b251e] text-[#ede8d0] shadow-[0_12px_40px_rgba(0,0,0,0.85)]'
                            : 'bg-white border-stone-200 text-stone-900 shadow-2xl'
                        }`}
                      >
                        {/* Popover Header */}
                        <div className="flex items-center justify-between pb-2.5 border-b border-stone-200 dark:border-stone-800">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                              <Bell className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black tracking-tight">Order Alerts & Status</span>
                                {activeCustomerOrdersCount > 0 ? (
                                  <span className="rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-black animate-pulse">
                                    {activeCustomerOrdersCount} In Progress
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.2 text-[9px] font-semibold">
                                    All Caught Up
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-stone-400 leading-none mt-0.5">
                                Real-time kitchen & delivery progress
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsCustomerNotificationsOpen(false)}
                            title="Close Notifications"
                            className="rounded-lg p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Direct Shortcut to My Orders live page */}
                        <div className="mt-2.5 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomerNotificationsOpen(false);
                              onSetCustomerTab('orders');
                            }}
                            className={`w-full flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs font-bold transition cursor-pointer border ${
                              isDarkMode
                                ? 'bg-stone-900 border-stone-800 text-amber-300 hover:bg-stone-800/80 hover:border-amber-500/40'
                                : 'bg-amber-50/80 border-amber-200 text-amber-950 hover:bg-amber-100 hover:border-amber-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <ShoppingBag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>Open Live Tracking in My Orders</span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          </button>
                        </div>

                        {/* Active Table Session Banner */}
                        {activeTableBinding && (
                          <div
                            className={`mb-2.5 flex items-center gap-2 rounded-xl p-2 text-xs border ${
                              isDarkMode
                                ? 'bg-stone-900/60 border-stone-800 text-stone-300'
                                : 'bg-stone-50 border-stone-200 text-stone-700'
                            }`}
                          >
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-[11px] text-stone-900 dark:text-stone-100">
                                Seated at Table #{activeTableBinding.tableNumber}
                              </span>
                              <span className="text-[10px] text-stone-500 dark:text-stone-400 block leading-tight">
                                {activeTableBinding.area === 'airconditioned' ? 'Air-Con Room' : 'Main Dining Area'} • Orders are served to your table
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Order Alerts List */}
                        <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-0.5 no-scrollbar">
                          {sortedCustomerOrders.length > 0 ? (
                            sortedCustomerOrders.slice(0, 6).map((order) => {
                              const statusInfo = getCustomerOrderStatusInfo(
                                order.status,
                                order.orderType,
                                order.tableNumber
                              );
                              const itemsText = (order.items || [])
                                .map((it) => `${it.quantity}x ${it.name}`)
                                .join(', ');

                              return (
                                <div
                                  key={order.id}
                                  className={`rounded-xl border p-2.5 transition text-xs ${
                                    isDarkMode
                                      ? 'bg-stone-900/70 border-stone-800 hover:border-stone-700'
                                      : 'bg-stone-50/70 border-stone-200/90 hover:bg-stone-50 hover:border-amber-300/80 shadow-2xs'
                                  }`}
                                >
                                  {/* Top Row: Order Number, Relative Time & Type */}
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="font-mono font-black text-[11px] text-stone-900 dark:text-stone-100">
                                        #{order.orderNumber}
                                      </span>
                                      <span
                                        className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border ${
                                          order.orderType === 'dine_in'
                                            ? 'bg-amber-100/80 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800'
                                            : order.orderType === 'delivery'
                                            ? 'bg-blue-100/80 text-blue-900 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                                            : 'bg-stone-200/80 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700'
                                        }`}
                                      >
                                        {order.orderType === 'dine_in'
                                          ? `Dine-In ${order.tableNumber ? `(T#${order.tableNumber})` : ''}`
                                          : order.orderType === 'delivery'
                                          ? 'Delivery'
                                          : 'Pick-Up'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-stone-400 shrink-0 font-medium">
                                      {formatCustomerOrderTime(order.createdAt)}
                                    </span>
                                  </div>

                                  {/* Order Status Badge & Alert Message */}
                                  <div className="mb-1.5 mt-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className={`inline-block h-2 w-2 rounded-full ${statusInfo.dotClass} shrink-0`} />
                                      <span className="font-bold text-[11px] text-stone-900 dark:text-stone-100">
                                        {statusInfo.title}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed pl-3.5">
                                      {statusInfo.description}
                                    </p>
                                  </div>

                                  {/* Micro Progress Track */}
                                  {order.status !== 'cancelled' && (
                                    <div className="my-1.5 pl-3.5">
                                      <div className="flex items-center gap-1">
                                        <div
                                          className={`h-1 flex-1 rounded-full ${
                                            statusInfo.step >= 1 ? 'bg-amber-500' : 'bg-stone-200 dark:bg-stone-800'
                                          }`}
                                        />
                                        <div
                                          className={`h-1 flex-1 rounded-full ${
                                            statusInfo.step >= 2 ? 'bg-sky-500' : 'bg-stone-200 dark:bg-stone-800'
                                          }`}
                                        />
                                        <div
                                          className={`h-1 flex-1 rounded-full ${
                                            statusInfo.step >= 3 ? 'bg-emerald-500' : 'bg-stone-200 dark:bg-stone-800'
                                          }`}
                                        />
                                      </div>
                                      <div className="flex justify-between text-[8px] font-bold text-stone-400 mt-0.5">
                                        <span>Confirmed</span>
                                        <span>Cooking</span>
                                        <span>Ready</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Items Summary & Total */}
                                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-stone-200/60 dark:border-stone-800/80 text-[10px]">
                                    <span className="text-stone-600 dark:text-stone-400 truncate max-w-[190px]" title={itemsText}>
                                      {itemsText || 'Order items'}
                                    </span>
                                    <span className="font-black text-amber-700 dark:text-amber-400 shrink-0 font-mono">
                                      ₱{Number(order.totalAmount || 0).toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Quick Action Buttons */}
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCustomerNotificationsOpen(false);
                                        onSetCustomerTab('orders');
                                      }}
                                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-stone-900 dark:bg-stone-800 text-white dark:text-stone-100 py-1 px-2 text-[10px] font-bold hover:bg-amber-600 dark:hover:bg-amber-600 transition cursor-pointer"
                                    >
                                      <Clock className="h-3 w-3" />
                                      <span>Track Live</span>
                                    </button>
                                    {onViewOrderReceipt && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setIsCustomerNotificationsOpen(false);
                                          onViewOrderReceipt(order);
                                        }}
                                        className="flex items-center justify-center gap-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 py-1 px-2 text-[10px] font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                                      >
                                        <Receipt className="h-3 w-3" />
                                        <span>Receipt</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            /* Friendly Empty State */
                            <div className="text-center py-6 px-3">
                              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
                                <Coffee className="h-5 w-5" />
                              </div>
                              <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                                No Active Orders Yet
                              </h4>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                                Place your order for dine-in, pick-up, or delivery to see live kitchen preparation and serving alerts here!
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomerNotificationsOpen(false);
                                  onSetCustomerTab('menu');
                                }}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 shadow-2xs transition cursor-pointer"
                              >
                                <Utensils className="h-3.5 w-3.5" />
                                <span>Browse Menu & Order</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Popover Footer Info */}
                        <div className="mt-2.5 pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[9px] text-stone-400">
                          <span>Coffee at Yellow Hauz • Davao City</span>
                          <span>Free High-Speed WiFi</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="hidden sm:flex items-center gap-1 sm:gap-1.5">
                    <button
                      id="customer-fullscreen-btn"
                      type="button"
                      onClick={toggleFullscreen}
                      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                      className="flex items-center justify-center rounded-xl border border-stone-200 p-2 text-xs font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition cursor-pointer shadow-2xs active:scale-95"
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-4 w-4 text-stone-700" />
                      ) : (
                        <Maximize2 className="h-4 w-4 text-stone-700" />
                      )}
                    </button>
                    {activeCustomer ? (
                      onCustomerLogout && (
                        <button
                          onClick={onCustomerLogout}
                          title="Sign Out of Customer Account"
                          className="flex items-center gap-1 rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer shadow-2xs active:scale-95"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={onCustomerLoginClick}
                        title="Customer Sign In"
                        className="hidden sm:flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-stone-800 shadow-xs cursor-pointer"
                      >
                        <UserIcon className="h-3.5 w-3.5 text-amber-400" />
                        <span>Customer Sign In</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : activeStaff ? (
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Top Nav Staff Notifications Action Button */}
                  <button
                    id="top-nav-staff-notifications-btn"
                    type="button"
                    onClick={() => {
                      setNotificationInitialTab('all');
                      setIsStaffNotificationModalOpen(true);
                    }}
                    className={`relative flex items-center justify-center rounded-xl border p-2 sm:px-2.5 sm:py-1.5 transition cursor-pointer shadow-2xs ${
                      totalStaffNotificationsCount > 0
                        ? 'border-amber-400/90 bg-amber-50/90 text-stone-950 hover:bg-amber-100 ring-2 ring-amber-400/20'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                    title={`Notifications (${totalStaffNotificationsCount} alerts)`}
                  >
                    <div className="relative">
                      <Bell className={`h-4 w-4 sm:h-3.5 sm:w-3.5 ${totalStaffNotificationsCount > 0 ? 'text-amber-700 fill-amber-500' : 'text-stone-700'}`} />
                      {totalStaffNotificationsCount > 0 && (
                        <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[8px] font-black text-white ring-1 ring-white animate-pulse">
                          {totalStaffNotificationsCount}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Fullscreen Toggle Button beside Logout */}
                  <button
                    id="staff-fullscreen-btn"
                    type="button"
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    className="flex items-center justify-center rounded-xl border border-stone-200 p-2 sm:px-2.5 sm:py-1.5 text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition cursor-pointer shadow-2xs active:scale-95"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-stone-700" />
                    ) : (
                      <Maximize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-stone-700" />
                    )}
                  </button>

                  <button
                    id="staff-logout-btn"
                    onClick={onStaffLogout}
                    title="Logout Staff"
                    className="flex items-center gap-1 rounded-xl border border-stone-200 p-2 sm:px-2.5 sm:py-1.5 text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer shadow-2xs active:scale-95"
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
        className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-md border-t px-1 py-1.5 safe-area-pb transition-colors duration-200 ${
          isDarkMode
            ? 'bg-[#181511]/95 border-[#2b251e] text-[#ede8d0] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]'
            : 'bg-white/95 border-stone-200/90 text-stone-900 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]'
        }`}
      >
        {appMode === 'customer' ? (
          <div className="grid grid-cols-6 items-center justify-around gap-0.5">
            {/* 1. Home */}
            <button
              id="mobile-nav-home"
              onClick={() => onSetCustomerTab('home')}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                customerTab === 'home'
                  ? isDarkMode
                    ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                    : 'text-amber-900 bg-amber-100/90 font-extrabold shadow-2xs'
                  : isDarkMode
                  ? 'text-stone-400 hover:text-amber-200 hover:bg-stone-800/60'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Home className={`h-4.5 w-4.5 ${customerTab === 'home' ? (isDarkMode ? 'text-white' : 'text-amber-800') : (isDarkMode ? 'text-stone-400' : 'text-stone-700')}`} />
              <span className="text-[9px] leading-tight font-medium mt-0.5">Home</span>
            </button>

            {/* 2. Menu */}
            <button
              id="mobile-nav-menu"
              onClick={() => onSetCustomerTab('menu')}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                customerTab === 'menu'
                  ? isDarkMode
                    ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                    : 'text-amber-900 bg-amber-100/90 font-extrabold shadow-2xs'
                  : isDarkMode
                  ? 'text-stone-400 hover:text-amber-200 hover:bg-stone-800/60'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Utensils className={`h-4.5 w-4.5 ${customerTab === 'menu' ? (isDarkMode ? 'text-white' : 'text-amber-800') : (isDarkMode ? 'text-stone-400' : 'text-stone-700')}`} />
              <span className="text-[9px] leading-tight font-medium mt-0.5">Menu</span>
            </button>

            {/* 3. Reservation */}
            <button
              id="mobile-nav-reservation"
              onClick={() => onSetCustomerTab('reservation')}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                customerTab === 'reservation'
                  ? isDarkMode
                    ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                    : 'text-amber-900 bg-amber-100/90 font-extrabold shadow-2xs'
                  : isDarkMode
                  ? 'text-stone-400 hover:text-amber-200 hover:bg-stone-800/60'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Calendar className={`h-4.5 w-4.5 ${customerTab === 'reservation' ? (isDarkMode ? 'text-white' : 'text-amber-800') : (isDarkMode ? 'text-stone-400' : 'text-stone-700')}`} />
              <span className="text-[9px] leading-tight font-medium mt-0.5">Reserve</span>
            </button>

            {/* 4. Bag / Cart (Action button) */}
            <button
              id="mobile-nav-bag"
              onClick={onToggleCart}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                isCustomerCartOpen
                  ? isDarkMode
                    ? 'text-white bg-[#78350f] font-extrabold shadow-2xs ring-1 ring-amber-500/40'
                    : 'text-amber-950 bg-amber-200/90 font-extrabold shadow-2xs ring-1 ring-amber-400/50'
                  : isDarkMode
                  ? 'text-stone-300 hover:text-amber-200 hover:bg-stone-800/60'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <div className="relative">
                <ShoppingBag className={`h-4.5 w-4.5 ${isCustomerCartOpen ? (isDarkMode ? 'text-white' : 'text-amber-900') : (isDarkMode ? 'text-stone-300' : 'text-stone-800')}`} />
                {cartCount > 0 && (
                  <span className={`absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-1 text-[8px] font-black shadow-xs animate-in zoom-in duration-150 ${
                    isDarkMode ? 'bg-[#78350f] text-white' : 'bg-amber-500 text-stone-950'
                  }`}>
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] leading-tight font-bold mt-0.5">
                Bag {cartCount > 0 ? `(${cartCount})` : ''}
              </span>
            </button>

            {/* 5. Orders */}
            <button
              id="mobile-nav-orders"
              onClick={() => onSetCustomerTab('orders')}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
                customerTab === 'orders'
                  ? isDarkMode
                    ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                    : 'text-amber-900 bg-amber-100/90 font-extrabold shadow-2xs'
                  : isDarkMode
                  ? 'text-stone-400 hover:text-amber-200 hover:bg-stone-800/60'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <ClipboardList className={`h-4.5 w-4.5 ${customerTab === 'orders' ? (isDarkMode ? 'text-white' : 'text-amber-800') : (isDarkMode ? 'text-stone-400' : 'text-stone-700')}`} />
              <span className="text-[9px] leading-tight font-medium mt-0.5">Orders</span>
            </button>

            {/* 6. Account / Sign In */}
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
                  ? isDarkMode
                    ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                    : 'text-amber-900 bg-amber-100/90 font-extrabold shadow-2xs'
                  : isDarkMode
                  ? 'text-stone-400 hover:text-amber-200 hover:bg-stone-800/60'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {activeCustomer ? (
                <div className={`grid h-4.5 w-4.5 place-items-center rounded-full text-[9px] font-extrabold ${
                  isDarkMode ? 'bg-[#78350f] text-white' : 'bg-amber-500 text-stone-950'
                }`}>
                  {activeCustomer.fullName ? activeCustomer.fullName.charAt(0) : 'U'}
                </div>
              ) : (
                <UserIcon className={`h-4.5 w-4.5 ${customerTab === 'account' ? (isDarkMode ? 'text-white' : 'text-amber-800') : (isDarkMode ? 'text-stone-400' : 'text-stone-700')}`} />
              )}
              <span className="text-[9px] leading-tight font-medium mt-0.5 truncate max-w-[48px]">
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
                  id="mobile-nav-cook-tickets"
                  onClick={() => onSetStaffTab('tickets')}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer min-w-[60px] ${
                    staffTab === 'tickets'
                      ? isDarkMode
                        ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                        : 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                      : isDarkMode
                      ? 'text-stone-400 hover:bg-stone-800/60'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <ChefHat className="h-4 w-4" />
                  <span className="text-[9px] leading-tight mt-0.5">Tickets</span>
                </button>
                <button
                  id="mobile-nav-cook-refills"
                  onClick={() => onSetStaffTab('refills')}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer min-w-[60px] ${
                    staffTab === 'refills'
                      ? isDarkMode
                        ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                        : 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                      : isDarkMode
                      ? 'text-stone-400 hover:bg-stone-800/60'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <PackagePlus className="h-4 w-4" />
                  <span className="text-[9px] leading-tight mt-0.5">Refills</span>
                </button>
                <button
                  onClick={() => setIsBurgerDrawerOpen(true)}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer min-w-[60px] ${
                    isDarkMode ? 'text-stone-400 hover:bg-stone-800/60' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <UserIcon className="h-4 w-4" />
                  <span className="text-[9px] leading-tight mt-0.5">Account</span>
                </button>
              </>
            ) : (
              <>
                {/* POS / Register */}
                <button
                  id="mobile-nav-staff-pos"
                  onClick={() => onSetStaffTab('pos')}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                    staffTab === 'pos'
                      ? isDarkMode
                        ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                        : 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                      : isDarkMode
                      ? 'text-stone-400 hover:bg-stone-800/60'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  <span className="text-[9px] leading-tight mt-0.5">Cashier</span>
                </button>

                {/* Tables Floor Plan */}
                <button
                  id="mobile-nav-staff-tables"
                  onClick={() => onSetStaffTab('tables')}
                  className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                    staffTab === 'tables'
                      ? isDarkMode
                        ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                        : 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                      : isDarkMode
                      ? 'text-stone-400 hover:bg-stone-800/60'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {pendingTableRequestsCount > 0 && (
                    <span className="absolute -top-1 right-1 h-2 w-2 rounded-full animate-ping bg-amber-500" />
                  )}
                  <span className="text-[9px] leading-tight mt-0.5">Tables</span>
                </button>

                {/* Tickets */}
                <button
                  id="mobile-nav-staff-tickets"
                  onClick={() => onSetStaffTab('tickets')}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                    staffTab === 'tickets'
                      ? isDarkMode
                        ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                        : 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                      : isDarkMode
                      ? 'text-stone-400 hover:bg-stone-800/60'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span className="text-[9px] leading-tight mt-0.5">Tickets</span>
                </button>

                {/* Admin: Sales Reports */}
                {activeStaff?.role === 'admin' && (
                  <button
                    id="mobile-nav-admin-reports"
                    onClick={() => onSetStaffTab('reports')}
                    className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                      staffTab === 'reports'
                        ? isDarkMode
                          ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                          : 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                        : isDarkMode
                        ? 'text-stone-400 hover:bg-stone-800/60'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-[9px] leading-tight mt-0.5">Sales</span>
                  </button>
                )}

                {/* Admin: Analytics */}
                {activeStaff?.role === 'admin' && (
                  <button
                    id="mobile-nav-admin-analytics"
                    onClick={() => onSetStaffTab('analytics')}
                    className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                      staffTab === 'analytics'
                        ? isDarkMode
                          ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                          : 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                        : isDarkMode
                        ? 'text-stone-400 hover:bg-stone-800/60'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4 text-black" />
                    <span className="text-[9px] leading-tight mt-0.5">Analytics</span>
                  </button>
                )}

                {/* Staff: Admin Inventory vs Staff Refills */}
                {activeStaff?.role === 'admin' ? (
                  <button
                    id="mobile-nav-admin-inventory"
                    onClick={() => onSetStaffTab('inventory')}
                    className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                      staffTab === 'inventory'
                        ? isDarkMode
                          ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                          : 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                        : isDarkMode
                        ? 'text-stone-400 hover:bg-stone-800/60'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Package className="h-4 w-4" />
                    <span className="text-[9px] leading-tight mt-0.5">Inventory</span>
                  </button>
                ) : (
                  <button
                    id="mobile-nav-staff-refills"
                    onClick={() => onSetStaffTab('refills')}
                    className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition cursor-pointer min-w-[50px] ${
                      staffTab === 'refills'
                        ? isDarkMode
                          ? 'text-white bg-[#78350f] font-extrabold shadow-2xs'
                          : 'text-amber-900 bg-amber-100 font-extrabold shadow-2xs'
                        : isDarkMode
                        ? 'text-stone-400 hover:bg-stone-800/60'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <PackagePlus className="h-4 w-4" />
                    <span className="text-[9px] leading-tight mt-0.5">Refills</span>
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

      {/* Unified Staff Notifications & Action Center Modal (No stock, Low stock, Table confirmation, Order confirmation) */}
      <StaffNotificationCenterModal
        isOpen={isStaffNotificationModalOpen}
        onClose={() => setIsStaffNotificationModalOpen(false)}
        activeStaff={activeStaff}
        initialTab={notificationInitialTab}
        onNavigateTab={(tab) => {
          setIsStaffNotificationModalOpen(false);
          onSetStaffTab(tab);
        }}
        onViewOrderReceipt={onViewOrderReceipt}
      />

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
            <div className={`w-screen max-w-sm sm:max-w-md shadow-2xl flex flex-col justify-between overflow-y-auto border-r animate-in slide-in-from-left duration-200 transition-colors ${
              isDarkMode
                ? 'bg-stone-900 text-stone-100 border-stone-800'
                : 'bg-white text-stone-900 border-stone-200'
            }`}>
              {/* Drawer Top Bar */}
              <div className={`p-4 sm:p-5 border-b flex items-center justify-between transition-colors ${
                isDarkMode ? 'bg-stone-950/80 border-stone-800' : 'bg-stone-50/90 border-stone-100'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-amber-500 shadow-md border border-amber-400/30 shrink-0 flex items-center justify-center">
                    <img
                      src="/images/Coffeatyellowhauz_logo.jpg"
                      alt="Coffee at Yellow Hauz"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <Coffee className="h-5 w-5 fill-stone-950 text-stone-950 absolute pointer-events-none -z-10" />
                  </div>
                  <div>
                    <h2 className={`font-display font-extrabold text-sm sm:text-base leading-tight ${
                      isDarkMode ? 'text-stone-100' : 'text-stone-950'
                    }`}>
                      Coffee at Yellow Hauz
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] font-medium ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Davao City</span>
                      <span className={isDarkMode ? 'text-stone-600' : 'text-stone-300'}>•</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Firestore Cloud DB
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  id="close-burger-menu-btn"
                  onClick={() => setIsBurgerDrawerOpen(false)}
                  className={`rounded-xl p-2 transition cursor-pointer ${
                    isDarkMode
                      ? 'text-stone-400 hover:text-white hover:bg-stone-800'
                      : 'text-stone-400 hover:text-stone-800 hover:bg-stone-100'
                  }`}
                  title="Close Navigation Menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="p-4 sm:p-5 space-y-6 flex-1 overflow-y-auto">
                {/* 1. App Experience Switcher */}
                <div>
                  <label className={`text-[11px] font-extrabold tracking-wider uppercase mb-2.5 block ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                    App Experience Mode
                  </label>
                  <div className={`grid grid-cols-2 gap-2 p-1 rounded-2xl border transition-colors ${
                    isDarkMode ? 'bg-stone-800/90 border-stone-700' : 'bg-stone-100 border-stone-200/80'
                  }`}>
                    <button
                      id="burger-mode-customer-btn"
                      onClick={() => {
                        onSetAppMode('customer');
                        setIsBurgerDrawerOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl transition cursor-pointer ${
                        appMode === 'customer'
                          ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                          : isDarkMode
                            ? 'text-stone-400 hover:text-white hover:bg-stone-700/60'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
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
                          ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                          : isDarkMode
                            ? 'text-stone-400 hover:text-white hover:bg-stone-700/60'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/80'
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
                    <label className={`text-[11px] font-extrabold tracking-wider uppercase mb-2.5 block ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
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
                            ? isDarkMode
                              ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                              : 'bg-amber-50/80 border-amber-400 text-stone-950'
                            : isDarkMode
                              ? 'bg-stone-800/80 border-stone-700 text-stone-200 hover:bg-stone-800'
                              : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              activeTableBinding ? 'bg-amber-500 text-stone-950' : isDarkMode ? 'bg-stone-700 text-stone-300' : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            <Utensils className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold">Dine-In Table Service</div>
                            <div className={`text-[11px] ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                              {activeTableBinding
                                ? `Table #${activeTableBinding.tableNumber} (${
                                    activeTableBinding.area === 'airconditioned' ? 'AC Room' : 'Main Area'
                                  })`
                                : 'Select your table in café'}
                            </div>
                          </div>
                        </div>
                        {activeTableBinding ? (
                          <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-500 font-bold">Select</span>
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
                            ? isDarkMode
                              ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                              : 'bg-amber-50/80 border-amber-400 text-stone-950'
                            : isDarkMode
                              ? 'bg-stone-800/80 border-stone-700 text-stone-200 hover:bg-stone-800'
                              : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              !activeTableBinding ? 'bg-amber-500 text-stone-950' : isDarkMode ? 'bg-stone-700 text-stone-300' : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            <Globe className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold">Online / Advance Booking</div>
                            <div className={`text-[11px] ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Pick up at store or advance reservation</div>
                          </div>
                        </div>
                        {!activeTableBinding && (
                          <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 border border-amber-300">
                            Active
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Quick Utilities & Alerts */}
                <div>
                  <label className={`text-[11px] font-extrabold tracking-wider uppercase mb-2.5 block ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
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
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition cursor-pointer ${
                        isDarkMode
                          ? 'bg-stone-800/80 border-stone-700 text-stone-200 hover:bg-stone-800 hover:text-amber-300'
                          : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-950'
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold">Yellow Hauz Concierge &amp; AI Barista</div>
                        <div className={`text-[11px] ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>Guest menu recommendations, drink pairings &amp; venue booking</div>
                      </div>
                    </button>

                    {/* Admin / Staff System Settings */}
                    {(activeStaff?.role === 'admin' || appMode === 'staff') && (
                      <button
                        id="burger-settings-btn"
                        onClick={() => {
                          setIsBurgerDrawerOpen(false);
                          onSetStaffTab('settings');
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                          staffTab === 'settings' && appMode === 'staff'
                            ? isDarkMode
                              ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                              : 'bg-amber-50/80 border-amber-400 text-stone-950'
                            : isDarkMode
                              ? 'bg-stone-800/80 border-stone-700 text-stone-200 hover:bg-stone-800 hover:text-amber-300'
                              : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-950'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                            <Settings className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold">Store & System Settings</div>
                            <div className={`text-[11px] ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>GCash/Maya payment QR, menu items, table configs</div>
                          </div>
                        </div>
                        {staffTab === 'settings' && appMode === 'staff' && (
                          <span className="rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 border border-amber-300">
                            Active
                          </span>
                        )}
                      </button>
                    )}

                    {/* Staff Notifications & Alerts Hub */}
                    {(activeStaff || appMode === 'staff') && (
                      <div className={`space-y-2 pt-1 border-t ${isDarkMode ? 'border-stone-800' : 'border-stone-100'}`}>
                        <button
                          id="burger-notifications-hub-btn"
                          onClick={() => {
                            setIsBurgerDrawerOpen(false);
                            setNotificationInitialTab('all');
                            setIsStaffNotificationModalOpen(true);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                            isDarkMode
                              ? 'bg-stone-800/80 border-stone-700 text-stone-200 hover:bg-stone-800'
                              : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-amber-500 text-stone-950 shadow-2xs">
                              <Bell className="h-4 w-4 fill-stone-950" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-bold flex items-center gap-1.5">
                                <span>Notifications</span>
                                {totalStaffNotificationsCount > 0 && (
                                  <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                                    {totalStaffNotificationsCount} active
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-stone-400" />
                        </button>

                        {/* 4 Quick Category Action Badges in Burger Drawer */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {/* 1. No Stock */}
                          <button
                            id="burger-notif-nostock-btn"
                            onClick={() => {
                              setIsBurgerDrawerOpen(false);
                              setNotificationInitialTab('no_stock');
                              setIsStaffNotificationModalOpen(true);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                              noStockCount > 0
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-stone-50 border-stone-200 text-stone-500'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Ban className="h-3 w-3 text-rose-500" />
                              <span>No Stock</span>
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${noStockCount > 0 ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                              {noStockCount}
                            </span>
                          </button>

                          {/* 2. Low Stock */}
                          <button
                            id="burger-notif-lowstock-btn"
                            onClick={() => {
                              setIsBurgerDrawerOpen(false);
                              setNotificationInitialTab('low_stock');
                              setIsStaffNotificationModalOpen(true);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                              lowStockCount > 0
                                ? 'bg-amber-50 border-amber-300 text-amber-800'
                                : 'bg-stone-50 border-stone-200 text-stone-500'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              <span>Low Stock</span>
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${lowStockCount > 0 ? 'bg-amber-500 text-stone-950' : 'bg-stone-200 text-stone-600'}`}>
                              {lowStockCount}
                            </span>
                          </button>

                          {/* 3. Table Confirmations */}
                          <button
                            id="burger-notif-tables-btn"
                            onClick={() => {
                              setIsBurgerDrawerOpen(false);
                              setNotificationInitialTab('table_confirm');
                              setIsStaffNotificationModalOpen(true);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                              totalTableConfirmationsCount > 0
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-stone-50 border-stone-200 text-stone-500'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Utensils className="h-3 w-3 text-indigo-600" />
                              <span>Tables</span>
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${totalTableConfirmationsCount > 0 ? 'bg-indigo-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                              {totalTableConfirmationsCount}
                            </span>
                          </button>

                          {/* 4. Order Confirmations */}
                          <button
                            id="burger-notif-orders-btn"
                            onClick={() => {
                              setIsBurgerDrawerOpen(false);
                              setNotificationInitialTab('order_confirm');
                              setIsStaffNotificationModalOpen(true);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                              pendingOrderConfirmationsCount > 0
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-stone-50 border-stone-200 text-stone-500'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <ClipboardList className="h-3 w-3 text-emerald-600" />
                              <span>Orders</span>
                            </span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${pendingOrderConfirmationsCount > 0 ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                              {pendingOrderConfirmationsCount}
                            </span>
                          </button>

                          {/* 5. Customer Cancellation Requests */}
                          <button
                            id="burger-notif-cancellations-btn"
                            onClick={() => {
                              setIsBurgerDrawerOpen(false);
                              setNotificationInitialTab('cancellations');
                              setIsStaffNotificationModalOpen(true);
                            }}
                            className={`col-span-2 flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                              pendingCancellationRequestsCount > 0
                                ? 'bg-rose-50 border-rose-300 text-rose-700'
                                : 'bg-stone-50 border-stone-200 text-stone-500'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <Ban className="h-3.5 w-3.5 text-rose-600" />
                              <span>Customer Cancellation Requests</span>
                            </span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${pendingCancellationRequestsCount > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-stone-200 text-stone-600'}`}>
                              {pendingCancellationRequestsCount}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Appearance & Theme (Dark Mode / Light Mode) */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className={`text-[11px] font-extrabold tracking-wider uppercase ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                      Theme &amp; Display
                    </label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isDarkMode
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}>
                      {isDarkMode ? 'Dark Active' : 'Light Active'}
                    </span>
                  </div>

                  <div className={`grid grid-cols-2 gap-2 p-1.5 rounded-2xl border transition-colors ${
                    isDarkMode
                      ? 'bg-stone-800/90 border-stone-700/80'
                      : 'bg-stone-100 border-stone-200/80'
                  }`}>
                    {/* Light Mode Button */}
                    <button
                      id="burger-theme-light-btn"
                      type="button"
                      onClick={() => handleSetTheme(false)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !isDarkMode
                          ? 'bg-white text-stone-950 font-extrabold shadow-sm border border-stone-200/90'
                          : 'text-stone-400 hover:text-white hover:bg-stone-700/50'
                      }`}
                      title="Switch to Light Mode"
                    >
                      <Sun className={`h-4 w-4 ${!isDarkMode ? 'text-amber-500 fill-amber-500/20' : 'text-stone-400'}`} />
                      <span>Light Mode</span>
                    </button>

                    {/* Dark Mode Button */}
                    <button
                      id="burger-theme-dark-btn"
                      type="button"
                      onClick={() => handleSetTheme(true)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isDarkMode
                          ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                          : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/60'
                      }`}
                      title="Switch to Dark Mode"
                    >
                      <Moon className={`h-4 w-4 ${isDarkMode ? 'text-stone-950 fill-stone-950/20' : 'text-stone-600'}`} />
                      <span>Dark Mode</span>
                    </button>
                  </div>
                </div>

                {/* 5. Navbar View Preferences */}
                <div>
                  <label className={`text-[11px] font-extrabold tracking-wider uppercase mb-2.5 block ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
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
                          ? isDarkMode
                            ? 'bg-[#78350f] text-white border-amber-700/60'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                          : isDarkMode
                            ? 'bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {isPinned ? <Pin className={`h-3.5 w-3.5 ${isDarkMode ? 'fill-white text-white' : 'fill-amber-700 text-amber-700'}`} /> : <PinOff className="h-3.5 w-3.5" />}
                      <span>{isPinned ? 'Pinned' : 'Unpinned'}</span>
                    </button>

                    <button
                      id="burger-hide-navbar-btn"
                      onClick={() => {
                        if (isPinned) onTogglePin();
                        onSetNavVisible(false);
                        setIsBurgerDrawerOpen(false);
                      }}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        isDarkMode
                          ? 'border-stone-700 bg-stone-800 text-stone-200 hover:text-white hover:bg-stone-700'
                          : 'border-stone-200 bg-stone-50 text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                      }`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                      <span>Hide Navbar</span>
                    </button>

                    <button
                      id="burger-fullscreen-btn"
                      onClick={toggleFullscreen}
                      className={`col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        isFullscreen
                          ? isDarkMode
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-amber-100 text-amber-950 border-amber-300'
                          : isDarkMode
                            ? 'border-stone-700 bg-stone-800 text-stone-200 hover:text-white hover:bg-stone-700'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:text-stone-950 hover:bg-stone-100'
                      }`}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-3.5 w-3.5 text-amber-500" />
                      ) : (
                        <Maximize2 className="h-3.5 w-3.5" />
                      )}
                      <span>{isFullscreen ? 'Exit Fullscreen' : 'Toggle Fullscreen Mode'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className={`p-4 border-t text-center text-[10px] font-medium transition-colors ${
                isDarkMode ? 'border-stone-800 text-stone-500 bg-stone-950/60' : 'border-stone-100 text-stone-500 bg-stone-50/60'
              }`}>
                Coffee at Yellow Hauz • Davao City POS & Online Ordering
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
