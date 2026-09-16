import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Truck,
  Wallet,
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

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

const getStatusStyles = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';

    case 'confirmed':
      return 'bg-blue-50 text-blue-700 border-blue-100';

    case 'processing':
      return 'bg-amber-50 text-amber-700 border-amber-100';

    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-100';

    case 'pending':
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const getStatusLabel = (status) => {
  if (!status) return 'Pending';

  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const ProducerDashboard = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const [productsResult, ordersResult] = await Promise.all([
          supabase
            .from('products')
            .select(
              'id, crop_name, quantity, unit, price_per_unit, location, image_path, created_at'
            )
            .eq('producer_id', user.id)
            .order('created_at', { ascending: false }),

          supabase
            .from('orders')
            .select(
              'id, buyer_id, product_id, quantity, total_amount, status, delivery_location, created_at, updated_at'
            )
            .eq('producer_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

        if (productsResult.error) {
          throw productsResult.error;
        }

        if (ordersResult.error) {
          throw ordersResult.error;
        }

        setProducts(productsResult.data || []);
        setOrders(ordersResult.data || []);
      } catch (err) {
        console.error('Producer dashboard error:', err);
        setError(err.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter(
      (order) =>
        order.status !== 'completed' && order.status !== 'cancelled'
    );

    const completedOrders = orders.filter(
      (order) => order.status === 'completed'
    );

    const totalRevenue = completedOrders.reduce(
      (total, order) => total + Number(order.total_amount || 0),
      0
    );

    const pendingRevenue = activeOrders.reduce(
      (total, order) => total + Number(order.total_amount || 0),
      0
    );

    const totalInventory = products.reduce(
      (total, product) => total + Number(product.quantity || 0),
      0
    );

    return {
      totalListings: products.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      pendingRevenue,
      totalInventory,
    };
  }, [products, orders]);

  const recentProducts = useMemo(() => {
    return products.slice(0, 5);
  }, [products]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 5);
  }, [orders]);

  const verificationStatus =
    userProfile?.verification_status || 'pending';

  const verificationMessage = {
    approved:
      'Your producer account has been verified. You can continue managing your marketplace activities.',
    rejected:
      'Your verification requires attention. Please review your producer information and contact AgroLink support.',
    pending:
      'Your producer account is currently awaiting verification. Some marketplace features may remain limited.',
  };

  const handleRefresh = async () => {
    await fetchDashboardData(true);
    toast.success('Dashboard refreshed');
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-100">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-36 animate-pulse rounded-3xl bg-white shadow-sm" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-white shadow-sm"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm xl:col-span-2" />
            <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6 text-white shadow-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-lime-300/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                <Activity className="h-3.5 w-3.5" />
                Producer Workspace
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                Welcome back, {userProfile?.full_name || 'Producer'}
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
                Manage your agricultural inventory, monitor orders, and keep
                track of your marketplace performance from one place.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/60 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? 'animate-spin' : ''
                  }`}
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => navigate('/producer/listings')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-900 shadow-lg transition hover:bg-emerald-50 active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Add Harvest
              </button>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-bold text-red-800">
                  Unable to load some dashboard data
                </p>
                <p className="mt-1 text-xs leading-5 text-red-600">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchDashboardData()}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-700"
            >
              Try Again
            </button>
          </section>
        )}

        {/* Verification */}
        <section
          className={`rounded-2xl border p-5 shadow-sm ${
            verificationStatus === 'approved'
              ? 'border-emerald-200 bg-emerald-50'
              : verificationStatus === 'rejected'
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  verificationStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-600'
                    : verificationStatus === 'rejected'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                {verificationStatus === 'approved' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Clock3 className="h-5 w-5" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-black text-slate-900">
                    Producer Verification
                  </h2>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      verificationStatus === 'approved'
                        ? 'border-emerald-200 bg-white text-emerald-700'
                        : verificationStatus === 'rejected'
                        ? 'border-red-200 bg-white text-red-700'
                        : 'border-amber-200 bg-white text-amber-700'
                    }`}
                  >
                    {verificationStatus.replace('_', ' ')}
                  </span>
                </div>

                <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
                  {verificationMessage[verificationStatus] ||
                    verificationMessage.pending}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/producer/verification')}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-emerald-700"
            >
              View Status
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Listings
                </p>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {formatNumber(stats.totalListings)}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105">
                <Package className="h-5 w-5" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/producer/listings')}
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              Manage inventory
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Orders
                </p>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {formatNumber(stats.activeOrders)}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-105">
                <ShoppingCart className="h-5 w-5" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/producer/orders')}
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800"
            >
              View orders
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Completed Revenue
                </p>
                <p className="mt-3 truncate text-2xl font-black text-slate-900">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:scale-105">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-4 text-xs font-medium text-slate-500">
              From completed orders
            </p>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Inventory Stock
                </p>
                <p className="mt-3 text-2xl font-black text-slate-900">
                  {formatNumber(stats.totalInventory)}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:scale-105">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-4 text-xs font-medium text-slate-500">
              Across your current products
            </p>
          </div>
        </section>

        {/* Main content */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Recent Orders */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Recent Orders
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Latest orders assigned to your producer account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/producer/orders')}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                View all
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <ShoppingCart className="h-6 w-6 text-slate-400" />
                </div>

                <h3 className="mt-4 text-sm font-bold text-slate-700">
                  No orders yet
                </h3>

                <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                  Orders placed against your products will appear here once
                  buyers start purchasing.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <Truck className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatNumber(order.quantity)} units
                          {order.delivery_location
                            ? ` • ${order.delivery_location}`
                            : ''}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <p className="text-sm font-black text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </p>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${getStatusStyles(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Revenue Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Earnings Snapshot
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Current order value overview.
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Completed Revenue
                </p>
                <p className="mt-2 text-xl font-black text-slate-900">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Pending Order Value
                </p>
                <p className="mt-2 text-xl font-black text-slate-900">
                  {formatCurrency(stats.pendingRevenue)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Completed
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {formatNumber(stats.completedOrders)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Active
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-900">
                    {formatNumber(stats.activeOrders)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Recent Inventory
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Your latest agricultural products listed on AgroLink.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/producer/listings')}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              Manage inventory
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recentProducts.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <Package className="h-6 w-6 text-emerald-500" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-slate-700">
                No products listed yet
              </h3>

              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
                Add your first harvest or agricultural product to start
                receiving buyer orders.
              </p>

              <button
                type="button"
                onClick={() => navigate('/producer/listings')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Product
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Quantity
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Price / Unit
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Location
                    </th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Added
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {recentProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                            <Package className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold capitalize text-slate-800">
                              {product.crop_name}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {formatNumber(product.quantity)} {product.unit}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-800">
                        {formatCurrency(product.price_per_unit)}
                      </td>

                      <td className="max-w-[180px] truncate px-5 py-4 text-xs text-slate-500">
                        {product.location || 'Not specified'}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {formatDate(product.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <div className="mb-3">
            <h2 className="text-base font-black text-slate-900">
              Quick Actions
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Common producer tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => navigate('/producer/listings')}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105">
                <Plus className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Add Harvest
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Create a new product listing
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/producer/orders')}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-105">
                <Truck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Manage Orders
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Review incoming buyer orders
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/producer/analytics')}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:scale-105">
                <TrendingUp className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  View Analytics
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Track sales and performance
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/producer/profile')}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:scale-105">
                <Activity className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-bold text-slate-800">
                  Producer Profile
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Update your farm information
                </p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
