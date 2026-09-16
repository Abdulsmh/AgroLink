import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  Truck,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

/*
 * -------------------------------------------------------
 * STATUS CONFIGURATION
 * -------------------------------------------------------
 */

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    description:
      'Your order has been submitted and is waiting for the producer to review it.',
    icon: Clock3,
    classes:
      'bg-amber-50 text-amber-700 border-amber-200',
    iconClass: 'text-amber-600',
  },

  confirmed: {
    label: 'Confirmed',
    description:
      'The producer has accepted your order. You can now arrange payment and delivery or pickup.',
    icon: CheckCircle2,
    classes:
      'bg-blue-50 text-blue-700 border-blue-200',
    iconClass: 'text-blue-600',
  },

  processing: {
    label: 'Processing',
    description:
      'Your producer is preparing the products for delivery or pickup.',
    icon: Package,
    classes:
      'bg-purple-50 text-purple-700 border-purple-200',
    iconClass: 'text-purple-600',
  },

  completed: {
    label: 'Completed',
    description:
      'This order has been completed.',
    icon: CheckCircle2,
    classes:
      'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconClass: 'text-emerald-600',
  },

  cancelled: {
    label: 'Cancelled',
    description:
      'This order was cancelled and will not continue through the normal order process.',
    icon: XCircle,
    classes:
      'bg-red-50 text-red-700 border-red-200',
    iconClass: 'text-red-600',
  },
};

/*
 * -------------------------------------------------------
 * FILTERS
 * -------------------------------------------------------
 */

const FILTERS = [
  {
    value: 'all',
    label: 'All Orders',
  },
  {
    value: 'pending',
    label: 'Pending',
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
  },
  {
    value: 'processing',
    label: 'Processing',
  },
  {
    value: 'completed',
    label: 'Completed',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
  },
];

/*
 * -------------------------------------------------------
 * HELPERS
 * -------------------------------------------------------
 */

const formatNaira = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsedDate);
};

const formatShortDate = (date) => {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsedDate);
};

const getImagePath = (imagePath) => {
  if (!imagePath) return null;

  if (Array.isArray(imagePath)) {
    return imagePath[0] || null;
  }

  if (typeof imagePath === 'string') {
    const value = imagePath.trim();

    if (!value) return null;

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed[0] || null;
      }

      if (typeof parsed === 'string') {
        return parsed.trim() || null;
      }
    } catch {
      // Continue with normal string handling.
    }

    if (value.includes(',')) {
      return value.split(',')[0].trim() || null;
    }

    return value;
  }

  return null;
};

