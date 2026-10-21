
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Leaf,
  MapPin,
  Package,
  Sprout,
  Wheat,
} from 'lucide-react';

const CART_STORAGE_KEY = 'agrolink_cart';
const CART_UPDATED_EVENT = 'agrolink-cart-updated';

const formatNumber = (value) =>
  new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);

const getAvailableQuantity = (item) => {
  const candidates = [
    item?.availableQuantity,
    item?.available_quantity,
    item?.stockQuantity,
    item?.stock_quantity,
    item?.productQuantity,
    item?.product_quantity,
  ];

  for (const candidate of candidates) {
    if (
      candidate !== null &&
      candidate !== undefined &&
      candidate !== '' &&
      Number.isFinite(Number(candidate)) &&
      Number(candidate) >= 0
    ) {
      return Number(candidate);
    }
  }

  // null means the current stock is not known.
  return null;
};

const parseImagePath = (imagePath) => {
  if (!imagePath) return null;

  let value = imagePath;

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (!trimmed) return null;

    try {
      value = JSON.parse(trimmed);
    } catch {
      value = trimmed;
    }
  }

  if (Array.isArray(value)) {
    value =
      value.find(
        (entry) =>
          typeof entry === 'string' && entry.trim()
      ) || null;
  }

  if (typeof value !== 'string') return null;

  return value.trim() || null;
};

