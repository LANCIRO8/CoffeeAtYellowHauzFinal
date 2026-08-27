import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Table, TableBinding, CustomerAccount, TableRequest } from '../../types';
import { AppStore } from '../../services/store';
import {
  QrCode,
  Coffee,
  Users,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  XCircle,
  Wind,
  MapPin,
  Utensils,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface ScannedTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannedTableNumber: number;
  activeCustomer?: CustomerAccount | null;
  activeTableBinding?: TableBinding | null;
  currentTableBinding?: TableBinding | null;
  onConfirmed?: (binding: TableBinding) => void;
  onSwitchToOnline?: () => void;
  onOpenManualTablePicker?: () => void;
}

export const ScannedTableModal: React.FC<ScannedTableModalProps> = ({
  isOpen,
  onClose,
  scannedTableNumber,
  activeCustomer,
  activeTableBinding: propActiveBinding,
  currentTableBinding,
  onConfirmed,
  onSwitchToOnline,
  onOpenManualTablePicker,
}) => {
  const activeBinding = propActiveBinding !== undefined ? propActiveBinding : currentTableBinding;
  const storeTables = useMemo(() => AppStore.getTables(), []);
  const targetTable = useMemo(
    () => storeTables.find((t) => t.tableNumber === scannedTableNumber),
    [storeTables, scannedTableNumber]
  );

  const [currentRequest, setCurrentRequest] = useState<TableRequest | null>(() =>
    AppStore.getMyActiveTableRequest()
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCashierOnline = AppStore.isCashierOnline();
  const processedApprovedReqIdsRef = useRef<Set<string>>(new Set());

  // Reset or align request when scanned table changes
  useEffect(() => {
    if (scannedTableNumber) {
      const activeReq = AppStore.getMyActiveTableRequest();
      if (
        activeReq &&
        activeReq.requestedTableNumber !== scannedTableNumber &&
        activeReq.status === 'pending'
      ) {
        AppStore.cancelTableRequest(activeReq.id);
        setCurrentRequest(null);
      } else {
        setCurrentRequest(activeReq);
      }
    }
  }, [scannedTableNumber]);

  // Subscribe to real-time updates (cashier approvals, etc.)
  useEffect(() => {
    const checkState = () => {
      const activeReq = AppStore.getMyActiveTableRequest();
      setCurrentRequest(activeReq);

      if (
        activeReq &&
        activeReq.status === 'approved' &&
        activeReq.requestedTableNumber === scannedTableNumber &&
        !processedApprovedReqIdsRef.current.has(activeReq.id)
      ) {
        processedApprovedReqIdsRef.current.add(activeReq.id);
        const binding = AppStore.bindTableByNumber(
          activeReq.requestedTableNumber,
          false,
          activeReq.cashierName || 'Cashier'
        );
        if (binding) {
          setTimeout(() => {
            if (onConfirmed) onConfirmed(binding);
            onClose();
          }, 1600);
        }
      }
    };

    checkState();
    const unsub = AppStore.subscribe(checkState);
    return () => unsub();
  }, [scannedTableNumber, onConfirmed, onClose]);

  // Live timer for pending approval state
  useEffect(() => {
    if (!currentRequest || currentRequest.status !== 'pending') {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(currentRequest.createdAt).getTime();
    const updateTimer = () => {
      const now = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentRequest]);

  if (!isOpen || !scannedTableNumber) return null;

  const isSwitchingTable = Boolean(
    activeBinding && activeBinding.tableNumber !== scannedTableNumber
  );

  const handleConfirmScannedTable = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    try {
      const req = AppStore.createTableRequest({
        tableNumber: scannedTableNumber,
        currentTableNumber: activeBinding?.tableNumber || null,
        customerName: activeCustomer?.fullName || 'Dine-In Customer (Scanned QR)',
        customerPhone: activeCustomer?.contactNumber || '',
        notes: 'Scanned in-store table QR code',
        customerId: activeCustomer?.id || null,
      });
      setCurrentRequest(req);
    } catch (err) {
      console.error('Confirm scanned table error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = () => {
    if (currentRequest) {
      AppStore.cancelTableRequest(currentRequest.id);
      setCurrentRequest(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-stone-200 my-8 animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Top Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 1. STATE: PENDING CASHIER APPROVAL */}
        {currentRequest && currentRequest.status === 'pending' ? (
          <div className="space-y-5 text-center py-2">
            {/* Animated Table Radar Indicator */}
            <div className="relative mx-auto flex items-center justify-center h-28 w-28">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
              <div className="absolute inset-3 rounded-full bg-amber-500/25 animate-pulse" />
              <div className="relative grid h-18 w-18 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 font-mono font-black text-3xl shadow-lg border border-amber-300">
                #{scannedTableNumber}
              </div>
            </div>

            <div className="space-y-1.5 max-w-sm mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3.5 py-1 text-xs font-bold text-amber-900">
                <Clock className="h-3.5 w-3.5 text-amber-600 animate-spin" />
                <span>Notifying Cashier on Duty ({elapsedSeconds}s)</span>
              </div>
              <h3 className="text-xl font-extrabold text-stone-950 font-display">
                Table #{scannedTableNumber} Verification Sent
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                We've alerted the cashier POS terminal that you are seated at <strong>Table #{scannedTableNumber}</strong>. Please hold on for quick sign-off!
              </p>
            </div>

            {/* Quick Details Card */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3.5 text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Scanned Table:</span>
                <span className="font-mono font-bold text-stone-950">Table #{scannedTableNumber}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Area / Section:</span>
                <span className="font-bold text-stone-800">
                  {targetTable?.area === 'airconditioned' ? 'Airconditioned Room' : 'Main Dining Area'}
                </span>
              </div>
              {isSwitchingTable && activeBinding && (
                <div className="flex items-center justify-between text-amber-900 bg-amber-100/70 p-2 rounded-xl text-[11px] font-bold">
                  <span>Moving from:</span>
                  <span>Table #{activeBinding.tableNumber} ➔ Table #{scannedTableNumber}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-stone-200/70">
                <span className="font-medium">Cashier Terminal:</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isCashierOnline ? 'Cashier Online & Alerted' : 'Cashier Ready'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelRequest}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-stone-100 px-5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-200 transition cursor-pointer"
              >
                Wait in Background
              </button>
            </div>
          </div>
        ) : currentRequest && currentRequest.status === 'approved' ? (
          /* 2. STATE: APPROVED SUCCESS */
          <div className="space-y-4 text-center py-5">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 shadow-sm animate-bounce">
              <CheckCircle2 className="h-11 w-11" />
            </div>
            <div className="space-y-1.5">
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
                In-Store QR Code Verified
              </span>
              <h3 className="text-2xl font-extrabold text-stone-950 font-display">
                🎉 Table #{scannedTableNumber} Confirmed!
              </h3>
              <p className="text-xs text-stone-600 max-w-xs mx-auto">
                Welcome to Coffee at Yellow Hauz! Approved by <strong>{currentRequest.cashierName || 'Cashier'}</strong>. Redirecting you to the menu...
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-900 flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Your orders will be prepared and served directly to Table #{scannedTableNumber}</span>
            </div>
          </div>
        ) : currentRequest && currentRequest.status === 'rejected' ? (
          /* 3. STATE: REJECTED / UNAVAILABLE */
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-100 text-rose-600 border border-rose-300">
              <XCircle className="h-9 w-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-stone-950 font-display">
                Table #{scannedTableNumber} Not Available
              </h3>
              <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl p-3 max-w-sm mx-auto">
                {currentRequest.rejectionReason ||
                  'This table is currently reserved for a booked event or undergoing cleaning. Please choose another seat.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {onOpenManualTablePicker && (
                <button
                  type="button"
                  onClick={() => {
                    handleCancelRequest();
                    onOpenManualTablePicker();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-xs font-extrabold text-stone-950 hover:bg-amber-400 shadow-sm transition cursor-pointer"
                >
                  <Utensils className="h-4 w-4" />
                  <span>Choose Another Table</span>
                </button>
              )}
              {onSwitchToOnline && (
                <button
                  type="button"
                  onClick={() => {
                    handleCancelRequest();
                    onSwitchToOnline();
                    onClose();
                  }}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-100 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                >
                  Switch to Online / Takeout Mode
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 4. STATE: SCANNED TABLE SHOWCASE & INSTANT 1-CLICK CONFIRMATION */
          <div className="space-y-5">
            {/* Header Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300/80 px-3 py-1 text-[11px] font-black text-amber-950 uppercase tracking-wider shadow-2xs">
                <QrCode className="h-3.5 w-3.5 text-amber-800" />
                <span>Table QR Code Scanned</span>
              </span>
            </div>

            {/* Scanned Table Hero Box */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-amber-100/40 to-stone-50 border-2 border-amber-300 p-5 shadow-sm text-center relative overflow-hidden">
              {/* Subtle background icon */}
              <Coffee className="absolute -right-4 -bottom-4 h-28 w-28 text-amber-200/30 pointer-events-none" />

              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800 mb-1">
                {isSwitchingTable ? 'Switching Dine-In Table' : 'You are seated at'}
              </p>

              <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 font-mono font-black text-4xl shadow-md border-2 border-amber-200 my-1">
                #{scannedTableNumber}
              </div>

              <h2 className="text-xl font-black text-stone-950 font-display mt-1">
                Table #{scannedTableNumber}
              </h2>

              {/* Area & Capacity Pill Row */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 rounded-xl bg-white/90 border border-stone-200/80 px-2.5 py-1 text-[11px] font-bold text-stone-700 shadow-2xs">
                  {targetTable?.area === 'airconditioned' ? (
                    <>
                      <Wind className="h-3 w-3 text-sky-600" />
                      <span>Airconditioned Room</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3 w-3 text-amber-700" />
                      <span>Main Dining Area</span>
                    </>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 rounded-xl bg-white/90 border border-stone-200/80 px-2.5 py-1 text-[11px] font-bold text-stone-700 shadow-2xs">
                  <Users className="h-3 w-3 text-stone-500" />
                  <span>Up to {targetTable?.capacity || 4} Guests</span>
                </span>
              </div>

              {isSwitchingTable && activeBinding && (
                <div className="mt-3 bg-amber-200/70 border border-amber-300/80 rounded-2xl p-2 text-xs font-bold text-amber-950 flex items-center justify-center gap-1.5">
                  <span>Current: Table #{activeBinding.tableNumber}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-stone-950 font-extrabold">New: Table #{scannedTableNumber}</span>
                </div>
              )}
            </div>

            {/* Context Message */}
            <div className="space-y-1 text-center px-1">
              <h4 className="text-sm font-extrabold text-stone-900">
                {isSwitchingTable
                  ? `Confirm Move to Table #${scannedTableNumber}?`
                  : `Welcome to Coffee at Yellow Hauz!`}
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                {isSwitchingTable
                  ? `We detected your QR scan at Table #${scannedTableNumber}. Confirm below to switch your seating and route all orders here.`
                  : `You've chosen Table #${scannedTableNumber} in person. Confirm below to unlock table-side digital ordering directly from your phone.`}
              </p>
            </div>

            {/* Key In-Store Benefits */}
            <div className="rounded-2xl border border-stone-100 bg-stone-50 p-3 space-y-1.5 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Direct kitchen queue routing for <strong>Table #{scannedTableNumber}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Orders will be brought directly to your table by our staff</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmScannedTable()}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 px-6 text-sm font-black text-stone-950 shadow-md hover:bg-amber-400 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Connecting with Cashier...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {isSwitchingTable
                        ? `Confirm Move to Table #${scannedTableNumber}`
                        : `Confirm Table #${scannedTableNumber} & Start Ordering`}
                    </span>
                    <ChevronRight className="h-4 w-4 stroke-[3]" />
                  </>
                )}
              </button>

              {/* Secondary Alternatives */}
              <div className="flex flex-col items-center gap-2 pt-1 text-center">
                {onOpenManualTablePicker && (
                  <button
                    type="button"
                    onClick={onOpenManualTablePicker}
                    className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition cursor-pointer underline underline-offset-2"
                  >
                    Not at Table #{scannedTableNumber}? Choose a different table
                  </button>
                )}
                {onSwitchToOnline && (
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToOnline();
                      onClose();
                    }}
                    className="text-[11px] font-medium text-stone-400 hover:text-stone-600 transition cursor-pointer"
                  >
                    Not dining in? Switch to Takeout / Online Order
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
