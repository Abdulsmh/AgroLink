import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import {
  ShieldAlert,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  Search,
  RefreshCw,
  Package,
  User,
  CalendarDays,
  Loader2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminDisputes = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchOrders = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          buyer_id,
          producer_id,
          product_id,
          quantity,
          total_amount,
          status,
          delivery_location,
          created_at,
          updated_at,
          buyer:buyer_id (
            id,
            full_name,
            phone_number,
            lga_location
          ),
          producer:producer_id (
            id,
            full_name,
            phone_number,
            lga_location
          ),
          product:product_id (
            id,
            crop_name,
            unit,
            location
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Disputes order fetch error:', error);
        throw error;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Failed to load order issues:', error);
      toast.error('Unable to load transaction data.');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /*
   * There is currently no disputes table in the AgroLink database.
   *
   * Therefore we use real order statuses as the basis for this page.
   * Cancelled orders are treated as the primary issue category.
   */
  const issueOrders = useMemo(() => {
    return orders.filter((order) => order.status === 'cancelled');
  }, [orders]);

  const stats = useMemo(() => {
    const cancelled = orders.filter(
      (order) => order.status === 'cancelled'
    );

    const completed = orders.filter(
      (order) => order.status === 'completed'
    );

    const active = orders.filter((order) =>
      ['confirmed', 'processing'].includes(order.status)
    );

    const cancelledValue = cancelled.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );

    return {
      totalOrders: orders.length,
      cancelled: cancelled.length,
      active: active.length,
      completed: completed.length,
      cancelledValue,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return issueOrders.filter((order) => {
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter;

      if (!matchesStatus) return false;

      if (!search) return true;

      const values = [
        order.id,
        order.product?.crop_name,
        order.buyer?.full_name,
        order.buyer?.phone_number,
        order.producer?.full_name,
        order.producer?.phone_number,
        order.delivery_location,
      ];

      return values.some((value) =>
        String(value || '').toLowerCase().includes(search)
      );
    });
  }, [issueOrders, searchTerm, statusFilter]);

  const formatCurrency = (amount) => {
    return `₦${Number(amount || 0).toLocaleString('en-NG')}`;
  };

  const formatDate = (date) => {
    if (!date) return '—';

    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          </div>

          <p className="text-sm font-bold text-slate-700">
            Loading resolution center...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Reviewing current transaction records
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              </div>

              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-600">
                Resolution Center
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Dispute & Order Resolution
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
              Monitor cancelled transactions and identify orders that may
              require administrative review.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Database limitation notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

        <div>
          <p className="text-xs font-bold text-blue-800">
            Resolution workflow status
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            AgroLink currently stores transaction orders but does not yet
            have a dedicated disputes or escrow table. This page therefore
            monitors real order records, with cancelled orders highlighted
            for administrative attention.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Total Orders"
          value={stats.totalOrders}
        />

        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Cancelled"
          value={stats.cancelled}
        />

        <StatCard
          icon={<MessageSquare className="h-5 w-5" />}
          label="Active Orders"
          value={stats.active}
        />

        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Completed"
          value={stats.completed}
        />
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order, buyer, producer or product..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          >
            <option value="all">All Issues</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Cases */}
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
            Cases Requiring Attention ({filteredOrders.length})
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Cancelled transactions identified from the current order records.
          </p>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />

            <h4 className="text-sm font-bold text-slate-700">
              No active cases found
            </h4>

            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-400">
              There are currently no cancelled orders requiring
              administrative attention.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <DisputeCard
                key={order.id}
                order={order}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Future workflow */}
      <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <ShieldAlert className="h-5 w-5 text-amber-300" />
          </div>

          <div>
            <h3 className="text-base font-black">
              Full dispute management can be added next
            </h3>

            <p className="mt-2 max-w-3xl text-xs leading-6 text-slate-300">
              A dedicated disputes table can later support dispute reasons,
              evidence, messages, admin decisions, resolution status,
              refunds and escrow handling without modifying the existing
              order workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition group-hover:scale-105">
        {icon}
      </div>

      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-slate-900">
        {value}
      </p>
    </div>
  );
};

const DisputeCard = ({
  order,
  formatCurrency,
  formatDate,
}) => {
  return (
    <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4 transition duration-300 hover:border-red-200 hover:bg-white hover:shadow-sm sm:p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Main information */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>

            <h4 className="text-sm font-black text-slate-900">
              Cancelled Order
            </h4>

            <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
              Requires Review
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoItem
              icon={<Package className="h-3.5 w-3.5" />}
              label="Order"
              value={`#${order.id?.slice(0, 8)}`}
            />

            <InfoItem
              icon={<Package className="h-3.5 w-3.5" />}
              label="Product"
              value={order.product?.crop_name || 'Unknown'}
            />

            <InfoItem
              icon={<User className="h-3.5 w-3.5" />}
              label="Buyer"
              value={order.buyer?.full_name || 'Unknown buyer'}
            />

            <InfoItem
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Updated"
              value={formatDate(order.updated_at)}
            />
          </div>
        </div>

        {/* Value */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-red-100 pt-4 lg:min-w-[190px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Transaction Value
            </p>

            <p className="mt-0.5 text-lg font-black text-red-600">
              {formatCurrency(order.total_amount)}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              toast(
                'Detailed dispute workflow will be connected after the disputes table is added.',
                {
                  icon: 'ℹ️',
                }
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <MessageSquare className="h-4 w-4" />
            Review Order
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ icon, label, value }) => {
  return (
    <div className="min-w-0 rounded-xl bg-white/70 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-slate-400">
        {icon}

        <span className="text-[9px] font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="truncate text-xs font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
};