import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';

const CART_KEY = 'agrolink_cart';

const formatNumber = (value) => {
  return new Intl.NumberFormat('en-NG').format(
    Number(value || 0)
  );
};

const formatCurrency = (value) => {
  return `₦${formatNumber(value)}`;
};

const formatDate = (date) => {
  if (!date) return 'Not specified';

  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getProductImages = (imagePath) => {
  if (!imagePath) return [];

  if (Array.isArray(imagePath)) {
    return imagePath.filter(Boolean).map(String);
  }

  if (typeof imagePath !== 'string') return [];

  try {
    const parsed = JSON.parse(imagePath);

    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map(String);
    }

    return parsed ? [String(parsed)] : [];
  } catch {
    return [imagePath];
  }
};

const getStorageImageUrl = (imagePath) => {
  const images = getProductImages(imagePath);
  const path = images[0];

  if (!path) return null;

  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
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

const getProducerName = (producer) => {
  if (!producer) return 'AgroLink Producer';

  return (
    producer.business_name ||
    producer.full_name ||
    'AgroLink Producer'
  );
};

const getCart = () => {
  try {
    const storedCart = localStorage.getItem(CART_KEY);

    if (!storedCart) return [];

    const parsedCart = JSON.parse(storedCart);

    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch {
    return [];
  }
};

const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));

  window.dispatchEvent(
    new Event('agrolink-cart-updated')
  );
};

