import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Table, TableBinding, CustomerAccount, TableRequest } from '../../types';
import { AppStore } from '../../services/store';
import {
  Utensils,
  Users,
  X,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  XCircle,
} from 'lucide-react';

interface TableRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables?: Table[];
  activeTableBinding?: TableBinding | null;
  currentTableBinding?: TableBinding | null;
  activeCustomer?: CustomerAccount | null;
  onTableConfirmed?: (binding: TableBinding) => void;
  onConfirmed?: (binding: TableBinding) => void;
  onSwitchToOnline?: () => void;
  initialSelectedTable?: number | null;
}

export const TableRequestModal: React.FC<TableRequestModalProps> = ({
  isOpen,
  onClose,
  tables: propTables,
  activeTableBinding: propActiveBinding,
  currentTableBinding,
  activeCustomer,
  onTableConfirmed,
  onConfirmed,
  onSwitchToOnline,
  initialSelectedTable,
}) => {
  const activeTableBinding = propActiveBinding !== undefined ? propActiveBinding : currentTableBinding;
  const storeTables = useMemo(() => AppStore.getTables(), []);
  const tables = propTables || storeTables;
  const handleConfirmedCallback = (binding: TableBinding) => {
    if (onTableConfirmed) onTableConfirmed(binding);
    if (onConfirmed) onConfirmed(binding);
  };
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(
    initialSelectedTable || activeTableBinding?.tableNumber || null
  );
  const [currentRequest, setCurrentRequest] = useState<TableRequest | null>(() =>
    AppStore.getMyActiveTableRequest()
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [areaFilter, setAreaFilter] = useState<'all' | 'normal' | 'airconditioned'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCashierOnline = AppStore.isCashierOnline();
  const onlineCashiers = AppStore.getOnlineCashiers();

  useEffect(() => {
    if (initialSelectedTable) {
      setSelectedTableNumber(initialSelectedTable);
      const activeReq = AppStore.getMyActiveTableRequest();
      // If user navigated to a different URL table while a previous different request was pending, reset
      if (
        activeReq &&
        activeReq.requestedTableNumber !== initialSelectedTable &&
        activeReq.status === 'pending'
      ) {
        AppStore.cancelTableRequest(activeReq.id);
        setCurrentRequest(null);
      }
    } else if (activeTableBinding?.tableNumber && !selectedTableNumber) {
      setSelectedTableNumber(activeTableBinding.tableNumber);
    }
  }, [initialSelectedTable, activeTableBinding]);

  const processedApprovedReqIdsRef = useRef<Set<string>>(new Set());

  // Check store state on mount and subscribe to real-time updates
  useEffect(() => {
    const checkState = () => {
      const activeReq = AppStore.getMyActiveTableRequest();
      setCurrentRequest(activeReq);

      if (
        activeReq &&
        activeReq.status === 'approved' &&
        !processedApprovedReqIdsRef.current.has(activeReq.id)
      ) {
        processedApprovedReqIdsRef.current.add(activeReq.id);
        // Auto bind table on cashier approval
        const binding = AppStore.bindTableByNumber(
          activeReq.requestedTableNumber,
          false,
          activeReq.cashierName || 'Cashier'
        );
        if (binding) {
          setTimeout(() => {
            handleConfirmedCallback(binding);
            onClose();
          }, 1800);
        }
      }
    };

    checkState();
    const unsub = AppStore.subscribe(checkState);
    return () => unsub();
  }, [onTableConfirmed, onConfirmed, onClose]);

  // Live timer for pending requests
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

  if (!isOpen) return null;

  const isChangingTable = Boolean(
    activeTableBinding &&
      selectedTableNumber &&
      activeTableBinding.tableNumber !== selectedTableNumber
  );

  const targetTableObj = tables.find((t) => t.tableNumber === selectedTableNumber);

  const filteredTables = tables.filter((t) => {
    if (areaFilter === 'all') return true;
    return t.area === areaFilter;
  });

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableNumber) return;

    setIsSubmitting(true);
    try {
      const req = AppStore.createTableRequest({
        tableNumber: selectedTableNumber,
        currentTableNumber: activeTableBinding?.tableNumber || null,
        customerName: activeCustomer?.fullName || 'Dine-In Customer',
        customerPhone: activeCustomer?.contactNumber || '',
        notes: '',
        customerId: activeCustomer?.id || null,
      });
      setCurrentRequest(req);
    } catch (err) {
      console.error('Submit table request error:', err);
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

  const handleSelectAnotherTable = () => {
    if (currentRequest) {
      AppStore.cancelTableRequest(currentRequest.id);
    }
    setCurrentRequest(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-stone-200 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-stone-950 font-black shadow-xs">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-stone-950 font-display">
                  {currentRequest?.status === 'pending'
                    ? 'Awaiting Cashier Approval'
                    : isChangingTable
                    ? 'Change Dine-In Table'
                    : 'Choose Your Table Number'}
                </h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-200">
                  Cashier Confirmed
                </span>
              </div>
              <p className="text-xs text-stone-500">
                {activeTableBinding
                  ? `Currently seated at Table #${activeTableBinding.tableNumber}`
                  : 'Binds your in-house session to a physical dining table'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. STATE: PENDING CASHIER APPROVAL */}
        {currentRequest && currentRequest.status === 'pending' ? (
          <div className="mt-5 space-y-5 text-center py-2">
            <div className="relative mx-auto flex items-center justify-center h-24 w-24">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-amber-500/30 animate-pulse" />
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 font-mono font-black text-2xl shadow-lg border border-amber-300">
                #{currentRequest.requestedTableNumber}
              </div>
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                <Clock className="h-3.5 w-3.5 text-amber-600 animate-spin" />
                <span>Waiting for Online Cashier Confirmation ({elapsedSeconds}s)</span>
              </div>
              <h4 className="text-base font-extrabold text-stone-900">
                Table #{currentRequest.requestedTableNumber} Request Sent
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Your request has been transmitted to our on-duty cashier. Please wait a moment while the cashier verifies and confirms your seating at <strong>Table #{currentRequest.requestedTableNumber}</strong>.
              </p>
            </div>

            {/* Request Summary Card */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Request Reference:</span>
                <span className="font-mono font-bold text-stone-900">{currentRequest.id}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Guest Name:</span>
                <span className="font-bold text-stone-900">{currentRequest.customerName}</span>
              </div>
              {currentRequest.currentTableNumber && (
                <div className="flex items-center justify-between text-stone-600">
                  <span className="font-medium">Action:</span>
                  <span className="font-bold text-amber-900">
                    Table #{currentRequest.currentTableNumber} ➔ Table #{currentRequest.requestedTableNumber}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-stone-600">
                <span className="font-medium">Table Area:</span>
                <span className="font-bold text-stone-900">
                  {currentRequest.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-stone-200/60">
                <span className="font-medium">Cashier Status:</span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {isCashierOnline ? 'Cashier Online & Alerted' : 'Cashier on Standby'}
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
                Cancel Request
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-stone-100 px-5 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-200 transition cursor-pointer"
              >
                Keep Waiting in Background
              </button>
            </div>
          </div>
        ) : currentRequest && currentRequest.status === 'approved' ? (
          /* 2. STATE: APPROVED SUCCESS */
          <div className="mt-5 space-y-4 text-center py-4">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-extrabold text-stone-950 font-display">
                🎉 Table #{currentRequest.requestedTableNumber} Confirmed!
              </h4>
              <p className="text-xs text-stone-600 max-w-sm mx-auto">
                Approved by <strong>{currentRequest.cashierName || 'Cashier'}</strong>. Your in-house session is now bound to Table #{currentRequest.requestedTableNumber}.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-900">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>Orders placed will now go directly to the kitchen queue</span>
            </div>
          </div>
        ) : currentRequest && currentRequest.status === 'rejected' ? (
          /* 3. STATE: REJECTED / DECLINED */
          <div className="mt-5 space-y-4 text-center py-3">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-rose-100 text-rose-600 border border-rose-300">
              <XCircle className="h-9 w-9" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-extrabold text-stone-950 font-display">
                Table #{currentRequest.requestedTableNumber} Not Approved
              </h4>
              <p className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-2xl p-3 max-w-md mx-auto">
                {currentRequest.rejectionReason ||
                  'The requested table is currently reserved or unavailable. Please choose another table or ask our on-duty staff.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSelectAnotherTable}
                className="w-full sm:w-auto rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-stone-950 hover:bg-amber-400 shadow-sm transition cursor-pointer"
              >
                Choose Another Table
              </button>
              {onSwitchToOnline && (
                <button
                  type="button"
                  onClick={() => {
                    onSwitchToOnline();
                    onClose();
                  }}
                  className="w-full sm:w-auto rounded-xl border border-stone-200 bg-stone-100 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                >
                  Switch to Online Ordering
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 4. STATE: TABLE SELECTION & REQUEST FORM */
          <div className="mt-4 space-y-5">
            {/* Cashier Status Notice */}
            <div className="rounded-2xl border p-3 flex items-center justify-between gap-3 text-xs bg-stone-50 border-stone-200">
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isCashierOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <div>
                  <span className="font-bold text-stone-900">
                    {isCashierOnline ? 'Cashier On Duty (Online)' : 'Cashier on Standby'}
                  </span>
                  <p className="text-[11px] text-stone-500">
                    {isCashierOnline
                      ? `${onlineCashiers.map((c) => c.fullName).join(', ')} is online and will verify your table request.`
                      : 'A cashier will confirm your table seating upon login.'}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-black text-stone-700 shrink-0">
                Live Verification
              </span>
            </div>

            {/* Area Filter Tabs */}
            <div className="flex items-center gap-1.5 border-b border-stone-100 pb-2">
              <button
                type="button"
                onClick={() => setAreaFilter('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  areaFilter === 'all'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Tables ({tables.length})
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('normal')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  areaFilter === 'normal'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Non-A/C ({tables.filter((t) => t.area === 'normal').length})
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('airconditioned')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  areaFilter === 'airconditioned'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                Air-Con ({tables.filter((t) => t.area === 'airconditioned').length})
              </button>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto p-1">
              {filteredTables.map((tbl) => {
                const isSelected = selectedTableNumber === tbl.tableNumber;
                const isCurrentBound = activeTableBinding?.tableNumber === tbl.tableNumber;
                const isOccupied = tbl.status === 'occupied' && !isCurrentBound;
                const isReserved = tbl.status === 'reserved';

                return (
                  <button
                    key={tbl.id}
                    type="button"
                    onClick={() => setSelectedTableNumber(tbl.tableNumber)}
                    className={`relative flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 shadow-xs ring-2 ring-amber-500/40'
                        : isCurrentBound
                        ? 'border-emerald-400 bg-emerald-50/80 text-emerald-950'
                        : 'border-stone-200 bg-stone-50 hover:bg-amber-50/60 hover:border-amber-300'
                    }`}
                  >
                    {isCurrentBound && (
                      <div className="absolute top-2 right-2 rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-black text-white">
                        Current
                      </div>
                    )}
                    <span className="font-mono text-xl font-black text-stone-900">
                      #{tbl.tableNumber}
                    </span>
                    <span className="text-xs font-bold text-amber-950 mt-0.5">
                      {tbl.name || `Table #${tbl.tableNumber}`}
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-stone-500 font-medium">
                      <Users className="h-3 w-3" />
                      <span>{tbl.capacity} Seats</span>
                      <span>•</span>
                      <span>{tbl.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'}</span>
                    </div>

                    {isOccupied && (
                      <span className="mt-1 rounded-full bg-rose-100 text-rose-700 px-1.5 py-0.2 text-[9px] font-bold">
                        Occupied
                      </span>
                    )}
                    {isReserved && (
                      <span className="mt-1 rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.2 text-[9px] font-bold">
                        Reserved
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Table Confirmation Action */}
            {selectedTableNumber && (
              <form onSubmit={handleSubmitRequest} className="space-y-3 pt-3 border-t border-stone-100">
                {/* Selected Table Summary Banner */}
                <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-stone-950 font-mono font-black text-base shadow-xs">
                      #{selectedTableNumber}
                    </div>
                    <div>
                      <span className="font-extrabold text-stone-950 text-sm block">
                        {isChangingTable
                          ? `Switch Table: #${activeTableBinding?.tableNumber} ➔ #${selectedTableNumber}`
                          : `Confirm Table #${selectedTableNumber}${targetTableObj?.name ? ` • ${targetTableObj.name}` : ''}`}
                      </span>
                      <p className="text-xs text-stone-600">
                        {targetTableObj?.area === 'airconditioned'
                          ? 'Air-Con'
                          : 'Non-A/C'}{' '}
                        • {targetTableObj?.capacity || 4} Person Capacity
                        {targetTableObj?.setup ? ` • ${targetTableObj.setup}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-amber-900 bg-amber-200/80 rounded-full px-2.5 py-1">
                    Cashier Verified
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {onSwitchToOnline && (
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchToOnline();
                        onClose();
                      }}
                      className="text-stone-600 hover:text-stone-900 text-xs font-bold underline cursor-pointer"
                    >
                      Use Online Ordering instead
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="ml-auto flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-2.5 text-xs font-extrabold text-stone-950 shadow-md hover:bg-amber-400 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Transmitting...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          {isChangingTable
                            ? `Request Change to Table #${selectedTableNumber}`
                            : `Request Table #${selectedTableNumber} Confirmation`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
