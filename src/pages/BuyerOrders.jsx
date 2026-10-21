
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
  X,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    description: 'Waiting for the producer to review your order.',
    className: 'bg-amber-100 text-amber-800',
    icon: Clock3,
  },
  confirmed: {
    label: 'Confirmed',
    description: 'The producer has accepted your order.',
    className: 'bg-blue-100 text-blue-800',
    icon: CheckCircle2,
  },
  processing: {
    label: 'Processing',
    description: 'The producer is preparing your products. Confirm collection after you receive them.',
    className: 'bg-purple-100 text-purple-800',
    icon: Package,
  },
  completed: {
    label: 'Completed',
    description: 'Collection has been confirmed and the order is completed.',
    className: 'bg-emerald-100 text-emerald-800',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This order has been cancelled.',
    className: 'bg-red-100 text-red-800',
    icon: XCircle,
  },
};

const FILTERS = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const formatNaira = (amount) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatShortDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getImagePath = (imagePath) => {
  if (!imagePath) return null;

  let image = imagePath;

  if (Array.isArray(image)) {
    image = image[0];
  }

  if (typeof image === 'string') {
    try {
      const parsed = JSON.parse(image);

      if (Array.isArray(parsed)) {
        image = parsed[0];
      } else if (parsed && typeof parsed === 'object') {
        image =
          parsed.url ||
          parsed.path ||
          parsed.image ||
          parsed.image_path;
      } else {
        image = parsed;
      }
    } catch {
      // The image value may already be a path or URL.
    }
  }

  if (typeof image !== 'string' || !image.trim()) return null;

  return image.trim();
};

