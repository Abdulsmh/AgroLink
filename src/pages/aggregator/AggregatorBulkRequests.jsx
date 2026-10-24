
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBasket,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';

import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
    icon: Clock3,
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-blue-50 text-blue-700 ring-blue-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
    icon: X,
  },
  fulfilled: {
    label: 'Fulfilled',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    icon: Check,
  },
};

const ACTION_CONFIG = {
  accept: {
    title: 'Accept bulk request',
    description:
      'Confirm that you can handle this buyer’s produce requirements. The buyer’s request will be marked as accepted.',
    nextStatus: 'accepted',
    buttonLabel: 'Accept request',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
    icon: CheckCircle2,
  },
  reject: {
    title: 'Reject bulk request',
    description:
      'Explain why you cannot fulfil this request. Your reason will be saved and displayed to the buyer.',
    nextStatus: 'rejected',
    buttonLabel: 'Reject request',
    buttonClass: 'bg-rose-600 hover:bg-rose-700',
    icon: XCircle,
  },
  fulfill: {
    title: 'Mark request as fulfilled',
    description:
      'Only mark this request as fulfilled after the agreed produce requirements have been completed.',
    nextStatus: 'fulfilled',
    buttonLabel: 'Confirm fulfillment',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700',
    icon: CheckCircle2,
  },
};

const MIN_REJECTION_REASON_LENGTH = 10;
const MAX_REJECTION_REASON_LENGTH = 1000;

const formatDate = (value, includeTime = false) => {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not specified';

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? { hour: '2-digit', minute: '2-digit' }
      : {}),
  }).format(date);
};

const formatQuantity = (quantity, unit) => {
  const value = Number(quantity);

  const formatted = Number.isFinite(value)
    ? new Intl.NumberFormat('en-NG', {
        maximumFractionDigits: 2,
      }).format(value)
    : String(quantity ?? '—');

  return `${formatted} ${unit || ''}`.trim();
};

const formatPrice = (price) => {
  if (price === null || price === undefined || price === '') {
    return 'No target price';
  }

  const value = Number(price);

  if (!Number.isFinite(value)) return 'No target price';

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(value);
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
    icon: AlertCircle,
  };

function StatusBadge({ status }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${config.className}`}
    >
      <Icon size={13} />
      {config.label}
    </span>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ searchTerm, statusFilter, onReset }) {
  const hasFilters = searchTerm.trim() || statusFilter !== 'all';

  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <ShoppingBasket size={30} />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-900">
        {hasFilters ? 'No matching requests' : 'No bulk requests yet'}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? 'Try changing your search term or status filter to find other requests.'
          : 'Buyer bulk requests assigned to your account will appear here when they are submitted.'}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function RejectionReason({ reason, compact = false }) {
  return (
    <div
      className={`rounded-xl border border-rose-200 bg-rose-50 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <h3 className="flex items-center gap-2 font-semibold text-rose-900">
        <XCircle size={18} />
        Reason for rejection
      </h3>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-rose-800">
        {reason || 'No rejection reason was recorded.'}
      </p>
    </div>
  );
}

