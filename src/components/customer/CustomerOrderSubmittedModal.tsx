import React from 'react';
import { Order, StoreSettings } from '../../types';
import {
  CheckCircle2,
  Clock,
  Coffee,
  MapPin,
  UtensilsCrossed,
  ShoppingBag,
  CreditCard,
  Phone,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Calendar,
  Users,
  Globe,
  X,
} from 'lucide-react';

interface CustomerOrderSubmittedModalProps {
  order: Order;
  settings: StoreSettings;
  onClose: () => void;
  onTrackOrder?: () => void;
}

export const CustomerOrderSubmittedModal: React.FC<CustomerOrderSubmittedModalProps> = ({
  order,
  settings,
  onClose,
  onTrackOrder,
}) => {
  const isLiveInHouse = order.orderClassification === 'live_in_house' || Boolean(order.tableNumber);

  const getOrderTypeLabel = () => {
    switch (order.orderType) {
      case 'dine_in':
        return isLiveInHouse
          ? `Live In-House (Table #${order.tableNumber})`
          : `Advance Table Reservation`;
      case 'delivery':
        return 'Delivery Order';
      case 'take_away':
      default:
        return 'Pick-up / Take-Away';
    }
  };

  const getPaymentMethodLabel = () => {
    switch (order.paymentMethod) {
      case 'gcash':
        return 'GCash (To verify by cashier)';
      case 'card':
        return 'Card Terminal';
      case 'cash':
      default:
        return isLiveInHouse
          ? 'Cash (Pay at table / counter)'
          : 'Cash upon arrival';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
        {/* Top Decorative Header */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-500 px-5 py-4 text-stone-950 relative">
          <button
            onClick={onClose}
            title="Close modal"
            className="absolute top-3 right-3 rounded-full bg-black/10 hover:bg-black/20 p-1.5 text-stone-900 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 pr-7">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-stone-950 text-amber-400 shadow-md shrink-0">
                {isLiveInHouse ? (
                  <Coffee className="h-5 w-5 stroke-[2.2]" />
                ) : (
                  <Calendar className="h-5 w-5 stroke-[2.2]" />
                )}
              </div>
              <h2 className="font-display text-lg sm:text-xl font-black tracking-tight">
                {isLiveInHouse ? 'Live Order Placed!' : 'Advance Booking Confirmed!'}
              </h2>
            </div>

            <div className="rounded-xl bg-stone-950/10 px-3 py-1 text-xs font-bold text-stone-900 border border-stone-950/15">
              <span>Order Ref: </span>
              <span className="font-mono text-stone-950 font-black">#{order.orderNumber}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {/* Dual Mode Status Banner */}
          {isLiveInHouse ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-950 font-extrabold text-sm">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Physical Table #{order.tableNumber} Bound</span>
                </div>
                <span className="rounded-full bg-emerald-200 text-emerald-950 font-mono text-xs font-black px-2 py-0.5">
                  LIVE IN-HOUSE
                </span>
              </div>
              <p className="text-xs text-emerald-900/90 leading-relaxed">
                Your order is bound to Table #{order.tableNumber} and dispatched directly to our kitchen &amp; barista queue for immediate preparation.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm">
                  <Globe className="h-4 w-4 text-amber-700" />
                  <span>External Advance Booking</span>
                </div>
                <span className="rounded-full bg-amber-200 text-amber-950 font-mono text-xs font-black px-2 py-0.5">
                  SCHEDULED
                </span>
              </div>
              {order.advanceBooking ? (
                <div className="grid grid-cols-2 gap-2 text-xs bg-white/70 rounded-xl p-2.5 border border-amber-200">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Target Date</span>
                    <span className="font-bold text-stone-800">{order.advanceBooking.bookingDate}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Arrival Time</span>
                    <span className="font-bold text-stone-800">{order.advanceBooking.arrivalTime}</span>
                  </div>
                  {order.advanceBooking.partySize && (
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">Party Size</span>
                      <span className="font-bold text-stone-800">{order.advanceBooking.partySize} Guests</span>
                    </div>
                  )}
                  {order.advanceBooking.seatingPreference && (
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold">Seating Area</span>
                      <span className="font-bold text-stone-800 capitalize">
                        {order.advanceBooking.seatingPreference.replace('_', ' ')}
                      </span>
                    </div>
                  )}
                </div>
              ) : order.scheduledFor ? (
                <p className="text-xs text-amber-900 font-bold">
                  Scheduled for: {order.scheduledFor}
                </p>
              ) : null}
            </div>
          )}

          {/* Progress Timeline */}
          <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-3">
              Order Workflow
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="flex flex-col items-center gap-1.5">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white shadow-xs text-xs font-black">
                  ✓
                </div>
                <span className="font-bold text-stone-800 text-[11px]">Submitted</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Done</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-500 text-stone-950 shadow-xs text-xs font-black ring-4 ring-amber-200/70">
                  2
                </div>
                <span className="font-bold text-stone-900 text-[11px]">
                  {isLiveInHouse ? 'Kitchen Queue' : 'Booking Logged'}
                </span>
                <span className="text-[10px] text-amber-700 font-bold">In Queue...</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-stone-200 text-stone-500 text-xs font-black">
                  3
                </div>
                <span className="font-medium text-stone-500 text-[11px]">
                  {isLiveInHouse ? 'Serve to Table' : 'Arrive & Enjoy'}
                </span>
                <span className="text-[10px] text-stone-400">Upcoming</span>
              </div>
            </div>
          </div>

          {/* Order Summary Information */}
          <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-amber-600" />
                <span className="font-display font-bold text-sm text-stone-900">
                  Items in Ticket ({order.items.length})
                </span>
              </div>
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-700">
                {getOrderTypeLabel()}
              </span>
            </div>

            {/* Item Rows */}
            <div className="space-y-2 divide-y divide-stone-100 text-xs">
              {order.items.map((item, idx) => (
                <div key={idx} className="pt-2 first:pt-0 flex justify-between items-start gap-2">
                  <div>
                    <span className="font-bold text-stone-800">
                      {item.quantity}x {item.name}
                    </span>
                    {item.specialInstructions && (
                      <p className="text-[11px] text-stone-500 italic mt-0.5">
                        Note: {item.specialInstructions}
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-bold text-stone-700 shrink-0">
                    ₱{item.totalPrice.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Details */}
            <div className="border-t border-stone-200 pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal:</span>
                <span className="font-mono">₱{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-500 text-[11px]">
                <span>VAT ({order.taxRate || 12}%):</span>
                <span className="font-mono">₱{order.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-stone-950 pt-1.5 border-t border-stone-100">
                <span className="font-display">Total Amount:</span>
                <span className="font-mono font-black text-amber-700">
                  ₱{order.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Customer & Payment Meta */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-[11px] text-stone-600">
              <div>
                <span className="text-stone-400 block">Customer:</span>
                <span className="font-semibold text-stone-800 truncate block">
                  {order.customerName || 'Customer'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Payment Preference:</span>
                <span className="font-semibold text-stone-800 truncate block">
                  {getPaymentMethodLabel()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row gap-2">
          {onTrackOrder ? (
            <button
              onClick={onTrackOrder}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-3 text-xs font-extrabold text-stone-950 shadow-xs transition cursor-pointer"
            >
              <span>Track in My Orders</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          <button
            onClick={onClose}
            className={`rounded-xl border border-stone-300 bg-white hover:bg-stone-100 px-5 py-3 text-xs font-bold text-stone-800 transition cursor-pointer ${
              !onTrackOrder ? 'w-full' : ''
            }`}
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
