import React, { useState, useMemo, useEffect } from 'react';
import { CustomerAccount, Order, Reservation, StoreSettings, MenuItem } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  User,
  Mail,
  Phone,
  ShoppingBag,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Heart,
  Bookmark,
  Star,
  Sparkles,
  Plus,
  Check,
  ArrowRight,
  Coffee,
  Edit3,
  MapPin,
  Shield,
} from 'lucide-react';
import { EditCustomerProfileModal } from './EditCustomerProfileModal';

interface CustomerAccountProps {
  customer: CustomerAccount;
  settings: StoreSettings;
  onLogout: () => void;
  onViewReceipt: (order: Order) => void;
  onNavigateOrders?: () => void;
  onNavigateMenu?: () => void;
  onAddToCart?: (item: MenuItem) => void;
  onCustomerUpdate?: (customer: CustomerAccount) => void;
}

export const CustomerAccountView: React.FC<CustomerAccountProps> = ({
  customer,
  settings,
  onLogout,
  onViewReceipt,
  onNavigateOrders,
  onNavigateMenu,
  onAddToCart,
  onCustomerUpdate,
}) => {
  const { showConfirm, showAlert } = useModal();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const allOrders = useMemo(() => AppStore.getOrders(), []);
  const allReservations = useMemo(() => AppStore.getReservations(), []);
  const allMenuItems = useMemo(() => AppStore.getMenuItems(), []);
  const allCategories = useMemo(() => AppStore.getCategories(), []);

  // Customer Favorites & Likes State
  const [favIds, setFavIds] = useState<number[]>(() =>
    AppStore.getCustomerFavorites(customer.id)
  );
  const [likeIds, setLikeIds] = useState<number[]>(() =>
    AppStore.getCustomerLikes(customer.id)
  );
  const [savedTab, setSavedTab] = useState<'all' | 'favorites' | 'likes'>('all');
  const [addedAnimationId, setAddedAnimationId] = useState<number | null>(null);

  // Sync with AppStore updates
  useEffect(() => {
    const sync = () => {
      setFavIds(AppStore.getCustomerFavorites(customer.id));
      setLikeIds(AppStore.getCustomerLikes(customer.id));
    };
    const unsub = AppStore.subscribe(sync);
    return () => unsub();
  }, [customer.id]);

  const handleToggleFavorite = (itemId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = AppStore.toggleCustomerFavorite(itemId, customer.id);
    setFavIds(res.favoriteItemIds);
    if (onCustomerUpdate) {
      const updated = AppStore.getActiveCustomer();
      if (updated) onCustomerUpdate(updated);
    }
  };

  const handleToggleLike = (itemId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const res = AppStore.toggleCustomerLike(itemId, customer.id);
    setLikeIds(res.likedItemIds);
    if (onCustomerUpdate) {
      const updated = AppStore.getActiveCustomer();
      if (updated) onCustomerUpdate(updated);
    }
  };

  const handleAddItemToCart = (item: MenuItem) => {
    if (onAddToCart) {
      onAddToCart(item);
      setAddedAnimationId(item.id);
      setTimeout(() => setAddedAnimationId(null), 1800);
    }
  };

  // Filtered lists of menu items
  const favoriteItems = useMemo(
    () => allMenuItems.filter((item) => favIds.includes(item.id)),
    [allMenuItems, favIds]
  );

  const likedItems = useMemo(
    () => allMenuItems.filter((item) => likeIds.includes(item.id)),
    [allMenuItems, likeIds]
  );

  const allSavedItems = useMemo(() => {
    const combinedMap = new Map<number, MenuItem>();
    favoriteItems.forEach((it) => combinedMap.set(it.id, it));
    likedItems.forEach((it) => combinedMap.set(it.id, it));
    return Array.from(combinedMap.values());
  }, [favoriteItems, likedItems]);

  const displayedSavedItems = useMemo(() => {
    if (savedTab === 'favorites') return favoriteItems;
    if (savedTab === 'likes') return likedItems;
    return allSavedItems;
  }, [savedTab, favoriteItems, likedItems, allSavedItems]);

  // Filter for customer
  const customerOrders = useMemo(() => {
    return allOrders.filter(
      (o) =>
        o.customerId === customer.id ||
        (o.customerName && o.customerName.toLowerCase() === customer.fullName.toLowerCase())
    );
  }, [allOrders, customer]);

  const customerReservations = useMemo(() => {
    return allReservations.filter(
      (r) =>
        r.customerId === customer.id ||
        (customer.fullName &&
          r.customerName &&
          r.customerName.toLowerCase() === customer.fullName.toLowerCase())
    );
  }, [allReservations, customer]);

  const handleCancelReservation = async (id: number) => {
    const ok = await showConfirm({
      title: 'Cancel Reservation?',
      message: 'Are you sure you want to cancel this reservation booking?',
      type: 'danger',
      confirmText: 'Yes, Cancel',
      cancelText: 'Keep Booking',
    });
    if (ok) {
      AppStore.updateReservationStatus(id, 'cancelled');
      showAlert({
        title: 'Cancelled',
        message: 'Your reservation has been cancelled.',
        type: 'info',
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Profile Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500 text-stone-950 font-display text-2xl font-extrabold shadow-sm shrink-0">
            {(customer.fullName || 'C').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Customer Account
              </span>
              {customer.loyaltyPoints !== undefined && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 bg-amber-400/20 px-2 py-0.5 rounded-md">
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  {customer.loyaltyPoints} Points
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-stone-900 font-display">
              {customer.fullName || 'Customer'}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-stone-400" />
                {customer.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-stone-400" />
                {customer.contactNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="account-edit-profile-btn-header"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 px-4 py-2.5 text-xs font-black text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Edit3 className="h-4 w-4 text-amber-400" />
            <span>Edit Credentials</span>
          </button>
          {onNavigateMenu && (
            <button
              onClick={onNavigateMenu}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2.5 text-xs font-black text-stone-950 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Coffee className="h-4 w-4" />
              <span>Browse Menu</span>
            </button>
          )}
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CREDENTIALS & SECURITY OVERVIEW */}
      {/* ========================================================================= */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800">
                <Shield className="h-3.5 w-3.5 text-amber-500" />
                Account Credentials
              </span>
            </div>
            <h2 className="font-display text-xl font-bold text-stone-900 mt-1">
              Credentials &amp; Security
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Personal credentials and password security settings.
            </p>
          </div>

          <button
            type="button"
            id="account-edit-profile-btn"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <Edit3 className="h-4 w-4 text-stone-950" />
            <span>Edit Credentials</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Credentials */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-700">
                  <User className="h-4 w-4 text-amber-600" />
                  <span>Personal Details</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Full Name</span>
                  <span className="font-bold text-stone-900 text-sm">{customer.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Customer ID</span>
                  <span className="font-mono text-stone-700">#{customer.id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Email Address</span>
                  <span className="text-stone-700 break-all">{customer.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Contact Number</span>
                  <span className="text-stone-700 font-mono">{customer.contactNumber}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 transition cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Update Information</span>
            </button>
          </div>

          {/* Card 2: Security & Protection */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-700">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <span>Account Security</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                  {customer.password ? 'Protected' : 'Standard'}
                </span>
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">Password Status</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {customer.password ? '●●●●●●●● (Password Protected)' : 'Default Account Access'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Credentials are used for table reservations, digital order tickets, and logging in on new devices.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 transition cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Change Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* Taste Profile Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setSavedTab('favorites')}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition text-left cursor-pointer ${
            savedTab === 'favorites'
              ? 'border-amber-400 bg-amber-50/70 shadow-xs'
              : 'border-stone-200 bg-white hover:border-stone-300'
          }`}
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <Bookmark className="h-5 w-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <span className="block text-xl font-display font-black text-stone-900">
              {favoriteItems.length}
            </span>
            <span className="block text-[11px] font-bold text-stone-500">Saved Favorites</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSavedTab('likes')}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition text-left cursor-pointer ${
            savedTab === 'likes'
              ? 'border-rose-400 bg-rose-50/70 shadow-xs'
              : 'border-stone-200 bg-white hover:border-stone-300'
          }`}
        >
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-600">
            <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
          </div>
          <div>
            <span className="block text-xl font-display font-black text-stone-900">
              {likedItems.length}
            </span>
            <span className="block text-[11px] font-bold text-stone-500">Liked Dishes</span>
          </div>
        </button>

        <div className="flex items-center gap-3 p-4 rounded-2xl border border-stone-200 bg-white">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-stone-100 text-stone-700">
            <ShoppingBag className="h-5 w-5 text-stone-700" />
          </div>
          <div>
            <span className="block text-xl font-display font-black text-stone-900">
              {customerOrders.length}
            </span>
            <span className="block text-[11px] font-bold text-stone-500">Past Orders</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-2xl border border-stone-200 bg-white">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-stone-100 text-stone-700">
            <Calendar className="h-5 w-5 text-stone-700" />
          </div>
          <div>
            <span className="block text-xl font-display font-black text-stone-900">
              {customerReservations.length}
            </span>
            <span className="block text-[11px] font-bold text-stone-500">Reservations</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FAVORITES & LIKED ITEMS SECTION */}
      {/* ========================================================================= */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-800">
                <Bookmark className="h-3.5 w-3.5 text-amber-500" />
                Saved Collections
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900">
              Favorites &amp; Liked Items
            </h2>
            <p className="text-xs sm:text-sm text-stone-500">
              Remember your go-to coffees, signature comfort foods, and re-order with a single tap.
            </p>
          </div>

          {/* Tab Filter Switcher */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setSavedTab('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                savedTab === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Saved ({allSavedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setSavedTab('favorites')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                savedTab === 'favorites'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              <span>Favorites ({favoriteItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSavedTab('likes')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                savedTab === 'likes'
                  ? 'bg-white text-rose-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              <span>Liked ({likedItems.length})</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {displayedSavedItems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 p-8 sm:p-12 text-center space-y-4">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700">
              {savedTab === 'likes' ? (
                <Heart className="h-8 w-8 text-rose-500" />
              ) : (
                <Bookmark className="h-8 w-8 text-amber-600" />
              )}
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-display text-base sm:text-lg font-bold text-stone-900">
                {savedTab === 'favorites'
                  ? 'No favorite items saved yet'
                  : savedTab === 'likes'
                  ? 'No liked items yet'
                  : 'Your favorites and liked list is empty'}
              </h3>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
                When you browse the Coffee at Yellow Hauz menu, tap the{' '}
                <span className="font-bold text-amber-700">⭐ Bookmark</span> to save your favorite dishes, or the{' '}
                <span className="font-bold text-rose-600">❤️ Heart</span> to like drinks. They will stay saved in your account for quick re-ordering!
              </p>
            </div>
            {onNavigateMenu && (
              <button
                type="button"
                onClick={onNavigateMenu}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-black text-stone-950 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>Browse Menu to Add Favorites</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          /* Grid of Saved / Liked Items */
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {displayedSavedItems.map((item) => {
              const category = allCategories.find((c) => c.id === item.categoryId);
              const isFav = favIds.includes(item.id);
              const isLiked = likeIds.includes(item.id);
              const isJustAdded = addedAnimationId === item.id;

              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xs hover:shadow-md hover:border-amber-400 transition-all duration-200"
                >
                  {/* Photo with badges & actions */}
                  <div className="relative aspect-16/10 w-full overflow-hidden bg-stone-100">
                    <img
                      src={item.imageUrl || '/01_Hearts_Latte_Art.jpg'}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/01_Hearts_Latte_Art.jpg';
                      }}
                    />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1 z-10">
                      {item.isBestSeller && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-stone-950 shadow-xs">
                          <Star className="h-2.5 w-2.5 fill-stone-950 text-stone-950" />
                          <span>Best Seller</span>
                        </span>
                      )}
                      {category && (
                        <span className="rounded-full bg-stone-950/80 backdrop-blur-xs px-2 py-0.5 text-[9px] font-bold text-white shadow-xs capitalize">
                          {category.name}
                        </span>
                      )}
                    </div>

                    {/* Like & Favorite Pill in Top Right */}
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-stone-900/75 backdrop-blur-md p-1 border border-white/10 shadow-md">
                      <button
                        type="button"
                        onClick={(e) => handleToggleLike(item.id, e)}
                        className="grid h-6 w-6 place-items-center rounded-full text-white transition hover:scale-110 active:scale-90 cursor-pointer"
                        title={isLiked ? 'Liked' : 'Like'}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${
                            isLiked ? 'fill-red-500 text-red-500' : 'text-white'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className="grid h-6 w-6 place-items-center rounded-full text-white transition hover:scale-110 active:scale-90 cursor-pointer"
                        title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                      >
                        <Bookmark
                          className={`h-3.5 w-3.5 ${
                            isFav ? 'fill-amber-400 text-amber-400' : 'text-white'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Price Tag in Bottom Right */}
                    <div className="absolute bottom-2.5 right-2.5 rounded-xl bg-stone-950/90 backdrop-blur-xs px-2.5 py-1 shadow-md border border-white/10">
                      <span className="font-mono text-xs sm:text-sm font-black text-amber-400">
                        ₱{item.price.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {isFav && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            <Bookmark className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            Favorite
                          </span>
                        )}
                        {isLiked && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            <Heart className="h-2.5 w-2.5 fill-rose-500 text-rose-500" />
                            Liked
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-display text-base font-bold text-stone-900 line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {item.description || 'Prepared fresh with high quality ingredients.'}
                      </p>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                      <span className="text-[11px] font-bold text-stone-400">
                        {item.quantity > 0 ? (
                          <span className="text-emerald-700">In Stock</span>
                        ) : (
                          <span className="text-stone-500">Available</span>
                        )}
                      </span>

                      {onAddToCart && (
                        <button
                          type="button"
                          onClick={() => handleAddItemToCart(item)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Added to Cart</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add to Cart</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* RESERVATIONS & ORDERS HISTORY GRID */}
      {/* ========================================================================= */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Table Reservations History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              <h2 className="font-display text-lg font-bold text-stone-900">
                Your Bookings &amp; Events ({customerReservations.length})
              </h2>
            </div>
          </div>

          {customerReservations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500 text-xs">
              No reservation records found.
            </div>
          ) : (
            <div className="space-y-3">
              {customerReservations.map((res) => {
                const isVenue = res.bookingType === 'venue';
                return (
                  <div
                    key={res.id}
                    className={`rounded-2xl border bg-white p-4 shadow-xs space-y-2 text-xs ${
                      isVenue ? 'border-amber-300 ring-1 ring-amber-400/20' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {res.reservationCode}
                        </span>
                        {isVenue && (
                          <span className="rounded-full bg-stone-900 text-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            🏢 Private Studio Venue
                          </span>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                          res.status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : res.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {res.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-stone-600 pt-1">
                      <div>
                        <span className="text-stone-400 block">
                          {isVenue ? 'Venue Space & Guests:' : 'Table:'}
                        </span>
                        <span className="font-bold text-stone-800">
                          {isVenue
                            ? `Private Studio (${res.guestCount} Guests)`
                            : `Table #${res.tableNumber} (${res.guestCount} Guests)`}
                        </span>
                        {isVenue && res.eventType && (
                          <span className="text-[10px] text-stone-500 block truncate">
                            {res.eventType}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-stone-400 block">Date &amp; Schedule:</span>
                        <span className="font-bold text-stone-800">
                          {new Date(res.reservationAt).toLocaleString('en-PH', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                        {isVenue && (
                          <span className="text-[10px] font-bold text-amber-800 block">
                            {res.venueDurationHours || 3} Hours • ₱{(res.totalAmount || 3500).toLocaleString('en-PH', { minimumFractionDigits: 2 })} (Consumable)
                          </span>
                        )}
                      </div>
                    </div>

                    {res.notes && (
                      <p className="text-stone-500 italic pt-1 border-t border-stone-100">
                        "{res.notes}"
                      </p>
                    )}

                    {res.status === 'pending' && (
                      <div className="pt-2 border-t border-stone-100 flex justify-end">
                        <button
                          onClick={() => handleCancelReservation(res.id)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          Cancel Booking
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Online Orders History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-600" />
              <h2 className="font-display text-lg font-bold text-stone-900">
                Order History ({customerOrders.length})
              </h2>
            </div>
            {onNavigateOrders && (
              <button
                onClick={onNavigateOrders}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
              >
                Open Live Tracker →
              </button>
            )}
          </div>

          {customerOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500 text-xs">
              No orders placed yet.
            </div>
          ) : (
            <div className="space-y-3">
              {customerOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-stone-900">{ord.orderNumber}</span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </span>
                      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-stone-600">
                        {ord.channel === 'online' ? '🌐 Online' : '🏪 In-Store'}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        ord.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ord.status === 'to_serve'
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          : ord.status === 'processing'
                          ? 'bg-sky-100 text-sky-800'
                          : ord.status === 'to_prep'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {ord.status === 'to_confirm' || ord.status === 'pending'
                        ? '⏳ Under Review'
                        : ord.status === 'to_prep'
                        ? '📋 Sent to Kitchen'
                        : ord.status === 'processing'
                        ? '👨‍🍳 Kitchen Preparing'
                        : ord.status === 'to_serve'
                        ? '🔔 Ready to Serve'
                        : ord.status === 'completed'
                        ? '✅ Completed'
                        : ord.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-stone-600 border-y border-stone-100 py-2">
                    {ord.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          {it.quantity}x {it.name}
                        </span>
                        <span className="font-mono">₱{it.totalPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-stone-400">Total: </span>
                      <span className="font-mono font-bold text-amber-800 text-sm">
                        ₱{ord.totalAmount.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => onViewReceipt(ord)}
                      className="rounded-lg px-3 py-1 text-xs font-bold transition bg-stone-100 hover:bg-stone-200 text-stone-800 cursor-pointer"
                    >
                      View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Profile & Credentials Modal */}
      {isEditModalOpen && (
        <EditCustomerProfileModal
          isOpen={isEditModalOpen}
          customer={customer}
          onClose={() => setIsEditModalOpen(false)}
          onSaveSuccess={(updated) => {
            if (onCustomerUpdate) {
              onCustomerUpdate(updated);
            }
          }}
        />
      )}
    </div>
  );
};
