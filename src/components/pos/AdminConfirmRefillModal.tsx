import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Package,
  Coffee,
  ChefHat,
  Monitor,
  Store,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
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
  const [isRejecting, setIsRejecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Find corresponding menu item if linked
  const [linkedMenuItem, setLinkedMenuItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (isOpen && request) {
      setFinalQuantity(request.suggestedQuantity);
      setAdminNotes('');
      setErrorMessage('');
      setIsRejecting(false);

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

  const handleApprove = async () => {
    if (finalQuantity <= 0) {
      setErrorMessage('Final quantity to add must be greater than 0.');
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
        adminNotes.trim() || 'Item currently not needed or out of supplier stock'
      );
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error rejecting refill request:', err);
      setErrorMessage('Failed to reject request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStationBadge = () => {
    switch (request.station) {
      case 'bar':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-900">
            <Coffee className="h-3 w-3 text-amber-700" />
            <span>Barista / Coffee Bar</span>
          </span>
        );
      case 'kitchen':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-900">
            <ChefHat className="h-3 w-3 text-orange-700" />
            <span>Cook / Kitchen</span>
          </span>
        );
      case 'counter':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-black text-stone-800">
            <Monitor className="h-3 w-3 text-stone-600" />
            <span>Cashier / Counter</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-black text-stone-800">
            <Store className="h-3 w-3 text-stone-600" />
            <span>General Store</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-900 text-white px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-stone-950 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                Admin Refill Confirmation
              </h3>
              <p className="text-[11px] text-stone-300 font-medium">
                Confirm purchased items &amp; decide final quantity to add to system
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Requested Item Card */}
          <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                  Staff Refill Request
                </span>
                <h4 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                  {request.itemName}
                </h4>
                {request.categoryName && (
                  <p className="text-xs text-stone-500 font-medium">{request.categoryName}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {renderStationBadge()}
                {request.urgency === 'urgent' && (
                  <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-800">
                    🚨 Out of Stock
                  </span>
                )}
                {request.urgency === 'high' && (
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                    ⚠️ Very Low
                  </span>
                )}
              </div>
            </div>

            {/* Requester & Notes */}
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-stone-200/80 pt-2.5">
              <div>
                <span className="text-[10px] text-stone-400 font-bold block">Suggested By:</span>
                <span className="font-extrabold text-stone-800">
                  {request.requestedBy.name} ({request.requestedBy.role})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold block">Suggested Quantity:</span>
                <span className="font-extrabold text-amber-800 font-mono text-sm">
                  {request.suggestedQuantity} {request.unit}
                </span>
              </div>
            </div>

            {request.notes && (
              <div className="rounded-xl bg-white border border-stone-200/80 p-2.5 text-xs text-stone-700 italic">
                <span className="font-bold text-stone-500 not-italic mr-1">Staff Note:</span>
                "{request.notes}"
              </div>
            )}
          </div>

          {/* Admin Decision Section */}
          <div className="space-y-3 rounded-2xl border-2 border-amber-500/30 bg-amber-50/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-950">
                  Final Quantity Added to System
                </label>
                <p className="text-[11px] text-amber-800 font-medium">
                  As the buyer, confirm the actual amount purchased to enter into inventory.
                </p>
              </div>
              <span className="rounded-full bg-amber-500 text-stone-950 px-2 py-0.5 text-[10px] font-black uppercase">
                Admin Decision
              </span>
            </div>

            {/* Quantity Stepper */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFinalQuantity((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white font-black text-stone-800 hover:bg-stone-50 shadow-xs"
              >
                -
              </button>
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1}
                  value={finalQuantity}
                  onChange={(e) => setFinalQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center font-mono font-black rounded-xl border border-stone-300 bg-white py-2 text-base text-stone-950 shadow-inner focus:border-amber-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                  {request.unit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFinalQuantity((q) => q + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-300 bg-white font-black text-stone-800 hover:bg-stone-50 shadow-xs"
              >
                +
              </button>
            </div>

            {/* Quick adjust buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              {[request.suggestedQuantity, 5, 10, 20, 50].map((num, idx) => (
                <button
                  key={`${num}-${idx}`}
                  type="button"
                  onClick={() => setFinalQuantity(num)}
                  className={`flex-1 rounded-lg py-1 text-[10px] font-extrabold border transition cursor-pointer ${
                    finalQuantity === num
                      ? 'bg-amber-500 border-amber-600 text-stone-950 shadow-xs'
                      : 'bg-white border-stone-200 text-stone-700 hover:bg-amber-100'
                  }`}
                >
                  {idx === 0 ? `Suggested (${num})` : `+${num}`}
                </button>
              ))}
            </div>

            {/* Live Inventory Math Preview */}
            <div className="rounded-xl bg-white border border-amber-200/80 p-3 flex items-center justify-around text-center">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase block">
                  Current Stock
                </span>
                <span className="text-sm font-mono font-bold text-stone-700">
                  {currentStock} {request.unit}
                </span>
              </div>
              <span className="text-stone-400 font-black">+</span>
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase block">
                  Final Adding
                </span>
                <span className="text-sm font-mono font-black text-amber-900">
                  +{finalQuantity} {request.unit}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-stone-400" />
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                  New System Stock
                </span>
                <span className="text-base font-mono font-black text-emerald-700">
                  {newProjectedStock} {request.unit}
                </span>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Admin Notes / Purchase Details (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Purchased 8 cartons from supplier; bulk discount applied."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 border-t border-stone-200 bg-stone-50 px-4 sm:px-6 py-3">
          <button
            type="button"
            onClick={handleReject}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer disabled:opacity-50"
            title="Reject or decline this refill suggestion"
          >
            <XCircle className="h-4 w-4" />
            <span>Decline Request</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-md hover:bg-emerald-500 transition cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirm &amp; Add {finalQuantity} {request.unit}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
