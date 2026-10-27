
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock3,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Package,
  RefreshCw,
  X,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../config/supabaseClient";
import { useAuth } from "../../context/AuthContext";

const statusStyles = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  accepted: "bg-blue-50 text-blue-800 ring-blue-200",
  awaiting_buyer_confirmation:
    "bg-violet-50 text-violet-800 ring-violet-200",
  confirmed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  fulfilled: "bg-teal-50 text-teal-800 ring-teal-200",
  rejected: "bg-red-50 text-red-800 ring-red-200",
  cancelled: "bg-gray-100 text-gray-700 ring-gray-200",
};

const statusLabels = {
  pending: "Pending",
  accepted: "Being prepared",
  awaiting_buyer_confirmation: "Offer to review",
  confirmed: "Confirmed",
  fulfilled: "Fulfilled",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const filters = [
  { value: "all", label: "All requests" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Being prepared" },
  { value: "awaiting_buyer_confirmation", label: "Offers to review" },
  { value: "confirmed", label: "Confirmed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-gray-50";

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
  if (value === null || value === undefined || value === "") return null;

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
    message.includes("not authorized") ||
    message.includes("not allowed")
  ) {
    return "You could not complete this action. Please refresh the page and make sure you are signed in.";
  }

  if (
    message.includes("offer") &&
    (message.includes("not found") || message.includes("not available"))
  ) {
    return "This offer is no longer available. Refresh your requests to see the latest status.";
  }

  return fallback;
}

function getOfferTotal(items) {
  if (!items.length) return null;

  let total = 0;

  for (const item of items) {
    if (
      item.proposed_quantity === null ||
      item.proposed_quantity === undefined ||
      item.proposed_unit_price === null ||
      item.proposed_unit_price === undefined
    ) {
      return null;
    }

    const quantity = Number(item.proposed_quantity);
    const price = Number(item.proposed_unit_price);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(price) ||
      quantity <= 0 ||
      price < 0
    ) {
      return null;
    }

    total += quantity * price;
  }

  return total;
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        statusStyles[status] || statusStyles.pending
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status] || status}
    </span>
  );
}

