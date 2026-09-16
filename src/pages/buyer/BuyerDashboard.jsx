import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Truck,
  WalletCards,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabaseClient';

const CART_KEY = 'agrolink_cart';

const ORDER_STATUS = {
  pending: {
    label: 'Pending',
    icon: Clock3,
    className: 'bg-amber-100 text-amber-700',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    className: 'bg-blue-100 text-blue-700',
  },
  processing: {
    label: 'Processing',
    icon: Package,
    className: 'bg-indigo-100 text-indigo-700',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'bg-emerald-100 text-emerald-700',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'bg-red-100 text-red-700',
  },
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const formatDate = (date) => {
  if (!date) return 'N/A';

  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getProductImage = (imagePath) => {
  if (!imagePath) return null;

  let paths = imagePath;

  if (typeof imagePath === 'string') {
    try {
      paths = JSON.parse(imagePath);
    } catch {
      paths = [imagePath];
    }
  }

  if (!Array.isArray(paths) || !paths.length) return null;

  const firstPath = paths[0];

  if (!firstPath) return null;

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(firstPath);

  return data?.publicUrl || null;
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass,
}) => {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h3 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900">
            {value}
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>

        <div
          className={`flex-shrink-0 rounded-2xl p-3 transition duration-300 group-hover:scale-110 ${iconClass}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const config = ORDER_STATUS[status] || ORDER_STATUS.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${config.className}`}
    >
      <Icon size={13} />
      {config.label}
    </span>
  );
};

