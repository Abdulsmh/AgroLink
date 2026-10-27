

import React, {

  useCallback,

  useEffect,

  useMemo,

  useState,

} from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';

import {

  ArrowLeft,

  CheckCircle2,

  ChevronDown,

  ChevronUp,

  Clock3,

  Loader2,

  MapPin,

  Minus,

  Package,

  Plus,

  RefreshCw,

  ShoppingBag,

  Store,

  Trash2,

  Truck,

  WalletCards,

} from 'lucide-react';

import { toast } from 'react-hot-toast';

import { supabase } from '../config/supabaseClient';

import { useAuth } from '../context/AuthContext';



const CART_KEY = 'agrolink_cart';



const formatNaira = (amount) =>

  new Intl.NumberFormat('en-NG', {

    style: 'currency',

    currency: 'NGN',

    maximumFractionDigits: 2,

  }).format(Number(amount) || 0);



const getCart = () => {

  try {

    const saved = localStorage.getItem(CART_KEY);

    const parsed = saved ? JSON.parse(saved) : [];



    return Array.isArray(parsed) ? parsed : [];

  } catch (error) {

    console.error('Unable to load cart:', error);

    return [];

  }

};



const saveCart = (cart) => {

  try {

    localStorage.setItem(CART_KEY, JSON.stringify(cart));

    window.dispatchEvent(new Event('agrolink-cart-updated'));

  } catch (error) {

    console.error('Unable to save cart:', error);

    toast.error('Unable to update your cart.');

  }

};



const sameId = (first, second) =>

  String(first ?? '') === String(second ?? '');



const getImagePath = (imagePath) => {

  if (!imagePath) return null;



  if (Array.isArray(imagePath)) {

    return imagePath[0] || null;

  }



  if (typeof imagePath !== 'string') return null;



  try {

    const parsed = JSON.parse(imagePath);



    if (Array.isArray(parsed)) return parsed[0] || null;

    if (typeof parsed === 'string') return parsed;

  } catch {

    // The database may contain a plain storage path.

  }



  return imagePath.includes(',')

    ? imagePath.split(',')[0].trim()

    : imagePath;

};



