import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Table, Order, Reservation, TableRequest, User } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Users,
  CheckCircle,
  Clock,
  Ban,
  RefreshCw,
  Sparkles,
  Filter,
  Globe,
  Store,
  Columns,
  Layers,
  Calendar,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  UserCheck,
  Search,
  Plus,
  AlertCircle,
  X,
  Edit3,
  Mail,
  Trash2,
  Coffee,
  Check,
  Bell,
  ShieldCheck,
  ArrowRight,
  User as UserIcon,
  Snowflake,
  Sun,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Grid2X2,
  Square,
  LayoutGrid,
} from 'lucide-react';

interface TableManagementProps {
  onSelectTableForOrder?: (tableNumber: number) => void;
  onViewOrderReceipt?: (order: Order) => void;
  activeStaff?: User | null;
}

type StatusFilter = 'all' | 'available' | 'occupied' | 'reserved' | 'cleaning';
type AreaFilter = 'all' | 'normal' | 'airconditioned';

export const TableManagement: React.FC<TableManagementProps> = ({
  onSelectTableForOrder,
  onViewOrderReceipt,
  activeStaff,
}) => {
  const { showAlert, showConfirm } = useModal();
  const [tables, setTables] = useState<Table[]>(() => AppStore.getTables());
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    AppStore.getReservations()
  );
  const [tableRequests, setTableRequests] = useState<TableRequest[]>(() =>
    AppStore.getTableRequests()
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Decline Modal state
  const [declineModalReq, setDeclineModalReq] = useState<TableRequest | null>(null);
  const [declineReasonOption, setDeclineReasonOption] = useState<string>(
    'Table is currently reserved for upcoming booking'
  );
  const [customDeclineReason, setCustomDeclineReason] = useState<string>('');

  // Filters matching image.png
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const isAnyFilterActive = statusFilter !== 'all' || areaFilter !== 'all';

  // Grid column view mode for tables floor plan: 1 column or 2 columns (persisted in localStorage)
  const [gridColumns, setGridColumns] = useState<1 | 2>(() => {
    try {
      const saved = localStorage.getItem('yh_tables_grid_columns');
      return saved === '1' ? 1 : 2;
    } catch {
      return 2;
    }
  });

  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const gridModalRef = useRef<HTMLDivElement>(null);

  const handleSetGridColumns = (cols: 1 | 2) => {
    setGridColumns(cols);
    try {
      localStorage.setItem('yh_tables_grid_columns', String(cols));
    } catch (e) {
      console.error(e);
    }
    setIsGridModalOpen(false);
  };

  // Close grid modal on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        gridModalRef.current &&
        !gridModalRef.current.contains(e.target as Node)
      ) {
        setIsGridModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selected table for detailed reservation / contact drawer
  const [selectedTableForDetails, setSelectedTableForDetails] = useState<Table | null>(null);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsub = AppStore.subscribe(() => {
      setTables(AppStore.getTables());
      setReservations(AppStore.getReservations());
      setTableRequests(AppStore.getTableRequests());
    });
    return () => unsub();
  }, []);

  const pendingRequests = tableRequests.filter((r) => r.status === 'pending');
  const resolvedRequests = tableRequests.filter((r) => r.status !== 'pending');

  // New reservation / new table / edit table modals
  const [isNewResModalOpen, setIsNewResModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [isEditTableModalOpen, setIsEditTableModalOpen] = useState(false);
  const [tableToEdit, setTableToEdit] = useState<Table | null>(null);

  // New table form state
  const [newTableForm, setNewTableForm] = useState<{
    tableNumber: number;
    name: string;
    setup: string;
    capacity: number;
    area: 'normal' | 'airconditioned';
    status: Table['status'];
  }>({
    tableNumber: 1,
    name: '',
    setup: '',
    capacity: 4,
    area: 'normal',
    status: 'available',
  });

  // Edit table state
  const [isEditingTable, setIsEditingTable] = useState(false);
  const [editTableForm, setEditTableForm] = useState<{
    tableNumber: number;
    name: string;
    setup: string;
    capacity: number;
    area: 'normal' | 'airconditioned';
    status: Table['status'];
  }>({
    tableNumber: 1,
    name: '',
    setup: '',
    capacity: 4,
    area: 'normal',
    status: 'available',
  });

  // Dedicated Edit Table Modal form state
  const [editModalForm, setEditModalForm] = useState<{
    tableNumber: number;
    name: string;
    setup: string;
    capacity: number;
    area: 'normal' | 'airconditioned';
    status: Table['status'];
  }>({
    tableNumber: 1,
    name: '',
    setup: '',
    capacity: 4,
    area: 'normal',
    status: 'available',
  });

  // New reservation form state for staff manual entry
  const [newResForm, setNewResForm] = useState({
    customerName: '',
    contactNumber: '',
    guestCount: 2,
    tableId: 1,
    reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
    notes: '',
  });

  // Quick book inside table details modal
  const [isQuickBooking, setIsQuickBooking] = useState(false);
  const [quickBookForm, setQuickBookForm] = useState({
    customerName: '',
    contactNumber: '',
    guestCount: 2,
    reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
    notes: '',
  });

  const orders = AppStore.getOrders();

  const refreshData = () => {
    const freshTables = AppStore.getTables();
    setTables(freshTables);
    setReservations(AppStore.getReservations());
    setTableRequests(AppStore.getTableRequests());
    if (selectedTableForDetails) {
      const updatedSelected = freshTables.find((t) => t.id === selectedTableForDetails.id);
      if (updatedSelected) {
        setSelectedTableForDetails(updatedSelected);
      }
    }
  };

  const getEffectiveCashier = (): User => {
    if (activeStaff) return activeStaff;
    const current = AppStore.getActiveStaff();
    if (current) return current;
    const users = AppStore.getUsers();
    const cashier = users.find((u) => u.role === 'cashier' || u.role === 'admin');
    return (
      cashier || {
        id: 1,
        employeeId: 'EMP-001',
        username: 'cashier',
        fullName: 'Sheila Mae (Cashier)',
        role: 'cashier',
        status: 'active',
      }
    );
  };

  const handleApproveTableRequest = (req: TableRequest) => {
    const cashier = getEffectiveCashier();
    const approved = AppStore.approveTableRequest(req.id, cashier);
    refreshData();

    showAlert({
      title: 'Table Request Approved',
      message: `Table #${req.requestedTableNumber} has been officially approved and assigned to ${req.customerName} by Cashier ${cashier.fullName}.`,
      type: 'success',
    });
  };

  const handleOpenDeclineModal = (req: TableRequest) => {
    setDeclineModalReq(req);
    setDeclineReasonOption('Table is currently reserved for upcoming booking');
    setCustomDeclineReason('');
  };

  const handleConfirmDecline = () => {
    if (!declineModalReq) return;
    const cashier = getEffectiveCashier();
    const finalReason =
      declineReasonOption === 'Custom reason...'
        ? customDeclineReason.trim() || 'Table unavailable at this time'
        : declineReasonOption;

    AppStore.rejectTableRequest(declineModalReq.id, cashier, finalReason);
    refreshData();
    setDeclineModalReq(null);

    showAlert({
      title: 'Table Request Declined',
      message: `Table #${declineModalReq.requestedTableNumber} request from ${declineModalReq.customerName} was declined. Reason: "${finalReason}"`,
      type: 'info',
    });
  };

  const handleOpenAddTableModal = () => {
    const highestNum = tables.length ? Math.max(...tables.map((t) => t.tableNumber)) : 0;
    setNewTableForm({
      tableNumber: highestNum + 1,
      name: `Table ${highestNum + 1}`,
      setup: '',
      capacity: 4,
      area: areaFilter !== 'all' ? areaFilter : 'normal',
      status: 'available',
    });
    setIsAddTableModalOpen(true);
  };

  const handleAddTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tableNum = Number(newTableForm.tableNumber);
    if (!tableNum || tableNum <= 0) {
      showAlert({
        title: 'Invalid Table Number',
        message: 'Please provide a valid positive table number.',
        type: 'warning',
      });
      return;
    }

    // Check if table number already exists
    if (tables.some((t) => t.tableNumber === tableNum)) {
      showAlert({
        title: 'Duplicate Table Number',
        message: `Table #${tableNum} already exists on the floor plan. Please use a different table number.`,
        type: 'warning',
      });
      return;
    }

    const created = AppStore.addTable({
      tableNumber: tableNum,
      name: newTableForm.name.trim() || `Table ${tableNum}`,
      setup: newTableForm.setup.trim() || undefined,
      description: newTableForm.setup.trim() || undefined,
      areaName: newTableForm.name.trim() || (newTableForm.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'),
      capacity: Number(newTableForm.capacity) || 4,
      area: newTableForm.area,
      status: newTableForm.status,
    });

    refreshData();
    setIsAddTableModalOpen(false);

    showAlert({
      title: 'Table Added Successfully',
      message: `Table #${created.tableNumber} (${created.capacity} seats, ${
        created.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'
      }) has been added to the floor plan.`,
      type: 'success',
    });
  };

  const handleDeleteTable = async (table: Table) => {
    if (table.status === 'occupied') {
      showAlert({
        title: 'Table Currently Occupied',
        message: `Table #${table.tableNumber} is currently occupied. Please clear the table before removing it.`,
        type: 'warning',
      });
      return;
    }

    const activeRes = getTableActiveReservation(table.id);
    if (activeRes) {
      showAlert({
        title: 'Active Reservation Exists',
        message: `Table #${table.tableNumber} has an active booking for ${activeRes.customerName}. Please cancel or complete the reservation before deleting the table.`,
        type: 'warning',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: `Delete Table #${table.tableNumber}?`,
      message: `Are you sure you want to remove Table #${table.tableNumber} (${table.capacity} seats) from the floor plan? This will also remove it from customer online reservations.`,
      type: 'danger',
      confirmText: 'Delete Table',
      cancelText: 'Keep Table',
    });

    if (confirmed) {
      AppStore.deleteTable(table.id);
      setSelectedTableForDetails(null);
      setIsEditTableModalOpen(false);
      setTableToEdit(null);
      refreshData();
      showAlert({
        title: 'Table Removed',
        message: `Table #${table.tableNumber} was removed from the floor plan.`,
        type: 'info',
      });
    }
  };

  const handleOpenEditModal = (table: Table) => {
    setTableToEdit(table);
    setEditModalForm({
      tableNumber: table.tableNumber,
      name: table.name || '',
      setup: table.setup || table.description || '',
      capacity: table.capacity,
      area: table.area,
      status: table.status,
    });
    setIsEditTableModalOpen(true);
  };

  const handleSaveEditModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableToEdit) return;

    const tableNum = Number(editModalForm.tableNumber);
    if (!tableNum || tableNum <= 0) {
      showAlert({
        title: 'Invalid Table Number',
        message: 'Please provide a valid positive table number.',
        type: 'warning',
      });
      return;
    }

    if (tableNum !== tableToEdit.tableNumber && tables.some((t) => t.tableNumber === tableNum && t.id !== tableToEdit.id)) {
      showAlert({
        title: 'Duplicate Table Number',
        message: `Table #${tableNum} already exists on the floor plan. Please choose a unique number.`,
        type: 'warning',
      });
      return;
    }

    const updated = AppStore.updateTable(tableToEdit.id, {
      tableNumber: tableNum,
      name: editModalForm.name.trim() || `Table ${tableNum}`,
      setup: editModalForm.setup.trim() || undefined,
      description: editModalForm.setup.trim() || undefined,
      areaName: editModalForm.name.trim() || (editModalForm.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'),
      capacity: Number(editModalForm.capacity) || 4,
      area: editModalForm.area,
      status: editModalForm.status,
    });

    if (updated) {
      setIsEditTableModalOpen(false);
      setTableToEdit(null);
      if (selectedTableForDetails?.id === updated.id) {
        setSelectedTableForDetails(updated);
      }
      refreshData();
      showAlert({
        title: 'Table Updated',
        message: `Table #${updated.tableNumber} configuration updated successfully.`,
        type: 'success',
      });
    }
  };

  const handleStartEditingTable = (table: Table) => {
    setEditTableForm({
      tableNumber: table.tableNumber,
      name: table.name || '',
      setup: table.setup || table.description || '',
      capacity: table.capacity,
      area: table.area,
      status: table.status,
    });
    setIsEditingTable(true);
  };

  const handleUpdateTableSubmit = (e: React.FormEvent, table: Table) => {
    e.preventDefault();
    const tableNum = Number(editTableForm.tableNumber);
    if (!tableNum || tableNum <= 0) {
      showAlert({
        title: 'Invalid Table Number',
        message: 'Please provide a valid positive table number.',
        type: 'warning',
      });
      return;
    }

    if (tableNum !== table.tableNumber && tables.some((t) => t.tableNumber === tableNum && t.id !== table.id)) {
      showAlert({
        title: 'Duplicate Table Number',
        message: `Table #${tableNum} already exists. Please choose a different number.`,
        type: 'warning',
      });
      return;
    }

    const updated = AppStore.updateTable(table.id, {
      tableNumber: tableNum,
      name: editTableForm.name.trim() || `Table ${tableNum}`,
      setup: editTableForm.setup.trim() || undefined,
      description: editTableForm.setup.trim() || undefined,
      areaName: editTableForm.name.trim() || (editTableForm.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'),
      capacity: Number(editTableForm.capacity) || 4,
      area: editTableForm.area,
      status: editTableForm.status,
    });

    if (updated) {
      setSelectedTableForDetails(updated);
      setIsEditingTable(false);
      refreshData();
      showAlert({
        title: 'Table Updated',
        message: `Table #${updated.tableNumber} details updated successfully.`,
        type: 'success',
      });
    }
  };

  const handleTableStatusChange = (tableId: number, newStatus: Table['status']) => {
    const updated = AppStore.updateTableStatus(tableId, newStatus);
    if (updated) {
      refreshData();
    }
  };

  const handleUpdateReservationStatus = async (
    reservationId: number,
    newStatus: Reservation['status']
  ) => {
    const res = reservations.find((r) => r.id === reservationId);
    if (!res) return;

    if (newStatus === 'cancelled') {
      const ok = await showConfirm({
        title: 'Cancel Reservation?',
        message: `Are you sure you want to cancel reservation ${res.reservationCode} for ${res.customerName}? This will free Table #${res.tableNumber}.`,
        type: 'warning',
        confirmText: 'Yes, Cancel Booking',
        cancelText: 'Keep Active',
      });
      if (!ok) return;
    }

    AppStore.updateReservationStatus(reservationId, newStatus);
    refreshData();

    if (newStatus === 'confirmed') {
      showAlert({
        title: 'Reservation Confirmed',
        message: `Booking #${res.reservationCode} is confirmed and Table #${res.tableNumber} is marked as reserved.`,
        type: 'success',
      });
    } else if (newStatus === 'completed') {
      if (res.tableId) {
        AppStore.updateTableStatus(res.tableId, 'occupied');
      }
      refreshData();
      showAlert({
        title: 'Guests Seated',
        message: `Guests for ${res.customerName} have been seated at Table #${res.tableNumber}. Table is now Occupied.`,
        type: 'success',
      });
    } else if (newStatus === 'cancelled') {
      showAlert({
        title: 'Reservation Cancelled',
        message: `Reservation #${res.reservationCode} was cancelled. Table #${res.tableNumber} is now available.`,
        type: 'info',
      });
    }
  };

  // Helper to find active reservation for a table
  const getTableActiveReservation = (tableId: number): Reservation | undefined => {
    return reservations.find(
      (r) =>
        r.tableId === tableId &&
        (r.status === 'confirmed' || r.status === 'pending')
    );
  };

  const handleCreateStaffReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResForm.customerName.trim() || !newResForm.contactNumber.trim()) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please provide guest name and contact number.',
        type: 'warning',
      });
      return;
    }

    const selectedTableObj = tables.find((t) => t.id === Number(newResForm.tableId));

    AppStore.createReservation({
      tableId: Number(newResForm.tableId),
      tableNumber: selectedTableObj ? selectedTableObj.tableNumber : 1,
      customerId: null,
      customerName: newResForm.customerName.trim(),
      contactNumber: newResForm.contactNumber.trim(),
      guestCount: Number(newResForm.guestCount) || 2,
      reservationAt: newResForm.reservationAt,
      notes: newResForm.notes.trim(),
    });

    // Auto mark confirmed
    const latest = AppStore.getReservations()[0];
    if (latest) {
      AppStore.updateReservationStatus(latest.id, 'confirmed');
    }

    refreshData();
    setIsNewResModalOpen(false);
    setNewResForm({
      customerName: '',
      contactNumber: '',
      guestCount: 2,
      tableId: 1,
      reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
      notes: '',
    });

    showAlert({
      title: 'Reservation Created',
      message: `Table #${selectedTableObj?.tableNumber || 1} has been booked and reserved for ${newResForm.customerName}.`,
      type: 'success',
    });
  };

  const handleQuickBookForTable = (e: React.FormEvent, table: Table) => {
    e.preventDefault();
    if (!quickBookForm.customerName.trim() || !quickBookForm.contactNumber.trim()) {
      showAlert({
        title: 'Missing Fields',
        message: 'Please provide guest name and contact number.',
        type: 'warning',
      });
      return;
    }

    AppStore.createReservation({
      tableId: table.id,
      tableNumber: table.tableNumber,
      customerId: null,
      customerName: quickBookForm.customerName.trim(),
      contactNumber: quickBookForm.contactNumber.trim(),
      guestCount: Number(quickBookForm.guestCount) || table.capacity,
      reservationAt: quickBookForm.reservationAt,
      notes: quickBookForm.notes.trim(),
    });

    const latest = AppStore.getReservations()[0];
    if (latest) {
      AppStore.updateReservationStatus(latest.id, 'confirmed');
    }

    refreshData();
    setIsQuickBooking(false);
    setQuickBookForm({
      customerName: '',
      contactNumber: '',
      guestCount: 2,
      reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
      notes: '',
    });

    showAlert({
      title: 'Table Reserved',
      message: `Table #${table.tableNumber} is now reserved for ${quickBookForm.customerName}.`,
      type: 'success',
    });
  };

  // Filtered tables based on image.png filters
  const filteredTables = tables.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (areaFilter !== 'all' && t.area !== areaFilter) return false;
    return true;
  });

  // Table Card Renderer matching image.png
  const renderTableCard = (table: Table) => {
    const activeRes = getTableActiveReservation(table.id);
    const isAvailable = table.status === 'available';
    const isOccupied = table.status === 'occupied';
    const isReserved = table.status === 'reserved';
    const isCleaning = table.status === 'cleaning';

    const isLargeTable = table.capacity >= 6;
    const isExtraLargeTable = table.capacity >= 8;

    // Chair loops:
    // Top & bottom have 2 chairs each
    // Side chairs if capacity >= 6
    const hasSideChairs = isLargeTable;

    return (
      <div
        key={table.id}
        onClick={() => {
          setSelectedTableForDetails(table);
          setIsQuickBooking(false);
          setQuickBookForm({
            customerName: '',
            contactNumber: '',
            guestCount: table.capacity,
            reservationAt: new Date(Date.now() + 2 * 3600000).toISOString().slice(0, 16),
            notes: '',
          });
        }}
        className="relative group cursor-pointer select-none transition-all duration-200 hover:-translate-y-1 w-full max-w-[155px] sm:max-w-[280px] md:max-w-[320px] min-w-0"
        style={{ width: '100%' }}
      >
        {/* Top Chairs */}
        <div className="absolute -top-1.5 sm:-top-3 left-0 right-0 flex justify-center gap-1.5 sm:gap-6 pointer-events-none z-0">
          <div className="w-5 sm:w-10 md:w-12 h-1.5 sm:h-3.5 border sm:border-2 border-stone-300 bg-white/70 rounded-t-full transition-all group-hover:border-stone-400" />
          <div className="w-5 sm:w-10 md:w-12 h-1.5 sm:h-3.5 border sm:border-2 border-stone-300 bg-white/70 rounded-t-full transition-all group-hover:border-stone-400" />
        </div>

        {/* Bottom Chairs */}
        <div className="absolute -bottom-1.5 sm:-bottom-3 left-0 right-0 flex justify-center gap-1.5 sm:gap-6 pointer-events-none z-0">
          <div className="w-5 sm:w-10 md:w-12 h-1.5 sm:h-3.5 border sm:border-2 border-stone-300 bg-white/70 rounded-b-full transition-all group-hover:border-stone-400" />
          <div className="w-5 sm:w-10 md:w-12 h-1.5 sm:h-3.5 border sm:border-2 border-stone-300 bg-white/70 rounded-b-full transition-all group-hover:border-stone-400" />
        </div>

        {/* Left Side Chairs (for 6 or 8 seaters) */}
        {hasSideChairs && (
          <div className="absolute -left-1.5 sm:-left-3 top-0 bottom-0 flex flex-col justify-center gap-1 sm:gap-4 pointer-events-none z-0">
            <div className="h-5 sm:h-10 md:h-12 w-1.5 sm:w-3.5 border sm:border-2 border-stone-300 bg-white/70 rounded-l-full transition-all group-hover:border-stone-400" />
            {isExtraLargeTable && (
              <div className="h-5 sm:h-10 md:h-12 w-1.5 sm:w-3.5 border sm:border-2 border-stone-300 bg-white/70 rounded-l-full transition-all group-hover:border-stone-400" />
            )}
          </div>
        )}

        {/* Right Side Chairs (for 6 or 8 seaters) */}
        {hasSideChairs && (
          <div className="absolute -right-1.5 sm:-right-3 top-0 bottom-0 flex flex-col justify-center gap-1 sm:gap-4 pointer-events-none z-0">
            <div className="h-5 sm:h-10 md:h-12 w-1.5 sm:w-3.5 border sm:border-2 border-stone-300 bg-white/70 rounded-r-full transition-all group-hover:border-stone-400" />
            {isExtraLargeTable && (
              <div className="h-5 sm:h-10 md:h-12 w-1.5 sm:w-3.5 border sm:border-2 border-stone-300 bg-white/70 rounded-r-full transition-all group-hover:border-stone-400" />
            )}
          </div>
        )}

        {/* Main Table Card */}
        <div
          className={`relative z-10 flex flex-col justify-between rounded-xl sm:rounded-[28px] p-2 sm:p-4 md:p-5 transition-all shadow-xs group-hover:shadow-lg ${
            isReserved
              ? 'bg-amber-100/90 border sm:border-2 border-amber-300'
              : isOccupied
              ? 'bg-stone-900 border sm:border-2 border-amber-400 text-white'
              : isCleaning
              ? 'bg-sky-50 border sm:border-2 border-sky-300'
              : 'bg-white border sm:border-2 border-stone-200/90'
          } ${
            isExtraLargeTable
              ? 'min-h-[105px] sm:min-h-[260px]'
              : isLargeTable
              ? 'min-h-[95px] sm:min-h-[230px]'
              : 'min-h-[82px] sm:min-h-[170px]'
          }`}
        >
          {/* Top Row: Table Badge, Edit/Delete Action Icons, & Timestamp if Occupied */}
          <div className="flex items-start justify-between gap-0.5 sm:gap-1">
            {/* Table Badge */}
            <div
              className={`grid h-5 w-5 sm:h-8 sm:w-8 place-items-center rounded-full text-[9px] sm:text-xs font-extrabold shrink-0 ${
                isReserved
                  ? 'bg-amber-300 text-stone-950 shadow-2xs font-bold'
                  : isOccupied
                  ? 'bg-amber-500 text-stone-950 shadow-2xs font-black'
                  : isCleaning
                  ? 'bg-sky-200 text-sky-950 font-bold'
                  : 'bg-stone-100 text-stone-700 font-bold'
              }`}
            >
              T{table.tableNumber}
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1.5 min-w-0">
              {/* Occupied Timestamp */}
              {isOccupied && (
                <span className="font-mono text-[8px] sm:text-xs font-bold text-amber-400 tracking-tight truncate">
                  12:03 PM
                </span>
              )}

              {/* Admin Quick Actions (Edit / Delete) */}
              <div className="flex items-center gap-0.5 sm:gap-1 rounded-full bg-white/90 backdrop-blur-xs p-0.5 border border-stone-200 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(table);
                  }}
                  title={`Edit Table #${table.tableNumber}`}
                  className="grid h-4 w-4 sm:h-6 sm:w-6 place-items-center rounded-full text-stone-600 hover:bg-amber-100 hover:text-amber-900 transition active:scale-90 cursor-pointer"
                >
                  <Edit3 className="h-2 w-2 sm:h-3 sm:w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTable(table);
                  }}
                  title={`Delete Table #${table.tableNumber}`}
                  className="grid h-4 w-4 sm:h-6 sm:w-6 place-items-center rounded-full text-stone-400 hover:bg-rose-100 hover:text-rose-700 transition active:scale-90 cursor-pointer"
                >
                  <Trash2 className="h-2 w-2 sm:h-3 sm:w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Center Info: Name, Setup, and status info */}
          <div className="my-auto py-0.5 sm:py-2">
            <div className="mb-0.5 sm:mb-1">
              <h4 className={`font-serif text-[11px] sm:text-base font-bold leading-tight truncate ${isOccupied ? 'text-white' : 'text-stone-900'}`}>
                {table.name || `Table ${table.tableNumber}`}
              </h4>
              {table.setup && (
                <p className={`text-[8px] sm:text-[11px] font-medium truncate ${isOccupied ? 'text-stone-300' : 'text-stone-600'}`}>
                  {table.setup}
                </p>
              )}
            </div>

            {isReserved && (
              <div className="space-y-0.5 pt-0.5 border-t border-amber-200/60">
                <span className="text-[9px] sm:text-xs font-bold text-amber-900 leading-tight truncate block">
                  {activeRes?.customerName || 'Reserved Guest'}
                </span>
                <p className="text-[8px] sm:text-xs text-stone-700 font-medium">
                  {activeRes?.guestCount || table.capacity} Guests
                  {activeRes?.reservationAt
                    ? ` • ${new Date(activeRes.reservationAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : ''}
                </p>
              </div>
            )}

            {isOccupied && (
              <div className="space-y-0.5 pt-0.5 border-t border-stone-800">
                <span className="text-[9px] sm:text-xs font-bold text-amber-400 leading-tight truncate block">
                  Occupied
                </span>
                <p className="text-[8px] sm:text-xs text-stone-400 font-medium">
                  {table.capacity} Guests
                </p>
              </div>
            )}

            {isCleaning && (
              <div className="space-y-0.5 pt-0.5 border-t border-sky-200">
                <h4 className="font-serif text-[9px] sm:text-sm font-bold text-sky-900 leading-tight">
                  Being Sanitized
                </h4>
                <p className="text-[8px] sm:text-xs text-sky-700">Ready soon</p>
              </div>
            )}

            {!isReserved && !isOccupied && !isCleaning && (
              <div className="space-y-0.5">
                <p className="text-[8px] sm:text-xs text-stone-500 font-medium truncate">
                  <span className="sm:hidden">{table.capacity} Seats</span>
                  <span className="hidden sm:inline">{table.capacity} Seats Available</span>
                </p>
              </div>
            )}
          </div>

          {/* Bottom Row: Area Tag & Status Tag */}
          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5 flex-wrap pt-0.5 sm:pt-2">
            {/* Area Tag */}
            <span
              className={`rounded px-1 sm:px-2 py-0.2 sm:py-0.5 text-[7px] sm:text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${
                isOccupied
                  ? 'bg-stone-800 border border-stone-700 text-stone-300'
                  : isReserved
                  ? 'bg-white/90 border border-stone-300 text-stone-700'
                  : 'bg-stone-50 border border-stone-200 text-stone-600'
              }`}
            >
              {table.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'}
            </span>

            {/* Status Tag */}
            <span
              className={`rounded px-1 sm:px-2 py-0.2 sm:py-0.5 text-[7px] sm:text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider ${
                isReserved
                  ? 'bg-stone-950 text-amber-300'
                  : isOccupied
                  ? 'bg-stone-800 border border-amber-400/40 text-amber-300'
                  : isCleaning
                  ? 'bg-sky-200 text-sky-950 border border-sky-300'
                  : 'bg-stone-50 border border-stone-200 text-stone-600'
              }`}
            >
              {table.status}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const handleResetToOfficial = async () => {
    const confirmed = await showConfirm({
      title: 'Reset to Official Tables?',
      message:
        'This will reset the layout to the 10 official Yellow Hauz tables (Table 1: 1st aircon to Table 10: window). Active reservations will be preserved.',
      type: 'warning',
      confirmText: 'Reset Tables',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      AppStore.resetToOfficialTables();
      refreshData();
      showAlert({
        title: 'Official Tables Restored',
        message: 'Loaded 10 official Yellow Hauz tables and areas.',
        type: 'success',
      });
    }
  };

  return (
    <div className="space-y-2 sm:space-y-6 pb-16 sm:pb-20">
      {/* Top Header Bar matching image.png */}
      <div className="flex flex-row items-center justify-between gap-1.5 sm:gap-4 border-b border-stone-200 pb-2.5 sm:pb-5">
        <div className="flex items-center gap-1.5 sm:gap-4 min-w-0 flex-1">
          {/* Left Title: TABLES */}
          <h1 className="font-serif text-lg sm:text-3xl font-black tracking-wider text-stone-950 uppercase shrink-0">
            TABLES
          </h1>

          {/* Filter Modal Trigger Button */}
          <button
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold transition-all duration-150 cursor-pointer shadow-2xs shrink-0 ${
              isAnyFilterActive
                ? 'bg-amber-500 text-stone-950 font-black hover:bg-amber-400'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
            title="Filter tables by status and area"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filters</span>
            {isAnyFilterActive ? (
              <span className="rounded-full bg-stone-950 px-1.5 py-0.2 text-[10px] font-black text-amber-400">
                {(statusFilter !== 'all' ? 1 : 0) + (areaFilter !== 'all' ? 1 : 0)}
              </span>
            ) : null}
          </button>

          {/* Grid Layout Filter Button */}
          <div className="relative" ref={gridModalRef}>
            <button
              type="button"
              id="tables-grid-layout-filter-btn"
              onClick={() => setIsGridModalOpen((prev) => !prev)}
              title="Change Floor Plan Grid Columns (1 or 2)"
              className={`relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border transition active:scale-95 cursor-pointer shadow-2xs font-bold text-xs ${
                isGridModalOpen
                  ? 'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-400/30'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-950'
              }`}
            >
              {gridColumns === 1 ? (
                <Square className="h-3.5 w-3.5 text-amber-600 stroke-[2.2]" />
              ) : (
                <Grid2X2 className="h-3.5 w-3.5 text-amber-600 stroke-[2.2]" />
              )}
              <span className="font-extrabold text-[11px] hidden sm:inline">
                {gridColumns} Col
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {/* Grid Layout Filter Modal on Mobile / Popover on Desktop */}
            {isGridModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:justify-end p-4 sm:p-0 bg-stone-950/50 backdrop-blur-xs sm:bg-transparent sm:backdrop-blur-none sm:absolute sm:inset-auto sm:left-0 sm:sm:left-auto sm:right-0 sm:top-10"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setIsGridModalOpen(false);
                  }
                }}
              >
                <div
                  id="tables-grid-layout-filter-modal"
                  className="w-full max-w-xs sm:w-64 rounded-3xl sm:rounded-2xl border border-stone-200 bg-white p-4 sm:p-3.5 shadow-2xl sm:shadow-xl animate-in fade-in-0 slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 font-sans"
                >
                  <div className="flex items-center justify-between pb-3 sm:pb-2.5 border-b border-stone-100 mb-3.5 sm:mb-3">
                    <div className="flex items-center gap-2 sm:gap-1.5 font-black text-sm sm:text-xs text-stone-900">
                      <LayoutGrid className="h-4 w-4 text-amber-600" />
                      <span>Floor Plan Layout</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsGridModalOpen(false)}
                      className="p-1.5 sm:p-1 rounded-xl sm:rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
                    >
                      <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    </button>
                  </div>

                  <div className="text-xs sm:text-[11px] text-stone-500 mb-3.5 sm:mb-3 font-medium">
                    Choose your preferred table layout:
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* 1 Column Option */}
                    <button
                      type="button"
                      id="tables-grid-col-1-btn"
                      onClick={() => handleSetGridColumns(1)}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border text-center transition cursor-pointer ${
                        gridColumns === 1
                          ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                      }`}
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-white border border-stone-200 shadow-2xs text-amber-700">
                        <Square className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">1 Column</div>
                        <div className="text-[10px] text-stone-500 font-normal">Full-width view</div>
                      </div>
                      {gridColumns === 1 && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-700">
                          <Check className="h-3 w-3 stroke-[3]" /> Active
                        </span>
                      )}
                    </button>

                    {/* 2 Column Option */}
                    <button
                      type="button"
                      id="tables-grid-col-2-btn"
                      onClick={() => handleSetGridColumns(2)}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border text-center transition cursor-pointer ${
                        gridColumns === 2
                          ? 'bg-amber-500/10 border-amber-500 text-stone-950 font-black shadow-xs ring-2 ring-amber-500/20'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-semibold'
                      }`}
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-white border border-stone-200 shadow-2xs text-amber-700">
                        <Grid2X2 className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">2 Columns</div>
                        <div className="text-[10px] text-stone-500 font-normal">Standard grid</div>
                      </div>
                      {gridColumns === 2 && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-700">
                          <Check className="h-3 w-3 stroke-[3]" /> Active
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Reset Tables, Add Table & New Booking */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetToOfficial}
            title="Reset to 10 Official Yellow Hauz Tables"
            className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-xl border border-stone-300 bg-white px-2 sm:px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition active:scale-95 shadow-2xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-stone-500 shrink-0" />
            <span className="hidden sm:inline">Official Tables</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddTableModal}
            title="Add Table"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-2.5 sm:px-3.5 py-2 text-xs font-black text-stone-950 hover:bg-amber-400 transition active:scale-95 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3] shrink-0" />
            <span className="hidden sm:inline">Add Table</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewResModalOpen(true)}
            title="Book New Reservation"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-950 px-2.5 sm:px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-stone-800 transition active:scale-95 shadow-xs cursor-pointer"
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">New Booking</span>
          </button>
        </div>
      </div>

      {/* LIVE CASHIER VERIFICATION: PENDING CUSTOMER TABLE REQUESTS */}
      {pendingRequests.length > 0 ? (
        <div className="rounded-2xl sm:rounded-3xl border sm:border-2 border-amber-400 bg-gradient-to-br from-amber-500/10 via-amber-50/70 to-white p-3 sm:p-6 shadow-md space-y-2.5 sm:space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2 sm:gap-3 border-b border-amber-200/80 pb-2 sm:pb-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="relative grid h-7 w-7 sm:h-10 sm:w-10 place-items-center rounded-xl sm:rounded-2xl bg-amber-500 text-stone-950 font-black shadow-xs shrink-0">
                <Bell className="h-3.5 w-3.5 sm:h-5 sm:w-5 animate-bounce" />
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-rose-600 text-[8px] sm:text-[10px] font-black text-white">
                  {pendingRequests.length}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-xs sm:text-lg font-black text-stone-950 font-display truncate">
                    <span className="sm:hidden">Requests</span>
                    <span className="hidden sm:inline">Pending Customer Table Requests</span> ({pendingRequests.length})
                  </h2>
                  <span className="hidden sm:inline-block rounded-full bg-amber-200/90 px-2 py-0.5 text-[10px] font-black text-amber-950 animate-pulse shrink-0">
                    Cashier Action Required
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-stone-600">
                  Customers are selecting or changing tables. Click Approve to assign their table in real-time.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              title="Table Logs"
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-amber-300 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-800 hover:bg-amber-100 transition cursor-pointer shadow-2xs shrink-0"
            >
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-700 shrink-0" />
              <span className="hidden sm:inline">{isHistoryOpen ? 'Hide Logs' : 'Table Logs'}</span>
              <span className="sm:hidden">{isHistoryOpen ? 'Hide' : 'Logs'}</span>
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-black text-amber-900">
                {resolvedRequests.length}
              </span>
            </button>
          </div>

          {/* Pending Request Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {pendingRequests.map((req) => {
              const targetTable = tables.find((t) => t.tableNumber === req.requestedTableNumber);
              const isTargetAvailable = targetTable?.status === 'available';

              return (
                <div
                  key={req.id}
                  className="relative flex flex-col justify-between rounded-xl sm:rounded-2xl border sm:border-2 border-amber-300/90 bg-white p-3 sm:p-4.5 shadow-sm space-y-2.5 sm:space-y-3"
                >
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black tracking-wide uppercase ${
                          req.type === 'change_table'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {req.type === 'change_table' ? 'Table Change' : 'New Seating'}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono font-bold text-stone-400">
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="grid h-9 w-9 sm:h-12 sm:w-12 place-items-center rounded-xl sm:rounded-2xl bg-amber-500 text-stone-950 font-black font-mono text-base sm:text-xl shadow-xs shrink-0">
                        #{req.requestedTableNumber}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 sm:gap-1.5 font-bold text-stone-950 text-xs sm:text-sm truncate">
                          <UserIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{req.customerName}</span>
                        </div>
                        {req.customerPhone && (
                          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-stone-500 truncate">
                            <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                            <span className="truncate">{req.customerPhone}</span>
                          </div>
                        )}
                        <p className="text-[10px] sm:text-[11px] text-stone-600 font-medium truncate">
                          {req.area === 'airconditioned' ? 'Air-Con' : 'Non-A/C'} •{' '}
                          {req.capacity || 4} Seats
                        </p>
                      </div>
                    </div>

                    {req.currentTableNumber && (
                      <div className="flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-purple-50 border border-purple-200 p-1.5 sm:p-2 text-[10px] sm:text-xs font-bold text-purple-900">
                        <span>Current: #{req.currentTableNumber}</span>
                        <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span>Target: #{req.requestedTableNumber}</span>
                      </div>
                    )}

                    {req.notes && (
                      <p className="rounded-lg sm:rounded-xl bg-stone-50 border border-stone-200/80 p-1.5 sm:p-2 text-[10px] sm:text-[11px] text-stone-700 italic line-clamp-2">
                        "{req.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1 border-t border-stone-100">
                      <span className="text-stone-500">Status:</span>
                      <span
                        className={`font-black ${
                          isTargetAvailable ? 'text-emerald-600' : 'text-amber-700'
                        }`}
                      >
                        {targetTable ? targetTable.status.toUpperCase() : 'UNKNOWN'}
                      </span>
                    </div>
                  </div>

                  {/* Cashier Action Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => handleApproveTableRequest(req)}
                      className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-emerald-600 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black text-white hover:bg-emerald-500 transition shadow-xs cursor-pointer active:scale-95"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                      <span>
                        <span className="sm:hidden">Approve</span>
                        <span className="hidden sm:inline">Approve Table</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDeclineModal(req)}
                      className="flex items-center justify-center gap-1 rounded-lg sm:rounded-xl border border-rose-200 bg-rose-50 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer active:scale-95"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 sm:gap-3 rounded-xl sm:rounded-2xl bg-stone-100/90 border border-stone-200 px-3 sm:px-4 py-1.5 sm:py-2.5 text-[10px] sm:text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-stone-800 text-[10px] sm:text-xs truncate">
              <span className="sm:hidden">Table Status</span>
              <span className="hidden sm:inline">Table Confirmation</span>
            </span>
            <span className="text-stone-500 hidden sm:inline truncate">
              • Cashier on duty: {getEffectiveCashier().fullName}
            </span>
          </div>
          {resolvedRequests.length > 0 && (
            <button
              type="button"
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              title="Table Logs"
              className="inline-flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-stone-200 bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
            >
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-stone-500 shrink-0" />
              <span className="hidden sm:inline">{isHistoryOpen ? 'Hide Logs' : 'Table Logs'}</span>
              <span className="sm:hidden">Logs</span>
              <span className="rounded-full bg-stone-100 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-black text-stone-700">
                {resolvedRequests.length}
              </span>
            </button>
          )}
        </div>
      )}

      {/* REQUEST LOGS / HISTORY ACCORDION */}
      {isHistoryOpen && resolvedRequests.length > 0 && (
        <div className="rounded-3xl border border-stone-200 bg-white p-5 space-y-3 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Recent Table Assignment &amp; Approval History</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(false)}
              className="text-xs font-bold text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-100 bg-stone-50 text-[11px] font-bold text-stone-500">
                <tr>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Guest</th>
                  <th className="p-2.5">Table</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Signed By Cashier</th>
                  <th className="p-2.5">Remarks / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {resolvedRequests.slice(0, 10).map((req) => (
                  <tr key={req.id} className="hover:bg-stone-50/80">
                    <td className="p-2.5 text-stone-500 font-mono text-[11px]">
                      {new Date(req.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-2.5 font-bold text-stone-900">{req.customerName}</td>
                    <td className="p-2.5 font-black text-amber-950">
                      #{req.requestedTableNumber}{' '}
                      {req.currentTableNumber && (
                        <span className="text-[10px] text-stone-400 font-normal">
                          (from #{req.currentTableNumber})
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 capitalize text-stone-600">
                      {req.type.replace('_', ' ')}
                    </td>
                    <td className="p-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-2.5 font-medium text-stone-700">
                      {req.cashierName || 'Staff'}
                    </td>
                    <td className="p-2.5 text-stone-500 text-[11px]">
                      {req.rejectionReason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floor Plan Canvas */}
      <div className="rounded-xl sm:rounded-3xl border border-stone-200/80 bg-[#f7f7f7] p-1.5 sm:p-6 md:p-10 shadow-inner min-h-[340px] sm:min-h-[520px]">
        {filteredTables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white/80 p-6 sm:p-12 text-center text-xs text-stone-500 space-y-3">
            <p>No tables match the selected status or area filter.</p>
            <button
              type="button"
              onClick={handleOpenAddTableModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
              Add New Table to Floor Plan
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-x-1.5 sm:gap-x-6 md:gap-x-8 gap-y-2 sm:gap-y-8 md:gap-y-12 justify-items-center items-center ${
              gridColumns === 1
                ? 'grid-cols-1 max-w-md mx-auto'
                : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {filteredTables.map((table) => renderTableCard(table))}
          </div>
        )}
      </div>

      {/* Interactive Table & Reservation Details Modal */}
      {selectedTableForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl bg-white p-3.5 sm:p-6 shadow-2xl space-y-3 sm:space-y-5 animate-in zoom-in-95 duration-200 border border-stone-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-2.5 sm:pb-4">
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h3 className="font-display text-base sm:text-xl font-extrabold text-stone-900">
                    Table #{selectedTableForDetails.tableNumber}{selectedTableForDetails.name ? ` • ${selectedTableForDetails.name}` : ''}
                  </h3>
                  <span className="rounded-full bg-stone-100 px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-stone-600 uppercase">
                    {selectedTableForDetails.area === 'airconditioned'
                      ? '❄️ Air-Con'
                      : '🌿 Non-A/C'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 font-medium flex items-center gap-2">
                  <span>{selectedTableForDetails.capacity} Seats</span>
                  {selectedTableForDetails.setup && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-stone-700">{selectedTableForDetails.setup}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTableForDetails(null);
                    setIsEditingTable(false);
                  }}
                  className="rounded-full p-1 sm:p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>

            {/* Inline Table Configuration Edit Form */}
            {isEditingTable ? (
              <form
                onSubmit={(e) => handleUpdateTableSubmit(e, selectedTableForDetails)}
                className="rounded-2xl bg-stone-50 border border-stone-200 p-4 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <span className="font-bold text-stone-900 uppercase tracking-wider">
                    Edit Table Settings
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTable(false)}
                    className="text-stone-500 hover:text-stone-800 underline"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Table Number</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={editTableForm.tableNumber}
                      onChange={(e) =>
                        setEditTableForm({ ...editTableForm, tableNumber: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Seats Capacity</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={editTableForm.capacity}
                      onChange={(e) =>
                        setEditTableForm({ ...editTableForm, capacity: Number(e.target.value) })
                      }
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Table Name</label>
                    <input
                      type="text"
                      placeholder="e.g. 1st aircon, Center, Kolin"
                      value={editTableForm.name}
                      onChange={(e) =>
                        setEditTableForm({ ...editTableForm, name: e.target.value })
                      }
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Setup / Furniture</label>
                    <input
                      type="text"
                      placeholder="e.g. 3 tables, 10 high chairs"
                      value={editTableForm.setup}
                      onChange={(e) =>
                        setEditTableForm({ ...editTableForm, setup: e.target.value })
                      }
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-stone-700 block mb-1">Dining Area</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditTableForm({ ...editTableForm, area: 'normal' })}
                      className={`p-2 rounded-xl border text-center font-bold transition ${
                        editTableForm.area === 'normal'
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      🌿 Non-A/C
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditTableForm({ ...editTableForm, area: 'airconditioned' })
                      }
                      className={`p-2 rounded-xl border text-center font-bold transition ${
                        editTableForm.area === 'airconditioned'
                          ? 'border-sky-500 bg-sky-50 text-sky-900'
                          : 'border-stone-200 bg-white text-stone-600'
                      }`}
                    >
                      ❄️ Air-Con
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingTable(false)}
                    className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-white font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : null}

            {/* Quick Status Pill Selector */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Change Table Status:
              </span>
              <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-stone-100 p-1">
                {(['available', 'occupied', 'reserved', 'cleaning'] as Table['status'][]).map(
                  (st) => {
                    const isCurrent = selectedTableForDetails.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          handleTableStatusChange(selectedTableForDetails.id, st)
                        }
                        className={`rounded-xl py-1.5 text-xs font-bold capitalize transition ${
                          isCurrent
                            ? st === 'available'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'occupied'
                              ? 'bg-stone-900 text-amber-400 shadow-xs'
                              : st === 'reserved'
                              ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
                              : 'bg-sky-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* RESERVATION & CONTACT INFO DETAILS SECTION */}
            {(() => {
              const activeRes = getTableActiveReservation(selectedTableForDetails.id);

              if (activeRes) {
                return (
                  <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/50 p-4 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500 text-stone-950 font-bold">
                          <Globe className="h-4 w-4" />
                        </span>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
                            Active Reservation
                          </span>
                          <span className="font-mono text-xs font-bold text-amber-800">
                            {activeRes.reservationCode}
                          </span>
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-900">
                        {activeRes.status}
                      </span>
                    </div>

                    {/* Customer & Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-stone-500 block text-[11px]">Guest Name:</span>
                        <span className="font-bold text-stone-900 text-sm">
                          {activeRes.customerName}
                        </span>
                      </div>

                      <div>
                        <span className="text-stone-500 block text-[11px]">Contact Info:</span>
                        <a
                          href={`tel:${activeRes.contactNumber}`}
                          className="font-bold text-indigo-700 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {activeRes.contactNumber}
                        </a>
                      </div>

                      <div>
                        <span className="text-stone-500 block text-[11px]">Reserved Schedule:</span>
                        <span className="font-bold text-stone-800 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3.5 w-3.5 text-stone-400" />
                          {new Date(activeRes.reservationAt).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div>
                        <span className="text-stone-500 block text-[11px]">Party Size:</span>
                        <span className="font-bold text-stone-800 flex items-center gap-1 mt-0.5">
                          <Users className="h-3.5 w-3.5 text-stone-400" />
                          {activeRes.guestCount} Guests
                        </span>
                      </div>

                      {activeRes.notes && (
                        <div className="sm:col-span-2 rounded-xl bg-white p-2.5 border border-amber-200/80 text-[11px]">
                          <span className="font-bold text-stone-700 block">
                            Special Instructions:
                          </span>
                          <span className="italic text-stone-600">"{activeRes.notes}"</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-amber-200/70">
                      {activeRes.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateReservationStatus(activeRes.id, 'completed')
                          }
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-stone-950 py-2 text-xs font-bold text-amber-400 hover:bg-stone-800 transition shadow-xs"
                        >
                          <UserCheck className="h-4 w-4" />
                          Seat Guests Now
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateReservationStatus(activeRes.id, 'cancelled')
                        }
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  </div>
                );
              }

              if (selectedTableForDetails.status === 'occupied') {
                const activeOrder = selectedTableForDetails.currentOrderId
                  ? orders.find((o) => o.id === selectedTableForDetails.currentOrderId)
                  : null;

                return (
                  <div className="rounded-2xl border border-stone-200 bg-stone-900 text-white p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Coffee className="h-4 w-4 text-amber-400" />
                        <span className="font-bold text-sm text-white">
                          Table is Currently Occupied
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        12:03 PM
                      </span>
                    </div>

                    {activeOrder ? (
                      <div className="text-xs space-y-1.5 bg-stone-800/80 p-3 rounded-xl border border-stone-700">
                        <div className="flex justify-between font-bold">
                          <span>Order #{activeOrder.orderNumber.slice(-3)}</span>
                          <span className="text-amber-400 font-mono">
                            ₱{activeOrder.totalAmount.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-stone-300">Guest: {activeOrder.customerName}</p>
                        <p className="text-[11px] text-stone-400">
                          Items: {activeOrder.items.map((i) => i.name).join(', ')}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400">
                        Dine-in guests are currently seated at this table.
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleTableStatusChange(selectedTableForDetails.id, 'available')
                        }
                        className="flex-1 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs"
                      >
                        Free Table (Mark Available)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleTableStatusChange(selectedTableForDetails.id, 'cleaning')
                        }
                        className="rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs font-bold text-stone-300 hover:bg-stone-700 transition"
                      >
                        Set Cleaning
                      </button>
                    </div>
                  </div>
                );
              }

              // Table is available or cleaning with no active reservation
              return (
                <div className="space-y-3">
                  {!isQuickBooking ? (
                    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 p-5 text-center space-y-3">
                      <p className="text-xs text-stone-600">
                        No active reservation on Table #{selectedTableForDetails.tableNumber}.
                      </p>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsQuickBooking(true)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-950 px-4 py-2 text-xs font-bold text-amber-400 hover:bg-stone-800 transition shadow-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Book Reservation for this Table
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleTableStatusChange(
                              selectedTableForDetails.id,
                              'occupied'
                            )
                          }
                          className="w-full sm:w-auto rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 hover:bg-stone-50 transition"
                        >
                          Seat Walk-in (Occupy)
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Quick Booking Form */
                    <form
                      onSubmit={(e) =>
                        handleQuickBookForTable(e, selectedTableForDetails)
                      }
                      className="rounded-2xl border border-amber-300 bg-amber-50/40 p-4 space-y-3 text-xs animate-in fade-in"
                    >
                      <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                        <span className="font-bold text-stone-900">
                          Book Table #{selectedTableForDetails.tableNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsQuickBooking(false)}
                          className="text-stone-400 hover:text-stone-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700">Guest Name *</label>
                        <input
                          type="text"
                          required
                          value={quickBookForm.customerName}
                          onChange={(e) =>
                            setQuickBookForm({
                              ...quickBookForm,
                              customerName: e.target.value,
                            })
                          }
                          placeholder="e.g. Maria Santos"
                          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-bold text-stone-700">Contact Number *</label>
                          <input
                            type="text"
                            required
                            value={quickBookForm.contactNumber}
                            onChange={(e) =>
                              setQuickBookForm({
                                ...quickBookForm,
                                contactNumber: e.target.value,
                              })
                            }
                            placeholder="+63 9XX XXX XXXX"
                            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-stone-700">Party Size *</label>
                          <input
                            type="number"
                            min={1}
                            max={selectedTableForDetails.capacity}
                            required
                            value={quickBookForm.guestCount}
                            onChange={(e) =>
                              setQuickBookForm({
                                ...quickBookForm,
                                guestCount: parseInt(e.target.value) || 1,
                              })
                            }
                            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-stone-700">Reservation Date &amp; Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={quickBookForm.reservationAt}
                          onChange={(e) =>
                            setQuickBookForm({
                              ...quickBookForm,
                              reservationAt: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-stone-700">Notes / Requests</label>
                        <input
                          type="text"
                          value={quickBookForm.notes}
                          onChange={(e) =>
                            setQuickBookForm({
                              ...quickBookForm,
                              notes: e.target.value,
                            })
                          }
                          placeholder="e.g. Birthday dinner, high chair..."
                          className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsQuickBooking(false)}
                          className="rounded-xl border border-stone-200 px-3 py-1.5 font-bold text-stone-600 hover:bg-stone-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="rounded-xl bg-amber-500 px-4 py-1.5 font-bold text-stone-950 hover:bg-amber-400 shadow-xs"
                        >
                          Confirm Booking
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })()}

            {/* Admin Table Configuration Quick Actions in Details Modal */}
            <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => handleOpenEditModal(selectedTableForDetails)}
                className="inline-flex items-center rounded-xl border border-stone-300 bg-stone-50 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-stone-700 hover:bg-stone-100 hover:text-stone-950 transition active:scale-95 cursor-pointer"
              >
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteTable(selectedTableForDetails)}
                className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50/80 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95 cursor-pointer"
              >
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book New Reservation Modal (from + button) */}
      {isNewResModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-display text-lg font-extrabold text-stone-900">
                  Book Table Reservation
                </h3>
                <p className="text-xs text-stone-500">Log advance booking with contact info</p>
              </div>
              <button
                onClick={() => setIsNewResModalOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaffReservation} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-stone-700">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  value={newResForm.customerName}
                  onChange={(e) =>
                    setNewResForm({ ...newResForm, customerName: e.target.value })
                  }
                  placeholder="e.g. Maria Santos"
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700">Contact Number *</label>
                  <input
                    type="text"
                    required
                    value={newResForm.contactNumber}
                    onChange={(e) =>
                      setNewResForm({ ...newResForm, contactNumber: e.target.value })
                    }
                    placeholder="+63 9XX XXX XXXX"
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700">Guest Count *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={newResForm.guestCount}
                    onChange={(e) =>
                      setNewResForm({
                        ...newResForm,
                        guestCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-700">Select Table *</label>
                  <select
                    value={newResForm.tableId}
                    onChange={(e) =>
                      setNewResForm({
                        ...newResForm,
                        tableId: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none font-medium"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table #{t.tableNumber} ({t.capacity} seats •{' '}
                        {t.area === 'airconditioned' ? 'AC Room' : 'Normal'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-stone-700">Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newResForm.reservationAt}
                    onChange={(e) =>
                      setNewResForm({ ...newResForm, reservationAt: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700">Special Notes / Requests</label>
                <textarea
                  rows={2}
                  value={newResForm.notes}
                  onChange={(e) => setNewResForm({ ...newResForm, notes: e.target.value })}
                  placeholder="e.g. High chair needed, anniversary dinner..."
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewResModalOpen(false)}
                  className="rounded-xl border border-stone-200 px-4 py-2 font-bold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-4 py-2 font-extrabold text-stone-950 hover:bg-amber-400 transition shadow-xs"
                >
                  Confirm &amp; Reserve Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Table Modal */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-white p-3.5 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 border border-stone-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 sm:pb-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="grid h-7 w-7 sm:h-10 sm:w-10 place-items-center rounded-lg sm:rounded-xl bg-amber-500 text-stone-950 font-black shrink-0">
                  <Plus className="h-3.5 w-3.5 sm:h-5 sm:w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-lg font-extrabold text-stone-900">
                    Add New Table
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTableModalOpen(false)}
                className="rounded-full p-1 sm:p-1.5 text-stone-400 hover:bg-stone-100 transition"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <form onSubmit={handleAddTableSubmit} className="space-y-2.5 sm:space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                  Table Number *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 sm:left-3 top-1.5 sm:top-2 font-bold text-stone-400 text-xs sm:text-sm">
                    Table #
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    required
                    value={newTableForm.tableNumber}
                    onChange={(e) =>
                      setNewTableForm({
                        ...newTableForm,
                        tableNumber: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white py-1.5 sm:py-2 pl-14 sm:pl-16 pr-3 text-xs sm:text-sm font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                    Table Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1st aircon, Kolin, Center"
                    value={newTableForm.name}
                    onChange={(e) =>
                      setNewTableForm({ ...newTableForm, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white py-1.5 sm:py-2 px-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                    Setup / Furniture
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 tables, 10 high chairs"
                    value={newTableForm.setup}
                    onChange={(e) =>
                      setNewTableForm({ ...newTableForm, setup: e.target.value })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white py-1.5 sm:py-2 px-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                  Seating Capacity *
                </label>
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
                  {[2, 4, 6, 8].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setNewTableForm({ ...newTableForm, capacity: cap })}
                      className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border transition ${
                        newTableForm.capacity === cap
                          ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cap} Guests
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-[11px] text-stone-500">Custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newTableForm.capacity}
                    onChange={(e) =>
                      setNewTableForm({
                        ...newTableForm,
                        capacity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-16 sm:w-20 rounded-lg sm:rounded-xl border border-stone-300 bg-white px-2 py-1 text-[11px] sm:text-xs font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] sm:text-[11px] text-stone-500">seats</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                  Dining Area *
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTableForm({ ...newTableForm, area: 'normal' })}
                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border text-left transition flex items-center gap-2 ${
                      newTableForm.area === 'normal'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-base sm:text-lg">🌿</span>
                    <span className="font-bold text-stone-900 block text-[11px] sm:text-xs">
                      Non-A/C
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNewTableForm({ ...newTableForm, area: 'airconditioned' })
                    }
                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border text-left transition flex items-center gap-2 ${
                      newTableForm.area === 'airconditioned'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-base sm:text-lg">❄️</span>
                    <span className="font-bold text-stone-900 block text-[11px] sm:text-xs">
                      Air-Con
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                  Initial Status
                </label>
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl bg-stone-100 p-1">
                  {(['available', 'occupied', 'reserved', 'cleaning'] as Table['status'][]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setNewTableForm({ ...newTableForm, status: st })}
                        className={`rounded-lg sm:rounded-xl py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold capitalize transition ${
                          newTableForm.status === st
                            ? st === 'available'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'occupied'
                              ? 'bg-stone-900 text-amber-400 shadow-xs'
                              : st === 'reserved'
                              ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
                              : 'bg-sky-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-3 sm:mt-4 flex items-center justify-end gap-1.5 sm:gap-2 pt-2.5 sm:pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="rounded-xl border border-stone-200 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-extrabold text-stone-950 hover:bg-amber-400 transition shadow-xs cursor-pointer"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {isEditTableModalOpen && tableToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl sm:rounded-3xl bg-white p-3.5 sm:p-6 shadow-2xl space-y-3 sm:space-y-4 border border-stone-200 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 sm:pb-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="grid h-7 w-7 sm:h-10 sm:w-10 place-items-center rounded-lg sm:rounded-xl bg-amber-500 text-stone-950 font-black shrink-0">
                  <Edit3 className="h-3.5 w-3.5 sm:h-5 sm:w-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-lg font-extrabold text-stone-900">
                    Edit Table #{tableToEdit.tableNumber}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditTableModalOpen(false);
                  setTableToEdit(null);
                }}
                className="rounded-full p-1 sm:p-1.5 text-stone-400 hover:bg-stone-100 transition"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Visual Mini Preview of the Table */}
            <div className="rounded-xl sm:rounded-2xl border border-stone-200/80 bg-stone-50 p-2 sm:p-3 flex flex-col items-center justify-center">
              <div className="relative py-1 sm:py-2 px-4 sm:px-6">
                {/* Top chairs */}
                <div className="flex justify-center gap-3 sm:gap-4 mb-1">
                  <div className="w-6 sm:w-8 h-2 sm:h-2.5 border sm:border-2 border-stone-300 bg-white rounded-t-full" />
                  <div className="w-6 sm:w-8 h-2 sm:h-2.5 border sm:border-2 border-stone-300 bg-white rounded-t-full" />
                </div>
                {/* Table shape */}
                <div
                  className={`px-4 sm:px-6 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl border sm:border-2 flex items-center justify-center gap-1.5 sm:gap-2 shadow-xs transition-all ${
                    editModalForm.status === 'reserved'
                      ? 'bg-amber-100/90 border-amber-300 text-stone-950'
                      : editModalForm.status === 'occupied'
                      ? 'bg-stone-900 border-amber-400 text-white'
                      : editModalForm.status === 'cleaning'
                      ? 'bg-sky-100 border-sky-300 text-sky-950'
                      : 'bg-white border-stone-200 text-stone-900'
                  }`}
                >
                  <span className="font-black text-xs sm:text-sm">Table #{editModalForm.tableNumber}</span>
                  <span className="text-[10px] sm:text-[11px] opacity-70">({editModalForm.capacity} seats)</span>
                </div>
                {/* Bottom chairs */}
                <div className="flex justify-center gap-3 sm:gap-4 mt-1">
                  <div className="w-6 sm:w-8 h-2 sm:h-2.5 border sm:border-2 border-stone-300 bg-white rounded-b-full" />
                  <div className="w-6 sm:w-8 h-2 sm:h-2.5 border sm:border-2 border-stone-300 bg-white rounded-b-full" />
                </div>
                {/* Side chairs if 6+ */}
                {editModalForm.capacity >= 6 && (
                  <>
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 h-6 sm:h-8 w-1.5 sm:w-2 border sm:border-2 border-stone-300 bg-white rounded-l-full" />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 h-6 sm:h-8 w-1.5 sm:w-2 border sm:border-2 border-stone-300 bg-white rounded-r-full" />
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveEditModalSubmit} className="space-y-2.5 sm:space-y-4 text-xs">
              {/* Table Number */}
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                  Table Number *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 sm:left-3 top-1.5 sm:top-2 font-bold text-stone-400 text-xs sm:text-sm">
                    Table #
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    required
                    value={editModalForm.tableNumber}
                    onChange={(e) =>
                      setEditModalForm({
                        ...editModalForm,
                        tableNumber: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white py-1.5 sm:py-2 pl-14 sm:pl-16 pr-3 text-xs sm:text-sm font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Table Name & Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                    Table Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1st aircon, Kolin, Center"
                    value={editModalForm.name}
                    onChange={(e) =>
                      setEditModalForm({ ...editModalForm, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white py-1.5 sm:py-2 px-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                    Setup / Furniture
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 tables, 10 high chairs"
                    value={editModalForm.setup}
                    onChange={(e) =>
                      setEditModalForm({ ...editModalForm, setup: e.target.value })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white py-1.5 sm:py-2 px-3 text-xs sm:text-sm font-medium text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Seating Capacity */}
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                  Seating Capacity *
                </label>
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
                  {[2, 4, 6, 8].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setEditModalForm({ ...editModalForm, capacity: cap })}
                      className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold border transition ${
                        editModalForm.capacity === cap
                          ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cap} Guests
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] sm:text-[11px] text-stone-500">Custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={editModalForm.capacity}
                    onChange={(e) =>
                      setEditModalForm({
                        ...editModalForm,
                        capacity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-16 sm:w-20 rounded-lg sm:rounded-xl border border-stone-300 bg-white px-2 py-1 text-[11px] sm:text-xs font-bold text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] sm:text-[11px] text-stone-500">seats</span>
                </div>
              </div>

              {/* Dining Area */}
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                  Dining Area *
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalForm({ ...editModalForm, area: 'normal' })}
                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border text-left transition flex items-center gap-2 ${
                      editModalForm.area === 'normal'
                        ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-base sm:text-lg">🌿</span>
                    <span className="font-bold text-stone-900 block text-[11px] sm:text-xs">
                      Non-A/C
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditModalForm({ ...editModalForm, area: 'airconditioned' })
                    }
                    className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border text-left transition flex items-center gap-2 ${
                      editModalForm.area === 'airconditioned'
                        ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-base sm:text-lg">❄️</span>
                    <span className="font-bold text-stone-900 block text-[11px] sm:text-xs">
                      Air-Con
                    </span>
                  </button>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="font-bold text-stone-700 block mb-1 text-[11px] sm:text-xs">
                  Table Status
                </label>
                <div className="grid grid-cols-4 gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl bg-stone-100 p-1">
                  {(['available', 'occupied', 'reserved', 'cleaning'] as Table['status'][]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditModalForm({ ...editModalForm, status: st })}
                        className={`rounded-lg sm:rounded-xl py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold capitalize transition ${
                          editModalForm.status === st
                            ? st === 'available'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'occupied'
                              ? 'bg-stone-900 text-amber-400 shadow-xs'
                              : st === 'reserved'
                              ? 'bg-amber-400 text-stone-950 shadow-xs font-black'
                              : 'bg-sky-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-3 sm:mt-4 flex items-center justify-between pt-2.5 sm:pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => handleDeleteTable(tableToEdit)}
                  className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50/70 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                >
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditTableModalOpen(false);
                      setTableToEdit(null);
                    }}
                    className="rounded-xl border border-stone-200 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-stone-600 hover:bg-stone-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-500 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-extrabold text-stone-950 hover:bg-amber-400 transition shadow-xs cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decline Table Request Modal */}
      {declineModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100 text-rose-600 font-bold">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base font-display">
                    Decline Table #{declineModalReq.requestedTableNumber}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Guest: {declineModalReq.customerName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeclineModalReq(null)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-stone-600 font-medium">
                Please select or type a reason for declining this table request. This will be shown to the customer on their screen.
              </p>

              <div className="space-y-2">
                {[
                  'Table is currently reserved for upcoming booking',
                  'Table is currently occupied / seated with other guests',
                  'Table is undergoing sanitization / cleaning',
                  'Area is closed for private event or maintenance',
                  'Custom reason...',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition ${
                      declineReasonOption === reason
                        ? 'border-amber-500 bg-amber-50/60 font-bold text-stone-950 ring-1 ring-amber-500/30'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="declineReason"
                      value={reason}
                      checked={declineReasonOption === reason}
                      onChange={(e) => setDeclineReasonOption(e.target.value)}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {declineReasonOption === 'Custom reason...' && (
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Enter Custom Reason
                  </label>
                  <textarea
                    rows={2}
                    value={customDeclineReason}
                    onChange={(e) => setCustomDeclineReason(e.target.value)}
                    placeholder="e.g. Please choose Table #3 or #7 instead."
                    className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs font-medium text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeclineModalReq(null)}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-500 shadow-sm cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Table Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-amber-100 p-2 text-amber-900">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-base text-stone-900">
                    Filter Tables
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    Filter visible tables by status & area
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="space-y-4">
              {/* Status Section */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
                  Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {/* Status: All */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition cursor-pointer border ${
                      statusFilter === 'all'
                        ? 'border-stone-950 bg-stone-950 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Layers className="h-4 w-4 shrink-0" />
                    <span>All</span>
                  </button>

                  {/* Status: Available */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('available')}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition cursor-pointer border ${
                      statusFilter === 'available'
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${statusFilter === 'available' ? 'text-white' : 'text-emerald-500'}`} />
                    <span>Available</span>
                  </button>

                  {/* Status: Occupied */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('occupied')}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition cursor-pointer border ${
                      statusFilter === 'occupied'
                        ? 'border-amber-500 bg-amber-500 text-stone-950 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Users className={`h-4 w-4 shrink-0 ${statusFilter === 'occupied' ? 'text-stone-950' : 'text-amber-600'}`} />
                    <span>Occupied</span>
                  </button>

                  {/* Status: Reserved */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('reserved')}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition cursor-pointer border ${
                      statusFilter === 'reserved'
                        ? 'border-stone-950 bg-stone-950 text-amber-300 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Clock className={`h-4 w-4 shrink-0 ${statusFilter === 'reserved' ? 'text-amber-300' : 'text-stone-500'}`} />
                    <span>Reserved</span>
                  </button>

                  {/* Status: Cleaning */}
                  <button
                    type="button"
                    onClick={() => setStatusFilter('cleaning')}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition cursor-pointer border ${
                      statusFilter === 'cleaning'
                        ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Sparkles className={`h-4 w-4 shrink-0 ${statusFilter === 'cleaning' ? 'text-white' : 'text-sky-500'}`} />
                    <span>Cleaning</span>
                  </button>
                </div>
              </div>

              {/* Area Section */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-stone-500 mb-2">
                  Area / Zone
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Area: All Areas */}
                  <button
                    type="button"
                    onClick={() => setAreaFilter('all')}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition cursor-pointer border ${
                      areaFilter === 'all'
                        ? 'border-stone-950 bg-stone-950 text-white shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    <span>All Areas</span>
                  </button>

                  {/* Area: Normal */}
                  <button
                    type="button"
                    onClick={() => setAreaFilter('normal')}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition cursor-pointer border ${
                      areaFilter === 'normal'
                        ? 'border-stone-950 bg-stone-950 text-amber-300 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Sun className={`h-4 w-4 shrink-0 ${areaFilter === 'normal' ? 'text-amber-300' : 'text-amber-600'}`} />
                    <span>Normal Dining</span>
                  </button>

                  {/* Area: Airconditioned */}
                  <button
                    type="button"
                    onClick={() => setAreaFilter('airconditioned')}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-bold transition cursor-pointer border ${
                      areaFilter === 'airconditioned'
                        ? 'border-stone-950 bg-stone-950 text-sky-300 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <Snowflake className={`h-4 w-4 shrink-0 ${areaFilter === 'airconditioned' ? 'text-sky-300' : 'text-sky-600'}`} />
                    <span>Airconditioned</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setAreaFilter('all');
                }}
                disabled={!isAnyFilterActive}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 disabled:opacity-40 disabled:hover:text-stone-500 cursor-pointer"
              >
                Reset All Filters
              </button>

              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-xl bg-stone-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition active:scale-95 shadow-xs cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

