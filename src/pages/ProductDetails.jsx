
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

const CART_KEY = 'agrolink_cart';
const CART_EVENT = 'agrolink-cart-updated';

const formatNaira = (value) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const getImagePaths = (imagePath) => {
  if (!imagePath) return [];

  if (Array.isArray(imagePath)) {
    return imagePath.filter(
      (item) => typeof item === 'string' && item.trim()
    );
  }

  if (typeof imagePath !== 'string') return [];

  const value = imagePath.trim();
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) => typeof item === 'string' && item.trim()
      );
    }

    if (typeof parsed === 'string' && parsed.trim()) {
      return [parsed.trim()];
    }
  } catch {
    // Support older comma-separated image paths.
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const getStorageUrl = (path) => {
  if (typeof path !== 'string' || !path.trim()) {
    return null;
  }

  const value = path.trim();

  if (/^(https?:\/\/|data:)/i.test(value)) {
    return value;
  }

  const cleanPath = value
    .replace(/^\/+/, '')
    .replace(/^product-images\//, '');

  if (!cleanPath) return null;

  const { data, error } = supabase.storage
    .from('product-images')
    .getPublicUrl(cleanPath);

  if (error) {
    console.error('Could not resolve product image:', error.message);
  }

  return data?.publicUrl || null;
};

const getCart = () => {
  try {
    const storedCart = localStorage.getItem(CART_KEY);

    if (!storedCart) return [];

    const parsedCart = JSON.parse(storedCart);

    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch (error) {
    console.error('Could not read AgroLink cart:', error);
    return [];
  }
};

const getCartQuantity = (cart) =>
  cart.reduce((total, item) => {
    const quantity = Number(item?.quantity);

    return total + (
      Number.isFinite(quantity) && quantity > 0
        ? quantity
        : 0
    );
  }, 0);

const ProductDetails = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const requestIdRef = useRef(0);

  const [product, setProduct] = useState(null);
  const [producer, setProducer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartCount, setCartCount] = useState(0);
  const [failedImages, setFailedImages] = useState({});

  const loadCartCount = useCallback(() => {
    setCartCount(getCartQuantity(getCart()));
  }, []);

  const fetchProduct = useCallback(
    async (showRefresh = false) => {
      if (!productId) {
        setError('A product ID was not provided.');
        setProduct(null);
        setProducer(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const currentRequestId = ++requestIdRef.current;

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const {
          data: productData,
          error: productError,
        } = await supabase
          .from('products')
          .select(`
            id,
            producer_id,
            crop_name,
            description,
            quantity,
            unit,
            price_per_unit,
            location,
            image_path,
            product_type,
            created_at
          `)
          .eq('id', productId)
          .maybeSingle();

        if (currentRequestId !== requestIdRef.current) return;

        if (productError) throw productError;

        if (!productData) {
          throw new Error(
            'This product could not be found or may have been removed.'
          );
        }

        setProduct(productData);
        setProducer(null);

        if (productData.producer_id) {
          // Try the extended profile first. Some deployments may not
          // contain every optional farm/business column.
          let producerData = null;

          const extendedProfile = await supabase
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

          if (currentRequestId !== requestIdRef.current) return;

          if (extendedProfile.error) {
            console.warn(
              'Extended producer profile unavailable; trying basic profile:',
              extendedProfile.error.message
            );

            const basicProfile = await supabase
              .from('profiles')
              .select(`
                id,
                full_name,
                role,
                phone_number,
                lga_location,
                verification_status
              `)
              .eq('id', productData.producer_id)
              .maybeSingle();

            if (currentRequestId !== requestIdRef.current) return;

            if (basicProfile.error) {
              console.error(
                'Could not load producer profile:',
                basicProfile.error.message
              );
            } else {
              producerData = basicProfile.data;
            }
          } else {
            producerData = extendedProfile.data;
          }

          setProducer(producerData || null);
        }

        setSelectedImage(0);
        setFailedImages({});

        const stock = Math.max(
          0,
          Number(productData.quantity) || 0
        );

        setQuantity((current) => {
          if (stock <= 0) return 1;

          return Math.min(
            Math.max(Number(current) || 1, 0.01),
            stock
          );
        });
      } catch (fetchError) {
        if (currentRequestId !== requestIdRef.current) return;

        console.error('Product details error:', fetchError);

        setError(
          fetchError?.message ||
            'We could not load this product. Please try again.'
        );

        setProduct(null);
        setProducer(null);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [productId]
  );

  useEffect(() => {
    fetchProduct();
    loadCartCount();

    if (!productId) return undefined;

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
        () => fetchProduct(true)
      )
      .subscribe();

    return () => {
      requestIdRef.current += 1;
      supabase.removeChannel(channel);
    };
  }, [productId, fetchProduct, loadCartCount]);

  useEffect(() => {
    const handleCartUpdate = () => loadCartCount();

    const handleStorage = (event) => {
      if (event.key === CART_KEY || event.key === null) {
        loadCartCount();
      }
    };

    window.addEventListener(CART_EVENT, handleCartUpdate);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(CART_EVENT, handleCartUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadCartCount]);

  const imageUrls = useMemo(
    () =>
      getImagePaths(product?.image_path)
        .map(getStorageUrl)
        .filter(Boolean),
    [product?.image_path]
  );

  const availableQuantity = Math.max(
    0,
    Number(product?.quantity) || 0
  );

  const pricePerUnit = Math.max(
    0,
    Number(product?.price_per_unit) || 0
  );

  const minimumQuantity =
    availableQuantity > 0
      ? Math.min(0.01, availableQuantity)
      : 1;

  const safeQuantity = Math.min(
    availableQuantity > 0 ? availableQuantity : 1,
    Math.max(minimumQuantity, Number(quantity) || minimumQuantity)
  );

  const totalPrice = pricePerUnit * safeQuantity;
  const isPreHarvest = product?.product_type === 'pre_harvest';
  const productTypeLabel = isPreHarvest ? 'Pre-Harvest' : 'Post-Harvest';
  const isOutOfStock = availableQuantity <= 0;
  const isLowStock =
    availableQuantity > 0 && availableQuantity <= 10;

  const producerName =
    producer?.business_name ||
    producer?.farm_name ||
    producer?.full_name ||
    'AgroLink Producer';

  const producerVerified =
    producer?.verification_status === 'approved';

  const decreaseQuantity = () => {
    setQuantity((current) =>
      Math.max(
        minimumQuantity,
        Math.round((Number(current) - 1) * 100) / 100
      )
    );
  };

  const increaseQuantity = () => {
    if (isOutOfStock) return;

    setQuantity((current) =>
      Math.min(
        availableQuantity,
        Math.round((Number(current) + 1) * 100) / 100
      )
    );
  };

  const handleQuantityInput = (event) => {
    const rawValue = event.target.value;

    if (rawValue === '') {
      setQuantity('');
      return;
    }

    const value = Number(rawValue);

    if (!Number.isFinite(value)) return;

    setQuantity(
      Math.min(
        availableQuantity,
        Math.max(minimumQuantity, value)
      )
    );
  };

  const addToCart = (redirectToCheckout = false) => {
    if (!product) {
      toast.error('Product information is unavailable.');
      return;
    }

    if (isOutOfStock) {
      toast.error('This product is currently out of stock.');
      return;
    }

    const selectedQuantity = Number(quantity);

    if (
      !Number.isFinite(selectedQuantity) ||
      selectedQuantity <= 0 ||
      selectedQuantity > availableQuantity
    ) {
      toast.error('Please select a valid quantity.');
      return;
    }

    try {
      const cart = getCart();

      const existingIndex = cart.findIndex(
        (item) => String(item?.id) === String(product.id)
      );

      const cartItem = {
        id: product.id,
        producerId: product.producer_id,
        cropName: product.crop_name,
        quantity: selectedQuantity,
        availableQuantity,
        unit: product.unit,
        pricePerUnit,
        location: product.location,
        description: product.description || '',
        imagePath: product.image_path,
        productType: product.product_type,
        producerName,
      };

      if (existingIndex !== -1) {
        const existingItem = cart[existingIndex];
        const parsedExistingQuantity = Number(existingItem?.quantity);

        const existingQuantity =
          Number.isFinite(parsedExistingQuantity) &&
          parsedExistingQuantity > 0
            ? parsedExistingQuantity
            : 0;

        const newQuantity = existingQuantity + selectedQuantity;

        if (newQuantity > availableQuantity) {
          const remaining = Math.max(
            0,
            availableQuantity - existingQuantity
          );

          toast.error(
            remaining > 0
              ? `You can add only ${formatNumber(remaining)} more ${product.unit || 'units'}.`
              : 'Your cart already contains the available stock for this product.'
          );

          return;
        }

        cart[existingIndex] = {
          ...existingItem,
          ...cartItem,
          quantity: newQuantity,
        };
      } else {
        cart.push(cartItem);
      }

      localStorage.setItem(CART_KEY, JSON.stringify(cart));

      loadCartCount();
      window.dispatchEvent(new Event(CART_EVENT));

      toast.success(`${product.crop_name} added to your cart.`);

      if (redirectToCheckout) {
        navigate('/checkout');
      }
    } catch (cartError) {
      console.error('Add to cart error:', cartError);
      toast.error('Could not update your cart. Please try again.');
    }
  };

  const showPreviousImage = () => {
    if (imageUrls.length <= 1) return;

    setSelectedImage((current) =>
      current <= 0 ? imageUrls.length - 1 : current - 1
    );
  };

  const showNextImage = () => {
    if (imageUrls.length <= 1) return;

    setSelectedImage((current) =>
      current >= imageUrls.length - 1 ? 0 : current + 1
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl animate-pulse space-y-8">
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
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <AlertCircle className="mx-auto mb-5 h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-bold text-slate-900">
            Product unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {error || 'This product could not be found or may have been removed.'}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => fetchProduct()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <Link
            to="/cart"
            className="relative inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-bold text-white">
                {cartCount > 99 ? '99+' : formatNumber(cartCount)}
              </span>
            )}
          </Link>
        </div>

        {refreshing && (
          <div className="mb-4 flex items-center gap-2 text-xs font-medium text-emerald-700" role="status">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Updating product information...
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-square overflow-hidden bg-slate-100">
                {imageUrls.length > 0 && !failedImages[imageUrls[selectedImage]] ? (
                  <img
                    src={imageUrls[selectedImage]}
                    alt={product.crop_name || 'Agricultural product'}
                    onError={() =>
                      setFailedImages((current) => ({
                        ...current,
                        [imageUrls[selectedImage]]: true,
                      }))
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-20 w-20 text-slate-300" />
                  </div>
                )}

                <span className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ${
                  isPreHarvest
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {productTypeLabel}
                </span>

                {producerVerified && (
                  <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">
                    <ShieldCheck className="h-4 w-4" />
                    Verified Producer
                  </span>
                )}

                {imageUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={showPreviousImage}
                      aria-label="Previous product image"
                      className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={showNextImage}
                      aria-label="Next product image"
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                      {selectedImage + 1} / {imageUrls.length}
                    </span>
                  </>
                )}
              </div>

              {imageUrls.length > 1 && (
                <div className="flex gap-3 overflow-x-auto p-4">
                  {imageUrls.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      aria-label={`View product image ${index + 1}`}
                      aria-pressed={selectedImage === index}
                      className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 ${
                        selectedImage === index
                          ? 'border-emerald-600 ring-2 ring-emerald-100'
                          : 'border-slate-200'
                      }`}
                    >
                      {!failedImages[image] ? (
                        <img
                          src={image}
                          alt={`${product.crop_name || 'Product'} ${index + 1}`}
                          onError={() =>
                            setFailedImages((current) => ({
                              ...current,
                              [image]: true,
                            }))
                          }
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="mx-auto h-8 w-8 text-slate-300" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
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
                  {formatNumber(availableQuantity)} {product.unit || 'units'} available
                </span>
              </div>
            </div>

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

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Store className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-slate-900">{producerName}</h2>
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
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {producer.lga_location}
                      </span>
                    )}
                    {producer?.farm_type && <span>{producer.farm_type}</span>}
                    {producer?.business_name &&
                      producer.business_name !== producerName && (
                        <span>{producer.business_name}</span>
                      )}
                    {producer?.farm_location && <span>{producer.farm_location}</span>}
                  </div>

                  {!producer && (
                    <p className="mt-2 text-xs text-slate-500">
                      Producer profile details are currently unavailable.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">Quantity</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Select how much you want to order.
                  </p>
                </div>

                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={decreaseQuantity}
                    disabled={Number(quantity) <= minimumQuantity || isOutOfStock}
                    aria-label="Decrease quantity"
                    className="flex h-11 w-11 items-center justify-center rounded-l-xl text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <input
                    type="number"
                    min={minimumQuantity}
                    max={availableQuantity}
                    step="any"
                    value={quantity}
                    onChange={handleQuantityInput}
                    onBlur={() => {
                      if (quantity === '' || !Number.isFinite(Number(quantity))) {
                        setQuantity(minimumQuantity);
                      }
                    }}
                    disabled={isOutOfStock}
                    aria-label="Product quantity"
                    className="h-11 w-20 border-x border-slate-200 bg-white text-center text-sm font-bold text-slate-900 outline-none"
                  />

                  <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={Number(quantity) >= availableQuantity || isOutOfStock}
                    aria-label="Increase quantity"
                    className="flex h-11 w-11 items-center justify-center rounded-r-xl text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="my-5 border-t border-slate-100 pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Estimated total
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatNumber(safeQuantity)} × {formatNaira(pricePerUnit)}
                    </p>
                  </div>
                  <p className="text-2xl font-black text-emerald-700">
                    {formatNaira(totalPrice)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => addToCart(false)}
                  disabled={isOutOfStock}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart
                </button>
                <button
                  type="button"
                  onClick={() => addToCart(true)}
                  disabled={isOutOfStock}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
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
                  Your order will be validated at checkout.
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-sm font-bold text-slate-900">Trusted Listing</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Product information is supplied through the AgroLink marketplace.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <Truck className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-sm font-bold text-slate-900">Pickup Arrangements</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Collection arrangements are confirmed during the order process.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="mt-3 text-sm font-bold text-slate-900">Clear Ordering</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Availability and price must be validated before an order is placed.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Product Information
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              About this listing
            </h2>
          </div>

          {product.description && (
            <div className="mb-6 rounded-2xl bg-slate-50 p-5">
              <h3 className="text-sm font-bold text-slate-900">
                Product description
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                {product.description}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Crop</p>
              <p className="mt-2 font-bold capitalize text-slate-900">{product.crop_name}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Available</p>
              <p className="mt-2 font-bold text-slate-900">
                {formatNumber(availableQuantity)} {product.unit || 'units'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Product Type</p>
              <p className="mt-2 font-bold text-slate-900">{productTypeLabel}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Location</p>
              <p className="mt-2 font-bold text-slate-900">
                {product.location || 'Not specified'}
              </p>
            </div>
          </div>

          {product.created_at && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-400">
                Listed on{' '}
                {new Date(product.created_at).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h3 className="font-bold text-amber-900">Payment and collection</h3>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                AgroLink helps buyers and producers create and manage orders.
                Payment is arranged directly between the buyer and producer
                rather than collected online by AgroLink. Collection arrangements
                are confirmed during the order process.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 flex justify-center">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-700"
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
