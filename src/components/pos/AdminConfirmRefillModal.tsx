import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { RefillRequest, User, MenuItem } from '../../types';
import { AppStore } from '../../services/store';

interface AdminConfirmRefillModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: RefillRequest | null;
  activeStaff?: User | null;
  onSuccess: () => void;
}

export const AdminConfirmRefillModal: React.FC<AdminConfirmRefillModalProps> = ({
  isOpen,
  onClose,
  request,
  activeStaff,
  onSuccess,
}) => {
  const [finalQuantity, setFinalQuantity] = useState<number>(10);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Find corresponding menu item if linked
  const [linkedMenuItem, setLinkedMenuItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (isOpen && request) {
      setFinalQuantity(request.suggestedQuantity);
      setAdminNotes('');
      setErrorMessage('');

      if (request.menuItemId) {
        const item = AppStore.getMenuItems().find((i) => i.id === request.menuItemId);
        setLinkedMenuItem(item || null);
      } else {
        // Try finding by name match
        const item = AppStore.getMenuItems().find(
          (i) => i.name.toLowerCase() === request.itemName.toLowerCase()
        );
        setLinkedMenuItem(item || null);
      }
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const currentStock = linkedMenuItem ? (linkedMenuItem.quantity ?? 0) : request.currentStock ?? 0;
  const newProjectedStock = currentStock + (finalQuantity || 0);

  const hasCustomNotes =
    request.notes &&
    request.notes.trim() !== '' &&
    !request.notes.toLowerCase().startsWith('refill requested by');

  const handleApprove = async () => {
    if (finalQuantity <= 0) {
      setErrorMessage('Quantity to add must be greater than 0.');
      return;
    }

    const staff = activeStaff || AppStore.getActiveStaff();
    const adminUser = staff
      ? { id: staff.id, name: staff.fullName, role: staff.role }
      : { id: 1, name: 'Admin Manager', role: 'admin' };

    setIsSubmitting(true);
    try {
      AppStore.approveRefillRequest(request.id, finalQuantity, adminUser, adminNotes.trim() || undefined);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error approving refill request:', err);
      setErrorMessage('Failed to confirm refill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    const staff = activeStaff || AppStore.getActiveStaff();
    const adminUser = staff
      ? { id: staff.id, name: staff.fullName, role: staff.role }
      : { id: 1, name: 'Admin Manager', role: 'admin' };

    setIsSubmitting(true);
    try {
      AppStore.rejectRefillRequest(
        request.id,
        adminUser,
        adminNotes.trim() || 'Declined by admin'
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error rejecting refill request:', err);
      setErrorMessage('Failed to decline request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
              <Package className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Confirm Refill</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Item Details */}
          <div className="rounded-xl bg-stone-50 border border-stone-200/80 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-base font-extrabold text-stone-900 truncate">
                {request.itemName}
              </h4>
              <span className="font-bold text-xs text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                +{request.suggestedQuantity} {request.unit} requested
              </span>
            </div>

            <p className="text-xs text-stone-500">
              From <strong className="text-stone-700">{request.requestedBy.name}</strong> • Current stock: <strong className="text-stone-700">{currentStock} {request.unit}</strong>
            </p>

            {hasCustomNotes && (
              <p className="mt-1.5 rounded bg-white border border-stone-200 px-2 py-1 text-xs text-stone-700 italic">
                "{request.notes}"
              </p>
            )}
          </div>

          {/* Quantity Stepper */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-700">Quantity to Add</span>
              <span className="text-stone-500">
                New stock: <strong className="text-emerald-700 font-bold">{newProjectedStock} {request.unit}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFinalQuantity((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-50 shadow-xs transition cursor-pointer"
              >
                -
              </button>
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  value={finalQuantity}
                  onChange={(e) => setFinalQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center font-mono font-bold rounded-xl border border-stone-300 bg-white py-2 text-base text-stone-900 shadow-2xs focus:border-amber-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400">
                  {request.unit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFinalQuantity((q) => q + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-50 shadow-xs transition cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Quick adjust chips */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {[request.suggestedQuantity, 5, 10, 20].map((num, idx) => (
                <button
                  key={`${num}-${idx}`}
                  type="button"
                  onClick={() => setFinalQuantity(num)}
                  className={`flex-1 rounded-lg py-1 text-xs font-semibold border transition cursor-pointer ${
                    finalQuantity === num
                      ? 'bg-amber-500 border-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {idx === 0 ? `Suggested (${num})` : `+${num}`}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Supplier receipt number or restock note"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">
          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
          >
            Decline
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Confirm (+{finalQuantity})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
