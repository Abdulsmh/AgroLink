
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  RefreshCw,
  Package,
  Clock3,
  CheckCircle2,
  Truck,
  XCircle,
  MapPin,
  CalendarDays,
  ClipboardList,
  AlertCircle,
  X,
  UserRound,
  Banknote,
  Eye,
  Filter,
  Sprout,
  ShoppingBag,
  Loader2,
  ShieldCheck,
  Info,
  ChevronRight,
} from "lucide-react";

import { supabase } from "../../config/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const ORDER_STATUSES = [
  "all",
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800",
    icon: Clock3,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-100 text-blue-800",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    className: "bg-purple-100 text-purple-800",
    icon: Truck,
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800",
    icon: XCircle,
  },
};

const STATUS_STEPS = [
  { value: "pending", label: "Order placed", icon: ClipboardList },
  { value: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  {
    value: "processing",
    label: "Preparing for collection",
    icon: Truck,
  },
  { value: "completed", label: "Completed", icon: Package },
];

const PROFILE_FIELDS =
  "id,full_name,phone_number,role,lga_location,verification_status";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatShortDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getOrderReference = (orderId) =>
  `AG-${String(orderId || "").slice(0, 8).toUpperCase()}`;

const getOrderTitle = (order) =>
  `${order?.product?.crop_name || "Produce"} order`;

const getStatusConfig = (status) =>
  STATUS_CONFIG[String(status || "").toLowerCase()] || {
    label: status || "Unknown",
    className: "bg-slate-100 text-slate-700",
    icon: Info,
  };

function StatusBadge({ status }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
}

function SummaryCard({ title, value, description, icon: Icon, color }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    red: "bg-red-50 text-red-700 ring-red-100",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
            colors[color] || colors.emerald
          }`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  title = "No orders found",
  description = "Orders from your approved linked farmers will appear here.",
  icon: Icon = Package,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <Icon size={30} />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <div className="mt-1 break-words text-sm font-medium text-slate-800">
          {children || "Not available"}
        </div>
      </div>
    </div>
  );
}

function OrderDetailsModal({ order, onClose }) {
  useEffect(() => {
    if (!order) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  const currentStatus = String(order.status || "").toLowerCase();
  const isCancelled = currentStatus === "cancelled";

  const currentStep = STATUS_STEPS.findIndex(
    (step) => step.value === currentStatus
  );

  const product = order.product || {};
  const buyer = order.buyer || {};
  const farmer = order.farmer || {};

  const cropName = product.crop_name || "Produce";
  const unit = product.unit || "unit";
  const orderReference = getOrderReference(order.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              Order details
            </p>

            <h2
              id="order-details-title"
              className="mt-1 text-lg font-bold text-slate-900"
            >
              {getOrderTitle(order)}
            </h2>

            <p className="mt-1 text-xs font-medium text-slate-500">
              Ref: {orderReference}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="shrink-0 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={21} />
          </button>
        </div>

        <div className="space-y-7 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(order.total_amount)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {Number(order.quantity) || 0} {unit}
                {Number(order.quantity) === 1 ? "" : "s"} of {cropName}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Placed {formatDate(order.created_at)}
              </p>
            </div>

            <StatusBadge status={order.status} />
          </div>

          <div>
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              Order progress
            </h3>

            {isCancelled ? (
              <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-800">
                <XCircle className="mt-0.5 shrink-0" size={20} />
                <div>
                  <p className="text-sm font-semibold">Order cancelled</p>
                  <p className="mt-1 text-sm">
                    This order is no longer progressing through the normal
                    collection steps.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {STATUS_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const reached =
                    currentStep >= 0 && index <= currentStep;
                  const isCurrent = index === currentStep;

                  return (
                    <div key={step.value} className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          reached
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <Icon size={17} />
                      </div>

                      <div className="min-w-0 flex-1 pt-1.5">
                        <p
                          className={`text-sm ${
                            isCurrent
                              ? "font-bold text-emerald-800"
                              : reached
                                ? "font-medium text-slate-800"
                                : "text-slate-400"
                          }`}
                        >
                          {step.label}
                          {isCurrent ? " · Current status" : ""}
                        </p>
                      </div>

                      {isCurrent && (
                        <span className="mt-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          Current
                        </span>
                      )}
                    </div>
                  );
                })}

                <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  This timeline reflects the order's current status. It is not
                  a historical record of when each step occurred.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
            <DetailRow icon={Sprout} label="Produce">
              {cropName}
            </DetailRow>

            <DetailRow icon={ShoppingBag} label="Product type">
              {product.product_type || "Not specified"}
            </DetailRow>

            <DetailRow icon={UserRound} label="Farmer">
              {farmer.full_name || "Farmer"}
            </DetailRow>

            <DetailRow icon={UserRound} label="Buyer">
              {buyer.full_name || "Buyer"}
            </DetailRow>

            <DetailRow icon={MapPin} label="Pickup / collection location">
              {order.delivery_location ||
                product.location ||
                "Not specified"}
            </DetailRow>

            <DetailRow icon={CalendarDays} label="Order placed">
              {formatDate(order.created_at)}
            </DetailRow>

            <DetailRow icon={Banknote} label="Price per unit">
              {formatCurrency(
                product.price_per_unit ??
                  (Number(order.quantity) > 0
                    ? Number(order.total_amount) / Number(order.quantity)
                    : 0)
              )}
            </DetailRow>

            <DetailRow icon={Package} label="Quantity">
              {Number(order.quantity) || 0} {unit}
            </DetailRow>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 shrink-0 text-emerald-700" size={19} />
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Aggregator coordination
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  You can monitor orders belonging to your approved linked
                  farmers. The farmer or authorized administrator remains
                  responsible for changing the order status.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 text-right sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Close details
          </button>
        </div>
      </section>
    </div>
  );
}

export default function AggregatorOrders() {
  const {
    user,
    userProfile,
    isLoading: authLoading,
  } = useAuth();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);
  const refreshInProgressRef = useRef(false);
  const refreshQueuedRef = useRef(false);

  const isApprovedAggregator =
    userProfile?.role === "aggregator" &&
    userProfile?.verification_status === "approved";

  const loadOrders = useCallback(
    async (silent = false) => {
      if (authLoading) return;

      if (!user?.id) {
        requestIdRef.current += 1;
        setOrders([]);
        setError("Please sign in to view order tracking.");
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!isApprovedAggregator) {
        requestIdRef.current += 1;
        setOrders([]);
        setError(
          "Order tracking is available only to approved aggregator accounts."
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (refreshInProgressRef.current) {
        refreshQueuedRef.current = true;

        if (!silent) setRefreshing(true);
        return;
      }

      refreshInProgressRef.current = true;
      const requestId = ++requestIdRef.current;

      if (!silent) setLoading(true);
      setError("");

      try {
        const {
          data: relationships,
          error: relationshipError,
        } = await supabase.rpc("list_aggregator_farmer_relationships");

        if (relationshipError) throw relationshipError;
        if (requestId !== requestIdRef.current) return;

        const farmerIds = [
          ...new Set(
            (relationships || [])
              .filter(
                (relationship) => relationship.status === "approved"
              )
              .map((relationship) => relationship.farmer_id)
              .filter(Boolean)
          ),
        ];

        if (farmerIds.length === 0) {
          setOrders([]);
          return;
        }

        const { data: orderRows, error: orderError } = await supabase
          .from("orders")
          .select(
            "id,buyer_id,producer_id,product_id,quantity,total_amount,status,delivery_location,created_at,updated_at"
          )
          .in("producer_id", farmerIds)
          .order("created_at", { ascending: false });

        if (orderError) throw orderError;
        if (requestId !== requestIdRef.current) return;

        if (!orderRows?.length) {
          setOrders([]);
          return;
        }

        const productIds = [
          ...new Set(
            orderRows.map((order) => order.product_id).filter(Boolean)
          ),
        ];

        const buyerIds = [
          ...new Set(
            orderRows.map((order) => order.buyer_id).filter(Boolean)
          ),
        ];

        const producerIds = [
          ...new Set(
            orderRows.map((order) => order.producer_id).filter(Boolean)
          ),
        ];

        const [
          { data: products, error: productsError },
          { data: buyers, error: buyersError },
          { data: producers, error: producersError },
        ] = await Promise.all([
          productIds.length
            ? supabase
                .from("products")
                .select(
                  "id,crop_name,unit,product_type,location,producer_id,price_per_unit"
                )
                .in("id", productIds)
            : Promise.resolve({ data: [], error: null }),

          buyerIds.length
            ? supabase
                .from("profiles")
                .select(PROFILE_FIELDS)
                .in("id", buyerIds)
            : Promise.resolve({ data: [], error: null }),

          producerIds.length
            ? supabase
                .from("profiles")
                .select(PROFILE_FIELDS)
                .in("id", producerIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (productsError) throw productsError;
        if (buyersError) throw buyersError;
        if (producersError) throw producersError;
        if (requestId !== requestIdRef.current) return;

        const productMap = new Map(
          (products || []).map((product) => [product.id, product])
        );

        const buyerMap = new Map(
          (buyers || []).map((buyer) => [buyer.id, buyer])
        );

        const producerMap = new Map(
          (producers || []).map((producer) => [producer.id, producer])
        );

        const enrichedOrders = orderRows.map((order) => ({
          ...order,
          product: productMap.get(order.product_id) || null,
          buyer: buyerMap.get(order.buyer_id) || null,
          farmer: producerMap.get(order.producer_id) || null,
        }));

        setOrders(enrichedOrders);
      } catch (loadError) {
        if (requestId !== requestIdRef.current) return;

        console.error("Error loading aggregator orders:", loadError);
        setOrders([]);
        setError(
          loadError?.message ||
            "Unable to load orders right now. Please try again."
        );
      } finally {
        refreshInProgressRef.current = false;

        if (requestId === requestIdRef.current) {
          if (!silent) setLoading(false);
          setRefreshing(false);
        }

        if (refreshQueuedRef.current) {
          refreshQueuedRef.current = false;
          Promise.resolve().then(() => loadOrders(true));
        }
      }
    },
    [user?.id, authLoading, isApprovedAggregator]
  );

  useEffect(() => {
    if (authLoading) return undefined;

    loadOrders();

    if (!user?.id || !isApprovedAggregator) {
      return undefined;
    }

    let debounceTimer;

    const scheduleRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadOrders(true);
      }, 250);
    };

    const ordersChannel = supabase
      .channel(`aggregator-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        scheduleRefresh
      )
      .subscribe();

    const relationshipsChannel = supabase
      .channel(`aggregator-order-relationships-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "aggregator_farmers",
          filter: `aggregator_id=eq.${user.id}`,
        },
        scheduleRefresh
      )
      .subscribe();

    const profilesChannel = supabase
      .channel(`aggregator-order-profiles-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(relationshipsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [authLoading, user?.id, isApprovedAggregator, loadOrders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ||
        String(order.status || "").toLowerCase() === statusFilter;

      if (!matchesStatus) return false;
      if (!term) return true;

      const searchableValues = [
        order.id,
        getOrderReference(order.id),
        getOrderTitle(order),
        order.status,
        order.delivery_location,
        order.product?.crop_name,
        order.product?.product_type,
        order.buyer?.full_name,
        order.farmer?.full_name,
      ];

      return searchableValues.some((value) =>
        String(value || "").toLowerCase().includes(term)
      );
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => {
    const total = orders.length;

    const active = orders.filter((order) =>
      ["pending", "confirmed", "processing"].includes(
        String(order.status || "").toLowerCase()
      )
    ).length;

    const completed = orders.filter(
      (order) => String(order.status || "").toLowerCase() === "completed"
    ).length;

    const cancelled = orders.filter(
      (order) => String(order.status || "").toLowerCase() === "cancelled"
    ).length;

    return { total, active, completed, cancelled };
  }, [orders]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 animate-pulse">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-64 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-200" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl bg-white shadow-sm"
              />
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={20} />
            Loading AgroLink orders...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <ShieldCheck size={14} />
              Aggregator workspace
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Order tracking
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor orders placed with your approved linked farmers and help
              coordinate collection.
            </p>

            {userProfile?.full_name && (
              <p className="mt-2 text-sm text-slate-600">
                Welcome,{" "}
                <span className="font-semibold text-slate-800">
                  {userProfile.full_name}
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh orders"}
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Unable to load order information
              </p>
              <p className="mt-1 break-words text-sm leading-6">{error}</p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total orders"
            value={stats.total}
            description="Orders from linked farmers"
            icon={Package}
            color="emerald"
          />
          <SummaryCard
            title="Active orders"
            value={stats.active}
            description="Awaiting completion"
            icon={Clock3}
            color="amber"
          />
          <SummaryCard
            title="Completed"
            value={stats.completed}
            description="Successfully completed"
            icon={CheckCircle2}
            color="blue"
          />
          <SummaryCard
            title="Cancelled"
            value={stats.cancelled}
            description="Cancelled orders"
            icon={XCircle}
            color="red"
          />
        </section>

        <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
              <ShieldCheck size={21} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Coordination view
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                This page shows orders belonging to your approved linked
                farmers. You can monitor progress, buyer details and collection
                locations, but order status changes remain with the farmer or
                authorized administrator.
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Farmer orders
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredOrders.length}{" "}
                  {filteredOrders.length === 1 ? "order" : "orders"} shown
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 sm:min-w-64">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search crop, buyer, farmer, reference..."
                    aria-label="Search orders"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div className="relative">
                  <Filter
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Filter orders by status"
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:w-48"
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status === "all"
                          ? "All statuses"
                          : getStatusConfig(status).label}
                      </option>
                    ))}
                  </select>
                  <ChevronRight
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-4 sm:p-6">
              {orders.length === 0 && !error ? (
                <EmptyState
                  title="No farmer orders yet"
                  description="When buyers place orders with your approved linked farmers, those orders will appear here."
                />
              ) : (
                <EmptyState
                  title="No matching orders"
                  description="Try another search term or status filter to find the orders you need."
                  icon={Search}
                />
              )}

              {(search || statusFilter !== "all") && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const product = order.product || {};
                const buyer = order.buyer || {};
                const farmer = order.farmer || {};

                return (
                  <article
                    key={order.id}
                    className="p-4 transition hover:bg-slate-50/70 sm:p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {getOrderTitle(order)}
                          </span>

                          <span className="text-xs text-slate-400">
                            · {formatShortDate(order.created_at)}
                          </span>

                          <StatusBadge status={order.status} />
                        </div>

                        <p className="mt-1 text-xs font-medium text-slate-400">
                          Ref: {getOrderReference(order.id)}
                        </p>

                        <h3 className="mt-3 text-lg font-bold text-slate-900">
                          {product.crop_name || "Produce"}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {Number(order.quantity) || 0}{" "}
                          {product.unit || "unit"}
                          {Number(order.quantity) === 1 ? "" : "s"}
                          {product.product_type
                            ? ` · ${product.product_type}`
                            : ""}
                        </p>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <UserRound
                              size={17}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />
                            <div className="min-w-0">
                              <p className="text-xs text-slate-400">Buyer</p>
                              <p className="break-words text-sm font-medium text-slate-700">
                                {buyer.full_name || "Buyer"}
                              </p>
                            </div>
                          </div>

                          <div className="flex min-w-0 items-start gap-2.5">
                            <Sprout
                              size={17}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />
                            <div className="min-w-0">
                              <p className="text-xs text-slate-400">Farmer</p>
                              <p className="break-words text-sm font-medium text-slate-700">
                                {farmer.full_name || "Farmer"}
                              </p>
                            </div>
                          </div>

                          <div className="flex min-w-0 items-start gap-2.5">
                            <MapPin
                              size={17}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />
                            <div className="min-w-0">
                              <p className="text-xs text-slate-400">
                                Collection location
                              </p>
                              <p className="break-words text-sm font-medium text-slate-700">
                                {order.delivery_location ||
                                  product.location ||
                                  "Not specified"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                          <CalendarDays size={14} />
                          <span>Placed {formatDate(order.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-row items-center justify-between gap-4 border-t border-slate-100 pt-4 xl:min-w-48 xl:flex-col xl:items-end xl:border-t-0 xl:pt-0">
                        <div className="xl:text-right">
                          <p className="text-xs text-slate-400">
                            Order total
                          </p>
                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                        >
                          <Eye size={16} />
                          View details
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>
              Showing {filteredOrders.length} of {orders.length} orders
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Order list refreshes to reflect new changes
            </span>
          </div>
        </section>
      </div>

      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
