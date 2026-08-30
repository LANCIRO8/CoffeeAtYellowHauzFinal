import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Category,
  MenuItem,
  CartItem,
  Order,
  CustomerAccount,
  StoreSettings,
  TableBinding,
  AdvanceBookingDetails,
} from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import { CustomerCartDrawer } from './CustomerCartDrawer';
import { TableRequestModal } from './TableRequestModal';
import {
  Search,
  ShoppingBag,
  Bell,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  Flame,
  Sparkles,
  ArrowRight,
  Coffee,
  Utensils,
  Egg,
  Soup,
  Pizza,
  Sandwich,
  Cake,
  GlassWater,
  IceCream,
  Citrus,
  Milk,
  Leaf,
  CookingPot,
  CupSoda,
  Calendar,
  Clock,
  Users,
  MapPin,
  Globe,
  CheckCircle2,
  QrCode,
  Info,
  User,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Star,
  Layers,
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Sparkle,
} from 'lucide-react';

interface CustomerMenuProps {
  categories: Category[];
  menuItems: MenuItem[];
  settings: StoreSettings;
  activeCustomer: CustomerAccount | null;
  activeTableBinding?: TableBinding | null;
  onBindTable?: (tableNumber: number) => void;
  onClearTable?: () => void;
  onOrderSuccess: (order: Order) => void;
  onRequireLogin: () => void;
  cart?: CartItem[];
  isCartOpen?: boolean;
  onToggleCart?: () => void;
  onOpenCart?: () => void;
  onCloseCart?: () => void;
  onAddToCart?: (item: MenuItem) => void;
  onUpdateQuantity?: (itemId: number, delta: number) => void;
  onRemoveItem?: (itemId: number) => void;
  onClearCart?: () => void;
  onUpdateItemInstructions?: (itemId: number, text: string) => void;
  isCheckoutOpen?: boolean;
  onSetCheckoutOpen?: (open: boolean) => void;
}

// Background images for split view & category aesthetic (High quality drinks and food closeups)
const DRINKS_HERO_BG =
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=1600&auto=format&fit=crop';
const FOOD_HERO_BG =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1600&auto=format&fit=crop';

// Category fallback thumbnails
const CATEGORY_IMAGES: Record<string, string> = {
  'hot coffee': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800&auto=format&fit=crop',
  'on the rocks': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?q=80&w=800&auto=format&fit=crop',
  'blended coffee': 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=800&auto=format&fit=crop',
  'cream blended': 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?q=80&w=800&auto=format&fit=crop',
  'hot drinks': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?q=80&w=800&auto=format&fit=crop',
  'refreshers': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=800&auto=format&fit=crop',
  'milkshakes': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?q=80&w=800&auto=format&fit=crop',
  'milk tea': 'https://images.unsplash.com/photo-1558857563-b371f31ca704?q=80&w=800&auto=format&fit=crop',
  'drink add-ons': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?q=80&w=800&auto=format&fit=crop',
  'breakfast': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800&auto=format&fit=crop',
  'appetizer': 'https://images.unsplash.com/photo-1541529086526-db283c563270?q=80&w=800&auto=format&fit=crop',
  'meal': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop',
  'pasta': 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=800&auto=format&fit=crop',
  'pizza': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop',
  'sandwich': 'https://images.unsplash.com/photo-1509722747041-619f35d503cc?q=80&w=800&auto=format&fit=crop',
  'cakes/pastries': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?q=80&w=800&auto=format&fit=crop',
  'add-on food': 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=800&auto=format&fit=crop',
};

