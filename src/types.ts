export interface User {
  id: number;
  employeeId: string;
  username: string;
  fullName: string;
  name?: string;
  role: 'cashier' | 'admin' | 'cook' | 'barista';
  status: 'active' | 'inactive';
  pin?: string;
  phone?: string;
  email?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  sortOrder: number;
  status: 'active' | 'inactive';
}

export type TemperatureType = 'hot' | 'iced' | 'cold' | 'room temp' | 'both' | 'blended' | 'blended iced';

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  temperature: TemperatureType;
  isBestSeller: boolean;
  isAvailable: boolean;
  quantity: number;
  sortOrder: number;
  stock?: number;
  available?: boolean;
  lowStockThreshold?: number;
  availableTemperatures?: TemperatureType[];
  isHot?: boolean;
  isIced?: boolean;
}

export interface Table {
  id: number;
  tableNumber: number;
  capacity: number;
  area: 'normal' | 'airconditioned';
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  currentOrderId?: number | null;
  name?: string;
  code?: string;
  setup?: string;
  description?: string;
  areaName?: string;
}

export interface CustomerAccount {
  id: number;
  fullName: string;
  email: string;
  contactNumber: string;
  password?: string;
  status: 'active' | 'inactive';
  loyaltyPoints?: number;
  createdAt: string;
  favoriteItemIds?: number[];
  likedItemIds?: number[];
  defaultDeliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryNotes?: string;
  preferredMilk?: string;
  preferredSweetness?: string;
  dietaryNotes?: string;
  birthday?: string;
}

export interface VenueAddon {
  id: string;
  name: string;
  price: number;
}

export interface Reservation {
  id: number;
  reservationCode: string;
  bookingType?: 'table' | 'venue';
  tableId: number;
  tableNumber?: number;
  venueName?: string;
  venueDurationHours?: number; // e.g. 3, 4, 5, 6
  venueRate?: number; // base rate, e.g. 300 for 3 hours
  venueAddons?: VenueAddon[];
  totalAmount?: number;
  eventType?: string; // e.g. Meeting, Workshop, Birthday, Party, Co-working
  seatingLayout?: 'boardroom' | 'classroom' | 'banquet' | 'lounge' | 'workshop';
  paymentStatus?: 'unpaid' | 'paid' | 'downpayment_paid';
  paymentMethod?: 'gcash' | 'cash' | 'card';
  customerId?: number | null;
  customerName: string;
  contactNumber: string;
  guestCount: number;
  reservationAt: string; // ISO or YYYY-MM-DD HH:mm
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAt: string;
}

export interface OrderItem {
  id?: number;
  menuItemId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
  imageUrl?: string;
  selectedVariant?: { name: string; price?: number } | string;
  discount?: {
    discountId: string;
    discountName: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    discountAmount: number;
  };
}

export interface AdvanceBookingDetails {
  bookingDate: string; // YYYY-MM-DD
  arrivalTime: string; // HH:mm or e.g. 2:30 PM
  partySize: number;
  seatingPreference?: 'indoor_main' | 'airconditioned' | 'outdoor_patio' | 'any';
  specialRequests?: string;
}

export interface TableBinding {
  tableId: number;
  tableNumber: number;
  area: 'normal' | 'airconditioned';
  capacity?: number;
  autoBound?: boolean;
  assignedByCashier?: string;
  assignedAt?: string;
}

export interface GuestOrderRecord {
  orderId: number;
  tableNumber: number | null;
  createdAt: string;
}

export type TableRequestType = 'new_table' | 'change_table';
export type TableRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface TableRequest {
  id: string; // Unique Request ID (e.g. TR-172464...)
  sessionId: string; // Customer client browser session ID
  customerId?: number | null;
  customerName: string;
  customerPhone?: string;
  type: TableRequestType;
  currentTableNumber?: number | null; // Previous table if changing table
  requestedTableNumber: number;
  requestedTableId: number;
  area: 'normal' | 'airconditioned';
  capacity?: number;
  notes?: string;
  status: TableRequestStatus;
  cashierId?: number | null;
  cashierName?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  respondedAt?: string | null;
}

