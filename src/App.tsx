import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Category,
  MenuItem,
  Order,
  User,
  CustomerAccount,
  StoreSettings,
  Reservation,
  CartItem,
  TableBinding,
  StaffTabType,
} from './types';
import { AppStore } from './services/store';
import { AppRouter } from './services/router';
import { Navigation } from './components/Navigation';
import { CustomerHome } from './components/customer/CustomerHome';
import { CustomerMenu } from './components/customer/CustomerMenu';
import { CustomerOrders } from './components/customer/CustomerOrders';
import { CustomerReservation } from './components/customer/CustomerReservation';
import { CustomerAccountView } from './components/customer/CustomerAccount';
import { CustomerLoginModal } from './components/customer/CustomerLoginModal';
import { StaffLogin } from './components/pos/StaffLogin';
import { AdminDashboard } from './components/pos/AdminDashboard';
import { PosMenu } from './components/pos/PosMenu';
import { TableManagement } from './components/pos/TableManagement';
import { TicketManagement } from './components/pos/TicketManagement';
import { SalesReports } from './components/pos/SalesReports';
import { SalesAnalytics } from './components/pos/SalesAnalytics';
import { InventoryManager } from './components/pos/InventoryManager';
import { StaffInventoryManager } from './components/pos/StaffInventoryManager';
import { SettingsManager } from './components/pos/SettingsManager';
import { ReceiptModal } from './components/ReceiptModal';
import { CustomerOrderSubmittedModal } from './components/customer/CustomerOrderSubmittedModal';
import { ChatbotModal } from './components/ChatbotModal';
import { LowStockNotificationModal } from './components/pos/LowStockNotificationModal';
import { CustomerCartDrawer } from './components/customer/CustomerCartDrawer';
import { TableRequestModal } from './components/customer/TableRequestModal';
import { ScannedTableModal } from './components/customer/ScannedTableModal';
import { Bot, Coffee, Sparkles, User as UserIcon, Utensils } from 'lucide-react';
import { ModalProvider, useModal } from './context/ModalContext';

export default function App() {
  return (
    <ModalProvider>
      <MainApp />
    </ModalProvider>
  );
}

