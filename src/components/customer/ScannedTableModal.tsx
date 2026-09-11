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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl border border-stone-200 my-4 sm:my-8 animate-in fade-in zoom-in-95 duration-150 relative">
        {/* Top Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 rounded-full p-1.5 sm:p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        {/* 1. STATE: PENDING CASHIER APPROVAL */}
        {currentRequest && currentRequest.status === 'pending' ? (
          <div className="space-y-3.5 sm:space-y-4 text-center py-1 sm:py-2">
            {/* Animated Table Radar Indicator */}
            <div className="relative mx-auto flex items-center justify-center h-20 w-20 sm:h-24 sm:w-24">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-amber-500/25 animate-pulse" />
              <div className="relative grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 font-mono font-black text-2xl sm:text-3xl shadow-lg border border-amber-300">
                #{scannedTableNumber}
              </div>
            </div>

            <div className="space-y-1 max-w-sm mx-auto">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-[10px] sm:text-xs font-bold text-amber-900">
                <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600 animate-spin" />
                <span>Notifying Cashier on Duty ({elapsedSeconds}s)</span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-stone-950 font-display">
                Table #{scannedTableNumber} Verification Sent
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed">
                We've alerted the cashier POS terminal that you are seated at <strong>Table #{scannedTableNumber}</strong>. Please hold on for quick sign-off!
              </p>
            </div>

            {/* Quick Details Card */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3 sm:p-3.5 text-left text-[11px] sm:text-xs space-y-1.5">
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Scanned Table:</span>
                <span className="font-mono font-bold text-stone-950">Table #{scannedTableNumber}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Area / Section:</span>
                <span className="font-bold text-stone-800">
                  {targetTable?.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'}
                </span>
              </div>
              {isSwitchingTable && activeBinding && (
                <div className="flex items-center justify-between text-amber-900 bg-amber-100/70 p-1.5 rounded-xl text-[10px] sm:text-[11px] font-bold">
                  <span>Moving from:</span>
                  <span>Table #{activeBinding.tableNumber} ➔ Table #{scannedTableNumber}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-stone-200/70">
                <span className="font-medium">Cashier Terminal:</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isCashierOnline ? 'Cashier Online & Alerted' : 'Cashier Ready'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCancelRequest}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-[11px] sm:text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-stone-100 px-4 py-2 text-[11px] sm:text-xs font-bold text-stone-700 hover:bg-stone-200 transition cursor-pointer"
              >
                Wait in Background
              </button>
            </div>
          </div>
        ) : currentRequest && currentRequest.status === 'approved' ? (
          /* 2. STATE: APPROVED SUCCESS */
          <div className="space-y-3 sm:space-y-4 text-center py-3 sm:py-4">
            <div className="mx-auto grid h-16 w-16 sm:h-20 sm:w-20 place-items-center rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 shadow-sm animate-bounce">
              <CheckCircle2 className="h-8 w-8 sm:h-11 sm:w-11" />
            </div>
            <div className="space-y-1">
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-emerald-800">
                In-Store QR Code Verified
              </span>
              <h3 className="text-lg sm:text-2xl font-extrabold text-stone-950 font-display">
                🎉 Table #{scannedTableNumber} Confirmed!
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-600 max-w-xs mx-auto">
                Welcome to Coffee at Yellow Hauz! Approved by <strong>{currentRequest.cashierName || 'Cashier'}</strong>. Redirecting you to the menu...
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-2.5 text-[11px] sm:text-xs font-bold text-amber-900 flex items-center justify-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Orders will be prepared and served directly to Table #{scannedTableNumber}</span>
            </div>
          </div>
        ) : currentRequest && currentRequest.status === 'rejected' ? (
          /* 3. STATE: REJECTED / UNAVAILABLE */
          <div className="space-y-3.5 sm:space-y-4 text-center py-3">
            <div className="mx-auto grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full bg-rose-100 text-rose-600 border border-rose-300">
              <XCircle className="h-8 w-8 sm:h-9 sm:w-9" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-extrabold text-stone-950 font-display">
                Table #{scannedTableNumber} Not Available
              </h3>
              <p className="text-[11px] sm:text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl p-2.5 max-w-sm mx-auto">
                {currentRequest.rejectionReason ||
                  'This table is currently reserved for a booked event or undergoing cleaning. Please choose another seat.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              {onOpenManualTablePicker && (
                <button
                  type="button"
                  onClick={() => {
                    handleCancelRequest();
                    onOpenManualTablePicker();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-[11px] sm:text-xs font-extrabold text-stone-950 hover:bg-amber-400 shadow-sm transition cursor-pointer"
                >
                  <Utensils className="h-3.5 w-3.5" />
                  <span>Choose Another Table</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 4. STATE: SCANNED TABLE SHOWCASE & INSTANT 1-CLICK CONFIRMATION */
          <div className="space-y-3 sm:space-y-4">
            {/* Header Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-black text-amber-950 uppercase tracking-wider shadow-2xs">
                <QrCode className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-800" />
                <span>Table QR Code Scanned</span>
              </span>
            </div>

            {/* Scanned Table Hero Box */}
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 via-amber-100/40 to-stone-50 border-2 border-amber-300 p-3 sm:p-4 text-center relative overflow-hidden">
              {/* Subtle background icon */}
              <Coffee className="absolute -right-4 -bottom-4 h-20 w-20 sm:h-28 sm:w-28 text-amber-200/30 pointer-events-none" />

              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-800 mb-0.5">
                {isSwitchingTable ? 'Switching Dine-In Table' : 'In-Store Dine-In Customer'}
              </p>

              <div className="inline-flex items-center justify-center h-14 w-14 sm:h-18 sm:w-18 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 font-mono font-black text-2xl sm:text-3xl shadow-md border-2 border-amber-200 my-0.5 sm:my-1">
                #{scannedTableNumber}
              </div>

              <h2 className="text-sm sm:text-lg font-black text-stone-950 font-display mt-0.5">
                Table #{scannedTableNumber}{targetTable?.name ? ` • ${targetTable.name}` : ''}
              </h2>

              {/* Area & Capacity Pill Row */}
              <div className="flex items-center justify-center gap-1.5 mt-1 sm:mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl bg-white/90 border border-stone-200/80 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-stone-700 shadow-2xs">
                  {targetTable?.area === 'airconditioned' ? (
                    <>
                      <Wind className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-sky-600" />
                      <span>Air-Con</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-700" />
                      <span>Non-A/C</span>
                    </>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl bg-white/90 border border-stone-200/80 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-stone-700 shadow-2xs">
                  <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-stone-500" />
                  <span>Up to {targetTable?.capacity || 4} Guests</span>
                </span>
                {targetTable?.setup && (
                  <span className="inline-flex items-center gap-1 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-amber-900 shadow-2xs">
                    <span>{targetTable.setup}</span>
                  </span>
                )}
              </div>

              {isSwitchingTable && activeBinding && (
                <div className="mt-2 bg-amber-200/70 border border-amber-300/80 rounded-xl p-1.5 text-[10px] sm:text-xs font-bold text-amber-950 flex items-center justify-center gap-1">
                  <span>Current: Table #{activeBinding.tableNumber}</span>
                  <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span className="text-stone-950 font-extrabold">New: Table #{scannedTableNumber}</span>
                </div>
              )}
            </div>

            {/* Context Message */}
            <div className="space-y-0.5 text-center px-1">
              <h4 className="text-xs sm:text-sm font-extrabold text-stone-900">
                {isSwitchingTable
                  ? `Confirm Move to Table #${scannedTableNumber}?`
                  : `Welcome to Coffee at Yellow Hauz!`}
              </h4>
              <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed">
                {isSwitchingTable
                  ? `You've selected Table #${scannedTableNumber}. Once our cashier confirms your table, all your orders will be routed to your new seat.`
                  : `You have chosen Table #${scannedTableNumber} as an In-Store Dine-In customer. Our cashier on duty will confirm your table so you can start ordering right away.`}
              </p>
            </div>

            {/* Primary Action Button */}
            <div className="space-y-1.5 pt-0.5 sm:pt-1">
              <button
                type="button"
                onClick={() => handleConfirmScannedTable()}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-amber-500 py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-black text-stone-950 shadow-md hover:bg-amber-400 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    <span>Sending to Cashier...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {isSwitchingTable
                        ? `Request Move to Table #${scannedTableNumber}`
                        : `Confirm Table #${scannedTableNumber} & Notify Cashier`}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[3]" />
                  </>
                )}
              </button>

              {/* Secondary Alternatives */}
              {onOpenManualTablePicker && (
                <div className="flex flex-col items-center gap-1 pt-0.5 text-center">
                  <button
                    type="button"
                    onClick={onOpenManualTablePicker}
                    className="text-[10px] sm:text-xs font-semibold text-stone-500 hover:text-stone-800 transition cursor-pointer underline underline-offset-2"
                  >
                    Not at Table #{scannedTableNumber}? Choose a different table
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
