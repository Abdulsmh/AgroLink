
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  RefreshCw,
  Search,
  Sprout,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';

const STATUS_CONFIG = {
  pending: {
    label: 'Awaiting response',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
    icon: Clock,
  },
  seller_proposed: {
    label: 'Legacy proposal',
    className: 'bg-blue-50 text-blue-800 ring-blue-200',
    icon: MessageSquare,
  },
  buyer_countered: {
    label: 'Legacy counteroffer',
    className: 'bg-blue-50 text-blue-800 ring-blue-200',
    icon: MessageSquare,
  },
  accepted: {
    label: 'Accepted',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    icon: CheckCircle2,
  },
  payment_pending: {
    label: 'Payment arrangement pending',
    className: 'bg-orange-50 text-orange-800 ring-orange-200',
    icon: Clock,
  },
  payment_confirmed: {
    label: 'Payment confirmed',
    className: 'bg-teal-50 text-teal-800 ring-teal-200',
    icon: CheckCircle2,
  },
  harvest_ready: {
    label: 'Ready for collection',
    className: 'bg-green-50 text-green-800 ring-green-200',
    icon: Sprout,
  },
  completed: {
    label: 'Completed',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-800 ring-red-200',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
    icon: XCircle,
  },
};

const CONFIRMED_STATUSES = [
  'accepted',
  'payment_pending',
  'payment_confirmed',
  'harvest_ready',
  'completed',
];

const FILTER_STATUSES = Object.keys(STATUS_CONFIG);

const DEFAULT_CONFIRMATION = { booking: null, decision: '' };

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return 'Not specified';

  // A database DATE such as 2026-10-25 should not shift to the
  // previous day because of a timezone conversion.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime())
      ? 'Not specified'
      : date.toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Not specified'
    : date.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
};

const formatDateTime = (value) => {
  if (!value) return 'Not specified';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Not specified'
    : date.toLocaleString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

const formatBookingReference = (id) => {
  if (!id) return 'AGB-UNKNOWN';

  return `AGB-${String(id).replace(/-/g, '').toUpperCase().slice(0, 8)}`;
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
    icon: AlertCircle,
  };

const getBuyerName = (buyer) => {
  const name =
    typeof buyer?.full_name === 'string' ? buyer.full_name.trim() : '';

  return name || 'Buyer profile unavailable';
};

const getRequestedTotal = (booking) => {
  const quantity = Number(booking?.quantity);
  const price = Number(booking?.requested_price_per_unit);

  if (
    booking?.quantity == null ||
    booking?.requested_price_per_unit == null ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(price)
  ) {
    return null;
  }

  return quantity * price;
};

const getAgreedTotal = (booking) => {
  if (
    booking?.confirmed_quantity == null ||
    booking?.confirmed_price_per_unit == null
  ) {
    return null;
  }

  const quantity = Number(booking.confirmed_quantity);
  const price = Number(booking.confirmed_price_per_unit);

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(price)
  ) {
    return null;
  }

  return quantity * price;
};

