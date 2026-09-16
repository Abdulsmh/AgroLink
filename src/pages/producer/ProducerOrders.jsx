import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('en-NG').format(Number(value) || 0);
};

const formatDate = (date) => {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsedDate);
};

const shortBuyerReference = (buyerId) => {
  if (!buyerId) return 'Buyer';

  return `Buyer #${buyerId.slice(0, 6).toUpperCase()}`;
};

const statusConfig = {
  pending: {
    label: 'Pending',
    description: 'Waiting for your confirmation',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: Clock3,
    dot: 'bg-amber-500',
  },

  confirmed: {
    label: 'Confirmed',
    description: 'Order accepted',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    icon: CheckCircle2,
    dot: 'bg-blue-500',
  },

  processing: {
    label: 'Processing',
    description: 'Preparing the product',
    className: 'border-violet-200 bg-violet-50 text-violet-700',
    icon: Package,
    dot: 'bg-violet-500',
  },

  completed: {
    label: 'Completed',
    description: 'Order successfully completed',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
  },

  cancelled: {
    label: 'Cancelled',
    description: 'Order has been cancelled',
    className: 'border-red-200 bg-red-50 text-red-700',
    icon: XCircle,
    dot: 'bg-red-500',
  },
};

const statusOptions = [
  'all',
  'pending',
  'confirmed',
  'processing',
  'completed',
  'cancelled',
];

const statusFlow = [
  'pending',
  'confirmed',
  'processing',
  'completed',
];

const getStatusConfig = (status) => {
  return statusConfig[status] || statusConfig.pending;
};

const getStatusProgress = (status) => {
  const index = statusFlow.indexOf(status);

  if (index === -1) return 0;

  return ((index + 1) / statusFlow.length) * 100;
};

