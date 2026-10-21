import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  ClipboardList,
  Clock3,
  CheckCircle2,
  XCircle,
  Package,
  MapPin,
  CalendarDays,
  Filter,
  ArrowUpRight,
  RefreshCw,
  X,
  AlertCircle,
  UserRound,
  Banknote,
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-violet-50 text-violet-700',
  completed: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const formatPrice = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return 'Date unavailable';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable';
  }

  return parsed.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function AggregatorRequests() {
  const { user, userProfile, isLoading: authLoading } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const aggregatorId = userProfile?.id || user?.id;

  const loadRequests = useCallback(async () => {
    if (!aggregatorId) {
      if (!authLoading) {
        setRequests([]);
        setError('Your account profile could not be identified.');
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get this aggregator's farmer relationships from the
      // existing database function.
      const {
        data: relationships,
        error: relationshipError,
      } = await supabase.rpc('list_aggregator_farmer_relationships');

      if (relationshipError) throw relationshipError;

      const farmerIds = [
        ...new Set(
          (relationships || [])
            .filter((item) => item.status === 'approved')
            .map((item) => item.farmer_id)
            .filter(Boolean)
        ),
      ];

      if (farmerIds.length === 0) {
        setRequests([]);
        return;
      }

      // Orders are associated with producers, not aggregators.
      // Show orders belonging to this aggregator's approved farmers.
      const {
        data: orders,
        error: ordersError,
      } = await supabase
        .from('orders')
        .select(`
          id,
          buyer_id,
          producer_id,
          product_id,
          quantity,
          total_amount,
          status,
          delivery_location,
          created_at,
          updated_at
        `)
        .in('producer_id', farmerIds)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!orders?.length) {
        setRequests([]);
        return;
      }

      // Fetch product and buyer information separately to avoid
      // depending on assumed Supabase relationship constraint names.
      const productIds = [
        ...new Set(orders.map((order) => order.product_id).filter(Boolean)),
      ];

      const buyerIds = [
        ...new Set(orders.map((order) => order.buyer_id).filter(Boolean)),
      ];

      const [
        { data: products, error: productsError },
        { data: buyers, error: buyersError },
      ] = await Promise.all([
        productIds.length
          ? supabase
              .from('products')
              .select('id, crop_name, unit, product_type, location')
              .in('id', productIds)
          : Promise.resolve({ data: [], error: null }),

        buyerIds.length
          ? supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', buyerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (productsError) throw productsError;
      if (buyersError) throw buyersError;

      const productMap = new Map(
        (products || []).map((product) => [product.id, product])
      );

      const buyerMap = new Map(
        (buyers || []).map((buyer) => [buyer.id, buyer])
      );

      const enrichedOrders = orders.map((order) => {
        const product = productMap.get(order.product_id);
        const buyer = buyerMap.get(order.buyer_id);

        return {
          ...order,
          crop_name: product?.crop_name || 'Product information unavailable',
          unit: product?.unit || '',
          product_type: product?.product_type || '',
          product_location: product?.location || '',
          buyer_name: buyer?.full_name || 'Buyer information unavailable',
          reference: order.id,
        };
      });

      setRequests(enrichedOrders);
    } catch (err) {
      console.error('Error loading aggregator requests:', err);
      setRequests([]);
      setError(
        err.message ||
          'Unable to load buyer orders. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [aggregatorId, authLoading]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        request.crop_name?.toLowerCase().includes(query) ||
        request.buyer_name?.toLowerCase().includes(query) ||
        request.reference?.toLowerCase().includes(query) ||
        request.delivery_location?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'all' || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const countByStatus = (status) =>
    requests.filter((request) => request.status === status).length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* Page heading */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              AGGREGATOR WORKSPACE
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Buyer Requests
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review orders placed for produce supplied by your linked
              farmers and coordinate fulfilment with them.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading || authLoading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total orders"
            value={loading ? '—' : requests.length}
            icon={<ClipboardList size={20} />}
          />

          <SummaryCard
            label="Pending"
            value={loading ? '—' : countByStatus('pending')}
            icon={<Clock3 size={20} />}
          />

          <SummaryCard
            label="Processing"
            value={loading ? '—' : countByStatus('processing')}
            icon={<Package size={20} />}
          />

          <SummaryCard
            label="Completed"
            value={loading ? '—' : countByStatus('completed')}
            icon={<CheckCircle2 size={20} />}
          />
        </section>

        {/* Search and filter */}
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search crop, buyer, reference or location..."
              aria-label="Search buyer orders"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="relative md:w-60">
            <Filter
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter orders by status"
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </section>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center"
          >
            <AlertCircle size={21} className="shrink-0 text-red-600" />

            <p className="flex-1 text-sm text-red-800">{error}</p>

            <button
              type="button"
              onClick={loadRequests}
              disabled={loading || authLoading}
              className="self-start text-sm font-semibold text-red-700 underline disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="h-5 w-1/3 rounded bg-slate-200" />
                <div className="mt-4 h-4 w-2/3 rounded bg-slate-100" />
                <div className="mt-5 h-4 w-1/2 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* Orders list */}
        {!loading && !error && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-bold text-slate-900">
                  Orders from linked farmers
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  View buyer requirements and monitor order progress.
                </p>
              </div>

              <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:self-auto">
                {filteredRequests.length} records
              </span>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ClipboardList size={27} />
                </div>

                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {requests.length === 0
                    ? 'No orders available'
                    : 'No matching orders'}
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {requests.length === 0
                    ? 'Orders for your approved linked farmers will appear here when they are accessible under your account permissions.'
                    : 'Try another search term or choose a different status.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRequests.map((request) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    onView={() => setSelectedRequest(request)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Order details modal */}
      {selectedRequest && (
        <OrderDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function RequestRow({ request, onView }) {
  const status = request.status || 'pending';

  return (
    <article className="p-5 transition hover:bg-slate-50">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold capitalize text-slate-900">
              {request.crop_name}
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                STATUS_STYLES[status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {STATUS_LABELS[status] || status}
            </span>
          </div>

          <p className="mt-2 break-all text-xs text-slate-500">
            Order reference: {request.reference}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2">
              <Package size={16} className="text-emerald-700" />
              {request.quantity ?? '—'} {request.unit}
            </span>

            <span className="inline-flex items-center gap-2">
              <MapPin size={16} className="text-emerald-700" />
              {request.delivery_location || 'Pickup location not specified'}
            </span>

            <span className="inline-flex items-center gap-2">
              <CalendarDays size={16} className="text-emerald-700" />
              {formatDate(request.created_at)}
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-500">
            Buyer: {request.buyer_name}
          </p>
        </div>

        <button
          type="button"
          onClick={onView}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          View details
          <ArrowUpRight size={16} />
        </button>
      </div>
    </article>
  );
}

function OrderDetailsModal({ request, onClose }) {
  const status = request.status || 'pending';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        className="my-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Order details
            </p>

            <h2
              id="order-details-title"
              className="mt-1 text-xl font-bold capitalize text-slate-900"
            >
              {request.crop_name}
            </h2>

            <p className="mt-1 break-all text-xs text-slate-500">
              Reference: {request.reference}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                STATUS_STYLES[status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {STATUS_LABELS[status] || status}
            </span>
          </div>

          <DetailRow
            icon={<Package size={18} />}
            label="Quantity"
            value={`${request.quantity ?? '—'} ${request.unit}`.trim()}
          />

          <DetailRow
            icon={<Banknote size={18} />}
            label="Total order amount"
            value={formatPrice(request.total_amount)}
          />

          <DetailRow
            icon={<UserRound size={18} />}
            label="Buyer"
            value={request.buyer_name}
          />

          <DetailRow
            icon={<MapPin size={18} />}
            label="Pickup / delivery location"
            value={request.delivery_location || 'Not specified'}
          />

          <DetailRow
            icon={<CalendarDays size={18} />}
            label="Order date"
            value={formatDate(request.created_at)}
          />

          <DetailRow
            icon={<Clock3 size={18} />}
            label="Last updated"
            value={formatDate(request.updated_at)}
          />

          {request.product_type && (
            <DetailRow
              icon={<Package size={18} />}
              label="Produce type"
              value={
                request.product_type === 'pre_harvest'
                  ? 'Pre-harvest'
                  : request.product_type === 'post_harvest'
                    ? 'Post-harvest'
                    : request.product_type
              }
            />
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            This page is for viewing and coordinating orders. Order status
            changes remain under the existing authorized order workflow.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Close details
          </button>
        </div>
      </section>
    </div>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-emerald-50 p-2 text-emerald-700">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-900">
          {value || 'Not available'}
        </p>
      </div>
    </div>
  );
}
