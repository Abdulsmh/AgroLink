
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Sprout,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import { supabase } from '../../config/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const BUCKET = 'product-images';
const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EMPTY_FORM = {
  farmerId: '',
  cropName: '',
  quantity: '',
  unit: 'kg',
  pricePerUnit: '',
  location: '',
  productType: 'post_harvest',
  description: '',
  farmerAuthorized: false,
};

const formatCurrency = (amount) => {
  const value = Number(amount);

  if (!Number.isFinite(value)) return 'Price not set';

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(value);
};

const formatQuantity = (quantity, unit) => {
  const value = Number(quantity);

  const formatted = Number.isFinite(value)
    ? new Intl.NumberFormat('en-NG', {
        maximumFractionDigits: 2,
      }).format(value)
    : quantity ?? '—';

  return `${formatted}${unit ? ` ${unit}` : ''}`;
};

const productTypeLabel = (type) => {
  if (type === 'pre_harvest') return 'Pre-harvest';
  if (type === 'post_harvest') return 'Post-harvest';

  return type?.replaceAll('_', ' ') || 'Produce';
};

const parseImagePaths = (imagePath) => {
  if (!imagePath) return [];

  let value = imagePath;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      value = [value];
    }
  }

  if (!Array.isArray(value)) value = [value];

  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();

      if (item && typeof item === 'object') {
        return (
          item.url ||
          item.publicUrl ||
          item.path ||
          item.image_path ||
          ''
        ).trim();
      }

      return '';
    })
    .filter(Boolean);
};

const resolveProductImages = (imagePath) => {
  return parseImagePaths(imagePath).map((originalPath) => {
    if (/^https?:\/\//i.test(originalPath)) {
      return originalPath;
    }

    let path = originalPath.replace(/^\/+/, '');

    const markers = [
      `/storage/v1/object/public/${BUCKET}/`,
      `${BUCKET}/`,
    ];

    for (const marker of markers) {
      const index = path.indexOf(marker);

      if (index !== -1) {
        path = path.slice(index + marker.length);
        break;
      }
    }

    if (!path) return null;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return data?.publicUrl || null;
  }).filter(Boolean);
};

const cleanFileName = (name) =>
  name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-100);

function ProductImage({ images, cropName }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const src = images?.[index];

  return (
    <div className="flex h-48 items-center justify-center overflow-hidden bg-emerald-50">
      {src ? (
        <img
          src={src}
          alt={cropName || 'Farm produce'}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setIndex((current) => current + 1)}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-emerald-700">
          <Sprout size={42} strokeWidth={1.5} />
          <span className="text-xs">Image unavailable</span>
        </div>
      )}
    </div>
  );
}

