import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Loader2,
  RefreshCw,
  Users,
  ShieldCheck,
  Sprout,
  ShoppingCart,
  Building2,
  MapPin,
  CalendarDays,
  ChevronRight,
  X,
  CheckCircle,
  AlertTriangle,
  Eye,
  UserCog,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';

export function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] =
    useState('all');

  const [selectedUser, setSelectedUser] = useState(null);
  const [roleChange, setRoleChange] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          phone_number,
          role,
          lga_location,
          verification_status,
          farm_name,
          farm_location,
          farm_size,
          farm_type,
          business_name,
          business_address,
          created_at,
          updated_at
        `
        )
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  const requestRoleChange = (user, newRole) => {
    if (!user || user.role === newRole) {
      return;
    }

    // Protect existing admin accounts.
    if (user.role === 'admin') {
      toast.error(
        'Admin role cannot be changed from this interface.'
      );
      return;
    }

    setRoleChange({
      user,
      newRole,
    });
  };

  const handleRoleChange = async () => {
    if (!roleChange) {
      return;
    }

    const { user, newRole } = roleChange;

    try {
      setUpdatingId(user.id);

      const { error } = await supabase
        .from('profiles')
        .update({
          role: newRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        throw error;
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? {
                ...currentUser,
                role: newRole,
              }
            : currentUser
        )
      );

      toast.success(
        `${user.full_name || 'User'} is now a ${formatRole(
          newRole
        )}.`
      );

      setRoleChange(null);

      if (selectedUser?.id === user.id) {
        setSelectedUser((currentUser) => ({
          ...currentUser,
          role: newRole,
        }));
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(
        error?.message || 'Failed to update user role.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const role = user.role || '';
      const verification =
        user.verification_status || 'pending';

      const matchesRole =
        roleFilter === 'all' || role === roleFilter;

      const matchesVerification =
        verificationFilter === 'all' ||
        verification === verificationFilter;

      if (!matchesRole || !matchesVerification) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        user.full_name,
        user.phone_number,
        user.role,
        user.lga_location,
        user.verification_status,
        user.farm_name,
        user.farm_location,
        user.business_name,
        user.business_address,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(search)
        );
    });
  }, [
    users,
    searchTerm,
    roleFilter,
    verificationFilter,
  ]);

  const summary = useMemo(() => {
    return {
      total: users.length,

      buyers: users.filter(
        (user) => user.role === 'buyer'
      ).length,

      producers: users.filter(
        (user) => user.role === 'producer'
      ).length,

      aggregators: users.filter(
        (user) => user.role === 'aggregator'
      ).length,

      admins: users.filter(
        (user) => user.role === 'admin'
      ).length,

      approved: users.filter(
        (user) =>
          user.verification_status === 'approved'
      ).length,

      pending: users.filter(
        (user) =>
          (user.verification_status || 'pending') ===
          'pending'
      ).length,
    };
  }, [users]);

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setVerificationFilter('all');
  };

  const hasFilters =
    Boolean(searchTerm.trim()) ||
    roleFilter !== 'all' ||
    verificationFilter !== 'all';

  return (
    <div className="relative space-y-6 pb-8">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl" />

      <div className="pointer-events-none absolute left-1/3 top-[500px] -z-10 h-48 w-48 rounded-full bg-blue-100/30 blur-3xl" />

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
              <UserCog className="h-4 w-4" />
              Account Management
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              User Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Manage AgroLink accounts, roles, verification
              information, and platform access.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? 'animate-spin' : ''
              }`}
            />

            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          title="Total Users"
          value={summary.total}
          icon={Users}
          iconStyle="bg-slate-100 text-slate-600"
          delay="0ms"
        />

        <SummaryCard
          title="Buyers"
          value={summary.buyers}
          icon={ShoppingCart}
          iconStyle="bg-blue-50 text-blue-600"
          delay="60ms"
        />

        <SummaryCard
          title="Producers"
          value={summary.producers}
          icon={Sprout}
          iconStyle="bg-emerald-50 text-emerald-600"
          delay="120ms"
        />

        <SummaryCard
          title="Aggregators"
          value={summary.aggregators}
          icon={Building2}
          iconStyle="bg-amber-50 text-amber-600"
          delay="180ms"
        />

        <SummaryCard
          title="Admins"
          value={summary.admins}
          icon={ShieldCheck}
          iconStyle="bg-purple-50 text-purple-600"
          delay="240ms"
        />
      </section>

      {/* Information */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

        <div>
          <p className="font-bold">
            Role management
          </p>

          <p className="mt-1 leading-6 text-blue-700/80">
            Role changes affect how an account accesses
            AgroLink. Review the account carefully before
            changing its role.
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by name, phone, farm, business or LGA..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >
            <option value="all">All roles</option>
            <option value="buyer">Buyers</option>
            <option value="producer">Producers</option>
            <option value="aggregator">Aggregators</option>
            <option value="admin">Admins</option>
          </select>

          <select
            value={verificationFilter}
            onChange={(event) =>
              setVerificationFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >
            <option value="all">
              All verification
            </option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Showing{' '}
            <strong className="text-slate-700">
              {filteredUsers.length}
            </strong>{' '}
            of{' '}
            <strong className="text-slate-700">
              {users.length}
            </strong>{' '}
            accounts
          </span>

          <div className="flex flex-wrap gap-3">
            <span>
              Approved:{' '}
              <strong className="text-emerald-600">
                {summary.approved}
              </strong>
            </span>

            <span>
              Pending:{' '}
              <strong className="text-amber-600">
                {summary.pending}
              </strong>
            </span>
          </div>
        </div>
      </section>

      {/* User directory */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingState />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            clearFilters={clearFilters}
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Verification</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user, index) => (
                    <UserTableRow
                      key={user.id}
                      user={user}
                      index={index}
                      updating={updatingId === user.id}
                      onView={() =>
                        setSelectedUser(user)
                      }
                      onRoleChange={(newRole) =>
                        requestRoleChange(
                          user,
                          newRole
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet */}
            <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
              {filteredUsers.map((user, index) => (
                <UserCard
                  key={user.id}
                  user={user}
                  index={index}
                  updating={updatingId === user.id}
                  onView={() =>
                    setSelectedUser(user)
                  }
                  onRoleChange={(newRole) =>
                    requestRoleChange(
                      user,
                      newRole
                    )
                  }
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Details modal */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onRoleChange={(newRole) =>
            requestRoleChange(
              selectedUser,
              newRole
            )
          }
          updating={updatingId === selectedUser.id}
        />
      )}

      {/* Role confirmation */}
      {roleChange && (
        <RoleConfirmationModal
          user={roleChange.user}
          newRole={roleChange.newRole}
          loading={updatingId === roleChange.user.id}
          onCancel={() => {
            if (!updatingId) {
              setRoleChange(null);
            }
          }}
          onConfirm={handleRoleChange}
        />
      )}

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/* --------------------------------------------------
   Summary Card
-------------------------------------------------- */

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  iconStyle,
  delay,
}) => {
  return (
    <div
      className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5"
      style={{
        animation: `fadeUp 0.4s ease-out ${delay} both`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconStyle} transition duration-300 group-hover:scale-105`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-2xl font-black text-slate-900">
          {Number(value || 0).toLocaleString()}
        </span>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
    </div>
  );
};

/* --------------------------------------------------
   User Table Row
-------------------------------------------------- */

const UserTableRow = ({
  user,
  index,
  updating,
  onView,
  onRoleChange,
}) => {
  const isAdmin = user.role === 'admin';

  return (
    <tr
      className="group transition duration-200 hover:bg-slate-50"
      style={{
        animation: `fadeUp 0.35s ease-out ${
          index * 30
        }ms both`,
      }}
    >
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.full_name} />

          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">
              {user.full_name || 'Unnamed User'}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-400">
              {user.phone_number ||
                user.business_name ||
                'AgroLink account'}
            </p>
          </div>
        </div>
      </td>

      <td className="p-4">
        <RoleBadge role={user.role} />
      </td>

      <td className="p-4">
        <div className="flex max-w-[170px] items-start gap-2 text-slate-600">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

          <span className="truncate">
            {user.lga_location || 'Not provided'}
          </span>
        </div>
      </td>

      <td className="p-4">
        <VerificationBadge
          status={user.verification_status}
        />
      </td>

      <td className="p-4 text-xs font-medium text-slate-500">
        {formatDate(user.created_at)}
      </td>

      <td className="p-4">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onView}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            <Eye className="h-3.5 w-3.5" />
            Details
          </button>

          <select
            value={user.role || 'buyer'}
            onChange={(event) =>
              onRoleChange(event.target.value)
            }
            disabled={isAdmin || updating}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="buyer">Buyer</option>
            <option value="producer">Producer</option>
            <option value="aggregator">
              Aggregator
            </option>
          </select>
        </div>

        {updating && (
          <div className="mt-2 flex justify-end">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating...
            </span>
          </div>
        )}
      </td>
    </tr>
  );
};

/* --------------------------------------------------
   User Card
-------------------------------------------------- */

const UserCard = ({
  user,
  index,
  updating,
  onView,
  onRoleChange,
}) => {
  const isAdmin = user.role === 'admin';

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        animation: `fadeUp 0.35s ease-out ${
          index * 40
        }ms both`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={user.full_name} />

          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">
              {user.full_name || 'Unnamed User'}
            </p>

            <p className="mt-0.5 truncate text-xs text-slate-400">
              {user.phone_number ||
                user.business_name ||
                'AgroLink account'}
            </p>
          </div>
        </div>

        <VerificationBadge
          status={user.verification_status}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <InfoItem
          icon={UserCog}
          label="Role"
          value={formatRole(user.role)}
        />

        <InfoItem
          icon={MapPin}
          label="LGA"
          value={user.lga_location}
        />

        <InfoItem
          icon={CalendarDays}
          label="Joined"
          value={formatDate(user.created_at)}
        />

        <InfoItem
          icon={ShieldCheck}
          label="Access"
          value={
            isAdmin ? 'Admin protected' : 'Standard'
          }
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onView}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5" />
          View Details
        </button>

        <select
          value={user.role || 'buyer'}
          onChange={(event) =>
            onRoleChange(event.target.value)
          }
          disabled={isAdmin || updating}
          className="max-w-[145px] flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="buyer">Buyer</option>
          <option value="producer">Producer</option>
          <option value="aggregator">
            Aggregator
          </option>
        </select>
      </div>
    </div>
  );
};

/* --------------------------------------------------
   User Details Modal
-------------------------------------------------- */

const UserDetailsModal = ({
  user,
  onClose,
  onRoleChange,
  updating,
}) => {
  const isAdmin = user.role === 'admin';

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={user.full_name} />

          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-slate-900">
              {user.full_name || 'Unnamed User'}
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <RoleBadge role={user.role} />

              <VerificationBadge
                status={user.verification_status}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={updating}
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="max-h-[65vh] overflow-y-auto p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem
            icon={UserCog}
            label="Role"
            value={formatRole(user.role)}
          />

          <DetailItem
            icon={ShieldCheck}
            label="Verification"
            value={formatRole(
              user.verification_status ||
                'pending'
            )}
          />

          <DetailItem
            icon={MapPin}
            label="LGA"
            value={user.lga_location}
          />

          <DetailItem
            icon={CalendarDays}
            label="Joined"
            value={formatDate(user.created_at)}
          />

          <DetailItem
            icon={Sprout}
            label="Farm name"
            value={user.farm_name}
          />

          <DetailItem
            icon={MapPin}
            label="Farm location"
            value={user.farm_location}
          />

          <DetailItem
            icon={Sprout}
            label="Farm size"
            value={user.farm_size}
          />

          <DetailItem
            icon={Sprout}
            label="Farm type"
            value={user.farm_type}
          />

          <DetailItem
            icon={Building2}
            label="Business name"
            value={user.business_name}
          />

          <DetailItem
            icon={MapPin}
            label="Business address"
            value={user.business_address}
          />

          <DetailItem
            icon={UserCog}
            label="Phone number"
            value={user.phone_number}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-xs leading-5 text-slate-400">
          Admin accounts are protected from role changes
          in this interface.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
          >
            Close
          </button>

          {!isAdmin && (
            <select
              value={user.role || 'buyer'}
              onChange={(event) =>
                onRoleChange(event.target.value)
              }
              disabled={updating}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 disabled:opacity-50"
            >
              <option value="buyer">Buyer</option>
              <option value="producer">Producer</option>
              <option value="aggregator">
                Aggregator
              </option>
            </select>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

/* --------------------------------------------------
   Role Confirmation Modal
-------------------------------------------------- */

const RoleConfirmationModal = ({
  user,
  newRole,
  loading,
  onCancel,
  onConfirm,
}) => {
  return (
    <ModalShell onClose={onCancel}>
      <div className="p-5 sm:p-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <UserCog className="h-7 w-7" />
        </div>

        <div className="mt-5 text-center">
          <h2 className="text-lg font-black text-slate-900">
            Change user role?
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            You are about to change{' '}
            <strong className="text-slate-700">
              {user.full_name || "this user's"}
            </strong>{' '}
            role to{' '}
            <strong className="text-emerald-700">
              {formatRole(newRole)}
            </strong>
            .
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            This may change which areas of AgroLink the
            account can access.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {loading
              ? 'Updating...'
              : 'Confirm Role Change'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

/* --------------------------------------------------
   Verification Badge
-------------------------------------------------- */

const VerificationBadge = ({ status }) => {
  const currentStatus = status || 'pending';

  const styles = {
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-amber-100 text-amber-800',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        styles[currentStatus] || styles.pending
      }`}
    >
      {currentStatus === 'approved' ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <ShieldCheck className="h-3 w-3" />
      )}

      {currentStatus}
    </span>
  );
};

/* --------------------------------------------------
   Role Badge
-------------------------------------------------- */

const RoleBadge = ({ role }) => {
  const styles = {
    admin:
      'bg-purple-50 text-purple-700 border-purple-200',
    producer:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
    aggregator:
      'bg-amber-50 text-amber-700 border-amber-200',
    buyer:
      'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <span
      className={`inline-flex rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ${
        styles[role] ||
        'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      {formatRole(role)}
    </span>
  );
};

/* --------------------------------------------------
   Avatar
-------------------------------------------------- */

const Avatar = ({ name }) => {
  const initials = String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join('');

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-black text-white shadow-sm">
      {initials || 'U'}
    </div>
  );
};

/* --------------------------------------------------
   Info Item
-------------------------------------------------- */

const InfoItem = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>

      <p className="mt-1 truncate text-xs font-semibold text-slate-700">
        {value || 'Not provided'}
      </p>
    </div>
  );
};

/* --------------------------------------------------
   Detail Item
-------------------------------------------------- */

const DetailItem = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>

      <p className="mt-2 break-words text-sm font-semibold text-slate-800">
        {value || 'Not provided'}
      </p>
    </div>
  );
};

/* --------------------------------------------------
   Modal Shell
-------------------------------------------------- */

const ModalShell = ({
  children,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {children}
      </div>
    </div>
  );
};

/* --------------------------------------------------
   Loading
-------------------------------------------------- */

const LoadingState = () => {
  return (
    <div className="space-y-3 p-5 sm:p-6">
      {[1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-2xl border border-slate-100 p-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-100" />

            <div className="flex-1">
              <div className="h-3 w-36 rounded bg-slate-100" />

              <div className="mt-2 h-2.5 w-52 rounded bg-slate-100" />
            </div>

            <div className="hidden h-7 w-20 rounded-full bg-slate-100 sm:block" />

            <div className="hidden h-8 w-28 rounded-xl bg-slate-100 lg:block" />
          </div>
        </div>
      ))}
    </div>
  );
};

/* --------------------------------------------------
   Empty State
-------------------------------------------------- */

const EmptyState = ({
  hasFilters,
  clearFilters,
}) => {
  return (
    <div className="p-10 text-center sm:p-14">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Users className="h-7 w-7" />
      </div>

      <h2 className="mt-4 font-black text-slate-800">
        {hasFilters
          ? 'No matching users'
          : 'No users found'}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? 'Try changing your search or filters.'
          : 'Registered AgroLink accounts will appear here.'}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700"
        >
          Clear filters
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */

const formatRole = (role) => {
  if (!role) {
    return 'Unknown';
  }

  return (
    role.charAt(0).toUpperCase() +
    role.slice(1)
  );
};

const formatDate = (date) => {
  if (!date) {
    return 'Not available';
  }

  return new Date(date).toLocaleDateString(
    'en-NG',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );
};
