import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  RefreshCw,
  MapPin,
  Building2,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  revoked: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS_ICONS = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: XCircle,
  revoked: XCircle,
};

function getErrorMessage(error, fallback) {
  return String(error?.message || '').trim() || fallback;
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || 'unknown').toLowerCase();
  const Icon = STATUS_ICONS[normalizedStatus] || AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${
        STATUS_STYLES[normalizedStatus] ||
        'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      <Icon size={14} />
      {normalizedStatus}
    </span>
  );
}

function RequestCard({
  request,
  busy,
  onApprove,
  onReject,
}) {
  const createdDate = request.created_at
    ? new Date(request.created_at).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Date unavailable';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Building2 size={27} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="break-words text-lg font-bold text-slate-900">
                  {request.aggregator_name || 'Aggregator'}
                </h3>

                {request.business_name && (
                  <p className="mt-1 break-words text-sm text-slate-500">
                    {request.business_name}
                  </p>
                )}
              </div>

              <div className="self-start">
                <StatusBadge status={request.status} />
              </div>
            </div>

            {request.lga_location && (
              <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={16} className="shrink-0 text-emerald-600" />
                <span>{request.lga_location}</span>
              </p>
            )}

            <p className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <Clock3 size={14} />
              Requested on {createdDate}
            </p>
          </div>
        </div>

        {request.status === 'pending' && (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onReject(request)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <XCircle size={16} />
              )}
              Reject request
            </button>

            <button
              type="button"
              onClick={() => onApprove(request)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Approve request
            </button>
          </div>
        )}

        {request.status === 'approved' && (
          <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-emerald-700">
            <ShieldCheck size={17} />
            <span>
              This aggregator relationship has been approved.
            </span>
          </div>
        )}

        {request.status === 'rejected' && (
          <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
            <XCircle size={17} />
            <span>You rejected this relationship request.</span>
          </div>
        )}
      </div>
    </article>
  );
}

export default function ProducerAggregatorRequests() {
  const { user, userProfile } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState('all');

  const isApprovedProducer =
    userProfile?.role === 'producer' &&
    userProfile?.verification_status === 'approved';

  const loadRequests = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id || !isApprovedProducer) {
      setRequests([]);
      setErrorMessage('');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      const { data, error } = await supabase.rpc(
        'list_farmer_aggregator_relationships'
      );

      if (error) throw error;

      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load aggregator requests:', error);

      setErrorMessage(
        getErrorMessage(
          error,
          'Unable to load aggregator requests. Please try again.'
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isApprovedProducer]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleDecision = async (request, decision) => {
    if (!isApprovedProducer) {
      toast.error('Only approved producers can manage these requests.');
      return;
    }

    if (!request?.relationship_id || request.status !== 'pending') {
      toast.error('This request is no longer pending. Refresh the page.');
      return;
    }

    if (processingId !== null) return;

    setProcessingId(request.relationship_id);

    try {
      const functionName =
        decision === 'approve'
          ? 'approve_aggregator_relationship'
          : 'reject_aggregator_relationship';

      const { error } = await supabase.rpc(functionName, {
        target_relationship_id: request.relationship_id,
      });

      if (error) throw error;

      // Update the interface only after the database confirms success.
      const nextStatus =
        decision === 'approve' ? 'approved' : 'rejected';

      setRequests((current) =>
        current.map((item) =>
          item.relationship_id === request.relationship_id
            ? { ...item, status: nextStatus }
            : item
        )
      );

      toast.success(
        decision === 'approve'
          ? 'Aggregator request approved successfully.'
          : 'Aggregator request rejected.'
      );

      // Reload authoritative relationship data from Supabase.
      await loadRequests({ silent: true });
    } catch (error) {
      console.error(
        `Failed to ${decision} aggregator request:`,
        error
      );

      toast.error(
        getErrorMessage(
          error,
          `Could not ${decision} the request. Please refresh and try again.`
        )
      );
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter(
    (request) => request.status === 'pending'
  ).length;

  const approvedCount = requests.filter(
    (request) => request.status === 'approved'
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.status === 'rejected'
  ).length;

  const visibleRequests = requests.filter((request) => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  if (!isApprovedProducer) {
    return (
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <AlertCircle size={36} className="text-amber-600" />

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Producer approval required
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Aggregator relationship requests become available after
            your producer account has been approved by an administrator.
            Check your verification status for updates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Producer workspace
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Aggregator Requests
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review requests from aggregators who want to work with your
            farm. Approve trusted partners or reject requests you do
            not wish to accept.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadRequests({ silent: true })}
          disabled={loading || refreshing || processingId !== null}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />
          Refresh requests
        </button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Total requests
            </p>
            <Users size={21} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {requests.length}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">
              Awaiting response
            </p>
            <Clock3 size={21} className="text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">
              Approved
            </p>
            <CheckCircle2 size={21} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Rejected
            </p>
            <XCircle size={21} className="text-slate-500" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {rejectedCount}
          </p>
        </div>
      </div>

      {/* Load errors */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Unable to load aggregator requests
            </p>
            <p className="mt-1 break-words">{errorMessage}</p>

            <button
              type="button"
              onClick={() => loadRequests()}
              disabled={loading}
              className="mt-2 font-semibold underline disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Incoming requests
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Review each aggregator's request and current status.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filter === option.value
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
                {option.value === 'pending' && pendingCount > 0
                  ? ` (${pendingCount})`
                  : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center">
            <RefreshCw
              size={30}
              className="animate-spin text-emerald-600"
            />
            <p className="mt-4 font-semibold text-slate-800">
              Loading aggregator requests...
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Retrieving your relationship requests.
            </p>
          </div>
        ) : !errorMessage && visibleRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox size={29} />
            </div>

            <h3 className="mt-4 font-bold text-slate-900">
              {filter === 'pending'
                ? 'No pending requests'
                : filter === 'approved'
                  ? 'No approved relationships yet'
                  : filter === 'rejected'
                    ? 'No rejected requests'
                    : 'No aggregator requests yet'}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {filter === 'pending'
                ? 'New requests will appear here when aggregators ask to connect with your farm.'
                : 'Requests and their statuses will appear here as your aggregator relationships develop.'}
            </p>

            {filter !== 'all' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="mt-4 text-sm font-semibold text-emerald-700 hover:underline"
              >
                View all requests
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visibleRequests.map((request) => (
              <RequestCard
                key={request.relationship_id}
                request={request}
                busy={processingId === request.relationship_id}
                onApprove={(item) => handleDecision(item, 'approve')}
                onReject={(item) => handleDecision(item, 'reject')}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
