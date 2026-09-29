import React, { useState } from 'react';
import { Table } from '../../types';
import {
  X,
  Utensils,
  ShoppingBag,
  Users,
  CheckCircle2,
  Wind,
  Sun,
  Layers,
} from 'lucide-react';

interface TableSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: Table[];
  selectedTable: number | '';
  onSelectTable: (tableNumber: number) => void;
  onNoTableNeeded: () => void;
}

export const TableSelectModal: React.FC<TableSelectModalProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTable,
  onSelectTable,
  onNoTableNeeded,
}) => {
  const [areaFilter, setAreaFilter] = useState<'all' | 'airconditioned' | 'normal'>('all');

  if (!isOpen) return null;

  const filteredTables = tables.filter((t) => {
    if (areaFilter === 'all') return true;
    return t.area === areaFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 sm:p-5 shadow-2xl space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500 text-stone-950 shadow-xs">
              <Utensils className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-display text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
              Choose Table
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-stone-200 dark:border-stone-750 text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition p-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Primary Action: No Table Needed (Take-out / Counter Pick-up) */}
        <button
          type="button"
          onClick={onNoTableNeeded}
          className="w-full group flex items-center justify-between rounded-xl border border-dashed border-amber-300 dark:border-amber-600/50 bg-gradient-to-r from-amber-50/80 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/30 px-3 py-2 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 hover:border-amber-400 transition text-left active:scale-98 shadow-2xs cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-amber-500 text-stone-950 shadow-xs group-hover:scale-105 transition">
              <ShoppingBag className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
              No Table Needed
            </span>
          </div>
        </button>

        {/* Divider / Table Selection Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
              <Layers className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>

            {/* Area Filter Tabs */}
            <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setAreaFilter('all')}
                className={`px-2 py-0.5 rounded-md transition ${
                  areaFilter === 'all'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                All ({tables.length})
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('airconditioned')}
                className={`px-2 py-0.5 rounded-md transition flex items-center gap-1 ${
                  areaFilter === 'airconditioned'
                    ? 'bg-sky-500 text-white shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Wind className="h-2.5 w-2.5" />
                <span>AC</span>
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('normal')}
                className={`px-2 py-0.5 rounded-md transition flex items-center gap-1 ${
                  areaFilter === 'normal'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                <Sun className="h-2.5 w-2.5" />
                <span>Main</span>
              </button>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[50vh] sm:max-h-80 overflow-y-auto pr-1">
            {filteredTables.map((t) => {
              const isSelected = selectedTable === t.tableNumber;
              const isOccupied = t.status === 'occupied';
              const isReserved = t.status === 'reserved';

              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTable(t.tableNumber)}
                  className={`relative flex flex-col justify-between rounded-2xl border p-3 text-left transition active:scale-95 cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/90 dark:bg-amber-950/60 shadow-md ring-2 ring-amber-400'
                      : isOccupied
                      ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/30 hover:border-rose-300'
                      : isReserved
                      ? 'border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/30 hover:border-amber-300'
                      : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/90 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-stone-50/80 dark:hover:bg-stone-750 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <span className="font-display text-sm font-extrabold text-stone-900 dark:text-stone-100 block truncate">
                        Table #{t.tableNumber}
                      </span>
                      {t.name && (
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block truncate">
                          {t.name}
                        </span>
                      )}
                    </div>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase shrink-0 ${
                        isOccupied
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : isReserved
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  {t.setup && (
                    <div className="mt-1 text-[10px] text-stone-500 dark:text-stone-400 font-medium truncate">
                      {t.setup}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{t.capacity || 4} Seats</span>
                    </span>
                    <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500">
                      {t.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
