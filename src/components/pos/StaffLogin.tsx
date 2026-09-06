import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../../types';
import { AppStore } from '../../services/store';
import {
  Shield,
  Coffee,
  KeyRound,
  Delete,
  ArrowRight,
  Sparkles,
  UserCheck,
  ChefHat,
} from 'lucide-react';

interface StaffLoginProps {
  onLoginSuccess: (user: User) => void;
  initialRoleTarget?: 'cashier' | 'cook' | 'barista' | 'admin';
  onBackToCustomer?: () => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({
  onLoginSuccess,
  initialRoleTarget = 'cashier',
}) => {
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'cashier' | 'cook' | 'barista' | 'admin'>(initialRoleTarget);
  const [error, setError] = useState('');
  const [selectedStaffUser, setSelectedStaffUser] = useState<User | null>(null);

  // Sync role when initialRoleTarget changes from route
  useEffect(() => {
    if (initialRoleTarget) {
      setRole(initialRoleTarget);
    }
  }, [initialRoleTarget]);

  const allUsers = useMemo(() => {
    return AppStore.getUsers();
  }, []);

  const submitWithPin = useCallback(
    (enteredPin: string, selectedRole: 'cashier' | 'cook' | 'barista' | 'admin', specificUser?: User | null) => {
      const usersList = AppStore.getUsers();

      // If a specific staff was clicked/chosen
      if (specificUser) {
        const currentData = usersList.find((u) => u.id === specificUser.id) || specificUser;
        if (currentData.status === 'inactive') {
          setError(`Account for ${currentData.fullName} is inactive. Contact the administrator.`);
          return;
        }
        const userPin =
          currentData.pin ||
          (currentData.role === 'admin'
            ? '12345678'
            : currentData.role === 'cook'
            ? '55667788'
            : currentData.role === 'barista'
            ? '33445566'
            : '00000000');
        if (
          enteredPin === userPin ||
          (enteredPin === '00000000' && currentData.role === 'cashier') ||
          (enteredPin === '33445566' && currentData.role === 'barista') ||
          (enteredPin === '55667788' && currentData.role === 'cook') ||
          (enteredPin === '12345678' && currentData.role === 'admin')
        ) {
          AppStore.setActiveStaff(currentData);
          onLoginSuccess(currentData);
          return;
        } else {
          setError(`Incorrect PIN for ${currentData.fullName}.`);
          return;
        }
      }

      // Check matching user by entered PIN and role
      const matchingActiveUser = usersList.find((u) => {
        if (u.status === 'inactive') return false;
        const userPin =
          u.pin ||
          (u.role === 'admin'
            ? '12345678'
            : u.role === 'cook'
            ? '55667788'
            : u.role === 'barista'
            ? '33445566'
            : '00000000');
        return userPin === enteredPin && u.role === selectedRole;
      });

      if (matchingActiveUser) {
        AppStore.setActiveStaff(matchingActiveUser);
        onLoginSuccess(matchingActiveUser);
        return;
      }

      // Fallback check across all active users regardless of tab
      const fallbackUser = usersList.find((u) => {
        if (u.status === 'inactive') return false;
        const userPin =
          u.pin ||
          (u.role === 'admin'
            ? '12345678'
            : u.role === 'cook'
            ? '55667788'
            : u.role === 'barista'
            ? '33445566'
            : '00000000');
        return userPin === enteredPin;
      });

      if (fallbackUser) {
        AppStore.setActiveStaff(fallbackUser);
        onLoginSuccess(fallbackUser);
        return;
      }

      // Check if pin matches an inactive user
      const inactiveMatch = usersList.find((u) => {
        const userPin =
          u.pin ||
          (u.role === 'admin'
            ? '12345678'
            : u.role === 'cook'
            ? '55667788'
            : u.role === 'barista'
            ? '33445566'
            : '00000000');
        return userPin === enteredPin;
      });

      if (inactiveMatch) {
        setError(`The account for ${inactiveMatch.fullName} is currently inactive.`);
        return;
      }

      setError(`Invalid PIN. Please enter your 8-digit security PIN.`);
    },
    [onLoginSuccess]
  );

  const handleDigit = useCallback(
    (digit: string) => {
      setPin((prev) => {
        if (prev.length >= 8) return prev;
        const next = prev + digit;
        setError('');
        if (next.length === 8) {
          // Auto-check PIN when 8 digits reached
          setTimeout(() => {
            submitWithPin(next, role, selectedStaffUser);
          }, 100);
        }
        return next;
      });
    },
    [role, selectedStaffUser, submitWithPin]
  );

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setError('');
  }, []);

  // Support physical keyboard typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        if (pin.length >= 8) {
          submitWithPin(pin, role, selectedStaffUser);
        }
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, handleClear, pin, role, selectedStaffUser, submitWithPin]);

  const handleQuickLogin = (targetUser: User) => {
    setSelectedStaffUser(targetUser);
    setRole(targetUser.role);
    const targetPin =
      targetUser.pin ||
      (targetUser.role === 'admin'
        ? '12345678'
        : targetUser.role === 'cook'
        ? '55667788'
        : targetUser.role === 'barista'
        ? '33445566'
        : '00000000');
    setPin(targetPin);
    AppStore.setActiveStaff(targetUser);
    onLoginSuccess(targetUser);
  };

  const handleRoleChange = (newRole: 'cashier' | 'cook' | 'barista' | 'admin') => {
    setRole(newRole);
    setSelectedStaffUser(null);
    setPin('');
    setError('');
    // Update browser URL to match selected role route
    const targetRoute =
      newRole === 'admin'
        ? '/?mode=admin'
        : newRole === 'barista'
        ? '/?mode=barista'
        : newRole === 'cook'
        ? '/?mode=cook'
        : '/?mode=staff';
    try {
      window.history.replaceState(null, '', targetRoute);
    } catch {}
  };

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center p-2.5 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl bg-amber-500 text-stone-950 p-4 sm:p-7 shadow-2xl border border-amber-400/80 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center pb-3 sm:pb-4 border-b border-amber-600/30">
          <div className="mx-auto relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-xl sm:rounded-2xl bg-stone-950 shadow-lg shadow-stone-950/20 border border-amber-300/40 flex items-center justify-center">
            <img
              src="/images/Coffeatyellowhauz_logo.jpg"
              alt="Yellow Hauz POS"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <Coffee className="h-5 w-5 sm:h-6.5 sm:w-6.5 text-amber-400 fill-amber-400 absolute pointer-events-none -z-10" />
          </div>
          <h2 className="mt-2 font-display text-lg sm:text-2xl font-extrabold text-stone-950">
            Yellow Hauz POS
          </h2>
        </div>

        {/* Role Switcher - 4 Stations */}
        <div className="mt-3 sm:mt-4 grid grid-cols-4 gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl bg-amber-600/20 p-1 sm:p-1.5 border border-amber-600/30">
          <button
            type="button"
            onClick={() => handleRoleChange('cashier')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition cursor-pointer ${
              role === 'cashier'
                ? 'bg-white text-stone-950 shadow-sm font-extrabold border border-amber-200/60'
                : 'text-stone-900 hover:text-stone-950 hover:bg-white/50'
            }`}
          >
            <KeyRound className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Cashier</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('barista')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition cursor-pointer ${
              role === 'barista'
                ? 'bg-white text-stone-950 shadow-sm font-extrabold border border-amber-200/60'
                : 'text-stone-900 hover:text-stone-950 hover:bg-white/50'
            }`}
          >
            <Coffee className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Barista</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('cook')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition cursor-pointer ${
              role === 'cook'
                ? 'bg-white text-stone-950 shadow-sm font-extrabold border border-amber-200/60'
                : 'text-stone-900 hover:text-stone-950 hover:bg-white/50'
            }`}
          >
            <ChefHat className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Cook</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold transition cursor-pointer ${
              role === 'admin'
                ? 'bg-white text-stone-950 shadow-sm font-extrabold border border-amber-200/60'
                : 'text-stone-900 hover:text-stone-950 hover:bg-white/50'
            }`}
          >
            <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* PIN Display */}
        <div className="my-3.5 sm:my-5 text-center">
          <label className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-stone-900 block mb-1.5 sm:mb-2">
            Enter 8-Digit Security PIN
          </label>
          <div className="flex justify-center items-center gap-1 sm:gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
              <div
                key={idx}
                className={`grid h-8 w-7.5 sm:h-11 sm:w-10 place-items-center rounded-lg sm:rounded-xl border font-mono text-base sm:text-xl font-bold transition-all ${
                  pin.length > idx
                    ? 'border-amber-200 bg-white text-stone-950 shadow-xs scale-105'
                    : 'border-amber-600/30 bg-amber-400/50 text-stone-700'
                }`}
              >
                {pin.length > idx ? '●' : ''}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-3 sm:mb-4 rounded-xl bg-rose-950 text-rose-100 border border-rose-800 p-2 sm:p-2.5 text-center text-[11px] sm:text-xs font-bold shadow-xs">
            {error}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-10 sm:h-13 rounded-xl sm:rounded-2xl bg-white text-lg sm:text-xl font-bold text-stone-900 hover:bg-amber-50 active:scale-95 transition shadow-sm border border-amber-200/70 cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-10 sm:h-13 rounded-xl sm:rounded-2xl bg-white/80 text-[10px] sm:text-xs font-extrabold text-stone-800 hover:bg-white border border-amber-200/60 transition cursor-pointer shadow-2xs"
          >
            CLEAR
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-10 sm:h-13 rounded-xl sm:rounded-2xl bg-white text-lg sm:text-xl font-bold text-stone-900 hover:bg-amber-50 active:scale-95 transition shadow-sm border border-amber-200/70 cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="grid h-10 sm:h-13 place-items-center rounded-xl sm:rounded-2xl bg-white/80 text-stone-800 hover:bg-white border border-amber-200/60 transition cursor-pointer shadow-2xs"
          >
            <Delete className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Submit */}
        <button
          type="button"
          onClick={() => submitWithPin(pin, role, selectedStaffUser)}
          disabled={pin.length < 8}
          className="w-full mt-3 sm:mt-4 flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-white py-2.5 sm:py-3 text-xs sm:text-sm font-extrabold text-stone-950 disabled:opacity-50 hover:bg-amber-50 border border-amber-200/80 transition shadow-md active:scale-98 cursor-pointer"
        >
          <span>Unlock Terminal</span>
          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>

        {/* Quick Access Account Selector */}
        <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-amber-600/30 text-center">
          <p className="text-[10px] sm:text-[11px] text-stone-950 mb-1.5 sm:mb-2 font-bold flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-950" />
            <span>Select Staff Profile &amp; Instant Login:</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 max-h-32 sm:max-h-36 overflow-y-auto no-scrollbar pr-0.5">
            {allUsers
              .filter((u) => u.status === 'active')
              .map((u) => {
                const isCook = u.role === 'cook';
                const isBarista = u.role === 'barista';
                const isAdmin = u.role === 'admin';
                return (
                  <button
                    key={`staff-login-${u.id}-${u.username}`}
                    onClick={() => handleQuickLogin(u)}
                    className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-amber-400/80 hover:bg-amber-400 p-1.5 sm:p-2 text-left text-[10px] sm:text-xs font-bold text-stone-950 border border-amber-600/30 hover:border-stone-950/40 transition cursor-pointer shadow-2xs"
                  >
                    <div
                      className={`grid h-5 w-5 sm:h-6 sm:w-6 place-items-center rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-bold ${
                        isAdmin
                          ? 'bg-purple-950 text-purple-200'
                          : isBarista
                          ? 'bg-amber-950 text-amber-200'
                          : isCook
                          ? 'bg-orange-950 text-orange-200'
                          : 'bg-stone-950 text-amber-300'
                      }`}
                    >
                      {isAdmin ? (
                        <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      ) : isBarista ? (
                        <Coffee className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      ) : isCook ? (
                        <ChefHat className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      ) : (
                        <UserCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      )}
                    </div>
                    <div className="truncate flex-1">
                      <div className="truncate text-stone-950 text-[10px] sm:text-[11px] leading-tight flex items-center gap-1 font-bold">
                        <span>{u.fullName}</span>
                        {isBarista && (
                          <span className="text-[8px] sm:text-[9px] text-stone-900 font-bold uppercase">
                            (Barista)
                          </span>
                        )}
                        {isCook && (
                          <span className="text-[8px] sm:text-[9px] text-stone-800 font-medium uppercase">
                            (Cook)
                          </span>
                        )}
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-stone-800 font-mono font-medium">
                        {u.employeeId} • PIN:{' '}
                        {u.pin ||
                          (isAdmin
                            ? '12345678'
                            : isBarista
                            ? '33445566'
                            : isCook
                            ? '55667788'
                            : '00000000')}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

