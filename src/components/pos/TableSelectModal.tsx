import React, { useState, useMemo, useEffect } from 'react';
import { Table, Order, FloorArea } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  X,
  Utensils,
  ShoppingBag,
  Users,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Check,
  Armchair,
  Link2,
  Unlink,
  Sofa,
  Ticket,
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

export const TableSelectModal: React.FC<TableSelectModalProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTable,
  initialOccupants = 1,
  onSelectTable,
  onNoTableNeeded,
}) => {
  const [pendingTable, setPendingTable] = useState<Table | null>(null);
  const [occupants, setOccupants] = useState<number>(initialOccupants);
  const [isCombineModalOpen, setIsCombineModalOpen] = useState(false);
  const [localTables, setLocalTables] = useState<Table[]>(tables);
  const { showConfirm, showAlert } = useModal();

  useEffect(() => {
    if (isOpen) {
      setLocalTables(AppStore.getTables());
      setPendingTable(null);
      setOccupants(initialOccupants);
    }
  }, [isOpen, initialOccupants]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = AppStore.subscribe(() => {
      setLocalTables(AppStore.getTables());
    });
    return () => unsub();
  }, [isOpen]);

  const orders = useMemo(() => (isOpen ? AppStore.getOrders() : []), [isOpen, localTables]);

  const handleSplitPendingTable = async (tableToSplit: Table) => {
    const groupName = tableToSplit.combinedGroupName || `Table ${tableToSplit.tableNumber}`;
    const confirmed = await showConfirm({
      title: 'Split / Uncombine Tables?',
      message: `Are you sure you want to separate ${groupName} back into independent tables?`,
      confirmText: 'Split Tables',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (confirmed) {
      const res = AppStore.uncombineTable(tableToSplit.id);
      if (res.success) {
        const refreshed = AppStore.getTables();
        setLocalTables(refreshed);
        const uncombined = refreshed.find((t) => t.id === tableToSplit.id);
        if (uncombined) {
          setPendingTable(uncombined);
          const newOcc = AppStore.getTableOccupancyDetails(uncombined, AppStore.getOrders());
          setOccupants((prev) => Math.min(prev, Math.max(1, newOcc.availableChairs)));
        } else {
          setPendingTable(null);
        }
        showAlert({
          title: 'Tables Split Successfully 🔓',
          message: res.message,
          type: 'success',
        });
      } else {
        showAlert({
          title: 'Cannot Split Table',
          message: res.message || 'Failed to split table group.',
          type: 'error',
        });
      }
    }
  };

  const handleChooseTableCard = (t: Table) => {
    let target = t;
    if (t.isCombinedCompanion && t.primaryTableId) {
      const primary = localTables.find((p) => p.id === t.primaryTableId);
      if (primary) target = primary;
    }
    const details = AppStore.getTableOccupancyDetails(target, orders);
    if (details.availableChairs <= 0) return; // fully occupied

    setPendingTable(target);
    setOccupants(1);
  };

  const handleConfirmOccupants = () => {
    if (!pendingTable) return;
    onSelectTable(pendingTable.tableNumber, occupants);
    setPendingTable(null);
  };

  // Group tables by floor area exactly like in the Tables page
  const areaGroups: AreaGroup[] = useMemo(() => {
    if (!isOpen) return [];
    const areaMap = new Map<string, AreaGroup>();
    const floorAreas = AppStore.getFloorAreas();

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

    localTables.forEach((t) => {
      const rawAreaName = (
        t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')
      ).toLowerCase().trim();

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

    // Sort tables inside each area group: occupied tables first, then table number
    const groups = Array.from(areaMap.values()).map((g) => {
      const sortedTables = [...g.tables].sort((a, b) => {
        const occA = AppStore.getTableOccupancyDetails(a, orders);
        const occB = AppStore.getTableOccupancyDetails(b, orders);
        const isOccA = occA.isFullyOccupied || occA.occupiedChairs > 0 || a.status === 'occupied';
        const isOccB = occB.isFullyOccupied || occB.occupiedChairs > 0 || b.status === 'occupied';

        if (isOccA && !isOccB) return -1;
        if (!isOccA && isOccB) return 1;
        return a.tableNumber - b.tableNumber;
      });

      return {
        ...g,
        tables: sortedTables,
      };
    });

    // Sort area groups so areas with occupied tables/chairs appear first
    return groups.sort((a, b) => {
      const occChairsA = a.tables.reduce((sum, t) => {
        const occ = AppStore.getTableOccupancyDetails(t, orders);
        return sum + (occ.occupiedChairs > 0 || t.status === 'occupied' ? (occ.occupiedChairs || 1) : 0);
      }, 0);
      const occChairsB = b.tables.reduce((sum, t) => {
        const occ = AppStore.getTableOccupancyDetails(t, orders);
        return sum + (occ.occupiedChairs > 0 || t.status === 'occupied' ? (occ.occupiedChairs || 1) : 0);
      }, 0);
      return occChairsB - occChairsA;
    });
  }, [isOpen, localTables, orders]);

  // Specialized Architectural Blueprint for Areas where a Long Couch is shared by 2 Tables (Kolin, Door, Entrance)
  const renderSharedCouchAreaBlueprint = (group: AreaGroup, areaTables: Table[]) => {
    const allAreaTables = localTables.filter((t) => {
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

    const occ1 = AppStore.getTableOccupancyDetails(t1, orders);
    const occ2 = AppStore.getTableOccupancyDetails(t2, orders);
    const occCouch = AppStore.getTableOccupancyDetails(couch, orders);

    const isT1Avail = occ1.availableChairs > 0;
    const isT2Avail = occ2.availableChairs > 0;
    const isCouchAvail = occCouch.availableChairs > 0;

    const isT1Selected = selectedTable === t1.tableNumber;
    const isT2Selected = selectedTable === t2.tableNumber;
    const isCouchSelected = selectedTable === couch.tableNumber;

    return (
      <div className="w-full max-w-[310px] mx-auto py-1 space-y-2 font-sans select-none">
        {/* 1. TOP: The Continuous Long Couch (1 Couch with 2 Occupants) */}
        <div
          onClick={() => isCouchAvail && handleChooseTableCard(couch)}
          className={`w-full rounded-2xl border-2 p-1.5 shadow-2xs transition ${
            !isCouchAvail
              ? 'opacity-65 border-stone-300 dark:border-stone-700 cursor-not-allowed'
              : isCouchSelected
              ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-400 cursor-pointer active:scale-98'
              : 'border-amber-500 dark:border-amber-400 bg-transparent hover:border-amber-400 dark:hover:border-amber-300 hover:bg-amber-50/30 cursor-pointer active:scale-98'
          }`}
          title={`${couch.name} (Table #${couch.tableNumber}) • Capacity: 2 • Shared with Table 1 & 2`}
        >
          {/* 2 Occupant Seats on the Single Couch */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {occCouch.chairsWithOccupants.map((ch, idx) => {
              const isTaken = ch.isOccupied;
              return (
                <div
                  key={ch.id || idx}
                  className={`h-8 sm:h-9 rounded-xl flex items-center justify-center transition ${
                    isTaken
                      ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 shadow-xs'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80 hover:bg-emerald-500/25'
                  }`}
                  title={
                    isTaken
                      ? `Occupied - ${ch.customerName || 'Guest'}`
                      : `${ch.label || `Couch Seat ${idx + 1}`} (T${couch.tableNumber}) - Available`
                  }
                >
                  {isTaken ? (
                    <span className="font-black text-xs">
                      {(ch.customerName || 'G')[0].toUpperCase()}
                    </span>
                  ) : (
                    <Sofa className="h-4 w-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. CENTER: The Two Shared Tables */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {/* Table 1 */}
          <button
            type="button"
            disabled={!isT1Avail}
            onClick={() => isT1Avail && handleChooseTableCard(t1)}
            className={`h-9 sm:h-10 rounded-xl bg-amber-500 hover:bg-amber-400 border border-amber-400 px-2 text-stone-950 flex items-center justify-center gap-1.5 text-center shadow-2xs transition font-black ${
              !isT1Avail
                ? 'opacity-65 cursor-not-allowed'
                : isT1Selected
                ? 'ring-2 ring-stone-950 scale-102 cursor-pointer'
                : 'cursor-pointer active:scale-98'
            }`}
          >
            <Utensils className="h-3 w-3 text-stone-950 shrink-0" />
            <span className="font-mono text-xs sm:text-sm font-black leading-tight">
              T{t1.tableNumber}
            </span>
          </button>

          {/* Table 2 */}
          <button
            type="button"
            disabled={!isT2Avail}
            onClick={() => isT2Avail && handleChooseTableCard(t2)}
            className={`h-9 sm:h-10 rounded-xl bg-amber-500 hover:bg-amber-400 border border-amber-400 px-2 text-stone-950 flex items-center justify-center gap-1.5 text-center shadow-2xs transition font-black ${
              !isT2Avail
                ? 'opacity-65 cursor-not-allowed'
                : isT2Selected
                ? 'ring-2 ring-stone-950 scale-102 cursor-pointer'
                : 'cursor-pointer active:scale-98'
            }`}
          >
            <Utensils className="h-3 w-3 text-stone-950 shrink-0" />
            <span className="font-mono text-xs sm:text-sm font-black leading-tight">
              T{t2.tableNumber}
            </span>
          </button>
        </div>

        {/* 3. FRONT: Each Table's Opposite Chairs */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {/* Chairs for Table 1 */}
          <div
            onClick={() => isT1Avail && handleChooseTableCard(t1)}
            className={`flex items-center justify-center gap-1.5 flex-wrap ${
              isT1Avail ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
          >
            {occ1.chairsWithOccupants.map((ch, idx) => {
              const isTaken = ch.isOccupied;
              return (
                <div
                  key={ch.id || idx}
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl grid place-items-center transition ${
                    isTaken
                      ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 shadow-xs'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80 hover:bg-emerald-500/25'
                  }`}
                  title={
                    isTaken
                      ? `Occupied - ${ch.customerName || 'Guest'}`
                      : `${ch.label || `Chair ${idx + 1}`} (T${t1.tableNumber}) - Available`
                  }
                >
                  {isTaken ? (
                    <span className="font-black text-xs">
                      {(ch.customerName || 'G')[0].toUpperCase()}
                    </span>
                  ) : (
                    <Armchair className="h-4 w-4" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Chairs for Table 2 */}
          <div
            onClick={() => isT2Avail && handleChooseTableCard(t2)}
            className={`flex items-center justify-center gap-1.5 flex-wrap ${
              isT2Avail ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
          >
            {occ2.chairsWithOccupants.map((ch, idx) => {
              const isTaken = ch.isOccupied;
              return (
                <div
                  key={ch.id || idx}
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-xl grid place-items-center transition ${
                    isTaken
                      ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 shadow-xs'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80 hover:bg-emerald-500/25'
                  }`}
                  title={
                    isTaken
                      ? `Occupied - ${ch.customerName || 'Guest'}`
                      : `${ch.label || `Chair ${idx + 1}`} (T${t2.tableNumber}) - Available`
                  }
                >
                  {isTaken ? (
                    <span className="font-black text-xs">
                      {(ch.customerName || 'G')[0].toUpperCase()}
                    </span>
                  ) : (
                    <Armchair className="h-4 w-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render individual Table Card inside area matching Tables page schematic
  const renderTableCard = (table: Table) => {
    const occ = AppStore.getTableOccupancyDetails(table, orders);
    const isAvailable = occ.availableChairs > 0 && table.status !== 'reserved';
    const isFullyOccupied = occ.isFullyOccupied || table.status === 'occupied';
    const isPartiallyOccupied = occ.isPartiallyOccupied;
    const isSelected = selectedTable === table.tableNumber;

    const isCombinedPrimary = Boolean(
      table.combinedWithTableIds && table.combinedWithTableIds.length > 0
    );
    const companionTables = isCombinedPrimary
      ? localTables.filter((t) => table.combinedWithTableIds?.includes(t.id))
      : [];
    const combinedNums = [
      table.tableNumber,
      ...companionTables.map((c) => c.tableNumber),
    ].sort((a, b) => a - b);
    const combinedGroupName =
      table.combinedGroupName || `Table ${combinedNums.join(' + ')}`;

    const isCouch =
      (table.name || '').toLowerCase().includes('couch') ||
      (table.setup || '').toLowerCase().includes('couch');
    const isSharesLongCouch =
      !isCouch &&
      ((table.setup || '').toLowerCase().includes('long couch') ||
        (table.capacity === 1 &&
          (table.areaName === 'kolin area' ||
            table.areaName === 'door area' ||
            table.areaName === 'entrance area')));
    const isLongTable = table.capacity >= 3;

    return (
      <div
        key={table.id}
        onClick={() => isAvailable && handleChooseTableCard(table)}
        className={`relative flex flex-col justify-between rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 w-fit min-w-[135px] sm:min-w-[145px] max-w-full transition-all duration-200 border shadow-xs select-none ${
          !isAvailable
            ? 'opacity-65 bg-stone-100 dark:bg-stone-850 border-stone-200 dark:border-stone-750 cursor-not-allowed'
            : isSelected
            ? 'border-amber-500 bg-amber-50/90 dark:bg-amber-950/60 shadow-md ring-2 ring-amber-400 cursor-pointer active:scale-98'
            : isCombinedPrimary
            ? 'bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white dark:from-amber-950/40 dark:via-stone-850 dark:to-stone-900 border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/50 hover:shadow-md cursor-pointer active:scale-98'
            : isPartiallyOccupied
            ? 'bg-gradient-to-br from-amber-50/80 to-white border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/40 hover:shadow-md cursor-pointer active:scale-98'
            : 'bg-white border-stone-200 dark:border-stone-800 dark:bg-stone-850 hover:border-amber-400 hover:shadow-md cursor-pointer active:scale-98'
        }`}
      >
        {/* Top Header: Occupancy Status Indicator */}
        <div className="flex items-center justify-between w-full mb-1">
          <span className="font-mono text-[10px] font-bold text-stone-500 dark:text-stone-400">
            {occ.availableChairs}/{table.capacity} free
          </span>

          <span
            className={`rounded-md px-1.5 py-0.2 text-[8px] sm:text-[9px] font-black uppercase shrink-0 ${
              isFullyOccupied
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                : isPartiallyOccupied
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {isFullyOccupied ? 'Full' : isPartiallyOccupied ? `${occ.availableChairs} Left` : 'Open'}
          </span>
        </div>

        {/* Visual Floor Plan Schematic */}
        <div className="py-1">
          {isCombinedPrimary ? (
            /* UNIFIED JOINED COMBINED TABLE SCHEMATIC */
            <div className="flex flex-col items-center py-1 space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {occ.chairsWithOccupants
                  .slice(0, Math.ceil(occ.chairsWithOccupants.length / 2))
                  .map((ch, idx) => (
                    <div
                      key={ch.id || idx}
                      className={`h-7 w-7 rounded-lg grid place-items-center text-[10px] font-black transition-all ${
                        ch.isOccupied
                          ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                      }`}
                    >
                      {ch.isOccupied ? (
                        <span>{(ch.customerName || 'G')[0].toUpperCase()}</span>
                      ) : (
                        <Armchair className="h-3.5 w-3.5" />
                      )}
                    </div>
                  ))}
              </div>

              <div className="w-full max-w-[240px] h-9 rounded-xl bg-amber-500 border border-amber-400 shadow-2xs flex items-center justify-center gap-1.5 text-stone-950 px-2 font-black">
                <Link2 className="h-3.5 w-3.5 text-stone-950 shrink-0 stroke-[2.5]" />
                <span className="font-mono font-black text-xs truncate text-stone-950">
                  {combinedGroupName}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {occ.chairsWithOccupants
                  .slice(Math.ceil(occ.chairsWithOccupants.length / 2))
                  .map((ch, idx) => (
                    <div
                      key={ch.id || idx}
                      className={`h-7 w-7 rounded-lg grid place-items-center text-[10px] font-black transition-all ${
                        ch.isOccupied
                          ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                      }`}
                    >
                      {ch.isOccupied ? (
                        <span>{(ch.customerName || 'G')[0].toUpperCase()}</span>
                      ) : (
                        <Armchair className="h-3.5 w-3.5" />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ) : isCouch ? (
            /* COUCH / SOFA SCHEMATIC */
            <div className="flex flex-col items-center py-1">
              <div className="w-full max-w-[220px] rounded-2xl border-2 border-stone-300 dark:border-stone-600 bg-stone-200/80 dark:bg-stone-800 p-1.5 shadow-xs">
                <div className="h-2 rounded-lg bg-stone-300 dark:bg-stone-700 mb-1 flex items-center justify-center">
                  <div className="w-12 h-0.5 rounded-full bg-stone-400 dark:bg-stone-500" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {occ.chairsWithOccupants.map((ch, idx) => (
                    <div
                      key={ch.id || idx}
                      className={`rounded-xl p-1.5 flex flex-col items-center justify-center text-center transition-all ${
                        ch.isOccupied
                          ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300'
                          : 'bg-emerald-500/10 border border-dashed border-emerald-400/80 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      <Sofa className="h-4 w-4 mb-0.5" />
                      <span className="text-[9px] font-black truncate max-w-full">
                        {ch.isOccupied ? ch.customerName || `Guest ${idx + 1}` : `Seat ${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : isLongTable ? (
            /* LONG TABLE / HIGH TABLE SCHEMATIC */
            <div className="flex flex-col items-center py-1">
              <div className="flex items-center justify-center gap-1.5 mb-1 flex-wrap">
                {occ.chairsWithOccupants
                  .slice(0, Math.ceil(occ.chairsWithOccupants.length / 2))
                  .map((ch, idx) => (
                    <div
                      key={ch.id || idx}
                      className={`h-7 w-7 rounded-lg grid place-items-center text-[10px] font-black transition-all ${
                        ch.isOccupied
                          ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                      }`}
                    >
                      {ch.isOccupied ? (
                        <span>{(ch.customerName || 'G')[0].toUpperCase()}</span>
                      ) : (
                        <Armchair className="h-3.5 w-3.5" />
                      )}
                    </div>
                  ))}
              </div>

              <div className="w-full max-w-[220px] h-8 rounded-xl bg-amber-500 border border-amber-400 shadow-2xs flex items-center justify-center gap-1.5 px-2 text-stone-950">
                <Utensils className="h-2.5 w-2.5 text-stone-950 shrink-0" />
                <span className="font-mono font-black text-xs tracking-wider text-stone-950">
                  T{table.tableNumber}
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
                {occ.chairsWithOccupants
                  .slice(Math.ceil(occ.chairsWithOccupants.length / 2))
                  .map((ch, idx) => (
                    <div
                      key={ch.id || idx}
                      className={`h-7 w-7 rounded-lg grid place-items-center text-[10px] font-black transition-all ${
                        ch.isOccupied
                          ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                      }`}
                    >
                      {ch.isOccupied ? (
                        <span>{(ch.customerName || 'G')[0].toUpperCase()}</span>
                      ) : (
                        <Armchair className="h-3.5 w-3.5" />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ) : isSharesLongCouch ? (
            /* SHARED LONG COUCH SINGLE TABLE VIEW */
            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-[9px] font-bold">
                <Sofa className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>Shared Long Couch</span>
              </div>
              <div className="h-8 w-22 rounded-xl bg-amber-500 border border-amber-400 shadow-2xs flex items-center justify-center gap-1 text-stone-950 px-2 font-black">
                <Utensils className="h-2.5 w-2.5 text-stone-950 shrink-0" />
                <span className="font-mono text-xs font-black truncate text-stone-950">T{table.tableNumber}</span>
              </div>
              {occ.chairsWithOccupants[0] && (
                <div
                  className={`h-7 w-7 rounded-xl grid place-items-center transition-all ${
                    occ.chairsWithOccupants[0].isOccupied
                      ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-300'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80'
                  }`}
                >
                  <Armchair className="h-4 w-4" />
                </div>
              )}
            </div>
          ) : (
            /* STANDARD 1 TO 2 CHAIR TABLE SCHEMATIC */
            <div className="flex items-center justify-center gap-2.5 py-1">
              {occ.chairsWithOccupants[0] && (
                <div
                  className={`h-8 w-8 rounded-xl grid place-items-center transition-all ${
                    occ.chairsWithOccupants[0].isOccupied
                      ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-300'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80'
                  }`}
                >
                  <Armchair className="h-4 w-4" />
                </div>
              )}

              <div className="h-10 w-14 rounded-xl bg-amber-500 border border-amber-400 shadow-2xs flex flex-col items-center justify-center text-stone-950 font-black">
                <Utensils className="h-2.5 w-2.5 text-stone-950 mb-0.5" />
                <span className="font-mono text-[11px] font-black text-stone-950">T{table.tableNumber}</span>
              </div>

              {occ.chairsWithOccupants[1] ? (
                <div
                  className={`h-8 w-8 rounded-xl grid place-items-center transition-all ${
                    occ.chairsWithOccupants[1].isOccupied
                      ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-300'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80'
                  }`}
                >
                  <Armchair className="h-4 w-4" />
                </div>
              ) : (
                <div className="h-8 w-8" />
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-5xl md:max-w-6xl rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 p-3 sm:p-5 md:p-6 shadow-2xl space-y-3 sm:space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs font-black">
              <Utensils className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg font-black text-stone-900 dark:text-stone-100">
                {pendingTable ? 'Select Guests' : 'Choose Table'}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {pendingTable
                  ? pendingTable.combinedGroupName || `Table #${pendingTable.tableNumber}`
                  : 'Select an available table by section for dine-in seating'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingTable(null);
              onClose();
            }}
            className="rounded-xl border border-stone-200 dark:border-stone-750 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition p-1.5 cursor-pointer"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* STEP 2: Occupant Selector if a table is clicked */}
        {pendingTable ? (
          (() => {
            const occDetails = AppStore.getTableOccupancyDetails(pendingTable, orders);
            const maxAllowed = occDetails.availableChairs;
            const isCombined = Boolean(
              (pendingTable.combinedWithTableIds && pendingTable.combinedWithTableIds.length > 0) ||
              pendingTable.isCombinedCompanion ||
              pendingTable.primaryTableId
            );
            const isRedundantName =
              !pendingTable.name ||
              pendingTable.name === pendingTable.combinedGroupName ||
              pendingTable.name.toLowerCase().replace(/[^a-z0-9]/g, '') ===
                `table${pendingTable.tableNumber}`;

            return (
              <div className="space-y-4 py-2 animate-in fade-in duration-150 max-w-xl mx-auto w-full">
                {/* Top Action Row: Change Table & Split Table */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingTable(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 transition cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Floor Plan</span>
                  </button>

                  {isCombined && (
                    <button
                      type="button"
                      onClick={() => handleSplitPendingTable(pendingTable)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Unlink className="h-3.5 w-3.5" />
                      <span>Split Table</span>
                    </button>
                  )}
                </div>

                {/* Table Summary Card */}
                <div className="rounded-2xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-stone-800 dark:to-stone-850 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display text-lg font-black text-stone-950 dark:text-stone-100 truncate">
                          {pendingTable.combinedGroupName || `Table ${pendingTable.tableNumber}`}
                          {pendingTable.name && !isRedundantName ? ` • ${pendingTable.name}` : ''}
                        </h4>
                        {isCombined && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-black text-amber-950 dark:text-amber-200">
                            <Link2 className="h-3 w-3" />
                            Combined
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        {pendingTable.area === 'airconditioned' ? '❄️ Air-Conditioned' : '🌿 Normal'} •{' '}
                        {pendingTable.capacity} Total Seats
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 px-3 py-1 text-xs font-black text-emerald-800 dark:text-emerald-300 shadow-2xs">
                        {occDetails.availableChairs} of {pendingTable.capacity} Available
                      </span>
                    </div>
                  </div>

                  {/* Visual Table & Chairs Blueprint */}
                  <div className="pt-2 border-t border-amber-200/80 dark:border-stone-700 flex justify-center py-2">
                    {renderTableCard(pendingTable)}
                  </div>
                </div>

                {/* GUEST COUNT SELECTOR */}
                <div className="rounded-2xl border border-stone-200 dark:border-stone-750 bg-white dark:bg-stone-800/80 p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-stone-900 dark:text-stone-100 block">
                        Party Size / Seating Count
                      </span>
                      <span className="text-[11px] text-stone-500">
                        How many guests will occupy this table?
                      </span>
                    </div>
                    <div className="inline-flex items-center rounded-xl border border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-700 p-0.5">
                      <button
                        type="button"
                        onClick={() => setOccupants((prev) => Math.max(1, prev - 1))}
                        disabled={occupants <= 1}
                        className="h-8 w-8 rounded-lg grid place-items-center font-black text-stone-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-600 disabled:opacity-30 cursor-pointer text-base"
                        aria-label="Decrease guests"
                      >
                        -
                      </button>
                      <span className="w-9 text-center font-mono font-black text-base text-stone-900 dark:text-stone-100">
                        {occupants}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOccupants((prev) => Math.min(maxAllowed, prev + 1))}
                        disabled={occupants >= maxAllowed}
                        className="h-8 w-8 rounded-lg grid place-items-center font-black text-stone-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-600 disabled:opacity-30 cursor-pointer text-base"
                        aria-label="Increase guests"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Quick Select Buttons */}
                  {maxAllowed > 1 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Array.from({ length: maxAllowed }, (_, idx) => idx + 1).map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setOccupants(cnt)}
                          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-xs sm:text-sm transition cursor-pointer active:scale-95 ${
                            occupants === cnt
                              ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-400'
                              : 'bg-stone-50 dark:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-600 hover:border-amber-400'
                          }`}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>
                            {cnt} {cnt === 1 ? 'Guest' : 'Guests'}
                          </span>
                          {occupants === cnt && <Check className="h-3 w-3 stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Action Buttons */}
                <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-stone-200 dark:border-stone-800">
                  <button
                    type="button"
                    onClick={() => setPendingTable(null)}
                    className="rounded-xl border border-stone-200 dark:border-stone-700 px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmOccupants}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm px-6 py-2.5 shadow-md transition active:scale-95 cursor-pointer border border-amber-400"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    <span>
                      Seat {occupants} {occupants === 1 ? 'Guest' : 'Guests'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          /* STEP 1: Floor Plan Divided by Area Sections matching Tables page */
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0">
            {/* Top Quick Actions Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Primary Action: No Table Needed (Takeaway) */}
              <button
                type="button"
                onClick={onNoTableNeeded}
                className="group flex items-center justify-between rounded-2xl border border-dashed border-amber-300 dark:border-amber-600/50 bg-gradient-to-r from-amber-50/80 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/30 px-3.5 py-2.5 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 hover:border-amber-400 transition text-left active:scale-98 shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 shadow-xs group-hover:scale-105 transition shrink-0">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-amber-950 dark:text-amber-200 block truncate">
                      No Table Needed (Takeaway / Pick-up)
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 block truncate">
                      Order will be prepared for to-go counter pickup
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>

              {/* Quick Action: Combine Tables for Large Group */}
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-amber-500/10 border border-amber-300/80 dark:border-amber-700 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-stone-950 font-black shrink-0">
                    <Link2 className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-stone-900 dark:text-stone-100 block truncate">
                      Combine Tables
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 block truncate">
                      Merge adjacent tables for large parties
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCombineModalOpen(true)}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs px-3 py-1.5 shadow-2xs transition active:scale-95 cursor-pointer shrink-0 border border-amber-400"
                >
                  Combine Tables
                </button>
              </div>
            </div>

            {/* Visual Floor Plan Grid matching Tables Page */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start pt-1">
              {areaGroups.map((group: AreaGroup) => {
                const areaTables = group.tables;

                return (
                  <div
                    key={group.meta.key}
                    className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 p-3 sm:p-3.5 shadow-xs space-y-2.5"
                  >
                    {/* Visual Area Header */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap border-b border-stone-100 dark:border-stone-800 pb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base sm:text-lg shrink-0">
                          {group.meta.icon}
                        </span>
                        <h4 className="font-serif text-sm sm:text-base font-black text-stone-950 dark:text-stone-100 uppercase tracking-wide truncate">
                          {group.meta.name.replace(/\s*area\b/gi, '').trim()}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Occupancy Indicator Badge */}
                        {(() => {
                          const occCount = areaTables.filter((t: Table) => {
                            const occ = AppStore.getTableOccupancyDetails(t, orders);
                            return occ.isFullyOccupied || occ.occupiedChairs > 0 || t.status === 'occupied';
                          }).length;
                          if (occCount > 0) {
                            return (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                                Occupied ({occCount})
                              </span>
                            );
                          }
                          return (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Available
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Tables / Layout within this Area */}
                    <div className="w-full flex justify-center items-center">
                      {(group.meta.key === 'kolin area' ||
                      group.meta.key === 'door area' ||
                      group.meta.key === 'entrance area') ? (
                        renderSharedCouchAreaBlueprint(group, areaTables) || (
                          (() => {
                            const visibleTables = areaTables.filter(
                              (table: Table) => !table.isCombinedCompanion
                            );
                            return visibleTables.length === 0 ? (
                              <p className="text-xs text-stone-400 py-3 italic text-center w-full">
                                No tables in this area.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2.5 items-center justify-center w-fit max-w-full">
                                {visibleTables.map((table: Table) => renderTableCard(table))}
                              </div>
                            );
                          })()
                        )
                      ) : (
                        (() => {
                          const visibleTables = areaTables.filter(
                            (table: Table) => !table.isCombinedCompanion
                          );
                          return visibleTables.length === 0 ? (
                            <p className="text-xs text-stone-400 py-3 italic text-center w-full">
                              No tables in this area.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2.5 items-center justify-center w-fit max-w-full">
                              {visibleTables.map((table: Table) => renderTableCard(table))}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {!pendingTable && (
          <div className="flex justify-end pt-2 border-t border-stone-200 dark:border-stone-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-200 dark:border-stone-750 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
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
          onTablesCombined={() => {
            setLocalTables(AppStore.getTables());
          }}
        />
      )}
    </div>
  );
};