const getStockStatus = (quantity) => {
  const stock = Number(quantity || 0);

  if (stock <= 0) {
    return {
      label: 'Out of stock',
      className: 'bg-red-100 text-red-700',
    };
  }

  if (stock <= 10) {
    return {
      label: 'Low stock',
      className: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    label: 'Available',
    className: 'bg-emerald-100 text-emerald-700',
  };
};

export default function PostHarvest() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [producerProfiles, setProducerProfiles] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchPostHarvestProducts = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setErrorMessage('');

      try {
        const { data: productData, error: productError } =
          await supabase
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
            .eq('product_type', 'post_harvest')
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

        const { data: profileData, error: profileError } =
          await supabase
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
        console.error('Post-harvest fetch error:', error);

        setErrorMessage(
          error?.message ||
            'Unable to load post-harvest products. Please try again.'
        );

        setProducts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPostHarvestProducts(true);

    const channel = supabase
      .channel('post-harvest-products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        () => {
          fetchPostHarvestProducts(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPostHarvestProducts]);

  const enrichedProducts = useMemo(() => {
    return products.map((product) => ({
      ...product,
      producer:
        producerProfiles[product.producer_id] || null,
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

  const selectedImages = useMemo(() => {
    if (!selectedProduct) return [];

    return getProductImages(selectedProduct.image_path);
  }, [selectedProduct]);

  const selectedImageUrl = useMemo(() => {
    const imagePath = selectedImages[selectedImageIndex];

    return imagePath
      ? getStorageImageUrl(imagePath)
      : null;
  }, [selectedImages, selectedImageIndex]);

  const selectedStockStatus = useMemo(() => {
    return getStockStatus(selectedProduct?.quantity);
  }, [selectedProduct]);

  const selectedTotal = useMemo(() => {
    if (!selectedProduct) return 0;

    return (
      Number(selectedProduct.price_per_unit || 0) *
      Number(selectedQuantity || 0)
    );
  }, [selectedProduct, selectedQuantity]);

  const openProductDetails = (product) => {
    const availableStock = Number(product.quantity || 0);

    setSelectedProduct(product);
    setSelectedQuantity(availableStock > 0 ? 1 : 0);
    setSelectedImageIndex(0);
  };

  const closeProductDetails = () => {
    setSelectedProduct(null);
    setSelectedQuantity(1);
    setSelectedImageIndex(0);
  };

  const addProductToCart = (
    product,
    quantity,
    redirectToCheckout = false
  ) => {
    const availableQuantity = Number(product.quantity || 0);
    const requestedQuantity = Number(quantity || 0);

    if (availableQuantity <= 0) {
      toast.error(
        `${product.crop_name} is currently out of stock.`
      );

      return false;
    }

    if (
      requestedQuantity <= 0 ||
      requestedQuantity > availableQuantity
    ) {
      toast.error(
        `Please select a quantity between 1 and ${formatNumber(
          availableQuantity
        )} ${product.unit}.`
      );

      return false;
    }

    const cart = getCart();

    const existingIndex = cart.findIndex(
      (item) => item.id === product.id
    );

    let updatedCart;

    if (existingIndex >= 0) {
      const existingItem = cart[existingIndex];

      const newQuantity =
        Number(existingItem.quantity || 0) +
        requestedQuantity;

      if (newQuantity > availableQuantity) {
        toast.error(
          `Only ${formatNumber(
            availableQuantity
          )} ${product.unit} of ${product.crop_name} is currently available.`
        );

        return false;
      }

      updatedCart = [...cart];

      updatedCart[existingIndex] = {
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
        producerName: getProducerName(product.producer),
      };
    } else {
      updatedCart = [
        ...cart,
        {
          id: product.id,
          producerId: product.producer_id,
          cropName: product.crop_name,
          quantity: requestedQuantity,
          availableQuantity,
          unit: product.unit,
          pricePerUnit: Number(product.price_per_unit || 0),
          location: product.location,
          imagePath: product.image_path,
          productType: product.product_type,
          producerName: getProducerName(product.producer),
        },
      ];
    }

    saveCart(updatedCart);

    toast.success(`${product.crop_name} added to your cart.`);

    if (redirectToCheckout) {
      closeProductDetails();
      navigate('/checkout');
    }

    return true;
  };

  const handleAddToCart = (product) => {
    addProductToCart(product, 1);
  };

  const handleBuyNow = (product) => {
    openProductDetails(product);
  };

  const increaseQuantity = () => {
    if (!selectedProduct) return;

    const availableQuantity = Number(
      selectedProduct.quantity || 0
    );

    setSelectedQuantity((current) =>
      Math.min(current + 1, availableQuantity)
    );
  };

  const decreaseQuantity = () => {
    setSelectedQuantity((current) =>
      Math.max(current - 1, 1)
    );
  };

  const handleModalAddToCart = () => {
    if (!selectedProduct) return;

    const added = addProductToCart(
      selectedProduct,
      selectedQuantity
    );

    if (added) {
      closeProductDetails();
    }
  };

  const handleModalBuyNow = () => {
    if (!selectedProduct) return;

    addProductToCart(
      selectedProduct,
      selectedQuantity,
      true
    );
  };

  useEffect(() => {
    if (!selectedProduct) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeProductDetails();
      }

      if (event.key === 'ArrowLeft' && selectedImages.length > 1) {
        setSelectedImageIndex((current) =>
          current === 0
            ? selectedImages.length - 1
            : current - 1
        );
      }

      if (event.key === 'ArrowRight' && selectedImages.length > 1) {
        setSelectedImageIndex((current) =>
          current === selectedImages.length - 1
            ? 0
            : current + 1
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProduct, selectedImages.length]);

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <section className="mx-auto max-w-7xl">
        {/* Hero */}
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-800 via-orange-700 to-amber-500 p-5 text-white shadow-xl sm:mb-8 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-yellow-300/10 blur-3xl" />

          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur-sm sm:px-4 sm:py-2 sm:text-sm">
              <PackageCheck size={16} />
              Ready for Collection
            </div>

            <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Post-Harvest Products
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-orange-50 sm:mt-4 sm:text-base sm:leading-7">
              Find harvested crops and agricultural products
              that are already available for collection,
              transportation, or delivery.
            </p>

            <div className="mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs text-orange-100">
                  Listings
                </p>

                <p className="mt-1 text-xl font-black">
                  {formatNumber(products.length)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs text-orange-100">
                  Available stock
                </p>

                <p className="mt-1 text-xl font-black">
                  {formatNumber(totalQuantity)}
                </p>
              </div>

              <div className="col-span-2 rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm sm:col-span-1">
                <p className="text-xs text-orange-100">
                  Availability
                </p>

                <p className="mt-1 text-sm font-black">
                  Ready to buy
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Available post-harvest products
              </h2>

              <p className="mt-1 text-sm text-slate-500">
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
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search crop, location or producer..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  fetchPostHarvestProducts(false)
                }
                disabled={refreshing}
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
                title="Refresh listings"
              >
                {refreshing ? (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw size={18} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Loader2
              className="mx-auto animate-spin text-orange-600"
              size={38}
            />

            <p className="mt-4 text-sm font-semibold text-slate-600">
              Loading post-harvest products...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-700">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => fetchPostHarvestProducts(true)}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !errorMessage &&
          filteredProducts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center sm:p-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                <PackageCheck
                  size={34}
                  className="text-orange-500"
                />
              </div>

              <h3 className="mt-5 text-lg font-black text-slate-800">
                {searchTerm
                  ? 'No matching products found'
                  : 'No post-harvest listings yet'}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {searchTerm
                  ? 'Try another crop name, location or producer.'
                  : 'Producers have not added any harvested products yet.'}
              </p>

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mt-5 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const imageUrl = getStorageImageUrl(
                  product.image_path
                );

                const producer = product.producer;
                const producerName = getProducerName(producer);
                const availableStock = Number(product.quantity || 0);
                const isOutOfStock = availableStock <= 0;
                const stockStatus = getStockStatus(availableStock);

                return (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    {/* Compact image */}
                    <div className="relative h-36 overflow-hidden bg-orange-50 sm:h-40">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={product.crop_name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-100 to-yellow-50">
                          <PackageCheck
                            size={48}
                            className="text-orange-600"
                          />
                        </div>
                      )}

                      <span className="absolute left-3 top-3 rounded-full bg-orange-700 px-2.5 py-1 text-[10px] font-black text-white shadow-md">
                        Post-Harvest
                      </span>

                      <span
                        className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm ${stockStatus.className}`}
                      >
                        {stockStatus.label}
                      </span>

                      {producer?.verification_status === 'approved' && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-emerald-700 shadow-md">
                          <ShieldCheck size={12} />
                          Verified
                        </span>
                      )}
                    </div>

                    {/* Compact content */}
                    <div className="p-3.5 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 truncate text-lg font-black capitalize text-slate-900">
                          {product.crop_name}
                        </h3>

                        <span className="shrink-0 rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
                          {product.unit}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin
                          size={14}
                          className="shrink-0 text-orange-600"
                        />

                        <span className="truncate">
                          {product.location || 'Location not specified'}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                          <UserRound size={15} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-medium text-slate-400">
                            Producer
                          </p>

                          <p className="truncate text-xs font-bold text-slate-800">
                            {producerName}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-slate-50 p-2.5">
                          <p className="text-[10px] text-slate-500">
                            Available stock
                          </p>

                          <p className="mt-1 text-xs font-black text-slate-900">
                            {formatNumber(product.quantity)} {product.unit}
                          </p>
                        </div>

                        <div className="rounded-xl bg-orange-50 p-2.5">
                          <p className="text-[10px] text-orange-700">
                            Price / {product.unit}
                          </p>

                          <p className="mt-1 text-xs font-black text-orange-700">
                            {formatCurrency(product.price_per_unit)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 size={14} />
                        <span>Ready for collection</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          disabled={isOutOfStock}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-2 py-2.5 text-xs font-black text-orange-700 transition hover:bg-orange-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ShoppingCart size={15} />
                          Add to Cart
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBuyNow(product)}
                          disabled={isOutOfStock}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-2 py-2.5 text-xs font-black text-white transition hover:bg-orange-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Buy Now
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => openProductDetails(product)}
                        className="mt-1.5 w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-orange-700"
                      >
                        View product details
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-3 py-5 backdrop-blur-sm sm:px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeProductDetails();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="grid lg:grid-cols-2">
              {/* Gallery */}
              <div className="bg-orange-50">
                <div className="relative h-60 overflow-hidden sm:h-80 lg:h-full lg:min-h-[470px]">
                  {selectedImageUrl ? (
                    <img
                      src={selectedImageUrl}
                      alt={selectedProduct.crop_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <PackageCheck
                        size={76}
                        className="text-orange-500"
                      />
                    </div>
                  )}

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
                        className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg transition hover:bg-white"
                        aria-label="Previous product image"
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
                        className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg transition hover:bg-white"
                        aria-label="Next product image"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={closeProductDetails}
                    className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-700 shadow-lg transition hover:bg-white"
                    aria-label="Close details"
                  >
                    <X size={18} />
                  </button>

                  {selectedImages.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/65 px-3 py-1 text-xs font-bold text-white">
                      {selectedImageIndex + 1} / {selectedImages.length}
                    </div>
                  )}
                </div>

                {selectedImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-3">
                    {selectedImages.map((image, index) => {
                      const thumbnailUrl = getStorageImageUrl(image);

                      return (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setSelectedImageIndex(index)}
                          className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                            selectedImageIndex === index
                              ? 'border-orange-600'
                              : 'border-transparent'
                          }`}
                          aria-label={`View image ${index + 1}`}
                        >
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-orange-100">
                              <PackageCheck
                                size={18}
                                className="text-orange-500"
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Product information */}
              <div className="p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-orange-600">
                      Post-Harvest Product
                    </p>

                    <h2 className="mt-1 text-2xl font-black capitalize text-slate-900 sm:text-3xl">
                      {selectedProduct.crop_name}
                    </h2>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${selectedStockStatus.className}`}
                  >
                    {selectedStockStatus.label}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin size={16} className="text-orange-600" />

                  <span>
                    {selectedProduct.location || 'Location not specified'}
                  </span>
                </div>

                {/* Description */}
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-sm font-black text-slate-900">
                    Product description
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {selectedProduct.description ||
                      'This harvested agricultural product is listed for collection, transportation, or delivery. Contact the producer for additional information about quality, packaging, and storage conditions.'}
                  </p>
                </div>

                {/* Producer */}
                <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                      <UserRound size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        Sold by
                      </p>

                      <p className="truncate text-sm font-black text-slate-900">
                        {getProducerName(selectedProduct.producer)}
                      </p>
                    </div>

                    {selectedProduct.producer?.verification_status ===
                      'approved' && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                        <ShieldCheck size={12} />
                        Verified
                      </span>
                    )}
                  </div>

                  {(selectedProduct.producer?.farm_name ||
                    selectedProduct.producer?.farm_location) && (
                    <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      {selectedProduct.producer?.farm_name && (
                        <p>
                          Farm:{' '}
                          <span className="font-semibold text-slate-700">
                            {selectedProduct.producer.farm_name}
                          </span>
                        </p>
                      )}

                      {selectedProduct.producer?.farm_location && (
                        <p className="mt-1">
                          Farm location:{' '}
                          <span className="font-semibold text-slate-700">
                            {selectedProduct.producer.farm_location}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Product metadata */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Available stock
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-900">
                      {formatNumber(selectedProduct.quantity)}{' '}
                      {selectedProduct.unit}
                    </p>
                  </div>

                  <div className="rounded-xl bg-orange-50 p-3">
                    <p className="text-xs text-orange-700">
                      Price per {selectedProduct.unit}
                    </p>

                    <p className="mt-1 text-sm font-black text-orange-700">
                      {formatCurrency(selectedProduct.price_per_unit)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Listed on
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-900">
                      {formatDate(selectedProduct.created_at)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Product type
                    </p>

                    <p className="mt-1 text-sm font-black capitalize text-slate-900">
                      {selectedProduct.product_type?.replace('_', ' ') ||
                        'Post harvest'}
                    </p>
                  </div>
                </div>

                {/* Quantity */}
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        Select quantity
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Choose the amount you want to purchase.
                      </p>
                    </div>

                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        disabled={selectedQuantity <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>

                      <div className="min-w-20 text-center">
                        <span className="text-sm font-black text-slate-900">
                          {formatNumber(selectedQuantity)}
                        </span>

                        <span className="ml-1 text-xs font-semibold text-slate-500">
                          {selectedProduct.unit}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={increaseQuantity}
                        disabled={
                          selectedQuantity >=
                          Number(selectedProduct.quantity || 0)
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white">
                  <div>
                    <p className="text-xs text-slate-300">
                      Estimated total
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {formatNumber(selectedQuantity)}{' '}
                      {selectedProduct.unit} ×{' '}
                      {formatCurrency(selectedProduct.price_per_unit)}
                    </p>
                  </div>

                  <p className="text-xl font-black">
                    {formatCurrency(selectedTotal)}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-emerald-700"
                    />

                    <div>
                      <p className="text-sm font-black text-emerald-900">
                        Ready for collection
                      </p>

                      <p className="mt-1 text-sm leading-6 text-emerald-800">
                        This harvested product is currently listed as
                        available. You can add it to your cart or proceed
                        directly to checkout.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleModalAddToCart}
                    disabled={
                      Number(selectedProduct.quantity || 0) <= 0
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-black text-orange-700 transition hover:bg-orange-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingCart size={17} />
                    Add to Cart
                  </button>

                  <button
                    type="button"
                    onClick={handleModalBuyNow}
                    disabled={
                      Number(selectedProduct.quantity || 0) <= 0
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Buy Now
                  </button>
                </div>

                <button
                  type="button"
                  onClick={closeProductDetails}
                  className="mt-3 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
