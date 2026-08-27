import React, { useState, useMemo, useEffect } from 'react';
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
}

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
}) => {
  const { showAlert } = useModal();
  const [categoryType, setCategoryType] = useState<'drinks' | 'food'>('drinks');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Internal fallback state if not provided from parent
  const [internalCart, setInternalCart] = useState<CartItem[]>([]);
  const [internalIsCartOpen, setInternalIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTableSelectorModalOpen, setIsTableSelectorModalOpen] = useState(false);

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

  const tables = useMemo(() => AppStore.getTables(), []);

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

  const currentCategoriesList = categoryType === 'drinks' ? drinkCategories : foodCategories;

  // Category Icon resolver matching design
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
    if (
      name.includes('drink add-on') ||
      name.includes('add-on') ||
      name.includes('addon') ||
      name.includes('plus')
    ) {
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

  // Filter items
  const filteredItems = useMemo(() => {
    const currentListIds = new Set(currentCategoriesList.map((c) => c.id));

    return menuItems.filter((item) => {
      if (!item.isAvailable) return false;

      // Filter by drink vs food category set if no explicit search is overriding
      if (!searchQuery.trim() && !currentListIds.has(item.categoryId)) {
        return false;
      }

      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, currentCategoriesList, selectedCategory, searchQuery]);

  // Cart operations
  const handleAddToCart = (item: MenuItem) => {
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

  // Submit Order with Unified Dual-Mode Engine
  const handlePlaceOrder = (e: React.FormEvent) => {
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

    if (!customerName.trim()) {
      showAlert({
        title: 'Name Required',
        message: 'Please enter your name to complete this order.',
        type: 'warning',
      });
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

    const orderItems = cart.map((ci) => ({
      menuItemId: ci.item.id,
      name: ci.item.name,
      quantity: ci.quantity,
      unitPrice: ci.item.price,
      totalPrice: ci.item.price * ci.quantity,
      specialInstructions: ci.specialInstructions,
      imageUrl: ci.item.imageUrl,
    }));

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
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
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

  const handleSelectTableFromModal = (tableNumber: number) => {
    if (onBindTable) {
      onBindTable(tableNumber);
    }
    setSelectedTable(tableNumber);
    setOrderType('dine_in');
    setIsTableSelectorModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            Freshly Prepared Daily
          </span>
          <h1 className="text-3xl font-extrabold text-stone-900 font-display">
            Yellow Hauz Menu
          </h1>
        </div>

        {/* Search & Cart Quick Button */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coffee, breakfast, mains..."
              className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleToggleCart}
            className="relative flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-xs sm:text-sm font-bold text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Bag</span>
            {totalItemCount > 0 && (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-stone-950 text-[10px] font-bold text-amber-400">
                {totalItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Layout: Vertical Categories on Left, Filter Bar & Menu Items on Right */}
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Left: Vertical Categories Sidebar */}
        <div className="w-full md:w-52 lg:w-56 shrink-0 rounded-3xl border border-stone-200 bg-stone-50/70 p-3 shadow-xs space-y-3">
          {/* Segmented Pill Toggle: Drinks vs Food */}
          <div className="grid grid-cols-2 rounded-full bg-white p-1 border border-stone-200 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setCategoryType('drinks');
                setSelectedCategory('all');
              }}
              className={`flex items-center justify-center gap-1.5 rounded-full py-2 px-3 text-xs font-black transition-all duration-150 ${
                categoryType === 'drinks'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Coffee className="h-4 w-4 shrink-0 stroke-[2.2]" />
              <span>Drinks</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCategoryType('food');
                setSelectedCategory('all');
              }}
              className={`flex items-center justify-center gap-1.5 rounded-full py-2 px-3 text-xs font-black transition-all duration-150 ${
                categoryType === 'food'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              <Utensils className="h-4 w-4 shrink-0 stroke-[2.2]" />
              <span>Food</span>
            </button>
          </div>

          {/* Vertical Category Buttons List */}
          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-0.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`w-full flex items-center gap-3 text-left rounded-full px-4 py-2.5 sm:py-3 text-xs font-black transition-all duration-150 border ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                  : 'bg-white text-stone-900 border-stone-200 hover:bg-stone-50 hover:border-stone-300 shadow-2xs active:scale-[0.98]'
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0 stroke-[2.2]" />
              <span className="truncate flex-1 tracking-tight font-black">
                All {categoryType === 'drinks' ? 'Drinks' : 'Food'}
              </span>
            </button>

            {currentCategoriesList.map((cat) => {
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center gap-3 text-left rounded-full px-4 py-2.5 sm:py-3 text-xs font-black transition-all duration-150 border ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                      : 'bg-white text-stone-900 border-stone-200 hover:bg-stone-50 hover:border-stone-300 shadow-2xs active:scale-[0.98]'
                  }`}
                >
                  <span className={isSelected ? 'text-stone-950' : 'text-stone-900'}>
                    {renderCategoryIcon(cat.name, categoryType === 'drinks', cat.icon)}
                  </span>
                  <span className="truncate flex-1 tracking-tight font-black">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Menu Grid */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Menu Grid */}
          {filteredItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center">
              <p className="font-display text-lg font-bold text-stone-800">No items match your filter</p>
              <p className="mt-1 text-xs text-stone-500">Try choosing another category or clearing your search.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-xs transition hover:shadow-md hover:border-amber-300"
                >
                  <div className="relative aspect-16/11 overflow-hidden bg-stone-100">
                    <img
                      src={item.imageUrl || '/images/latte.webp'}
                      alt={item.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/latte.webp';
                      }}
                    />
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                      {item.isBestSeller && (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold uppercase text-stone-950 shadow-xs">
                          Best Seller
                        </span>
                      )}
                      <span className="rounded-full bg-stone-900/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                        {item.temperature}
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 rounded-xl bg-stone-950/90 px-2.5 py-1 font-mono text-xs font-bold text-amber-400 shadow-xs">
                      ₱{item.price.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-bold text-stone-900 group-hover:text-amber-800 transition line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                      <span className="text-[10px] text-stone-400">
                        Stock: {item.quantity}
                      </span>
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 transition active:scale-95 shadow-xs cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Right-Side Cart Panel (No blur, no background overlay) */}
      <CustomerCartDrawer
        isOpen={isCartOpen}
        onToggle={handleToggleCart}
        onClose={handleCloseCart}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onUpdateItemInstructions={handleUpdateItemInstructions}
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

      {/* Live Table Request & Cashier Confirmation Modal */}
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

      {/* Checkout Modal (Dual-Mode Dynamic) */}
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
                onClick={() => setIsCheckoutOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="mt-5 space-y-4">
              {/* Dual-Mode Classification Card */}
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

              {/* If NOT bound to a live table: Show Order Type & Advance Booking Fields */}
              {!activeTableBinding && (
                <>
                  {/* Order Type Tabs for Online Ordering */}
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

                  {/* Advance Booking Parameters */}
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

              {/* Customer Contact */}
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

              {/* Payment Method */}
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

              {/* Notice */}
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

              {/* Order Summary Box */}
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
    </div>
  );
};