function MainApp() {
  const { showConfirm } = useModal();

  // App navigation state initialized from current URL route (e.g. /admin, /staff, /cook, /menu, /reservation)
  const initialRoute = useMemo(() => AppRouter.parseCurrentRoute(), []);

  const [appMode, setAppMode] = useState<'customer' | 'staff'>(() => {
    const r = AppRouter.parseCurrentRoute();
    return r.mode;
  });

  const [customerTab, setCustomerTab] = useState<
    'home' | 'menu' | 'orders' | 'reservation' | 'account'
  >(() => {
    const r = AppRouter.parseCurrentRoute();
    return r.mode === 'customer' ? r.tab : 'home';
  });
  const [reservationKey, setReservationKey] = useState<number>(0);

  const [staffTab, setStaffTab] = useState<StaffTabType>(() => {
    const r = AppRouter.parseCurrentRoute();
    if (r.mode === 'staff' && r.staffTab) {
      return r.staffTab;
    }
    return 'dashboard';
  });

  const [targetLoginRole, setTargetLoginRole] = useState<'cashier' | 'cook' | 'barista' | 'admin'>(() => {
    const r = AppRouter.parseCurrentRoute();
    return r.mode === 'staff' && r.roleTarget ? r.roleTarget : 'cashier';
  });

  // Shared store state
  const [categories, setCategories] = useState<Category[]>(() => AppStore.getCategories());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [settings, setSettings] = useState<StoreSettings>(() => AppStore.getSettings());
  const [activeStaff, setActiveStaff] = useState<User | null>(() => AppStore.getActiveStaff());
  const [activeCustomer, setActiveCustomer] = useState<CustomerAccount | null>(() =>
    AppStore.getActiveCustomer()
  );
  const [activeTableBinding, setActiveTableBinding] = useState<TableBinding | null>(() =>
    AppStore.getActiveTableBinding()
  );

  // Scanned QR Table Modal (for customers scanning in-store table URL ?table=5)
  const [scannedTableNumber, setScannedTableNumber] = useState<number | null>(() => {
    const route = AppRouter.parseCurrentRoute();
    return route.mode === 'customer' && route.tableNumber
      ? route.tableNumber
      : AppStore.parseTableParamFromUrl();
  });
  const [scannedTableModalOpen, setScannedTableModalOpen] = useState<boolean>(() => {
    const route = AppRouter.parseCurrentRoute();
    const tableNum =
      route.mode === 'customer' && route.tableNumber
        ? route.tableNumber
        : AppStore.parseTableParamFromUrl();
    if (tableNum) {
      const binding = AppStore.getActiveTableBinding();
      return !binding || binding.tableNumber !== tableNum;
    }
    return false;
  });

  // Manual Online Table Picker Modal (for customers choosing tables from website floor map)
  const [manualTableModalOpen, setManualTableModalOpen] = useState(false);
  const lastHandledUrlTableRef = React.useRef<number | null>(
    (() => {
      const route = AppRouter.parseCurrentRoute();
      return route.mode === 'customer' && route.tableNumber
        ? route.tableNumber
        : AppStore.parseTableParamFromUrl();
    })()
  );

  // Customer Cart state (persisted across page reloads)
  const [customerCart, setCustomerCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('yh_customer_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCustomerCartOpen, setIsCustomerCartOpen] = useState(false);
  const [isCustomerCheckoutOpen, setIsCustomerCheckoutOpen] = useState(false);

  // Theme state: 'light' | 'amber' | 'dark' (persisted across page reloads)
  const [currentTheme, setCurrentTheme] = useState<'light' | 'amber' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'amber' || saved === 'light') return saved;
      if (document.documentElement.classList.contains('dark')) return 'dark';
      if (document.documentElement.classList.contains('theme-amber')) return 'amber';
    }
    return 'light';
  });

  const isDarkMode = currentTheme === 'dark';

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'theme-amber');
    document.body.classList.remove('dark', 'theme-amber');

    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else if (currentTheme === 'amber') {
      document.documentElement.classList.add('theme-amber');
      document.body.classList.add('theme-amber');
      localStorage.setItem('theme', 'amber');
    } else {
      localStorage.setItem('theme', 'light');
    }
  }, [currentTheme]);

  // Synchronize cart with localStorage whenever customerCart updates
  useEffect(() => {
    try {
      localStorage.setItem('yh_customer_cart', JSON.stringify(customerCart));
    } catch (e) {
      console.error('Failed to persist customer cart items:', e);
    }
  }, [customerCart]);

  const customerCartCount = useMemo(
    () => customerCart.reduce((sum, ci) => sum + ci.quantity, 0),
    [customerCart]
  );

  const handleCustomerAddToCart = (item: MenuItem) => {
    setCustomerCart((prev) => {
      const existing = prev.find((ci) => ci.item.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleCustomerUpdateQuantity = (itemId: number, delta: number) => {
    setCustomerCart((prev) =>
      prev
        .map((ci) => {
          if (ci.item.id === itemId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleCustomerRemoveItem = (itemId: number) => {
    setCustomerCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
  };

  const handleCustomerClearCart = () => {
    setCustomerCart([]);
  };

  const handleCustomerUpdateItemInstructions = (itemId: number, text: string) => {
    setCustomerCart((prev) =>
      prev.map((ci) => (ci.item.id === itemId ? { ...ci, specialInstructions: text } : ci))
    );
  };

  // Modals
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [customerSubmittedOrder, setCustomerSubmittedOrder] = useState<Order | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isCustomerLoginOpen, setIsCustomerLoginOpen] = useState(false);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  // Navigation Pin & Visibility state
  const [isNavPinned, setIsNavPinned] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yellowhauz_nav_pinned');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isNavVisible, setIsNavVisible] = useState<boolean>(true);

  const handleToggleNavPin = () => {
    setIsNavPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('yellowhauz_nav_pinned', String(next));
      } catch {
        // ignore
      }
      if (next) {
        setIsNavVisible(true);
      }
      return next;
    });
  };

  // Refresh items whenever necessary
  const refreshAppData = () => {
    setCategories(AppStore.getCategories());
    setMenuItems(AppStore.getMenuItems());
    setSettings(AppStore.getSettings());
    setActiveStaff(AppStore.getActiveStaff());
    setActiveCustomer(AppStore.getActiveCustomer());
    setActiveTableBinding(AppStore.getActiveTableBinding());
  };

  const handleBindTable = (tableNumber: number) => {
    const binding = AppStore.bindTableByNumber(tableNumber, false);
    setActiveTableBinding(binding);
  };

  const handleClearTableBinding = () => {
    AppStore.exitTable(Boolean(activeCustomer));
    setActiveTableBinding(null);
  };

  useEffect(() => {
    AppStore.initFirebaseSync();

    const unsubscribe = AppStore.subscribe(() => {
      refreshAppData();
    });
    return () => unsubscribe();
  }, []);

  // Synchronize browser URL path whenever appMode, customerTab, or staff state changes
  useEffect(() => {
    AppRouter.syncBrowserUrl(appMode, customerTab, activeStaff?.role, staffTab);
  }, [appMode, customerTab, activeStaff, staffTab]);

  // Monitor URL route & table parameter changes (e.g. ?table=6, /admin, /staff, /cook, /menu, /reservation)
  useEffect(() => {
    let isHandlingRoute = false;

    const handleLocationChange = () => {
      if (isHandlingRoute) return;
      isHandlingRoute = true;

      try {
        // 1. Check table parameter
        const tableFromUrl = AppStore.parseTableParamFromUrl();
        if (tableFromUrl) {
          if (tableFromUrl !== lastHandledUrlTableRef.current) {
            lastHandledUrlTableRef.current = tableFromUrl;
            const currentBinding = AppStore.getActiveTableBinding();
            // If not already bound to this table, trigger the dedicated QR Scanned Table modal
            if (!currentBinding || currentBinding.tableNumber !== tableFromUrl) {
              setScannedTableNumber(tableFromUrl);
              setScannedTableModalOpen(true);
              setAppMode('customer');
            }
          }
        } else {
          lastHandledUrlTableRef.current = null;
        }

        // 2. Parse current route
        const currentRoute = AppRouter.parseCurrentRoute();
        if (currentRoute.mode === 'staff') {
          setAppMode((prev) => (prev !== 'staff' ? 'staff' : prev));
          if (currentRoute.roleTarget) {
            setTargetLoginRole(currentRoute.roleTarget);
          }
          if (currentRoute.staffTab) {
            setStaffTab(currentRoute.staffTab);
          }
        } else if (currentRoute.mode === 'customer') {
          setAppMode((prev) => (prev !== 'customer' ? 'customer' : prev));
          setCustomerTab((prev) => (prev !== currentRoute.tab ? currentRoute.tab : prev));
        }
      } finally {
        isHandlingRoute = false;
      }
    };

    // Listen for browser history and hash navigation (back/forward, direct links)
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Enforce role-based access control:
  // - Cook strictly accesses Tickets and Supplies & Refills
  // - Cashiers & Baristas strictly access Register, Floor Plan, Tickets, and Stock & Refills
  useEffect(() => {
    if (activeStaff) {
      if (activeStaff.role === 'cook') {
        const allowedCookTabs: StaffTabType[] = ['tickets', 'refills'];
        if (!allowedCookTabs.includes(staffTab)) {
          setStaffTab('tickets');
        }
      } else if (activeStaff.role !== 'admin') {
        const allowedStaffTabs: StaffTabType[] = ['pos', 'tables', 'tickets', 'refills'];
        if (!allowedStaffTabs.includes(staffTab)) {
          setStaffTab('pos');
        }
      }
    }
  }, [activeStaff, staffTab]);

  const bestSellers = useMemo(() => {
    return menuItems.filter((i) => i.isBestSeller && i.isAvailable).slice(0, 12);
  }, [menuItems]);

  const handleStaffLogout = async () => {
    const staffName = activeStaff?.fullName || activeStaff?.name || 'Staff';
    const roleTitle =
      activeStaff?.role === 'admin'
        ? 'Administrator'
        : activeStaff?.role === 'cook'
        ? 'Cook'
        : 'Cashier';
    const confirmed = await showConfirm({
      title: 'Logout Staff?',
      message: `Are you sure you want to sign out ${staffName} (${roleTitle})? Any open tickets and inventory data remain safely saved.`,
      type: 'warning',
      confirmText: 'Yes, Logout',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      AppStore.setActiveStaff(null);
      setActiveStaff(null);
    }
  };

  const handleCustomerLogout = async () => {
    const customerName = activeCustomer?.fullName || 'Customer';
    const confirmed = await showConfirm({
      title: 'Sign Out?',
      message: `Are you sure you want to sign out of ${customerName}'s account?`,
      type: 'info',
      confirmText: 'Yes, Sign Out',
      cancelText: 'Stay Signed In',
    });

    if (confirmed) {
      AppStore.setActiveCustomer(null);
      setActiveCustomer(null);
      setCustomerTab('home');
    }
  };

  const handleOrderSuccess = (order: Order) => {
    refreshAppData();
    setSelectedReceiptOrder(order);
  };

  const handleCustomerOrderSuccess = (order: Order) => {
    refreshAppData();
    setCustomerSubmittedOrder(order);
  };

  return (
    <div
      className={`min-h-screen flex flex-col selection:bg-amber-500 selection:text-stone-950 transition-colors duration-200 ${
        currentTheme === 'dark'
          ? 'dark bg-[#15120e] text-[#ede8d0]'
          : currentTheme === 'amber'
          ? 'theme-beige theme-amber bg-[#F7F3EB] text-[#2C241D]'
          : 'bg-stone-100/70 text-stone-900'
      } ${
        appMode === 'customer' ? 'customer-mode font-baskerville' : 'font-sans'
      }`}
    >
      {/* Navigation Bar */}
      <Navigation
        appMode={appMode}
        onSetAppMode={setAppMode}
        customerTab={customerTab}
        onSetCustomerTab={(tab) => {
          setIsCustomerCartOpen(false);
          if (tab === 'reservation') {
            setReservationKey((k) => k + 1);
          }
          setCustomerTab(tab);
        }}
        isCustomerCartOpen={isCustomerCartOpen}
        staffTab={staffTab}
        onSetStaffTab={setStaffTab}
        activeStaff={activeStaff}
        activeCustomer={activeCustomer}
        activeTableBinding={activeTableBinding}
        onClearTableBinding={handleClearTableBinding}
        onBindTable={handleBindTable}
        onStaffLogout={handleStaffLogout}
        onCustomerLogout={handleCustomerLogout}
        onCustomerLoginClick={() => setIsCustomerLoginOpen(true)}
        onOpenChatbot={() => setIsChatbotOpen(true)}
        cartCount={customerCartCount}
        onToggleCart={() => setIsCustomerCartOpen((prev) => !prev)}
        isPinned={isNavPinned}
        onTogglePin={handleToggleNavPin}
        isNavVisible={isNavVisible}
        onSetNavVisible={setIsNavVisible}
        onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
        onOpenTableBindingModal={() => {
          setManualTableModalOpen(true);
        }}
        onViewOrderReceipt={(order) => setSelectedReceiptOrder(order)}
        theme={currentTheme}
        onSetTheme={setCurrentTheme}
        isDarkMode={isDarkMode}
      />

      {/* Main Content Area */}
      <main id="app-main-content" className="flex-1 mx-auto w-full max-w-7xl px-1 sm:px-3 py-1 sm:py-2 pb-16 sm:pb-2">
        {appMode === 'customer' ? (
          /* Customer Experience */
          <>
            {customerTab === 'home' && (
              <CustomerHome
                bestSellers={bestSellers}
                settings={settings}
                onNavigateMenu={() => setCustomerTab('menu')}
                onNavigateReservation={() => {
                  setReservationKey((k) => k + 1);
                  setCustomerTab('reservation');
                }}
                onNavigateOrders={() => setCustomerTab('orders')}
                onAddToCart={(item) => {
                  handleCustomerAddToCart(item);
                  setCustomerTab('menu');
                }}
                onOpenChatbot={() => setIsChatbotOpen(true)}
              />
            )}

            {customerTab === 'menu' && (
              <CustomerMenu
                onBack={() => setCustomerTab('home')}
                categories={categories}
                menuItems={menuItems}
                settings={settings}
                activeCustomer={activeCustomer}
                activeTableBinding={activeTableBinding}
                onClearTable={handleClearTableBinding}
                onBindTable={handleBindTable}
                onOrderSuccess={handleCustomerOrderSuccess}
                onRequireLogin={() => setIsCustomerLoginOpen(true)}
                cart={customerCart}
                isCartOpen={isCustomerCartOpen}
                onToggleCart={() => setIsCustomerCartOpen((prev) => !prev)}
                onOpenCart={() => setIsCustomerCartOpen(true)}
                onCloseCart={() => setIsCustomerCartOpen(false)}
                onAddToCart={handleCustomerAddToCart}
                onUpdateQuantity={handleCustomerUpdateQuantity}
                onRemoveItem={handleCustomerRemoveItem}
                onClearCart={handleCustomerClearCart}
                onUpdateItemInstructions={handleCustomerUpdateItemInstructions}
                isCheckoutOpen={isCustomerCheckoutOpen}
                onSetCheckoutOpen={setIsCustomerCheckoutOpen}
              />
            )}

            {customerTab === 'orders' && (
              <CustomerOrders
                customer={activeCustomer}
                activeTableBinding={activeTableBinding}
                onExitTable={handleClearTableBinding}
                settings={settings}
                onNavigateMenu={() => setCustomerTab('menu')}
                onRequireLogin={() => setIsCustomerLoginOpen(true)}
                onViewReceipt={(order) => {
                  if (order.status === 'to_confirm' || order.status === 'pending') {
                    setCustomerSubmittedOrder(order);
                  } else {
                    setSelectedReceiptOrder(order);
                  }
                }}
                onViewReviewStatus={(order) => setCustomerSubmittedOrder(order)}
                onAddToCart={(item) => {
                  handleCustomerAddToCart(item);
                  setCustomerTab('menu');
                }}
              />
            )}

            {customerTab === 'reservation' && (
              <CustomerReservation
                key={reservationKey}
                settings={settings}
                activeCustomer={activeCustomer}
                onReservationSuccess={() => refreshAppData()}
                onRequireLogin={() => setIsCustomerLoginOpen(true)}
                onNavigateAccount={() => setCustomerTab('account')}
              />
            )}

            {customerTab === 'account' && activeCustomer && (
              <CustomerAccountView
                customer={activeCustomer}
                settings={settings}
                onLogout={handleCustomerLogout}
                onNavigateOrders={() => setCustomerTab('orders')}
                onNavigateMenu={() => setCustomerTab('menu')}
                onAddToCart={(item) => handleCustomerAddToCart(item)}
                onCustomerUpdate={(updated) => setActiveCustomer(updated)}
                onViewReceipt={(order) => {
                  if (order.status === 'to_confirm' || order.status === 'pending') {
                    setCustomerSubmittedOrder(order);
                  } else {
                    setSelectedReceiptOrder(order);
                  }
                }}
              />
            )}

            {customerTab === 'account' && !activeCustomer && (
              <div className="max-w-2xl mx-auto px-4 py-12 text-center animate-in fade-in duration-300">
                <div className="rounded-3xl border border-stone-200 bg-white p-8 sm:p-12 shadow-xs space-y-6">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600">
                    <UserIcon className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
                      Sign In to Your Yellow Hauz Account
                    </h2>
                    <p className="text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
                      View your saved favorites, track live orders, and manage your account credentials.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomerLoginOpen(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <UserIcon className="h-4 w-4" />
                      <span>Sign In or Create Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerTab('menu')}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-6 py-3 text-sm font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                    >
                      <Utensils className="h-4 w-4" />
                      <span>Browse Menu</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Staff POS & Terminal Experience */
          <>
            {!activeStaff ? (
              <StaffLogin
                initialRoleTarget={targetLoginRole}
                onBackToCustomer={() => {
                  setAppMode('customer');
                  setCustomerTab('home');
                  AppRouter.syncBrowserUrl('customer', 'home');
                }}
                onLoginSuccess={(u) => {
                  setActiveStaff(u);
                  if (u.role === 'admin') {
                    setStaffTab('dashboard');
                  } else if (u.role === 'cook' || u.role === 'barista') {
                    setStaffTab('tickets');
                  } else {
                    setStaffTab('pos');
                  }
                }}
              />
            ) : (
              <>
                {activeStaff.role === 'admin' && staffTab === 'dashboard' && (
                  <AdminDashboard
                    categories={categories}
                    menuItems={menuItems}
                    settings={settings}
                    activeStaff={activeStaff}
                    onNavigateTab={(tab) => setStaffTab(tab)}
                    onViewReceipt={(order) => setSelectedReceiptOrder(order)}
                    onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
                    onRefreshData={refreshAppData}
                  />
                )}

                {staffTab === 'pos' && (
                  <PosMenu
                    categories={categories}
                    menuItems={menuItems}
                    settings={settings}
                    activeStaff={activeStaff}
                    onOrderComplete={handleOrderSuccess}
                  />
                )}

                {staffTab === 'tables' && (
                  <TableManagement
                    activeStaff={activeStaff}
                    onViewOrderReceipt={(order) => setSelectedReceiptOrder(order)}
                  />
                )}

                {staffTab === 'tickets' && (
                  <TicketManagement
                    activeStaff={activeStaff}
                    settings={settings}
                    onViewReceipt={(order) => setSelectedReceiptOrder(order)}
                  />
                )}

                {activeStaff.role === 'admin' && staffTab === 'reports' && (
                  <SalesReports
                    settings={settings}
                    onViewReceipt={(order) => setSelectedReceiptOrder(order)}
                  />
                )}

                {activeStaff.role === 'admin' && staffTab === 'analytics' && <SalesAnalytics />}

                {/* Inventory & Refills (Unified view with Admin Confirmation workflow):
                    - Both Admin and Staff (Cook, Barista, Cashier) have the same Catalog table & filters
                    - Admin has direct restock / confirmation
                    - Staff restocks create Refill Requests requiring Admin confirmation */}
                {(staffTab === 'inventory' || staffTab === 'refills') && (
                  <InventoryManager categories={categories} activeStaff={activeStaff} />
                )}

                {activeStaff.role === 'admin' && staffTab === 'settings' && (
                  <SettingsManager
                    settings={settings}
                    activeStaff={activeStaff}
                    onUpdateSettings={(newSet) => setSettings(newSet)}
                    onRefreshStaff={() => refreshAppData()}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Modals & Customer Cart Drawer */}
      {appMode === 'customer' && (
        <CustomerCartDrawer
          isOpen={isCustomerCartOpen}
          onToggle={() => setIsCustomerCartOpen((prev) => !prev)}
          onClose={() => setIsCustomerCartOpen(false)}
          cart={customerCart}
          onUpdateQuantity={handleCustomerUpdateQuantity}
          onRemoveItem={handleCustomerRemoveItem}
          onClearCart={handleCustomerClearCart}
          onUpdateItemInstructions={handleCustomerUpdateItemInstructions}
          onAddToCart={handleCustomerAddToCart}
          settings={settings}
          activeTableBinding={activeTableBinding}
          activeCustomer={activeCustomer}
          onRequireLogin={() => setIsCustomerLoginOpen(true)}
          onProceedToCheckout={() => {
            if (!activeTableBinding && !activeCustomer) {
              setIsCustomerLoginOpen(true);
              return;
            }
            setIsCustomerCartOpen(false);
            setCustomerTab('menu');
            setIsCustomerCheckoutOpen(true);
          }}
        />
      )}

      {customerSubmittedOrder && (
        <CustomerOrderSubmittedModal
          order={customerSubmittedOrder}
          settings={settings}
          onClose={() => setCustomerSubmittedOrder(null)}
          onTrackOrder={() => {
            setCustomerSubmittedOrder(null);
            setCustomerTab('orders');
          }}
        />
      )}

      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          settings={settings}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}

      {isChatbotOpen && (
        <ChatbotModal
          onClose={() => setIsChatbotOpen(false)}
          activeCustomer={activeCustomer}
          activeTableNumber={activeTableBinding?.tableNumber || scannedTableNumber}
          onAddToCart={(item) => {
            handleCustomerAddToCart(item);
          }}
          onNavigateTab={(tab) => {
            setAppMode('customer');
            setCustomerTab(tab);
          }}
        />
      )}

      {/* Floating Customer AI Concierge Button (Customer Mode) - Halfway hidden circle on side */}
      {appMode === 'customer' && !isChatbotOpen && (
        <aside aria-label="Customer AI Concierge">
          <button
            id="floating-customer-concierge-btn"
            onClick={() => setIsChatbotOpen(true)}
            className="fixed bottom-28 sm:bottom-32 right-0 z-40 translate-x-1/2 hover:translate-x-0 focus:translate-x-0 transition-transform duration-300 ease-out flex items-center justify-start pl-2 sm:pl-2.5 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-stone-950 font-bold shadow-2xl border-2 border-amber-300/90 hover:shadow-amber-500/40 active:scale-95 cursor-pointer group select-none"
            title="Ask Yellow Hauz AI Concierge"
            aria-label="Ask Yellow Hauz AI Concierge"
          >
            <div className="relative flex flex-col items-center justify-center w-7 h-7 sm:w-8 sm:h-8 shrink-0">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-950 animate-pulse" />
              <span className="text-[8px] sm:text-[9px] font-black leading-none tracking-tighter text-stone-950 mt-0.5">
                AI
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold tracking-tight text-stone-950 ml-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 whitespace-nowrap pr-2">
              Concierge
            </span>
          </button>
        </aside>
      )}

      {isCustomerLoginOpen && (
        <CustomerLoginModal
          onClose={() => setIsCustomerLoginOpen(false)}
          onSuccess={(c) => {
            setActiveCustomer(c);
            setIsCustomerLoginOpen(false);
            if (customerTab !== 'menu' && customerTab !== 'reservation' && customerTab !== 'orders') {
              setCustomerTab('account');
            }
          }}
        />
      )}

      {/* In-App Low Stock Notification Modal for Cashier & Admin */}
      {isLowStockModalOpen && (
        <LowStockNotificationModal
          isOpen={isLowStockModalOpen}
          onClose={() => setIsLowStockModalOpen(false)}
          categories={categories}
          activeStaff={activeStaff}
          onNavigateToInventory={
            activeStaff?.role === 'admin'
              ? () => {
                  setIsLowStockModalOpen(false);
                  setAppMode('staff');
                  setStaffTab('inventory');
                }
              : undefined
          }
        />
      )}

      {/* In-Store Scanned QR Table Modal (Triggered via ?table=6 or QR scan) */}
      <ScannedTableModal
        isOpen={scannedTableModalOpen && scannedTableNumber !== null}
        onClose={() => setScannedTableModalOpen(false)}
        scannedTableNumber={scannedTableNumber || 0}
        activeCustomer={activeCustomer}
        currentTableBinding={activeTableBinding}
        onConfirmed={(binding) => {
          handleBindTable(binding.tableNumber);
          setScannedTableModalOpen(false);
          setAppMode('customer');
          setCustomerTab('menu');
        }}
        onOpenManualTablePicker={() => {
          setScannedTableModalOpen(false);
          setManualTableModalOpen(true);
        }}
        onSwitchToOnline={() => {
          handleClearTableBinding();
          setScannedTableModalOpen(false);
        }}
      />

      {/* Online Manual Table Selector Modal (Triggered when user chooses/changes table online) */}
      <TableRequestModal
        isOpen={manualTableModalOpen}
        onClose={() => setManualTableModalOpen(false)}
        initialSelectedTable={activeTableBinding?.tableNumber || null}
        onConfirmed={(binding) => {
          handleBindTable(binding.tableNumber);
          setManualTableModalOpen(false);
        }}
        activeCustomer={activeCustomer}
        currentTableBinding={activeTableBinding}
        onSwitchToOnline={() => {
          handleClearTableBinding();
          setManualTableModalOpen(false);
        }}
      />
    </div>
  );
}
