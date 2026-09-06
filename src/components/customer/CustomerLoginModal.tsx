import React, { useState, useMemo } from 'react';
import { AppStore } from '../../services/store';
import { CustomerAccount } from '../../types';
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Shield,
  KeyRound,
} from 'lucide-react';

interface CustomerLoginModalProps {
  onClose: () => void;
  onSuccess: (customer: CustomerAccount) => void;
}

export const CustomerLoginModal: React.FC<CustomerLoginModalProps> = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [error, setError] = useState('');

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) {
      return {
        score: 0,
        label: 'None',
        barColor: 'bg-stone-200',
        textColor: 'text-stone-400',
        badgeBg: 'bg-stone-100 text-stone-600',
      };
    }

    const rulesMetCount = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;

    if (password.length < 8) {
      return {
        score: 1,
        label: 'Too Short',
        barColor: 'bg-rose-500',
        textColor: 'text-rose-600',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }

    if (rulesMetCount <= 2) {
      return {
        score: 2,
        label: 'Weak',
        barColor: 'bg-amber-500',
        textColor: 'text-amber-600',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }

    if (rulesMetCount === 3 || rulesMetCount === 4) {
      return {
        score: 3,
        label: 'Good',
        barColor: 'bg-lime-500',
        textColor: 'text-lime-700',
        badgeBg: 'bg-lime-50 text-lime-800 border-lime-200',
      };
    }

    return {
      score: 4,
      label: 'Strong',
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }, [password]);

  // Email validation: standard compliant email pattern
  const isEmailValid = useMemo(() => {
    if (!email.trim()) return null;
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
  }, [email]);

  // Contact number validation: checks characters and minimum/maximum digits
  const contactValidation = useMemo(() => {
    const trimmed = contactNumber.trim();
    if (!trimmed) return null;

    if (/[a-zA-Z]/.test(trimmed)) {
      return { valid: false, message: 'Contact number cannot contain letters' };
    }

    if (!/^[0-9+\s\-()]+$/.test(trimmed)) {
      return { valid: false, message: 'Only digits and +, -, () are allowed' };
    }

    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return { valid: false, message: 'Contact number is too short (min 7 digits)' };
    }
    if (digitsOnly.length > 15) {
      return { valid: false, message: 'Contact number is too long (max 15 digits)' };
    }

    return { valid: true, message: 'Valid contact number' };
  }, [contactNumber]);

  // Confirm password match check
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!email.trim() || !password.trim()) {
        setError('Please enter your email and password');
        return;
      }
      if (isEmailValid === false) {
        setError('Please enter a valid email address (e.g. name@example.com)');
        return;
      }
      // Demo authentication: If customer matches existing or mock authenticates
      const mockCustomer: CustomerAccount = {
        id: Math.floor(100 + Math.random() * 900),
        fullName: fullName || (email && email.includes('@') ? email.split('@')[0].toUpperCase() : 'Customer'),
        email: email.trim(),
        contactNumber: contactNumber || '+63 917 000 0000',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      AppStore.setActiveCustomer(mockCustomer);
      onSuccess(mockCustomer);
      onClose();
    } else {
      // Register validation
      if (!fullName.trim() || !email.trim() || !contactNumber.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('Please fill in all required fields');
        return;
      }

      if (isEmailValid === false) {
        setError('Invalid email address. Please enter a valid email (e.g. name@example.com)');
        return;
      }

      if (contactValidation && !contactValidation.valid) {
        setError(`Invalid contact number: ${contactValidation.message}`);
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match. Please ensure both passwords match identically');
        return;
      }

      if (passwordStrength.score < 2) {
        setError('Password is too weak. Please include a mix of uppercase letters, numbers, or symbols');
        return;
      }

      const newCustomer: CustomerAccount = {
        id: Math.floor(100 + Math.random() * 900),
        fullName: fullName.trim(),
        email: email.trim(),
        contactNumber: contactNumber.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      AppStore.setActiveCustomer(newCustomer);
      onSuccess(newCustomer);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 customer-mode font-baskerville">
      <div className="w-full max-w-sm sm:max-w-md max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-7 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 sm:pb-4">
          <div>
            <h3 className="text-base sm:text-xl font-bold text-stone-900 font-display">
              {mode === 'login' ? 'Welcome Back' : 'Create Customer Account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 sm:p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mt-3 sm:mt-4 flex items-start gap-1.5 sm:gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 sm:p-3 text-[11px] sm:text-xs font-medium text-rose-700">
            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 sm:mt-4 space-y-2.5 sm:space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-amber-600">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 sm:left-3.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-8.5 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Email Address <span className="text-amber-600">*</span>
              </label>
              {isEmailValid !== null && (
                <span
                  className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold ${
                    isEmailValid ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {isEmailValid ? (
                    <>
                      <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span>Valid email</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      <span>Invalid email</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="relative">
              <Mail
                className={`absolute left-3 top-2.5 sm:left-3.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors ${
                  isEmailValid !== null
                    ? isEmailValid
                      ? 'text-emerald-500'
                      : 'text-rose-400'
                    : 'text-stone-400'
                }`}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full rounded-xl border bg-stone-50/50 pl-8.5 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-stone-900 focus:bg-white focus:outline-none transition ${
                  isEmailValid !== null
                    ? isEmailValid
                      ? 'border-emerald-400 focus:border-emerald-500'
                      : 'border-rose-300 focus:border-rose-500'
                    : 'border-stone-300 focus:border-amber-500'
                }`}
              />
            </div>
            {isEmailValid === false && (
              <p className="mt-1 text-[10px] sm:text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
                <span>Please enter a valid email address (e.g. name@example.com)</span>
              </p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                  Contact Number <span className="text-amber-600">*</span>
                </label>
                {contactValidation !== null && (
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold ${
                      contactValidation.valid ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {contactValidation.valid ? (
                      <>
                        <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span>Valid number</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span>Invalid number</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone
                  className={`absolute left-3 top-2.5 sm:left-3.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors ${
                    contactValidation !== null
                      ? contactValidation.valid
                        ? 'text-emerald-500'
                        : 'text-rose-400'
                      : 'text-stone-400'
                  }`}
                />
                <input
                  type="tel"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+63 912 345 6789"
                  className={`w-full rounded-xl border bg-stone-50/50 pl-8.5 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-xs sm:text-sm text-stone-900 focus:bg-white focus:outline-none transition ${
                    contactValidation !== null
                      ? contactValidation.valid
                        ? 'border-emerald-400 focus:border-emerald-500'
                        : 'border-rose-300 focus:border-rose-500'
                      : 'border-stone-300 focus:border-amber-500'
                  }`}
                />
              </div>
              {contactValidation !== null && !contactValidation.valid && (
                <p className="mt-1 text-[10px] sm:text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
                  <span>{contactValidation.message}</span>
                </p>
              )}
            </div>
          )}

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] sm:text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Password <span className="text-amber-600">*</span>
              </label>
              {mode === 'register' && password && (
                <span
                  className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full border ${passwordStrength.badgeBg}`}
                >
                  {passwordStrength.score >= 3 ? (
                    <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-600" />
                  ) : passwordStrength.score === 2 ? (
                    <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-600" />
                  ) : (
                    <ShieldAlert className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-rose-600" />
                  )}
                  <span>{passwordStrength.label}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 sm:left-3.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Create a secure password' : '••••••••'}
                className="w-full rounded-xl border border-stone-300 bg-stone-50/50 pl-8.5 sm:pl-10 pr-8.5 sm:pr-10 py-2 sm:py-2.5 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:bg-white focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 text-stone-400 hover:text-stone-600 p-0.5 rounded transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
              </button>
            </div>

            {/* Password Strength Meter (Shown during registration) */}
            {mode === 'register' && (
              <div className="mt-2 sm:mt-2.5 space-y-1.5 sm:space-y-2 rounded-xl sm:rounded-2xl bg-stone-50/80 border border-stone-200/80 p-2 sm:p-3">
                <div className="flex items-center justify-between text-[10px] sm:text-xs">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-stone-600 flex items-center gap-1.5">
                    <KeyRound className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" />
                    Password Security
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-bold ${passwordStrength.textColor}`}>
                    {password ? passwordStrength.label : 'Required'}
                  </span>
                </div>

                {/* Segmented Strength Bar */}
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                  {[1, 2, 3, 4].map((step) => {
                    const isActive = passwordStrength.score >= step;
                    return (
                      <div
                        key={step}
                        className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${
                          isActive ? passwordStrength.barColor : 'bg-stone-200'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field (Sign Up Mode) */}
          {mode === 'register' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                  Confirm Password <span className="text-amber-600">*</span>
                </label>
                {passwordsMatch !== null && (
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold ${
                      passwordsMatch ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span>Does not match</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock
                  className={`absolute left-3 top-2.5 sm:left-3.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                    passwordsMatch === true
                      ? 'text-emerald-500'
                      : passwordsMatch === false
                      ? 'text-rose-400'
                      : 'text-stone-400'
                  }`}
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className={`w-full rounded-xl border bg-stone-50/50 pl-8.5 sm:pl-10 pr-8.5 sm:pr-10 py-2 sm:py-2.5 text-xs sm:text-sm text-stone-900 focus:bg-white focus:outline-none transition ${
                    passwordsMatch === true
                      ? 'border-emerald-400 focus:border-emerald-500'
                      : passwordsMatch === false
                      ? 'border-rose-300 focus:border-rose-500'
                      : 'border-stone-300 focus:border-amber-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 text-stone-400 hover:text-stone-600 p-0.5 rounded transition"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-2 sm:mt-3 rounded-xl bg-amber-500 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-stone-950 shadow-md hover:bg-amber-400 active:scale-[0.99] transition cursor-pointer"
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-stone-100 text-center text-[11px] sm:text-xs text-stone-500">
          {mode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="font-bold text-amber-700 hover:underline cursor-pointer"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-bold text-amber-700 hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