const getProductImage = (imagePath) => {
  const path = parseImagePath(imagePath);

  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) return null;

  const cleanedPath = path
    .replace(/^product-images\//, '')
    .replace(/^\/+/, '');

  if (!cleanedPath) return null;

  const encodedPath = cleanedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/product-images/${encodedPath}`;
};

const normalizeCartItem = (item) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const id =
    item.id ??
    item.productId ??
    item.product_id;

  if (
    id === null ||
    id === undefined ||
    String(id).trim() === ''
  ) {
    return null;
  }

  const rawPrice = Number(
    item.pricePerUnit ??
      item.price_per_unit ??
      item.price ??
      0
  );

  const rawQuantity = Number(item.quantity ?? 1);
  const availableQuantity = getAvailableQuantity(item);

  let quantity =
    Number.isFinite(rawQuantity) && rawQuantity > 0
      ? rawQuantity
      : 1;

  // Clamp quantity only when positive stock is known.
  // Preserve the item when stock is zero so the buyer
  // can see and remove it.
  if (availableQuantity !== null && availableQuantity > 0) {
    quantity = Math.min(quantity, availableQuantity);
  }

  return {
    ...item,
    id,
    quantity,
    pricePerUnit:
      Number.isFinite(rawPrice) && rawPrice >= 0
        ? rawPrice
        : 0,
    availableQuantity,
    cropName:
      item.cropName ??
      item.crop_name ??
      item.name ??
      'Agricultural Produce',
    imagePath:
      item.imagePath ??
      item.image_path ??
      null,
    producerId:
      item.producerId ??
      item.producer_id ??
      null,
    producerName:
      item.producerName ??
      item.producer_name ??
      null,
    location:
      item.location ??
      item.lga_location ??
      '',
    unit: item.unit ?? 'unit',
  };
};

const readCartFromStorage = () => {
  try {
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);

    if (!storedCart) return [];

    const parsedCart = JSON.parse(storedCart);

    if (!Array.isArray(parsedCart)) return [];

    return parsedCart
      .map(normalizeCartItem)
      .filter(Boolean);
  } catch (error) {
    console.error('Could not read AgroLink cart:', error);
    return [];
  }
};

const saveCartToStorage = (items) => {
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(items)
    );

    window.dispatchEvent(
      new Event(CART_UPDATED_EVENT)
    );

    return true;
  } catch (error) {
    console.error('Could not save AgroLink cart:', error);
    return false;
  }
};

const ProductImage = ({ imagePath, title }) => {
  const imageUrl = getProductImage(imagePath);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [imageUrl]);

  if (imageUrl && !hasError) {
    return (
      <img
        src={imageUrl}
        alt={title || 'Agricultural produce'}
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 hover:scale-105"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100 via-lime-50 to-white">
      <Leaf className="absolute -right-5 -top-5 h-20 w-20 rotate-12 text-emerald-200/60" />
      <Sprout className="absolute -bottom-5 -left-5 h-16 w-16 -rotate-12 text-emerald-200/70" />
      <Wheat className="relative h-9 w-9 text-emerald-600/60" />
    </div>
  );
};

const EmptyCart = () => (
  <div className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4 py-12">
    <div className="w-full max-w-lg text-center">
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-50 text-emerald-600 shadow-sm">
        <ShoppingBag className="h-10 w-10" />
        <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-slate-50 bg-emerald-600 text-white">
          <Plus className="h-3 w-3" />
        </span>
      </div>

      <h1 className="mt-7 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
        Your cart is empty
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
        Explore agricultural products from AgroLink producers
        and add the products you need to your cart.
      </p>

      <Link
        to="/catalog"
        className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-500"
      >
        <ShoppingBag className="h-4 w-4" />
        Explore Marketplace
        <ArrowRight className="h-4 w-4" />
      </Link>

      <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10px] font-bold text-slate-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Local produce
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Real marketplace listings
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Flexible quantities
        </span>
      </div>
    </div>
  </div>
);

export const Cart = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    setCartItems(readCartFromStorage());
    setIsLoaded(true);

    const handleStorage = (event) => {
      if (event.key === CART_STORAGE_KEY) {
        setCartItems(readCartFromStorage());
      }
    };

    // Custom events synchronize pages in this tab.
    const handleCartUpdated = () => {
      setCartItems(readCartFromStorage());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(
      CART_UPDATED_EVENT,
      handleCartUpdated
    );

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(
        CART_UPDATED_EVENT,
        handleCartUpdated
      );
    };
  }, []);

  // Persist only after the initial cart read.
  useEffect(() => {
    if (!isLoaded) return;

    const saved = saveCartToStorage(cartItems);

    setStorageError(
      saved
        ? ''
        : 'Your cart could not be saved on this device. Check your browser storage settings.'
    );
  }, [cartItems, isLoaded]);

  const updateQuantity = useCallback(
    (productId, requestedQuantity) => {
      setCartItems((currentItems) =>
        currentItems.map((item) => {
          if (String(item.id) !== String(productId)) {
            return item;
          }

          const stock = getAvailableQuantity(item);

          // A zero-stock item cannot be increased or purchased.
          if (stock !== null && stock <= 0) {
            return item;
          }

          const requested = Number(requestedQuantity);

          let quantity =
            Number.isFinite(requested) && requested > 0
              ? requested
              : 1;

          if (stock !== null) {
            quantity = Math.min(quantity, stock);
          }

          return {
            ...item,
            quantity,
          };
        })
      );
    },
    []
  );

  const increaseQuantity = useCallback(
    (item) => {
      const stock = getAvailableQuantity(item);
      const currentQuantity = Number(item.quantity) || 1;

      if (stock !== null && currentQuantity >= stock) {
        return;
      }

      updateQuantity(item.id, currentQuantity + 1);
    },
    [updateQuantity]
  );

  const decreaseQuantity = useCallback(
    (item) => {
      const currentQuantity = Number(item.quantity) || 1;

      if (currentQuantity <= 1) return;

      updateQuantity(item.id, currentQuantity - 1);
    },
    [updateQuantity]
  );

  const removeItem = useCallback((productId) => {
    setCartItems((currentItems) =>
      currentItems.filter(
        (item) => String(item.id) !== String(productId)
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const cartSummary = useMemo(() => {
    // Keep unavailable items visible so buyers can remove them.
    const items = cartItems;

    const itemCount = items.reduce(
      (total, item) =>
        total + Math.max(0, Number(item.quantity) || 0),
      0
    );

    const subtotal = items.reduce((total, item) => {
      const stock = getAvailableQuantity(item);

      // Do not include known out-of-stock items in the subtotal.
      if (stock !== null && stock <= 0) {
        return total;
      }

      return (
        total +
        Number(item.pricePerUnit || 0) *
          Math.max(0, Number(item.quantity) || 0)
      );
    }, 0);

    const producers = new Set(
      items
        .map((item) => item.producerId)
        .filter(Boolean)
    );

    const outOfStockItems = items.filter(
      (item) => getAvailableQuantity(item) === 0
    );

    const overStockItems = items.filter((item) => {
      const stock = getAvailableQuantity(item);

      return (
        stock !== null &&
        stock > 0 &&
        Number(item.quantity) > stock
      );
    });

    return {
      items: itemCount,
      subtotal,
      producers: producers.size,
      validItems: items,
      outOfStockItems,
      overStockItems,
      hasUnavailableItems:
        outOfStockItems.length > 0 ||
        overStockItems.length > 0,
    };
  }, [cartItems]);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    if (cartSummary.hasUnavailableItems) {
      return;
    }

    navigate('/checkout');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-36 animate-pulse rounded-2xl bg-white"
                />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-2xl bg-white" />
          </div>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/catalog')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-emerald-600 sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </button>

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-600 sm:text-xs">
                <ShoppingBag className="h-3.5 w-3.5" />
                Marketplace Cart
              </div>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Your Cart
              </h1>

              <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                Review your selected agricultural products before
                continuing to checkout.
              </p>
            </div>

            <button
              type="button"
              onClick={clearCart}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-[10px] font-black text-red-600 transition hover:bg-red-100 sm:self-auto sm:text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Cart
            </button>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        {storageError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {storageError}
          </div>
        )}

        {cartSummary.hasUnavailableItems && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <p className="font-bold">
              Some products need your attention.
            </p>

            <p className="mt-1 leading-6">
              {cartSummary.outOfStockItems.length > 0 &&
                `${cartSummary.outOfStockItems.length} product(s) are out of stock. `}
              {cartSummary.overStockItems.length > 0 &&
                `${cartSummary.overStockItems.length} product(s) exceed their recorded stock. `}
              Remove unavailable products or adjust their quantities
              before proceeding. Checkout will also verify the latest
              prices and stock.
            </p>
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">
                {formatNumber(cartSummary.items)}{' '}
                {cartSummary.items === 1 ? 'item' : 'items'}
              </p>

              {cartSummary.producers > 0 && (
                <p className="text-[10px] font-bold text-slate-400">
                  {cartSummary.producers}{' '}
                  {cartSummary.producers === 1
                    ? 'producer'
                    : 'producers'}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {cartSummary.validItems.map((item) => {
                const itemQuantity = Number(item.quantity) || 1;
                const itemPrice = Number(item.pricePerUnit) || 0;
                const stock = getAvailableQuantity(item);
                const isOutOfStock = stock === 0;
                const isOverStock =
                  stock !== null &&
                  stock > 0 &&
                  itemQuantity > stock;
                const isAtStockLimit =
                  stock !== null &&
                  stock > 0 &&
                  itemQuantity >= stock;
                const itemTotal =
                  isOutOfStock
                    ? 0
                    : itemPrice * itemQuantity;

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-100 hover:shadow-md sm:rounded-3xl"
                  >
                    <div className="flex gap-3 p-3 sm:gap-5 sm:p-5">
                      <Link
                        to={`/product/${item.id}`}
                        className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-emerald-50 sm:h-36 sm:w-36 sm:rounded-2xl"
                        aria-label={`View ${item.cropName}`}
                      >
                        <ProductImage
                          imagePath={item.imagePath}
                          title={item.cropName}
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to={`/product/${item.id}`}
                              className="line-clamp-2 text-sm font-black capitalize text-slate-950 transition hover:text-emerald-600 sm:text-lg"
                            >
                              {item.cropName ||
                                'Agricultural Produce'}
                            </Link>

                            <div className="mt-1 flex min-w-0 items-center gap-1 text-[9px] font-medium text-slate-400 sm:text-[11px]">
                              <MapPin className="h-3 w-3 shrink-0 text-emerald-600" />
                              <span className="truncate">
                                {item.location ||
                                  'Location not specified'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            aria-label={`Remove ${item.cropName || 'product'} from cart`}
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="mt-2 truncate text-[9px] font-bold text-slate-400 sm:text-[11px]">
                          {item.producerName || 'AgroLink Producer'}
                        </p>

                        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 sm:mt-5">
                          <div>
                            <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 sm:text-[9px]">
                              Price
                            </p>

                            <p className="mt-0.5 text-sm font-black text-slate-900 sm:text-base">
                              ₦{formatCurrency(itemPrice)}
                              <span className="ml-1 text-[9px] font-bold text-slate-400">
                                / {item.unit || 'unit'}
                              </span>
                            </p>
                          </div>

                          <div
                            className="flex items-center rounded-xl border border-slate-200 bg-slate-50"
                            aria-label={`Quantity for ${item.cropName}`}
                          >
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(item)}
                              disabled={
                                isOutOfStock || itemQuantity <= 1
                              }
                              className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <span className="min-w-9 text-center text-xs font-black text-slate-900">
                              {formatNumber(itemQuantity)}
                            </span>

                            <button
                              type="button"
                              onClick={() => increaseQuantity(item)}
                              disabled={
                                isOutOfStock || isAtStockLimit
                              }
                              className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="ml-auto text-right">
                            <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 sm:text-[9px]">
                              Total
                            </p>

                            <p className={`mt-0.5 text-sm font-black sm:text-base ${
                              isOutOfStock
                                ? 'text-slate-400'
                                : 'text-emerald-700'
                            }`}>
                              ₦{formatCurrency(itemTotal)}
                            </p>
                          </div>
                        </div>

                        {isOutOfStock && (
                          <p className="mt-2 text-right text-[10px] font-bold text-red-600">
                            Out of stock — remove this item to continue.
                          </p>
                        )}

                        {!isOutOfStock && isOverStock && (
                          <p className="mt-2 text-right text-[10px] font-bold text-amber-600">
                            Requested quantity exceeds recorded stock.
                          </p>
                        )}

                        {!isOutOfStock &&
                          !isOverStock &&
                          isAtStockLimit && (
                            <p className="mt-2 text-right text-[9px] font-bold text-amber-600">
                              Maximum available quantity reached
                            </p>
                          )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl">
              <div className="border-b border-slate-100 bg-slate-950 p-5 text-white sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <ShoppingBag className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-base font-black sm:text-lg">
                      Order Summary
                    </h2>
                    <p className="text-[10px] text-slate-400">
                      Before checkout
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">
                      Items
                    </span>
                    <span className="font-black text-slate-900">
                      {formatNumber(cartSummary.items)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">
                      Products
                    </span>
                    <span className="font-black text-slate-900">
                      {formatNumber(cartItems.length)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-500">
                      Producers
                    </span>
                    <span className="font-black text-slate-900">
                      {formatNumber(cartSummary.producers)}
                    </span>
                  </div>
                </div>

                <div className="my-5 border-t border-slate-100" />

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      Subtotal
                    </p>
                    <p className="mt-1 text-[9px] text-slate-400">
                      Pickup arrangements are confirmed during checkout.
                    </p>
                  </div>

                  <p className="text-xl font-black text-slate-950 sm:text-2xl">
                    ₦{formatCurrency(cartSummary.subtotal)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={
                    cartItems.length === 0 ||
                    cartSummary.hasUnavailableItems
                  }
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>

                {cartSummary.hasUnavailableItems && (
                  <p className="mt-2 text-xs leading-5 text-amber-700">
                    Resolve the stock warnings above before checkout.
                  </p>
                )}

                <Link
                  to="/catalog"
                  className="mt-2 flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-xs font-black text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  Continue Shopping
                </Link>

                <div className="mt-5 rounded-xl bg-slate-50 p-3">
                  <div className="flex gap-2">
                    <Package className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-[9px] leading-4 text-slate-500">
                      Your cart is saved on this device. Prices and stock
                      are checked again during checkout.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-bold text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Marketplace order protection
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Cart;
