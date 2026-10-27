
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
  MessageSquareText,
  UserRound,
  Banknote,
  Handshake,
  Send,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: {
    label: 'Awaiting Response',
    color: 'amber',
    description:
      'The producer or authorized aggregator has not responded to your booking yet.',
  },
  seller_proposed: {
    label: 'Seller Proposed Terms',
    color: 'indigo',
    description:
      'The seller has proposed different terms. Review the offer and accept, counteroffer, or reject it.',
  },
  buyer_countered: {
    label: 'Counteroffer Sent',
    color: 'orange',
    description:
      'Your counteroffer has been sent. Wait for the producer or authorized aggregator to respond.',
  },
  accepted: {
    label: 'Booking Accepted',
    color: 'blue',
    description:
      'Your booking has been accepted. Review the agreed terms and collection instructions below.',
  },
  payment_pending: {
    label: 'Payment Arrangements',
    color: 'orange',
    description:
      'Arrange payment directly with the producer or authorized aggregator. Payment takes place outside AgroLink.',
  },
  payment_confirmed: {
    label: 'Payment Reported',
    color: 'indigo',
    description:
      'Payment arrangements have been reported as confirmed. Await preparation of your produce.',
  },
  harvest_ready: {
    label: 'Ready for Collection',
    color: 'emerald',
    description:
      'Your produce is marked ready. Review the collection instructions and arrange pickup.',
  },
  completed: {
    label: 'Completed',
    color: 'green',
    description: 'This booking has been marked as completed.',
  },
  rejected: {
    label: 'Rejected',
    color: 'red',
    description:
      'This booking or proposal has been rejected. Review the seller or buyer response below.',
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
  { value: 'cancelled', label: 'Cancelled / Rejected' },
];

const ACTIVE_STATUSES = [
  'pending',
  'seller_proposed',
  'buyer_countered',
  'accepted',
  'payment_pending',
  'payment_confirmed',
  'harvest_ready',
];

