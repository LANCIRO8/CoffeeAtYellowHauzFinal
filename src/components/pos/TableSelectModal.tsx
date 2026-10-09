import React, { useState } from 'react';
import { Table, Order } from '../../types';
import { AppStore } from '../../services/store';
import {
  X,
  Utensils,
  ShoppingBag,
  Users,
  CheckCircle2,
  Wind,
  Sun,
  Layers,
  ChevronRight,
  ArrowLeft,
  Check,
  Armchair,
  Sparkles,
  Link2,
  Unlink,
} from 'lucide-react';
import { CombineTablesModal } from './CombineTablesModal';

interface TableSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  selectedTable: number | '';
  initialOccupants?: number;
  onSelectTable: (tableNumber: number, occupants: number) => void;
  onNoTableNeeded: () => void;
}

const AREA_DISPLAY_CONFIG: Record<
  string,
  { label: string; icon: string; isAircon: boolean }
> = {
  '1st aircon area': { label: '1st Aircon Area', icon: '❄️', isAircon: true },
  'left side of center area': {
    label: 'Left Side of Center Area',
    icon: '🌿',
    isAircon: false,
  },
  'kolin area': { label: 'Kolin Area', icon: '❄️', isAircon: true },
  'door area': { label: 'Door Area', icon: '🚪', isAircon: false },
  'entrance area': { label: 'Entrance Area', icon: '✨', isAircon: false },
  'spotlight area': { label: 'Spotlight Area', icon: '💡', isAircon: false },
  '2nd aircon area': { label: '2nd Aircon Area', icon: '❄️', isAircon: true },
  '3rd aircon area': { label: '3rd Aircon Area', icon: '❄️', isAircon: true },
  'center area': { label: 'Center Area', icon: '🏛️', isAircon: false },
  'window area': { label: 'Window Area', icon: '🪟', isAircon: false },
};

