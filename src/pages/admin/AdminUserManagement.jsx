import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Users,
  UserCheck,
  UserCog,
  ShieldCheck,
  MapPin,
  Phone,
  Building2,
  Sprout,
  X,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');

  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
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
        `)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.full_name?.toLowerCase().includes(search) ||
        user.phone_number?.toLowerCase().includes(search) ||
        user.role?.toLowerCase().includes(search) ||
        user.lga_location?.toLowerCase().includes(search) ||
        user.farm_name?.toLowerCase().includes(search) ||
        user.farm_location?.toLowerCase().includes(search) ||
        user.business_name?.toLowerCase().includes(search) ||
        user.business_address?.toLowerCase().includes(search);

      const matchesRole =
        roleFilter === 'all' || user.role === roleFilter;

      const matchesVerification =
        verificationFilter === 'all' ||
        user.verification_status === verificationFilter;

      return matchesSearch && matchesRole && matchesVerification;
    });
  }, [users, searchTerm, roleFilter, verificationFilter]);

  const statistics = useMemo(() => {
    return {
      total: users.length,
      buyers: users.filter((user) => user.role === 'buyer').length,
      producers: users.filter((user) => user.role === 'producer').length,
      aggregators: users.filter((user) => user.role === 'aggregator').length,
      admins: users.filter((user) => user.role === 'admin').length,
    };
  }, [users]);

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      producer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      aggregator: 'bg-blue-100 text-blue-700 border-blue-200',
      buyer: 'bg-amber-100 text-amber-700 border-amber-200',
    };

    const labels = {
      admin: 'Admin',
      producer: 'Producer',
      aggregator: 'Aggregator',
      buyer: 'Buyer',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
          styles[role] || 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
      >
        {labels[role] || role || 'Unknown'}
      </span>
    );
  };

  const getVerificationBadge = (status) => {
    const styles = {
      approved: 'bg-emerald-100 text-emerald-700',
      pending: 'bg-amber-100 text-amber-700',
      rejected: 'bg-red-100 text-red-700',
    };

    const labels = {
      approved: 'Approved',
      pending: 'Pending',
      rejected: 'Rejected',
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
          styles[status] || 'bg-slate-100 text-slate-700'
        }`}
      >
        {labels[status] || status || 'Unknown'}
      </span>
    );
  };

  const openUserDetails = (user) => {
    setSelectedUser(user);
    setShowDetails(true);
    setError('');
    setSuccess('');
  };

  const closeUserDetails = () => {
    setSelectedUser(null);
    setShowDetails(false);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';

    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setVerificationFilter('all');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                User Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                View and manage AgroLink user accounts and profiles.
              </p>
            </div>

            <button
              onClick={fetchUsers}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Refresh Users
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Something went wrong</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* Statistics */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total Users
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {statistics.total}
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Buyers
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {statistics.buyers}
                </p>
              </div>
              <div className="rounded-xl bg-amber-100 p-3">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Producers
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {statistics.producers}
                </p>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3">
                <Sprout className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Aggregators
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {statistics.aggregators}
                </p>
              </div>
              <div className="rounded-xl bg-blue-100 p-3">
                <UserCheck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Admins
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {statistics.admins}
                </p>
              </div>
              <div className="rounded-xl bg-purple-100 p-3">
                <ShieldCheck className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_200px_200px_auto]">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, phone, role, LGA, farm or business..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            {/* Role filter */}
            <div className="relative">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">All Roles</option>
                <option value="buyer">Buyer</option>
                <option value="producer">Producer</option>
                <option value="aggregator">Aggregator</option>
                <option value="admin">Admin</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Verification filter */}
            <div className="relative">
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-medium text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">All Verification</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-700">
              {filteredUsers.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-700">
              {users.length}
            </span>{' '}
            users
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                <p className="text-sm font-semibold text-slate-600">
                  Loading users...
                </p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 rounded-full bg-slate-100 p-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>

              <h3 className="text-lg font-bold text-slate-800">
                No users found
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500">
                Try changing your search term or filters.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        User
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Role
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Location
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Verification
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Joined
                      </th>
                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {user.full_name || 'Unnamed User'}
                            </p>

                            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <Phone className="h-3.5 w-3.5" />
                              {user.phone_number || 'No phone number'}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {getRoleBadge(user.role)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {user.lga_location || 'Not provided'}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {getVerificationBadge(user.verification_status)}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(user.created_at)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openUserDetails(user)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            <UserCog className="h-4 w-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/tablet cards */}
              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900">
                          {user.full_name || 'Unnamed User'}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {user.phone_number || 'No phone number'}
                        </p>
                      </div>

                      {getRoleBadge(user.role)}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">Location</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {user.lga_location || 'Not provided'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">Verification</p>
                        <div className="mt-1">
                          {getVerificationBadge(user.verification_status)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openUserDetails(user)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <UserCog className="h-4 w-4" />
                      View User Details
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Role management notice */}
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <h3 className="font-semibold text-blue-900">
                Role Changes
              </h3>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Existing users who want to become aggregators will submit a
                role request. Their current role will remain unchanged until
                an administrator reviews and approves the request.
              </p>

              <p className="mt-2 text-sm font-medium text-blue-900">
                Role requests will be handled through a dedicated admin
                workflow.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showDetails && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  User Details
                </h2>
                <p className="text-sm text-slate-500">
                  Complete account profile information
                </p>
              </div>

              <button
                onClick={closeUserDetails}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="max-h-[calc(90vh-150px)] overflow-y-auto p-5">
              {/* Profile heading */}
              <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedUser.full_name || 'Unnamed User'}
                  </h3>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {getRoleBadge(selectedUser.role)}
                    {getVerificationBadge(
                      selectedUser.verification_status
                    )}
                  </div>
                </div>

                <div className="text-sm text-slate-500">
                  Joined {formatDate(selectedUser.created_at)}
                </div>
              </div>

              {/* Basic information */}
              <div className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                  <UserCog className="h-4 w-4" />
                  Basic Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">Full Name</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedUser.full_name || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Phone Number</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedUser.phone_number || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">LGA Location</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedUser.lga_location || 'Not provided'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Account Role</p>
                    <div className="mt-1">
                      {getRoleBadge(selectedUser.role)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Producer information */}
              {selectedUser.role === 'producer' && (
                <div className="mb-6">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                    <Sprout className="h-4 w-4" />
                    Producer Information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-400">Farm Name</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedUser.farm_name || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Farm Location</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedUser.farm_location || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Farm Size</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedUser.farm_size || 'Not provided'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Farm Type</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedUser.farm_type || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Business information */}
              {selectedUser.business_name && (
                <div className="mb-6">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                    <Building2 className="h-4 w-4" />
                    Business Information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-400">
                        Business Name
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedUser.business_name}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Business Address
                      </p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {selectedUser.business_address || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Aggregator information */}
              {selectedUser.role === 'aggregator' && (
                <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                    <div>
                      <h3 className="font-bold text-blue-900">
                        Aggregator Account
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-blue-800">
                        This account is registered as an AgroLink aggregator
                        and can represent and coordinate producers after
                        verification.
                      </p>

                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                          Verification Status
                        </p>

                        <div className="mt-1">
                          {getVerificationBadge(
                            selectedUser.verification_status
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account information */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                  <ShieldCheck className="h-4 w-4" />
                  Account Information
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400">
                      Verification Status
                    </p>
                    <div className="mt-1">
                      {getVerificationBadge(
                        selectedUser.verification_status
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Created</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {formatDate(selectedUser.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Last Updated
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {formatDate(selectedUser.updated_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">User ID</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-700">
                      {selectedUser.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  Role changes for existing users will be handled through the
                  dedicated role request and approval workflow.
                </p>

                <button
                  onClick={closeUserDetails}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;