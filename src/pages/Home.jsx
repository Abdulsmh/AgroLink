import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Leaf,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Tractor,
  TrendingUp,
  Users,
  Wheat,
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';

const formatNumber = (value) => {
  return new Intl.NumberFormat('en-NG').format(Number(value || 0));
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const getProductImage = (imagePath) => {
  if (!imagePath) return null;

  try {
    const parsed = JSON.parse(imagePath);

    if (Array.isArray(parsed)) {
      return parsed[0] || null;
    }

    return parsed || null;
  } catch {
    return imagePath;
  }
};

const getStorageImageUrl = (imagePath) => {
  const path = getProductImage(imagePath);

  if (!path) return null;

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const cleanedPath = path
    .replace(/^product-images\//, '')
    .replace(/^\/+/, '');

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(cleanedPath);

  return data?.publicUrl || null;
};

const getProductTypeLabel = (type) => {
  return type === 'pre_harvest' ? 'Pre-Harvest' : 'Post-Harvest';
};

const getProductTypeClasses = (type) => {
  if (type === 'pre_harvest') {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  return 'border-emerald-100 bg-emerald-50 text-emerald-700';
};

/* =========================================================
   STAT CARD
========================================================= */

const StatCard = ({ icon: Icon, label, value }) => {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg sm:rounded-2xl sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 sm:h-11 sm:w-11 sm:rounded-xl">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>

        <TrendingUp className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4" />
      </div>

      <p className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:mt-5 sm:text-2xl">
        {formatNumber(value)}
      </p>

      <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500 sm:text-xs">
        {label}
      </p>
    </div>
  );
};

/* =========================================================
   PRODUCT CARD
========================================================= */

const ProductCard = ({ product }) => {
  const imageUrl = getStorageImageUrl(product.image_path);

  const title = product.crop_name || 'Agricultural Produce';
  const location = product.location || 'Location not specified';
  const unit = product.unit || 'unit';
  const price = formatCurrency(product.price_per_unit);
  const productType = product.product_type || 'post_harvest';

  return (
    <Link
      to="/catalog"
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/10 sm:rounded-3xl sm:duration-500 sm:hover:-translate-y-2"
    >
      {/* Image */}
      <div className="relative h-32 overflow-hidden bg-emerald-50 sm:h-44 lg:h-48">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100 via-lime-50 to-white">
            <Leaf className="absolute -right-5 -top-5 h-20 w-20 rotate-12 text-emerald-200/60 sm:h-28 sm:w-28" />

            <Sprout className="absolute -bottom-5 -left-4 h-16 w-16 -rotate-12 text-emerald-200/70 sm:h-24 sm:w-24" />

            <Wheat className="relative h-10 w-10 text-emerald-600/70 sm:h-14 sm:w-14" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1.5 p-2 sm:p-3">
          <span
            className={`max-w-[70%] truncate rounded-full border px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide backdrop-blur-md sm:px-2.5 sm:text-[10px] ${getProductTypeClasses(
              productType
            )}`}
          >
            {getProductTypeLabel(productType)}
          </span>

          <span className="shrink-0 rounded-full border border-white/30 bg-slate-950/75 px-2 py-1 text-[8px] font-bold text-white backdrop-blur-md sm:px-2.5 sm:text-[10px]">
            {unit}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/50 to-transparent opacity-80 sm:h-24" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="flex min-w-0 items-center gap-1 text-[9px] font-medium text-slate-400 sm:gap-1.5 sm:text-[11px]">
          <MapPin className="h-3 w-3 shrink-0 text-emerald-600 sm:h-3.5 sm:w-3.5" />

          <span className="truncate">{location}</span>
        </div>

        <h3 className="mt-1.5 line-clamp-2 text-sm font-black capitalize leading-snug text-slate-900 transition-colors group-hover:text-emerald-600 sm:mt-2 sm:text-base">
          {title}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-1 border-t border-slate-100 pt-3 sm:pt-4">
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400 sm:text-[10px]">
              Price
            </p>

            <p className="mt-0.5 truncate text-sm font-black text-slate-900 sm:text-lg">
              ₦{price}
            </p>

            <span className="text-[8px] font-bold text-slate-400 sm:text-[10px]">
              / {unit}
            </span>
          </div>

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transition-all duration-300 group-hover:bg-emerald-500 sm:h-9 sm:w-9 sm:rounded-xl">
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
};

/* =========================================================
   HOME
========================================================= */

export const Home = () => {
  const [featuredProduce, setFeaturedProduce] = useState([]);

  const [stats, setStats] = useState({
    products: 0,
    producers: 0,
    completedOrders: 0,
    locations: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const words = [
    'Local Markets.',
    'Wholesale Buyers.',
    'Direct Processors.',
  ];

  /* =========================================================
     TYPING ANIMATION
  ========================================================== */

  useEffect(() => {
    const fullText = words[currentWordIndex];

    let delay = isDeleting ? 55 : 110;

    if (!isDeleting && currentText === fullText) {
      delay = 1800;
    }

    if (isDeleting && currentText === '') {
      delay = 500;
    }

    const timer = setTimeout(() => {
      if (!isDeleting && currentText === fullText) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting && currentText === '') {
        setIsDeleting(false);

        setCurrentWordIndex(
          (previous) => (previous + 1) % words.length
        );

        return;
      }

      setCurrentText(
        fullText.substring(
          0,
          currentText.length + (isDeleting ? -1 : 1)
        )
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [currentText, currentWordIndex, isDeleting]);

  /* =========================================================
     FETCH REAL HOMEPAGE DATA
  ========================================================== */

  useEffect(() => {
    let isMounted = true;

    const fetchHomeData = async () => {
      setIsLoading(true);
      setStatsLoading(true);
      setLoadError(false);

      try {
        const productsPromise = supabase
          .from('products')
          .select(`
            id,
            producer_id,
            crop_name,
            quantity,
            unit,
            price_per_unit,
            location,
            image_path,
            product_type,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(8);

        const [
          productsCountResult,
          producersCountResult,
          ordersCountResult,
          profilesResult,
          productsResult,
        ] = await Promise.all([
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true }),

          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .in('role', ['producer', 'aggregator']),

          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'completed'),

          supabase
            .from('profiles')
            .select('lga_location')
            .not('lga_location', 'is', null),

          productsPromise,
        ]);

        if (!isMounted) return;

        if (productsResult.error) {
          console.error(
            'Error fetching homepage products:',
            productsResult.error
          );

          setFeaturedProduce([]);
          setLoadError(true);
        } else {
          setFeaturedProduce(productsResult.data || []);
        }

        const locations = new Set(
          (profilesResult.data || [])
            .map((profile) => profile.lga_location)
            .filter(Boolean)
            .map((location) => location.trim().toLowerCase())
        );

        setStats({
          products: productsCountResult.count || 0,
          producers: producersCountResult.count || 0,
          completedOrders: ordersCountResult.count || 0,
          locations: locations.size,
        });
      } catch (error) {
        console.error('Homepage data error:', error);

        if (isMounted) {
          setFeaturedProduce([]);
          setLoadError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setStatsLoading(false);
        }
      }
    };

    fetchHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const typeCounts = useMemo(() => {
    return featuredProduce.reduce(
      (accumulator, product) => {
        if (product.product_type === 'pre_harvest') {
          accumulator.pre += 1;
        } else {
          accumulator.post += 1;
        }

        return accumulator;
      },
      {
        pre: 0,
        post: 0,
      }
    );
  }, [featuredProduce]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 font-sans text-slate-900">
      {/* =========================================================
          HERO
      ========================================================== */}

      <section className="relative overflow-hidden bg-slate-950 text-white">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_85%_30%,rgba(20,184,166,0.12),transparent_28%)]" />

        {/* Desktop decorative SVG */}
        <svg
          className="pointer-events-none absolute right-0 top-0 hidden h-full w-1/2 opacity-20 md:block"
          viewBox="0 0 600 700"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M600 40C510 80 470 160 490 240C510 320 570 350 520 440C480 510 380 520 360 700"
            stroke="currentColor"
            strokeWidth="1"
          />

          <path
            d="M600 120C530 160 520 220 540 280C560 340 600 380 570 450"
            stroke="currentColor"
            strokeWidth="1"
          />

          <circle cx="490" cy="240" r="5" fill="currentColor" />
          <circle cx="520" cy="440" r="5" fill="currentColor" />
        </svg>

        {/* Floating icons - hidden on mobile */}
        <div className="pointer-events-none absolute inset-0 hidden overflow-hidden sm:block">
          <Leaf className="absolute left-[7%] top-[22%] h-10 w-10 rotate-45 animate-[bounce_7s_ease-in-out_infinite] text-emerald-500/20 md:h-12 md:w-12" />

          <Sprout className="absolute bottom-[18%] left-[15%] h-12 w-12 -rotate-12 animate-[pulse_5s_ease-in-out_infinite] text-emerald-400/15 md:h-16 md:w-16" />

          <Wheat className="absolute right-[9%] top-[25%] h-14 w-14 rotate-12 animate-[bounce_8s_ease-in-out_infinite] text-emerald-500/20 md:h-20 md:w-20" />

          <Sparkles className="absolute bottom-[28%] right-[22%] h-7 w-7 animate-pulse text-emerald-300/20" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:min-h-[calc(100vh-5rem)] lg:px-8 lg:py-16">
          <div className="grid w-full grid-cols-1 items-center gap-10 md:gap-12 lg:grid-cols-12 lg:gap-10">
            {/* Hero copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-emerald-400 sm:gap-2 sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.18em]">
                <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                Digital Agriculture Marketplace
              </div>

              <h1 className="mt-5 max-w-4xl text-3xl font-black leading-[1.08] tracking-tight sm:mt-7 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
                Connecting Local Farms Directly to{' '}

                <span className="mt-1 block min-h-[1.12em] text-emerald-400 sm:mt-2">
                  {currentText}

                  <span className="ml-0.5 animate-pulse font-normal sm:ml-1">
                    |
                  </span>
                </span>
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-7 sm:text-base sm:leading-7 md:text-lg md:leading-8">
                AgroLink gives producers a direct digital marketplace to
                showcase agricultural products while helping buyers
                discover produce, compare listings and connect with local
                agricultural suppliers.
              </p>

              <div className="mt-7 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
                <Link
                  to="/catalog"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white shadow-xl shadow-emerald-600/20 transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-500 sm:rounded-2xl sm:px-7 sm:py-4 sm:text-sm"
                >
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />

                  Explore Marketplace

                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
                </Link>

                <Link
                  to="/register"
                  className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-white/5 px-5 py-3 text-xs font-black text-slate-100 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-white/10 sm:rounded-2xl sm:px-7 sm:py-4 sm:text-sm"
                >
                  Become a Producer

                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
                </Link>
              </div>

              {/* Trust points */}
              <div className="mt-7 flex flex-col gap-2.5 text-[10px] font-semibold text-slate-400 sm:mt-9 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-3 sm:text-xs">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4" />
                  Real marketplace listings
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4" />
                  Local agricultural supply
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 sm:h-4 sm:w-4" />
                  Direct producer access
                </span>
              </div>
            </div>

            {/* Hero visual */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none">
                <div className="absolute -inset-3 rounded-[1.5rem] bg-emerald-500/10 blur-2xl sm:-inset-4 sm:rounded-[2rem] sm:blur-3xl" />

                <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-2 shadow-2xl backdrop-blur-xl sm:rounded-[2rem] sm:p-3">
                  <div className="relative h-64 overflow-hidden rounded-xl bg-slate-900 sm:h-80 sm:rounded-[1.5rem] md:h-96 lg:h-[420px]">
                    <img
                      src="/farmerHero.jpg"
                      alt="Local farmer working in an agricultural field"
                      className="h-full w-full object-cover transition duration-1000 hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />

                    {/* Floating information card */}
                    <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/10 bg-slate-950/85 p-3 shadow-xl backdrop-blur-xl sm:bottom-5 sm:left-5 sm:right-5 sm:rounded-2xl sm:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-emerald-400 sm:text-[10px] sm:tracking-[0.16em]">
                            AgroLink Marketplace
                          </p>

                          <p className="mt-1 truncate text-xs font-black text-white sm:text-sm">
                            Connecting agricultural supply
                          </p>
                        </div>

                        <div className="relative flex h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 sm:h-3 sm:w-3" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hero mini stats */}
                  <div className="grid grid-cols-3 gap-1.5 p-1.5 pt-2 sm:gap-2.5 sm:p-2 sm:pt-3">
                    <div className="rounded-lg border border-white/5 bg-slate-950/60 p-2 text-center sm:rounded-xl sm:p-3">
                      <p className="text-[7px] font-bold uppercase tracking-wide text-slate-500 sm:text-[9px]">
                        Listings
                      </p>

                      <p className="mt-0.5 text-[10px] font-black text-emerald-400 sm:mt-1 sm:text-xs">
                        Live
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-slate-950/60 p-2 text-center sm:rounded-xl sm:p-3">
                      <p className="text-[7px] font-bold uppercase tracking-wide text-slate-500 sm:text-[9px]">
                        Supply
                      </p>

                      <p className="mt-0.5 text-[10px] font-black text-emerald-400 sm:mt-1 sm:text-xs">
                        Local
                      </p>
                    </div>

                    <div className="rounded-lg border border-white/5 bg-slate-950/60 p-2 text-center sm:rounded-xl sm:p-3">
                      <p className="text-[7px] font-bold uppercase tracking-wide text-slate-500 sm:text-[9px]">
                        Access
                      </p>

                      <p className="mt-0.5 text-[10px] font-black text-emerald-400 sm:mt-1 sm:text-xs">
                        Direct
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PLATFORM STATS
      ========================================================== */}

      <section className="relative z-20 mx-auto -mt-5 max-w-6xl px-4 sm:-mt-7 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
          {statsLoading ? (
            [1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white shadow-lg sm:h-32 sm:rounded-2xl"
              />
            ))
          ) : (
            <>
              <StatCard
                icon={PackageCheck}
                label="Marketplace Listings"
                value={stats.products}
              />

              <StatCard
                icon={Users}
                label="Producers & Aggregators"
                value={stats.producers}
              />

              <StatCard
                icon={CheckCircle2}
                label="Completed Orders"
                value={stats.completedOrders}
              />

              <StatCard
                icon={MapPin}
                label="Producer Locations"
                value={stats.locations}
              />
            </>
          )}
        </div>
      </section>

      {/* =========================================================
          RECENT MARKETPLACE
      ========================================================== */}

      <section className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pt-24">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-600 sm:text-xs sm:tracking-[0.18em]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 sm:h-2 sm:w-2" />
              Live Marketplace
            </div>

            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 sm:mt-2 sm:text-3xl md:text-4xl">
              Recently Listed Produce
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
              Browse the latest agricultural products currently listed by
              producers on AgroLink.
            </p>
          </div>

          <Link
            to="/catalog"
            className="group inline-flex items-center justify-center gap-2 self-stretch rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100 sm:self-auto sm:text-xs"
          >
            View Marketplace

            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
          </Link>
        </div>

        {/* Type indicators */}
        {!isLoading && featuredProduce.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5 sm:mb-6 sm:gap-2">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[9px] font-bold text-slate-500 sm:px-3 sm:py-1.5 sm:text-[10px]">
              {formatNumber(featuredProduce.length)} recent listings
            </span>

            {typeCounts.pre > 0 && (
              <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[9px] font-bold text-amber-700 sm:px-3 sm:py-1.5 sm:text-[10px]">
                {typeCounts.pre} pre-harvest
              </span>
            )}

            {typeCounts.post > 0 && (
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700 sm:px-3 sm:py-1.5 sm:text-[10px]">
                {typeCounts.post} post-harvest
              </span>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white sm:rounded-3xl"
              >
                <div className="h-32 animate-pulse bg-slate-200 sm:h-44 lg:h-48" />

                <div className="space-y-2.5 p-3 sm:space-y-3 sm:p-5">
                  <div className="h-2.5 w-16 animate-pulse rounded bg-slate-200 sm:h-3 sm:w-24" />

                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200 sm:h-5 sm:w-32" />

                  <div className="h-7 w-full animate-pulse rounded bg-slate-100 sm:h-8" />
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7 text-center sm:rounded-3xl sm:p-10">
            <PackageCheck className="mx-auto h-8 w-8 text-amber-500 sm:h-10 sm:w-10" />

            <h3 className="mt-3 text-base font-black text-slate-900 sm:mt-4 sm:text-lg">
              Marketplace temporarily unavailable
            </h3>

            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
              We couldn't load the latest listings right now. Please try
              the marketplace again shortly.
            </p>

            <Link
              to="/catalog"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-black text-white transition hover:bg-emerald-500 sm:mt-5 sm:px-5 sm:py-3 sm:text-xs"
            >
              Open Marketplace
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </div>
        ) : featuredProduce.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center sm:rounded-3xl sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-16 sm:w-16 sm:rounded-2xl">
              <PackageCheck className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>

            <h3 className="mt-4 text-base font-black text-slate-900 sm:mt-5 sm:text-lg">
              No marketplace listings yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
              New agricultural products posted by producers will appear
              here automatically.
            </p>

            <Link
              to="/register"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-black text-white transition hover:bg-emerald-500 sm:mt-5 sm:px-5 sm:py-3 sm:text-xs"
            >
              Become a Producer
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {featuredProduce.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* =========================================================
          MARKET SEGMENTS
      ========================================================== */}

      <section className="border-y border-slate-200 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-600 sm:text-xs sm:tracking-[0.18em]">
              Explore Supply
            </span>

            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 sm:mt-2 sm:text-3xl md:text-4xl">
              Find Produce for Every Stage
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-500 sm:mt-3 sm:text-sm sm:leading-6 md:text-base">
              AgroLink supports both agricultural products that are still
              growing and produce that is ready for trade.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-6 md:grid-cols-2">
            {/* Pre-harvest */}
            <Link
              to="/pre-harvest"
              className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-lime-50 p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-900/10 sm:rounded-[2rem] sm:p-7 lg:p-9"
            >
              <Sprout className="absolute -right-5 -top-5 h-28 w-28 rotate-12 text-amber-200/60 transition-transform duration-700 group-hover:rotate-6 group-hover:scale-110 sm:h-40 sm:w-40" />

              <div className="relative z-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl">
                  <Sprout className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>

                <span className="mt-4 inline-flex rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-700 sm:mt-6 sm:px-3 sm:text-[10px]">
                  Pre-Harvest
                </span>

                <h3 className="mt-2 text-xl font-black text-slate-900 sm:mt-3 sm:text-2xl">
                  Plan and connect before harvest
                </h3>

                <p className="mt-2 max-w-lg text-xs leading-5 text-slate-600 sm:mt-3 sm:text-sm sm:leading-6">
                  Discover agricultural opportunities and producer
                  listings for crops that are still in production.
                </p>

                <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-black text-amber-700 sm:mt-6 sm:text-xs">
                  Explore Pre-Harvest
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
                </span>
              </div>
            </Link>

            {/* Post-harvest */}
            <Link
              to="/post-harvest"
              className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10 sm:rounded-[2rem] sm:p-7 lg:p-9"
            >
              <Wheat className="absolute -right-5 -top-5 h-28 w-28 rotate-12 text-emerald-200/60 transition-transform duration-700 group-hover:rotate-6 group-hover:scale-110 sm:h-40 sm:w-40" />

              <div className="relative z-10">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm sm:h-14 sm:w-14 sm:rounded-2xl">
                  <Wheat className="h-5 w-5 sm:h-7 sm:w-7" />
                </div>

                <span className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 sm:mt-6 sm:px-3 sm:text-[10px]">
                  Post-Harvest
                </span>

                <h3 className="mt-2 text-xl font-black text-slate-900 sm:mt-3 sm:text-2xl">
                  Find produce ready for trade
                </h3>

                <p className="mt-2 max-w-lg text-xs leading-5 text-slate-600 sm:mt-3 sm:text-sm sm:leading-6">
                  Browse agricultural products that have already been
                  harvested and are available for marketplace transactions.
                </p>

                <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-black text-emerald-700 sm:mt-6 sm:text-xs">
                  Explore Post-Harvest
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          HOW IT WORKS
      ========================================================== */}

      <section
        id="how-it-works"
        className="relative overflow-hidden bg-slate-100/80 py-14 sm:py-20"
      >
        <div className="absolute left-0 top-0 h-48 w-48 rounded-full bg-emerald-200/20 blur-3xl sm:h-64 sm:w-64" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-600 sm:text-xs sm:tracking-[0.18em]">
              How AgroLink Works
            </span>

            <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900 sm:mt-2 sm:text-3xl md:text-4xl">
              From Farm to Marketplace
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-600 sm:mt-3 sm:text-sm sm:leading-6 md:text-base">
              A simple digital workflow designed to make agricultural
              discovery and trade easier.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:mt-12 sm:gap-5 md:grid-cols-3">
            {/* Step 1 */}
            <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14 sm:rounded-2xl">
                <Tractor className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>

              <span className="absolute right-5 top-5 text-3xl font-black text-slate-100 sm:right-6 sm:top-6 sm:text-4xl">
                01
              </span>

              <h3 className="mt-4 text-base font-black text-slate-900 sm:mt-6 sm:text-lg">
                Producers List
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                Producers add their agricultural products, available
                quantities, prices and locations to the marketplace.
              </p>
            </div>

            {/* Step 2 */}
            <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14 sm:rounded-2xl">
                <Search className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>

              <span className="absolute right-5 top-5 text-3xl font-black text-slate-100 sm:right-6 sm:top-6 sm:text-4xl">
                02
              </span>

              <h3 className="mt-4 text-base font-black text-slate-900 sm:mt-6 sm:text-lg">
                Buyers Discover
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                Buyers explore available agricultural products and
                identify listings that match their requirements.
              </p>
            </div>

            {/* Step 3 */}
            <div className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-transform duration-300 group-hover:scale-110 sm:h-14 sm:w-14 sm:rounded-2xl">
                <ShoppingBag className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>

              <span className="absolute right-5 top-5 text-3xl font-black text-slate-100 sm:right-6 sm:top-6 sm:text-4xl">
                03
              </span>

              <h3 className="mt-4 text-base font-black text-slate-900 sm:mt-6 sm:text-lg">
                Trade & Fulfil
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                Orders can move through the AgroLink workflow from
                confirmation to processing and completion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          VALUE PROPOSITION
      ========================================================== */}

      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:gap-5 md:grid-cols-3">
            {/* Trust */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:h-12 sm:w-12 sm:rounded-2xl">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>

              <h3 className="mt-4 text-base font-black text-slate-900 sm:mt-5 sm:text-lg">
                Trust & Verification
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                Producer verification workflows help administrators
                maintain a more trusted agricultural marketplace.
              </p>
            </div>

            {/* Visibility */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-12 sm:w-12 sm:rounded-2xl">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>

              <h3 className="mt-4 text-base font-black text-slate-900 sm:mt-5 sm:text-lg">
                Better Market Visibility
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                Product listings give buyers clearer visibility into
                available agricultural supply, prices and locations.
              </p>
            </div>

            {/* Participants */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl sm:p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 sm:h-12 sm:w-12 sm:rounded-2xl">
                <Users className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>

              <h3 className="mt-4 text-base font-black text-slate-900 sm:mt-5 sm:text-lg">
                Connected Participants
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">
                Producers, aggregators and buyers can participate in a
                shared digital marketplace built around agricultural trade.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CTA
      ========================================================== */}

      <section className="px-4 pb-12 sm:px-6 sm:pb-20 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-slate-950 px-5 py-9 text-center text-white shadow-2xl sm:rounded-[2rem] sm:px-12 sm:py-14 md:py-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_55%)]" />

          {/* Decorative SVG - desktop */}
          <svg
            className="pointer-events-none absolute bottom-0 left-0 hidden h-32 w-full opacity-10 sm:block"
            viewBox="0 0 1000 150"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M0 120C180 60 280 160 450 95C620 30 740 125 1000 45"
              stroke="currentColor"
              strokeWidth="2"
            />

            <path
              d="M0 145C180 85 280 185 450 120C620 55 740 150 1000 70"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>

          <div className="relative">
            <Sparkles className="mx-auto h-6 w-6 text-emerald-400 sm:h-7 sm:w-7" />

            <h2 className="mx-auto mt-3 max-w-3xl text-2xl font-black tracking-tight sm:mt-4 sm:text-3xl md:text-4xl">
              Ready to connect with the agricultural marketplace?
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-xs leading-5 text-slate-400 sm:mt-4 sm:text-sm sm:leading-6 md:text-base">
              Explore current listings or create your producer account and
              start presenting your agricultural products to the market.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
              <Link
                to="/catalog"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white transition hover:bg-emerald-500 sm:rounded-2xl sm:px-6 sm:py-3.5 sm:text-sm"
              >
                Browse Marketplace

                <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>

              <Link
                to="/register"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-white/5 px-5 py-3 text-xs font-black text-white transition hover:bg-white/10 sm:rounded-2xl sm:px-6 sm:py-3.5 sm:text-sm"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};