export const TableSelectModal: React.FC<TableSelectModalProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTable,
  initialOccupants = 1,
  onSelectTable,
  onNoTableNeeded,
}) => {
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [pendingTable, setPendingTable] = useState<Table | null>(null);
  const [occupants, setOccupants] = useState<number>(initialOccupants);
  const [isCombineModalOpen, setIsCombineModalOpen] = useState(false);
  const [localTables, setLocalTables] = useState<Table[]>(tables);

  React.useEffect(() => {
    if (isOpen) {
      setLocalTables(AppStore.getTables());
      setPendingTable(null);
      setOccupants(initialOccupants);
    }
  }, [isOpen, initialOccupants]);

  React.useEffect(() => {
    if (!isOpen) return;
    const unsub = AppStore.subscribe(() => {
      setLocalTables(AppStore.getTables());
    });
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const orders = AppStore.getOrders();

  // Distinct area keys present in tables
  const areaKeys = Array.from(
    new Set(localTables.map((t) => t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')))
  );

  const filteredTables = localTables.filter((t) => {
    if (selectedAreaFilter === 'all') return true;
    const aName = t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area');
    return aName === selectedAreaFilter;
  });

  const handleChooseTableCard = (t: Table) => {
    let target = t;
    if (t.isCombinedCompanion && t.primaryTableId) {
      const primary = localTables.find((p) => p.id === t.primaryTableId);
      if (primary) target = primary;
    }
    const details = AppStore.getTableOccupancyDetails(target, orders);
    if (details.availableChairs <= 0) return; // fully occupied

    setPendingTable(target);
    // default to 1 or previous selected if within available
    setOccupants(1);
  };

  const handleConfirmOccupants = () => {
    if (!pendingTable) return;
    onSelectTable(pendingTable.tableNumber, occupants);
    setPendingTable(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/65 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs font-black">
              <Utensils className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                {pendingTable ? 'Select Occupants' : 'Choose Table & Seating'}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {pendingTable
                  ? `Specify how many guests will seat at Table #${pendingTable.tableNumber}`
                  : 'Divided by Areas, Tables, & Chairs. Tables can seat multiple customers as long as chairs are free!'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingTable(null);
              onClose();
            }}
            className="rounded-xl border border-stone-200 dark:border-stone-750 text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition p-1.5 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* STEP 2: Occupant Selector if a table is clicked */}
        {pendingTable ? (
          (() => {
            const occDetails = AppStore.getTableOccupancyDetails(pendingTable, orders);
            const maxAllowed = occDetails.availableChairs;

            return (
              <div className="space-y-5 py-2 animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={() => setPendingTable(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Choose a different table</span>
                </button>

                {/* Table Summary Card */}
                <div className="rounded-2xl border-2 border-amber-400/80 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-stone-800 dark:to-stone-850 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                        {pendingTable.areaName?.toUpperCase() || (pendingTable.area === 'airconditioned' ? 'AIR-CON' : 'NON-A/C')}
                      </span>
                      <h4 className="font-display text-lg sm:text-xl font-black text-stone-950 dark:text-stone-100">
                        Table #{pendingTable.tableNumber} {pendingTable.name ? `• ${pendingTable.name}` : ''}
                      </h4>
                      <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                        {pendingTable.setup || `${pendingTable.capacity} Chairs`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300">
                        {occDetails.availableChairs} of {pendingTable.capacity} Chairs Available
                      </span>
                      {occDetails.occupiedChairs > 0 && (
                        <p className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold mt-1">
                          ({occDetails.occupiedChairs} currently seated)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Chairs visualization */}
                  <div className="mt-4 pt-3 border-t border-amber-200/60 dark:border-stone-700">
                    <p className="text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-2">
                      Chair Layout & Occupancy:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {occDetails.chairsWithOccupants.map((ch) => (
                        <div
                          key={ch.id}
                          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold border ${
                            ch.isOccupied
                              ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          <Armchair className="h-3.5 w-3.5 shrink-0" />
                          <span>{ch.label}</span>
                          <span className="text-[10px] font-medium opacity-85">
                            {ch.isOccupied ? `(${ch.customerName || 'Occupied'})` : '(Free)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* OCCUPANT QUESTION */}
                <div className="rounded-2xl border border-stone-200 dark:border-stone-750 bg-stone-50 dark:bg-stone-800/60 p-4 sm:p-5 space-y-4">
                  <div>
                    <h5 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                      How many occupants will be seating?
                    </h5>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Instead of occupying the whole table, select how many chairs this customer needs.
                      Remaining chairs stay free for other customers!
                    </p>
                  </div>

                  {/* Quick Select Pill Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: maxAllowed }, (_, idx) => idx + 1).map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setOccupants(cnt)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer active:scale-95 ${
                          occupants === cnt
                            ? 'bg-amber-500 text-stone-950 shadow-md ring-2 ring-amber-400'
                            : 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-600 hover:border-amber-400'
                        }`}
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          {cnt} {cnt === 1 ? 'Occupant' : 'Occupants'}
                        </span>
                        {occupants === cnt && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </button>
                    ))}
                  </div>

                  {/* Stepper Controls */}
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
                      Custom Adjust:
                    </span>
                    <div className="inline-flex items-center rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 p-1">
                      <button
                        type="button"
                        onClick={() => setOccupants((prev) => Math.max(1, prev - 1))}
                        disabled={occupants <= 1}
                        className="h-7 w-7 rounded-lg grid place-items-center font-black text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 disabled:opacity-30 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-mono font-black text-sm text-stone-900 dark:text-stone-100">
                        {occupants}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOccupants((prev) => Math.min(maxAllowed, prev + 1))}
                        disabled={occupants >= maxAllowed}
                        className="h-7 w-7 rounded-lg grid place-items-center font-black text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-600 disabled:opacity-30 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      ({maxAllowed - occupants} chair{maxAllowed - occupants === 1 ? '' : 's'} will remain available)
                    </span>
                  </div>
                </div>

                {/* Confirm Action */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setPendingTable(null)}
                    className="rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmOccupants}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm px-6 py-2.5 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>
                      Seat {occupants} {occupants === 1 ? 'Occupant' : 'Occupants'} at Table #{pendingTable.tableNumber}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          /* STEP 1: Table Listing by Area */
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0">
            {/* Primary Action: No Table Needed (Takeaway) */}
            <button
              type="button"
              onClick={onNoTableNeeded}
              className="w-full group flex items-center justify-between rounded-xl border border-dashed border-amber-300 dark:border-amber-600/50 bg-gradient-to-r from-amber-50/80 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/30 px-3.5 py-2.5 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 hover:border-amber-400 transition text-left active:scale-98 shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500 text-stone-950 shadow-xs group-hover:scale-105 transition">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                    No Table Needed (Takeaway / Pick-up)
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400">
                    Order will be prepared for to-go counter pickup
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition" />
            </button>

            {/* Quick Action: Combine Tables for Large Group */}
            <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-300/80 dark:border-amber-700 p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500 text-stone-950 font-black shrink-0">
                  <Link2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-stone-900 dark:text-stone-100 block truncate">
                    Large Party? Combine Tables Together
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 block truncate">
                    Accommodate 4, 6, 8, 10+ guests in the same area without separating them!
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCombineModalOpen(true)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs px-3 py-1.5 shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
              >
                Combine Tables
              </button>
            </div>

            {/* Area Filter Tabs */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                Filter By Area:
              </span>
              <div className="flex flex-wrap gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedAreaFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedAreaFilter === 'all'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  All Areas ({localTables.filter((t) => !t.isCombinedCompanion).length})
                </button>
                {areaKeys.map((areaKey) => {
                  const meta = AREA_DISPLAY_CONFIG[areaKey] || {
                    label: areaKey,
                    icon: '📍',
                    isAircon: false,
                  };
                  const count = localTables.filter(
                    (t) =>
                      !t.isCombinedCompanion &&
                      (t.areaName ||
                        (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')) ===
                        areaKey
                  ).length;
                  return (
                    <button
                      key={areaKey}
                      type="button"
                      onClick={() => setSelectedAreaFilter(areaKey)}
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        selectedAreaFilter === areaKey
                          ? 'bg-amber-500 text-stone-950 font-black shadow-2xs'
                          : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span className="capitalize">{meta.label}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {filteredTables
                .filter((t) => !t.isCombinedCompanion)
                .map((t) => {
                  const occDetails = AppStore.getTableOccupancyDetails(t, orders);
                  const isSelected = selectedTable === t.tableNumber;
                  const isAvailable = occDetails.availableChairs > 0;
                  const isFullyOccupied = occDetails.isFullyOccupied;
                  const isPartiallyOccupied = occDetails.isPartiallyOccupied;

                  const isCombined = Boolean(
                    t.combinedWithTableIds && t.combinedWithTableIds.length > 0
                  );
                  const companionTables = isCombined
                    ? localTables.filter((p) => t.combinedWithTableIds?.includes(p.id))
                    : [];
                  const combinedNums = [
                    t.tableNumber,
                    ...companionTables.map((c) => c.tableNumber),
                  ].sort((a, b) => a - b);
                  const combinedDisplayName =
                    t.combinedGroupName || `Table ${combinedNums.join(' + ')}`;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleChooseTableCard(t)}
                      className={`relative flex flex-col justify-between rounded-2xl border p-3.5 text-left transition ${
                        !isAvailable
                          ? 'opacity-60 bg-stone-100 dark:bg-stone-850 border-stone-200 dark:border-stone-750 cursor-not-allowed'
                          : isSelected
                          ? 'border-amber-500 bg-amber-50/90 dark:bg-amber-950/60 shadow-md ring-2 ring-amber-400 cursor-pointer active:scale-98'
                          : isCombined
                          ? 'border-amber-400 bg-amber-50/50 dark:bg-stone-800/90 hover:border-amber-500 hover:bg-amber-50/80 cursor-pointer active:scale-98 shadow-sm ring-1 ring-amber-400/40'
                          : isPartiallyOccupied
                          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-stone-800 hover:border-amber-500 hover:bg-amber-50/60 cursor-pointer active:scale-98 shadow-2xs'
                          : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-stone-50/80 cursor-pointer active:scale-98 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-mono text-[9px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider block">
                              {t.areaName || (t.area === 'airconditioned' ? 'Air-Con' : 'Main')}
                            </span>
                            <span className="font-display text-sm font-extrabold text-stone-900 dark:text-stone-100 block truncate">
                              {isCombined
                                ? combinedDisplayName
                                : `Table #${t.tableNumber} ${t.name ? `• ${t.name}` : ''}`}
                            </span>
                            {isCombined ? (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="rounded-md bg-amber-500 text-stone-950 px-1.5 py-0.2 text-[8px] font-black uppercase inline-flex items-center gap-1 shadow-2xs">
                                  <Link2 className="h-2.5 w-2.5 stroke-[3]" />
                                  <span>Combined ({t.capacity} Seats Total)</span>
                                </span>
                              </div>
                            ) : null}
                          </div>

                        {/* Status Badge */}
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase shrink-0 ${
                            isFullyOccupied
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : isPartiallyOccupied
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {isFullyOccupied
                            ? 'Full'
                            : isPartiallyOccupied
                            ? `${occDetails.availableChairs} Available`
                            : 'Available'}
                        </span>
                      </div>

                      {t.setup && (
                        <div className="mt-1 text-[10px] text-stone-500 dark:text-stone-400 font-medium truncate">
                          {t.setup}
                        </div>
                      )}
                    </div>

                    {/* Chair Occupancy Indicators & Visual Dots */}
                    <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-750 flex items-center justify-between text-[11px]">
                      {/* Visual chair dots */}
                      <div className="flex items-center gap-1">
                        {occDetails.chairsWithOccupants.map((ch, idx) => (
                          <div
                            key={ch.id || idx}
                            className={`h-2.5 w-2.5 rounded-full ${
                              ch.isOccupied
                                ? 'bg-amber-500 shadow-2xs ring-1 ring-amber-400'
                                : 'bg-emerald-500 ring-1 ring-emerald-300'
                            }`}
                            title={ch.isOccupied ? 'Occupied' : 'Available'}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1 text-stone-700 dark:text-stone-300 font-bold text-[10px]">
                        <Users className="h-3 w-3 text-stone-400" />
                        <span>
                          {occDetails.availableChairs}/{t.capacity} Free
                        </span>
                      </div>

                      {isAvailable ? (
                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                          <span>Select</span>
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-bold">Full</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {!pendingTable && (
          <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 dark:border-stone-750 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* COMBINE TABLES MODAL */}
      {isCombineModalOpen && (
        <CombineTablesModal
          isOpen={isCombineModalOpen}
          onClose={() => setIsCombineModalOpen(false)}
          initialAreaKey={selectedAreaFilter !== 'all' ? selectedAreaFilter : undefined}
          onTablesCombined={() => {
            setLocalTables(AppStore.getTables());
          }}
        />
      )}
    </div>
  );
};
