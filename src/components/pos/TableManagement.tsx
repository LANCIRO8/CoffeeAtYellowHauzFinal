import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Table, Order, Reservation, TableRequest, User, OrderStatus } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import { ExpandedTicketModal } from './ExpandedTicketModal';
import { ReceiptModal } from '../ReceiptModal';
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
  Maximize2,
  Receipt,
  Armchair,
  Utensils,
  Ticket,
  Sofa,
  Link2,
  Unlink,
} from 'lucide-react';
import { CombineTablesModal } from './CombineTablesModal';

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

  // Combine Tables Modal state
  const [isCombineModalOpen, setIsCombineModalOpen] = useState(false);
  const [combineTargetAreaKey, setCombineTargetAreaKey] = useState<string | undefined>(undefined);
  const [combineTargetPrimaryTableId, setCombineTargetPrimaryTableId] = useState<number | undefined>(undefined);

  const handleOpenCombineModal = (areaKey?: string, primaryTableId?: number) => {
    setCombineTargetAreaKey(areaKey);
    setCombineTargetPrimaryTableId(primaryTableId);
    setIsCombineModalOpen(true);
  };

  const handleUncombineTable = async (table: Table) => {
    const groupName = table.combinedGroupName || `Table ${table.tableNumber}`;
    const confirmed = await showConfirm({
      title: 'Split / Uncombine Tables?',
      message: `Are you sure you want to separate ${groupName} back into independent tables?`,
      confirmText: 'Uncombine Tables',
      cancelText: 'Cancel',
      type: 'warning',
    });

    if (confirmed) {
      const res = AppStore.uncombineTable(table.id);
      if (res.success) {
        refreshData();
        showAlert({
          title: 'Tables Split Successfully 🔓',
          message: res.message,
          type: 'success',
        });
      }
    }
  };

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

  // Ticket Modal & Receipt State for easy table-to-ticket navigation
  const [expandedOrder, setExpandedOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [activeAreaFilterTab, setActiveAreaFilterTab] = useState<string>('all');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const handleOpenTicketModal = (order?: Order | null) => {
    if (!order) return;
    setExpandedOrder(order);
  };

  const handleUpdateOrderStatus = (orderId: number, nextStatus: OrderStatus) => {
    AppStore.updateOrderStatus(orderId, nextStatus);
    refreshData();
  };

  const handleToggleItemServed = (orderId: number, itemIndex: number) => {
    AppStore.toggleOrderItemServed(orderId, itemIndex, getEffectiveCashier().fullName);
    refreshData();
  };

  const handleToggleAllServed = (orderId: number, served: boolean) => {
    const freshOrders = AppStore.getOrders();
    const ord = freshOrders.find((o) => o.id === orderId);
    if (!ord) return;
    ord.items.forEach((item) => {
      item.isServed = served;
    });
    AppStore.saveOrders(freshOrders);
    refreshData();
  };

  const handleCompleteAllSections = (orderId: number) => {
    AppStore.completeAllOrderSections(orderId, getEffectiveCashier().fullName);
    refreshData();
  };

  const handleUpdateBaristaStatus = (
    orderId: number,
    status: 'to_prep' | 'processing' | 'ready'
  ) => {
    AppStore.updateOrderBaristaStatus(orderId, status, getEffectiveCashier().fullName);
    refreshData();
  };

  const handleUpdateCookStatus = (
    orderId: number,
    status: 'to_prep' | 'processing' | 'ready'
  ) => {
    AppStore.updateOrderCookStatus(orderId, status, getEffectiveCashier().fullName);
    refreshData();
  };

  const orders = AppStore.getOrders();
  const activeExpandedOrder = expandedOrder
    ? orders.find((o) => o.id === expandedOrder.id) || expandedOrder
    : null;

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

  // 10 Specified Official Areas
  const OFFICIAL_AREAS: AreaMeta[] = [
    {
      key: '1st aircon area',
      name: '1st Aircon Area',
      description: '3 tables with 2 chairs each table',
      icon: '❄️',
      isAircon: true,
    },
    {
      key: 'left side of center area',
      name: 'Left Side of Center Area',
      description: '3 long tables with 3 chairs each',
      icon: '🌿',
      isAircon: false,
    },
    {
      key: 'kolin area',
      name: 'Kolin Area',
      description: 'Long couch shared by 2 tables (Table 1 & 2) • 1 chair each table',
      icon: '❄️',
      isAircon: true,
    },
    {
      key: 'door area',
      name: 'Door Area',
      description: 'Long couch shared by 2 tables (Table 1 & 2) • 1 chair each table',
      icon: '🚪',
      isAircon: false,
    },
    {
      key: 'entrance area',
      name: 'Entrance Area',
      description: '2 tables with 1 chair each • Long couch for 2 customers',
      icon: '✨',
      isAircon: false,
    },
    {
      key: 'spotlight area',
      name: 'Spotlight Area',
      description: '1 table with 2 chairs',
      icon: '💡',
      isAircon: false,
    },
    {
      key: '2nd aircon area',
      name: '2nd Aircon Area',
      description: '1 table • 4 seats',
      icon: '❄️',
      isAircon: true,
    },
    {
      key: '3rd aircon area',
      name: '3rd Aircon Area',
      description: 'Long table • 8 seats',
      icon: '❄️',
      isAircon: true,
    },
    {
      key: 'center area',
      name: 'Center Area',
      description: '10 seats • 10 high chairs',
      icon: '🏛️',
      isAircon: false,
    },
    {
      key: 'window area',
      name: 'Window Area',
      description: 'Long table • 7 chairs',
      icon: '🪟',
      isAircon: false,
    },
  ];

  // Group tables by area (Areas -> Tables -> Chairs)
  const areaGroups: AreaGroup[] = useMemo(() => {
    const areaMap = new Map<string, AreaGroup>();

    OFFICIAL_AREAS.forEach((oa) => {
      areaMap.set(oa.key, { meta: oa, tables: [] });
    });

    filteredTables.forEach((t) => {
      const rawAreaName = (
        t.areaName || (t.area === 'airconditioned' ? '1st aircon area' : 'entrance area')
      ).toLowerCase();
      let group = areaMap.get(rawAreaName);
      if (!group) {
        const meta: AreaMeta = {
          key: rawAreaName,
          name: t.areaName || (t.area === 'airconditioned' ? 'Air-Con Area' : 'Main Area'),
          description: t.setup || `${t.capacity} Chairs`,
          icon: t.area === 'airconditioned' ? '❄️' : '🌿',
          isAircon: t.area === 'airconditioned',
        };
        group = { meta, tables: [] };
        areaMap.set(rawAreaName, group);
      }
      group.tables.push(t);
    });

    return Array.from(areaMap.values());
  }, [filteredTables]);

  // Enhanced Table Card Renderer with 2D Visual Floor Plan Schematic, Visual Chairs & Ticket Stubs
  const renderTableCard = (table: Table) => {
    const activeRes = getTableActiveReservation(table.id);
    const occ = AppStore.getTableOccupancyDetails(table, orders);
    const isAvailable = occ.occupiedChairs === 0 && table.status === 'available';
    const isOccupied = occ.isFullyOccupied || table.status === 'occupied';
    const isPartiallyOccupied = occ.isPartiallyOccupied;
    const isReserved = table.status === 'reserved';
    const isCleaning = table.status === 'cleaning';

    const isCombinedPrimary = Boolean(
      table.combinedWithTableIds && table.combinedWithTableIds.length > 0
    );
    const companionTables = isCombinedPrimary
      ? tables.filter((t) => table.combinedWithTableIds?.includes(t.id))
      : [];
    const combinedNums = [
      table.tableNumber,
      ...companionTables.map((c) => c.tableNumber),
    ].sort((a, b) => a - b);
    const combinedGroupName =
      table.combinedGroupName || `Table ${combinedNums.join(' + ')}`;
    const combinedBadge = `T${combinedNums.join('+')}`;

    const isCouch =
      (table.name || '').toLowerCase().includes('couch') ||
      (table.setup || '').toLowerCase().includes('couch');
    const isSharesLongCouch =
      !isCouch &&
      ((table.setup || '').toLowerCase().includes('long couch') ||
        (table.capacity === 1 &&
          (table.areaName === 'kolin area' || table.areaName === 'door area')));
    const isLongTable = table.capacity >= 3;

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
        className={`relative flex flex-col justify-between rounded-2xl sm:rounded-3xl p-3.5 sm:p-4.5 transition-all duration-200 border shadow-xs hover:shadow-md cursor-pointer select-none ${
          isCombinedPrimary
            ? isOccupied
              ? 'bg-stone-900 border-amber-400 text-white shadow-md ring-2 ring-amber-400/80'
              : 'bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white dark:from-amber-950/40 dark:via-stone-850 dark:to-stone-900 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/50 shadow-md'
            : isReserved
            ? 'bg-amber-50/90 border-amber-300 dark:border-amber-700/60 dark:bg-stone-850'
            : isCleaning
            ? 'bg-sky-50/80 border-sky-300 dark:border-sky-800 dark:bg-stone-850'
            : isOccupied
            ? 'bg-stone-900 border-amber-500/80 text-white shadow-sm ring-1 ring-amber-500/30'
            : isPartiallyOccupied
            ? 'bg-gradient-to-br from-amber-50/80 to-white border-amber-400 dark:border-amber-600 dark:bg-stone-850 ring-1 ring-amber-400/40'
            : 'bg-white border-stone-200 dark:border-stone-800 dark:bg-stone-850 hover:border-amber-400'
        }`}
      >
        {/* Top Header: Table Title */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4
            className={`font-serif text-base sm:text-lg font-bold leading-tight truncate ${
              isOccupied ? 'text-white' : 'text-stone-950 dark:text-stone-100'
            }`}
          >
            {isCombinedPrimary
              ? combinedGroupName
              : table.name || `Table ${table.tableNumber}`}
          </h4>

          {/* Status if Reserved/Cleaning */}
          {(isReserved || isCleaning) && (
            <span
              className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                isReserved
                  ? 'bg-amber-300 text-stone-950'
                  : 'bg-sky-200 text-sky-950 border border-sky-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isReserved ? 'bg-amber-800' : 'bg-sky-700'
                }`}
              />
              <span>{isReserved ? 'Reserved' : 'Clean'}</span>
            </span>
          )}
        </div>

        {/* Reserved banner if active */}
        {isReserved && activeRes && (
          <div className="rounded-xl bg-amber-100/90 border border-amber-300/80 p-2 text-xs text-amber-950 flex items-center justify-between mb-2">
            <span className="font-bold truncate">
              {activeRes.customerName} ({activeRes.guestCount} Guests)
            </span>
            <span className="font-mono text-[10px] text-amber-800">
              {activeRes.reservationAt
                ? new Date(activeRes.reservationAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </span>
          </div>
        )}

        {/* 2D VISUAL TABLE BLUEPRINT: TABLES AND CHAIRS ONLY */}
        <div className="py-1">
          {isCombinedPrimary ? (
              /* UNIFIED JOINED COMBINED TABLE SCHEMATIC */
              <div className="flex flex-col items-center py-2 px-1 space-y-2">
                {/* Top Row of Chairs for Unified Table */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {occ.chairsWithOccupants
                    .slice(0, Math.ceil(occ.chairsWithOccupants.length / 2))
                    .map((ch, idx) => {
                      const isTaken = ch.isOccupied && ch.order;
                      return (
                        <button
                          key={ch.id || idx}
                          type="button"
                          onClick={(e) => {
                            if (isTaken && ch.order) {
                              e.stopPropagation();
                              handleOpenTicketModal(ch.order);
                            }
                          }}
                          title={
                            isTaken
                              ? `${ch.customerName || 'Guest'} - #${ch.order?.orderNumber}`
                              : `${ch.label || `Seat ${ch.chairNumber}`} (Free)`
                          }
                          className={`h-7 w-7 rounded-lg grid place-items-center text-[10px] font-black transition-all ${
                            isTaken
                              ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300 hover:bg-amber-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                          }`}
                        >
                          {isTaken ? (
                            <span>{(ch.customerName || 'G')[0].toUpperCase()}</span>
                          ) : (
                            <Armchair className="h-3.5 w-3.5" />
                          )}
                        </button>
                      );
                    })}
                </div>

                {/* Single Continuous Unified Wooden Dining Table Top */}
                <div className="w-full max-w-[280px] h-10 rounded-xl bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 border-2 border-amber-600/90 shadow-sm flex items-center justify-center gap-2 text-amber-100 px-3">
                  <Link2 className="h-3.5 w-3.5 text-amber-300 shrink-0 stroke-[2.5]" />
                  <span className="font-mono font-black text-xs">
                    {combinedGroupName}
                  </span>
                  <span className="text-[9px] font-bold text-amber-200/90">
                    • {table.capacity} Seats
                  </span>
                </div>

                {/* Bottom Row of Chairs for Unified Table */}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {occ.chairsWithOccupants
                    .slice(Math.ceil(occ.chairsWithOccupants.length / 2))
                    .map((ch, idx) => {
                      const isTaken = ch.isOccupied && ch.order;
                      return (
                        <button
                          key={ch.id || idx}
                          type="button"
                          onClick={(e) => {
                            if (isTaken && ch.order) {
                              e.stopPropagation();
                              handleOpenTicketModal(ch.order);
                            }
                          }}
                          title={
                            isTaken
                              ? `${ch.customerName || 'Guest'} - #${ch.order?.orderNumber}`
                              : `${ch.label || `Seat ${ch.chairNumber}`} (Free)`
                          }
                          className={`h-7 w-7 rounded-lg grid place-items-center text-[10px] font-black transition-all ${
                            isTaken
                              ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300 hover:bg-amber-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                          }`}
                        >
                          {isTaken ? (
                            <span>{(ch.customerName || 'G')[0].toUpperCase()}</span>
                          ) : (
                            <Armchair className="h-3.5 w-3.5" />
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : isCouch ? (
              /* COUCH / SOFA SCHEMATIC */
              <div className="flex flex-col items-center py-1">
                <div className="w-full max-w-[260px] rounded-2xl border-2 border-stone-300 dark:border-stone-600 bg-stone-200/80 dark:bg-stone-800 p-1.5 shadow-xs">
                  {/* Sofa Backrest Cushion */}
                  <div className="h-2 rounded-lg bg-stone-300 dark:bg-stone-700 mb-1.5 flex items-center justify-center">
                    <div className="w-14 h-0.5 rounded-full bg-stone-400 dark:bg-stone-500" />
                  </div>
                  {/* 2 Cushion Seats */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {occ.chairsWithOccupants.map((ch, idx) => {
                      const isTaken = ch.isOccupied && ch.order;
                      return (
                        <div
                          key={ch.id || idx}
                          onClick={(e) => {
                            if (isTaken && ch.order) {
                              e.stopPropagation();
                              handleOpenTicketModal(ch.order);
                            }
                          }}
                          className={`rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all ${
                            isTaken
                              ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300 cursor-pointer active:scale-95 group'
                              : 'bg-emerald-500/10 border border-dashed border-emerald-400/80 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          <Sofa className="h-4 w-4 mb-0.5" />
                          <span className="text-[10px] font-black truncate max-w-full">
                            {isTaken ? ch.customerName || `Guest ${idx + 1}` : `Seat ${idx + 1}`}
                          </span>
                          {isTaken && ch.order ? (
                            <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-stone-950 text-amber-300 px-1.5 py-0.2 text-[8px] font-mono font-black group-hover:scale-105 transition-transform">
                              <Ticket className="h-2.5 w-2.5" />
                              #{ch.order.orderNumber.slice(-3)}
                            </span>
                          ) : (
                            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5">
                              Open
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-stone-400 mt-1.5">
                  <Sofa className="h-3 w-3" />
                  <span>
                    {table.areaName === 'kolin area' || table.areaName === 'door area'
                      ? 'Long Couch • Shared with Table 1 & 2'
                      : 'Lounge Couch • 2 Seats'}
                  </span>
                </div>
              </div>
            ) : isLongTable ? (
              /* LONG TABLE / HIGH TABLE SCHEMATIC */
              <div className="flex flex-col items-center py-1">
                {/* Top Chairs row */}
                <div className="flex items-center justify-center gap-1.5 mb-1 flex-wrap">
                  {occ.chairsWithOccupants
                    .slice(0, Math.ceil(occ.chairsWithOccupants.length / 2))
                    .map((ch, idx) => {
                      const isTaken = ch.isOccupied && ch.order;
                      return (
                        <button
                          key={ch.id || idx}
                          type="button"
                          onClick={(e) => {
                            if (isTaken && ch.order) {
                              e.stopPropagation();
                              handleOpenTicketModal(ch.order);
                            }
                          }}
                          title={
                            isTaken
                              ? `${ch.customerName || 'Guest'} - Order #${ch.order?.orderNumber}`
                              : `Seat ${ch.chairNumber} (Free)`
                          }
                          className={`h-7 w-7 rounded-lg grid place-items-center text-[10px] font-black transition-all ${
                            isTaken
                              ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300 active:scale-95 cursor-pointer hover:bg-amber-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                          }`}
                        >
                          {isTaken ? (
                            <span>{(ch.customerName || 'G')[0].toUpperCase()}</span>
                          ) : (
                            <Armchair className="h-3.5 w-3.5" />
                          )}
                        </button>
                      );
                    })}
                </div>

                {/* Wooden Table Top Surface */}
                <div className="w-full max-w-[270px] h-8 rounded-xl bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 border border-amber-600/80 shadow-inner flex items-center justify-between px-3 text-amber-100">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
                    <span className="font-mono font-black text-[11px] tracking-wider">
                      T{table.tableNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-200/90">
                    <Armchair className="h-3 w-3" />
                    <span>
                      {occ.occupiedChairs}/{table.capacity}
                    </span>
                  </div>
                </div>

                {/* Bottom Chairs row */}
                <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
                  {occ.chairsWithOccupants
                    .slice(Math.ceil(occ.chairsWithOccupants.length / 2))
                    .map((ch, idx) => {
                      const isTaken = ch.isOccupied && ch.order;
                      return (
                        <button
                          key={ch.id || idx}
                          type="button"
                          onClick={(e) => {
                            if (isTaken && ch.order) {
                              e.stopPropagation();
                              handleOpenTicketModal(ch.order);
                            }
                          }}
                          title={
                            isTaken
                              ? `${ch.customerName || 'Guest'} - Order #${ch.order?.orderNumber}`
                              : `Seat ${ch.chairNumber} (Free)`
                          }
                          className={`h-7 w-7 rounded-lg grid place-items-center text-[10px] font-black transition-all ${
                            isTaken
                              ? 'bg-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-300 active:scale-95 cursor-pointer hover:bg-amber-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60'
                          }`}
                        >
                          {isTaken ? (
                            <span>{(ch.customerName || 'G')[0].toUpperCase()}</span>
                          ) : (
                            <Armchair className="h-3.5 w-3.5" />
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : isSharesLongCouch ? (
              /* SHARED LONG COUCH TABLE (TABLE 1 OR TABLE 2 WITH 1 OPPOSITE CHAIR) */
              <div className="flex flex-col items-center justify-center gap-2 py-1">
                {/* Top: Long Couch Cushion Indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-[10px] font-bold shadow-2xs">
                  <Sofa className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  <span>Shared Long Couch (Facing)</span>
                </div>

                {/* Central Cafe Table Surface */}
                <div className="h-9 w-24 rounded-xl bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 border-2 border-amber-600/80 shadow-xs flex items-center justify-center gap-1.5 text-amber-100 px-2">
                  <Utensils className="h-2.5 w-2.5 text-amber-300/80 shrink-0" />
                  <span className="font-mono text-xs font-black truncate">T{table.tableNumber}</span>
                </div>

                {/* Bottom: Opposite Chair 1 */}
                {occ.chairsWithOccupants[0] &&
                  (() => {
                    const ch = occ.chairsWithOccupants[0];
                    const isTaken = ch.isOccupied && ch.order;
                    return (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            if (isTaken && ch.order) {
                              e.stopPropagation();
                              handleOpenTicketModal(ch.order);
                            }
                          }}
                          className={`h-8 w-8 rounded-xl grid place-items-center transition-all ${
                            isTaken
                              ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-300 active:scale-95 cursor-pointer hover:bg-amber-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80'
                          }`}
                          title={isTaken ? `${ch.customerName || 'Guest'} - #${ch.order?.orderNumber}` : 'Chair 1 (Opposite Chair) - Available'}
                        >
                          {isTaken ? (
                            <span className="font-black text-xs">
                              {(ch.customerName || 'G')[0].toUpperCase()}
                            </span>
                          ) : (
                            <Armchair className="h-4 w-4" />
                          )}
                        </button>
                        <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                          Opposite Chair 1
                        </span>
                      </div>
                    );
                  })()}
              </div>
            ) : (
              /* STANDARD 1 TO 2 CHAIR TABLE SCHEMATIC */
              <div className="flex items-center justify-center gap-3 py-1">
                {/* Chair 1 */}
                {occ.chairsWithOccupants[0] &&
                  (() => {
                    const ch = occ.chairsWithOccupants[0];
                    const isTaken = ch.isOccupied && ch.order;
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isTaken && ch.order) {
                            e.stopPropagation();
                            handleOpenTicketModal(ch.order);
                          }
                        }}
                        className={`h-8 w-8 rounded-xl grid place-items-center transition-all ${
                          isTaken
                            ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-300 active:scale-95 cursor-pointer hover:bg-amber-400'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80'
                        }`}
                      >
                        {isTaken ? (
                          <span className="font-black text-xs">
                            {(ch.customerName || 'G')[0].toUpperCase()}
                          </span>
                        ) : (
                          <Armchair className="h-4 w-4" />
                        )}
                      </button>
                    );
                  })()}

                {/* Central Cafe Table Disc */}
                <div className="h-10 w-14 rounded-xl bg-gradient-to-br from-amber-800 to-amber-900 border-2 border-amber-600/80 shadow-sm flex flex-col items-center justify-center text-amber-100">
                  <Utensils className="h-2.5 w-2.5 text-amber-300/80 mb-0.5" />
                  <span className="font-mono text-[11px] font-black">T{table.tableNumber}</span>
                </div>

                {/* Chair 2 (if present) */}
                {occ.chairsWithOccupants[1] ? (
                  (() => {
                    const ch = occ.chairsWithOccupants[1];
                    const isTaken = ch.isOccupied && ch.order;
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          if (isTaken && ch.order) {
                            e.stopPropagation();
                            handleOpenTicketModal(ch.order);
                          }
                        }}
                        className={`h-8 w-8 rounded-xl grid place-items-center transition-all ${
                          isTaken
                            ? 'bg-amber-500 text-stone-950 shadow-xs ring-2 ring-amber-300 active:scale-95 cursor-pointer hover:bg-amber-400'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80'
                        }`}
                      >
                        {isTaken ? (
                          <span className="font-black text-xs">
                            {(ch.customerName || 'G')[0].toUpperCase()}
                          </span>
                        ) : (
                          <Armchair className="h-4 w-4" />
                        )}
                      </button>
                    );
                  })()
                ) : (
                  <div className="h-8 w-8" />
                )}
              </div>
            )}
        </div>
      </div>
    );
  };

  // Specialized Architectural Blueprint for Areas where a Long Couch is shared by 2 Tables (Kolin Area & Door Area)
  const renderSharedCouchAreaBlueprint = (group: AreaGroup, areaTables: Table[]) => {
    const allAreaTables = tables.filter((t) => {
      const a = (t.areaName || '').toLowerCase();
      return a === group.meta.key;
    });
    const t1 =
      areaTables.find((t) => (t.name || '').toLowerCase().includes('table 1') || t.code?.includes('_1')) ||
      allAreaTables.find((t) => (t.name || '').toLowerCase().includes('table 1') || t.code?.includes('_1'));
    const t2 =
      areaTables.find((t) => (t.name || '').toLowerCase().includes('table 2') || t.code?.includes('_2')) ||
      allAreaTables.find((t) => (t.name || '').toLowerCase().includes('table 2') || t.code?.includes('_2'));
    const couch =
      areaTables.find((t) => (t.name || '').toLowerCase().includes('couch') || t.code?.includes('couch')) ||
      allAreaTables.find((t) => (t.name || '').toLowerCase().includes('couch') || t.code?.includes('couch'));

    if (!t1 || !t2 || !couch) return null;

    if (areaTables.length === 0) {
      return (
        <p className="text-xs text-stone-400 py-3 italic text-center">
          No tables in this area match current status filters.
        </p>
      );
    }

    const occ1 = AppStore.getTableOccupancyDetails(t1, orders);
    const occ2 = AppStore.getTableOccupancyDetails(t2, orders);
    const occCouch = AppStore.getTableOccupancyDetails(couch, orders);

    const t1Chair = occ1.chairsWithOccupants[0];
    const t2Chair = occ2.chairsWithOccupants[0];
    const couchSeat1 = occCouch.chairsWithOccupants[0];
    const couchSeat2 = occCouch.chairsWithOccupants[1];

    const totalOccupied = occ1.occupiedChairs + occ2.occupiedChairs + occCouch.occupiedChairs;

    return (
      <div className="w-full max-w-lg mx-auto py-1 space-y-3 font-sans">
        {/* 1. TOP: The Continuous Long Couch */}
        <div className="rounded-2xl border-2 border-stone-300 dark:border-stone-600 bg-stone-200/90 dark:bg-stone-800 p-2.5 shadow-sm">
          {/* Sofa Backrest Cushion */}
          <div
            onClick={() => setSelectedTableForDetails(couch)}
            className="h-4 rounded-lg bg-stone-300 dark:bg-stone-700 mb-2.5 flex items-center justify-center gap-1.5 px-3 cursor-pointer hover:bg-stone-350 dark:hover:bg-stone-650 transition"
            title="Continuous Long Couch - Click to view table details"
          >
            <Sofa className="h-3 w-3 text-stone-500 dark:text-stone-400 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Long Couch (Shared by Table 1 &amp; Table 2)
            </span>
          </div>

            {/* 2 Couch Seats side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Left Couch Seat (Faces Table 1) */}
              <div
                onClick={() => {
                  if (couchSeat1?.isOccupied && couchSeat1.order) {
                    handleOpenTicketModal(couchSeat1.order);
                  } else {
                    setSelectedTableForDetails(couch);
                  }
                }}
                className={`rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-95 border ${
                  couchSeat1?.isOccupied
                    ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-stone-950 border-amber-300 shadow-xs'
                    : 'bg-emerald-500/10 border-dashed border-emerald-400/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                }`}
                title={couchSeat1?.isOccupied ? `Occupied - ${couchSeat1.customerName}` : 'Couch Seat 1 (Table 1) - Available'}
              >
                <Sofa className="h-4 w-4 mb-0.5" />
                <span className="text-[11px] font-black truncate max-w-full">
                  {couchSeat1?.isOccupied ? couchSeat1.customerName || 'Guest' : 'Couch Seat 1'}
                </span>
                <span className="text-[9px] font-bold opacity-80 mt-0.5">
                  Faces Table 1
                </span>
                {couchSeat1?.isOccupied && couchSeat1.order ? (
                  <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-stone-950 text-amber-300 px-1.5 py-0.2 text-[8px] font-mono font-black">
                    <Ticket className="h-2.5 w-2.5" />
                    #{couchSeat1.order.orderNumber.slice(-3)}
                  </span>
                ) : (
                  <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5">
                    Open
                  </span>
                )}
              </div>

              {/* Right Couch Seat (Faces Table 2) */}
              <div
                onClick={() => {
                  if (couchSeat2?.isOccupied && couchSeat2.order) {
                    handleOpenTicketModal(couchSeat2.order);
                  } else {
                    setSelectedTableForDetails(couch);
                  }
                }}
                className={`rounded-xl p-2.5 flex flex-col items-center justify-center text-center transition cursor-pointer active:scale-95 border ${
                  couchSeat2?.isOccupied
                    ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-stone-950 border-amber-300 shadow-xs'
                    : 'bg-emerald-500/10 border-dashed border-emerald-400/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                }`}
                title={couchSeat2?.isOccupied ? `Occupied - ${couchSeat2.customerName}` : 'Couch Seat 2 (Table 2) - Available'}
              >
                <Sofa className="h-4 w-4 mb-0.5" />
                <span className="text-[11px] font-black truncate max-w-full">
                  {couchSeat2?.isOccupied ? couchSeat2.customerName || 'Guest' : 'Couch Seat 2'}
                </span>
                <span className="text-[9px] font-bold opacity-80 mt-0.5">
                  Faces Table 2
                </span>
                {couchSeat2?.isOccupied && couchSeat2.order ? (
                  <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-stone-950 text-amber-300 px-1.5 py-0.2 text-[8px] font-mono font-black">
                    <Ticket className="h-2.5 w-2.5" />
                    #{couchSeat2.order.orderNumber.slice(-3)}
                  </span>
                ) : (
                  <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mt-0.5">
                    Open
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. CENTER: The Two Shared Tables */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-1">
            {/* Table 1 */}
            <div
              onClick={() => setSelectedTableForDetails(t1)}
              className="rounded-xl border-2 border-amber-700/80 bg-gradient-to-br from-amber-800 to-amber-900 p-3 text-amber-100 flex flex-col items-center justify-center text-center shadow-sm hover:border-amber-400 transition cursor-pointer active:scale-98"
            >
              <Utensils className="h-3 w-3 text-amber-300 mb-0.5" />
              <span className="font-mono text-xs font-black">
                T{t1.tableNumber} • Table 1
              </span>
              <span className="text-[9px] font-bold text-amber-200/80 mt-0.5">
                {occ1.occupiedChairs > 0 ? `${occ1.occupiedChairs}/1 Occupied` : 'Available'}
              </span>
            </div>

            {/* Table 2 */}
            <div
              onClick={() => setSelectedTableForDetails(t2)}
              className="rounded-xl border-2 border-amber-700/80 bg-gradient-to-br from-amber-800 to-amber-900 p-3 text-amber-100 flex flex-col items-center justify-center text-center shadow-sm hover:border-amber-400 transition cursor-pointer active:scale-98"
            >
              <Utensils className="h-3 w-3 text-amber-300 mb-0.5" />
              <span className="font-mono text-xs font-black">
                T{t2.tableNumber} • Table 2
              </span>
              <span className="text-[9px] font-bold text-amber-200/80 mt-0.5">
                {occ2.occupiedChairs > 0 ? `${occ2.occupiedChairs}/1 Occupied` : 'Available'}
              </span>
            </div>
          </div>

          {/* 3. FRONT: Each Table's Opposite Chair */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {/* Chair for Table 1 */}
            <div className="flex flex-col items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (t1Chair?.isOccupied && t1Chair.order) {
                    handleOpenTicketModal(t1Chair.order);
                  } else {
                    setSelectedTableForDetails(t1);
                  }
                }}
                className={`h-9 w-9 rounded-xl grid place-items-center transition active:scale-95 cursor-pointer ${
                  t1Chair?.isOccupied
                    ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 shadow-xs'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80 hover:bg-emerald-500/25'
                }`}
                title={t1Chair?.isOccupied ? `Occupied - ${t1Chair.customerName}` : 'Chair 1 (Table 1) - Available'}
              >
                {t1Chair?.isOccupied ? (
                  <span className="font-black text-xs">{(t1Chair.customerName || 'G')[0].toUpperCase()}</span>
                ) : (
                  <Armchair className="h-4 w-4" />
                )}
              </button>
              <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400">
                Chair (Table 1)
              </span>
            </div>

            {/* Chair for Table 2 */}
            <div className="flex flex-col items-center justify-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (t2Chair?.isOccupied && t2Chair.order) {
                    handleOpenTicketModal(t2Chair.order);
                  } else {
                    setSelectedTableForDetails(t2);
                  }
                }}
                className={`h-9 w-9 rounded-xl grid place-items-center transition active:scale-95 cursor-pointer ${
                  t2Chair?.isOccupied
                    ? 'bg-amber-500 text-stone-950 ring-2 ring-amber-300 shadow-xs'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/80 hover:bg-emerald-500/25'
                }`}
                title={t2Chair?.isOccupied ? `Occupied - ${t2Chair.customerName}` : 'Chair 1 (Table 2) - Available'}
              >
                {t2Chair?.isOccupied ? (
                  <span className="font-black text-xs">{(t2Chair.customerName || 'G')[0].toUpperCase()}</span>
                ) : (
                  <Armchair className="h-4 w-4" />
                )}
              </button>
              <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400">
                Chair (Table 2)
              </span>
            </div>
          </div>
        </div>
    );
  };

  const handleResetToOfficial = async () => {
    const confirmed = await showConfirm({
      title: 'Reset to Official Tables & Areas?',
      message:
        'This will reset the layout to the official Yellow Hauz floor plan divided into 10 areas (1st Aircon, Left Side of Center, Kolin, Door, Entrance, Spotlight, 2nd Aircon, 3rd Aircon, Center, Window) with 20 tables and 59 individual seats. Active reservations will be preserved.',
      type: 'warning',
      confirmText: 'Reset Tables',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      AppStore.resetToOfficialTables();
      refreshData();
      showAlert({
        title: 'Official Tables Restored',
        message: 'Loaded official Yellow Hauz layout with 10 areas, 20 tables, and 59 seats.',
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

      {/* Floor Plan Canvas: Divided by Areas then Tables then Chairs */}
      <div className="space-y-5">
        {/* Area Filter Quick Switcher Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveAreaFilterTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeAreaFilterTab === 'all'
                ? 'bg-stone-950 text-amber-400 shadow-xs'
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>All Areas</span>
            <span className="rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-mono">
              {tables.length}
            </span>
          </button>
          {OFFICIAL_AREAS.map((oa: AreaMeta) => {
            const group = areaGroups.find((g: AreaGroup) => g.meta.key === oa.key);
            const count = group ? group.tables.length : 0;
            const areaTables = group ? group.tables : [];
            const occChairs = areaTables.reduce((s: number, t: Table) => {
              const occ = AppStore.getTableOccupancyDetails(t, orders);
              return s + occ.occupiedChairs;
            }, 0);
            const totalChairs = areaTables.reduce((s: number, t: Table) => s + t.capacity, 0);
            const hasFree = totalChairs > occChairs;

            return (
              <button
                key={oa.key}
                type="button"
                onClick={() => setActiveAreaFilterTab(oa.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeAreaFilterTab === oa.key
                    ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>{oa.icon}</span>
                <span>{oa.name}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasFree ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-amber-500 ring-2 ring-amber-300'
                  }`}
                  title={hasFree ? 'Seats available' : 'Fully Occupied'}
                />
              </button>
            );
          })}
        </div>

        {/* Display each Area Section */}
        {areaGroups
          .filter(
            (group: AreaGroup) => activeAreaFilterTab === 'all' || group.meta.key === activeAreaFilterTab
          )
          .map((group: AreaGroup) => {
            const areaTables = group.tables;

            return (
              <div
                key={group.meta.key}
                className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5"
              >
                {/* Visual Area Header */}
                <div className="flex items-center justify-between gap-3 border-b border-stone-150 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {group.meta.icon}
                    </span>
                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-black text-stone-950 uppercase tracking-wide">
                        {group.meta.name}
                      </h3>
                      <p className="text-[11px] text-stone-500 font-medium">
                        {group.meta.description}
                      </p>
                    </div>
                  </div>

                  {/* Combine Tables in this Area Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenCombineModal(group.meta.key)}
                    title={`Combine tables in ${group.meta.name} to accommodate bigger guest count`}
                    className="rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black px-3 py-1.5 text-xs shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 border border-amber-400"
                  >
                    <Link2 className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Combine Tables</span>
                  </button>
                </div>

                {/* Tables / Layout within this Area */}
                {(group.meta.key === 'kolin area' || group.meta.key === 'door area') ? (
                  renderSharedCouchAreaBlueprint(group, areaTables)
                ) : (
                  /* Tables Grid within this Area */
                  (() => {
                    const visibleTables = areaTables.filter(
                      (table: Table) => !table.isCombinedCompanion
                    );
                    return visibleTables.length === 0 ? (
                      <p className="text-xs text-stone-400 py-3 italic text-center">
                        No tables in this area match current status filters.
                      </p>
                    ) : (
                      <div
                        className={`grid gap-4 ${
                          gridColumns === 1
                            ? 'grid-cols-1 max-w-xl mx-auto'
                            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                        }`}
                      >
                        {visibleTables.map((table: Table) => renderTableCard(table))}
                      </div>
                    );
                  })()
                )}
              </div>
            );
          })}
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
                      <span className="font-semibold text-stone-700">
                        {selectedTableForDetails.setup}
                      </span>
                    </>
                  )}
                </p>

                {(selectedTableForDetails.combinedWithTableIds?.length ||
                  selectedTableForDetails.isCombinedCompanion) && (
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 p-2.5 flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 stroke-[2.5]" />
                      <div className="min-w-0">
                        <span className="text-xs font-black text-amber-950 dark:text-amber-200 block truncate">
                          {selectedTableForDetails.combinedGroupName || 'Combined Station'}
                        </span>
                        <span className="text-[10px] text-amber-800 dark:text-amber-400">
                          Unified party seating • {selectedTableForDetails.capacity} Total Seats
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleUncombineTable(selectedTableForDetails);
                        setSelectedTableForDetails(null);
                      }}
                      className="rounded-lg bg-stone-950 hover:bg-stone-850 text-amber-300 font-black text-xs px-2.5 py-1 shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Unlink className="h-3 w-3" />
                      <span>Split Tables</span>
                    </button>
                  </div>
                )}

                {/* Combine action in details if not currently combined */}
                {!(selectedTableForDetails.combinedWithTableIds?.length ||
                  selectedTableForDetails.isCombinedCompanion) && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-stone-50 border border-stone-200 p-2">
                    <span className="text-[11px] text-stone-600 font-medium">
                      Need more seats? Combine with an adjacent table.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const targetArea =
                          selectedTableForDetails.areaName ||
                          (selectedTableForDetails.area === 'airconditioned'
                            ? '1st aircon area'
                            : 'entrance area');
                        const targetId = selectedTableForDetails.id;
                        setSelectedTableForDetails(null);
                        handleOpenCombineModal(targetArea, targetId);
                      }}
                      className="rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs px-2.5 py-1 shadow-2xs transition active:scale-95 cursor-pointer inline-flex items-center gap-1 shrink-0 border border-amber-400"
                    >
                      <Link2 className="h-3 w-3 stroke-[2.5]" />
                      <span>Combine</span>
                    </button>
                  </div>
                )}
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
                        <div className="flex justify-between items-center font-bold">
                          <div className="flex items-center gap-1.5">
                            <span>Order #{activeOrder.orderNumber.slice(-3)}</span>
                            {activeOrder.paymentStatus === 'nyp' ? (
                              <span className="rounded bg-amber-500/20 border border-amber-400 text-amber-300 px-1.5 py-0.2 text-[9px] font-black uppercase">
                                NYP
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-1.5 py-0.2 text-[9px] font-black uppercase">
                                Paid
                              </span>
                            )}
                          </div>
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

      {/* EXPANDED TICKET MODAL TRIGGERED FROM ANY TABLE OR CHAIR */}
      {activeExpandedOrder && (
        <ExpandedTicketModal
          order={activeExpandedOrder}
          activeStaff={getEffectiveCashier()}
          onClose={() => setExpandedOrder(null)}
          onViewReceipt={(ord) => {
            if (onViewOrderReceipt) {
              onViewOrderReceipt(ord);
            } else {
              setReceiptOrder(ord);
            }
          }}
          onUpdateStatus={handleUpdateOrderStatus}
          onToggleItemServed={handleToggleItemServed}
          onToggleAllServed={handleToggleAllServed}
          onCompleteAllSections={handleCompleteAllSections}
          onUpdateBaristaStatus={handleUpdateBaristaStatus}
          onUpdateCookStatus={handleUpdateCookStatus}
          onOpenVoidModal={async (ord) => {
            const ok = await showConfirm({
              title: 'Void Order?',
              message: `Are you sure you want to void Order #${ord.orderNumber}?`,
              type: 'warning',
            });
            if (ok) {
              AppStore.updateOrderStatus(ord.id, 'cancelled', {
                cancelReason: 'Voided by staff',
              });
              refreshData();
              setExpandedOrder(null);
            }
          }}
          onOpenCancelModal={async (ord) => {
            const ok = await showConfirm({
              title: 'Cancel Order?',
              message: `Are you sure you want to cancel Order #${ord.orderNumber}?`,
              type: 'warning',
            });
            if (ok) {
              AppStore.updateOrderStatus(ord.id, 'cancelled', {
                cancelReason: 'Cancelled by staff',
              });
              refreshData();
              setExpandedOrder(null);
            }
          }}
          onApproveCancellation={(ord) => {
            AppStore.updateOrderStatus(ord.id, 'cancelled', {
              cancelReason: 'Customer cancellation approved',
            });
            refreshData();
            setExpandedOrder(null);
          }}
          onDeclineCancellation={(ord) => {
            AppStore.updateOrderStatus(ord.id, 'processing');
            refreshData();
          }}
          formatDuration={formatDuration}
          now={now}
        />
      )}

      {/* RECEIPT MODAL */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          settings={AppStore.getSettings()}
          onClose={() => setReceiptOrder(null)}
        />
      )}

      {/* COMBINE TABLES MODAL */}
      {isCombineModalOpen && (
        <CombineTablesModal
          isOpen={isCombineModalOpen}
          onClose={() => setIsCombineModalOpen(false)}
          initialAreaKey={combineTargetAreaKey}
          initialPrimaryTableId={combineTargetPrimaryTableId}
          onTablesCombined={() => {
            refreshData();
          }}
        />
      )}
    </div>
  );
};

