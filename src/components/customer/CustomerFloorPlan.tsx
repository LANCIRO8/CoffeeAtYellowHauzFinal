import React, { useState } from 'react';
import { Table, StoreSettings, Reservation } from '../../types';
import {
  Users,
  Sparkles,
  Calendar,
  Clock,
  Wind,
  Coffee,
  CheckCircle,
  HelpCircle,
  Eye,
  Info,
  Maximize2,
} from 'lucide-react';

interface CustomerFloorPlanProps {
  tables: Table[];
  onSelectTable: (table: Table) => void;
  selectedTableId?: number | null;
}

export const CustomerFloorPlan: React.FC<CustomerFloorPlanProps> = ({
  tables,
  onSelectTable,
  selectedTableId,
}) => {
  const [hoveredTableId, setHoveredTableId] = useState<number | null>(null);
  const [areaFilter, setAreaFilter] = useState<'all' | 'normal' | 'airconditioned'>('all');

  // Split tables by area
  const mainDiningTables = tables.filter((t) => t.area === 'normal');
  const airconTables = tables.filter((t) => t.area === 'airconditioned');

  const renderTable = (table: Table) => {
    const isHovered = hoveredTableId === table.id;
    const isSelected = selectedTableId === table.id;
    const isAircon = table.area === 'airconditioned';

    const isLarge = table.capacity >= 6;
    const isExtraLarge = table.capacity >= 8;
    const isTwoSeater = table.capacity <= 2;

    const isAvailable = table.status === 'available';
    const isReserved = table.status === 'reserved';
    const isOccupied = table.status === 'occupied';

    return (
      <div
        key={table.id}
        onMouseEnter={() => setHoveredTableId(table.id)}
        onMouseLeave={() => setHoveredTableId(null)}
        onClick={() => onSelectTable(table)}
        className={`relative group cursor-pointer select-none transition-all duration-300 transform hover:-translate-y-1.5 focus:outline-none w-full max-w-[155px] sm:max-w-[210px] min-w-0 ${
          isHovered ? 'z-50' : isSelected ? 'z-30' : 'z-10 hover:z-50'
        }`}
        style={{
          maxWidth: isExtraLarge ? '230px' : isLarge ? '195px' : isTwoSeater ? '140px' : '165px',
        }}
      >
        {/* Chair Indicators Top */}
        <div className="absolute -top-2.5 sm:-top-3.5 left-0 right-0 flex justify-center gap-2 sm:gap-4 md:gap-6 pointer-events-none z-0">
          <div className={`w-5 sm:w-8 md:w-10 h-2 sm:h-3 border-1.5 sm:border-2 rounded-t-full transition-all duration-200 ${
            isHovered
              ? 'border-amber-400 bg-amber-100 shadow-xs'
              : 'border-stone-300 bg-stone-100/90'
          }`} />
          {!isTwoSeater && (
            <div className={`w-5 sm:w-8 md:w-10 h-2 sm:h-3 border-1.5 sm:border-2 rounded-t-full transition-all duration-200 ${
              isHovered
                ? 'border-amber-400 bg-amber-100 shadow-xs'
                : 'border-stone-300 bg-stone-100/90'
            }`} />
          )}
        </div>

        {/* Chair Indicators Bottom */}
        <div className="absolute -bottom-2.5 sm:-bottom-3.5 left-0 right-0 flex justify-center gap-2 sm:gap-4 md:gap-6 pointer-events-none z-0">
          <div className={`w-5 sm:w-8 md:w-10 h-2 sm:h-3 border-1.5 sm:border-2 rounded-b-full transition-all duration-200 ${
            isHovered
              ? 'border-amber-400 bg-amber-100 shadow-xs'
              : 'border-stone-300 bg-stone-100/90'
          }`} />
          {!isTwoSeater && (
            <div className={`w-5 sm:w-8 md:w-10 h-2 sm:h-3 border-1.5 sm:border-2 rounded-b-full transition-all duration-200 ${
              isHovered
                ? 'border-amber-400 bg-amber-100 shadow-xs'
                : 'border-stone-300 bg-stone-100/90'
            }`} />
          )}
        </div>

        {/* Side Chairs for 6 or 8 seaters */}
        {isLarge && (
          <>
            {/* Left Chairs */}
            <div className="absolute -left-2.5 sm:-left-3.5 top-0 bottom-0 flex flex-col justify-center gap-1.5 sm:gap-3 pointer-events-none z-0">
              <div className={`h-5 sm:h-8 md:h-9 w-2 sm:w-3 border-1.5 sm:border-2 rounded-l-full transition-all duration-200 ${
                isHovered ? 'border-amber-400 bg-amber-100' : 'border-stone-300 bg-stone-100/90'
              }`} />
              {isExtraLarge && (
                <div className={`h-5 sm:h-8 md:h-9 w-2 sm:w-3 border-1.5 sm:border-2 rounded-l-full transition-all duration-200 ${
                  isHovered ? 'border-amber-400 bg-amber-100' : 'border-stone-300 bg-stone-100/90'
                }`} />
              )}
            </div>

            {/* Right Chairs */}
            <div className="absolute -right-2.5 sm:-right-3.5 top-0 bottom-0 flex flex-col justify-center gap-1.5 sm:gap-3 pointer-events-none z-0">
              <div className={`h-5 sm:h-8 md:h-9 w-2 sm:w-3 border-1.5 sm:border-2 rounded-r-full transition-all duration-200 ${
                isHovered ? 'border-amber-400 bg-amber-100' : 'border-stone-300 bg-stone-100/90'
              }`} />
              {isExtraLarge && (
                <div className={`h-5 sm:h-8 md:h-9 w-2 sm:w-3 border-1.5 sm:border-2 rounded-r-full transition-all duration-200 ${
                  isHovered ? 'border-amber-400 bg-amber-100' : 'border-stone-300 bg-stone-100/90'
                }`} />
              )}
            </div>
          </>
        )}

        {/* Main Table Surface */}
        <div
          className={`relative flex flex-col justify-between rounded-xl sm:rounded-2xl p-2 sm:p-4 transition-all duration-200 border-2 shadow-xs ${
            isHovered
              ? 'z-50 bg-amber-50/90 border-amber-400 shadow-xl ring-4 ring-amber-400/20 scale-[1.02]'
              : isSelected
              ? 'z-30 bg-amber-100 border-amber-500 shadow-md ring-4 ring-amber-500/20'
              : isReserved
              ? 'z-10 bg-amber-50/60 border-amber-300'
              : isOccupied
              ? 'z-10 bg-stone-900 border-stone-700 text-white'
              : 'z-10 bg-white border-stone-200 hover:border-amber-400'
          }`}
          style={{
            minHeight: isExtraLarge ? '125px' : isLarge ? '118px' : isTwoSeater ? '100px' : '108px',
          }}
        >
          {/* Table Header: Number & Capacity */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`grid h-5 w-5 sm:h-7 sm:w-7 place-items-center rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black shadow-xs shrink-0 ${
                  isSelected || isHovered
                    ? 'bg-amber-500 text-stone-950'
                    : isAircon
                    ? 'bg-sky-100 text-sky-900 border border-sky-200'
                    : 'bg-stone-100 text-stone-800 border border-stone-200'
                }`}
              >
                T{table.tableNumber}
              </span>
              <div className="min-w-0">
                <span className={`text-[11px] sm:text-xs font-black truncate block ${isOccupied ? 'text-stone-200' : 'text-stone-900'}`}>
                  {table.name || `Table ${table.tableNumber}`}
                </span>
                <span className="text-[9px] sm:text-[10px] text-stone-400 font-semibold block truncate">
                  Table #{table.tableNumber}
                </span>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold shrink-0 ${
                isOccupied
                  ? 'bg-stone-800 text-stone-300'
                  : isHovered || isSelected
                  ? 'bg-amber-200/90 text-amber-900'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {table.capacity}p
            </span>
          </div>

          {/* Setup / Configuration & Area Badge */}
          <div className="my-1 sm:my-1.5 space-y-1 text-[9px] sm:text-[10px]">
            <div className="flex items-center justify-between gap-1">
              <span
                className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold shrink-0 ${
                  isAircon
                    ? 'bg-sky-50 text-sky-800 border border-sky-200/60'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                }`}
              >
                {isAircon ? '❄️ Air-Con' : '☕ Non-A/C'}
              </span>

              <span className="text-[8px] sm:text-[9px] text-stone-500 font-medium truncate">
                {table.capacity} Seats
              </span>
            </div>

            {table.setup && (
              <p className="text-[8px] sm:text-[9px] text-stone-600 font-semibold truncate" title={table.setup}>
                {table.setup}
              </p>
            )}
          </div>

          {/* Status Indicator */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-100/80">
            <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] font-bold min-w-0">
              <span
                className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0 ${
                  isOccupied
                    ? 'bg-stone-400'
                    : isReserved
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
              <span className={`truncate ${isOccupied ? 'text-stone-300' : isReserved ? 'text-amber-800' : 'text-emerald-700'}`}>
                {isOccupied ? 'Occupied' : isReserved ? 'Reserved' : 'Available'}
              </span>
            </div>
            
            <span className="text-[9px] sm:text-[10px] font-extrabold text-amber-600 group-hover:text-amber-700 underline shrink-0">
              Book
            </span>
          </div>

          {/* Floating Hover Card / Tooltip saying "Reserve Table" - Elevated above all sibling tables */}
          {isHovered && (
            <div className="absolute -top-12 sm:-top-13 left-1/2 -translate-x-1/2 z-[100] pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 drop-shadow-2xl filter">
              <div className="flex items-center gap-1.5 rounded-xl bg-stone-950/95 backdrop-blur-sm px-3 py-1.5 text-xs font-black text-amber-300 shadow-2xl border-2 border-amber-400 ring-2 ring-amber-400/30">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse shrink-0" />
                <span>Reserve {table.name ? `${table.name} (T${table.tableNumber})` : `Table #${table.tableNumber}`}</span>
                <span className="text-[10px] text-amber-200/90 font-medium ml-0.5">
                  • {table.capacity} seats
                </span>
              </div>
              {/* Tooltip triangle arrow */}
              <div className="mx-auto h-0 w-0 border-x-5 border-x-transparent border-t-5 border-t-amber-400" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Floor Plan Architectural Stage */}
      <div className="relative rounded-2xl sm:rounded-3xl border-2 border-stone-300 bg-[#fbf9f5] p-2.5 sm:p-5 md:p-8 shadow-inner overflow-x-auto">
        
        {/* Subtle architectural grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-2xl sm:rounded-3xl"
          style={{
            backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Architectural Legend & Landmarks Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-6 pb-2.5 sm:pb-4 border-b border-stone-200/90 text-xs">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Quick Area Filters */}
            <div className="flex items-center gap-1 rounded-xl bg-stone-200/60 p-1">
              <button
                type="button"
                onClick={() => setAreaFilter('all')}
                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-black transition ${
                  areaFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({tables.length})
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('airconditioned')}
                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-black transition ${
                  areaFilter === 'airconditioned'
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Air-Con ({airconTables.length})
              </button>
              <button
                type="button"
                onClick={() => setAreaFilter('normal')}
                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs font-black transition ${
                  areaFilter === 'normal'
                    ? 'bg-amber-500 text-stone-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Non-A/C ({mainDiningTables.length})
              </button>
            </div>

            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              <span className="font-bold text-[10px] sm:text-xs text-stone-700">Available</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-amber-100" />
              <span className="font-bold text-[10px] sm:text-xs text-stone-700">Reserved</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-stone-900 ring-2 ring-stone-200" />
              <span className="font-bold text-[10px] sm:text-xs text-stone-700">Occupied</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-stone-500 font-medium text-[10px] sm:text-xs">
            <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" />
            <span>Click any table below to reserve</span>
          </div>
        </div>

        {/* Main Floor Blueprint Container */}
        <div className="relative z-10 w-full space-y-4 sm:space-y-6">

          {/* Divided Dining Rooms Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">

            {/* Area 1: Air-Con Section (Tables 1, 2, 3, 6) */}
            {(areaFilter === 'all' || areaFilter === 'airconditioned') && (
              <div className="rounded-2xl sm:rounded-3xl border-2 border-sky-200/90 bg-sky-50/30 p-2.5 sm:p-5 space-y-3 sm:space-y-5 transition-all shadow-xs">
                {/* Area Header */}
                <div className="flex items-center justify-between border-b border-sky-200/80 pb-2 sm:pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-sm sm:text-base">❄️</span>
                      <h4 className="font-display font-extrabold text-stone-900 text-xs sm:text-base">
                        Air-Con
                      </h4>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-stone-600 mt-0.5">
                      1st Aircon (3 tables), 2nd Aircon (1 table), 3rd Aircon (long table), &amp; Kolin (couch &amp; tables).
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 shrink-0">
                    Tables 1, 2, 3, 6
                  </span>
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-5 sm:gap-y-9 pt-7 pb-3 sm:pt-9 sm:pb-4 place-items-center relative overflow-visible">
                  {airconTables.map(renderTable)}
                </div>

                <div className="pt-1 text-center text-[10px] sm:text-[11px] text-sky-800 font-semibold flex items-center justify-center gap-1">
                  <Wind className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Climate-controlled • Fast Wi-Fi • Quiet Workspace</span>
                </div>
              </div>
            )}

            {/* Area 2: Non-A/C Section (Tables 4, 5, 7, 8, 9, 10) */}
            {(areaFilter === 'all' || areaFilter === 'normal') && (
              <div className="rounded-2xl sm:rounded-3xl border-2 border-amber-200/90 bg-amber-50/25 p-2.5 sm:p-5 space-y-3 sm:space-y-5 transition-all shadow-xs">
                {/* Area Header */}
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-2 sm:pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-sm sm:text-base">🌿</span>
                      <h4 className="font-display font-extrabold text-stone-900 text-xs sm:text-base">
                        Non-A/C
                      </h4>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-stone-600 mt-0.5">
                      Center high chairs, Left side long tables, Door &amp; Entrance couches, Spotlight, and Window bar.
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 shrink-0">
                    Tables 4, 5, 7, 8, 9, 10
                  </span>
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 sm:gap-x-3 gap-y-5 sm:gap-y-9 pt-7 pb-3 sm:pt-9 sm:pb-4 place-items-center relative overflow-visible">
                  {mainDiningTables.map(renderTable)}
                </div>

                <div className="pt-1 text-center text-[10px] sm:text-[11px] text-amber-900 font-semibold flex items-center justify-center gap-1">
                  <span>☕</span>
                  <span>Open café atmosphere • High chairs, lounge seating, &amp; window view</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
