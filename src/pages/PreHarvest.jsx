
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sprout,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';

const CART_KEY = 'agrolink_cart';

// -----------------------------
// Formatting helpers
// -----------------------------

const formatDate = (date) => {
  if (!date) return 'Not specified';

  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('en-NG').format(
    Number(value || 0)
  );
};

const formatCurrency = (value) => {
  return `₦${formatNumber(value)}`;
};

// -----------------------------
// Image helpers
// -----------------------------

const getProductImages = (imagePath) => {
  if (!imagePath) return [];

  if (Array.isArray(imagePath)) {
    return imagePath.filter(Boolean);
  }

  if (typeof imagePath !== 'string') return [];

  try {
    const parsed = JSON.parse(imagePath);

    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean);
    }

    return parsed ? [parsed] : [];
  } catch {
    return [imagePath];
  }
};

const getStorageImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') {
    return null;
  }

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://')
  ) {
    return imagePath;
  }

  const cleanedPath = imagePath
    .replace(/^product-images\//, '')
    .replace(/^\/+/, '');

  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(cleanedPath);

  return data?.publicUrl || null;
};

// -----------------------------
// Producer helpers
// -----------------------------

const getProducerName = (producer) => {
  if (!producer) return 'AgroLink Producer';

  return (
    producer.business_name ||
    producer.farm_name ||
    producer.full_name ||
    'AgroLink Producer'
  );
};

// -----------------------------
// Cart helpers
// -----------------------------

const getCart = () => {
  try {
    const storedCart = localStorage.getItem(CART_KEY);

    if (!storedCart) return [];

    const parsedCart = JSON.parse(storedCart);

    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch (error) {
    console.error('Unable to read AgroLink cart:', error);
    return [];
  }
};

const saveCart = (cart) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    window.dispatchEvent(
      new Event('agrolink-cart-updated')
    );
  } catch (error) {
    console.error('Unable to save AgroLink cart:', error);
  }
};

const addProductToCart = (
  product,
  producerName,
  requestedQuantity = 1
) => {
  const availableQuantity = Number(product.quantity || 0);
  const quantityToAdd = Number(requestedQuantity || 1);

  if (availableQuantity <= 0) {
    return {
      success: false,
      message: 'This product is currently out of stock.',
    };
  }

  if (
    !Number.isFinite(quantityToAdd) ||
    quantityToAdd <= 0 ||
    !Number.isInteger(quantityToAdd)
  ) {
    return {
      success: false,
      message: 'Please select a valid quantity.',
    };
  }

  const cart = getCart();

  const existingIndex = cart.findIndex(
    (item) => item.id === product.id
  );

  if (existingIndex !== -1) {
    const existingItem = cart[existingIndex];

    const newQuantity =
      Number(existingItem.quantity || 0) + quantityToAdd;

    if (newQuantity > availableQuantity) {
      return {
        success: false,
        message: `Only ${formatNumber(
          availableQuantity
        )} ${product.unit || 'unit'} available.`,
      };
    }

    cart[existingIndex] = {
      ...existingItem,
      producerId: product.producer_id,
      cropName: product.crop_name,
      quantity: newQuantity,
      availableQuantity,
      unit: product.unit,
      pricePerUnit: Number(product.price_per_unit || 0),
      location: product.location,
      imagePath: product.image_path,
      productType: product.product_type,
      producerName,
    };
  } else {
    if (quantityToAdd > availableQuantity) {
      return {
        success: false,
        message: `Only ${formatNumber(
          availableQuantity
        )} ${product.unit || 'unit'} available.`,
      };
    }

    cart.push({
      id: product.id,
      producerId: product.producer_id,
      cropName: product.crop_name,
      quantity: quantityToAdd,
      availableQuantity,
      unit: product.unit,
      pricePerUnit: Number(product.price_per_unit || 0),
      location: product.location,
      imagePath: product.image_path,
      productType: product.product_type,
      producerName,
    });
  }

  saveCart(cart);

  return {
    success: true,
    cart,
  };
};

// -----------------------------
// Main component
// -----------------------------

