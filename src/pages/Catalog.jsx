import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sprout,
  Truck,
  X,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../config/supabaseClient';

const CART_KEY = 'agrolink_cart';

const formatNaira = (amount) =>
  `₦${Number(amount || 0).toLocaleString('en-NG')}`;

const formatNumber = (amount) =>
  Number(amount || 0).toLocaleString('en-NG');

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
  if (!imagePath || typeof imagePath !== 'string') return null;

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

const getStockStatus = (quantity) => {
  const stock = Number(quantity || 0);

  if (stock <= 0) {
    return {
      label: 'Out of stock',
      className: 'bg-red-50 text-red-700 border-red-200',
    };
  }

  if (stock <= 10) {
    return {
      label: 'Low stock',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
    };
  }

  return {
    label: 'In stock',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
};

const getProducerName = (producer) =>
  producer?.business_name ||
  producer?.farm_name ||
  producer?.full_name ||
  'AgroLink Producer';

const ProductCard = ({
  product,
  onOpen,
  onAddToCart,
  onQuickBuy,
}) => {
  const images = getProductImages(product.image_path);
  const imageUrl = getStorageImageUrl(images[0]);
  const stockStatus = getStockStatus(product.quantity);
  const producerName = getProducerName(product.producer);
  const isOutOfStock = Number(product.quantity || 0) <= 0;

  return (
    <article
      onClick={() => onOpen(product)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg"
    >
      <div className="relative h-28 overflow-hidden bg-slate-100 sm:h-36">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.crop_name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold capitalize text-slate-700 shadow-sm">
            {product.product_type === 'pre_harvest'
              ? 'Pre-harvest'
              : 'Post-harvest'}
          </span>

          {product.producer?.verification_status === 'approved' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>

        <span
          className={`absolute bottom-2 right-2 rounded-full border px-2 py-1 text-[10px] font-bold ${stockStatus.className}`}
        >
          {stockStatus.label}
        </span>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold capitalize text-slate-900 sm:text-base">
            {product.crop_name}
          </h3>

          <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            {producerName}
          </p>

          {product.location && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {product.location}
            </p>
          )}

          {product.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-base font-extrabold text-emerald-700 sm:text-lg">
              {formatNaira(product.price_per_unit)}
            </p>

            <p className="text-[11px] text-slate-500">
              per {product.unit || 'unit'}
            </p>
          </div>

          <p className="text-right text-[11px] font-semibold text-slate-500">
            {formatNumber(product.quantity)} {product.unit || 'units'}
            <span className="block font-normal">available</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart(product);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 px-2 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Add
          </button>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(event) => {
              event.stopPropagation();
              onQuickBuy(product);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buy now
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};

const ProductModal = ({
  product,
  imageIndex,
  quantity,
  onClose,
  onPreviousImage,
  onNextImage,
  onSelectImage,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onAddToCart,
  onBuyNow,
}) => {
  const images = getProductImages(product.image_path);
  const imageUrl = getStorageImageUrl(images[imageIndex]);
  const stock = Number(product.quantity || 0);
  const stockStatus = getStockStatus(stock);
  const producerName = getProducerName(product.producer);
  const total = quantity * Number(product.price_per_unit || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Package className="h-4 w-4 text-emerald-600" />
            Product details
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close product details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 overflow-y-auto lg:grid-cols-2">
          <div className="space-y-3 bg-slate-50 p-4 sm:p-6">
            <div className="relative overflow-hidden rounded-2xl bg-white">
              <div className="flex h-60 items-center justify-center sm:h-80">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.crop_name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <ImageIcon className="h-12 w-12" />
                    <span className="text-sm">No image available</span>
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={onPreviousImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 shadow-md transition hover:bg-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={onNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-2 text-slate-700 shadow-md transition hover:bg-white"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => {
                  const thumbnailUrl = getStorageImageUrl(image);

                  return (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      onClick={() => onSelectImage(index)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${
                        imageIndex === index
                          ? 'border-emerald-500'
                          : 'border-transparent'
                      }`}
                    >
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={`${product.crop_name} ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="mx-auto h-5 w-5 text-slate-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <UserRound className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Listed by</p>
                  <p className="truncate text-sm font-bold text-slate-900">
                    {producerName}
                  </p>
                </div>

                {product.producer?.verification_status === 'approved' && (
                  <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-600" />
                )}
              </div>

              {product.producer?.farm_name && (
                <p className="mt-3 text-xs text-slate-500">
                  Farm: {product.producer.farm_name}
                </p>
              )}

              {product.producer?.lga_location && (
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {product.producer.lga_location}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-700">
                  {product.product_type === 'pre_harvest'
                    ? 'Pre-harvest'
                    : 'Post-harvest'}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${stockStatus.className}`}
                >
                  {stockStatus.label}
                </span>
              </div>

              <h2 className="text-2xl font-extrabold capitalize tracking-tight text-slate-900">
                {product.crop_name}
              </h2>

              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                {product.description?.trim() ||
                  'No detailed product description has been added by the producer yet. Contact the producer for more information about quality, variety, packaging, and availability.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Price</p>
                <p className="mt-1 text-lg font-extrabold text-emerald-700">
                  {formatNaira(product.price_per_unit)}
                </p>
                <p className="text-xs text-slate-500">
                  per {product.unit || 'unit'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Available</p>
                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  {formatNumber(stock)}
                </p>
                <p className="text-xs text-slate-500">
                  {product.unit || 'units'}
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <h3 className="text-sm font-bold text-slate-900">
                Product information
              </h3>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Location</span>
                <span className="flex items-center gap-1 text-right font-semibold text-slate-800">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  {product.location || 'Not specified'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Unit</span>
                <span className="font-semibold capitalize text-slate-800">
                  {product.unit || 'Unit'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Listing type</span>
                <span className="font-semibold capitalize text-slate-800">
                  {product.product_type === 'pre_harvest'
                    ? 'Pre-harvest'
                    : 'Post-harvest'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Quantity
                </h3>

                <span className="text-xs text-slate-500">
                  Maximum: {formatNumber(stock)}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-2">
                <button
                  type="button"
                  onClick={onDecreaseQuantity}
                  disabled={quantity <= 1}
                  className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="text-base font-extrabold text-slate-900">
                  {quantity} {product.unit || 'unit'}
                </span>

                <button
                  type="button"
                  onClick={onIncreaseQuantity}
                  disabled={quantity >= stock}
                  className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-emerald-800">
                  Estimated total
                </span>

                <span className="text-xl font-extrabold text-emerald-700">
                  {formatNaira(total)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={stock <= 0}
                onClick={onAddToCart}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to cart
              </button>

              <button
                type="button"
                disabled={stock <= 0}
                onClick={onBuyNow}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Buy now
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              Product availability and pricing are based on the current
              producer listing and may change before checkout.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Catalog = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [activeModalProduct, setActiveModalProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    setError('');

    try {
      const { data: productRows, error: productsError } = await supabase
        .from('products')
        .select(
          'id, producer_id, crop_name, description, quantity, unit, price_per_unit, location, image_path, product_type, created_at'
        )
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      const producerIds = [
        ...new Set(
          (productRows || [])
            .map((product) => product.producer_id)
            .filter(Boolean)
        ),
      ];

      let producerMap = {};

      if (producerIds.length > 0) {
        const { data: producers, error: producersError } = await supabase
          .from('profiles')
          .select(
            'id, full_name, business_name, farm_name, lga_location, role, verification_status'
          )
          .in('id', producerIds);

        if (producersError) throw producersError;

        producerMap = (producers || []).reduce((map, producer) => {
          map[producer.id] = producer;
          return map;
        }, {});
      }

      const preparedProducts = (productRows || []).map((product) => ({
        ...product,
        producer: producerMap[product.producer_id] || null,
      }));

      setProducts(preparedProducts);
    } catch (fetchError) {
      console.error('Catalog fetch error:', fetchError);
      setError(
        fetchError.message ||
          'Unable to load products. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('public-catalog-products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        () => {
          fetchProducts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!activeModalProduct) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveModalProduct(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [activeModalProduct]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const producerName = getProducerName(product.producer).toLowerCase();

      const matchesSearch =
        !query ||
        product.crop_name?.toLowerCase().includes(query) ||
        product.location?.toLowerCase().includes(query) ||
        producerName.includes(query);

      const matchesType =
        selectedType === 'all' ||
        product.product_type === selectedType;

      return matchesSearch && matchesType;
    });
  }, [products, searchQuery, selectedType]);

  const stats = useMemo(() => {
    const availableProducts = products.filter(
      (product) => Number(product.quantity || 0) > 0
    );

    const uniqueProducers = new Set(
      products.map((product) => product.producer_id).filter(Boolean)
    );

    return {
      totalListings: products.length,
      availableListings: availableProducts.length,
      producers: uniqueProducers.size,
    };
  }, [products]);

  const openProductModal = (product) => {
    setActiveModalProduct(product);
    setActiveImageIndex(0);
    setModalQuantity(Number(product.quantity || 0) > 0 ? 1 : 0);
  };

  const closeProductModal = () => {
    setActiveModalProduct(null);
    setActiveImageIndex(0);
    setModalQuantity(1);
  };

  const readCart = () => {
    try {
      const savedCart = localStorage.getItem(CART_KEY);
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];
      return Array.isArray(parsedCart) ? parsedCart : [];
    } catch {
      return [];
    }
  };

  const writeCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event('agrolink-cart-updated'));
  };

  const createCartItem = (product, quantity) => ({
    id: product.id,
    producerId: product.producer_id,
    cropName: product.crop_name,
    quantity,
    availableQuantity: Number(product.quantity || 0),
    unit: product.unit || 'unit',
    pricePerUnit: Number(product.price_per_unit || 0),
    location: product.location || '',
    description: product.description || '',
    productType: product.product_type || 'post_harvest',
    imagePath: getProductImages(product.image_path),
    producerName: getProducerName(product.producer),
  });

  const addProductToCart = (product, requestedQuantity = 1) => {
    const availableQuantity = Number(product.quantity || 0);

    if (availableQuantity <= 0) {
      toast.error('This product is currently out of stock.');
      return false;
    }

    const safeQuantity = Math.max(
      1,
      Math.min(Number(requestedQuantity) || 1, availableQuantity)
    );

    const cart = readCart();
    const existingIndex = cart.findIndex(
      (item) => item.id === product.id
    );

    if (existingIndex >= 0) {
      const existingItem = cart[existingIndex];
      const updatedQuantity = Math.min(
        Number(existingItem.quantity || 0) + safeQuantity,
        availableQuantity
      );

      cart[existingIndex] = {
        ...existingItem,
        ...createCartItem(product, updatedQuantity),
      };

      writeCart(cart);

      toast.success(
        `${product.crop_name} quantity updated in your cart.`
      );
      return true;
    }

    cart.push(createCartItem(product, safeQuantity));
    writeCart(cart);

    toast.success(`${product.crop_name} added to cart.`);
    return true;
  };

  const handleAddToCart = (product, quantity = 1) => {
    addProductToCart(product, quantity);
  };

  const handleQuickBuy = (product, quantity = 1) => {
    const added = addProductToCart(product, quantity);

    if (added) {
      closeProductModal();
      navigate('/checkout');
    }
  };

  const moveImage = (direction) => {
    if (!activeModalProduct) return;

    const images = getProductImages(activeModalProduct.image_path);

    if (images.length <= 1) return;

    setActiveImageIndex((currentIndex) => {
      if (direction === 'next') {
        return (currentIndex + 1) % images.length;
      }

      return (currentIndex - 1 + images.length) % images.length;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">
              <Sprout className="h-4 w-4" />
              Fresh listings from AgroLink producers
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Explore agricultural products
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Discover available farm produce, compare prices, and
              connect with producers across the marketplace.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-xl sm:gap-5">
            <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm sm:p-4">
              <p className="text-xl font-extrabold text-emerald-700 sm:text-2xl">
                {formatNumber(stats.totalListings)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                Listings
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm sm:p-4">
              <p className="text-xl font-extrabold text-emerald-700 sm:text-2xl">
                {formatNumber(stats.availableListings)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                Available
              </p>
            </div>

            <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm sm:p-4">
              <p className="text-xl font-extrabold text-emerald-700 sm:text-2xl">
                {formatNumber(stats.producers)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                Producers
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search crops, locations, or producers..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">All products</option>
              <option value="pre_harvest">Pre-harvest</option>
              <option value="post_harvest">Post-harvest</option>
            </select>

            <button
              type="button"
              onClick={() => fetchProducts(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="h-28 bg-slate-200 sm:h-36" />
                <div className="space-y-3 p-3">
                  <div className="h-4 rounded bg-slate-200" />
                  <div className="h-3 rounded bg-slate-200" />
                  <div className="h-3 w-2/3 rounded bg-slate-200" />
                  <div className="h-8 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-semibold text-red-700">{error}</p>

            <button
              type="button"
              onClick={() => fetchProducts()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              No products found
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Try another search term or change the product category
              filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpen={openProductModal}
                onAddToCart={handleAddToCart}
                onQuickBuy={handleQuickBuy}
              />
            ))}
          </div>
        )}
      </main>

      {activeModalProduct && (
        <ProductModal
          product={activeModalProduct}
          imageIndex={activeImageIndex}
          quantity={modalQuantity}
          onClose={closeProductModal}
          onPreviousImage={() => moveImage('previous')}
          onNextImage={() => moveImage('next')}
          onSelectImage={setActiveImageIndex}
          onIncreaseQuantity={() => {
            setModalQuantity((current) =>
              Math.min(
                current + 1,
                Number(activeModalProduct.quantity || 0)
              )
            );
          }}
          onDecreaseQuantity={() => {
            setModalQuantity((current) => Math.max(current - 1, 1));
          }}
          onAddToCart={() => {
            handleAddToCart(activeModalProduct, modalQuantity);
          }}
          onBuyNow={() => {
            handleQuickBuy(activeModalProduct, modalQuantity);
          }}
        />
      )}
    </div>
  );
};

export default Catalog;
