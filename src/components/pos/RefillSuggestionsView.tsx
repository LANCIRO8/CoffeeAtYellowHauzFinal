import React, { useState, useMemo } from 'react';
import {
  Package,
  PackagePlus,
  Coffee,
  ChefHat,
  Monitor,
  Store,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Search,
  Filter,
  Check,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  User,
  Trash2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  RefillRequest,
  RefillRequestStatus,
  RefillStation,
  RefillUrgency,
  User as UserType,
  Category,
  MenuItem,
} from '../../types';
import { AppStore } from '../../services/store';
import { AdminConfirmRefillModal } from './AdminConfirmRefillModal';

interface RefillSuggestionsViewProps {
  activeStaff?: UserType | null;
  onOpenSuggestModal: (preselectedItem?: MenuItem | null) => void;
  categories: Category[];
}

export const RefillSuggestionsView: React.FC<RefillSuggestionsViewProps> = ({
  activeStaff,
  onOpenSuggestModal,
  categories,
}) => {
  const [requests, setRequests] = useState<RefillRequest[]>(() => AppStore.getRefillRequests());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RefillRequestStatus>('pending');
  const [stationFilter, setStationFilter] = useState<'all' | RefillStation>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | RefillUrgency>('all');

  // Selected request for Admin Review modal
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<RefillRequest | null>(null);

  const isAdmin = activeStaff?.role === 'admin';

  const refreshRequests = () => {
    setRequests(AppStore.getRefillRequests());
  };

  // KPIs
  const kpis = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const approved = requests.filter((r) => r.status === 'approved').length;
    const bar = requests.filter((r) => r.station === 'bar').length;
    const kitchen = requests.filter((r) => r.station === 'kitchen').length;
    const urgent = requests.filter((r) => r.status === 'pending' && r.urgency === 'urgent').length;
    return { pending, approved, bar, kitchen, urgent };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (stationFilter !== 'all' && r.station !== stationFilter) return false;
        if (urgencyFilter !== 'all' && r.urgency !== urgencyFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchItem = r.itemName.toLowerCase().includes(q);
          const matchCat = (r.categoryName || '').toLowerCase().includes(q);
          const matchStaff = r.requestedBy.name.toLowerCase().includes(q);
          const matchNotes = (r.notes || '').toLowerCase().includes(q);
          return matchItem || matchCat || matchStaff || matchNotes;
        }

        return true;
      })
      .sort((a, b) => {
        // Pending first, then by urgency (urgent -> high -> normal -> low), then newest first
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;

        const urgencyWeights: Record<RefillUrgency, number> = {
          urgent: 4,
          high: 3,
          normal: 2,
          low: 1,
        };
        const weightA = urgencyWeights[a.urgency] || 0;
        const weightB = urgencyWeights[b.urgency] || 0;
        if (weightA !== weightB) return weightB - weightA;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [requests, statusFilter, stationFilter, urgencyFilter, searchQuery]);

  const handleCancelRequest = (requestId: string) => {
    if (confirm('Cancel this refill suggestion?')) {
      AppStore.cancelRefillRequest(requestId);
      refreshRequests();
    }
  };

  const renderStationBadge = (st: RefillStation) => {
    switch (st) {
      case 'bar':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100/80 px-2 py-0.5 text-[11px] font-extrabold text-amber-900 border border-amber-200">
            <Coffee className="h-3 w-3 text-amber-700" />
            <span>Coffee Bar</span>
          </span>
        );
      case 'kitchen':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-orange-100/80 px-2 py-0.5 text-[11px] font-extrabold text-orange-900 border border-orange-200">
            <ChefHat className="h-3 w-3 text-orange-700" />
            <span>Kitchen Cook</span>
          </span>
        );
      case 'counter':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-extrabold text-stone-800 border border-stone-200">
            <Monitor className="h-3 w-3 text-stone-600" />
            <span>Cashier Counter</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-extrabold text-stone-800 border border-stone-200">
            <Store className="h-3 w-3 text-stone-600" />
            <span>General</span>
          </span>
        );
    }
  };

  const renderUrgencyBadge = (u: RefillUrgency) => {
    switch (u) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-800 border border-rose-200 animate-pulse">
            <AlertCircle className="h-3 w-3" />
            <span>Out of Stock</span>
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-200">
            <AlertTriangle className="h-3 w-3" />
            <span>Very Low Stock</span>
          </span>
        );
      case 'normal':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
            <Clock className="h-3 w-3" />
            <span>Normal Refill</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200">
            <span>Low Priority</span>
          </span>
        );
    }
  };

  const renderStatusBadge = (r: RefillRequest) => {
    switch (r.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-950">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span>Pending Admin Confirmation</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-900">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Approved &amp; Added to Stock</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 border border-rose-300 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-900">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>Declined by Admin</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-300 px-2.5 py-0.5 text-[11px] font-bold text-stone-600">
            <span>Cancelled by Staff</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Informative Role Banner */}
      <div className="rounded-2xl border border-amber-300/80 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-stone-950 shadow-2xs font-bold text-xs">
              {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <PackagePlus className="h-4 w-4" />}
            </span>
            <h3 className="text-sm sm:text-base font-black text-stone-900">
              {isAdmin
                ? 'Admin Refill Purchase Confirmation'
                : 'Staff Inventory Refill Suggestions'}
            </h3>
            <span className="rounded-full bg-amber-500 text-stone-950 font-black text-[10px] px-2 py-0.2 uppercase">
              {activeStaff?.role || 'Staff'} View
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed font-medium">
            {isAdmin ? (
              <>
                Cashiers, cooks, and baristas submit lists of items needed for their stations. As the admin who purchases the supplies, you review the suggestions and <strong>decide the final quantity to officially add</strong> to the system stock.
              </>
            ) : (
              <>
                Notice an item running low or out of stock? Submit a refill suggestion below. The Admin reviews all suggestions, buys the supplies, and officially confirms the final quantity into the system.
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenSuggestModal(null)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-stone-950 shadow-md hover:bg-amber-400 hover:shadow-lg transition cursor-pointer shrink-0"
        >
          <PackagePlus className="h-4 w-4" />
          <span>+ Suggest Item to Refill</span>
        </button>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Pending Card */}
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'pending'
              ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-900">
              Pending Review
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Clock className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 font-mono mt-1">
            {kpis.pending}
          </div>
          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
            {kpis.urgent > 0 ? `🚨 ${kpis.urgent} Out of stock` : 'Awaiting admin decision'}
          </div>
        </button>

        {/* Approved Card */}
        <button
          type="button"
          onClick={() => setStatusFilter('approved')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition cursor-pointer ${
            statusFilter === 'approved'
              ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-xs'
              : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-900">
              Approved &amp; Added
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950 font-mono mt-1">
            {kpis.approved}
          </div>
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            Official system stock updated
          </div>
        </button>

        {/* Bar Requests */}
        <button
          type="button"
          onClick={() => {
            setStationFilter(stationFilter === 'bar' ? 'all' : 'bar');
          }}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition cursor-pointer ${
            stationFilter === 'bar'
              ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-stone-700">
              Barista Requests
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <Coffee className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono mt-1">
            {kpis.bar}
          </div>
          <div className="text-[10px] text-stone-500 font-medium mt-0.5">
            Coffee bar &amp; beverage supplies
          </div>
        </button>

        {/* Kitchen Requests */}
        <button
          type="button"
          onClick={() => {
            setStationFilter(stationFilter === 'kitchen' ? 'all' : 'kitchen');
          }}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition cursor-pointer ${
            stationFilter === 'kitchen'
              ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-xs'
              : 'border-stone-200 bg-white hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-stone-700">
              Kitchen Requests
            </span>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-100 text-orange-800">
              <ChefHat className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono mt-1">
            {kpis.kitchen}
          </div>
          <div className="text-[10px] text-stone-500 font-medium mt-0.5">
            Food &amp; kitchen ingredients
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-stone-100/90 p-2 sm:p-2.5 rounded-2xl border border-stone-200/90 shadow-2xs">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'pending', label: 'Pending Review', count: kpis.pending },
            { id: 'all', label: 'All Requests', count: requests.length },
            { id: 'approved', label: 'Approved & Added', count: kpis.approved },
            { id: 'rejected', label: 'Declined', count: requests.filter((r) => r.status === 'rejected').length },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-stone-950 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono ${
                  statusFilter === tab.id ? 'bg-amber-100 text-amber-950 font-bold' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Station Filter & Search */}
        <div className="flex items-center gap-2">
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value as any)}
            className="rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-800 shadow-2xs focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Stations</option>
            <option value="bar">Coffee Bar (Barista)</option>
            <option value="kitchen">Kitchen (Cook)</option>
            <option value="counter">Front Counter (Cashier)</option>
          </select>

          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search refill suggestions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 py-1.5 text-xs font-medium text-stone-800 shadow-2xs focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-stone-200 p-8 sm:p-12 text-center bg-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-3">
              <Package className="h-6 w-6" />
            </div>
            <h4 className="text-base font-extrabold text-stone-900">No refill requests found</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4 font-medium">
              {statusFilter === 'pending'
                ? 'Great news! All item refill suggestions have been confirmed or reviewed by the Admin.'
                : 'No refill suggestions match the selected filters.'}
            </p>
            <button
              type="button"
              onClick={() => onOpenSuggestModal(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-stone-950 shadow-sm hover:bg-amber-400 transition cursor-pointer"
            >
              <PackagePlus className="h-4 w-4" />
              <span>Suggest Item to Refill</span>
            </button>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isAuthor = activeStaff?.id === req.requestedBy.id;
            const isPending = req.status === 'pending';

            return (
              <div
                key={req.id}
                className={`rounded-2xl border bg-white p-4 sm:p-5 shadow-xs transition-all ${
                  isPending
                    ? 'border-amber-200/90 hover:border-amber-400/90 bg-linear-to-r from-amber-500/[0.03] to-white'
                    : 'border-stone-200'
                }`}
              >
                {/* Card Top: Item title, station, urgency, status */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-3 border-b border-stone-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base sm:text-lg font-black text-stone-900">
                        {req.itemName}
                      </h4>
                      {renderStationBadge(req.station)}
                      {renderUrgencyBadge(req.urgency)}
                    </div>
                    {req.categoryName && (
                      <p className="text-xs font-semibold text-stone-500">
                        Category: <span className="text-stone-700">{req.categoryName}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {renderStatusBadge(req)}
                  </div>
                </div>

                {/* Card Middle: Quantities, Requester, Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-3 text-xs border-b border-stone-100">
                  {/* Quantities */}
                  <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-200/70 space-y-1">
                    <div className="flex items-center justify-between text-stone-500">
                      <span>Current System Stock:</span>
                      <strong className="font-mono text-stone-800">
                        {req.currentStock ?? 0} {req.unit}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-amber-900 font-bold">
                      <span>Staff Suggested Qty:</span>
                      <strong className="font-mono text-sm text-amber-900">
                        {req.suggestedQuantity} {req.unit}
                      </strong>
                    </div>
                    {req.finalQuantity !== undefined && (
                      <div className="flex items-center justify-between text-emerald-900 font-extrabold border-t border-stone-200/80 pt-1">
                        <span>Admin Confirmed Added:</span>
                        <strong className="font-mono text-sm text-emerald-700">
                          +{req.finalQuantity} {req.unit}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Requester Info */}
                  <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-200/70 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                      Suggested By Staff
                    </div>
                    <div className="flex items-center gap-1.5 font-extrabold text-stone-800">
                      <User className="h-3.5 w-3.5 text-stone-500" />
                      <span>{req.requestedBy.name}</span>
                      <span className="rounded-md bg-stone-200 px-1.5 py-0.2 text-[9px] uppercase font-bold text-stone-700">
                        {req.requestedBy.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-500 font-medium">
                      {new Date(req.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Admin Review Info or Status Note */}
                  <div className="rounded-xl bg-stone-50 p-2.5 border border-stone-200/70 space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                      Admin Confirmation
                    </div>
                    {req.reviewedBy ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-emerald-800 font-bold">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Reviewed by {req.reviewedBy.name}</span>
                        </div>
                        {req.reviewedAt && (
                          <div className="text-[10px] text-stone-500">
                            {new Date(req.reviewedAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                        {req.adminNotes && (
                          <div className="text-[11px] text-stone-700 italic">
                            "{req.adminNotes}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-stone-500 italic py-1">
                        Awaiting Admin review. The admin will purchase supplies and decide the final quantity added.
                      </div>
                    )}
                  </div>
                </div>

                {/* Staff Notes */}
                {req.notes && (
                  <div className="pt-2.5 pb-1 text-xs text-stone-700">
                    <span className="font-bold text-stone-500 mr-1.5">Staff Reason / Notes:</span>
                    <span className="bg-amber-50 border border-amber-200/60 rounded-md px-2 py-0.5 text-amber-950 font-medium">
                      "{req.notes}"
                    </span>
                  </div>
                )}

                {/* Bottom Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                  <div className="text-[11px] text-stone-400 font-medium">
                    Reference ID: <span className="font-mono">{req.id}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* If Admin and request is pending: Review & Confirm button */}
                    {isAdmin && isPending && (
                      <button
                        type="button"
                        onClick={() => setSelectedRequestForReview(req)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-black text-stone-950 shadow-sm hover:bg-amber-400 transition cursor-pointer"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>Review &amp; Confirm Final Qty</span>
                      </button>
                    )}

                    {/* If staff and authored by self and pending: Cancel button */}
                    {isPending && (isAuthor || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(req.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-bold text-stone-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer"
                        title="Cancel this refill suggestion"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}

                    {/* If approved: visual badge */}
                    {req.status === 'approved' && (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Officially recorded in inventory</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Confirm Refill Modal */}
      {selectedRequestForReview && (
        <AdminConfirmRefillModal
          isOpen={!!selectedRequestForReview}
          onClose={() => setSelectedRequestForReview(null)}
          request={selectedRequestForReview}
          activeStaff={activeStaff}
          onSuccess={() => {
            refreshRequests();
          }}
        />
      )}
    </div>
  );
};
