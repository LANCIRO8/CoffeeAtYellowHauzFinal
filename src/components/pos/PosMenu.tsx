import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Category,
  MenuItem,
  CartItem,
  Order,
  OrderItem,
  User,
  Table,
  StoreSettings,
  Discount,
} from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import { DiscountModal } from './DiscountModal';
import { TableSelectModal } from './TableSelectModal';
import { SwipeableCartItem } from './SwipeableCartItem';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Percent,
  Check,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Flame,
  Snowflake,
  Sun,
  User as UserIcon,
  Printer,
  Sparkles,
  Layers,
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
  Delete,
  Ticket,
  Tag,
  Bell,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  PanelRightClose,
  PanelRightOpen,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  Square,
  Grid3X3,
  LayoutGrid,
} from 'lucide-react';

interface PosMenuProps {
  categories: Category[];
  menuItems: MenuItem[];
  settings: StoreSettings;
  activeStaff: User;
  onOrderComplete: (order: Order) => void;
}

export const PosMenu: React.FC<PosMenuProps> = ({
  categories,
  menuItems,
  settings,
  activeStaff,
  onOrderComplete,
}) => {
  const { showAlert, showConfirm } = useModal();
  const [categoryType, setCategoryType] = useState<'drinks' | 'food'>('drinks');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>(9);
  const [filterMode, setFilterMode] = useState<'all' | 'bestsellers'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Collapsible States
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);

  // Grid column view mode: 1, 2, 3, 4, or 5 columns (persisted in localStorage)
  const [gridColumns, setGridColumns] = useState<1 | 2 | 3 | 4 | 5>(() => {
    try {
      const saved = localStorage.getItem('yh_pos_grid_columns');
      if (saved === '1') return 1;
      if (saved === '2') return 2;
      if (saved === '3') return 3;
      if (saved === '4') return 4;
      if (saved === '5') return 5;
      return 3;
    } catch {
      return 3;
    }
  });

  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const gridModalRef = useRef<HTMLDivElement>(null);

  const handleSetGridColumns = (cols: 1 | 2 | 3 | 4 | 5) => {
    setGridColumns(cols);
    try {
      localStorage.setItem('yh_pos_grid_columns', String(cols));
    } catch (e) {
      console.error(e);
    }
    setIsGridModalOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
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

  const [isTicketSidebarOpen, setIsTicketSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yellowhauz_pos_ticket_collapsed');
      if (saved !== null) {
        return saved !== 'true'; // if collapsed is true, open is false
      }
      // If no saved preference: default open on desktop (>=1024px), closed on mobile
      if (typeof window !== 'undefined') {
        return window.innerWidth >= 1024;
      }
      return true;
    } catch {
      return true;
    }
  });

  // Sync ticket sidebar collapse state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('yellowhauz_pos_ticket_collapsed', String(!isTicketSidebarOpen));
    } catch {
      // ignore
    }
  }, [isTicketSidebarOpen]);

  // Order Details State
  const [orderType, setOrderType] = useState<'dine_in' | 'take_away' | 'delivery'>('dine_in');
  const [selectedTable, setSelectedTable] = useState<number | ''>('');
  const [customerName, setCustomerName] = useState('');

  // Item-Level Discount & Coupon State
  const [seniorPwdIdNumber, setSeniorPwdIdNumber] = useState<string>('');
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountTargetCartId, setDiscountTargetCartId] = useState<string | null>(null);
  const [isItemSelectModalOpen, setIsItemSelectModalOpen] = useState(false);

  // Payment Tender Modal
  const [isTenderModalOpen, setIsTenderModalOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'card'>('cash');
  const [amountPaidInput, setAmountPaidInput] = useState('');

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
      icon.includes('cup') ||
      icon.includes('glass') ||
      icon.includes('water') ||
      icon.includes('soda') ||
      icon.includes('milk') ||
      icon.includes('citrus') ||
      icon.includes('leaf') ||
      n.includes('coffee') ||
      n.includes('drink') ||
      n.includes('tea') ||
      n.includes('shake') ||
      n.includes('rocks') ||
      n.includes('refresher') ||
      n.includes('beverage') ||
      n.includes('juice') ||
      n.includes('smoothie') ||
      n.includes('frappe') ||
      n.includes('brew') ||
      n.includes('soda')
    );
  };

  const foodCategories = useMemo(() => {
    return categories.filter((c) => !isDrinkCategory(c));
  }, [categories]);

  const drinkCategories = useMemo(() => {
    return categories.filter((c) => isDrinkCategory(c));
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

  // Filter Items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (!item.isAvailable) return false;
      
      if (selectedCategory !== 'all') {
        if (item.categoryId !== selectedCategory) return false;
      } else {
        const cat = categories.find((c) => c.id === item.categoryId);
        if (cat) {
          const isDrink = isDrinkCategory(cat);
          if (categoryType === 'drinks' && !isDrink) return false;
          if (categoryType === 'food' && isDrink) return false;
        }
      }

      if (filterMode === 'bestsellers' && !item.isBestSeller) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, categories, selectedCategory, categoryType, filterMode, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if ((item.quantity ?? 0) <= 0) {
      showAlert({
        title: 'Item Out of Stock',
        message: `${item.name} is currently out of stock. Please restock it via Inventory management.`,
        type: 'warning',
      });
      return;
    }

    // Check total quantity of this menu item across all cart items (discounted and undiscounted)
    const totalInCart = cart
      .filter((ci) => ci.item.id === item.id)
      .reduce((sum, ci) => sum + ci.quantity, 0);

    if (totalInCart >= (item.quantity ?? 0)) {
      showAlert({
        title: 'Stock Limit Reached',
        message: `Only ${item.quantity} units of ${item.name} are available in stock.`,
        type: 'warning',
      });
      return;
    }

    setCart((prev) => {
      // Look for an existing cart line for this item that has NO discount applied.
      // If found, increment its quantity.
      // If all existing lines have discounts applied, or no line exists, create a new separate line item!
      const undiscountedIdx = prev.findIndex(
        (ci) => ci.item.id === item.id && !ci.discount
      );

      if (undiscountedIdx !== -1) {
        const next = [...prev];
        next[undiscountedIdx] = {
          ...next[undiscountedIdx],
          quantity: next[undiscountedIdx].quantity + 1,
        };
        return next;
      }

      const newCartItemId = `ci-${item.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      return [
        ...prev,
        {
          id: newCartItemId,
          cartItemId: newCartItemId,
          item,
          quantity: 1,
          discount: null,
        },
      ];
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    const target = cart.find((ci) => (ci.cartItemId || ci.id) === cartItemId);
    if (!target) return;

    if (delta > 0) {
      const menuItem = menuItems.find((i) => i.id === target.item.id);
      const totalInCart = cart
        .filter((ci) => ci.item.id === target.item.id)
        .reduce((sum, ci) => sum + ci.quantity, 0);

      if (menuItem && totalInCart + delta > (menuItem.quantity ?? 0)) {
        showAlert({
          title: 'Insufficient Inventory',
          message: `Only ${menuItem.quantity} units available in stock.`,
          type: 'warning',
        });
        return;
      }

      // If this item already has a discount applied, adding another same item should be separated!
      if (target.discount) {
        addToCart(target.item);
        return;
      }
    }

    setCart((prev) =>
      prev
        .map((ci) => {
          const lineId = ci.cartItemId || ci.id;
          if (lineId === cartItemId) {
            const nextQty = ci.quantity + delta;
            return nextQty > 0 ? { ...ci, quantity: nextQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (cartItemId: string) => {
    setCart((prev) =>
      prev.filter((ci) => (ci.cartItemId || ci.id) !== cartItemId)
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscountTargetCartId(null);
    setSeniorPwdIdNumber('');
    setAmountPaidInput('');
  };

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, ci) => acc + ci.item.price * ci.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return cart.reduce((acc, ci) => {
      if (!ci.discount) return acc;
      const itemSubtotal = ci.item.price * ci.quantity;
      if (ci.discount.type === 'percent') {
        return acc + (itemSubtotal * ci.discount.value) / 100;
      }
      return acc + Math.min(itemSubtotal, ci.discount.value);
    }, 0);
  }, [cart]);

  const discountedItems = useMemo(() => cart.filter((ci) => Boolean(ci.discount)), [cart]);

  const discountPercent = useMemo(() => {
    if (discountedItems.length === 1 && discountedItems[0].discount?.type === 'percent') {
      return discountedItems[0].discount.value;
    }
    return subtotal > 0 ? Math.round((discountAmount / subtotal) * 100) : 0;
  }, [discountedItems, subtotal, discountAmount]);

  const discountTargetItem = useMemo(() => {
    if (!discountTargetCartId) return null;
    return cart.find((ci) => (ci.cartItemId || ci.id) === discountTargetCartId) || null;
  }, [cart, discountTargetCartId]);

  const openItemDiscountModal = (ci: CartItem) => {
    const targetId = ci.cartItemId || ci.id || `ci-${ci.item.id}`;
    setDiscountTargetCartId(targetId);
    setIsDiscountModalOpen(true);
  };

  const handleApplyDiscountToItem = (targetCartId: string, disc: Discount, idNum?: string) => {
    setCart((prev) =>
      prev.map((ci) => {
        const lineId = ci.cartItemId || ci.id;
        if (lineId === targetCartId) {
          return {
            ...ci,
            discount: disc,
            discountIdNumber: idNum || ci.discountIdNumber,
          };
        }
        return ci;
      })
    );
    if (idNum) {
      setSeniorPwdIdNumber(idNum);
    }
    setIsDiscountModalOpen(false);
    setDiscountTargetCartId(null);
  };

  const handleRemoveDiscountFromItem = (targetCartId: string) => {
    setCart((prev) =>
      prev.map((ci) => {
        const lineId = ci.cartItemId || ci.id;
        if (lineId === targetCartId) {
          return {
            ...ci,
            discount: null,
            discountIdNumber: undefined,
          };
        }
        return ci;
      })
    );
    setIsDiscountModalOpen(false);
    setDiscountTargetCartId(null);
  };

  const handleClearAllDiscounts = () => {
    setCart((prev) =>
      prev.map((ci) => ({
        ...ci,
        discount: null,
        discountIdNumber: undefined,
      }))
    );
    setSeniorPwdIdNumber('');
  };

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = settings.tax_rate;
  const taxAmount = (taxableAmount * taxRate) / 100;
  const totalAmount = taxableAmount + taxAmount;

  const tenderedNumber = Number(amountPaidInput) || 0;
  const changeAmount = Math.max(0, tenderedNumber - totalAmount);

  const handleAddPredeterminedAmount = (bill: number) => {
    const currentNum = parseFloat(amountPaidInput) || 0;
    // If the input currently matches the exact default totalAmount, replace with the first tapped bill
    if (amountPaidInput === totalAmount.toFixed(2) && totalAmount !== bill) {
      setAmountPaidInput(String(bill));
      return;
    }
    const nextVal = currentNum + bill;
    setAmountPaidInput(Number.isInteger(nextVal) ? String(nextVal) : nextVal.toFixed(2));
  };

  const handleNumpadInput = (key: string) => {
    if (key === 'CLEAR') {
      setAmountPaidInput('');
      return;
    }
    if (key === 'BACKSPACE') {
      setAmountPaidInput((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'EXACT') {
      setAmountPaidInput(totalAmount.toFixed(2));
      return;
    }

    setAmountPaidInput((prev) => {
      // If input was exact default from opening tender and user starts typing fresh on numpad
      if (prev === totalAmount.toFixed(2) && totalAmount !== 0) {
        if (key === '.') return '0.';
        if (key === '00') return '0';
        return key;
      }
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev ? `${prev}.` : '0.';
      }
      if (key === '00') {
        if (!prev || prev === '0') return '0';
        return prev + '00';
      }
      if (prev === '0') return key;
      return prev + key;
    });
  };

  const openTender = () => {
    if (cart.length === 0) return;
    if (orderType === 'dine_in' && !selectedTable) {
      setIsTableModalOpen(true);
      return;
    }
    setAmountPaidInput(totalAmount.toFixed(2));
    setIsTenderModalOpen(true);
  };

  const handleProcessOrder = async () => {
    if (paymentMethod === 'cash' && tenderedNumber < totalAmount) {
      showAlert({
        title: 'Insufficient Payment',
        message: `Tendered cash (₱${tenderedNumber.toFixed(2)}) is less than total amount due (₱${totalAmount.toFixed(2)}).`,
        type: 'error',
      });
      return;
    }

    const totalItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0);
    const paymentLabel = paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'gcash' ? 'GCash' : 'Card';
    const diningLabel = orderType === 'dine_in' && selectedTable
      ? `Dine-In (Table #${selectedTable})`
      : orderType === 'take_away'
      ? 'Takeaway / Pick-up'
      : 'Delivery';

    const tenderConfirmMsg = `Please review and confirm this sale before completing tender:\n\n• Order Total: ₱${totalAmount.toFixed(2)}\n• Method: ${paymentLabel}\n• Amount Tendered: ₱${(paymentMethod === 'cash' ? tenderedNumber : totalAmount).toFixed(2)}\n${paymentMethod === 'cash' ? `• Change Due: ₱${changeAmount.toFixed(2)}\n` : ''}• Dining Option: ${diningLabel}\n• Total Items: ${totalItemCount} item(s)\n\nFinalize transaction and print kitchen ticket?`;

    const isConfirmed = await showConfirm({
      title: 'Confirm Order',
      message: tenderConfirmMsg,
      type: 'info',
      confirmText: 'Confirm',
      cancelText: 'Back',
    });

    if (!isConfirmed) {
      return;
    }

    const orderItems: OrderItem[] = cart.map((ci) => {
      const itemSubtotal = ci.item.price * ci.quantity;
      let itemDiscountAmount = 0;
      if (ci.discount) {
        if (ci.discount.type === 'percent') {
          itemDiscountAmount = (itemSubtotal * ci.discount.value) / 100;
        } else {
          itemDiscountAmount = Math.min(itemSubtotal, ci.discount.value);
        }
      }
      return {
        menuItemId: ci.item.id,
        name: ci.item.name,
        quantity: ci.quantity,
        unitPrice: ci.item.price,
        totalPrice: Math.max(0, itemSubtotal - itemDiscountAmount),
        specialInstructions: ci.specialInstructions,
        imageUrl: ci.item.imageUrl,
        discount: ci.discount
          ? {
              discountId: ci.discount.id,
              discountName: ci.discount.name,
              discountType: ci.discount.type,
              discountValue: ci.discount.value,
              discountAmount: itemDiscountAmount,
            }
          : undefined,
      };
    });

    const primaryDiscount = discountedItems[0]?.discount;
    const discountType =
      discountedItems.length > 0
        ? primaryDiscount?.isSystem
          ? primaryDiscount.id
          : 'item_discounts'
        : 'none';

    const newOrder = AppStore.createOrder({
      channel: 'in_store',
      tableId: orderType === 'dine_in' && selectedTable ? Number(selectedTable) : null,
      tableNumber: orderType === 'dine_in' && selectedTable ? Number(selectedTable) : null,
      customerId: null,
      customerName: customerName.trim()
        ? (seniorPwdIdNumber ? `${customerName.trim()} [ID: ${seniorPwdIdNumber}]` : customerName.trim())
        : (seniorPwdIdNumber ? `Walk-in Guest [ID: ${seniorPwdIdNumber}]` : 'Walk-in Guest'),
      orderType,
      paymentMethod,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      discountAmount,
      discountType,
      discountPercent,
      amountPaid: paymentMethod === 'cash' ? tenderedNumber : totalAmount,
      changeAmount: paymentMethod === 'cash' ? changeAmount : 0,
      status: 'to_prep',
      cashierId: activeStaff?.id ?? 2,
      cashierName: activeStaff?.fullName || activeStaff?.name || 'Staff Member',
      items: orderItems,
    });

    clearCart();
    setIsTenderModalOpen(false);
    onOrderComplete(newOrder);
  };

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-140px)] lg:min-h-[600px] gap-4 relative pb-20 lg:pb-0 transition-all duration-300">
      {/* Left: Product Catalog with Vertical Categories */}
      <div className="flex-1 min-w-0 flex flex-col lg:flex-row rounded-3xl border border-stone-200 bg-white shadow-xs overflow-hidden transition-all duration-300">
        {/* Desktop Vertical Category Sidebar */}
        <div className="hidden lg:flex w-40 lg:w-44 shrink-0 border-r border-stone-200/90 bg-stone-50/70 flex-col h-full">
          {/* Segmented Pill Toggle: Drinks vs Food */}
          <div className="p-2 pb-1.5">
            <div className="grid grid-cols-2 rounded-full bg-white p-0.5 border border-stone-200 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setCategoryType('drinks');
                  const firstDrink = drinkCategories[0];
                  if (firstDrink) {
                    setSelectedCategory(firstDrink.id);
                  }
                }}
                className={`flex items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-black transition-all duration-150 ${
                  categoryType === 'drinks'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Coffee className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                <span>Drinks</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryType('food');
                  const firstFood = foodCategories[0];
                  if (firstFood) {
                    setSelectedCategory(firstFood.id);
                  }
                }}
                className={`flex items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-black transition-all duration-150 ${
                  categoryType === 'food'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Utensils className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                <span>Food</span>
              </button>
            </div>
          </div>

          {/* Vertical Category Buttons List */}
          <div className="flex-1 overflow-y-auto p-2 pt-1 space-y-1.5">
            {currentCategoriesList.map((cat) => {
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full flex items-center gap-2 text-left rounded-full px-3 py-2 text-xs font-black transition-all duration-150 border ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                      : 'bg-white text-stone-900 border-stone-200 hover:bg-stone-50 hover:border-stone-300 shadow-2xs active:scale-[0.98]'
                  }`}
                >
                  <span className={isSelected ? 'text-stone-950' : 'text-stone-900'}>
                    {renderCategoryIcon(cat.name, categoryType === 'drinks', cat.icon)}
                  </span>
                  <span className="truncate flex-1 tracking-tight font-black text-[11px]">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Collapsible Categories Header & Drawer */}
        <div className="lg:hidden border-b border-stone-200 bg-stone-50/90 p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-2">
            {/* Drinks / Food pill toggle on mobile */}
            <div className="grid grid-cols-2 rounded-full bg-white p-0.5 border border-stone-200 shadow-2xs shrink-0 w-36 sm:w-40">
              <button
                type="button"
                onClick={() => {
                  setCategoryType('drinks');
                  const firstDrink = drinkCategories[0];
                  if (firstDrink) setSelectedCategory(firstDrink.id);
                }}
                className={`flex items-center justify-center gap-1 rounded-full py-1 text-[11px] font-black transition-all ${
                  categoryType === 'drinks'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Coffee className="h-3 w-3 shrink-0 stroke-[2.2]" />
                <span>Drinks</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCategoryType('food');
                  const firstFood = foodCategories[0];
                  if (firstFood) setSelectedCategory(firstFood.id);
                }}
                className={`flex items-center justify-center gap-1 rounded-full py-1 text-[11px] font-black transition-all ${
                  categoryType === 'food'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Utensils className="h-3 w-3 shrink-0 stroke-[2.2]" />
                <span>Food</span>
              </button>
            </div>

            {/* Mobile Category Collapsible Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileCategoriesOpen(!isMobileCategoriesOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-950 shadow-2xs transition shrink-0"
            >
              <span className="text-amber-800">
                {renderCategoryIcon(
                  categories.find((c) => c.id === selectedCategory)?.name || '',
                  categoryType === 'drinks',
                  categories.find((c) => c.id === selectedCategory)?.icon
                )}
              </span>
              <span className="truncate max-w-[120px] text-xs font-black text-amber-950">
                {selectedCategory === 'all'
                  ? `All ${categoryType}`
                  : categories.find((c) => c.id === selectedCategory)?.name || 'Categories'}
              </span>
              {isMobileCategoriesOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-amber-800" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-amber-800" />
              )}
            </button>
          </div>

          {/* Expanded Mobile Categories Grid */}
          {isMobileCategoriesOpen && (
            <div className="mt-2.5 pt-2.5 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {currentCategoriesList.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setIsMobileCategoriesOpen(false);
                    }}
                    className={`flex items-center gap-2 text-left rounded-xl px-2.5 py-2 text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                        : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50 shadow-2xs'
                    }`}
                  >
                    <span>{renderCategoryIcon(cat.name, categoryType === 'drinks', cat.icon)}</span>
                    <span className="truncate flex-1 text-[11px] font-black">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Area: Search, Temperature Filters & Menu Items Grid */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden min-w-0 relative">
          {/* Floating Bottom-Right Ticket Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setIsTicketSidebarOpen(!isTicketSidebarOpen)}
            className={`fixed sm:absolute bottom-20 right-4 sm:bottom-6 sm:right-6 z-45 flex items-center gap-2 rounded-full border px-4 py-3 text-xs sm:text-sm font-extrabold transition-all shadow-xl backdrop-blur-md cursor-pointer active:scale-95 hover:scale-105 ${
              isTicketSidebarOpen
                ? 'border-stone-300 bg-white/95 text-stone-800 hover:bg-stone-100 shadow-stone-900/10'
                : 'border-amber-400 bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-amber-500/40 ring-4 ring-amber-500/20'
            }`}
            title={isTicketSidebarOpen ? 'Collapse Ticket Sidebar' : 'Expand Ticket Sidebar'}
          >
            {isTicketSidebarOpen ? (
              <>
                <PanelRightClose className="h-4 w-4 sm:h-5 sm:w-5 text-stone-700" />
                <span className="text-stone-800 font-bold">Hide Ticket</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="h-4 w-4 sm:h-5 sm:w-5 text-stone-950" />
                <span className="font-black text-stone-950 tracking-wide">View Ticket</span>
                {cart.length > 0 && (
                  <span className="ml-1 rounded-full bg-stone-950 text-amber-400 text-xs px-2 py-0.5 font-black shadow-xs animate-pulse">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </>
            )}
          </button>

          {/* Search & Best Sellers Filters */}
          <div className="pb-2.5 sm:pb-3 border-b border-stone-100">
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Mobile Search Icon Toggle (collapsed on small screens when empty) */}
              {!isMobileSearchOpen && !searchQuery && (
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="sm:hidden flex items-center justify-center h-8 w-8 rounded-xl border border-stone-200 bg-stone-50 text-stone-600 hover:text-stone-900 shadow-2xs active:scale-95 cursor-pointer shrink-0"
                  title="Search menu items"
                >
                  <Search className="h-4 w-4" />
                </button>
              )}

              {/* Single Unified Search Bar: Always visible on desktop (sm+), expandable on mobile */}
              <div
                className={`relative flex-1 min-w-0 ${
                  isMobileSearchOpen || searchQuery ? 'block' : 'hidden sm:block'
                }`}
              >
                <Search className="absolute left-2.5 sm:left-3 top-2 sm:top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  autoFocus={isMobileSearchOpen}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition-colors"
                />
                {(searchQuery || isMobileSearchOpen) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsMobileSearchOpen(false);
                    }}
                    className="absolute right-2 top-2 sm:top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer p-0.5 rounded-md hover:bg-stone-200/60 transition"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Grid Layout Filter Button */}
                <div className="relative" ref={gridModalRef}>
                  <button
                    type="button"
                    id="pos-grid-layout-filter-btn"
                    onClick={() => setIsGridModalOpen((prev) => !prev)}
                    title="Change Catalog Grid Columns (1 to 5)"
                    className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-xl border transition active:scale-95 cursor-pointer shadow-2xs font-bold text-xs ${
                      isGridModalOpen
                        ? 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950'
                    }`}
                  >
                    {gridColumns === 1 ? (
                      <Square className="h-3.5 w-3.5 text-amber-600 stroke-[2.2]" />
                    ) : gridColumns === 2 ? (
                      <Grid2X2 className="h-3.5 w-3.5 text-amber-600 stroke-[2.2]" />
                    ) : (
                      <Grid3X3 className="h-3.5 w-3.5 text-amber-600 stroke-[2.2]" />
                    )}
                    <span className="font-extrabold text-[11px] hidden sm:inline">
                      {gridColumns} Col
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>

                  {/* Grid Layout Filter Modal on Mobile / Dropdown on Desktop */}
                  {isGridModalOpen && (
                    <div
                      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-end p-4 sm:p-0 bg-stone-950/50 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none sm:absolute sm:inset-auto sm:right-0 sm:top-10 sm:top-11"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          setIsGridModalOpen(false);
                        }
                      }}
                    >
                      <div
                        id="pos-grid-layout-filter-modal"
                        className="w-full max-w-sm sm:w-80 rounded-3xl sm:rounded-2xl border border-stone-200 bg-white p-5 sm:p-3.5 shadow-2xl sm:shadow-xl animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 font-sans"
                      >
                        <div className="flex items-center justify-between pb-3 sm:pb-2.5 border-b border-stone-100 mb-3.5 sm:mb-3">
                          <div className="flex items-center gap-2 sm:gap-1.5 font-black text-sm sm:text-xs text-stone-900">
                            <LayoutGrid className="h-4 w-4 text-amber-600" />
                            <span>POS Menu Layout (1–5 Columns)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsGridModalOpen(false)}
                            className="p-1.5 sm:p-1 rounded-xl sm:rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                          >
                            <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                          </button>
                        </div>

                        <div className="text-xs sm:text-[11px] text-stone-500 mb-3.5 sm:mb-2.5 font-medium">
                          Select catalog density for mobile, tablet, and PC:
                        </div>

                        <div className="grid grid-cols-5 gap-1.5 sm:gap-1">
                          {/* 1 Column Option */}
                          <button
                            type="button"
                            id="pos-grid-col-1-btn"
                            onClick={() => handleSetGridColumns(1)}
                            className={`flex flex-col items-center justify-center gap-1.5 sm:gap-1 p-2.5 sm:p-2 rounded-2xl sm:rounded-xl border text-center transition cursor-pointer ${
                              gridColumns === 1
                                ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                            }`}
                          >
                            <div className="grid h-7 w-7 sm:h-6 sm:w-6 place-items-center rounded-xl sm:rounded-lg bg-white border border-stone-200 shadow-2xs text-amber-700">
                              <Square className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            </div>
                            <div className="text-xs sm:text-[11px] font-bold leading-none">1 Col</div>
                            {gridColumns === 1 && (
                              <span className="flex items-center gap-0.5 text-[9px] sm:text-[8px] font-black text-amber-700">
                                <Check className="h-2.5 w-2.5 sm:h-2 sm:w-2 stroke-[3]" />
                              </span>
                            )}
                          </button>

                          {/* 2 Column Option */}
                          <button
                            type="button"
                            id="pos-grid-col-2-btn"
                            onClick={() => handleSetGridColumns(2)}
                            className={`flex flex-col items-center justify-center gap-1.5 sm:gap-1 p-2.5 sm:p-2 rounded-2xl sm:rounded-xl border text-center transition cursor-pointer ${
                              gridColumns === 2
                                ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                            }`}
                          >
                            <div className="grid h-7 w-7 sm:h-6 sm:w-6 place-items-center rounded-xl sm:rounded-lg bg-white border border-stone-200 shadow-2xs text-amber-700">
                              <Grid2X2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            </div>
                            <div className="text-xs sm:text-[11px] font-bold leading-none">2 Cols</div>
                            {gridColumns === 2 && (
                              <span className="flex items-center gap-0.5 text-[9px] sm:text-[8px] font-black text-amber-700">
                                <Check className="h-2.5 w-2.5 sm:h-2 sm:w-2 stroke-[3]" />
                              </span>
                            )}
                          </button>

                          {/* 3 Column Option */}
                          <button
                            type="button"
                            id="pos-grid-col-3-btn"
                            onClick={() => handleSetGridColumns(3)}
                            className={`flex flex-col items-center justify-center gap-1.5 sm:gap-1 p-2.5 sm:p-2 rounded-2xl sm:rounded-xl border text-center transition cursor-pointer ${
                              gridColumns === 3
                                ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                            }`}
                          >
                            <div className="grid h-7 w-7 sm:h-6 sm:w-6 place-items-center rounded-xl sm:rounded-lg bg-white border border-stone-200 shadow-2xs text-amber-700">
                              <Grid3X3 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            </div>
                            <div className="text-xs sm:text-[11px] font-bold leading-none">3 Cols</div>
                            {gridColumns === 3 && (
                              <span className="flex items-center gap-0.5 text-[9px] sm:text-[8px] font-black text-amber-700">
                                <Check className="h-2.5 w-2.5 sm:h-2 sm:w-2 stroke-[3]" />
                              </span>
                            )}
                          </button>

                          {/* 4 Column Option */}
                          <button
                            type="button"
                            id="pos-grid-col-4-btn"
                            onClick={() => handleSetGridColumns(4)}
                            className={`flex flex-col items-center justify-center gap-1.5 sm:gap-1 p-2.5 sm:p-2 rounded-2xl sm:rounded-xl border text-center transition cursor-pointer ${
                              gridColumns === 4
                                ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                            }`}
                          >
                            <div className="grid h-7 w-7 sm:h-6 sm:w-6 place-items-center rounded-xl sm:rounded-lg bg-white border border-stone-200 shadow-2xs text-amber-700">
                              <LayoutGrid className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            </div>
                            <div className="text-xs sm:text-[11px] font-bold leading-none">4 Cols</div>
                            {gridColumns === 4 && (
                              <span className="flex items-center gap-0.5 text-[9px] sm:text-[8px] font-black text-amber-700">
                                <Check className="h-2.5 w-2.5 sm:h-2 sm:w-2 stroke-[3]" />
                              </span>
                            )}
                          </button>

                          {/* 5 Column Option */}
                          <button
                            type="button"
                            id="pos-grid-col-5-btn"
                            onClick={() => handleSetGridColumns(5)}
                            className={`flex flex-col items-center justify-center gap-1.5 sm:gap-1 p-2.5 sm:p-2 rounded-2xl sm:rounded-xl border text-center transition cursor-pointer ${
                              gridColumns === 5
                                ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                                : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                            }`}
                          >
                            <div className="grid h-7 w-7 sm:h-6 sm:w-6 place-items-center rounded-xl sm:rounded-lg bg-white border border-stone-200 shadow-2xs text-amber-700 font-black text-[11px] sm:text-[10px]">
                              5C
                            </div>
                            <div className="text-xs sm:text-[11px] font-bold leading-none">5 Cols</div>
                            {gridColumns === 5 && (
                              <span className="flex items-center gap-0.5 text-[9px] sm:text-[8px] font-black text-amber-700">
                                <Check className="h-2.5 w-2.5 sm:h-2 sm:w-2 stroke-[3]" />
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 sm:px-3 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('bestsellers')}
                    className={`px-2.5 sm:px-3 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                      filterMode === 'bestsellers'
                        ? 'bg-amber-500 text-stone-950 font-extrabold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Sparkles className={`h-3 w-3 ${filterMode === 'bestsellers' ? 'text-stone-950' : 'text-amber-500'}`} />
                    <span>Best Sellers</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pt-3 pr-1 min-h-[300px] lg:min-h-0">
            {filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 text-xs">
                <Sparkles className="h-8 w-8 text-stone-300 mb-2" />
                <p className="font-bold text-stone-600">No menu items found</p>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Try selecting another category or clearing your search.
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-2.5 sm:gap-3 ${
                  gridColumns === 1
                    ? 'grid-cols-1 max-w-xl mx-auto'
                    : gridColumns === 2
                    ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-2'
                    : gridColumns === 3
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3'
                    : gridColumns === 4
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4'
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5'
                }`}
              >
                {filteredItems.map((item) => {
                  const isOutOfStock = (item.quantity ?? 0) <= 0;
                  const isLowStock = !isOutOfStock && (item.quantity ?? 0) <= 5;

                  return (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className={`group flex flex-col justify-between text-left rounded-2xl border bg-white p-2 sm:p-2.5 shadow-2xs transition active:scale-95 cursor-pointer ${
                        isOutOfStock
                          ? 'border-rose-200 bg-rose-50/20 opacity-75 hover:border-rose-400'
                          : isLowStock
                          ? 'border-amber-300 hover:border-amber-500 hover:shadow-md'
                          : 'border-stone-200 hover:border-amber-400 hover:shadow-md'
                      }`}
                    >
                      <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-stone-100 mb-1.5 sm:mb-2">
                        <img
                          src={item.imageUrl || '/images/latte.webp'}
                          alt={item.name}
                          className={`h-full w-full object-cover group-hover:scale-105 transition duration-200 ${
                            isOutOfStock ? 'grayscale opacity-60' : ''
                          }`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/latte.webp';
                          }}
                        />

                        {/* Stock status indicator pill */}
                        {isOutOfStock ? (
                          <span className="absolute top-1.5 left-1.5 rounded-md bg-rose-600 px-1.5 py-0.5 font-bold text-[9px] text-white uppercase shadow-xs">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="absolute top-1.5 left-1.5 rounded-md bg-amber-500 px-1.5 py-0.5 font-extrabold text-[9px] text-stone-950 shadow-xs flex items-center gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {item.quantity} left
                          </span>
                        ) : null}

                        <span className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 rounded-lg bg-stone-950/90 backdrop-blur-xs px-1.5 sm:px-2 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold text-amber-400">
                          ₱{item.price.toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-stone-900 line-clamp-1 group-hover:text-amber-800">
                          {item.name}
                        </h4>
                        <div className="mt-0.5 flex items-center justify-between text-[10px] text-stone-500">
                          <span className="capitalize">{item.temperature}</span>
                          {isOutOfStock ? (
                            <span className="font-bold text-rose-600">Out of Stock</span>
                          ) : isLowStock ? (
                            <span className="font-bold text-amber-700">Low: {item.quantity}</span>
                          ) : (
                            <span>Qty: {item.quantity}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsed Docked Rail on Desktop (when ticket sidebar is hidden) */}
      {!isTicketSidebarOpen && (
        <aside
          onClick={() => setIsTicketSidebarOpen(true)}
          className="hidden lg:flex w-14 shrink-0 rounded-3xl border border-stone-200 bg-white p-2 flex-col items-center justify-between shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group select-none"
          title="Click to open Ticket Sidebar"
        >
          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 group-hover:bg-amber-500 group-hover:text-stone-950 group-hover:border-amber-500 transition shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4 stroke-[2.5]" />
            </button>
            {cart.length > 0 && (
              <span className="rounded-full bg-amber-500 text-stone-950 text-[10px] font-black px-2 py-0.5 shadow-2xs">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>

          {/* Vertical Rotated Text */}
          <div className="py-6 flex items-center justify-center">
            <span className="text-[11px] font-black uppercase tracking-widest text-stone-500 group-hover:text-stone-900 transition [writing-mode:vertical-rl] rotate-180">
              Current Ticket
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 pb-2">
            {cart.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openTender();
                }}
                title="Tender Payment"
                className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-stone-950 font-black shadow-md hover:bg-amber-400 transition active:scale-95"
              >
                <Banknote className="h-5 w-5" />
              </button>
            ) : (
              <div className="h-8 w-8 rounded-full bg-stone-100 grid place-items-center text-stone-400">
                <ShoppingCart className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Mobile Backdrop for Slide-over Drawer */}
      {isTicketSidebarOpen && (
        <div
          onClick={() => setIsTicketSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Right: Active Ticket Sidebar / Cart & Payment */}
      <aside
        className={`${
          isTicketSidebarOpen ? 'flex' : 'hidden'
        } fixed inset-y-0 right-0 z-50 w-full sm:max-w-md lg:static lg:z-auto lg:w-[380px] xl:w-[420px] shrink-0 flex-col rounded-none sm:rounded-l-3xl lg:rounded-3xl border-l lg:border border-stone-200 bg-white p-4 sm:p-5 shadow-2xl lg:shadow-xs overflow-hidden transition-all duration-300`}
      >
        {/* Ticket Header with Collapse Toggle */}
        <div className="space-y-3 pb-3 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-base text-stone-900">Current Ticket</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg hidden sm:inline-block">
                Cashier: {(activeStaff?.fullName || activeStaff?.name || 'Staff').split(' ')[0]}
              </span>

              {/* Sidebar Collapse Toggle */}
              <button
                type="button"
                onClick={() => setIsTicketSidebarOpen(false)}
                className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 text-xs font-bold text-stone-700 transition cursor-pointer"
                title="Collapse Ticket Sidebar"
              >
                <PanelRightClose className="h-4 w-4 text-stone-600" />
                <span className="text-[11px]">Collapse</span>
              </button>
            </div>
          </div>

          {/* Order Type & Table Selection */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setOrderType('dine_in')}
                className={`rounded-xl py-2 text-xs font-bold border transition ${
                  orderType === 'dine_in'
                    ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}
              >
                🍽️ Dine-In
              </button>
              <button
                onClick={() => {
                  setOrderType('take_away');
                  setSelectedTable('');
                }}
                className={`rounded-xl py-2 text-xs font-bold border transition ${
                  orderType === 'take_away'
                    ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}
              >
                🛍️ Take-Out
              </button>
              <button
                onClick={() => {
                  setOrderType('delivery');
                  setSelectedTable('');
                }}
                className={`rounded-xl py-2 text-xs font-bold border transition ${
                  orderType === 'delivery'
                    ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold'
                    : 'bg-stone-50 text-stone-700 border-stone-200'
                }`}
              >
                🛵 Delivery
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {orderType === 'dine_in' ? (
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(true)}
                  className="w-full flex items-center gap-1.5 rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs text-stone-900 font-bold hover:border-amber-500 hover:bg-amber-50/40 transition text-left"
                >
                  <Utensils className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">
                    {selectedTable ? `Table #${selectedTable}` : 'Select Table'}
                  </span>
                </button>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-500 font-medium">
                  No Table (Takeaway)
                </div>
              )}

              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Guest Name (Optional)"
                className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cart Items List & Payment Controls */}
        <div className="flex flex-col flex-1 overflow-hidden min-h-0">
          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1 max-h-[350px] lg:max-h-none">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-stone-400 text-xs min-h-[140px]">
                <Sparkles className="h-8 w-8 text-stone-300 mb-1" />
                <p className="font-bold text-stone-600">Ticket is empty</p>
                <p className="text-[11px]">Click items from the catalog to add</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((ci, index) => {
                  const lineKey = ci.cartItemId || ci.id || `ci-${ci.item.id}-${index}`;
                  return (
                    <SwipeableCartItem
                      key={lineKey}
                      cartItem={ci}
                      onUpdateQuantity={(delta) => updateQuantity(lineKey, delta)}
                      onRemove={() => removeItem(lineKey)}
                      onOpenDiscount={() => openItemDiscountModal(ci)}
                      onRemoveDiscount={() => handleRemoveDiscountFromItem(lineKey)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Side-by-Side: Total Summary Container & Discount Container */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 my-1.5 items-stretch">
            {/* Left Container: Calculation Summary & Total Due */}
            <div className={`${discountedItems.length > 0 ? 'sm:col-span-7' : 'sm:col-span-8'} rounded-xl bg-stone-50 p-2 sm:p-2.5 border border-stone-200/80 flex flex-col justify-between space-y-0.5 text-xs text-stone-600`}>
              <div className="space-y-0.5">
                <div className="flex justify-between items-center text-[10px] sm:text-[11px]">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">₱{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-700 font-bold text-[10px] sm:text-[11px]">
                    <span className="truncate pr-1">Discount:</span>
                    <span className="font-mono shrink-0">-₱{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-[10px] sm:text-[11px]">
                  <span>VAT ({taxRate}%):</span>
                  <span className="font-mono font-medium">₱{taxAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline font-bold text-stone-900 pt-1 border-t border-stone-200 mt-0.5">
                <span className="text-[11px] sm:text-xs">Total Due:</span>
                <span className="font-mono text-amber-700 font-extrabold text-sm sm:text-base">
                  ₱{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Right Container: Discount / Coupon Control Side-by-Side */}
            <div className={`${discountedItems.length > 0 ? 'sm:col-span-5' : 'sm:col-span-4'} flex flex-col`}>
              {discountedItems.length > 0 ? (
                <div className="h-full rounded-2xl border border-emerald-400 bg-emerald-50/90 p-2 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-wider">
                        % Item Discounts
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllDiscounts}
                        title="Clear all item discounts"
                        className="rounded p-0.5 text-stone-400 hover:bg-rose-100 hover:text-rose-600 transition cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-emerald-950 truncate">
                      {discountedItems.length} of {cart.length} {discountedItems.length === 1 ? 'item' : 'items'} discounted
                    </div>
                    <div className="text-[10px] text-emerald-700 font-mono font-bold">
                      -₱{discountAmount.toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (cart.length === 1) {
                        openItemDiscountModal(cart[0]);
                      } else {
                        setIsItemSelectModalOpen(true);
                      }
                    }}
                    className="mt-1 w-full rounded-lg bg-white border border-emerald-300 py-1 text-[9px] font-bold text-emerald-800 hover:bg-emerald-100 transition text-center shadow-2xs cursor-pointer"
                  >
                    Manage / Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (cart.length === 0) {
                      showAlert({
                        title: 'Ticket is Empty',
                        message: 'Please add items to your ticket first.',
                        type: 'info',
                      });
                      return;
                    }
                    if (cart.length === 1) {
                      openItemDiscountModal(cart[0]);
                    } else {
                      setIsItemSelectModalOpen(true);
                    }
                  }}
                  className="h-full min-h-[58px] w-full flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/90 hover:bg-amber-100 hover:border-amber-400 p-2 text-center text-amber-950 transition active:scale-98 shadow-2xs group cursor-pointer"
                  title="Apply discount to an item"
                >
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 group-hover:bg-amber-400 shadow-2xs transition text-stone-950">
                    <Ticket className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[11px] font-extrabold text-amber-950">Item Discount</span>
                    <span className="text-[9px] font-bold text-amber-700 mt-0.5">Apply to Item</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 disabled:opacity-40"
            >
              Clear
            </button>
            <button
              onClick={openTender}
              disabled={cart.length === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs sm:text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition disabled:opacity-40 active:scale-98"
            >
              <span>Confirm (₱{totalAmount.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Sticky Floating Bottom Bar on Mobile when ticket is collapsed & cart has items */}
      {!isTicketSidebarOpen && cart.length > 0 && (
        <div className="fixed bottom-20 sm:bottom-4 inset-x-3 sm:inset-x-6 z-45 lg:hidden bg-stone-950 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between border border-stone-800 animate-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 font-black text-xs shadow-xs">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-stone-400 font-medium block">
                {cart.reduce((s, i) => s + i.quantity, 0)} {cart.reduce((s, i) => s + i.quantity, 0) === 1 ? 'item' : 'items'} in ticket
              </span>
              <span className="font-mono text-sm font-black text-amber-400">
                ₱{totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTicketSidebarOpen(true)}
              className="rounded-xl bg-stone-800 hover:bg-stone-700 px-3 py-2 text-xs font-bold text-stone-200 transition"
            >
              Open Ticket
            </button>
            <button
              type="button"
              onClick={openTender}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-extrabold text-stone-950 shadow-md transition active:scale-95"
            >
              Tender
            </button>
          </div>
        </div>
      )}

      {/* Tender Modal */}
      {isTenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg md:max-w-xl rounded-2xl sm:rounded-3xl bg-white p-3.5 sm:p-5 md:p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2 sm:pb-3">
              <div>
                <h3 className="font-display text-sm sm:text-base md:text-lg font-bold text-stone-900">
                  Tender &amp; Receipt
                </h3>
              </div>
              <button
                onClick={() => setIsTenderModalOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Total Display */}
            <div className="my-2.5 sm:my-3 rounded-xl sm:rounded-2xl bg-stone-950 px-3.5 py-2 sm:py-2.5 text-center text-white flex items-center justify-between shadow-xs">
              <div className="text-left">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                  Total
                </span>
              </div>
              <div className="font-mono text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
                ₱{totalAmount.toFixed(2)}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2.5 sm:mb-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`flex items-center justify-center gap-1 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold border transition ${
                  paymentMethod === 'cash'
                    ? 'bg-amber-500 text-stone-950 border-amber-500 font-extrabold shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('gcash')}
                className={`flex items-center justify-center gap-1 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold border transition ${
                  paymentMethod === 'gcash'
                    ? 'bg-sky-500 text-white border-sky-500 font-extrabold shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>GCash QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center justify-center gap-1 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold border transition ${
                  paymentMethod === 'card'
                    ? 'bg-stone-900 text-white border-stone-900 font-extrabold shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Card</span>
              </button>
            </div>

            {/* Main Content: Left Details & Right Numpad */}
            {paymentMethod === 'cash' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3">
                {/* Left Side: Input, Quick Denominations, & Change */}
                <div className="md:col-span-6 space-y-2 sm:space-y-2.5">
                  <div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-stone-500 text-base sm:text-lg">
                        ₱
                      </span>
                      <input
                        type="text"
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl sm:rounded-2xl border border-stone-300 bg-stone-50 pl-7 pr-3 py-1.5 sm:py-2 text-base sm:text-lg font-mono font-bold text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none text-right shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Quick Bills & Denominations Grid */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                      {[20, 50, 100, 200, 500, 1000].map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => handleAddPredeterminedAmount(bill)}
                          className="rounded-lg sm:rounded-xl border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-400 py-1 sm:py-1.5 text-[11px] sm:text-xs font-extrabold text-stone-800 hover:text-amber-950 transition active:scale-95 shadow-2xs font-mono flex items-center justify-center gap-0.5"
                        >
                          <span className="text-[9px] font-sans text-amber-600 font-bold">+</span>
                          <span>₱{bill}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Change Box */}
                  <div className="flex items-center justify-between rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-950">
                    <div>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                        Change Due
                      </span>
                    </div>
                    <span className={`font-mono text-lg sm:text-xl font-black ${tenderedNumber < totalAmount ? 'text-stone-400' : 'text-emerald-700'}`}>
                      ₱{changeAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Right Side: Tactile POS Numpad */}
                <div className="md:col-span-6 bg-stone-50 border border-stone-200/80 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-end px-1 mb-1">
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('CLEAR')}
                      className="text-[10px] font-extrabold text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                    {/* Row 1 */}
                    {['7', '8', '9'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumpadInput(n)}
                        className="rounded-lg sm:rounded-xl bg-white border border-stone-200/90 py-1.5 sm:py-2 text-sm sm:text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:border-amber-400 active:scale-95 transition"
                      >
                        {n}
                      </button>
                    ))}

                    {/* Row 2 */}
                    {['4', '5', '6'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumpadInput(n)}
                        className="rounded-lg sm:rounded-xl bg-white border border-stone-200/90 py-1.5 sm:py-2 text-sm sm:text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:border-amber-400 active:scale-95 transition"
                      >
                        {n}
                      </button>
                    ))}

                    {/* Row 3 */}
                    {['1', '2', '3'].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleNumpadInput(n)}
                        className="rounded-lg sm:rounded-xl bg-white border border-stone-200/90 py-1.5 sm:py-2 text-sm sm:text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:border-amber-400 active:scale-95 transition"
                      >
                        {n}
                      </button>
                    ))}

                    {/* Row 4 */}
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('.')}
                      className="rounded-lg sm:rounded-xl bg-white border border-stone-200/90 py-1.5 sm:py-2 text-sm sm:text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:scale-95 transition"
                    >
                      .
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('0')}
                      className="rounded-lg sm:rounded-xl bg-white border border-stone-200/90 py-1.5 sm:py-2 text-sm sm:text-base font-mono font-bold text-stone-900 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:scale-95 transition"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('BACKSPACE')}
                      className="rounded-lg sm:rounded-xl bg-stone-100 border border-stone-200 py-1.5 sm:py-2 flex items-center justify-center text-stone-700 shadow-2xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 active:scale-95 transition"
                    >
                      <Delete className="h-3.5 w-3.5" />
                    </button>

                    {/* Row 5 */}
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('00')}
                      className="rounded-lg sm:rounded-xl bg-white border border-stone-200/90 py-1 sm:py-1.5 text-[11px] sm:text-xs font-mono font-bold text-stone-700 shadow-2xs hover:bg-stone-100 active:bg-amber-100 active:scale-95 transition"
                    >
                      00
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadInput('EXACT')}
                      className="col-span-2 rounded-lg sm:rounded-xl bg-amber-500 border border-amber-600/50 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold text-stone-950 shadow-xs hover:bg-amber-400 active:scale-95 transition flex items-center justify-center"
                    >
                      Exact (₱{totalAmount.toFixed(2)})
                    </button>
                  </div>
                </div>
              </div>
            ) : paymentMethod === 'gcash' ? (
              <div className="rounded-xl sm:rounded-2xl border border-sky-200 bg-sky-50/50 p-4 sm:p-6 text-center space-y-2 sm:space-y-3">
                <QrCode className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-sky-600" />
                <h4 className="text-xs sm:text-sm font-bold text-sky-950">Scan Yellow Hauz Merchant GCash QR</h4>
                <p className="text-[11px] sm:text-xs text-stone-600 max-w-sm mx-auto">
                  Customer will transfer exact <strong className="text-sky-900 font-mono">₱{totalAmount.toFixed(2)}</strong>. Verify reference number before completing.
                </p>
              </div>
            ) : (
              <div className="rounded-xl sm:rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-6 text-center space-y-2 sm:space-y-3">
                <CreditCard className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-stone-700" />
                <h4 className="text-xs sm:text-sm font-bold text-stone-900">Swipe / Tap on POS Card Terminal</h4>
                <p className="text-[11px] sm:text-xs text-stone-600 max-w-sm mx-auto">
                  Insert or tap customer card for <strong className="text-stone-900 font-mono">₱{totalAmount.toFixed(2)}</strong> on the terminal.
                </p>
              </div>
            )}

            <div className="mt-3 sm:mt-4 flex gap-2.5 sm:gap-3 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsTenderModalOpen(false)}
                className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProcessOrder}
                className="flex-1 rounded-xl bg-amber-500 py-2 sm:py-2.5 text-xs sm:text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition active:scale-98"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Selection / Dining Option Modal */}
      <TableSelectModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={(tableNumber) => {
          setSelectedTable(tableNumber);
          setOrderType('dine_in');
          setIsTableModalOpen(false);
          setAmountPaidInput(totalAmount.toFixed(2));
          setIsTenderModalOpen(true);
        }}
        onNoTableNeeded={() => {
          setSelectedTable('');
          setOrderType('take_away');
          setIsTableModalOpen(false);
          setAmountPaidInput(totalAmount.toFixed(2));
          setIsTenderModalOpen(true);
        }}
      />

      {/* Item-Specific Discount & Coupon Modal */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => {
          setIsDiscountModalOpen(false);
          setDiscountTargetCartId(null);
        }}
        subtotal={subtotal}
        appliedDiscount={discountTargetItem?.discount ?? null}
        customIdNumber={discountTargetItem?.discountIdNumber || seniorPwdIdNumber}
        targetItemName={discountTargetItem?.item.name}
        targetItemPrice={discountTargetItem?.item.price}
        targetItemQuantity={discountTargetItem?.quantity}
        onApplyDiscount={(disc, idNum) => {
          if (discountTargetCartId !== null) {
            handleApplyDiscountToItem(discountTargetCartId, disc, idNum);
          }
        }}
        onRemoveDiscount={() => {
          if (discountTargetCartId !== null) {
            handleRemoveDiscountFromItem(discountTargetCartId);
          }
        }}
      />

      {/* Select Item to Discount Modal (for when user clicks the Item Discount button with multiple items) */}
      {isItemSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold">
                  <Ticket className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">Select Item to Discount</h3>
                  <p className="text-xs text-stone-400">Choose which item in ticket to apply discount</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsItemSelectModalOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2">
              {cart.map((ci, index) => {
                const lineId = ci.cartItemId || ci.id || `ci-${ci.item.id}-${index}`;
                return (
                  <button
                    key={lineId}
                    type="button"
                    onClick={() => {
                      setIsItemSelectModalOpen(false);
                      openItemDiscountModal(ci);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition cursor-pointer ${
                      ci.discount
                        ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50'
                        : 'border-stone-200 hover:border-amber-400 hover:bg-amber-50/40'
                    }`}
                  >
                  <div>
                    <div className="font-bold text-xs text-stone-900">{ci.item.name}</div>
                    <div className="text-[11px] text-stone-500 font-mono">
                      ₱{ci.item.price.toFixed(2)} × {ci.quantity}
                    </div>
                    {ci.discount && (
                      <span className="inline-block mt-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 rounded px-1.5 py-0.5">
                        🏷️ {ci.discount.name} ({ci.discount.type === 'percent' ? `${ci.discount.value}%` : `₱${ci.discount.value}`})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 px-2.5 py-1.5 text-xs font-bold transition">
                      {ci.discount ? 'Change' : 'Discount'}
                    </span>
                  </div>
                </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