function ListingForm({
  farmers,
  onClose,
  onCreated,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';

    if (!selected.length) return;

    setError('');

    const validFiles = [];

    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        setError('Please select image files only.');
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(`${file.name} exceeds the 5 MB image limit.`);
        continue;
      }

      validFiles.push(file);
    }

    setFiles((current) =>
      [...current, ...validFiles].slice(0, MAX_IMAGES)
    );
  };

  const removeFile = (index) => {
    setFiles((current) => current.filter((_, i) => i !== index));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setUploadProgress('');

    if (!form.farmerId) {
      setError('Select a linked farmer first.');
      return;
    }

    if (!form.cropName.trim()) {
      setError('Enter the crop name.');
      return;
    }

    if (!Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (
      form.pricePerUnit === '' ||
      !Number.isFinite(Number(form.pricePerUnit)) ||
      Number(form.pricePerUnit) < 0
    ) {
      setError('Enter a valid price per unit.');
      return;
    }

    if (!form.farmerAuthorized) {
      setError('Confirm that the farmer has authorized this listing.');
      return;
    }

    setSubmitting(true);

    let uploadedPaths = [];

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error('Your session has expired. Please sign in again.');

      // The existing Storage policy requires the first folder
      // to be the currently authenticated user's ID.
      const publicImageUrls = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const objectPath =
          `${user.id}/assisted-listings/` +
          `${crypto.randomUUID()}-${cleanFileName(file.name)}`;

        setUploadProgress(
          `Uploading image ${index + 1} of ${files.length}...`
        );

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(objectPath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        uploadedPaths.push(objectPath);

        const { data: publicData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(objectPath);

        if (!publicData?.publicUrl) {
          throw new Error('Could not generate a URL for an uploaded image.');
        }

        publicImageUrls.push(publicData.publicUrl);
      }

      setUploadProgress('Saving the produce listing...');

      const { data: productId, error: rpcError } = await supabase.rpc(
        'create_aggregator_farmer_product',
        {
          p_farmer_id: form.farmerId,
          p_crop_name: form.cropName.trim(),
          p_quantity: Number(form.quantity),
          p_unit: form.unit,
          p_price_per_unit: Number(form.pricePerUnit),
          p_location: form.location.trim() || null,
          p_product_type: form.productType,
          p_description: form.description.trim() || null,
          p_image_path: publicImageUrls.length
            ? JSON.stringify(publicImageUrls)
            : null,
          p_farmer_authorized: form.farmerAuthorized,
        }
      );

      if (rpcError) throw rpcError;

      if (!productId) {
        throw new Error(
          'The database did not return a product ID. Refresh the listings to verify the result.'
        );
      }

      setFiles([]);
      setForm(EMPTY_FORM);
      onCreated();
    } catch (err) {
      console.error('Assisted listing submission failed:', err);

      // Remove files uploaded during this failed attempt.
      // The existing Storage policy permits deletion from the
      // authenticated aggregator's own folder.
      if (uploadedPaths.length) {
        const { error: cleanupError } = await supabase.storage
          .from(BUCKET)
          .remove(uploadedPaths);

        if (cleanupError) {
          console.error('Could not clean up uploaded images:', cleanupError);
        }
      }

      setError(
        err?.message ||
          'Could not create the listing. Please check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Add produce for a farmer
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            The selected farmer remains the owner of the listing.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Close form"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      {farmers.length === 0 ? (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          No approved linked farmers were found. Link a farmer and ensure the
          relationship is approved before creating a listing.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Farmer <span className="text-red-600">*</span>
            </label>

            <select
              value={form.farmerId}
              onChange={(event) => update('farmerId', event.target.value)}
              required
              disabled={submitting}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Choose an approved linked farmer</option>
              {farmers.map((farmer) => (
                <option key={farmer.farmer_id} value={farmer.farmer_id}>
                  {farmer.full_name || 'Farmer'}
                  {farmer.farm_name ? ` — ${farmer.farm_name}` : ''}
                  {farmer.lga_location ? ` (${farmer.lga_location})` : ''}
                </option>
              ))}
            </select>

            <p className="mt-1 text-xs text-gray-500">
              Only farmers with approved aggregator relationships can be listed.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Crop name *
              </label>
              <input
                value={form.cropName}
                onChange={(event) => update('cropName', event.target.value)}
                placeholder="e.g. Maize"
                required
                maxLength={100}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Produce type *
              </label>
              <select
                value={form.productType}
                onChange={(event) => update('productType', event.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="post_harvest">Post-harvest</option>
                <option value="pre_harvest">Pre-harvest</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Quantity *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={form.quantity}
                onChange={(event) => update('quantity', event.target.value)}
                placeholder="e.g. 500"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Unit *
              </label>
              <select
                value={form.unit}
                onChange={(event) => update('unit', event.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="kg">Kilogram (kg)</option>
                <option value="tonne">Tonne</option>
                <option value="bag">Bag</option>
                <option value="crate">Crate</option>
                <option value="piece">Piece</option>
                <option value="litre">Litre</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Price per unit (NGN) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.pricePerUnit}
                onChange={(event) =>
                  update('pricePerUnit', event.target.value)
                }
                placeholder="e.g. 850"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Collection location
              </label>
              <input
                value={form.location}
                onChange={(event) => update('location', event.target.value)}
                placeholder="Village, market or collection point"
                maxLength={200}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Add quality details, expected harvest date, or other useful information."
              maxLength={2000}
              disabled={submitting}
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Produce photos (optional, up to {MAX_IMAGES})
            </label>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50">
              <ImagePlus size={28} className="text-emerald-700" />
              <span className="mt-2 text-sm font-semibold text-gray-800">
                Choose produce photos
              </span>
              <span className="mt-1 text-xs text-gray-500">
                Images only, maximum 5 MB per image
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={submitting || files.length >= MAX_IMAGES}
                onChange={handleFiles}
                className="sr-only"
              />
            </label>

            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-gray-700">
                      {file.name}
                      <span className="ml-2 text-xs text-gray-400">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={submitting}
                      aria-label={`Remove ${file.name}`}
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.farmerAuthorized}
                onChange={(event) =>
                  update('farmerAuthorized', event.target.checked)
                }
                disabled={submitting}
                className="mt-1 h-4 w-4 accent-emerald-700"
              />
              <span className="text-sm leading-6 text-amber-950">
                <strong>Farmer authorization *</strong>
                <br />
                I confirm that the selected farmer has authorized me to submit
                this produce listing and that the crop, quantity, price, and
                other details are accurate.
              </span>
            </label>
          </div>

          {uploadProgress && (
            <div className="flex items-center gap-2 text-sm text-emerald-800">
              <LoaderCircle size={17} className="animate-spin" />
              {uploadProgress}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || farmers.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Saving listing...
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Create produce listing
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function AggregatorListings() {
  const { userProfile } = useAuth();

  const [products, setProducts] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadListings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      if (userProfile?.role !== 'aggregator') {
        setProducts([]);
        setFarmers([]);
        setError('This page is available to aggregator accounts only.');
        return;
      }

      if (userProfile?.verification_status !== 'approved') {
        setProducts([]);
        setFarmers([]);
        setError(
          'Your aggregator account must be approved before accessing produce listings.'
        );
        return;
      }

      const [productsResult, farmersResult] = await Promise.all([
        supabase.rpc('list_aggregator_farmer_products'),
        supabase.rpc('list_aggregator_farmer_relationships'),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (farmersResult.error) throw farmersResult.error;

      const resolvedProducts = await Promise.all(
        (productsResult.data || []).map(async (product) => ({
          ...product,
          id: product.product_id,
          images: resolveProductImages(product.image_path),
        }))
      );

      setProducts(resolvedProducts);

      // Never allow the form to offer pending or rejected relationships.
      setFarmers(
        (farmersResult.data || []).filter(
          (farmer) => farmer.status === 'approved'
        )
      );
    } catch (err) {
      console.error('Error loading aggregator listings:', err);
      setError(
        err?.message ||
          'Could not load produce listings. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile?.role, userProfile?.verification_status]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesType =
        typeFilter === 'all' || product.product_type === typeFilter;

      const text = [
        product.crop_name,
        product.farmer_name,
        product.farm_name,
        product.farm_location,
        product.lga_location,
        product.location,
        product.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesType && (!term || text.includes(term));
    });
  }, [products, searchTerm, typeFilter]);

  const preHarvestCount = products.filter(
    (product) => product.product_type === 'pre_harvest'
  ).length;

  const postHarvestCount = products.filter(
    (product) => product.product_type === 'post_harvest'
  ).length;

  const handleCreated = async () => {
    setShowForm(false);
    setNotice('Produce listing created successfully.');
    await loadListings(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-emerald-700">
          <RefreshCw size={30} className="animate-spin" />
          <p className="text-sm font-medium">Loading farmers’ produce...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Farmers’ Produce
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View linked farmers’ produce and create listings on their behalf.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setNotice('');
              setShowForm((current) => !current);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}
            {showForm ? 'Close form' : 'Add Produce for Farmer'}
          </button>

          <button
            type="button"
            onClick={() => loadListings(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
            className="ml-auto rounded p-1 hover:bg-emerald-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {showForm && (
        <ListingForm
          farmers={farmers}
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Available listings</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {products.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pre-harvest</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {preHarvestCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Post-harvest</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {postHarvestCount}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search crop, farmer, farm or location..."
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="relative sm:w-52">
          <Filter
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All produce</option>
            <option value="pre_harvest">Pre-harvest</option>
            <option value="post_harvest">Post-harvest</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load produce</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => loadListings()}
              className="mt-2 font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!error && filteredProducts.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Produce listings
            </h2>
            <p className="text-sm text-gray-500">
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'listing' : 'listings'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative">
                  <ProductImage
                    images={product.images}
                    cropName={product.crop_name}
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
                    {productTypeLabel(product.product_type)}
                  </span>
                </div>

                <div className="space-y-4 p-4">
                  <div>
                    <h3 className="text-lg font-bold capitalize text-gray-900">
                      {product.crop_name || 'Unnamed produce'}
                    </h3>
                    <p className="mt-1 text-xl font-bold text-emerald-700">
                      {formatCurrency(product.price_per_unit)}
                      <span className="ml-1 text-xs font-normal text-gray-500">
                        / {product.unit || 'unit'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {formatQuantity(product.quantity, product.unit)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Produce type</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {productTypeLabel(product.product_type)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <UserRound
                        size={17}
                        className="mt-0.5 shrink-0 text-emerald-700"
                      />
                      <div>
                        <p className="text-xs text-gray-500">Farmer</p>
                        <p className="font-medium text-gray-800">
                          {product.farmer_name || 'Farmer'}
                        </p>
                        {product.farm_name && (
                          <p className="text-xs text-gray-500">
                            {product.farm_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {(product.farm_location ||
                      product.location ||
                      product.lga_location) && (
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin
                          size={17}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />
                        <span>
                          {[
                            product.farm_location,
                            product.location,
                            product.lga_location,
                          ]
                            .filter(
                              (value, index, values) =>
                                value && values.indexOf(value) === index
                            )
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {product.description && (
                    <p className="border-t border-gray-100 pt-3 text-sm leading-6 text-gray-600">
                      {product.description}
                    </p>
                  )}

                  <div className="border-t border-gray-100 pt-3 text-xs text-gray-400">
                    Listed{' '}
                    {product.created_at
                      ? new Date(product.created_at).toLocaleDateString(
                          'en-NG',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }
                        )
                      : 'date unavailable'}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {!error && filteredProducts.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            {searchTerm || typeFilter !== 'all' ? (
              <Search size={26} />
            ) : (
              <Package size={26} />
            )}
          </div>

          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {searchTerm || typeFilter !== 'all'
              ? 'No matching produce'
              : 'No produce listings yet'}
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
            {searchTerm || typeFilter !== 'all'
              ? 'Try another search term or change the produce filter.'
              : 'Produce from your approved linked farmers will appear here when listings are available.'}
          </p>

          {(searchTerm || typeFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
              }}
              className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
