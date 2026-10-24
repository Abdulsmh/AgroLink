
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  RefreshCw,
  Sprout,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  pending: 'Awaiting Response',
  accepted: 'Accepted',
  payment_pending: 'Payment Pending',
  payment_confirmed: 'Payment Confirmed',
  harvest_ready: 'Ready for Collection',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  accepted: 'bg-blue-50 text-blue-700 ring-blue-200',
  payment_pending: 'bg-orange-50 text-orange-700 ring-orange-200',
  payment_confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  harvest_ready: 'bg-teal-50 text-teal-700 ring-teal-200',
  completed: 'bg-green-50 text-green-700 ring-green-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All Bookings' },
];

const ACTIVE_STATUSES = [
  'accepted',
  'payment_pending',
  'payment_confirmed',
  'harvest_ready',
];

const TERMINAL_STATUSES = ['completed', 'rejected', 'cancelled'];

const EMPTY_FORM = {
  decision: 'accepted',
  quantity: '',
  price: '',
  collectionLocation: '',
  message: '',
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not specified';

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not specified';

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const getErrorMessage = (error) => {
  if (!error) return 'Something went wrong. Please try again.';

  if (typeof error === 'string') return error;

  return (
    error.message ||
    error.details ||
    error.hint ||
    'Something went wrong. Please try again.'
  );
};

const getProfileName = (profile) =>
  profile?.full_name?.trim() || 'Name unavailable';

const getBookingFilterStatus = (booking, filter) => {
  if (filter === 'all') return true;
  if (filter === 'pending') return booking.status === 'pending';
  if (filter === 'active') return ACTIVE_STATUSES.includes(booking.status);
  if (filter === 'completed') return booking.status === 'completed';
  if (filter === 'rejected') return booking.status === 'rejected';
  if (filter === 'cancelled') return booking.status === 'cancelled';

  return false;
};

function StatusBadge({ status }) {
  const style =
    STATUS_STYLES[status] ||
    'bg-slate-100 text-slate-600 ring-slate-200';

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${style}`}
    >
      {STATUS_LABELS[status] || status || 'Unknown'}
    </span>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
        <Icon size={16} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value || 'Not specified'}
        </p>
      </div>
    </div>
  );
}

function FormField({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export default function PreHarvestBookingManager({ role }) {
  const isAggregator = role === 'aggregator';
  const isProducer = role === 'producer';
  const hasValidRole = isAggregator || isProducer;

  const [bookings, setBookings] = useState([]);
  const [forms, setForms] = useState({});
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loadError, setLoadError] = useState('');

  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const submittingRef = useRef(false);
  const confirmationRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    confirmationRef.current = confirmation;
  }, [confirmation]);

  const loadBookings = useCallback(
    async ({ quiet = false } = {}) => {
      if (!hasValidRole) {
        setBookings([]);
        setForms({});
        setLoading(false);
        setRefreshing(false);
        setLoadError(
          'This page is only available to producers and aggregators.'
        );
        return;
      }

      const requestId = ++requestIdRef.current;

      if (quiet) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setLoadError('');

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (mountedRef.current && requestId === requestIdRef.current) {
            setCurrentUserId(null);
            setBookings([]);
            setForms({});
            setExpandedId(null);
            setLoadError('Your session has expired. Please sign in again.');
          }

          return;
        }

        if (
          mountedRef.current &&
          requestId === requestIdRef.current
        ) {
          setCurrentUserId(user.id);
          setSessionChecked(true);
        }

        let query = supabase
          .from('preharvest_bookings')
          .select('*')
          .order('created_at', { ascending: false });

        query = isAggregator
          ? query.eq('aggregator_id', user.id)
          : query.eq('producer_id', user.id);

        const { data: rows, error: bookingError } = await query;

        if (bookingError) throw bookingError;

        const safeRows = rows || [];

        if (safeRows.length === 0) {
          if (
            mountedRef.current &&
            requestId === requestIdRef.current
          ) {
            setBookings([]);
            setForms({});
            setExpandedId(null);
          }

          return;
        }

        const productIds = [
          ...new Set(
            safeRows
              .map((booking) => booking.product_id)
              .filter(Boolean)
          ),
        ];

        const buyerIds = [
          ...new Set(
            safeRows
              .map((booking) => booking.buyer_id)
              .filter(Boolean)
          ),
        ];

        const producerIds = [
          ...new Set(
            safeRows
              .map((booking) => booking.producer_id)
              .filter(Boolean)
          ),
        ];

        const [
          productsResult,
          buyersResult,
          producersResult,
        ] = await Promise.all([
          productIds.length
            ? supabase
                .from('products')
                .select('id, crop_name, location, unit, description')
                .in('id', productIds)
            : Promise.resolve({ data: [], error: null }),

          buyerIds.length
            ? supabase
                .from('profiles')
                .select('id, full_name, phone_number, lga_location')
                .in('id', buyerIds)
            : Promise.resolve({ data: [], error: null }),

          producerIds.length
            ? supabase
                .from('profiles')
                .select('id, full_name, lga_location')
                .in('id', producerIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (productsResult.error) throw productsResult.error;
        if (buyersResult.error) throw buyersResult.error;
        if (producersResult.error) throw producersResult.error;

        const productMap = new Map(
          (productsResult.data || []).map((item) => [item.id, item])
        );

        const buyerMap = new Map(
          (buyersResult.data || []).map((item) => [item.id, item])
        );

        const producerMap = new Map(
          (producersResult.data || []).map((item) => [item.id, item])
        );

        const enrichedBookings = safeRows.map((booking) => ({
          ...booking,
          product: productMap.get(booking.product_id) || null,
          buyer: buyerMap.get(booking.buyer_id) || null,
          producer: producerMap.get(booking.producer_id) || null,
        }));

        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setBookings(enrichedBookings);

        setForms((previousForms) => {
          const nextForms = {};

          enrichedBookings.forEach((booking) => {
            const previous = previousForms[booking.id];
            const requestedQuantity = booking.quantity ?? '';

            nextForms[booking.id] = previous
              ? {
                  ...previous,
                  collectionLocation:
                    previous.collectionLocation ||
                    booking.collection_location ||
                    booking.product?.location ||
                    '',
                }
              : {
                  ...EMPTY_FORM,
                  quantity: requestedQuantity,
                  price:
                    booking.requested_price_per_unit ?? '',
                  collectionLocation:
                    booking.collection_location ||
                    booking.product?.location ||
                    '',
                };
          });

          return nextForms;
        });

        setExpandedId((previousId) => {
          if (
            previousId &&
            enrichedBookings.some(
              (booking) => booking.id === previousId
            )
          ) {
            return previousId;
          }

          return null;
        });
      } catch (error) {
        console.error('Error loading pre-harvest bookings:', error);

        if (
          mountedRef.current &&
          requestId === requestIdRef.current
        ) {
          const message = getErrorMessage(error);
          setLoadError(message);
          toast.error(`Unable to load bookings: ${message}`);
        }
      } finally {
        if (
          mountedRef.current &&
          requestId === requestIdRef.current
        ) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [hasValidRole, isAggregator]
  );

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (!hasValidRole || !currentUserId) return undefined;

    const channel = supabase
      .channel(
        `preharvest-bookings-${role}-${currentUserId}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'preharvest_bookings',
        },
        () => {
          loadBookings({ quiet: true });
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(
            'Pre-harvest booking realtime subscription encountered an error.'
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hasValidRole, currentUserId, role, loadBookings]);

  const updateForm = useCallback((bookingId, field, value) => {
    setForms((previous) => ({
      ...previous,
      [bookingId]: {
        ...EMPTY_FORM,
        ...previous[bookingId],
        [field]: value,
      },
    }));
  }, []);

  const openConfirmation = (booking) => {
    const form = forms[booking.id] || EMPTY_FORM;

    if (booking.status !== 'pending') {
      toast.error('This booking has already received a response.');
      return;
    }

    if (!['accepted', 'rejected'].includes(form.decision)) {
      toast.error('Choose whether to accept or reject this booking.');
      return;
    }

    if (form.decision === 'accepted') {
      const requestedQuantity = Number(booking.quantity);
      const acceptedQuantity = Number(form.quantity);
      const acceptedPrice = Number(form.price);

      if (
        !Number.isFinite(acceptedQuantity) ||
        acceptedQuantity <= 0
      ) {
        toast.error('Enter a valid confirmed quantity.');
        return;
      }

      if (
        !Number.isFinite(requestedQuantity) ||
        requestedQuantity <= 0
      ) {
        toast.error('The requested quantity is invalid.');
        return;
      }

      if (acceptedQuantity > requestedQuantity) {
        toast.error(
          'The confirmed quantity cannot exceed the requested quantity.'
        );
        return;
      }

      if (
        form.price === '' ||
        !Number.isFinite(acceptedPrice) ||
        acceptedPrice < 0
      ) {
        toast.error('Enter a valid price per unit.');
        return;
      }

      if (!form.collectionLocation.trim()) {
        toast.error('Enter the collection location.');
        return;
      }
    }

    setConfirmation({
      bookingId: booking.id,
      decision: form.decision,
      cropName:
        booking.product?.crop_name || 'this produce',
    });
  };

  const submitResponse = async () => {
    const pendingConfirmation = confirmationRef.current;

    if (!pendingConfirmation || submittingRef.current) return;

    const booking = bookings.find(
      (item) => item.id === pendingConfirmation.bookingId
    );

    if (!booking) {
      setConfirmation(null);
      toast.error('This booking could not be found. Refresh and try again.');
      return;
    }

    if (booking.status !== 'pending') {
      setConfirmation(null);
      toast.error('This booking is no longer awaiting a response.');
      await loadBookings({ quiet: true });
      return;
    }

    const form = forms[booking.id] || EMPTY_FORM;
    const decision = pendingConfirmation.decision;

    if (!currentUserId) {
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    submittingRef.current = true;
    setSubmittingId(booking.id);

    try {
      const acceptedQuantity =
        decision === 'accepted' ? Number(form.quantity) : null;

      const acceptedPrice =
        decision === 'accepted' ? Number(form.price) : null;

      const acceptedLocation =
        decision === 'accepted'
          ? form.collectionLocation.trim()
          : null;

      if (
        decision === 'accepted' &&
        (
          !Number.isFinite(acceptedQuantity) ||
          acceptedQuantity <= 0 ||
          acceptedQuantity > Number(booking.quantity) ||
          !Number.isFinite(acceptedPrice) ||
          acceptedPrice < 0 ||
          !acceptedLocation
        )
      ) {
        toast.error('Check the confirmed quantity, price and collection location.');
        return;
      }

      const { error } = await supabase.rpc(
        'respond_to_preharvest_booking',
        {
          target_booking_id: booking.id,
          decision,
          response_message: form.message.trim() || null,
          accepted_quantity: acceptedQuantity,
          accepted_price_per_unit: acceptedPrice,
          accepted_collection_location: acceptedLocation,
        }
      );

      if (error) throw error;

      setConfirmation(null);

      toast.success(
        decision === 'accepted'
          ? 'Booking accepted successfully.'
          : 'Booking rejected successfully.'
      );

      await loadBookings({ quiet: true });
    } catch (error) {
      console.error('Error responding to booking:', error);

      toast.error(
        `Unable to respond to booking: ${getErrorMessage(error)}`
      );

      // Refresh after a failed response because the database may
      // have changed since this page was last loaded.
      await loadBookings({ quiet: true });
    } finally {
      submittingRef.current = false;

      if (mountedRef.current) {
        setSubmittingId(null);
      }
    }
  };

  const visibleBookings = bookings.filter((booking) =>
    getBookingFilterStatus(booking, filter)
  );

  const counts = {
    pending: bookings.filter(
      (booking) => booking.status === 'pending'
    ).length,
    active: bookings.filter((booking) =>
      ACTIVE_STATUSES.includes(booking.status)
    ).length,
    completed: bookings.filter(
      (booking) => booking.status === 'completed'
    ).length,
    rejected: bookings.filter(
      (booking) => booking.status === 'rejected'
    ).length,
    cancelled: bookings.filter(
      (booking) => booking.status === 'cancelled'
    ).length,
  };

  if (!hasValidRole) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 text-amber-600" size={22} />
          <div>
            <h2 className="font-semibold text-amber-900">
              Access unavailable
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              This page is only available to producer and aggregator accounts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionChecked && loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-sm font-medium">Loading pre-harvest bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-700">
            <Sprout size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">
              AgroLink Marketplace
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Pre-Harvest Bookings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {isAggregator
              ? 'Review pre-harvest bookings assigned to you and respond on behalf of your linked farmers.'
              : 'Review buyer requests for your produce and confirm the terms before moving forward.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadBookings({ quiet: true })}
          disabled={refreshing || loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0 text-red-600"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-900">
                We could not load your bookings
              </p>
              <p className="mt-1 break-words text-sm text-red-800">
                {loadError}
              </p>
              <button
                type="button"
                onClick={() => loadBookings()}
                className="mt-3 text-sm font-semibold text-red-800 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-500">Pending</p>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {counts.pending}
          </p>
          <p className="mt-1 text-xs text-slate-500">Awaiting your response</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-500">Active</p>
            <Package size={18} className="text-blue-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {counts.active}
          </p>
          <p className="mt-1 text-xs text-slate-500">In progress</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-500">Completed</p>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {counts.completed}
          </p>
          <p className="mt-1 text-xs text-slate-500">Successfully completed</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-500">Total</p>
            <CalendarDays size={18} className="text-slate-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {bookings.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">Bookings received</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => {
            const selected = filter === item.value;
            const count =
              item.value === 'all'
                ? bookings.length
                : counts[item.value];

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  selected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    selected
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  {count ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking list */}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2
              size={24}
              className="animate-spin text-emerald-600"
            />
            <span className="text-sm font-medium">Loading bookings...</span>
          </div>
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Sprout size={28} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            {bookings.length === 0
              ? 'No pre-harvest bookings yet'
              : 'No bookings in this category'}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {bookings.length === 0
              ? 'When buyers request produce before harvest, their bookings will appear here.'
              : 'Try selecting another status filter to see more bookings.'}
          </p>

          {filter !== 'all' && bookings.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              View all bookings
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleBookings.map((booking) => {
            const form = forms[booking.id] || EMPTY_FORM;
            const isExpanded = expandedId === booking.id;
            const isPending = booking.status === 'pending';
            const isSubmitting = submittingId === booking.id;

            const cropName =
              booking.product?.crop_name || 'Produce listing';

            const requestedQuantity = Number(booking.quantity) || 0;
            const requestedPrice =
              Number(booking.requested_price_per_unit) || 0;

            const confirmedQuantity =
              booking.confirmed_quantity == null
                ? null
                : Number(booking.confirmed_quantity);

            const confirmedPrice =
              booking.confirmed_price_per_unit == null
                ? null
                : Number(booking.confirmed_price_per_unit);

            const confirmedTotal =
              confirmedQuantity !== null && confirmedPrice !== null
                ? confirmedQuantity * confirmedPrice
                : null;

            return (
              <article
                key={booking.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Card header */}
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Sprout size={24} />
                      </div>

                      <div className="min-w-0">
                        <h2 className="break-words text-lg font-bold text-slate-900">
                          {cropName}
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                          Booking ID: {booking.id.slice(0, 8)}
                        </p>

                        <div className="mt-2">
                          <StatusBadge status={booking.status} />
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-xs font-medium text-slate-500">
                        Requested value
                      </p>
                      <p className="mt-1 text-xl font-bold text-emerald-700">
                        {formatCurrency(
                          booking.estimated_total ??
                            requestedQuantity * requestedPrice
                        )}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {requestedQuantity} {booking.unit || booking.product?.unit || 'units'}
                      </p>
                    </div>
                  </div>

                  {/* Booking summary */}
                  <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailRow
                      icon={UserRound}
                      label="Buyer"
                      value={getProfileName(booking.buyer)}
                    />

                    {isAggregator && (
                      <DetailRow
                        icon={Sprout}
                        label="Producer"
                        value={getProfileName(booking.producer)}
                      />
                    )}

                    <DetailRow
                      icon={MapPin}
                      label="Collection area"
                      value={
                        booking.collection_location ||
                        booking.product?.location ||
                        'To be agreed'
                      }
                    />

                    <DetailRow
                      icon={Package}
                      label="Quantity requested"
                      value={`${requestedQuantity} ${booking.unit || booking.product?.unit || 'units'}`}
                    />

                    <DetailRow
                      icon={CalendarDays}
                      label="Requested collection date"
                      value={formatDate(booking.requested_collection_date)}
                    />

                    <DetailRow
                      icon={Clock}
                      label="Booking received"
                      value={formatDateTime(booking.created_at)}
                    />
                  </div>

                  {booking.buyer_notes && (
                    <div className="mt-5 rounded-xl bg-slate-50 p-4">
                      <div className="flex items-start gap-2">
                        <MessageSquare
                          size={17}
                          className="mt-0.5 shrink-0 text-slate-500"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Buyer&apos;s notes
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                            {booking.buyer_notes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {booking.producer_response && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-blue-900">
                        Previous response
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-blue-800">
                        {booking.producer_response}
                      </p>
                    </div>
                  )}

                  {/* Confirmed terms */}
                  {!isPending && confirmedQuantity !== null && (
                    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle2
                          size={18}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-emerald-900">
                            Confirmed booking terms
                          </p>

                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-emerald-700">
                                Confirmed quantity
                              </p>
                              <p className="mt-1 text-sm font-bold text-emerald-900">
                                {confirmedQuantity} {booking.unit || booking.product?.unit || 'units'}
                              </p>
                            </div>

                            {confirmedPrice !== null && (
                              <div>
                                <p className="text-xs text-emerald-700">
                                  Confirmed price per unit
                                </p>
                                <p className="mt-1 text-sm font-bold text-emerald-900">
                                  {formatCurrency(confirmedPrice)}
                                </p>
                              </div>
                            )}

                            {confirmedTotal !== null && (
                              <div>
                                <p className="text-xs text-emerald-700">
                                  Estimated confirmed total
                                </p>
                                <p className="mt-1 text-sm font-bold text-emerald-900">
                                  {formatCurrency(confirmedTotal)}
                                </p>
                              </div>
                            )}

                            {booking.collection_location && (
                              <div>
                                <p className="text-xs text-emerald-700">
                                  Collection location
                                </p>
                                <p className="mt-1 break-words text-sm font-bold text-emerald-900">
                                  {booking.collection_location}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Last updated: {formatDateTime(booking.updated_at || booking.created_at)}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : booking.id)
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {isExpanded ? 'Hide details' : 'View details'}
                      <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                    </button>
                  </div>
                </div>

                {/* Expandable response form */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-6">
                    {isPending ? (
                      <div className="space-y-5">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            Respond to booking
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            Review the request and confirm the terms before submitting your response.
                          </p>
                        </div>

                        <FormField label="Your decision">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateForm(
                                  booking.id,
                                  'decision',
                                  'accepted'
                                )
                              }
                              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                                form.decision === 'accepted'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <CheckCircle2 size={18} />
                              Accept booking
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updateForm(
                                  booking.id,
                                  'decision',
                                  'rejected'
                                )
                              }
                              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                                form.decision === 'rejected'
                                  ? 'border-red-400 bg-red-50 text-red-800 ring-2 ring-red-100'
                                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <XCircle size={18} />
                              Reject booking
                            </button>
                          </div>
                        </FormField>

                        {form.decision === 'accepted' && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                              label="Confirmed quantity"
                              hint={`Buyer requested ${requestedQuantity} ${booking.unit || booking.product?.unit || 'units'}. You cannot confirm more than this amount.`}
                            >
                              <input
                                type="number"
                                min="0.01"
                                max={requestedQuantity}
                                step="any"
                                value={form.quantity}
                                onChange={(event) =>
                                  updateForm(
                                    booking.id,
                                    'quantity',
                                    event.target.value
                                  )
                                }
                                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                placeholder="Enter confirmed quantity"
                              />
                            </FormField>

                            <FormField label="Confirmed price per unit (NGN)">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={form.price}
                                onChange={(event) =>
                                  updateForm(
                                    booking.id,
                                    'price',
                                    event.target.value
                                  )
                                }
                                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                placeholder="Enter price per unit"
                              />
                            </FormField>

                            <div className="sm:col-span-2">
                              <FormField
                                label="Collection location"
                                hint="Specify where the buyer should collect the produce."
                              >
                                <input
                                  type="text"
                                  value={form.collectionLocation}
                                  onChange={(event) =>
                                    updateForm(
                                      booking.id,
                                      'collectionLocation',
                                      event.target.value
                                    )
                                  }
                                  maxLength={300}
                                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                  placeholder="Enter collection address or farm location"
                                />
                              </FormField>
                            </div>

                            {form.quantity !== '' &&
                              form.price !== '' &&
                              Number(form.quantity) > 0 &&
                              Number(form.price) >= 0 && (
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
                                  <p className="text-sm font-medium text-emerald-800">
                                    Estimated confirmed total
                                  </p>
                                  <p className="mt-1 text-2xl font-bold text-emerald-900">
                                    {formatCurrency(
                                      Number(form.quantity) *
                                        Number(form.price)
                                    )}
                                  </p>
                                  <p className="mt-1 text-xs text-emerald-700">
                                    Based on your confirmed quantity and price. Final arrangements remain between buyer and seller.
                                  </p>
                                </div>
                              )}
                          </div>
                        )}

                        <FormField
                          label={
                            form.decision === 'accepted'
                              ? 'Message to buyer (optional)'
                              : 'Reason for rejection (recommended)'
                          }
                        >
                          <textarea
                            rows={3}
                            maxLength={1000}
                            value={form.message}
                            onChange={(event) =>
                              updateForm(
                                booking.id,
                                'message',
                                event.target.value
                              )
                            }
                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            placeholder={
                              form.decision === 'accepted'
                                ? 'Add useful details for the buyer...'
                                : 'Explain why you cannot fulfil this request...'
                            }
                          />
                          <p className="mt-1 text-right text-xs text-slate-400">
                            {form.message.length}/1000
                          </p>
                        </FormField>

                        {form.decision === 'rejected' && (
                          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            <AlertCircle
                              size={18}
                              className="mt-0.5 shrink-0"
                            />
                            <p>
                              Rejecting this booking records your decision. Make sure you have selected the correct booking before continuing.
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => setExpandedId(null)}
                            disabled={isSubmitting}
                            className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            Close
                          </button>

                          <button
                            type="button"
                            onClick={() => openConfirmation(booking)}
                            disabled={isSubmitting || submittingId !== null}
                            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              form.decision === 'rejected'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 size={17} className="animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                {form.decision === 'rejected' ? (
                                  <XCircle size={17} />
                                ) : (
                                  <CheckCircle2 size={17} />
                                )}
                                Review and submit
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <CheckCircle2
                          size={20}
                          className="mt-0.5 shrink-0 text-emerald-600"
                        />
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            This booking has already been responded to
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            Its current status is{' '}
                            <span className="font-semibold">
                              {STATUS_LABELS[booking.status] ||
                                booking.status}
                            </span>
                            . Any further status changes must follow the existing booking workflow.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submittingRef.current
            ) {
              setConfirmation(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirmation-title"
            className="my-auto w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div
              className={`flex items-center justify-between border-b p-5 ${
                confirmation.decision === 'rejected'
                  ? 'border-red-100 bg-red-50'
                  : 'border-emerald-100 bg-emerald-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    confirmation.decision === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {confirmation.decision === 'rejected' ? (
                    <XCircle size={22} />
                  ) : (
                    <CheckCircle2 size={22} />
                  )}
                </div>

                <div>
                  <h2
                    id="booking-confirmation-title"
                    className="font-bold text-slate-900"
                  >
                    {confirmation.decision === 'rejected'
                      ? 'Confirm rejection'
                      : 'Confirm acceptance'}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {confirmation.cropName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmation(null)}
                disabled={submittingId !== null}
                aria-label="Close confirmation"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm leading-6 text-slate-600">
                {confirmation.decision === 'rejected'
                  ? 'Are you sure you want to reject this pre-harvest booking? The buyer will need to make other arrangements.'
                  : 'Are you sure you want to accept this booking using the quantity, price and collection location you entered?'}
              </p>

              {confirmation.decision === 'accepted' && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  {(() => {
                    const selectedBooking = bookings.find(
                      (item) => item.id === confirmation.bookingId
                    );
                    const selectedForm =
                      forms[confirmation.bookingId] || EMPTY_FORM;

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-500">Quantity</span>
                          <span className="text-right font-semibold text-slate-900">
                            {selectedForm.quantity}{' '}
                            {selectedBooking?.unit ||
                              selectedBooking?.product?.unit ||
                              'units'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-slate-500">Price per unit</span>
                          <span className="text-right font-semibold text-slate-900">
                            {formatCurrency(selectedForm.price)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-3 text-sm">
                          <span className="font-medium text-slate-600">
                            Estimated total
                          </span>
                          <span className="text-right font-bold text-emerald-700">
                            {formatCurrency(
                              Number(selectedForm.quantity) *
                                Number(selectedForm.price)
                            )}
                          </span>
                        </div>

                        <div className="border-t border-slate-200 pt-3 text-sm">
                          <p className="text-slate-500">Collection location</p>
                          <p className="mt-1 break-words font-semibold text-slate-900">
                            {selectedForm.collectionLocation ||
                              'Not specified'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmation(null)}
                  disabled={submittingId !== null}
                  className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Go back
                </button>

                <button
                  type="button"
                  onClick={submitResponse}
                  disabled={submittingId !== null}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    confirmation.decision === 'rejected'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {submittingId !== null ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      {confirmation.decision === 'rejected'
                        ? 'Yes, reject booking'
                        : 'Yes, accept booking'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