export const CustomerMenu: React.FC<CustomerMenuProps> = ({
  categories,
  menuItems,
  settings,
  activeCustomer,
  activeTableBinding,
  onBindTable,
  onClearTable,
  onOrderSuccess,
  onRequireLogin,
  cart: externalCart,
  isCartOpen: externalIsCartOpen,
  onToggleCart: externalOnToggleCart,
  onOpenCart: externalOnOpenCart,
  onCloseCart: externalOnCloseCart,
  onAddToCart: externalOnAddToCart,
  onUpdateQuantity: externalOnUpdateQuantity,
  onRemoveItem: externalOnRemoveItem,
  onClearCart: externalOnClearCart,
  onUpdateItemInstructions: externalOnUpdateItemInstructions,
  isCheckoutOpen: externalIsCheckoutOpen,
  onSetCheckoutOpen: externalOnSetCheckoutOpen,
}) => {
  const { showAlert, showConfirm } = useModal();

  // Navigation hierarchy:
  // selectedType: null (Stage 1: Split View) | 'drinks' | 'food' (Stage 2 & 3)
  // selectedCategory: null (Stage 2: Category Grid) | number (Stage 3: Category Post View)
  const [selectedType, setSelectedType] = useState<'drinks' | 'food' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Track expanded "See more" state per category
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  // Instagram-style Item Detail Modal State
  const [selectedDetailItem, setSelectedDetailItem] = useState<MenuItem | null>(null);
  const [likedItemIds, setLikedItemIds] = useState<Record<number, boolean>>({});
  const [savedItemIds, setSavedItemIds] = useState<Record<number, boolean>>({});
  const [shareToastItemId, setShareToastItemId] = useState<number | null>(null);
  const [modalSpecialInstructions, setModalSpecialInstructions] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasReadNotifications, setHasReadNotifications] = useState(false);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsDropdownRef.current &&
        !notificationsDropdownRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notifications list (Dynamic alerts + store updates)
  const menuNotifications = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      type: 'order' | 'promo' | 'table' | 'info';
    }> = [];

    if (activeTableBinding) {
      list.push({
        id: 'table-active',
        title: `Seated at Table #${activeTableBinding.tableNumber}`,
        message: `Your session is active in the ${activeTableBinding.area === 'airconditioned' ? 'Air-Conditioned Room' : 'Main Dining Area'}. Orders are delivered right to your table.`,
        time: 'Active Now',
        type: 'table',
      });
    }

    if (activeCustomer) {
      list.push({
        id: 'customer-points',
        title: `Welcome, ${activeCustomer.fullName || 'Customer'}!`,
        message: `You have ${activeCustomer.loyaltyPoints || 0} reward points available for perks and discounts.`,
        time: 'Today',
        type: 'info',
      });
    }

    list.push(
      {
        id: 'promo-roast',
        title: 'Featured Single Origin',
        message: 'Try our freshly roasted Benguet Arabica pour-over & creamy Sea Salt Latte.',
        time: 'Just now',
        type: 'promo',
      },
      {
        id: 'promo-pastry',
        title: 'Fresh Bakes from the Oven',
        message: 'Pair your coffee with freshly baked pastries, waffles, and savory brunch plates.',
        time: '1h ago',
        type: 'promo',
      }
    );

    return list;
  }, [activeTableBinding, activeCustomer]);

  const hasUnread = !hasReadNotifications && menuNotifications.length > 0;

  const toggleItemLike = (itemId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLikedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const toggleItemSave = (itemId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSavedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleShareItem = (item: MenuItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${window.location.origin} - Check out ${item.name} at Coffee at Yellow Hauz!`);
    }
    setShareToastItemId(item.id);
    setTimeout(() => setShareToastItemId(null), 2500);
  };

  // Internal fallback state if not provided from parent
  const [internalCart, setInternalCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('yh_customer_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [internalIsCartOpen, setInternalIsCartOpen] = useState(false);

  useEffect(() => {
    if (externalCart === undefined) {
      try {
        localStorage.setItem('yh_customer_cart', JSON.stringify(internalCart));
      } catch (e) {
        console.error('Storage error:', e);
      }
    }
  }, [internalCart, externalCart]);
  const [internalIsCheckoutOpen, setInternalIsCheckoutOpen] = useState(false);
  const isCheckoutOpen = externalIsCheckoutOpen !== undefined ? externalIsCheckoutOpen : internalIsCheckoutOpen;
  const setIsCheckoutOpen = externalOnSetCheckoutOpen || setInternalIsCheckoutOpen;
  const [isTableSelectorModalOpen, setIsTableSelectorModalOpen] = useState(false);
  const [addedItemAnimationId, setAddedItemAnimationId] = useState<number | null>(null);

  const cart = externalCart !== undefined ? externalCart : internalCart;
  const isCartOpen = externalIsCartOpen !== undefined ? externalIsCartOpen : internalIsCartOpen;

  // Checkout Form State
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away' | 'delivery'>('dine_in');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'card'>('cash');
  const [customerName, setCustomerName] = useState(activeCustomer?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(activeCustomer?.contactNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedTable, setSelectedTable] = useState<number | ''>(
    activeTableBinding ? activeTableBinding.tableNumber : ''
  );

  // Advance Booking Parameters (for External Online Customers)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [bookingDate, setBookingDate] = useState<string>(todayStr);
  const [arrivalTime, setArrivalTime] = useState<string>('11:00');
  const [partySize, setPartySize] = useState<number>(2);
  const [seatingPreference, setSeatingPreference] = useState<
    'indoor_main' | 'airconditioned' | 'outdoor_patio' | 'any'
  >('indoor_main');
  const [specialRequests, setSpecialRequests] = useState('');

  // Synchronize when customer or table binding updates
  useEffect(() => {
    if (activeCustomer) {
      if (!customerName) setCustomerName(activeCustomer.fullName || '');
      if (!customerPhone) setCustomerPhone(activeCustomer.contactNumber || '');
    }
  }, [activeCustomer]);

  useEffect(() => {
    if (activeTableBinding) {
      setSelectedTable(activeTableBinding.tableNumber);
      setOrderType('dine_in');
    }
  }, [activeTableBinding]);

  // Separate Drinks vs Food categories
  const isDrinkCategory = (cat: Category) => {
    const id = cat.id;
    if (id >= 9 && id <= 17) return true;
    const n = (cat.name || '').toLowerCase();
    const icon = (cat.icon || '').toLowerCase();
    return (
      icon.includes('coffee') ||
      icon.includes('drink') ||
      icon.includes('tea') ||
      icon.includes('shake') ||
      icon.includes('glass') ||
      icon.includes('cup') ||
      icon.includes('juice') ||
      icon.includes('refresher') ||
      n.includes('coffee') ||
      n.includes('drink') ||
      n.includes('rocks') ||
      n.includes('blended') ||
      n.includes('shake') ||
      n.includes('tea') ||
      n.includes('refresher') ||
      n.includes('beverage')
    );
  };

  const drinkCategories = useMemo(() => {
    return categories.filter((c) => isDrinkCategory(c));
  }, [categories]);

  const foodCategories = useMemo(() => {
    return categories.filter((c) => !isDrinkCategory(c));
  }, [categories]);

  const currentCategoriesList = selectedType === 'drinks' ? drinkCategories : foodCategories;

  // Category Icon resolver
  const renderCategoryIcon = (categoryName: string, isDrink: boolean, iconName?: string) => {
    const name = (categoryName || '').toLowerCase();
    const ic = (iconName || '').toLowerCase();

    if (ic === 'coffee' || name.includes('hot coffee') || (isDrink && name.includes('coffee') && !name.includes('blended'))) {
      return <Coffee className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'glasswater' || ic === 'glass' || name.includes('on the rocks')) {
      return <GlassWater className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'cupsoda' || name.includes('blended coffee') || name.includes('soda') || name.includes('frappe')) {
      return <CupSoda className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'icecream' || name.includes('cream blended') || name.includes('ice cream')) {
      return <IceCream className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'flame' || name.includes('hot drink') || name.includes('flame')) {
      return <Flame className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'citrus' || name.includes('refresher') || name.includes('citrus') || name.includes('juice')) {
      return <Citrus className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'milk' || name.includes('milkshake') || name.includes('shake') || name.includes('milk')) {
      return <Milk className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'leaf' || name.includes('milk tea') || name.includes('tea') || name.includes('matcha')) {
      return <Leaf className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (name.includes('drink add-on') || name.includes('add-on') || name.includes('addon') || name.includes('plus')) {
      return <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />;
    }
    if (ic === 'egg' || name.includes('breakfast') || name.includes('egg')) {
      return <Egg className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'utensils' || name.includes('appetizer')) {
      return <Utensils className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'soup' || name.includes('meal') || name.includes('soup') || name.includes('rice')) {
      return <Soup className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'cookingpot' || name.includes('pasta') || name.includes('noodle')) {
      return <CookingPot className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'pizza' || name.includes('pizza')) {
      return <Pizza className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'sandwich' || name.includes('sandwich') || name.includes('bread') || name.includes('toast')) {
      return <Sandwich className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    if (ic === 'cake' || name.includes('cake') || name.includes('pastr') || name.includes('dessert') || name.includes('bakery')) {
      return <Cake className="h-4 w-4 shrink-0 stroke-[2.2]" />;
    }
    return isDrink ? <Coffee className="h-4 w-4 shrink-0 stroke-[2.2]" /> : <Utensils className="h-4 w-4 shrink-0 stroke-[2.2]" />;
  };

  // Get active Category object if selected
  const currentCategoryObj = useMemo(() => {
    if (!selectedCategory) return null;
    return categories.find((c) => c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  // Items in active category
  const categoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    return menuItems.filter((item) => item.categoryId === selectedCategory && item.isAvailable);
  }, [menuItems, selectedCategory]);

  // Best sellers vs Other items in active category
  const { bestSellers, otherItems } = useMemo(() => {
    if (!selectedCategory) return { bestSellers: [], otherItems: [] };
    const explicitBestSellers = categoryItems.filter((i) => i.isBestSeller);
    // If no explicit best sellers exist, treat the top 2 items as featured so the category is never empty
    if (explicitBestSellers.length === 0 && categoryItems.length > 0) {
      return {
        bestSellers: categoryItems.slice(0, 2),
        otherItems: categoryItems.slice(2),
      };
    }
    const explicitIds = new Set(explicitBestSellers.map((i) => i.id));
    return {
      bestSellers: explicitBestSellers,
      otherItems: categoryItems.filter((i) => !explicitIds.has(i.id)),
    };
  }, [categoryItems, selectedCategory]);

  // Global search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return menuItems.filter(
      (item) =>
        item.isAvailable &&
        (item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q))
    );
  }, [menuItems, searchQuery]);

  // Cart operations
  const handleAddToCart = (item: MenuItem) => {
    setAddedItemAnimationId(item.id);
    setTimeout(() => setAddedItemAnimationId(null), 1200);

    if (externalOnAddToCart) {
      externalOnAddToCart(item);
    } else {
      setInternalCart((prev) => {
        const existing = prev.find((ci) => ci.item.id === item.id);
        if (existing) {
          return prev.map((ci) =>
            ci.item.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
          );
        }
        return [...prev, { item, quantity: 1 }];
      });
      setInternalIsCartOpen(true);
    }
  };

  const handleUpdateQuantity = (itemId: number, delta: number) => {
    if (externalOnUpdateQuantity) {
      externalOnUpdateQuantity(itemId, delta);
    } else {
      setInternalCart((prev) =>
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
    }
  };

  const handleRemoveItem = (itemId: number) => {
    if (externalOnRemoveItem) {
      externalOnRemoveItem(itemId);
    } else {
      setInternalCart((prev) => prev.filter((ci) => ci.item.id !== itemId));
    }
  };

  const handleClearCart = () => {
    if (externalOnClearCart) {
      externalOnClearCart();
    } else {
      setInternalCart([]);
    }
  };

  const handleToggleCart = () => {
    if (externalOnToggleCart) {
      externalOnToggleCart();
    } else {
      setInternalIsCartOpen((prev) => !prev);
    }
  };

  const handleCloseCart = () => {
    if (externalOnCloseCart) {
      externalOnCloseCart();
    } else {
      setInternalIsCartOpen(false);
    }
  };

  const handleUpdateItemInstructions = (itemId: number, text: string) => {
    if (externalOnUpdateItemInstructions) {
      externalOnUpdateItemInstructions(itemId, text);
    } else {
      setInternalCart((prev) =>
        prev.map((ci) => (ci.item.id === itemId ? { ...ci, specialInstructions: text } : ci))
      );
    }
  };

  // Cart Totals
  const subtotal = useMemo(() => {
    return cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0);
  }, [cart]);

  const taxRate = settings.tax_rate;
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;
  const totalItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);

  // Toggle see more for category
  const isCategoryExpanded = selectedCategory ? Boolean(expandedCategories[selectedCategory]) : false;
  const toggleCategoryExpanded = (catId: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Submit Order with Unified Dual-Mode Engine
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const isLiveInHouse = Boolean(activeTableBinding || (orderType === 'dine_in' && selectedTable));

    if (!isLiveInHouse && !activeCustomer) {
      showAlert({
        title: 'Login Required',
        message: 'Please sign in or register your customer account to place an online order.',
        type: 'warning',
      });
      onRequireLogin();
      return;
    }

    if (orderType === 'dine_in' && !selectedTable && !activeTableBinding) {
      showAlert({
        title: 'Table Required',
        message: 'Please select a dining table or specify advance reservation parameters.',
        type: 'warning',
      });
      return;
    }

    const finalTableNum = activeTableBinding
      ? activeTableBinding.tableNumber
      : selectedTable
      ? Number(selectedTable)
      : null;

    const finalTableId = activeTableBinding
      ? activeTableBinding.tableId
      : selectedTable
      ? Number(selectedTable)
      : null;

    const finalCustomerName = activeCustomer?.fullName?.trim()
      ? activeCustomer.fullName.trim()
      : customerName.trim()
      ? customerName.trim()
      : finalTableNum
      ? `Table #${finalTableNum}`
      : 'Guest Customer';

    const finalCustomerPhone = activeCustomer?.contactNumber?.trim()
      ? activeCustomer.contactNumber.trim()
      : customerPhone.trim()
      ? customerPhone.trim()
      : '';

    const paymentLabel = paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash QR' : 'Card';
    const targetDestination = isLiveInHouse
      ? `Table #${finalTableNum}`
      : orderType === 'delivery'
      ? `Delivery (${deliveryAddress.trim() || 'Address Specified'})`
      : orderType === 'take_away'
      ? 'Takeaway / Store Pick-up'
      : `Advance Dine-In Booking (${bookingDate} at ${arrivalTime})`;

    const confirmMessage = `Please review your order details before submitting:\n\n• Items: ${totalItemCount} item(s)\n• Total Amount: ₱${totalAmount.toFixed(2)}\n• Destination: ${targetDestination}\n• Payment: ${paymentLabel}\n\nWould you like to place this order now?`;

    const userConfirmed = await showConfirm({
      title: isLiveInHouse ? 'Confirm Table Order' : 'Confirm Order Placement',
      message: confirmMessage,
      type: 'info',
      confirmText: 'Yes, Place Order',
      cancelText: 'Review Items',
    });

    if (!userConfirmed) {
      return;
    }

    const orderItems = cart.map((ci) => ({
      menuItemId: ci.item.id,
      name: ci.item.name,
      quantity: ci.quantity,
      unitPrice: ci.item.price,
      totalPrice: ci.item.price * ci.quantity,
      specialInstructions: ci.specialInstructions,
      imageUrl: ci.item.imageUrl,
    }));

    const advanceBookingData: AdvanceBookingDetails | undefined = isLiveInHouse
      ? undefined
      : {
          bookingDate,
          arrivalTime,
          partySize: Number(partySize) || 2,
          seatingPreference,
          specialRequests: specialRequests.trim() || undefined,
        };

    const newOrder = AppStore.createOrder({
      channel: 'online',
      orderClassification: isLiveInHouse ? 'live_in_house' : 'advance_booking',
      tableId: isLiveInHouse ? finalTableId : null,
      tableNumber: isLiveInHouse ? finalTableNum : null,
      advanceBooking: advanceBookingData,
      scheduledFor: !isLiveInHouse ? `${bookingDate} ${arrivalTime}` : undefined,
      guestCount: !isLiveInHouse ? Number(partySize) || 2 : undefined,
      customerId: activeCustomer?.id || null,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
      orderType: isLiveInHouse ? 'dine_in' : orderType,
      paymentMethod,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      discountAmount: 0,
      discountType: 'none',
      discountPercent: 0,
      amountPaid: totalAmount,
      changeAmount: 0,
      status: 'to_confirm',
      cashierId: 1,
      cashierName: isLiveInHouse ? 'Table QR Self-Order' : 'Online Advance Booking',
      items: orderItems,
    });

    handleClearCart();
    setIsCheckoutOpen(false);
    handleCloseCart();
    onOrderSuccess(newOrder);
  };

  // Helper to render an aesthetic post card for an item
  const renderItemPostCard = (item: MenuItem, isBestSellerBadge: boolean = false) => {
    const inCartItem = cart.find((ci) => ci.item.id === item.id);
    const inCartQty = inCartItem?.quantity || 0;
    const isJustAdded = addedItemAnimationId === item.id;
    const isLiked = Boolean(likedItemIds[item.id]);

    return (
      <article
        key={item.id}
        id={`menu-item-post-${item.id}`}
        onClick={() => {
          setSelectedDetailItem(item);
          setModalSpecialInstructions(inCartItem?.specialInstructions || '');
        }}
        className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-xs transition-all duration-300 hover:shadow-xl hover:border-amber-400 hover:-translate-y-1 cursor-pointer"
      >
        {/* Large Editorial Post Image */}
        <div className="relative aspect-4/3 sm:aspect-16/10 w-full overflow-hidden bg-stone-100">
          <img
            src={item.imageUrl || '/01_Hearts_Latte_Art.jpg'}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/01_Hearts_Latte_Art.jpg';
            }}
          />

          {/* Instagram-style Hover Hint overlay */}
          <div className="absolute inset-0 bg-stone-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
            <span className="rounded-full bg-stone-900/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white shadow-lg flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Tap for details</span>
            </span>
          </div>

          {/* Top Floating Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
            {(isBestSellerBadge || item.isBestSeller) && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/95 backdrop-blur-xs px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-stone-950 shadow-md">
                <Star className="h-3 w-3 fill-stone-950 text-stone-950" />
                <span>Best Seller</span>
              </span>
            )}
            <span className="rounded-full bg-stone-950/80 backdrop-blur-xs px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
              {item.temperature || 'Prepared Fresh'}
            </span>
          </div>

          {/* Quick Like Button (Instagram Style) */}
          <button
            type="button"
            onClick={(e) => toggleItemLike(item.id, e)}
            className="absolute top-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-stone-900/70 backdrop-blur-md text-white transition hover:scale-110 active:scale-90"
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </button>

          {/* Floating Price Pill */}
          <div className="absolute bottom-3 right-3 rounded-2xl bg-stone-950/90 backdrop-blur-sm px-3.5 py-1.5 shadow-lg border border-white/10">
            <span className="font-mono text-base font-black text-amber-400">
              ₱{item.price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Post Content Body */}
        <div className="flex flex-1 flex-col justify-between p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-extrabold text-stone-900 group-hover:text-amber-700 transition-colors duration-200 line-clamp-1">
              {item.name}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
              {item.description || 'Crafted with premium artisanal ingredients for an unforgettable taste.'}
            </p>
          </div>

          {/* Post Action Footer */}
          <div className="flex items-center justify-between border-t border-stone-100 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-400">
                In Stock: <span className="text-stone-700 font-mono">{item.quantity}</span>
              </span>
              {inCartQty > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900">
                  {inCartQty} in bag
                </span>
              )}
            </div>

            {/* Tactile Add / Stepper Button */}
            {inCartQty > 0 ? (
              <div
                className="flex items-center gap-1.5 rounded-2xl bg-stone-100 p-1 border border-stone-200 shadow-2xs"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleUpdateQuantity(item.id, -1)}
                  className="grid h-8 w-8 place-items-center rounded-xl bg-white text-stone-700 shadow-xs hover:bg-stone-200 transition active:scale-90 cursor-pointer"
                  title="Reduce quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-2 font-mono text-xs font-black text-stone-900">
                  {inCartQty}
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateQuantity(item.id, 1)}
                  className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs hover:bg-amber-400 transition active:scale-90 cursor-pointer"
                  title="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                id={`add-btn-${item.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart(item);
                }}
                className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all duration-200 active:scale-95 cursor-pointer shadow-md ${
                  isJustAdded
                    ? 'bg-emerald-600 text-white scale-105'
                    : 'bg-amber-500 text-stone-950 hover:bg-amber-400 hover:shadow-amber-500/20'
                }`}
              >
                {isJustAdded ? (
                  <>
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>Added!</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>Add to Bag</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Top Header with Expandable Search */}
      <header className="flex items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-stone-900 font-display tracking-tight">
            Menu
          </h1>
        </div>

        {/* Header Actions: Notifications & Expandable Search */}
        <div className="flex items-center gap-2">
          {/* Notification Icon Button */}
          <div className="relative" ref={notificationsDropdownRef}>
            <button
              type="button"
              id="menu-notifications-btn"
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
                if (!isNotificationsOpen) {
                  setHasReadNotifications(true);
                }
              }}
              title="Notifications & Updates"
              className={`relative grid h-10 w-10 place-items-center rounded-2xl border transition active:scale-95 cursor-pointer shadow-2xs ${
                isNotificationsOpen
                  ? 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-950'
              }`}
            >
              <Bell className="h-4 w-4 stroke-[2.2]" />
              {hasUnread && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-white"></span>
                </span>
              )}
            </button>

            {/* Notifications Popover Dropdown */}
            {isNotificationsOpen && (
              <div
                id="menu-notifications-popover"
                className="absolute right-0 sm:right-0 top-12 z-50 w-72 sm:w-80 rounded-2xl border border-stone-200 bg-white p-3 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 font-sans"
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <Bell className="h-3.5 w-3.5 text-amber-600" />
                    <span>Notifications & Updates</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-bold">
                    {menuNotifications.length} updates
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 no-scrollbar">
                  {menuNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="rounded-xl border border-stone-100 bg-stone-50/70 p-2.5 text-xs hover:bg-stone-50 transition"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-stone-900 text-[11px] flex items-center gap-1">
                          {notif.type === 'table' && <Utensils className="h-3 w-3 text-amber-600 shrink-0" />}
                          {notif.type === 'promo' && <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />}
                          {notif.type === 'info' && <Coffee className="h-3 w-3 text-amber-700 shrink-0" />}
                          <span>{notif.title}</span>
                        </span>
                        <span className="text-[9px] text-stone-400 shrink-0">{notif.time}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Expandable Search Bar (Icon button that expands on click) */}
          <div
            className={`flex items-center transition-all duration-300 ease-out ${
              isSearchExpanded || searchQuery
                ? 'w-64 sm:w-80'
                : 'w-10'
            }`}
          >
            {isSearchExpanded || searchQuery ? (
              <div className="relative w-full flex items-center">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onBlur={() => {
                    if (!searchQuery) {
                      setIsSearchExpanded(false);
                    }
                  }}
                  placeholder="Search drinks, coffee, food..."
                  autoFocus
                  className="w-full rounded-2xl border border-stone-300 bg-white pl-9 pr-8 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchExpanded(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition cursor-pointer"
                  title="Close search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="menu-search-toggle-btn"
                onClick={() => {
                  setIsSearchExpanded(true);
                  setTimeout(() => {
                    searchInputRef.current?.focus();
                  }, 100);
                }}
                title="Search Menu"
                className="grid h-10 w-10 place-items-center rounded-2xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-950 shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Search className="h-4 w-4 stroke-[2.2]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* VIEW A: SEARCH ACTIVE OVERRIDE */}
      {searchQuery.trim() ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Search Results</span>
              <h2 className="text-xl font-black text-stone-900 font-display">
                "{searchQuery}" ({searchResults.length} {searchResults.length === 1 ? 'item' : 'items'})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            >
              Back to Catalog
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center">
              <Coffee className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="font-display text-lg font-bold text-stone-800">No menu items found</p>
              <p className="mt-1 text-xs text-stone-500">
                We couldn't find anything matching "{searchQuery}". Try searching for another item or browse categories.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-4 rounded-xl bg-amber-500 px-5 py-2 text-xs font-black text-stone-950 shadow-xs cursor-pointer hover:bg-amber-400"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((item) => renderItemPostCard(item))}
            </div>
          )}
        </section>
      ) : (
        /* MAIN 3-STAGE FLOW */
        <div className="transition-all duration-300 ease-in-out">
          {/* ========================================================================= */}
          {/* STAGE 1: 50 / 50 SPLIT BODY (HALF DRINKS, HALF FOOD) */}
          {/* ========================================================================= */}
          {selectedType === null && (
            <section className="animate-in fade-in zoom-in-98 duration-300">
              {/* 50 / 50 Split Layout with rich background imagery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 min-h-[540px] lg:min-h-[580px]">
                {/* HALF 1: DRINKS */}
                <div
                  id="split-choice-drinks"
                  onClick={() => {
                    setSelectedType('drinks');
                    setSelectedCategory(null);
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] border-2 border-stone-200 hover:border-amber-400 flex flex-col justify-end p-8 sm:p-10"
                >
                  {/* High Quality Background Image with subtle zoom */}
                  <img
                    src={DRINKS_HERO_BG}
                    alt="Handcrafted Coffee & Drinks"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  {/* Rich Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-950/30 group-hover:via-stone-950/50 transition-colors duration-300" />

                  {/* Bottom Information */}
                  <div className="relative z-10">
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-display tracking-tight group-hover:text-amber-300 transition-colors">
                      Drinks &amp; Coffee
                    </h3>
                  </div>
                </div>

                {/* HALF 2: FOOD */}
                <div
                  id="split-choice-food"
                  onClick={() => {
                    setSelectedType('food');
                    setSelectedCategory(null);
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] border-2 border-stone-200 hover:border-amber-400 flex flex-col justify-end p-8 sm:p-10"
                >
                  {/* High Quality Background Image with subtle zoom */}
                  <img
                    src={FOOD_HERO_BG}
                    alt="Artisanal Food & Pastries"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  {/* Rich Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/60 to-stone-950/30 group-hover:via-stone-950/50 transition-colors duration-300" />

                  {/* Bottom Information */}
                  <div className="relative z-10">
                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-display tracking-tight group-hover:text-amber-300 transition-colors">
                      Food &amp; Pastries
                    </h3>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* STAGE 2 & 3: SLIDING MULTI-COLUMN LAYOUT */}
          {/* ========================================================================= */}
          {selectedType !== null && (
            <div className="flex flex-col lg:flex-row gap-5 items-start animate-in fade-in duration-300">
              {/* ------------------------------------------------------------- */}
              {/* SIDE NAV: DRINKS / FOOD SWITCH & CATEGORIES LIST BELOW */}
              {/* ------------------------------------------------------------- */}
              <aside
                id="type-navbar-column"
                className="w-full lg:w-auto shrink-0 rounded-3xl border border-stone-200 bg-white/95 backdrop-blur-md p-2.5 shadow-md space-y-3 sticky top-24 lg:top-28 z-30 transition-all duration-200"
              >
                {/* Back to Split Home Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType(null);
                    setSelectedCategory(null);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-extrabold text-stone-600 hover:text-stone-950 hover:bg-stone-100 transition cursor-pointer border border-dashed border-stone-200 whitespace-nowrap"
                  title="Return to initial Drinks and Food split view"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Main Split</span>
                </button>

                {/* Drinks & Food Buttons */}
                <div className="flex flex-row lg:flex-col gap-1.5">
                  {/* Drinks Button */}
                  <button
                    type="button"
                    id="nav-btn-drinks"
                    onClick={() => {
                      setSelectedType('drinks');
                      setSelectedCategory(null);
                    }}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-black transition-all duration-200 border cursor-pointer whitespace-nowrap w-fit ${
                      selectedType === 'drinks'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md scale-[1.02]'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Coffee className="h-4 w-4 shrink-0" />
                    <span>Drinks</span>
                  </button>

                  {/* Food Button */}
                  <button
                    type="button"
                    id="nav-btn-food"
                    onClick={() => {
                      setSelectedType('food');
                      setSelectedCategory(null);
                    }}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-black transition-all duration-200 border cursor-pointer whitespace-nowrap w-fit ${
                      selectedType === 'food'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md scale-[1.02]'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Utensils className="h-4 w-4 shrink-0" />
                    <span>Food</span>
                  </button>
                </div>

                {/* Category Pills Below Food and Drinks */}
                {selectedCategory !== null && (
                  <div
                    id="category-navbar-column"
                    className="pt-2 border-t border-stone-100 animate-in fade-in duration-200"
                  >
                    <div className="flex flex-row lg:flex-col flex-wrap gap-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                      {currentCategoriesList.map((cat) => {
                        const isCurrent = selectedCategory === cat.id;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            id={`category-nav-pill-${cat.id}`}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold transition-all duration-150 border cursor-pointer whitespace-nowrap w-fit ${
                              isCurrent
                                ? 'bg-amber-500 text-stone-950 border-amber-500 font-black shadow-xs translate-x-0.5'
                                : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                            }`}
                          >
                            <span className={isCurrent ? 'text-stone-950' : 'text-amber-700'}>
                              {renderCategoryIcon(cat.name, selectedType === 'drinks', cat.icon)}
                            </span>
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </aside>

              {/* ------------------------------------------------------------- */}
              {/* MAIN CONTENT STAGE (CENTER / RIGHT) */}
              {/* ------------------------------------------------------------- */}
              <main className="flex-1 min-w-0 space-y-6">
                {/* ----------------------------------------------------------- */}
                {/* STAGE 2: CATEGORY SELECTION CARDS (WHEN NO CATEGORY SELECTED) */}
                {/* ----------------------------------------------------------- */}
                {selectedCategory === null && (
                  <div className="space-y-5 animate-in fade-in duration-300">
                    {/* Category Cards Grid - Clean & Aesthetic */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {currentCategoriesList.map((cat) => {
                        const count = menuItems.filter((i) => i.categoryId === cat.id && i.isAvailable).length;
                        const catImg =
                          CATEGORY_IMAGES[cat.name.toLowerCase()] ||
                          (selectedType === 'drinks' ? DRINKS_HERO_BG : FOOD_HERO_BG);

                        return (
                          <div
                            key={cat.id}
                            id={`category-card-${cat.id}`}
                            onClick={() => setSelectedCategory(cat.id)}
                            className="group relative cursor-pointer overflow-hidden rounded-3xl border border-stone-200 bg-white p-3 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-amber-400 hover:-translate-y-1"
                          >
                            {/* Card Image */}
                            <div className="relative aspect-16/9 w-full overflow-hidden rounded-2xl bg-stone-100">
                              <img
                                src={catImg}
                                alt={cat.name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />

                              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-stone-950/80 backdrop-blur-md px-3.5 py-1.5 text-xs sm:text-sm font-extrabold text-amber-400 shadow-md">
                                {renderCategoryIcon(cat.name, selectedType === 'drinks', cat.icon)}
                                <span>{cat.name}</span>
                              </div>

                              <div className="absolute bottom-3 right-3 font-mono text-xs font-bold text-white bg-stone-900/80 backdrop-blur-md px-2.5 py-1 rounded-xl">
                                {count}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------------- */}
                {/* STAGE 3: CATEGORY POSTS VIEW (BEST SELLERS & COLLAPSIBLE OTHER ITEMS) */}
                {/* ----------------------------------------------------------- */}
                {selectedCategory !== null && currentCategoryObj && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {/* 1. BEST SELLERS POSTS SECTION */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-500 text-stone-950">
                            <Star className="h-3.5 w-3.5 fill-stone-950 text-stone-950" />
                          </span>
                          <h3 className="text-lg sm:text-xl font-black text-stone-900 font-display">
                            Best Sellers in {currentCategoryObj.name}
                          </h3>
                        </div>
                        <span className="text-xs font-bold text-stone-400">
                          {bestSellers.length} Featured
                        </span>
                      </div>

                      {bestSellers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 p-8 text-center bg-white">
                          <p className="text-xs text-stone-500">No items available in this category currently.</p>
                        </div>
                      ) : (
                        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-2">
                          {bestSellers.map((item) => renderItemPostCard(item, true))}
                        </div>
                      )}
                    </section>

                    {/* 2. HIDDEN / COLLAPSIBLE OTHER ITEMS ("SEE MORE [CATEGORY]") */}
                    {otherItems.length > 0 && (
                      <section className="space-y-4 pt-4 border-t border-stone-200">
                        {/* The "See More [Category]" Button as requested */}
                        <div className="text-center">
                          <button
                            type="button"
                            id="toggle-see-more-category-btn"
                            onClick={() => toggleCategoryExpanded(selectedCategory)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 text-xs sm:text-sm font-black shadow-lg transition-all duration-200 active:scale-95 cursor-pointer hover:ring-4 hover:ring-amber-500/20"
                          >
                            <span>
                              {isCategoryExpanded
                                ? `Collapse Additional ${currentCategoryObj.name}`
                                : `See More ${currentCategoryObj.name} (${otherItems.length} more items)`}
                            </span>
                            {isCategoryExpanded ? (
                              <ChevronUp className="h-4 w-4 text-amber-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-amber-400" />
                            )}
                          </button>
                        </div>

                        {/* Unfolded additional items list */}
                        {isCategoryExpanded && (
                          <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 px-1">
                              <span className="text-xs font-black uppercase tracking-wider text-stone-400">
                                Additional {currentCategoryObj.name} Selection
                              </span>
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-2">
                              {otherItems.map((item) => renderItemPostCard(item, false))}
                            </div>
                          </div>
                        )}
                      </section>
                    )}
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      )}

      {/* Cart Drawer (only used as fallback when rendered standalone) */}
      {externalCart === undefined && (
        <CustomerCartDrawer
          isOpen={isCartOpen}
          onToggle={handleToggleCart}
          onClose={handleCloseCart}
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onUpdateItemInstructions={handleUpdateItemInstructions}
          onAddToCart={handleAddToCart}
          settings={settings}
          activeTableBinding={activeTableBinding}
          activeCustomer={activeCustomer}
          onRequireLogin={onRequireLogin}
          onProceedToCheckout={() => {
            if (!activeTableBinding && !activeCustomer) {
              onRequireLogin();
              return;
            }
            setIsCheckoutOpen(true);
          }}
        />
      )}

      {/* Live Table Request Modal */}
      <TableRequestModal
        isOpen={isTableSelectorModalOpen}
        onClose={() => setIsTableSelectorModalOpen(false)}
        onConfirmed={(binding: TableBinding) => {
          if (onBindTable) onBindTable(binding.tableNumber);
          setSelectedTable(binding.tableNumber);
        }}
        activeCustomer={activeCustomer}
        currentTableBinding={activeTableBinding}
      />

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Coffee at Yellow Hauz
                </span>
                <h3 className="text-xl font-bold text-stone-900 font-display">
                  Order Details &amp; Checkout
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="mt-5 space-y-4">
              {activeTableBinding || (orderType === 'dine_in' && selectedTable) ? (
                <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 border border-amber-500/40 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-950 text-xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>LIVE IN-HOUSE ORDER • TABLE #{activeTableBinding?.tableNumber || selectedTable}</span>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-800 text-[10px] font-black px-2 py-0.5 uppercase">
                      Immediate Prep
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Order is bound to Table #{activeTableBinding?.tableNumber || selectedTable} ({activeTableBinding?.area === 'airconditioned' ? 'Airconditioned Lounge' : 'Main Dining Area'}). It will be dispatched immediately to the kitchen queue for live prep and served to your table.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-stone-900 text-white p-3.5 space-y-1 border border-stone-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs">
                      <Globe className="h-3.5 w-3.5" />
                      <span>ONLINE EXTERNAL ORDER • ADVANCE BOOKING</span>
                    </div>
                    <span className="rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5">
                      Scheduled
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    Configure your future arrival date, target time, and party size below so our team prepares your table and orders in advance.
                  </p>
                </div>
              )}

              {!activeTableBinding && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                      Ordering Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderType('dine_in')}
                        className={`rounded-xl py-2.5 text-xs font-bold border transition cursor-pointer ${
                          orderType === 'dine_in'
                            ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        🍽️ Table Booking
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('take_away')}
                        className={`rounded-xl py-2.5 text-xs font-bold border transition cursor-pointer ${
                          orderType === 'take_away'
                            ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        🛍️ Pick-Up
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('delivery')}
                        className={`rounded-xl py-2.5 text-xs font-bold border transition cursor-pointer ${
                          orderType === 'delivery'
                            ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        🛵 Delivery
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3.5 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                      <Calendar className="h-4 w-4 text-amber-600" />
                      <span>
                        {orderType === 'dine_in'
                          ? 'Advance Table Booking Schedule'
                          : orderType === 'take_away'
                          ? 'Scheduled Pickup Time'
                          : 'Target Delivery Schedule'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          required
                          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                          Arrival / Target Time
                        </label>
                        <input
                          type="time"
                          value={arrivalTime}
                          onChange={(e) => setArrivalTime(e.target.value)}
                          required
                          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {orderType === 'dine_in' && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                            Party Size (Guests)
                          </label>
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-stone-400" />
                            <select
                              value={partySize}
                              onChange={(e) => setPartySize(Number(e.target.value))}
                              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20].map((n) => (
                                <option key={n} value={n}>
                                  {n} {n === 1 ? 'Guest' : 'Guests'}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                            Seating Area
                          </label>
                          <select
                            value={seatingPreference}
                            onChange={(e) =>
                              setSeatingPreference(
                                e.target.value as 'indoor_main' | 'airconditioned' | 'outdoor_patio' | 'any'
                              )
                            }
                            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                          >
                            <option value="indoor_main">Indoor Main Area</option>
                            <option value="airconditioned">AC Lounge Room</option>
                            <option value="outdoor_patio">Al Fresco Patio</option>
                            <option value="any">Any Available</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                        Special Requests / Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="e.g. High chair needed, anniversary setup, quiet corner"
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeCustomer ? (
                <div className="flex items-center justify-between rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider block">
                        Account Verified
                      </span>
                      <span className="font-bold text-stone-900 text-sm">
                        {activeCustomer.fullName}
                      </span>
                    </div>
                  </div>
                  {activeCustomer.contactNumber && (
                    <span className="font-mono text-stone-700 text-xs bg-white/90 px-3 py-1 rounded-xl border border-stone-200 shadow-2xs">
                      {activeCustomer.contactNumber}
                    </span>
                  )}
                </div>
              ) : activeTableBinding || (orderType === 'dine_in' && selectedTable) ? (
                null
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+63 912 345 6789"
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {orderType === 'delivery' && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House/Unit, Street, Barangay, Davao City"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`rounded-xl py-2 text-xs font-bold border transition cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    💵 {activeTableBinding ? 'Cash / Counter' : 'Cash'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('gcash')}
                    className={`rounded-xl py-2 text-xs font-bold border transition cursor-pointer ${
                      paymentMethod === 'gcash'
                        ? 'bg-sky-500 text-white border-sky-500 shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    📱 GCash QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`rounded-xl py-2 text-xs font-bold border transition cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    💳 Card
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200/90 p-3 text-xs text-amber-950 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-700" />
                  <span>
                    {activeTableBinding
                      ? 'Live In-House Kitchen Queue'
                      : 'Advance Order Confirmation'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  {activeTableBinding
                    ? `Your order will be instantly received by the barista and kitchen team for preparation at Table #${activeTableBinding.tableNumber}.`
                    : `Your reservation and advance order will be logged and verified on our POS system for arrival on ${bookingDate} at ${arrivalTime}.`}
                </p>
              </div>

              <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Items count:</span>
                  <span>{totalItemCount} items</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>VAT ({taxRate}%):</span>
                  <span>₱{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-stone-900 pt-1.5 border-t border-stone-200">
                  <span>Total Due:</span>
                  <span className="font-mono text-amber-700">₱{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 py-3 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition active:scale-98 cursor-pointer"
              >
                {activeTableBinding
                  ? `Place Live In-House Order • ₱${totalAmount.toFixed(2)}`
                  : `Confirm Advance Booking & Order • ₱${totalAmount.toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INSTAGRAM-STYLE ITEM DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedDetailItem && (() => {
        const item = selectedDetailItem;
        const itemCategory = categories.find((c) => c.id === item.categoryId);
        const inCartItem = cart.find((ci) => ci.item.id === item.id);
        const inCartQty = inCartItem?.quantity || 0;
        const isLiked = Boolean(likedItemIds[item.id]);
        const isSaved = Boolean(savedItemIds[item.id]);
        const isJustAdded = addedItemAnimationId === item.id;
        const isCopied = shareToastItemId === item.id;

        return (
          <div
            id="insta-item-modal-backdrop"
            onClick={() => setSelectedDetailItem(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-3 sm:p-6 md:p-8 animate-in fade-in duration-200 overflow-y-auto"
          >
            <div
              id="insta-item-modal-container"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-200/80 my-auto flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Top Close Button (Mobile & Desktop) */}
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="absolute top-4 right-4 z-30 grid h-9 w-9 place-items-center rounded-full bg-stone-900/70 backdrop-blur-md text-white hover:bg-stone-900 transition hover:scale-105 active:scale-95 cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* LEFT / TOP: High-Res Square / Cinematic Photo Section */}
              <div className="relative w-full md:w-1/2 bg-stone-950 flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-[480px]">
                <img
                  src={item.imageUrl || '/01_Hearts_Latte_Art.jpg'}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/01_Hearts_Latte_Art.jpg';
                  }}
                />

                {/* Subtle gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/20 pointer-events-none" />

                {/* Star / Best Seller Badge floating on image */}
                <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10 pointer-events-none">
                  {item.isBestSeller && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-stone-950 shadow-lg">
                      <Star className="h-3.5 w-3.5 fill-stone-950 text-stone-950" />
                      <span>Best Seller</span>
                    </span>
                  )}
                  <span className="rounded-full bg-stone-900/80 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-md">
                    {item.temperature || 'Signature Prep'}
                  </span>
                </div>

                {/* Floating Bottom Left: Price Pill */}
                <div className="absolute bottom-4 left-4 z-10 rounded-2xl bg-stone-900/90 backdrop-blur-md px-4 py-2 text-white border border-white/10 shadow-xl">
                  <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider block">Price</span>
                  <span className="font-mono text-2xl font-black text-white">
                    ₱{item.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* RIGHT: Instagram-Style Editorial Feed Body */}
              <div className="flex flex-1 flex-col justify-between p-6 sm:p-7 md:p-8 bg-white overflow-y-auto max-h-[55vh] md:max-h-[90vh]">
                <div className="space-y-5">
                  {/* Insta Post Author / Cafe Header */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500 text-stone-950 font-black text-sm shadow-md ring-2 ring-amber-400/50">
                        YH
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-stone-900 text-sm">
                            coffeeatyellowhauz
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span className="text-xs font-bold text-amber-700">Official Menu</span>
                        </div>
                        <span className="text-[11px] font-medium text-stone-400">
                          {itemCategory?.name || 'Artisanal Cafe'} • Davao City
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Description (Caption Style) */}
                  <div className="space-y-3">
                    <h2 className="font-display text-2xl sm:text-3xl font-black text-stone-900 tracking-tight leading-snug">
                      {item.name}
                    </h2>

                    <div className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-stone-50/80 rounded-2xl p-4 border border-stone-100 space-y-2">
                      <p>
                        <span className="font-bold text-stone-900 mr-2">coffeeatyellowhauz</span>
                        {item.description || 'Crafted with premium artisanal ingredients, freshly prepared in our cafe kitchen for an unforgettable taste.'}
                      </p>
                      <div className="pt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold text-amber-800">
                        <span>#YellowHauz</span>
                        <span>#{itemCategory?.name.replace(/[^a-zA-Z0-9]/g, '') || 'SpecialtyCafe'}</span>
                        <span>#CoffeeLovers</span>
                        <span>#DavaoEats</span>
                        {item.isBestSeller && <span>#BestSeller</span>}
                      </div>
                    </div>
                  </div>

                  {/* Instagram Action Icons Row */}
                  <div className="flex items-center justify-between pt-1 pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-4">
                      {/* Like */}
                      <button
                        type="button"
                        onClick={(e) => toggleItemLike(item.id, e)}
                        className="group flex items-center gap-1.5 text-stone-700 hover:text-red-500 transition cursor-pointer"
                        title={isLiked ? 'Liked' : 'Like'}
                      >
                        <Heart
                          className={`h-6 w-6 transition-transform group-hover:scale-110 active:scale-90 ${
                            isLiked ? 'fill-red-500 text-red-500' : ''
                          }`}
                        />
                        <span className="font-mono text-xs font-bold text-stone-600">
                          {isLiked ? 'Liked' : 'Like'}
                        </span>
                      </button>

                      {/* Share */}
                      <button
                        type="button"
                        onClick={(e) => handleShareItem(item, e)}
                        className="group flex items-center gap-1.5 text-stone-700 hover:text-stone-950 transition cursor-pointer relative"
                        title="Share link"
                      >
                        <Share2 className="h-6 w-6 transition-transform group-hover:scale-110 active:scale-90" />
                        <span className="text-xs font-bold text-stone-600">Share</span>
                        {isCopied && (
                          <span className="absolute -top-7 left-0 rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap animate-in fade-in zoom-in duration-150">
                            Copied link!
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Bookmark / Save */}
                    <button
                      type="button"
                      onClick={(e) => toggleItemSave(item.id, e)}
                      className="text-stone-700 hover:text-amber-600 transition cursor-pointer"
                      title={isSaved ? 'Saved to favorites' : 'Save to favorites'}
                    >
                      <Bookmark
                        className={`h-6 w-6 transition-transform hover:scale-110 active:scale-90 ${
                          isSaved ? 'fill-amber-500 text-amber-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Attributes & Preparation Details */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-2xl bg-stone-50 p-3 border border-stone-200/80">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 block">
                        Serving Type
                      </span>
                      <span className="font-bold text-stone-800 capitalize mt-0.5 block">
                        {item.temperature || 'Fresh Preparation'}
                      </span>
                    </div>

                    <div className="rounded-2xl bg-stone-50 p-3 border border-stone-200/80">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 block">
                        Availability
                      </span>
                      <span className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {item.quantity > 0 ? `In Stock (${item.quantity})` : 'Available'}
                      </span>
                    </div>
                  </div>

                  {/* Optional Special Instructions in Modal */}
                  {inCartQty > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                        Special Instructions for Barista / Kitchen:
                      </label>
                      <input
                        type="text"
                        value={modalSpecialInstructions}
                        onChange={(e) => {
                          setModalSpecialInstructions(e.target.value);
                          handleUpdateItemInstructions(item.id, e.target.value);
                        }}
                        placeholder="e.g., Less sugar, extra ice, oat milk preference..."
                        className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* MODAL FOOTER: Add to Bag or Quantity Stepper */}
                <div className="pt-6 mt-6 border-t border-stone-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                        Order Total
                      </span>
                      <span className="font-mono text-xl font-black text-stone-900">
                        ₱{((inCartQty > 0 ? inCartQty : 1) * item.price).toFixed(2)}
                      </span>
                    </div>

                    {inCartQty > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-2xl bg-stone-100 p-1.5 border border-stone-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="grid h-9 w-9 place-items-center rounded-xl bg-white text-stone-700 shadow-xs hover:bg-stone-200 transition active:scale-90 cursor-pointer"
                            title="Reduce quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-3 font-mono text-sm font-black text-stone-900">
                            {inCartQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs hover:bg-amber-400 transition active:scale-90 cursor-pointer"
                            title="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDetailItem(null);
                            if (externalOnOpenCart) {
                              externalOnOpenCart();
                            } else {
                              setInternalIsCartOpen(true);
                            }
                          }}
                          className="rounded-2xl bg-stone-900 hover:bg-stone-800 text-white px-5 py-3 text-xs font-black shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <ShoppingBag className="h-4 w-4 text-amber-400" />
                          <span>View Bag</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleAddToCart(item);
                        }}
                        className={`inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-xs sm:text-sm font-black transition-all duration-200 active:scale-95 cursor-pointer shadow-lg ${
                          isJustAdded
                            ? 'bg-emerald-600 text-white scale-105'
                            : 'bg-amber-500 text-stone-950 hover:bg-amber-400 hover:shadow-amber-500/20'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="h-5 w-5 stroke-[3]" />
                            <span>Added to Bag!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-5 w-5 stroke-[2.5]" />
                            <span>Add to Bag • ₱{item.price.toFixed(2)}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
