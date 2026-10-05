import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '../../types';
import { AppStore } from '../../services/store';
import {
  Shield,
  Coffee,
  KeyRound,
  Delete,
  ChefHat,
} from 'lucide-react';
import {
  HangingVinesOverlay,
  MonsteraPlantCorner,
} from '../customer/BotanicalElements';

interface StaffLoginProps {
  onLoginSuccess: (user: User) => void;
  initialRoleTarget?: 'cashier' | 'cook' | 'barista' | 'admin';
  onBackToCustomer?: () => void;
  theme?: 'light' | 'amber' | 'dark' | 'beige';
}

export const StaffLogin: React.FC<StaffLoginProps> = ({
  onLoginSuccess,
  initialRoleTarget = 'cashier',
  theme,
}) => {
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<'cashier' | 'cook' | 'barista' | 'admin'>(initialRoleTarget);
  const [error, setError] = useState('');
  const [selectedStaffUser, setSelectedStaffUser] = useState<User | null>(null);

  // Active theme detection (supports prop, localStorage, or html/body class changes)
  const [activeTheme, setActiveTheme] = useState<'light' | 'beige' | 'dark'>(() => {
    if (theme === 'dark') return 'dark';
    if (theme === 'amber' || theme === 'beige') return 'beige';
    if (theme === 'light') return 'light';
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return 'dark';
      if (saved === 'amber' || saved === 'beige') return 'beige';
      if (saved === 'light') return 'light';
      if (document.documentElement.classList.contains('dark')) return 'dark';
      if (
        document.documentElement.classList.contains('theme-amber') ||
        document.documentElement.classList.contains('theme-beige')
      ) {
        return 'beige';
      }
    }
    return 'light';
  });

  useEffect(() => {
    if (theme) {
      if (theme === 'dark') setActiveTheme('dark');
      else if (theme === 'amber' || theme === 'beige') setActiveTheme('beige');
      else setActiveTheme('light');
    }
  }, [theme]);

  // Keep in sync with theme changes across tabs or document classes
  useEffect(() => {
    const detectTheme = () => {
      if (document.documentElement.classList.contains('dark')) {
        setActiveTheme('dark');
      } else if (
        document.documentElement.classList.contains('theme-amber') ||
        document.documentElement.classList.contains('theme-beige')
      ) {
        setActiveTheme('beige');
      } else {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') setActiveTheme('dark');
        else if (saved === 'amber' || saved === 'beige') setActiveTheme('beige');
        else setActiveTheme('light');
      }
    };

    window.addEventListener('storage', detectTheme);
    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('storage', detectTheme);
      observer.disconnect();
    };
  }, []);

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
          currentData.password ||
          (currentData.role === 'admin'
            ? '12345678'
            : currentData.role === 'cook'
            ? '55667788'
            : currentData.role === 'barista'
            ? '33445566'
            : '00000000');
        if (
          enteredPin === userPin ||
          enteredPin === currentData.password ||
          enteredPin === currentData.pin
        ) {
          AppStore.setActiveStaff(currentData);
          onLoginSuccess(currentData);
          return;
        } else {
          setError(`Incorrect PIN / password for ${currentData.fullName}.`);
          return;
        }
      }

      // Check matching active user by entered PIN strictly for the selected station role
      const matchingActiveUser = usersList.find((u) => {
        if (u.status === 'inactive') return false;
        const userPin = u.pin || u.password;
        return (
          (userPin === enteredPin || u.password === enteredPin) &&
          u.role === selectedRole
        );
      });

      if (matchingActiveUser) {
        AppStore.setActiveStaff(matchingActiveUser);
        onLoginSuccess(matchingActiveUser);
        return;
      }

      // Check if this PIN belongs to a user of a different role or is invalid
      setError('Incorrect PIN. Please try again.');
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
    <div className="relative min-h-[calc(100vh-64px)] w-full flex items-center justify-center p-3 sm:p-6 md:p-8 lg:p-12 overflow-hidden bg-stone-950 text-white">
      {/* Ambient Background Image occupying the whole body background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 pointer-events-none fixed"
        style={{ backgroundImage: 'url("/images/yellowhauz_areas_images/yellowhauz_front_view.jpg")' }}
        role="img"
        aria-label="Yellow Hauz Café Wall"
      />

      {/* Ambient Dark, Warm Amber & Emerald Gradient Overlays covering whole screen */}
      <div className="absolute inset-0 bg-gradient-to-r from-stone-950/92 via-stone-950/85 to-stone-950/80 pointer-events-none fixed" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/20 via-emerald-950/20 to-stone-950/80 pointer-events-none fixed" />

      {/* Botanical Hanging Ivy Vines draped across the very top of the screen */}
      <HangingVinesOverlay className="absolute top-0 left-0 right-0 z-10 opacity-90 pointer-events-none fixed" />

      {/* Lush corner Monstera Plant accent fixed at corner */}
      <MonsteraPlantCorner className="absolute -bottom-8 -left-8 w-48 h-48 sm:w-64 sm:h-64 z-10 rotate-12 opacity-85 pointer-events-none fixed" />

      {/* Main Content Layout Container */}
      <div className="relative z-20 w-full max-w-6xl md:max-w-4xl lg:max-w-6xl my-auto animate-in fade-in duration-300">
        {/* Responsive Grid: Left Side = Botanical Café Sanctuary Showcase (Tablet/PC), Right Side = Login Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 sm:gap-6 lg:gap-12 p-2 sm:p-4">
          
          {/* Left Column: Yellow Hauz Outline Beige Logo (Visible on Tablet md: and PC lg:) */}
          <div className="hidden md:flex md:col-span-5 lg:col-span-6 flex-col items-center justify-center p-2 md:p-4 lg:p-8">
            <div className="w-full max-w-xs md:max-w-sm lg:max-w-md flex items-center justify-center">
              <img
                src="/images/yellowhauz_logo_outline_beige.png"
                alt="Yellow Hauz Logo"
                className="w-full max-w-xs md:max-w-sm lg:max-w-md h-auto object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-102"
              />
            </div>
          </div>

          {/* Right Column: Staff Login Terminal (Moved to right on tablet & pc) */}
          <div className="w-full md:col-span-7 lg:col-span-6 flex justify-center md:justify-end">
            <div
              className={`w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 lg:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200 transition-colors ${
                activeTheme === 'light'
                  ? 'bg-white text-stone-900 border border-stone-200'
                  : activeTheme === 'beige'
                  ? 'bg-[#EDE8D0] text-[#2C241D] border border-[#D5C7AA]'
                  : 'bg-stone-900 text-white border border-stone-700/80'
              }`}
            >
              {/* Brand Header inside Login Card */}
              <div
                className={`text-center pb-3 sm:pb-4 border-b ${
                  activeTheme === 'light'
                    ? 'border-stone-200'
                    : activeTheme === 'beige'
                    ? 'border-[#D5C7AA]/70'
                    : 'border-stone-800'
                }`}
              >
                <div
                  className={`mx-auto relative h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-xl sm:rounded-2xl shadow-lg flex items-center justify-center ${
                    activeTheme === 'light'
                      ? 'bg-stone-100 border border-stone-200 shadow-stone-950/5'
                      : activeTheme === 'beige'
                      ? 'bg-[#DFD3BA] border border-[#D5C7AA] shadow-amber-950/10'
                      : 'bg-stone-950 border border-stone-700 shadow-stone-950/40'
                  }`}
                >
                  <Coffee
                    className={`h-5 w-5 sm:h-6.5 sm:w-6.5 absolute pointer-events-none ${
                      activeTheme === 'beige'
                        ? 'text-[#A86520] fill-[#A86520]'
                        : 'text-amber-400 fill-amber-400'
                    }`}
                  />
                  <img
                    src="/images/yellowhauz_logo_outline_beige.png"
                    alt="Yellow Hauz"
                    className="relative z-10 h-full w-full object-contain p-1"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <h2
                  className={`mt-2.5 font-display text-lg sm:text-xl md:text-xl lg:text-2xl font-extrabold ${
                    activeTheme === 'light'
                      ? 'text-stone-900'
                      : activeTheme === 'beige'
                      ? 'text-[#2C241D]'
                      : 'text-white'
                  }`}
                >
                  Login to Yellow Hauz
                </h2>
              </div>

              {/* Role Switcher - 4 Stations */}
              <div
                className={`mt-3 sm:mt-4 grid grid-cols-4 gap-1 sm:gap-1.5 md:gap-1.5 lg:gap-1.5 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border ${
                  activeTheme === 'light'
                    ? 'bg-stone-100 border-stone-200'
                    : activeTheme === 'beige'
                    ? 'bg-[#DFD3BA]/70 border-[#D5C7AA]/80'
                    : 'bg-stone-950/80 border-stone-800'
                }`}
              >
                {(
                  [
                    { id: 'cashier', label: 'Cashier', icon: KeyRound },
                    { id: 'barista', label: 'Barista', icon: Coffee },
                    { id: 'cook', label: 'Cook', icon: ChefHat },
                    { id: 'admin', label: 'Admin', icon: Shield },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleRoleChange(id)}
                    className={`flex items-center justify-center gap-1 sm:gap-1.5 md:gap-1 lg:gap-1.5 rounded-lg sm:rounded-xl py-1.5 sm:py-2 md:py-2 lg:py-2 text-[10px] sm:text-xs md:text-xs lg:text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      role === id
                        ? activeTheme === 'beige'
                          ? 'bg-[#2C241D] text-[#EDE8D0] shadow-sm font-extrabold border border-[#2C241D]'
                          : 'bg-amber-500 text-stone-950 shadow-sm font-extrabold border border-amber-400'
                        : activeTheme === 'light'
                        ? 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/60'
                        : activeTheme === 'beige'
                        ? 'text-[#695543] hover:text-[#2C241D] hover:bg-[#E5DAC4]'
                        : 'text-stone-400 hover:text-white hover:bg-stone-800/60'
                    }`}
                  >
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-3.5 md:w-3.5 lg:h-3.5 lg:w-3.5 shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* PIN Display */}
              <div className="my-3.5 sm:my-5 text-center">
                <label
                  className={`text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider block mb-1.5 sm:mb-2 ${
                    activeTheme === 'light'
                      ? 'text-stone-700'
                      : activeTheme === 'beige'
                      ? 'text-[#695543]'
                      : 'text-stone-300'
                  }`}
                >
                  Enter 8-Digit Security PIN
                </label>
                <div className="flex justify-center items-center gap-1 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                    const isFilled = pin.length > idx;
                    let slotClass = '';
                    if (isFilled) {
                      if (activeTheme === 'beige') {
                        slotClass = 'border-[#2C241D] bg-[#2C241D] text-[#EDE8D0] shadow-xs scale-105';
                      } else {
                        slotClass = 'border-amber-400 bg-amber-500 text-stone-950 shadow-xs scale-105';
                      }
                    } else {
                      if (activeTheme === 'light') {
                        slotClass = 'border-stone-300 bg-stone-100 text-stone-400';
                      } else if (activeTheme === 'beige') {
                        slotClass = 'border-[#D0C2A5] bg-[#E2D7BF] text-[#8C7A6B]';
                      } else {
                        slotClass = 'border-stone-800 bg-stone-950 text-stone-600';
                      }
                    }
                    return (
                      <div
                        key={idx}
                        className={`grid h-8 w-7.5 sm:h-11 sm:w-10 place-items-center rounded-lg sm:rounded-xl border font-mono text-base sm:text-xl font-bold transition-all ${slotClass}`}
                      >
                        {isFilled ? '●' : ''}
                      </div>
                    );
                  })}
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
                    className={`h-10 sm:h-12 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-bold transition shadow-xs cursor-pointer active:scale-95 border ${
                      activeTheme === 'light'
                        ? 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
                        : activeTheme === 'beige'
                        ? 'bg-[#F8F5EE] hover:bg-[#F0EAE0] text-[#2C241D] border-[#D8C7A5]'
                        : 'bg-stone-800/90 hover:bg-stone-700 text-white border-stone-700/70'
                    }`}
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleClear}
                  className={`h-10 sm:h-12 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-extrabold transition cursor-pointer shadow-2xs border ${
                    activeTheme === 'light'
                      ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                      : activeTheme === 'beige'
                      ? 'bg-[#E5DAC4] hover:bg-[#DDD1B9] text-[#2C241D] border-[#D8C7A5]'
                      : 'bg-stone-800/60 hover:bg-stone-700 text-stone-300 border-stone-700/70'
                  }`}
                >
                  CLEAR
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className={`h-10 sm:h-12 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-bold transition shadow-xs cursor-pointer active:scale-95 border ${
                    activeTheme === 'light'
                      ? 'bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-200'
                      : activeTheme === 'beige'
                      ? 'bg-[#F8F5EE] hover:bg-[#F0EAE0] text-[#2C241D] border-[#D8C7A5]'
                      : 'bg-stone-800/90 hover:bg-stone-700 text-white border-stone-700/70'
                  }`}
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className={`grid h-10 sm:h-12 place-items-center rounded-xl sm:rounded-2xl transition cursor-pointer shadow-2xs border ${
                    activeTheme === 'light'
                      ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                      : activeTheme === 'beige'
                      ? 'bg-[#E5DAC4] hover:bg-[#DDD1B9] text-[#2C241D] border-[#D8C7A5]'
                      : 'bg-stone-800/60 hover:bg-stone-700 text-stone-300 border-stone-700/70'
                  }`}
                >
                  <Delete className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

