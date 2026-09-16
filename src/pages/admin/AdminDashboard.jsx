import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Wheat,
  ShoppingCart,
  Loader2,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  UserCheck,
  Truck,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Clock3,
  CheckCircle2,
  XCircle,
  PackageCheck,
  CircleDollarSign,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

export function AdminDashboard() {
  const { userProfile } = useAuth();

  const [stats, setStats] = useState({
    usersCount: 0,
    listingsCount: 0,
    ordersCount: 0,
    pendingProducers: 0,
    activeOrders: 0,
    completedOrders: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchAdminStats = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [
        { count: usersCount, error: usersError },
        { count: listingsCount, error: listingsError },
        { count: ordersCount, error: ordersError },
        { count: pendingProducers, error: pendingError },
        { count: activeOrders, error: activeOrdersError },
        { count: completedOrders, error: completedOrdersError },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('products')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true }),

        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'producer')
          .eq('verification_status', 'pending'),

        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'confirmed', 'processing']),

        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed'),
      ]);

      if (usersError) throw usersError;
      if (listingsError) throw listingsError;
      if (ordersError) throw ordersError;
      if (pendingError) throw pendingError;
      if (activeOrdersError) throw activeOrdersError;
      if (completedOrdersError) throw completedOrdersError;

      setStats({
        usersCount: usersCount || 0,
        listingsCount: listingsCount || 0,
        ordersCount: ordersCount || 0,
        pendingProducers: pendingProducers || 0,
        activeOrders: activeOrders || 0,
        completedOrders: completedOrders || 0,
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);

      setErrorMessage(
        'Unable to load dashboard statistics. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const completionRate = useMemo(() => {
    if (!stats.ordersCount) return 0;

    return Math.round(
      (stats.completedOrders / stats.ordersCount) * 100
    );
  }, [stats.ordersCount, stats.completedOrders]);

  const statCards = [
    {
      title: 'Total Users',
      value: stats.usersCount,
      description: 'Registered platform users',
      icon: Users,
      iconStyle: 'bg-emerald-50 text-emerald-600',
      accent: 'group-hover:border-emerald-200',
    },
    {
      title: 'Crop Listings',
      value: stats.listingsCount,
      description: 'Products listed by producers',
      icon: Wheat,
      iconStyle: 'bg-amber-50 text-amber-600',
      accent: 'group-hover:border-amber-200',
    },
    {
      title: 'Total Orders',
      value: stats.ordersCount,
      description: 'Marketplace transactions',
      icon: ShoppingCart,
      iconStyle: 'bg-blue-50 text-blue-600',
      accent: 'group-hover:border-blue-200',
    },
  ];

  return (
    <div className="relative space-y-7 pb-8">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl" />

      <div className="pointer-events-none absolute left-1/3 top-80 -z-10 h-56 w-56 rounded-full bg-lime-100/30 blur-3xl" />

      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-100/70 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
              <Activity className="h-4 w-4" />
              Platform Overview
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Welcome back, {userProfile?.full_name || 'Admin'}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor marketplace activity, producer verification,
              orders, and agricultural operations across AgroLink.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAdminStats}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 lg:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                isLoading ? 'animate-spin' : ''
              }`}
            />

            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </section>

      {/* Error */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="flex-1">
            <p className="font-bold">Dashboard error</p>
            <p className="mt-1">{errorMessage}</p>
          </div>

          <button
            type="button"
            onClick={fetchAdminStats}
            className="rounded-lg px-3 py-1.5 text-xs font-bold transition hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main statistics */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Marketplace Snapshot
          </p>

          <h2 className="mt-1 text-lg font-black text-slate-900">
            Platform at a glance
          </h2>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${card.accent}`}
                  style={{
                    animation: `fadeUp 0.45s ease-out ${
                      index * 80
                    }ms both`,
                  }}
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-slate-50 transition duration-500 group-hover:scale-150" />

                  <div className="relative flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.iconStyle} transition duration-300 group-hover:scale-105`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <ArrowUpRight className="h-5 w-5 text-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </div>

                  <div className="relative mt-6">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      {card.title}
                    </p>

                    <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
                      {card.value.toLocaleString()}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Activity overview */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ActivityCard
          icon={UserCheck}
          title="Producer Reviews"
          value={stats.pendingProducers}
          description={
            stats.pendingProducers === 1
              ? 'producer waiting for review'
              : 'producers waiting for review'
          }
          link="/admin/approvals"
          linkText="Review producers"
          iconStyle="bg-emerald-50 text-emerald-600"
          loading={isLoading}
        />

        <ActivityCard
          icon={PackageCheck}
          title="Active Orders"
          value={stats.activeOrders}
          description={
            stats.activeOrders === 1
              ? 'order currently in progress'
              : 'orders currently in progress'
          }
          link="/admin/logistics"
          linkText="View logistics"
          iconStyle="bg-blue-50 text-blue-600"
          loading={isLoading}
        />

        <ActivityCard
          icon={CheckCircle2}
          title="Order Completion"
          value={`${completionRate}%`}
          description="of all orders are completed"
          link="/admin/orders"
          linkText="View marketplace"
          iconStyle="bg-amber-50 text-amber-600"
          loading={isLoading}
          disabledLink
        />
      </section>

      {/* Quick Actions */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Administration
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Jump directly to the tasks that need your attention.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            to="/admin/approvals"
            icon={UserCheck}
            title="Producer Approvals"
            description="Review and manage producer verification."
            iconStyle="bg-emerald-50 text-emerald-600"
            borderStyle="hover:border-emerald-300"
            badge={
              stats.pendingProducers > 0
                ? `${stats.pendingProducers} pending`
                : 'Up to date'
            }
            badgeStyle={
              stats.pendingProducers > 0
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-700'
            }
          />

          <QuickAction
            to="/admin/users"
            icon={Users}
            title="Manage Users"
            description="View and manage platform accounts."
            iconStyle="bg-blue-50 text-blue-600"
            borderStyle="hover:border-blue-300"
          />

          <QuickAction
            to="/admin/logistics"
            icon={Truck}
            title="Logistics Hub"
            description="Monitor active order fulfillment."
            iconStyle="bg-amber-50 text-amber-600"
            borderStyle="hover:border-amber-300"
            badge={
              stats.activeOrders > 0
                ? `${stats.activeOrders} active`
                : 'No active orders'
            }
            badgeStyle="bg-blue-50 text-blue-700"
          />

          <QuickAction
            to="/admin/audits"
            icon={ShieldCheck}
            title="System Audits"
            description="Review important platform activities."
            iconStyle="bg-purple-50 text-purple-600"
            borderStyle="hover:border-purple-300"
          />
        </div>
      </section>

      {/* Operational overview */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Marketplace Health
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                Current activity
              </h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <ProgressRow
              label="Completed orders"
              value={stats.completedOrders}
              total={stats.ordersCount}
              icon={CheckCircle2}
              iconStyle="text-emerald-600"
            />

            <ProgressRow
              label="Active orders"
              value={stats.activeOrders}
              total={stats.ordersCount}
              icon={Clock3}
              iconStyle="text-blue-600"
            />

            <ProgressRow
              label="Pending producer reviews"
              value={stats.pendingProducers}
              total={stats.usersCount}
              icon={UserCheck}
              iconStyle="text-amber-600"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Admin Attention
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-900">
                What needs checking
              </h2>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <AttentionItem
              icon={UserCheck}
              title="Producer verification"
              value={stats.pendingProducers}
              description="pending"
              to="/admin/approvals"
              iconStyle="bg-emerald-50 text-emerald-600"
            />

            <AttentionItem
              icon={Clock3}
              title="Active orders"
              value={stats.activeOrders}
              description="in progress"
              to="/admin/logistics"
              iconStyle="bg-blue-50 text-blue-600"
            />

            <AttentionItem
              icon={XCircle}
              title="Completed orders"
              value={stats.completedOrders}
              description="successfully completed"
              to="/admin/audits"
              iconStyle="bg-slate-100 text-slate-600"
            />
          </div>
        </div>
      </section>

      {/* Kano Oversight */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-2xl" />

        <div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-emerald-400/5 blur-3xl" />

        <div className="absolute left-1/2 top-0 h-full w-px bg-white/5" />

        <div className="relative z-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-700 bg-emerald-950/70 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              Kano Hub Oversight
            </div>

            <h2 className="max-w-2xl text-xl font-black sm:text-2xl">
              Keep Kano's agricultural marketplace moving
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/75">
              Monitor producer verification, marketplace activity,
              and order fulfillment across AgroLink. Keep the platform
              reliable for farmers, buyers, and other marketplace
              participants.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/admin/approvals"
                className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/20 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                Review Producers
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              <Link
                to="/admin/pricing"
                className="group inline-flex items-center gap-2 rounded-xl border border-emerald-700 px-4 py-2.5 text-xs font-bold text-emerald-100 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-900"
              >
                Market Pricing
                <TrendingUp className="h-4 w-4 transition group-hover:translate-y-[-1px]" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            <MiniDarkStat
              label="Users"
              value={stats.usersCount}
            />

            <MiniDarkStat
              label="Listings"
              value={stats.listingsCount}
            />

            <MiniDarkStat
              label="Orders"
              value={stats.ordersCount}
            />

            <MiniDarkStat
              label="Pending"
              value={stats.pendingProducers}
            />
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------------------------
   Supporting Components
--------------------------------------------- */

const DashboardSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="animate-pulse">
            <div className="h-12 w-12 rounded-2xl bg-slate-100" />

            <div className="mt-6 h-3 w-24 rounded bg-slate-100" />

            <div className="mt-3 h-10 w-28 rounded bg-slate-100" />

            <div className="mt-3 h-3 w-40 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
};

const ActivityCard = ({
  icon: Icon,
  title,
  value,
  description,
  link,
  linkText,
  iconStyle,
  loading,
  disabledLink,
}) => {
  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconStyle}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <Activity className="h-4 w-4 text-slate-200 transition group-hover:text-slate-400" />
      </div>

      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {title}
        </p>

        {loading ? (
          <div className="mt-2 h-9 w-20 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">
            {value}
          </p>
        )}

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      {!disabledLink && (
        <Link
          to={link}
          className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 transition hover:gap-2"
        >
          {linkText}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
};

const QuickAction = ({
  to,
  icon: Icon,
  title,
  description,
  iconStyle,
  borderStyle,
  badge,
  badgeStyle,
}) => {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg ${borderStyle}`}
    >
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-slate-50 transition duration-500 group-hover:scale-150" />

      <div className="relative">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconStyle} transition duration-300 group-hover:scale-105`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">
              {title}
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {description}
            </p>
          </div>

          <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500" />
        </div>

        {badge && (
          <span
            className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeStyle}`}
          >
            {badge}
          </span>
        )}
      </div>
    </Link>
  );
};

const ProgressRow = ({
  label,
  value,
  total,
  icon: Icon,
  iconStyle,
}) => {
  const percentage =
    total > 0 ? Math.min((value / total) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={`h-4 w-4 shrink-0 ${iconStyle}`} />

          <span className="truncate text-xs font-semibold text-slate-600">
            {label}
          </span>
        </div>

        <span className="text-xs font-bold text-slate-900">
          {value.toLocaleString()}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const AttentionItem = ({
  icon: Icon,
  title,
  value,
  description,
  to,
  iconStyle,
}) => {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-sm"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-black text-slate-900">
          {value.toLocaleString()}
        </span>

        <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </div>
    </Link>
  );
};

const MiniDarkStat = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition duration-200 hover:bg-white/10">
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-white">
        {value.toLocaleString()}
      </p>
    </div>
  );
};
