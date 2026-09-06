import { StaffTabType } from '../types';

export type AppRoute =
  | { mode: 'customer'; tab: 'home' | 'menu' | 'orders' | 'reservation' | 'account'; tableNumber?: number | null }
  | { mode: 'staff'; roleTarget?: 'cashier' | 'cook' | 'barista' | 'admin'; staffTab?: StaffTabType };

export class AppRouter {
  /**
   * Parse the current browser window location (pathname, hash, search parameters)
   * to determine the requested application mode, tab, role, and table.
   */
  static parseCurrentRoute(): AppRoute {
    if (typeof window === 'undefined') {
      return { mode: 'customer', tab: 'home' };
    }

    try {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const searchParams = new URLSearchParams(window.location.search);

      // Check table param in query or hash (e.g. ?table=5, ?t=5)
      const tableParam =
        searchParams.get('table') ||
        searchParams.get('t') ||
        searchParams.get('tablenumber') ||
        searchParams.get('table_id') ||
        searchParams.get('tableid');
      const tableNumber = tableParam ? parseInt(tableParam.replace(/\D/g, ''), 10) || null : null;

      // 1. Check Admin routes (e.g. ?mode=admin, /admin, #admin)
      if (
        pathname.startsWith('/admin') ||
        hash.includes('/admin') ||
        hash.includes('#admin') ||
        searchParams.get('mode') === 'admin' ||
        searchParams.get('portal') === 'admin' ||
        searchParams.get('role') === 'admin'
      ) {
        const tabParam = searchParams.get('tab') as StaffTabType;
        const validAdminTabs: StaffTabType[] = ['dashboard', 'pos', 'tables', 'tickets', 'reports', 'analytics', 'inventory', 'settings', 'refills'];
        return { mode: 'staff', roleTarget: 'admin', staffTab: validAdminTabs.includes(tabParam) ? tabParam : 'dashboard' };
      }

      // 2. Check Barista / Bar routes (e.g. ?mode=barista, /barista, #barista, ?mode=bar, /bar)
      if (
        pathname.startsWith('/barista') ||
        pathname.startsWith('/bar') ||
        hash.includes('/barista') ||
        hash.includes('#barista') ||
        hash.includes('/bar') ||
        hash.includes('#bar') ||
        searchParams.get('mode') === 'barista' ||
        searchParams.get('mode') === 'bar' ||
        searchParams.get('portal') === 'barista' ||
        searchParams.get('portal') === 'bar' ||
        searchParams.get('role') === 'barista'
      ) {
        const tabParam = searchParams.get('tab') as StaffTabType;
        return { mode: 'staff', roleTarget: 'barista', staffTab: tabParam === 'refills' ? 'refills' : 'tickets' };
      }

      // 3. Check Cook / Kitchen routes (e.g. ?mode=cook, /cook, #kitchen)
      if (
        pathname.startsWith('/cook') ||
        pathname.startsWith('/kitchen') ||
        hash.includes('/cook') ||
        hash.includes('#cook') ||
        hash.includes('/kitchen') ||
        hash.includes('#kitchen') ||
        searchParams.get('mode') === 'cook' ||
        searchParams.get('mode') === 'kitchen' ||
        searchParams.get('portal') === 'cook' ||
        searchParams.get('portal') === 'kitchen' ||
        searchParams.get('role') === 'cook'
      ) {
        const tabParam = searchParams.get('tab') as StaffTabType;
        return { mode: 'staff', roleTarget: 'cook', staffTab: tabParam === 'refills' ? 'refills' : 'tickets' };
      }

      // 4. Check POS / Cashier routes
      if (
        pathname.startsWith('/pos') ||
        pathname.startsWith('/cashier') ||
        hash.includes('/pos') ||
        hash.includes('#pos') ||
        hash.includes('/cashier') ||
        hash.includes('#cashier') ||
        searchParams.get('mode') === 'pos' ||
        searchParams.get('mode') === 'cashier' ||
        searchParams.get('portal') === 'pos' ||
        searchParams.get('portal') === 'cashier' ||
        searchParams.get('role') === 'cashier'
      ) {
        const tabParam = searchParams.get('tab') as StaffTabType;
        const validCashierTabs: StaffTabType[] = ['pos', 'tables', 'tickets', 'refills'];
        return { mode: 'staff', roleTarget: 'cashier', staffTab: validCashierTabs.includes(tabParam) ? tabParam : 'pos' };
      }

      // 5. Check general Staff / Portal routes (e.g. ?mode=staff, /staff, #staff)
      if (
        pathname.startsWith('/staff') ||
        pathname.startsWith('/portal') ||
        pathname.startsWith('/terminal') ||
        hash.includes('/staff') ||
        hash.includes('#staff') ||
        hash.includes('/portal') ||
        hash.includes('#portal') ||
        searchParams.get('mode') === 'staff' ||
        searchParams.get('portal') === 'staff'
      ) {
        const tabParam = searchParams.get('tab') as StaffTabType;
        const validStaffTabs: StaffTabType[] = ['pos', 'tables', 'tickets', 'refills'];
        return { mode: 'staff', roleTarget: 'cashier', staffTab: validStaffTabs.includes(tabParam) ? tabParam : 'pos' };
      }

      // 5. Check Customer tabs
      if (pathname.startsWith('/menu') || hash.includes('/menu') || searchParams.get('tab') === 'menu') {
        return { mode: 'customer', tab: 'menu', tableNumber };
      }
      if (pathname.startsWith('/orders') || hash.includes('/orders') || searchParams.get('tab') === 'orders') {
        return { mode: 'customer', tab: 'orders', tableNumber };
      }
      if (
        pathname.startsWith('/reservation') ||
        pathname.startsWith('/reserve') ||
        hash.includes('/reservation') ||
        hash.includes('/reserve') ||
        searchParams.get('tab') === 'reservation'
      ) {
        return { mode: 'customer', tab: 'reservation', tableNumber };
      }
      if (pathname.startsWith('/account') || hash.includes('/account') || searchParams.get('tab') === 'account') {
        return { mode: 'customer', tab: 'account', tableNumber };
      }

      // If in-store table QR was scanned (?table=5), start directly on the Menu page (not landing page)
      if (tableNumber) {
        return { mode: 'customer', tab: 'menu', tableNumber };
      }

      // Default customer home
      return { mode: 'customer', tab: 'home', tableNumber: null };
    } catch (e) {
      console.warn('Error parsing current route:', e);
      return { mode: 'customer', tab: 'home' };
    }
  }

