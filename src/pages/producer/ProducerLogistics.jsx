import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  Clock3,
  XCircle,
  RefreshCw,
  Navigation,
  CircleDollarSign,
  ArrowRight,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const currency = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat('en-NG');

const formatCurrency = (value) =>
  currency.format(Number(value) || 0);

const formatNumber = (value) =>
  numberFormat.format(Number(value) || 0);

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock3,
    className:
      'bg-amber-50 text-amber-700 border-amber-200',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    className:
      'bg-blue-50 text-blue-700 border-blue-200',
  },
  processing: {
    label: 'Processing',
    icon: Truck,
    className:
      'bg-purple-50 text-purple-700 border-purple-200',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className:
      'bg-red-50 text-red-700 border-red-200',
  },
};

const formatDate = (date) => {
  if (!date) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

const getOrderReference = (id) => {
  if (!id) return '—';

  return `#${id.slice(0, 8).toUpperCase()}`;
};

export const ProducerLogistics = () => {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('orders')
        .select(
          `
            id,
            quantity,
            total_amount,
            status,
            delivery_location,
            created_at,
            updated_at,
            product_id
          `
        )
        .eq('producer_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (error) throw error;

      setOrders(data || []);

      if (isRefresh) {
        toast.success('Logistics updated.');
      }
    } catch (error) {
      console.error(
        'Logistics fetch error:',
        error
      );

      setOrders([]);

      toast.error(
        error.message ||
          'Unable to load your logistics information.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  const activeOrders = useMemo(
    () =>
      orders.filter((order) =>
        [
          'pending',
          'confirmed',
          'processing',
        ].includes(order.status)
      ),
    [orders]
  );

  const destinations = useMemo(() => {
    const map = new Map();

    activeOrders.forEach((order) => {
      const location =
        order.delivery_location?.trim();

      if (!location) return;

      if (!map.has(location)) {
        map.set(location, {
          location,
          orders: 0,
          quantity: 0,
          value: 0,
        });
      }

      const item = map.get(location);

      item.orders += 1;
      item.quantity += Number(order.quantity) || 0;
      item.value += Number(order.total_amount) || 0;
    });

    return Array.from(map.values()).sort(
      (a, b) => b.orders - a.orders
    );
  }, [activeOrders]);

  const logisticsStats = useMemo(() => {
    const processing = orders.filter(
      (order) => order.status === 'processing'
    );

    const confirmed = orders.filter(
      (order) => order.status === 'confirmed'
    );

    const pending = orders.filter(
      (order) => order.status === 'pending'
    );

    const activeValue = activeOrders.reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

    const activeUnits = activeOrders.reduce(
      (sum, order) =>
        sum + Number(order.quantity || 0),
      0
    );

    const ordersWithLocation =
      activeOrders.filter(
        (order) =>
          order.delivery_location?.trim()
      ).length;

    return {
      processing: processing.length,
      confirmed: confirmed.length,
      pending: pending.length,
      activeValue,
      activeUnits,
      ordersWithLocation,
    };
  }, [orders, activeOrders]);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-teal-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              <Truck className="h-3.5 w-3.5" />
              Delivery Management
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Logistics & Haulage
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
              Keep track of where your orders need to go and
              which deliveries are currently being prepared.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/60 px-4 py-2.5 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            {refreshing
              ? 'Updating...'
              : 'Refresh'}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Logistics summary */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Truck}
              label="Active Deliveries"
              value={formatNumber(
                activeOrders.length
              )}
              description="Orders still being fulfilled"
              iconClass="bg-emerald-50 text-emerald-600"
              borderClass="border-emerald-200"
            />

            <MetricCard
              icon={MapPin}
              label="Destinations"
              value={formatNumber(
                destinations.length
              )}
              description="Different delivery locations"
              iconClass="bg-blue-50 text-blue-600"
              borderClass="border-blue-200"
            />

            <MetricCard
              icon={Package}
              label="Units to Deliver"
              value={formatNumber(
                logisticsStats.activeUnits
              )}
              description="Units in active orders"
              iconClass="bg-violet-50 text-violet-600"
              borderClass="border-violet-200"
            />

            <MetricCard
              icon={CircleDollarSign}
              label="Active Order Value"
              value={formatCurrency(
                logisticsStats.activeValue
              )}
              description="Value of active orders"
              iconClass="bg-amber-50 text-amber-600"
              borderClass="border-amber-200"
            />
          </section>

          {/* Status overview */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Fulfillment Overview
                  </p>

                  <h2 className="mt-1 text-lg font-black text-slate-900">
                    Where your active orders stand
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Activity className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatusSummary
                  icon={Clock3}
                  label="Pending"
                  value={logisticsStats.pending}
                  className="bg-amber-50 text-amber-700"
                />

                <StatusSummary
                  icon={CheckCircle2}
                  label="Confirmed"
                  value={logisticsStats.confirmed}
                  className="bg-blue-50 text-blue-700"
                />

                <StatusSummary
                  icon={Truck}
                  label="Processing"
                  value={logisticsStats.processing}
                  className="bg-purple-50 text-purple-700"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-5 ring-1 ring-blue-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                <Navigation className="h-5 w-5" />
              </div>

              <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Delivery information
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                Orders with destinations
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {formatNumber(
                  logisticsStats.ordersWithLocation
                )}{' '}
                of{' '}
                {formatNumber(activeOrders.length)}{' '}
                active orders currently have a delivery
                location.
              </p>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700"
                  style={{
                    width:
                      activeOrders.length > 0
                        ? `${Math.min(
                            100,
                            (logisticsStats.ordersWithLocation /
                              activeOrders.length) *
                              100
                          )}%`
                        : '0%',
                  }}
                />
              </div>
            </div>
          </section>

          {/* Destinations */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Delivery Routes
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-900">
                  Delivery destinations
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Active orders grouped by their delivery
                  location.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <MapPin className="h-4 w-4 text-emerald-600" />
                {formatNumber(
                  destinations.length
                )}{' '}
                destinations
              </div>
            </div>

            {destinations.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No delivery destinations yet"
                description="Delivery locations will appear here when your active orders include a destination."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {destinations.map(
                  (destination, index) => (
                    <div
                      key={destination.location}
                      className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <MapPin className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="break-words text-sm font-black text-slate-900">
                              {destination.location}
                            </p>

                            <p className="mt-1 text-[11px] text-slate-400">
                              Route {index + 1}
                            </p>
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-500" />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Orders
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-800">
                            {formatNumber(
                              destination.orders
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl bg-white p-3">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Units
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-800">
                            {formatNumber(
                              destination.quantity
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 rounded-xl bg-white p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Order value
                        </p>

                        <p className="mt-1 text-sm font-black text-emerald-700">
                          {formatCurrency(
                            destination.value
                          )}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          {/* Active delivery orders */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Fulfillment
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                Orders on the move
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Review active orders and their current delivery
                information.
              </p>
            </div>

            {activeOrders.length === 0 ? (
              <EmptyState
                icon={Truck}
                title="No active deliveries"
                description="You currently have no pending, confirmed or processing orders."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {activeOrders.map((order) => {
                  const config =
                    statusConfig[order.status] ||
                    statusConfig.pending;

                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <Package className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-slate-900">
                              Order{' '}
                              {getOrderReference(
                                order.id
                              )}
                            </p>

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${config.className}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>
                              {formatNumber(
                                order.quantity
                              )}{' '}
                              units
                            </span>

                            <span>
                              {formatCurrency(
                                order.total_amount
                              )}
                            </span>

                            <span>
                              {formatDate(
                                order.created_at
                              )}
                            </span>
                          </div>

                          <div className="mt-3 flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                            <p className="text-xs leading-5 text-slate-600">
                              {order.delivery_location?.trim() ||
                                'Delivery location not provided yet'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                        <Truck className="h-4 w-4 text-emerald-600" />
                        {order.status ===
                        'processing'
                          ? 'Being prepared'
                          : order.status ===
                            'confirmed'
                          ? 'Ready for fulfillment'
                          : 'Awaiting confirmation'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Helpful note */}
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <Truck className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-black text-emerald-900">
                  Keep your delivery details clear
                </p>

                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  Accurate delivery locations make it easier to
                  prepare orders and coordinate fulfillment with
                  buyers.
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const MetricCard = ({
  icon: Icon,
  label,
  value,
  description,
  iconClass,
  borderClass,
}) => {
  return (
    <div
      className={`group rounded-2xl border ${borderClass} bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-400" />
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
};

const StatusSummary = ({
  icon: Icon,
  label,
  value,
  className,
}) => {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5" />

        <span className="text-xl font-black">
          {formatNumber(value)}
        </span>
      </div>

      <p className="mt-3 text-xs font-bold">
        {label}
      </p>
    </div>
  );
};

const EmptyState = ({
  icon: Icon,
  title,
  description,
}) => {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Icon className="h-6 w-6 text-slate-400" />
      </div>

      <h3 className="mt-4 text-base font-black text-slate-800">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
};
