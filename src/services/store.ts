import {
  Category,
  MenuItem,
  Table,
  User,
  Order,
  OrderItem,
  Reservation,
  CustomerAccount,
  StoreSettings,
  ChatIntent,
  ChatbotCustomerResult,
  Discount,
  TableBinding,
  GuestOrderRecord,
  TableRequest,
  TableRequestType,
  TableRequestStatus,
  RefillRequest,
  RefillRequestStatus,
  RefillUrgency,
  RefillStation,
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
import { handleFirestoreError, OperationType } from './firebaseErrors';

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

export const SEED_REFILL_REQUESTS: RefillRequest[] = [
  {
    id: 'RF-101',
    menuItemId: 1,
    itemName: 'Whole Coffee Beans (Espresso Blend 1kg)',
    categoryName: 'Hot Coffee',
    station: 'bar',
    unit: 'bags',
    currentStock: 3,
    suggestedQuantity: 10,
    urgency: 'high',
    notes: 'Down to 3 bags. Need restock for weekend coffee rush.',
    status: 'pending',
    requestedBy: {
      id: 4,
      name: 'Paolo Barista',
      role: 'barista',
      employeeId: 'BAR-001',
    },
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'RF-102',
    menuItemId: null,
    itemName: 'Whole Fresh Milk (1 Liter Barista Edition)',
    categoryName: 'Milk & Dairy',
    station: 'bar',
    unit: 'cartons',
    currentStock: 4,
    suggestedQuantity: 24,
    urgency: 'urgent',
    notes: 'High consumption on Iced Lattes and Cappuccinos. Needed by tomorrow.',
    status: 'pending',
    requestedBy: {
      id: 4,
      name: 'Paolo Barista',
      role: 'barista',
      employeeId: 'BAR-001',
    },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'RF-103',
    menuItemId: null,
    itemName: 'Farm Fresh Large Eggs (Tray of 30)',
    categoryName: 'Kitchen Supply',
    station: 'kitchen',
    unit: 'trays',
    currentStock: 1,
    suggestedQuantity: 5,
    urgency: 'high',
    notes: 'Breakfast meals and pastries running low on fresh eggs.',
    status: 'pending',
    requestedBy: {
      id: 3,
      name: 'Mario Kitchen Cook',
      role: 'cook',
      employeeId: 'CK-001',
    },
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'RF-104',
    menuItemId: null,
    itemName: 'Takeaway Kraft Paper Bags & Cup Carriers',
    categoryName: 'Packaging & Counter',
    station: 'counter',
    unit: 'bundles',
    currentStock: 2,
    suggestedQuantity: 15,
    urgency: 'normal',
    notes: 'Takeaway packaging for front cashier counter.',
    status: 'pending',
    requestedBy: {
      id: 2,
      name: 'Elena Cashier',
      role: 'cashier',
      employeeId: 'CSH-001',
    },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
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
  FAVORITES: 'yh_customer_favorites',
  LIKES: 'yh_customer_likes',
  DISCOUNTS: 'yh_discounts',
  TABLE_REQUESTS: 'yh_table_requests',
  CLIENT_SESSION_ID: 'yh_client_session_id',
  GUEST_ORDERS: 'yh_guest_orders',
  REFILL_REQUESTS: 'yh_refill_requests',
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

export function isDrinkOrderItem(item: OrderItem, menuItems?: MenuItem[]): boolean {
  if (menuItems && menuItems.length > 0) {
    const mi = menuItems.find((m) => m.id === item.menuItemId);
    if (mi) {
      if (mi.categoryId >= 9 && mi.categoryId <= 17) return true;
    }
  }
  const n = (item.name || '').toLowerCase();
  return (
    n.includes('coffee') ||
    n.includes('tea') ||
    n.includes('latte') ||
    n.includes('espresso') ||
    n.includes('cappuccino') ||
    n.includes('americano') ||
    n.includes('macchiato') ||
    n.includes('frappe') ||
    n.includes('blended') ||
    n.includes('shake') ||
    n.includes('milkshake') ||
    n.includes('smoothie') ||
    n.includes('refresher') ||
    n.includes('cooler') ||
    n.includes('juice') ||
    n.includes('soda') ||
    n.includes('drink') ||
    n.includes('rocks') ||
    n.includes('lemonade')
  );
}

export function getOrderFulfillmentBreakdown(order: Order, menuItems?: MenuItem[]) {
  const allItems = order.items || [];
  const drinkItems = allItems.filter((i) => isDrinkOrderItem(i, menuItems));
  const foodItems = allItems.filter((i) => !isDrinkOrderItem(i, menuItems));

  const hasDrinks = drinkItems.length > 0;
  const hasFood = foodItems.length > 0;

  const isOrderOverallReady = order.status === 'to_serve' || order.status === 'completed';
  const isOrderCancelled = order.status === 'cancelled';

  let drinksReady = false;
  let foodReady = false;

  if (isOrderOverallReady) {
    drinksReady = hasDrinks;
    foodReady = hasFood;
  } else if (!isOrderCancelled) {
    drinksReady = hasDrinks ? order.baristaStatus === 'ready' : true;
    foodReady = hasFood ? order.cookStatus === 'ready' : true;
  }

  const allApplicableReady = (hasDrinks ? drinksReady : true) && (hasFood ? foodReady : true);

  return {
    drinkItems,
    foodItems,
    hasDrinks,
    hasFood,
    isMixed: hasDrinks && hasFood,
    drinksReady,
    foodReady,
    allApplicableReady,
  };
}

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

    // Immediately synchronize local catalog images with updated assets
    try {
      this.syncCatalogImages();
    } catch {
      // Ignore sync error during bootstrap
    }

    try {
      // 1. Listen to Categories
      onSnapshot(
        collection(db, 'categories'),
        (snapshot) => {
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
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'categories');
        }
      );

      // 2. Listen to Menu Items
      onSnapshot(
        collection(db, 'menu_items'),
        (snapshot) => {
          if (!snapshot.empty) {
            const items = snapshot.docs.map((doc) => doc.data() as MenuItem);
            const seedMap = new Map(SEED_MENU_ITEMS.map((s) => [s.id, s]));

            // Ensure any new seed items are synced
            const existingIds = new Set(items.map((i) => i.id));
            const missingSeedItems = SEED_MENU_ITEMS.filter((s) => !existingIds.has(s.id));
            if (missingSeedItems.length > 0) {
              missingSeedItems.forEach((item) => {
                items.push(item);
                setDoc(doc(db, 'menu_items', String(item.id)), cleanForFirestore(item)).catch(() => {});
              });
            }

            // Ensure items use updated images from local catalog without overwriting user customizations
            items.forEach((item) => {
              const seed = seedMap.get(item.id);
              let changed = false;
              if (seed && seed.imageUrl && seed.imageUrl.startsWith('/images/') && item.imageUrl !== seed.imageUrl) {
                item.imageUrl = seed.imageUrl;
                changed = true;
              }
              // Only fallback to seed if isBestSeller was never defined
              if (seed && item.isBestSeller === undefined) {
                item.isBestSeller = Boolean(seed.isBestSeller);
                changed = true;
              }
              if (changed) {
                setDoc(doc(db, 'menu_items', String(item.id)), cleanForFirestore(item)).catch(() => {});
              }
            });

            items.sort((a, b) => a.id - b.id);
            setStored(STORAGE_KEYS.ITEMS, items);
            this.notify();
          } else {
            // Seed menu items
            SEED_MENU_ITEMS.forEach((item) => {
              setDoc(doc(db, 'menu_items', String(item.id)), cleanForFirestore(item)).catch(() => {});
            });
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'menu_items');
        }
      );

      // 3. Listen to Tables
      onSnapshot(
        collection(db, 'tables'),
        (snapshot) => {
          if (!snapshot.empty) {
            const tables = snapshot.docs.map((doc) => doc.data() as Table);
            tables.sort((a, b) => a.tableNumber - b.tableNumber);
            const needsMigration = tables.length < 10 || !tables.some((t) => t.name);
            if (needsMigration) {
              const merged = SEED_TABLES.map((seed) => {
                const existing = tables.find((t) => t.tableNumber === seed.tableNumber);
                return existing
                  ? { ...seed, status: existing.status, currentOrderId: existing.currentOrderId }
                  : seed;
              });
              setStored(STORAGE_KEYS.TABLES, merged);
              merged.forEach((t) => {
                setDoc(doc(db, 'tables', String(t.id)), cleanForFirestore(t)).catch(() => {});
              });
              this.notify();
              return;
            }
            setStored(STORAGE_KEYS.TABLES, tables);
            this.notify();
          } else {
            // Seed tables
            SEED_TABLES.forEach((table) => {
              setDoc(doc(db, 'tables', String(table.id)), cleanForFirestore(table)).catch(() => {});
            });
            setStored(STORAGE_KEYS.TABLES, SEED_TABLES);
            this.notify();
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'tables');
        }
      );

      // 4. Listen to Orders
      onSnapshot(
        collection(db, 'orders'),
        (snapshot) => {
          if (!snapshot.empty) {
            const orders = snapshot.docs.map((doc) => doc.data() as Order);
            orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setStored(STORAGE_KEYS.ORDERS, orders);
          } else {
            setStored(STORAGE_KEYS.ORDERS, []);
          }
          this.notify();
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'orders');
        }
      );

      // 5. Listen to Reservations
      onSnapshot(
        collection(db, 'reservations'),
        (snapshot) => {
          if (!snapshot.empty) {
            const resList = snapshot.docs.map((doc) => doc.data() as Reservation);
            resList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setStored(STORAGE_KEYS.RESERVATIONS, resList);
          } else {
            setStored(STORAGE_KEYS.RESERVATIONS, []);
          }
          this.notify();
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'reservations');
        }
      );

      // 6. Listen to Store Settings
      onSnapshot(
        collection(db, 'settings'),
        (snapshot) => {
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
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'settings');
        }
      );

      // 7. Listen to Users
      onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
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
                u.pin =
                  u.role === 'admin'
                    ? '12345678'
                    : u.role === 'cook'
                    ? '55667788'
                    : u.role === 'barista'
                    ? '33445566'
                    : '00000000';
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
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'users');
        }
      );

      // 8. Listen to Discounts & Coupons
      onSnapshot(
        collection(db, 'discounts'),
        (snapshot) => {
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
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'discounts');
        }
      );

      // 9. Listen to Live Table Requests (Customer selection & Cashier confirmation)
      onSnapshot(
        collection(db, 'table_requests'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((doc) => doc.data() as TableRequest);
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setStored(STORAGE_KEYS.TABLE_REQUESTS, list);
          } else {
            setStored(STORAGE_KEYS.TABLE_REQUESTS, []);
          }
          this.notify();
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'table_requests');
        }
      );

      // 10. Listen to Refill Suggestions (Cashier, Cook, Barista -> Admin confirmation)
      onSnapshot(
        collection(db, 'refill_requests'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list = snapshot.docs.map((doc) => doc.data() as RefillRequest);
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setStored(STORAGE_KEYS.REFILL_REQUESTS, list);
          } else {
            const existing = getStored<RefillRequest[]>(STORAGE_KEYS.REFILL_REQUESTS, []);
            if (existing.length === 0) {
              setStored(STORAGE_KEYS.REFILL_REQUESTS, SEED_REFILL_REQUESTS);
              SEED_REFILL_REQUESTS.forEach((req) => {
                setDoc(doc(db, 'refill_requests', req.id), cleanForFirestore(req)).catch(() => {});
              });
            }
          }
          this.notify();
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'refill_requests');
        }
      );
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
    const seedMap = new Map(SEED_MENU_ITEMS.map((s) => [s.id, s]));
    let modified = false;

    // Synchronize updated image paths from the seed catalog
    items.forEach((item) => {
      const seed = seedMap.get(item.id);
      if (seed && seed.imageUrl && seed.imageUrl.startsWith('/images/') && item.imageUrl !== seed.imageUrl) {
        item.imageUrl = seed.imageUrl;
        modified = true;
      }
      if (seed && item.isBestSeller === undefined) {
        item.isBestSeller = Boolean(seed.isBestSeller);
        modified = true;
      }
    });

    const existingIds = new Set(items.map((i) => i.id));
    const missing = SEED_MENU_ITEMS.filter((s) => !existingIds.has(s.id));
    if (missing.length > 0) {
      items.push(...missing);
      items.sort((a, b) => a.id - b.id);
      modified = true;
    }
    if (modified) {
      setStored(STORAGE_KEYS.ITEMS, items);
    }
    return items;
  }

  static syncCatalogImages(): number {
    const items = this.getMenuItems();
    const seedMap = new Map(SEED_MENU_ITEMS.map((s) => [s.id, s]));
    let count = 0;
    items.forEach((item) => {
      const seed = seedMap.get(item.id);
      if (seed && seed.imageUrl && seed.imageUrl.startsWith('/images/') && item.imageUrl !== seed.imageUrl) {
        item.imageUrl = seed.imageUrl;
        count++;
        setDoc(doc(db, 'menu_items', String(item.id)), cleanForFirestore(item)).catch(() => {});
      }
    });
    if (count > 0) {
      setStored(STORAGE_KEYS.ITEMS, items);
      this.notify();
    }
    return count;
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

  // Refill Suggestions & Restock Requests (Cashiers, Cooks, Baristas -> Admin confirmation)
  static getRefillRequests(): RefillRequest[] {
    const list = getStored<RefillRequest[]>(STORAGE_KEYS.REFILL_REQUESTS, SEED_REFILL_REQUESTS);
    if (!list || list.length === 0) {
      return SEED_REFILL_REQUESTS;
    }
    return list;
  }

  static saveRefillRequests(requests: RefillRequest[]): void {
    setStored(STORAGE_KEYS.REFILL_REQUESTS, requests);
    this.notify();
  }

  static getPendingRefillRequestsCount(): number {
    return this.getRefillRequests().filter((r) => r.status === 'pending').length;
  }

  static createRefillRequest(data: {
    source?: 'catalog' | 'custom';
    menuItemId?: number | null;
    categoryId?: number;
    itemName: string;
    categoryName?: string;
    station: RefillStation;
    unit: string;
    currentStock: number;
    suggestedQuantity: number;
    urgency: RefillUrgency;
    notes?: string;
    requestedBy: {
      id: number;
      name: string;
      role: 'cashier' | 'cook' | 'barista' | 'admin';
      employeeId?: string;
    };
  }): RefillRequest {
    const requests = this.getRefillRequests();
    const id = `RF-${Date.now().toString().slice(-6)}`;
    const newRequest: RefillRequest = {
      id,
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    requests.unshift(newRequest);
    this.saveRefillRequests(requests);

    // Sync to Firestore
    setDoc(doc(db, 'refill_requests', id), cleanForFirestore(newRequest)).catch((e) =>
      console.error('Firestore create refill request error:', e)
    );

    return newRequest;
  }

  static approveRefillRequest(
    id: string,
    finalQuantity: number,
    adminUser: { id: number; name: string; role: string },
    adminNotes?: string
  ): boolean {
    const requests = this.getRefillRequests();
    const idx = requests.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    const target = requests[idx];
    const approvedQty = Math.max(0, Number(finalQuantity));

    // If this refill request was linked to an existing menu item, increase stock in the system!
    if (target.menuItemId) {
      const item = this.getMenuItems().find((i) => i.id === target.menuItemId);
      if (item) {
        const updatedQty = (item.quantity ?? 0) + approvedQty;
        this.updateMenuItem(item.id, {
          quantity: updatedQty,
          isAvailable: updatedQty > 0 ? true : item.isAvailable,
        });
      }
    }

    const updated: RefillRequest = {
      ...target,
      status: 'approved',
      finalQuantity: approvedQty,
      reviewedBy: adminUser,
      reviewedAt: new Date().toISOString(),
      adminNotes: adminNotes || target.adminNotes,
    };

    requests[idx] = updated;
    this.saveRefillRequests(requests);

    // Sync to Firestore
    setDoc(doc(db, 'refill_requests', id), cleanForFirestore(updated)).catch(() => {});

    return true;
  }

  static rejectRefillRequest(
    id: string,
    adminUser: { id: number; name: string; role: string },
    adminNotes?: string
  ): boolean {
    const requests = this.getRefillRequests();
    const idx = requests.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    const updated: RefillRequest = {
      ...requests[idx],
      status: 'rejected',
      reviewedBy: adminUser,
      reviewedAt: new Date().toISOString(),
      adminNotes: adminNotes || 'Declined by Admin',
    };

    requests[idx] = updated;
    this.saveRefillRequests(requests);

    // Sync to Firestore
    setDoc(doc(db, 'refill_requests', id), cleanForFirestore(updated)).catch(() => {});

    return true;
  }

  static cancelRefillRequest(id: string): boolean {
    const requests = this.getRefillRequests();
    const idx = requests.findIndex((r) => r.id === id);
    if (idx === -1) return false;

    const updated: RefillRequest = {
      ...requests[idx],
      status: 'cancelled',
    };

    requests[idx] = updated;
    this.saveRefillRequests(requests);

    setDoc(doc(db, 'refill_requests', id), cleanForFirestore(updated)).catch(() => {});
    return true;
  }

  // Floor plan tables
  static getTables(): Table[] {
    const tables = getStored<Table[]>(STORAGE_KEYS.TABLES, SEED_TABLES);
    if (!tables || tables.length < 10 || !tables.some((t) => t.name)) {
      const merged = SEED_TABLES.map((seed) => {
        const existing = tables?.find((t) => t.tableNumber === seed.tableNumber);
        return existing
          ? { ...seed, status: existing.status, currentOrderId: existing.currentOrderId }
          : seed;
      });
      setStored(STORAGE_KEYS.TABLES, merged);
      return merged;
    }
    return tables;
  }

  static resetToOfficialTables(): Table[] {
    setStored(STORAGE_KEYS.TABLES, SEED_TABLES);
    this.notify();
    SEED_TABLES.forEach((table) => {
      setDoc(doc(db, 'tables', String(table.id)), cleanForFirestore(table)).catch(() => {});
    });
    return SEED_TABLES;
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

    const currentMenuItems = this.getMenuItems();
    const hasDrinks = (orderData.items || []).some((oi) => isDrinkOrderItem(oi, currentMenuItems));
    const hasFood = (orderData.items || []).some((oi) => !isDrinkOrderItem(oi, currentMenuItems));
    const initialStatus = orderData.status || (channel === 'online' ? 'to_confirm' : 'to_prep');
    const isToPrep = initialStatus === 'to_prep';

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
      status: initialStatus,
      baristaStatus: hasDrinks ? (isToPrep ? 'to_prep' : 'pending') : undefined,
      cookStatus: hasFood ? (isToPrep ? 'to_prep' : 'pending') : undefined,
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
        selectedVariant: oi.selectedVariant,
        discount: oi.discount,
      })),
    };

    orders.unshift(newOrder);
    this.saveOrders(orders);

    // If not authenticated, record as a guest order for this device/session & table
    if (!newOrder.customerId) {
      this.recordGuestOrder(newOrder.id, newOrder.tableNumber ?? null);
    }

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
    if (status === 'to_prep') {
      if (!order.confirmedAt) order.confirmedAt = nowIso;
      const breakdown = getOrderFulfillmentBreakdown(order, this.getMenuItems());
      if (breakdown.hasDrinks && (!order.baristaStatus || order.baristaStatus === 'pending')) {
        order.baristaStatus = 'to_prep';
      }
      if (breakdown.hasFood && (!order.cookStatus || order.cookStatus === 'pending')) {
        order.cookStatus = 'to_prep';
      }
    }
    if (status === 'processing' && !order.processingStartedAt) {
      order.processingStartedAt = nowIso;
    }
    if (status === 'to_serve') {
      if (!order.readyToServeAt) order.readyToServeAt = nowIso;
      const breakdown = getOrderFulfillmentBreakdown(order, this.getMenuItems());
      if (breakdown.hasDrinks && order.baristaStatus !== 'ready') {
        order.baristaStatus = 'ready';
        if (!order.baristaCompletedAt) order.baristaCompletedAt = nowIso;
      }
      if (breakdown.hasFood && order.cookStatus !== 'ready') {
        order.cookStatus = 'ready';
        if (!order.cookCompletedAt) order.cookCompletedAt = nowIso;
      }
    }
    if (status === 'completed') {
      if (!order.completedAt) order.completedAt = nowIso;
      if (!order.readyToServeAt) order.readyToServeAt = nowIso;
      if (!order.processingStartedAt) order.processingStartedAt = order.createdAt;
      const breakdown = getOrderFulfillmentBreakdown(order, this.getMenuItems());
      if (breakdown.hasDrinks) order.baristaStatus = 'ready';
      if (breakdown.hasFood) order.cookStatus = 'ready';
    }
    if (status === 'cancelled') {
      order.cancelledAt = nowIso;
      order.cancellationRequested = false;
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
      ...(order.baristaStatus ? { baristaStatus: order.baristaStatus } : {}),
      ...(order.baristaCompletedAt ? { baristaCompletedAt: order.baristaCompletedAt } : {}),
      ...(order.cookStatus ? { cookStatus: order.cookStatus } : {}),
      ...(order.cookCompletedAt ? { cookCompletedAt: order.cookCompletedAt } : {}),
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

  static updateOrderBaristaStatus(
    orderId: number,
    status: 'to_prep' | 'processing' | 'ready',
    staffName?: string
  ): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const nowIso = new Date().toISOString();
    order.baristaStatus = status;

    if (status === 'processing') {
      if (!order.baristaStartedAt) order.baristaStartedAt = nowIso;
      if (order.status === 'to_prep') {
        order.status = 'processing';
        if (!order.processingStartedAt) order.processingStartedAt = nowIso;
      }
    } else if (status === 'ready') {
      order.baristaCompletedAt = nowIso;
      order.baristaCompletedBy = staffName || 'Barista';

      // Check if food is also needed
      const breakdown = getOrderFulfillmentBreakdown(order, this.getMenuItems());
      if (!breakdown.hasFood || order.cookStatus === 'ready') {
        // Both (or only drinks) are ready! Advance order to 'to_serve'
        order.status = 'to_serve';
        if (!order.readyToServeAt) order.readyToServeAt = nowIso;
      } else {
        // Food is still being cooked by kitchen cook. Keep order in processing
        if (order.status === 'to_prep') {
          order.status = 'processing';
          if (!order.processingStartedAt) order.processingStartedAt = nowIso;
        }
      }
    }

    this.saveOrders(orders);

    const updates: Partial<Order> = {
      status: order.status,
      baristaStatus: order.baristaStatus,
      ...(order.baristaStartedAt ? { baristaStartedAt: order.baristaStartedAt } : {}),
      ...(order.baristaCompletedAt ? { baristaCompletedAt: order.baristaCompletedAt } : {}),
      ...(order.baristaCompletedBy ? { baristaCompletedBy: order.baristaCompletedBy } : {}),
      ...(order.processingStartedAt ? { processingStartedAt: order.processingStartedAt } : {}),
      ...(order.readyToServeAt ? { readyToServeAt: order.readyToServeAt } : {}),
    };
    updateDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(order)).catch(() => {});
    });

    return order;
  }

  static updateOrderCookStatus(
    orderId: number,
    status: 'to_prep' | 'processing' | 'ready',
    staffName?: string
  ): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const nowIso = new Date().toISOString();
    order.cookStatus = status;

    if (status === 'processing') {
      if (!order.cookStartedAt) order.cookStartedAt = nowIso;
      if (order.status === 'to_prep') {
        order.status = 'processing';
        if (!order.processingStartedAt) order.processingStartedAt = nowIso;
      }
    } else if (status === 'ready') {
      order.cookCompletedAt = nowIso;
      order.cookCompletedBy = staffName || 'Cook';

      // Check if drinks are also needed
      const breakdown = getOrderFulfillmentBreakdown(order, this.getMenuItems());
      if (!breakdown.hasDrinks || order.baristaStatus === 'ready') {
        // Both (or only food) are ready! Advance order to 'to_serve'
        order.status = 'to_serve';
        if (!order.readyToServeAt) order.readyToServeAt = nowIso;
      } else {
        // Drinks are still being prepared by barista. Keep order in processing
        if (order.status === 'to_prep') {
          order.status = 'processing';
          if (!order.processingStartedAt) order.processingStartedAt = nowIso;
        }
      }
    }

    this.saveOrders(orders);

    const updates: Partial<Order> = {
      status: order.status,
      cookStatus: order.cookStatus,
      ...(order.cookStartedAt ? { cookStartedAt: order.cookStartedAt } : {}),
      ...(order.cookCompletedAt ? { cookCompletedAt: order.cookCompletedAt } : {}),
      ...(order.cookCompletedBy ? { cookCompletedBy: order.cookCompletedBy } : {}),
      ...(order.processingStartedAt ? { processingStartedAt: order.processingStartedAt } : {}),
      ...(order.readyToServeAt ? { readyToServeAt: order.readyToServeAt } : {}),
    };
    updateDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(order)).catch(() => {});
    });

    return order;
  }

  static completeAllOrderSections(orderId: number, staffName?: string): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    const nowIso = new Date().toISOString();
    const breakdown = getOrderFulfillmentBreakdown(order, this.getMenuItems());

    if (breakdown.hasDrinks) {
      order.baristaStatus = 'ready';
      order.baristaCompletedAt = nowIso;
      order.baristaCompletedBy = staffName || 'Cashier';
    }
    if (breakdown.hasFood) {
      order.cookStatus = 'ready';
      order.cookCompletedAt = nowIso;
      order.cookCompletedBy = staffName || 'Cashier';
    }

    order.status = 'to_serve';
    if (!order.readyToServeAt) order.readyToServeAt = nowIso;

    this.saveOrders(orders);

    const updates: Partial<Order> = {
      status: 'to_serve',
      readyToServeAt: order.readyToServeAt,
      ...(breakdown.hasDrinks
        ? {
            baristaStatus: 'ready',
            baristaCompletedAt: nowIso,
            baristaCompletedBy: staffName || 'Cashier',
          }
        : {}),
      ...(breakdown.hasFood
        ? {
            cookStatus: 'ready',
            cookCompletedAt: nowIso,
            cookCompletedBy: staffName || 'Cashier',
          }
        : {}),
    };

    updateDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(order)).catch(() => {});
    });

    return order;
  }

  static requestOrderCancellation(
    orderId: number,
    reason: string,
    notes?: string
  ): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;
    const nowIso = new Date().toISOString();

    order.cancellationRequested = true;
    order.cancellationRequestedAt = nowIso;
    order.cancellationReason = reason;
    order.cancellationNotes = notes || '';

    this.saveOrders(orders);

    const updates: Partial<Order> = {
      cancellationRequested: true,
      cancellationRequestedAt: nowIso,
      cancellationReason: reason,
      cancellationNotes: notes || '',
    };

    updateDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(order)).catch(() => {});
    });

    return order;
  }

  static confirmOrderCancellation(
    orderId: number,
    confirmedBy: string,
    notes?: string
  ): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    return this.updateOrderStatus(orderId, 'cancelled', {
      cancelledBy: confirmedBy,
      cancelReason: order.cancellationReason || 'Customer requested cancellation',
      cancelNotes: notes || order.cancellationNotes || '',
    });
  }

  static rejectOrderCancellation(
    orderId: number,
    rejectReason?: string
  ): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;
    const nowIso = new Date().toISOString();

    order.cancellationRequested = false;
    order.cancellationRejectedAt = nowIso;
    if (rejectReason) {
      order.cancellationRejectReason = rejectReason;
    }

    this.saveOrders(orders);

    const updates: Partial<Order> = {
      cancellationRequested: false,
      cancellationRejectedAt: nowIso,
      ...(rejectReason ? { cancellationRejectReason: rejectReason } : {}),
    };

    updateDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(order)).catch(() => {});
    });

    return order;
  }

  static withdrawOrderCancellation(orderId: number): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.cancellationRequested = false;
    this.saveOrders(orders);

    const updates: Partial<Order> = {
      cancellationRequested: false,
    };

    updateDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(updates)).catch(() => {
      setDoc(doc(db, 'orders', String(orderId)), cleanForFirestore(order)).catch(() => {});
    });

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
              : updated.role === 'barista'
              ? '33445566'
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

  static saveCustomerAccount(customer: CustomerAccount): void {
    const customers = getStored<CustomerAccount[]>(STORAGE_KEYS.CUSTOMERS, []);
    const idx = customers.findIndex(
      (c) => c.id === customer.id || (c.email && customer.email && c.email.toLowerCase() === customer.email.toLowerCase())
    );
    if (idx >= 0) {
      customers[idx] = customer;
    } else {
      customers.push(customer);
    }
    setStored(STORAGE_KEYS.CUSTOMERS, customers);
  }

  static setActiveCustomer(cust: CustomerAccount | null): void {
    if (cust) {
      // Merge guest favorites and likes if not present on account
      const guestFavs = getStored<number[]>(STORAGE_KEYS.FAVORITES, []);
      const guestLikes = getStored<number[]>(STORAGE_KEYS.LIKES, []);
      const mergedFavs = Array.from(new Set([...(cust.favoriteItemIds || []), ...guestFavs]));
      const mergedLikes = Array.from(new Set([...(cust.likedItemIds || []), ...guestLikes]));
      cust = {
        ...cust,
        favoriteItemIds: mergedFavs,
        likedItemIds: mergedLikes,
      };
      setStored(STORAGE_KEYS.FAVORITES, mergedFavs);
      setStored(STORAGE_KEYS.LIKES, mergedLikes);
      this.saveCustomerAccount(cust);
    }
    setStored(STORAGE_KEYS.ACTIVE_CUSTOMER, cust);
    if (cust) {
      // If customer signs up or signs in, link any guest orders to their account so it is saved permanently
      this.linkGuestOrdersToCustomer(cust.id, cust.fullName, cust.contactNumber);
    }
    this.notify();
  }

  // Customer Favorites & Liked Items Management
  static getCustomerFavorites(customerId?: number): number[] {
    const active = this.getActiveCustomer();
    if (customerId && active && active.id === customerId && Array.isArray(active.favoriteItemIds)) {
      return active.favoriteItemIds;
    }
    if (active && Array.isArray(active.favoriteItemIds) && active.favoriteItemIds.length > 0) {
      return active.favoriteItemIds;
    }
    return getStored<number[]>(STORAGE_KEYS.FAVORITES, []);
  }

  static toggleCustomerFavorite(itemId: number, customerId?: number): { isFavorite: boolean; favoriteItemIds: number[] } {
    let favs = this.getCustomerFavorites(customerId);
    const exists = favs.includes(itemId);
    if (exists) {
      favs = favs.filter((id) => id !== itemId);
    } else {
      favs = [...favs, itemId];
    }

    setStored(STORAGE_KEYS.FAVORITES, favs);

    const active = this.getActiveCustomer();
    if (active) {
      const updated: CustomerAccount = { ...active, favoriteItemIds: favs };
      setStored(STORAGE_KEYS.ACTIVE_CUSTOMER, updated);
      this.saveCustomerAccount(updated);
    }
    this.notify();
    return { isFavorite: !exists, favoriteItemIds: favs };
  }

  static getCustomerLikes(customerId?: number): number[] {
    const active = this.getActiveCustomer();
    if (customerId && active && active.id === customerId && Array.isArray(active.likedItemIds)) {
      return active.likedItemIds;
    }
    if (active && Array.isArray(active.likedItemIds) && active.likedItemIds.length > 0) {
      return active.likedItemIds;
    }
    return getStored<number[]>(STORAGE_KEYS.LIKES, []);
  }

  static toggleCustomerLike(itemId: number, customerId?: number): { isLiked: boolean; likedItemIds: number[] } {
    let likes = this.getCustomerLikes(customerId);
    const exists = likes.includes(itemId);
    if (exists) {
      likes = likes.filter((id) => id !== itemId);
    } else {
      likes = [...likes, itemId];
    }

    setStored(STORAGE_KEYS.LIKES, likes);

    const active = this.getActiveCustomer();
    if (active) {
      const updated: CustomerAccount = { ...active, likedItemIds: likes };
      setStored(STORAGE_KEYS.ACTIVE_CUSTOMER, updated);
      this.saveCustomerAccount(updated);
    }
    this.notify();
    return { isLiked: !exists, likedItemIds: likes };
  }

  // Guest Order Tracking & Session Management
  static getGuestOrders(): GuestOrderRecord[] {
    return getStored<GuestOrderRecord[]>(STORAGE_KEYS.GUEST_ORDERS, []);
  }

  static recordGuestOrder(orderId: number, tableNumber: number | null): void {
    const records = this.getGuestOrders();
    // Avoid duplicate records
    if (!records.some((r) => r.orderId === orderId)) {
      records.push({
        orderId,
        tableNumber: tableNumber ?? null,
        createdAt: new Date().toISOString(),
      });
      setStored(STORAGE_KEYS.GUEST_ORDERS, records);
      this.notify();
    }
  }

  // Clear guest table orders (called when a guest exits the table)
  static clearGuestTableOrders(tableNumber?: number): void {
    const records = this.getGuestOrders();
    const remaining =
      tableNumber !== undefined
        ? records.filter((r) => r.tableNumber !== tableNumber)
        : records.filter((r) => r.tableNumber === null); // keep only non-table online guest orders
    setStored(STORAGE_KEYS.GUEST_ORDERS, remaining);
    this.notify();
  }

  // Clear all guest orders
  static clearAllGuestOrders(): void {
    setStored(STORAGE_KEYS.GUEST_ORDERS, []);
    this.notify();
  }

  // Link any guest orders placed on this device to a newly signed-in or signed-up customer account
  static linkGuestOrdersToCustomer(customerId: number, fullName?: string, phone?: string): void {
    const records = this.getGuestOrders();
    if (!records.length) return;

    const orderIdsToLink = new Set(records.map((r) => r.orderId));
    const allOrders = this.getOrders();
    let hasChanges = false;

    const updated = allOrders.map((ord) => {
      if (orderIdsToLink.has(ord.id) && !ord.customerId) {
        hasChanges = true;
        const newOrd: Order = {
          ...ord,
          customerId,
          customerName: fullName || ord.customerName,
          customerPhone: phone || ord.customerPhone,
        };
        // Update in Firestore
        setDoc(doc(db, 'orders', String(newOrd.id)), cleanForFirestore(newOrd)).catch((err) =>
          console.error('Firestore link guest order error:', err)
        );
        return newOrd;
      }
      return ord;
    });

    if (hasChanges) {
      this.saveOrders(updated);
    }
    // Now that orders are bound to the permanent customer account, clear guest session records
    this.clearAllGuestOrders();
  }

  // Exits the table: if not logged in, guest table order history is deleted
  static exitTable(isLoggedIn: boolean = false): void {
    const activeBinding = this.getActiveTableBinding();
    if (!isLoggedIn) {
      this.clearGuestTableOrders(activeBinding?.tableNumber);
    }
    this.setActiveTableBinding(null);
  }

  // Returns ONLY orders visible to the customer based on authentication and active table
  static getCustomerVisibleOrders(
    customer: CustomerAccount | null,
    tableBinding: TableBinding | null
  ): Order[] {
    const allOrders = this.getOrders();

    // 1. If signed in, customer sees all orders saved to their account (saved across sessions and tables)
    if (customer) {
      return allOrders.filter(
        (o) =>
          o.customerId === customer.id ||
          (o.customerName &&
            customer.fullName &&
            o.customerName.toLowerCase() === customer.fullName.toLowerCase())
      );
    }

    // 2. If guest customer (not signed in):
    const guestRecords = this.getGuestOrders();

    if (tableBinding && tableBinding.tableNumber) {
      // Dine-in guest at a table:
      // Only show orders placed by this guest at THIS table!
      // Different table numbers never share order tracking or history!
      const thisTableOrderIds = new Set(
        guestRecords
          .filter((r) => r.tableNumber === tableBinding.tableNumber)
          .map((r) => r.orderId)
      );
      return allOrders.filter(
        (o) =>
          thisTableOrderIds.has(o.id) &&
          o.tableNumber === tableBinding.tableNumber &&
          !o.customerId
      );
    }

    // Online guest without an active table binding:
    // Only show online orders placed in this guest session
    const onlineGuestOrderIds = new Set(
      guestRecords.filter((r) => r.tableNumber === null).map((r) => r.orderId)
    );
    return allOrders.filter(
      (o) => onlineGuestOrderIds.has(o.id) && !o.tableNumber && !o.customerId
    );
  }

  // Get active orders count for the customer badge
  static getActiveCustomerOrdersCount(
    customer: CustomerAccount | null,
    tableBinding: TableBinding | null
  ): number {
    const visible = this.getCustomerVisibleOrders(customer, tableBinding);
    const isActiveStatus = (st: string) =>
      st === 'to_confirm' ||
      st === 'pending' ||
      st === 'to_prep' ||
      st === 'processing' ||
      st === 'to_serve';
    return visible.filter((o) => isActiveStatus(o.status)).length;
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

  // Chatbot Customer Concierge Logic
  static getChatbotCustomerResponse(userMessage: string): ChatbotCustomerResult {
    const lower = userMessage.toLowerCase().trim();
    if (!lower) {
      return {
        reply: 'Hi! ☕ How can I treat you today? You can ask me for coffee recommendations, comfort food, table reservations, or our Private Venue rental!',
        suggestedAction: 'menu',
        source: 'local',
      };
    }

    const allItems = this.getMenuItems();

    // Check intents by exact pattern or keywords
    let bestMatch: ChatIntent | null = null;
    let maxMatches = 0;

    for (const intent of SEED_INTENTS) {
      if (intent.patterns.some((p) => lower.includes(p.toLowerCase()))) {
        bestMatch = intent;
        break;
      }
      let count = 0;
      for (const kw of intent.keywords) {
        if (lower.includes(kw.toLowerCase())) count++;
      }
      if (count > maxMatches) {
        maxMatches = count;
        bestMatch = intent;
      }
    }

    // Resolve recommended menu items if specified by intent
    let recommendedItems: MenuItem[] = [];
    if (bestMatch?.recommendedItemIds && bestMatch.recommendedItemIds.length > 0) {
      recommendedItems = allItems.filter(
        (item) => bestMatch?.recommendedItemIds?.includes(item.id) && item.isAvailable
      );
    }

    // If no direct intent items, check if the user is asking for specific food/drink terms
    if (recommendedItems.length === 0) {
      const matched = allItems.filter(
        (item) =>
          item.isAvailable &&
          (lower.includes(item.name.toLowerCase()) ||
            (item.description && lower.includes(item.description.toLowerCase().slice(0, 15))))
      );
      if (matched.length > 0) {
        recommendedItems = matched.slice(0, 4);
      }
    }

    if (bestMatch) {
      return {
        reply: bestMatch.response,
        recommendedItems: recommendedItems.length > 0 ? recommendedItems : undefined,
        suggestedAction: bestMatch.suggestedAction || 'none',
        source: 'local',
      };
    }

    // Fallback default response tailored purely for customer
    const topPicks = allItems.filter((i) => i.isBestSeller && i.isAvailable).slice(0, 4);
    return {
      reply:
        "I'm delighted to assist you at Coffee at Yellow Hauz! ☕ You can ask me for drink recommendations (sweet or bold coffee, iced favorites, milk teas), hearty meals (Pork Adobo Flakes, pastas, sandwiches), table reservations, our ₱300/3hr Private Venue, discounts (20% Senior/PWD), or our operating hours (7:00 AM - 10:00 PM).",
      recommendedItems: topPicks.length > 0 ? topPicks : undefined,
      suggestedAction: 'menu',
      source: 'local',
    };
  }

  static getChatbotResponse(userMessage: string): string {
    return this.getChatbotCustomerResponse(userMessage).reply;
  }

  static async askCustomerAssistant(
    userMessage: string,
    context?: { customerName?: string; tableNumber?: number | null }
  ): Promise<ChatbotCustomerResult> {
    const localResult = this.getChatbotCustomerResponse(userMessage);

    try {
      const res = await fetch('/api/chat/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          customerName: context?.customerName,
          tableNumber: context?.tableNumber,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.reply) {
          return {
            reply: data.reply,
            recommendedItems: localResult.recommendedItems,
            suggestedAction: localResult.suggestedAction,
            source: 'gemini',
          };
        }
      }
    } catch {
      // Network or API failure: graceful fallback to comprehensive local customer engine
    }

    return localResult;
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
      setStored(STORAGE_KEYS.FAVORITES, []);
      setStored(STORAGE_KEYS.LIKES, []);

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
