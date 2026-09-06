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
  SlidersHorizontal,
  Menu as MenuIcon,
  Grid2X2,
  Square,
  LayoutGrid,
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

  // Grid column view mode: 1 column or 2 columns (persisted in localStorage)
  const [gridColumns, setGridColumns] = useState<1 | 2>(() => {
    try {
      const saved = localStorage.getItem('yh_menu_grid_columns');
      return saved === '1' ? 1 : 2;
    } catch {
      return 2;
    }
  });

  const handleSetGridColumns = (cols: 1 | 2) => {
    setGridColumns(cols);
    try {
      localStorage.setItem('yh_menu_grid_columns', String(cols));
    } catch (e) {
      console.error(e);
    }
    setIsGridModalOpen(false);
  };

  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const gridModalRef = useRef<HTMLDivElement>(null);

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
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [isMobileCategoryModalOpen, setIsMobileCategoryModalOpen] = useState(false);

  // Close notifications & filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsDropdownRef.current &&
        !notificationsDropdownRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target as Node)
      ) {
        setIsFilterModalOpen(false);
      }
      if (
        gridModalRef.current &&
        !gridModalRef.current.contains(e.target as Node)
      ) {
        setIsGridModalOpen(false);
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
        <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4.5 space-y-3">
          <div>
            <h3 className="font-display text-base sm:text-lg font-extrabold text-stone-900 group-hover:text-amber-700 transition-colors duration-200 line-clamp-1">
              {item.name}
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
              {item.description || 'Crafted with premium artisanal ingredients for an unforgettable taste.'}
            </p>
          </div>

          {/* Post Action Footer */}
          <div className="flex items-center justify-between border-t border-stone-100 pt-3">
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
    <div className="space-y-2 sm:space-y-3 pb-12 sm:pb-16 max-w-7xl mx-auto">
      {/* Top Header with Expandable Search */}
      <header className="flex items-center justify-between gap-2 pb-0">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500 shrink-0 stroke-[2.5]" />
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 font-display tracking-tight">
            Menu
          </h1>
        </div>

        {/* Header Actions: Grid Layout Filter Modal, Notifications & Expandable Search */}
        <div className="flex items-center gap-2">
          {/* Grid Layout Filter Button */}
          <div className="relative" ref={gridModalRef}>
            <button
              type="button"
              id="grid-layout-filter-btn"
              onClick={() => setIsGridModalOpen((prev) => !prev)}
              title="Change Grid Columns (1 or 2)"
              className={`relative flex items-center gap-1.5 px-3 h-10 rounded-2xl border transition active:scale-95 cursor-pointer shadow-2xs font-bold text-xs ${
                isGridModalOpen
                  ? 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-950'
              }`}
            >
              {gridColumns === 1 ? (
                <Square className="h-4 w-4 text-amber-600 stroke-[2.2]" />
              ) : (
                <Grid2X2 className="h-4 w-4 text-amber-600 stroke-[2.2]" />
              )}
              <span className="font-extrabold text-[11px] hidden sm:inline">
                {gridColumns} Col
              </span>
              <ChevronDown className="h-3 w-3 text-stone-400" />
            </button>

            {/* Grid Layout Filter Modal / Popover */}
            {isGridModalOpen && (
              <div
                id="grid-layout-filter-modal"
                className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-stone-200 bg-white p-3.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 font-sans"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-stone-100 mb-3">
                  <div className="flex items-center gap-1.5 font-black text-xs text-stone-900">
                    <LayoutGrid className="h-4 w-4 text-amber-600" />
                    <span>Grid Display Layout</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsGridModalOpen(false)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-stone-500 mb-3 font-medium">
                  Choose your preferred catalog view:
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* 1 Column Option */}
                  <button
                    type="button"
                    id="grid-col-1-btn"
                    onClick={() => handleSetGridColumns(1)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border text-center transition cursor-pointer ${
                      gridColumns === 1
                        ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                    }`}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-white border border-stone-200 shadow-2xs text-amber-700">
                      <Square className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">1 Column</div>
                      <div className="text-[10px] text-stone-500 font-normal">Full-width view</div>
                    </div>
                    {gridColumns === 1 && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-amber-700">
                        <Check className="h-3 w-3 stroke-[3]" /> Active
                      </span>
                    )}
                  </button>

                  {/* 2 Column Option */}
                  <button
                    type="button"
                    id="grid-col-2-btn"
                    onClick={() => handleSetGridColumns(2)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border text-center transition cursor-pointer ${
                      gridColumns === 2
                        ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                    }`}
                  >
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-white border border-stone-200 shadow-2xs text-amber-700">
                      <Grid2X2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">2 Columns</div>
                      <div className="text-[10px] text-stone-500 font-normal">Compact grid</div>
                    </div>
                    {gridColumns === 2 && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-amber-700">
                        <Check className="h-3 w-3 stroke-[3]" /> Active
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

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
            <div
              className={`grid gap-4 sm:gap-6 ${
                gridColumns === 1
                  ? 'grid-cols-1 max-w-2xl mx-auto'
                  : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
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
              {/* 50 / 50 Split Layout with no gap and centered titles */}
              <div className="grid grid-rows-2 md:grid-rows-1 grid-cols-1 md:grid-cols-2 gap-0 h-[calc(100svh-165px)] sm:h-[calc(100svh-125px)] min-h-[300px] max-h-[700px] overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-stone-200">
                {/* HALF 1: DRINKS */}
                <div
                  id="split-choice-drinks"
                  onClick={() => {
                    setSelectedType('drinks');
                    setSelectedCategory(null);
                  }}
                  className="group relative cursor-pointer overflow-hidden shadow-xs transition-all duration-500 hover:shadow-2xl flex items-center justify-center p-4 sm:p-7 lg:p-10 border-b md:border-b-0 md:border-r border-stone-200/80"
                >
                  {/* High Quality Background Image with subtle zoom */}
                  <img
                    src={DRINKS_HERO_BG}
                    alt="Handcrafted Coffee & Drinks"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  {/* Rich Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/60 to-stone-950/40 group-hover:via-stone-950/50 transition-colors duration-300" />

                  {/* Centered Information */}
                  <div className="relative z-10 text-center flex flex-col items-center justify-center">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white font-display tracking-tight group-hover:text-amber-300 transition-colors">
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
                  className="group relative cursor-pointer overflow-hidden shadow-xs transition-all duration-500 hover:shadow-2xl flex items-center justify-center p-4 sm:p-7 lg:p-10"
                >
                  {/* High Quality Background Image with subtle zoom */}
                  <img
                    src={FOOD_HERO_BG}
                    alt="Artisanal Food & Pastries"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  {/* Rich Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/60 to-stone-950/40 group-hover:via-stone-950/50 transition-colors duration-300" />

                  {/* Centered Information */}
                  <div className="relative z-10 text-center flex flex-col items-center justify-center">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white font-display tracking-tight group-hover:text-amber-300 transition-colors">
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
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-start animate-in fade-in duration-300">
              {/* ------------------------------------------------------------- */}
              {/* MOBILE TRIGGER: OPEN CATEGORY MODAL ON MOBILE SCREENS */}
              {/* ------------------------------------------------------------- */}
              <div className="lg:hidden w-full flex items-center justify-between gap-2 p-1 rounded-2xl bg-white border border-stone-200 shadow-xs mb-0.5">
                <button
                  type="button"
                  id="mobile-category-modal-trigger-btn"
                  onClick={() => setIsMobileCategoryModalOpen(true)}
                  className="flex-1 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-xs font-bold text-stone-900 transition active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="grid h-5 w-5 place-items-center rounded-lg bg-amber-500 text-stone-950 shrink-0">
                      {selectedType === 'drinks' ? <Coffee className="h-3 w-3" /> : <Utensils className="h-3 w-3" />}
                    </span>
                    <span className="font-extrabold text-stone-950 capitalize">{selectedType}</span>
                    <span className="text-stone-300">•</span>
                    <span className="truncate text-stone-600 font-semibold text-xs">
                      {selectedCategory !== null && currentCategoryObj ? currentCategoryObj.name : 'All Categories'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded-lg text-[9px] font-black shrink-0">
                    <span>Change</span>
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </button>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* DESKTOP SIDE NAV: DRINKS / FOOD SWITCH & CATEGORIES LIST */}
              {/* ------------------------------------------------------------- */}
              <aside
                id="type-navbar-column"
                className="hidden lg:block w-auto shrink-0 rounded-3xl border border-stone-200 bg-white/95 backdrop-blur-md p-2 shadow-md space-y-2 sticky top-20 lg:top-24 z-30 transition-all duration-200"
              >
                {/* Drinks & Food Buttons */}
                <div className="flex flex-col gap-1">
                  {/* Drinks Button */}
                  <button
                    type="button"
                    id="nav-btn-drinks"
                    onClick={() => {
                      setSelectedType('drinks');
                      setSelectedCategory(null);
                    }}
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-black transition-all duration-200 border cursor-pointer whitespace-nowrap w-fit ${
                      selectedType === 'drinks'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md scale-[1.02]'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Coffee className="h-3.5 w-3.5 shrink-0" />
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
                    className={`inline-flex items-center gap-2 rounded-2xl px-3 py-1.5 text-xs font-black transition-all duration-200 border cursor-pointer whitespace-nowrap w-fit ${
                      selectedType === 'food'
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md scale-[1.02]'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Utensils className="h-3.5 w-3.5 shrink-0" />
                    <span>Food</span>
                  </button>
                </div>

                {/* Category Pills Below Food and Drinks */}
                {selectedCategory !== null && (
                  <div
                    id="category-navbar-column"
                    className="pt-1.5 border-t border-stone-100 animate-in fade-in duration-200"
                  >
                    <div className="flex flex-col flex-wrap gap-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                      {currentCategoriesList.map((cat) => {
                        const isCurrent = selectedCategory === cat.id;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            id={`category-nav-pill-${cat.id}`}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-1.5 text-xs font-bold transition-all duration-150 border cursor-pointer whitespace-nowrap w-fit ${
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
              {/* MOBILE CATEGORY SELECTION MODAL */}
              {/* ------------------------------------------------------------- */}
              {isMobileCategoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
                  <div
                    id="mobile-category-selection-modal"
                    className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl space-y-4 border border-stone-200 max-h-[85vh] flex flex-col"
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950">
                          {selectedType === 'drinks' ? <Coffee className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                        </span>
                        <div>
                          <h3 className="font-display font-extrabold text-sm text-stone-900">
                            Select Category
                          </h3>
                          <p className="text-[11px] text-stone-500 font-medium capitalize">
                            {selectedType} menu streams
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMobileCategoryModalOpen(false)}
                        className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Drinks vs Food Switcher Tabs */}
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-stone-100 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedType('drinks');
                          setSelectedCategory(null);
                        }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                          selectedType === 'drinks'
                            ? 'bg-white text-stone-950 shadow-xs ring-1 ring-stone-200'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <Coffee className="h-4 w-4 text-amber-700" />
                        <span>Drinks</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedType('food');
                          setSelectedCategory(null);
                        }}
                        className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                          selectedType === 'food'
                            ? 'bg-white text-stone-950 shadow-xs ring-1 ring-stone-200'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <Utensils className="h-4 w-4 text-orange-700" />
                        <span>Food</span>
                      </button>
                    </div>

                    {/* Category List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {/* All Categories Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(null);
                          setIsMobileCategoryModalOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left text-xs font-bold transition cursor-pointer ${
                          selectedCategory === null
                            ? 'bg-amber-500 border-amber-500 text-stone-950 shadow-xs font-black'
                            : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`grid h-7 w-7 place-items-center rounded-xl ${selectedCategory === null ? 'bg-white/30 text-stone-950' : 'bg-white border border-stone-200 text-stone-700'}`}>
                            <Layers className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <div>All {selectedType === 'drinks' ? 'Drinks' : 'Food'} Categories</div>
                            <div className={`text-[10px] font-normal ${selectedCategory === null ? 'text-stone-900/80' : 'text-stone-400'}`}>
                              View category overview cards
                            </div>
                          </div>
                        </div>
                        {selectedCategory === null && <Check className="h-4 w-4 stroke-[3]" />}
                      </button>

                      {/* Individual Categories */}
                      {currentCategoriesList.map((cat) => {
                        const isCurrent = selectedCategory === cat.id;
                        const count = menuItems.filter((i) => i.categoryId === cat.id && i.isAvailable).length;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setIsMobileCategoryModalOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left text-xs font-bold transition cursor-pointer ${
                              isCurrent
                                ? 'bg-amber-500 border-amber-500 text-stone-950 shadow-xs font-black'
                                : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`grid h-7 w-7 place-items-center rounded-xl ${isCurrent ? 'bg-white/30 text-stone-950' : 'bg-white border border-stone-200 text-amber-700'}`}>
                                {renderCategoryIcon(cat.name, selectedType === 'drinks', cat.icon)}
                              </span>
                              <span>{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isCurrent ? 'bg-stone-950 text-amber-400' : 'bg-stone-200/80 text-stone-700'}`}>
                                {count}
                              </span>
                              {isCurrent && <Check className="h-4 w-4 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* MAIN CONTENT STAGE (CENTER / RIGHT) */}
              {/* ------------------------------------------------------------- */}
              <main className="flex-1 min-w-0 space-y-4">
                {/* ----------------------------------------------------------- */}
                {/* STAGE 2: CATEGORY SELECTION CARDS (WHEN NO CATEGORY SELECTED) */}
                {/* ----------------------------------------------------------- */}
                {selectedCategory === null && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    {/* Category Cards Grid - Dynamic 1 or 2 columns */}
                    <div
                      className={`grid gap-1.5 sm:gap-2.5 ${
                        gridColumns === 1
                          ? 'grid-cols-1 sm:grid-cols-1 max-w-xl mx-auto'
                          : 'grid-cols-2 sm:grid-cols-2 xl:grid-cols-3'
                      }`}
                    >
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
                            className="group relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/80 bg-stone-950 shadow-xs transition-all duration-300 hover:shadow-xl hover:border-amber-400 hover:-translate-y-0.5"
                          >
                            {/* Card Image - Seamless Edge-to-Edge */}
                            <div className="relative aspect-16/10 sm:aspect-16/9 w-full overflow-hidden">
                              <img
                                src={catImg}
                                alt={cat.name}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent" />

                              <div className="absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 flex items-center gap-1 sm:gap-1.5 rounded-full bg-stone-950/85 backdrop-blur-md px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-extrabold text-amber-400 shadow-md">
                                <span className="scale-90 sm:scale-100">
                                  {renderCategoryIcon(cat.name, selectedType === 'drinks', cat.icon)}
                                </span>
                                <span className="truncate max-w-[85px] sm:max-w-none">{cat.name}</span>
                              </div>

                              <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 font-mono text-[9px] sm:text-xs font-bold text-white bg-stone-900/85 backdrop-blur-md px-2 py-0.5 rounded-lg shadow-xs">
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
                  <div className="space-y-4 animate-in fade-in duration-300">
                    {/* 1. BEST SELLERS POSTS SECTION */}
                    <section className="space-y-3">
                      {bestSellers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-center bg-white">
                          <p className="text-xs text-stone-500">No items available in this category currently.</p>
                        </div>
                      ) : (
                        <div
                          className={`grid gap-3 sm:gap-4 ${
                            gridColumns === 1
                              ? 'grid-cols-1 max-w-xl mx-auto'
                              : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2'
                          }`}
                        >
                          {bestSellers.map((item) => renderItemPostCard(item, true))}
                        </div>
                      )}
                    </section>

                    {/* 2. HIDDEN / COLLAPSIBLE OTHER ITEMS ("SEE MORE [CATEGORY]") */}
                    {otherItems.length > 0 && (
                      <section className="space-y-3 pt-3 border-t border-stone-200">
                        {/* The "See More [Category]" Button as requested */}
                        <div className="text-center">
                          <button
                            type="button"
                            id="toggle-see-more-category-btn"
                            onClick={() => toggleCategoryExpanded(selectedCategory)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 text-xs sm:text-sm font-black shadow-md transition-all duration-200 active:scale-95 cursor-pointer hover:ring-4 hover:ring-amber-500/20"
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
                          <div className="space-y-3 pt-1 animate-in fade-in duration-300">
                            <div className="flex items-center gap-2 px-1">
                              <span className="text-xs font-black uppercase tracking-wider text-stone-400">
                                Additional {currentCategoryObj.name} Selection
                              </span>
                            </div>
                            <div
                              className={`grid gap-3 sm:gap-4 ${
                                gridColumns === 1
                                  ? 'grid-cols-1 max-w-xl mx-auto'
                                  : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-2'
                              }`}
                            >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-7 shadow-2xl border border-stone-200 my-4 sm:my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 sm:pb-4">
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Coffee at Yellow Hauz
                </span>
                <h3 className="text-base sm:text-xl font-bold text-stone-900 font-display">
                  Order Details &amp; Checkout
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="rounded-full p-1.5 sm:p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="mt-3.5 sm:mt-5 space-y-3 sm:space-y-4">
              {activeTableBinding || (orderType === 'dine_in' && selectedTable) ? (
                <div className="rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-amber-500/15 border border-amber-500/40 p-2.5 sm:p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-950 text-[11px] sm:text-xs">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>DINE-IN ORDER • TABLE #{activeTableBinding?.tableNumber || selectedTable}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl sm:rounded-2xl bg-stone-900 text-white p-3 sm:p-3.5 space-y-1 border border-stone-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px] sm:text-xs">
                      <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>ONLINE ORDER • ADVANCE BOOKING</span>
                    </div>
                    <span className="rounded-full bg-amber-500/20 text-amber-300 text-[9px] sm:text-[10px] font-bold px-2 py-0.5">
                      Scheduled
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-stone-300 leading-relaxed">
                    Configure your future arrival date, target time, and party size below so our team prepares your table and orders in advance.
                  </p>
                </div>
              )}

              {!activeTableBinding && (
                <>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Ordering Method
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderType('dine_in')}
                        className={`rounded-xl py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold border transition cursor-pointer ${
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
                        className={`rounded-xl py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold border transition cursor-pointer ${
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
                        className={`rounded-xl py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold border transition cursor-pointer ${
                          orderType === 'delivery'
                            ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        🛵 Delivery
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl sm:rounded-2xl border border-stone-200 bg-stone-50/80 p-2.5 sm:p-3.5 space-y-2.5 sm:space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-stone-900">
                      <Calendar className="h-3.5 w-3.5 text-amber-600" />
                      <span>
                        {orderType === 'dine_in'
                          ? 'Advance Table Booking Schedule'
                          : orderType === 'take_away'
                          ? 'Scheduled Pickup Time'
                          : 'Target Delivery Schedule'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] sm:text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                          Date
                        </label>
                        <input
                          type="date"
                          min={todayStr}
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          required
                          className="w-full rounded-xl border border-stone-300 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] sm:text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                          Arrival / Target Time
                        </label>
                        <input
                          type="time"
                          value={arrivalTime}
                          onChange={(e) => setArrivalTime(e.target.value)}
                          required
                          className="w-full rounded-xl border border-stone-300 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {orderType === 'dine_in' && (
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div>
                          <label className="block text-[9px] sm:text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                            Party Size (Guests)
                          </label>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-400" />
                            <select
                              value={partySize}
                              onChange={(e) => setPartySize(Number(e.target.value))}
                              className="w-full rounded-xl border border-stone-300 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
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
                          <label className="block text-[9px] sm:text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                            Seating Area
                          </label>
                          <select
                            value={seatingPreference}
                            onChange={(e) =>
                              setSeatingPreference(
                                e.target.value as 'indoor_main' | 'airconditioned' | 'outdoor_patio' | 'any'
                              )
                            }
                            className="w-full rounded-xl border border-stone-300 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
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
                      <label className="block text-[9px] sm:text-[10px] font-bold text-stone-600 uppercase mb-0.5">
                        Special Requests / Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        placeholder="e.g. High chair needed, anniversary setup, quiet corner"
                        className="w-full rounded-xl border border-stone-300 bg-white px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeCustomer ? (
                <div className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-amber-50/70 border border-amber-200/80 p-2.5 sm:p-3.5 text-[11px] sm:text-xs shadow-2xs">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <div className="grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold shrink-0">
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <div>
                      <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-amber-800 tracking-wider block">
                        Account Verified
                      </span>
                      <span className="font-bold text-stone-900 text-xs sm:text-sm">
                        {activeCustomer.fullName}
                      </span>
                    </div>
                  </div>
                  {activeCustomer.contactNumber && (
                    <span className="font-mono text-stone-700 text-[10px] sm:text-xs bg-white/90 px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl border border-stone-200 shadow-2xs">
                      {activeCustomer.contactNumber}
                    </span>
                  )}
                </div>
              ) : activeTableBinding || (orderType === 'dine_in' && selectedTable) ? (
                null
              ) : (
                <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Juan Dela Cruz"
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+63 912 345 6789"
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {orderType === 'delivery' && (
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="House/Unit, Street, Barangay, Davao City"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] sm:text-xs font-bold text-stone-700 uppercase tracking-wider mb-1 sm:mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`rounded-xl py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold border transition cursor-pointer ${
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
                    className={`rounded-xl py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold border transition cursor-pointer ${
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
                    className={`rounded-xl py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold border transition cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    💳 Card
                  </button>
                </div>
              </div>

              {!activeTableBinding && (
                <div className="rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200/90 p-2.5 sm:p-3 text-[11px] sm:text-xs text-amber-950 space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-700" />
                    <span>Advance Order Confirmation</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-amber-900/80 leading-relaxed">
                    Your reservation and advance order will be logged and verified on our POS system for arrival on {bookingDate} at {arrivalTime}.
                  </p>
                </div>
              )}

              <div className="rounded-xl sm:rounded-2xl bg-stone-50 p-3 sm:p-4 border border-stone-200 text-[11px] sm:text-xs space-y-1 sm:space-y-1.5">
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
                <div className="flex justify-between font-bold text-xs sm:text-sm text-stone-900 pt-1 sm:pt-1.5 border-t border-stone-200">
                  <span>Total Due:</span>
                  <span className="font-mono text-amber-700">₱{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition cursor-pointer shadow-2xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition active:scale-98 cursor-pointer"
                >
                  Confirm • ₱{totalAmount.toFixed(2)}
                </button>
              </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-2 sm:p-6 md:p-8 animate-in fade-in duration-200 overflow-y-auto"
          >
            <div
              id="insta-item-modal-container"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-stone-200/80 my-auto flex flex-col md:flex-row max-h-[92vh]"
            >
              {/* Top Close Button (Mobile & Desktop) */}
              <button
                type="button"
                onClick={() => setSelectedDetailItem(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-stone-900/70 backdrop-blur-md text-white hover:bg-stone-900 transition hover:scale-105 active:scale-95 cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>

              {/* LEFT / TOP: High-Res Square / Cinematic Photo Section with Badges, Actions, and Price */}
              <div className="relative w-full md:w-1/2 bg-stone-950 flex items-center justify-center overflow-hidden h-[220px] sm:h-[280px] md:h-auto md:min-h-[440px] shrink-0">
                <img
                  src={item.imageUrl || '/01_Hearts_Latte_Art.jpg'}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/01_Hearts_Latte_Art.jpg';
                  }}
                />

                {/* Subtle gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/40 pointer-events-none" />

                {/* Top Left Badges: Best Seller, Temperature & Stock */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-wrap items-center gap-1.5 z-10">
                  {item.isBestSeller && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-stone-950 shadow-md">
                      <Star className="h-3 w-3 fill-stone-950 text-stone-950" />
                      <span>Best Seller</span>
                    </span>
                  )}
                  {item.temperature && (
                    <span className="rounded-full bg-stone-900/85 backdrop-blur-md px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold text-white shadow-md capitalize">
                      {item.temperature}
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded-full bg-stone-900/85 backdrop-blur-md px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-bold text-emerald-400 shadow-md">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {item.quantity > 0 ? `In Stock (${item.quantity})` : 'Available'}
                  </span>
                </div>

                {/* Floating Bottom Left: Compact Price Pill */}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10 rounded-xl bg-stone-900/90 backdrop-blur-md px-3 py-1 sm:px-3.5 sm:py-1.5 text-white border border-white/10 shadow-lg">
                  <span className="font-mono text-sm sm:text-base font-black text-amber-400">
                    ₱{item.price.toFixed(2)}
                  </span>
                </div>

                {/* Floating Bottom Right: Like, Share, Bookmark Actions on Image */}
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 flex items-center gap-1 sm:gap-1.5 bg-stone-900/85 backdrop-blur-md px-2 py-1 rounded-xl border border-white/10 shadow-lg">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleItemLike(item.id, e)}
                    className="p-1 text-stone-300 hover:text-red-400 transition cursor-pointer active:scale-90"
                    title={isLiked ? 'Liked' : 'Like'}
                  >
                    <Heart
                      className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${
                        isLiked ? 'fill-red-500 text-red-500' : ''
                      }`}
                    />
                  </button>

                  {/* Share Button */}
                  <button
                    type="button"
                    onClick={(e) => handleShareItem(item, e)}
                    className="p-1 text-stone-300 hover:text-white transition cursor-pointer relative active:scale-90"
                    title="Share link"
                  >
                    <Share2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                    {isCopied && (
                      <span className="absolute -top-7 right-0 rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap animate-in fade-in zoom-in duration-150">
                        Copied!
                      </span>
                    )}
                  </button>

                  {/* Bookmark Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleItemSave(item.id, e)}
                    className="p-1 text-stone-300 hover:text-amber-400 transition cursor-pointer active:scale-90"
                    title={isSaved ? 'Saved to favorites' : 'Save to favorites'}
                  >
                    <Bookmark
                      className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${
                        isSaved ? 'fill-amber-500 text-amber-500' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* RIGHT: Editorial Body */}
              <div className="flex flex-1 flex-col justify-between p-4 sm:p-6 md:p-8 bg-white overflow-y-auto max-h-[50vh] md:max-h-[90vh]">
                <div className="space-y-3 sm:space-y-4">
                  {/* Title & Clean Description */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <h2 className="font-display text-lg sm:text-2xl md:text-3xl font-black text-stone-900 tracking-tight leading-snug">
                      {item.name}
                    </h2>

                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {item.description || 'Crafted with premium artisanal ingredients, freshly prepared in our cafe kitchen for an unforgettable taste.'}
                    </p>
                  </div>

                  {/* Optional Special Instructions in Modal */}
                  {inCartQty > 0 && (
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                        Special Instructions:
                      </label>
                      <input
                        type="text"
                        value={modalSpecialInstructions}
                        onChange={(e) => {
                          setModalSpecialInstructions(e.target.value);
                          handleUpdateItemInstructions(item.id, e.target.value);
                        }}
                        placeholder="e.g., Less sugar, extra ice, oat milk preference..."
                        className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-xs text-stone-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* MODAL FOOTER: Add to Bag or Quantity Stepper */}
                <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-stone-400 block">
                        Order Total
                      </span>
                      <span className="font-mono text-base sm:text-xl font-black text-stone-900">
                        ₱{((inCartQty > 0 ? inCartQty : 1) * item.price).toFixed(2)}
                      </span>
                    </div>

                    {inCartQty > 0 ? (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="flex items-center gap-1 sm:gap-2 rounded-xl bg-stone-100 p-1 sm:p-1.5 border border-stone-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-lg sm:rounded-xl bg-white text-stone-700 shadow-xs hover:bg-stone-200 transition active:scale-90 cursor-pointer"
                            title="Reduce quantity"
                          >
                            <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </button>
                          <span className="px-1.5 sm:px-3 font-mono text-xs sm:text-sm font-black text-stone-900">
                            {inCartQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-lg sm:rounded-xl bg-amber-500 text-stone-950 shadow-xs hover:bg-amber-400 transition active:scale-90 cursor-pointer"
                            title="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                          className="rounded-xl sm:rounded-2xl bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-2 sm:px-5 sm:py-3 text-[11px] sm:text-xs font-black shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1 sm:gap-1.5"
                        >
                          <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
                          <span>View Bag</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        id="modal-add-to-bag-button"
                        onClick={() => {
                          handleAddToCart(item);
                        }}
                        className={`inline-flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl px-4 py-2.5 sm:px-7 sm:py-3.5 text-xs sm:text-sm font-black transition-all duration-200 active:scale-95 cursor-pointer shadow-md ${
                          isJustAdded
                            ? 'bg-emerald-600 text-white scale-105'
                            : 'bg-amber-500 text-stone-950 hover:bg-amber-400 hover:shadow-amber-500/20'
                        }`}
                      >
                        {isJustAdded ? (
                          <>
                            <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" />
                            <span>Added to Bag!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.5]" />
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
