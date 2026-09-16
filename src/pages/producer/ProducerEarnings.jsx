import React, { useEffect, useMemo, useState } from 'react';
import {
  Wallet,
  Clock3,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Package,
  CalendarDays,
  ArrowUpRight,
  CircleDollarSign,
  BarChart3,
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

const formatCurrency = (value) => currency.format(Number(value) || 0);

const formatNumber = (value) =>
  numberFormat.format(Number(value) || 0);

const formatDate = (date) => {
  if (!date) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

const statusStyles = {
  completed: {
    label: 'Completed',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock3,
  },
  confirmed: {
    label: 'Confirmed',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: CheckCircle2,
  },
  processing: {
    label: 'Processing',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: Package,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: Clock3,
  },
};

export const ProducerEarnings = () => {
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
          'id, total_amount, quantity, status, created_at, updated_at'
        )
        .eq('producer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);

      if (isRefresh) {
        toast.success('Earnings updated.');
      }
    } catch (error) {
      console.error('Earnings error:', error);
      setOrders([]);

      toast.error(
        error.message || 'Unable to load your earnings.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  const totals = useMemo(() => {
    const completed = orders.filter(
      (order) => order.status === 'completed'
    );

    const active = orders.filter((order) =>
      ['pending', 'confirmed', 'processing'].includes(order.status)
    );

    const cancelled = orders.filter(
      (order) => order.status === 'cancelled'
    );

    const completedValue = completed.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );

    const activeValue = active.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );

    const totalValue = orders
      .filter((order) => order.status !== 'cancelled')
      .reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0
      );

    const completedQuantity = completed.reduce(
      (sum, order) => sum + Number(order.quantity || 0),
      0
    );

    return {
      completedValue,
      activeValue,
      totalValue,
      completedQuantity,
      completedOrders: completed.length,
      activeOrders: active.length,
      cancelledOrders: cancelled.length,
      totalOrders: orders.length,
    };
  }, [orders]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 8);
  }, [orders]);

  const monthlyEarnings = useMemo(() => {
    const now = new Date();

    return orders
      .filter((order) => {
        if (order.status !== 'completed') return false;

        const date = new Date(order.created_at);

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0
      );
  }, [orders]);

  const completionRate = useMemo(() => {
    if (orders.length === 0) return 0;

    return Math.round(
      (totals.completedOrders / orders.length) * 100
    );
  }, [orders.length, totals.completedOrders]);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-teal-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              <Wallet className="h-3.5 w-3.5" />
              Your Farm Earnings
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Earnings & Payouts
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
              See how much your farm has earned from completed orders
              and keep track of money connected to your sales.
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
                refreshing ? 'animate-spin' : ''
              }`}
            />
            {refreshing ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Main earning cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="group rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CircleDollarSign className="h-5 w-5" />
                </div>

                <ArrowUpRight className="h-4 w-4 text-emerald-400 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>

              <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Completed Sales
              </p>

              <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                {formatCurrency(totals.completedValue)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Money from completed orders
              </p>
            </div>

            <div className="group rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock3 className="h-5 w-5" />
                </div>

                <ArrowUpRight className="h-4 w-4 text-amber-400 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>

              <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Sales
              </p>

              <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                {formatCurrency(totals.activeValue)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Orders still being processed
              </p>
            </div>

            <div className="group rounded-2xl border border-blue-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </div>

                <ArrowUpRight className="h-4 w-4 text-blue-400 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>

              <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                This Month
              </p>

              <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                {formatCurrency(monthlyEarnings)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Completed sales this month
              </p>
            </div>

            <div className="group rounded-2xl border border-violet-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Package className="h-5 w-5" />
                </div>

                <ArrowUpRight className="h-4 w-4 text-violet-400 transition group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>

              <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Products Sold
              </p>

              <p className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                {formatNumber(totals.completedQuantity)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Total quantity in completed orders
              </p>
            </div>
          </section>

          {/* Overview */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sales Overview
                  </p>

                  <h2 className="mt-1 text-lg font-black text-slate-900">
                    How your sales are doing
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-black text-slate-900">
                      {completionRate}%
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Orders completed
                    </p>
                  </div>

                  <p className="text-xs font-semibold text-slate-500">
                    {formatNumber(totals.completedOrders)} of{' '}
                    {formatNumber(totals.totalOrders)}
                  </p>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{
                      width: `${completionRate}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {formatNumber(totals.totalOrders)}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Completed
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {formatNumber(totals.completedOrders)}
                  </p>
                </div>

                <div className="rounded-xl bg-amber-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    Active
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {formatNumber(totals.activeOrders)}
                  </p>
                </div>

                <div className="rounded-xl bg-red-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">
                    Cancelled
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {formatNumber(totals.cancelledOrders)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm ring-1 ring-emerald-100">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>

              <h2 className="mt-5 text-lg font-black text-slate-900">
                Your sales so far
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep serving buyers and completing orders to grow your
                farm sales.
              </p>

              <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Total sales value
                </p>

                <p className="mt-2 text-2xl font-black text-emerald-700">
                  {formatCurrency(totals.totalValue)}
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Keep growing your marketplace sales
                </div>
              </div>
            </div>
          </section>

          {/* Earnings history */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sales History
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-900">
                  Recent earnings
                </h2>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <CalendarDays className="h-4 w-4" />
                Latest orders
              </div>
            </div>

            {recentOrders.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Wallet className="h-6 w-6 text-slate-400" />
                </div>

                <h3 className="mt-4 text-base font-black text-slate-800">
                  No sales yet
                </h3>

                <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">
                  Your order earnings will appear here as buyers place
                  orders for your products.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.map((order) => {
                  const config =
                    statusStyles[order.status] ||
                    statusStyles.pending;

                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <Package className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-800">
                            Order #{order.id
                              .slice(0, 8)
                              .toUpperCase()}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span>
                              {formatNumber(order.quantity)} units
                            </span>

                            <span>•</span>

                            <span>
                              {formatDate(order.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${config.className}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </span>

                        <p className="min-w-[115px] text-right text-sm font-black text-slate-900">
                          {formatCurrency(order.total_amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
