import React, { useState, useEffect, useMemo } from 'react';
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
} from './types';
import { AppStore } from './services/store';
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
import { SettingsManager } from './components/pos/SettingsManager';
import { ReceiptModal } from './components/ReceiptModal';
import { CustomerOrderSubmittedModal } from './components/customer/CustomerOrderSubmittedModal';
import { ChatbotModal } from './components/ChatbotModal';
import { LowStockNotificationModal } from './components/pos/LowStockNotificationModal';
import { TableRequestModal } from './components/customer/TableRequestModal';
import { ScannedTableModal } from './components/customer/ScannedTableModal';
import { Bot, Coffee } from 'lucide-react';
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

  // App navigation state
  const [appMode, setAppMode] = useState<'customer' | 'staff'>('staff');
  const [customerTab, setCustomerTab] = useState<
    'home' | 'menu' | 'orders' | 'reservation' | 'venue' | 'account'
  >('home');
  const [staffTab, setStaffTab] = useState<
    'dashboard' | 'pos' | 'tables' | 'tickets' | 'reports' | 'analytics' | 'inventory' | 'settings'
  >('dashboard');

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

  // Scanned QR Table Modal (for customers scanning in-store table URL ?table=6)
  const [scannedTableModalOpen, setScannedTableModalOpen] = useState(false);
  const [scannedTableNumber, setScannedTableNumber] = useState<number | null>(null);

  // Manual Online Table Picker Modal (for customers choosing tables from website floor map)
  const [manualTableModalOpen, setManualTableModalOpen] = useState(false);
  const lastHandledUrlTableRef = React.useRef<number | null>(null);

  // Customer Cart state
  const [customerCart, setCustomerCart] = useState<CartItem[]>([]);
  const [isCustomerCartOpen, setIsCustomerCartOpen] = useState(false);

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
    setIsCustomerCartOpen(true);
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
    AppStore.setActiveTableBinding(null);
    setActiveTableBinding(null);
  };

  useEffect(() => {
    AppStore.initFirebaseSync();

    // Clean wipe database to 0 data upon user's request
    if (localStorage.getItem('yh_zero_reset_done') !== 'true') {
      AppStore.resetDatabaseToZero().then(() => {
        try {
          localStorage.setItem('yh_zero_reset_done', 'true');
        } catch {}
      });
    }

    const unsubscribe = AppStore.subscribe(() => {
      refreshAppData();
    });
    return () => unsubscribe();
  }, []);

  // Monitor URL table parameter changes (e.g. ?table=6 to ?table=5) and trigger scanned table modal
  useEffect(() => {
    const checkUrlTable = () => {
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
    };

    // Check immediately on mount
    checkUrlTable();

    // Listen for browser history and hash navigation
    window.addEventListener('popstate', checkUrlTable);
    window.addEventListener('hashchange', checkUrlTable);

    // Continuous check to detect query param changes without full page reload
    const intervalId = setInterval(checkUrlTable, 300);

    return () => {
      window.removeEventListener('popstate', checkUrlTable);
      window.removeEventListener('hashchange', checkUrlTable);
      clearInterval(intervalId);
    };
  }, []);

  // Enforce role-based access control:
  // - Cook strictly accesses Tickets ONLY
  // - Cashiers strictly access Register, Floor Plan, and Tickets
  useEffect(() => {
    if (activeStaff) {
      if (activeStaff.role === 'cook') {
        if (staffTab !== 'tickets') {
          setStaffTab('tickets');
        }
      } else if (activeStaff.role !== 'admin') {
        const allowedCashierTabs = ['pos', 'tables', 'tickets'];
        if (!allowedCashierTabs.includes(staffTab)) {
          setStaffTab('pos');
        }
      }
    }
  }, [activeStaff, staffTab]);

  const bestSellers = useMemo(() => {
    return menuItems.filter((i) => i.isBestSeller && i.isAvailable).slice(0, 6);
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
      className={`min-h-screen bg-stone-100/70 text-stone-900 flex flex-col selection:bg-amber-500 selection:text-stone-950 ${
        appMode === 'customer' ? 'customer-mode font-baskerville' : 'font-sans'
      }`}
    >
      {/* Navigation Bar */}
      <Navigation
        appMode={appMode}
        onSetAppMode={setAppMode}
        customerTab={customerTab}
        onSetCustomerTab={setCustomerTab}
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
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-2 sm:px-4 py-2 sm:py-3">
        {appMode === 'customer' ? (
          /* Customer Experience */
          <>
            {customerTab === 'home' && (
              <CustomerHome
                bestSellers={bestSellers}
                settings={settings}
                onNavigateMenu={() => setCustomerTab('menu')}
                onNavigateReservation={() => setCustomerTab('reservation')}
                onNavigateVenue={() => setCustomerTab('venue')}
                onNavigateOrders={() => setCustomerTab('orders')}
                onAddToCart={(item) => {
                  handleCustomerAddToCart(item);
                  setCustomerTab('menu');
                }}
              />
            )}

            {customerTab === 'menu' && (
              <CustomerMenu
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
              />
            )}

            {customerTab === 'orders' && (
              <CustomerOrders
                customer={activeCustomer}
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
                settings={settings}
                activeCustomer={activeCustomer}
                mode="table"
                onModeChange={(mode) => setCustomerTab(mode === 'venue' ? 'venue' : 'reservation')}
                onReservationSuccess={() => refreshAppData()}
                onRequireLogin={() => setIsCustomerLoginOpen(true)}
                onNavigateAccount={() => setCustomerTab('account')}
              />
            )}

            {customerTab === 'venue' && (
              <CustomerReservation
                settings={settings}
                activeCustomer={activeCustomer}
                mode="venue"
                onModeChange={(mode) => setCustomerTab(mode === 'venue' ? 'venue' : 'reservation')}
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
                onViewReceipt={(order) => {
                  if (order.status === 'to_confirm' || order.status === 'pending') {
                    setCustomerSubmittedOrder(order);
                  } else {
                    setSelectedReceiptOrder(order);
                  }
                }}
              />
            )}
          </>
        ) : (
          /* Staff POS & Terminal Experience */
          <>
            {!activeStaff ? (
              <StaffLogin
                onLoginSuccess={(u) => {
                  setActiveStaff(u);
                  if (u.role === 'admin') {
                    setStaffTab('dashboard');
                  } else if (u.role === 'cook') {
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

                {activeStaff.role === 'admin' && staffTab === 'inventory' && (
                  <InventoryManager categories={categories} />
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

      {/* Modals */}
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

      {isChatbotOpen && <ChatbotModal onClose={() => setIsChatbotOpen(false)} />}

      {isCustomerLoginOpen && (
        <CustomerLoginModal
          onClose={() => setIsCustomerLoginOpen(false)}
          onSuccess={(c) => {
            setActiveCustomer(c);
            setIsCustomerLoginOpen(false);
            if (customerTab !== 'menu' && customerTab !== 'reservation' && customerTab !== 'venue') {
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
