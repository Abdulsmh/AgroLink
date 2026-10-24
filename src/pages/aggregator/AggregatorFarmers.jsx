
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Search,
  Users,
  RefreshCw,
  UserRoundPlus,
  MapPin,
  Sprout,
  Clock3,
  CheckCircle2,
  XCircle,
  Ban,
  AlertCircle,
  CalendarDays,
  Building2,
  UserCheck,
  UserX,
  Leaf,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  revoked: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS_ICONS = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: XCircle,
  revoked: Ban,
};

const getErrorMessage = (error) => {
  if (!error) return 'An unexpected error occurred.';
  return error.message || error.details || 'Please try again.';
};

const formatDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const StatusBadge = ({ status }) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();
  const Icon = STATUS_ICONS[normalizedStatus] || AlertCircle;
  const styles =
    STATUS_STYLES[normalizedStatus] ||
    'bg-slate-100 text-slate-600 ring-slate-200';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${styles}`}
    >
      <Icon size={13} />
      {normalizedStatus}
    </span>
  );
};

const InfoItem = ({ icon: Icon, children }) => (
  <div className="flex min-w-0 items-start gap-2 text-sm text-slate-500">
    <Icon size={16} className="mt-0.5 shrink-0 text-emerald-600" />
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

const FarmerAvatar = ({ name }) => (
  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
    <span className="text-lg font-bold">
      {(name || 'F').trim().charAt(0).toUpperCase()}
    </span>
  </div>
);

const StatCard = ({ icon: Icon, label, value, color = 'emerald' }) => {
  const colorStyles = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            colorStyles[color] || colorStyles.emerald
          }`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({
  icon: Icon = Users,
  title,
  description,
  action,
}) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      <Icon size={26} />
    </div>
    <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
      {description}
    </p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