const getProductImage = (imagePath) => {
  const path = getImagePath(imagePath);

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

const getProducerName = (profile) => {
  return (
    profile?.business_name ||
    profile?.farm_name ||
    profile?.full_name ||
    'Producer'
  );
};

/*
 * -------------------------------------------------------
 * ORDER TIMELINE
 * -------------------------------------------------------
 */

const getTimelineSteps = (status) => {
  const steps = [
    {
      key: 'pending',
      label: 'Order submitted',
    },
    {
      key: 'confirmed',
      label: 'Order confirmed',
    },
    {
      key: 'processing',
      label: 'Order processing',
    },
    {
      key: 'completed',
      label: 'Order completed',
    },
  ];

  if (status === 'cancelled') {
    return [
      {
        key: 'pending',
        label: 'Order submitted',
      },
      {
        key: 'cancelled',
        label: 'Order cancelled',
      },
    ];
  }

  const statusOrder = [
    'pending',
    'confirmed',
    'processing',
    'completed',
  ];

  const currentIndex = statusOrder.indexOf(status);

  return steps.map((step, index) => ({
    ...step,
    completed:
      currentIndex >= 0 && index <= currentIndex,
    current: index === currentIndex,
  }));
};

/*
 * -------------------------------------------------------
 * COMPONENT
 * -------------------------------------------------------
 */

const BuyerOrders = () => {
  const {
    user,
    isLoading: authLoading,
  } = useAuth();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [profiles, setProfiles] = useState({});

  const [activeFilter, setActiveFilter] =
    useState('all');

  const [searchTerm, setSearchTerm] =
    useState('');

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  /*
   * -------------------------------------------------------
   * LOAD ORDERS
   * -------------------------------------------------------
   */

  const loadOrders = useCallback(
    async (refresh = false) => {
      if (!user) return;

      try {
        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const {
          data: orderData,
          error: orderError,
        } = await supabase
          .from('orders')
          .select(
            `
              id,
              buyer_id,
              producer_id,
              product_id,
              quantity,
              total_amount,
              status,
              delivery_location,
              created_at,
              updated_at
            `
          )
          .eq('buyer_id', user.id)
          .order('created_at', {
            ascending: false,
          });

        if (orderError) {
          throw orderError;
        }

        const safeOrders = orderData || [];

        /*
         * Collect unique product IDs.
         */
        const productIds = [
          ...new Set(
            safeOrders
              .map((order) => order.product_id)
              .filter(Boolean)
          ),
        ];

        /*
         * Collect unique producer IDs.
         */
        const producerIds = [
          ...new Set(
            safeOrders
              .map((order) => order.producer_id)
              .filter(Boolean)
          ),
        ];

        let productMap = {};
        let profileMap = {};

        /*
         * ---------------------------------------------------
         * LOAD PRODUCTS
         * ---------------------------------------------------
         */

        if (productIds.length) {
          const {
            data: productData,
            error: productError,
          } = await supabase
            .from('products')
            .select(
              `
                id,
                crop_name,
                unit,
                price_per_unit,
                location,
                product_type,
                image_path
              `
            )
            .in('id', productIds);

          if (productError) {
            console.error(
              'Product loading error:',
              productError
            );
          } else {
            productMap = (
              productData || []
            ).reduce((acc, product) => {
              acc[product.id] = product;
              return acc;
            }, {});
          }
        }

        /*
         * ---------------------------------------------------
         * LOAD PRODUCER PROFILES
         * ---------------------------------------------------
         */

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
                phone_number,
                lga_location,
                verification_status
              `
            )
            .in('id', producerIds);

          if (profileError) {
            console.error(
              'Producer loading error:',
              profileError
            );
          } else {
            profileMap = (
              profileData || []
            ).reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {});
          }
        }

        setOrders(safeOrders);
        setProducts(productMap);
        setProfiles(profileMap);

        if (refresh) {
          toast.success('Orders refreshed.');
        }
      } catch (error) {
        console.error(
          'Buyer orders loading error:',
          error
        );

        toast.error(
          'Unable to load your orders.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user]
  );

  /*
   * -------------------------------------------------------
   * INITIAL LOAD
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (!user) return;

    loadOrders();
  }, [user, loadOrders]);

  /*
   * -------------------------------------------------------
   * REALTIME ORDERS
   * -------------------------------------------------------
   */

  useEffect(() => {
    if (!user) return undefined;

    const channel = supabase
      .channel(`buyer-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          loadOrders(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadOrders]);

  /*
   * -------------------------------------------------------
   * ENRICH ORDERS
   * -------------------------------------------------------
   */

  const enrichedOrders = useMemo(() => {
    return orders.map((order) => {
      const product =
        products[order.product_id];

      const producer =
        profiles[order.producer_id];

      return {
        ...order,

        product,

        producer,

        producerName:
          getProducerName(producer),

        imageUrl:
          getProductImage(
            product?.image_path
          ),

        /*
         * Product may have been deleted after
         * the order was placed.
         */
        productUnavailable:
          !product,
      };
    });
  }, [
    orders,
    products,
    profiles,
  ]);

  /*
   * -------------------------------------------------------
   * FILTER ORDERS
   * -------------------------------------------------------
   */

  const filteredOrders = useMemo(() => {
    const search =
      searchTerm.trim().toLowerCase();

    return enrichedOrders.filter((order) => {
      const matchesStatus =
        activeFilter === 'all' ||
        order.status === activeFilter;

      if (!search) {
        return matchesStatus;
      }

      const searchableText = [
        order.id,
        order.product?.crop_name,
        order.producerName,
        order.product?.location,
        order.delivery_location,
        order.status,
        order.product?.product_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        matchesStatus &&
        searchableText.includes(search)
      );
    });
  }, [
    enrichedOrders,
    activeFilter,
    searchTerm,
  ]);

  /*
   * -------------------------------------------------------
   * STATS
   * -------------------------------------------------------
   */

  const stats = useMemo(() => {
    const total = orders.length;

    const pending = orders.filter(
      (order) =>
        order.status === 'pending'
    ).length;

    /*
     * Pending is intentionally included in
     * active orders.
     */
    const active = orders.filter((order) =>
      [
        'pending',
        'confirmed',
        'processing',
      ].includes(order.status)
    ).length;

    const completed = orders.filter(
      (order) =>
        order.status === 'completed'
    ).length;

    const cancelled = orders.filter(
      (order) =>
        order.status === 'cancelled'
    ).length;

    /*
     * This is the value of non-cancelled
     * orders recorded in the database.
     */
    const totalValue = orders
      .filter(
        (order) =>
          order.status !== 'cancelled'
      )
      .reduce(
        (total, order) =>
          total +
          Number(order.total_amount || 0),
        0
      );

    return {
      total,
      pending,
      active,
      completed,
      cancelled,
      totalValue,
    };
  }, [orders]);

  /*
   * -------------------------------------------------------
   * LOADING STATE
   * -------------------------------------------------------
   */

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            </div>

            <h2 className="text-lg font-black text-slate-900">
              Loading your orders
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Getting the latest order information...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /*
   * -------------------------------------------------------
   * NOT LOGGED IN
   * -------------------------------------------------------
   */

  if (!user) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />

          <h2 className="mt-4 text-xl font-black text-slate-900">
            Please log in
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            You need to be logged in to view your orders.
          </p>

          <Link
            to="/login"
            className="mt-5 inline-flex rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Go to Login
          </Link>
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
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================== */}

        <div className="mb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                to="/catalog"
                className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Continue shopping
              </Link>

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <ShoppingBag className="h-3.5 w-3.5" />
                Buyer Portal
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                My Orders
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Track your orders, review their status,
                and manage your arrangements with producers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadOrders(true)}
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

              Refresh Orders
            </button>
          </div>
        </div>

        {/* =================================================
            PAYMENT NOTICE
        ================================================== */}

        <div className="mb-7 rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
          <div className="flex gap-3">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

            <div>
              <p className="font-bold text-blue-950">
                Payment is handled directly with producers
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                AgroLink records and manages your order,
                but does not collect payment online.
                Once a producer confirms your order,
                you can arrange payment and delivery or
                pickup directly with them.
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            STATS
        ================================================== */}

        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Total Orders
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600">
              Pending
            </p>

            <p className="mt-2 text-2xl font-black text-amber-900">
              {stats.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Active
            </p>

            <p className="mt-2 text-2xl font-black text-blue-900">
              {stats.active}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Completed
            </p>

            <p className="mt-2 text-2xl font-black text-emerald-900">
              {stats.completed}
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-red-600">
              Cancelled
            </p>

            <p className="mt-2 text-2xl font-black text-red-900">
              {stats.cancelled}
            </p>
          </div>
        </div>

        {/* =================================================
            ORDER VALUE
        ================================================== */}

        {stats.totalValue > 0 && (
          <div className="mb-7 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Recorded order value
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Total value of non-cancelled orders.
                </p>
              </div>

              <p className="text-2xl font-black text-emerald-700">
                {formatNaira(stats.totalValue)}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            SEARCH + FILTER
        ================================================== */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search by product, producer, location or order..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((filter) => {
                const isActive =
                  activeFilter ===
                  filter.value;

                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setActiveFilter(
                        filter.value
                      )
                    }
                    className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* =================================================
            ORDER LIST
        ================================================== */}

        {filteredOrders.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
              <Package className="h-9 w-9 text-slate-400" />
            </div>

            <h2 className="mt-6 text-2xl font-black text-slate-900">
              {orders.length === 0
                ? 'No orders yet'
                : 'No matching orders'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {orders.length === 0
                ? 'When you place an order from the AgroLink marketplace, it will appear here.'
                : 'Try changing the status filter or search term.'}
            </p>

            {orders.length === 0 && (
              <Link
                to="/catalog"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                Browse Products
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const status =
                STATUS_CONFIG[
                  order.status
                ] ||
                STATUS_CONFIG.pending;

              const StatusIcon =
                status.icon;

              return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">

                      {/* PRODUCT */}
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-24 sm:w-24">
                          {order.imageUrl ? (
                            <img
                              src={order.imageUrl}
                              alt={
                                order.product
                                  ?.crop_name ||
                                'Product'
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-7 w-7 text-slate-300" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-black capitalize text-slate-900">
                              {order.product
                                ?.crop_name ||
                                'Product unavailable'}
                            </h2>

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${status.classes}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />

                              {status.label}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <Store className="h-3.5 w-3.5" />

                              {order.producerName}
                            </span>

                            <span>
                              Order #
                              {order.id
                                .slice(
                                  0,
                                  8
                                )
                                .toUpperCase()}
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-slate-400">
                            Placed{' '}
                            {formatDate(
                              order.created_at
                            )}
                          </p>

                          {order.productUnavailable && (
                            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Product listing is no longer available
                            </p>
                          )}
                        </div>
                      </div>

                      {/* AMOUNT */}
                      <div className="lg:min-w-[180px] lg:text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Order total
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-900">
                          {formatNaira(
                            order.total_amount
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {order.quantity}{' '}
                          {order.product?.unit ||
                            'unit'}
                          {Number(
                            order.quantity
                          ) !== 1
                            ? 's'
                            : ''}
                        </p>
                      </div>

                      {/* ACTION */}
                      <div className="lg:min-w-[150px]">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedOrder(
                              order
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                    {/* DELIVERY */}
                    <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            Delivery / Pickup
                          </p>

                          <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                            {order.delivery_location ||
                              'Not specified'}
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 text-xs text-slate-500 sm:text-right">
                        {status.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =================================================
            ORDER DETAILS MODAL
        ================================================== */}

        {selectedOrder && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setSelectedOrder(null);
              }
            }}
          >
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              
              {/* MODAL HEADER */}
              <div className="border-b border-slate-100 p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                      Order Details
                    </span>

                    <h2 className="mt-2 text-2xl font-black text-slate-900">
                      #
                      {selectedOrder.id
                        .slice(
                          0,
                          8
                        )
                        .toUpperCase()}
                    </h2>

                    <p className="mt-1 text-xs text-slate-400">
                      Placed{' '}
                      {formatDate(
                        selectedOrder.created_at
                      )}
                    </p>
                  </div>

                  {(() => {
                    const status =
                      STATUS_CONFIG[
                        selectedOrder.status
                      ] ||
                      STATUS_CONFIG.pending;

                    const StatusIcon =
                      status.icon;

                    return (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${status.classes}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />

                        {status.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-7 p-5 sm:p-7">

                {/* PRODUCT */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">
                    Product
                  </h3>

                  <div className="mt-3 flex gap-4 rounded-2xl bg-slate-50 p-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white">
                      {selectedOrder.imageUrl ? (
                        <img
                          src={
                            selectedOrder.imageUrl
                          }
                          alt={
                            selectedOrder
                              .product
                              ?.crop_name ||
                            'Product'
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-7 w-7 text-slate-300" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-lg font-black capitalize text-slate-900">
                        {selectedOrder
                          .product
                          ?.crop_name ||
                          'Product unavailable'}
                      </h4>

                      <p className="mt-1 text-sm text-slate-500">
                        Quantity:{' '}
                        {selectedOrder.quantity}{' '}
                        {selectedOrder
                          .product?.unit ||
                          'unit'}
                      </p>

                      {selectedOrder
                        .product
                        ?.product_type && (
                        <p className="mt-1 text-xs font-semibold capitalize text-emerald-600">
                          {selectedOrder.product.product_type.replace(
                            '_',
                            ' '
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedOrder.productUnavailable && (
                    <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm text-orange-800">
                      This product listing is no longer
                      available in the marketplace. Your
                      order record is still preserved.
                    </div>
                  )}
                </div>

                {/* PRODUCER */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">
                    Producer
                  </h3>

                  <div className="mt-3 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                        <Store className="h-5 w-5 text-emerald-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">
                          {selectedOrder.producerName}
                        </p>

                        <p className="text-sm text-slate-500">
                          {selectedOrder
                            .producer
                            ?.lga_location ||
                            selectedOrder
                              .product
                              ?.location ||
                            'Location not specified'}
                        </p>
                      </div>

                      {selectedOrder
                        .producer
                        ?.verification_status ===
                        'approved' && (
                        <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified
                        </span>
                      )}
                    </div>

                    {selectedOrder.producer
                      ?.phone_number && (
                      <a
                        href={`tel:${selectedOrder.producer.phone_number}`}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Phone className="h-4 w-4" />

                        {selectedOrder.producer.phone_number}
                      </a>
                    )}
                  </div>
                </div>

                {/* ORDER TIMELINE */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">
                    Order progress
                  </h3>

                  <div className="mt-4 space-y-0">
                    {getTimelineSteps(
                      selectedOrder.status
                    ).map(
                      (
                        step,
                        index,
                        timeline
                      ) => {
                        const isLast =
                          index ===
                          timeline.length - 1;

                        const isCancelled =
                          step.key ===
                          'cancelled';

                        return (
                          <div
                            key={step.key}
                            className="flex gap-3"
                          >
                            <div className="flex flex-col items-center">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                  isCancelled
                                    ? 'bg-red-100 text-red-600'
                                    : step.completed
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-slate-100 text-slate-400'
                                }`}
                              >
                                {isCancelled ? (
                                  <XCircle className="h-4 w-4" />
                                ) : step.completed ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Clock3 className="h-4 w-4" />
                                )}
                              </div>

                              {!isLast && (
                                <div
                                  className={`my-1 h-8 w-px ${
                                    step.completed
                                      ? 'bg-emerald-200'
                                      : 'bg-slate-200'
                                  }`}
                                />
                              )}
                            </div>

                            <div className="pb-6">
                              <p
                                className={`text-sm font-bold ${
                                  step.completed
                                    ? 'text-slate-900'
                                    : 'text-slate-400'
                                }`}
                              >
                                {step.label}
                              </p>

                              {step.current && (
                                <p className="mt-1 text-xs text-emerald-600">
                                  Current status
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* DELIVERY */}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-slate-400">
                    Delivery / Pickup
                  </h3>

                  <div className="mt-3 flex gap-3 rounded-2xl bg-slate-50 p-4">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                    <div>
                      <p className="text-sm leading-6 text-slate-700">
                        {selectedOrder.delivery_location ||
                          'No delivery or pickup location provided.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* PAYMENT */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <Truck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                    <div>
                      <p className="font-bold text-blue-950">
                        Payment arrangement
                      </p>

                      <p className="mt-1 text-sm leading-6 text-blue-800">
                        AgroLink does not collect payment
                        online. Payment is arranged directly
                        with the producer after the order is
                        reviewed and confirmed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* TOTAL */}
                <div className="rounded-2xl bg-slate-50 p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Recorded order total
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-900">
                        {formatNaira(
                          selectedOrder.total_amount
                        )}
                      </p>
                    </div>

                    <p className="text-right text-xs leading-5 text-slate-400">
                      {selectedOrder.updated_at &&
                        selectedOrder.updated_at !==
                          selectedOrder.created_at
                        ? `Updated ${formatShortDate(
                            selectedOrder.updated_at
                          )}`
                        : `Placed ${formatShortDate(
                            selectedOrder.created_at
                          )}`}
                    </p>
                  </div>
                </div>

                {/* CANCEL LIMITATION */}
                {selectedOrder.status ===
                  'pending' && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                      <div>
                        <p className="font-bold text-amber-950">
                          Need to change this order?
                        </p>

                        <p className="mt-1 text-sm leading-6 text-amber-800">
                          Buyer-side order cancellation is not
                          currently available in AgroLink. If
                          you need to make a change, contact the
                          producer directly using the available
                          contact information.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* CLOSE */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedOrder(null)
                  }
                  className="w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
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

        .min-h-screen > div {
          animation: fadeInUp 0.45s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BuyerOrders;