export const ProducerOrders = () => {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [productMap, setProductMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(
            'id, buyer_id, producer_id, product_id, quantity, total_amount, status, delivery_location, created_at, updated_at'
          )
          .eq('producer_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        const orderRows = ordersData || [];

        setOrders(orderRows);

        const productIds = [
          ...new Set(
            orderRows
              .map((order) => order.product_id)
              .filter(Boolean)
          ),
        ];

        if (productIds.length > 0) {
          const { data: productsData, error: productsError } =
            await supabase
              .from('products')
              .select(
                'id, crop_name, unit, price_per_unit, location'
              )
              .in('id', productIds);

          if (productsError) throw productsError;

          const mappedProducts = {};

          (productsData || []).forEach((product) => {
            mappedProducts[product.id] = product;
          });

          setProductMap(mappedProducts);
        } else {
          setProductMap({});
        }
      } catch (err) {
        console.error('Producer orders error:', err);
        setError(err.message || 'Unable to load your orders.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const product = productMap[order.product_id];

      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter;

      const searchableText = [
        order.id,
        order.delivery_location,
        order.buyer_id,
        product?.crop_name,
        product?.location,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !search || searchableText.includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [orders, productMap, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const activeOrders = orders.filter(
      (order) =>
        order.status !== 'completed' &&
        order.status !== 'cancelled'
    );

    return {
      total: orders.length,

      pending: orders.filter(
        (order) => order.status === 'pending'
      ).length,

      processing: orders.filter(
        (order) => order.status === 'processing'
      ).length,

      completed: orders.filter(
        (order) => order.status === 'completed'
      ).length,

      activeValue: activeOrders.reduce(
        (total, order) =>
          total + Number(order.total_amount || 0),
        0
      ),

      completedValue: orders
        .filter((order) => order.status === 'completed')
        .reduce(
          (total, order) =>
            total + Number(order.total_amount || 0),
          0
        ),
    };
  }, [orders]);

  const allowedNextStatuses = (currentStatus) => {
    switch (currentStatus) {
      case 'pending':
        return ['confirmed', 'cancelled'];

      case 'confirmed':
        return ['processing', 'cancelled'];

      case 'processing':
        return ['completed', 'cancelled'];

      default:
        return [];
    }
  };

  const updateOrderStatus = async (order, newStatus) => {
    if (!newStatus || newStatus === order.status) return;

    const allowed = allowedNextStatuses(order.status);

    if (!allowed.includes(newStatus)) {
      toast.error(
        `This order cannot move from ${order.status} to ${newStatus}.`
      );

      return;
    }

    try {
      setUpdatingId(order.id);

      const { data, error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)
        .eq('producer_id', user.id)
        .select(
          'id, buyer_id, producer_id, product_id, quantity, total_amount, status, delivery_location, created_at, updated_at'
        )
        .single();

      if (updateError) throw updateError;

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? data : item
        )
      );

      setSelectedOrder((current) =>
        current?.id === order.id ? data : current
      );

      const newConfig = getStatusConfig(newStatus);

      toast.success(
        `Order marked as ${newConfig.label}.`
      );
    } catch (err) {
      console.error('Order status update error:', err);

      toast.error(
        err.message || 'Unable to update the order status.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const hasFilters =
    searchTerm.trim() !== '' || statusFilter !== 'all';

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-5 text-white shadow-xl sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-lime-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              <Truck className="h-3.5 w-3.5" />
              Farm Orders
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Orders & Fulfillment
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
              Manage buyer requests, prepare your products, and keep every
              order moving smoothly from request to completion.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/70 px-4 py-2.5 text-xs font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      {/* Summary */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="All Orders"
          value={summary.total}
          icon={Package}
          tone="slate"
        />

        <SummaryCard
          label="Needs Attention"
          value={summary.pending}
          icon={Clock3}
          tone="amber"
        />

        <SummaryCard
          label="Processing"
          value={summary.processing}
          icon={Truck}
          tone="violet"
        />

        <SummaryCard
          label="Completed"
          value={summary.completed}
          icon={CheckCircle2}
          tone="emerald"
        />
      </section>

      {/* Earnings snapshot */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="group rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Active Order Value
          </p>

          <p className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
            {formatCurrency(summary.activeValue)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Value of orders that are still being handled.
          </p>
        </div>

        <div className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Completed Sales
          </p>

          <p className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
            {formatCurrency(summary.completedValue)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Total value of orders already completed.
          </p>
        </div>
      </section>

      {/* Error */}
      {error && (
        <section className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <p className="text-sm font-bold text-red-800">
                Unable to load orders
              </p>

              <p className="mt-1 text-xs leading-5 text-red-600">
                {error}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchOrders()}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </section>
      )}

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search by order, product or location..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div className="relative">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 sm:w-48"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === 'all'
                    ? 'All statuses'
                    : status.charAt(0).toUpperCase() +
                      status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <p className="text-slate-400">
            Showing{' '}
            <span className="font-bold text-slate-700">
              {filteredOrders.length}
            </span>{' '}
            {filteredOrders.length === 1 ? 'order' : 'orders'}
          </p>

          {statusFilter !== 'all' && (
            <p className="font-semibold text-emerald-600">
              {getStatusConfig(statusFilter).label} orders
            </p>
          )}
        </div>
      </section>

      {/* Orders */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Buyer Orders
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Review requests and keep your customers updated.
              </p>
            </div>

            <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:flex">
              <Package className="h-5 w-5" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyOrders
            hasOrders={orders.length > 0}
            hasFilters={hasFilters}
            clearFilters={clearFilters}
          />
        ) : (
          <>
            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredOrders.map((order) => (
                <MobileOrderCard
                  key={order.id}
                  order={order}
                  product={productMap[order.product_id]}
                  onView={() => setSelectedOrder(order)}
                />
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Order
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Product
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Quantity
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Amount
                    </th>

                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const product = productMap[order.product_id];
                    const config = getStatusConfig(order.status);
                    const StatusIcon = config.icon;

                    return (
                      <tr
                        key={order.id}
                        className="group transition hover:bg-emerald-50/30"
                      >
                        <td className="px-5 py-4">
                          <p className="text-sm font-black text-slate-800">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatDate(order.created_at)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <ProductSummary product={product} />
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {formatNumber(order.quantity)}{' '}
                          {product?.unit || 'units'}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-black text-slate-900">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={order.status}
                            icon={StatusIcon}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedOrder(order)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Order details modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          product={productMap[selectedOrder.product_id]}
          updating={updatingId === selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={updateOrderStatus}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------
   Summary Card
------------------------------------------------------- */

const SummaryCard = ({
  label,
  value,
  icon: Icon,
  tone,
}) => {
  const tones = {
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div
      className={`group rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-5 ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {formatNumber(value)}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------
   Product Summary
------------------------------------------------------- */

const ProductSummary = ({ product }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <Package className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="max-w-[180px] truncate text-sm font-bold capitalize text-slate-800">
          {product?.crop_name || 'Product unavailable'}
        </p>

        {product?.location && (
          <p className="mt-1 flex max-w-[180px] items-center gap-1 truncate text-[11px] text-slate-400">
            <MapPin className="h-3 w-3 shrink-0" />
            {product.location}
          </p>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------
   Status Badge
------------------------------------------------------- */

const StatusBadge = ({ status, icon: Icon }) => {
  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

/* -------------------------------------------------------
   Mobile Order Card
------------------------------------------------------- */

const MobileOrderCard = ({
  order,
  product,
  onView,
}) => {
  const config = getStatusConfig(order.status);

  return (
    <button
      type="button"
      onClick={onView}
      className="block w-full p-4 text-left transition active:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Package className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">
              {product?.crop_name || 'Product unavailable'}
            </p>

            <p className="mt-1 text-[11px] text-slate-400">
              #{order.id.slice(0, 8).toUpperCase()} ·{' '}
              {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Quantity
          </p>

          <p className="mt-1 text-sm font-bold text-slate-700">
            {formatNumber(order.quantity)}{' '}
            {product?.unit || 'units'}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Amount
          </p>

          <p className="mt-1 text-sm font-black text-slate-900">
            {formatCurrency(order.total_amount)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <StatusBadge
          status={order.status}
          icon={config.icon}
        />
      </div>
    </button>
  );
};

/* -------------------------------------------------------
   Empty State
------------------------------------------------------- */

const EmptyOrders = ({
  hasOrders,
  hasFilters,
  clearFilters,
}) => {
  return (
    <div className="flex min-h-[330px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <Truck className="h-7 w-7" />
      </div>

      <h3 className="mt-5 text-base font-black text-slate-800">
        {hasOrders
          ? 'No matching orders'
          : 'No buyer orders yet'}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">
        {hasOrders
          ? 'Try changing your search or status filter to find another order.'
          : 'When buyers order your products, their requests will appear here.'}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="mt-5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

/* -------------------------------------------------------
   Order Details Modal
------------------------------------------------------- */

const OrderDetailsModal = ({
  order,
  product,
  updating,
  onClose,
  onUpdateStatus,
}) => {
  const config = getStatusConfig(order.status);
  const StatusIcon = config.icon;

  const nextStatuses = (() => {
    switch (order.status) {
      case 'pending':
        return ['confirmed', 'cancelled'];

      case 'confirmed':
        return ['processing', 'cancelled'];

      case 'processing':
        return ['completed', 'cancelled'];

      default:
        return [];
    }
  })();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
              Order Details
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-900">
              #{order.id.slice(0, 8).toUpperCase()}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close order details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {/* Status */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Order Progress
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${config.className}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {config.label}
                    </span>

                    <span className="text-xs text-slate-400">
                      {config.description}
                    </span>
                  </div>
                </div>

                {updating && (
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating...
                  </div>
                )}
              </div>

              {order.status !== 'cancelled' && (
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Order received</span>
                    <span>
                      {Math.round(
                        getStatusProgress(order.status)
                      )}
                      %
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{
                        width: `${getStatusProgress(
                          order.status
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-1">
                    {statusFlow.map((status) => {
                      const flowConfig =
                        getStatusConfig(status);

                      const currentIndex =
                        statusFlow.indexOf(order.status);

                      const itemIndex =
                        statusFlow.indexOf(status);

                      const reached =
                        itemIndex <= currentIndex;

                      return (
                        <div
                          key={status}
                          className={`text-center text-[9px] font-bold ${
                            reached
                              ? 'text-emerald-600'
                              : 'text-slate-300'
                          }`}
                        >
                          {flowConfig.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Product */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Product Ordered
            </p>

            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Package className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-black capitalize text-slate-900">
                  {product?.crop_name || 'Product unavailable'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {formatNumber(order.quantity)}{' '}
                  {product?.unit || 'units'}
                </p>

                {product?.price_per_unit && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatCurrency(
                      product.price_per_unit
                    )}{' '}
                    per {product.unit || 'unit'}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Order information */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoBox
              label="Order Amount"
              value={formatCurrency(order.total_amount)}
              strong
            />

            <InfoBox
              label="Order Date"
              value={formatDate(order.created_at)}
            />

            <InfoBox
              label="Buyer"
              value={shortBuyerReference(order.buyer_id)}
            />

            <InfoBox
              label="Last Updated"
              value={formatDate(order.updated_at)}
            />
          </section>

          {/* Delivery */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <MapPin className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Delivery Location
                </p>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                  {order.delivery_location ||
                    'No delivery location provided.'}
                </p>
              </div>
            </div>
          </section>

          {/* Actions */}
          {nextStatuses.length > 0 && (
            <section>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  What would you like to do?
                </p>

                {updating && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    Please wait...
                  </span>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                {nextStatuses.map((nextStatus) => {
                  const nextConfig =
                    getStatusConfig(nextStatus);

                  const NextIcon = nextConfig.icon;

                  const isCancel =
                    nextStatus === 'cancelled';

                  return (
                    <button
                      key={nextStatus}
                      type="button"
                      disabled={updating}
                      onClick={() =>
                        onUpdateStatus(
                          order,
                          nextStatus
                        )
                      }
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isCancel
                          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border-emerald-200 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                      }`}
                    >
                      <NextIcon className="h-4 w-4" />

                      {isCancel
                        ? 'Cancel Order'
                        : `Mark as ${nextConfig.label}`}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Completed */}
          {order.status === 'completed' && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

              <div>
                <p className="text-sm font-bold text-emerald-800">
                  Order completed
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-700">
                  This order has been successfully completed.
                </p>
              </div>
            </div>
          )}

          {/* Cancelled */}
          {order.status === 'cancelled' && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>
                <p className="text-sm font-bold text-red-800">
                  Order cancelled
                </p>

                <p className="mt-1 text-xs leading-5 text-red-700">
                  This order is no longer active and cannot be
                  updated.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-center text-[11px] leading-5 text-slate-400">
              Keep the order status updated so buyers know what is
              happening with their purchase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------
   Info Box
------------------------------------------------------- */

const InfoBox = ({
  label,
  value,
  strong = false,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 break-words ${
          strong
            ? 'text-lg font-black text-slate-900'
            : 'text-sm font-bold text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
};