const CONFIRMED_STATUSES = [
  'accepted',
  'payment_pending',
  'payment_confirmed',
  'harvest_ready',
  'completed',
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

  return parsedDate.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getProductImage = (imagePath) => {
  if (!imagePath) return null;

  let path = imagePath;

  if (typeof path === 'string') {
    try {
      path = JSON.parse(path);
    } catch {
      // Keep plain storage paths and URLs unchanged.
    }
  }

  if (Array.isArray(path)) path = path[0];

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
  const [cancelConfirmId, setCancelConfirmId] = useState(null);
  const [respondingId, setRespondingId] = useState(null);
  const [proposalModal, setProposalModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const [proposalForm, setProposalForm] = useState({
    quantity: '',
    price: '',
    location: '',
    message: '',
  });

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
        ...new Set(
          rows.map((booking) => booking.aggregator_id).filter(Boolean)
        ),
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
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn(
            'Buyer booking realtime subscription failed. Use Refresh to reload bookings.'
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings]);

  const cancelBooking = async (booking) => {
    if (booking.status !== 'pending') {
      toast.error('Only pending bookings can be cancelled.');
      return;
    }

    if (cancellingId) return;

    setCancellingId(booking.id);

    try {
      const { error } = await supabase.rpc('cancel_preharvest_booking', {
        target_booking_id: booking.id,
      });

      if (error) throw error;

      setCancelConfirmId(null);
      toast.success('Booking cancelled successfully.');
      await fetchBookings(true);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.message || 'Unable to cancel this booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const openCounteroffer = (booking) => {
    setProposalForm({
      quantity: String(
        booking.proposed_quantity ?? booking.quantity ?? ''
      ),
      price: String(
        booking.proposed_price_per_unit ??
          booking.requested_price_per_unit ??
          ''
      ),
      location:
        booking.proposed_collection_location ||
        booking.collection_location ||
        booking.product?.location ||
        '',
      message: '',
    });

    setProposalModal({
      booking,
      decision: 'counter',
    });
  };

  const openRejection = (booking) => {
    setProposalForm({
      quantity: '',
      price: '',
      location: '',
      message: '',
    });

    setProposalModal({
      booking,
      decision: 'reject',
    });
  };

  const closeProposalModal = () => {
    if (respondingId) return;

    setProposalModal(null);
    setProposalForm({
      quantity: '',
      price: '',
      location: '',
      message: '',
    });
  };

  const respondToProposal = async (booking, decision) => {
    if (respondingId) return;

    if (!['accept', 'counter', 'reject'].includes(decision)) {
      toast.error('Invalid response.');
      return;
    }

    const isCounter = decision === 'counter';

    const quantity = Number(proposalForm.quantity);
    const price = Number(proposalForm.price);
    const location = proposalForm.location.trim();

    if (isCounter) {
      if (
        proposalForm.quantity.trim() === '' ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        toast.error('Enter a valid counteroffer quantity.');
        return;
      }

      if (quantity > Number(booking.quantity)) {
        toast.error(
          'Your counteroffer cannot exceed the originally requested quantity.'
        );
        return;
      }

      if (
        proposalForm.price.trim() === '' ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        toast.error('Enter a valid counteroffer price.');
        return;
      }

      if (!location) {
        toast.error('Enter a collection location.');
        return;
      }
    }

    setRespondingId(booking.id);

    try {
      const { error } = await supabase.rpc(
        'buyer_respond_to_preharvest_proposal',
        {
          target_booking_id: booking.id,
          decision,
          response_message: proposalForm.message.trim() || null,
          counter_quantity: isCounter ? quantity : null,
          counter_price_per_unit: isCounter ? price : null,
          counter_collection_location: isCounter ? location : null,
        }
      );

      if (error) throw error;

      setProposalModal(null);
      setProposalForm({
        quantity: '',
        price: '',
        location: '',
        message: '',
      });

      toast.success(
        decision === 'accept'
          ? 'Seller proposal accepted. The agreed terms are now confirmed.'
          : decision === 'counter'
            ? 'Your counteroffer has been sent to the seller.'
            : 'Seller proposal rejected.'
      );

      await fetchBookings(true);
    } catch (error) {
      console.error('Error responding to seller proposal:', error);
      toast.error(error.message || 'Unable to submit your response.');
    } finally {
      setRespondingId(null);
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
          booking.producer_response,
          booking.proposed_terms_message,
          booking.proposed_collection_location,
          booking.buyer_response,
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
              Track your requested crops, negotiate terms with sellers, and
              follow each booking through collection.
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
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Payment notice */}
        <div className="mb-6 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <AlertCircle className="mt-0.5 shrink-0 text-blue-700" size={21} />
          <div>
            <h2 className="text-sm font-bold text-blue-900">
              Payment takes place outside AgroLink
            </h2>
            <p className="mt-1 text-sm leading-6 text-blue-800">
              Agree on the final price and collection arrangements before
              paying the producer or authorized aggregator directly. AgroLink
              does not process payment through this booking page.
            </p>
          </div>
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
              placeholder="Search crop, seller, location, or instructions..."
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

              const estimatedTotal =
                booking.estimated_total != null
                  ? Number(booking.estimated_total)
                  : requestedQuantity * requestedPrice;

              const confirmedTotal =
                confirmedQuantity !== null && confirmedPrice !== null
                  ? confirmedQuantity * confirmedPrice
                  : null;

              const proposedQuantity =
                booking.proposed_quantity != null
                  ? Number(booking.proposed_quantity)
                  : null;

              const proposedPrice =
                booking.proposed_price_per_unit != null
                  ? Number(booking.proposed_price_per_unit)
                  : null;

              const proposedTotal =
                proposedQuantity !== null && proposedPrice !== null
                  ? proposedQuantity * proposedPrice
                  : null;

              const isPending = booking.status === 'pending';
              const hasSellerProposal = booking.status === 'seller_proposed';
              const hasCounteroffer = booking.status === 'buyer_countered';
              const hasConfirmedTerms = CONFIRMED_STATUSES.includes(
                booking.status
              );

              return (
                <article
                  key={booking.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-4 sm:p-6">
                    {/* Product and status */}
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-emerald-50 sm:w-32">
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
                              {hasConfirmedTerms &&
                              booking.collection_location?.trim()
                                ? booking.collection_location
                                : hasSellerProposal &&
                                    booking.proposed_collection_location?.trim()
                                  ? booking.proposed_collection_location
                                  : booking.product?.location ||
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
                            ) : ['rejected', 'cancelled'].includes(
                                booking.status
                              ) ? (
                              <XCircle size={14} />
                            ) : hasSellerProposal || hasCounteroffer ? (
                              <Handshake size={14} />
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

                    {/* Original requested terms */}
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
                          {formatMoney(estimatedTotal)}
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

                    {/* Seller proposal */}
                    {hasSellerProposal && (
                      <section className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                            <MessageSquareText size={21} />
                          </div>
                          <div>
                            <h3 className="font-bold text-indigo-950">
                              Seller's Proposed Terms
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-indigo-800">
                              Review these terms. Your booking will only be
                              confirmed after you accept the proposal.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-indigo-100 bg-white p-4">
                            <p className="text-xs text-gray-500">
                              Proposed Quantity
                            </p>
                            <p className="mt-2 font-bold text-gray-900">
                              {proposedQuantity !== null
                                ? `${proposedQuantity.toLocaleString('en-NG')} ${
                                    booking.unit || booking.product?.unit || ''
                                  }`
                                : 'Not provided'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-indigo-100 bg-white p-4">
                            <p className="text-xs text-gray-500">
                              Proposed Price per Unit
                            </p>
                            <p className="mt-2 font-bold text-gray-900">
                              {proposedPrice !== null
                                ? formatMoney(proposedPrice)
                                : 'Not provided'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-indigo-100 bg-white p-4">
                            <p className="text-xs text-gray-500">
                              Proposed Total
                            </p>
                            <p className="mt-2 font-bold text-emerald-700">
                              {proposedTotal !== null
                                ? formatMoney(proposedTotal)
                                : 'Not available'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-4">
                          <p className="text-xs font-semibold text-gray-500">
                            Proposed Collection Location
                          </p>
                          <p className="mt-2 text-sm leading-6 text-gray-800">
                            {booking.proposed_collection_location?.trim() ||
                              'The seller has not specified a location.'}
                          </p>
                        </div>

                        {booking.proposed_terms_message?.trim() && (
                          <div className="mt-3 rounded-xl border border-indigo-100 bg-white p-4">
                            <p className="text-xs font-semibold text-gray-500">
                              Seller's Message
                            </p>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                              {booking.proposed_terms_message}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={Boolean(respondingId)}
                            onClick={() =>
                              respondToProposal(booking, 'accept')
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {respondingId === booking.id ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            Accept Terms
                          </button>

                          <button
                            type="button"
                            disabled={Boolean(respondingId)}
                            onClick={() => openCounteroffer(booking)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                          >
                            <Send size={16} />
                            Make Counteroffer
                          </button>

                          <button
                            type="button"
                            disabled={Boolean(respondingId)}
                            onClick={() => openRejection(booking)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            Reject Proposal
                          </button>
                        </div>
                      </section>
                    )}

                    {/* Buyer counteroffer notice */}
                    {hasCounteroffer && (
                      <section className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <Clock
                            size={22}
                            className="mt-0.5 shrink-0 text-orange-700"
                          />
                          <div>
                            <h3 className="font-bold text-orange-950">
                              Counteroffer Awaiting Seller Response
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-orange-900">
                              Your latest proposed terms have been sent to the
                              seller. The booking is not confirmed yet.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-orange-100 bg-white p-4">
                            <p className="text-xs text-gray-500">
                              Your Proposed Quantity
                            </p>
                            <p className="mt-2 font-bold text-gray-900">
                              {proposedQuantity !== null
                                ? `${proposedQuantity.toLocaleString('en-NG')} ${
                                    booking.unit || booking.product?.unit || ''
                                  }`
                                : 'Not provided'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-orange-100 bg-white p-4">
                            <p className="text-xs text-gray-500">
                              Your Proposed Price / Unit
                            </p>
                            <p className="mt-2 font-bold text-gray-900">
                              {proposedPrice !== null
                                ? formatMoney(proposedPrice)
                                : 'Not provided'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-orange-100 bg-white p-4">
                            <p className="text-xs text-gray-500">
                              Proposed Total
                            </p>
                            <p className="mt-2 font-bold text-emerald-700">
                              {proposedTotal !== null
                                ? formatMoney(proposedTotal)
                                : 'Not available'}
                            </p>
                          </div>
                        </div>

                        {booking.proposed_collection_location && (
                          <p className="mt-3 text-sm text-orange-950">
                            <strong>Collection location:</strong>{' '}
                            {booking.proposed_collection_location}
                          </p>
                        )}

                        {booking.buyer_response?.trim() && (
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-orange-950">
                            <strong>Your message:</strong>{' '}
                            {booking.buyer_response}
                          </p>
                        )}
                      </section>
                    )}

                    {/* Confirmed terms */}
                    {hasConfirmedTerms && (
                      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                            <CheckCircle2 size={22} />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-emerald-950">
                              Confirmed Booking Terms
                            </h3>
                            <p className="mt-1 text-sm leading-6 text-emerald-800">
                              These are the terms saved for your accepted
                              booking.
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-xl border border-emerald-100 bg-white p-4">
                            <p className="text-xs font-medium text-gray-500">
                              Confirmed Quantity
                            </p>
                            <p className="mt-2 text-lg font-bold text-gray-900">
                              {confirmedQuantity !== null
                                ? `${confirmedQuantity.toLocaleString('en-NG')} ${
                                    booking.unit || booking.product?.unit || ''
                                  }`
                                : 'Not provided'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-emerald-100 bg-white p-4">
                            <p className="text-xs font-medium text-gray-500">
                              Confirmed Price per Unit
                            </p>
                            <p className="mt-2 text-lg font-bold text-gray-900">
                              {confirmedPrice !== null
                                ? formatMoney(confirmedPrice)
                                : 'Not provided'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-emerald-100 bg-white p-4">
                            <p className="text-xs font-medium text-gray-500">
                              Total Agreed Amount
                            </p>
                            <p className="mt-2 text-lg font-bold text-emerald-800">
                              {confirmedTotal !== null
                                ? formatMoney(confirmedTotal)
                                : 'Not available'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-emerald-100 bg-white p-4">
                          <div className="flex items-start gap-3">
                            <MapPin
                              className="mt-0.5 shrink-0 text-emerald-700"
                              size={21}
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-gray-900">
                                Confirmed Collection Location
                              </h4>
                              <p className="mt-1 break-words text-sm leading-6 text-gray-700">
                                {booking.collection_location?.trim() ||
                                  'The seller has not provided a collection location yet. Contact them before travelling.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-4">
                          <div className="flex items-start gap-3">
                            <CalendarDays
                              className="mt-0.5 shrink-0 text-emerald-700"
                              size={20}
                            />
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">
                                Requested Collection Date
                              </h4>
                              <p className="mt-1 text-sm text-gray-700">
                                {formatDate(booking.requested_collection_date)}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-gray-500">
                                This is your requested date. Confirm the actual
                                pickup date directly with the seller.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <div className="flex items-start gap-3">
                            <MessageSquareText
                              className="mt-0.5 shrink-0 text-blue-700"
                              size={21}
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-blue-950">
                                Collection Instructions
                              </h4>
                              {booking.producer_response?.trim() ? (
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-blue-900">
                                  {booking.producer_response}
                                </p>
                              ) : (
                                <p className="mt-2 text-sm leading-6 text-blue-800">
                                  No additional collection instructions have
                                  been provided yet.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl bg-emerald-100/70 p-4">
                          <div className="flex items-start gap-3">
                            <Banknote
                              className="mt-0.5 shrink-0 text-emerald-800"
                              size={20}
                            />
                            <div>
                              <h4 className="text-sm font-bold text-emerald-950">
                                Payment and Pickup Reminder
                              </h4>
                              <p className="mt-1 text-sm leading-6 text-emerald-900">
                                Arrange payment directly with the seller
                                outside AgroLink. Confirm the agreed amount,
                                collection date, location, and contact details
                                before travelling or paying.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rejected response */}
                    {booking.status === 'rejected' &&
                      (booking.producer_response?.trim() ||
                        booking.buyer_response?.trim()) && (
                        <div className="mt-5 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
                          <AlertCircle
                            size={19}
                            className="mt-0.5 shrink-0 text-red-600"
                          />
                          <div>
                            <h3 className="text-sm font-semibold text-red-900">
                              Booking Response
                            </h3>
                            {booking.producer_response?.trim() && (
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-red-800">
                                {booking.producer_response}
                              </p>
                            )}
                            {booking.buyer_response?.trim() && (
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-red-800">
                                {booking.buyer_response}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Seller information and cancellation */}
                    <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="flex items-start gap-2 text-sm text-gray-600">
                          <UserRound
                            size={16}
                            className="mt-0.5 shrink-0 text-gray-400"
                          />
                          <span>
                            <span className="font-semibold text-gray-800">
                              Producer:
                            </span>{' '}
                            {booking.producer?.full_name || 'Producer'}
                            {booking.producer?.lga_location
                              ? ` · ${booking.producer.lga_location}`
                              : ''}
                          </span>
                        </p>

                        {booking.aggregator && (
                          <p className="flex items-start gap-2 text-sm text-gray-600">
                            <UserRound
                              size={16}
                              className="mt-0.5 shrink-0 text-gray-400"
                            />
                            <span>
                              <span className="font-semibold text-gray-800">
                                Aggregator:
                              </span>{' '}
                              {booking.aggregator.full_name}
                              {booking.aggregator.lga_location
                                ? ` · ${booking.aggregator.lga_location}`
                                : ''}
                            </span>
                          </p>
                        )}

                        <p className="text-xs text-gray-400">
                          Requested on {formatDateTime(booking.created_at)}
                        </p>
                      </div>

                      {isPending && (
                        <div className="flex flex-col items-start gap-2">
                          {cancelConfirmId === booking.id ? (
                            <div className="w-full rounded-xl border border-red-200 bg-red-50 p-3 sm:w-64">
                              <p className="text-sm font-semibold text-red-800">
                                Cancel this booking?
                              </p>
                              <p className="mt-1 text-xs leading-5 text-red-700">
                                You cannot undo this action. You can submit a
                                new booking later.
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => cancelBooking(booking)}
                                  disabled={Boolean(cancellingId)}
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                >
                                  {cancellingId === booking.id && (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  )}
                                  Confirm cancellation
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setCancelConfirmId(null)}
                                  disabled={Boolean(cancellingId)}
                                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                                >
                                  Keep booking
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCancelConfirmId(booking.id)}
                              disabled={Boolean(cancellingId)}
                              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                            >
                              <XCircle size={16} />
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      )}
                    </div>

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

        <p className="mt-8 text-center text-xs leading-5 text-gray-500">
          Payment is arranged directly between the buyer and seller outside
          AgroLink. Confirm the agreed price and pickup arrangements before
          completing your transaction.
        </p>
      </div>

      {/* Counteroffer / rejection modal */}
      {proposalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeProposalModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="proposal-modal-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="proposal-modal-title"
                  className="text-xl font-bold text-gray-900"
                >
                  {proposalModal.decision === 'counter'
                    ? 'Make a Counteroffer'
                    : 'Reject Seller Proposal'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  {proposalModal.decision === 'counter'
                    ? 'Submit the terms you would like the seller to consider.'
                    : 'Confirm that you want to reject the seller’s proposed terms.'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeProposalModal}
                disabled={Boolean(respondingId)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <XCircle size={21} />
              </button>
            </div>

            {proposalModal.decision === 'counter' ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Counteroffer Quantity
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={proposalModal.booking.quantity}
                    step="any"
                    value={proposalForm.quantity}
                    onChange={(event) =>
                      setProposalForm((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum: {Number(
                      proposalModal.booking.quantity
                    ).toLocaleString('en-NG')}{' '}
                    {proposalModal.booking.unit || ''}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Counteroffer Price per Unit (NGN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={proposalForm.price}
                    onChange={(event) =>
                      setProposalForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Collection Location
                  </label>
                  <input
                    type="text"
                    maxLength={500}
                    value={proposalForm.location}
                    onChange={(event) =>
                      setProposalForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    placeholder="Enter your preferred collection location"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Message to Seller (Optional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={proposalForm.message}
                    onChange={(event) =>
                      setProposalForm((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                    placeholder="Explain your proposed terms..."
                    className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-sm text-emerald-900">
                    Proposed total:{' '}
                    <strong>
                      {formatMoney(
                        Number(proposalForm.quantity || 0) *
                          Number(proposalForm.price || 0)
                      )}
                    </strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4">
                <p className="text-sm leading-6 text-red-800">
                  Rejecting this proposal will decline the current offer. You
                  may need to submit a new booking if you want to negotiate
                  again.
                </p>

                <label className="mb-1.5 mt-4 block text-sm font-semibold text-gray-700">
                  Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={proposalForm.message}
                  onChange={(event) =>
                    setProposalForm((current) => ({
                      ...current,
                      message: event.target.value,
                    }))
                  }
                  placeholder="Explain why you are declining..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={Boolean(respondingId)}
                onClick={closeProposalModal}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                disabled={Boolean(respondingId)}
                onClick={() =>
                  respondToProposal(
                    proposalModal.booking,
                    proposalModal.decision
                  )
                }
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${
                  proposalModal.decision === 'counter'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {respondingId === proposalModal.booking.id && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {proposalModal.decision === 'counter'
                  ? 'Send Counteroffer'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerBookings;
