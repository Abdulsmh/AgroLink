
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Package,
  RefreshCw,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../config/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const statusStyles = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  accepted: "bg-blue-50 text-blue-800 ring-blue-200",
  rejected: "bg-red-50 text-red-800 ring-red-200",
  cancelled: "bg-gray-100 text-gray-700 ring-gray-200",
  fulfilled: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

const filters = [
  { value: "all", label: "All requests" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "Not specified";

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) return null;

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getFriendlyError(error, fallback) {
  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    return "Connection problem. Please check your internet connection and try again.";
  }

  if (
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("not allowed")
  ) {
    return "You do not have permission to complete this action. Please refresh the page or contact support.";
  }

  return fallback;
}

export default function BuyerBulkRequests() {
  const { user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [aggregators, setAggregators] = useState({});
  const [itemsByRequest, setItemsByRequest] = useState({});
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(
    async (showRefresh = false) => {
      if (!user?.id) {
        setRequests([]);
        setItemsByRequest({});
        setAggregators({});
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const { data: requestRows, error: requestError } = await supabase
          .from("buyer_bulk_requests")
          .select(
            "id, buyer_id, aggregator_id, status, pickup_location, needed_by, notes, rejection_reason, created_at, updated_at"
          )
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

        if (requestError) throw requestError;

        const rows = requestRows || [];
        setRequests(rows);

        if (rows.length === 0) {
          setItemsByRequest({});
          setAggregators({});
          return;
        }

        const requestIds = rows.map((row) => row.id);
        const aggregatorIds = [
          ...new Set(rows.map((row) => row.aggregator_id).filter(Boolean)),
        ];

        const [itemResult, profileResult] = await Promise.all([
          supabase
            .from("buyer_bulk_request_items")
            .select(
              "id, request_id, crop_name, quantity, unit, target_price_per_unit, notes, created_at"
            )
            .in("request_id", requestIds)
            .order("created_at", { ascending: true }),

          aggregatorIds.length
            ? supabase
                .from("profiles")
                .select("id, full_name, business_name, lga_location")
                .in("id", aggregatorIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (itemResult.error) {
          console.error("Error loading bulk request items:", itemResult.error);
        }

        if (profileResult.error) {
          console.error("Error loading aggregator profiles:", profileResult.error);
        }

        const groupedItems = {};

        (itemResult.data || []).forEach((item) => {
          if (!groupedItems[item.request_id]) {
            groupedItems[item.request_id] = [];
          }

          groupedItems[item.request_id].push(item);
        });

        const profileMap = {};

        (profileResult.data || []).forEach((profile) => {
          profileMap[profile.id] = profile;
        });

        setItemsByRequest(groupedItems);
        setAggregators(profileMap);

        if (itemResult.error) {
          setError(
            "Your requests loaded, but some produce details are unavailable. Try refreshing."
          );
        } else if (profileResult.error) {
          setError(
            "Your requests loaded, but some aggregator details are unavailable."
          );
        }
      } catch (loadError) {
        console.error("Error loading buyer bulk requests:", loadError);

        setError(
          getFriendlyError(
            loadError,
            "We could not load your bulk requests. Please try again."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    let active = true;

    const initialise = async () => {
      await loadRequests();
    };

    initialise();

    return () => {
      active = false;
    };
  }, [loadRequests]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`buyer-bulk-requests-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buyer_bulk_requests",
          filter: `buyer_id=eq.${user.id}`,
        },
        () => {
          loadRequests(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buyer_bulk_request_items",
        },
        () => {
          loadRequests(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadRequests]);

  async function cancelRequest(requestId) {
    const request = requests.find((row) => row.id === requestId);

    if (
      !user?.id ||
      !request ||
      request.status !== "pending" ||
      cancellingId
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Cancel this pending bulk request? This action cannot be undone."
    );

    if (!confirmed) return;

    setCancellingId(requestId);
    setError("");
    setNotice("");

    try {
      const { data, error: updateError } = await supabase
        .from("buyer_bulk_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId)
        .eq("buyer_id", user.id)
        .eq("status", "pending")
        .select("id, status")
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        setError(
          "This request could not be cancelled. It may already have been updated."
        );

        await loadRequests(true);
        return;
      }

      setRequests((current) =>
        current.map((row) =>
          row.id === requestId
            ? { ...row, status: "cancelled" }
            : row
        )
      );

      setNotice("Your bulk request has been cancelled.");

      await loadRequests(true);
    } catch (cancelError) {
      console.error("Error cancelling bulk request:", cancelError);

      setError(
        getFriendlyError(
          cancelError,
          "We could not cancel this request. Please try again."
        )
      );

      await loadRequests(true);
    } finally {
      setCancellingId(null);
    }
  }

  const visibleRequests =
    filter === "all"
      ? requests
      : requests.filter((request) => request.status === filter);

  const counts = requests.reduce(
    (acc, request) => {
      acc.total += 1;

      if (Object.prototype.hasOwnProperty.call(acc, request.status)) {
        acc[request.status] += 1;
      }

      return acc;
    },
    {
      total: 0,
      pending: 0,
      accepted: 0,
      fulfilled: 0,
      rejected: 0,
      cancelled: 0,
    }
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/buyer/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-700"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-emerald-700">
              BUYER WORKSPACE
            </p>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              My bulk requests
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Review aggregator responses and follow the progress of your bulk
              produce requests.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadRequests(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <Link
              to="/buyer/bulk-request"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Package size={17} />
              New bulk request
            </Link>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {notice}
          </div>
        )}

        <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Total", counts.total],
            ["Pending", counts.pending],
            ["Accepted", counts.accepted],
            ["Fulfilled", counts.fulfilled],
            ["Rejected", counts.rejected],
            ["Cancelled", counts.cancelled],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {filters.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === option.value
                  ? "bg-emerald-700 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <LoaderCircle className="animate-spin" size={20} />
              Loading your requests...
            </div>
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <ClipboardList className="mx-auto mb-4 h-10 w-10 text-gray-300" />

            <h2 className="text-lg font-bold text-gray-900">
              {filter === "all"
                ? "You have no bulk requests yet"
                : `No ${filter} requests`}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Submit a bulk request when you need a large quantity of produce
              through an approved AgroLink aggregator.
            </p>

            <Link
              to="/buyer/bulk-request"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <Package size={17} />
              Create a bulk request
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRequests.map((request) => {
              const requestItems = itemsByRequest[request.id] || [];
              const aggregator = aggregators[request.aggregator_id];
              const isExpanded = Boolean(expanded[request.id]);
              const status = request.status || "pending";

              return (
                <article
                  key={request.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${
                              statusStyles[status] ||
                              "bg-gray-100 text-gray-700 ring-gray-200"
                            }`}
                          >
                            {status}
                          </span>

                          <span className="text-xs text-gray-400">
                            Ref: {request.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>

                        <h2 className="mt-3 text-lg font-bold text-gray-900">
                          {aggregator?.business_name ||
                            aggregator?.full_name ||
                            "AgroLink Aggregator"}
                        </h2>

                        {aggregator?.lga_location && (
                          <p className="mt-1 text-sm text-gray-500">
                            {aggregator.lga_location}
                          </p>
                        )}
                      </div>

                      <div className="sm:text-right">
                        <p className="text-xs text-gray-500">Submitted</p>
                        <p className="mt-1 text-sm font-semibold text-gray-800">
                          {formatDateTime(request.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <MapPin
                          className="mt-0.5 shrink-0 text-emerald-700"
                          size={18}
                        />
                        <div>
                          <p className="text-xs text-gray-500">
                            Preferred pickup
                          </p>
                          <p className="mt-1 text-sm font-medium text-gray-800">
                            {request.pickup_location || "Not specified"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CalendarDays
                          className="mt-0.5 shrink-0 text-emerald-700"
                          size={18}
                        />
                        <div>
                          <p className="text-xs text-gray-500">Required by</p>
                          <p className="mt-1 text-sm font-medium text-gray-800">
                            {formatDate(request.needed_by)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {status === "rejected" && (
                      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                          <AlertCircle size={17} />
                          Reason for rejection
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-700">
                          {request.rejection_reason?.trim() ||
                            "The aggregator has not provided a reason."}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">
                          {requestItems.length}
                        </span>{" "}
                        {requestItems.length === 1 ? "item" : "items"} requested
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {status === "pending" && (
                          <button
                            type="button"
                            onClick={() => cancelRequest(request.id)}
                            disabled={Boolean(cancellingId)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancellingId === request.id ? (
                              <LoaderCircle
                                className="animate-spin"
                                size={16}
                              />
                            ) : (
                              <XCircle size={16} />
                            )}
                            {cancellingId === request.id
                              ? "Cancelling..."
                              : "Cancel request"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((current) => ({
                              ...current,
                              [request.id]: !current[request.id],
                            }))
                          }
                          aria-expanded={isExpanded}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          {isExpanded ? "Hide details" : "View details"}
                          {isExpanded ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-5 border-t border-gray-100 pt-5">
                        <h3 className="mb-3 font-semibold text-gray-900">
                          Requested produce
                        </h3>

                        {requestItems.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            No item details are available for this request.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {requestItems.map((item) => {
                              const targetPrice = formatMoney(
                                item.target_price_per_unit
                              );

                              return (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-gray-200 p-4"
                                >
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="font-semibold text-gray-900">
                                        {item.crop_name}
                                      </p>
                                      <p className="mt-1 text-sm text-gray-600">
                                        Quantity: {item.quantity} {item.unit}
                                      </p>
                                    </div>

                                    {targetPrice && (
                                      <p className="text-sm font-semibold text-gray-800">
                                        Target: {targetPrice}/{item.unit}
                                      </p>
                                    )}
                                  </div>

                                  {item.notes && (
                                    <p className="mt-3 text-sm leading-5 text-gray-500">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {request.notes && (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-gray-800">
                              Additional instructions
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                              {request.notes}
                            </p>
                          </div>
                        )}

                        <p className="mt-5 text-xs text-gray-400">
                          Last updated: {formatDateTime(request.updated_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
