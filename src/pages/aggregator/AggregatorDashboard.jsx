
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  ShoppingCart,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Clock3,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const StatCard = ({ title, value, description, icon: Icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-2 text-xs text-slate-500">{description}</p>
      </div>

      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const normalized = String(status || 'pending').toLowerCase();

  const styles = {
    approved: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const icons = {
    approved: CheckCircle2,
    pending: Clock3,
    rejected: XCircle,
  };

  const Icon = icons[normalized] || Clock3;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        styles[normalized] || styles.pending
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
    </span>
  );
};

const AggregatorDashboard = () => {
  const { user, userProfile } = useAuth();

  const [stats, setStats] = useState({
    farmers: 0,
    listings: 0,
    orders: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const verificationStatus =
    userProfile?.verification_status || 'pending';

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      /*
       * These queries use existing tables only.
       * The farmer relationship has not yet been implemented,
       * so we must not count every producer as this aggregator's farmer.
       *
       * Until that relationship exists, farmer and managed-listing
       * counts remain zero rather than showing misleading figures.
       */
      const [ordersResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true }),
      ]);

      if (ordersResult.error) throw ordersResult.error;

      setStats({
        farmers: 0,
        listings: 0,
        orders: ordersResult.count ?? 0,
      });
    } catch (error) {
      console.error('Aggregator dashboard error:', error);
      setErrorMessage(
        error.message || 'Unable to load dashboard information.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const quickActions = [
    {
      title: 'Manage Farmers',
      description: 'View the farmers associated with your account.',
      to: '/aggregator/farmers',
      icon: Users,
    },
    {
      title: 'Register a Farmer',
      description: 'Start the registration process for a farmer.',
      to: '/aggregator/register-farmer',
      icon: Users,
    },
    {
      title: 'Manage Listings',
      description: 'Review produce listings you are authorized to manage.',
      to: '/aggregator/listings',
      icon: Package,
    },
    {
      title: 'View Orders',
      description: 'Review orders available to your account.',
      to: '/aggregator/orders',
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            AgroLink Workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Aggregator Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Coordinate farmer registration, produce listings, and orders.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </section>

      {/* Verification notice */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Aggregator Verification
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Your verification status determines access to aggregator
                operations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={verificationStatus} />
            <Link
              to="/aggregator/profile"
              className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View details <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {verificationStatus !== 'approved' && (
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {verificationStatus === 'rejected'
              ? 'Your verification was rejected. Visit your profile to review the status and the next steps available.'
              : 'Your account is awaiting approval. You can review your profile while the administrator processes your verification.'}
          </div>
        )}
      </section>

      {/* Dashboard statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Workspace Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Current figures available to this dashboard.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">
                Dashboard data could not be loaded
              </p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Associated Farmers"
            value={isLoading ? '—' : stats.farmers}
            description="Farmers linked to your account"
            icon={Users}
          />
          <StatCard
            title="Managed Listings"
            value={isLoading ? '—' : stats.listings}
            description="Listings you are authorized to manage"
            icon={Package}
          />
          <StatCard
            title="Orders"
            value={isLoading ? '—' : stats.orders}
            description="Orders visible under current database permissions"
            icon={ShoppingCart}
          />
        </div>

        {!errorMessage && !isLoading && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Farmer and listing totals will become live when we implement
            the secure aggregator-to-farmer relationship. The order total
            reflects the orders currently visible under your Supabase
            permissions; it is not yet an aggregator-specific order count.
          </p>
        )}
      </section>

      {/* Quick actions */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Quick Actions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Shortcuts to the main aggregator workflows.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 transition group-hover:bg-emerald-100">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900">
                    {action.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {action.description}
                  </p>
                </div>

                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AggregatorDashboard;
