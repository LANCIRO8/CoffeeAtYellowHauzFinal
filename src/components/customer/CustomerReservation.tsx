import React, { useState } from 'react';
import { Reservation, CustomerAccount, Table, StoreSettings } from '../../types';
import { AppStore } from '../../services/store';
import { VenueReservation } from './VenueReservation';
import { CustomerFloorPlan } from './CustomerFloorPlan';
import { TableReservationModal } from './TableReservationModal';
import {
  CheckCircle,
  Building,
  UtensilsCrossed,
} from 'lucide-react';

interface CustomerReservationProps {
  settings: StoreSettings;
  activeCustomer: CustomerAccount | null;
  onReservationSuccess: (res: Reservation) => void;
  onRequireLogin?: () => void;
  onNavigateAccount?: () => void;
}

export const CustomerReservation: React.FC<CustomerReservationProps> = ({
  settings,
  activeCustomer,
  onReservationSuccess,
  onRequireLogin,
  onNavigateAccount,
}) => {
  const [tables, setTables] = useState<Table[]>(() => AppStore.getTables());
  const [modalTable, setModalTable] = useState<Table | null>(null);
  const [activeReservationType, setActiveReservationType] = useState<'tables' | 'venue'>('venue');
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  const handleTableClickFromFloorPlan = (table: Table) => {
    setModalTable(table);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header & Section Chooser (Side-by-side Layout) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 border-b border-stone-200/80 pb-3.5 sm:pb-5">
        <div className="space-y-0.5 sm:space-y-1 max-w-xl">
          <h1 className="font-display text-lg sm:text-3xl font-extrabold text-stone-900 leading-tight">
            Reservations
          </h1>
        </div>

        {/* Inline Type Selector */}
        <div className="shrink-0">
          <div className="inline-flex rounded-xl sm:rounded-2xl bg-stone-200/80 p-1 sm:p-1.5 border border-stone-300 shadow-inner w-full sm:w-auto">
            <button
              id="btn-reservation-venue"
              type="button"
              onClick={() => {
                setActiveReservationType('venue');
                setConfirmedReservation(null);
              }}
              className={`flex-1 sm:flex-initial py-1.5 px-2.5 sm:py-2.5 sm:px-4 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                activeReservationType === 'venue'
                  ? 'bg-amber-500 text-stone-950 shadow-md ring-1 ring-amber-600/30'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100/60'
              }`}
            >
              <Building className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Private Studio Venue</span>
            </button>

            <button
              id="btn-reservation-tables"
              type="button"
              onClick={() => {
                setActiveReservationType('tables');
                setConfirmedReservation(null);
              }}
              className={`flex-1 sm:flex-initial py-1.5 px-2.5 sm:py-2.5 sm:px-4 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer ${
                activeReservationType === 'tables'
                  ? 'bg-stone-950 text-amber-400 shadow-md'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100/60'
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Dine-in Tables</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Reservation Content */}
      {activeReservationType === 'venue' ? (
        /* Inline Venue/Studio Reservation View */
        <div className="space-y-4 animate-in fade-in duration-200">
          <VenueReservation
            settings={settings}
            activeCustomer={activeCustomer}
            onReservationSuccess={onReservationSuccess}
            onRequireLogin={onRequireLogin}
            onNavigateAccount={onNavigateAccount}
          />
        </div>
      ) : confirmedReservation ? (
        /* Confirmation Success Box for Table */
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in duration-200">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 mx-auto">
            <CheckCircle className="h-8 w-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Table Reservation Submitted
            </span>
            <h2 className="text-2xl font-bold font-display text-stone-900 mt-1">
              We Look Forward to Welcoming You!
            </h2>
            <div className="mt-3 inline-block rounded-2xl bg-amber-50 border border-amber-200 px-5 py-2">
              <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block">
                Your Confirmation Code
              </span>
              <span className="font-mono text-xl font-extrabold text-amber-900">
                {confirmedReservation.reservationCode}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 max-w-lg mx-auto text-left text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <span className="text-stone-500 block">Name:</span>
              <span className="font-bold text-stone-800">{confirmedReservation.customerName}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Contact:</span>
              <span className="font-bold text-stone-800">{confirmedReservation.contactNumber}</span>
            </div>
            <div>
              <span className="text-stone-500 block">Date &amp; Time:</span>
              <span className="font-bold text-stone-800">
                {new Date(confirmedReservation.reservationAt).toLocaleString('en-PH', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block">Table:</span>
              <span className="font-bold text-stone-800">
                Table #{confirmedReservation.tableNumber} ({confirmedReservation.guestCount} Guests)
              </span>
            </div>
            {confirmedReservation.notes && (
              <div className="sm:col-span-2 pt-2 border-t border-stone-200">
                <span className="text-stone-500 block">Special Requests:</span>
                <span className="italic text-stone-700">{confirmedReservation.notes}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            {onNavigateAccount && (
              <button
                type="button"
                onClick={onNavigateAccount}
                className="rounded-xl bg-stone-900 px-6 py-2.5 text-xs font-bold text-amber-400 hover:bg-stone-800 transition"
              >
                View My Reservations
              </button>
            )}
            <button
              onClick={() => setConfirmedReservation(null)}
              className="rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-black text-stone-950 hover:bg-amber-400 transition"
            >
              Book Another Table
            </button>
          </div>
        </div>
      ) : (
        /* Dine-In Table Booking Content with Floor Plan & Details Modal */
        <div className="space-y-6 animate-in fade-in duration-200">
          <CustomerFloorPlan
            tables={tables}
            selectedTableId={modalTable?.id || null}
            onSelectTable={handleTableClickFromFloorPlan}
          />

          {/* Table Reservation Modal */}
          {modalTable && (
            <TableReservationModal
              table={modalTable}
              settings={settings}
              activeCustomer={activeCustomer}
              onClose={() => setModalTable(null)}
              onReservationSuccess={(newRes) => {
                setConfirmedReservation(newRes);
                onReservationSuccess(newRes);
                setTables(AppStore.getTables());
              }}
              onRequireLogin={onRequireLogin}
              onNavigateAccount={onNavigateAccount}
            />
          )}
        </div>
      )}
    </div>
  );
};