export default function AggregatorBulkRequests() {
  const { user, userProfile, isLoading: authLoading } = useAuth();

  const [requests, setRequests] = useState([]);
  const [itemsByRequest, setItemsByRequest] = useState({});
  const [buyersById, setBuyersById] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  // Prevent slower, older requests from overwriting more recent results.
  const loadVersion = useRef(0);

  const isAggregator = userProfile?.role === 'aggregator';

  const isApproved =
    isAggregator && userProfile?.verification_status === 'approved';

  const loadRequests = useCallback(
    async (silent = false) => {
      if (authLoading) return;

      const version = ++loadVersion.current;

      if (!user?.id) {
        setRequests([]);
        setItemsByRequest({});
        setBuyersById({});
        setError('');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!isAggregator) {
        setRequests([]);
        setItemsByRequest({});
        setBuyersById({});
        setError('This page is available to aggregator accounts only.');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError('');

      try {
        const { data: requestData, error: requestError } =
          await supabase
            .from('buyer_bulk_requests')
            .select(
              'id, buyer_id, aggregator_id, status, pickup_location, needed_by, notes, rejection_reason, created_at, updated_at'
            )
            .eq('aggregator_id', user.id)
            .order('created_at', { ascending: false });

        if (requestError) throw requestError;

        const requestList = requestData || [];

        if (version !== loadVersion.current) return;

        setRequests(requestList);

        if (requestList.length === 0) {
          setItemsByRequest({});
          setBuyersById({});
          return;
        }

        const requestIds = requestList.map((request) => request.id);

        const buyerIds = [
          ...new Set(
            requestList
              .map((request) => request.buyer_id)
              .filter(Boolean)
          ),
        ];

        const [itemsResult, buyersResult] = await Promise.all([
          supabase
            .from('buyer_bulk_request_items')
            .select(
              'id, request_id, crop_name, quantity, unit, target_price_per_unit, notes, created_at'
            )
            .in('request_id', requestIds),

          buyerIds.length
            ? supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', buyerIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (version !== loadVersion.current) return;

        // Preserve the request list if a secondary lookup fails.
        if (itemsResult.error) {
          console.error(
            'Could not load bulk request items:',
            itemsResult.error
          );
        }

        if (buyersResult.error) {
          console.error(
            'Could not load bulk request buyer profiles:',
            buyersResult.error
          );
        }

        const groupedItems = {};

        (itemsResult.data || []).forEach((item) => {
          if (!groupedItems[item.request_id]) {
            groupedItems[item.request_id] = [];
          }

          groupedItems[item.request_id].push(item);
        });

        const buyerMap = {};

        (buyersResult.data || []).forEach((buyer) => {
          buyerMap[buyer.id] = buyer.full_name || 'Buyer';
        });

        setItemsByRequest(groupedItems);
        setBuyersById(buyerMap);

        if (itemsResult.error || buyersResult.error) {
          setError(
            'Requests loaded, but some item or buyer details could not be loaded. Check the relevant Supabase SELECT policies and refresh.'
          );
        }
      } catch (loadError) {
        if (version !== loadVersion.current) return;

        console.error(
          'Error loading aggregator bulk requests:',
          loadError
        );

        setError(
          loadError?.message ||
            'Unable to load bulk requests. Please try again.'
        );
      } finally {
        if (version === loadVersion.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [authLoading, isAggregator, user?.id]
  );

  useEffect(() => {
    if (authLoading) return undefined;

    loadRequests();

    if (!user?.id || !isAggregator) {
      return undefined;
    }

    const requestsChannel = supabase
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
          loadRequests(true);
        }
      )
      .subscribe();

    // Item changes can affect any of this aggregator's requests.
    // Refreshing the current request list keeps item data consistent.
    const itemsChannel = supabase
      .channel(`aggregator-bulk-request-items-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyer_bulk_request_items',
        },
        () => {
          loadRequests(true);
        }
      )
      .subscribe();

    return () => {
      // Invalidate pending fetches when the effect is cleaned up.
      loadVersion.current += 1;

      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(itemsChannel);
    };
  }, [authLoading, user?.id, isAggregator, loadRequests]);

  // Keep the selected modal request in sync with refreshed data.
  useEffect(() => {
    if (!selectedRequest || actionType) return;

    const refreshedRequest = requests.find(
      (request) => request.id === selectedRequest.id
    );

    if (refreshedRequest) {
      setSelectedRequest(refreshedRequest);
    }
  }, [requests, selectedRequest?.id, actionType]);

  const stats = useMemo(() => {
    const total = requests.length;

    const count = (status) =>
      requests.filter((request) => request.status === status).length;

    return {
      total,
      pending: count('pending'),
      accepted: count('accepted'),
      fulfilled: count('fulfilled'),
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const filtered = requests.filter((request) => {
      const items = itemsByRequest[request.id] || [];
      const buyerName = buyersById[request.buyer_id] || 'Buyer';

      const matchesStatus =
        statusFilter === 'all' || request.status === statusFilter;

      const searchableText = [
        buyerName,
        request.id,
        request.pickup_location,
        request.notes,
        request.rejection_reason,
        request.status,
        ...items.flatMap((item) => [
          item.crop_name,
          item.unit,
          item.notes,
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesStatus &&
        (!search || searchableText.includes(search))
      );
    });

    return filtered.sort((a, b) => {
      const aDate = new Date(a.created_at || 0).getTime();
      const bDate = new Date(b.created_at || 0).getTime();

      if (sortOrder === 'oldest') return aDate - bDate;

      if (sortOrder === 'needed-soonest') {
        const aNeeded = a.needed_by
          ? new Date(a.needed_by).getTime()
          : Number.MAX_SAFE_INTEGER;

        const bNeeded = b.needed_by
          ? new Date(b.needed_by).getTime()
          : Number.MAX_SAFE_INTEGER;

        return aNeeded - bNeeded;
      }

      return bDate - aDate;
    });
  }, [
    requests,
    itemsByRequest,
    buyersById,
    searchTerm,
    statusFilter,
    sortOrder,
  ]);

  const closeDetails = () => {
    if (isUpdating) return;

    setSelectedRequest(null);
    setActionError('');
  };

  const openActionConfirmation = (type, request) => {
    setSelectedRequest(request);
    setActionType(type);
    setActionError('');
    setRejectionReason('');
  };

  const closeActionConfirmation = () => {
    if (isUpdating) return;

    setActionType(null);
    setActionError('');
    setRejectionReason('');
  };

  const updateRequestStatus = async () => {
    if (!selectedRequest || !actionType || isUpdating) return;

    if (!user?.id || !isApproved) {
      setActionError(
        'Only an approved aggregator can process bulk requests.'
      );
      return;
    }

    const action = ACTION_CONFIG[actionType];

    if (!action) return;

    const expectedCurrentStatus =
      actionType === 'fulfill' ? 'accepted' : 'pending';

    if (selectedRequest.status !== expectedCurrentStatus) {
      setActionError(
        'This request has changed since you opened it. Refresh the list and try again.'
      );

      await loadRequests(true);
      return;
    }

    const trimmedReason = rejectionReason.trim();

    if (actionType === 'reject') {
      if (
        trimmedReason.length < MIN_REJECTION_REASON_LENGTH
      ) {
        setActionError(
          `Please provide a rejection reason of at least ${MIN_REJECTION_REASON_LENGTH} characters.`
        );
        return;
      }

      if (
        trimmedReason.length > MAX_REJECTION_REASON_LENGTH
      ) {
        setActionError(
          `The rejection reason cannot exceed ${MAX_REJECTION_REASON_LENGTH} characters.`
        );
        return;
      }
    }

    setIsUpdating(true);
    setActionError('');
    setNotice('');

    try {
      const updatePayload = {
        status: action.nextStatus,
        updated_at: new Date().toISOString(),
      };

      if (actionType === 'reject') {
        updatePayload.rejection_reason = trimmedReason;
      } else {
        updatePayload.rejection_reason = null;
      }

      const { data, error: updateError } = await supabase
        .from('buyer_bulk_requests')
        .update(updatePayload)
        .eq('id', selectedRequest.id)
        .eq('aggregator_id', user.id)
        .eq('status', expectedCurrentStatus)
        .select(
          'id, status, rejection_reason, updated_at'
        )
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          'The request was not updated. It may have changed already, or your account may not have permission to update it.'
        );
      }

      const requestId = selectedRequest.id;

      setRequests((current) =>
        current.map((request) =>
          request.id === requestId
            ? { ...request, ...data }
            : request
        )
      );

      setSelectedRequest(null);
      setActionType(null);
      setRejectionReason('');

      const message =
        actionType === 'accept'
          ? 'Bulk request accepted successfully.'
          : actionType === 'reject'
            ? 'Bulk request rejected. The reason has been saved.'
            : 'Bulk request marked as fulfilled.';

      setNotice(message);

      await loadRequests(true);
    } catch (updateError) {
      console.error(
        'Error updating bulk request:',
        updateError
      );

      setActionError(
        updateError?.message ||
          'Unable to update this request. Please try again.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortOrder('newest');
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <Loader2
            className="mx-auto animate-spin text-emerald-600"
            size={38}
          />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading bulk requests...
          </p>
        </div>
      </div>
    );
  }

  if (!isAggregator) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert
            className="mx-auto text-rose-500"
            size={42}
          />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Aggregator access required
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This page is available to aggregator accounts only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <ShoppingBasket size={17} />
              <span>Aggregator workspace</span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Bulk Requests
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review buyers’ produce requirements, respond to requests,
              and track fulfillment.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadRequests(true)}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>

        {/* Approval notice */}
        {!isApproved && (
          <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ShieldAlert
              className="mt-0.5 shrink-0 text-amber-700"
              size={21}
            />

            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                Aggregator approval required
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                You can review requests assigned to your account, but
                you must have an approved aggregator profile to accept,
                reject, or complete them.
              </p>
            </div>
          </div>
        )}

        {/* Notifications */}
        {notice && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{notice}</span>
            </div>

            <button
              type="button"
              onClick={() => setNotice('')}
              aria-label="Dismiss notification"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <AlertCircle
              className="mt-0.5 shrink-0 text-rose-600"
              size={20}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-900">
                Could not load all bulk request data
              </p>
              <p className="mt-1 break-words text-sm leading-6 text-rose-800">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadRequests()}
              className="shrink-0 text-sm font-semibold text-rose-800 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total requests"
            value={stats.total}
            description="All requests assigned to you"
            icon={Package}
            iconClass="bg-emerald-50 text-emerald-700"
          />

          <StatCard
            title="Awaiting response"
            value={stats.pending}
            description="Requests needing your decision"
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-700"
          />

          <StatCard
            title="Accepted"
            value={stats.accepted}
            description="Requests awaiting fulfillment"
            icon={Activity}
            iconClass="bg-blue-50 text-blue-700"
          />

          <StatCard
            title="Fulfilled"
            value={stats.fulfilled}
            description="Requests marked completed"
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-700"
          />
        </div>

        {/* Request list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Buyer requests
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredRequests.length} of {requests.length} requests
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
                <div className="relative min-w-0 lg:w-64">
                  <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Search crops, buyer, location..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="relative">
                  <Filter
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value)
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    aria-label="Filter by status"
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>

                <div className="relative">
                  <ArrowDownUp
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={sortOrder}
                    onChange={(event) =>
                      setSortOrder(event.target.value)
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    aria-label="Sort requests"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="needed-soonest">Needed date</option>
                  </select>

                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <EmptyState
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onReset={resetFilters}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRequests.map((request) => {
                const items = itemsByRequest[request.id] || [];
                const buyerName =
                  buyersById[request.buyer_id] || 'Buyer';

                const isPending = request.status === 'pending';
                const isAccepted = request.status === 'accepted';

                return (
                  <article
                    key={request.id}
                    className="p-4 transition hover:bg-slate-50/70 sm:p-6"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Request #{String(request.id).slice(0, 8)}
                          </span>

                          <StatusBadge status={request.status} />
                        </div>

                        <div className="mt-3 flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <UserRound size={21} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="break-words font-semibold text-slate-900">
                              {buyerName}
                            </h3>

                            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                              <CalendarDays size={14} />
                              Submitted {formatDate(request.created_at, true)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                              <MapPin size={15} />
                              Pickup location
                            </div>
                            <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                              {request.pickup_location || 'Not specified'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                              <Clock3 size={15} />
                              Needed by
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-800">
                              {formatDate(request.needed_by)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-semibold text-slate-800">
                              Produce requirements
                            </h4>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                              {items.length}{' '}
                              {items.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          {items.length === 0 ? (
                            <p className="mt-3 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                              No item details were found for this request.
                            </p>
                          ) : (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {items.slice(0, 3).map((item) => (
                                <div
                                  key={item.id}
                                  className="max-w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
                                >
                                  <p className="break-words text-sm font-semibold text-slate-800">
                                    {item.crop_name || 'Produce'}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    {formatQuantity(item.quantity, item.unit)}
                                  </p>
                                </div>
                              ))}

                              {items.length > 3 && (
                                <div className="flex items-center rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs font-medium text-slate-500">
                                  +{items.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {request.notes && (
                          <div className="mt-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Buyer’s notes
                            </p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                              {request.notes}
                            </p>
                          </div>
                        )}

                        {request.status === 'rejected' && (
                          <div className="mt-4">
                            <RejectionReason
                              reason={request.rejection_reason}
                              compact
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 xl:w-52 xl:shrink-0 xl:flex-col xl:items-stretch xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequest(request);
                            setActionType(null);
                            setActionError('');
                          }}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 xl:flex-none"
                        >
                          <Eye size={16} />
                          View details
                        </button>

                        {isPending && isApproved && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                openActionConfirmation('accept', request)
                              }
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 xl:flex-none"
                            >
                              <Check size={16} />
                              Accept
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openActionConfirmation('reject', request)
                              }
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 xl:flex-none"
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </>
                        )}

                        {isAccepted && isApproved && (
                          <button
                            type="button"
                            onClick={() =>
                              openActionConfirmation('fulfill', request)
                            }
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 xl:flex-none"
                          >
                            <CheckCircle2 size={16} />
                            Mark fulfilled
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="flex items-center justify-center gap-2 pb-3 text-center text-xs text-slate-400">
          <Activity size={14} />
          Request updates refresh automatically when realtime events are received.
        </p>
      </div>

      {/* Request details modal */}
      {selectedRequest && !actionType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-request-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-5 sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Bulk request details
                </p>
                <h2
                  id="bulk-request-details-title"
                  className="mt-1 text-xl font-bold text-slate-900"
                >
                  Request #{String(selectedRequest.id).slice(0, 8)}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close details"
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Buyer</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {buyersById[selectedRequest.buyer_id] || 'Buyer'}
                  </p>
                </div>
                <StatusBadge status={selectedRequest.status} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <MapPin size={15} />
                    Pickup location
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-slate-800">
                    {selectedRequest.pickup_location || 'Not specified'}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <CalendarDays size={15} />
                    Needed by
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatDate(selectedRequest.needed_by)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Clock3 size={15} />
                    Submitted
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatDate(selectedRequest.created_at, true)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Activity size={15} />
                    Last updated
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatDate(
                      selectedRequest.updated_at ||
                        selectedRequest.created_at,
                      true
                    )}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                  <Package size={18} className="text-emerald-600" />
                  Requested produce
                </h3>

                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                  {(itemsByRequest[selectedRequest.id] || []).length ===
                  0 ? (
                    <p className="p-4 text-sm text-slate-500">
                      No item details were found for this request.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {(itemsByRequest[selectedRequest.id] || []).map(
                        (item) => (
                          <div key={item.id} className="p-4">
                            <div className="flex flex-col justify-between gap-2 sm:flex-row">
                              <div>
                                <p className="font-semibold text-slate-900">
                                  {item.crop_name || 'Produce'}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  Quantity:{' '}
                                  {formatQuantity(item.quantity, item.unit)}
                                </p>
                              </div>

                              <div className="sm:text-right">
                                <p className="text-xs text-slate-500">
                                  Target price per unit
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-800">
                                  {formatPrice(item.target_price_per_unit)}
                                </p>
                              </div>
                            </div>

                            {item.notes && (
                              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedRequest.notes && (
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                    <FileText size={18} className="text-emerald-600" />
                    Buyer’s notes
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {selectedRequest.notes}
                  </p>
                </div>
              )}

              {selectedRequest.status === 'rejected' && (
                <RejectionReason
                  reason={selectedRequest.rejection_reason}
                />
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeDetails}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>

                {selectedRequest.status === 'pending' && isApproved && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        openActionConfirmation('reject', selectedRequest)
                      }
                      className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openActionConfirmation('accept', selectedRequest)
                      }
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Accept request
                    </button>
                  </>
                )}

                {selectedRequest.status === 'accepted' && isApproved && (
                  <button
                    type="button"
                    onClick={() =>
                      openActionConfirmation('fulfill', selectedRequest)
                    }
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Mark fulfilled
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action confirmation modal */}
      {selectedRequest && actionType && ACTION_CONFIG[actionType] && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isUpdating
            ) {
              closeActionConfirmation();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-request-action-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            {(() => {
              const action = ACTION_CONFIG[actionType];
              const Icon = action.icon;
              const reasonLength = rejectionReason.trim().length;

              const invalidRejectionReason =
                actionType === 'reject' &&
                (reasonLength < MIN_REJECTION_REASON_LENGTH ||
                  reasonLength > MAX_REJECTION_REASON_LENGTH);

              return (
                <>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      actionType === 'reject'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Icon size={24} />
                  </div>

                  <h2
                    id="bulk-request-action-title"
                    className="mt-4 text-xl font-bold text-slate-900"
                  >
                    {action.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {action.description}
                  </p>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Buyer
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {buyersById[selectedRequest.buyer_id] || 'Buyer'}
                    </p>

                    <p className="mt-3 text-xs font-medium text-slate-500">
                      Request
                    </p>
                    <p className="mt-1 break-all text-sm font-medium text-slate-800">
                      #{String(selectedRequest.id).slice(0, 8)}
                    </p>

                    <p className="mt-3 text-xs font-medium text-slate-500">
                      New status
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={action.nextStatus} />
                    </div>
                  </div>

                  {/* Required reason for rejection */}
                  {actionType === 'reject' && (
                    <div className="mt-4">
                      <label
                        htmlFor="bulk-rejection-reason"
                        className="block text-sm font-semibold text-slate-800"
                      >
                        Reason for rejection
                        <span className="ml-1 text-rose-600">*</span>
                      </label>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Explain why you cannot fulfil this request.
                        The buyer will be able to see this reason.
                      </p>

                      <textarea
                        id="bulk-rejection-reason"
                        value={rejectionReason}
                        onChange={(event) => {
                          setRejectionReason(
                            event.target.value.slice(
                              0,
                              MAX_REJECTION_REASON_LENGTH
                            )
                          );

                          if (actionError) {
                            setActionError('');
                          }
                        }}
                        rows={4}
                        maxLength={MAX_REJECTION_REASON_LENGTH}
                        required
                        disabled={isUpdating}
                        placeholder="For example: The requested quantity is currently unavailable..."
                        aria-invalid={invalidRejectionReason}
                        aria-describedby="bulk-rejection-reason-help"
                        className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-slate-50"
                      />

                      <div
                        id="bulk-rejection-reason-help"
                        className="mt-1 flex items-center justify-between gap-3 text-xs"
                      >
                        <span
                          className={
                            reasonLength < MIN_REJECTION_REASON_LENGTH
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }
                        >
                          {reasonLength < MIN_REJECTION_REASON_LENGTH
                            ? `${
                                MIN_REJECTION_REASON_LENGTH - reasonLength
                              } more characters required`
                            : 'Reason meets the minimum length'}
                        </span>

                        <span className="text-slate-400">
                          {rejectionReason.length}/
                          {MAX_REJECTION_REASON_LENGTH}
                        </span>
                      </div>
                    </div>
                  )}

                  {actionError && (
                    <div
                      role="alert"
                      className="mt-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
                    >
                      <AlertCircle
                        className="mt-0.5 shrink-0"
                        size={17}
                      />
                      <span className="break-words">{actionError}</span>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={closeActionConfirmation}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={
                        isUpdating ||
                        !isApproved ||
                        invalidRejectionReason
                      }
                      onClick={updateRequestStatus}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${action.buttonClass}`}
                    >
                      {isUpdating && (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      )}
                      {isUpdating
                        ? 'Updating...'
                        : action.buttonLabel}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
