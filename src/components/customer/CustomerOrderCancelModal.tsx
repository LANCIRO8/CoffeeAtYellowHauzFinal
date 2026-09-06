import React, { useState } from 'react';
import { Order } from '../../types';
import { AppStore } from '../../services/store';
import {
  AlertTriangle,
  X,
  CheckCircle2,
  Clock,
  Ban,
  HelpCircle,
  ShoppingBag,
  Sparkles,
  Info,
} from 'lucide-react';

interface CustomerOrderCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess?: (cancelledOrder: Order) => void;
}

const CANCELLATION_OPTIONS = [
  {
    id: 'mistake',
    label: 'Placed by mistake / Duplicate order',
    description: 'Accidentally submitted this order or placed duplicated tickets',
    icon: '⚡',
  },
  {
    id: 'change_of_mind',
    label: 'Change of mind / Need to leave',
    description: 'Cannot stay longer or need to leave unexpectedly',
    icon: '🏃',
  },
  {
    id: 'long_wait',
    label: 'Waiting time is taking too long',
    description: 'Order preparation is taking longer than anticipated',
    icon: '⏳',
  },
  {
    id: 'modify_items',
    label: 'Need to modify items or table',
    description: 'Want to re-order with different items, sizes, or table seat',
    icon: '🔄',
  },
  {
    id: 'other',
    label: 'Other reason',
    description: 'Provide custom notes or feedback for our team',
    icon: '📝',
  },
];

export const CustomerOrderCancelModal: React.FC<CustomerOrderCancelModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>('mistake');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setIsSubmitting(true);
    const chosenOption = CANCELLATION_OPTIONS.find((opt) => opt.id === selectedOptionId);
    const reasonText = chosenOption ? chosenOption.label : 'Customer requested cancellation';

    try {
      const updated = AppStore.requestOrderCancellation(
        order.id,
        reasonText,
        customNotes.trim() || undefined
      );

      setIsSubmittedSuccess(true);
      if (updated && onSuccess) {
        onSuccess(updated);
      }
    } catch (err) {
      console.error('Failed to request cancellation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSubmittedSuccess(false);
    setCustomNotes('');
    setSelectedOptionId('mistake');
    onClose();
  };

  return (
    <div
      id="customer-order-cancel-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        id="customer-order-cancel-modal-container"
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200 text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 p-4 sm:p-5 text-white relative">
          <button
            type="button"
            id="close-cancel-modal-btn"
            onClick={handleClose}
            className="absolute top-3.5 right-3.5 rounded-full bg-black/15 hover:bg-black/25 p-1.5 text-white transition cursor-pointer"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 pr-6">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-xs text-white shadow-inner shrink-0">
              <Ban className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-black text-base sm:text-lg leading-tight">
                Request Order Cancellation
              </h3>
              <p className="text-white/80 text-[11px] sm:text-xs">
                Ticket <span className="font-mono font-bold text-white">#{order.orderNumber}</span> • Total ₱{order.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {isSubmittedSuccess ? (
          <div className="p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-600">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="font-display font-extrabold text-base text-stone-900">
                Cancellation Request Sent!
              </h4>
              <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                Your request to cancel Order <span className="font-bold text-stone-800">#{order.orderNumber}</span> has been dispatched to the staff &amp; admin notification center.
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-left space-y-1.5 text-[11px] text-amber-950">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Info className="h-4 w-4 shrink-0 text-amber-700" />
                <span>What happens next?</span>
              </div>
              <p className="text-amber-900/90 leading-normal pl-5">
                Staff or manager will confirm the cancellation on their POS or notification panel. Any reserved stocks and table seatings will be updated automatically.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-stone-900 text-amber-400 py-2.5 text-xs font-black hover:bg-stone-800 transition cursor-pointer shadow-xs"
              >
                Back to My Orders
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            {/* Context order banner */}
            <div className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-200/80 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5 text-stone-500" />
                <span className="font-semibold text-stone-700">
                  {order.items.reduce((s, i) => s + i.quantity, 0)} items in this order
                </span>
              </div>
              <span className="font-bold text-stone-900 capitalize">
                {order.tableNumber ? `Table #${order.tableNumber}` : order.orderType.replace('_', ' ')}
              </span>
            </div>

            {/* Selectable Cancellation Options */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Select Reason for Cancellation <span className="text-rose-600">*</span>
              </label>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {CANCELLATION_OPTIONS.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <label
                      key={opt.id}
                      htmlFor={`cancel-opt-${opt.id}`}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/70 ring-1 ring-rose-500/30 shadow-2xs'
                          : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60'
                      }`}
                    >
                      <input
                        type="radio"
                        id={`cancel-opt-${opt.id}`}
                        name="cancel_reason_option"
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => setSelectedOptionId(opt.id)}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{opt.icon}</span>
                          <span
                            className={`text-xs font-bold leading-tight ${
                              isSelected ? 'text-rose-950' : 'text-stone-800'
                            }`}
                          >
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Custom Notes / Remarks (Optional) */}
            <div className="space-y-1">
              <label
                htmlFor="cancel-notes-textarea"
                className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider"
              >
                Additional Notes for Staff (Optional)
              </label>
              <textarea
                id="cancel-notes-textarea"
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="E.g., Need to leave immediately, or want to replace with hot latte..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 p-2 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:border-rose-400 focus:outline-none transition"
              />
            </div>

            {/* Staff & Admin Confirmation Requirement Note */}
            <div className="rounded-xl bg-amber-50/90 border border-amber-200 p-2.5 flex items-start gap-2 text-[11px] text-amber-950">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-900">Staff &amp; Admin Confirmation Required</p>
                <p className="text-amber-900/80 leading-normal text-[10px]">
                  Submitting this sends an alert to the staff and cashier notification center. Once verified by our team, your order will be cancelled.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
              <button
                type="button"
                id="keep-order-button"
                onClick={handleClose}
                className="rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="submit"
                id="submit-cancel-request-button"
                disabled={isSubmitting}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Confirm Cancel Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
