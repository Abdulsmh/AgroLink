import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  Sprout,
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

const money = (value) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateLabel = (value) => {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function PreHarvestBookingManager({ role }) {
  const isAggregator = role === 'aggregator';

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [forms, setForms] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const loadBookings = useCallback(
    async (refresh = false) => {
      if (refresh) {
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
          setForms({});
          return;
        }

        let request = supabase
          .from('preharvest_bookings')
          .select('*')
          .order('created_at', { ascending: false });

        request = isAggregator
          ? request.eq('aggregator_id', user.id)
          : request.eq('producer_id', user.id);

        const { data, error } = await request;

        if (error) throw error;

        const rows = data || [];

        if (rows.length === 0) {
          setBookings([]);
          setForms({});
          setExpandedId(null);
          return;
        }

        const productIds = [
          ...new Set(rows.map((b) => b.product_id).filter(Boolean)),
        ];

        const buyerIds = [
          ...new Set(rows.map((b) => b.buyer_id).filter(Boolean)),
        ];

        const producerIds = [
          ...new Set(rows.map((b) => b.producer_id).filter(Boolean)),
        ];

        const [productResult, buyerResult, producerResult] =
          await Promise.all([
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

        if (productResult.error) throw productResult.error;
        if (buyerResult.error) throw buyerResult.error;
        if (producerResult.error) throw producerResult.error;

        const products = new Map(
          (productResult.data || []).map((item) => [item.id, item])
        );

        const buyers = new Map(
          (buyerResult.data || []).map((item) => [item.id, item])
        );

        const producers = new Map(
          (producerResult.data || []).map((item) => [item.id, item])
        );

        const enrichedBookings = rows.map((booking) => ({
          ...booking,
          product: products.get(booking.product_id) || null,
          buyer: buyers.get(booking.buyer_id) || null,
          producer: producers.get(booking.producer_id) || null,
        }));

        setBookings(enrichedBookings);

        // Initialize forms after attaching product information.
        // Preserve any form values already entered by the user.
        setForms((previous) => {
          const next = {};

          enrichedBookings.forEach((booking) => {
            next[booking.id] = previous[booking.id] || {
              decision: 'accepted',
              quantity: String(booking.quantity ?? ''),
              price: String(booking.requested_price_per_unit ?? ''),
              location:
                booking.collection_location ||
                booking.product?.location ||
                '',
              message: '',
            };
          });

          return next;
        });
      } catch (error) {
        console.error('Unable to load pre-harvest bookings:', error);
        toast.error(error.message || 'Could not load booking requests.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAggregator]
  );

  useEffect(() => {
    loadBookings();

    const channel = supabase
      .channel(`preharvest-${role}-bookings`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'preharvest_bookings',
        },
        () => {
          loadBookings(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadBookings, role]);

  const updateForm = (bookingId, field, value) => {
    setForms((previous) => ({
      ...previous,
      [bookingId]: {
        ...(previous[bookingId] || {}),
        [field]: value,
      },
    }));
  };

  // Open the custom confirmation modal.
  const respond = (booking) => {
    if (submittingId) return;

    const form = forms[booking.id];

    if (!form) return;

    if (!['accepted', 'rejected'].includes(form.decision)) {
      toast.error('Choose whether to accept or reject this request.');
      return;
    }

    setConfirmation({
      booking,
      decision: form.decision,
    });
  };

  // Validate and submit only after the user confirms in the modal.
  const submitResponse = async (booking, decision) => {
    const form = forms[booking.id];

    if (!form || submittingId) return;

    if (!['accepted', 'rejected'].includes(decision)) {
      toast.error('Invalid booking decision.');
      return;
    }

    if (booking.status !== 'pending') {
      setConfirmation(null);
      toast.error('This booking is no longer awaiting a response.');
      await loadBookings(true);
      return;
    }

    if (decision === 'accepted') {
      const quantity = Number(form.quantity);
      const price = Number(form.price);

      if (
        form.quantity === '' ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        toast.error('Enter a valid confirmed quantity.');
        return;
      }

      if (quantity > Number(booking.quantity)) {
        toast.error(
          'Confirmed quantity cannot exceed the requested quantity.'
        );
        return;
      }

      if (
        form.price === '' ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        toast.error('Enter a valid price per unit.');
        return;
      }

      if (!form.location?.trim()) {
        toast.error('Enter the collection location.');
        return;
      }
    }

    setSubmittingId(booking.id);

    try {
      const { error } = await supabase.rpc(
        'respond_to_preharvest_booking',
        {
          target_booking_id: booking.id,
          decision,
          response_message: form.message?.trim() || null,
          accepted_quantity:
            decision === 'accepted' ? Number(form.quantity) : null,
          accepted_price_per_unit:
            decision === 'accepted' ? Number(form.price) : null,
          accepted_collection_location:
            decision === 'accepted' ? form.location.trim() : null,
        }
      );

      if (error) throw error;

      setConfirmation(null);
      setExpandedId(null);

      toast.success(
        decision === 'accepted'
          ? 'Booking accepted successfully.'
          : 'Booking rejected successfully.'
      );

      await loadBookings(true);
    } catch (error) {
      console.error('Unable to respond to booking:', error);
      toast.error(error.message || 'Could not update this booking.');
    } finally {
      setSubmittingId(null);
    }
  };

  const confirmResponse = async () => {
    if (!confirmation || submittingId) return;

    const { booking, decision } = confirmation;

    await submitResponse(booking, decision);
  };

  const visibleBookings = bookings.filter((booking) => {
    if (filter === 'all') return true;

    if (filter === 'pending') {
      return booking.status === 'pending';
    }

    if (filter === 'active') {
      return [
        'accepted',
        'payment_pending',
        'payment_confirmed',
        'harvest_ready',
      ].includes(booking.status);
    }

    return booking.status === filter;
  });

  const pendingCount = bookings.filter(
    (booking) => booking.status === 'pending'
  ).length;

  const activeCount = bookings.filter((booking) =>
    [
      'accepted',
      'payment_pending',
      'payment_confirmed',
      'harvest_ready',
    ].includes(booking.status)
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Sprout size={18} />
              AgroLink
            </div>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {isAggregator
                ? 'Farmer Booking Requests'
                : 'Pre-Harvest Requests'}
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              {isAggregator
                ? 'Review requests assigned to you for farmers you represent.'
                : 'Review buyers’ crop requests and confirm the booking terms.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadBookings(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'All Requests', value: bookings.length },
            { label: 'Pending', value: pendingCount },
            { label: 'Accepted / Active', value: activeCount },
            {
              label: 'Completed',
              value: bookings.filter(
                (booking) => booking.status === 'completed'
              ).length,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border bg-white p-4 shadow-sm"
            >
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ['pending', 'Pending'],
            ['active', 'Active'],
            ['completed', 'Completed'],
            ['rejected', 'Rejected'],
            ['cancelled', 'Cancelled'],
            ['all', 'All'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                filter === value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {visibleBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white px-5 py-14 text-center">
            <Sprout className="mx-auto h-10 w-10 text-emerald-600" />

            <h2 className="mt-4 text-lg font-bold text-gray-900">
              No booking requests found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Requests matching this filter will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {visibleBookings.map((booking) => {
              const form = forms[booking.id] || {};
              const isPending = booking.status === 'pending';
              const expanded = expandedId === booking.id;
              const isSubmitting = submittingId === booking.id;

              return (
                <article
                  key={booking.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-900">
                            {booking.product?.crop_name ||
                              'Pre-Harvest Product'}
                          </h2>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              booking.status === 'pending'
                                ? 'bg-amber-50 text-amber-700'
                                : booking.status === 'accepted'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : booking.status === 'rejected'
                                    ? 'bg-red-50 text-red-700'
                                    : booking.status === 'completed'
                                      ? 'bg-blue-50 text-blue-700'
                                      : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {STATUS_LABELS[booking.status] ||
                              booking.status}
                          </span>
                        </div>

                        <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                          <MapPin size={15} />
                          {booking.product?.location ||
                            'Location not specified'}
                        </p>

                        <p className="mt-3 text-sm text-gray-700">
                          <strong>Buyer:</strong>{' '}
                          {booking.buyer?.full_name || 'Buyer'}
                        </p>

                        {booking.buyer?.phone_number && (
                          <p className="mt-1 text-sm text-gray-600">
                            <strong>Phone:</strong>{' '}
                            {booking.buyer.phone_number}
                          </p>
                        )}

                        {isAggregator && (
                          <p className="mt-1 text-sm text-gray-600">
                            <strong>Producer:</strong>{' '}
                            {booking.producer?.full_name || 'Farmer'}
                          </p>
                        )}
                      </div>

                      <div className="sm:text-right">
                        <p className="text-xs text-gray-500">
                          Requested quantity
                        </p>

                        <p className="mt-1 text-lg font-bold text-gray-900">
                          {Number(booking.quantity).toLocaleString('en-NG')}{' '}
                          {booking.unit || booking.product?.unit || ''}
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          {money(booking.requested_price_per_unit)} / unit
                        </p>

                        <p className="mt-1 text-sm font-semibold text-emerald-700">
                          Estimated: {money(booking.estimated_total)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-gray-500">
                          Requested collection
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {dateLabel(booking.requested_collection_date)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          Request received
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-800">
                          {dateLabel(booking.created_at)}
                        </p>
                      </div>
                    </div>

                    {booking.buyer_notes && (
                      <div className="mt-4 rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase text-gray-500">
                          Buyer’s notes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                          {booking.buyer_notes}
                        </p>
                      </div>
                    )}

                    {booking.producer_response && (
                      <div className="mt-4 rounded-xl bg-blue-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                          <AlertCircle size={16} />
                          Previous response
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-blue-800">
                          {booking.producer_response}
                        </p>
                      </div>
                    )}

                    {!isPending && (
                      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                          <CheckCircle2 size={17} />
                          {booking.status === 'rejected'
                            ? 'Booking Rejected'
                            : booking.status === 'cancelled'
                              ? 'Booking Cancelled'
                              : 'Confirmed Booking Terms'}
                        </p>

                        {['accepted', 'payment_pending', 'payment_confirmed', 'harvest_ready', 'completed'].includes(
                          booking.status
                        ) && (
                          <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <div>
                              <p className="text-xs text-gray-500">
                                Quantity
                              </p>
                              <p className="mt-1 text-sm font-bold text-gray-900">
                                {booking.confirmed_quantity ?? '—'}{' '}
                                {booking.unit || ''}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Price per unit
                              </p>
                              <p className="mt-1 text-sm font-bold text-gray-900">
                                {booking.confirmed_price_per_unit == null
                                  ? '—'
                                  : money(booking.confirmed_price_per_unit)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-gray-500">
                                Collection location
                              </p>
                              <p className="mt-1 text-sm font-bold text-gray-900">
                                {booking.collection_location || '—'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {isPending && (
                      <div className="mt-5 border-t pt-5">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : booking.id)
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          {expanded
                            ? 'Close Response Form'
                            : 'Review & Respond'}
                        </button>

                        {expanded && (
                          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 sm:p-5">
                            <h3 className="font-bold text-gray-900">
                              Respond to booking
                            </h3>

                            <div className="mt-4">
                              <label
                                htmlFor={`decision-${booking.id}`}
                                className="mb-2 block text-sm font-medium text-gray-700"
                              >
                                Decision
                              </label>

                              <select
                                id={`decision-${booking.id}`}
                                value={form.decision || 'accepted'}
                                onChange={(event) =>
                                  updateForm(
                                    booking.id,
                                    'decision',
                                    event.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
                              >
                                <option value="accepted">
                                  Accept booking
                                </option>
                                <option value="rejected">
                                  Reject booking
                                </option>
                              </select>
                            </div>

                            {form.decision === 'accepted' && (
                              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div>
                                  <label
                                    htmlFor={`quantity-${booking.id}`}
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                  >
                                    Confirmed quantity (
                                    {booking.unit || 'units'})
                                  </label>

                                  <input
                                    id={`quantity-${booking.id}`}
                                    type="number"
                                    min="0.01"
                                    max={booking.quantity}
                                    step="any"
                                    value={form.quantity ?? ''}
                                    onChange={(event) =>
                                      updateForm(
                                        booking.id,
                                        'quantity',
                                        event.target.value
                                      )
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
                                  />

                                  <p className="mt-1 text-xs text-gray-500">
                                    Maximum requested: {booking.quantity}
                                  </p>
                                </div>

                                <div>
                                  <label
                                    htmlFor={`price-${booking.id}`}
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                  >
                                    Confirmed price per unit (NGN)
                                  </label>

                                  <input
                                    id={`price-${booking.id}`}
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={form.price ?? ''}
                                    onChange={(event) =>
                                      updateForm(
                                        booking.id,
                                        'price',
                                        event.target.value
                                      )
                                    }
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
                                  />
                                </div>

                                <div className="sm:col-span-2">
                                  <label
                                    htmlFor={`location-${booking.id}`}
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                  >
                                    Collection location
                                  </label>

                                  <input
                                    id={`location-${booking.id}`}
                                    type="text"
                                    value={form.location ?? ''}
                                    onChange={(event) =>
                                      updateForm(
                                        booking.id,
                                        'location',
                                        event.target.value
                                      )
                                    }
                                    placeholder="Enter the agreed pickup location"
                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
                                  />
                                </div>
                              </div>
                            )}

                            <div className="mt-4">
                              <label
                                htmlFor={`message-${booking.id}`}
                                className="mb-2 block text-sm font-medium text-gray-700"
                              >
                                Response message (optional)
                              </label>

                              <textarea
                                id={`message-${booking.id}`}
                                rows={3}
                                maxLength={1000}
                                value={form.message ?? ''}
                                onChange={(event) =>
                                  updateForm(
                                    booking.id,
                                    'message',
                                    event.target.value
                                  )
                                }
                                placeholder="Add details for the buyer..."
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => respond(booking)}
                                disabled={Boolean(submittingId)}
                                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 ${
                                  form.decision === 'rejected'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                              >
                                {form.decision === 'rejected' ? (
                                  <XCircle size={16} />
                                ) : (
                                  <CheckCircle2 size={16} />
                                )}

                                {form.decision === 'rejected'
                                  ? 'Review Rejection'
                                  : 'Review Acceptance'}
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpandedId(null)}
                                disabled={Boolean(submittingId)}
                                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
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
      </div>

      {/* AgroLink confirmation modal */}
      {confirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (
              event.target === event.currentTarget &&
              !submittingId
            ) {
              setConfirmation(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-confirmation-title"
            aria-describedby="booking-confirmation-description"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div
              className={`px-6 pb-6 pt-7 ${
                confirmation.decision === 'accepted'
                  ? 'bg-gradient-to-br from-emerald-50 via-white to-green-50'
                  : 'bg-gradient-to-br from-red-50 via-white to-rose-50'
              }`}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <Sprout size={20} />
                  </div>
                  <span className="text-sm font-bold tracking-wide text-gray-800">
                    AgroLink
                  </span>
                </div>

                <button
                  type="button"
                  aria-label="Close confirmation"
                  onClick={() => {
                    if (!submittingId) setConfirmation(null);
                  }}
                  disabled={Boolean(submittingId)}
                  className="rounded-full p-2 text-gray-400 transition hover:bg-white hover:text-gray-700 disabled:opacity-50"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div
                className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                  confirmation.decision === 'accepted'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {confirmation.decision === 'accepted' ? (
                  <CheckCircle2 size={30} />
                ) : (
                  <AlertCircle size={30} />
                )}
              </div>

              <h2
                id="booking-confirmation-title"
                className="text-xl font-bold text-gray-900 sm:text-2xl"
              >
                {confirmation.decision === 'accepted'
                  ? 'Accept this booking?'
                  : 'Reject this booking?'}
              </h2>

              <p
                id="booking-confirmation-description"
                className="mt-3 text-sm leading-6 text-gray-600"
              >
                {confirmation.decision === 'accepted'
                  ? 'You are about to confirm this buyer’s pre-harvest request. Please ensure the quantity, price and collection location are correct.'
                  : 'You are about to reject this buyer’s request. The booking will be marked as rejected and the buyer can see your response.'}
              </p>

              {confirmation.decision === 'accepted' && (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Booking summary
                  </p>

                  <p className="mt-2 font-bold text-gray-900">
                    {confirmation.booking.product?.crop_name ||
                      'Pre-Harvest Product'}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Buyer</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {confirmation.booking.buyer?.full_name || 'Buyer'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Confirmed quantity
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {forms[confirmation.booking.id]?.quantity || '—'}{' '}
                        {confirmation.booking.unit || ''}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Price per unit</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {money(forms[confirmation.booking.id]?.price)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Collection</p>
                      <p className="mt-1 break-words text-sm font-medium text-gray-800">
                        {forms[confirmation.booking.id]?.location ||
                          'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {confirmation.decision === 'rejected' && (
                <div className="mt-5 rounded-2xl border border-red-100 bg-white/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Booking
                  </p>
                  <p className="mt-1 font-bold text-gray-900">
                    {confirmation.booking.product?.crop_name ||
                      'Pre-Harvest Product'}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Buyer: {confirmation.booking.buyer?.full_name || 'Buyer'}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Requested quantity: {confirmation.booking.quantity}{' '}
                    {confirmation.booking.unit || ''}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-white p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmation(null)}
                disabled={Boolean(submittingId)}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Go Back
              </button>

              <button
                type="button"
                onClick={confirmResponse}
                disabled={Boolean(submittingId)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  confirmation.decision === 'accepted'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submittingId === confirmation.booking.id ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Processing...
                  </>
                ) : confirmation.decision === 'accepted' ? (
                  <>
                    <CheckCircle2 size={17} />
                    Yes, Accept Booking
                  </>
                ) : (
                  <>
                    <XCircle size={17} />
                    Yes, Reject Booking
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
