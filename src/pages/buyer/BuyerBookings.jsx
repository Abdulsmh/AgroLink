
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Sprout,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: {
    label: 'Awaiting Response',
    color: 'amber',
    description: 'The producer or authorized aggregator has not responded yet.',
  },
  accepted: {
    label: 'Booking Accepted',
    color: 'blue',
    description: 'Your booking has been accepted. Check the confirmed terms.',
  },
  payment_pending: {
    label: 'Payment Pending',
    color: 'orange',
    description: 'Your booking is awaiting payment confirmation.',
  },
  payment_confirmed: {
    label: 'Payment Confirmed',
    color: 'indigo',
    description: 'Payment has been confirmed. Await harvest preparation.',
  },
  harvest_ready: {
    label: 'Ready for Collection',
    color: 'emerald',
    description: 'Your produce is ready for the agreed collection arrangements.',
  },
  completed: {
    label: 'Completed',
    color: 'green',
    description: 'This booking has been completed.',
  },
  rejected: {
    label: 'Rejected',
    color: 'red',
    description: 'The producer or authorized aggregator declined this booking.',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'gray',
    description: 'This booking has been cancelled.',
  },
};

const FILTERS = [
  { value: 'all', label: 'All Bookings' },
  { value: 'active', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ACTIVE_STATUSES = [
  'pending',
  'accepted',
  'payment_pending',
  'payment_confirmed',
  'harvest_ready',
];

const formatMoney = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return 'Not specified';

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (date) => {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return '—';

  return parsedDate.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getProductImage = (imagePath) => {
  if (!imagePath) return null;

  let path = imagePath;

  if (typeof path === 'string') {
    try {
      path = JSON.parse(path);
    } catch {
      // The value may already be a plain storage path or URL.
    }
  }

  if (Array.isArray(path)) {
    path = path[0];
  }

  if (path && typeof path === 'object') {
    path = path.url || path.path || path.name;
  }

  if (typeof path !== 'string' || !path.trim()) return null;

  if (/^https?:\/\//i.test(path)) return path;

  const cleanPath = path
    .replace(/^product-images\//, '')
    .replace(/^\/+/, '');

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(cleanPath);

  return data?.publicUrl || null;
};

const getStatusClasses = (color) => {
  const classes = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    gray: 'bg-gray-100 text-gray-600 ring-gray-200',
  };

  return classes[color] || classes.gray;
};

const BuyerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchBookings = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setBookings([]);
        toast.error('Please log in to view your bookings.');
        return;
      }

      const { data: bookingRows, error: bookingError } = await supabase
        .from('preharvest_bookings')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (bookingError) throw bookingError;

      const rows = bookingRows || [];

      if (rows.length === 0) {
        setBookings([]);
        return;
      }

      const productIds = [
        ...new Set(rows.map((booking) => booking.product_id).filter(Boolean)),
      ];

      const producerIds = [
        ...new Set(rows.map((booking) => booking.producer_id).filter(Boolean)),
      ];

      const aggregatorIds = [
        ...new Set(rows.map((booking) => booking.aggregator_id).filter(Boolean)),
      ];

      const [productsResult, producersResult, aggregatorsResult] =
        await Promise.all([
          productIds.length
            ? supabase
                .from('products')
                .select(
                  'id, crop_name, location, image_path, description, unit, price_per_unit'
                )
                .in('id', productIds)
            : Promise.resolve({ data: [], error: null }),

          producerIds.length
            ? supabase
                .from('profiles')
                .select('id, full_name, lga_location')
                .in('id', producerIds)
            : Promise.resolve({ data: [], error: null }),

          aggregatorIds.length
            ? supabase
                .from('profiles')
                .select('id, full_name, lga_location')
                .in('id', aggregatorIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (productsResult.error) throw productsResult.error;
      if (producersResult.error) throw producersResult.error;
      if (aggregatorsResult.error) throw aggregatorsResult.error;

      const productMap = new Map(
        (productsResult.data || []).map((product) => [product.id, product])
      );

      const producerMap = new Map(
        (producersResult.data || []).map((producer) => [
          producer.id,
          producer,
        ])
      );

      const aggregatorMap = new Map(
        (aggregatorsResult.data || []).map((aggregator) => [
          aggregator.id,
          aggregator,
        ])
      );

      setBookings(
        rows.map((booking) => ({
          ...booking,
          product: productMap.get(booking.product_id) || null,
          producer: producerMap.get(booking.producer_id) || null,
          aggregator: booking.aggregator_id
            ? aggregatorMap.get(booking.aggregator_id) || null
            : null,
        }))
      );
    } catch (error) {
      console.error('Error fetching pre-harvest bookings:', error);
      toast.error(error.message || 'Unable to load your bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();

    // Refresh when the buyer's booking status changes in the database.
    const channel = supabase
      .channel('buyer-preharvest-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'preharvest_bookings',
        },
        () => {
          fetchBookings(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  const cancelBooking = async (booking) => {
    if (booking.status !== 'pending') {
      toast.error('Only pending bookings can be cancelled.');
      return;
    }

    const confirmed = window.confirm(
      `Cancel your booking for ${
        booking.product?.crop_name || 'this product'
      }? This action cannot be undone.`
    );

    if (!confirmed) return;

    setCancellingId(booking.id);

    try {
      const { error } = await supabase.rpc('cancel_preharvest_booking', {
        target_booking_id: booking.id,
      });

      if (error) throw error;

      toast.success('Booking cancelled successfully.');
      await fetchBookings(true);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || 'Unable to cancel this booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return bookings.filter((booking) => {
      const status = booking.status || 'pending';

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'active' && ACTIVE_STATUSES.includes(status)) ||
        (activeFilter === 'completed' && status === 'completed') ||
        (activeFilter === 'cancelled' &&
          ['cancelled', 'rejected'].includes(status));

      const matchesSearch =
        !query ||
        [
          booking.product?.crop_name,
          booking.product?.location,
          booking.producer?.full_name,
          booking.aggregator?.full_name,
          booking.status,
          booking.collection_location,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesFilter && matchesSearch;
    });
  }, [bookings, activeFilter, searchTerm]);

  const stats = useMemo(
    () => ({
      total: bookings.length,
      active: bookings.filter((booking) =>
        ACTIVE_STATUSES.includes(booking.status)
      ).length,
      completed: bookings.filter((booking) => booking.status === 'completed')
        .length,
      cancelled: bookings.filter((booking) =>
        ['cancelled', 'rejected'].includes(booking.status)
      ).length,
    }),
    [bookings]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-gray-500">
            Loading your pre-harvest bookings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Sprout size={18} />
              AgroLink Marketplace
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              My Pre-Harvest Bookings
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
              Track your requests for crops before harvest, review confirmed
              terms, and follow their progress toward collection.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchBookings(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: 'Total Bookings',
              value: stats.total,
              icon: Package,
              color: 'text-gray-700',
              bg: 'bg-gray-100',
            },
            {
              label: 'In Progress',
              value: stats.active,
              icon: Clock,
              color: 'text-amber-700',
              bg: 'bg-amber-100',
            },
            {
              label: 'Completed',
              value: stats.completed,
              icon: CheckCircle2,
              color: 'text-emerald-700',
              bg: 'bg-emerald-100',
            },
            {
              label: 'Cancelled / Rejected',
              value: stats.cancelled,
              icon: XCircle,
              color: 'text-red-700',
              bg: 'bg-red-100',
            },
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}
                  >
                    <Icon size={20} />
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </span>
                </div>

                <p className="mt-3 text-xs font-medium text-gray-500 sm:text-sm">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Search and filters */}
        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by crop, producer, aggregator, or location..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Filter size={16} className="mr-1 text-gray-400" />

            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  activeFilter === filter.value
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Booking list */}
        {filteredBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center sm:px-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              {bookings.length === 0 ? (
                <CalendarDays size={30} />
              ) : (
                <Search size={30} />
              )}
            </div>

            <h2 className="mt-5 text-lg font-bold text-gray-900">
              {bookings.length === 0
                ? 'No pre-harvest bookings yet'
                : 'No matching bookings'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              {bookings.length === 0
                ? 'When you request crops before harvest, your booking details and progress will appear here.'
                : 'Try a different search term or choose another booking filter.'}
            </p>

            {bookings.length === 0 && (
              <a
                href="/pre-harvest"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Explore Pre-Harvest Products
                <ArrowRight size={17} />
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredBookings.map((booking) => {
              const status =
                STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

              const imageUrl = getProductImage(booking.product?.image_path);

              const cropName =
                booking.product?.crop_name || 'Pre-Harvest Product';

              const requestedQuantity = Number(booking.quantity || 0);

              const confirmedQuantity =
                booking.confirmed_quantity != null
                  ? Number(booking.confirmed_quantity)
                  : null;

              const requestedPrice = Number(
                booking.requested_price_per_unit || 0
              );

              const confirmedPrice =
                booking.confirmed_price_per_unit != null
                  ? Number(booking.confirmed_price_per_unit)
                  : null;

              const confirmedTotal =
                confirmedQuantity !== null && confirmedPrice !== null
                  ? confirmedQuantity * confirmedPrice
                  : null;

              const isPending = booking.status === 'pending';

              return (
                <article
                  key={booking.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-4 sm:p-6">
                    {/* Product and status */}
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-emerald-50 sm:h-28 sm:w-32">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={cropName}
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-emerald-600">
                            <Sprout size={36} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                              Booking ID
                            </p>

                            <p className="mt-1 break-all font-mono text-xs text-gray-500">
                              {booking.id}
                            </p>

                            <h2 className="mt-2 text-lg font-bold text-gray-900 sm:text-xl">
                              {cropName}
                            </h2>

                            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                              <MapPin size={15} className="shrink-0" />
                              {booking.product?.location ||
                                booking.collection_location ||
                                'Location not specified'}
                            </p>
                          </div>

                          <span
                            className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${getStatusClasses(
                              status.color
                            )}`}
                          >
                            {booking.status === 'completed' ? (
                              <CheckCircle2 size={14} />
                            ) : booking.status === 'rejected' ||
                              booking.status === 'cancelled' ? (
                              <XCircle size={14} />
                            ) : (
                              <Clock size={14} />
                            )}
                            {status.label}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-gray-600">
                          {status.description}
                        </p>
                      </div>
                    </div>

                    {/* Booking details */}
                    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          Requested Quantity
                        </p>
                        <p className="mt-1 font-bold text-gray-900">
                          {requestedQuantity.toLocaleString('en-NG')}{' '}
                          <span className="text-xs font-medium text-gray-500">
                            {booking.unit || booking.product?.unit || ''}
                          </span>
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          Requested Price / Unit
                        </p>
                        <p className="mt-1 break-words font-bold text-gray-900">
                          {formatMoney(requestedPrice)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          Estimated Total
                        </p>
                        <p className="mt-1 break-words font-bold text-emerald-700">
                          {formatMoney(booking.estimated_total)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          Requested Collection
                        </p>
                        <p className="mt-1 font-bold text-gray-900">
                          {formatDate(booking.requested_collection_date)}
                        </p>
                      </div>
                    </div>

                    {/* Confirmed terms */}
                    {booking.status !== 'pending' &&
                      booking.status !== 'rejected' &&
                      booking.status !== 'cancelled' && (
                        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                          <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                            <CheckCircle2 size={17} />
                            Booking Terms
                          </h3>

                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-gray-500">
                                Confirmed Quantity
                              </p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">
                                {confirmedQuantity !== null
                                  ? `${confirmedQuantity.toLocaleString(
                                      'en-NG'
                                    )} ${booking.unit || ''}`
                                  : 'Awaiting confirmation'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Confirmed Price / Unit
                              </p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">
                                {confirmedPrice !== null
                                  ? formatMoney(confirmedPrice)
                                  : 'Awaiting confirmation'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Confirmed Total
                              </p>
                              <p className="mt-1 text-sm font-bold text-emerald-800">
                                {confirmedTotal !== null
                                  ? formatMoney(confirmedTotal)
                                  : 'Awaiting confirmation'}
                              </p>
                            </div>
                          </div>

                          {booking.collection_location && (
                            <div className="mt-4 border-t border-emerald-100 pt-3">
                              <p className="text-xs text-gray-500">
                                Collection Location
                              </p>
                              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-800">
                                <MapPin
                                  size={15}
                                  className="shrink-0 text-emerald-700"
                                />
                                {booking.collection_location}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Producer and aggregator information */}
                    <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-800">
                            Producer:
                          </span>{' '}
                          {booking.producer?.full_name || 'Producer'}
                        </p>

                        {booking.aggregator && (
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-800">
                              Aggregator:
                            </span>{' '}
                            {booking.aggregator.full_name}
                          </p>
                        )}

                        <p className="text-xs text-gray-400">
                          Requested on {formatDateTime(booking.created_at)}
                        </p>
                      </div>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => cancelBooking(booking)}
                          disabled={cancellingId === booking.id}
                          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {cancellingId === booking.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <XCircle size={16} />
                          )}
                          {cancellingId === booking.id
                            ? 'Cancelling...'
                            : 'Cancel Booking'}
                        </button>
                      )}
                    </div>

                    {/* Producer response */}
                    {booking.producer_response && (
                      <div className="mt-4 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <AlertCircle
                          size={18}
                          className="mt-0.5 shrink-0 text-blue-600"
                        />
                        <div>
                          <h3 className="text-sm font-semibold text-blue-900">
                            Response from the producer or aggregator
                          </h3>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-blue-800">
                            {booking.producer_response}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Buyer notes */}
                    {booking.buyer_notes && (
                      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Your Booking Notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                          {booking.buyer_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-center text-xs leading-5 text-gray-400">
          AgroLink pre-harvest bookings are for crops requested before harvest.
          Payment and collection should follow the confirmed booking terms.
        </p>
      </div>
    </div>
  );
};

export default BuyerBookings;
