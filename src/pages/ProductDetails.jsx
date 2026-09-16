import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

const CART_KEY = 'agrolink_cart';

const formatNaira = (value) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
};

const getImagePaths = (imagePath) => {
  if (!imagePath) return [];

  if (Array.isArray(imagePath)) {
    return imagePath.filter(Boolean);
  }

  if (typeof imagePath === 'string') {
    const value = imagePath.trim();

    if (!value) return [];

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }

      if (typeof parsed === 'string' && parsed.trim()) {
        return [parsed.trim()];
      }
    } catch {
      // Continue with fallback parsing.
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getStorageUrl = (path) => {
  if (!path) return null;

  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return data?.publicUrl || null;
};

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [producer, setProducer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const [cartCount, setCartCount] = useState(0);

  /*
   * -------------------------------------------------------
   * CART COUNT
   * -------------------------------------------------------
   */

  const loadCartCount = () => {
    try {
      const storedCart = localStorage.getItem(CART_KEY);

      if (!storedCart) {
        setCartCount(0);
        return;
      }

      const cart = JSON.parse(storedCart);

      if (!Array.isArray(cart)) {
        setCartCount(0);
        return;
      }

      const count = cart.reduce((total, item) => {
        return total + Number(item.quantity || 0);
      }, 0);

      setCartCount(count);
    } catch (err) {
      console.error('Failed to load cart count:', err);
      setCartCount(0);
    }
  };

  /*
   * -------------------------------------------------------
   * FETCH PRODUCT
   * -------------------------------------------------------
   */

  const fetchProduct = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const { data: productData, error: productError } =
        await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

      if (productError) {
        throw productError;
      }

      if (!productData) {
        throw new Error('Product not found.');
      }

      setProduct(productData);

      /*
       * Producer information is loaded separately because
       * producer_id does not rely on a products -> profiles
       * foreign-key relationship.
       */
      if (productData.producer_id) {
        const {
          data: producerData,
          error: producerError,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            role,
            phone_number,
            lga_location,
            verification_status,
            farm_name,
            farm_location,
            farm_size,
            farm_type,
            business_name,
            business_address
          `)
          .eq('id', productData.producer_id)
          .maybeSingle();

        if (producerError) {
          console.error(
            'Could not load producer profile:',
            producerError.message
          );
        }

        setProducer(producerData || null);
      } else {
        setProducer(null);
      }

      setSelectedImage(0);
      setQuantity(1);
    } catch (err) {
      console.error('Product details error:', err);

      setError(
        err?.message ||
          'We could not load this product. Please try again.'
      );

      setProduct(null);
      setProducer(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /*
   * -------------------------------------------------------
   * INITIAL LOAD + REALTIME
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (!productId) return;

    fetchProduct();
    loadCartCount();

    const channel = supabase
      .channel(`product-details-${productId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `id=eq.${productId}`,
        },
        () => {
          fetchProduct(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId]);

  /*
   * -------------------------------------------------------
   * CART SYNCHRONIZATION
   * -------------------------------------------------------
   */

  useEffect(() => {
    const handleCartUpdate = () => {
      loadCartCount();
    };

    const handleStorage = (event) => {
      if (event.key === CART_KEY) {
        loadCartCount();
      }
    };

    window.addEventListener(
      'agrolink-cart-updated',
      handleCartUpdate
    );

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(
        'agrolink-cart-updated',
        handleCartUpdate
      );

      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  /*
   * -------------------------------------------------------
   * PRODUCT DATA
   * -------------------------------------------------------
   */

  const imagePaths = useMemo(() => {
    return getImagePaths(product?.image_path);
  }, [product?.image_path]);

  const imageUrls = useMemo(() => {
    return imagePaths
      .map(getStorageUrl)
      .filter(Boolean);
  }, [imagePaths]);

  const availableQuantity = Math.max(
    0,
    Number(product?.quantity || 0)
  );

  const pricePerUnit = Math.max(
    0,
    Number(product?.price_per_unit || 0)
  );

  const totalPrice = pricePerUnit * quantity;

  const productTypeLabel =
    product?.product_type === 'pre_harvest'
      ? 'Pre-Harvest'
      : 'Post-Harvest';

  const isPreHarvest =
    product?.product_type === 'pre_harvest';

  const isOutOfStock = availableQuantity <= 0;

  const isLowStock =
    availableQuantity > 0 &&
    availableQuantity <= 10;

  const producerName =
    producer?.full_name ||
    producer?.business_name ||
    'AgroLink Producer';

  const producerVerified =
    producer?.verification_status === 'approved';

  /*
   * -------------------------------------------------------
   * QUANTITY
   * -------------------------------------------------------
   */

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) =>
      Math.min(availableQuantity, current + 1)
    );
  };

  const handleQuantityInput = (event) => {
    const value = Number(event.target.value);

    if (!Number.isFinite(value)) {
      setQuantity(1);
      return;
    }

    setQuantity(
      Math.min(
        availableQuantity,
        Math.max(1, Math.floor(value))
      )
    );
  };

  /*
   * -------------------------------------------------------
   * CART
   * -------------------------------------------------------
   *
   * redirectToCheckout = false
   *   -> Add to Cart and stay on this page.
   *
   * redirectToCheckout = true
   *   -> Buy Now and go directly to Checkout.
   */

  const addToCart = (redirectToCheckout = false) => {
    if (!product) return;

    if (isOutOfStock) {
      toast.error(
        'This product is currently out of stock.'
      );
      return;
    }

    if (quantity > availableQuantity) {
      toast.error(
        `Only ${availableQuantity} ${
          product.unit || 'units'
        } are available.`
      );
      return;
    }

    try {
      const storedCart =
        localStorage.getItem(CART_KEY);

      let cart = [];

      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);

        if (Array.isArray(parsedCart)) {
          cart = parsedCart;
        }
      }

      const existingIndex = cart.findIndex(
        (item) => item.id === product.id
      );

      if (existingIndex !== -1) {
        const existingItem =
          cart[existingIndex];

        const newQuantity =
          Number(existingItem.quantity || 0) +
          quantity;

        if (newQuantity > availableQuantity) {
          toast.error(
            `You can only add up to ${availableQuantity} ${
              product.unit || 'units'
            } of this product.`
          );
          return;
        }

        cart[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
          availableQuantity,
          pricePerUnit,
          producerName,
        };
      } else {
        cart.push({
          id: product.id,
          producerId: product.producer_id,
          cropName: product.crop_name,
          quantity,
          availableQuantity,
          unit: product.unit,
          pricePerUnit,
          location: product.location,
          imagePath: product.image_path,
          productType: product.product_type,
          producerName,
        });
      }

      localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
      );

      loadCartCount();

      /*
       * Notify Navbar, Cart and other components
       * immediately that the cart has changed.
       */
      window.dispatchEvent(
        new Event('agrolink-cart-updated')
      );

      /*
       * Buy Now goes directly to Checkout.
       * Add to Cart stays on Product Details.
       */
      if (redirectToCheckout) {
        toast.success(
          `${product.crop_name} added to cart.`
        );

        navigate('/checkout');
        return;
      }

      toast.success(
        `${product.crop_name} added to your cart.`
      );
    } catch (err) {
      console.error(
        'Add to cart error:',
        err
      );

      toast.error(
        'Could not add this product to your cart.'
      );
    }
  };

  const handleBuyNow = () => {
    addToCart(true);
  };

  /*
   * -------------------------------------------------------
   * GALLERY
   * -------------------------------------------------------
   */

  const showPreviousImage = () => {
    if (imageUrls.length <= 1) return;

    setSelectedImage((current) =>
      current === 0
        ? imageUrls.length - 1
        : current - 1
    );
  };

  const showNextImage = () => {
    if (imageUrls.length <= 1) return;

    setSelectedImage((current) =>
      current === imageUrls.length - 1
        ? 0
        : current + 1
    );
  };

  /*
   * -------------------------------------------------------
   * LOADING STATE
   * -------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse space-y-8">
            <div className="h-6 w-32 rounded bg-slate-200" />

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="aspect-square rounded-3xl bg-slate-200" />

              <div className="space-y-5">
                <div className="h-6 w-28 rounded bg-slate-200" />
                <div className="h-12 w-3/4 rounded bg-slate-200" />
                <div className="h-8 w-1/3 rounded bg-slate-200" />
                <div className="h-24 rounded bg-slate-200" />
                <div className="h-16 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * -------------------------------------------------------
   * ERROR STATE
   * -------------------------------------------------------
   */

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900">
              Product unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {error ||
                'This product could not be found or may have been removed.'}
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => fetchProduct()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>

              <Link
                to="/catalog"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * -------------------------------------------------------
   * MAIN UI
   * -------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* TOP NAVIGATION */}

        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
          >
            <ShoppingCart className="h-4 w-4" />

            <span className="hidden sm:inline">
              Cart
            </span>

            {cartCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* PRODUCT SECTION */}

        <section className="grid gap-8 lg:grid-cols-2 lg:items-start">
          {/* IMAGE GALLERY */}

          <div className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-square overflow-hidden bg-slate-100">
                {imageUrls.length > 0 ? (
                  <img
                    src={imageUrls[selectedImage]}
                    alt={product.crop_name}
                    className="h-full w-full object-cover transition duration-500"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-20 w-20 text-slate-300" />
                  </div>
                )}

                {/* PRODUCT TYPE */}

                <div className="absolute left-4 top-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                      isPreHarvest
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {productTypeLabel}
                  </span>
                </div>

                {/* VERIFIED */}

                {producerVerified && (
                  <div className="absolute right-4 top-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur">
                      <ShieldCheck className="h-4 w-4" />
                      Verified Producer
                    </span>
                  </div>
                )}

                {imageUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={showPreviousImage}
                      aria-label="Previous product image"
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg backdrop-blur transition hover:bg-white"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={showNextImage}
                      aria-label="Next product image"
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg backdrop-blur transition hover:bg-white"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* IMAGE COUNT */}

                {imageUrls.length > 1 && (
                  <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {selectedImage + 1} / {imageUrls.length}
                  </div>
                )}
              </div>

              {/* THUMBNAILS */}

              {imageUrls.length > 1 && (
                <div className="flex gap-3 overflow-x-auto p-4">
                  {imageUrls.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() =>
                        setSelectedImage(index)
                      }
                      className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                        selectedImage === index
                          ? 'border-emerald-600 ring-2 ring-emerald-100'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.crop_name} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PRODUCT INFORMATION */}

          <div className="space-y-6">
            {/* TITLE */}

            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  {product.unit || 'Unit'}
                </span>

                {isLowStock && (
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                    Low Stock
                  </span>
                )}

                {isOutOfStock && (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    Out of Stock
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                {product.crop_name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                {product.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    {product.location}
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-emerald-600" />
                  {availableQuantity}{' '}
                  {product.unit || 'units'} available
                </span>
              </div>
            </div>

            {/* PRICE */}

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Price
              </p>

              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {formatNaira(pricePerUnit)}
                </span>

                <span className="text-sm font-medium text-slate-500">
                  per {product.unit || 'unit'}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600">
                Current marketplace listing price.
              </p>
            </div>

            {/* PRODUCER */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Store className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900">
                      {producerName}
                    </h2>

                    {producerVerified && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    )}
                  </div>

                  {producer?.farm_name && (
                    <p className="mt-1 text-sm text-slate-600">
                      {producer.farm_name}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {producer?.lga_location && (
                      <span>
                        {producer.lga_location}
                      </span>
                    )}

                    {producer?.farm_type && (
                      <span>
                        {producer.farm_type}
                      </span>
                    )}

                    {producer?.business_name && (
                      <span>
                        {producer.business_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PURCHASE CARD */}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Quantity
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Select how much you want to order.
                  </p>
                </div>

                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    disabled={
                      quantity <= 1 ||
                      isOutOfStock
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-l-xl text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={availableQuantity}
                    value={quantity}
                    onChange={handleQuantityInput}
                    disabled={isOutOfStock}
                    className="h-11 w-16 border-x border-slate-200 bg-white text-center text-sm font-bold text-slate-900 outline-none"
                    aria-label="Product quantity"
                  />

                  <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={
                      quantity >=
                        availableQuantity ||
                      isOutOfStock
                    }
                    className="flex h-11 w-11 items-center justify-center rounded-r-xl text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ORDER TOTAL */}

              <div className="my-5 border-t border-slate-100 pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Estimated total
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {quantity} ×{' '}
                      {formatNaira(pricePerUnit)}
                    </p>
                  </div>

                  <p className="text-2xl font-black text-emerald-700">
                    {formatNaira(totalPrice)}
                  </p>
                </div>
              </div>

              {/* ACTIONS */}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => addToCart(false)}
                  disabled={isOutOfStock}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  Buy Now
                </button>
              </div>

              {isOutOfStock ? (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-700">
                  This product is currently unavailable.
                </div>
              ) : (
                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                  You can add products to your cart before signing in.
                  Your order will be confirmed at checkout.
                </p>
              )}
            </div>

            {/* TRUST INFORMATION */}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />

                <p className="mt-3 text-sm font-bold text-slate-900">
                  Trusted Listing
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Product information is supplied through the AgroLink marketplace.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Truck className="h-5 w-5 text-emerald-600" />

                <p className="mt-3 text-sm font-bold text-slate-900">
                  Flexible Delivery
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Delivery or pickup details are arranged during the order process.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                <p className="mt-3 text-sm font-bold text-slate-900">
                  Clear Ordering
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Current price and availability are checked again at checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT INFORMATION */}

        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Product Information
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-900">
              About this listing
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Crop
              </p>

              <p className="mt-2 font-bold capitalize text-slate-900">
                {product.crop_name}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Available
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {availableQuantity}{' '}
                {product.unit || 'units'}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Product Type
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {productTypeLabel}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Location
              </p>

              <p className="mt-2 font-bold text-slate-900">
                {product.location ||
                  'Not specified'}
              </p>
            </div>
          </div>

          {product.created_at && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-400">
                Listed on{' '}
                {new Date(
                  product.created_at
                ).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </section>

        {/* OFFLINE PAYMENT NOTICE */}

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />

            <div>
              <h3 className="font-bold text-amber-900">
                Payment and delivery
              </h3>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                AgroLink currently helps buyers and producers create and
                manage orders. Payment is arranged directly between the
                buyer and producer rather than being collected online by
                AgroLink.
              </p>
            </div>
          </div>
        </section>

        {/* BOTTOM ACTION */}

        <div className="mt-8 flex justify-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        main > div {
          animation: fadeInUp 0.45s ease-out;
        }
      `}</style>
    </main>
  );
};

export default ProductDetails;