function SummaryCard({ label, value, onClick, active }) {
  const content = (
    <>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
        {value}
      </p>
    </>
  );

  const className = `rounded-xl border bg-white p-4 text-left transition ${
    active
      ? "border-emerald-600 ring-1 ring-emerald-600"
      : "border-gray-200 hover:border-emerald-300"
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
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
  const [actionRequestId, setActionRequestId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [decliningRequest, setDecliningRequest] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [cancelDialogRequest, setCancelDialogRequest] = useState(null);

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

      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const { data: requestRows, error: requestError } = await supabase
          .from("buyer_bulk_requests")
          .select(
            [
              "id",
              "buyer_id",
              "aggregator_id",
              "status",
              "pickup_location",
              "needed_by",
              "notes",
              "rejection_reason",
              "created_at",
              "updated_at",
              "proposed_pickup_date",
              "proposed_pickup_location",
              "collection_instructions",
              "offer_submitted_at",
              "buyer_confirmed_at",
              "buyer_declined_at",
            ].join(", ")
          )
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false });

        if (requestError) throw requestError;

        const rows = requestRows || [];
        setRequests(rows);

        if (!rows.length) {
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
              [
                "id",
                "request_id",
                "crop_name",
                "quantity",
                "unit",
                "target_price_per_unit",
                "notes",
                "created_at",
                "proposed_quantity",
                "proposed_unit_price",
              ].join(", ")
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
          console.error("Error loading bulk request items:", itemResult.error);
          setError(
            "Your requests loaded, but some produce details are unavailable. Try refreshing."
          );
        } else if (profileResult.error) {
          console.error(
            "Error loading aggregator profiles:",
            profileResult.error
          );
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
    loadRequests();
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
        () => loadRequests(true)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "buyer_bulk_request_items",
        },
        () => loadRequests(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadRequests]);

  async function cancelRequest() {
    const request = cancelDialogRequest;

    if (
      !user?.id ||
      !request ||
      request.status !== "pending" ||
      actionRequestId
    ) {
      return;
    }

    setActionRequestId(request.id);
    setError("");
    setNotice("");

    try {
      const { data, error: updateError } = await supabase
        .from("buyer_bulk_requests")
        .update({ status: "cancelled" })
        .eq("id", request.id)
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

      setCancelDialogRequest(null);
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
      setActionRequestId(null);
    }
  }

  async function confirmOffer(request) {
    if (
      !user?.id ||
      request?.status !== "awaiting_buyer_confirmation" ||
      actionRequestId
    ) {
      return;
    }

    const items = itemsByRequest[request.id] || [];
    const total = getOfferTotal(items);

    if (total === null || !items.length) {
      setError(
        "This offer appears incomplete. Please refresh the page before confirming."
      );
      return;
    }

    const accepted = window.confirm(
      "Confirm this aggregator offer? You are agreeing to the proposed quantities, prices, and pickup arrangements."
    );

    if (!accepted) return;

    setActionRequestId(request.id);
    setError("");
    setNotice("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "confirm_buyer_bulk_request_offer",
        { p_request_id: request.id }
      );

      if (rpcError) throw rpcError;

      setNotice("Offer confirmed successfully.");
      await loadRequests(true);
    } catch (actionError) {
      console.error("Error confirming bulk request offer:", actionError);
      setError(
        getFriendlyError(
          actionError,
          "We could not confirm this offer. Refresh the page and try again."
        )
      );
      await loadRequests(true);
    } finally {
      setActionRequestId(null);
    }
  }

  async function declineOffer() {
    const request = decliningRequest;

    if (
      !request ||
      !user?.id ||
      request.status !== "awaiting_buyer_confirmation" ||
      actionRequestId
    ) {
      return;
    }

    setActionRequestId(request.id);
    setError("");
    setNotice("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "decline_buyer_bulk_request_offer",
        {
          p_request_id: request.id,
          p_reason: declineReason.trim() || null,
        }
      );

      if (rpcError) throw rpcError;

      setDecliningRequest(null);
      setDeclineReason("");
      setNotice(
        "Your revision request has been sent. The aggregator can review and submit a revised offer."
      );
      await loadRequests(true);
    } catch (actionError) {
      console.error("Error declining bulk request offer:", actionError);
      setError(
        getFriendlyError(
          actionError,
          "We could not send your response. Refresh the page and try again."
        )
      );
      await loadRequests(true);
    } finally {
      setActionRequestId(null);
    }
  }

  const visibleRequests = useMemo(
    () =>
      filter === "all"
        ? requests
        : requests.filter((request) => request.status === filter),
    [filter, requests]
  );

  const counts = useMemo(
    () =>
      requests.reduce(
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
          awaiting_buyer_confirmation: 0,
          confirmed: 0,
          fulfilled: 0,
          rejected: 0,
          cancelled: 0,
        }
      ),
    [requests]
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-800 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/buyer/dashboard"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-emerald-700"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>

        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wider text-emerald-700">
              BUYER WORKSPACE
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              My bulk requests
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Track your produce requests, review aggregator offers, and
              confirm the arrangements before collection.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => loadRequests(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>

            <Link
              to="/buyer/bulk-request"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              <Package size={17} />
              New bulk request
            </Link>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="ml-auto rounded-md p-1 hover:bg-red-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-5 text-emerald-800"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
              className="ml-auto rounded-md p-1 hover:bg-emerald-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section
          aria-label="Request summary"
          className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          <SummaryCard
            label="Total requests"
            value={counts.total}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <SummaryCard
            label="Pending"
            value={counts.pending}
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
          />
          <SummaryCard
            label="Offers to review"
            value={counts.awaiting_buyer_confirmation}
            active={filter === "awaiting_buyer_confirmation"}
            onClick={() => setFilter("awaiting_buyer_confirmation")}
          />
          <SummaryCard
            label="Confirmed"
            value={counts.confirmed}
            active={filter === "confirmed"}
            onClick={() => setFilter("confirmed")}
          />
        </section>

        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-800">
              Request history
            </h2>
            <span className="text-xs text-gray-500">
              {visibleRequests.length}{" "}
              {visibleRequests.length === 1 ? "request" : "requests"}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {filters.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                  filter === option.value
                    ? "bg-emerald-700 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-xl border border-gray-200 bg-white">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <LoaderCircle className="animate-spin" size={20} />
              Loading your requests...
            </div>
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <ClipboardList className="mx-auto mb-4 h-10 w-10 text-gray-300" />

            <h2 className="text-lg font-semibold text-gray-900">
              {filter === "all"
                ? "You have no bulk requests yet"
                : `No ${
                    filters.find((item) => item.value === filter)?.label.toLowerCase() ||
                    filter
                  } requests`}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Submit a bulk request when you need a large quantity of produce
              through an approved AgroLink aggregator.
            </p>

            <Link
              to="/buyer/bulk-request"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              <Package size={17} />
              Create a bulk request
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRequests.map((request) => {
              const items = itemsByRequest[request.id] || [];
              const aggregator = aggregators[request.aggregator_id];
              const isExpanded = Boolean(expanded[request.id]);
              const status = request.status || "pending";
              const isAwaitingBuyer =
                status === "awaiting_buyer_confirmation";
              const offerTotal = getOfferTotal(items);

              return (
                <article
                  key={request.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm"
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={status} />
                          <span className="text-xs text-gray-400">
                            Ref: {request.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>

                        <h3 className="mt-3 text-base font-semibold text-gray-900">
                          {aggregator?.business_name ||
                            aggregator?.full_name ||
                            "AgroLink Aggregator"}
                        </h3>

                        {aggregator?.lga_location && (
                          <p className="mt-1 text-sm text-gray-500">
                            {aggregator.lga_location}
                          </p>
                        )}
                      </div>

                      <div className="sm:text-right">
                        <p className="text-xs text-gray-500">Request date</p>
                        <p className="mt-1 text-sm font-medium text-gray-700">
                          {formatDateTime(request.created_at)}
                        </p>
                      </div>
                    </div>

                    {isAwaitingBuyer && (
                      <div className="mt-4 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
                        <MessageSquare
                          size={19}
                          className="mt-0.5 shrink-0 text-violet-700"
                        />
                        <div>
                          <p className="text-sm font-semibold text-violet-900">
                            An offer is ready for your review
                          </p>
                          <p className="mt-1 text-sm leading-5 text-violet-800">
                            Review the proposed quantities, prices, and pickup
                            details. You can confirm the offer or request a
                            revision.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <MapPin
                          size={18}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">
                            {request.proposed_pickup_location
                              ? "Proposed pickup location"
                              : "Preferred pickup"}
                          </p>
                          <p className="mt-1 break-words text-sm font-medium text-gray-800">
                            {request.proposed_pickup_location ||
                              request.pickup_location ||
                              "Not specified"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CalendarDays
                          size={18}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />
                        <div>
                          <p className="text-xs text-gray-500">
                            {request.proposed_pickup_date
                              ? "Proposed pickup date"
                              : "Required by"}
                          </p>
                          <p className="mt-1 text-sm font-medium text-gray-800">
                            {formatDate(
                              request.proposed_pickup_date || request.needed_by
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {request.collection_instructions && (
                      <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-sm font-semibold text-blue-900">
                          Collection instructions
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-blue-800">
                          {request.collection_instructions}
                        </p>
                      </div>
                    )}

                    {status === "rejected" && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                          <AlertCircle size={17} />
                          Reason for rejection
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-red-700">
                          {request.rejection_reason?.trim() ||
                            "The aggregator has not provided a reason."}
                        </p>
                      </div>
                    )}

                    {status === "confirmed" && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <CheckCircle2
                          size={17}
                          className="mt-0.5 shrink-0 text-emerald-700"
                        />
                        <p className="text-sm text-emerald-800">
                          Offer confirmed
                          {request.buyer_confirmed_at
                            ? ` on ${formatDateTime(request.buyer_confirmed_at)}`
                            : "."}
                        </p>
                      </div>
                    )}

                    {request.buyer_declined_at && (
                      <p className="mt-3 text-xs leading-5 text-gray-500">
                        A previous offer was declined on{" "}
                        {formatDateTime(request.buyer_declined_at)}. Check the
                        latest offer details for any revisions.
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold text-gray-800">
                          {items.length}
                        </span>{" "}
                        {items.length === 1 ? "item" : "items"} requested
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {status === "pending" && (
                          <button
                            type="button"
                            onClick={() => setCancelDialogRequest(request)}
                            disabled={Boolean(actionRequestId)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <XCircle size={16} />
                            Cancel request
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
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
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
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-gray-900">
                            {isAwaitingBuyer
                              ? "Aggregator's offer"
                              : "Requested produce"}
                          </h4>

                          {items.length > 0 && (
                            <span className="text-xs text-gray-400">
                              {items.length}{" "}
                              {items.length === 1 ? "item" : "items"}
                            </span>
                          )}
                        </div>

                        {!items.length ? (
                          <p className="text-sm text-gray-500">
                            No item details are available for this request.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {items.map((item) => {
                              const targetPrice = formatMoney(
                                item.target_price_per_unit
                              );
                              const proposedPrice = formatMoney(
                                item.proposed_unit_price
                              );
                              const hasProposedQuantity =
                                item.proposed_quantity !== null &&
                                item.proposed_quantity !== undefined;
                              const hasProposedPrice =
                                item.proposed_unit_price !== null &&
                                item.proposed_unit_price !== undefined;
                              const lineTotal =
                                hasProposedQuantity && hasProposedPrice
                                  ? Number(item.proposed_quantity) *
                                    Number(item.proposed_unit_price)
                                  : null;

                              return (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-gray-200 p-4"
                                >
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {item.crop_name}
                                      </p>
                                      <p className="mt-1 text-sm text-gray-600">
                                        Requested: {item.quantity} {item.unit}
                                      </p>

                                      {targetPrice && (
                                        <p className="mt-1 text-xs text-gray-500">
                                          Your target: {targetPrice} per{" "}
                                          {item.unit}
                                        </p>
                                      )}
                                    </div>

                                    {hasProposedQuantity || hasProposedPrice ? (
                                      <div className="rounded-lg bg-emerald-50 p-3 sm:min-w-52">
                                        <p className="text-xs font-semibold text-emerald-800">
                                          Aggregator's proposal
                                        </p>

                                        {hasProposedQuantity && (
                                          <p className="mt-2 text-sm text-emerald-900">
                                            Quantity:{" "}
                                            <strong>
                                              {item.proposed_quantity}{" "}
                                              {item.unit}
                                            </strong>
                                          </p>
                                        )}

                                        {hasProposedPrice && (
                                          <p className="mt-1 text-sm text-emerald-900">
                                            Price:{" "}
                                            <strong>
                                              {proposedPrice ||
                                                "Invalid price"}{" "}
                                              / {item.unit}
                                            </strong>
                                          </p>
                                        )}

                                        {lineTotal !== null &&
                                          Number.isFinite(lineTotal) &&
                                          lineTotal >= 0 && (
                                            <p className="mt-2 border-t border-emerald-200 pt-2 text-sm font-semibold text-emerald-900">
                                              Line total: {formatMoney(lineTotal)}
                                            </p>
                                          )}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400">
                                        No proposal yet
                                      </p>
                                    )}
                                  </div>

                                  {item.notes && (
                                    <p className="mt-3 text-sm leading-5 text-gray-500">
                                      Your requirements: {item.notes}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {isAwaitingBuyer && (
                          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                            <div className="flex items-start gap-3">
                              <Banknote
                                size={20}
                                className="mt-0.5 shrink-0 text-emerald-700"
                              />
                              <div>
                                <p className="text-sm font-medium text-emerald-900">
                                  Proposed offer total
                                </p>
                                <p className="mt-1 text-2xl font-semibold tracking-tight text-emerald-800">
                                  {offerTotal === null
                                    ? "Incomplete offer"
                                    : formatMoney(offerTotal)}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-emerald-800">
                                  Calculated from the proposed quantity and
                                  price for each item. Review the full offer
                                  before confirming.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {request.notes && (
                          <div className="mt-4">
                            <p className="text-sm font-semibold text-gray-800">
                              Your additional instructions
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-gray-600">
                              {request.notes}
                            </p>
                          </div>
                        )}

                        {request.offer_submitted_at && (
                          <p className="mt-4 text-xs text-gray-500">
                            Offer submitted:{" "}
                            {formatDateTime(request.offer_submitted_at)}
                          </p>
                        )}

                        {isAwaitingBuyer && (
                          <div className="mt-5 flex flex-col gap-2.5 border-t border-gray-100 pt-5 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => confirmOffer(request)}
                              disabled={
                                Boolean(actionRequestId) ||
                                offerTotal === null ||
                                items.length === 0
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {actionRequestId === request.id ? (
                                <LoaderCircle
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <CheckCircle2 size={17} />
                              )}
                              Confirm offer
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDecliningRequest(request);
                                setDeclineReason("");
                                setError("");
                                setNotice("");
                              }}
                              disabled={Boolean(actionRequestId)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <MessageSquare size={17} />
                              Request revision
                            </button>
                          </div>
                        )}

                        {status === "confirmed" && (
                          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-semibold text-gray-900">
                              What happens next?
                            </p>
                            <p className="mt-1 text-sm leading-5 text-gray-600">
                              Your offer has been confirmed. The aggregator can
                              proceed with the agreed pickup arrangements and
                              mark the request fulfilled when collection is
                              complete.
                            </p>
                          </div>
                        )}

                        {status === "fulfilled" && (
                          <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-4">
                            <p className="text-sm font-semibold text-teal-900">
                              Request fulfilled
                            </p>
                            <p className="mt-1 text-sm leading-5 text-teal-800">
                              The aggregator has marked this request as
                              fulfilled.
                            </p>
                          </div>
                        )}

                        <p className="mt-5 flex items-center gap-2 text-xs text-gray-400">
                          <Clock3 size={14} />
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

      {cancelDialogRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !actionRequestId
            ) {
              setCancelDialogRequest(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-request-title"
            className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
              <XCircle size={22} />
            </div>

            <h2
              id="cancel-request-title"
              className="text-lg font-semibold text-gray-900"
            >
              Cancel this request?
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              You are about to cancel request{" "}
              <strong>
                {cancelDialogRequest.id.slice(0, 8).toUpperCase()}
              </strong>
              . You can only cancel while it is still pending.
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCancelDialogRequest(null)}
                disabled={Boolean(actionRequestId)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Keep request
              </button>

              <button
                type="button"
                onClick={cancelRequest}
                disabled={Boolean(actionRequestId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionRequestId === cancelDialogRequest.id ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                Cancel request
              </button>
            </div>
          </section>
        </div>
      )}

      {decliningRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !actionRequestId
            ) {
              setDecliningRequest(null);
              setDeclineReason("");
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="decline-offer-title"
            className="w-full max-w-lg rounded-xl border border-gray-100 bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <MessageSquare size={21} />
            </div>

            <h2
              id="decline-offer-title"
              className="text-lg font-semibold text-gray-900"
            >
              Request an offer revision
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Explain what you would like the aggregator to review. Your
              response will be sent to the aggregator, they will
              review the request and prepare a revised offer.
            </p>

            <label
              htmlFor="decline-reason"
              className="mb-2 mt-5 block text-sm font-medium text-gray-700"
            >
              Reason or requested changes{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>

            <textarea
              id="decline-reason"
              rows={4}
              maxLength={1000}
              value={declineReason}
              onChange={(event) => setDeclineReason(event.target.value)}
              placeholder="For example, please review the proposed price or quantity..."
              className={inputClass}
              disabled={Boolean(actionRequestId)}
            />

            <p className="mt-1 text-right text-xs text-gray-400">
              {declineReason.length}/1000
            </p>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setDecliningRequest(null);
                  setDeclineReason("");
                }}
                disabled={Boolean(actionRequestId)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Keep reviewing
              </button>

              <button
                type="button"
                onClick={declineOffer}
                disabled={Boolean(actionRequestId)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {actionRequestId === decliningRequest.id ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <MessageSquare size={16} />
                )}
                Send revision request
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
