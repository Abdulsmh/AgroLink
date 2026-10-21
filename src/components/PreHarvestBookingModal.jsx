import React, { useState } from 'react';
import { CalendarDays, Loader2, MapPin, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';

const todayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString('en-NG')}`;

const PreHarvestBookingModal = ({
  product,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState('1');
  const [collectionDate, setCollectionDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  const unit = product.unit || 'unit';
  const requestedQuantity = Number(quantity);
  const availableQuantity = Number(product.quantity);
  const pricePerUnit = Number(product.price_per_unit);

  const hasValidStock =
    Number.isFinite(availableQuantity) && availableQuantity > 0;

  const hasValidPrice =
    Number.isFinite(pricePerUnit) && pricePerUnit >= 0;

  const hasValidQuantity =
    Number.isFinite(requestedQuantity) && requestedQuantity > 0;

  const estimatedTotal =
    hasValidQuantity && hasValidPrice
      ? requestedQuantity * pricePerUnit
      : 0;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    if (!currentUser?.id) {
      toast.error('Please sign in as a buyer to request a booking.');
      return;
    }

    if (!product?.id) {
      toast.error('The selected product could not be identified.');
      return;
    }

    if (product.product_type !== 'pre_harvest') {
      toast.error('Only pre-harvest listings can be booked here.');
      return;
    }

    if (!hasValidStock) {
      toast.error('This crop is currently unavailable for booking.');
      return;
    }

    if (!hasValidQuantity) {
      toast.error('Enter a valid quantity greater than zero.');
      return;
    }

    if (requestedQuantity > availableQuantity) {
      toast.error(
        `The requested quantity exceeds the available ${availableQuantity} ${unit}.`
      );
      return;
    }

    if (!hasValidPrice) {
      toast.error('This listing has an invalid price. Please try again later.');
      return;
    }

    if (collectionDate && collectionDate < todayString()) {
      toast.error('Choose today or a future collection date.');
      return;
    }

    if (notes.trim().length > 1000) {
      toast.error('Your notes must not exceed 1,000 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (
        authError ||
        !authData?.user ||
        authData.user.id !== currentUser.id
      ) {
        throw new Error('Your session has expired. Please sign in again.');
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile || profile.role !== 'buyer') {
        throw new Error(
          'Only buyer accounts can request pre-harvest bookings.'
        );
      }

      // Recheck the listing immediately before submitting the request.
      // Database constraints and RLS should also enforce booking rules.
      const {
        data: latestProduct,
        error: productError,
      } = await supabase
        .from('products')
        .select('id, quantity, product_type')
        .eq('id', product.id)
        .maybeSingle();

      if (productError) throw productError;

      if (
        !latestProduct ||
        latestProduct.product_type !== 'pre_harvest'
      ) {
        throw new Error(
          'This pre-harvest listing is no longer available.'
        );
      }

      const latestAvailableQuantity = Number(latestProduct.quantity);

      if (
        !Number.isFinite(latestAvailableQuantity) ||
        latestAvailableQuantity <= 0
      ) {
        throw new Error('This crop is currently unavailable for booking.');
      }

      if (requestedQuantity > latestAvailableQuantity) {
        throw new Error(
          `Only ${latestAvailableQuantity} ${unit} is currently listed. Please adjust your requested quantity.`
        );
      }

      const { error: bookingError } = await supabase
        .from('preharvest_bookings')
        .insert({
          buyer_id: currentUser.id,
          product_id: product.id,
          quantity: requestedQuantity,
          requested_collection_date: collectionDate || null,
          buyer_notes: notes.trim() || null,
          status: 'pending',
        });

      if (bookingError) throw bookingError;

      toast.success('Your booking request has been submitted.');

      onClose?.();
      await onSuccess?.();
    } catch (error) {
      console.error('Pre-harvest booking submission failed:', error);

      if (error.code === '42501') {
        toast.error(
          'You are not permitted to submit this booking. Please check your account and try again.'
        );
      } else {
        toast.error(
          error.message || 'Unable to submit your booking request.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !submitting
        ) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        aria-describedby="booking-modal-description"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2
              id="booking-modal-title"
              className="text-xl font-extrabold text-slate-900"
            >
              Request Pre-Harvest Booking
            </h2>

            <p
              id="booking-modal-description"
              className="mt-1 text-sm text-slate-500"
            >
              Ask the producer to reserve this crop for you.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close booking form"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold capitalize text-slate-900">
                  {product.crop_name}
                </h3>

                <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {product.location || 'Location not specified'}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                Pre-harvest
              </span>
            </div>

            <p className="mt-3 text-sm font-semibold text-emerald-800">
              {formatNaira(pricePerUnit)} per {unit}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Your request is not confirmed until the producer reviews it.
              The final quantity, price, and collection arrangements must
              be agreed upon before fulfilment.
            </p>
          </div>

          <div>
            <label
              htmlFor="preharvest-quantity"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Requested quantity ({unit}) *
            </label>

            <input
              id="preharvest-quantity"
              type="number"
              min="0.01"
              step="any"
              max={hasValidStock ? availableQuantity : undefined}
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              disabled={submitting || !hasValidStock}
              aria-describedby="preharvest-quantity-help"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-100"
            />

            <p
              id="preharvest-quantity-help"
              className="mt-1 text-xs text-slate-500"
            >
              {hasValidStock
                ? `Listed quantity: ${availableQuantity.toLocaleString('en-NG')} ${unit}`
                : 'This listing currently has no available quantity.'}
            </p>
          </div>

          <div>
            <label
              htmlFor="preharvest-date"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Preferred collection date
            </label>

            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                id="preharvest-date"
                type="date"
                min={todayString()}
                value={collectionDate}
                onChange={(event) =>
                  setCollectionDate(event.target.value)
                }
                disabled={submitting}
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-100"
              />
            </div>

            <p className="mt-1 text-xs text-slate-500">
              The producer must confirm your preferred date.
            </p>
          </div>

          <div>
            <label
              htmlFor="preharvest-notes"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Additional notes (optional)
            </label>

            <textarea
              id="preharvest-notes"
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={submitting}
              placeholder="Add any requirements for the producer..."
              className="w-full resize-y rounded-xl border border-slate-200 p-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 disabled:bg-slate-100"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {notes.length}/1000
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-600">
                Estimated amount
              </span>

              <span className="text-lg font-extrabold text-emerald-700">
                {formatNaira(estimatedTotal)}
              </span>
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              This is an estimate based on the listed price, not a payment
              request.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                !hasValidStock ||
                !hasValidQuantity ||
                requestedQuantity > availableQuantity ||
                !hasValidPrice
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Booking Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PreHarvestBookingModal;
