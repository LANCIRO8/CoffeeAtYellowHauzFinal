import {
  Category,
  MenuItem,
  Table,
  User,
  Order,
  Reservation,
  CustomerAccount,
  StoreSettings,
  ChatIntent,
  Discount,
  TableBinding,
  TableRequest,
  TableRequestType,
  TableRequestStatus,
} from '../types';
import {
  SEED_CATEGORIES,
  SEED_MENU_ITEMS,
  SEED_TABLES,
  SEED_USERS,
  SEED_SETTINGS,
  SEED_INTENTS,
} from '../data/seedData';
import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

// Empty initial collections for fresh 0-data zeroed state
const INITIAL_ORDERS: Order[] = [];
const INITIAL_RESERVATIONS: Reservation[] = [];

export const DEFAULT_DISCOUNTS: Discount[] = [
  {
    id: 'pwd',
    name: 'PWD (Persons with Disability)',
    code: 'PWD20',
    type: 'percent',
    value: 20,
    description: '20% statutory discount for PWD ID holders',
    isSystem: true,
    requiresId: true,
  },
  {
    id: 'senior',
    name: 'Senior Citizen',
    code: 'SENIOR20',
    type: 'percent',
    value: 20,
    description: '20% statutory discount for Senior Citizen OSCA ID holders',
    isSystem: true,
    requiresId: true,
  },
  {
    id: 'student',
    name: 'Student Discount',
    code: 'STUDENT10',
    type: 'percent',
    value: 10,
    description: '10% discount for verified student ID holders',
    isSystem: true,
    requiresId: true,
  },
  {
    id: 'employee',
    name: 'Staff & Barista Partner',
    code: 'STAFF30',
    type: 'percent',
    value: 30,
    description: '30% Yellow Hauz employee partner discount',
    isSystem: true,
  },
  {
    id: 'vip',
    name: 'Yellow Hauz VIP Club',
    code: 'VIP15',
    type: 'percent',
    value: 15,
    description: '15% special loyalty club voucher',
    isSystem: false,
  },
];

const STORAGE_KEYS = {
  ITEMS: 'yh_menu_items',
  CATEGORIES: 'yh_categories',
  TABLES: 'yh_tables',
  ORDERS: 'yh_orders',
  RESERVATIONS: 'yh_reservations',
  CUSTOMERS: 'yh_customers',
  SETTINGS: 'yh_settings',
  USERS: 'yh_users',
  ACTIVE_STAFF: 'yh_active_staff',
  ACTIVE_CUSTOMER: 'yh_active_customer',
  ACTIVE_TABLE_BINDING: 'yh_active_table_binding',
  DISCOUNTS: 'yh_discounts',
  TABLE_REQUESTS: 'yh_table_requests',
  CLIENT_SESSION_ID: 'yh_client_session_id',
};

// Defensive helper to strip undefined values so Firestore never throws 'Unsupported field value: undefined'
export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => cleanForFirestore(v)) as unknown as T;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        res[k] = cleanForFirestore(v);
      }
    }
    return res as T;
  }
  return obj;
}

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

type StoreListener = () => void;

export class AppStore {
  private static listeners: Set<StoreListener> = new Set();
  private static isInitialized = false;
  private static isNotifying = false;
  private static notifyQueued = false;

