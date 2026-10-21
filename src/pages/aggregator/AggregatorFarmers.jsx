
import React, { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  revoked: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const STATUS_ICONS = {
  pending: Clock3,
  approved: CheckCircle2,
  rejected: XCircle,
  revoked: Ban,
};

function getErrorMessage(error, fallback) {
  if (!error) return fallback;

  const message = String(error.message || '').trim();

  // Prefer a useful application/database message where available.
  return message || fallback;
}

function StatusBadge({ status }) {
  const normalizedStatus = String(status || '').toLowerCase();
  const Icon = STATUS_ICONS[normalizedStatus] || AlertCircle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${
        STATUS_STYLES[normalizedStatus] ||
        'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      <Icon size={13} />
      {normalizedStatus || 'unknown'}
    </span>
  );
}

function FarmerDetails({ farmer }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-slate-900">
        {farmer.full_name || 'Unnamed producer'}
      </p>

      {farmer.farm_name && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <Sprout size={14} className="shrink-0" />
          <span className="truncate">{farmer.farm_name}</span>
        </p>
      )}

      {(farmer.farm_location || farmer.lga_location) && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">
            {[farmer.farm_location, farmer.lga_location]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </p>
      )}
    </div>
  );
}

export default function AggregatorFarmers() {
  const { user, userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [farmers, setFarmers] = useState([]);
  const [relationships, setRelationships] = useState([]);

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingRelationships, setLoadingRelationships] = useState(true);
  const [requestingId, setRequestingId] = useState(null);

  const [searchPerformed, setSearchPerformed] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [relationshipError, setRelationshipError] = useState('');

  const isApproved =
    userProfile?.role === 'aggregator' &&
    userProfile?.verification_status === 'approved';

  const loadRelationships = useCallback(async () => {
    if (!user?.id || !isApproved) {
      setRelationships([]);
      setRelationshipError('');
      setLoadingRelationships(false);
      return;
    }

    setLoadingRelationships(true);
    setRelationshipError('');

    try {
      const { data, error: requestError } = await supabase.rpc(
        'list_aggregator_farmer_relationships'
      );

      if (requestError) {
        throw requestError;
      }

      setRelationships(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Could not load farmer relationships:', error);

      setRelationshipError(
        getErrorMessage(
          error,
          'Could not load your farmer relationships. Please try again.'
        )
      );
    } finally {
      setLoadingRelationships(false);
    }
  }, [user?.id, isApproved]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  const searchFarmers = async (event, termOverride) => {
    event?.preventDefault();

    if (!isApproved) {
      toast.error('Your aggregator account must be approved first.');
      return;
    }

    const term =
      typeof termOverride === 'string' ? termOverride : searchTerm;

    setSearchTerm(term);
    setLoadingSearch(true);
    setSearchPerformed(true);
    setSearchError('');
    setFarmers([]);

    try {
      const { data, error: requestError } = await supabase.rpc(
        'search_available_farmers',
        { search_term: term.trim() || null }
      );

      if (requestError) {
        throw requestError;
      }

      setFarmers(Array.isArray(data) ? data : []);

      if (!data?.length) {
        toast('No available approved farmers found.', {
          icon: '🔎',
        });
      }
    } catch (error) {
      console.error('Farmer search failed:', error);

      setSearchError(
        getErrorMessage(
          error,
          'Unable to search farmers. Please try again.'
        )
      );
    } finally {
      setLoadingSearch(false);
    }
  };

  const requestRelationship = async (farmer) => {
    if (!isApproved || !farmer?.farmer_id) {
      toast.error(
        'Your account is not authorized to request this relationship.'
      );
      return;
    }

    if (requestingId !== null) return;

    setRequestingId(farmer.farmer_id);

    try {
      const { error: requestError } = await supabase.rpc(
        'request_farmer_relationship',
        { target_farmer_id: farmer.farmer_id }
      );

      if (requestError) {
        throw requestError;
      }

      toast.success(
        'Request submitted successfully. Its status is now pending.'
      );

      setFarmers((current) =>
        current.filter((item) => item.farmer_id !== farmer.farmer_id)
      );

      // A refresh failure should not undo a successfully submitted request.
      await loadRelationships();
    } catch (error) {
      console.error('Farmer relationship request failed:', error);

      toast.error(
        getErrorMessage(
          error,
          'Could not submit the relationship request. Please try again.'
        )
      );
    } finally {
      setRequestingId(null);
    }
  };

  const approvedCount = relationships.filter(
    (item) => item.status === 'approved'
  ).length;

  const pendingCount = relationships.filter(
    (item) => item.status === 'pending'
  ).length;

  if (!isApproved) {
    return (
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <AlertCircle className="mb-4 text-amber-600" size={34} />

          <h1 className="text-xl font-bold text-slate-900">
            Aggregator approval required
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Farmer management becomes available after an administrator
            approves your aggregator account. You can still access your
            account&apos;s verification or profile page while waiting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
            Aggregator workspace
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Farmer management
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Find verified producers and request a connection with them
            through AgroLink.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRelationships}
          disabled={loadingRelationships}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={loadingRelationships ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Relationship statistics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Total relationships
            </p>
            <Users className="text-emerald-600" size={21} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {relationships.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Approved farmers
            </p>
            <CheckCircle2 className="text-emerald-600" size={21} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Pending requests
            </p>
            <Clock3 className="text-amber-600" size={21} />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {pendingCount}
          </p>
        </div>
      </div>

      {/* Relationship loading errors */}
      {relationshipError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Could not load farmer relationships
            </p>
            <p className="mt-1 break-words">{relationshipError}</p>

            <button
              type="button"
              onClick={loadRelationships}
              disabled={loadingRelationships}
              className="mt-2 font-semibold underline disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Farmer discovery */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <UserRoundPlus size={22} />
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              Find existing farmers
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Search approved producer accounts by name, farm, or location.
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => searchFarmers(event)}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search farmer, farm, or LGA..."
              aria-label="Search farmers by name, farm, or location"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFarmers([]);
                  setSearchError('');
                  setSearchPerformed(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loadingSearch}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingSearch ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            {loadingSearch ? 'Searching...' : 'Search farmers'}
          </button>
        </form>

        {searchError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Search failed</p>
              <p className="mt-1 break-words">{searchError}</p>

              <button
                type="button"
                onClick={() => searchFarmers()}
                disabled={loadingSearch}
                className="mt-2 font-semibold underline disabled:opacity-50"
              >
                Retry search
              </button>
            </div>
          </div>
        )}

        {farmers.length > 0 && (
          <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
            {farmers.map((farmer) => (
              <div
                key={farmer.farmer_id}
                className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <FarmerDetails farmer={farmer} />

                <button
                  type="button"
                  onClick={() => requestRelationship(farmer)}
                  disabled={requestingId !== null}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestingId === farmer.farmer_id ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <UserRoundPlus size={15} />
                  )}
                  {requestingId === farmer.farmer_id
                    ? 'Submitting...'
                    : 'Request link'}
                </button>
              </div>
            ))}
          </div>
        )}

        {searchPerformed &&
          !loadingSearch &&
          !searchError &&
          farmers.length === 0 && (
            <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <Search className="mx-auto text-slate-400" size={26} />
              <p className="mt-2 font-semibold text-slate-700">
                No available farmers found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another search, or check again later.
              </p>
            </div>
          )}
      </section>

      {/* Existing relationships */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h2 className="font-bold text-slate-900">
            Your farmer relationships
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Track connection requests and their current statuses.
          </p>
        </div>

        {loadingRelationships ? (
          <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
            <RefreshCw size={18} className="animate-spin" />
            Loading relationships...
          </div>
        ) : relationshipError ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Relationship data could not be refreshed. Use the retry option above.
          </div>
        ) : relationships.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="mx-auto text-slate-300" size={34} />
            <p className="mt-3 font-semibold text-slate-800">
              No farmer relationships yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Search for an existing approved farmer to send your first request.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {relationships.map((relationship) => (
              <div
                key={relationship.relationship_id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <FarmerDetails farmer={relationship} />

                  <p className="mt-2 text-xs text-slate-400">
                    Request created{' '}
                    {relationship.created_at
                      ? new Date(relationship.created_at).toLocaleDateString()
                      : 'date unavailable'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                  <StatusBadge status={relationship.status} />

                  {['rejected', 'revoked'].includes(relationship.status) && (
                    <button
                      type="button"
                      onClick={() =>
                        searchFarmers(null, relationship.full_name || '')
                      }
                      disabled={loadingSearch}
                      className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50"
                    >
                      Find again
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