const getProductImage = (imagePath) => {
  const path = getImagePath(imagePath);

  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const cleanPath = path
    .replace(/^\/+/, '')
    .replace(/^product-images\//, '');

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(cleanPath);

  return data?.publicUrl || null;
};

const getProducerName = (producer) => {
  if (!producer) return 'AgroLink Producer';

  return (
    producer.business_name ||
    producer.farm_name ||
    producer.full_name ||
    'AgroLink Producer'
  );
};

const getTimelineSteps = (status) => {
  if (status === 'cancelled') {
    return [
      {
        label: 'Order placed',
        description: 'Your order was submitted.',
        complete: true,
      },
      {
        label: 'Order cancelled',
        description: 'This order was cancelled.',
        complete: true,
        cancelled: true,
      },
    ];
  }

  const steps = [
    {
      label: 'Order placed',
      description: 'Your order was submitted.',
    },
    {
      label: 'Order confirmed',
      description: 'The producer accepted your order.',
    },
    {
      label: 'Preparing products',
      description: 'The producer is preparing your products.',
    },
    {
      label: 'Collection confirmed',
      description: 'The order is completed after you confirm receipt.',
    },
  ];

  const completedSteps = {
    pending: 1,
    confirmed: 2,
    processing: 3,
    completed: 4,
  };

  const count = completedSteps[status] || 1;

  return steps.map((step, index) => ({
    ...step,
    complete: index < count,
    current: index === count - 1 && status !== 'completed',
  }));
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function EmptyState({ filter, searchTerm }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />

      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        No orders found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
        {searchTerm
          ? 'Try another search term.'
          : filter === 'all'
            ? 'Your orders will appear here when you place an order.'
            : `You do not have any ${filter} orders right now.`}
      </p>

      <Link
        to="/catalog"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        <ShoppingBag className="h-4 w-4" />
        Browse Products
      </Link>
    </div>
  );
}

function OrderTimeline({ status }) {
  const steps = getTimelineSteps(status);

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={`${step.label}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                step.cancelled
                  ? 'bg-red-100 text-red-600'
                  : step.complete
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {step.cancelled ? (
                <XCircle className="h-4 w-4" />
              ) : step.complete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Clock3 className="h-4 w-4" />
              )}
            </div>

            {index < steps.length - 1 && (
              <div className="my-1 min-h-5 w-px flex-1 bg-gray-200" />
            )}
          </div>

          <div className="pb-2">
            <p
              className={`text-sm font-semibold ${
                step.current ? 'text-emerald-700' : 'text-gray-900'
              }`}
            >
              {step.label}
              {step.current ? ' (Current)' : ''}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              {step.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CollectionConfirmationDialog({
  order,
  loading,
  onCancel,
  onConfirm,
}) {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-confirmation-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-6 w-6 text-emerald-700" />
        </div>

        <h2
          id="collection-confirmation-title"
          className="mt-4 text-xl font-bold text-gray-900"
        >
          Confirm collection?
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Confirm only if you have physically received your
          products from the producer. This will mark the order
          as completed.
        </p>

        <div className="mt-4 rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Order reference</p>
          <p className="mt-1 break-all text-sm font-semibold text-gray-900">
            {order.id}
          </p>

          <p className="mt-3 text-xs text-gray-500">Order total</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">
            {formatNaira(order.total_amount)}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Not Yet
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Yes, I Received It
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BuyerOrders() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [confirmingOrderId, setConfirmingOrderId] = useState(null);
  const [showCollectionConfirmation, setShowCollectionConfirmation] =
    useState(false);

  const loadOrders = useCallback(
    async (refresh = false) => {
      if (!user?.id) {
        setOrders([]);
        setProducts([]);
        setProfiles([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(
            [
              'id',
              'buyer_id',
              'producer_id',
              'product_id',
              'quantity',
              'total_amount',
              'status',
              'delivery_location',
              'created_at',
              'updated_at',
            ].join(', ')
          )
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });

        if (orderError) throw orderError;

        const safeOrders = orderData || [];
        setOrders(safeOrders);

        const productIds = [
          ...new Set(
            safeOrders
              .map((order) => order.product_id)
              .filter(Boolean)
          ),
        ];

        const producerIds = [
          ...new Set(
            safeOrders
              .map((order) => order.producer_id)
              .filter(Boolean)
          ),
        ];

        let productData = [];
        let profileData = [];

        if (productIds.length > 0) {
          const { data, error } = await supabase
            .from('products')
            .select(
              'id, crop_name, unit, price_per_unit, location, product_type, image_path, description'
            )
            .in('id', productIds);

          if (error) throw error;
          productData = data || [];
        }

        if (producerIds.length > 0) {
          const { data, error } = await supabase
            .from('profiles')
            .select(
              'id, full_name, business_name, farm_name, phone_number, lga_location, verification_status'
            )
            .in('id', producerIds);

          if (error) throw error;
          profileData = data || [];
        }

        setProducts(productData);
        setProfiles(profileData);
      } catch (error) {
        console.error('Error loading buyer orders:', error);

        toast.error(
          error?.message || 'Unable to load your orders.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setProducts([]);
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    loadOrders();

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
  }, [user?.id, loadOrders]);

  const enrichedOrders = useMemo(() => {
    return orders.map((order) => {
      const product =
        products.find((item) => item.id === order.product_id) || null;

      const producer =
        profiles.find((profile) => profile.id === order.producer_id) ||
        null;

      return {
        ...order,
        product,
        producer,
        producerName: getProducerName(producer),
        imageUrl: getProductImage(product?.image_path),
        productUnavailable: !product,
      };
    });
  }, [orders, products, profiles]);

  useEffect(() => {
    if (!selectedOrder) return;

    const updatedOrder = enrichedOrders.find(
      (order) => order.id === selectedOrder.id
    );

    if (updatedOrder) {
      setSelectedOrder(updatedOrder);
    } else {
      setSelectedOrder(null);
    }
  }, [enrichedOrders, selectedOrder?.id]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return enrichedOrders.filter((order) => {
      const matchesFilter =
        activeFilter === 'all' || order.status === activeFilter;

      const matchesSearch =
        !term ||
        String(order.id).toLowerCase().includes(term) ||
        String(order.product?.crop_name || '')
          .toLowerCase()
          .includes(term) ||
        String(order.producerName || '')
          .toLowerCase()
          .includes(term) ||
        String(order.delivery_location || '')
          .toLowerCase()
          .includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [enrichedOrders, activeFilter, searchTerm]);

  const stats = useMemo(() => {
    const activeStatuses = ['pending', 'confirmed', 'processing'];

    return {
      total: enrichedOrders.length,
      pending: enrichedOrders.filter(
        (order) => order.status === 'pending'
      ).length,
      active: enrichedOrders.filter((order) =>
        activeStatuses.includes(order.status)
      ).length,
      completed: enrichedOrders.filter(
        (order) => order.status === 'completed'
      ).length,
      cancelled: enrichedOrders.filter(
        (order) => order.status === 'cancelled'
      ).length,
      totalValue: enrichedOrders
        .filter((order) => order.status !== 'cancelled')
        .reduce(
          (total, order) => total + (Number(order.total_amount) || 0),
          0
        ),
    };
  }, [enrichedOrders]);

  const handleConfirmCollection = async () => {
    if (!user?.id || !selectedOrder?.id) {
      toast.error('Please log in and select a valid order.');
      return;
    }

    if (confirmingOrderId) return;

    if (selectedOrder.buyer_id !== user.id) {
      toast.error('You cannot confirm collection for this order.');
      return;
    }

    if (selectedOrder.status !== 'processing') {
      toast.error(
        'This order is not awaiting collection confirmation.'
      );
      return;
    }

    const orderId = selectedOrder.id;

    try {
      setConfirmingOrderId(orderId);

      const { error } = await supabase.rpc(
        'confirm_order_collection',
        {
          target_order_id: orderId,
        }
      );

      if (error) throw error;

      setShowCollectionConfirmation(false);
      setSelectedOrder(null);

      toast.success(
        'Collection confirmed successfully. Your order is completed.'
      );

      await loadOrders();
    } catch (error) {
      console.error('Collection confirmation failed:', error);

      toast.error(
        error?.message ||
          'Could not confirm collection. Refresh and try again.'
      );
    } finally {
      setConfirmingOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm text-gray-500">
            Loading your orders...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Sign in to view your orders
        </h1>
        <p className="mt-2 text-gray-500">
          Log in to track your AgroLink purchases.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            to="/buyer/dashboard"
            className="inline-flex items-center gap-2 text-sm text-emerald-100 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-100">
                Your AgroLink purchases
              </p>
              <h1 className="mt-1 text-3xl font-bold sm:text-4xl">
                My Orders
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-emerald-50 sm:text-base">
                Track your orders, check producer updates, and confirm
                collection when your products arrive.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadOrders(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-60 sm:self-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              Refresh Orders
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <div>
              <h2 className="text-sm font-semibold text-blue-900">
                Collection and payment
              </h2>
              <p className="mt-1 text-sm leading-6 text-blue-800">
                AgroLink orders currently use pickup arrangements.
                Confirm collection only after you have received your
                products. Order completion records your confirmation;
                it does not itself process a payment.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Total Orders</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {stats.total}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Pending</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {stats.pending}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">In Progress</p>
            <p className="mt-2 text-2xl font-bold text-purple-600">
              {stats.active}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">Completed</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600">
              {stats.completed}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-4 lg:col-span-1">
            <p className="text-xs font-medium text-gray-500">
              Order Value*
            </p>
            <p className="mt-2 text-xl font-bold text-gray-900">
              {formatNaira(stats.totalValue)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Excludes cancelled orders
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Your Orders
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredOrders.length} order
              {filteredOrders.length === 1 ? '' : 's'} found
            </p>
          </div>

          <Link
            to="/catalog"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <ShoppingBag className="h-4 w-4" />
            Browse Products
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by crop, producer, order ID or location..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeFilter === filter.value
                  ? 'bg-emerald-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
              }`}
            >
              {filter.label}
              {filter.value === 'all' && (
                <span className="ml-2 opacity-75">{stats.total}</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {filteredOrders.length === 0 ? (
            <EmptyState
              filter={activeFilter}
              searchTerm={searchTerm}
            />
          ) : (
            filteredOrders.map((order) => {
              const statusConfig =
                STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-24 sm:w-28">
                        {order.imageUrl ? (
                          <img
                            src={order.imageUrl}
                            alt={order.product?.crop_name || 'Ordered product'}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Package className="h-9 w-9 text-gray-300" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {order.product?.crop_name ||
                                'Product unavailable'}
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                              Producer: {order.producerName}
                            </p>

                            <p className="mt-1 break-all text-xs text-gray-400">
                              Order ID: {order.id}
                            </p>
                          </div>

                          <StatusBadge status={order.status} />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-gray-500">Quantity</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">
                              {order.quantity}{' '}
                              {order.product?.unit || 'units'}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Order Total</p>
                            <p className="mt-1 text-sm font-bold text-emerald-700">
                              {formatNaira(order.total_amount)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Order Date</p>
                            <p className="mt-1 text-sm font-medium text-gray-900">
                              {formatShortDate(order.created_at)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Location</p>
                            <p className="mt-1 flex items-center gap-1 text-sm font-medium text-gray-900">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                              <span className="truncate">
                                {order.delivery_location || 'Pickup arrangement'}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-gray-500">
                            {statusConfig.description}
                          </p>

                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                          >
                            View Details
                          </button>
                        </div>

                        {order.status === 'processing' && (
                          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                              <div>
                                <p className="text-sm font-semibold text-emerald-900">
                                  Have you collected this order?
                                </p>
                                <p className="mt-1 text-sm text-emerald-800">
                                  Confirm only after you receive the products.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowCollectionConfirmation(true);
                              }}
                              disabled={confirmingOrderId === order.id}
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Confirm Collection
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {selectedOrder && !showCollectionConfirmation && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedOrder(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
              <div>
                <h2
                  id="order-details-title"
                  className="text-xl font-bold text-gray-900"
                >
                  Order Details
                </h2>
                <p className="mt-1 break-all text-xs text-gray-500">
                  {selectedOrder.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-32">
                  {selectedOrder.imageUrl ? (
                    <img
                      src={selectedOrder.imageUrl}
                      alt={selectedOrder.product?.crop_name || 'Ordered product'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <StatusBadge status={selectedOrder.status} />

                  <h3 className="mt-3 text-xl font-bold text-gray-900">
                    {selectedOrder.product?.crop_name ||
                      'Product unavailable'}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {selectedOrder.quantity}{' '}
                    {selectedOrder.product?.unit || 'units'}
                  </p>

                  <p className="mt-2 text-xl font-bold text-emerald-700">
                    {formatNaira(selectedOrder.total_amount)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <h3 className="mb-4 font-semibold text-gray-900">
                  Order Progress
                </h3>

                <OrderTimeline status={selectedOrder.status} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Store className="h-4 w-4" />
                    <span className="text-xs font-medium">Producer</span>
                  </div>

                  <p className="mt-2 font-semibold text-gray-900">
                    {selectedOrder.producerName}
                  </p>

                  {selectedOrder.producer?.verification_status ===
                    'approved' && (
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified Producer
                    </span>
                  )}

                  {selectedOrder.producer?.phone_number && (
                    <a
                      href={`tel:${selectedOrder.producer.phone_number}`}
                      className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700 hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {selectedOrder.producer.phone_number}
                    </a>
                  )}
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs font-medium">
                      Collection Location
                    </span>
                  </div>

                  <p className="mt-2 font-semibold text-gray-900">
                    {selectedOrder.delivery_location ||
                      selectedOrder.product?.location ||
                      'Arrange pickup with the producer'}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Delivery is not included in the current AgroLink workflow.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900">
                  Order Information
                </h3>

                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Order placed</dt>
                    <dd className="text-right font-medium text-gray-900">
                      {formatDate(selectedOrder.created_at)}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Last updated</dt>
                    <dd className="text-right font-medium text-gray-900">
                      {formatDate(
                        selectedOrder.updated_at ||
                          selectedOrder.created_at
                      )}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Quantity</dt>
                    <dd className="text-right font-medium text-gray-900">
                      {selectedOrder.quantity}{' '}
                      {selectedOrder.product?.unit || 'units'}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Recorded total</dt>
                    <dd className="text-right font-bold text-gray-900">
                      {formatNaira(selectedOrder.total_amount)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      Payment and collection
                    </p>
                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      Confirm collection only after receiving your products.
                      This action updates the order status; it does not
                      process or verify payment.
                    </p>
                  </div>
                </div>
              </div>

              {selectedOrder.status === 'processing' && (
                <button
                  type="button"
                  onClick={() => setShowCollectionConfirmation(true)}
                  disabled={confirmingOrderId === selectedOrder.id}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Confirm Collection
                </button>
              )}

              {selectedOrder.status === 'completed' && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                  <div>
                    <p className="font-semibold text-emerald-900">
                      Order completed
                    </p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Collection has been confirmed for this order.
                    </p>
                  </div>
                </div>
              )}

              {selectedOrder.status === 'pending' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-900">
                    Your order is awaiting the producer's response. If you
                    need to cancel it, contact the producer or AgroLink
                    support for assistance.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCollectionConfirmation && selectedOrder && (
        <CollectionConfirmationDialog
          order={selectedOrder}
          loading={confirmingOrderId === selectedOrder.id}
          onCancel={() => {
            if (!confirmingOrderId) {
              setShowCollectionConfirmation(false);
            }
          }}
          onConfirm={handleConfirmCollection}
        />
      )}
    </div>
  );
}
