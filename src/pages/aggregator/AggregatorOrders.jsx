
import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";

import { supabase } from '../../config/supabaseClient';
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

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "Date unavailable";

  return parsedDate.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[String(status || "").toLowerCase()] || {
    label: status || "Unknown",
    className: "bg-gray-100 text-gray-700",
    icon: Package,
  };

function StatusBadge({ status }) {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      <Icon size={13} />
      {config.label}
    </span>
  );
}

function SummaryCard({ title, value, description, icon: Icon, color }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            colors[color] || colors.green
          }`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onReset }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <ClipboardList size={30} />
      </div>

      <h3 className="mt-5 text-lg font-bold text-gray-900">
        {hasFilters ? "No matching orders" : "No orders to track yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {hasFilters
          ? "Try changing your search phrase or selected status."
          : "Orders assigned to your approved, linked farmers will appear here when they are visible to your account."}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  const progressSteps = [
    { status: "pending", label: "Order placed" },
    { status: "confirmed", label: "Order confirmed" },
    { status: "processing", label: "Being prepared" },
    { status: "completed", label: "Completed" },
  ];

  const currentStatus = String(order.status || "").toLowerCase();
  const currentIndex = progressSteps.findIndex(
    (step) => step.status === currentStatus
  );

  const isCancelled = currentStatus === "cancelled";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Order details
            </p>
            <h2
              id="order-details-title"
              className="mt-1 break-all text-xl font-bold text-gray-900"
            >
              #{String(order.id).slice(0, 8).toUpperCase()}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Created {formatDate(order.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={21} />
          </button>
        </div>

        <div className="mt-5">
          <StatusBadge status={order.status} />
        </div>

        <div className="mt-6 rounded-2xl bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Sprout size={24} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900">
                {order.product?.crop_name || "Produce"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {Number(order.quantity || 0).toLocaleString("en-NG")}{" "}
                {order.product?.unit || "units"}
              </p>
              {order.product?.product_type && (
                <p className="mt-1 text-xs capitalize text-gray-500">
                  {String(order.product.product_type).replaceAll("_", " ")}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-500">Order total</p>
              <p className="mt-1 font-bold text-emerald-700">
                {formatCurrency(order.total_amount)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-bold text-gray-900">Order progress</h3>

          {isCancelled ? (
            <div className="mt-3 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800">
              <XCircle size={19} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">This order was cancelled.</p>
                <p className="mt-1">
                  Contact the assigned farmer if you need clarification about
                  the order.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {progressSteps.map((step, index) => {
                const isReached = currentIndex >= index;
                const isCurrent = currentIndex === index;

                return (
                  <div key={step.status} className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isReached
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isReached ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <span className="text-xs font-bold">{index + 1}</span>
                      )}
                    </div>

                    <div className="pt-1">
                      <p
                        className={`text-sm font-semibold ${
                          isReached ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="mt-1 text-xs text-emerald-700">
                          Current order status
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Sprout size={17} />
              <p className="text-xs font-medium">Assigned farmer</p>
            </div>
            <p className="mt-2 font-semibold text-gray-900">
              {order.farmer?.full_name ||
                order.farmer?.farm_name ||
                "Farmer details unavailable"}
            </p>
            {order.farmer?.farm_name && order.farmer?.full_name && (
              <p className="mt-1 text-sm text-gray-500">
                {order.farmer.farm_name}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <UserRound size={17} />
              <p className="text-xs font-medium">Buyer</p>
            </div>
            <p className="mt-2 font-semibold text-gray-900">
              {order.buyer?.full_name || "Buyer details unavailable"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin size={17} />
              <p className="text-xs font-medium">Pickup / delivery location</p>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {order.delivery_location ||
                order.product?.location ||
                "Location not provided"}
            </p>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              AgroLink currently supports pickup arrangements. Confirm the
              final pickup details with the relevant parties.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4 sm:col-span-2">
            <div className="flex items-center gap-2 text-gray-500">
              <CalendarDays size={17} />
              <p className="text-xs font-medium">Last updated</p>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {formatDate(order.updated_at || order.created_at)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Close details
        </button>
      </div>
    </div>
  );
}

export default function AggregatorOrders() {
  const { user, userProfile, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    if (authLoading) return;

    if (!user?.id) {
      setOrders([]);
      setError("Please sign in to view aggregator orders.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Get the aggregator's farmer relationships using the existing RPC.
      const { data: relationships, error: relationshipError } =
        await supabase.rpc("list_aggregator_farmer_relationships");

      if (relationshipError) throw relationshipError;

      const approvedRelationships = (relationships || []).filter(
        (relationship) =>
          String(relationship.status || "").toLowerCase() === "approved"
      );

      const farmerIds = [
        ...new Set(
          approvedRelationships
            .map((relationship) => relationship.farmer_id)
            .filter(Boolean)
        ),
      ];

      if (farmerIds.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch orders assigned to the aggregator's approved linked farmers.
      const { data: orderRows, error: orderError } = await supabase
        .from("orders")
        .select(
          "id,buyer_id,producer_id,product_id,quantity,total_amount,status,delivery_location,created_at,updated_at"
        )
        .in("producer_id", farmerIds)
        .order("created_at", { ascending: false });

      if (orderError) throw orderError;

      const rows = orderRows || [];

      if (rows.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch related records separately to avoid relying on guessed FK names.
      const productIds = [
        ...new Set(rows.map((order) => order.product_id).filter(Boolean)),
      ];

      const buyerIds = [
        ...new Set(rows.map((order) => order.buyer_id).filter(Boolean)),
      ];

      const producerIds = [
        ...new Set(rows.map((order) => order.producer_id).filter(Boolean)),
      ];

      const [
        { data: productRows, error: productsError },
        { data: buyerRows, error: buyersError },
        { data: producerRows, error: producersError },
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
              .select("id,full_name,business_name")
              .in("id", buyerIds)
          : Promise.resolve({ data: [], error: null }),

        producerIds.length
          ? supabase
              .from("profiles")
              .select("id,full_name,business_name,farm_name,farm_location")
              .in("id", producerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (productsError) throw productsError;
      if (buyersError) throw buyersError;
      if (producersError) throw producersError;

      const productMap = new Map(
        (productRows || []).map((product) => [product.id, product])
      );

      const buyerMap = new Map(
        (buyerRows || []).map((buyer) => [buyer.id, buyer])
      );

      const producerMap = new Map(
        (producerRows || []).map((producer) => [producer.id, producer])
      );

      const enrichedOrders = rows.map((order) => ({
        ...order,
        product: productMap.get(order.product_id) || null,
        buyer: buyerMap.get(order.buyer_id) || null,
        farmer: producerMap.get(order.producer_id) || null,
      }));

      setOrders(enrichedOrders);
    } catch (loadError) {
      console.error("Failed to load aggregator orders:", loadError);

      setOrders([]);
      setError(
        loadError?.message ||
          "Unable to load orders. Check your connection and Supabase access policies."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, authLoading]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        selectedStatus === "all" ||
        String(order.status || "").toLowerCase() === selectedStatus;

      const searchableValues = [
        order.id,
        order.product?.crop_name,
        order.buyer?.full_name,
        order.buyer?.business_name,
        order.farmer?.full_name,
        order.farmer?.farm_name,
        order.delivery_location,
        order.status,
      ];

      const matchesSearch =
        !normalizedSearch ||
        searchableValues.some((value) =>
          String(value || "").toLowerCase().includes(normalizedSearch)
        );

      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, selectedStatus]);

  const stats = useMemo(() => {
    const count = (status) =>
      orders.filter(
        (order) => String(order.status || "").toLowerCase() === status
      ).length;

    return {
      total: orders.length,
      active: orders.filter((order) =>
        ["pending", "confirmed", "processing"].includes(
          String(order.status || "").toLowerCase()
        )
      ).length,
      completed: count("completed"),
      cancelled: count("cancelled"),
    };
  }, [orders]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedStatus("all");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="mt-4 text-sm text-gray-500">
            Loading your AgroLink session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
              <ShoppingBag size={17} />
              Aggregator workspace
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Order tracking
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Monitor orders assigned to your linked farmers, follow their
              progress, and review pickup arrangements in one place.
            </p>

            {userProfile?.full_name && (
              <p className="mt-2 text-sm text-gray-600">
                Welcome,{" "}
                <span className="font-semibold text-gray-900">
                  {userProfile.full_name}
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh orders
          </button>
        </div>

        {/* Summary cards */}
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total orders"
            value={stats.total}
            description="Orders from linked farmers"
            icon={Package}
            color="green"
          />

          <SummaryCard
            title="In progress"
            value={stats.active}
            description="Pending, confirmed or processing"
            icon={Clock3}
            color="amber"
          />

          <SummaryCard
            title="Completed"
            value={stats.completed}
            description="Successfully completed orders"
            icon={CheckCircle2}
            color="blue"
          />

          <SummaryCard
            title="Cancelled"
            value={stats.cancelled}
            description="Orders marked as cancelled"
            icon={XCircle}
            color="purple"
          />
        </div>

        {/* Read-only workflow note */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="mt-0.5 text-emerald-700">
            <AlertCircle size={19} />
          </div>

          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Coordination view
            </p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              This page is for monitoring and coordination. Order status
              changes remain with the assigned producer under the current
              workflow.
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="mt-7 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search order ID, crop, farmer, buyer or location..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={17} className="shrink-0 text-gray-400" />

              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:min-w-44"
                aria-label="Filter orders by status"
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "all"
                      ? "All statuses"
                      : status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>

              {(searchTerm || selectedStatus !== "all") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl p-3 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Clear filters"
                  title="Clear filters"
                >
                  <X size={17} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-800">
                {filteredOrders.length}
              </span>{" "}
              of {orders.length} orders
            </p>

            <p className="text-xs text-gray-500">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />{" "}
              Linked farmers only
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-red-800">
                Could not load orders
              </p>
              <p className="mt-1 break-words text-sm leading-6 text-red-700">
                {error}
              </p>
              <p className="mt-2 text-xs leading-5 text-red-700">
                If this is a permissions error, check the existing Supabase
                policies for orders, profiles and products. Do not disable
                row-level security to resolve it.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Orders */}
        <div className="mt-6">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5"
                >
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                  <div className="mt-5 h-6 w-2/3 rounded bg-gray-200" />
                  <div className="mt-4 h-4 w-1/2 rounded bg-gray-100" />
                  <div className="mt-6 h-20 rounded-xl bg-gray-100" />
                  <div className="mt-5 h-10 rounded-xl bg-gray-100" />
                </div>
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              hasFilters={Boolean(searchTerm || selectedStatus !== "all")}
              onReset={clearFilters}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredOrders.map((order) => (
                <article
                  key={order.id}
                  className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Order reference
                      </p>
                      <p className="mt-1 break-all text-sm font-bold text-gray-900">
                        #{String(order.id).slice(0, 8).toUpperCase()}
                      </p>
                    </div>

                    <StatusBadge status={order.status} />
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Sprout size={24} />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-gray-900">
                        {order.product?.crop_name || "Produce"}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {Number(order.quantity || 0).toLocaleString("en-NG")}{" "}
                        {order.product?.unit || "units"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex items-start gap-2.5">
                      <Sprout
                        size={16}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Assigned farmer</p>
                        <p className="mt-0.5 truncate text-sm font-medium text-gray-800">
                          {order.farmer?.full_name ||
                            order.farmer?.farm_name ||
                            "Farmer details unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <UserRound
                        size={16}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">Buyer</p>
                        <p className="mt-0.5 truncate text-sm font-medium text-gray-800">
                          {order.buyer?.full_name ||
                            order.buyer?.business_name ||
                            "Buyer details unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <MapPin
                        size={16}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">
                          Pickup / delivery location
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-gray-700">
                          {order.delivery_location ||
                            order.product?.location ||
                            "Location not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <CalendarDays
                        size={16}
                        className="mt-0.5 shrink-0 text-gray-400"
                      />
                      <div>
                        <p className="text-xs text-gray-400">Order date</p>
                        <p className="mt-0.5 text-sm text-gray-700">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-3 border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs text-gray-400">Order total</p>
                      <p className="mt-1 text-lg font-bold text-emerald-700">
                        {formatCurrency(order.total_amount)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      <Eye size={16} />
                      Details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <Banknote size={19} className="mt-0.5 shrink-0 text-gray-500" />
          <p className="text-xs leading-5 text-gray-500">
            Amounts shown are the order totals stored in AgroLink. This page
            does not collect payments or confirm that payment has been made.
          </p>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
