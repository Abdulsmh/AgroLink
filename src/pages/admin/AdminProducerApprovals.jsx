import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  MapPin,
  ShieldCheck,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Search,
  Users,
  Clock3,
  UserCheck,
  Phone,
  Building2,
  Sprout,
  ChevronRight,
  X,
  CalendarDays,
  BadgeCheck,
  Eye,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { toast } from 'react-hot-toast';

export const AdminProducerApprovals = () => {
  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProducer, setSelectedProducer] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    fetchProducers();
  }, []);

  const fetchProducers = async () => {
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
          farm_name,
          farm_location,
          farm_size,
          farm_type,
          business_name,
          business_address,
          verification_status,
          created_at
        `
        )
        .in('role', ['producer', 'aggregator'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProducers(data || []);
    } catch (error) {
      console.error('Error loading producers:', error);
      toast.error('Failed to load producer verification requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      setUpdatingId(userId);

      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(
        `Account ${
          newStatus === 'approved' ? 'approved' : 'rejected'
        } successfully.`
      );

      setConfirmation(null);
      setSelectedProducer(null);

      await fetchProducers();
    } catch (error) {
      console.error('Error updating producer status:', error);
      toast.error('Failed to update account status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return producers.filter((producer) => {
      const status = producer.verification_status || 'pending';

      const matchesStatus =
        statusFilter === 'all' || status === statusFilter;

      if (!matchesStatus) return false;

      if (!search) return true;

      return [
        producer.full_name,
        producer.phone_number,
        producer.role,
        producer.lga_location,
        producer.farm_name,
        producer.business_name,
        producer.farm_location,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(search)
        );
    });
  }, [producers, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: producers.length,
      pending: producers.filter(
        (producer) =>
          (producer.verification_status || 'pending') === 'pending'
      ).length,
      approved: producers.filter(
        (producer) =>
          producer.verification_status === 'approved'
      ).length,
      rejected: producers.filter(
        (producer) =>
          producer.verification_status === 'rejected'
      ).length,
    };
  }, [producers]);

  const requestStatusChange = (producer, newStatus) => {
    setConfirmation({
      producer,
      newStatus,
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  return (
    <div className="relative space-y-6 pb-8">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl" />

      <div className="pointer-events-none absolute left-1/3 top-96 -z-10 h-48 w-48 rounded-full bg-amber-100/30 blur-3xl" />

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
              Verification Management
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Producer Approvals
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review producer and aggregator accounts, check their
              submitted information, and manage verification status.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchProducers}
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

      {/* Summary */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          title="Total"
          value={summary.total}
          icon={Users}
          iconStyle="bg-slate-100 text-slate-600"
          delay="0ms"
        />

        <SummaryCard
          title="Pending"
          value={summary.pending}
          icon={Clock3}
          iconStyle="bg-amber-50 text-amber-600"
          delay="70ms"
        />

        <SummaryCard
          title="Approved"
          value={summary.approved}
          icon={UserCheck}
          iconStyle="bg-emerald-50 text-emerald-600"
          delay="140ms"
        />

        <SummaryCard
          title="Rejected"
          value={summary.rejected}
          icon={XCircle}
          iconStyle="bg-red-50 text-red-600"
          delay="210ms"
        />
      </section>

      {/* Information */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

        <div>
          <p className="font-bold">Verification control</p>

          <p className="mt-1 leading-6 text-blue-700/80">
            Approving or rejecting an account updates its verification
            status in the producer profile.
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
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
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {(searchTerm || statusFilter !== 'all') && (
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

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>
            Showing{' '}
            <strong className="text-slate-700">
              {filteredProducers.length}
            </strong>{' '}
            of{' '}
            <strong className="text-slate-700">
              {producers.length}
            </strong>{' '}
            accounts
          </span>

          {statusFilter !== 'all' && (
            <span className="font-semibold capitalize">
              Filter: {statusFilter}
            </span>
          )}
        </div>
      </section>

      {/* Producer list */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <LoadingState />
        ) : filteredProducers.length === 0 ? (
          <EmptyState
            hasFilters={Boolean(
              searchTerm || statusFilter !== 'all'
            )}
            clearFilters={clearFilters}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <th className="p-4">Producer</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProducers.map((producer, index) => {
                    const status =
                      producer.verification_status || 'pending';

                    const isUpdating =
                      updatingId === producer.id;

                    return (
                      <tr
                        key={producer.id}
                        className="group transition duration-200 hover:bg-slate-50"
                        style={{
                          animation: `fadeUp 0.35s ease-out ${
                            index * 35
                          }ms both`,
                        }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={producer.full_name}
                            />

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-900">
                                {producer.full_name ||
                                  'Unnamed User'}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {producer.business_name ||
                                  producer.farm_name ||
                                  producer.phone_number ||
                                  'Producer account'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex max-w-[180px] items-start gap-2 text-slate-600">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                            <span className="truncate">
                              {producer.lga_location ||
                                producer.farm_location ||
                                producer.business_address ||
                                'Kano State'}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          <RoleBadge role={producer.role} />
                        </td>

                        <td className="p-4">
                          <StatusBadge status={status} />
                        </td>

                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedProducer(producer)
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Details
                            </button>

                            <ActionButton
                              type="approve"
                              disabled={
                                isUpdating ||
                                status === 'approved'
                              }
                              onClick={() =>
                                requestStatusChange(
                                  producer,
                                  'approved'
                                )
                              }
                            />

                            <ActionButton
                              type="reject"
                              disabled={
                                isUpdating ||
                                status === 'rejected'
                              }
                              onClick={() =>
                                requestStatusChange(
                                  producer,
                                  'rejected'
                                )
                              }
                            />
                          </div>

                          {isUpdating && (
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
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet cards */}
            <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
              {filteredProducers.map((producer, index) => {
                const status =
                  producer.verification_status || 'pending';

                const isUpdating =
                  updatingId === producer.id;

                return (
                  <div
                    key={producer.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      animation: `fadeUp 0.35s ease-out ${
                        index * 40
                      }ms both`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          name={producer.full_name}
                        />

                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">
                            {producer.full_name ||
                              'Unnamed User'}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {producer.business_name ||
                              producer.farm_name ||
                              producer.phone_number ||
                              'Producer account'}
                          </p>
                        </div>
                      </div>

                      <StatusBadge status={status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoItem
                        icon={MapPin}
                        label="Location"
                        value={
                          producer.lga_location ||
                          producer.farm_location ||
                          producer.business_address ||
                          'Kano State'
                        }
                      />

                      <InfoItem
                        icon={ShieldCheck}
                        label="Role"
                        value={formatRole(producer.role)}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedProducer(producer)
                        }
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:flex-none"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </button>

                      <ActionButton
                        type="approve"
                        disabled={
                          isUpdating ||
                          status === 'approved'
                        }
                        onClick={() =>
                          requestStatusChange(
                            producer,
                            'approved'
                          )
                        }
                        fullWidth
                      />

                      <ActionButton
                        type="reject"
                        disabled={
                          isUpdating ||
                          status === 'rejected'
                        }
                        onClick={() =>
                          requestStatusChange(
                            producer,
                            'rejected'
                          )
                        }
                        fullWidth
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Detail modal */}
      {selectedProducer && (
        <ProducerDetailsModal
          producer={selectedProducer}
          onClose={() => setSelectedProducer(null)}
          onApprove={() =>
            requestStatusChange(selectedProducer, 'approved')
          }
          onReject={() =>
            requestStatusChange(selectedProducer, 'rejected')
          }
          updating={updatingId === selectedProducer.id}
        />
      )}

      {/* Confirmation modal */}
      {confirmation && (
        <ConfirmationModal
          producer={confirmation.producer}
          newStatus={confirmation.newStatus}
          loading={
            updatingId === confirmation.producer.id
          }
          onCancel={() => {
            if (!updatingId) {
              setConfirmation(null);
            }
          }}
          onConfirm={() =>
            handleStatusUpdate(
              confirmation.producer.id,
              confirmation.newStatus
            )
          }
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
};

/* ---------------------------------------------
   Summary Card
--------------------------------------------- */

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
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconStyle} transition group-hover:scale-105`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <span className="text-2xl font-black text-slate-900">
          {value.toLocaleString()}
        </span>
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
        {title}
      </p>
    </div>
  );
};