const getProductImage = (imagePath) => {

  const path = getImagePath(imagePath);



  if (!path) return null;



  if (/^https?:\/\//i.test(path)) return path;



  const cleanPath = path

    .replace(/^\/+/, '')

    .replace(/^product-images\/+/, '');



  const { data } = supabase.storage

    .from('product-images')

    .getPublicUrl(cleanPath);



  return data?.publicUrl || null;

};



const getProducerName = (profile, fallback) =>

  profile?.business_name ||

  profile?.farm_name ||

  profile?.full_name ||

  fallback ||

  'Producer';



const Checkout = () => {

  const navigate = useNavigate();

  const location = useLocation();



  const { user, userProfile, isLoading: authLoading } = useAuth();



  const [cart, setCart] = useState([]);

  const [products, setProducts] = useState([]);

  const [profiles, setProfiles] = useState({});

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  const [deliveryNote, setDeliveryNote] = useState('');

  const [expandedItems, setExpandedItems] = useState({});

  const [imageErrors, setImageErrors] = useState({});

  const [orderComplete, setOrderComplete] = useState(false);

  const [submittedOrderCount, setSubmittedOrderCount] = useState(0);



  useEffect(() => {

    if (!authLoading && !user) {

      navigate('/login', {

        replace: true,

        state: { from: location.pathname },

      });

    }

  }, [authLoading, user, navigate, location.pathname]);



  useEffect(() => {

    if (userProfile?.lga_location) {

      setDeliveryLocation((current) =>

        current.trim() ? current : userProfile.lga_location

      );

    }

  }, [userProfile?.lga_location]);

  useEffect(() => {
    if (userProfile?.phone_number) {
      setBuyerPhone((current) =>
        current.trim() ? current : userProfile.phone_number
      );
    }
  }, [userProfile?.phone_number]);



  useEffect(() => {

    const syncCart = () => setCart(getCart());



    syncCart();



    window.addEventListener('agrolink-cart-updated', syncCart);

    window.addEventListener('storage', syncCart);



    return () => {

      window.removeEventListener('agrolink-cart-updated', syncCart);

      window.removeEventListener('storage', syncCart);

    };

  }, []);



  const loadCheckoutData = useCallback(async (showRefresh = false) => {

    if (!user) {

      setIsLoading(false);

      return;

    }



    if (showRefresh) {

      setIsRefreshing(true);

    } else {

      setIsLoading(true);

    }



    try {

      const currentCart = getCart();

      setCart(currentCart);



      if (!currentCart.length) {

        setProducts([]);

        setProfiles({});

        return;

      }



      const productIds = [

        ...new Set(

          currentCart

            .map((item) => item.id)

            .filter((id) => id != null)

        ),

      ];



      if (!productIds.length) {

        setProducts([]);

        setProfiles({});

        return;

      }



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

            product_type,

            image_path,

            description

          `)

          .in('id', productIds);



      if (productError) throw productError;



      const latestProducts = productData || [];

      const producerIds = [

        ...new Set(

          latestProducts

            .map((product) => product.producer_id)

            .filter(Boolean)

        ),

      ];



      let profileMap = {};



      if (producerIds.length) {

        // First try the richer profile fields. If optional columns

        // do not exist in this database, retry using known fields.

        let profileResult = await supabase

          .from('profiles')

          .select(`

            id,

            full_name,

            role,

            phone_number,

            lga_location,

            verification_status,

            business_name,

            farm_name

          `)

          .in('id', producerIds);



        if (profileResult.error) {

          profileResult = await supabase

            .from('profiles')

            .select(`

              id,

              full_name,

              role,

              phone_number,

              lga_location,

              verification_status

            `)

            .in('id', producerIds);

        }



        if (profileResult.error) {

          console.error(

            'Producer profile loading error:',

            profileResult.error

          );

        } else {

          profileMap = (profileResult.data || []).reduce(

            (result, profile) => {

              result[profile.id] = profile;

              return result;

            },

            {}

          );

        }

      }



      setProducts(latestProducts);

      setProfiles(profileMap);

    } catch (error) {

      console.error('Checkout loading error:', error);

      toast.error('Unable to load the latest product information.');

    } finally {

      setIsLoading(false);

      setIsRefreshing(false);

    }

  }, [user]);



  useEffect(() => {

    if (user) {

      loadCheckoutData();

    } else if (!authLoading) {

      setIsLoading(false);

    }

  }, [user, authLoading, loadCheckoutData]);



  const checkoutItems = useMemo(() => {

    return cart.map((cartItem) => {

      const product = products.find((item) =>

        sameId(item.id, cartItem.id)

      );



      if (!product) {

        return {

          ...cartItem,

          missing: true,

          currentPrice: Number(cartItem.pricePerUnit) || 0,

          availableQuantity: 0,

          producerName: cartItem.producerName || 'Producer',

        };

      }



      const producer = profiles[product.producer_id];



      return {

        ...cartItem,

        product,

        missing: false,

        currentPrice: Number(product.price_per_unit) || 0,

        availableQuantity: Math.max(0, Number(product.quantity) || 0),

        currentUnit: product.unit || cartItem.unit,

        currentLocation: product.location || cartItem.location,

        currentImagePath: product.image_path || cartItem.imagePath,

        currentDescription: product.description || cartItem.description,

        producerId: product.producer_id,

        producerName: getProducerName(

          producer,

          cartItem.producerName

        ),

        producerVerified:

          producer?.verification_status === 'approved',

      };

    });

  }, [cart, products, profiles]);



  const validation = useMemo(() => {

    const missingProducts = checkoutItems.filter(

      (item) => item.missing

    );



    const outOfStock = checkoutItems.filter(

      (item) =>

        !item.missing &&

        (

          Number(item.quantity) <= 0 ||

          Number(item.quantity) > item.availableQuantity ||

          item.availableQuantity <= 0

        )

    );



    const priceChanged = checkoutItems.filter(

      (item) =>

        !item.missing &&

        Number(item.pricePerUnit) !== item.currentPrice

    );



    return {

      missingProducts,

      outOfStock,

      priceChanged,

      hasIssues:

        missingProducts.length > 0 ||

        outOfStock.length > 0 ||

        priceChanged.length > 0,

    };

  }, [checkoutItems]);



  const subtotal = useMemo(

    () =>

      checkoutItems

        .filter((item) => !item.missing)

        .reduce(

          (total, item) =>

            total +

            Math.max(0, Number(item.quantity) || 0) *

              item.currentPrice,

          0

        ),

    [checkoutItems]

  );



  const totalItems = useMemo(

    () =>

      checkoutItems.reduce(

        (total, item) => total + (Number(item.quantity) || 0),

        0

      ),

    [checkoutItems]

  );



  const producerCount = useMemo(

    () =>

      new Set(

        checkoutItems

          .filter((item) => !item.missing)

          .map((item) => item.producerId)

          .filter(Boolean)

      ).size,

    [checkoutItems]

  );



  const toggleItem = (id) => {

    setExpandedItems((current) => ({

      ...current,

      [id]: !current[id],

    }));

  };



  const updateCartItem = (id, newQuantity) => {

    const product = products.find((item) =>

      sameId(item.id, id)

    );



    if (!product) {

      toast.error('This product is no longer available.');

      return;

    }



    const available = Math.max(0, Number(product.quantity) || 0);



    if (available <= 0) {

      toast.error('This product is currently out of stock.');

      return;

    }



    const requested = Math.max(1, Number(newQuantity) || 1);

    const quantity = Math.min(requested, available);



    if (requested > available) {

      toast.error(

        `Only ${available} ${product.unit || 'units'} are currently available.`

      );

    }



    const updatedCart = cart.map((item) =>

      sameId(item.id, id)

        ? {

            ...item,

            quantity,

            availableQuantity: available,

            pricePerUnit: Number(product.price_per_unit) || 0,

            producerId: product.producer_id,

            cropName: product.crop_name,

            unit: product.unit,

            location: product.location,

            imagePath: product.image_path,

            productType: product.product_type,

            description: product.description || item.description,

          }

        : item

    );



    setCart(updatedCart);

    saveCart(updatedCart);

  };



  const removeCartItem = (id) => {

    const updatedCart = cart.filter(

      (item) => !sameId(item.id, id)

    );



    setCart(updatedCart);

    saveCart(updatedCart);

    toast.success('Item removed from your order.');

  };



  const refreshPricesAndAvailability = async () => {

    await loadCheckoutData(true);

    toast.success('Latest prices and availability checked.');

  };



  // This action is explicit: updated prices are not accepted silently.

  const acceptCurrentPrices = () => {

    const updatedCart = cart.map((cartItem) => {

      const product = products.find((item) =>

        sameId(item.id, cartItem.id)

      );



      if (!product) return cartItem;



      const available = Math.max(0, Number(product.quantity) || 0);

      const oldQuantity = Math.max(1, Number(cartItem.quantity) || 1);

      const quantity =

        available > 0 ? Math.min(oldQuantity, available) : oldQuantity;



      return {

        ...cartItem,

        quantity,

        availableQuantity: available,

        pricePerUnit: Number(product.price_per_unit) || 0,

        producerId: product.producer_id,

        cropName: product.crop_name,

        unit: product.unit,

        location: product.location,

        imagePath: product.image_path,

        productType: product.product_type,

        description: product.description || cartItem.description,

      };

    });



    setCart(updatedCart);

    saveCart(updatedCart);

    toast.success('Cart prices and available quantities updated.');

  };



  const handleSubmitOrder = async () => {

    if (isSubmitting) return;



    if (!user) {

      toast.error('Please log in before placing your order.');

      navigate('/login', {

        state: { from: '/checkout' },

      });

      return;

    }



    if (!deliveryLocation.trim()) {

      toast.error('Please enter your delivery or pickup location.');

      return;

    }

    const normalizedPhone = buyerPhone.trim();
    const phoneDigits = normalizedPhone.replace(/\D/g, '');

    if (
      !normalizedPhone ||
      !/^\+?[0-9\s()-]+$/.test(normalizedPhone) ||
      phoneDigits.length < 7 ||
      phoneDigits.length > 15
    ) {
      toast.error('Please enter a valid contact phone number.');
      return;
    }



    if (!checkoutItems.length) {

      toast.error('Your cart is empty.');

      navigate('/cart');

      return;

    }



    if (validation.hasIssues) {

      toast.error(

        'Please resolve the product, quantity, or price changes before ordering.'

      );

      return;

    }



    setIsSubmitting(true);



    try {

      // Refresh stock and price immediately before submitting.

      const currentCart = getCart();

      const ids = [

        ...new Set(currentCart.map((item) => item.id)),

      ];



      const { data: latestProducts, error: latestError } =

        await supabase

          .from('products')

          .select(`

            id,

            producer_id,

            crop_name,

            quantity,

            unit,

            price_per_unit

          `)

          .in('id', ids);



      if (latestError) throw latestError;



      const latestById = new Map(

        (latestProducts || []).map((product) => [

          String(product.id),

          product,

        ])

      );



      for (const item of currentCart) {

        const product = latestById.get(String(item.id));



        if (!product) {

          throw new Error(

            `${item.cropName || 'A product'} is no longer available. Refresh checkout and remove it.`

          );

        }



        const quantity = Number(item.quantity);

        const stock = Number(product.quantity);

        const price = Number(product.price_per_unit);



        if (

          !Number.isFinite(quantity) ||

          quantity <= 0 ||

          !Number.isFinite(stock) ||

          quantity > stock

        ) {

          throw new Error(

            `The available quantity for ${product.crop_name} has changed. Refresh checkout and update your cart.`

          );

        }



        if (

          !Number.isFinite(price) ||

          price < 0 ||

          price !== Number(item.pricePerUnit)

        ) {

          throw new Error(

            `The price for ${product.crop_name} has changed. Refresh checkout and accept the updated price.`

          );

        }

      }



      const savedPhone = String(userProfile?.phone_number || '').trim();

      if (normalizedPhone !== savedPhone) {
        const { error: phoneError } = await supabase
          .from('profiles')
          .update({ phone_number: normalizedPhone })
          .eq('id', user.id);

        if (phoneError) {
          throw new Error(
            'Unable to save your contact number. Please check your profile settings and try again.'
          );
        }
      }

      const ordersToInsert = currentCart.map((item) => {

        const product = latestById.get(String(item.id));



        return {

          buyer_id: user.id,

          producer_id: product.producer_id,

          product_id: product.id,

          quantity: Number(item.quantity),

          total_amount:

            Number(item.quantity) * Number(product.price_per_unit),

          status: 'pending',

          delivery_location: deliveryNote.trim()

            ? `${deliveryLocation.trim()} — ${deliveryNote.trim()}`

            : deliveryLocation.trim(),

        };

      });



      const { data, error } = await supabase

        .from('orders')

        .insert(ordersToInsert)

        .select('id');



      if (error) throw error;



      // Clear the cart only after the insert succeeds.

      localStorage.removeItem(CART_KEY);

      setCart([]);

      window.dispatchEvent(new Event('agrolink-cart-updated'));



      setSubmittedOrderCount(data?.length || ordersToInsert.length);

      setOrderComplete(true);

      toast.success('Your order request has been submitted.');

    } catch (error) {

      console.error('Order submission error:', error);

      toast.error(

        error?.message ||

          'Unable to submit your order. Please try again.'

      );

    } finally {

      setIsSubmitting(false);

    }

  };



  if (authLoading || (user && isLoading)) {

    return (

      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">

        <div className="text-center">

          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">

            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />

          </div>

          <h2 className="text-lg font-bold text-slate-900">

            Preparing your order

          </h2>

          <p className="mt-1 text-sm text-slate-500">

            Checking the latest product availability and prices...

          </p>

        </div>

      </div>

    );

  }



  if (!user) return null;



  if (orderComplete) {

    return (

      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">

        <div className="w-full max-w-2xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl sm:p-12">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">

            <CheckCircle2 className="h-10 w-10 text-emerald-600" />

          </div>



          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">

            Order submitted

          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">

            Your order request is on its way

          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">

            Your {submittedOrderCount}{' '}

            {submittedOrderCount === 1 ? 'order has' : 'orders have'}{' '}

            been submitted successfully. The producer can now review the

            request and arrange payment and delivery or pickup with you.

          </p>



          <div className="mx-auto mt-7 max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">

            <div className="flex gap-3">

              <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div>

                <p className="font-bold text-amber-900">

                  Payment is handled directly

                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">

                  AgroLink does not collect your payment online. Payment is

                  arranged directly with the producer.

                </p>

              </div>

            </div>

          </div>



          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <button

              type="button"

              onClick={() => navigate('/buyer/orders')}

              className="rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"

            >

              View My Orders

            </button>

            <button

              type="button"

              onClick={() => navigate('/catalog')}

              className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"

            >

              Continue Shopping

            </button>

          </div>

        </div>

      </div>

    );

  }



  if (!cart.length) {

    return (

      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-10">

        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg sm:p-12">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">

            <ShoppingBag className="h-9 w-9 text-slate-500" />

          </div>

          <h1 className="mt-6 text-2xl font-black text-slate-900">

            Your cart is empty

          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">

            Add agricultural products to your cart before confirming an order.

          </p>

          <Link

            to="/catalog"

            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"

          >

            Browse Products

          </Link>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">

      <div className="mx-auto max-w-7xl">

        <header className="mb-7">

          <Link

            to="/cart"

            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-emerald-700"

          >

            <ArrowLeft className="h-4 w-4" />

            Back to cart

          </Link>



          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

            <div>

              <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">

                <Package className="h-3.5 w-3.5" />

                Order confirmation

              </span>

              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">

                Complete your order

              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">

                Review your products and provide your delivery or pickup

                location. No online payment is required.

              </p>

            </div>



            <button

              type="button"

              onClick={refreshPricesAndAvailability}

              disabled={isRefreshing || isSubmitting}

              className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"

            >

              <RefreshCw

                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}

              />

              {isRefreshing ? 'Checking...' : 'Check latest prices'}

            </button>

          </div>

        </header>



        <div className="mb-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5">

          <div className="flex gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">

              <WalletCards className="h-5 w-5 text-emerald-600" />

            </div>

            <div>

              <h2 className="font-bold text-emerald-950">

                How payment works

              </h2>

              <p className="mt-1 text-sm leading-6 text-emerald-800">

                AgroLink helps you place and manage orders. Payment is arranged

                directly with the producer after the order is reviewed.

              </p>

            </div>

          </div>

        </div>



        {validation.hasIssues && (

          <div className="mb-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">

            <div className="flex items-start gap-3">

              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div className="min-w-0 flex-1">

                <h2 className="font-bold text-amber-900">

                  Some cart details need your attention

                </h2>

                <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-800">

                  {validation.missingProducts.length > 0 && (

                    <li>

                      {validation.missingProducts.length} product

                      {validation.missingProducts.length > 1 ? 's are' : ' is'}{' '}

                      no longer available. Remove these items from your cart.

                    </li>

                  )}

                  {validation.outOfStock.length > 0 && (

                    <li>

                      {validation.outOfStock.length} item

                      {validation.outOfStock.length > 1 ? 's exceed' : ' exceeds'}{' '}

                      current stock. Reduce the quantity or remove the item.

                    </li>

                  )}

                  {validation.priceChanged.length > 0 && (

                    <li>

                      The current price has changed for{' '}

                      {validation.priceChanged.length} item

                      {validation.priceChanged.length > 1 ? 's' : ''}.

                      Review and accept the updated prices before ordering.

                    </li>

                  )}

                </ul>



                {validation.priceChanged.length > 0 && (

                  <button

                    type="button"

                    onClick={acceptCurrentPrices}

                    disabled={isSubmitting}

                    className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-800 disabled:opacity-50"

                  >

                    Accept updated prices and stock

                  </button>

                )}



                <Link

                  to="/cart"

                  className="mt-3 block text-sm font-bold text-amber-900 underline underline-offset-4"

                >

                  Review your cart

                </Link>

              </div>

            </div>

          </div>

        )}



        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">

          <div className="space-y-6">

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">

                  <MapPin className="h-5 w-5 text-emerald-600" />

                </div>

                <div>

                  <h2 className="text-lg font-black text-slate-900">

                    Delivery or pickup location

                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">

                    Tell the producer where you would like to receive or

                    collect your order.

                  </p>

                </div>

              </div>



              <div className="mt-6">

                <label

                  htmlFor="deliveryLocation"

                  className="mb-2 block text-sm font-bold text-slate-700"

                >

                  Location <span className="text-red-500">*</span>

                </label>

                <textarea

                  id="deliveryLocation"

                  value={deliveryLocation}

                  onChange={(event) => setDeliveryLocation(event.target.value)}

                  rows={3}

                  maxLength={500}

                  required

                  placeholder="Enter your area, address, market, or pickup point..."

                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"

                />

              </div>



              <div className="mt-5">
                <label
                  htmlFor="buyerPhone"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Contact phone number <span className="text-red-500">*</span>
                </label>
                <input
                  id="buyerPhone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={buyerPhone}
                  onChange={(event) => setBuyerPhone(event.target.value)}
                  maxLength={25}
                  required
                  placeholder="e.g. 08012345678"
                  aria-describedby="buyerPhoneHelp"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
                <p id="buyerPhoneHelp" className="mt-2 text-xs leading-5 text-slate-500">
                  The producer can use this number to coordinate your order after accepting it.
                </p>
              </div>

              <div className="mt-5">

                <label

                  htmlFor="deliveryNote"

                  className="mb-2 block text-sm font-bold text-slate-700"

                >

                  Additional note{' '}

                  <span className="font-normal text-slate-400">(optional)</span>

                </label>

                <textarea

                  id="deliveryNote"

                  value={deliveryNote}

                  onChange={(event) => setDeliveryNote(event.target.value)}

                  rows={2}

                  maxLength={500}

                  placeholder="Preferred pickup time or directions..."

                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"

                />

              </div>

            </section>



            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50">

                  <WalletCards className="h-5 w-5 text-blue-600" />

                </div>

                <div>

                  <h2 className="text-lg font-black text-slate-900">

                    Payment method

                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">

                    Offline payment arranged directly between you and the

                    producer.

                  </p>

                </div>

              </div>



              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">

                    <WalletCards className="h-5 w-5 text-slate-600" />

                  </div>

                  <div>

                    <p className="font-bold text-slate-900">

                      Physical / offline payment

                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">

                      No online charge will be made.

                    </p>

                  </div>

                  <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />

                </div>

              </div>



              <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">

                <strong>Important:</strong> The displayed total is the expected

                value of the selected products. Confirm the final arrangement

                with the producer.

              </p>

            </section>



            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <h2 className="text-lg font-black text-slate-900">

                    Your products

                  </h2>

                  <p className="mt-1 text-sm text-slate-500">

                    {totalItems} item{totalItems !== 1 ? 's' : ''} from{' '}

                    {producerCount} producer{producerCount !== 1 ? 's' : ''}

                  </p>

                </div>

                <Link

                  to="/cart"

                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700"

                >

                  Edit cart

                </Link>

              </div>



              <div className="mt-6 divide-y divide-slate-100">

                {checkoutItems.map((item) => {

                  const imageUrl = getProductImage(

                    item.currentImagePath || item.imagePath

                  );

                  const lineTotal =

                    Math.max(0, Number(item.quantity) || 0) *

                    item.currentPrice;

                  const expanded = Boolean(expandedItems[item.id]);

                  const hasImageError = Boolean(imageErrors[item.id]);



                  return (

                    <div key={item.id} className="py-5 first:pt-0 last:pb-0">

                      <div className="flex gap-4">

                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-24 sm:w-24">

                          {imageUrl && !hasImageError ? (

                            <img

                              src={imageUrl}

                              alt={item.cropName || 'Agricultural product'}

                              loading="lazy"

                              onError={() =>

                                setImageErrors((current) => ({

                                  ...current,

                                  [item.id]: true,

                                }))

                              }

                              className="h-full w-full object-cover"

                            />

                          ) : (

                            <div className="flex h-full w-full items-center justify-center">

                              <Package className="h-7 w-7 text-slate-300" />

                            </div>

                          )}

                        </div>



                        <div className="min-w-0 flex-1">

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                              <h3 className="truncate text-base font-black capitalize text-slate-900">

                                {item.cropName || 'Agricultural product'}

                              </h3>

                              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">

                                <Store className="h-3.5 w-3.5 shrink-0" />

                                <span className="truncate">

                                  {item.producerName}

                                </span>

                                {item.producerVerified && (

                                  <CheckCircle2

                                    className="h-3.5 w-3.5 shrink-0 text-emerald-500"

                                    aria-label="Verified producer"

                                  />

                                )}

                              </div>

                              {item.missing && (

                                <p className="mt-1 text-xs font-semibold text-red-600">

                                  Product unavailable

                                </p>

                              )}

                            </div>



                            <button

                              type="button"

                              onClick={() => removeCartItem(item.id)}

                              disabled={isSubmitting}

                              aria-label={`Remove ${item.cropName || 'product'}`}

                              title="Remove item"

                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"

                            >

                              <Trash2 className="h-4 w-4" />

                            </button>

                          </div>



                          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">

                            <span>

                              {formatNaira(item.currentPrice)} /{' '}

                              {item.currentUnit || item.unit || 'unit'}

                            </span>

                            <span>

                              Available: {item.availableQuantity}{' '}

                              {item.currentUnit || item.unit || 'units'}

                            </span>

                          </div>



                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

                            <div className="flex items-center rounded-xl border border-slate-200 bg-white">

                              <button

                                type="button"

                                onClick={() =>

                                  updateCartItem(

                                    item.id,

                                    Number(item.quantity) - 1

                                  )

                                }

                                disabled={

                                  isSubmitting ||

                                  Number(item.quantity) <= 1 ||

                                  item.missing

                                }

                                aria-label="Decrease quantity"

                                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"

                              >

                                <Minus className="h-4 w-4" />

                              </button>

                              <span className="min-w-9 text-center text-sm font-bold text-slate-900">

                                {item.quantity}

                              </span>

                              <button

                                type="button"

                                onClick={() =>

                                  updateCartItem(

                                    item.id,

                                    Number(item.quantity) + 1

                                  )

                                }

                                disabled={

                                  isSubmitting ||

                                  item.missing ||

                                  Number(item.quantity) >=

                                    item.availableQuantity

                                }

                                aria-label="Increase quantity"

                                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-30"

                              >

                                <Plus className="h-4 w-4" />

                              </button>

                            </div>



                            <div className="text-right">

                              <p className="text-base font-black text-slate-900">

                                {formatNaira(lineTotal)}

                              </p>

                              <button

                                type="button"

                                onClick={() => toggleItem(item.id)}

                                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600"

                              >

                                Details

                                {expanded ? (

                                  <ChevronUp className="h-3.5 w-3.5" />

                                ) : (

                                  <ChevronDown className="h-3.5 w-3.5" />

                                )}

                              </button>

                            </div>

                          </div>

                        </div>

                      </div>



                      {expanded && (

                        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">

                          <div className="grid gap-3 sm:grid-cols-2">

                            <div>

                              <p className="text-xs font-semibold text-slate-400">

                                Product type

                              </p>

                              <p className="mt-1 font-semibold capitalize text-slate-700">

                                {(item.productType ||

                                  item.product?.product_type ||

                                  'Agricultural product'

                                ).replaceAll('_', ' ')}

                              </p>

                            </div>

                            <div>

                              <p className="text-xs font-semibold text-slate-400">

                                Location

                              </p>

                              <p className="mt-1 font-semibold text-slate-700">

                                {item.currentLocation ||

                                  item.location ||

                                  'Not specified'}

                              </p>

                            </div>

                            {(item.currentDescription || item.description) && (

                              <div className="sm:col-span-2">

                                <p className="text-xs font-semibold text-slate-400">

                                  Description

                                </p>

                                <p className="mt-1 leading-6 text-slate-700">

                                  {item.currentDescription || item.description}

                                </p>

                              </div>

                            )}

                          </div>

                        </div>

                      )}

                    </div>

                  );

                })}

              </div>

            </section>

          </div>



          <aside className="lg:sticky lg:top-6 lg:self-start">

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">

                  <ShoppingBag className="h-5 w-5 text-emerald-600" />

                </div>

                <div>

                  <h2 className="text-lg font-black text-slate-900">

                    Order summary

                  </h2>

                  <p className="text-xs text-slate-500">

                    {checkoutItems.length} product

                    {checkoutItems.length !== 1 ? 's' : ''}

                  </p>

                </div>

              </div>



              <div className="mt-6 space-y-3 border-b border-slate-100 pb-5 text-sm">

                <div className="flex items-center justify-between gap-4">

                  <span className="text-slate-500">Products</span>

                  <span className="font-semibold text-slate-800">

                    {formatNaira(subtotal)}

                  </span>

                </div>

                <div className="flex items-center justify-between gap-4">

                  <span className="text-slate-500">Delivery / pickup</span>

                  <span className="text-right font-semibold text-slate-600">

                    Arranged with producer

                  </span>

                </div>

                <div className="flex items-center justify-between gap-4">

                  <span className="text-slate-500">Online payment</span>

                  <span className="font-bold text-emerald-600">

                    Not required

                  </span>

                </div>

              </div>



              <div className="flex items-end justify-between gap-4 py-5">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">

                    Expected total

                  </p>

                  <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">

                    {formatNaira(subtotal)}

                  </p>

                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">

                  {totalItems} item{totalItems !== 1 ? 's' : ''}

                </span>

              </div>



              <button

                type="button"

                onClick={handleSubmitOrder}

                disabled={

                  isSubmitting ||

                  isRefreshing ||

                  validation.hasIssues ||

                  !deliveryLocation.trim() ||

                  !buyerPhone.trim() ||

                  !checkoutItems.length

                }

                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"

              >

                {isSubmitting ? (

                  <>

                    <Loader2 className="h-5 w-5 animate-spin" />

                    Submitting order...

                  </>

                ) : (

                  <>

                    <CheckCircle2 className="h-5 w-5" />

                    Place order

                  </>

                )}

              </button>



              <div className="mt-4 flex gap-3 rounded-2xl bg-slate-50 p-4">

                <Truck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

                <p className="text-xs leading-5 text-slate-500">

                  The producer can review your request and contact you to

                  arrange payment and delivery or pickup.

                </p>

              </div>



              <div className="mt-5 text-center">

                <Link

                  to="/catalog"

                  className="text-xs font-bold text-slate-400 transition hover:text-emerald-600"

                >

                  Continue browsing products

                </Link>

              </div>

            </div>

          </aside>

        </div>

      </div>

    </div>

  );

};



export default Checkout;
