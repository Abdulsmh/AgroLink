import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import {
  Truck,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  Loader2,
  Search,
  RefreshCw,
  AlertTriangle,
  User,
  Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function AdminLogisticsHub() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchLogistics = async (isRefresh = false) => {
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
        .in('status', ['confirmed', 'processing', 'completed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Logistics fetch error:', error);
        throw error;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Failed to load logistics:', error);
      toast.error('Unable to load logistics data.');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogistics();
  }, []);

  const logisticsStats = useMemo(() => {
    const active = orders.filter(
      (order) =>
        order.status === 'confirmed' || order.status === 'processing'
    );

    const completed = orders.filter(
      (order) => order.status === 'completed'
    );

    const totalQuantity = active.reduce(
      (sum, order) => sum + Number(order.quantity || 0),
      0
    );

    const totalValue = active.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );

    return {
      total: orders.length,
      active: active.length,
      completed: completed.length,
      quantity: totalQuantity,
      value: totalValue,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter;

      if (!matchesStatus) return false;

      if (!search) return true;

      const values = [
        order.id,
        order.delivery_location,
        order.buyer?.full_name,
        order.buyer?.phone_number,
        order.buyer?.lga_location,
        order.producer?.full_name,
        order.producer?.lga_location,
        order.product?.crop_name,
      ];

      return values.some((value) =>
        String(value || '').toLowerCase().includes(search)
      );
    });
  }, [orders, searchTerm, statusFilter]);

  const formatCurrency = (amount) => {
    return `₦${Number(amount || 0).toLocaleString('en-NG')}`;
  };

  const formatStatus = (status) => {
    const statusMap = {
      confirmed: 'Confirmed',
      processing: 'In Transit',
      completed: 'Delivered',
    };

    return statusMap[status] || status;
  };

  const getStatusClasses = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-50 text-blue-700 border-blue-200';

      case 'processing':
        return 'bg-amber-50 text-amber-700 border-amber-200';

      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';

      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>

          <p className="text-sm font-semibold text-slate-700">
            Loading logistics hub...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Fetching current order movements
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <Truck className="h-5 w-5 text-emerald-600" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Operations
            </span>
          </div>

          <h3 className="text-2xl font-black tracking-tight text-slate-900">
            Logistics & Haulage Hub
          </h3>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Monitor active agricultural orders, delivery destinations and
            completed movements across the AgroLink marketplace.
          </p>
        </div>

        <button
          onClick={() => fetchLogistics(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Truck className="h-5 w-5" />}
          label="Logistics Orders"
          value={logisticsStats.total}
        />

        <StatCard
          icon={<Navigation className="h-5 w-5" />}
          label="Active Movement"
          value={logisticsStats.active}
        />

        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Quantity in Movement"
          value={logisticsStats.quantity.toLocaleString('en-NG')}
        />

        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Delivered"
          value={logisticsStats.completed}
        />
      </div>

      {/* Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search buyer, producer, crop, destination..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All Movements</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">In Transit</option>
            <option value="completed">Delivered</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          {orders.length === 0 ? (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
                <Truck className="h-8 w-8 text-slate-300" />
              </div>

              <h4 className="font-bold text-slate-800">
                No Logistics Movements
              </h4>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                There are currently no confirmed, processing or completed
                orders requiring logistics monitoring.
              </p>
            </>
          ) : (
            <>
              <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />

              <h4 className="font-bold text-slate-800">
                No Matching Orders
              </h4>

              <p className="mt-1 text-sm text-slate-400">
                Try changing your search or status filter.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {filteredOrders.map((order) => (
            <LogisticsCard
              key={order.id}
              order={order}
              formatCurrency={formatCurrency}
              formatStatus={formatStatus}
              getStatusClasses={getStatusClasses}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105">
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
}

function LogisticsCard({
  order,
  formatCurrency,
  formatStatus,
  getStatusClasses,
}) {
  const createdDate = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Top */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClasses(
                order.status
              )}`}
            >
              {formatStatus(order.status)}
            </span>

            <span className="text-[11px] font-medium text-slate-400">
              #{order.id?.slice(0, 8)}
            </span>
          </div>

          <h4 className="mt-2 text-base font-black text-slate-900">
            {order.product?.crop_name || 'Agricultural Produce'}
          </h4>

          <p className="mt-1 text-xs text-slate-500">
            Order created {createdDate}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            Order Value
          </p>

          <p className="mt-0.5 text-sm font-black text-emerald-700">
            {formatCurrency(order.total_amount)}
          </p>
        </div>
      </div>

      {/* Route */}
      <div className="p-5">
        <div className="relative space-y-5">
          <div className="absolute left-[9px] top-5 h-12 border-l border-dashed border-slate-300" />

          <div className="relative flex gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <div className="h-2 w-2 rounded-full bg-emerald-600" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Producer
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-800">
                {order.producer?.full_name || 'Unknown Producer'}
              </p>

              <p className="text-xs text-slate-500">
                {order.producer?.lga_location ||
                  order.product?.location ||
                  'Location not provided'}
              </p>
            </div>
          </div>

          <div className="relative flex gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <MapPin className="h-3 w-3 text-blue-600" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Delivery Destination
              </p>

              <p className="mt-0.5 text-sm font-bold text-slate-800">
                {order.delivery_location ||
                  order.buyer?.lga_location ||
                  'Destination not provided'}
              </p>

              <p className="text-xs text-slate-500">
                {order.buyer?.full_name || 'Wholesale Buyer'}
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div className="rounded-xl bg-slate-50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-slate-400">
              <Package className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase">
                Quantity
              </span>
            </div>

            <p className="text-sm font-bold text-slate-800">
              {Number(order.quantity || 0).toLocaleString('en-NG')}{' '}
              {order.product?.unit || 'units'}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-slate-400">
              <User className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase">
                Buyer
              </span>
            </div>

            <p className="truncate text-sm font-bold text-slate-800">
              {order.buyer?.full_name || 'Wholesale Buyer'}
            </p>
          </div>
        </div>

        {/* Logistics notice */}
        {order.status === 'confirmed' && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

            <p className="text-xs leading-5 text-blue-700">
              Order is confirmed and may require logistics coordination.
            </p>
          </div>
        )}

        {order.status === 'processing' && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

            <p className="text-xs leading-5 text-amber-700">
              Order is currently being processed for delivery.
            </p>
          </div>
        )}

        {order.status === 'completed' && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

            <p className="text-xs leading-5 text-emerald-700">
              This order has been marked as completed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}