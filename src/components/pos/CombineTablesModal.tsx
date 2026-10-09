import React, { useState, useMemo, useEffect } from 'react';
import { Table } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  X,
  Link2,
  Unlink,
  Users,
  Check,
  AlertCircle,
  Armchair,
  Sparkles,
  Layers,
  ArrowRight,
  Utensils,
  LayoutGrid,
} from 'lucide-react';

interface CombineTablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAreaKey?: string;
  initialPrimaryTableId?: number;
  onTablesCombined?: () => void;
}

export const CombineTablesModal: React.FC<CombineTablesModalProps> = ({
  isOpen,
  onClose,
  initialAreaKey,
  initialPrimaryTableId,
  onTablesCombined,
}) => {
  const { showAlert, showConfirm } = useModal();
  const [tables, setTables] = useState<Table[]>(() => AppStore.getTables());
  const orders = AppStore.getOrders();

  const [selectedArea, setSelectedArea] = useState<string>(() => {
    if (initialAreaKey) return initialAreaKey;
    const all = AppStore.getTables();
    if (initialPrimaryTableId) {
      const match = all.find((t) => t.id === initialPrimaryTableId);
      if (match) {
        return (match.areaName || (match.area === 'airconditioned' ? '1st aircon area' : 'entrance area')).toLowerCase();
      }
    }
    return '1st aircon area';
  });

  const [primaryTableId, setPrimaryTableId] = useState<number | null>(() => {
    if (initialPrimaryTableId) return initialPrimaryTableId;
    const all = AppStore.getTables();
    const match = all.find(
      (t) => (t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')).toLowerCase() === '1st aircon area'
    );
    return match ? match.id : all[0]?.id || null;
  });

  const [selectedCompanionIds, setSelectedCompanionIds] = useState<number[]>([]);
  const [customGroupName, setCustomGroupName] = useState<string>('');

  // Keep tables in sync with AppStore
  useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setTables(AppStore.getTables());
    });
    return () => unsub();
  }, []);

  // Update selection when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      const currentTables = AppStore.getTables();
      setTables(currentTables);

      let targetArea = '1st aircon area';
      if (initialAreaKey) {
        targetArea = initialAreaKey;
      } else if (initialPrimaryTableId) {
        const match = currentTables.find((t) => t.id === initialPrimaryTableId);
        if (match) {
          targetArea = (
            match.areaName || (match.area === 'airconditioned' ? '1st aircon area' : 'entrance area')
          ).toLowerCase();
        }
      }
      setSelectedArea(targetArea);

      if (initialPrimaryTableId) {
        setPrimaryTableId(initialPrimaryTableId);
      } else {
        const match = currentTables.find(
          (t) =>
            (
              t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')
            ).toLowerCase() === targetArea.toLowerCase()
        );
        setPrimaryTableId(match ? match.id : currentTables[0]?.id || null);
      }
      setSelectedCompanionIds([]);
      setCustomGroupName('');
    }
  }, [isOpen, initialAreaKey, initialPrimaryTableId]);

  // Extract distinct areas
  const areas = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      const a = (
        t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')
      ).toLowerCase();
      set.add(a);
    });
    return Array.from(set);
  }, [tables]);

  // Tables in the selected area
  const areaTables = useMemo(() => {
    return tables.filter((t) => {
      const a = (
        t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')
      ).toLowerCase();
      return a === selectedArea.toLowerCase();
    });
  }, [tables, selectedArea]);

  // Switch area and pick first table as primary
  const handleSelectArea = (areaKey: string) => {
    setSelectedArea(areaKey);
    const tablesInArea = tables.filter((t) => {
      const a = (
        t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')
      ).toLowerCase();
      return a === areaKey.toLowerCase();
    });
    if (tablesInArea.length > 0) {
      setPrimaryTableId(tablesInArea[0].id);
    } else {
      setPrimaryTableId(null);
    }
    setSelectedCompanionIds([]);
    setCustomGroupName('');
  };

  if (!isOpen) return null;

  const primaryTable = tables.find((t) => t.id === primaryTableId);
  const companionTables = tables.filter((t) => selectedCompanionIds.includes(t.id));

  // Compute pooled capacity and seats
  const primaryCap =
    primaryTable?.baseCapacity || primaryTable?.capacity || 2;
  const companionCapSum = companionTables.reduce(
    (sum, c) => sum + (c.baseCapacity || c.capacity || 2),
    0
  );
  const totalPooledCapacity = primaryCap + companionCapSum;

  const handleToggleCompanion = (tableId: number) => {
    if (tableId === primaryTableId) return;
    setSelectedCompanionIds((prev) =>
      prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
    );
  };

  const handleCombine = () => {
    if (!primaryTableId) {
      showAlert({
        title: 'Select Primary Table',
        message: 'Please choose the main table for this combined group.',
        type: 'warning',
      });
      return;
    }

    if (selectedCompanionIds.length === 0) {
      showAlert({
        title: 'Select Tables to Combine',
        message: 'Please select at least one additional table in the same area to combine with.',
        type: 'warning',
      });
      return;
    }

    const res = AppStore.combineTables(
      primaryTableId,
      selectedCompanionIds,
      customGroupName.trim() || undefined
    );

    if (res.success) {
      showAlert({
        title: 'Tables Combined Successfully! 🔗',
        message: res.message,
        type: 'success',
      });
      onTablesCombined?.();
      onClose();
    } else {
      showAlert({
        title: 'Could Not Combine Tables',
        message: res.message,
        type: 'error',
      });
    }
  };

  const handleUncombineCurrent = async (tableToUncombine: Table) => {
    const confirmed = await showConfirm({
      title: 'Split / Uncombine Tables?',
      message: `Separate ${tableToUncombine.combinedGroupName || `Table ${tableToUncombine.tableNumber}`} back into independent tables?`,
      confirmText: 'Uncombine Tables',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (confirmed) {
      const res = AppStore.uncombineTable(tableToUncombine.id);
      if (res.success) {
        showAlert({
          title: 'Tables Separated 🔓',
          message: res.message,
          type: 'success',
        });
        onTablesCombined?.();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-stone-950 shadow-xs font-black">
              <Link2 className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base sm:text-lg font-black text-stone-950 dark:text-stone-100">
                  Combine Tables for Larger Party
                </h3>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-2 py-0.5 text-[9px] font-black uppercase text-amber-900 dark:text-amber-300">
                  Group Seating
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Join tables in the same area into a unified party setup to seat larger groups together without separating them!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 dark:border-stone-750 text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition p-1.5 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
          {/* Step 1: Area Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5 text-amber-500" />
              <span>Select Area for Combined Party:</span>
            </label>
            <div className="flex flex-wrap gap-1.5 bg-stone-100 dark:bg-stone-800/80 p-1.5 rounded-2xl">
              {areas.map((aKey) => {
                const isSelected = selectedArea.toLowerCase() === aKey.toLowerCase();
                const count = tables.filter(
                  (t) =>
                    (t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')).toLowerCase() === aKey
                ).length;
                return (
                  <button
                    key={aKey}
                    type="button"
                    onClick={() => handleSelectArea(aKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:bg-white dark:hover:bg-stone-700'
                    }`}
                  >
                    <span>{aKey.includes('aircon') ? '❄️' : '🌿'}</span>
                    <span>{aKey}</span>
                    <span className="text-[10px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Existing Combined Groups in this area banner */}
          {areaTables.some((t) => t.combinedWithTableIds && t.combinedWithTableIds.length > 0) && (
            <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/40 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-amber-950 dark:text-amber-200">
                <Link2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Currently Combined Tables in this Area:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {areaTables
                  .filter((t) => t.combinedWithTableIds && t.combinedWithTableIds.length > 0)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 rounded-xl bg-white dark:bg-stone-800 border border-amber-300 dark:border-amber-600 px-3 py-1.5 text-xs shadow-2xs"
                    >
                      <div className="font-bold text-stone-900 dark:text-stone-100">
                        {t.combinedGroupName || `Table ${t.tableNumber}`} ({t.capacity} Seats)
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUncombineCurrent(t)}
                        className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 dark:text-rose-400 hover:underline cursor-pointer ml-1"
                        title="Split tables back to separate"
                      >
                        <Unlink className="h-3 w-3" />
                        <span>Split</span>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Step 2: Choose Primary & Companion Tables */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-amber-500" />
                <span>Select Tables to Combine Together:</span>
              </label>
              <span className="text-[10px] text-stone-500 dark:text-stone-400">
                Pick 1 Primary Table + 1 or more Companion Tables
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {areaTables.map((t) => {
                const isPrimary = primaryTableId === t.id;
                const isCompanion = selectedCompanionIds.includes(t.id);
                const isSelected = isPrimary || isCompanion;
                const isAlreadyCompanion = t.isCombinedCompanion && t.primaryTableId !== primaryTableId;
                const occ = AppStore.getTableOccupancyDetails(t, orders);

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      if (isAlreadyCompanion) return;
                      if (!primaryTableId) {
                        setPrimaryTableId(t.id);
                      } else if (isPrimary) {
                        // Clicking primary does nothing or unsets
                      } else {
                        handleToggleCompanion(t.id);
                      }
                    }}
                    className={`relative rounded-2xl border p-3 cursor-pointer transition select-none flex flex-col justify-between ${
                      isPrimary
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md ring-2 ring-amber-400 font-bold'
                        : isCompanion
                        ? 'bg-amber-100 dark:bg-amber-950/70 text-stone-900 dark:text-stone-100 border-amber-400 dark:border-amber-600 shadow-xs'
                        : isAlreadyCompanion
                        ? 'opacity-40 bg-stone-100 dark:bg-stone-800 border-stone-200 cursor-not-allowed'
                        : 'bg-white dark:bg-stone-800/90 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:border-amber-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-6 w-6 rounded-lg grid place-items-center text-xs font-black ${
                                isPrimary
                                  ? 'bg-stone-950 text-amber-400'
                                  : 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              T{t.tableNumber}
                            </span>
                            <span className="font-bold text-xs">
                              {t.name || `Table ${t.tableNumber}`}
                            </span>
                          </div>
                          <p
                            className={`text-[10px] mt-1 ${
                              isPrimary ? 'text-stone-900' : 'text-stone-500 dark:text-stone-400'
                            }`}
                          >
                            {t.setup || `${t.capacity} Chairs`}
                          </p>
                        </div>

                        {/* Status / Role Badge */}
                        {isPrimary ? (
                          <span className="rounded-md bg-stone-950 text-amber-400 px-1.5 py-0.5 text-[8px] font-black uppercase">
                            Primary
                          </span>
                        ) : isCompanion ? (
                          <span className="rounded-md bg-amber-400 text-stone-950 px-1.5 py-0.5 text-[8px] font-black uppercase flex items-center gap-0.5">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                            <span>Joined</span>
                          </span>
                        ) : (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ${
                              occ.availableChairs > 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {occ.availableChairs > 0 ? `${occ.availableChairs} Free` : 'Occupied'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-stone-200/60 dark:border-stone-700/60 flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1">
                        <Armchair className="h-3 w-3" />
                        <span>{t.baseCapacity || t.capacity} Seats</span>
                      </span>

                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPrimaryTableId(t.id);
                            setSelectedCompanionIds((prev) => prev.filter((id) => id !== t.id));
                          }}
                          className={`text-[9px] font-extrabold underline cursor-pointer ${
                            isCompanion ? 'text-stone-900' : 'text-amber-600 hover:text-amber-700'
                          }`}
                        >
                          Make Primary
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Live Preview of Combined Table Layout */}
          {primaryTable && selectedCompanionIds.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-stone-850 dark:to-stone-800 p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500 text-stone-950 font-black">
                    <Link2 className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider">
                      Combined Party Preview
                    </span>
                    <h4 className="font-display text-base font-black text-stone-950 dark:text-stone-100">
                      {[primaryTable.tableNumber, ...companionTables.map((c) => c.tableNumber)]
                        .sort((a, b) => a - b)
                        .map((n) => `Table ${n}`)
                        .join(' + ')}
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-stone-950 font-black px-3 py-1 text-xs shadow-xs">
                    <Users className="h-3.5 w-3.5" />
                    <span>{totalPooledCapacity} Guests Total</span>
                  </div>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    ({primaryCap} from T{primaryTable.tableNumber} +{' '}
                    {companionTables.map((c) => `${c.baseCapacity || c.capacity} from T${c.tableNumber}`).join(' + ')})
                  </p>
                </div>
              </div>

              {/* Physical Unified Schematic Preview */}
              <div className="rounded-xl bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-750 p-3 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1 flex-wrap justify-center py-2">
                  <div className="px-3 py-2 rounded-xl bg-amber-700 text-amber-100 font-mono font-black text-xs border border-amber-600 flex items-center gap-1.5 shadow-xs">
                    <span>T{primaryTable.tableNumber}</span>
                    <span className="text-[10px] font-normal opacity-80">({primaryCap} seats)</span>
                  </div>

                  {companionTables.map((c) => (
                    <React.Fragment key={c.id}>
                      <div className="h-1 w-4 bg-amber-400 rounded-full flex items-center justify-center">
                        <Link2 className="h-3 w-3 text-amber-600" />
                      </div>
                      <div className="px-3 py-2 rounded-xl bg-amber-800 text-amber-100 font-mono font-black text-xs border border-amber-600 flex items-center gap-1.5 shadow-xs">
                        <span>T{c.tableNumber}</span>
                        <span className="text-[10px] font-normal opacity-80">
                          ({c.baseCapacity || c.capacity} seats)
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                <div className="text-[11px] text-stone-500 font-medium mt-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>
                    Guests sit together as one party under a single unified ticket!
                  </span>
                </div>
              </div>

              {/* Optional Custom Group Name Input */}
              <div className="pt-1">
                <label className="text-[10px] font-bold text-stone-600 dark:text-stone-400 block mb-1">
                  Custom Party / Combined Table Label (Optional):
                </label>
                <input
                  type="text"
                  value={customGroupName}
                  onChange={(e) => setCustomGroupName(e.target.value)}
                  placeholder={`e.g. Table ${[primaryTable.tableNumber, ...companionTables.map((c) => c.tableNumber)].join(' + ')} or Big Party of ${totalPooledCapacity}`}
                  className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-800 pt-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 dark:border-stone-750 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCombine}
            disabled={!primaryTableId || selectedCompanionIds.length === 0}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-black text-xs sm:text-sm px-6 py-2.5 shadow-md transition active:scale-95 cursor-pointer"
          >
            <Link2 className="h-4 w-4 stroke-[3]" />
            <span>
              Combine Tables ({totalPooledCapacity} Seats Total)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
