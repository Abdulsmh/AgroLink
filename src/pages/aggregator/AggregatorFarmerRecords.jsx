
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Sprout,
  MapPin,
  Phone,
  CheckCircle2,
  Clock3,
  XCircle,
  Ban,
  AlertCircle,
  FileText,
  Filter,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  revoked: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS_ICONS = {
  approved: CheckCircle2,
  pending: Clock3,
  rejected: XCircle,
  revoked: Ban,
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All records' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'revoked', label: 'Revoked' },
];

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase();
  const Icon = STATUS_ICONS[normalized] || AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ${
        STATUS_STYLES[normalized] ||
        'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      <Icon size={13} />
      {normalized || 'Unknown'}
    </span>
  );
}

function getErrorMessage(error) {
  const message = String(error?.message || '').trim();

  if (
    error?.code === '42501' ||
    message.toLowerCase().includes('permission denied')
  ) {
    return 'You do not have permission to view these farmer records.';
  }

  return message || 'Could not load farmer records. Please try again.';
}

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function FarmerCard({ farmer }) {
  const name = farmer.full_name || 'Unnamed producer';
  const location = [
    farmer.farm_location,
    farmer.lga_location,
  ].filter(Boolean).join(' · ');

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4 border-b border-slate-100 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Sprout size={24} />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words font-bold text-slate-900">
            {name}
          </h3>

          {farmer.farm_name && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <Sprout size={14} className="shrink-0" />
              <span className="break-words">{farmer.farm_name}</span>
            </p>
          )}

          <div className="mt-3">
            <StatusBadge status={farmer.status} />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start gap-2.5 text-sm text-slate-600">
          <MapPin size={17} className="mt-0.5 shrink-0 text-slate-400" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Farm location
            </p>
            <p className="mt-1 break-words">
              {location || 'Location not provided'}
            </p>
          </div>
        </div>

        {farmer.phone_number && (
          <div className="flex items-start gap-2.5 text-sm text-slate-600">
            <Phone size={16} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Phone number
              </p>
              <p className="mt-1 break-all">{farmer.phone_number}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-2.5 text-sm text-slate-600">
          <FileText size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Relationship requested
            </p>
            <p className="mt-1">{formatDate(farmer.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
        <p className="text-xs leading-5 text-slate-500">
          Farmer record is displayed according to your relationship access.
        </p>
      </div>
    </article>
  );
}

export default function AggregatorFarmerRecords() {
  const { user, userProfile } = useAuth();

  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isApproved =
    userProfile?.role === 'aggregator' &&
    userProfile?.verification_status === 'approved';

  const loadRecords = useCallback(async () => {
    if (!user?.id || !isApproved) {
      setRecords([]);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: requestError } = await supabase.rpc(
        'list_aggregator_farmer_relationships'
      );

      if (requestError) throw requestError;

      setRecords(Array.isArray(data) ? data : []);
    } catch (requestError) {
      console.error('Could not load aggregator farmer records:', requestError);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [user?.id, isApproved]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const counts = useMemo(() => {
    const result = {
      all: records.length,
      approved: 0,
      pending: 0,
      rejected: 0,
      revoked: 0,
    };

    records.forEach((record) => {
      const status = String(record.status || '').toLowerCase();

      if (Object.prototype.hasOwnProperty.call(result, status)) {
        result[status] += 1;
      }
    });

    return result;
  }, [records]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return records.filter((record) => {
      const status = String(record.status || '').toLowerCase();

      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      const searchableText = [
        record.full_name,
        record.farm_name,
        record.farm_location,
        record.lga_location,
        record.phone_number,
        record.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return !term || searchableText.includes(term);
    });
  }, [records, searchTerm, statusFilter]);

  if (!isApproved) {
    return (
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <AlertCircle className="mb-4 text-amber-600" size={34} />

          <h1 className="text-xl font-bold text-slate-900">
            Aggregator approval required
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Farmer records are available after an administrator approves
            your aggregator account. You can still access your profile
            and verification pages while waiting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6 lg:p-8">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Aggregator workspace
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Farmer Records
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            View farmers connected to your AgroLink aggregator account,
            review their relationship status, and find records quickly.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRecords}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh records
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Total records
            </p>
            <Users size={21} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {counts.all}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            All relationship statuses
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Approved farmers
            </p>
            <CheckCircle2 size={21} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {counts.approved}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Active relationships
          </p>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Pending requests
            </p>
            <Clock3 size={21} className="text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-700">
            {counts.pending}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Awaiting a decision
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Other statuses
            </p>
            <Ban size={21} className="text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {counts.rejected + counts.revoked}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Rejected or revoked
          </p>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Could not load farmer records
            </p>
            <p className="mt-1 break-words">{error}</p>
            <button
              type="button"
              onClick={loadRecords}
              disabled={loading}
              className="mt-2 font-semibold underline disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Search and filter */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h2 className="font-bold text-slate-900">
            Search and filter records
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Search by farmer name, farm name, location, phone number, or status.
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search farmer records..."
              aria-label="Search farmer records"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div className="relative lg:w-56">
            <Filter
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter farmer records by relationship status"
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {filteredRecords.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800">
              {records.length}
            </span>{' '}
            records
          </p>

          {(searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Records list */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <UserRound size={20} className="text-emerald-700" />
          <h2 className="font-bold text-slate-900">
            Connected farmer records
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-12 text-sm text-slate-500">
            <RefreshCw size={19} className="animate-spin" />
            Loading farmer records...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <AlertCircle className="mx-auto text-red-500" size={30} />
            <p className="mt-3 font-semibold text-slate-800">
              Records are temporarily unavailable
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Retry loading your farmer records to continue.
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FileText size={27} />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              {records.length === 0
                ? 'No farmer records yet'
                : 'No matching records'}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {records.length === 0
                ? 'Once you request farmer relationships, their records and statuses will appear here.'
                : 'Try changing your search terms or selecting a different status filter.'}
            </p>

            {records.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRecords.map((farmer, index) => (
              <FarmerCard
                key={
                  farmer.relationship_id ||
                  `${farmer.farmer_id || farmer.full_name || 'farmer'}-${index}`
                }
                farmer={farmer}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
