import React, { useState, useEffect, useMemo } from 'react';
import {
  PackagePlus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Trash2,
  Coffee,
  ChefHat,
  Monitor,
  Package,
} from 'lucide-react';
import {
  RefillRequest,
  RefillStation,
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
}) => {
  const [requests, setRequests] = useState<RefillRequest[]>(() => AppStore.getRefillRequests());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [stationFilter, setStationFilter] = useState<'all' | RefillStation>('all');
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<RefillRequest | null>(null);

  const isAdmin = activeStaff?.role === 'admin';

  const refreshRequests = () => {
    setRequests(AppStore.getRefillRequests());
  };

  useEffect(() => {
    return AppStore.subscribe(refreshRequests);
  }, []);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);
  const approvedCount = useMemo(() => requests.filter((r) => r.status === 'approved').length, [requests]);

  const filteredRequests = useMemo(() => {
    return requests
      .filter((r) => {
        if (statusFilter === 'pending' && r.status !== 'pending') return false;
        if (statusFilter === 'approved' && r.status !== 'approved') return false;
        if (stationFilter !== 'all' && r.station !== stationFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            r.itemName.toLowerCase().includes(q) ||
            (r.categoryName || '').toLowerCase().includes(q) ||
            r.requestedBy.name.toLowerCase().includes(q) ||
            (r.notes || '').toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [requests, statusFilter, stationFilter, searchQuery]);

  const handleCancelRequest = (requestId: string) => {
    if (confirm('Cancel this refill suggestion?')) {
      AppStore.cancelRefillRequest(requestId);
      refreshRequests();
    }
  };

  const handleDeclineRequest = (req: RefillRequest) => {
    if (!activeStaff) return;
    if (confirm(`Decline refill suggestion for "${req.itemName}"?`)) {
      AppStore.rejectRefillRequest(
        req.id,
        { id: activeStaff.id, name: activeStaff.name || 'Admin', role: activeStaff.role },
        'Declined by Admin'
      );
      refreshRequests();
    }
  };

  interface StaffRefillGroup {
    staffKey: string;
    requestedBy: RefillRequest['requestedBy'];
    items: RefillRequest[];
    latestDate: string;
    pendingCount: number;
    approvedCount: number;
  }

  // Group refill requests and notes by the staff member who submitted them
  const groupedRequests = useMemo<StaffRefillGroup[]>(() => {
    const map = new Map<string, StaffRefillGroup>();

    filteredRequests.forEach((req) => {
      const staffKey = String(req.requestedBy.id || req.requestedBy.employeeId || req.requestedBy.name);
      if (!map.has(staffKey)) {
        map.set(staffKey, {
          staffKey,
          requestedBy: req.requestedBy,
          items: [],
          latestDate: req.createdAt,
          pendingCount: 0,
          approvedCount: 0,
        });
      }
      const grp = map.get(staffKey)!;
      grp.items.push(req);
      if (new Date(req.createdAt).getTime() > new Date(grp.latestDate).getTime()) {
        grp.latestDate = req.createdAt;
      }
      if (req.status === 'pending') grp.pendingCount++;
      if (req.status === 'approved') grp.approvedCount++;
    });

    return Array.from(map.values()).sort((a, b) => {
      // Pending first
      if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
      if (a.pendingCount === 0 && b.pendingCount > 0) return 1;
      return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
    });
  }, [filteredRequests]);

  const handleBatchApprove = (group: StaffRefillGroup) => {
    const pendingItems = group.items.filter((i) => i.status === 'pending');
    if (pendingItems.length === 0) return;

    if (
      confirm(
        `Approve all ${pendingItems.length} refill suggestions from ${group.requestedBy.name} with suggested quantities?`
      )
    ) {
      const staff = activeStaff || AppStore.getActiveStaff();
      const adminUser = staff
        ? { id: staff.id, name: staff.fullName || staff.name || 'Admin', role: staff.role }
        : { id: 1, name: 'Admin Manager', role: 'admin' };

      pendingItems.forEach((item) => {
        AppStore.approveRefillRequest(
          item.id,
          item.suggestedQuantity,
          adminUser,
          'Batch approved by Admin'
        );
      });
      refreshRequests();
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div id="refill-suggestions-view" className="space-y-3.5">
      {/* Top Header: Simple Title + Suggest Refill Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-0.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Refill Suggestions
            </h3>
            {pendingCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-bold border border-amber-200">
                <Clock className="h-3 w-3 text-amber-700" />
                <span>{pendingCount} Pending</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 text-stone-600 px-2 py-0.5 text-xs font-medium">
                All caught up
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Staff restock suggestions awaiting Admin confirmation.
          </p>
        </div>

        <button
          id="btn-open-suggest-refill"
          type="button"
          onClick={() => onOpenSuggestModal(null)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-stone-950 transition shadow-xs cursor-pointer shrink-0"
        >
          <PackagePlus className="h-4 w-4" />
          <span>+ Suggest Refill</span>
        </button>
      </div>

      {/* Filter and Search Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-100/90 p-1.5 sm:p-2 rounded-xl border border-stone-200">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1">
          {[
            { id: 'pending', label: 'Pending', count: pendingCount },
            { id: 'approved', label: 'Approved', count: approvedCount },
            { id: 'all', label: 'All', count: requests.length },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`tab-refill-filter-${tab.id}`}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-stone-950 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  statusFilter === tab.id
                    ? 'bg-amber-100 text-amber-900 font-bold'
                    : 'bg-stone-200 text-stone-600'
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
            id="select-refill-station"
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value as any)}
            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-800 shadow-2xs focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Stations</option>
            <option value="bar">Coffee Bar</option>
            <option value="kitchen">Kitchen</option>
            <option value="counter">Counter</option>
          </select>

          <div className="relative w-full sm:w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              id="input-search-refills"
              type="text"
              placeholder="Search item or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-white pl-8 pr-3 py-1.5 text-xs font-medium text-stone-800 shadow-2xs focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* List: Refill Requests & Notes Grouped by Staff Member as a Whole */}
      <div className="space-y-3.5">
        {groupedRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center bg-white">
            <Package className="h-8 w-8 text-stone-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-stone-800">No refill suggestions found</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-3">
              {statusFilter === 'pending'
                ? 'All refill suggestions have been reviewed and added.'
                : 'No suggestions match the selected filter.'}
            </p>
            <button
              type="button"
              onClick={() => onOpenSuggestModal(null)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold text-stone-950 transition cursor-pointer"
            >
              <PackagePlus className="h-3.5 w-3.5" />
              <span>Suggest Refill</span>
            </button>
          </div>
        ) : (
          groupedRequests.map((group) => {
            const hasPending = group.pendingCount > 0;
            const isAllApproved = group.approvedCount === group.items.length;

            return (
              <div
                key={group.staffKey}
                id={`refill-staff-group-${group.staffKey}`}
                className={`rounded-2xl border transition bg-white shadow-2xs overflow-hidden ${
                  hasPending
                    ? 'border-amber-200/90 hover:border-amber-300'
                    : 'border-stone-200/90 hover:border-stone-300'
                }`}
              >
                {/* Unified Staff Header: Groups all notes from the same staff member */}
                <div
                  className={`p-3 sm:p-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    hasPending ? 'bg-amber-50/60 border-amber-100' : 'bg-stone-50/80 border-stone-200/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/20 text-amber-900 shrink-0 font-bold">
                      {group.requestedBy.role === 'barista' ? (
                        <Coffee className="h-4 w-4 text-amber-800" />
                      ) : group.requestedBy.role === 'cook' ? (
                        <ChefHat className="h-4 w-4 text-orange-800" />
                      ) : group.requestedBy.role === 'cashier' ? (
                        <Monitor className="h-4 w-4 text-stone-700" />
                      ) : (
                        <Package className="h-4 w-4 text-amber-800" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-stone-900 text-sm sm:text-base">
                          {group.requestedBy.name}
                        </span>
                        <span className="rounded-md bg-stone-200/80 text-stone-800 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                          {group.requestedBy.role}
                        </span>
                        {group.requestedBy.employeeId && (
                          <span className="font-mono text-[10px] text-stone-500">
                            #{group.requestedBy.employeeId}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 text-[10px] font-black">
                          <Package className="h-3 w-3 text-amber-700" />
                          <span>
                            {group.items.length} {group.items.length === 1 ? 'Refill Item' : 'Refill Items'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                        <Clock className="h-3 w-3 text-amber-600" />
                        <span>Latest request: {formatTimeAgo(group.latestDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Header Status Summary & Batch Admin Controls */}
                  <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
                    {hasPending ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 border border-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
                        <span>{group.pendingCount} Awaiting Admin</span>
                      </span>
                    ) : isAllApproved ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 border border-emerald-300 px-2.5 py-1 text-[11px] font-bold text-emerald-900">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                        <span>All Approved ({group.approvedCount})</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                        {group.pendingCount} Pending • {group.approvedCount} Approved
                      </span>
                    )}

                    {/* Batch Admin Approve All if multiple pending items from this staff member */}
                    {isAdmin && group.pendingCount > 1 && (
                      <button
                        id={`btn-confirm-all-${group.staffKey}`}
                        type="button"
                        onClick={() => handleBatchApprove(group)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-stone-950 transition shadow-xs cursor-pointer"
                        title="Approve all pending items from this staff member with suggested quantities"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Confirm All ({group.pendingCount})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items & Refill Notes ("as one as a whole") */}
                <div className="divide-y divide-stone-100">
                  {group.items.map((req) => {
                    const isPending = req.status === 'pending';
                    const isItemAuthor = activeStaff?.id === req.requestedBy.id;

                    return (
                      <div
                        key={req.id}
                        id={`refill-item-${req.id}`}
                        className="p-3 sm:p-3.5 hover:bg-stone-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Left: Item Information & Refill Note */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm sm:text-base font-bold text-stone-900 leading-snug">
                              {req.itemName}
                            </h4>

                            {/* Station Badge */}
                            <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                              {req.station === 'bar' && <Coffee className="h-3 w-3 text-amber-700" />}
                              {req.station === 'kitchen' && <ChefHat className="h-3 w-3 text-orange-700" />}
                              {req.station === 'counter' && <Monitor className="h-3 w-3 text-stone-600" />}
                              <span>
                                {req.station === 'bar'
                                  ? 'Coffee Bar'
                                  : req.station === 'kitchen'
                                  ? 'Kitchen'
                                  : req.station === 'counter'
                                  ? 'Counter'
                                  : 'General'}
                              </span>
                            </span>

                            {/* Urgency Badge */}
                            {req.urgency === 'urgent' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold">
                                <AlertTriangle className="h-3 w-3" />
                                <span>Out of Stock</span>
                              </span>
                            )}
                            {req.urgency === 'high' && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-bold">
                                <span>Low Stock</span>
                              </span>
                            )}

                            {/* Status Indicator */}
                            {req.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>Pending</span>
                              </span>
                            ) : req.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>Approved</span>
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                <span>Declined</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                                <span>Cancelled</span>
                              </span>
                            )}
                          </div>

                          {/* Quantities & Time */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-stone-600">
                            <span>
                              Current: <strong className="font-mono text-stone-900">{req.currentStock ?? 0} {req.unit}</strong>
                            </span>
                            <span className="text-stone-300">•</span>
                            <span>
                              Suggested: <strong className="font-mono text-amber-900 font-bold">+{req.suggestedQuantity} {req.unit}</strong>
                            </span>
                            {req.finalQuantity !== undefined && (
                              <>
                                <span className="text-stone-300">•</span>
                                <span>
                                  Added: <strong className="font-mono text-emerald-700 font-bold">+{req.finalQuantity} {req.unit}</strong>
                                </span>
                              </>
                            )}
                            <span className="text-stone-300">•</span>
                            <span className="text-[11px] text-stone-400 font-mono">
                              {formatTimeAgo(req.createdAt)}
                            </span>
                          </div>

                          {/* Staff Refill Note */}
                          {req.notes && (
                            <div className="flex items-start gap-1.5 rounded-lg bg-amber-50/80 border border-amber-200/80 px-2.5 py-1.5 text-xs text-stone-800">
                              <span className="font-bold text-amber-900 shrink-0">Refill Note:</span>
                              <span className="italic text-stone-800 font-medium">"{req.notes}"</span>
                            </div>
                          )}

                          {/* Admin Note if reviewed */}
                          {req.adminNotes && req.status !== 'pending' && (
                            <div className="flex items-start gap-1.5 rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs text-stone-600">
                              <span className="font-semibold text-stone-700 shrink-0">Admin Note:</span>
                              <span className="italic text-stone-600">"{req.adminNotes}"</span>
                            </div>
                          )}
                        </div>

                        {/* Right: Individual Item Action Buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                          {isAdmin && isPending && (
                            <>
                              <button
                                id={`btn-confirm-refill-${req.id}`}
                                type="button"
                                onClick={() => setSelectedRequestForReview(req)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-stone-950 transition shadow-xs cursor-pointer"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span>Confirm Refill</span>
                              </button>
                              <button
                                id={`btn-decline-refill-${req.id}`}
                                type="button"
                                onClick={() => handleDeclineRequest(req)}
                                className="inline-flex items-center gap-1 rounded-xl border border-stone-200 hover:bg-stone-100 px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition cursor-pointer"
                                title="Decline this suggestion"
                              >
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          {isPending && (isItemAuthor || isAdmin) && !isAdmin && (
                            <button
                              id={`btn-cancel-refill-${req.id}`}
                              type="button"
                              onClick={() => handleCancelRequest(req.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 px-2.5 py-1.5 text-xs font-medium text-stone-600 transition cursor-pointer"
                              title="Cancel suggestion"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
