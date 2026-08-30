import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MenuItem, Category, Order, OrderItem } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Package,
  PackagePlus,
  Minus,
  AlertTriangle,
  Flame,
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
  FolderPlus,
  Folder,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoveRight,
  SlidersHorizontal,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
} from 'lucide-react';
import { LowStockNotificationModal } from './LowStockNotificationModal';

interface InventoryManagerProps {
  categories: Category[];
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ categories: propCategories }) => {
  const { showConfirm, showAlert } = useModal();
  const [items, setItems] = useState<MenuItem[]>(() => AppStore.getMenuItems());
  const [categories, setCategories] = useState<Category[]>(() => AppStore.getCategories());
  const [orders, setOrders] = useState<Order[]>(() => AppStore.getOrders());
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

  // Active View Tab: 'items' or 'categories'
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');

  // Menu Items Filters
  const [categoryType, setCategoryType] = useState<'drinks' | 'food' | 'all'>('all');
  const [selectedCat, setSelectedCat] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  // Close Category Dropdown on Outside Click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    };
    if (isCatDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCatDropdownOpen]);

  // Label for current category selection
  const currentCategoryLabel = useMemo(() => {
    if (selectedCat !== 'all') {
      const cat = categories.find((c) => c.id === selectedCat);
      return cat ? cat.name : 'Category';
    }
    if (categoryType === 'drinks') return 'Drinks';
    if (categoryType === 'food') return 'Food';
    return 'All Categories';
  }, [selectedCat, categoryType, categories]);

  // Items Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Map each item ID to its latest order timestamp
  const lastSaleMap = useMemo(() => {
    const map = new Map<number, { timestamp: number; dateStr: string }>();

    orders.forEach((order) => {
      if (!order.items || order.status === 'cancelled') return;
      const orderTime = new Date(order.createdAt).getTime();
      if (isNaN(orderTime)) return;

      order.items.forEach((oi: OrderItem) => {
        const existing = map.get(oi.menuItemId);
        if (!existing || orderTime > existing.timestamp) {
          map.set(oi.menuItemId, {
            timestamp: orderTime,
            dateStr: order.createdAt,
          });
        }
      });
    });

    return map;
  }, [orders]);

  // Formatter for MM/DD/YY h:mmA (e.g. 08/28/26 3:00AM)
  const formatLastSale = (dateInput?: string | number) => {
    if (!dateInput) return 'Never ordered';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Never ordered';

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 12 instead of 0

    return `${mm}/${dd}/${yy} ${hours}:${minutes}${ampm}`;
  };

  // Items Sorting State
  type SortField = 'name' | 'category' | 'price' | 'quantity' | 'lastSale' | 'status';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'price' || field === 'quantity' || field === 'lastSale' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Reset page to 1 whenever filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryType, selectedCat, searchQuery, pageSize, sortField, sortDirection]);

  // Category Directory Filters
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [catFilterType, setCatFilterType] = useState<'all' | 'drinks' | 'food'>('all');

  // Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Category Add / Edit Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormType, setCatFormType] = useState<'drinks' | 'food'>('drinks');
  const [catFormIcon, setCatFormIcon] = useState('Coffee');
  const [catFormSortOrder, setCatFormSortOrder] = useState<number>(1);
  const [catFormStatus, setCatFormStatus] = useState<'active' | 'inactive'>('active');

  // Category Delete with Reassignment Modal State
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);
  const [reassignTargetCatId, setReassignTargetCatId] = useState<number | ''>('');

  // Listen to store updates
  useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setCategories(AppStore.getCategories());
      setItems(AppStore.getMenuItems());
      setOrders(AppStore.getOrders());
    });
    return () => unsub();
  }, []);

  // Separate Drinks vs Food categories helper
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

  const activeCategoriesList = useMemo(() => {
    if (categoryType === 'drinks') return drinkCategories;
    if (categoryType === 'food') return foodCategories;
    return categories;
  }, [categoryType, drinkCategories, foodCategories, categories]);

  // Category Icon resolver
  const renderCategoryIcon = (categoryName: string, isDrink: boolean, iconName?: string) => {
    const name = (categoryName || '').toLowerCase();
    const ic = (iconName || '').toLowerCase();

    if (ic === 'coffee' || name.includes('hot coffee') || (isDrink && name.includes('coffee') && !name.includes('blended'))) {
      return <Coffee className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'glasswater' || ic === 'glass' || name.includes('on the rocks') || name.includes('rocks')) {
      return <GlassWater className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'cupsoda' || name.includes('blended coffee') || name.includes('soda') || name.includes('frappe')) {
      return <CupSoda className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'icecream' || name.includes('cream blended') || name.includes('ice cream')) {
      return <IceCream className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'flame' || name.includes('hot drink') || name.includes('flame')) {
      return <Flame className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'citrus' || name.includes('refresher') || name.includes('citrus') || name.includes('juice')) {
      return <Citrus className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'milk' || name.includes('milkshake') || name.includes('shake') || name.includes('milk')) {
      return <Milk className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'leaf' || name.includes('milk tea') || name.includes('tea') || name.includes('matcha')) {
      return <Leaf className="h-3.5 w-3.5 shrink-0" />;
    }
    if (
      name.includes('drink add-on') ||
      name.includes('add-on') ||
      name.includes('addon') ||
      name.includes('plus')
    ) {
      return <Plus className="h-3.5 w-3.5 shrink-0" />;
    }

    if (ic === 'egg' || name.includes('breakfast') || name.includes('egg')) {
      return <Egg className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'utensils' || name.includes('appetizer')) {
      return <Utensils className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'soup' || name.includes('meal') || name.includes('soup') || name.includes('rice')) {
      return <Soup className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'cookingpot' || name.includes('pasta') || name.includes('noodle')) {
      return <CookingPot className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'pizza' || name.includes('pizza')) {
      return <Pizza className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'sandwich' || name.includes('sandwich') || name.includes('bread') || name.includes('toast') || name.includes('burger')) {
      return <Sandwich className="h-3.5 w-3.5 shrink-0" />;
    }
    if (ic === 'cake' || name.includes('cake') || name.includes('pastr') || name.includes('dessert') || name.includes('bakery')) {
      return <Cake className="h-3.5 w-3.5 shrink-0" />;
    }

    return isDrink ? <Coffee className="h-3.5 w-3.5 shrink-0" /> : <Utensils className="h-3.5 w-3.5 shrink-0" />;
  };

  // Item Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [price, setPrice] = useState<number>(150);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState<number>(20);
  const [temperature, setTemperature] = useState<MenuItem['temperature']>('both');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isBestSeller, setIsBestSeller] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('/images/latte.webp');

  const refresh = () => {
    setItems(AppStore.getMenuItems());
    setCategories(AppStore.getCategories());
  };

  // Quick Restock State
  const [quickRestockItem, setQuickRestockItem] = useState<MenuItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(5);

  const handleOpenQuickRestock = (item: MenuItem) => {
    setQuickRestockItem(item);
    setRestockQty(5);
  };

  const handleApplyQuickRestock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickRestockItem) return;

    const currentQty = quickRestockItem.quantity || 0;
    const addAmount = Math.max(1, restockQty);
    const newQty = currentQty + addAmount;

    AppStore.updateMenuItem(quickRestockItem.id, {
      quantity: newQty,
      isAvailable: newQty > 0 ? true : quickRestockItem.isAvailable,
    });

    showAlert({
      title: 'Restock Successful',
      message: `Added +${addAmount} unit(s) to "${quickRestockItem.name}". New inventory count: ${newQty} units.`,
      type: 'success',
    });

    setQuickRestockItem(null);
    refresh();
  };

  // Open Add Item Modal
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setName('');
    const defaultCat = categoryType === 'food' ? (foodCategories[0]?.id || 1) : (drinkCategories[0]?.id || 9);
    setCategoryId(defaultCat);
    setPrice(150);
    setDescription('');
    setQuantity(25);
    setTemperature(categoryType === 'food' ? 'room temp' : 'both');
    setIsAvailable(true);
    setIsBestSeller(false);
    setImageUrl('/images/latte.webp');
    setIsItemModalOpen(true);
  };

  // Open Edit Item Modal
  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.categoryId);
    setPrice(item.price);
    setDescription(item.description);
    setQuantity(item.quantity);
    setTemperature(item.temperature);
    setIsAvailable(item.isAvailable);
    setIsBestSeller(item.isBestSeller);
    setImageUrl(item.imageUrl || '/images/latte.webp');
    setIsItemModalOpen(true);
  };

  // Save Item
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      AppStore.updateMenuItem(editingItem.id, {
        name: name.trim(),
        categoryId,
        price,
        description: description.trim(),
        quantity,
        temperature,
        isAvailable,
        isBestSeller,
        imageUrl,
      });
      showAlert({
        title: 'Item Updated',
        message: `"${name.trim()}" was updated successfully.`,
        type: 'success',
      });
    } else {
      AppStore.addMenuItem({
        name: name.trim(),
        categoryId,
        price,
        description: description.trim(),
        quantity,
        temperature,
        isAvailable,
        isBestSeller,
        imageUrl,
        sortOrder: items.length + 1,
      });
      showAlert({
        title: 'Item Created',
        message: `"${name.trim()}" was added to menu.`,
        type: 'success',
      });
    }

    setIsItemModalOpen(false);
    refresh();
  };

  // Delete Item
  const handleDeleteItem = async (id: number) => {
    const targetItem = items.find((i) => i.id === id);
    const ok = await showConfirm({
      title: 'Delete Menu Item?',
      message: `Are you sure you want to permanently delete "${targetItem?.name || 'this item'}" from the catalog?`,
      type: 'danger',
      confirmText: 'Delete Item',
      cancelText: 'Cancel',
    });
    if (ok) {
      AppStore.deleteMenuItem(id);
      refresh();
      showAlert({
        title: 'Item Deleted',
        message: `"${targetItem?.name || 'Item'}" was removed from the inventory.`,
        type: 'info',
      });
    }
  };

  const handleToggleAvailability = (item: MenuItem) => {
    AppStore.updateMenuItem(item.id, { isAvailable: !item.isAvailable });
    refresh();
  };

  // --- Category Actions: ADD, EDIT, REMOVE ---

  // 1. Open Add Category Modal
  const handleOpenAddCategory = (presetType?: 'drinks' | 'food') => {
    setEditingCategory(null);
    setCatFormName('');
    const targetType = presetType || (categoryType === 'food' ? 'food' : 'drinks');
    setCatFormType(targetType);
    setCatFormIcon(targetType === 'drinks' ? 'Coffee' : 'Utensils');
    setCatFormSortOrder(categories.length + 1);
    setCatFormStatus('active');
    setIsCategoryModalOpen(true);
  };

  // 2. Open Edit Category Modal
  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatFormName(cat.name);
    const isDrink = isDrinkCategory(cat);
    setCatFormType(isDrink ? 'drinks' : 'food');
    setCatFormIcon(cat.icon || (isDrink ? 'Coffee' : 'Utensils'));
    setCatFormSortOrder(cat.sortOrder || 1);
    setCatFormStatus(cat.status || 'active');
    setIsCategoryModalOpen(true);
  };

  // 3. Save Category (Add or Edit)
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName.trim()) return;

    const trimmed = catFormName.trim();

    if (editingCategory) {
      AppStore.updateCategory(editingCategory.id, {
        name: trimmed,
        icon: catFormIcon,
        sortOrder: Number(catFormSortOrder) || 1,
        status: catFormStatus,
      });
      showAlert({
        title: 'Category Updated',
        message: `Category "${trimmed}" has been updated successfully.`,
        type: 'success',
      });
    } else {
      const created = AppStore.addCategory({
        name: trimmed,
        icon: catFormIcon,
        sortOrder: Number(catFormSortOrder) || categories.length + 1,
        status: catFormStatus,
      });
      showAlert({
        title: 'Category Created!',
        message: `Category "${trimmed}" has been created. You can now assign items to it.`,
        type: 'success',
      });
      // Optionally switch view to this category
      if (activeTab === 'items') {
        setCategoryType(catFormType);
        setSelectedCat(created.id);
      }
    }

    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    refresh();
  };

  // 4. Remove / Delete Category
  const handleInitiateDeleteCategory = async (cat: Category) => {
    const attachedItems = items.filter((i) => i.categoryId === cat.id);

    if (attachedItems.length > 0) {
      // Open Reassign & Delete dialog
      setDeleteCatTarget(cat);
      const otherCats = categories.filter((c) => c.id !== cat.id);
      setReassignTargetCatId(otherCats[0]?.id || '');
      return;
    }

    // Direct delete for empty category
    const ok = await showConfirm({
      title: 'Remove Category?',
      message: `Are you sure you want to remove the category "${cat.name}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Remove Category',
      cancelText: 'Cancel',
    });

    if (ok) {
      AppStore.deleteCategory(cat.id);
      if (selectedCat === cat.id) {
        setSelectedCat('all');
      }
      setIsCategoryModalOpen(false);
      refresh();
      showAlert({
        title: 'Category Removed',
        message: `"${cat.name}" was removed.`,
        type: 'info',
      });
    }
  };

  // Confirm Reassign & Delete Category
  const handleConfirmReassignAndDelete = () => {
    if (!deleteCatTarget || !reassignTargetCatId) return;

    const count = AppStore.reassignCategoryItems(deleteCatTarget.id, Number(reassignTargetCatId));
    AppStore.deleteCategory(deleteCatTarget.id);

    const targetCatObj = categories.find((c) => c.id === Number(reassignTargetCatId));

    if (selectedCat === deleteCatTarget.id) {
      setSelectedCat('all');
    }

    setDeleteCatTarget(null);
    setIsCategoryModalOpen(false);
    refresh();

    showAlert({
      title: 'Category Removed & Items Reassigned',
      message: `Category "${deleteCatTarget.name}" was deleted. ${count} item(s) were reassigned to "${targetCatObj?.name || 'new category'}".`,
      type: 'success',
    });
  };

  // Filtered and sorted items list
  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
      if (selectedCat !== 'all') {
        if (item.categoryId !== selectedCat) return false;
      } else if (categoryType !== 'all') {
        const cat = categories.find((c) => c.id === item.categoryId);
        if (cat) {
          const isDrink = isDrinkCategory(cat);
          if (categoryType === 'drinks' && !isDrink) return false;
          if (categoryType === 'food' && isDrink) return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'category') {
        const catA = categories.find((c) => c.id === a.categoryId)?.name || '';
        const catB = categories.find((c) => c.id === b.categoryId)?.name || '';
        comparison = catA.localeCompare(catB);
      } else if (sortField === 'price') {
        comparison = a.price - b.price;
      } else if (sortField === 'quantity') {
        comparison = (a.quantity ?? 0) - (b.quantity ?? 0);
      } else if (sortField === 'lastSale') {
        const timeA = lastSaleMap.get(a.id)?.timestamp ?? 0;
        const timeB = lastSaleMap.get(b.id)?.timestamp ?? 0;
        comparison = timeA - timeB;
      } else if (sortField === 'status') {
        comparison = Number(b.isAvailable) - Number(a.isAvailable);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [items, selectedCat, categoryType, categories, searchQuery, sortField, sortDirection, lastSaleMap]);

  // Derived Items Pagination Calculations
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  const startRecord = filteredItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, filteredItems.length);

  // Smart page numbers calculation with ellipsis
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (safeCurrentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  // Export Inventory CSV
  const handleExportInventoryCSV = () => {
    if (filteredItems.length === 0) return;

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Product ID',
      'Product Name',
      'Category',
      'Classification',
      'Base Price (PHP)',
      'Current Stock Units',
      'Last Sale',
      'Availability Status',
    ];

    const rows = filteredItems.map((item) => {
      const cat = categories.find((c) => c.id === item.categoryId);
      const isDrink = cat ? isDrinkCategory(cat) : false;
      const lastSaleEntry = lastSaleMap.get(item.id);

      return [
        escapeCsv(item.id),
        escapeCsv(item.name),
        escapeCsv(cat?.name || 'Uncategorized'),
        escapeCsv(isDrink ? 'Drink / Beverage' : 'Food / Pastry'),
        escapeCsv(Number(item.price || 0).toFixed(2)),
        escapeCsv(item.quantity ?? item.stock ?? 0),
        escapeCsv(formatLastSale(lastSaleEntry?.dateStr)),
        escapeCsv(item.isAvailable ?? item.available ? 'Available (Active)' : 'Unavailable (Hidden)'),
      ].join(',');
    });

    const csvContent =
      '\uFEFF' + [headers.map((h) => escapeCsv(h)).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `YellowHauz_Inventory_${categoryType}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtered categories directory list
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        const isDrink = isDrinkCategory(cat);
        if (catFilterType === 'drinks' && !isDrink) return false;
        if (catFilterType === 'food' && isDrink) return false;
        if (catSearchQuery.trim()) {
          const q = catSearchQuery.toLowerCase();
          return cat.name.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [categories, catFilterType, catSearchQuery]);

  // Icon choices for category creation
  const drinkIconOptions = [
    { id: 'Coffee', label: 'Coffee', icon: <Coffee className="h-4 w-4" /> },
    { id: 'GlassWater', label: 'Rocks / Iced', icon: <GlassWater className="h-4 w-4" /> },
    { id: 'CupSoda', label: 'Blended / Soda', icon: <CupSoda className="h-4 w-4" /> },
    { id: 'IceCream', label: 'Cream / Frappe', icon: <IceCream className="h-4 w-4" /> },
    { id: 'Flame', label: 'Hot Drinks', icon: <Flame className="h-4 w-4" /> },
    { id: 'Citrus', label: 'Refreshers / Juice', icon: <Citrus className="h-4 w-4" /> },
    { id: 'Milk', label: 'Milkshake / Dairy', icon: <Milk className="h-4 w-4" /> },
    { id: 'Leaf', label: 'Tea / Matcha', icon: <Leaf className="h-4 w-4" /> },
    { id: 'Plus', label: 'Add-on', icon: <Plus className="h-4 w-4" /> },
  ];

  const foodIconOptions = [
    { id: 'Utensils', label: 'Dining / Appetizer', icon: <Utensils className="h-4 w-4" /> },
    { id: 'Egg', label: 'Breakfast', icon: <Egg className="h-4 w-4" /> },
    { id: 'Soup', label: 'Meal / Rice', icon: <Soup className="h-4 w-4" /> },
    { id: 'CookingPot', label: 'Pasta / Noodles', icon: <CookingPot className="h-4 w-4" /> },
    { id: 'Pizza', label: 'Pizza', icon: <Pizza className="h-4 w-4" /> },
    { id: 'Sandwich', label: 'Sandwich / Toast', icon: <Sandwich className="h-4 w-4" /> },
    { id: 'Cake', label: 'Pastry / Cake', icon: <Cake className="h-4 w-4" /> },
    { id: 'Plus', label: 'Add-on', icon: <Plus className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            Inventory &amp; Menu Catalog
          </h2>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Low Stock In-App Alerts Button */}
          <button
            onClick={() => setIsLowStockModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
              items.filter((i) => (i.quantity ?? 0) <= 5).length > 0
                ? 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100 shadow-2xs'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
            }`}
            title="Open Low Stock Notifications & Batch Restock"
          >
            <Bell className={`h-4 w-4 ${items.filter((i) => (i.quantity ?? 0) <= 5).length > 0 ? 'text-amber-600 animate-bounce' : 'text-stone-500'}`} />
            <span>Low Stock</span>
            {items.filter((i) => (i.quantity ?? 0) <= 5).length > 0 && (
              <span className="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-black text-stone-950 border border-amber-500/60 shadow-2xs">
                {items.filter((i) => (i.quantity ?? 0) <= 5).length}
              </span>
            )}
          </button>

          {/* New Category Button */}
          <button
            onClick={() => handleOpenAddCategory()}
            className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 shadow-2xs hover:bg-stone-50 hover:border-amber-400 transition cursor-pointer"
            title="Create a new category"
          >
            <FolderPlus className="h-4 w-4 text-amber-600" />
            <span>+ Add Category</span>
          </button>

          {/* Add Menu Item Button */}
          <button
            onClick={handleOpenAddItem}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Item</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Navigation Switcher (Items vs Categories Directory) */}
      <div className="flex items-center justify-between gap-4 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {/* Menu Items Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all duration-150 cursor-pointer ${
              activeTab === 'items'
                ? 'bg-white text-stone-950 shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Package className="h-4 w-4 text-amber-600" />
            <span>Menu Items</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                activeTab === 'items' ? 'bg-amber-100 text-amber-950 font-bold' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {items.length}
            </span>
          </button>

          {/* Category Directory Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all duration-150 cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-white text-stone-950 shadow-xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Layers className="h-4 w-4 text-amber-600" />
            <span>Category Directory</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                activeTab === 'categories' ? 'bg-amber-100 text-amber-950 font-bold' : 'bg-stone-200 text-stone-600'
              }`}
            >
              {categories.length}
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500 pr-3 font-medium">
          {activeTab === 'items' ? (
            <span>Showing catalog inventory</span>
          ) : (
            <span>Manage, edit, reorder &amp; remove categories</span>
          )}
        </div>
      </div>

      {/* VIEW 1: MENU ITEMS */}
      {activeTab === 'items' && (
        <div className="space-y-5">
          {/* Filter Bar: Single Categories Dropdown Button + Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-100/80 p-3 rounded-2xl border border-stone-200/80">
            {/* Single "Categories" Dropdown Button */}
            <div className="relative inline-block" ref={catDropdownRef}>
              <button
                type="button"
                id="inventory-category-dropdown-btn"
                onClick={() => setIsCatDropdownOpen((prev) => !prev)}
                className={`flex items-center justify-between sm:justify-start gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-150 border cursor-pointer shadow-2xs w-full sm:w-auto ${
                  isCatDropdownOpen
                    ? 'bg-stone-900 text-white border-stone-900 ring-2 ring-amber-500/30'
                    : 'bg-white text-stone-800 border-stone-300 hover:border-amber-500 hover:bg-stone-50'
                }`}
                title="Filter inventory by category"
              >
                <div className="flex items-center gap-2">
                  <span className={isCatDropdownOpen ? 'text-amber-400' : 'text-amber-600'}>
                    {categoryType === 'drinks' && selectedCat === 'all' ? (
                      <Coffee className="h-4 w-4" />
                    ) : categoryType === 'food' && selectedCat === 'all' ? (
                      <Utensils className="h-4 w-4" />
                    ) : selectedCat !== 'all' ? (
                      (() => {
                        const cat = categories.find((c) => c.id === selectedCat);
                        return cat ? renderCategoryIcon(cat.name, isDrinkCategory(cat), cat.icon) : <Layers className="h-4 w-4" />;
                      })()
                    ) : (
                      <Layers className="h-4 w-4" />
                    )}
                  </span>
                  <span className="font-extrabold text-stone-900 ${isCatDropdownOpen ? 'text-white' : ''}">Categories:</span>
                  <span
                    className={`rounded-lg px-2.5 py-0.5 text-xs font-black transition ${
                      isCatDropdownOpen
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-amber-100 text-amber-950'
                    }`}
                  >
                    {currentCategoryLabel}
                  </span>
                </div>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                    isCatDropdownOpen ? 'rotate-180 text-amber-400' : 'text-stone-400'
                  }`}
                />
              </button>

              {/* Dropdown Menu (Collapsible) */}
              {isCatDropdownOpen && (
                <div
                  id="inventory-category-dropdown-menu"
                  className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 max-h-[75vh] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150 divide-y divide-stone-100"
                >
                  {/* Primary High-Level Filters (All / Drinks / Food) */}
                  <div className="p-1 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-2 py-1">
                      Primary Filters
                    </div>

                    {/* All Categories / All Items */}
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryType('all');
                        setSelectedCat('all');
                        setIsCatDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        selectedCat === 'all' && categoryType === 'all'
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Layers className="h-4 w-4 text-amber-600" />
                        <span>All Categories</span>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                          selectedCat === 'all' && categoryType === 'all'
                            ? 'bg-stone-950/20 text-stone-950 font-bold'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {items.length}
                      </span>
                    </button>

                    {/* Drinks (All) */}
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryType('drinks');
                        setSelectedCat('all');
                        setIsCatDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        selectedCat === 'all' && categoryType === 'drinks'
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Coffee className="h-4 w-4 text-amber-700" />
                        <span>Drinks</span>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                          selectedCat === 'all' && categoryType === 'drinks'
                            ? 'bg-stone-950/20 text-stone-950 font-bold'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {items.filter((i) => {
                          const c = categories.find((cat) => cat.id === i.categoryId);
                          return c && isDrinkCategory(c);
                        }).length}
                      </span>
                    </button>

                    {/* Food (All) */}
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryType('food');
                        setSelectedCat('all');
                        setIsCatDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        selectedCat === 'all' && categoryType === 'food'
                          ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Utensils className="h-4 w-4 text-amber-800" />
                        <span>Food</span>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md ${
                          selectedCat === 'all' && categoryType === 'food'
                            ? 'bg-stone-950/20 text-stone-950 font-bold'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {items.filter((i) => {
                          const c = categories.find((cat) => cat.id === i.categoryId);
                          return c && !isDrinkCategory(c);
                        }).length}
                      </span>
                    </button>
                  </div>

                  {/* Drink Subcategories */}
                  {drinkCategories.length > 0 && (
                    <div className="p-1 space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-2 py-1 flex items-center justify-between">
                        <span>☕ Drinks ({drinkCategories.length})</span>
                      </div>
                      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                        {drinkCategories.map((cat) => {
                          const isSelected = selectedCat === cat.id;
                          const count = items.filter((i) => i.categoryId === cat.id).length;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setCategoryType('drinks');
                                setSelectedCat(cat.id);
                                setIsCatDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between rounded-xl px-3 py-1.5 text-xs transition cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                  : 'text-stone-700 hover:bg-stone-100 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={isSelected ? 'text-stone-950' : 'text-stone-500'}>
                                  {renderCategoryIcon(cat.name, true, cat.icon)}
                                </span>
                                <span className="truncate">{cat.name}</span>
                              </div>
                              <span
                                className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md shrink-0 ml-2 ${
                                  isSelected
                                    ? 'bg-stone-950/20 text-stone-950 font-bold'
                                    : 'bg-stone-100 text-stone-500'
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Food Subcategories */}
                  {foodCategories.length > 0 && (
                    <div className="p-1 space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 px-2 py-1 flex items-center justify-between">
                        <span>🍽️ Food ({foodCategories.length})</span>
                      </div>
                      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                        {foodCategories.map((cat) => {
                          const isSelected = selectedCat === cat.id;
                          const count = items.filter((i) => i.categoryId === cat.id).length;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setCategoryType('food');
                                setSelectedCat(cat.id);
                                setIsCatDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between rounded-xl px-3 py-1.5 text-xs transition cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-stone-950 font-extrabold shadow-2xs'
                                  : 'text-stone-700 hover:bg-stone-100 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={isSelected ? 'text-stone-950' : 'text-stone-500'}>
                                  {renderCategoryIcon(cat.name, false, cat.icon)}
                                </span>
                                <span className="truncate">{cat.name}</span>
                              </div>
                              <span
                                className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md shrink-0 ml-2 ${
                                  isSelected
                                    ? 'bg-stone-950/20 text-stone-950 font-bold'
                                    : 'bg-stone-100 text-stone-500'
                                }`}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add New Category Shortcut in Dropdown */}
                  <div className="p-1 pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCatDropdownOpen(false);
                        handleOpenAddCategory(categoryType === 'food' ? 'food' : 'drinks');
                      }}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 bg-stone-50/80 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 hover:border-amber-400 transition cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-amber-600" />
                      <span>Add New Category</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Search Bar & Reset */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${currentCategoryLabel.toLowerCase()}...`}
                  className="w-full rounded-xl border border-stone-300 bg-white pl-10 pr-8 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {(selectedCat !== 'all' || categoryType !== 'all' || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryType('all');
                    setSelectedCat('all');
                    setSearchQuery('');
                  }}
                  className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition cursor-pointer"
                  title="Reset all filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-xs">
            {/* Table Header Bar */}
            <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-stone-900">
                  {selectedCat === 'all'
                    ? categoryType === 'drinks'
                      ? 'Drink & Beverage Products'
                      : categoryType === 'food'
                      ? 'Food & Pastry Products'
                      : 'All Menu Catalog Products'
                    : categories.find((c) => c.id === selectedCat)?.name || 'Category Items'}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Track stock units, pricing, availability toggles, and edit details.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <label htmlFor="inv-page-size-top" className="font-bold text-stone-600 hidden md:inline">
                    Per page:
                  </label>
                  <select
                    id="inv-page-size-top"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-bold text-stone-800 focus:border-amber-500 focus:outline-hidden"
                  >
                    <option value={10}>10 rows</option>
                    <option value={15}>15 rows</option>
                    <option value={25}>25 rows</option>
                    <option value={50}>50 rows</option>
                    <option value={100}>100 rows</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleExportInventoryCSV}
                  disabled={filteredItems.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-2xs hover:bg-stone-50 disabled:opacity-40 transition cursor-pointer"
                  title="Export current inventory list as CSV spreadsheet"
                >
                  <Download className="h-3.5 w-3.5 text-stone-600" />
                  <span>Export CSV</span>
                </button>

                <span className="text-xs font-mono font-bold bg-stone-100 px-2.5 py-1 rounded-lg text-stone-600">
                  {filteredItems.length} {filteredItems.length === 1 ? 'product' : 'products'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                  <tr>
                    {/* Product Name Column */}
                    <th className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="group inline-flex items-center gap-1.5 font-bold uppercase hover:text-stone-900 transition cursor-pointer"
                      >
                        <span>Product Name</span>
                        <span className={`transition-colors ${sortField === 'name' ? 'text-amber-600' : 'text-stone-300 group-hover:text-stone-500'}`}>
                          {sortField === 'name' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    </th>

                    {/* Category Column */}
                    <th className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSort('category')}
                        className="group inline-flex items-center gap-1.5 font-bold uppercase hover:text-stone-900 transition cursor-pointer"
                      >
                        <span>Category</span>
                        <span className={`transition-colors ${sortField === 'category' ? 'text-amber-600' : 'text-stone-300 group-hover:text-stone-500'}`}>
                          {sortField === 'category' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    </th>

                    {/* Price Column */}
                    <th className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleSort('price')}
                        className="group inline-flex items-center gap-1.5 font-bold uppercase hover:text-stone-900 transition cursor-pointer ml-auto"
                      >
                        <span>Price</span>
                        <span className={`transition-colors ${sortField === 'price' ? 'text-amber-600' : 'text-stone-300 group-hover:text-stone-500'}`}>
                          {sortField === 'price' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    </th>

                    {/* Stock Qty Column */}
                    <th className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleSort('quantity')}
                        className="group inline-flex items-center gap-1.5 font-bold uppercase hover:text-stone-900 transition cursor-pointer mx-auto"
                      >
                        <span>Stock Qty</span>
                        <span className={`transition-colors ${sortField === 'quantity' ? 'text-amber-600' : 'text-stone-300 group-hover:text-stone-500'}`}>
                          {sortField === 'quantity' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    </th>

                    {/* Last Sale Column */}
                    <th className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleSort('lastSale')}
                        className="group inline-flex items-center gap-1.5 font-bold uppercase hover:text-stone-900 transition cursor-pointer"
                      >
                        <span>Last Sale</span>
                        <span className={`transition-colors ${sortField === 'lastSale' ? 'text-amber-600' : 'text-stone-300 group-hover:text-stone-500'}`}>
                          {sortField === 'lastSale' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    </th>

                    {/* Status Column */}
                    <th className="px-5 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleSort('status')}
                        className="group inline-flex items-center gap-1.5 font-bold uppercase hover:text-stone-900 transition cursor-pointer mx-auto"
                      >
                        <span>Status</span>
                        <span className={`transition-colors ${sortField === 'status' ? 'text-amber-600' : 'text-stone-300 group-hover:text-stone-500'}`}>
                          {sortField === 'status' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </button>
                    </th>

                    {/* Actions Column */}
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-stone-400">
                        <Sparkles className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                        <p className="font-bold text-stone-600">No items found</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Try selecting another category or add a new menu item.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const cat = categories.find((c) => c.id === item.categoryId);
                      const isDrink = cat ? isDrinkCategory(cat) : false;
                      const lastSaleEntry = lastSaleMap.get(item.id);

                      return (
                        <tr key={item.id} className="hover:bg-stone-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.imageUrl || '/images/latte.webp'}
                                alt={item.name}
                                className="h-9 w-9 rounded-lg object-cover border border-stone-200 shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/latte.webp';
                                }}
                              />
                              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                <span>{item.name}</span>
                                {item.isBestSeller && (
                                  <span className="rounded-full bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2">
                                    ⭐ Star
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-stone-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span className="text-stone-500">
                                {cat ? renderCategoryIcon(cat.name, isDrink, cat.icon) : <Coffee className="h-3.5 w-3.5" />}
                              </span>
                              <span className="font-semibold text-stone-800">{cat?.name || 'Unassigned'}</span>
                              <span
                                className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-md ${
                                  isDrink
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {isDrink ? 'Drink' : 'Food'}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono font-bold text-stone-900">
                            ₱{item.price.toFixed(2)}
                          </td>
                          <td className="px-5 py-3.5 text-center font-mono font-bold">
                            <span
                              className={`rounded-lg px-2 py-0.5 ${
                                item.quantity <= 0
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200 font-extrabold'
                                  : item.quantity <= (item.lowStockThreshold ?? 5)
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold'
                                  : 'bg-stone-100 text-stone-800'
                              }`}
                            >
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {lastSaleEntry ? (
                              <div className="font-mono text-xs font-bold text-stone-700">
                                {formatLastSale(lastSaleEntry.dateStr)}
                              </div>
                            ) : (
                              <span className="text-[11px] font-medium text-stone-400 italic">
                                Never ordered
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => handleToggleAvailability(item)}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition cursor-pointer ${
                                item.isAvailable
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                              }`}
                            >
                              {item.isAvailable ? 'Available' : 'Sold Out'}
                            </button>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenQuickRestock(item)}
                                className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-800 transition cursor-pointer"
                                title="Quick Restock"
                              >
                                <PackagePlus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditItem(item)}
                                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900 cursor-pointer"
                                title="Edit Item"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {filteredItems.length > 0 && (
              <div className="border-t border-stone-200 bg-stone-50/70 px-5 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                  <div>
                    Showing <span className="font-bold text-stone-800">{startRecord}</span> to{' '}
                    <span className="font-bold text-stone-800">{endRecord}</span> of{' '}
                    <span className="font-bold text-stone-800">{filteredItems.length}</span> products
                    {totalPages > 1 && (
                      <span className="ml-1.5 text-stone-400">
                        (Page <strong className="text-stone-700">{safeCurrentPage}</strong> of{' '}
                        <strong className="text-stone-700">{totalPages}</strong>)
                      </span>
                    )}
                  </div>

                  <div className="h-3.5 w-px bg-stone-200 hidden sm:block" />

                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-stone-600">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-lg border border-stone-200 bg-white px-2 py-0.5 text-xs font-bold text-stone-800 shadow-2xs focus:border-amber-500 focus:outline-hidden"
                    >
                      <option value={10}>10 rows</option>
                      <option value={15}>15 rows</option>
                      <option value={25}>25 rows</option>
                      <option value={50}>50 rows</option>
                      <option value={100}>100 rows</option>
                    </select>
                  </div>
                </div>

                {/* Numbered Pagination Buttons */}
                <div className="flex items-center gap-1">
                  {/* First Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="First Page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    title="Previous Page"
                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  {/* Page Number Buttons */}
                  <div className="flex items-center gap-1 mx-1">
                    {paginationRange.map((item, idx) => {
                      if (typeof item === 'string') {
                        return (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-1.5 text-xs font-bold text-stone-400 select-none"
                          >
                            …
                          </span>
                        );
                      }
                      const isActive = item === safeCurrentPage;
                      return (
                        <button
                          key={`page-${item}`}
                          type="button"
                          onClick={() => setCurrentPage(item)}
                          className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-xl px-2 text-xs font-extrabold transition shadow-2xs cursor-pointer ${
                            isActive
                              ? 'bg-amber-500 text-stone-950 font-black ring-2 ring-amber-500/20'
                              : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    title="Next Page"
                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 text-xs font-bold text-stone-700 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    disabled={safeCurrentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Last Page"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CATEGORY DIRECTORY (ADD, EDIT, REMOVE & REORDER CATEGORIES) */}
      {activeTab === 'categories' && (
        <div className="space-y-5">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Categories</span>
              <div className="text-xl font-extrabold text-stone-900 font-mono mt-0.5">{categories.length}</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <Coffee className="h-3 w-3" /> Drink Categories
              </span>
              <div className="text-xl font-extrabold text-amber-900 font-mono mt-0.5">{drinkCategories.length}</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1">
                <Utensils className="h-3 w-3" /> Food Categories
              </span>
              <div className="text-xl font-extrabold text-stone-800 font-mono mt-0.5">{foodCategories.length}</div>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Active Status</span>
              <div className="text-xl font-extrabold text-emerald-800 font-mono mt-0.5">
                {categories.filter((c) => (c.status || 'active') === 'active').length}
              </div>
            </div>
          </div>

          {/* Directory Controls: Search, Classification Filter & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-100/70 p-3 rounded-2xl border border-stone-200/80">
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl bg-white p-1 border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCatFilterType('all')}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                    catFilterType === 'all'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  All ({categories.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatFilterType('drinks')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                    catFilterType === 'drinks'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <Coffee className="h-3 w-3" />
                  <span>Drinks ({drinkCategories.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCatFilterType('food')}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                    catFilterType === 'food'
                      ? 'bg-amber-500 text-stone-950 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
                  }`}
                >
                  <Utensils className="h-3 w-3" />
                  <span>Food ({foodCategories.length})</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  value={catSearchQuery}
                  onChange={(e) => setCatSearchQuery(e.target.value)}
                  placeholder="Search category name..."
                  className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none shadow-2xs"
                />
                {catSearchQuery && (
                  <button
                    onClick={() => setCatSearchQuery('')}
                    className="absolute right-3 top-2 text-stone-400 hover:text-stone-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => handleOpenAddCategory()}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-extrabold text-stone-950 shadow-xs hover:bg-amber-400 transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {/* Category Directory Table */}
          <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Category Details</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5 text-center">Sort Order</th>
                    <th className="px-5 py-3.5 text-center">Linked Products</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-stone-400">
                        <Folder className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                        <p className="font-bold text-stone-600">No categories found</p>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          Try adjusting search or click "+ Add Category" to create one.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => {
                      const isDrink = isDrinkCategory(cat);
                      const itemCount = items.filter((i) => i.categoryId === cat.id).length;
                      const isActive = (cat.status || 'active') === 'active';

                      return (
                        <tr key={cat.id} className="hover:bg-stone-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs">
                                {renderCategoryIcon(cat.name, isDrink, cat.icon)}
                              </div>
                              <div>
                                <div className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                                  <span>{cat.name}</span>
                                </div>
                                <span className="text-[10px] font-mono text-stone-400">
                                  ID #{cat.id} • Icon: {cat.icon || 'Default'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${
                                isDrink
                                  ? 'bg-amber-50 text-amber-900 border border-amber-200/80'
                                  : 'bg-stone-100 text-stone-800 border border-stone-200/80'
                              }`}
                            >
                              {isDrink ? <Coffee className="h-3 w-3" /> : <Utensils className="h-3 w-3" />}
                              <span>{isDrink ? 'Beverage' : 'Food & Pastry'}</span>
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center font-mono font-bold text-stone-700">
                            <span className="px-2 py-0.5 bg-stone-100 rounded-md border border-stone-200">
                              #{cat.sortOrder ?? cat.id}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryType(isDrink ? 'drinks' : 'food');
                                setSelectedCat(cat.id);
                                setActiveTab('items');
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-amber-100 text-stone-800 hover:text-amber-900 transition font-bold text-xs cursor-pointer"
                              title="Click to filter products in this category"
                            >
                              <Package className="h-3 w-3 text-stone-500" />
                              <span className="font-mono">{itemCount}</span>
                              <span className="text-[10px] text-stone-400 font-normal">{itemCount === 1 ? 'item' : 'items'}</span>
                            </button>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus = isActive ? 'inactive' : 'active';
                                AppStore.updateCategory(cat.id, { status: nextStatus });
                                refresh();
                              }}
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition cursor-pointer ${
                                isActive
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                              }`}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </button>
                          </td>

                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Category Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditCategory(cat)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-950 font-bold transition shadow-2xs cursor-pointer"
                                title="Edit Category details"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-amber-700" />
                                <span>Edit</span>
                              </button>

                              {/* Remove Category Button */}
                              <button
                                type="button"
                                onClick={() => handleInitiateDeleteCategory(cat)}
                                className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-400 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition shadow-2xs cursor-pointer"
                                title="Remove Category"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-amber-600" />
                <h3 className="font-display text-lg font-bold text-stone-900">
                  {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategory(null);
                }}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  placeholder="e.g. Specialty Cold Brew, Artisan Waffles, Pastries"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Classification: Drinks or Food */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Category Classification / Department
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCatFormType('drinks');
                      setCatFormIcon('Coffee');
                    }}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      catFormType === 'drinks'
                        ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-2xs font-extrabold ring-1 ring-amber-400'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Coffee className="h-4 w-4 text-amber-600" />
                    <span>Drinks &amp; Beverages</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCatFormType('food');
                      setCatFormIcon('Utensils');
                    }}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      catFormType === 'food'
                        ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-2xs font-extrabold ring-1 ring-amber-400'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <Utensils className="h-4 w-4 text-amber-600" />
                    <span>Food &amp; Pastries</span>
                  </button>
                </div>
              </div>

              {/* Icon Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Choose Category Icon
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1.5 border border-stone-200 rounded-xl bg-stone-50/50">
                  {(catFormType === 'drinks' ? drinkIconOptions : foodIconOptions).map((opt) => {
                    const isSelected = catFormIcon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCatFormIcon(opt.id)}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-100/70 text-amber-950 font-bold shadow-2xs ring-1 ring-amber-400'
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        <span className={isSelected ? 'text-amber-700' : 'text-stone-500'}>
                          {opt.icon}
                        </span>
                        <span className="text-[9px] truncate w-full font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sort Order & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={catFormSortOrder}
                    onChange={(e) => setCatFormSortOrder(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs font-mono font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={catFormStatus}
                    onChange={(e) => setCatFormStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 font-bold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 flex items-center justify-between">
                <span className="text-[11px] text-stone-500 font-medium">Category Preview:</span>
                <div className="flex items-center gap-2 rounded-lg bg-white border border-stone-200 px-3 py-1.5 shadow-2xs">
                  <span className="text-amber-600">
                    {renderCategoryIcon(catFormName || 'New Category', catFormType === 'drinks', catFormIcon)}
                  </span>
                  <span className="font-bold text-xs text-stone-900">
                    {catFormName || 'Category Name'}
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold">
                    {catFormType === 'drinks' ? 'Drink' : 'Food'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-2">
                {editingCategory ? (
                  <button
                    type="button"
                    onClick={() => handleInitiateDeleteCategory(editingCategory)}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Category</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCategoryModalOpen(false);
                      setEditingCategory(null);
                    }}
                    className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}

                <div className="flex items-center gap-2">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCategoryModalOpen(false);
                        setEditingCategory(null);
                      }}
                      className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
                  >
                    {editingCategory ? 'Save Category Changes' : 'Create & Save Category'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DELETE CATEGORY WITH REASSIGNMENT MODAL */}
      {deleteCatTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-2xl bg-rose-100">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-stone-900">
                  Delete Category: {deleteCatTarget.name}
                </h3>
                <p className="text-xs text-rose-600 font-semibold">Category has active products assigned</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              The category <strong className="text-stone-900">"{deleteCatTarget.name}"</strong> currently has{' '}
              <strong className="text-stone-900 font-mono">
                {items.filter((i) => i.categoryId === deleteCatTarget.id).length}
              </strong>{' '}
              menu items. Before deleting this category, please choose a target category to reassign its items to.
            </p>

            <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200 mb-5">
              <label className="block text-xs font-bold text-stone-700 uppercase">
                Reassign Items To:
              </label>
              <select
                value={reassignTargetCatId}
                onChange={(e) => setReassignTargetCatId(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-900 font-bold focus:border-amber-500 focus:outline-none"
              >
                {categories
                  .filter((c) => c.id !== deleteCatTarget.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({isDrinkCategory(c) ? 'Beverage' : 'Food'})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteCatTarget(null)}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReassignAndDelete}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-rose-700 transition cursor-pointer"
              >
                Reassign &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT MENU ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-display text-lg font-bold text-stone-900">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spanish Latte, Pork Adobo Flakes"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-stone-700 uppercase">
                      Category
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsItemModalOpen(false);
                        handleOpenAddCategory();
                      }}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> New
                    </button>
                  </div>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none font-medium"
                  >
                    <optgroup label="☕ Drinks">
                      {drinkCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🍴 Food">
                      {foodCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Price (₱ PHP)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs text-stone-900 font-mono font-bold focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs text-stone-900 font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Temperature Type
                  </label>
                  <select
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value as any)}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="both">Both Hot &amp; Cold</option>
                    <option value="hot">Hot Only</option>
                    <option value="cold">Cold / Iced Only</option>
                    <option value="iced">Iced</option>
                    <option value="blended">Blended / Frappe</option>
                    <option value="room temp">Room Temp / Pastry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ingredients, tasting notes, allergens..."
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 p-3 text-xs text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="h-4 w-4 rounded text-amber-500 cursor-pointer"
                  />
                  <span>Available for Sale</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBestSeller}
                    onChange={(e) => setIsBestSeller(e.target.checked)}
                    className="h-4 w-4 rounded text-amber-500 cursor-pointer"
                  />
                  <span>⭐ Featured Best Seller</span>
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
                >
                  {editingItem ? 'Save Item Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Low Stock In-App Notification Modal */}
      {isLowStockModalOpen && (
        <LowStockNotificationModal
          isOpen={isLowStockModalOpen}
          onClose={() => setIsLowStockModalOpen(false)}
          categories={categories}
          activeStaff={AppStore.getActiveStaff()}
          onNavigateToInventory={() => setIsLowStockModalOpen(false)}
        />
      )}

      {/* QUICK RESTOCK MODAL */}
      {quickRestockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <PackagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-stone-900">
                    Quick Restock
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Add inventory units to this menu item
                  </p>
                </div>
              </div>
              <button
                onClick={() => setQuickRestockItem(null)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Product Card Summary */}
            <div className="mt-4 flex items-center gap-3.5 rounded-2xl bg-stone-50 p-3.5 border border-stone-200">
              <img
                src={quickRestockItem.imageUrl || '/images/latte.webp'}
                alt={quickRestockItem.name}
                className="h-12 w-12 rounded-xl object-cover border border-stone-200 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/latte.webp';
                }}
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-stone-900 text-sm truncate">
                  {quickRestockItem.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold text-stone-500 uppercase">
                    {categories.find((c) => c.id === quickRestockItem.categoryId)?.name || 'Category'}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="font-mono text-xs font-bold text-stone-700">
                    ₱{quickRestockItem.price.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-stone-400 font-bold block uppercase">Current</span>
                <span
                  className={`inline-block rounded-lg px-2 py-0.5 font-mono text-xs font-bold ${
                    quickRestockItem.quantity <= 0
                      ? 'bg-rose-100 text-rose-800'
                      : quickRestockItem.quantity <= (quickRestockItem.lowStockThreshold ?? 5)
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-stone-200 text-stone-800'
                  }`}
                >
                  {quickRestockItem.quantity} units
                </span>
              </div>
            </div>

            <form onSubmit={handleApplyQuickRestock} className="mt-5 space-y-4">
              {/* Stepper / Up Stock Down */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                  Restock Amount (Units to Add)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRestockQty((prev) => Math.max(1, prev - 1))}
                    disabled={restockQty <= 1}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-900 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs"
                    title="Down Stock (-1)"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      value={restockQty}
                      onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-12 w-full rounded-2xl border-2 border-amber-500 bg-amber-50/40 text-center font-mono text-xl font-black text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700/70">
                      units
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setRestockQty((prev) => prev + 1)}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-300 bg-stone-50 text-stone-700 hover:bg-stone-100 hover:text-stone-900 active:scale-95 transition cursor-pointer shadow-xs"
                    title="Up Stock (+1)"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Add Presets: +1, +2, +5, +10, +20 */}
              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase mb-1.5">
                  Quick Add Presets
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: '+1', val: 1 },
                    { label: '+2', val: 2 },
                    { label: '+5', val: 5 },
                    { label: '+10', val: 10 },
                    { label: '+20', val: 20 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setRestockQty((prev) => prev + preset.val)}
                      className="group flex flex-col items-center justify-center rounded-xl border border-stone-200 bg-white py-2 text-xs font-extrabold text-stone-800 hover:border-amber-500 hover:bg-amber-50/80 hover:text-amber-900 active:scale-95 transition cursor-pointer shadow-2xs"
                    >
                      <span className="font-mono">{preset.label}</span>
                      <span className="text-[9px] text-stone-400 group-hover:text-amber-700 font-semibold">
                        Add
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock Calculation Preview */}
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="text-stone-600 font-medium">
                    Current: <strong className="font-mono text-stone-900">{quickRestockItem.quantity}</strong> + Adding:{' '}
                    <strong className="font-mono text-amber-800">+{restockQty}</strong>
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Stock status will update to <strong className="text-emerald-700">Available</strong>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-900 uppercase block">New Total</span>
                  <span className="font-mono text-base font-black text-amber-950">
                    {quickRestockItem.quantity + restockQty} units
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickRestockItem(null)}
                  className="rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-xs font-extrabold text-stone-950 shadow-md hover:bg-amber-400 active:scale-98 transition cursor-pointer"
                >
                  <PackagePlus className="h-4 w-4" />
                  <span>Apply Restock (+{restockQty})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
