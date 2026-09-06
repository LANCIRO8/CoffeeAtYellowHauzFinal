import React, { useState } from 'react';
import { StoreSettings, User } from '../../types';
import { AppStore } from '../../services/store';
import { AppRouter } from '../../services/router';
import { useModal } from '../../context/ModalContext';
import {
  Settings,
  Save,
  CheckCircle2,
  RotateCcw,
  Building,
  Users,
  Shield,
  Percent,
  Trash2,
  AlertTriangle,
  Database,
  RefreshCw,
  Link,
  Copy,
  Check,
  ChefHat,
  Monitor,
  ExternalLink,
  ShoppingBag,
  Calendar,
  Coffee,
} from 'lucide-react';
import { SEED_SETTINGS } from '../../data/seedData';
import { CashierAccountManager } from './CashierAccountManager';

interface SettingsManagerProps {
  settings: StoreSettings;
  activeStaff?: User | null;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  onRefreshStaff?: () => void;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({
  settings,
  activeStaff,
  onUpdateSettings,
  onRefreshStaff,
}) => {
  const { showConfirm, showAlert } = useModal();
  const [activeTab, setActiveTab] = useState<'cashiers' | 'store' | 'portals'>('cashiers');
  const [form, setForm] = useState<StoreSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleCopy = (target: 'admin' | 'staff' | 'cook' | 'menu' | 'reservation' | 'home') => {
    const url = AppRouter.getRouteUrl(target);
    try {
      navigator.clipboard.writeText(url);
      setCopiedLink(target);
      setTimeout(() => setCopiedLink(null), 2500);
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    AppStore.saveSettings(form);
    onUpdateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDatabaseToZero = async () => {
    const ok = await showConfirm({
      title: 'Reset Database to 0 Data?',
      message:
        'This will permanently delete all order tickets, sales transactions, table reservations, and active customer sessions from both the live cloud database and local storage. Menu items and categories will remain preserved. Are you sure?',
      type: 'danger',
      confirmText: 'Yes, Reset to 0 Data',
      cancelText: 'Cancel',
    });

    if (ok) {
      setIsResettingDb(true);
      try {
        const result = await AppStore.resetDatabaseToZero();
        showAlert({
          title: 'Database Reset to 0 Data',
          message: `Database successfully cleared! Deleted ${result.deletedOrders} orders and ${result.deletedReservations} reservations. All tables are now available.`,
          type: 'success',
        });
      } catch (err) {
        showAlert({
          title: 'Reset Completed with Local Cache Cleared',
          message: 'Local store data has been reset to 0.',
          type: 'info',
        });
      } finally {
        setIsResettingDb(false);
      }
    }
  };

  const handleResetDefaults = async () => {
    const ok = await showConfirm({
      title: 'Reset Store Settings?',
      message:
        'Are you sure you want to reset all store configuration back to initial Yellow Hauz defaults?',
      type: 'warning',
      confirmText: 'Reset to Defaults',
      cancelText: 'Keep Current',
    });
    if (ok) {
      AppStore.saveSettings(SEED_SETTINGS);
      setForm(SEED_SETTINGS);
      onUpdateSettings(SEED_SETTINGS);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      showAlert({
        title: 'Settings Reset',
        message: 'Store settings have been restored to initial defaults.',
        type: 'success',
      });
    }
  };

  return (
    <div className="max-w-5xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
            System Administration
          </span>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            Admin Management &amp; Settings
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage cashier accounts, login credentials, store profile, and tax rules.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-stone-200/80 p-1 border border-stone-300/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('cashiers')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'cashiers'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Cashiers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'store'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Store Profile</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('portals')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'portals'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100'
            }`}
          >
            <Link className="h-4 w-4" />
            <span>Direct Route Links</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Cashier Accounts Management */}
      {activeTab === 'cashiers' && (
        <CashierAccountManager
          currentStaff={activeStaff || null}
          onRefreshStaff={onRefreshStaff}
        />
      )}

      {/* Tab 2: Store Profile & VAT */}
      {activeTab === 'store' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
              <Building className="h-4 w-4 text-amber-600" />
              <span>Business Profile &amp; General Configuration</span>
            </h3>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </button>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Settings successfully updated and applied across all terminals!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.shop_name}
                    onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={form.shop_phone}
                    onChange={(e) => setForm({ ...form, shop_phone: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Store Address
                </label>
                <input
                  type="text"
                  required
                  value={form.shop_address}
                  onChange={(e) => setForm({ ...form, shop_address: e.target.value })}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Business Hours
                  </label>
                  <input
                    type="text"
                    required
                    value={form.business_hours}
                    onChange={(e) => setForm({ ...form, business_hours: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    VAT / Sales Tax (%)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={form.tax_rate}
                    onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm font-mono font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Receipt Footer Note
                </label>
                <input
                  type="text"
                  required
                  value={form.receipt_footer}
                  onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer"
              >
                <Save className="h-4 w-4" />
                Save Store Configuration
              </button>
            </div>
          </form>

          {/* Database Maintenance & Zero Reset Card */}
          <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-700 border border-rose-200">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-rose-950">
                    Database Clean Slate &amp; Zero Reset
                  </h4>
                  <p className="text-xs text-rose-800/80 mt-0.5 max-w-xl">
                    Permanently wipe all live order tickets, sales transaction logs, advance table/venue reservations, and reset all floor tables to available with 0 data. Menu products and cashier logins remain preserved.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isResettingDb}
                onClick={handleResetDatabaseToZero}
                className="inline-flex items-center justify-center gap-2 shrink-0 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-rose-700 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                {isResettingDb ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Resetting to 0...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Reset Database to 0 Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Direct Route & Portal Links */}
      {activeTab === 'portals' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-amber-500/10 border border-amber-500/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-stone-950 shadow-md">
                <Link className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-extrabold text-stone-900">
                  Primary App &amp; Table QR Route Links
                </h3>
                <p className="text-xs text-stone-600 mt-0.5 max-w-2xl leading-relaxed">
                  Yellow Hauz provides instant deep-links for in-store QR dining tables, staff terminals, and customer landing pages.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. In-Store Table QR Scan Link */}
            <div className="rounded-3xl border-2 border-amber-300 bg-amber-50/40 p-5 shadow-xs space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs">
                    <Coffee className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-stone-900">In-Store Dine-in Table QR Link (e.g. Table 5)</h4>
                    <span className="text-[11px] text-amber-900 font-mono font-bold">/?table=5 (or any table #)</span>
                  </div>
                </div>
                <span className="rounded-full bg-amber-200 text-amber-950 px-2.5 py-0.5 text-[10px] font-extrabold">
                  In-Store QR
                </span>
              </div>
              <p className="text-xs text-stone-600">
                Printed on in-store table stickers/stands. When scanned by customers, it immediately binds their device to their table, opens the menu, and submits order requests to the Cashier POS for confirmation.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-amber-200/60">
                <span className="font-mono text-xs text-stone-700 truncate bg-white/80 px-3 py-1.5 rounded-xl border border-amber-200">
                  {AppRouter.getTableUrl(5)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const url = AppRouter.getTableUrl(5);
                    navigator.clipboard.writeText(url);
                    setCopiedLink('table5');
                    setTimeout(() => setCopiedLink(null), 2500);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-950 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-stone-800 transition shrink-0 cursor-pointer"
                >
                  {copiedLink === 'table5' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied Table 5 URL!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-amber-400" />
                      <span>Copy Table 5 URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Staff & Admin Login Shortcut */}
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-800">
                    <Monitor className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-stone-900">Staff &amp; Admin Login Shortcut</h4>
                    <span className="text-[11px] text-amber-800 font-mono font-bold">/?mode=staff (or /staff)</span>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                  Staff Access
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Direct shortcut for Cashiers, Cooks, and Admins to open the PIN authentication login screen without navigating through the customer store.
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <span className="font-mono text-[11px] text-stone-600 truncate mr-2">
                  {AppRouter.getRouteUrl('staff')}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('staff')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800 transition shrink-0 cursor-pointer"
                >
                  {copiedLink === 'staff' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-amber-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Customer Landing Page */}
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-stone-100 text-stone-800">
                    <ShoppingBag className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-stone-900">Customer Landing Page</h4>
                    <span className="text-[11px] text-stone-600 font-mono font-bold">/</span>
                  </div>
                </div>
                <span className="rounded-full bg-stone-100 text-stone-800 px-2 py-0.5 text-[10px] font-bold">
                  Public Storefront
                </span>
              </div>
              <p className="text-xs text-stone-500">
                The main cafe landing page where customers explore coffee specials, browse the full menu, book table reservations, and place takeaway orders.
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <span className="font-mono text-[11px] text-stone-600 truncate mr-2">
                  {AppRouter.getRouteUrl('home')}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('home')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800 transition shrink-0 cursor-pointer"
                >
                  {copiedLink === 'home' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-amber-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 4. Kitchen Display System (Cook) */}
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-800">
                    <ChefHat className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-stone-900">Kitchen Display System (KDS)</h4>
                    <span className="text-[11px] text-orange-800 font-mono font-bold">/?mode=cook</span>
                  </div>
                </div>
                <span className="rounded-full bg-orange-100 text-orange-800 px-2 py-0.5 text-[10px] font-bold">
                  Kitchen
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Direct route for Kitchen Cooks to view live prep order tickets and mark dishes ready.
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <span className="font-mono text-[11px] text-stone-600 truncate mr-2">
                  {AppRouter.getRouteUrl('cook')}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('cook')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800 transition shrink-0 cursor-pointer"
                >
                  {copiedLink === 'cook' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-amber-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 5. Venue & Table Reservations */}
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
                    <Calendar className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-stone-900">Table &amp; Venue Reservation</h4>
                    <span className="text-[11px] text-emerald-800 font-mono font-bold">/?tab=reservation</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                  Public Booking
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Direct booking link for customers reserving dining tables or booking the private Yellow Hauz function venue.
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <span className="font-mono text-[11px] text-stone-600 truncate mr-2">
                  {AppRouter.getRouteUrl('reservation')}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('reservation')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-stone-800 transition shrink-0 cursor-pointer"
                >
                  {copiedLink === 'reservation' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-amber-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
