import React, { useEffect, useMemo, useState } from 'react';
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

const formatNumber = (value) => {
  return new Intl.NumberFormat('en-NG').format(Number(value || 0));
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

/*
  Normalize the image_path value.

  Supabase may return image_path as:
  - null
  - a normal string
  - a URL
  - a JSON string containing an array
  - an actual array
  - a JSON string containing a single string

  The important part is that this function always returns
  either a string or null.
*/
const parseImagePath = (imagePath) => {
  if (!imagePath) return null;

  let value = imagePath;

  // If the value is a string, check whether it contains JSON.
  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) return null;

    try {
      value = JSON.parse(trimmedValue);
    } catch {
      // It is already a normal path or URL.
      value = trimmedValue;
    }
  }

  // If it is an array, find the first valid string.
  if (Array.isArray(value)) {
    value =
      value.find(
        (item) =>
          typeof item === 'string' &&
          item.trim().length > 0
      ) || null;
  }

  // Anything else is not a usable image path.
  if (typeof value !== 'string') {
    return null;
  }

  return value.trim() || null;
};

const getProductImage = (imagePath) => {
  const path = parseImagePath(imagePath);

  if (!path) return null;

  /*
    Only call startsWith after we have confirmed that
    path is definitely a string.
  */
  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  const cleanedPath = path
    .replace(/^product-images\//, '')
    .replace(/^\/+/, '');

  /*
    We use the public Supabase storage URL format directly here
    so the cart can display images without making another
    Supabase request for every cart item.
  */
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl || !cleanedPath) {
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/product-images/${cleanedPath}`;
};

const ProductImage = ({ imagePath, title }) => {
  const imageUrl = getProductImage(imagePath);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={title || 'Agricultural produce'}
        className="h-full w-full object-cover transition duration-500 hover:scale-105"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
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

const EmptyCart = () => {
  return (
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
          Explore agricultural products from AgroLink producers and
          add the products you need to your cart.
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
};

export const Cart = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);

      if (!storedCart) {
        setCartItems([]);
        setIsLoaded(true);
        return;
      }

      const parsedCart = JSON.parse(storedCart);

      if (Array.isArray(parsedCart)) {
        setCartItems(parsedCart);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error('Could not load cart:', error);
      setCartItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  /*
    Keep localStorage synchronized whenever the cart changes.
  */
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cartItems)
      );

      window.dispatchEvent(
        new Event('agrolink-cart-updated')
      );
    } catch (error) {
      console.error('Could not save cart:', error);
    }
  }, [cartItems, isLoaded]);

  const updateQuantity = (productId, newQuantity) => {
    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== productId) {
          return item;
        }

        const availableQuantity = Number(
          item.availableQuantity || 0
        );

        const safeQuantity = Math.min(
          Math.max(1, Number(newQuantity) || 1),
          availableQuantity || 1
        );

        return {
          ...item,
          quantity: safeQuantity,
        };
      })
    );
  };

  const increaseQuantity = (item) => {
    const currentQuantity = Number(item.quantity || 1);
    const availableQuantity = Number(
      item.availableQuantity || 0
    );

    if (
      availableQuantity > 0 &&
      currentQuantity >= availableQuantity
    ) {
      return;
    }

    updateQuantity(item.id, currentQuantity + 1);
  };

  const decreaseQuantity = (item) => {
    const currentQuantity = Number(item.quantity || 1);

    if (currentQuantity <= 1) {
      return;
    }

    updateQuantity(item.id, currentQuantity - 1);
  };

  const removeItem = (productId) => {
    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== productId)
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartSummary = useMemo(() => {
    const items = cartItems.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );

    const subtotal = cartItems.reduce((total, item) => {
      return (
        total +
        Number(item.pricePerUnit || 0) *
          Number(item.quantity || 0)
      );
    }, 0);

    const producers = new Set(
      cartItems
        .map((item) => item.producerId)
        .filter(Boolean)
    );

    return {
      items,
      subtotal,
      producers: producers.size,
    };
  }, [cartItems]);

  const handleCheckout = () => {
    if (!cartItems.length) return;

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
      {/* =====================================================
          HEADER
      ====================================================== */}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
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

      {/* =====================================================
          CART CONTENT
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px]">
          {/* =================================================
              ITEMS
          ================================================== */}

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
              {cartItems.map((item) => {
                const itemQuantity = Number(
                  item.quantity || 1
                );

                const itemPrice = Number(
                  item.pricePerUnit || 0
                );

                const availableQuantity = Number(
                  item.availableQuantity || 0
                );

                const itemTotal =
                  itemPrice * itemQuantity;

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-100 hover:shadow-md sm:rounded-3xl"
                  >
                    <div className="flex gap-3 p-3 sm:gap-5 sm:p-5">
                      {/* Product image */}

                      <Link
                        to={`/product/${item.id}`}
                        className="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-emerald-50 sm:h-36 sm:w-36 sm:rounded-2xl"
                      >
                        <ProductImage
                          imagePath={item.imagePath}
                          title={item.cropName}
                        />
                      </Link>

                      {/* Information */}

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
                            onClick={() =>
                              removeItem(item.id)
                            }
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            aria-label={`Remove ${
                              item.cropName || 'product'
                            } from cart`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Producer */}

                        <p className="mt-2 truncate text-[9px] font-bold text-slate-400 sm:text-[11px]">
                          {item.producerName ||
                            'AgroLink Producer'}
                        </p>

                        {/* Price + quantity */}

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

                          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                            <button
                              type="button"
                              onClick={() =>
                                decreaseQuantity(item)
                              }
                              disabled={itemQuantity <= 1}
                              className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <span className="min-w-9 text-center text-xs font-black text-slate-900">
                              {itemQuantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                increaseQuantity(item)
                              }
                              disabled={
                                availableQuantity <= 0 ||
                                itemQuantity >=
                                  availableQuantity
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

                            <p className="mt-0.5 text-sm font-black text-emerald-700 sm:text-base">
                              ₦{formatCurrency(itemTotal)}
                            </p>
                          </div>
                        </div>

                        {/* Availability warning */}

                        {availableQuantity > 0 &&
                          itemQuantity >=
                            availableQuantity && (
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

          {/* =================================================
              SUMMARY
          ================================================== */}

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
                      {formatNumber(
                        cartSummary.producers
                      )}
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
                      Delivery charges calculated at checkout
                    </p>
                  </div>

                  <p className="text-xl font-black text-slate-950 sm:text-2xl">
                    ₦{formatCurrency(cartSummary.subtotal)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-500"
                >
                  Proceed to Checkout
                  <ArrowRight className="h-4 w-4" />
                </button>

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
                      Your cart is saved on this device. The final
                      order will only be created after checkout
                      confirmation.
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
