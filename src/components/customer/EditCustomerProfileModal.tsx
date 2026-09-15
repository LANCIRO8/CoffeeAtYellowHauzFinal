import React, { useState } from 'react';
import { CustomerAccount } from '../../types';
import { AppStore } from '../../services/store';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  Save,
  CheckCircle2,
} from 'lucide-react';

interface EditCustomerProfileModalProps {
  isOpen: boolean;
  customer: CustomerAccount;
  onClose: () => void;
  onSaveSuccess: (updated: CustomerAccount) => void;
}

export const EditCustomerProfileModal: React.FC<EditCustomerProfileModalProps> = ({
  isOpen,
  customer,
  onClose,
  onSaveSuccess,
}) => {
  // Credentials State
  const [fullName, setFullName] = useState(customer.fullName || '');
  const [email, setEmail] = useState(customer.email || '');
  const [contactNumber, setContactNumber] = useState(customer.contactNumber || '');
  
  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  // Password Strength Calculation
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: 'None', color: 'bg-stone-200' };
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;

    if (s <= 1) return { score: 1, text: 'Weak', color: 'bg-rose-500' };
    if (s === 2) return { score: 2, text: 'Fair', color: 'bg-amber-500' };
    if (s === 3) return { score: 3, text: 'Good', color: 'bg-emerald-500' };
    return { score: 4, text: 'Strong', color: 'bg-emerald-600' };
  };

  const strength = calculateStrength(newPassword);

  const handleSave = () => {
    setError(null);

    // Validate Credentials
    if (!fullName.trim()) {
      setError('Please provide your full name');
      return;
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid email address (e.g. name@example.com)');
      return;
    }

    const cleanPhone = contactNumber.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      setError('Please provide a valid contact phone number');
      return;
    }

    // Password Validation if enabled
    if (isChangingPassword) {
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }

    const updatedCustomer: CustomerAccount = {
      ...customer,
      fullName: fullName.trim(),
      email: email.trim(),
      contactNumber: cleanPhone,
      password: isChangingPassword ? newPassword : customer.password,
    };

    // Persist changes
    AppStore.saveCustomerAccount(updatedCustomer);
    AppStore.setActiveCustomer(updatedCustomer);

    setSuccessNotice(true);
    setTimeout(() => {
      onSaveSuccess(updatedCustomer);
      onClose();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-stone-950 font-display font-extrabold text-lg shadow-2xs">
              {(fullName || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-stone-900">
                Edit Credentials &amp; Profile
              </h2>
              <p className="text-xs text-stone-500">
                Yellow Hauz Customer Account #{customer.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Maria Santos"
                className="w-full rounded-xl border border-stone-200 pl-10 pr-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Shown on your order tickets, table reservations, and receipts.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-stone-200 pl-10 pr-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Used for account sign in, loyalty rewards, and electronic receipts.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Contact / Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+63 917 123 4567"
                className="w-full rounded-xl border border-stone-200 pl-10 pr-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              Kitchen staff reach you through this number for table reservations and orders.
            </p>
          </div>

          {/* Password Section */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-stone-900">
                  Security &amp; Password
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChangingPassword}
                  onChange={(e) => setIsChangingPassword(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                <span className="ml-2 text-xs font-bold text-stone-600">
                  Update Password
                </span>
              </label>
            </div>

            {isChangingPassword ? (
              <div className="space-y-3 pt-2 border-t border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-stone-200 pl-10 pr-10 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      className="w-full rounded-xl border border-stone-200 pl-10 pr-3.5 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">Strength:</span>
                      <span className="font-bold text-stone-700">{strength.text}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden flex gap-1">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 1 ? strength.color : 'bg-transparent'
                        } w-1/4`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 2 ? strength.color : 'bg-transparent'
                        } w-1/4`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 3 ? strength.color : 'bg-transparent'
                        } w-1/4`}
                      />
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score >= 4 ? strength.color : 'bg-transparent'
                        } w-1/4`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-stone-500">
                Password credentials protect your account sign-in and profile security.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-200 bg-stone-50 px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer ${
              successNotice
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
            }`}
          >
            {successNotice ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Credentials</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
