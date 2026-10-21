import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sprout,
  X,
  ShieldCheck,
  UserRound,
  Star,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';

const CART_KEY = 'agrolink_cart';

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString('en-NG')}`;

const formatNumber = (amount) =>
  Number(amount || 0).toLocaleString('en-NG');

const formatDate = (date) => {
  if (!date) return 'Recently';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return 'Recently';

  return parsedDate.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getProductImages = (imagePath) => {
  if (!imagePath) return [];

  if (Array.isArray(imagePath)) {
    return imagePath.filter(
      (image) => typeof image === 'string' && image.trim()
    );
  }

  if (typeof imagePath !== 'string') return [];

  try {
    const parsed = JSON.parse(imagePath);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (image) => typeof image === 'string' && image.trim()
      );
    }

    if (typeof parsed === 'string' && parsed.trim()) {
      return [parsed];
    }

    return [];
  } catch {
    return imagePath.trim() ? [imagePath] : [];
  }
};

const getStorageImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return null;

  const path = imagePath.trim();

  if (/^https?:\/\//i.test(path)) return path;

  if (path.startsWith('data:image/')) return path;

  const cleanedPath = path
    .replace(/^\/+/, '')
    .replace(/^product-images\//, '');

  if (!cleanedPath) return null;

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(cleanedPath);

  return data?.publicUrl || null;
};

const getStockStatus = (quantity) => {
  const stock = Number(quantity || 0);

  if (stock <= 0) {
    return {
      label: 'Out of stock',
      className: 'bg-red-50 text-red-700 border-red-200',
    };
  }

  if (stock <= 10) {
    return {
      label: 'Low stock',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  return {
    label: 'In stock',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
};

const getProducerName = (producer) =>
  producer?.business_name ||
  producer?.farm_name ||
  producer?.full_name ||
  'AgroLink Producer';

const StarRating = ({
  value = 0,
  size = 'h-4 w-4',
  showValue = false,
}) => {
  const rating = Math.max(0, Math.min(5, Number(value || 0)));

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-flex items-center gap-0.5"
        aria-label={`${rating.toFixed(1)} out of 5 stars`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-100 text-slate-300'
            }`}
          />
        ))}
      </span>

      {showValue && (
        <span className="text-xs font-bold text-slate-700">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
};

const RatingSummary = ({ rating, count, label }) => (
  <div className="flex min-w-0 items-center gap-2">
    <StarRating value={rating} size="h-3.5 w-3.5" showValue />

    <span className="truncate text-xs text-slate-500">
      {Number(count || 0) > 0
        ? `${formatNumber(count)} ${label}`
        : `No ${label} yet`}
    </span>
  </div>
);

const CompactRating = ({ rating, count, label }) => {
  const hasRatings = Number(count || 0) > 0;

  return (
    <span
      className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-4"
      title={
        hasRatings
          ? `${Number(rating || 0).toFixed(1)} out of 5 ${label} rating, ${formatNumber(count)} ${label}`
          : `No ${label} yet`
      }
    >
      <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />

      <span className="font-bold text-slate-700">
        {hasRatings ? Number(rating || 0).toFixed(1) : '—'}
      </span>

      <span className="truncate text-slate-500">
        {label}
        {hasRatings ? ` (${formatNumber(count)})` : ''}
      </span>
    </span>
  );
};

const ProductCard = ({
  product,
  onOpen,
  onAddToCart,
  onQuickBuy,
}) => {
  const images = getProductImages(product.image_path);
  const imageUrl = getStorageImageUrl(images[0]);
  const stockStatus = getStockStatus(product.quantity);
  const producerName = getProducerName(product.producer);
  const isOutOfStock = Number(product.quantity || 0) <= 0;
  const productRating = product.productRating || {};
  const sellerRating = product.sellerRating || {};

  return (
    <article
      onClick={() => onOpen(product)}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault();
          onOpen(product);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View ${product.crop_name} details`}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <div className="relative h-36 overflow-hidden bg-slate-100 sm:h-44">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.crop_name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImageIcon className="h-9 w-9" />
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold capitalize text-slate-700 shadow-sm">
            Post-harvest
          </span>

          {product.producer?.verification_status === 'approved' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>

        <span
          className={`absolute bottom-2 right-2 rounded-full border px-2 py-1 text-[10px] font-bold ${stockStatus.className}`}
        >
          {stockStatus.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold capitalize text-slate-900 sm:text-base">
            {product.crop_name}
          </h3>

          <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            {producerName}
          </p>

          {product.location && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {product.location}
            </p>
          )}

          <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-y border-slate-100 py-2">
            <CompactRating
              rating={productRating.avg}
              count={productRating.count}
              label="Product"
            />

            <span className="hidden h-3 w-px bg-slate-200 sm:block" />

            <CompactRating
              rating={sellerRating.avg}
              count={sellerRating.count}
              label="Seller"
            />
          </div>

          {product.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
              {product.description}
            </p>
          )}
        </div>

        <div className="mt-auto space-y-3 pt-4">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-extrabold text-emerald-700 sm:text-lg">
                {formatNaira(product.price_per_unit)}
              </p>

              <p className="text-[11px] text-slate-500">
                per {product.unit || 'unit'}
              </p>
            </div>

            <p className="shrink-0 text-right text-[11px] font-semibold text-slate-500">
              {formatNumber(product.quantity)} {product.unit || 'units'}
              <span className="block font-normal">available</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={(event) => {
                event.stopPropagation();
                onAddToCart(product);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 px-2 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
              Add to cart
            </button>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={(event) => {
                event.stopPropagation();
                onQuickBuy(product);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-2 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Buy now
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

const ProductModal = ({
  product,
  imageIndex,
  quantity,
  currentUser,
  currentUserRole,
  reviews,
  eligibleOrders,
  reviewStars,
  reviewText,
  submittingReview,
  onReviewStarsChange,
  onReviewTextChange,
  onSubmitReview,
  onClose,
  onPreviousImage,
  onNextImage,
  onSelectImage,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onAddToCart,
  onBuyNow,
}) => {
  const images = getProductImages(product.image_path);
  const imageUrl = getStorageImageUrl(images[imageIndex]);
  const stock = Math.max(0, Number(product.quantity || 0));
  const stockStatus = getStockStatus(stock);
  const producerName = getProducerName(product.producer);
  const total = quantity * Number(product.price_per_unit || 0);
  const productRating = product.productRating || {};
  const sellerRating = product.sellerRating || {};

  const latestReviews = reviews
    .filter((review) => review.product_id === product.id)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

  const reviewableOrders = eligibleOrders.filter(
    (order) =>
      order.product_id === product.id &&
      !reviews.some(
        (review) =>
          review.order_id === order.id &&
          review.buyer_id === currentUser?.id
      )
  );

  const isBuyer = currentUserRole === 'buyer';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-harvest-product-title"
        className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Package className="h-4 w-4 text-emerald-600" />
            Product details
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close product details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 overflow-y-auto lg:grid-cols-2">
          <div className="space-y-3 bg-slate-50 p-4 sm:p-6">
            <div className="relative overflow-hidden rounded-2xl bg-white">
              <div className="flex h-60 items-center justify-center sm:h-80">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.crop_name}
                    className="h-full w-full object-contain"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <ImageIcon className="h-12 w-12" />
                    <span className="text-sm">No image available</span>
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={onPreviousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 shadow-md hover:bg-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={onNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 shadow-md hover:bg-white"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => {
                  const thumbnailUrl = getStorageImageUrl(image);

                  return (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      onClick={() => onSelectImage(index)}
                      aria-label={`View image ${index + 1}`}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${
                        imageIndex === index
                          ? 'border-emerald-500'
                          : 'border-transparent'
                      }`}
                    >
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={`${product.crop_name} ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="mx-auto h-5 w-5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <UserRound className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Farmer / seller</p>
                  <p className="truncate text-sm font-bold text-slate-900">
                    {producerName}
                  </p>
                </div>

                {product.producer?.verification_status === 'approved' && (
                  <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-600" />
                )}
              </div>

              {product.producer?.farm_name && (
                <p className="mt-3 text-xs text-slate-500">
                  Farm: {product.producer.farm_name}
                </p>
              )}

              {product.producer?.lga_location && (
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {product.producer.lga_location}
                </p>
              )}

              <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">
                    Seller reputation
                  </p>

                  <RatingSummary
                    rating={sellerRating.avg}
                    count={sellerRating.count}
                    label="seller ratings"
                  />
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-600">
                    This product
                  </p>

                  <RatingSummary
                    rating={productRating.avg}
                    count={productRating.count}
                    label="product reviews"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  Post-harvest
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${stockStatus.className}`}
                >
                  {stockStatus.label}
                </span>
              </div>

              <h2
                id="post-harvest-product-title"
                className="text-2xl font-extrabold capitalize tracking-tight text-slate-900"
              >
                {product.crop_name}
              </h2>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {product.description?.trim() ||
                  'No detailed product description has been added by the farmer yet.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Price per unit</p>
                <p className="mt-1 text-lg font-extrabold text-emerald-700">
                  {formatNaira(product.price_per_unit)}
                </p>
                <p className="text-xs text-slate-500">
                  per {product.unit || 'unit'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Available quantity</p>
                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  {formatNumber(stock)}
                </p>
                <p className="text-xs text-slate-500">
                  {product.unit || 'units'}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900">
                Product information
              </h3>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Location</span>
                <span className="flex items-center gap-1 text-right font-semibold text-slate-800">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />
                  {product.location || 'Not specified'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Unit</span>
                <span className="font-semibold capitalize text-slate-800">
                  {product.unit || 'Unit'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Listing type</span>
                <span className="font-semibold text-slate-800">
                  Post-harvest
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Quantity
                </h3>

                <span className="text-xs text-slate-500">
                  Maximum: {formatNumber(stock)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-2">
                <button
                  type="button"
                  onClick={onDecreaseQuantity}
                  disabled={quantity <= 1 || stock <= 0}
                  className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="text-center text-base font-extrabold text-slate-900">
                  {quantity} {product.unit || 'unit'}
                </span>

                <button
                  type="button"
                  onClick={onIncreaseQuantity}
                  disabled={quantity >= stock || stock <= 0}
                  className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-emerald-800">
                  Estimated total
                </span>

                <span className="text-xl font-extrabold text-emerald-700">
                  {formatNaira(total)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={stock <= 0}
                onClick={onAddToCart}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to cart
              </button>

              <button
                type="button"
                disabled={stock <= 0}
                onClick={onBuyNow}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Buy now
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Availability and prices are based on the current farmer listing
              and may change before checkout.
            </div>

            <section className="border-t border-slate-200 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                    Product reviews
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Feedback from buyers about this specific product.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-extrabold text-slate-900">
                    {Number(productRating.avg || 0).toFixed(1)}
                  </p>

                  <StarRating
                    value={productRating.avg}
                    size="h-3.5 w-3.5"
                  />

                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatNumber(productRating.count || 0)} reviews
                  </p>
                </div>
              </div>

              {currentUser &&
                isBuyer &&
                reviewableOrders.length > 0 && (
                  <form
                    onSubmit={onSubmitReview}
                    className="mt-4 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"
                  >
                    <div>
                      <label className="text-sm font-bold text-slate-800">
                        Rate this product
                      </label>

                      <div className="mt-2 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => onReviewStarsChange(star)}
                            className="rounded-md p-1 transition hover:scale-110"
                            aria-label={`Rate ${star} out of 5 stars`}
                          >
                            <Star
                              className={`h-7 w-7 ${
                                star <= reviewStars
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}

                        <span className="ml-2 text-xs font-semibold text-slate-600">
                          {reviewStars}/5
                        </span>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="post-harvest-review-text"
                        className="text-sm font-bold text-slate-800"
                      >
                        Your review (optional)
                      </label>

                      <textarea
                        id="post-harvest-review-text"
                        value={reviewText}
                        onChange={(event) =>
                          onReviewTextChange(event.target.value)
                        }
                        maxLength={2000}
                        rows={3}
                        placeholder="Share your experience with this product..."
                        className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                      />

                      <p className="mt-1 text-right text-[11px] text-slate-500">
                        {reviewText.length}/2000
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submittingReview
                        ? 'Submitting review...'
                        : 'Submit review'}
                    </button>

                    <p className="text-[11px] leading-5 text-slate-500">
                      You must have a completed order for this product. One
                      review is allowed per order.
                    </p>
                  </form>
                )}

              {currentUser && !isBuyer && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  Product reviews can only be submitted by buyer accounts.
                </div>
              )}

              {currentUser &&
                isBuyer &&
                reviewableOrders.length === 0 && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                    {latestReviews.some(
                      (review) => review.buyer_id === currentUser.id
                    )
                      ? 'You have already reviewed this product for an eligible completed order.'
                      : 'Complete an order for this product to become eligible to leave a review.'}
                  </div>
                )}

              {!currentUser && (
                <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  Sign in as a buyer and complete an order to leave a product
                  review.
                </p>
              )}

              <div className="mt-4 space-y-3">
                {latestReviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center">
                    <Star className="mx-auto h-7 w-7 text-slate-300" />

                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      No reviews yet
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Be the first eligible buyer to review this product.
                    </p>
                  </div>
                ) : (
                  latestReviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <UserRound className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Verified buyer
                            </p>

                            <p className="text-[11px] text-slate-500">
                              {formatDate(review.created_at)}
                            </p>
                          </div>
                        </div>

                        <StarRating
                          value={review.stars}
                          size="h-3.5 w-3.5"
                        />
                      </div>

                      {review.review_text?.trim() && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {review.review_text}
                        </p>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const PostHarvest = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [productReviews, setProductReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [eligibleOrders, setEligibleOrders] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeModalProduct, setActiveModalProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [modalQuantity, setModalQuantity] = useState(1);

  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const {
        data: productRows,
        error: productsError,
      } = await supabase
        .from('products')
        .select(
          'id, producer_id, crop_name, description, quantity, unit, price_per_unit, location, image_path, product_type, created_at'
        )
        .eq('product_type', 'post_harvest')
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      const rows = productRows || [];
      const productIds = rows.map((product) => product.id);
      const producerIds = [
        ...new Set(
          rows.map((product) => product.producer_id).filter(Boolean)
        ),
      ];

      let producerMap = {};
      let sellerRatingMap = {};
      let reviewRows = [];
      let user = null;
      let fetchedUserRole = null;
      let completedOrders = [];

      if (producerIds.length > 0) {
        const {
          data: producers,
          error: producersError,
        } = await supabase
          .from('profiles')
          .select(
            'id, full_name, business_name, farm_name, lga_location, role, verification_status'
          )
          .in('id', producerIds);

        if (producersError) throw producersError;

        producerMap = (producers || []).reduce((map, producer) => {
          map[producer.id] = producer;
          return map;
        }, {});

        const {
          data: ratingRows,
          error: ratingError,
        } = await supabase
          .from('profile_ratings')
          .select('profile_id, avg_stars, rating_count')
          .in('profile_id', producerIds);

        if (ratingError) {
          console.warn(
            'Seller rating lookup unavailable:',
            ratingError.message
          );
        } else {
          sellerRatingMap = (ratingRows || []).reduce((map, rating) => {
            map[rating.profile_id] = {
              avg: Number(rating.avg_stars || 0),
              count: Number(rating.rating_count || 0),
            };

            return map;
          }, {});
        }
      }

      if (productIds.length > 0) {
        const {
          data: reviews,
          error: reviewsError,
        } = await supabase
          .from('product_reviews')
          .select(
            'id, product_id, buyer_id, order_id, stars, review_text, created_at'
          )
          .in('product_id', productIds)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          console.warn(
            'Product reviews unavailable:',
            reviewsError.message
          );
        } else {
          reviewRows = reviews || [];
        }
      }

      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (!authError) {
        user = authData?.user || null;
      }

      if (user) {
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.warn(
            'Unable to verify current user role:',
            profileError.message
          );
        } else {
          fetchedUserRole = profile?.role || null;
        }
      }

      if (user && fetchedUserRole === 'buyer' && productIds.length > 0) {
        const {
          data: orders,
          error: ordersError,
        } = await supabase
          .from('orders')
          .select('id, product_id, status')
          .eq('buyer_id', user.id)
          .eq('status', 'completed')
          .in('product_id', productIds);

        if (ordersError) {
          console.warn(
            'Completed-order lookup unavailable:',
            ordersError.message
          );
        } else {
          completedOrders = orders || [];
        }
      }

      const reviewSummaryMap = reviewRows.reduce((map, review) => {
        const key = review.product_id;

        if (!map[key]) {
          map[key] = { total: 0, count: 0 };
        }

        map[key].total += Number(review.stars || 0);
        map[key].count += 1;

        return map;
      }, {});

      const preparedProducts = rows.map((product) => {
        const summary = reviewSummaryMap[product.id] || {
          total: 0,
          count: 0,
        };

        return {
          ...product,
          producer: producerMap[product.producer_id] || null,
          sellerRating: sellerRatingMap[product.producer_id] || {
            avg: 0,
            count: 0,
          },
          productRating: {
            avg: summary.count
              ? Math.round((summary.total / summary.count) * 10) / 10
              : 0,
            count: summary.count,
          },
        };
      });

      setProducts(preparedProducts);
      setProductReviews(reviewRows);
      setCurrentUser(user);
      setCurrentUserRole(fetchedUserRole);
      setEligibleOrders(completedOrders);

      setActiveModalProduct((current) => {
        if (!current) return null;

        return (
          preparedProducts.find((item) => item.id === current.id) || null
        );
      });
    } catch (fetchError) {
      console.error('Post-harvest fetch error:', fetchError);

      setError(
        fetchError.message || 'Unable to load products. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    const productsChannel = supabase
      .channel('post-harvest-page-products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          const changedProduct = payload.new || payload.old;

          if (
            !changedProduct?.product_type ||
            changedProduct.product_type === 'post_harvest' ||
            payload.eventType === 'DELETE'
          ) {
            fetchProducts(true);
          }
        }
      )
      .subscribe();

    const reviewsChannel = supabase
      .channel('post-harvest-page-product-reviews')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_reviews',
        },
        () => fetchProducts(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(reviewsChannel);
    };
  }, [fetchProducts]);

  useEffect(() => {
    if (!activeModalProduct) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveModalProduct(null);
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [activeModalProduct]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const producerName = getProducerName(product.producer).toLowerCase();

      return (
        !query ||
        product.crop_name?.toLowerCase().includes(query) ||
        product.location?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        producerName.includes(query)
      );
    });
  }, [products, searchQuery]);

  const stats = useMemo(() => {
    const availableProducts = products.filter(
      (product) => Number(product.quantity || 0) > 0
    );

    const uniqueProducers = new Set(
      products.map((product) => product.producer_id).filter(Boolean)
    );

    return {
      totalListings: products.length,
      availableListings: availableProducts.length,
      producers: uniqueProducers.size,
    };
  }, [products]);

  const openProductModal = (product) => {
    setActiveModalProduct(product);
    setActiveImageIndex(0);
    setModalQuantity(Number(product.quantity || 0) > 0 ? 1 : 0);
    setReviewStars(5);
    setReviewText('');
  };

  const closeProductModal = () => {
    setActiveModalProduct(null);
    setActiveImageIndex(0);
    setModalQuantity(1);
    setReviewStars(5);
    setReviewText('');
  };

  const readCart = () => {
    try {
      const savedCart = localStorage.getItem(CART_KEY);
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];

      return Array.isArray(parsedCart) ? parsedCart : [];
    } catch (cartError) {
      console.error('Unable to read AgroLink cart:', cartError);
      return [];
    }
  };

  const writeCart = (cart) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      window.dispatchEvent(new Event('agrolink-cart-updated'));
      return true;
    } catch (cartError) {
      console.error('Unable to save AgroLink cart:', cartError);

      toast.error(
        'Unable to update your cart. Please check your browser storage.'
      );

      return false;
    }
  };

  const createCartItem = (product, quantity) => ({
    id: product.id,
    producerId: product.producer_id,
    cropName: product.crop_name,
    quantity,
    availableQuantity: Math.max(0, Number(product.quantity || 0)),
    unit: product.unit || 'unit',
    pricePerUnit: Number(product.price_per_unit || 0),
    location: product.location || '',
    description: product.description || '',
    productType: product.product_type || 'post_harvest',
    imagePath: getProductImages(product.image_path),
    producerName: getProducerName(product.producer),
  });

  const addProductToCart = (product, requestedQuantity = 1) => {
    const availableQuantity = Number(product.quantity || 0);
    const requested = Number(requestedQuantity);

    if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
      toast.error('This product is currently out of stock.');
      return false;
    }

    if (!Number.isFinite(requested) || requested <= 0) {
      toast.error('Please select a valid quantity.');
      return false;
    }

    const safeQuantity = Math.min(
      Math.max(1, Math.floor(requested)),
      availableQuantity
    );

    const cart = readCart();
    const existingIndex = cart.findIndex(
      (item) => item.id === product.id
    );

    if (existingIndex >= 0) {
      const existingItem = cart[existingIndex];
      const existingQuantity = Math.max(
        0,
        Number(existingItem.quantity) || 0
      );

      const updatedQuantity = Math.min(
        existingQuantity + safeQuantity,
        availableQuantity
      );

      if (updatedQuantity <= existingQuantity) {
        toast.error(
          'Your cart already contains the maximum available quantity.'
        );
        return false;
      }

      cart[existingIndex] = {
        ...existingItem,
        ...createCartItem(product, updatedQuantity),
      };

      if (!writeCart(cart)) return false;

      toast.success(`${product.crop_name} quantity updated in your cart.`);
      return true;
    }

    cart.push(createCartItem(product, safeQuantity));

    if (!writeCart(cart)) return false;

    toast.success(`${product.crop_name} added to cart.`);
    return true;
  };

  const handleAddToCart = (product, quantity = 1) => {
    addProductToCart(product, quantity);
  };

  const handleQuickBuy = (product, quantity = 1) => {
    const added = addProductToCart(product, quantity);

    if (added) {
      closeProductModal();
      navigate('/checkout');
    }
  };

  const moveImage = (direction) => {
    if (!activeModalProduct) return;

    const images = getProductImages(activeModalProduct.image_path);

    if (images.length <= 1) return;

    setActiveImageIndex((currentIndex) => {
      if (direction === 'next') {
        return (currentIndex + 1) % images.length;
      }

      return (currentIndex - 1 + images.length) % images.length;
    });
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!currentUser) {
      toast.error('Please sign in before submitting a review.');
      return;
    }

    if (currentUserRole !== 'buyer') {
      toast.error('Only buyers can submit product reviews.');
      return;
    }

    if (!activeModalProduct) return;

    if (
      !Number.isInteger(Number(reviewStars)) ||
      Number(reviewStars) < 1 ||
      Number(reviewStars) > 5
    ) {
      toast.error('Please select a star rating from 1 to 5.');
      return;
    }

    const reviewableOrder = eligibleOrders.find(
      (order) =>
        order.product_id === activeModalProduct.id &&
        !productReviews.some(
          (review) =>
            review.order_id === order.id &&
            review.buyer_id === currentUser.id
        )
    );

    if (!reviewableOrder) {
      toast.error(
        'A completed order without an existing review is required.'
      );
      return;
    }

    setSubmittingReview(true);

    try {
      // Recheck the buyer's completed order before attempting the insert.
      const {
        data: verifiedOrder,
        error: orderError,
      } = await supabase
        .from('orders')
        .select('id')
        .eq('id', reviewableOrder.id)
        .eq('buyer_id', currentUser.id)
        .eq('product_id', activeModalProduct.id)
        .eq('status', 'completed')
        .maybeSingle();

      if (orderError) throw orderError;

      if (!verifiedOrder) {
        toast.error(
          'We could not verify your completed order. Refresh and try again.'
        );
        return;
      }

      const {
        error: insertError,
      } = await supabase
        .from('product_reviews')
        .insert({
          product_id: activeModalProduct.id,
          buyer_id: currentUser.id,
          order_id: verifiedOrder.id,
          stars: Number(reviewStars),
          review_text: reviewText.trim() || null,
        });

      if (insertError) throw insertError;

      toast.success('Thank you! Your product review has been submitted.');

      setReviewStars(5);
      setReviewText('');

      await fetchProducts(true);
    } catch (submitError) {
      console.error('Product review submission error:', submitError);

      if (submitError.code === '23505') {
        toast.error(
          'You have already reviewed this product for that order.'
        );
      } else if (
        submitError.code === '42501' ||
        submitError.code === '403'
      ) {
        toast.error(
          'You are not eligible to submit this review. Check your buyer account and order.'
        );
      } else {
        toast.error(
          submitError.message || 'Unable to submit your review.'
        );
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">
              <Sprout className="h-4 w-4" />
              AgroLink · Post-harvest marketplace
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Harvested and ready to go.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Discover quality produce ready for collection. Compare prices
              and ratings, read buyer reviews, and connect with verified
              AgroLink producers.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-xl sm:gap-5">
            <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm sm:p-4">
              <p className="text-xl font-extrabold text-emerald-700 sm:text-2xl">
                {formatNumber(stats.totalListings)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                Listings
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm sm:p-4">
              <p className="text-xl font-extrabold text-emerald-700 sm:text-2xl">
                {formatNumber(stats.availableListings)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                Available
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm sm:p-4">
              <p className="text-xl font-extrabold text-emerald-700 sm:text-2xl">
                {formatNumber(stats.producers)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                Producers
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search crop, description, location, or producer..."
              aria-label="Search post-harvest products"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-bold text-emerald-700">
              Ready for collection
            </span>

            <button
              type="button"
              onClick={() => fetchProducts(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="h-36 bg-slate-200 sm:h-44" />

                <div className="space-y-3 p-3">
                  <div className="h-4 rounded bg-slate-200" />
                  <div className="h-3 rounded bg-slate-200" />
                  <div className="h-3 w-2/3 rounded bg-slate-200" />
                  <div className="h-8 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-700">{error}</p>

            <button
              type="button"
              onClick={() => fetchProducts()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              No products found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {products.length === 0
                ? 'There are currently no post-harvest listings available.'
                : 'Try another crop name, description, location, or producer.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={openProductModal}
                onAddToCart={handleAddToCart}
                onQuickBuy={handleQuickBuy}
              />
            ))}
          </div>
        )}
      </main>

      {activeModalProduct && (
        <ProductModal
          product={activeModalProduct}
          imageIndex={activeImageIndex}
          quantity={modalQuantity}
          currentUser={currentUser}
          currentUserRole={currentUserRole}
          reviews={productReviews}
          eligibleOrders={eligibleOrders}
          reviewStars={reviewStars}
          reviewText={reviewText}
          submittingReview={submittingReview}
          onReviewStarsChange={setReviewStars}
          onReviewTextChange={setReviewText}
          onSubmitReview={handleSubmitReview}
          onClose={closeProductModal}
          onPreviousImage={() => moveImage('previous')}
          onNextImage={() => moveImage('next')}
          onSelectImage={(index) => {
            const imageCount = getProductImages(
              activeModalProduct.image_path
            ).length;

            if (index >= 0 && index < imageCount) {
              setActiveImageIndex(index);
            }
          }}
          onIncreaseQuantity={() => {
            setModalQuantity((current) =>
              Math.min(
                current + 1,
                Math.max(0, Number(activeModalProduct.quantity || 0))
              )
            );
          }}
          onDecreaseQuantity={() => {
            setModalQuantity((current) => Math.max(current - 1, 1));
          }}
          onAddToCart={() => {
            handleAddToCart(activeModalProduct, modalQuantity);
          }}
          onBuyNow={() => {
            handleQuickBuy(activeModalProduct, modalQuantity);
          }}
        />
      )}
    </div>
  );
};

export default PostHarvest;
