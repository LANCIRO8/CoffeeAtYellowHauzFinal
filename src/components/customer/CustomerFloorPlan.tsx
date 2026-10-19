import React, { useState, useMemo } from 'react';
import { Table, FloorArea } from '../../types';
import { AppStore } from '../../services/store';
import {
  Users,
  Sparkles,
  Wind,
  Coffee,
  Info,
  Utensils,
  Armchair,
  Sofa,
  Link2,
  Calendar,
  Check,
} from 'lucide-react';

interface CustomerFloorPlanProps {
  tables: Table[];
  onSelectTable: (table: Table) => void;
  selectedTableId?: number | null;
}

interface AreaMeta {
  key: string;
  name: string;
  description: string;
  icon: string;
  isAircon: boolean;
}

interface AreaGroup {
  meta: AreaMeta;
  tables: Table[];
}

export const CustomerFloorPlan: React.FC<CustomerFloorPlanProps> = ({
  tables,
  onSelectTable,
  selectedTableId,
}) => {
  const [hoveredTableId, setHoveredTableId] = useState<number | null>(null);
  const [areaFilter, setAreaFilter] = useState<'all' | 'airconditioned' | 'normal'>('all');

  // Dynamic Floor Area grouping exactly synchronized with TableManagement & Floor Areas
  const areaGroups: AreaGroup[] = useMemo(() => {
    const areaMap = new Map<string, AreaGroup>();
    const floorAreas = AppStore.getFloorAreas();

    // Initialize with all registered floor areas
    floorAreas.forEach((oa) => {
      areaMap.set(oa.id.toLowerCase(), {
        meta: {
          key: oa.id,
          name: oa.name,
          description: oa.description || '',
          icon: oa.icon || '☕',
          isAircon: Boolean(oa.isAircon),
        },
        tables: [],
      });
    });

    tables.forEach((t) => {
      const rawAreaName = (
        t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')
      )
        .toLowerCase()
        .trim();

      let group = areaMap.get(rawAreaName);
      if (!group) {
        const matched = floorAreas.find(
          (a) =>
            a.name.toLowerCase().trim() === rawAreaName ||
            a.id.toLowerCase().trim() === rawAreaName
        );
        if (matched) {
          group = areaMap.get(matched.id.toLowerCase());
        }
      }

      if (!group) {
        const cleanAreaName = (t.areaName || (t.area === 'airconditioned' ? 'Air-Con' : 'Main'))
          .replace(/\s*area\b/gi, '')
          .trim();
        const meta: AreaMeta = {
          key: rawAreaName,
          name: cleanAreaName,
          description: t.setup || `${t.capacity} Chairs`,
          icon: t.area === 'airconditioned' ? '❄️' : '🌿',
          isAircon: t.area === 'airconditioned',
        };
        group = { meta, tables: [] };
        areaMap.set(rawAreaName, group);
      }
      group.tables.push(t);
    });

    // Sort tables by table number inside each area
    const groups = Array.from(areaMap.values())
      .filter((g) => g.tables.length > 0)
      .map((g) => ({
        ...g,
        tables: [...g.tables].sort((a, b) => a.tableNumber - b.tableNumber),
      }));

    return groups;
  }, [tables]);

  // Filter groups according to climate selection
  const filteredAreaGroups = useMemo(() => {
    if (areaFilter === 'all') return areaGroups;
    if (areaFilter === 'airconditioned') return areaGroups.filter((g) => g.meta.isAircon);
    return areaGroups.filter((g) => !g.meta.isAircon);
  }, [areaGroups, areaFilter]);

  const airconTablesCount = useMemo(
    () => tables.filter((t) => t.area === 'airconditioned').length,
    [tables]
  );
  const normalTablesCount = useMemo(
    () => tables.filter((t) => t.area !== 'airconditioned').length,
    [tables]
  );

  // Specialized Architectural Blueprint for Areas where a Long Couch is shared by 2 Tables (Kolin, Door, Entrance)
  const renderSharedCouchAreaBlueprint = (group: AreaGroup, areaTables: Table[]) => {
    const allAreaTables = tables.filter((t) => {
      const a = (t.areaName || '').toLowerCase();
      return a === group.meta.key;
    });

    const t1 =
      areaTables.find(
        (t) =>
          t.code === 'table7_kolin_1' ||
          t.code === 'table10_door_1' ||
          t.code === 'table13_entrance_1' ||
          (t.name || '').toLowerCase().includes('table 1') ||
          t.code?.includes('_1') ||
          t.tableNumber === 1 ||
          t.tableNumber === 7 ||
          t.tableNumber === 10 ||
          t.tableNumber === 13
      ) ||
      allAreaTables.find(
        (t) =>
          t.code === 'table7_kolin_1' ||
          t.code === 'table10_door_1' ||
          t.code === 'table13_entrance_1' ||
          (t.name || '').toLowerCase().includes('table 1') ||
          t.code?.includes('_1')
      );

    const t2 =
      areaTables.find(
        (t) =>
          t.code === 'table8_kolin_2' ||
          t.code === 'table11_door_2' ||
          t.code === 'table14_entrance_2' ||
          (t.name || '').toLowerCase().includes('table 2') ||
          t.code?.includes('_2') ||
          t.tableNumber === 2 ||
          t.tableNumber === 8 ||
          t.tableNumber === 11 ||
          t.tableNumber === 14
      ) ||
      allAreaTables.find(
        (t) =>
          t.code === 'table8_kolin_2' ||
          t.code === 'table11_door_2' ||
          t.code === 'table14_entrance_2' ||
          (t.name || '').toLowerCase().includes('table 2') ||
          t.code?.includes('_2')
      );

    const couch =
      areaTables.find(
        (t) =>
          (t.name || '').toLowerCase().includes('couch') ||
          t.code?.includes('couch') ||
          t.tableNumber === 9 ||
          t.tableNumber === 12 ||
          t.tableNumber === 15
      ) ||
      allAreaTables.find(
        (t) =>
          (t.name || '').toLowerCase().includes('couch') ||
          t.code?.includes('couch') ||
          t.tableNumber === 9 ||
          t.tableNumber === 12 ||
          t.tableNumber === 15
      );

    if (!t1 || !t2 || !couch) return null;

    const isT1Selected = selectedTableId === t1.id;
    const isT2Selected = selectedTableId === t2.id;
    const isCouchSelected = selectedTableId === couch.id;

    return (
      <div className="w-full max-w-[320px] mx-auto py-1 space-y-2.5 font-sans select-none">
        {/* 1. TOP: The Continuous Long Couch (1 Couch with 2 Occupants) */}
        <div
          onClick={() => onSelectTable(couch)}
          className={`w-full rounded-2xl border-2 p-2 shadow-2xs transition cursor-pointer active:scale-98 ${
            isCouchSelected
              ? 'border-amber-500 bg-amber-100/80 dark:bg-amber-950/60 ring-4 ring-amber-400/40'
              : couch.status === 'occupied'
              ? 'border-stone-700 bg-stone-900/90 text-stone-300'
              : 'border-amber-500 dark:border-amber-400 bg-amber-50/40 dark:bg-stone-850 hover:border-amber-400 hover:bg-amber-100/40'
          }`}
          title={`${couch.name} (Table #${couch.tableNumber}) • Capacity: 2 • Shared with Table 1 & 2`}
        >
          <div className="flex items-center justify-between px-1 mb-1.5 text-[10px] font-extrabold text-amber-950 dark:text-amber-200">
            <span className="flex items-center gap-1">
              <Sofa className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>{couch.name || `Couch #${couch.tableNumber}`}</span>
            </span>
            <span className="text-[9px] font-bold text-amber-800 dark:text-amber-300">
              {couch.capacity} Seats • {couch.status === 'occupied' ? 'Occupied' : 'Available'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((idx) => (
              <div
                key={idx}
                className={`h-9 rounded-xl flex items-center justify-center font-bold text-xs gap-1 transition ${
                  couch.status === 'occupied'
                    ? 'bg-stone-800 text-stone-400'
                    : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-400/80'
                }`}
              >
                <Sofa className="h-4 w-4" />
                <span>Seat {idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. CENTER: The Two Shared Tables */}
        <div className="grid grid-cols-2 gap-2">
          {/* Table 1 */}
          <button
            type="button"
            onClick={() => onSelectTable(t1)}
            className={`h-11 sm:h-12 rounded-xl border px-2 text-stone-950 flex flex-col items-center justify-center shadow-xs transition font-black cursor-pointer active:scale-95 ${
              isT1Selected
                ? 'bg-amber-400 border-stone-950 ring-4 ring-amber-400/40 scale-102'
                : t1.status === 'occupied'
                ? 'bg-stone-800 text-stone-300 border-stone-700'
                : 'bg-amber-500 hover:bg-amber-400 border-amber-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono text-xs sm:text-sm font-black">T{t1.tableNumber}</span>
            </div>
            <span className="text-[9px] font-semibold opacity-85">
              {t1.status === 'occupied' ? 'Occupied' : 'Reserve'}
            </span>
          </button>

          {/* Table 2 */}
          <button
            type="button"
            onClick={() => onSelectTable(t2)}
            className={`h-11 sm:h-12 rounded-xl border px-2 text-stone-950 flex flex-col items-center justify-center shadow-xs transition font-black cursor-pointer active:scale-95 ${
              isT2Selected
                ? 'bg-amber-400 border-stone-950 ring-4 ring-amber-400/40 scale-102'
                : t2.status === 'occupied'
                ? 'bg-stone-800 text-stone-300 border-stone-700'
                : 'bg-amber-500 hover:bg-amber-400 border-amber-400'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono text-xs sm:text-sm font-black">T{t2.tableNumber}</span>
            </div>
            <span className="text-[9px] font-semibold opacity-85">
              {t2.status === 'occupied' ? 'Occupied' : 'Reserve'}
            </span>
          </button>
        </div>

        {/* 3. FRONT: Each Table's Opposite Chairs */}
        <div className="grid grid-cols-2 gap-2">
          {/* Chair for Table 1 */}
          <div
            onClick={() => onSelectTable(t1)}
            className="flex items-center justify-center cursor-pointer"
          >
            <div
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl grid place-items-center transition-all ${
                t1.status === 'occupied'
                  ? 'bg-stone-800 text-stone-400'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80 hover:bg-emerald-500/25'
              }`}
            >
              <Armchair className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
          </div>

          {/* Chair for Table 2 */}
          <div
            onClick={() => onSelectTable(t2)}
            className="flex items-center justify-center cursor-pointer"
          >
            <div
              className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl grid place-items-center transition-all ${
                t2.status === 'occupied'
                  ? 'bg-stone-800 text-stone-400'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80 hover:bg-emerald-500/25'
              }`}
            >
              <Armchair className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Modern Table Card Rendering (enlarged chairs and table, unified blueprints)
  const renderTableCard = (table: Table) => {
    const isSelected = selectedTableId === table.id;
    const isHovered = hoveredTableId === table.id;
    const isAircon = table.area === 'airconditioned';

    const isLarge = table.capacity >= 6;
    const isFourSeater = table.capacity >= 4 && table.capacity < 6;
    const isTwoSeater = table.capacity <= 2;
    const isCouchTable =
      (table.name || '').toLowerCase().includes('couch') ||
      table.code?.includes('couch') ||
      table.tableNumber === 9 ||
      table.tableNumber === 12 ||
      table.tableNumber === 15;
    const isSharesLongCouch =
      table.tableNumber === 7 ||
      table.tableNumber === 8 ||
      table.tableNumber === 10 ||
      table.tableNumber === 11 ||
      table.tableNumber === 13 ||
      table.tableNumber === 14;

    const isAvailable = table.status === 'available';
    const isReserved = table.status === 'reserved';
    const isOccupied = table.status === 'occupied';

    return (
      <div
        key={table.id}
        onMouseEnter={() => setHoveredTableId(table.id)}
        onMouseLeave={() => setHoveredTableId(null)}
        onClick={() => onSelectTable(table)}
        className={`relative flex flex-col justify-between rounded-2xl sm:rounded-3xl p-3 sm:p-4 w-fit min-w-[155px] sm:min-w-[175px] max-w-full transition-all duration-200 border shadow-xs hover:shadow-md cursor-pointer select-none ${
          isSelected
            ? 'border-amber-500 bg-amber-50/95 dark:bg-amber-950/50 ring-4 ring-amber-400/30 dark:ring-amber-400/40 scale-[1.02] z-30'
            : isHovered
            ? 'border-amber-400 bg-amber-50/50 dark:bg-stone-800 shadow-lg scale-[1.01] z-20'
            : isReserved
            ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/30 dark:bg-stone-850'
            : isOccupied
            ? 'border-stone-300 dark:border-stone-700 bg-stone-100/90 dark:bg-stone-900 opacity-90'
            : 'border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-850 hover:border-amber-400 dark:hover:border-amber-500'
        }`}
      >
        {/* Table Top Header: Number, Name & Capacity Tag */}
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black shadow-xs shrink-0 ${
                isSelected || isHovered
                  ? 'bg-amber-500 text-stone-950'
                  : isAircon
                  ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-900 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700'
              }`}
            >
              T{table.tableNumber}
            </span>
            <div className="min-w-0">
              <span className="text-[11px] sm:text-xs font-black truncate block text-stone-900 dark:text-stone-100">
                {table.name || `Table ${table.tableNumber}`}
              </span>
              <span className="text-[9px] sm:text-[10px] text-stone-400 dark:text-stone-500 font-semibold block truncate">
                {isAircon ? '❄️ Air-Con' : '🌿 Non-A/C'}
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold shrink-0 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {table.capacity}p
          </span>
        </div>

        {/* Visual Architectural Blueprint of Table & Chairs */}
        <div className="py-2.5 flex items-center justify-center">
          {isCouchTable ? (
            /* SOFA / COUCH SCHEMATIC */
            <div className="flex flex-col items-center py-1">
              <div className="w-28 sm:w-32 rounded-xl bg-amber-500 border border-amber-400 p-1.5 text-stone-950 shadow-xs flex flex-col items-center justify-center">
                <Sofa className="h-5 w-5 mb-0.5" />
                <span className="font-mono text-xs font-black">T{table.tableNumber}</span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-2">
                {[...Array(table.capacity)].map((_, idx) => (
                  <div
                    key={idx}
                    className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-400/80 text-emerald-700 flex items-center justify-center"
                  >
                    <Sofa className="h-4 w-4" />
                  </div>
                ))}
              </div>
            </div>
          ) : isLarge ? (
            /* LONG TABLE (6+ SEATER) SCHEMATIC */
            <div className="flex flex-col items-center py-1">
              {/* Top Chairs row */}
              <div className="flex items-center justify-center gap-1.5 mb-1.5 flex-wrap">
                {[...Array(Math.ceil(table.capacity / 2))].map((_, idx) => (
                  <div
                    key={idx}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl grid place-items-center text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60"
                  >
                    <Armchair className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </div>
                ))}
              </div>

              {/* Wooden Table Top Surface */}
              <div className="w-full max-w-[260px] h-9 sm:h-10 rounded-xl bg-amber-500 border border-amber-400 shadow-2xs flex items-center justify-center gap-2 px-3 text-stone-950">
                <Utensils className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-950 shrink-0" />
                <span className="font-mono font-black text-xs sm:text-sm tracking-wider text-stone-950">
                  T{table.tableNumber}
                </span>
              </div>

              {/* Bottom Chairs row */}
              <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                {[...Array(Math.floor(table.capacity / 2))].map((_, idx) => (
                  <div
                    key={idx}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl grid place-items-center text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60"
                  >
                    <Armchair className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </div>
                ))}
              </div>
            </div>
          ) : isSharesLongCouch ? (
            /* SHARED LONG COUCH TABLE (TABLE 1 OR TABLE 2 WITH 1 OPPOSITE CHAIR) */
            <div className="flex flex-col items-center justify-center gap-2 py-1">
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-[9px] font-bold shadow-2xs">
                <Sofa className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>Shared Couch</span>
              </div>

              <div className="h-10 sm:h-11 w-24 sm:w-28 rounded-xl bg-amber-500 border border-amber-400 shadow-2xs flex items-center justify-center gap-1 text-stone-950 px-2 font-black">
                <Utensils className="h-3 w-3 shrink-0" />
                <span className="font-mono text-xs font-black text-stone-950">T{table.tableNumber}</span>
              </div>

              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl grid place-items-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80">
                <Armchair className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
            </div>
          ) : isFourSeater ? (
            /* 4-SEATER TABLE SCHEMATIC */
            <div className="flex flex-col items-center py-1">
              {/* Top Chair */}
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl grid place-items-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80 mb-1">
                <Armchair className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>

              {/* Center row: Left Chair + Table + Right Chair */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl grid place-items-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80">
                  <Armchair className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </div>
                <div className="h-11 w-14 sm:h-12 sm:w-16 rounded-xl bg-amber-500 border border-amber-400 shadow-2xs flex flex-col items-center justify-center text-stone-950 font-black">
                  <Utensils className="h-3 w-3 text-stone-950 mb-0.5" />
                  <span className="font-mono text-xs font-black text-stone-950">T{table.tableNumber}</span>
                </div>
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl grid place-items-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80">
                  <Armchair className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </div>
              </div>

              {/* Bottom Chair */}
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl grid place-items-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80 mt-1">
                <Armchair className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
            </div>
          ) : (
            /* STANDARD 1 TO 2 CHAIR TABLE SCHEMATIC */
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 py-1">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl grid place-items-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80">
                <Armchair className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
              </div>

              <div className="h-12 sm:h-13 w-15 sm:w-17 rounded-xl sm:rounded-2xl bg-amber-500 border border-amber-400 shadow-2xs flex flex-col items-center justify-center text-stone-950 font-black">
                <Utensils className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-950 mb-0.5" />
                <span className="font-mono text-xs sm:text-sm font-black text-stone-950">
                  T{table.tableNumber}
                </span>
              </div>

              {table.capacity > 1 ? (
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl sm:rounded-2xl grid place-items-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80">
                  <Armchair className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
                </div>
              ) : (
                <div className="h-10 w-10 sm:h-11 sm:w-11" />
              )}
            </div>
          )}
        </div>

        {/* Status Indicator & Book Action */}
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-1 text-[10px] font-bold">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                isOccupied
                  ? 'bg-stone-400'
                  : isReserved
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
            <span
              className={`truncate ${
                isOccupied
                  ? 'text-stone-400'
                  : isReserved
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {isOccupied ? 'Occupied' : isReserved ? 'Reserved' : 'Available'}
            </span>
          </div>

          <span className="font-black text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 underline shrink-0 flex items-center gap-0.5">
            <span>Book</span>
            <Sparkles className="h-3 w-3 text-amber-500" />
          </span>
        </div>

        {/* Hover Floating Tooltip */}
        {isHovered && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-[100] pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 drop-shadow-xl">
            <div className="flex items-center gap-1.5 rounded-xl bg-stone-950/95 backdrop-blur-sm px-3 py-1.5 text-xs font-black text-amber-300 shadow-2xl border border-amber-400/80">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />
              <span>Reserve Table #{table.tableNumber}</span>
              <span className="text-[10px] text-amber-200/90 font-medium ml-0.5">
                • {table.capacity} Seats
              </span>
            </div>
            <div className="mx-auto h-0 w-0 border-x-5 border-x-transparent border-t-5 border-t-amber-400" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Floor Plan Architectural Stage */}
      <div className="relative rounded-2xl sm:rounded-3xl border-2 border-stone-300 dark:border-stone-800 bg-[#fbf9f5] dark:bg-stone-900 p-3 sm:p-5 md:p-6 shadow-inner overflow-x-auto">
        {/* Subtle architectural grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none rounded-2xl sm:rounded-3xl"
          style={{
            backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Architectural Legend & Landmarks Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 mb-4 sm:mb-6 pb-3 border-b border-stone-200/90 dark:border-stone-800 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Quick Area Filters */}
            <div className="flex items-center gap-1 rounded-xl bg-stone-200/60 dark:bg-stone-800/80 p-1">
              <button
                type="button"
                onClick={() => setAreaFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-black transition cursor-pointer ${
                  areaFilter === 'all'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                All ({tables.length})
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('airconditioned')}
                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-black transition cursor-pointer ${
                  areaFilter === 'airconditioned'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                ❄️ Air-Con ({airconTablesCount})
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('normal')}
                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-black transition cursor-pointer ${
                  areaFilter === 'normal'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                🌿 Non-A/C ({normalTablesCount})
              </button>
            </div>

            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950" />
              <span className="font-bold text-[10px] sm:text-xs text-stone-700 dark:text-stone-300">
                Available
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-100 dark:ring-amber-950" />
              <span className="font-bold text-[10px] sm:text-xs text-stone-700 dark:text-stone-300">
                Reserved
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-stone-900 dark:bg-stone-400 ring-2 ring-stone-200 dark:ring-stone-700" />
              <span className="font-bold text-[10px] sm:text-xs text-stone-700 dark:text-stone-300">
                Occupied
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 font-medium text-[10px] sm:text-xs">
            <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Click any table below to reserve for your party</span>
          </div>
        </div>

        {/* Dynamic Floor Plan Grid: At least 3 columns in tablet view (md:grid-cols-3) */}
        <div className="relative z-10 w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 items-start">
            {filteredAreaGroups.map((group: AreaGroup) => {
              const areaTables = group.tables;
              const isSharedCouchArea =
                group.meta.key === 'kolin area' ||
                group.meta.key === 'door area' ||
                group.meta.key === 'entrance area';

              return (
                <div
                  key={group.meta.key}
                  className="rounded-2xl sm:rounded-3xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-850 p-3 sm:p-4 shadow-xs space-y-3"
                >
                  {/* Area Header */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap border-b border-stone-100 dark:border-stone-800 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base sm:text-lg shrink-0">{group.meta.icon}</span>
                      <div className="min-w-0">
                        <h4 className="font-serif text-sm sm:text-base font-black text-stone-950 dark:text-stone-100 uppercase tracking-wide truncate">
                          {group.meta.name.replace(/\s*area\b/gi, '').trim()}
                        </h4>
                        {group.meta.description && (
                          <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate max-w-[180px] sm:max-w-[210px]">
                            {group.meta.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold border shrink-0 ${
                        group.meta.isAircon
                          ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/60'
                          : 'bg-amber-100 dark:bg-[#261a10] text-amber-900 dark:text-[#f59e0b] border-amber-300/80 dark:border-[#78350f]/60'
                      }`}
                    >
                      {group.meta.isAircon ? '❄️ Air-Con' : '🌿 Non-A/C'}
                    </span>
                  </div>

                  {/* Tables / Blueprint inside this Area */}
                  <div className="w-full flex justify-center items-center">
                    {isSharedCouchArea ? (
                      renderSharedCouchAreaBlueprint(group, areaTables) || (
                        <div className="flex flex-wrap gap-3 items-center justify-center w-full">
                          {areaTables.map(renderTableCard)}
                        </div>
                      )
                    ) : (
                      <div className="flex flex-wrap gap-3 items-center justify-center w-full">
                        {areaTables.map(renderTableCard)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