/* ---------------------------------------------
   Status Badge
--------------------------------------------- */

const StatusBadge = ({ status }) => {
  const styles = {
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-amber-100 text-amber-800',
  };

  const icons = {
    approved: CheckCircle,
    rejected: XCircle,
    pending: Clock3,
  };

  const Icon = icons[status] || Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        styles[status] || styles.pending
      }`}
    >
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
};

/* ---------------------------------------------
   Role Badge
--------------------------------------------- */

const RoleBadge = ({ role }) => {
  return (
    <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold capitalize text-slate-600">
      {formatRole(role)}
    </span>
  );
};

/* ---------------------------------------------
   Action Button
--------------------------------------------- */

const ActionButton = ({
  type,
  disabled,
  onClick,
  fullWidth = false,
}) => {
  const isApprove = type === 'approve';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex ${
        fullWidth ? 'flex-1' : ''
      } items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
        isApprove
          ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
          : 'bg-red-50 text-red-600 hover:bg-red-100'
      }`}
    >
      {isApprove ? (
        <CheckCircle className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}

      {isApprove ? 'Approve' : 'Reject'}
    </button>
  );
};

/* ---------------------------------------------
   Avatar
--------------------------------------------- */

const Avatar = ({ name }) => {
  const initials = String(name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-xs font-black text-white shadow-sm">
      {initials || 'U'}
    </div>
  );
};