export default function PreHarvest() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [producerProfiles, setProducerProfiles] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // -----------------------------
  // Fetch pre-harvest products
  // -----------------------------

  const fetchPreHarvestProducts = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage('');

      try {
        const {
          data: productData,
          error: productError,
        } = await supabase
          .from('products')
          .select(`
            id,
            producer_id,
            crop_name,
            description,
            quantity,
            unit,
            price_per_unit,
            location,
            image_path,
            product_type,
            created_at
          `)
          .eq('product_type', 'pre_harvest')
          .order('created_at', { ascending: false });

        if (productError) {
          throw productError;
        }

        const fetchedProducts = productData || [];

        setProducts(fetchedProducts);

        const producerIds = [
          ...new Set(
            fetchedProducts
              .map((product) => product.producer_id)
              .filter(Boolean)
          ),
        ];

        if (producerIds.length === 0) {
          setProducerProfiles({});
          return;
        }

        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            business_name,
            role,
            verification_status,
            farm_name,
            farm_location
          `)
          .in('id', producerIds);

        if (profileError) {
          console.warn(
            'Unable to load producer profiles:',
            profileError.message
          );

          setProducerProfiles({});
        } else {
          const profileMap = {};

          (profileData || []).forEach((profile) => {
            profileMap[profile.id] = profile;
          });

          setProducerProfiles(profileMap);
        }
      } catch (error) {
        console.error('Pre-harvest fetch error:', error);

        setErrorMessage(
          error?.message ||
            'Unable to load pre-harvest products. Please try again.'
        );

        setProducts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // -----------------------------
  // Initial fetch and realtime
  // -----------------------------

  useEffect(() => {
    fetchPreHarvestProducts(true);

    const channel = supabase
      .channel('pre-harvest-products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: 'product_type=eq.pre_harvest',
        },
        () => {
          fetchPreHarvestProducts(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPreHarvestProducts]);

  // -----------------------------
  // Reset modal state
  // -----------------------------

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedQuantity(1);
      setSelectedImageIndex(0);
      return;
    }

    const available = Number(selectedProduct.quantity || 0);

    setSelectedQuantity(available > 0 ? 1 : 0);
    setSelectedImageIndex(0);
  }, [selectedProduct]);

  // -----------------------------
  // Close modal with Escape
  // -----------------------------

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedProduct(null);
      }
    };

    if (selectedProduct) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [selectedProduct]);

  // -----------------------------
  // Derived products
  // -----------------------------

  const enrichedProducts = useMemo(() => {
    return products.map((product) => ({
      ...product,
      producer: producerProfiles[product.producer_id] || null,
    }));
  }, [products, producerProfiles]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return enrichedProducts;

    return enrichedProducts.filter((product) => {
      const producer = product.producer;

      return (
        product.crop_name?.toLowerCase().includes(query) ||
        product.location?.toLowerCase().includes(query) ||
        producer?.full_name?.toLowerCase().includes(query) ||
        producer?.business_name?.toLowerCase().includes(query) ||
        producer?.farm_name?.toLowerCase().includes(query)
      );
    });
  }, [enrichedProducts, searchTerm]);

  const totalQuantity = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total + Number(product.quantity || 0),
      0
    );
  }, [products]);

  // -----------------------------
  // Cart actions
  // -----------------------------

  const handleAddToCart = (product) => {
    const producer =
      producerProfiles[product.producer_id] || null;

    const result = addProductToCart(
      product,
      getProducerName(producer),
      1
    );

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(`${product.crop_name} added to your cart.`);
  };

  const handleQuickBuy = (product) => {
    const producer =
      producerProfiles[product.producer_id] || null;

    const result = addProductToCart(
      product,
      getProducerName(producer),
      1
    );

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(
      `${product.crop_name} added. Taking you to checkout...`
    );

    navigate('/checkout');
  };

  const handleModalAddToCart = () => {
    if (!selectedProduct || selectedQuantity <= 0) return;

    const producer =
      producerProfiles[selectedProduct.producer_id] || null;

    const result = addProductToCart(
      selectedProduct,
      getProducerName(producer),
      selectedQuantity
    );

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(
      `${formatNumber(selectedQuantity)} ${
        selectedProduct.unit || 'unit'
      } of ${selectedProduct.crop_name} added to your cart.`
    );
  };

  const handleModalBuyNow = () => {
    if (!selectedProduct || selectedQuantity <= 0) return;

    const producer =
      producerProfiles[selectedProduct.producer_id] || null;

    const result = addProductToCart(
      selectedProduct,
      getProducerName(producer),
      selectedQuantity
    );

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    const cropName = selectedProduct.crop_name;

    setSelectedProduct(null);

    toast.success(
      `${cropName} added. Taking you to checkout...`
    );

    navigate('/checkout');
  };

  // -----------------------------
  // Quantity controls
  // -----------------------------

  const increaseQuantity = () => {
    if (!selectedProduct) return;

    const available = Number(selectedProduct.quantity || 0);

    setSelectedQuantity((current) =>
      Math.min(current + 1, available)
    );
  };

  const decreaseQuantity = () => {
    setSelectedQuantity((current) =>
      Math.max(current - 1, 1)
    );
  };

  // -----------------------------
  // Selected product details
  // -----------------------------

  const selectedImages = selectedProduct
    ? getProductImages(selectedProduct.image_path)
    : [];

  const selectedImageUrl = selectedImages.length
    ? getStorageImageUrl(
        selectedImages[
          Math.min(
            selectedImageIndex,
            selectedImages.length - 1
          )
        ]
      )
    : null;

  const selectedProducer = selectedProduct
    ? producerProfiles[selectedProduct.producer_id] || null
    : null;

  const selectedAvailableQuantity = selectedProduct
    ? Number(selectedProduct.quantity || 0)
    : 0;

  const selectedStockLabel =
    selectedAvailableQuantity <= 0
      ? 'Out of stock'
      : selectedAvailableQuantity <= 10
      ? 'Low stock'
      : 'Available for booking';

  // -----------------------------
  // Render
  // -----------------------------

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="mx-auto max-w-7xl">

        {/* Hero */}
        <div className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-500 p-5 text-white shadow-lg sm:mb-6 sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-lime-300/10 blur-3xl" />

          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
              <Sprout size={15} />
              Advance Crop Listings
            </div>

            <h1 className="max-w-3xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              Pre-Harvest Crops
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
              Discover crops listed before harvest and plan your purchase
              early by connecting with producers across Kano and nearby
              farming communities.
            </p>

            <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-[11px] text-emerald-100">
                  Listings
                </p>

                <p className="mt-1 text-lg font-black">
                  {formatNumber(products.length)}
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-[11px] text-emerald-100">
                  Quantity listed
                </p>

                <p className="mt-1 text-lg font-black">
                  {formatNumber(totalQuantity)}
                </p>
              </div>

              <div className="col-span-2 rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm sm:col-span-1">
                <p className="text-[11px] text-emerald-100">
                  Booking type
                </p>

                <p className="mt-1 text-sm font-black">
                  Advance booking
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 sm:text-lg">
                Available pre-harvest products
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {filteredProducts.length}{' '}
                {filteredProducts.length === 1
                  ? 'listing'
                  : 'listings'}{' '}
                found
              </p>
            </div>

            <div className="flex w-full gap-2 lg:max-w-xl">
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search crop, location or producer..."
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchPreHarvestProducts(false)}
                disabled={refreshing}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                title="Refresh listings"
              >
                {refreshing ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <RefreshCw size={17} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2
              className="mx-auto animate-spin text-emerald-600"
              size={34}
            />

            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading pre-harvest products...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="text-sm font-semibold text-red-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => fetchPreHarvestProducts(true)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading &&
          !errorMessage &&
          filteredProducts.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
                <Sprout size={30} className="text-emerald-500" />
              </div>

              <h3 className="mt-4 text-base font-black text-slate-800 sm:text-lg">
                {searchTerm
                  ? 'No matching crops found'
                  : 'No pre-harvest listings yet'}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {searchTerm
                  ? 'Try another crop name, location or producer.'
                  : 'Producers have not added any pre-harvest products yet.'}
              </p>

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

        {/* Product grid */}
        {!loading &&
          !errorMessage &&
          filteredProducts.length > 0 && (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const imageUrl = getStorageImageUrl(
                  getProductImages(product.image_path)[0]
                );

                const producer = product.producer;
                const producerName = getProducerName(producer);
                const availableQuantity = Number(product.quantity || 0);
                const isAvailable = availableQuantity > 0;

                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {/* Product image */}
                    <div className="relative h-32 overflow-hidden bg-emerald-50 sm:h-36">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.crop_name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 to-lime-50">
                          <Sprout size={42} className="text-emerald-600" />
                        </div>
                      )}

                      <span className="absolute left-2.5 top-2.5 rounded-full bg-emerald-700 px-2.5 py-1 text-[10px] font-black text-white shadow">
                        Pre-Harvest
                      </span>

                      {producer?.verification_status === 'approved' && (
                        <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-emerald-700 shadow">
                          <ShieldCheck size={12} />
                          Verified
                        </span>
                      )}

                      {!isAvailable && (
                        <span className="absolute bottom-2.5 left-2.5 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-black text-white shadow">
                          Unavailable
                        </span>
                      )}
                    </div>

                    {/* Product content */}
                    <div className="p-3.5">
                      <h3 className="truncate text-base font-black capitalize text-slate-900">
                        {product.crop_name}
                      </h3>

                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin
                          size={13}
                          className="shrink-0 text-emerald-600"
                        />

                        <span className="truncate">
                          {product.location || 'Location not specified'}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <UserRound size={14} />
                        </div>

                        <p className="truncate text-xs font-bold text-slate-700">
                          {producerName}
                        </p>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-500">
                            Price / {product.unit || 'unit'}
                          </p>

                          <p className="mt-0.5 truncate text-base font-black text-emerald-700">
                            {formatCurrency(product.price_per_unit)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">
                            Available
                          </p>

                          <p className="mt-0.5 text-xs font-black text-slate-800">
                            {formatNumber(product.quantity)}{' '}
                            {product.unit || 'unit'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          disabled={!isAvailable}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ShoppingCart size={14} />
                          Cart
                        </button>

                        <button
                          type="button"
                          onClick={() => handleQuickBuy(product)}
                          disabled={!isAvailable}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Zap size={14} />
                          Buy
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.98]"
                      >
                        View booking details
                        <CalendarDays size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </section>

      {/* Product details modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:px-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedProduct(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pre-harvest-product-title"
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl lg:flex-row"
          >
            {/* Gallery */}
            <div className="relative bg-slate-100 lg:w-[46%]">
              <div className="relative h-56 overflow-hidden sm:h-64 lg:h-full lg:min-h-[520px]">
                {selectedImageUrl ? (
                  <img
                    src={selectedImageUrl}
                    alt={selectedProduct.crop_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-100 to-lime-50">
                    <Sprout size={72} className="text-emerald-600" />
                  </div>
                )}

                <span className="absolute left-4 top-4 rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-black text-white shadow">
                  Pre-Harvest
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  aria-label="Close product details"
                  className="absolute right-4 top-4 rounded-full bg-white/95 p-2 text-slate-700 shadow-lg transition hover:bg-white"
                >
                  <X size={18} />
                </button>

                {selectedImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex((current) =>
                          current === 0
                            ? selectedImages.length - 1
                            : current - 1
                        )
                      }
                      aria-label="Previous product image"
                      className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg transition hover:bg-white"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedImageIndex((current) =>
                          current === selectedImages.length - 1
                            ? 0
                            : current + 1
                        )
                      }
                      aria-label="Next product image"
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg transition hover:bg-white"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {selectedImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-white p-3">
                  {selectedImages.map((image, index) => {
                    const thumbnailUrl = getStorageImageUrl(image);

                    return (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                          selectedImageIndex === index
                            ? 'border-emerald-600'
                            : 'border-transparent'
                        }`}
                        aria-label={`View product image ${index + 1}`}
                      >
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center bg-emerald-50">
                            <Sprout size={20} className="text-emerald-600" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6 lg:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
                    Advance booking listing
                  </p>

                  <h2
                    id="pre-harvest-product-title"
                    className="mt-1 text-2xl font-black capitalize text-slate-900 sm:text-3xl"
                  >
                    {selectedProduct.crop_name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {getProducerName(selectedProducer)}
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${
                    selectedAvailableQuantity <= 0
                      ? 'bg-red-50 text-red-700'
                      : selectedAvailableQuantity <= 10
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {selectedStockLabel}
                </span>
              </div>

              {/* Price and quantity */}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-[11px] text-emerald-700">
                    Price per {selectedProduct.unit || 'unit'}
                  </p>

                  <p className="mt-1 text-lg font-black text-emerald-700">
                    {formatCurrency(selectedProduct.price_per_unit)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">
                    Available quantity
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-900">
                    {formatNumber(selectedProduct.quantity)}{' '}
                    {selectedProduct.unit || 'unit'}
                  </p>
                </div>
              </div>

              {/* Product information */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-xs text-slate-500">
                    Location
                  </span>

                  <span className="text-right text-xs font-bold text-slate-900">
                    {selectedProduct.location || 'Not specified'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-xs text-slate-500">
                    Listed
                  </span>

                  <span className="text-right text-xs font-bold text-slate-900">
                    {formatDate(selectedProduct.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-xs text-slate-500">
                    Listing type
                  </span>

                  <span className="text-right text-xs font-bold text-slate-900">
                    Pre-harvest
                  </span>
                </div>
              </div>

              {/* Producer information */}
              <div className="mt-5 rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <UserRound size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-400">
                      Listed by
                    </p>

                    <p className="truncate text-sm font-black text-slate-900">
                      {getProducerName(selectedProducer)}
                    </p>

                    {selectedProducer?.farm_name && (
                      <p className="mt-1 text-xs text-slate-500">
                        Farm: {selectedProducer.farm_name}
                      </p>
                    )}

                    {selectedProducer?.verification_status === 'approved' && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <ShieldCheck size={14} />
                        Verified producer
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-5">
                <h3 className="text-sm font-black text-slate-900">
                  Product description
                </h3>

                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-500">
                  {selectedProduct.description ||
                    'No detailed description has been added by the producer yet. Please review the available quantity, location, price, and booking information before continuing.'}
                </p>
              </div>

              {/* Booking note */}
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <div className="flex items-start gap-2.5">
                  <CalendarDays
                    size={19}
                    className="mt-0.5 shrink-0 text-amber-700"
                  />

                  <div>
                    <p className="text-sm font-black text-amber-900">
                      Advance booking
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      This crop is listed before harvest. Select the amount
                      you want to reserve and continue to checkout.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quantity */}
              {selectedAvailableQuantity > 0 && (
                <div className="mt-5 rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        Booking quantity
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Choose the amount you need.
                      </p>
                    </div>

                    <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        disabled={selectedQuantity <= 1}
                        className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus size={15} />
                      </button>

                      <div className="flex h-9 min-w-10 items-center justify-center border-x border-slate-200 px-2 text-sm font-black text-slate-900">
                        {formatNumber(selectedQuantity)}
                      </div>

                      <button
                        type="button"
                        onClick={increaseQuantity}
                        disabled={
                          selectedQuantity >= selectedAvailableQuantity
                        }
                        className="flex h-9 w-9 items-center justify-center text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">
                      Estimated total
                    </span>

                    <span className="text-lg font-black text-emerald-700">
                      {formatCurrency(
                        selectedQuantity *
                          Number(selectedProduct.price_per_unit || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedAvailableQuantity > 0 ? (
                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleModalAddToCart}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98]"
                  >
                    <ShoppingCart size={16} />
                    Add to Cart
                  </button>

                  <button
                    type="button"
                    onClick={handleModalBuyNow}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-black text-white transition hover:bg-emerald-700 active:scale-[0.98]"
                  >
                    <Zap size={16} />
                    Buy Now
                  </button>
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-red-50 p-4 text-center">
                  <p className="text-sm font-black text-red-700">
                    This product is currently unavailable.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="mt-2.5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 active:scale-[0.98]"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}