function InfoItem({ icon: Icon, label, children, className = '' }) {
  return (
    <div
      className={`flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3 sm:p-4 ${className}`}
    >
      {Icon && (
        <Icon
          size={18}
          className="mt-0.5 shrink-0 text-emerald-700"
          aria-hidden="true"
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-5 text-slate-500">
          {label}
        </p>
        <div className="mt-1 break-words text-sm font-bold leading-5 text-slate-900">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PreHarvestBookingManager({ role }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedBookingId, setExpandedBookingId] = useState(null);

  const [confirmation, setConfirmation] = useState(
    DEFAULT_CONFIRMATION
  );
  const confirmationRef = useRef(DEFAULT_CONFIRMATION);

  const [responseMessage, setResponseMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setActiveConfirmation = useCallback((next) => {
    confirmationRef.current = next;
    setConfirmation(next);
    setResponseMessage('');
  }, []);

  const loadBookings = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage('');

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          setBookings([]);
          setErrorMessage('Please sign in to view pre-harvest bookings.');
          return;
        }

        if (!['producer', 'aggregator'].includes(role)) {
          setBookings([]);
          setErrorMessage(
            'This page is available to producers and aggregators.'
          );
          return;
        }

        let bookingRows = [];

        if (role === 'producer') {
          const { data, error } = await supabase
            .from('preharvest_bookings')
            .select('*')
            .eq('producer_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          bookingRows = data || [];
        } else {
          const { data: relationships, error: relationshipError } =
            await supabase
              .from('aggregator_farmers')
              .select('farmer_id')
              .eq('aggregator_id', user.id)
              .eq('status', 'approved');

          if (relationshipError) throw relationshipError;

          const farmerIds = [
            ...new Set(
              (relationships || [])
                .map((relationship) => relationship.farmer_id)
                .filter(Boolean)
            ),
          ];

          const queries = [
            supabase
              .from('preharvest_bookings')
              .select('*')
              .eq('aggregator_id', user.id)
              .order('created_at', { ascending: false }),
          ];

          if (farmerIds.length > 0) {
            queries.push(
              supabase
                .from('preharvest_bookings')
                .select('*')
                .in('producer_id', farmerIds)
                .order('created_at', { ascending: false })
            );
          }

          const results = await Promise.all(queries);
          const uniqueRows = new Map();

          results.forEach(({ data, error }) => {
            if (error) throw error;

            (data || []).forEach((booking) => {
              uniqueRows.set(booking.id, booking);
            });
          });

          bookingRows = [...uniqueRows.values()].sort(
            (a, b) =>
              new Date(b.created_at || 0) -
              new Date(a.created_at || 0)
          );
        }

        if (bookingRows.length === 0) {
          setBookings([]);
          return;
        }

        const productIds = [
          ...new Set(
            bookingRows.map((booking) => booking.product_id).filter(Boolean)
          ),
        ];

        const profileIds = [
          ...new Set(
            bookingRows
              .flatMap((booking) => [
                booking.buyer_id,
                booking.producer_id,
              ])
              .filter(Boolean)
          ),
        ];

        const [productsResult, profilesResult] = await Promise.all([
          productIds.length
            ? supabase
                .from('products')
                .select('id, crop_name, location, unit, description')
                .in('id', productIds)
            : Promise.resolve({ data: [], error: null }),

          profileIds.length
            ? supabase
                .from('profiles')
                .select('id, full_name, phone_number, lga_location, role')
                .in('id', profileIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (productsResult.error) {
          throw new Error(
            `Unable to load booking products: ${productsResult.error.message}`
          );
        }

        if (profilesResult.error) {
          throw new Error(
            `Unable to load buyer and producer profiles: ${profilesResult.error.message}`
          );
        }

        const productMap = new Map(
          (productsResult.data || []).map((product) => [
            product.id,
            product,
          ])
        );

        const profileMap = new Map(
          (profilesResult.data || []).map((profile) => [
            profile.id,
            {
              ...profile,
              full_name:
                typeof profile.full_name === 'string'
                  ? profile.full_name.trim()
                  : '',
            },
          ])
        );

        const enrichedBookings = bookingRows.map((booking) => ({
          ...booking,
          product: productMap.get(booking.product_id) || null,
          buyer: profileMap.get(booking.buyer_id) || null,
          producer: profileMap.get(booking.producer_id) || null,
        }));

        const missingBuyerProfiles = enrichedBookings
          .filter((booking) => booking.buyer_id && !booking.buyer)
          .map((booking) => ({
            bookingId: booking.id,
            buyerId: booking.buyer_id,
          }));

        if (missingBuyerProfiles.length > 0) {
          console.warn(
            'Some booking buyer profiles were not returned by Supabase. Check profiles SELECT RLS and the corresponding profile IDs.',
            missingBuyerProfiles
          );
        }

        setBookings(enrichedBookings);
      } catch (error) {
        console.error('Pre-harvest bookings load error:', error);

        setErrorMessage(
          error?.message ||
            'Unable to load pre-harvest bookings. Please try again.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [role]
  );

  useEffect(() => {
    loadBookings(true);

    const channel = supabase
      .channel(`preharvest-bookings-manager-${role}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'preharvest_bookings',
        },
        () => loadBookings(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadBookings, role]);

  const openConfirmation = useCallback(
    (booking, decision) => {
      if (!booking || booking.status !== 'pending') {
        toast.error('Only pending bookings can be responded to.');
        return;
      }

      if (!['accepted', 'rejected'].includes(decision)) {
        toast.error('Choose whether to accept or reject this booking.');
        return;
      }

      if (
        decision === 'accepted' &&
        !(booking.collection_location || '').trim()
      ) {
        toast.error(
          'The buyer’s requested collection location is missing.'
        );
        return;
      }

      setActiveConfirmation({ booking, decision });
    },
    [setActiveConfirmation]
  );

  const closeConfirmation = useCallback(() => {
    if (submitting) return;
    setActiveConfirmation(DEFAULT_CONFIRMATION);
  }, [setActiveConfirmation, submitting]);

  const submitResponse = useCallback(
    async (event) => {
      event?.preventDefault();

      const { booking, decision } = confirmationRef.current;

      if (!booking?.id || !['accepted', 'rejected'].includes(decision)) {
        toast.error('Select a booking and a valid response.');
        return;
      }

      if (booking.status !== 'pending') {
        toast.error('This booking is no longer pending.');
        setActiveConfirmation(DEFAULT_CONFIRMATION);
        await loadBookings(false);
        return;
      }

      const message = responseMessage.trim();

      if (decision === 'rejected' && !message) {
        toast.error('Please explain why you are rejecting this booking.');
        return;
      }

      const acceptedLocation = (
        booking.collection_location || ''
      ).trim();

      if (decision === 'accepted' && !acceptedLocation) {
        toast.error('The requested collection location is missing.');
        return;
      }

      const acceptedQuantity = Number(booking.quantity);
      const acceptedPrice = Number(booking.requested_price_per_unit);

      if (
        decision === 'accepted' &&
        (!Number.isFinite(acceptedQuantity) ||
          acceptedQuantity <= 0 ||
          !Number.isFinite(acceptedPrice) ||
          acceptedPrice < 0)
      ) {
        toast.error('The requested quantity or price is invalid.');
        return;
      }

      setSubmitting(true);

      try {
        const { error } = await supabase.rpc(
          'respond_to_preharvest_booking',
          {
            target_booking_id: booking.id,
            decision,
            response_message: message || null,
            accepted_quantity:
              decision === 'accepted' ? acceptedQuantity : null,
            accepted_price_per_unit:
              decision === 'accepted' ? acceptedPrice : null,
            accepted_collection_location:
              decision === 'accepted' ? acceptedLocation : null,
          }
        );

        if (error) throw error;

        toast.success(
          decision === 'accepted'
            ? 'Booking accepted. The agreed terms have been saved.'
            : 'Booking rejected. Your explanation has been saved.'
        );

        setActiveConfirmation(DEFAULT_CONFIRMATION);
        await loadBookings(false);
      } catch (error) {
        console.error('Pre-harvest response error:', error);
        toast.error(
          error?.message ||
            'Unable to submit your response. Please try again.'
        );
      } finally {
        setSubmitting(false);
      }
    },
    [loadBookings, responseMessage, setActiveConfirmation]
  );

  const copyFullBookingId = useCallback(async (id) => {
    if (!id) {
      toast.error('Booking ID is unavailable.');
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable.');
      }

      await navigator.clipboard.writeText(String(id));
      toast.success('Full booking ID copied.');
    } catch {
      toast.error(
        'Unable to copy automatically. Use the short reference shown.'
      );
    }
  }, []);

  const filteredBookings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === 'all' || booking.status === statusFilter;

      const searchableText = [
        formatBookingReference(booking.id),
        booking.product?.crop_name,
        booking.buyer?.full_name,
        booking.producer?.full_name,
        booking.collection_location,
        booking.buyer?.lga_location,
        booking.buyer_notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [bookings, searchTerm, statusFilter]);

  const counts = useMemo(() => {
    const result = {
      total: bookings.length,
      pending: 0,
      accepted: 0,
      completed: 0,
      rejected: 0,
    };

    bookings.forEach((booking) => {
      if (booking.status === 'pending') result.pending += 1;
      if (CONFIRMED_STATUSES.includes(booking.status)) result.accepted += 1;
      if (booking.status === 'completed') result.completed += 1;
      if (booking.status === 'rejected') result.rejected += 1;
    });

    return result;
  }, [bookings]);

  const activeBooking = confirmation.booking;
  const isAccepting = confirmation.decision === 'accepted';

  useEffect(() => {
    if (!activeBooking) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) {
        closeConfirmation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBooking, closeConfirmation, submitting]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-4 text-white shadow-lg sm:rounded-3xl sm:p-8">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <Sprout size={18} />
              <span>AgroLink marketplace</span>
            </div>
            <h1 className="mt-3 break-words text-2xl font-black sm:text-3xl">
              Pre-harvest bookings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100 sm:text-base">
              Review buyer requests, confirm submitted terms, or reject a
              request with a clear explanation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadBookings(false)}
            disabled={refreshing || loading}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/20 disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          {[
            { label: 'All bookings', value: counts.total },
            { label: 'Awaiting response', value: counts.pending },
            { label: 'Accepted / in progress', value: counts.accepted },
            { label: 'Completed', value: counts.completed },
          ].map((item) => (
            <div
              key={item.label}
              className="min-w-0 rounded-xl border border-white/10 bg-white/10 p-3 sm:rounded-2xl sm:p-4"
            >
              <p className="text-xs leading-5 text-emerald-100">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-black tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Search bookings
            </span>
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Crop, buyer, farmer, reference..."
                className="min-h-11 w-full min-w-0 rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </label>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Filter by status
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="all">All statuses</option>
              {FILTER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_CONFIG[status].label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {errorMessage && (
        <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">Bookings could not be loaded</p>
            <p className="mt-1 break-words">{errorMessage}</p>
            <button
              type="button"
              onClick={() => loadBookings(true)}
              className="mt-2 font-bold underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-center text-slate-500">
          <Loader2 size={32} className="animate-spin text-emerald-700" />
          <p className="text-sm">Loading pre-harvest bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center sm:py-14">
          <Package size={34} className="mx-auto text-emerald-700" />
          <h2 className="mt-4 text-lg font-black text-slate-900">
            {bookings.length ? 'No matching bookings' : 'No bookings yet'}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {bookings.length
              ? 'Try a different search term or status filter.'
              : 'New buyer requests will appear here when submitted.'}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="mt-4 min-h-11 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="min-w-0 space-y-4">
          <p className="text-sm text-slate-500">
            Showing{' '}
            <span className="font-bold text-slate-800">
              {filteredBookings.length}
            </span>{' '}
            booking{filteredBookings.length === 1 ? '' : 's'}
          </p>

          {filteredBookings.map((booking) => {
            const status = getStatusConfig(booking.status);
            const StatusIcon = status.icon;
            const isExpanded = expandedBookingId === booking.id;
            const canRespond = booking.status === 'pending';
            const hasConfirmedTerms = CONFIRMED_STATUSES.includes(
              booking.status
            );

            const requestedTotal = getRequestedTotal(booking);
            const agreedTotal = getAgreedTotal(booking);
            const displayedTotal =
              hasConfirmedTerms && agreedTotal != null
                ? agreedTotal
                : requestedTotal;

            const displayedQuantity =
              hasConfirmedTerms && booking.confirmed_quantity != null
                ? booking.confirmed_quantity
                : booking.quantity;

            return (
              <article
                key={booking.id}
                className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="min-w-0 p-3 sm:p-5 lg:p-6">
                  <div className="flex min-w-0 flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h2 className="break-words text-lg font-black capitalize text-slate-900 sm:text-xl">
                          {booking.product?.crop_name ||
                            'Agricultural produce'}
                        </h2>
                        <span
                          className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${status.className}`}
                        >
                          <StatusIcon size={13} />
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Reference: {formatBookingReference(booking.id)}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs leading-5 text-slate-500 sm:text-right">
                      Submitted
                      <span className="mt-0.5 block font-semibold text-slate-700">
                        {formatDateTime(booking.created_at)}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3 md:items-stretch">
                    <InfoItem icon={UserRound} label="Buyer">
                      <span className="block">{getBuyerName(booking.buyer)}</span>
                      {booking.buyer?.phone_number && (
                        <span className="mt-1 block break-words text-xs font-normal text-slate-500">
                          {booking.buyer.phone_number}
                        </span>
                      )}
                      {booking.buyer?.lga_location && (
                        <span className="mt-1 block break-words text-xs font-normal text-slate-500">
                          {booking.buyer.lga_location}
                        </span>
                      )}
                      {!booking.buyer && (
                        <span className="mt-1 block text-xs font-normal text-amber-700">
                          Profile ID: {booking.buyer_id || 'Unavailable'}
                        </span>
                      )}
                    </InfoItem>

                    <InfoItem
                      icon={CalendarDays}
                      label="Requested collection date"
                    >
                      {formatDate(booking.requested_collection_date)}
                    </InfoItem>

                    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
                      <Banknote
                        size={19}
                        className="mt-0.5 shrink-0 text-emerald-700"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold leading-5 text-emerald-800">
                          {hasConfirmedTerms ? 'Agreed total' : 'Requested total'}
                        </p>
                        <p className="mt-1 break-words text-xl font-black leading-7 text-emerald-950 sm:text-2xl">
                          {displayedTotal == null
                            ? 'Not available'
                            : formatCurrency(displayedTotal)}
                        </p>
                        <p className="mt-1 break-words text-xs leading-5 text-emerald-800">
                          {formatNumber(displayedQuantity)}{' '}
                          {booking.unit || booking.product?.unit || 'units'}
                        </p>
                        {hasConfirmedTerms && requestedTotal != null && (
                          <p className="mt-1 text-xs text-emerald-800">
                            Original request: {formatCurrency(requestedTotal)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-slate-200 p-3 sm:p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <MapPin size={19} className="mt-0.5 shrink-0 text-emerald-700" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Buyer’s requested collection location
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                          {booking.collection_location?.trim() || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {booking.buyer_notes && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4">
                      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-800">
                        <MessageSquare size={15} />
                        Buyer’s note
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-blue-950">
                        {booking.buyer_notes}
                      </p>
                    </div>
                  )}

                  {booking.producer_response && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Seller’s response
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                        {booking.producer_response}
                      </p>
                    </div>
                  )}

                  {hasConfirmedTerms && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700" />
                        <h3 className="text-sm font-black text-emerald-950">
                          Confirmed booking terms
                        </h3>
                      </div>
                      <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs text-emerald-800">Confirmed quantity</p>
                          <p className="mt-1 break-words text-sm font-bold text-emerald-950">
                            {booking.confirmed_quantity != null
                              ? `${formatNumber(booking.confirmed_quantity)} ${booking.unit || booking.product?.unit || 'units'}`
                              : 'Not recorded'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-800">Confirmed price per unit</p>
                          <p className="mt-1 break-words text-sm font-bold text-emerald-950">
                            {booking.confirmed_price_per_unit != null
                              ? formatCurrency(booking.confirmed_price_per_unit)
                              : 'Not recorded'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-emerald-800">Collection location</p>
                          <p className="mt-1 break-words text-sm font-bold text-emerald-950">
                            {booking.collection_location?.trim() || 'Not specified'}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 border-t border-emerald-200 pt-3 text-xs leading-5 text-emerald-900">
                        AgroLink records the agreed booking terms. Payment
                        arrangements are handled directly between buyer and
                        seller; the platform does not process payment.
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex min-w-0 flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedBookingId(isExpanded ? null : booking.id)
                      }
                      aria-expanded={isExpanded}
                      className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg px-2 py-2 text-sm font-bold text-slate-600 hover:text-emerald-700"
                    >
                      {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                      {isExpanded ? 'Hide booking details' : 'View booking details'}
                    </button>

                    {canRespond && (
                      <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto">
                        <button
                          type="button"
                          onClick={() => openConfirmation(booking, 'rejected')}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => openConfirmation(booking, 'accepted')}
                          disabled={!booking.collection_location?.trim()}
                          title={
                            !booking.collection_location?.trim()
                              ? 'The buyer’s requested collection location is missing.'
                              : 'Accept this booking'
                          }
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <CheckCircle2 size={16} />
                          Accept booking
                        </button>
                      </div>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 sm:p-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">Booking reference</p>
                        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                          <p className="break-all font-mono text-sm font-bold text-slate-900">
                            {formatBookingReference(booking.id)}
                          </p>
                          <button
                            type="button"
                            onClick={() => copyFullBookingId(booking.id)}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700"
                          >
                            <Copy size={13} />
                            Copy full ID
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Producer / farmer</p>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                          {booking.producer?.full_name || 'Not available'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Requested quantity</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatNumber(booking.quantity)} {booking.unit || booking.product?.unit || 'units'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Requested price per unit</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatCurrency(booking.requested_price_per_unit)}
                        </p>
                      </div>
                      {booking.product?.description && (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-slate-500">Product description</p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                            {booking.product.description}
                          </p>
                        </div>
                      )}
                      {booking.product?.location && (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-semibold text-slate-500">
                            Product / farm location (reference only)
                          </p>
                          <p className="mt-1 break-words text-sm text-slate-700">
                            {booking.product.location}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {confirmation.booking && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeConfirmation();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-response-title"
            className="my-2 max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl bg-white shadow-2xl sm:my-6 sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl"
          >
            <div
              className={`flex items-start justify-between gap-3 border-b p-4 sm:p-6 ${
                isAccepting
                  ? 'border-emerald-100 bg-emerald-50'
                  : 'border-red-100 bg-red-50'
              }`}
            >
              <div className="flex min-w-0 items-start gap-3">
                {isAccepting ? (
                  <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-emerald-700" />
                ) : (
                  <XCircle size={24} className="mt-0.5 shrink-0 text-red-700" />
                )}
                <div className="min-w-0">
                  <h2 id="booking-response-title" className="break-words text-lg font-black text-slate-950">
                    {isAccepting ? 'Accept this booking?' : 'Reject this booking?'}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {isAccepting
                      ? 'You will confirm the buyer’s submitted quantity, price and requested collection location.'
                      : 'Provide a clear reason so the buyer understands why the request cannot be accepted.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeConfirmation}
                disabled={submitting}
                aria-label="Close response dialog"
                className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={submitResponse} className="min-w-0 space-y-5 p-4 sm:p-6">
              <div className="min-w-0 rounded-2xl border border-slate-200 p-3 sm:p-4">
                <p className="break-words text-base font-black capitalize text-slate-900">
                  {activeBooking.product?.crop_name || 'Agricultural produce'}
                </p>
                <p className="mt-2 break-words text-sm font-semibold text-slate-700">
                  Buyer: {getBuyerName(activeBooking.buyer)}
                </p>

                <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Requested quantity</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatNumber(activeBooking.quantity)} {activeBooking.unit || activeBooking.product?.unit || 'units'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Price per unit</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatCurrency(activeBooking.requested_price_per_unit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Requested collection date</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatDate(activeBooking.requested_collection_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Requested total</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {getRequestedTotal(activeBooking) == null
                        ? 'Not available'
                        : formatCurrency(getRequestedTotal(activeBooking))}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500">
                    Buyer’s requested collection location
                  </p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-900">
                    {activeBooking.collection_location?.trim() || 'Not specified'}
                  </p>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500">Booking reference</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-800">
                    {formatBookingReference(activeBooking.id)}
                  </p>
                </div>
              </div>

              <label className="block min-w-0">
                <span className="block text-sm font-bold text-slate-800">
                  {isAccepting ? 'Response note (optional)' : 'Reason for rejection'}
                  {!isAccepting && <span className="ml-1 text-red-600">*</span>}
                </span>
                <textarea
                  value={responseMessage}
                  onChange={(event) => setResponseMessage(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  required={!isAccepting}
                  placeholder={
                    isAccepting
                      ? 'Add any helpful information for the buyer...'
                      : 'Explain why you cannot accept this booking...'
                  }
                  className="mt-2 block w-full min-w-0 resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:px-4"
                />
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {isAccepting
                    ? 'Optional when accepting. Keep the submitted terms unchanged.'
                    : 'A clear explanation is required when rejecting.'}
                </span>
              </label>

              {isAccepting ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
                  <p className="text-sm font-bold text-emerald-950">
                    You are confirming the submitted terms
                  </p>
                  <p className="mt-1 text-sm leading-6 text-emerald-900">
                    Quantity, unit price and collection location will be saved
                    as the agreed terms. Payment is arranged directly between
                    buyer and seller.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 sm:p-4">
                  <p className="text-sm leading-6 text-red-900">
                    Rejecting this request will mark it as rejected. The buyer
                    will be able to see your explanation.
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeConfirmation}
                  disabled={submitting}
                  className="min-h-11 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  Go back
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    (!isAccepting && !responseMessage.trim()) ||
                    (isAccepting && !activeBooking.collection_location?.trim())
                  }
                  className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                    isAccepting
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-red-700 hover:bg-red-800'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving response...
                    </>
                  ) : isAccepting ? (
                    <>
                      <CheckCircle2 size={17} />
                      Confirm acceptance
                    </>
                  ) : (
                    <>
                      <XCircle size={17} />
                      Confirm rejection
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default PreHarvestBookingManager;