  /**
   * Generates a direct URL for a specific role or tab.
   */
  static getRouteUrl(
    target: 'admin' | 'staff' | 'cook' | 'barista' | 'pos' | 'menu' | 'orders' | 'reservation' | 'account' | 'home',
    useQueryParam: boolean = true
  ): string {
    if (typeof window === 'undefined') return `/${target === 'home' ? '' : target}`;
    const origin = window.location.origin;

    if (useQueryParam) {
      switch (target) {
        case 'staff':
        case 'pos':
          return `${origin}/?mode=staff`;
        case 'admin':
          return `${origin}/?mode=admin`;
        case 'cook':
          return `${origin}/?mode=cook`;
        case 'barista':
          return `${origin}/?mode=barista`;
        case 'menu':
          return `${origin}/?tab=menu`;
        case 'orders':
          return `${origin}/?tab=orders`;
        case 'reservation':
          return `${origin}/?tab=reservation`;
        case 'account':
          return `${origin}/?tab=account`;
        case 'home':
        default:
          return `${origin}/`;
      }
    }

    switch (target) {
      case 'admin':
        return `${origin}/admin`;
      case 'staff':
        return `${origin}/staff`;
      case 'cook':
        return `${origin}/cook`;
      case 'barista':
        return `${origin}/barista`;
      case 'pos':
        return `${origin}/pos`;
      case 'menu':
        return `${origin}/menu`;
      case 'orders':
        return `${origin}/orders`;
      case 'reservation':
        return `${origin}/reservation`;
      case 'account':
        return `${origin}/account`;
      case 'home':
      default:
        return `${origin}/`;
    }
  }

  /**
   * Generates a direct Table QR URL for in-store dine-in tables.
   */
  static getTableUrl(tableNumber: number): string {
    if (typeof window === 'undefined') return `/?table=${tableNumber}`;
    return `${window.location.origin}/?table=${tableNumber}`;
  }

  /**
   * Synchronize the browser URL history without reloading the page.
   */
  static syncBrowserUrl(
    appMode: 'customer' | 'staff',
    customerTab: string,
    staffRole?: 'admin' | 'cook' | 'barista' | 'cashier' | null,
    staffTab?: string
  ): void {
    if (typeof window === 'undefined') return;

    try {
      let targetPath = '/';
      const searchParams = new URLSearchParams(window.location.search);

      // Preserve table query param if customer is table-bound or visited with ?table=X
      const tableParam = searchParams.get('table');

      if (appMode === 'staff') {
        if (staffRole === 'admin') {
          targetPath = staffTab === 'inventory' ? '/?mode=admin&tab=inventory' : '/?mode=admin';
        } else if (staffRole === 'barista') {
          targetPath = staffTab === 'refills' ? '/?mode=barista&tab=refills' : '/?mode=barista';
        } else if (staffRole === 'cook') {
          targetPath = staffTab === 'refills' ? '/?mode=cook&tab=refills' : '/?mode=cook';
        } else {
          targetPath = staffTab === 'refills' ? '/?mode=staff&tab=refills' : '/?mode=staff';
        }
      } else {
        if (tableParam) {
          targetPath = `/?table=${tableParam}`;
        } else if (customerTab === 'menu') {
          targetPath = '/?tab=menu';
        } else if (customerTab === 'orders') {
          targetPath = '/?tab=orders';
        } else if (customerTab === 'reservation') {
          targetPath = '/?tab=reservation';
        } else if (customerTab === 'account') {
          targetPath = '/?tab=account';
        } else {
          targetPath = '/';
        }
      }

      // Check if current search + pathname matches
      const currentFull = window.location.pathname + window.location.search;
      if (currentFull !== targetPath) {
        window.history.replaceState({ appMode, customerTab, staffRole, staffTab }, '', targetPath);
      }
    } catch (e) {
      console.warn('Failed to sync browser URL:', e);
    }
  }
}
