import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../config/supabaseClient';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Package,
  BarChart3,
  MapPin,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminMarketPricing = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productType, setProductType] = useState('all');

  const fetchMarketData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          crop_name,
          quantity,
          unit,
          price_per_unit,
          location,
          product_type,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Market pricing fetch error:', error);
        throw error;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Failed to load market pricing:', error);
      toast.error('Unable to load market pricing data.');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const marketStats = useMemo(() => {
    const validProducts = products.filter(
      (product) =>
        Number(product.price_per_unit) > 0 &&
        Number(product.quantity) >= 0
    );

    const totalListings = validProducts.length;

    const totalStock = validProducts.reduce(
      (sum, product) => sum + Number(product.quantity || 0),
      0
    );

    const totalValue = validProducts.reduce(
      (sum, product) =>
        sum +
        Number(product.quantity || 0) *
          Number(product.price_per_unit || 0),
      0
    );

    const uniqueCommodities = new Set(
      validProducts.map((product) =>
        String(product.crop_name || '').trim().toLowerCase()
      )
    ).size;

    return {
      totalListings,
      totalStock,
      totalValue,
      uniqueCommodities,
    };
  }, [products]);

  const benchmarks = useMemo(() => {
    const grouped = {};

    products.forEach((product) => {
      const commodity = String(product.crop_name || '').trim();

      if (!commodity || Number(product.price_per_unit) <= 0) {
        return;
      }

      const key = commodity.toLowerCase();

      if (!grouped[key]) {
        grouped[key] = {
          commodity,
          listings: 0,
          totalQuantity: 0,
          weightedValue: 0,
          prices: [],
          locations: {},
          productTypes: {},
        };
      }

      const quantity = Number(product.quantity || 0);
      const price = Number(product.price_per_unit || 0);

      grouped[key].listings += 1;
      grouped[key].totalQuantity += quantity;
      grouped[key].weightedValue += quantity * price;
      grouped[key].prices.push(price);

      const location = product.location?.trim();

      if (location) {
        grouped[key].locations[location] =
          (grouped[key].locations[location] || 0) + 1;
      }

      const type = product.product_type || 'post_harvest';

      grouped[key].productTypes[type] =
        (grouped[key].productTypes[type] || 0) + 1;
    });

    return Object.values(grouped)
      .map((item) => {
        const averagePrice =
          item.totalQuantity > 0
            ? item.weightedValue / item.totalQuantity
            : item.prices.reduce((sum, price) => sum + price, 0) /
              item.prices.length;

        const sortedPrices = [...item.prices].sort((a, b) => a - b);

        const lowestPrice = sortedPrices[0] || 0;
        const highestPrice =
          sortedPrices[sortedPrices.length - 1] || 0;

        const topLocation = Object.entries(item.locations).sort(
          (a, b) => b[1] - a[1]
        )[0];

        const dominantType = Object.entries(item.productTypes).sort(
          (a, b) => b[1] - a[1]
        )[0];

        return {
          commodity: item.commodity,
          averagePrice,
          lowestPrice,
          highestPrice,
          listings: item.listings,
          quantity: item.totalQuantity,
          location: topLocation?.[0] || 'Multiple locations',
          productType:
            dominantType?.[0] === 'pre_harvest'
              ? 'Pre-harvest'
              : 'Post-harvest',
        };
      })
      .sort((a, b) => b.listings - a.listings);
  }, [products]);

  const filteredBenchmarks = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return benchmarks.filter((item) => {
      const matchesSearch =
        !search ||
        item.commodity.toLowerCase().includes(search) ||
        item.location.toLowerCase().includes(search);

      const matchesType =
        productType === 'all' ||
        item.productType.toLowerCase().includes(
          productType === 'pre_harvest'
            ? 'pre-harvest'
            : 'post-harvest'
        );

      return matchesSearch && matchesType;
    });
  }, [benchmarks, searchTerm, productType]);

  const formatCurrency = (amount) => {
    return `₦${Number(amount || 0).toLocaleString('en-NG', {
      maximumFractionDigits: 0,
    })}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>

          <p className="text-sm font-bold text-slate-700">
            Loading market intelligence...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Analyzing current AgroLink listings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
            </div>

            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600">
              Price Intelligence
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Market Benchmark Pricing
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            Monitor commodity pricing patterns using active AgroLink
            marketplace listings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchMarketData(true)}
          disabled={refreshing}
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-xs font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? 'animate-spin' : ''
            }`}
          />
          Refresh Data
        </button>
      </div>

      {/* Data notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

        <div>
          <p className="text-xs font-bold text-blue-800">
            AgroLink Marketplace Benchmark
          </p>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            These figures are calculated from prices currently listed on
            AgroLink. They should not be presented as official external
            market quotations from Dawanau, Kadawa or other markets.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Package className="h-5 w-5" />}
          label="Active Listings"
          value={marketStats.totalListings}
        />

        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Commodities"
          value={marketStats.uniqueCommodities}
        />

        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Listed Quantity"
          value={marketStats.totalStock.toLocaleString('en-NG')}
        />

        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Listed Value"
          value={formatCurrency(marketStats.totalValue)}
        />
      </div>

      {/* Search and filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search commodity or location..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All Product Types</option>
            <option value="pre_harvest">Pre-harvest</option>
            <option value="post_harvest">Post-harvest</option>
          </select>
        </div>
      </div>

      {/* Benchmark list */}
      <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Current Marketplace Benchmarks
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Average prices calculated from current product listings.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-400">
            {filteredBenchmarks.length} commodities
          </span>
        </div>

        {filteredBenchmarks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <Search className="mx-auto mb-3 h-9 w-9 text-slate-300" />

            <h4 className="text-sm font-bold text-slate-700">
              No matching commodities
            </h4>

            <p className="mt-1 text-xs text-slate-400">
              Try another search term or change the product filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBenchmarks.map((item) => (
              <BenchmarkCard
                key={item.commodity}
                item={item}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition group-hover:scale-105">
        {icon}
      </div>

      <p className="text-xs font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-lg font-black text-slate-900 sm:text-xl">
        {value}
      </p>
    </div>
  );
};

const BenchmarkCard = ({ item, formatCurrency }) => {
  const priceRange =
    item.lowestPrice !== item.highestPrice
      ? `${formatCurrency(item.lowestPrice)} – ${formatCurrency(
          item.highestPrice
        )}`
      : formatCurrency(item.lowestPrice);

  return (
    <div className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Commodity */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-black text-slate-900">
              {item.commodity}
            </h4>

            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
              {item.productType}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              {item.location}
            </span>

            <span className="inline-flex items-center gap-1">
              <Package className="h-3.5 w-3.5 text-emerald-600" />
              {item.listings} listing
              {item.listings !== 1 ? 's' : ''}
            </span>

            <span>
              {item.quantity.toLocaleString('en-NG')} units listed
            </span>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 lg:justify-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Average Listed Price
            </p>

            <p className="mt-0.5 text-lg font-black text-emerald-600">
              {formatCurrency(item.averagePrice)}
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Observed Range
            </p>

            <p className="mt-0.5 text-xs font-bold text-slate-700">
              {priceRange}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};