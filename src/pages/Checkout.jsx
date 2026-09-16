import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  MapPin,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  WalletCards,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

const CART_KEY = 'agrolink_cart';

const formatNaira = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const getCart = () => {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Unable to load cart:', error);
    return [];
  }
};

const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));

  // Keep Navbar and other cart listeners synchronized.
  window.dispatchEvent(new Event('agrolink-cart-updated'));
};

const getImagePath = (imagePath) => {
  if (!imagePath) return null;

  if (Array.isArray(imagePath)) {
    return imagePath[0] || null;
  }

  if (typeof imagePath === 'string') {
    try {
      const parsed = JSON.parse(imagePath);

      if (Array.isArray(parsed)) {
        return parsed[0] || null;
      }

      if (typeof parsed === 'string') {
        return parsed;
      }
    } catch {
      // Continue with normal string handling.
    }

    if (imagePath.includes(',')) {
      return imagePath.split(',')[0].trim();
    }

    return imagePath;
  }

  return null;
};

const getProductImage = (imagePath) => {
  const path = getImagePath(imagePath);

  if (!path) return null;

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return data?.publicUrl || null;
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    userProfile,
    isLoading: authLoading,
  } = useAuth();

  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deliveryLocation, setDeliveryLocation] = useState(
    userProfile?.lga_location || ''
  );

  const [deliveryNote, setDeliveryNote] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [orderComplete, setOrderComplete] = useState(false);
  const [submittedOrderCount, setSubmittedOrderCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', {
        replace: true,
        state: {
          from: location.pathname,
        },
      });
    }
  }, [authLoading, user, navigate, location.pathname]);

  useEffect(() => {
    if (userProfile?.lga_location && !deliveryLocation) {
      setDeliveryLocation(userProfile.lga_location);
    }
  }, [userProfile, deliveryLocation]);

  useEffect(() => {
    const loadedCart = getCart();
    setCart(loadedCart);

    const handleCartUpdate = () => {
      setCart(getCart());
    };

    const handleStorage = (event) => {
      if (event.key === CART_KEY) {
        setCart(getCart());
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

  const loadCheckoutData = async (showRefresh = false) => {
    if (!user) return;

    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const currentCart = getCart();

      if (!currentCart.length) {
        setCart([]);
        setProducts([]);
        setProfiles({});
        return;
      }

      const productIds = currentCart.map((item) => item.id);

      const {
        data: productData,
        error: productError,
      } = await supabase
        .from('products')
        .select(
          `
            id,
            producer_id,
            crop_name,
            quantity,
            unit,
            price_per_unit,
            location,
            product_type,
            image_path
          `
        )
        .in('id', productIds);

      if (productError) {
        throw productError;
      }

      const producerIds = [
        ...new Set(
          (productData || [])
            .map((product) => product.producer_id)
            .filter(Boolean)
        ),
      ];

      let profileMap = {};

      if (producerIds.length) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(
            `
              id,
              full_name,
              business_name,
              farm_name,
              verification_status
            `
          )
          .in('id', producerIds);

        if (profileError) {
          console.error(
            'Producer profile loading error:',
            profileError
          );
        } else {
          profileMap = (profileData || []).reduce(
            (acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            },
            {}
          );
        }
      }

      setCart(currentCart);
      setProducts(productData || []);
      setProfiles(profileMap);
    } catch (error) {
      console.error('Checkout loading error:', error);

      toast.error(
        'Unable to load the latest product information.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCheckoutData();
    }
  }, [user]);

  const checkoutItems = useMemo(() => {
    return cart.map((cartItem) => {
      const product = products.find(
        (item) => item.id === cartItem.id
      );

      if (!product) {
        return {
          ...cartItem,
          missing: true,
          currentPrice: Number(
            cartItem.pricePerUnit || 0
          ),
          availableQuantity: 0,
          producerName:
            cartItem.producerName || 'Producer',
        };
      }

      const producer =
        profiles[product.producer_id];

      return {
        ...cartItem,
        product,
        missing: false,
        currentPrice: Number(
          product.price_per_unit || 0
        ),
        availableQuantity: Number(
          product.quantity || 0
        ),
        currentStock: Number(
          product.quantity || 0
        ),
        currentUnit: product.unit,
        currentLocation: product.location,
        currentImagePath: product.image_path,
        producerId: product.producer_id,
        producerName:
          producer?.business_name ||
          producer?.farm_name ||
          producer?.full_name ||
          cartItem.producerName ||
          'Producer',
        producerVerified:
          producer?.verification_status ===
          'approved',
      };
    });
  }, [cart, products, profiles]);

  const validation = useMemo(() => {
    const missingProducts =
      checkoutItems.filter(
        (item) => item.missing
      );

    const outOfStock =
      checkoutItems.filter(
        (item) =>
          !item.missing &&
          (Number(item.quantity) <= 0 ||
            Number(item.quantity) >
              Number(item.availableQuantity))
      );

    const priceChanged =
      checkoutItems.filter(
        (item) =>
          !item.missing &&
          Number(item.pricePerUnit) !==
            Number(item.currentPrice)
      );

    const producerChanged =
      checkoutItems.filter(
        (item) =>
          !item.missing &&
          item.producerId &&
          item.product?.producer_id !==
            item.producerId
      );

    return {
      missingProducts,
      outOfStock,
      priceChanged,
      producerChanged,
      hasIssues:
        missingProducts.length > 0 ||
        outOfStock.length > 0 ||
        priceChanged.length > 0 ||
        producerChanged.length > 0,
    };
  }, [checkoutItems]);

  const subtotal = useMemo(() => {
    return checkoutItems
      .filter((item) => !item.missing)
      .reduce(
        (total, item) =>
          total +
          Number(item.quantity || 0) *
            Number(item.currentPrice || 0),
        0
      );
  }, [checkoutItems]);

  const totalItems = useMemo(() => {
    return checkoutItems.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );
  }, [checkoutItems]);

  const producerCount = useMemo(() => {
    return new Set(
      checkoutItems
        .filter((item) => !item.missing)
        .map((item) => item.producerId)
        .filter(Boolean)
    ).size;
  }, [checkoutItems]);

  const toggleItem = (id) => {
    setExpandedItems((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const updateCartItem = (id, newQuantity) => {
    const product = products.find(
      (item) => item.id === id
    );

    if (!product) {
      toast.error(
        'This product is no longer available.'
      );
      return;
    }

    const availableQuantity = Number(
      product.quantity || 0
    );

    if (availableQuantity <= 0) {
      toast.error(
        'This product is currently out of stock.'
      );
      return;
    }

    const requestedQuantity = Math.max(
      1,
      Number(newQuantity) || 1
    );

    const nextQuantity = Math.min(
      requestedQuantity,
      availableQuantity
    );

    if (requestedQuantity > availableQuantity) {
      toast.error(
        `Only ${availableQuantity} ${product.unit || 'units'} are currently available.`
      );
    }

    const updatedCart = cart.map((item) =>
      item.id === id
        ? {
            ...item,
            quantity: nextQuantity,
            availableQuantity,
            pricePerUnit: Number(
              product.price_per_unit || 0
            ),
            producerId: product.producer_id,
            cropName: product.crop_name,
            unit: product.unit,
            location: product.location,
            imagePath: product.image_path,
            productType: product.product_type,
          }
        : item
    );

    setCart(updatedCart);
    saveCart(updatedCart);
  };

  const removeCartItem = (id) => {
    const updatedCart = cart.filter(
      (item) => item.id !== id
    );

    setCart(updatedCart);
    saveCart(updatedCart);

    toast.success(
      'Item removed from your order.'
    );
  };

  const refreshPricesAndAvailability =
    async () => {
      await loadCheckoutData(true);

      toast.success(
        'Latest prices and availability checked.'
      );
    };

  const handleSubmitOrder = async () => {
    if (!user) {
      toast.error(
        'Please log in before placing your order.'
      );

      navigate('/login', {
        state: {
          from: '/checkout',
        },
      });

      return;
    }

    if (!deliveryLocation.trim()) {
      toast.error(
        'Please enter your delivery or pickup location.'
      );
      return;
    }

    if (!checkoutItems.length) {
      toast.error('Your cart is empty.');
      navigate('/cart');
      return;
    }

    if (validation.hasIssues) {
      toast.error(
        'Some items have changed. Please review your cart before placing the order.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      /*
       * One order row is created for each product
       * in the cart.
       *
       * Orders begin with "pending".
       * Payment remains offline in V1.
       */
      const ordersToInsert =
        checkoutItems.map((item) => ({
          buyer_id: user.id,
          producer_id:
            item.product.producer_id,
          product_id: item.product.id,
          quantity: Number(item.quantity),
          total_amount:
            Number(item.quantity) *
            Number(item.currentPrice || 0),
          status: 'pending',
          delivery_location:
            deliveryNote.trim()
              ? `${deliveryLocation.trim()} — ${deliveryNote.trim()}`
              : deliveryLocation.trim(),
        }));

      const {
        data,
        error,
      } = await supabase
        .from('orders')
        .insert(ordersToInsert)
        .select('id');

      if (error) {
        throw error;
      }

      /*
       * Only clear the cart after Supabase
       * confirms successful order creation.
       */
      localStorage.removeItem(CART_KEY);

      setCart([]);

      window.dispatchEvent(
        new Event('agrolink-cart-updated')
      );

      setSubmittedOrderCount(
        data?.length ||
          ordersToInsert.length
      );

      setOrderComplete(true);

      toast.success(
        'Your order request has been submitted.'
      );
    } catch (error) {
      console.error(
        'Order submission error:',
        error
      );

      toast.error(
        error?.message ||
          'Unable to submit your order. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (
    authLoading ||
    (user && isLoading)
  ) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Preparing your order
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Checking the latest product availability
              and prices...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[75vh] max-w-2xl items-center justify-center">
          <div
            className="w-full rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl sm:p-12"
            style={{
              animation:
                'fadeInUp 0.5s ease-out',
            }}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>

            <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">
              Order Submitted
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Your order request is on its way
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              Your {submittedOrderCount}{' '}
              {submittedOrderCount === 1
                ? 'order has'
                : 'orders have'}{' '}
              been submitted successfully. The
              producer can now review the order
              and arrange payment and delivery or
              pickup with you.
            </p>

            <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">
              <div className="flex gap-3">
                <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                <div>
                  <p className="font-bold text-amber-900">
                    Payment is handled directly
                  </p>

                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    AgroLink does not collect your
                    payment online. Payment is made
                    directly with the producer according
                    to the agreed arrangement.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() =>
                  navigate('/buyer/orders')
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                View My Orders
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('/catalog')
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(18px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!cart.length) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <ShoppingBag className="h-9 w-9 text-slate-500" />
            </div>

            <h1 className="mt-6 text-2xl font-black text-slate-900">
              Your cart is empty
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Add some agricultural products to
              your cart before confirming an order.
            </p>

            <Link
              to="/catalog"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-7">
          <Link
            to="/cart"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to cart
          </Link>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <Package className="h-3.5 w-3.5" />
                Order Confirmation
              </div>

              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Complete your order
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Review your products and provide
                your delivery or pickup location.
                No online payment is required.
              </p>
            </div>

            <button
              type="button"
              onClick={
                refreshPricesAndAvailability
              }
              disabled={isRefreshing}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isRefreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Check latest prices
            </button>
          </div>
        </div>

        {/* Payment notice */}
        <div className="mb-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <WalletCards className="h-5 w-5 text-emerald-600" />
            </div>

            <div>
              <h2 className="font-bold text-emerald-950">
                How payment works
              </h2>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                AgroLink is used to place and
                manage the order. We do not collect
                payment online. After your order is
                submitted, payment is arranged
                directly with the producer.
              </p>
            </div>
          </div>
        </div>

        {/* Validation warnings */}
        {validation.hasIssues && (
          <div className="mb-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div className="min-w-0">
                <h2 className="font-bold text-amber-900">
                  Some cart details need your attention
                </h2>

                <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-800">
                  {validation.missingProducts.length >
                    0 && (
                    <li>
                      •{' '}
                      {
                        validation.missingProducts
                          .length
                      }{' '}
                      product
                      {validation.missingProducts
                        .length > 1
                        ? 's are'
                        : ' is'}{' '}
                      no longer available.
                    </li>
                  )}

                  {validation.outOfStock.length >
                    0 && (
                    <li>
                      •{' '}
                      {
                        validation.outOfStock.length
                      }{' '}
                      item
                      {validation.outOfStock
                        .length > 1
                        ? 's exceed'
                        : ' exceeds'}{' '}
                      the current available quantity.
                    </li>
                  )}

                  {validation.priceChanged.length >
                    0 && (
                    <li>
                      • The price of{' '}
                      {
                        validation.priceChanged
                          .length
                      }{' '}
                      item
                      {validation.priceChanged
                        .length > 1
                        ? 's has'
                        : ' has'}{' '}
                      changed since you added it
                      to the cart.
                    </li>
                  )}
                </ul>

                <Link
                  to="/cart"
                  className="mt-3 inline-flex text-sm font-bold text-amber-900 underline underline-offset-4"
                >
                  Review your cart
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Left */}
          <div className="space-y-6">
            {/* Delivery */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Delivery or pickup location
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Tell the producer where you
                    would like to receive or collect
                    your order.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="deliveryLocation"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Location
                </label>

                <textarea
                  id="deliveryLocation"
                  value={deliveryLocation}
                  onChange={(event) =>
                    setDeliveryLocation(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Enter your area, address, market, pickup point..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div className="mt-5">
                <label
                  htmlFor="deliveryNote"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Additional note{' '}
                  <span className="font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="deliveryNote"
                  value={deliveryNote}
                  onChange={(event) =>
                    setDeliveryNote(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="For example: preferred pickup time or directions..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                  <WalletCards className="h-5 w-5 text-blue-600" />
                </div>

                <div className="flex-1">
                  <h2 className="text-lg font-black text-slate-900">
                    Payment method
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Payment is handled directly
                    between you and the producer.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                    <WalletCards className="h-5 w-5 text-slate-600" />
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">
                      Physical / Offline Payment
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Arrange payment directly with
                      the producer.
                    </p>
                  </div>

                  <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                <strong>Important:</strong> Placing
                this order does not charge your account
                or process an online payment. The order
                total is simply the expected value of
                the products selected.
              </div>
            </section>

            {/* Products */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Your products
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {totalItems} item
                    {totalItems !== 1
                      ? 's'
                      : ''}{' '}
                    from {producerCount} producer
                    {producerCount !== 1
                      ? 's'
                      : ''}
                  </p>
                </div>

                <Link
                  to="/cart"
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                >
                  Edit cart
                </Link>
              </div>

              <div className="mt-6 divide-y divide-slate-100">
                {checkoutItems.map((item) => {
                  const imageUrl =
                    getProductImage(
                      item.currentImagePath ||
                        item.imagePath
                    );

                  const lineTotal =
                    Number(item.quantity || 0) *
                    Number(
                      item.currentPrice || 0
                    );

                  const isExpanded =
                    Boolean(
                      expandedItems[item.id]
                    );

                  return (
                    <div
                      key={item.id}
                      className="py-5 first:pt-0 last:pb-0"
                    >
                      <div className="flex gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-24 sm:w-24">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.cropName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-7 w-7 text-slate-300" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-black capitalize text-slate-900">
                                {item.cropName}
                              </h3>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                <Store className="h-3.5 w-3.5" />

                                <span className="truncate">
                                  {item.producerName}
                                </span>

                                {item.producerVerified && (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                removeCartItem(
                                  item.id
                                )
                              }
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                            <span>
                              {formatNaira(
                                item.currentPrice
                              )}{' '}
                              /{' '}
                              {item.currentUnit ||
                                item.unit}
                            </span>

                            <span>
                              Available:{' '}
                              {
                                item.availableQuantity
                              }{' '}
                              {item.currentUnit ||
                                item.unit}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCartItem(
                                    item.id,
                                    Math.max(
                                      1,
                                      Number(
                                        item.quantity
                                      ) - 1
                                    )
                                  )
                                }
                                disabled={
                                  Number(
                                    item.quantity
                                  ) <= 1
                                }
                                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Minus className="h-4 w-4" />
                              </button>

                              <span className="min-w-9 text-center text-sm font-bold text-slate-900">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateCartItem(
                                    item.id,
                                    Number(
                                      item.quantity
                                    ) + 1
                                  )
                                }
                                disabled={
                                  Number(
                                    item.quantity
                                  ) >=
                                  Number(
                                    item.availableQuantity
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="text-right">
                              <p className="text-base font-black text-slate-900">
                                {formatNaira(
                                  lineTotal
                                )}
                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleItem(
                                    item.id
                                  )
                                }
                                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
                              >
                                Details

                                {isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold text-slate-400">
                                Product type
                              </p>

                              <p className="mt-1 font-semibold capitalize text-slate-700">
                                {item.productType?.replace(
                                  '_',
                                  ' '
                                ) ||
                                  item.product?.product_type?.replace(
                                    '_',
                                    ' '
                                  ) ||
                                  'Agricultural product'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold text-slate-400">
                                Location
                              </p>

                              <p className="mt-1 font-semibold text-slate-700">
                                {item.currentLocation ||
                                  item.location ||
                                  'Not specified'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right summary */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                  <ShoppingBag className="h-5 w-5 text-emerald-600" />
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Order summary
                  </h2>

                  <p className="text-xs text-slate-500">
                    {checkoutItems.length}{' '}
                    product
                    {checkoutItems.length !== 1
                      ? 's'
                      : ''}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-b border-slate-100 pb-5 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">
                    Products
                  </span>

                  <span className="font-semibold text-slate-800">
                    {formatNaira(subtotal)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">
                    Delivery
                  </span>

                  <span className="font-semibold text-slate-600">
                    Arranged with producer
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">
                    Online payment
                  </span>

                  <span className="font-bold text-emerald-600">
                    Not required
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between gap-4 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Order total
                  </p>

                  <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                    {formatNaira(subtotal)}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {totalItems} item
                  {totalItems !== 1
                    ? 's'
                    : ''}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubmitOrder}
                disabled={
                  isSubmitting ||
                  validation.hasIssues ||
                  !deliveryLocation.trim()
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting Order...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    Place Order
                  </>
                )}
              </button>

              <div className="mt-4 flex gap-3 rounded-2xl bg-slate-50 p-4">
                <Truck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                <p className="text-xs leading-5 text-slate-500">
                  After submitting, the producer can
                  review your request and contact you
                  to arrange payment and delivery or
                  pickup.
                </p>
              </div>

              <div className="mt-5 text-center">
                <Link
                  to="/catalog"
                  className="text-xs font-bold text-slate-400 transition hover:text-emerald-600"
                >
                  Continue browsing products
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Checkout;