const QuickAction = ({
  to,
  icon: Icon,
  eyebrow,
  title,
  description,
  className,
  iconClassName,
}) => {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 transition-transform duration-500 group-hover:scale-150" />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">
            {eyebrow}
          </p>

          <h2 className="mt-2 text-xl font-black sm:text-2xl">
            {title}
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 opacity-85">
            {description}
          </p>
        </div>

        <div
          className={`flex-shrink-0 rounded-full p-3 transition duration-300 group-hover:translate-x-1 ${iconClassName}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </Link>
  );
};

export default function BuyerDashboard() {
  const { user, userProfile } = useAuth();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [cartCount, setCartCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const updateCartCount = useCallback(() => {
    try {
      const savedCart = localStorage.getItem(CART_KEY);

      if (!savedCart) {
        setCartCount(0);
        return;
      }

      const cart = JSON.parse(savedCart);

      if (!Array.isArray(cart)) {
        setCartCount(0);
        return;
      }

      const totalItems = cart.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      );

      setCartCount(totalItems);
    } catch (error) {
      console.error('Unable to read cart:', error);
      setCartCount(0);
    }
  }, []);

  const loadDashboard = useCallback(
    async ({ showLoader = true } = {}) => {
      if (!user?.id) return;

      if (showLoader) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const { data: orderData, error: orderError } =
          await supabase
            .from('orders')
            .select(
              `
                id,
                product_id,
                producer_id,
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
                image_path,
                product_type
              `
            )
            .in('id', productIds);

          if (productError) throw productError;

          const productMap = (productData || []).reduce(
            (accumulator, product) => {
              accumulator[product.id] = product;
              return accumulator;
            },
            {}
          );

          setProducts(productMap);
        } else {
          setProducts({});
        }
      } catch (error) {
        console.error('Buyer dashboard error:', error);

        toast.error(
          'Unable to load your dashboard.'
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    updateCartCount();

    const handleCartUpdate = () => {
      updateCartCount();
    };

    const handleStorage = (event) => {
      if (event.key === CART_KEY) {
        updateCartCount();
      }
    };

    window.addEventListener(
      'agrolink-cart-updated',
      handleCartUpdate
    );

    window.addEventListener(
      'storage',
      handleStorage
    );

    return () => {
      window.removeEventListener(
        'agrolink-cart-updated',
        handleCartUpdate
      );

      window.removeEventListener(
        'storage',
        handleStorage
      );
    };
  }, [updateCartCount]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`buyer-dashboard-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          loadDashboard({
            showLoader: false,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadDashboard]);

  const stats = useMemo(() => {
    const pending = orders.filter(
      (order) => order.status === 'pending'
    ).length;

    const active = orders.filter((order) =>
      [
        'pending',
        'confirmed',
        'processing',
      ].includes(order.status)
    ).length;

    const completed = orders.filter(
      (order) => order.status === 'completed'
    ).length;

    const cancelled = orders.filter(
      (order) => order.status === 'cancelled'
    ).length;

    const totalValue = orders.reduce(
      (total, order) =>
        total + Number(order.total_amount || 0),
      0
    );

    const completedValue = orders
      .filter((order) => order.status === 'completed')
      .reduce(
        (total, order) =>
          total + Number(order.total_amount || 0),
        0
      );

    return {
      total: orders.length,
      pending,
      active,
      completed,
      cancelled,
      totalValue,
      completedValue,
    };
  }, [orders]);

  const recentOrders = orders.slice(0, 5);

  const firstName =
    userProfile?.full_name
      ?.trim()
      ?.split(' ')[0] || 'Buyer';

  if (isLoading) {
    return (
      <section className="min-h-[70vh] bg-slate-50 px-4 py-12">
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />

            <p className="text-sm font-semibold text-slate-600">
              Loading your AgroLink dashboard...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Hero / Welcome */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-slate-900 px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-2xl" />

          <div className="absolute -bottom-20 right-20 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

          <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
                Buyer Portal
              </p>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Welcome back, {firstName}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
                Manage your agricultural purchases, track orders,
                and discover products from producers on AgroLink.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  <ShoppingBag size={17} />
                  Browse Marketplace
                </Link>

                <Link
                  to="/buyer/orders"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  View Orders
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>

            <div className="hidden shrink-0 lg:block">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-md">
                <ShoppingBag
                  size={38}
                  className="mx-auto text-emerald-200"
                />

                <p className="mt-3 text-3xl font-black">
                  {stats.total}
                </p>

                <p className="text-xs font-medium text-emerald-100">
                  Total Orders
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Orders"
            value={stats.total}
            subtitle="All orders placed"
            icon={ShoppingBag}
            iconClass="bg-emerald-100 text-emerald-700"
          />

          <StatCard
            title="Pending Orders"
            value={stats.pending}
            subtitle="Awaiting confirmation"
            icon={Clock3}
            iconClass="bg-amber-100 text-amber-700"
          />

          <StatCard
            title="Active Orders"
            value={stats.active}
            subtitle="Pending, confirmed or processing"
            icon={Truck}
            iconClass="bg-blue-100 text-blue-700"
          />

          <StatCard
            title="Purchase Value"
            value={formatCurrency(stats.totalValue)}
            subtitle={`${stats.completed} completed order${
              stats.completed === 1 ? '' : 's'
            }`}
            icon={WalletCards}
            iconClass="bg-violet-100 text-violet-700"
          />
        </div>

        {/* Quick actions */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Everything you need to manage your AgroLink activity.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <QuickAction
              to="/catalog"
              icon={ShoppingBag}
              eyebrow="Marketplace"
              title="Explore Products"
              description="Browse agricultural products listed by producers and find what you need."
              className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white"
              iconClassName="bg-white/15 text-white"
            />

            <QuickAction
              to="/cart"
              icon={ShoppingCart}
              eyebrow="Shopping Cart"
              title="Review Your Cart"
              description={
                cartCount > 0
                  ? `${cartCount} item${
                      cartCount === 1 ? '' : 's'
                    } currently in your cart.`
                  : 'Your cart is currently empty. Add products from the marketplace.'
              }
              className="border border-slate-200 bg-white text-slate-900"
              iconClassName="bg-emerald-50 text-emerald-700"
            />

            <QuickAction
              to="/buyer/orders"
              icon={Truck}
              eyebrow="Order Management"
              title="Track Orders"
              description="Review order status, delivery information, quantities and purchase details."
              className="border border-slate-200 bg-white text-slate-900"
              iconClassName="bg-blue-50 text-blue-700"
            />
          </div>
        </div>

        {/* Purchase overview */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Completed Purchases
                </p>

                <h2 className="mt-2 text-3xl font-black text-slate-900">
                  {formatCurrency(stats.completedValue)}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Value of orders currently marked completed
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{
                  width:
                    stats.totalValue > 0
                      ? `${Math.min(
                          100,
                          (stats.completedValue /
                            stats.totalValue) *
                            100
                        )}%`
                      : '0%',
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Completed value
              </span>

              <span className="font-bold text-emerald-700">
                {stats.totalValue > 0
                  ? Math.round(
                      (stats.completedValue /
                        stats.totalValue) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Order Status
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Pending
                </span>

                <span className="font-black text-slate-900">
                  {stats.pending}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  Active
                </span>

                <span className="font-black text-slate-900">
                  {stats.active}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Completed
                </span>

                <span className="font-black text-slate-900">
                  {stats.completed}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  Cancelled
                </span>

                <span className="font-black text-slate-900">
                  {stats.cancelled}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent orders */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Recent Orders
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your latest marketplace activity
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() =>
                  loadDashboard({
                    showLoader: false,
                  })
                }
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={
                    isRefreshing
                      ? 'animate-spin'
                      : ''
                  }
                />
                Refresh
              </button>

              <Link
                to="/buyer/orders"
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800"
              >
                View all
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {recentOrders.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <ShoppingBag size={28} />
              </div>

              <h3 className="mt-5 text-lg font-black text-slate-900">
                No orders yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Your orders will appear here after you
                place your first order on AgroLink.
              </p>

              <Link
                to="/catalog"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Start Shopping
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => {
                const product =
                  products[order.product_id];

                const imageUrl = getProductImage(
                  product?.image_path
                );

                return (
                  <Link
                    key={order.id}
                    to="/buyer/orders"
                    className="group flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={
                              product?.crop_name ||
                              'Ordered product'
                            }
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-400">
                            <Package size={24} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-bold capitalize text-slate-900">
                          {product?.crop_name ||
                            'Agricultural Product'}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Order #
                          {order.id
                            .slice(0, 8)
                            .toUpperCase()}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span>
                            {formatDate(
                              order.created_at
                            )}
                          </span>

                          <span>
                            Quantity:{' '}
                            {order.quantity}{' '}
                            {product?.unit ||
                              'unit'}
                          </span>
                        </div>

                        {order.delivery_location && (
                          <p className="mt-1 flex max-w-md items-center gap-1 truncate text-xs text-slate-500">
                            <MapPin
                              size={12}
                              className="flex-shrink-0"
                            />
                            {order.delivery_location}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-3">
                        <p className="font-black text-slate-900">
                          {formatCurrency(
                            order.total_amount
                          )}
                        </p>

                        <ArrowRight
                          size={17}
                          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-emerald-600"
                        />
                      </div>

                      <StatusBadge
                        status={order.status}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Offline payment notice */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
              <WalletCards size={18} />
            </div>

            <div>
              <h3 className="font-black text-amber-900">
                Physical payment and delivery
              </h3>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                AgroLink currently helps buyers and
                producers arrange orders. Payment is
                handled physically or offline between
                both parties. AgroLink does not collect
                online payments at this stage.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
