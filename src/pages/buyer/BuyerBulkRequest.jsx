
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Plus,
  Send,
  ShoppingBasket,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const MAX_ITEMS = 20;

const emptyItem = () => ({
  crop_name: '',
  quantity: '',
  unit: 'tonnes',
  target_price_per_unit: '',
  notes: '',
});

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-100';

const labelClass = 'mb-2 block text-sm font-semibold text-gray-700';

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function BuyerBulkRequest() {
  const { user } = useAuth();

  const [aggregators, setAggregators] = useState([]);
  const [aggregatorId, setAggregatorId] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [pickupLocation, setPickupLocation] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [notes, setNotes] = useState('');

  const [loadingAggregators, setLoadingAggregators] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requestReference, setRequestReference] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAggregators() {
      setLoadingAggregators(true);
      setError('');

      try {
        const { data, error: rpcError } = await supabase.rpc(
          'list_approved_aggregators'
        );

        if (rpcError) throw rpcError;

        if (active) {
          setAggregators(data || []);
        }
      } catch (loadError) {
        console.error('Load approved aggregators error:', loadError);

        if (active) {
          setError(
            'We could not load approved aggregators. Please refresh the page or contact support.'
          );
        }
      } finally {
        if (active) setLoadingAggregators(false);
      }
    }

    loadAggregators();

    return () => {
      active = false;
    };
  }, []);

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addItem() {
    setError('');
    setSuccess('');

    setItems((current) => {
      if (current.length >= MAX_ITEMS) return current;
      return [...current, emptyItem()];
    });
  }

  function removeItem(index) {
    setError('');
    setSuccess('');

    setItems((current) =>
      current.length <= 1
        ? current
        : current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function resetForm() {
    setAggregatorId('');
    setItems([emptyItem()]);
    setPickupLocation('');
    setNeededBy('');
    setNotes('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setRequestReference('');

    if (!user?.id) {
      setError('Please sign in to submit a bulk request.');
      return;
    }

    if (loadingAggregators) {
      setError('Please wait while we load the approved aggregators.');
      return;
    }

    if (!aggregatorId) {
      setError('Please select an approved aggregator.');
      return;
    }

    if (!aggregators.some((aggregator) => aggregator.id === aggregatorId)) {
      setError('The selected aggregator is no longer available. Refresh and select another.');
      return;
    }

    if (!pickupLocation.trim()) {
      setError('Enter your preferred pickup location.');
      return;
    }

    if (items.length < 1 || items.length > MAX_ITEMS) {
      setError(`Your request must contain between 1 and ${MAX_ITEMS} items.`);
      return;
    }

    const cleanedItems = items.map((item) => ({
      crop_name: item.crop_name.trim(),
      quantity: Number(item.quantity),
      unit: item.unit.trim(),
      target_price_per_unit:
        item.target_price_per_unit.trim() === ''
          ? null
          : Number(item.target_price_per_unit),
      notes: item.notes.trim() || null,
    }));

    const invalidItemIndex = cleanedItems.findIndex((item) => {
      return (
        !item.crop_name ||
        item.crop_name.length > 120 ||
        !item.unit ||
        item.unit.length > 30 ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0 ||
        (item.target_price_per_unit !== null &&
          (!Number.isFinite(item.target_price_per_unit) ||
            item.target_price_per_unit < 0)) ||
        (item.notes && item.notes.length > 1000)
      );
    });

    if (invalidItemIndex !== -1) {
      setError(
        `Please check Item ${invalidItemIndex + 1}. Enter a valid crop name, positive quantity, unit, and optional non-negative target price.`
      );
      return;
    }

    if (neededBy && neededBy < getLocalDateString()) {
      setError('The required-by date cannot be in the past.');
      return;
    }

    if (pickupLocation.trim().length > 250) {
      setError('The pickup location must not exceed 250 characters.');
      return;
    }

    if (notes.trim().length > 2000) {
      setError('Additional notes must not exceed 2,000 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error: submitError } = await supabase.rpc(
        'submit_buyer_bulk_request',
        {
          p_aggregator_id: aggregatorId,
          p_pickup_location: pickupLocation.trim(),
          p_needed_by: neededBy || null,
          p_notes: notes.trim() || null,
          p_items: cleanedItems,
        }
      );

      if (submitError) throw submitError;

      // The RPC is expected to return the created request UUID.
      const reference =
        typeof data === 'string'
          ? data
          : data?.id || data?.request_id || '';

      setRequestReference(reference);
      setSuccess('Your bulk request was submitted successfully.');
      resetForm();
    } catch (submitError) {
      console.error('Submit buyer bulk request error:', submitError);
      setError(
        submitError.message ||
          'Your request could not be submitted. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/buyer/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-700"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <section className="mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-700 p-6 text-white sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <ShoppingBasket size={14} />
                Bulk procurement
              </p>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Request produce in bulk
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
                Tell an approved AgroLink aggregator what you need. They can
                review your quantities, coordinate with farmers, and respond
                to your request.
              </p>
            </div>

            <ClipboardList className="hidden h-16 w-16 shrink-0 text-emerald-100 sm:block" />
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="break-words">{error}</p>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 shrink-0" size={19} />

            <div className="min-w-0">
              <p className="font-semibold">Request submitted</p>
              <p className="mt-1">{success}</p>

              {requestReference && (
                <p className="mt-2 break-all text-xs">
                  Reference: <strong>{requestReference}</strong>
                </p>
              )}

              <Link
                to="/buyer/bulk-requests"
                className="mt-3 inline-flex items-center gap-2 font-semibold underline"
              >
                Track your requests <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                1. Choose an aggregator
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Only approved aggregator accounts are listed.
              </p>
            </div>

            <label className={labelClass} htmlFor="aggregator">
              Aggregator <span className="text-red-500">*</span>
            </label>

            <select
              id="aggregator"
              value={aggregatorId}
              onChange={(event) => setAggregatorId(event.target.value)}
              className={inputClass}
              required
              disabled={loadingAggregators || submitting}
            >
              <option value="">
                {loadingAggregators
                  ? 'Loading approved aggregators...'
                  : 'Select an aggregator'}
              </option>

              {aggregators.map((aggregator) => (
                <option key={aggregator.id} value={aggregator.id}>
                  {aggregator.business_name ||
                    aggregator.full_name ||
                    'AgroLink Aggregator'}
                  {aggregator.lga_location
                    ? ` — ${aggregator.lga_location}`
                    : ''}
                </option>
              ))}
            </select>

            {!loadingAggregators && aggregators.length === 0 && (
              <p className="mt-3 text-sm text-amber-700">
                No approved aggregators are currently available. Please check
                again later.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  2. Produce requirements
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add every crop you want to request.
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                disabled={submitting || items.length >= MAX_ITEMS}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={17} />
                Add another item
              </button>
            </div>

            {items.length >= MAX_ITEMS && (
              <p className="mb-4 text-sm text-amber-700">
                You have reached the limit of {MAX_ITEMS} items per request.
              </p>
            )}

            <div className="space-y-5">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">
                      Item {index + 1}
                    </h3>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={submitting}
                        aria-label={`Remove item ${index + 1}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor={`crop-${index}`}>
                        Crop or produce <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`crop-${index}`}
                        className={inputClass}
                        value={item.crop_name}
                        maxLength={120}
                        onChange={(event) =>
                          updateItem(index, 'crop_name', event.target.value)
                        }
                        placeholder="e.g. Maize"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`quantity-${index}`}
                      >
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        id={`quantity-${index}`}
                        type="number"
                        min="0.001"
                        step="any"
                        className={inputClass}
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, 'quantity', event.target.value)
                        }
                        placeholder="e.g. 10"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className={labelClass} htmlFor={`unit-${index}`}>
                        Unit
                      </label>
                      <select
                        id={`unit-${index}`}
                        className={inputClass}
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(index, 'unit', event.target.value)
                        }
                        disabled={submitting}
                      >
                        <option value="tonnes">Tonnes</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="bags">Bags</option>
                        <option value="crates">Crates</option>
                        <option value="sacks">Sacks</option>
                        <option value="pieces">Pieces</option>
                      </select>
                    </div>

                    <div>
                      <label
                        className={labelClass}
                        htmlFor={`price-${index}`}
                      >
                        Target price per unit (₦)
                      </label>
                      <input
                        id={`price-${index}`}
                        type="number"
                        min="0"
                        step="any"
                        className={inputClass}
                        value={item.target_price_per_unit}
                        onChange={(event) =>
                          updateItem(
                            index,
                            'target_price_per_unit',
                            event.target.value
                          )
                        }
                        placeholder="Optional"
                        disabled={submitting}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        className={labelClass}
                        htmlFor={`item-notes-${index}`}
                      >
                        Item-specific requirements
                      </label>
                      <textarea
                        id={`item-notes-${index}`}
                        rows={2}
                        maxLength={1000}
                        className={inputClass}
                        value={item.notes}
                        onChange={(event) =>
                          updateItem(index, 'notes', event.target.value)
                        }
                        placeholder="e.g. Dry, clean maize with minimal impurities"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              3. Pickup arrangements
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="pickup">
                  Preferred pickup location{' '}
                  <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <MapPin
                    size={18}
                    className="absolute left-3 top-3.5 text-gray-400"
                  />
                  <input
                    id="pickup"
                    className={`${inputClass} pl-10`}
                    value={pickupLocation}
                    onChange={(event) => setPickupLocation(event.target.value)}
                    maxLength={250}
                    placeholder="Enter town, market, or pickup point"
                    required
                    disabled={submitting}
                  />
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  AgroLink currently supports pickup arrangements. Delivery is
                  not automatically included.
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="needed-by">
                  Required by date
                </label>
                <input
                  id="needed-by"
                  type="date"
                  min={getLocalDateString()}
                  className={inputClass}
                  value={neededBy}
                  onChange={(event) => setNeededBy(event.target.value)}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="request-notes">
                  Additional notes
                </label>
                <textarea
                  id="request-notes"
                  rows={3}
                  maxLength={2000}
                  className={inputClass}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Any other requirements..."
                  disabled={submitting}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/buyer/bulk-requests"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              View my requests
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingAggregators ||
                aggregators.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="animate-spin" size={18} />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Submit bulk request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
