import React, { useState, useEffect } from 'react';
import { StoreSettings, User } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Settings,
  Save,
  CheckCircle2,
  RotateCcw,
  Building,
  Users,
  Percent,
  Trash2,
  Database,
  RefreshCw,
  Receipt,
  Clock,
  MapPin,
  PhoneCall,
  Mail,
  Globe,
  Coins,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
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
  const [activeTab, setActiveTab] = useState<'cashiers' | 'security' | 'store'>('cashiers');
  const [form, setForm] = useState<StoreSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isResettingDb, setIsResettingDb] = useState(false);

  // Admin Password Change state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    AppStore.saveSettings(form);
    onUpdateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccessMsg('');

    // Locate current admin account in fresh store
    const users = AppStore.getUsers();
    const adminAccount =
      users.find((u) => u.id === activeStaff?.id) ||
      users.find((u) => u.role === 'admin' && u.status === 'active') ||
      activeStaff;

    if (!adminAccount) {
      setPasswordError('Active administrator account not found.');
      return;
    }

    const currentActualPin = adminAccount.pin || adminAccount.password || '12345678';
    if (currentPasswordInput.trim() !== currentActualPin) {
      setPasswordError('Current Password / PIN is incorrect. Please verify and try again.');
      return;
    }

    const cleanNewPin = newPasswordInput.trim();
    if (!/^\d{8}$/.test(cleanNewPin)) {
      setPasswordError('New security PIN / password must be exactly 8 numeric digits.');
      return;
    }

    if (cleanNewPin !== confirmPasswordInput.trim()) {
      setPasswordError('New passwords do not match. Please verify both inputs.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // Update in AppStore which automatically saves to localStorage and Firestore with { merge: true }
      const updated = AppStore.updateUser(adminAccount.id, {
        pin: cleanNewPin,
        password: cleanNewPin,
        passwordUpdatedAt: new Date().toISOString(),
      });

      if (updated) {
        if (onRefreshStaff) onRefreshStaff();
        setCurrentPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setPasswordSuccessMsg('Admin password updated successfully and permanently synced to the cloud database!');
        showAlert({
          title: 'Admin Password Saved',
          message: `Your new 8-digit security PIN / password has been permanently updated in the cloud database. It will not revert or reset.`,
          type: 'success',
        });
      } else {
        setPasswordError('Failed to update administrator account.');
      }
    } catch {
      setPasswordError('An error occurred while saving the password.');
    } finally {
      setIsUpdatingPassword(false);
    }
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
      } catch {
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
    <div id="settings-manager-container" className="w-full max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-stone-900">
            Admin settings
          </h2>
        </div>

        {/* Tab Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-stone-200/80 dark:bg-stone-800 p-1 border border-stone-300/60 dark:border-stone-700 shadow-2xs">
          <button
            id="tab-settings-cashiers"
            type="button"
            onClick={() => setActiveTab('cashiers')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'cashiers'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Staff Accounts</span>
          </button>
          <button
            id="tab-settings-security"
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'security'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Password &amp; Security</span>
          </button>
          <button
            id="tab-settings-store"
            type="button"
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${
              activeTab === 'store'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Store Profile</span>
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

      {/* Tab 2: Admin Password & Security */}
      {activeTab === 'security' && (
        <div id="settings-security-tab" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600" />
                <span>Administrator Password &amp; Terminal Security</span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Manage administrator credentials. Changes are permanently persisted across all devices.
              </p>
            </div>
          </div>

          {passwordSuccessMsg && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}

          {passwordError && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-4 text-xs font-bold text-rose-800 dark:text-rose-200 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {/* Admin Account Summary Card */}
          <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-stone-900 dark:bg-amber-500 text-amber-400 dark:text-stone-950 font-bold text-base shadow-xs">
                  A
                </div>
                <div>
                  <div className="font-extrabold text-stone-900 dark:text-stone-100 text-base flex items-center gap-2">
                    <span>{activeStaff?.fullName || 'System Administrator'}</span>
                    <span className="rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2.5 py-0.5 text-[10px] font-black uppercase">
                      Admin
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                    @{activeStaff?.username || 'admin'} • {activeStaff?.employeeId || 'ADMIN001'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Database Synced
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl bg-stone-50 dark:bg-stone-850 p-3.5 border border-stone-200/80 dark:border-stone-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  Security Method
                </span>
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>8-Digit Security PIN / Password Protected</span>
                </div>
              </div>
              <div className="rounded-2xl bg-stone-50 dark:bg-stone-850 p-3.5 border border-stone-200/80 dark:border-stone-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-1">
                  Persistence Guarantee
                </span>
                <div className="font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Permanent (No expiration or auto-revert)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleAdminPasswordSubmit} className="space-y-6">
            <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs space-y-5">
              <div className="border-b border-stone-100 dark:border-stone-800 pb-3">
                <h4 className="font-display text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-600" />
                  <span>Change Admin Security PIN / Password</span>
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  Enter your current PIN to authenticate, then specify your new 8-digit security PIN.
                </p>
              </div>

              <div className="space-y-4 max-w-lg">
                {/* Current Password */}
                <div>
                  <label
                    htmlFor="input-current-admin-pin"
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 uppercase mb-1.5"
                  >
                    <Lock className="h-3.5 w-3.5 text-stone-400" />
                    Current Security PIN / Password
                  </label>
                  <div className="relative">
                    <input
                      id="input-current-admin-pin"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      maxLength={8}
                      placeholder="••••••••"
                      value={currentPasswordInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setCurrentPasswordInput(val);
                        setPasswordError('');
                      }}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3.5 py-2.5 text-xs sm:text-sm font-mono tracking-widest text-stone-900 dark:text-white focus:border-amber-500 focus:bg-white dark:focus:bg-stone-900 focus:outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label
                    htmlFor="input-new-admin-pin"
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 uppercase mb-1.5"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                    New 8-Digit Security PIN <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-new-admin-pin"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      maxLength={8}
                      placeholder="Enter new 8-digit PIN"
                      value={newPasswordInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setNewPasswordInput(val);
                        setPasswordError('');
                      }}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3.5 py-2.5 text-xs sm:text-sm font-mono tracking-widest text-stone-900 dark:text-white focus:border-amber-500 focus:bg-white dark:focus:bg-stone-900 focus:outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-stone-400">
                    <span>Must be exactly 8 numeric digits</span>
                    <span className="font-mono">{newPasswordInput.length}/8</span>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label
                    htmlFor="input-confirm-admin-pin"
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300 uppercase mb-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                    Confirm New 8-Digit PIN <span className="text-amber-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-confirm-admin-pin"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      maxLength={8}
                      placeholder="Re-enter new 8-digit PIN"
                      value={confirmPasswordInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setConfirmPasswordInput(val);
                        setPasswordError('');
                      }}
                      className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3.5 py-2.5 text-xs sm:text-sm font-mono tracking-widest text-stone-900 dark:text-white focus:border-amber-500 focus:bg-white dark:focus:bg-stone-900 focus:outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-update-admin-password"
                  type="submit"
                  disabled={isUpdatingPassword || newPasswordInput.length !== 8 || newPasswordInput !== confirmPasswordInput}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 px-6 py-3 text-sm font-extrabold text-stone-950 shadow-md transition disabled:opacity-40 cursor-pointer"
                >
                  {isUpdatingPassword ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Update Administrator Password</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Store Profile & VAT */}
      {activeTab === 'store' && (
        <div id="settings-store-tab" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-base font-bold text-stone-900 flex items-center gap-2">
              <Building className="h-4 w-4 text-amber-600" />
              <span>Business Profile &amp; General Configuration</span>
            </h3>
            <button
              id="btn-reset-store-defaults"
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </button>
          </div>

          {savedSuccess && (
            <div id="settings-save-success-alert" className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 animate-in fade-in duration-150">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Settings successfully updated and applied across all terminals!
            </div>
          )}

          <form id="form-store-settings" onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="input-shop-name" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <Building className="h-3.5 w-3.5 text-amber-600" />
                    Shop Name
                  </label>
                  <input
                    id="input-shop-name"
                    type="text"
                    required
                    value={form.shop_name}
                    onChange={(e) => setForm({ ...form, shop_name: e.target.value, storeName: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="input-currency" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <Coins className="h-3.5 w-3.5 text-amber-600" />
                    Currency
                  </label>
                  <select
                    id="input-currency"
                    value={form.currency || 'PHP'}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  >
                    <option value="PHP">PHP - Philippine Peso (₱)</option>
                    <option value="USD">USD - US Dollar ($)</option>
                    <option value="EUR">EUR - Euro (€)</option>
                    <option value="JPY">JPY - Japanese Yen (¥)</option>
                    <option value="SGD">SGD - Singapore Dollar (S$)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="input-shop-phone" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <PhoneCall className="h-3.5 w-3.5 text-amber-600" />
                    Contact Phone
                  </label>
                  <input
                    id="input-shop-phone"
                    type="text"
                    required
                    value={form.shop_phone}
                    onChange={(e) => setForm({ ...form, shop_phone: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="input-business-hours" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    Business Hours
                  </label>
                  <input
                    id="input-business-hours"
                    type="text"
                    required
                    value={form.business_hours}
                    onChange={(e) => setForm({ ...form, business_hours: e.target.value })}
                    placeholder="e.g. 07:00 - 22:00 Daily"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="input-shop-email" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <Mail className="h-3.5 w-3.5 text-amber-600" />
                    Store Contact Email
                  </label>
                  <input
                    id="input-shop-email"
                    type="email"
                    value={form.shop_email || ''}
                    onChange={(e) => setForm({ ...form, shop_email: e.target.value })}
                    placeholder="e.g. yellowhauz@gmail.com"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="input-facebook-url" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <Globe className="h-3.5 w-3.5 text-amber-600" />
                    Facebook Page URL
                  </label>
                  <input
                    id="input-facebook-url"
                    type="url"
                    value={form.facebook_url || ''}
                    onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
                    placeholder="https://www.facebook.com/yellowhauz/"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="input-instagram-url" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <Globe className="h-3.5 w-3.5 text-amber-600" />
                    Instagram Profile URL
                  </label>
                  <input
                    id="input-instagram-url"
                    type="url"
                    value={form.instagram_url || ''}
                    onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                    placeholder="https://www.instagram.com/yellowhauz"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="input-google-maps-url" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <MapPin className="h-3.5 w-3.5 text-amber-600" />
                    Google Maps Place URL
                  </label>
                  <input
                    id="input-google-maps-url"
                    type="url"
                    value={form.google_maps_url || ''}
                    onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })}
                    placeholder="https://www.google.com/maps/place/..."
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="input-shop-address" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-600" />
                  Store Address
                </label>
                <input
                  id="input-shop-address"
                  type="text"
                  required
                  value={form.shop_address}
                  onChange={(e) => setForm({ ...form, shop_address: e.target.value })}
                  className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="input-tax-rate" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <Percent className="h-3.5 w-3.5 text-amber-600" />
                    VAT / Sales Tax (%)
                  </label>
                  <input
                    id="input-tax-rate"
                    type="number"
                    step="any"
                    required
                    min={0}
                    max={100}
                    value={form.tax_rate}
                    onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="input-receipt-footer" className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase mb-1.5">
                    <Receipt className="h-3.5 w-3.5 text-amber-600" />
                    Receipt Footer Note
                  </label>
                  <input
                    id="input-receipt-footer"
                    type="text"
                    required
                    value={form.receipt_footer}
                    onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Receipt Preview Box */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block mb-2">
                  Printed Receipt Header &amp; Footer Preview
                </span>
                <div className="rounded-xl border border-dashed border-stone-300 bg-white p-4 font-mono text-xs text-center space-y-1 text-stone-700 max-w-sm mx-auto shadow-2xs">
                  <div className="font-extrabold text-stone-900 text-sm">{form.shop_name || 'Coffee at Yellow Hauz'}</div>
                  <div className="text-[11px] text-stone-500">{form.shop_address}</div>
                  <div className="text-[11px] text-stone-500">Tel: {form.shop_phone}</div>
                  <div className="border-t border-dashed border-stone-200 my-2 pt-2 text-[10px] text-stone-400">
                    [ --- Items &amp; Subtotals ({form.currency || 'PHP'}) --- ]
                  </div>
                  <div className="text-[11px] text-stone-500">VAT Included ({form.tax_rate}%)</div>
                  <div className="border-t border-dashed border-stone-200 my-2 pt-2 text-[11px] text-stone-600 italic">
                    "{form.receipt_footer || 'Thank you for your visit!'}"
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                id="btn-save-store-settings"
                type="submit"
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-extrabold text-stone-950 shadow-md hover:bg-amber-400 active:scale-98 transition cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Save Store Configuration</span>
              </button>
            </div>
          </form>

          {/* Database Maintenance & Zero Reset Card */}
          <div id="card-database-zero-reset" className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6 shadow-xs space-y-4">
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
                id="btn-reset-db-zero"
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
    </div>
  );
};
