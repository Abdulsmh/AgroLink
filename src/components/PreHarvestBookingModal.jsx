
import React, { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Loader2,
  MapPin,
  X,
  Package,
  ShoppingBasket,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';

const todayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const getErrorMessage = (error) => {
  const message = String(error?.message || '').toLowerCase();

  if (
    error?.code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied')
  ) {
    return 'Your booking could not be submitted because the database rejected the request. Please check your account permissions or contact support.';
  }

  if (
    error?.code === '23505' ||
    message.includes('duplicate key')
  ) {
    return 'This booking appears to have already been submitted. Please refresh your bookings before trying again.';
  }

  if (
    error?.code === '23503' ||
    message.includes('foreign key')
  ) {
    return 'Some booking information is no longer valid. Please refresh the product page and try again.';
  }

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch')
  ) {
    return 'A network error occurred. Check your internet connection and try again.';
  }

  return error?.message || 'Unable to submit your booking. Please try again.';
};

const PreHarvestBookingModal = ({
  product,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState('1');
  const [collectionDate, setCollectionDate] = useState('');
  const [collectionLocation, setCollectionLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submittingRef = useRef(false);

  const availableQuantity = Number(product?.quantity);
  const pricePerUnit = Number(product?.price_per_unit);
  const requestedQuantity = Number(quantity);
  const estimatedTotal = requestedQuantity * pricePerUnit;

  const isValidProduct =
    Boolean(product?.id) &&
    product?.product_type === 'pre_harvest' &&
    Number.isFinite(availableQuantity) &&
    availableQuantity > 0 &&
    Number.isFinite(pricePerUnit) &&
    pricePerUnit >= 0;

  const isValidQuantity =
    quantity.trim() !== '' &&
    Number.isFinite(requestedQuantity) &&
    requestedQuantity > 0 &&
    requestedQuantity <= availableQuantity;

  const isValidDate =
    !collectionDate || collectionDate >= todayString();

  const isValidLocation =
    collectionLocation.trim().length >= 3 &&
    collectionLocation.trim().length <= 300;

  const isValidNotes = notes.trim().length <= 1000;

  const canSubmit =
    Boolean(currentUser?.id) &&
    isValidProduct &&
    isValidQuantity &&
    isValidDate &&
    isValidLocation &&
    isValidNotes &&
    !submitting;

  useEffect(() => {
    if (!product?.id) return;

    setQuantity('1');
    setCollectionDate('');
    setCollectionLocation('');
    setNotes('');
  }, [product?.id]);

  useEffect(() => {
    if (!product) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !submittingRef.current) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [product, onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submittingRef.current) return;

    if (!currentUser?.id) {
      toast.error('Please sign in to request a pre-harvest booking.');
      return;
    }

    if (!product?.id) {
      toast.error('The selected product could not be found.');
      return;
    }

    if (product.product_type !== 'pre_harvest') {
      toast.error('This product is not available for pre-harvest booking.');
      return;
    }

    if (
      !Number.isFinite(availableQuantity) ||
      availableQuantity <= 0
    ) {
      toast.error('This product currently has no available quantity.');
      return;
    }

    if (
      quantity.trim() === '' ||
      !Number.isFinite(requestedQuantity) ||
      requestedQuantity <= 0
    ) {
      toast.error('Enter a valid quantity greater than zero.');
      return;
    }

    if (requestedQuantity > availableQuantity) {
      toast.error(
        `Only ${availableQuantity.toLocaleString('en-NG')} ${
          product.unit || 'units'
        } are currently listed.`
      );
      return;
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      toast.error('The listed product price is invalid.');
      return;
    }

    if (!isValidDate) {
      toast.error('The collection date cannot be in the past.');
      return;
    }

    if (!isValidLocation) {
      toast.error(
        'Enter a collection location of at least 3 characters.'
      );
      return;
    }

    if (!isValidNotes) {
      toast.error('Notes cannot exceed 1,000 characters.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const {
        data: { user: authenticatedUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (
        !authenticatedUser ||
        authenticatedUser.id !== currentUser.id
      ) {
        throw new Error(
          'Your session has expired or changed. Please sign in again.'
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', authenticatedUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || profile.role !== 'buyer') {
        throw new Error(
          'Only registered buyer accounts can create pre-harvest bookings.'
        );
      }

      // Recheck the product record immediately before creating the booking.
      const { data: latestProduct, error: productError } = await supabase
        .from('products')
        .select(
          'id, producer_id, quantity, unit, product_type, price_per_unit, location'
        )
        .eq('id', product.id)
        .maybeSingle();

      if (productError) throw productError;

      if (!latestProduct) {
        throw new Error(
          'This product is no longer available. Please refresh the page.'
        );
      }

      if (latestProduct.product_type !== 'pre_harvest') {
        throw new Error(
          'This product is no longer available for pre-harvest booking.'
        );
      }

      const latestQuantity = Number(latestProduct.quantity);
      const latestPrice = Number(latestProduct.price_per_unit);

      if (
        !Number.isFinite(latestQuantity) ||
        latestQuantity <= 0
      ) {
        throw new Error(
          'This product currently has no available quantity.'
        );
      }

      if (
        !Number.isFinite(latestPrice) ||
        latestPrice < 0
      ) {
        throw new Error(
          'The current product price is invalid. Please contact support.'
        );
      }

      if (requestedQuantity > latestQuantity) {
        throw new Error(
          `Only ${latestQuantity.toLocaleString('en-NG')} ${
            latestProduct.unit || 'units'
          } are currently available.`
        );
      }

      // to avoid silently submitting a request based on a price that changed
      // while the buyer was filling out the form.
      if (latestPrice !== pricePerUnit) {
        throw new Error(
          `The listed price has changed to ${formatNaira(
            latestPrice
          )} per ${latestProduct.unit || 'unit'}. Refresh the product page and review the new price before booking.`
        );
      }

      const cleanedLocation = collectionLocation.trim();

      // collection_location is an existing preharvest_bookings field.
      // The buyer's requested pickup location is saved explicitly.
      const bookingPayload = {
        buyer_id: authenticatedUser.id,
        product_id: latestProduct.id,
        quantity: requestedQuantity,
        requested_collection_date: collectionDate || null,
        buyer_notes: notes.trim() || null,
        collection_location: cleanedLocation,
        status: 'pending',
      };

      const { error: bookingError } = await supabase
        .from('preharvest_bookings')
        .insert(bookingPayload);

      if (bookingError) throw bookingError;

      toast.success(
        'Pre-harvest booking request submitted successfully.'
      );

      onSuccess?.();
      onClose?.();
    } catch (error) {
      console.error('Pre-harvest booking submission failed:', error);
      toast.error(getErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submittingRef.current
        ) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="preharvest-booking-title"
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck size={17} />
              AgroLink Pre-Harvest
            </div>

            <h2
              id="preharvest-booking-title"
              className="text-xl font-bold text-gray-900 sm:text-2xl"
            >
              Request a Booking
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Request produce before it is harvested.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close booking form"
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={21} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                  <Package size={23} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="break-words font-bold text-gray-900">
                    {product.crop_name || 'Selected produce'}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                    {product.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={14} />
                        {product.location}
                      </span>
                    )}

                    <span>
                      {Number.isFinite(availableQuantity)
                        ? availableQuantity.toLocaleString('en-NG')
                        : '—'}{' '}
                      {product.unit || 'units'} listed
                    </span>
                  </div>

                  <p className="mt-2 text-lg font-bold text-emerald-800">
                    {formatNaira(pricePerUnit)}
                    <span className="ml-1 text-xs font-medium text-gray-600">
                      / {product.unit || 'unit'}
                    </span>
                  </p>
                </div>
              </div>

              {product.description && (
                <p className="mt-3 border-t border-emerald-100 pt-3 text-sm leading-6 text-gray-600">
                  {product.description}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="booking-quantity"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Quantity required
              </label>

              <div className="relative">
                <ShoppingBasket
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="booking-quantity"
                  type="number"
                  min="0.01"
                  max={availableQuantity}
                  step="any"
                  inputMode="decimal"
                  required
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  disabled={submitting}
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-16 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {product.unit || 'units'}
                </span>
              </div>

              {quantity !== '' && !isValidQuantity && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle size={13} />
                  Enter a quantity greater than zero and no more than the listed stock.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="booking-date"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Preferred collection date
                <span className="ml-1 font-normal text-gray-400">
                  (optional)
                </span>
              </label>

              <div className="relative">
                <CalendarDays
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="booking-date"
                  type="date"
                  min={todayString()}
                  value={collectionDate}
                  onChange={(event) =>
                    setCollectionDate(event.target.value)
                  }
                  disabled={submitting}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
                />
              </div>

              {!isValidDate && (
                <p className="mt-1.5 text-xs text-red-600">
                  Please choose today or a future date.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="booking-location"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Requested collection location
                <span className="ml-1 text-red-600">*</span>
              </label>

              <div className="relative">
                <MapPin
                  size={18}
                  className="absolute left-3 top-3.5 text-gray-400"
                />

                <input
                  id="booking-location"
                  type="text"
                  minLength={3}
                  maxLength={300}
                  required
                  value={collectionLocation}
                  onChange={(event) =>
                    setCollectionLocation(event.target.value)
                  }
                  disabled={submitting}
                  placeholder="Enter the preferred pickup location"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
                />
              </div>

              <p className="mt-1.5 text-xs leading-5 text-gray-500">
                Enter where you want to collect the produce. This location
                will be sent with your request for the seller to review.
              </p>

              {collectionLocation.length > 0 && !isValidLocation && (
                <p className="mt-1 text-xs text-red-600">
                  Enter a location between 3 and 300 characters.
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="booking-notes"
                  className="text-sm font-semibold text-gray-800"
                >
                  Additional notes
                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <span
                  className={`text-xs ${
                    notes.length > 1000
                      ? 'text-red-600'
                      : 'text-gray-400'
                  }`}
                >
                  {notes.length}/1000
                </span>
              </div>

              <textarea
                id="booking-notes"
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={submitting}
                placeholder="Share any collection preferences or details for the producer."
                className="w-full resize-y rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Estimated amount
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Based on the currently listed price
                  </p>
                </div>

                <p className="text-xl font-extrabold text-gray-900">
                  {isValidQuantity && Number.isFinite(estimatedTotal)
                    ? formatNaira(estimatedTotal)
                    : '—'}
                </p>
              </div>

              <p className="mt-3 border-t border-gray-200 pt-3 text-xs leading-5 text-gray-500">
                This is an estimate, not a confirmed order total. The
                seller must review your request before it is accepted.
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <p className="leading-5">
                Submitting this request does not guarantee availability.
                The booking remains pending until the producer or an
                authorized aggregator reviews it. Payment is arranged
                directly between the buyer and seller.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting request...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Submit Booking Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PreHarvestBookingModal;