const FarmerCard = ({
  farmer,
  relationship,
  requestingId,
  onRequest,
}) => {
  const farmerId = farmer.farmer_id;
  const isRequesting = requestingId === farmerId;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-200 hover:shadow-md">
      <div className="flex items-start gap-3">
        <FarmerAvatar name={farmer.full_name} />

        <div className="min-w-0 flex-1">
          <h3 className="break-words font-semibold text-slate-900">
            {farmer.full_name || 'Unnamed farmer'}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <Sprout size={14} className="shrink-0" />
            <span className="break-words">
              {farmer.farm_name || 'Farm name not provided'}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <InfoItem icon={MapPin}>
          {farmer.farm_location || 'Farm location not provided'}
        </InfoItem>
        <InfoItem icon={Building2}>
          {farmer.lga_location || 'LGA not provided'}
        </InfoItem>
      </div>

      <div className="mt-auto pt-5">
        {relationship ? (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <StatusBadge status={relationship.status} />
            <span className="text-xs text-slate-400">
              {formatDate(relationship.created_at)}
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={!farmerId || Boolean(requestingId)}
            onClick={() => onRequest(farmer)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRequesting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Sending request...
              </>
            ) : (
              <>
                <UserRoundPlus size={17} />
                Request Connection
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
};

export default function AggregatorFarmers() {
  const { user, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [farmers, setFarmers] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(true);
  const [loadingRelationships, setLoadingRelationships] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingId, setRequestingId] = useState(null);
  const [farmersError, setFarmersError] = useState('');
  const [relationshipsError, setRelationshipsError] = useState('');

  const searchRequestId = useRef(0);
  const searchTermRef = useRef('');
  const refreshTimerRef = useRef(null);
  const mountedRef = useRef(false);
  const busyRequestIdsRef = useRef(new Set());

  const isApproved =
    userProfile?.role === 'aggregator' &&
    userProfile?.verification_status === 'approved';

  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  const loadAvailableFarmers = useCallback(async (term = '') => {
    const requestId = ++searchRequestId.current;
    const normalizedTerm = String(term || '').trim();

    setLoadingFarmers(true);
    setFarmersError('');

    try {
      const { data, error } = await supabase.rpc(
        'search_available_farmers',
        {
          search_term: normalizedTerm || null,
        }
      );

      if (error) throw error;

      // Ignore older responses if a newer search has already started.
      if (
        !mountedRef.current ||
        requestId !== searchRequestId.current
      ) {
        return;
      }

      setFarmers(Array.isArray(data) ? data : []);
    } catch (error) {
      if (
        mountedRef.current &&
        requestId === searchRequestId.current
      ) {
        setFarmersError(getErrorMessage(error));
      }
    } finally {
      if (
        mountedRef.current &&
        requestId === searchRequestId.current
      ) {
        setLoadingFarmers(false);
      }
    }
  }, []);

  const loadRelationships = useCallback(async () => {
    setRelationshipsError('');

    try {
      const { data, error } = await supabase.rpc(
        'list_aggregator_farmer_relationships'
      );

      if (error) throw error;

      if (!mountedRef.current) return;

      setRelationships(Array.isArray(data) ? data : []);
    } catch (error) {
      if (mountedRef.current) {
        setRelationshipsError(getErrorMessage(error));
      }
    } finally {
      if (mountedRef.current) {
        setLoadingRelationships(false);
      }
    }
  }, []);

  const refreshAll = useCallback(async ({ showToast = false } = {}) => {
    setRefreshing(true);

    try {
      await Promise.all([
        loadAvailableFarmers(searchTermRef.current),
        loadRelationships(),
      ]);

      if (showToast && mountedRef.current) {
        toast.success('Farmer information refreshed.');
      }
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [loadAvailableFarmers, loadRelationships]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      searchRequestId.current += 1;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id || !isApproved) {
      setLoadingFarmers(false);
      setLoadingRelationships(false);
      return;
    }

    loadAvailableFarmers(searchTerm);
    // Search is intentionally debounced in the effect below.
    // Initial loading is handled by the same debounced search effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isApproved]);

  useEffect(() => {
    if (!user?.id || !isApproved) return;

    const timer = setTimeout(() => {
      loadAvailableFarmers(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, user?.id, isApproved, loadAvailableFarmers]);

  useEffect(() => {
    if (!user?.id || !isApproved) return;

    loadRelationships();

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        loadRelationships();
        loadAvailableFarmers(searchTermRef.current);
      }, 350);
    };

    const channel = supabase
      .channel(`aggregator-farmers-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aggregator_farmers',
          filter: `aggregator_id=eq.${user.id}`,
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      supabase.removeChannel(channel);
    };
  }, [
    user?.id,
    isApproved,
    loadAvailableFarmers,
    loadRelationships,
  ]);

  const requestRelationship = useCallback(async (farmer) => {
    const farmerId = farmer?.farmer_id;

    if (!farmerId) {
      toast.error('This farmer does not have a valid ID.');
      return;
    }

    if (busyRequestIdsRef.current.has(farmerId)) return;

    const existingRelationship = relationships.find(
      (relationship) => relationship.farmer_id === farmerId
    );

    if (
      existingRelationship &&
      ['pending', 'approved'].includes(
        String(existingRelationship.status).toLowerCase()
      )
    ) {
      toast.error('A pending or approved connection already exists.');
      return;
    }

    busyRequestIdsRef.current.add(farmerId);
    setRequestingId(farmerId);

    try {
      const { error } = await supabase.rpc(
        'request_farmer_relationship',
        {
          target_farmer_id: farmerId,
        }
      );

      if (error) throw error;

      toast.success(
        `Connection request sent to ${farmer.full_name || 'the farmer'}.`
      );

      await Promise.all([
        loadRelationships(),
        loadAvailableFarmers(searchTermRef.current),
      ]);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      busyRequestIdsRef.current.delete(farmerId);
      setRequestingId((current) =>
        current === farmerId ? null : current
      );
    }
  }, [relationships, loadRelationships, loadAvailableFarmers]);

  const approvedRelationships = useMemo(
    () =>
      relationships.filter(
        (item) => String(item.status).toLowerCase() === 'approved'
      ),
    [relationships]
  );

  const pendingRelationships = useMemo(
    () =>
      relationships.filter(
        (item) => String(item.status).toLowerCase() === 'pending'
      ),
    [relationships]
  );

  const rejectedRelationships = useMemo(
    () =>
      relationships.filter((item) =>
        ['rejected', 'revoked'].includes(
          String(item.status).toLowerCase()
        )
      ),
    [relationships]
  );

  const relationshipByFarmerId = useMemo(() => {
    const map = new Map();

    relationships.forEach((relationship) => {
      // Prefer active relationships when a farmer has historical rows.
      const existing = map.get(relationship.farmer_id);
      const status = String(relationship.status).toLowerCase();

      if (
        !existing ||
        ['approved', 'pending'].includes(status)
      ) {
        map.set(relationship.farmer_id, relationship);
      }
    });

    return map;
  }, [relationships]);

  if (!isApproved) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertCircle size={30} />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Aggregator approval required
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
            Farmer discovery and connection requests are available after
            your AgroLink aggregator account has been approved by an
            administrator.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
            <Clock3 size={16} />
            Status: {userProfile?.verification_status || 'pending'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Leaf size={17} />
            AgroLink Aggregator Portal
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Farmer Connections
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Discover verified producers, request connections, and manage
            your relationships with farmers in your area.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshAll({ showToast: true })}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:self-center"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UserCheck}
          label="Connected Farmers"
          value={approvedRelationships.length}
          color="emerald"
        />
        <StatCard
          icon={Clock3}
          label="Pending Requests"
          value={pendingRelationships.length}
          color="amber"
        />
        <StatCard
          icon={UserX}
          label="Rejected / Revoked"
          value={rejectedRelationships.length}
          color="rose"
        />
        <StatCard
          icon={Users}
          label="Available Farmers"
          value={loadingFarmers ? '—' : farmers.length}
          color="slate"
        />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Discover Farmers
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Search approved producers by name, farm, location, or LGA.
            </p>
          </div>
        </div>

        <div className="relative">
          <Search
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search farmers, farms, locations, or LGA..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
          />
        </div>

        {farmersError && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Could not load available farmers</p>
              <p className="mt-1">{farmersError}</p>
            </div>
            <button
              type="button"
              onClick={() => loadAvailableFarmers(searchTermRef.current)}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {loadingFarmers ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
            <RefreshCw size={18} className="animate-spin text-emerald-600" />
            Finding farmers...
          </div>
        ) : farmers.length === 0 ? (
          <EmptyState
            icon={Search}
            title={
              searchTerm.trim()
                ? 'No matching farmers found'
                : 'No farmers available right now'
            }
            description={
              searchTerm.trim()
                ? 'Try a different name, farm name, location, or LGA.'
                : 'Approved producers who do not already have a pending or approved connection with you will appear here.'
            }
            action={
              searchTerm.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Clear search
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Showing up to 30 matching farmers.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {farmers.map((farmer) => (
                <FarmerCard
                  key={farmer.farmer_id}
                  farmer={farmer}
                  relationship={relationshipByFarmerId.get(farmer.farmer_id)}
                  requestingId={requestingId}
                  onRequest={requestRelationship}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            My Farmer Relationships
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review your connection history and the status of each request.
          </p>
        </div>

        {relationshipsError && (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">
                Could not load your relationships
              </p>
              <p className="mt-1">{relationshipsError}</p>
            </div>
            <button
              type="button"
              onClick={loadRelationships}
              className="font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {loadingRelationships ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
            <RefreshCw size={18} className="animate-spin text-emerald-600" />
            Loading your relationships...
          </div>
        ) : relationships.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No farmer relationships yet"
            description="When you send a connection request to a producer, its status will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="divide-y divide-slate-100">
              {relationships.map((relationship) => (
                <div
                  key={relationship.relationship_id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FarmerAvatar name={relationship.full_name} />

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold text-slate-900">
                        {relationship.full_name || 'Unnamed farmer'}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {relationship.farm_name || 'Farm name not provided'}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                        <InfoItem icon={MapPin}>
                          {relationship.lga_location ||
                            relationship.farm_location ||
                            'Location not provided'}
                        </InfoItem>

                        <InfoItem icon={CalendarDays}>
                          Requested {formatDate(relationship.created_at)}
                        </InfoItem>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <StatusBadge status={relationship.status} />

                    {String(relationship.status).toLowerCase() ===
                      'approved' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 size={14} />
                        Connected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
        <Sprout size={20} className="mt-0.5 shrink-0 text-emerald-700" />
        <div>
          <p className="text-sm font-semibold text-emerald-900">
            Build trusted farmer connections
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-800">
            Only approved connections should be treated as active farmer
            relationships. A pending request is not yet an approved
            connection.
          </p>
        </div>
        <ChevronRight size={18} className="ml-auto mt-0.5 shrink-0 text-emerald-700" />
      </div>
    </div>
  );
}