  static subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  static notify(): void {
    if (this.isNotifying) {
      this.notifyQueued = true;
      return;
    }

    this.isNotifying = true;
    try {
      this.listeners.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.error('Listener notify error:', e);
        }
      });
    } finally {
      this.isNotifying = false;
      if (this.notifyQueued) {
        this.notifyQueued = false;
        // Schedule deferred notify on next microtask so stack is completely unwound
        queueMicrotask(() => {
          this.notify();
        });
      }
    }
  }

  // Initialize real-time Firebase Firestore synchronization
  static initFirebaseSync(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Listen to Categories
      onSnapshot(collection(db, 'categories'), (snapshot) => {
        if (!snapshot.empty) {
          const cats = snapshot.docs.map((doc) => doc.data() as Category);
          cats.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          setStored(STORAGE_KEYS.CATEGORIES, cats);
          this.notify();
        } else {
          // Seed categories to Firestore
          SEED_CATEGORIES.forEach((cat) => {
            setDoc(doc(db, 'categories', String(cat.id)), cleanForFirestore(cat)).catch(() => {});
          });
        }
      });

      // 2. Listen to Menu Items
      onSnapshot(collection(db, 'menu_items'), (snapshot) => {
        if (!snapshot.empty) {
          const items = snapshot.docs.map((doc) => doc.data() as MenuItem);
          // Ensure any new seed items are synced
          const existingIds = new Set(items.map((i) => i.id));
          const missingSeedItems = SEED_MENU_ITEMS.filter((s) => !existingIds.has(s.id));
          if (missingSeedItems.length > 0) {
            missingSeedItems.forEach((item) => {
              items.push(item);
              setDoc(doc(db, 'menu_items', String(item.id)), cleanForFirestore(item)).catch(() => {});
            });
          }
          items.sort((a, b) => a.id - b.id);
          setStored(STORAGE_KEYS.ITEMS, items);
          this.notify();
        } else {
          // Seed menu items
          SEED_MENU_ITEMS.forEach((item) => {
            setDoc(doc(db, 'menu_items', String(item.id)), cleanForFirestore(item)).catch(() => {});
          });
        }
      });

      // 3. Listen to Tables
      onSnapshot(collection(db, 'tables'), (snapshot) => {
        if (!snapshot.empty) {
          const tables = snapshot.docs.map((doc) => doc.data() as Table);
          tables.sort((a, b) => a.tableNumber - b.tableNumber);
          setStored(STORAGE_KEYS.TABLES, tables);
          this.notify();
        } else {
          // Seed tables
          SEED_TABLES.forEach((table) => {
            setDoc(doc(db, 'tables', String(table.id)), cleanForFirestore(table)).catch(() => {});
          });
        }
      });

      // 4. Listen to Orders
      onSnapshot(collection(db, 'orders'), (snapshot) => {
        if (!snapshot.empty) {
          const orders = snapshot.docs.map((doc) => doc.data() as Order);
          orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStored(STORAGE_KEYS.ORDERS, orders);
        } else {
          setStored(STORAGE_KEYS.ORDERS, []);
        }
        this.notify();
      });

      // 5. Listen to Reservations
      onSnapshot(collection(db, 'reservations'), (snapshot) => {
        if (!snapshot.empty) {
          const resList = snapshot.docs.map((doc) => doc.data() as Reservation);
          resList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStored(STORAGE_KEYS.RESERVATIONS, resList);
        } else {
          setStored(STORAGE_KEYS.RESERVATIONS, []);
        }
        this.notify();
      });

      // 6. Listen to Store Settings
      onSnapshot(collection(db, 'settings'), (snapshot) => {
        if (!snapshot.empty) {
          const settingsDoc = snapshot.docs.find((d) => d.id === 'general');
          if (settingsDoc) {
            const settings = settingsDoc.data() as StoreSettings;
            setStored(STORAGE_KEYS.SETTINGS, settings);
            this.notify();
          }
        } else {
          setDoc(doc(db, 'settings', 'general'), cleanForFirestore(SEED_SETTINGS)).catch(() => {});
        }
      });

      // 7. Listen to Users
      onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const rawUsers = snapshot.docs.map((doc) => {
            const u = doc.data() as User;
            if (u.fullName === 'System Administrator') {
              u.fullName = 'Admin';
            }
            if ((u as any).role === 'chef') {
              u.role = 'cook';
            }
            // Auto-pad or convert legacy 4-digit PINs to 8 digits if present
            if (u.pin && u.pin.length === 4) {
              if (u.role === 'admin' && u.pin === '1234') {
                u.pin = '12345678';
              } else if (u.pin === '0000') {
                u.pin = '00000000';
              } else {
                u.pin = u.pin.repeat(2);
              }
            } else if (!u.pin) {
              u.pin = u.role === 'admin' ? '12345678' : u.role === 'cook' ? '55667788' : '00000000';
            }
            return u;
          });

          // Deduplicate by id and username
          const userMap = new Map<string, User>();
          rawUsers.forEach((u) => {
            const uKey = (u.username || u.fullName || String(u.id)).toLowerCase().trim();
            if (!userMap.has(uKey)) {
              userMap.set(uKey, u);
            }
          });

          // Ensure any default seed users (e.g. cook) are present
          SEED_USERS.forEach((seedU) => {
            const uKey = seedU.username.toLowerCase().trim();
            if (!userMap.has(uKey)) {
              userMap.set(uKey, seedU);
              setDoc(doc(db, 'users', String(seedU.id)), cleanForFirestore(seedU)).catch(() => {});
            }
          });

          const users = Array.from(userMap.values());
          setStored(STORAGE_KEYS.USERS, users);
          this.notify();
        } else {
          SEED_USERS.forEach((u) => {
            setDoc(doc(db, 'users', String(u.id)), cleanForFirestore(u)).catch(() => {});
          });
        }
      });

      // 8. Listen to Discounts & Coupons
      onSnapshot(collection(db, 'discounts'), (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((doc) => doc.data() as Discount);
          const existingIds = new Set(list.map((d) => d.id));
          DEFAULT_DISCOUNTS.forEach((def) => {
            if (!existingIds.has(def.id)) {
              list.push(def);
            }
          });
          setStored(STORAGE_KEYS.DISCOUNTS, list);
          this.notify();
        } else {
          DEFAULT_DISCOUNTS.forEach((d) => {
            setDoc(doc(db, 'discounts', d.id), cleanForFirestore(d)).catch(() => {});
          });
        }
      });

      // 9. Listen to Live Table Requests (Customer selection & Cashier confirmation)
      onSnapshot(collection(db, 'table_requests'), (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((doc) => doc.data() as TableRequest);
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setStored(STORAGE_KEYS.TABLE_REQUESTS, list);
        } else {
          setStored(STORAGE_KEYS.TABLE_REQUESTS, []);
        }
        this.notify();
      });
    } catch (err) {
      console.warn('Firebase sync initialization notice:', err);
    }
  }

  // Categories
  static getCategories(): Category[] {
    return getStored<Category[]>(STORAGE_KEYS.CATEGORIES, SEED_CATEGORIES);
  }

  static saveCategories(cats: Category[]): void {
    setStored(STORAGE_KEYS.CATEGORIES, cats);
    this.notify();
    cats.forEach((c) => {
      setDoc(doc(db, 'categories', String(c.id)), cleanForFirestore(c)).catch(() => {});
    });
  }

  static addCategory(categoryData: Omit<Category, 'id'>): Category {
    const cats = this.getCategories();
    const newId = cats.length ? Math.max(...cats.map((c) => c.id)) + 1 : 1;
    const newCat: Category = {
      ...categoryData,
      id: newId,
      sortOrder: categoryData.sortOrder ?? cats.length + 1,
    };
    cats.push(newCat);
    this.saveCategories(cats);

    setDoc(doc(db, 'categories', String(newCat.id)), cleanForFirestore(newCat)).catch((e) =>
      console.error('Firestore add category error:', e)
    );

    return newCat;
  }

  static updateCategory(id: number, updates: Partial<Category>): Category | null {
    const cats = this.getCategories();
    const idx = cats.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    cats[idx] = { ...cats[idx], ...updates };
    this.saveCategories(cats);

    updateDoc(doc(db, 'categories', String(id)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'categories', String(id)), cleanForFirestore(cats[idx])).catch(() => {});
    });

    return cats[idx];
  }

  static deleteCategory(id: number): boolean {
    let cats = this.getCategories();
    const prevLen = cats.length;
    cats = cats.filter((c) => c.id !== id);
    if (cats.length !== prevLen) {
      this.saveCategories(cats);
      deleteDoc(doc(db, 'categories', String(id))).catch(() => {});
      return true;
    }
    return false;
  }

  static reassignCategoryItems(oldCatId: number, newCatId: number): number {
    const items = this.getMenuItems();
    let count = 0;
    items.forEach((item) => {
      if (item.categoryId === oldCatId) {
        item.categoryId = newCatId;
        count++;
        updateDoc(doc(db, 'menu_items', String(item.id)), { categoryId: newCatId }).catch(() => {});
      }
    });
    if (count > 0) {
      this.saveMenuItems(items);
    }
    return count;
  }

  // Menu Items
  static getMenuItems(): MenuItem[] {
    const items = getStored<MenuItem[]>(STORAGE_KEYS.ITEMS, SEED_MENU_ITEMS);
    const existingIds = new Set(items.map((i) => i.id));
    const missing = SEED_MENU_ITEMS.filter((s) => !existingIds.has(s.id));
    if (missing.length > 0) {
      const merged = [...items, ...missing];
      merged.sort((a, b) => a.id - b.id);
      setStored(STORAGE_KEYS.ITEMS, merged);
      return merged;
    }
    return items;
  }

  static saveMenuItems(items: MenuItem[]): void {
    setStored(STORAGE_KEYS.ITEMS, items);
    this.notify();
  }

  static addMenuItem(item: Omit<MenuItem, 'id'>): MenuItem {
    const items = this.getMenuItems();
    const newId = items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
    const newItem: MenuItem = { ...item, id: newId };
    items.push(newItem);
    this.saveMenuItems(items);

    // Sync to Firestore
    setDoc(doc(db, 'menu_items', String(newItem.id)), cleanForFirestore(newItem)).catch((e) =>
      console.error('Firestore add error:', e)
    );

    return newItem;
  }

  static updateMenuItem(id: number, updates: Partial<MenuItem>): MenuItem | null {
    const items = this.getMenuItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    this.saveMenuItems(items);

    // Sync to Firestore
    updateDoc(doc(db, 'menu_items', String(id)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'menu_items', String(id)), cleanForFirestore(items[idx])).catch(() => {});
    });

    return items[idx];
  }

  static deleteMenuItem(id: number): boolean {
    let items = this.getMenuItems();
    const prevLen = items.length;
    items = items.filter((i) => i.id !== id);
    if (items.length !== prevLen) {
      this.saveMenuItems(items);
      deleteDoc(doc(db, 'menu_items', String(id))).catch(() => {});
      return true;
    }
    return false;
  }

  // Low Stock Helpers
  static getLowStockItems(threshold: number = 5): MenuItem[] {
    const items = this.getMenuItems();
    return items.filter((item) => item.quantity <= threshold);
  }

  static quickRestockItem(id: number, addQuantity: number): MenuItem | null {
    const items = this.getMenuItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;

    const newQty = Math.max(0, (items[idx].quantity || 0) + addQuantity);
    const updates: Partial<MenuItem> = {
      quantity: newQty,
      isAvailable: newQty > 0 ? true : items[idx].isAvailable,
    };

    items[idx] = { ...items[idx], ...updates };
    this.saveMenuItems(items);

    // Sync to Firestore
    updateDoc(doc(db, 'menu_items', String(id)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'menu_items', String(id)), cleanForFirestore(items[idx])).catch(() => {});
    });

    return items[idx];
  }

  static batchRestockLowStock(threshold: number = 5, addAmount: number = 10): number {
    const items = this.getMenuItems();
    let updatedCount = 0;
    items.forEach((item) => {
      if (item.quantity <= threshold) {
        item.quantity += addAmount;
        item.isAvailable = true;
        updatedCount++;
        updateDoc(doc(db, 'menu_items', String(item.id)), {
          quantity: item.quantity,
          isAvailable: true,
        }).catch(() => {});
      }
    });

    if (updatedCount > 0) {
      this.saveMenuItems(items);
    }
    return updatedCount;
  }

  // Floor plan tables
  static getTables(): Table[] {
    return getStored<Table[]>(STORAGE_KEYS.TABLES, SEED_TABLES);
  }

  static saveTables(tables: Table[]): void {
    setStored(STORAGE_KEYS.TABLES, tables);
    this.notify();
  }

  static addTable(tableData: Omit<Table, 'id'>): Table {
    const tables = this.getTables();
    const newId = tables.length ? Math.max(...tables.map((t) => t.id)) + 1 : 1;
    const newTable: Table = {
      ...tableData,
      id: newId,
    };
    tables.push(newTable);
    tables.sort((a, b) => a.tableNumber - b.tableNumber);
    this.saveTables(tables);

    // Sync to Firestore
    setDoc(doc(db, 'tables', String(newTable.id)), cleanForFirestore(newTable)).catch((e) =>
      console.error('Firestore add table error:', e)
    );

    return newTable;
  }

  static updateTable(id: number, updates: Partial<Table>): Table | null {
    const tables = this.getTables();
    const idx = tables.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    tables[idx] = { ...tables[idx], ...updates };
    tables.sort((a, b) => a.tableNumber - b.tableNumber);
    this.saveTables(tables);

    // Sync to Firestore
    setDoc(doc(db, 'tables', String(id)), cleanForFirestore(tables[idx])).catch((e) =>
      console.error('Firestore update table error:', e)
    );

    return tables[idx];
  }

  static deleteTable(id: number): boolean {
    let tables = this.getTables();
    const prevLen = tables.length;
    tables = tables.filter((t) => t.id !== id);
    if (tables.length !== prevLen) {
      this.saveTables(tables);
      deleteDoc(doc(db, 'tables', String(id))).catch((e) =>
        console.error('Firestore delete table error:', e)
      );
      return true;
    }
    return false;
  }

  static updateTableStatus(tableId: number, status: Table['status'], orderId?: number | null): Table | null {
    const tables = this.getTables();
    const idx = tables.findIndex((t) => t.id === tableId);
    if (idx === -1) return null;
    tables[idx].status = status;
    if (orderId !== undefined) {
      tables[idx].currentOrderId = orderId;
    }
    this.saveTables(tables);

    // Sync table state to Firestore
    setDoc(doc(db, 'tables', String(tableId)), cleanForFirestore(tables[idx])).catch(() => {});

    return tables[idx];
  }

  static getOrderChannel(order: Order): 'online' | 'in_store' {
    if (order.channel === 'online' || order.channel === 'in_store') {
      return order.channel;
    }
    if (
      order.cashierName?.toLowerCase().includes('online') ||
      order.customerId !== null && order.customerId !== undefined
    ) {
      return 'online';
    }
    return 'in_store';
  }

  // Orders
  static getOrders(): Order[] {
    const list = getStored<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
    return list.map((o) =>
      o.cashierName === 'System Administrator' ? { ...o, cashierName: 'Admin' } : o
    );
  }

  static saveOrders(orders: Order[]): void {
    setStored(STORAGE_KEYS.ORDERS, orders);
    this.notify();
  }

  static createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Order {
    const orders = this.getOrders();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(orders.length + 1).padStart(3, '0');
    const orderNumber = `YH-${dateStr}-${seq}`;
    const newId = orders.length ? Math.max(...orders.map((o) => o.id)) + 1 : 1001;

    const channel: 'online' | 'in_store' =
      orderData.channel ||
      (orderData.cashierName?.toLowerCase().includes('online') ? 'online' : 'in_store');

    // Dual-Mode Order Classification:
    // If an incoming transaction carries a designated table number, the system processes it as a live in-house order.
    // If it carries a future timestamp and advance booking reservation details, it handles it as an advance booking.
    let classification: 'live_in_house' | 'advance_booking' = 'live_in_house';
    if (orderData.orderClassification) {
      classification = orderData.orderClassification;
    } else if (orderData.advanceBooking || orderData.scheduledFor) {
      classification = 'advance_booking';
    } else if (orderData.tableNumber || orderData.tableId || orderData.orderType === 'dine_in') {
      classification = 'live_in_house';
    } else if (channel === 'online') {
      classification = 'advance_booking';
    }

    const newOrder: Order = {
      id: newId,
      orderNumber,
      channel,
      orderClassification: classification,
      createdAt: new Date().toISOString(),
      tableId: orderData.tableId ?? null,
      tableNumber: orderData.tableNumber ?? null,
      customerId: orderData.customerId ?? null,
      customerName: orderData.customerName || (channel === 'online' ? 'Online Customer' : 'Walk-in Guest'),
      customerPhone: orderData.customerPhone || '',
      deliveryAddress: orderData.deliveryAddress || '',
      advanceBooking: orderData.advanceBooking || undefined,
      scheduledFor: orderData.scheduledFor || (orderData.advanceBooking ? `${orderData.advanceBooking.bookingDate} ${orderData.advanceBooking.arrivalTime}` : undefined),
      guestCount: orderData.guestCount ?? (orderData.advanceBooking ? orderData.advanceBooking.partySize : undefined),
      orderType: orderData.orderType || 'dine_in',
      paymentMethod: orderData.paymentMethod || 'cash',
      subtotal: Number(orderData.subtotal) || 0,
      taxRate: Number(orderData.taxRate) || 12,
      taxAmount: Number(orderData.taxAmount) || 0,
      totalAmount: Number(orderData.totalAmount) || 0,
      discountAmount: Number(orderData.discountAmount) || 0,
      discountType: orderData.discountType || 'none',
      discountPercent: Number(orderData.discountPercent) || 0,
      amountPaid: Number(orderData.amountPaid) || 0,
      changeAmount: Number(orderData.changeAmount) || 0,
      status: orderData.status || (channel === 'online' ? 'to_confirm' : 'to_prep'),
      cashierId: orderData.cashierId ?? (channel === 'online' ? 1 : 2),
      cashierName: orderData.cashierName || (channel === 'online' ? 'Online Storefront' : 'Staff Member'),
      items: (orderData.items || []).map((oi) => ({
        menuItemId: oi.menuItemId,
        name: oi.name || 'Menu Item',
        quantity: oi.quantity || 1,
        unitPrice: oi.unitPrice || 0,
        totalPrice: oi.totalPrice || (oi.unitPrice || 0) * (oi.quantity || 1),
        specialInstructions: oi.specialInstructions || '',
        imageUrl: oi.imageUrl || '',
      })),
    };

    orders.unshift(newOrder);
    this.saveOrders(orders);

    // Save to Firestore with clean sanitization
    setDoc(doc(db, 'orders', String(newOrder.id)), cleanForFirestore(newOrder)).catch((e) =>
      console.error('Firestore create order error:', e)
    );

    // Deduct stock in items & Firestore
    const items = this.getMenuItems();
    for (const oi of newOrder.items) {
      const match = items.find((i) => i.id === oi.menuItemId);
      if (match) {
        match.quantity = Math.max(0, match.quantity - oi.quantity);
        updateDoc(doc(db, 'menu_items', String(match.id)), { quantity: match.quantity }).catch(
          () => {}
        );
      }
    }
    this.saveMenuItems(items);

    // If dine in, mark table occupied
    if (newOrder.orderType === 'dine_in' && newOrder.tableId) {
      this.updateTableStatus(newOrder.tableId, 'occupied', newOrder.id);
    }

    return newOrder;
  }

  static updateOrderStatus(
    orderId: number,
    status: Order['status'],
    details?: {
      cancelReason?: string;
      cancelNotes?: string;
      cancelledBy?: string;
      returnReason?: string;
    }
  ): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;
    const prevStatus = order.status;
    order.status = status;
    const nowIso = new Date().toISOString();

    if (status === 'to_confirm') {
      order.returnedToCashierAt = nowIso;
      if (details?.returnReason) {
        order.returnReason = details.returnReason;
      }
    }
    if (status === 'to_prep' && !order.confirmedAt) {
      order.confirmedAt = nowIso;
    }
    if (status === 'processing' && !order.processingStartedAt) {
      order.processingStartedAt = nowIso;
    }
    if (status === 'to_serve' && !order.readyToServeAt) {
      order.readyToServeAt = nowIso;
    }
    if (status === 'completed' && !order.completedAt) {
      order.completedAt = nowIso;
      if (!order.readyToServeAt) {
        order.readyToServeAt = nowIso;
      }
      if (!order.processingStartedAt) {
        order.processingStartedAt = order.createdAt;
      }
    }
    if (status === 'cancelled') {
      order.cancelledAt = nowIso;
      if (details?.cancelReason) order.cancelReason = details.cancelReason;
      if (details?.cancelNotes) order.cancelNotes = details.cancelNotes;
      if (details?.cancelledBy) order.cancelledBy = details.cancelledBy;

      // Restore inventory if newly cancelled
      if (prevStatus !== 'cancelled') {
        const items = this.getMenuItems();
        for (const oi of order.items) {
          const match = items.find((i) => i.id === oi.menuItemId);
          if (match) {
            match.quantity = (match.quantity || 0) + oi.quantity;
            updateDoc(doc(db, 'menu_items', String(match.id)), { quantity: match.quantity }).catch(
              () => {}
            );
          }
        }
        this.saveMenuItems(items);
      }
    }

    this.saveOrders(orders);

    // Firestore sync
    const updates: Partial<Order> = {
      status,
      ...(order.confirmedAt ? { confirmedAt: order.confirmedAt } : {}),
      ...(order.processingStartedAt ? { processingStartedAt: order.processingStartedAt } : {}),
      ...(order.readyToServeAt ? { readyToServeAt: order.readyToServeAt } : {}),
      ...(order.completedAt ? { completedAt: order.completedAt } : {}),
      ...(order.cancelledAt ? { cancelledAt: order.cancelledAt } : {}),
      ...(order.cancelReason ? { cancelReason: order.cancelReason } : {}),
      ...(order.cancelNotes ? { cancelNotes: order.cancelNotes } : {}),
      ...(order.cancelledBy ? { cancelledBy: order.cancelledBy } : {}),
      ...(order.returnedToCashierAt ? { returnedToCashierAt: order.returnedToCashierAt } : {}),
      ...(order.returnReason ? { returnReason: order.returnReason } : {}),
    };

    updateDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(order)).catch(() => {});
    });

    // If order finished or cancelled, free table
    if ((status === 'completed' || status === 'cancelled') && order.tableId) {
      const tables = this.getTables();
      const table = tables.find((t) => t.id === order.tableId);
      if (table && table.currentOrderId === order.id) {
        this.updateTableStatus(table.id, 'available', null);
      }
    }

    return order;
  }

  // Reservations
  static getReservations(): Reservation[] {
    return getStored<Reservation[]>(STORAGE_KEYS.RESERVATIONS, INITIAL_RESERVATIONS);
  }

  static saveReservations(res: Reservation[]): void {
    setStored(STORAGE_KEYS.RESERVATIONS, res);
    this.notify();
  }

  static createReservation(
    data: Omit<Reservation, 'id' | 'reservationCode' | 'createdAt' | 'status'>
  ): Reservation {
    const resList = this.getReservations();
    const newId = resList.length ? Math.max(...resList.map((r) => r.id)) + 1 : 1;
    const isVenue = data.bookingType === 'venue';
    const code = isVenue
      ? `YH-VEN-${Math.floor(1000 + Math.random() * 9000)}`
      : `YH-RES-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRes: Reservation = {
      ...data,
      id: newId,
      reservationCode: code,
      bookingType: isVenue ? 'venue' : 'table',
      venueName: isVenue ? (data.venueName || 'The Yellow Hauz Private Studio & Event Nook') : undefined,
      venueDurationHours: isVenue ? (Number(data.venueDurationHours) || 3) : undefined,
      venueRate: isVenue ? (Number(data.venueRate) || 300) : undefined,
      venueAddons: isVenue ? (data.venueAddons || []) : undefined,
      totalAmount: isVenue ? (Number(data.totalAmount) || 300) : undefined,
      eventType: isVenue ? (data.eventType || 'Private Gathering') : undefined,
      seatingLayout: isVenue ? (data.seatingLayout || 'boardroom') : undefined,
      paymentStatus: isVenue ? (data.paymentStatus || 'unpaid') : undefined,
      paymentMethod: data.paymentMethod || (isVenue ? 'gcash' : undefined),
      status: 'pending',
      createdAt: new Date().toISOString(),
      tableId: isVenue ? 99 : (data.tableId || 1),
      tableNumber: isVenue ? 99 : (data.tableNumber || 1),
      customerId: data.customerId ?? null,
      customerName: data.customerName || 'Guest',
      contactNumber: data.contactNumber || '+63 900 000 0000',
      guestCount: Number(data.guestCount) || (isVenue ? 10 : 2),
      reservationAt: data.reservationAt || new Date().toISOString(),
      notes: data.notes || '',
    };

    resList.unshift(newRes);
    this.saveReservations(resList);

    // Firestore sync
    setDoc(doc(db, 'reservations', String(newRes.id)), cleanForFirestore(newRes)).catch((e) =>
      console.error('Firestore create reservation error:', e)
    );

    return newRes;
  }

  static updateReservationStatus(id: number, status: Reservation['status']): Reservation | null {
    const resList = this.getReservations();
    const res = resList.find((r) => r.id === id);
    if (!res) return null;
    res.status = status;
    this.saveReservations(resList);

    // Firestore sync
    updateDoc(doc(db, 'reservations', String(id)), { status }).catch(() => {
      setDoc(doc(db, 'reservations', String(id)), cleanForFirestore(res)).catch(() => {});
    });

    if (status === 'confirmed' && res.tableId) {
      this.updateTableStatus(res.tableId, 'reserved');
    } else if (status === 'cancelled' || status === 'completed') {
      if (res.tableId) {
        const table = this.getTables().find((t) => t.id === res.tableId);
        if (table && table.status === 'reserved') {
          this.updateTableStatus(res.tableId, 'available');
        }
      }
    }

    return res;
  }

  // Store Settings
  static getSettings(): StoreSettings {
    return getStored<StoreSettings>(STORAGE_KEYS.SETTINGS, SEED_SETTINGS);
  }

  static saveSettings(settings: StoreSettings): void {
    setStored(STORAGE_KEYS.SETTINGS, settings);
    this.notify();
    setDoc(doc(db, 'settings', 'general'), cleanForFirestore(settings)).catch(() => {});
  }

  // Users and Auth State
  static getUsers(): User[] {
    const list = getStored<User[]>(STORAGE_KEYS.USERS, SEED_USERS);
    const userMap = new Map<string, User>();

    list.forEach((u) => {
      if ((u as any).role === 'chef') {
        u.role = 'cook';
      }
      const uKey = (u.username || u.fullName || String(u.id)).toLowerCase().trim();
      if (!userMap.has(uKey)) {
        userMap.set(uKey, u);
      }
    });

    SEED_USERS.forEach((seedU) => {
      const uKey = seedU.username.toLowerCase().trim();
      if (!userMap.has(uKey)) {
        userMap.set(uKey, seedU);
      }
    });

    return Array.from(userMap.values()).map((u) => {
      let updated = u;
      if (u.fullName === 'System Administrator') {
        updated = { ...updated, fullName: 'Admin' };
      }
      if ((updated as any).role === 'chef') {
        updated = { ...updated, role: 'cook' };
      }
      // Ensure fallback PINs if missing
      if (!updated.pin) {
        updated = {
          ...updated,
          pin:
            updated.role === 'admin'
              ? '12345678'
              : updated.role === 'cook'
              ? '55667788'
              : '00000000',
        };
      }
      return updated;
    });
  }

  static saveUsers(users: User[]): void {
    setStored(STORAGE_KEYS.USERS, users);
    this.notify();
    users.forEach((u) => {
      setDoc(doc(db, 'users', String(u.id)), cleanForFirestore(u)).catch(() => {});
    });
  }

  static createUser(userData: Omit<User, 'id'>): User {
    const users = this.getUsers();
    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const newUser: User = {
      id: nextId,
      ...userData,
      pin: userData.pin || (userData.role === 'admin' ? '12345678' : '00000000'),
      createdAt: userData.createdAt || new Date().toISOString(),
    };
    const updatedUsers = [...users, newUser];
    this.saveUsers(updatedUsers);
    return newUser;
  }

  static updateUser(id: number, updates: Partial<User>): User | null {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    const updatedUser: User = { ...users[index], ...updates };
    users[index] = updatedUser;
    this.saveUsers(users);

    // If the updated user is the currently active staff, update active staff state too
    const currentActive = this.getActiveStaff();
    if (currentActive && currentActive.id === id) {
      this.setActiveStaff(updatedUser);
    }

    return updatedUser;
  }

  static deleteUser(id: number): boolean {
    const users = this.getUsers();
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) return false;

    // Safety guard: Cannot delete if it's the only admin
    const adminCount = users.filter((u) => u.role === 'admin' && u.status === 'active').length;
    if (userToDelete.role === 'admin' && adminCount <= 1) {
      return false;
    }

    const filtered = users.filter((u) => u.id !== id);
    setStored(STORAGE_KEYS.USERS, filtered);
    this.notify();

    deleteDoc(doc(db, 'users', String(id))).catch(() => {});

    // If deleting current active staff, log them out
    const currentActive = this.getActiveStaff();
    if (currentActive && currentActive.id === id) {
      this.setActiveStaff(null);
    }

    return true;
  }

  static resetUserPin(id: number, newPin: string): boolean {
    if (!/^\d{8}$/.test(newPin)) return false;
    const res = this.updateUser(id, { pin: newPin });
    return res !== null;
  }

  static toggleUserStatus(id: number): User | null {
    const users = this.getUsers();
    const target = users.find((u) => u.id === id);
    if (!target) return null;

    const nextStatus = target.status === 'active' ? 'inactive' : 'active';
    // Prevent deactivating the only admin
    if (target.role === 'admin' && target.status === 'active') {
      const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'active').length;
      if (activeAdmins <= 1) {
        return null;
      }
    }

    return this.updateUser(id, { status: nextStatus });
  }

  static getActiveStaff(): User | null {
    const staff = getStored<User | null>(STORAGE_KEYS.ACTIVE_STAFF, null);
    if (staff && staff.fullName === 'System Administrator') {
      return { ...staff, fullName: 'Admin' };
    }
    return staff;
  }

  static setActiveStaff(user: User | null): void {
    setStored(STORAGE_KEYS.ACTIVE_STAFF, user);
    this.notify();
  }

  static getActiveCustomer(): CustomerAccount | null {
    return getStored<CustomerAccount | null>(STORAGE_KEYS.ACTIVE_CUSTOMER, null);
  }

  static setActiveCustomer(cust: CustomerAccount | null): void {
    setStored(STORAGE_KEYS.ACTIVE_CUSTOMER, cust);
    this.notify();
  }

  // Dual-Mode Table Binding Engine (for Dine-in Patrons vs External Online)
  static getActiveTableBinding(): TableBinding | null {
    return getStored<TableBinding | null>(STORAGE_KEYS.ACTIVE_TABLE_BINDING, null);
  }

  static setActiveTableBinding(binding: TableBinding | null): void {
    setStored(STORAGE_KEYS.ACTIVE_TABLE_BINDING, binding);
    try {
      if (typeof window !== 'undefined' && window.history && window.location) {
        const url = new URL(window.location.href);
        if (binding) {
          url.searchParams.set('table', String(binding.tableNumber));
        } else {
          url.searchParams.delete('table');
          url.searchParams.delete('t');
          url.searchParams.delete('tableNumber');
          url.searchParams.delete('tableId');
          url.searchParams.delete('table_id');
        }
        window.history.replaceState(null, '', url.toString());
      }
    } catch {
      // ignore
    }
    this.notify();
  }

  static bindTableByNumber(
    tableNumber: number,
    autoBound: boolean = false,
    assignedByCashier?: string
  ): TableBinding | null {
    const tables = this.getTables();
    const match = tables.find((t) => t.tableNumber === tableNumber);
    if (!match) return null;
    const binding: TableBinding = {
      tableId: match.id,
      tableNumber: match.tableNumber,
      area: match.area,
      capacity: match.capacity,
      autoBound,
      assignedByCashier: assignedByCashier || 'Cashier on Duty',
      assignedAt: new Date().toISOString(),
    };
    this.setActiveTableBinding(binding);
    return binding;
  }

  // Client session identification
  static getClientSessionId(): string {
    let sid = getStored<string | null>(STORAGE_KEYS.CLIENT_SESSION_ID, null);
    if (!sid) {
      sid = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setStored(STORAGE_KEYS.CLIENT_SESSION_ID, sid);
    }
    return sid;
  }

  // Cashier Online Presence
  static isCashierOnline(): boolean {
    const active = this.getActiveStaff();
    if (
      active &&
      (active.role === 'cashier' || active.role === 'admin') &&
      active.status === 'active'
    ) {
      return true;
    }
    const users = this.getUsers();
    return users.some(
      (u) =>
        (u.role === 'cashier' || u.role === 'admin') &&
        u.status === 'active' &&
        Boolean(u.lastLogin)
    );
  }

  static getOnlineCashiers(): User[] {
    const active = this.getActiveStaff();
    if (
      active &&
      (active.role === 'cashier' || active.role === 'admin') &&
      active.status === 'active'
    ) {
      return [active];
    }
    return this.getUsers().filter(
      (u) => (u.role === 'cashier' || u.role === 'admin') && u.status === 'active'
    );
  }

  // Table Requests (Customer table choices & Cashier verification)
  static getTableRequests(): TableRequest[] {
    return getStored<TableRequest[]>(STORAGE_KEYS.TABLE_REQUESTS, []);
  }

  static saveTableRequests(requests: TableRequest[]): void {
    setStored(STORAGE_KEYS.TABLE_REQUESTS, requests);
    this.notify();
  }

  static getPendingTableRequests(): TableRequest[] {
    return this.getTableRequests().filter((r) => r.status === 'pending');
  }

  static getMyActiveTableRequest(sessionId?: string): TableRequest | null {
    const sid = sessionId || this.getClientSessionId();
    const requests = this.getTableRequests();
    // Return pending request first, or a recently resolved one (within 45s)
    const pending = requests.find((r) => r.sessionId === sid && r.status === 'pending');
    if (pending) return pending;

    const recent = requests.find(
      (r) =>
        r.sessionId === sid &&
        (r.status === 'approved' || r.status === 'rejected') &&
        r.respondedAt &&
        Date.now() - new Date(r.respondedAt).getTime() < 45000
    );
    return recent || null;
  }

  static createTableRequest(params: {
    tableNumber: number;
    currentTableNumber?: number | null;
    customerName?: string;
    customerPhone?: string;
    notes?: string;
    sessionId?: string;
    customerId?: number | null;
  }): TableRequest {
    const tables = this.getTables();
    const targetTable = tables.find((t) => t.tableNumber === params.tableNumber);
    const sid = params.sessionId || this.getClientSessionId();
    const reqId = `TR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const isChanging = Boolean(
      params.currentTableNumber && params.currentTableNumber !== params.tableNumber
    );

    const newRequest: TableRequest = {
      id: reqId,
      sessionId: sid,
      customerId: params.customerId ?? (this.getActiveCustomer()?.id || null),
      customerName:
        params.customerName?.trim() ||
        this.getActiveCustomer()?.fullName ||
        'Guest Customer',
      customerPhone:
        params.customerPhone?.trim() ||
        this.getActiveCustomer()?.contactNumber ||
        '',
      type: isChanging ? 'change_table' : 'new_table',
      currentTableNumber: params.currentTableNumber || null,
      requestedTableNumber: params.tableNumber,
      requestedTableId: targetTable ? targetTable.id : params.tableNumber,
      area: targetTable ? targetTable.area : 'normal',
      capacity: targetTable ? targetTable.capacity : 4,
      notes: params.notes?.trim() || '',
      status: 'pending',
      cashierId: null,
      cashierName: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      respondedAt: null,
    };

    // Replace any old pending request from this same session
    const list = this.getTableRequests().filter(
      (r) => !(r.sessionId === sid && r.status === 'pending')
    );
    list.unshift(newRequest);
    this.saveTableRequests(list);

    // Sync to Firestore
    setDoc(doc(db, 'table_requests', reqId), cleanForFirestore(newRequest)).catch((e) =>
      console.error('Firestore create table request error:', e)
    );

    return newRequest;
  }

  static cancelTableRequest(requestId: string): void {
    const list = this.getTableRequests();
    const req = list.find((r) => r.id === requestId);
    if (req) {
      req.status = 'cancelled';
      req.respondedAt = new Date().toISOString();
      this.saveTableRequests(list);

      updateDoc(doc(db, 'table_requests', requestId), {
        status: 'cancelled',
        respondedAt: req.respondedAt,
      }).catch(() => {});
    }
  }

  static approveTableRequest(requestId: string, cashier: User): TableRequest | null {
    const list = this.getTableRequests();
    const req = list.find((r) => r.id === requestId);
    if (!req) return null;

    req.status = 'approved';
    req.cashierId = cashier.id;
    req.cashierName = cashier.fullName;
    req.respondedAt = new Date().toISOString();
    this.saveTableRequests(list);

    // Update target table to occupied in floor plan
    this.updateTableStatus(req.requestedTableId, 'occupied');

    // If changing tables, free the previous table if it has no active order
    if (req.currentTableNumber && req.currentTableNumber !== req.requestedTableNumber) {
      const oldTable = this.getTables().find((t) => t.tableNumber === req.currentTableNumber);
      if (oldTable && oldTable.status === 'occupied' && !oldTable.currentOrderId) {
        this.updateTableStatus(oldTable.id, 'available', null);
      }
    }

    // Firestore sync
    updateDoc(
      doc(db, 'table_requests', requestId),
      cleanForFirestore({
        status: 'approved',
        cashierId: cashier.id,
        cashierName: cashier.fullName,
        respondedAt: req.respondedAt,
      })
    ).catch(() => {
      setDoc(doc(db, 'table_requests', requestId), cleanForFirestore(req)).catch(() => {});
    });

    return req;
  }

  static rejectTableRequest(
    requestId: string,
    cashier: User,
    reason?: string
  ): TableRequest | null {
    const list = this.getTableRequests();
    const req = list.find((r) => r.id === requestId);
    if (!req) return null;

    req.status = 'rejected';
    req.cashierId = cashier.id;
    req.cashierName = cashier.fullName;
    req.rejectionReason =
      reason ||
      'Requested table is currently reserved or unavailable. Please choose another table.';
    req.respondedAt = new Date().toISOString();
    this.saveTableRequests(list);

    // Firestore sync
    updateDoc(
      doc(db, 'table_requests', requestId),
      cleanForFirestore({
        status: 'rejected',
        cashierId: cashier.id,
        cashierName: cashier.fullName,
        rejectionReason: req.rejectionReason,
        respondedAt: req.respondedAt,
      })
    ).catch(() => {
      setDoc(doc(db, 'table_requests', requestId), cleanForFirestore(req)).catch(() => {});
    });

    return req;
  }

  static parseTableParamFromUrl(): number | null {
    try {
      if (typeof window === 'undefined') return null;
      const url = new URL(window.location.href);
      // Support ?table=3, ?t=3, ?tableNumber=3, ?table_id=3, #table-3
      const tableParam =
        url.searchParams.get('table') ||
        url.searchParams.get('t') ||
        url.searchParams.get('tableNumber') ||
        url.searchParams.get('tableId') ||
        url.searchParams.get('table_id');

      if (tableParam) {
        const cleaned = tableParam.replace(/[^0-9]/g, '');
        const num = parseInt(cleaned, 10);
        if (!isNaN(num) && num > 0) return num;
      }

      // Check hash like #table-3 or #t3
      if (window.location.hash) {
        const hashMatch = window.location.hash.match(/table[-_]?(\d+)/i) || window.location.hash.match(/t(\d+)/i);
        if (hashMatch && hashMatch[1]) {
          const num = parseInt(hashMatch[1], 10);
          if (!isNaN(num) && num > 0) return num;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Chatbot Logic
  static getChatbotResponse(userMessage: string): string {
    const lower = userMessage.toLowerCase().trim();
    if (!lower) return 'How can I help you today with Yellow Hauz orders, menu, or tables?';

    // Check intents by exact pattern or keywords
    for (const intent of SEED_INTENTS) {
      if (intent.patterns.some((p) => lower.includes(p.toLowerCase()))) {
        return intent.response;
      }
    }

    // Check by keyword count
    let bestMatch: ChatIntent | null = null;
    let maxMatches = 0;

    for (const intent of SEED_INTENTS) {
      let count = 0;
      for (const kw of intent.keywords) {
        if (lower.includes(kw.toLowerCase())) count++;
      }
      if (count > maxMatches) {
        maxMatches = count;
        bestMatch = intent;
      }
    }

    if (bestMatch && maxMatches > 0) {
      return bestMatch.response;
    }

    return (
      "I'm here to assist with Coffee at Yellow Hauz! You can ask me about our menu best sellers, table reservations, how to process cash/GCash/card payments, apply Senior/PWD 20% discounts, view sales reports, or check operating hours (7:00 AM - 10:00 PM)."
    );
  }

  // Discounts & Coupons
  static getDiscounts(): Discount[] {
    return getStored<Discount[]>(STORAGE_KEYS.DISCOUNTS, DEFAULT_DISCOUNTS);
  }

  static saveDiscounts(discounts: Discount[]): void {
    setStored(STORAGE_KEYS.DISCOUNTS, discounts);
    this.notify();
  }

  static addDiscount(discountData: Omit<Discount, 'id'> & { id?: string }): Discount {
    const discounts = this.getDiscounts();
    const id = discountData.id || `disc-${Date.now()}`;
    const newDiscount: Discount = {
      ...discountData,
      id,
      isSystem: false,
    };
    discounts.push(newDiscount);
    this.saveDiscounts(discounts);
    setDoc(doc(db, 'discounts', id), cleanForFirestore(newDiscount)).catch((e) =>
      console.error('Firestore save discount error:', e)
    );
    return newDiscount;
  }

  static updateDiscount(id: string, updates: Partial<Discount>): Discount | null {
    const discounts = this.getDiscounts();
    const idx = discounts.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    discounts[idx] = { ...discounts[idx], ...updates };
    this.saveDiscounts(discounts);
    updateDoc(doc(db, 'discounts', id), cleanForFirestore(updates)).catch((e) =>
      console.error('Firestore update discount error:', e)
    );
    return discounts[idx];
  }

  static deleteDiscount(id: string): void {
    const discounts = this.getDiscounts().filter((d) => d.id !== id);
    this.saveDiscounts(discounts);
    deleteDoc(doc(db, 'discounts', id)).catch((e) =>
      console.error('Firestore delete discount error:', e)
    );
  }

  /**
   * Reset database to 0 data:
   * - Deletes all orders from Firestore & Local Storage
   * - Deletes all reservations & bookings from Firestore & Local Storage
   * - Resets table statuses to 'available' with no active orders
   * - Clears customer cart, active customer session, and table bindings
   */
  static async resetDatabaseToZero(): Promise<{
    success: boolean;
    deletedOrders: number;
    deletedReservations: number;
  }> {
    let deletedOrders = 0;
    let deletedReservations = 0;

    try {
      // 1. Delete all Firestore orders
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        deletedOrders = ordersSnap.size;
        for (const orderDoc of ordersSnap.docs) {
          await deleteDoc(doc(db, 'orders', orderDoc.id)).catch(() => {});
        }
      } catch (err) {
        console.warn('Orders cleanup notice:', err);
      }

      // 2. Delete all Firestore reservations
      try {
        const resSnap = await getDocs(collection(db, 'reservations'));
        deletedReservations = resSnap.size;
        for (const resDoc of resSnap.docs) {
          await deleteDoc(doc(db, 'reservations', resDoc.id)).catch(() => {});
        }
      } catch (err) {
        console.warn('Reservations cleanup notice:', err);
      }

      // 3. Delete any customers collection documents if present
      try {
        const custSnap = await getDocs(collection(db, 'customers'));
        for (const custDoc of custSnap.docs) {
          await deleteDoc(doc(db, 'customers', custDoc.id)).catch(() => {});
        }
      } catch {
        // ignore
      }

      // Delete all table requests
      try {
        const trSnap = await getDocs(collection(db, 'table_requests'));
        for (const trDoc of trSnap.docs) {
          await deleteDoc(doc(db, 'table_requests', trDoc.id)).catch(() => {});
        }
      } catch {
        // ignore
      }

      // 4. Reset all tables to 'available'
      const tables = this.getTables().map((t) => ({
        ...t,
        status: 'available' as const,
        currentOrderId: null,
      }));
      setStored(STORAGE_KEYS.TABLES, tables);
      for (const table of tables) {
        await setDoc(doc(db, 'tables', String(table.id)), cleanForFirestore(table)).catch(() => {});
      }

      // 5. Clear Local Storage records
      setStored(STORAGE_KEYS.ORDERS, []);
      setStored(STORAGE_KEYS.RESERVATIONS, []);
      setStored(STORAGE_KEYS.CUSTOMERS, []);
      setStored(STORAGE_KEYS.TABLE_REQUESTS, []);
      setStored(STORAGE_KEYS.ACTIVE_CUSTOMER, null);
      setStored(STORAGE_KEYS.ACTIVE_TABLE_BINDING, null);

      try {
        localStorage.removeItem('yh_customer_cart');
        localStorage.removeItem('customer_cart');
      } catch {
        // ignore
      }

      this.notify();
      return { success: true, deletedOrders, deletedReservations };
    } catch (e) {
      console.error('Error during zero database reset:', e);
      setStored(STORAGE_KEYS.ORDERS, []);
      setStored(STORAGE_KEYS.RESERVATIONS, []);
      this.notify();
      return { success: false, deletedOrders, deletedReservations };
    }
  }
}
