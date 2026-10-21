
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  MapPin,
  Package,
  RefreshCw,
  Search,
  X,
  XCircle,
  CalendarDays,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  accepted: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-700',
  fulfilled: 'bg-emerald-100 text-emerald-800',
};

const STATUS_ICONS = {
  pending: Clock3,
  accepted: CheckCircle2,
  rejected: XCircle,
  cancelled: XCircle,
  fulfilled: CheckCircle2,
};

const formatDate = (value) => {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not specified';

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatQuantity = (quantity, unit) => {
  const amount = Number(quantity);

  return `${Number.isFinite(amount) ? amount.toLocaleString('en-NG') : quantity} ${unit || ''}`.trim();
};

const StatusBadge = ({ status }) => {
  const normalized = String(status || 'pending').toLowerCase();
  const Icon = STATUS_ICONS[normalized] || Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        STATUS_STYLES[normalized] || STATUS_STYLES.pending
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      </div>

      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const AggregatorBulkRequests = () => {
  const { user, userProfile } = useAuth();

  const [requests, setRequests] = useState([]);
  const [itemsByRequest, setItemsByRequest] = useState({});
  const [buyerNames, setBuyerNames] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const isApproved = userProfile?.verification_status === 'approved';

  const loadRequests = useCallback(async () => {
    if (!user?.id) {
      setRequests([]);
      setItemsByRequest({});
      setBuyerNames({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { data: requestData, error: requestError } = await supabase
        .from('buyer_bulk_requests')
        .select(
          'id, buyer_id, aggregator_id, status, pickup_location, needed_by, notes, created_at, updated_at'
        )
        .eq('aggregator_id', user.id)
        .order('created_at', { ascending: false });

      if (requestError) throw requestError;

      const requestList = requestData || [];
      setRequests(requestList);

      if (requestList.length === 0) {
        setItemsByRequest({});
        setBuyerNames({});
        return;
      }

      const requestIds = requestList.map((request) => request.id);
      const buyerIds = [
        ...new Set(requestList.map((request) => request.buyer_id).filter(Boolean)),
      ];

      const [itemsResult, buyersResult] = await Promise.all([
        supabase
          .from('buyer_bulk_request_items')
          .select(
            'id, request_id, crop_name, quantity, unit, target_price_per_unit, notes, created_at'
          )
          .in('request_id', requestIds)
          .order('created_at', { ascending: true }),

        buyerIds.length
          ? supabase
              .from('profiles')
              .select('id, full_name, business_name')
              .in('id', buyerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (itemsResult.error) throw itemsResult.error;

      const groupedItems = {};

      (itemsResult.data || []).forEach((item) => {
        if (!groupedItems[item.request_id]) {
          groupedItems[item.request_id] = [];
        }

        groupedItems[item.request_id].push(item);
      });

      setItemsByRequest(groupedItems);

      // Profile names are supplementary. The request remains usable
      // even if profile visibility policies prevent this lookup.
      if (buyersResult.error) {
        console.warn('Could not load bulk-request buyer names:', buyersResult.error);
        setBuyerNames({});
      } else {
        const names = {};

        (buyersResult.data || []).forEach((buyer) => {
          names[buyer.id] =
            buyer.business_name || buyer.full_name || 'AgroLink Buyer';
        });

        setBuyerNames(names);
      }
    } catch (error) {
      console.error('Aggregator bulk requests error:', error);
      setErrorMessage(
        error.message || 'Unable to load buyer bulk requests.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`aggregator-bulk-requests-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_bulk_requests',
          filter: `aggregator_id=eq.${user.id}`,
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadRequests]);

  const counts = {
    total: requests.length,
    pending: requests.filter((request) => request.status === 'pending').length,
    accepted: requests.filter((request) => request.status === 'accepted').length,
    fulfilled: requests.filter((request) => request.status === 'fulfilled').length,
  };

  const filteredRequests = requests.filter((request) => {
    const matchesStatus =
      statusFilter === 'all' || request.status === statusFilter;

    const itemNames = (itemsByRequest[request.id] || [])
      .map((item) => item.crop_name)
      .join(' ');

    const searchableText = [
      request.id,
      buyerNames[request.buyer_id],
      request.pickup_location,
      request.notes,
      itemNames,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      matchesStatus &&
      searchableText.includes(searchTerm.trim().toLowerCase())
    );
  });

  const openActionConfirmation = (request, action) => {
    setSelectedRequest(request);
    setPendingAction(action);
    setActionNotes('');
    setSuccessMessage('');
    setErrorMessage('');
  };

  const closeActionConfirmation = () => {
    if (isUpdating) return;

    setPendingAction(null);
    setSelectedRequest(null);
    setActionNotes('');
  };

  const updateRequestStatus = async () => {
    if (!user?.id || !selectedRequest || !pendingAction) return;

    if (!isApproved) {
      setErrorMessage(
        'Your aggregator account must be approved before you can process requests.'
      );
      closeActionConfirmation();
      return;
    }

    const transitions = {
      accept: { from: 'pending', to: 'accepted' },
      reject: { from: 'pending', to: 'rejected' },
      fulfill: { from: 'accepted', to: 'fulfilled' },
    };

    const transition = transitions[pendingAction];

    if (!transition || selectedRequest.status !== transition.from) {
      setErrorMessage(
        'This request has changed or can no longer be updated. Refresh the page and try again.'
      );
      closeActionConfirmation();
      await loadRequests();
      return;
    }

    setIsUpdating(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const updatePayload = {
        status: transition.to,
        updated_at: new Date().toISOString(),
      };

      // Rejection reasons are kept in the request's notes because the
      // current schema does not define a separate decision_notes column.
      // Avoid overwriting the buyer's original notes; a dedicated column
      // or decision-history table should be added before storing reasons.
      const { data, error } = await supabase
        .from('buyer_bulk_requests')
        .update(updatePayload)
        .eq('id', selectedRequest.id)
        .eq('aggregator_id', user.id)
        .eq('status', transition.from)
        .select('id, status')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          'The request was not updated. It may have changed, or your account may not have permission to perform this action.'
        );
      }

      const actionMessages = {
        accept: 'Bulk request accepted.',
        reject: 'Bulk request rejected.',
        fulfill: 'Bulk request marked as fulfilled.',
      };

      setSuccessMessage(actionMessages[pendingAction]);
      setPendingAction(null);
      setSelectedRequest(null);
      setActionNotes('');

      await loadRequests();
    } catch (error) {
      console.error('Bulk request status update error:', error);
      setErrorMessage(
        error.message || 'Unable to update this request.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const actionDetails = {
    accept: {
      title: 'Accept this bulk request?',
      description:
        'The request will move to Accepted. Coordinate with your linked farmers before confirming that the produce can be supplied.',
      button: 'Accept request',
      style: 'bg-emerald-600 hover:bg-emerald-700',
    },
    reject: {
      title: 'Reject this bulk request?',
      description:
        'The buyer will see the request as Rejected. Make sure you have reviewed the requested quantities and availability.',
      button: 'Reject request',
      style: 'bg-red-600 hover:bg-red-700',
    },
    fulfill: {
      title: 'Mark this request as fulfilled?',
      description:
        'Only mark it fulfilled after the agreed produce has been made available for the buyer to collect.',
      button: 'Mark fulfilled',
      style: 'bg-emerald-600 hover:bg-emerald-700',
    },
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            Buyer Coordination
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Buyer Bulk Requests
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review large produce requests sent directly to your aggregator
            account. Check the requested items, coordinate supply, and update
            each request as it progresses.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRequests}
          disabled={isLoading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </section>

      {!isApproved && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Aggregator approval required</p>
            <p className="mt-1">
              Your current verification status is{' '}
              <strong>{userProfile?.verification_status || 'pending'}</strong>.
              You can review requests, but processing actions require an
              approved aggregator account.
            </p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Unable to complete the operation</p>
            <p className="mt-1 break-words">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            aria-label="Dismiss error"
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1">{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            aria-label="Dismiss success message"
            className="rounded-lg p-1 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total Requests"
          value={isLoading ? '—' : counts.total}
          icon={FileText}
          color="bg-slate-100 text-slate-700"
        />
        <SummaryCard
          label="Awaiting Review"
          value={isLoading ? '—' : counts.pending}
          icon={Clock3}
          color="bg-amber-50 text-amber-700"
        />
        <SummaryCard
          label="Accepted"
          value={isLoading ? '—' : counts.accepted}
          icon={Package}
          color="bg-blue-50 text-blue-700"
        />
        <SummaryCard
          label="Fulfilled"
          value={isLoading ? '—' : counts.fulfilled}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-700"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search crop, buyer, pickup location..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            aria-label="Filter requests by status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-16 text-sm text-slate-500">
            <RefreshCw className="mr-3 h-5 w-5 animate-spin text-emerald-600" />
            Loading buyer requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <FileText className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              {requests.length === 0
                ? 'No buyer bulk requests yet'
                : 'No matching requests'}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {requests.length === 0
                ? 'When buyers send bulk produce requests to your account, they will appear here.'
                : 'Try another search term or change the status filter.'}
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredRequests.map((request) => {
            const items = itemsByRequest[request.id] || [];
            const canReview = request.status === 'pending';
            const canFulfill = request.status === 'accepted';

            return (
              <article
                key={request.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Request
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {request.id.slice(0, 8).toUpperCase()}
                      </span>
                      <StatusBadge status={request.status} />
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-slate-900">
                      {buyerNames[request.buyer_id] || 'AgroLink Buyer'}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Submitted {formatDate(request.created_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedRequest(request)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <Eye className="h-4 w-4" />
                    View details
                  </button>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Requested produce
                    </p>

                    {items.length ? (
                      <div className="mt-3 space-y-2">
                        {items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <span className="font-medium text-slate-800">
                              {item.crop_name}
                            </span>
                            <span className="shrink-0 text-slate-600">
                              {formatQuantity(item.quantity, item.unit)}
                            </span>
                          </div>
                        ))}

                        {items.length > 3 && (
                          <p className="text-xs font-medium text-emerald-700">
                            +{items.length - 3} more item(s)
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">
                        No item details available.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Pickup location</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">
                          {request.pickup_location || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Needed by</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">
                          {formatDate(request.needed_by)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {request.notes && (
                  <div className="mx-5 mb-5 flex items-start gap-3 rounded-xl bg-slate-50 p-3 sm:mx-6">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500">
                        Buyer notes
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {request.notes}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:justify-end sm:px-6">
                  {canReview && (
                    <>
                      <button
                        type="button"
                        disabled={!isApproved}
                        onClick={() => openActionConfirmation(request, 'reject')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={!isApproved}
                        onClick={() => openActionConfirmation(request, 'accept')}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Accept request
                      </button>
                    </>
                  )}

                  {canFulfill && (
                    <button
                      type="button"
                      disabled={!isApproved}
                      onClick={() => openActionConfirmation(request, 'fulfill')}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as fulfilled
                    </button>
                  )}

                  {!canReview && !canFulfill && (
                    <p className="self-center text-xs text-slate-500">
                      No further actions available for this request.
                    </p>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* Request details modal */}
      {selectedRequest && !pendingAction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedRequest(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-request-detail-title"
            className="my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Bulk request details
                </p>
                <h2
                  id="bulk-request-detail-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  {buyerNames[selectedRequest.buyer_id] || 'AgroLink Buyer'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                aria-label="Close request details"
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={selectedRequest.status} />
                <span className="text-xs text-slate-500">
                  Request ID: {selectedRequest.id}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Submitted</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(selectedRequest.created_at)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Needed by</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatDate(selectedRequest.needed_by)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900">Produce items</h3>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  {(itemsByRequest[selectedRequest.id] || []).length ? (
                    <div className="divide-y divide-slate-100">
                      {(itemsByRequest[selectedRequest.id] || []).map((item) => (
                        <div key={item.id} className="p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {item.crop_name}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                Quantity: {formatQuantity(item.quantity, item.unit)}
                              </p>
                            </div>

                            {item.target_price_per_unit !== null &&
                              item.target_price_per_unit !== undefined && (
                                <p className="text-sm font-semibold text-slate-700">
                                  Target: ₦
                                  {Number(item.target_price_per_unit).toLocaleString(
                                    'en-NG'
                                  )}{' '}
                                  / {item.unit || 'unit'}
                                </p>
                              )}
                          </div>

                          {item.notes && (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="p-4 text-sm text-slate-500">
                      No produce items were found for this request.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900">Pickup location</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedRequest.pickup_location || 'Not specified'}
                </p>
              </div>

              {selectedRequest.notes && (
                <div>
                  <h3 className="font-bold text-slate-900">Buyer notes</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {selectedRequest.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 p-5">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action confirmation modal */}
      {pendingAction && selectedRequest && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-action-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              {pendingAction === 'reject' ? (
                <XCircle className="h-6 w-6" />
              ) : (
                <CheckCircle2 className="h-6 w-6" />
              )}
            </div>

            <h2
              id="bulk-action-title"
              className="mt-4 text-xl font-bold text-slate-900"
            >
              {actionDetails[pendingAction].title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {actionDetails[pendingAction].description}
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">
                {buyerNames[selectedRequest.buyer_id] || 'AgroLink Buyer'}
              </p>
              <p className="mt-1 text-slate-600">
                {formatDate(selectedRequest.created_at)} ·{' '}
                {(itemsByRequest[selectedRequest.id] || []).length} item(s)
              </p>
            </div>

            {pendingAction === 'reject' && (
              <div className="mt-4">
                <label
                  htmlFor="bulk-rejection-reason"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Optional internal note
                </label>
                <textarea
                  id="bulk-rejection-reason"
                  value={actionNotes}
                  onChange={(event) => setActionNotes(event.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Add a note for your own reference..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <p className="mt-1 text-xs text-slate-500">
                  This note is not saved or sent to the buyer in the current
                  database schema.
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isUpdating}
                onClick={closeActionConfirmation}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isUpdating}
                onClick={updateRequestStatus}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${actionDetails[pendingAction].style}`}
              >
                {isUpdating && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
                {isUpdating ? 'Updating...' : actionDetails[pendingAction].button}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AggregatorBulkRequests;