/* ---------------------------------------------
   Info Item
--------------------------------------------- */

const InfoItem = ({ icon: Icon, label, value }) => {
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

/* ---------------------------------------------
   Producer Details Modal
--------------------------------------------- */

const ProducerDetailsModal = ({
  producer,
  onClose,
  onApprove,
  onReject,
  updating,
}) => {
  const status =
    producer.verification_status || 'pending';

  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={producer.full_name} />

          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-slate-900">
              {producer.full_name || 'Unnamed User'}
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <RoleBadge role={producer.role} />
              <StatusBadge status={status} />
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
            icon={Phone}
            label="Phone number"
            value={producer.phone_number}
          />

          <DetailItem
            icon={MapPin}
            label="LGA"
            value={producer.lga_location}
          />

          <DetailItem
            icon={Sprout}
            label="Farm name"
            value={producer.farm_name}
          />

          <DetailItem
            icon={MapPin}
            label="Farm location"
            value={producer.farm_location}
          />

          <DetailItem
            icon={Sprout}
            label="Farm size"
            value={producer.farm_size}
          />

          <DetailItem
            icon={Sprout}
            label="Farm type"
            value={producer.farm_type}
          />

          <DetailItem
            icon={Building2}
            label="Business name"
            value={producer.business_name}
          />

          <DetailItem
            icon={MapPin}
            label="Business address"
            value={producer.business_address}
          />

          <DetailItem
            icon={CalendarDays}
            label="Registered"
            value={formatDate(producer.created_at)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end sm:p-6">
        <button
          type="button"
          onClick={onClose}
          disabled={updating}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
        >
          Close
        </button>

        <ActionButton
          type="reject"
          disabled={updating || status === 'rejected'}
          onClick={onReject}
        />

        <ActionButton
          type="approve"
          disabled={updating || status === 'approved'}
          onClick={onApprove}
        />
      </div>
    </ModalShell>
  );
};

/* ---------------------------------------------
   Detail Item
--------------------------------------------- */

const DetailItem = ({ icon: Icon, label, value }) => {
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

/* ---------------------------------------------
   Confirmation Modal
--------------------------------------------- */

const ConfirmationModal = ({
  producer,
  newStatus,
  loading,
  onCancel,
  onConfirm,
}) => {
  const isApprove = newStatus === 'approved';

  return (
    <ModalShell onClose={onCancel}>
      <div className="p-5 sm:p-6">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
            isApprove
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {isApprove ? (
            <BadgeCheck className="h-7 w-7" />
          ) : (
            <XCircle className="h-7 w-7" />
          )}
        </div>

        <div className="mt-5 text-center">
          <h2 className="text-lg font-black text-slate-900">
            {isApprove
              ? 'Approve this producer?'
              : 'Reject this producer?'}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            You are about to{' '}
            <strong className="text-slate-700">
              {isApprove ? 'approve' : 'reject'}
            </strong>{' '}
            the verification status for{' '}
            <strong className="text-slate-700">
              {producer.full_name || 'this producer'}
            </strong>
            .
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            This action changes the producer's verification status
            on AgroLink.
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
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isApprove
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {loading
              ? 'Updating...'
              : isApprove
              ? 'Yes, Approve'
              : 'Yes, Reject'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

/* ---------------------------------------------
   Modal Shell
--------------------------------------------- */

const ModalShell = ({ children, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
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

/* ---------------------------------------------
   Loading
--------------------------------------------- */

const LoadingState = () => {
  return (
    <div className="p-5 sm:p-6">
      <div className="space-y-4">
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
    </div>
  );
};

/* ---------------------------------------------
   Empty State
--------------------------------------------- */

const EmptyState = ({ hasFilters, clearFilters }) => {
  return (
    <div className="p-10 text-center sm:p-14">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <ShieldCheck className="h-7 w-7" />
      </div>

      <h2 className="mt-4 font-black text-slate-800">
        {hasFilters
          ? 'No matching producers'
          : 'No producer accounts found'}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? 'Try changing your search or status filter.'
          : 'New producer and aggregator registrations will appear here.'}
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

/* ---------------------------------------------
   Helpers
--------------------------------------------- */

const formatRole = (role) => {
  if (!role) return 'Unknown';

  return role.charAt(0).toUpperCase() + role.slice(1);
};

const formatDate = (date) => {
  if (!date) return 'Not available';

  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};
