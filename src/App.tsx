import React, { useState, useEffect, useMemo } from 'react';
import {
  Category,
  MenuItem,
  Order,
  User,
  CustomerAccount,
  StoreSettings,
  Reservation,
} from './types';
import { AppStore } from './services/store';
import { Navigation } from './components/Navigation';
import { CustomerHome } from './components/customer/CustomerHome';
import { CustomerMenu } from './components/customer/CustomerMenu';
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
import { ChatbotModal } from './components/ChatbotModal';
import { LowStockNotificationModal } from './components/pos/LowStockNotificationModal';
import { Bot, Coffee } from 'lucide-react';
import { ModalProvider } from './context/ModalContext';

export default function App() {
  return (
    <ModalProvider>
      <MainApp />
    </ModalProvider>
  );
}

function MainApp() {
  // App navigation state
  const [appMode, setAppMode] = useState<'customer' | 'staff'>('staff');
  const [customerTab, setCustomerTab] = useState<
    'home' | 'menu' | 'reservation' | 'venue' | 'account'
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

  // Modals
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
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
  };

  useEffect(() => {
    AppStore.initFirebaseSync();
    const unsubscribe = AppStore.subscribe(() => {
      refreshAppData();
    });
    return () => unsubscribe();
  }, []);

  // Enforce role-based access control: Cashiers strictly access Register, Floor Plan, and Tickets
  useEffect(() => {
    if (activeStaff && activeStaff.role !== 'admin') {
      const allowedCashierTabs = ['pos', 'tables', 'tickets'];
      if (!allowedCashierTabs.includes(staffTab)) {
        setStaffTab('pos');
      }
    }
  }, [activeStaff, staffTab]);

  const bestSellers = useMemo(() => {
    return menuItems.filter((i) => i.isBestSeller && i.isAvailable).slice(0, 6);
  }, [menuItems]);

  const handleStaffLogout = () => {
    AppStore.setActiveStaff(null);
    setActiveStaff(null);
  };

  const handleCustomerLogout = () => {
    AppStore.setActiveCustomer(null);
    setActiveCustomer(null);
    setCustomerTab('home');
  };

  const handleOrderSuccess = (order: Order) => {
    refreshAppData();
    setSelectedReceiptOrder(order);
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
        onStaffLogout={handleStaffLogout}
        onCustomerLoginClick={() => setIsCustomerLoginOpen(true)}
        onOpenChatbot={() => setIsChatbotOpen(true)}
        cartCount={0}
        isPinned={isNavPinned}
        onTogglePin={handleToggleNavPin}
        isNavVisible={isNavVisible}
        onSetNavVisible={setIsNavVisible}
        onOpenLowStockModal={() => setIsLowStockModalOpen(true)}
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
                onAddToCart={(item) => {
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
                onOrderSuccess={handleOrderSuccess}
                onRequireLogin={() => setIsCustomerLoginOpen(true)}
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
                onViewReceipt={(order) => setSelectedReceiptOrder(order)}
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
            setCustomerTab('account');
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
    </div>
  );
}
