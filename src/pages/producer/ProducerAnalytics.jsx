import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Package,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  CircleDollarSign,
  Boxes,
  Trophy,
  ArrowUpRight,
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

export const ProducerAnalytics = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [productsResult, ordersResult] = await Promise.all([
        supabase
          .from('products')
          .select(
            'id, crop_name, quantity, unit, price_per_unit'
          )
          .eq('producer_id', user.id),

        supabase
          .from('orders')
          .select(
            'id, product_id, quantity, total_amount, status, created_at'
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

      if (isRefresh) {
        toast.success('Analytics updated.');
      }
    } catch (error) {
      console.error('Analytics error:', error);

      setProducts([]);
      setOrders([]);

      toast.error(
        error.message || 'Unable to load your analytics.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const analytics = useMemo(() => {
    const completed = orders.filter(
      (order) => order.status === 'completed'
    );

    const active = orders.filter((order) =>
      ['pending', 'confirmed', 'processing'].includes(
        order.status
      )
    );

    const cancelled = orders.filter(
      (order) => order.status === 'cancelled'
    );

    const revenue = completed.reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

    const activeValue = active.reduce(
      (sum, order) =>
        sum + Number(order.total_amount || 0),
      0
    );

    const soldUnits = completed.reduce(
      (sum, order) =>
        sum + Number(order.quantity || 0),
      0
    );

    const inventoryValue = products.reduce(
      (sum, product) =>
        sum +
        Number(product.quantity || 0) *
          Number(product.price_per_unit || 0),
      0
    );

    const cropPerformance = products
      .map((product) => {
        const productOrders = completed.filter(
          (order) =>
            order.product_id === product.id
        );

        const sold = productOrders.reduce(
          (sum, order) =>
            sum + Number(order.quantity || 0),
          0
        );

        const earnings = productOrders.reduce(
          (sum, order) =>
            sum + Number(order.total_amount || 0),
          0
        );

        const stock = Number(product.quantity || 0);

        const salesRate =
          stock + sold > 0
            ? Math.round(
                (sold / (stock + sold)) * 100
              )
            : 0;

        return {
          ...product,
          sold,
          earnings,
          orderCount: productOrders.length,
          stock,
          salesRate,
        };
      })
      .sort((a, b) => b.earnings - a.earnings);

    const topProduct =
      cropPerformance.length > 0
        ? cropPerformance[0]
        : null;

    const completionRate =
      orders.length > 0
        ? Math.round(
            (completed.length / orders.length) * 100
          )
        : 0;

    return {
      completedCount: completed.length,
      activeCount: active.length,
      cancelledCount: cancelled.length,
      totalOrders: orders.length,
      revenue,
      activeValue,
      soldUnits,
      inventoryValue,
      cropPerformance,
      topProduct,
      completionRate,
    };
  }, [products, orders]);

  return (
    <div className="space-y-6 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 p-6 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-teal-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              <BarChart3 className="h-3.5 w-3.5" />
              Farm Performance
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Analytics & Yield
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
              Understand how your products are selling, what is
              moving well, and the value of your current stock.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
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
          {/* KPI cards */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={CircleDollarSign}
              label="Completed Revenue"
              value={formatCurrency(analytics.revenue)}
              description="From completed orders"
              iconClass="bg-emerald-50 text-emerald-600"
              borderClass="border-emerald-200"
            />

            <MetricCard
              icon={ShoppingCart}
              label="Completed Orders"
              value={formatNumber(analytics.completedCount)}
              description="Successfully fulfilled"
              iconClass="bg-blue-50 text-blue-600"
              borderClass="border-blue-200"
            />

            <MetricCard
              icon={Package}
              label="Units Sold"
              value={formatNumber(analytics.soldUnits)}
              description="Across completed orders"
              iconClass="bg-violet-50 text-violet-600"
              borderClass="border-violet-200"
            />

            <MetricCard
              icon={Boxes}
              label="Stock Value"
              value={formatCurrency(analytics.inventoryValue)}
              description="Estimated current inventory"
              iconClass="bg-amber-50 text-amber-600"
              borderClass="border-amber-200"
            />
          </section>

          {/* Overview */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Sales Overview
                  </p>

                  <h2 className="mt-1 text-lg font-black text-slate-900">
                    How your orders are performing
                  </h2>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Activity className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-black text-slate-900">
                      {analytics.completionRate}%
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Order completion rate
                    </p>
                  </div>

                  <p className="text-right text-xs font-semibold text-slate-500">
                    {formatNumber(
                      analytics.completedCount
                    )}{' '}
                    completed of{' '}
                    {formatNumber(analytics.totalOrders)}
                  </p>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{
                      width: `${analytics.completionRate}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat
                  label="All Orders"
                  value={analytics.totalOrders}
                />

                <MiniStat
                  label="Completed"
                  value={analytics.completedCount}
                  className="bg-emerald-50"
                />

                <MiniStat
                  label="Active"
                  value={analytics.activeCount}
                  className="bg-amber-50"
                />

                <MiniStat
                  label="Cancelled"
                  value={analytics.cancelledCount}
                  className="bg-red-50"
                />
              </div>
            </div>

            {/* Top performer */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 ring-1 ring-emerald-100">
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-200/30 blur-2xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm">
                    <Trophy className="h-5 w-5" />
                  </div>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm">
                    Top Performer
                  </span>
                </div>

                <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Best product
                </p>

                {analytics.topProduct ? (
                  <>
                    <h2 className="mt-1 truncate text-xl font-black text-slate-900">
                      {analytics.topProduct.crop_name}
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                      {formatNumber(
                        analytics.topProduct.sold
                      )}{' '}
                      {analytics.topProduct.unit} sold
                    </p>

                    <div className="mt-5 rounded-xl bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Sales generated
                      </p>

                      <p className="mt-1 text-xl font-black text-emerald-700">
                        {formatCurrency(
                          analytics.topProduct.earnings
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-5">
                    <h2 className="text-lg font-black text-slate-900">
                      No top product yet
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Your best-performing product will appear
                      here after you start completing orders.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Product performance */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Product Performance
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-900">
                  How your crops are selling
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Performance is based on completed orders.
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                {formatNumber(
                  analytics.cropPerformance.length
                )}{' '}
                products
              </div>
            </div>

            {analytics.cropPerformance.length === 0 ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Package className="h-6 w-6 text-slate-400" />
                </div>

                <h3 className="mt-4 text-base font-black text-slate-800">
                  No products to analyse
                </h3>

                <p className="mt-2 max-w-md text-xs leading-5 text-slate-400">
                  Add your harvests and start receiving orders to
                  see product performance here.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="divide-y divide-slate-100 md:hidden">
                  {analytics.cropPerformance.map(
                    (product, index) => (
                      <div
                        key={product.id}
                        className="p-5 transition hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-black text-emerald-700">
                              {index + 1}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900">
                                {product.crop_name}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {formatNumber(product.stock)}{' '}
                                {product.unit} currently available
                              </p>
                            </div>
                          </div>

                          <p className="shrink-0 text-sm font-black text-emerald-700">
                            {formatCurrency(
                              product.earnings
                            )}
                          </p>
                        </div>

                        <div className="mt-5">
                          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-slate-400">
                              Sales movement
                            </span>

                            <span className="text-emerald-600">
                              {product.salesRate}%
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                              style={{
                                width: `${product.salesRate}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              Sold
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-800">
                              {formatNumber(product.sold)}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              Orders
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-800">
                              {formatNumber(
                                product.orderCount
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              Price
                            </p>

                            <p className="mt-1 truncate text-sm font-black text-slate-800">
                              {formatCurrency(
                                product.price_per_unit
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-[10px] uppercase tracking-wider text-slate-500">
                        <th className="px-5 py-4">
                          Product
                        </th>

                        <th className="px-5 py-4">
                          Stock
                        </th>

                        <th className="px-5 py-4">
                          Sold
                        </th>

                        <th className="px-5 py-4">
                          Orders
                        </th>

                        <th className="px-5 py-4">
                          Sales movement
                        </th>

                        <th className="px-5 py-4 text-right">
                          Revenue
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {analytics.cropPerformance.map(
                        (product, index) => (
                          <tr
                            key={product.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-xs font-black text-emerald-700">
                                  {index + 1}
                                </div>

                                <div>
                                  <p className="font-bold text-slate-900">
                                    {product.crop_name}
                                  </p>

                                  <p className="mt-0.5 text-[11px] text-slate-400">
                                    {formatCurrency(
                                      product.price_per_unit
                                    )}{' '}
                                    / {product.unit}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {formatNumber(product.stock)}{' '}
                              {product.unit}
                            </td>

                            <td className="px-5 py-4 text-sm font-bold text-slate-700">
                              {formatNumber(product.sold)}{' '}
                              {product.unit}
                            </td>

                            <td className="px-5 py-4 text-sm text-slate-600">
                              {formatNumber(
                                product.orderCount
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex min-w-[150px] items-center gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{
                                      width: `${product.salesRate}%`,
                                    }}
                                  />
                                </div>

                                <span className="w-9 text-right text-xs font-bold text-slate-600">
                                  {product.salesRate}%
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-right text-sm font-black text-emerald-700">
                              {formatCurrency(
                                product.earnings
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Inventory insight */}
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <InsightCard
              icon={Boxes}
              title="Inventory insight"
              value={formatCurrency(
                analytics.inventoryValue
              )}
              description="Estimated value of the stock currently listed in your marketplace."
              iconClass="bg-amber-50 text-amber-600"
            />

            <InsightCard
              icon={TrendingUp}
              title="Active sales value"
              value={formatCurrency(
                analytics.activeValue
              )}
              description="Value of orders that are currently pending, confirmed or being processed."
              iconClass="bg-blue-50 text-blue-600"
            />
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

        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
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

const MiniStat = ({
  label,
  value,
  className = 'bg-slate-50',
}) => {
  return (
    <div className={`rounded-xl p-4 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-900">
        {formatNumber(value)}
      </p>
    </div>
  );
};

const InsightCard = ({
  icon: Icon,
  title,
  value,
  description,
  iconClass,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p className="mt-1 text-xl font-black text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};