export type OrderStatus =
  | 'to_confirm'
  | 'pending'
  | 'to_prep'
  | 'processing'
  | 'to_serve'
  | 'completed'
  | 'cancelled';

export interface Order {
  id: number;
  orderNumber: string;
  channel?: 'in_store' | 'online';
  orderClassification?: 'live_in_house' | 'advance_booking';
  tableId?: number | null;
  tableNumber?: number | null;
  customerId?: number | null;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  advanceBooking?: AdvanceBookingDetails;
  scheduledFor?: string; // Future timestamp for advance bookings
  guestCount?: number;
  orderType: 'dine_in' | 'take_away' | 'delivery';
  paymentMethod: 'cash' | 'card' | 'gcash';
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  discountAmount: number;
  discountType?: 'none' | 'senior_pwd' | 'custom' | string;
  discountPercent?: number;
  amountPaid?: number;
  changeAmount?: number;
  status: OrderStatus;
  cashierId: number;
  cashierName: string;
  items: OrderItem[];
  createdAt: string;
  confirmedAt?: string;
  processingStartedAt?: string;
  readyToServeAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancelReason?: string;
  cancelNotes?: string;
  returnedToCashierAt?: string;
  returnReason?: string;
  cancellationRequested?: boolean;
  cancellationRequestedAt?: string;
  cancellationReason?: string;
  cancellationNotes?: string;
  cancellationRejectedAt?: string;
  cancellationRejectReason?: string;
  baristaStatus?: 'pending' | 'to_prep' | 'processing' | 'ready';
  baristaStartedAt?: string;
  baristaCompletedAt?: string;
  baristaCompletedBy?: string;
  cookStatus?: 'pending' | 'to_prep' | 'processing' | 'ready';
  cookStartedAt?: string;
  cookCompletedAt?: string;
  cookCompletedBy?: string;
}

export interface TimeBasedMenu {
  title: string;
  time: string;
  focus: string;
  start: string;
  end: string;
  item_names: string[];
}

export interface StoreSettings {
  tax_rate: number;
  currency: string;
  shop_name: string;
  storeName?: string;
  shop_address: string;
  shop_phone: string;
  shop_email?: string;
  receipt_footer: string;
  business_hours: string;
  time_based_menus: TimeBasedMenu[];
}

export interface ChatIntent {
  tag: string;
  patterns: string[];
  keywords: string[];
  response: string;
  recommendedItemIds?: number[];
  suggestedAction?: 'menu' | 'reservation' | 'orders' | 'none';
}

export interface ChatbotCustomerResult {
  reply: string;
  recommendedItems?: MenuItem[];
  suggestedAction?: 'menu' | 'reservation' | 'orders' | 'none';
  source?: 'gemini' | 'local';
}

export interface CartItem {
  id?: string;
  cartItemId?: string;
  item: MenuItem;
  quantity: number;
  specialInstructions?: string;
  discount?: Discount | null;
  discountIdNumber?: string;
}

export interface Discount {
  id: string;
  name: string;
  code?: string;
  type: 'percent' | 'fixed';
  value: number;
  description?: string;
  isSystem?: boolean;
  requiresId?: boolean;
}

export type RefillRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type RefillUrgency = 'low' | 'normal' | 'high' | 'urgent';
export type RefillStation = 'bar' | 'kitchen' | 'counter' | 'general';

export interface RefillRequest {
  id: string;
  source?: 'catalog' | 'custom';
  menuItemId?: number | null;
  categoryId?: number;
  itemName: string;
  categoryName?: string;
  station: RefillStation;
  unit: string;
  currentStock: number;
  suggestedQuantity: number;
  finalQuantity?: number;
  urgency: RefillUrgency;
  notes?: string;
  status: RefillRequestStatus;
  requestedBy: {
    id: number;
    name: string;
    role: 'cashier' | 'cook' | 'barista' | 'admin';
    employeeId?: string;
  };
  createdAt: string;
  reviewedBy?: {
    id: number;
    name: string;
    role: string;
  };
  reviewedAt?: string;
  adminNotes?: string;
}

export type StaffTabType =
  | 'dashboard'
  | 'pos'
  | 'tables'
  | 'tickets'
  | 'reports'
  | 'analytics'
  | 'inventory'
  | 'settings'
  | 'refills';

