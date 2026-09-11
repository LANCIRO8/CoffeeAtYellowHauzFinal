import React, { useState, useMemo } from 'react';
import { User, Order } from '../../types';
import { AppStore } from '../../services/store';
import { useModal } from '../../context/ModalContext';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  UserCheck,
  UserX,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Sparkles,
  Phone,
  Mail,
  Receipt,
  Calendar,
  Lock,
  RefreshCw,
  Award,
  ChefHat,
  Coffee,
  Filter,
  ChevronDown,
} from 'lucide-react';

interface CashierAccountManagerProps {
  currentStaff: User | null;
  onRefreshStaff?: () => void;
}

export const CashierAccountManager: React.FC<CashierAccountManagerProps> = ({
  currentStaff,
  onRefreshStaff,
}) => {
  const { showConfirm, showAlert } = useModal();
  const [users, setUsers] = useState<User[]>(() => AppStore.getUsers());
  const [orders] = useState<Order[]>(() => AppStore.getOrders());

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'cashier' | 'barista' | 'cook' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Filter Modal & Add Menu State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Reveal PIN states
  const [revealedPins, setRevealedPins] = useState<Record<number, boolean>>({});

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTargetUser, setPinTargetUser] = useState<User | null>(null);
  const [newPinValue, setNewPinValue] = useState('');
  const [pinError, setPinError] = useState('');

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    employeeId: '',
    role: 'cashier' as User['role'],
    status: 'active' as 'active' | 'inactive',
    pin: '00000000',
    phone: '',
    email: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const refreshUserList = () => {
    const list = AppStore.getUsers();
    setUsers(list);
    if (onRefreshStaff) onRefreshStaff();
  };

  // Performance metrics per staff
  const staffMetrics = useMemo(() => {
    const metrics: Record<
      string,
      { orderCount: number; totalRevenue: number; lastSaleDate: string | null }
    > = {};

    for (const o of orders) {
      if (o.status !== 'completed') continue;
      const key = (o.cashierName || '').toLowerCase().trim();
      if (!key) continue;

      if (!metrics[key]) {
        metrics[key] = { orderCount: 0, totalRevenue: 0, lastSaleDate: null };
      }
      metrics[key].orderCount += 1;
      metrics[key].totalRevenue += o.totalAmount;
      if (!metrics[key].lastSaleDate || new Date(o.createdAt) > new Date(metrics[key].lastSaleDate!)) {
        metrics[key].lastSaleDate = o.createdAt;
      }
    }
    return metrics;
  }, [orders]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone && u.phone.includes(searchTerm)) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const activeCashiers = users.filter((u) => u.role === 'cashier' && u.status === 'active').length;
    const activeCooks = users.filter((u) => u.role === 'cook' && u.status === 'active').length;
    const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'active').length;
    const inactive = users.filter((u) => u.status === 'inactive').length;
    return { total, activeCashiers, activeCooks, activeAdmins, inactive };
  }, [users]);

  // Toggle reveal PIN
  const togglePinReveal = (id: number) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Create Modal
  const handleOpenCreateModal = (targetRole: User['role'] = 'cashier') => {
    setEditingUser(null);
    const existingRoleUsers = users.filter((u) => u.role === targetRole);
    const nextNum = existingRoleUsers.length + 1;
    const prefix =
      targetRole === 'cashier'
        ? 'CASHIER'
        : targetRole === 'barista'
        ? 'BARISTA'
        : targetRole === 'cook'
        ? 'COOK'
        : 'ADMIN';
    const autoEmpId = `${prefix}00${nextNum > 9 ? nextNum : `0${nextNum}`}`;

    setFormData({
      fullName: '',
      username: '',
      employeeId: autoEmpId,
      role: targetRole,
      status: 'active',
      pin: '00000000',
      phone: '',
      email: '',
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Change role inside modal
  const handleRoleChange = (newRole: User['role']) => {
    let nextEmployeeId = formData.employeeId;
    if (!editingUser) {
      const existingRoleUsers = users.filter((u) => u.role === newRole);
      const nextNum = existingRoleUsers.length + 1;
      const prefix =
        newRole === 'cashier'
          ? 'CASHIER'
          : newRole === 'barista'
          ? 'BARISTA'
          : newRole === 'cook'
          ? 'COOK'
          : 'ADMIN';
      nextEmployeeId = `${prefix}00${nextNum > 9 ? nextNum : `0${nextNum}`}`;
    }
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      employeeId: nextEmployeeId,
    }));
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      employeeId: user.employeeId,
      role: user.role,
      status: user.status,
      pin: user.pin || (user.role === 'admin' ? '12345678' : '00000000'),
      phone: user.phone || '',
      email: user.email || '',
    });
    setFormErrors({});
    setIsFormModalOpen(true);
  };

  // Submit Add / Edit
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full Name is required';
    }
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    if (!formData.employeeId.trim()) {
      errors.employeeId = 'Employee ID is required';
    }
    if (!formData.pin || !/^\d{8}$/.test(formData.pin)) {
      errors.pin = 'PIN must be exactly 8 numeric digits';
    }

    // Check unique username
    const usernameTaken = users.some(
      (u) =>
        u.username.toLowerCase() === formData.username.trim().toLowerCase() &&
        (!editingUser || u.id !== editingUser.id)
    );
    if (usernameTaken) {
      errors.username = 'Username is already taken by another staff member';
    }

    // Check unique employeeId
    const empIdTaken = users.some(
      (u) =>
        u.employeeId.toLowerCase() === formData.employeeId.trim().toLowerCase() &&
        (!editingUser || u.id !== editingUser.id)
    );
    if (empIdTaken) {
      errors.employeeId = 'Employee ID is already assigned to another staff member';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingUser) {
      AppStore.updateUser(editingUser.id, {
        fullName: formData.fullName.trim(),
        username: formData.username.trim().toLowerCase(),
        employeeId: formData.employeeId.trim().toUpperCase(),
        role: formData.role,
        status: formData.status,
        pin: formData.pin,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
      });
      showAlert({
        title: 'Account Updated',
        message: `Staff profile for ${formData.fullName} has been updated successfully.`,
        type: 'success',
      });
    } else {
      AppStore.createUser({
        fullName: formData.fullName.trim(),
        username: formData.username.trim().toLowerCase(),
        employeeId: formData.employeeId.trim().toUpperCase(),
        role: formData.role,
        status: formData.status,
        pin: formData.pin,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
      const roleLabel =
        formData.role === 'cook'
          ? 'Cook'
          : formData.role === 'barista'
          ? 'Barista'
          : formData.role === 'cashier'
          ? 'Cashier'
          : 'Admin';
      showAlert({
        title: `${roleLabel} Account Created`,
        message: `New account for ${formData.fullName} (${roleLabel}) is active with PIN ${formData.pin}.`,
        type: 'success',
      });
    }

    refreshUserList();
    setIsFormModalOpen(false);
  };

  // Quick Toggle Status
  const handleToggleStatus = (user: User) => {
    if (user.role === 'admin' && user.status === 'active') {
      const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'active');
      if (activeAdmins.length <= 1) {
        showAlert({
          title: 'Action Blocked',
          message: 'Cannot deactivate the sole active Admin account.',
          type: 'error',
        });
        return;
      }
    }

    const updated = AppStore.toggleUserStatus(user.id);
    if (updated) {
      refreshUserList();
    }
  };

  // Open Reset PIN Modal
  const handleOpenPinModal = (user: User) => {
    setPinTargetUser(user);
    setNewPinValue('');
    setPinError('');
    setIsPinModalOpen(true);
  };

  // Save New PIN
  const handleSavePin = () => {
    if (!pinTargetUser) return;
    if (!/^\d{8}$/.test(newPinValue)) {
      setPinError('PIN must be exactly 8 digits (0-9).');
      return;
    }

    AppStore.resetUserPin(pinTargetUser.id, newPinValue);
    showAlert({
      title: 'PIN Changed',
      message: `Security PIN for ${pinTargetUser.fullName} has been reset to ${newPinValue}.`,
      type: 'success',
    });
    refreshUserList();
    setIsPinModalOpen(false);
  };

  // Delete User
  const handleDeleteUser = async (user: User) => {
    if (currentStaff && currentStaff.id === user.id) {
      showAlert({
        title: 'Action Prohibited',
        message: 'You cannot delete your own currently active Admin account.',
        type: 'error',
      });
      return;
    }

    if (user.role === 'admin') {
      const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'active');
      if (activeAdmins.length <= 1) {
        showAlert({
          title: 'Action Prohibited',
          message: 'Cannot delete the only remaining Admin account.',
          type: 'error',
        });
        return;
      }
    }

    const confirmed = await showConfirm({
      title: `Delete ${user.fullName}?`,
      message: `Are you sure you want to permanently delete the account for ${user.fullName} (${user.employeeId})? Historical sales records and audit logs will remain intact.`,
      type: 'danger',
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      const ok = AppStore.deleteUser(user.id);
      if (ok) {
        showAlert({
          title: 'Account Deleted',
          message: `The account for ${user.fullName} has been removed.`,
          type: 'success',
        });
        refreshUserList();
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-stone-100 p-2.5 border border-stone-200">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            id="staff-search-input"
            type="text"
            placeholder="Search staff by name, @username, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* Filter & Add Staff Buttons */}
        <div className="flex items-center gap-2">
          {/* Single Filter Button that opens modal */}
          <button
            id="btn-staff-filter-modal"
            type="button"
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
              roleFilter !== 'all' || statusFilter !== 'all'
                ? 'border-amber-500 bg-amber-50 text-amber-950 font-extrabold ring-1 ring-amber-400/40'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Filter className="h-3.5 w-3.5 text-amber-600" />
            <span>Filter</span>
            {(roleFilter !== 'all' || statusFilter !== 'all') && (
              <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-extrabold text-stone-950">
                {(roleFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Add Staff with options for Cashier, Barista, and Cook */}
          <div className="relative">
            <div className="flex items-center rounded-xl bg-amber-500 shadow-xs">
              <button
                id="btn-add-staff-main"
                type="button"
                onClick={() => handleOpenCreateModal('cashier')}
                className="flex items-center gap-1.5 rounded-l-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 text-xs font-extrabold transition active:scale-98 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>+ Add Staff</span>
              </button>
              <button
                id="btn-add-staff-menu-toggle"
                type="button"
                onClick={() => setIsAddMenuOpen((prev) => !prev)}
                className="border-l border-amber-600/30 px-2 py-1.5 text-stone-950 hover:bg-amber-400 rounded-r-xl transition cursor-pointer"
                title="Choose role to add"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAddMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isAddMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsAddMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-white p-1.5 shadow-xl border border-stone-200 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Add Team Member
                  </div>
                  <button
                    id="btn-add-cashier-opt"
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      handleOpenCreateModal('cashier');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold text-stone-800 hover:bg-amber-50 hover:text-amber-950 transition text-left cursor-pointer"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-800">
                      <UserCheck className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-extrabold">+ Add Cashier</div>
                      <div className="text-[10px] text-stone-400 font-normal">POS Register &amp; Sales</div>
                    </div>
                  </button>
                  <button
                    id="btn-add-barista-opt"
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      handleOpenCreateModal('barista');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold text-stone-800 hover:bg-teal-50 hover:text-teal-950 transition text-left cursor-pointer"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-teal-100 text-teal-800">
                      <Coffee className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-extrabold">+ Add Barista</div>
                      <div className="text-[10px] text-stone-400 font-normal">Coffee Bar &amp; Drinks</div>
                    </div>
                  </button>
                  <button
                    id="btn-add-cook-opt"
                    type="button"
                    onClick={() => {
                      setIsAddMenuOpen(false);
                      handleOpenCreateModal('cook');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-bold text-stone-800 hover:bg-orange-50 hover:text-orange-950 transition text-left cursor-pointer"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-orange-100 text-orange-800">
                      <ChefHat className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="font-extrabold">+ Add Cook</div>
                      <div className="text-[10px] text-stone-400 font-normal">Kitchen Food Prep</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cashier List Table / Cards */}
      <div className="rounded-3xl border border-stone-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-5 py-3">Cashier / Staff Member</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Orders / Sales</th>
                <th className="px-5 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-stone-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-bold text-stone-600">No staff members found</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Try adjusting your search query or role/status filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isCurrent = currentStaff?.id === user.id;
                  const metrics = staffMetrics[user.fullName.toLowerCase().trim()] || {
                    orderCount: 0,
                    totalRevenue: 0,
                  };

                  return (
                    <tr
                      key={`user-row-${user.id}-${user.username}`}
                      className={`hover:bg-stone-50/70 transition ${
                        isCurrent ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`grid h-10 w-10 place-items-center rounded-2xl font-bold text-xs shadow-2xs ${
                              user.role === 'admin'
                                ? 'bg-stone-900 text-amber-400'
                                : user.role === 'cook'
                                ? 'bg-orange-100 text-orange-900'
                                : user.role === 'barista'
                                ? 'bg-teal-100 text-teal-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 flex items-center gap-1.5">
                              <span>{user.fullName}</span>
                              {isCurrent && (
                                <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.2 text-[9px] font-extrabold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                              <span>@{user.username}</span>
                              <span>•</span>
                              <span className="text-stone-400">{user.employeeId}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        {user.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 border border-purple-200 px-2.5 py-1 text-[11px] font-extrabold text-purple-800">
                            <Shield className="h-3 w-3 text-purple-600" /> Admin
                          </span>
                        ) : user.role === 'cook' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-1 text-[11px] font-extrabold text-orange-800">
                            <ChefHat className="h-3 w-3 text-orange-600" /> Kitchen Cook
                          </span>
                        ) : user.role === 'barista' ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1 text-[11px] font-extrabold text-teal-800">
                            <Coffee className="h-3 w-3 text-teal-600" /> Barista
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">
                            <UserCheck className="h-3 w-3 text-amber-600" /> Cashier
                          </span>
                        )}
                      </td>

                      {/* Contact Info */}
                      <td className="px-5 py-4 text-stone-600">
                        <div className="space-y-0.5 text-[11px]">
                          {user.phone ? (
                            <div className="flex items-center gap-1.5 text-stone-700">
                              <Phone className="h-3 w-3 text-stone-400" />
                              <span>{user.phone}</span>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic">No phone</span>
                          )}
                          {user.email && (
                            <div className="flex items-center gap-1.5 text-stone-500">
                              <Mail className="h-3 w-3 text-stone-400" />
                              <span className="truncate max-w-[150px]">{user.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase transition cursor-pointer ${
                            user.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                          title="Click to toggle account status"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          {user.status}
                        </button>
                      </td>

                      {/* Performance */}
                      <td className="px-5 py-4 text-right font-mono">
                        <div className="font-bold text-stone-900">
                          ₱{metrics.totalRevenue.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {metrics.orderCount} order{metrics.orderCount !== 1 ? 's' : ''} settled
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-stone-50 p-1 rounded-xl border border-stone-200">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(user)}
                            className="rounded-lg p-1.5 text-stone-600 hover:bg-white hover:text-stone-900 transition shadow-2xs"
                            title="Edit Account Details"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Reset PIN */}
                          <button
                            type="button"
                            onClick={() => handleOpenPinModal(user)}
                            className="rounded-lg p-1.5 text-amber-700 hover:bg-white hover:text-amber-900 transition shadow-2xs"
                            title="Reset 4-Digit Security PIN"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            disabled={isCurrent || (user.role === 'admin' && stats.activeAdmins <= 1)}
                            className="rounded-lg p-1.5 text-rose-600 hover:bg-white hover:text-rose-800 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-2xs"
                            title={
                              isCurrent
                                ? 'Cannot delete current user'
                                : 'Delete Cashier Account'
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Cashier Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500 text-stone-950 font-bold">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-stone-900">
                    {editingUser ? 'Edit Staff Account' : 'Register New Staff Member'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {editingUser
                      ? `Update profile and permissions for ${editingUser.fullName}`
                      : 'Create a new cashier, barista, cook, or admin profile.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUser} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sheila Mae Aledro"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                  {formErrors.fullName && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.fullName}</p>
                  )}
                </div>

                {/* Role Selector */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                    Staff Role <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'cashier', label: 'Cashier', icon: UserCheck, desc: 'POS Register' },
                      { id: 'barista', label: 'Barista', icon: Coffee, desc: 'Coffee & Drinks' },
                      { id: 'cook', label: 'Cook', icon: ChefHat, desc: 'Kitchen Food' },
                      { id: 'admin', label: 'Admin', icon: Shield, desc: 'System Admin' },
                    ].map((r) => {
                      const Icon = r.icon;
                      const isSelected = formData.role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRoleChange(r.id as User['role'])}
                          className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-400/30'
                              : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <Icon className={`h-4 w-4 mb-1 ${isSelected ? 'text-amber-700' : 'text-stone-500'}`} />
                          <span className="text-xs font-bold">{r.label}</span>
                          <span className="text-[10px] text-stone-400">{r.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. sheila"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 font-mono focus:border-amber-500 focus:outline-none"
                  />
                  {formErrors.username && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.username}</p>
                  )}
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Employee ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CASHIER001"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 font-mono uppercase focus:border-amber-500 focus:outline-none"
                  />
                  {formErrors.employeeId && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.employeeId}</p>
                  )}
                </div>

                {/* 8-Digit PIN */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    8-Digit Security PIN <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={8}
                      required
                      placeholder="00000000"
                      value={formData.pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                        setFormData({ ...formData, pin: val });
                      }}
                      className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 font-mono font-bold tracking-widest focus:border-amber-500 focus:outline-none"
                    />
                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  </div>
                  {formErrors.pin && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{formErrors.pin}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +63 928 987 6543"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. sheila@yellowhauz.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2 text-xs sm:text-sm text-stone-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Status */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Account Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'active' })}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition border ${
                        formData.status === 'active'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <UserCheck className="h-4 w-4 text-emerald-600" />
                      <span>Active (Can log in)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: 'inactive' })}
                      className={`flex items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition border ${
                        formData.status === 'inactive'
                          ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      <UserX className="h-4 w-4 text-rose-600" />
                      <span>Inactive / Suspended</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 px-5 py-2 text-xs font-extrabold shadow-sm transition active:scale-98 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{editingUser ? 'Save Changes' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {isPinModalOpen && pinTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-900 mb-3">
              <KeyRound className="h-6 w-6 text-amber-600" />
            </div>

            <h3 className="font-display text-base font-bold text-stone-900">
              Reset Security PIN
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Set a new 8-digit PIN for{' '}
              <span className="font-bold text-stone-800">{pinTargetUser.fullName}</span>.
            </p>

            <div className="my-5">
              <input
                type="text"
                autoFocus
                maxLength={8}
                placeholder="••••••••"
                value={newPinValue}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                  setNewPinValue(val);
                  setPinError('');
                }}
                className="w-56 text-center mx-auto rounded-2xl border border-amber-300 bg-amber-50/50 py-3 text-xl sm:text-2xl font-mono font-extrabold tracking-widest text-stone-900 focus:border-amber-500 focus:outline-none ring-2 ring-amber-400/20"
              />
              {pinError && <p className="text-xs font-bold text-rose-600 mt-2">{pinError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="rounded-xl border border-stone-200 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePin}
                disabled={newPinValue.length !== 8}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-extrabold text-stone-950 shadow-xs disabled:opacity-40"
              >
                <span>Save PIN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-900">
                  <Filter className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-stone-900">
                    Filter Staff Members
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Filter by system role or account status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* Role Filter Options */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                  Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Roles', count: users.length },
                    { id: 'cashier', label: 'Cashier', count: users.filter((u) => u.role === 'cashier').length },
                    { id: 'barista', label: 'Barista', count: users.filter((u) => u.role === 'barista').length },
                    { id: 'cook', label: 'Cook', count: users.filter((u) => u.role === 'cook').length },
                    { id: 'admin', label: 'Admin', count: users.filter((u) => u.role === 'admin').length },
                  ].map((r) => {
                    const isSelected = roleFilter === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRoleFilter(r.id as any)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 text-amber-950 font-extrabold ring-1 ring-amber-400/40'
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <span>{r.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950 font-extrabold'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {r.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Filter Options */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-2">
                  Account Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All', count: users.length },
                    { id: 'active', label: 'Active', count: users.filter((u) => u.status === 'active').length },
                    { id: 'inactive', label: 'Inactive', count: users.filter((u) => u.status === 'inactive').length },
                  ].map((s) => {
                    const isSelected = statusFilter === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStatusFilter(s.id as any)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50 text-amber-950 font-extrabold ring-1 ring-amber-400/40'
                            : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <span>{s.label}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950 font-extrabold'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {s.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-stone-100 pt-3.5 mt-2">
              <button
                type="button"
                onClick={() => {
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs font-bold text-stone-500 hover:text-stone-800 transition underline cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-extrabold text-stone-950 shadow-xs transition active:scale-98 cursor-pointer"
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
