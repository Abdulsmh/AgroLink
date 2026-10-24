
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  Sprout,
  MapPin,
  Activity,
  UserRound,
  ClipboardList,
  UserPlus,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const EMPTY_STATS = {
  farmers: 0,
  totalRelationships: 0,
  pendingRelationships: 0,
  rejectedRelationships: 0,
  listings: 0,
  orders: 0,
};

const normalizeStatus = (status) =>
  String(status || 'pending').toLowerCase().trim();

const getFarmerId = (relationship) =>
  relationship?.farmer_id ||
  relationship?.producer_id ||
  relationship?.farmer?.id ||
  relationship?.producer?.id ||
  relationship?.farmer_profile?.id ||
  relationship?.producer_profile?.id ||
  null;

const getFarmerName = (relationship) => {
  const farmer =
    relationship?.farmer ||
    relationship?.producer ||
    relationship?.farmer_profile ||
    relationship?.producer_profile;

  return (
    relationship?.farmer_name ||
    relationship?.producer_name ||
    farmer?.business_name ||
    farmer?.farm_name ||
    farmer?.full_name ||
    farmer?.name ||
    'AgroLink farmer'
  );
};

const getFarmerLocation = (relationship) => {
  const farmer =
    relationship?.farmer ||
    relationship?.producer ||
    relationship?.farmer_profile ||
    relationship?.producer_profile;

  return (
    relationship?.lga_location ||
    relationship?.location ||
    farmer?.lga_location ||
    farmer?.location ||
    'Location not provided'
  );
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'Date unavailable';

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconClass = 'bg-emerald-50 text-emerald-700',
  to,
}) => {
  const content = (
    <div className="flex h-full items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
      >
        <Icon size={23} />
      </div>
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {content}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);

  const styles = {
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    accepted: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    fulfilled: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    in_progress: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    rejected: 'bg-red-50 text-red-700 ring-red-600/20',
    revoked: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    confirmed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    processing: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  };

  const label = normalized.replaceAll('_', ' ');

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
        styles[normalized] ||
        'bg-slate-100 text-slate-600 ring-slate-500/20'
      }`}
    >
      {label}
    </span>
  );
};

const AggregatorDashboard = () => {
  const { user, userProfile, updateUserProfile } = useAuth();

  const [stats, setStats] = useState(EMPTY_STATS);
  const [relationships, setRelationships] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [liveProfile, setLiveProfile] = useState(null);

  const requestIdRef = useRef(0);
  const refreshTimerRef = useRef(null);

  const verificationStatus =
    liveProfile?.verification_status ??
    userProfile?.verification_status ??
    'pending';

  const role = liveProfile?.role ?? userProfile?.role;
  const isApproved =
    role === 'aggregator' &&
    normalizeStatus(verificationStatus) === 'approved';

  // Keep the local profile current when the AuthContext profile changes.
  useEffect(() => {
    if (!userProfile) return;

    setLiveProfile((current) => {
      if (!current) return userProfile;

      return {
        ...current,
        ...userProfile,
      };
    });
  }, [userProfile]);

  const fetchDashboardData = useCallback(
    async ({ silent = false } = {}) => {
      if (!user?.id) {
        setStats(EMPTY_STATS);
        setRelationships([]);
        setRecentOrders([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!isApproved) {
        setStats(EMPTY_STATS);
        setRelationships([]);
        setRecentOrders([]);
        setErrorMessage('');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const requestId = ++requestIdRef.current;

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage('');

      try {
        const relationshipResult = await supabase.rpc(
          'list_aggregator_farmer_relationships'
        );

        if (relationshipResult.error) {
          throw relationshipResult.error;
        }

        const allRelationships = Array.isArray(relationshipResult.data)
          ? relationshipResult.data
          : [];

        const approvedRelationships = allRelationships.filter(
          (relationship) =>
            normalizeStatus(relationship?.status) === 'approved'
        );

        const farmerIds = [
          ...new Set(
            approvedRelationships
              .map(getFarmerId)
              .filter(Boolean)
          ),
        ];

        // Fetch listings for farmers connected to this aggregator.
        // The RPC should enforce access to the current aggregator's farmers.
        let listingCount = 0;

        if (farmerIds.length > 0) {
          const listingsResult = await supabase.rpc(
            'list_aggregator_farmer_products'
          );

          if (listingsResult.error) {
            console.error(
              'Could not load aggregator farmer listings:',
              listingsResult.error
            );
          } else {
            const listings = Array.isArray(listingsResult.data)
              ? listingsResult.data
              : [];

            listingCount = listings.length;
          }
        }

        let orders = [];
        let orderCount = 0;

        if (farmerIds.length > 0) {
          const ordersResult = await supabase
            .from('orders')
            .select(
              'id, producer_id, product_id, quantity, total_amount, status, created_at',
              { count: 'exact' }
            )
            .in('producer_id', farmerIds)
            .order('created_at', { ascending: false })
            .limit(5);

          if (ordersResult.error) {
            console.error(
              'Could not load aggregator farmer orders:',
              ordersResult.error
            );
          } else {
            orders = ordersResult.data || [];
            orderCount = ordersResult.count ?? orders.length;
          }
        }

        if (requestId !== requestIdRef.current) return;

        const pendingCount = allRelationships.filter(
          (relationship) =>
            normalizeStatus(relationship?.status) === 'pending'
        ).length;

        const rejectedCount = allRelationships.filter(
          (relationship) =>
            normalizeStatus(relationship?.status) === 'rejected'
        ).length;

        setRelationships(allRelationships);
        setRecentOrders(orders);
        setStats({
          farmers: farmerIds.length,
          totalRelationships: allRelationships.length,
          pendingRelationships: pendingCount,
          rejectedRelationships: rejectedCount,
          listings: listingCount,
          orders: orderCount,
        });
        setLastUpdated(new Date());
      } catch (error) {
        if (requestId !== requestIdRef.current) return;

        console.error('Aggregator dashboard error:', error);
        setErrorMessage(
          error?.message ||
            'We could not load your dashboard. Please try again.'
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [user?.id, isApproved]
  );

  // Initial load and reload when approval status changes.
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return undefined;
    }

    fetchDashboardData();

    return () => {
      requestIdRef.current += 1;
    };
  }, [user?.id, isApproved, fetchDashboardData]);

  // Listen for verification or profile changes.
  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`aggregator-dashboard-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setLiveProfile(null);
            setStats(EMPTY_STATS);
            setRelationships([]);
            setRecentOrders([]);
            return;
          }

          if (payload.new) {
            setLiveProfile((current) => ({
              ...(current || {}),
              ...payload.new,
            }));

            if (typeof updateUserProfile === 'function') {
              updateUserProfile(payload.new);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(
            'Aggregator profile realtime subscription failed.'
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, updateUserProfile]);

  // Refresh the dashboard when relationship, listing, or order data changes.
  useEffect(() => {
    if (!user?.id || !isApproved) return undefined;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        fetchDashboardData({ silent: true });
      }, 300);
    };

    const channel = supabase
      .channel(`aggregator-dashboard-data-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aggregator_farmers',
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        scheduleRefresh
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(
            'Aggregator dashboard realtime subscription failed.'
          );
        }
      });

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      supabase.removeChannel(channel);
    };
  }, [user?.id, isApproved, fetchDashboardData]);

  const relationshipSummary = useMemo(() => {
    const summary = {
      approved: 0,
      pending: 0,
      rejected: 0,
      revoked: 0,
    };

    relationships.forEach((relationship) => {
      const status = normalizeStatus(relationship?.status);

      if (Object.prototype.hasOwnProperty.call(summary, status)) {
        summary[status] += 1;
      }
    });

    return summary;
  }, [relationships]);

  const recentRelationships = useMemo(
    () =>
      [...relationships]
        .sort((a, b) => {
          const dateA = new Date(
            a?.updated_at || a?.created_at || 0
          ).getTime();

          const dateB = new Date(
            b?.updated_at || b?.created_at || 0
          ).getTime();

          return dateB - dateA;
        })
        .slice(0, 5),
    [relationships]
  );

  const quickActions = [
    {
      title: 'Manage farmers',
      description: 'View connected farmers and request new connections.',
      icon: Users,
      to: '/aggregator/farmers',
      iconClass: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: 'Register a farmer',
      description: 'Help a farmer join AgroLink through your account.',
      icon: UserPlus,
      to: '/aggregator/register-farmer',
      iconClass: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'View farmer listings',
      description: 'Explore available products from connected farmers.',
      icon: Package,
      to: '/aggregator/listings',
      iconClass: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Manage requests',
      description: 'Review incoming bulk requests from buyers.',
      icon: ClipboardList,
      to: '/aggregator/requests',
      iconClass: 'bg-violet-50 text-violet-700',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
            <RefreshCw
              size={26}
              className="animate-spin text-emerald-600"
            />
          </div>
          <p className="mt-4 font-semibold text-slate-800">
            Loading your dashboard
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Gathering your latest AgroLink activity...
          </p>
        </div>
      </div>
    );
  }

  if (!isApproved) {
    const isRejected =
      normalizeStatus(verificationStatus) === 'rejected';

    return (
      <div className="mx-auto max-w-3xl py-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className={`p-6 sm:p-8 ${
              isRejected ? 'bg-red-50' : 'bg-amber-50'
            }`}
          >
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                isRejected
                  ? 'bg-red-100 text-red-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {isRejected ? (
                <XCircle size={28} />
              ) : (
                <Clock3 size={28} />
              )}
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              {isRejected
                ? 'Verification needs attention'
                : 'Your account is awaiting approval'}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {isRejected
                ? 'Your aggregator verification was rejected. Review your profile and submitted information, then contact the AgroLink team for the next steps.'
                : 'Your aggregator account must be approved before you can manage farmer relationships, view connected farmer listings, and handle operational requests.'}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">
                  Verification status
                </p>
                <div className="mt-2">
                  <StatusBadge status={verificationStatus} />
                </div>
              </div>

              <Link
                to="/aggregator/profile"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Review my profile
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Page heading */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-6 text-white shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[30px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-20 right-32 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
              <Activity size={14} />
              Aggregator workspace
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back
              {userProfile?.full_name
                ? `, ${userProfile.full_name.split(' ')[0]}`
                : ''}
              !
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/90 sm:text-base">
              Manage your farmer connections, monitor product availability,
              and coordinate agricultural orders from one place.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-emerald-50/90">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                Verified aggregator
              </span>

              {lastUpdated && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={14} />
                  Updated {lastUpdated.toLocaleTimeString('en-NG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboardData()}
            disabled={isRefreshing}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
          >
            <RefreshCw
              size={17}
              className={isRefreshing ? 'animate-spin' : ''}
            />
            {isRefreshing ? 'Refreshing...' : 'Refresh dashboard'}
          </button>
        </div>
      </section>

      {/* Error message */}
      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              size={21}
              className="mt-0.5 shrink-0 text-red-600"
            />
            <div>
              <p className="font-semibold text-red-900">
                Unable to refresh all dashboard data
              </p>
              <p className="mt-1 text-sm leading-5 text-red-700">
                {errorMessage}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboardData()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      )}

      {/* Statistics */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Your overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A snapshot of your aggregator activity.
            </p>
          </div>

          <span className="hidden items-center gap-1.5 text-xs text-slate-400 sm:inline-flex">
            <Activity size={14} />
            Live updates enabled
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Connected farmers"
            value={stats.farmers}
            description="Farmers with approved relationships"
            icon={Users}
            to="/aggregator/farmers"
          />

          <StatCard
            title="Available listings"
            value={stats.listings}
            description="Products returned by the farmer listings service"
            icon={Package}
            iconClass="bg-blue-50 text-blue-700"
            to="/aggregator/listings"
          />

          <StatCard
            title="Farmer orders"
            value={stats.orders}
            description="Orders associated with connected farmers"
            icon={ShoppingCart}
            iconClass="bg-violet-50 text-violet-700"
            to="/aggregator/orders"
          />

          <StatCard
            title="Pending connections"
            value={stats.pendingRelationships}
            description="Farmer relationships awaiting a decision"
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-700"
            to="/aggregator/farmers"
          />

          <StatCard
            title="Approved connections"
            value={relationshipSummary.approved}
            description="Approved relationships in your records"
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-700"
            to="/aggregator/farmers"
          />

          <StatCard
            title="Rejected connections"
            value={stats.rejectedRelationships}
            description="Relationships that were rejected"
            icon={XCircle}
            iconClass="bg-red-50 text-red-700"
            to="/aggregator/farmers"
          />
        </div>
      </section>

      {/* Relationships and orders */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">
                Recent farmer connections
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                The latest relationships in your account
              </p>
            </div>

            <Link
              to="/aggregator/farmers"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View all
              <ArrowRight size={15} />
            </Link>
          </div>

          {recentRelationships.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Users size={23} />
              </div>
              <p className="mt-4 font-semibold text-slate-800">
                No farmer connections yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-500">
                Connect with farmers to help them reach more buyers through
                AgroLink.
              </p>
              <Link
                to="/aggregator/farmers"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Explore farmers
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentRelationships.map((relationship, index) => {
                const farmerId = getFarmerId(relationship);
                const farmerName = getFarmerName(relationship);
                const status = normalizeStatus(relationship?.status);

                return (
                  <div
                    key={
                      relationship?.id ||
                      relationship?.relationship_id ||
                      farmerId ||
                      `relationship-${index}`
                    }
                    className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <UserRound size={21} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {farmerName}
                      </p>
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
                        <MapPin size={12} className="shrink-0" />
                        {getFarmerLocation(relationship)}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-3 border-t border-slate-100 bg-slate-50/70">
            <div className="p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">
                {relationshipSummary.approved}
              </p>
              <p className="mt-1 text-xs text-slate-500">Approved</p>
            </div>
            <div className="border-x border-slate-100 p-3 text-center">
              <p className="text-lg font-bold text-amber-600">
                {relationshipSummary.pending}
              </p>
              <p className="mt-1 text-xs text-slate-500">Pending</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-lg font-bold text-red-600">
                {relationshipSummary.rejected}
              </p>
              <p className="mt-1 text-xs text-slate-500">Rejected</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-slate-900">
                Recent farmer orders
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest orders associated with your connected farmers
              </p>
            </div>

            <Link
              to="/aggregator/orders"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View all
              <ArrowRight size={15} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ShoppingCart size={23} />
              </div>
              <p className="mt-4 font-semibold text-slate-800">
                No farmer orders yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-slate-500">
                Orders linked to your connected farmers will appear here when
                available.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-start gap-3 px-5 py-4 sm:px-6"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Package size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      Farmer order
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Created {formatDate(order.created_at)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      Ref: AG-{String(order.id).slice(0, 8).toUpperCase()}
                    </p>
                    {order.total_amount != null && (
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {formatCurrency(order.total_amount)}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Quick actions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Continue working on the most important parts of your account.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.title}
                to={action.to}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${action.iconClass}`}
                  >
                    <Icon size={21} />
                  </div>
                  <ArrowRight
                    size={18}
                    className="mt-1 text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600"
                  />
                </div>

                <h3 className="mt-4 font-bold text-slate-900">
                  {action.title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Account reminder */}
      <section className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              Keep your aggregator profile up to date
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">
              Accurate contact and location details help farmers and the
              AgroLink team coordinate with you.
            </p>
          </div>
        </div>

        <Link
          to="/aggregator/profile"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          Update profile
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
  );
};

export default AggregatorDashboard;
