import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChevronDown,
  ClipboardList,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  Sprout,
  User,
  X,
} from 'lucide-react';
import {
  Link,
  NavLink,
  useNavigate,
} from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';

const CART_KEY = 'agrolink_cart';
const LIKES_KEY = 'agrilink_likes_count';

const getDashboardPath = (role) => {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';

    case 'producer':
    case 'aggregator':
    case 'agent':
      return '/producer/dashboard';

    case 'buyer':
      return '/buyer/dashboard';

    default:
      return '/';
  }
};

const getProfilePath = (role) => {
  switch (role) {
    case 'producer':
    case 'aggregator':
    case 'agent':
      return '/producer/profile';

    case 'buyer':
      return '/buyer/dashboard';

    case 'admin':
      return '/admin/settings';

    default:
      return '/';
  }
};

export const Navbar = () => {
  const navigate = useNavigate();
  const accountRef = useRef(null);

  const {
    user,
    userProfile,
    userRole,
    logout,
  } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);

  const currentRole =
    userRole ||
    userProfile?.role ||
    null;

  const dashboardPath = useMemo(
    () => getDashboardPath(currentRole),
    [currentRole]
  );

  const profilePath = useMemo(
    () => getProfilePath(currentRole),
    [currentRole]
  );

  /*
   * Read cart from localStorage.
   *
   * The current AgroLink cart uses:
   * item.quantity
   *
   * Older cart data may use:
   * item.cartQuantity
   *
   * Supporting both prevents the navbar from becoming
   * inconsistent after previous cart changes.
   */
  const updateCartCount = () => {
    try {
      const savedCart =
        localStorage.getItem(CART_KEY);

      if (!savedCart) {
        setCartCount(0);
        return;
      }

      const cart = JSON.parse(savedCart);

      if (!Array.isArray(cart)) {
        setCartCount(0);
        return;
      }

      const count = cart.reduce(
        (total, item) => {
          const quantity =
            item.quantity ??
            item.cartQuantity ??
            1;

          return total + Number(quantity || 0);
        },
        0
      );

      setCartCount(count);
    } catch (error) {
      console.error(
        'Unable to read cart:',
        error
      );

      setCartCount(0);
    }
  };

  const updateLikesCount = () => {
    try {
      const savedLikes =
        localStorage.getItem(LIKES_KEY);

      setLikesCount(
        Number(savedLikes || 0)
      );
    } catch (error) {
      console.error(
        'Unable to read likes count:',
        error
      );

      setLikesCount(0);
    }
  };

  /*
   * Keep navbar cart/wishlist indicators
   * synchronized with the rest of AgroLink.
   */
  useEffect(() => {
    updateCartCount();
    updateLikesCount();

    const handleCartUpdate = () => {
      updateCartCount();
    };

    const handleStorageUpdate = () => {
      updateCartCount();
      updateLikesCount();
    };

    window.addEventListener(
      'agrolink-cart-updated',
      handleCartUpdate
    );

    window.addEventListener(
      'storage',
      handleStorageUpdate
    );

    return () => {
      window.removeEventListener(
        'agrolink-cart-updated',
        handleCartUpdate
      );

      window.removeEventListener(
        'storage',
        handleStorageUpdate
      );
    };
  }, []);

  /*
   * Close account dropdown when clicking
   * outside of it.
   */
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target)
      ) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
    };
  }, []);

  /*
   * Close mobile menu when screen becomes
   * desktop-sized.
   */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener(
      'resize',
      handleResize
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      );
    };
  }, []);

  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsAccountOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();

      closeMenus();

      toast.success(
        'You have been logged out.'
      );

      navigate('/login', {
        replace: true,
      });
    } catch (error) {
      console.error(
        'Logout error:',
        error
      );

      toast.error(
        'Unable to logout. Please try again.'
      );
    }
  };

  const navLinkClass = ({ isActive }) =>
    `relative rounded-lg px-3 py-2 text-sm font-bold transition ${
      isActive
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-emerald-700'
    }`;

  const mobileNavLinkClass = ({
    isActive,
  }) =>
    `block rounded-xl px-4 py-3 text-sm font-bold transition ${
      isActive
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-700'
    }`;

  const displayName =
    userProfile?.full_name ||
    'My Account';

  const initials = (
    userProfile?.full_name ||
    user?.email ||
    'U'
  )
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">

          {/* Logo */}
          <Link
            to="/"
            onClick={closeMenus}
            className="group flex flex-shrink-0 items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 transition duration-300 group-hover:rotate-6 group-hover:scale-105">
              <Sprout size={25} />
            </span>

            <span className="text-2xl font-black tracking-tight text-slate-900">
              Agro
              <span className="text-emerald-600">
                Link
              </span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            <NavLink
              to="/"
              className={navLinkClass}
            >
              Home
            </NavLink>

            <NavLink
              to="/catalog"
              className={navLinkClass}
            >
              Marketplace
            </NavLink>

            <NavLink
              to="/pre-harvest"
              className={navLinkClass}
            >
              Pre-Harvest
            </NavLink>

            <NavLink
              to="/post-harvest"
              className={navLinkClass}
            >
              Post-Harvest
            </NavLink>

            <NavLink
              to="/about"
              className={navLinkClass}
            >
              About
            </NavLink>

            <NavLink
              to="/contact"
              className={navLinkClass}
            >
              Contact
            </NavLink>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-2 md:flex">

            {/* Cart */}
            <Link
              to="/cart"
              className="relative rounded-xl p-3 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-700"
              aria-label={`Shopping cart${
                cartCount > 0
                  ? `, ${cartCount} items`
                  : ''
              }`}
            >
              <ShoppingBag size={21} />

              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-black text-white shadow-sm">
                  {cartCount > 99
                    ? '99+'
                    : cartCount}
                </span>
              )}
            </Link>

            {/* Wishlist */}
            <button
              type="button"
              onClick={() =>
                toast(
                  'Wishlist is coming soon.'
                )
              }
              className="relative rounded-xl p-3 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Wishlist"
            >
              <Heart size={21} />

              {likesCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                  {likesCount > 99
                    ? '99+'
                    : likesCount}
                </span>
              )}
            </button>

            {user ? (
              <div
                ref={accountRef}
                className="relative"
              >
                {/* Account button */}
                <button
                  type="button"
                  onClick={() =>
                    setIsAccountOpen(
                      (previous) =>
                        !previous
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-emerald-300 hover:bg-emerald-50"
                  aria-expanded={
                    isAccountOpen
                  }
                  aria-haspopup="menu"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">
                    {initials}
                  </span>

                  <span className="hidden max-w-32 text-left xl:block">
                    <span className="block truncate text-sm font-black text-slate-800">
                      {displayName}
                    </span>

                    <span className="block text-xs capitalize text-slate-500">
                      {currentRole ||
                        'User'}
                    </span>
                  </span>

                  <ChevronDown
                    size={16}
                    className={`hidden text-slate-400 transition duration-200 xl:block ${
                      isAccountOpen
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>

                {/* Account dropdown */}
                {isAccountOpen && (
                  <div
                    className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                    role="menu"
                  >
                    {/* Account header */}
                    <div className="border-b border-slate-100 px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">
                          {initials}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-900">
                            {displayName}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dashboard */}
                    <Link
                      to={dashboardPath}
                      onClick={closeMenus}
                      role="menuitem"
                      className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      <LayoutDashboard
                        size={18}
                      />

                      Dashboard
                    </Link>

                    {/* Buyer links */}
                    {currentRole ===
                      'buyer' && (
                      <>
                        <Link
                          to="/buyer/orders"
                          onClick={
                            closeMenus
                          }
                          role="menuitem"
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <ClipboardList
                            size={18}
                          />

                          My Orders

                          {cartCount >
                            0 && (
                            <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                              Buyer
                            </span>
                          )}
                        </Link>

                        <Link
                          to="/cart"
                          onClick={
                            closeMenus
                          }
                          role="menuitem"
                          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <ShoppingBag
                            size={18}
                          />

                          View Cart

                          {cartCount >
                            0 && (
                            <span className="ml-auto rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                              {cartCount >
                              99
                                ? '99+'
                                : cartCount}
                            </span>
                          )}
                        </Link>
                      </>
                    )}

                    {/* Producer profile */}
                    {(currentRole ===
                      'producer' ||
                      currentRole ===
                        'aggregator' ||
                      currentRole ===
                        'agent') && (
                      <Link
                        to={
                          profilePath
                        }
                        onClick={
                          closeMenus
                        }
                        role="menuitem"
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <User size={18} />

                        My Profile
                      </Link>
                    )}

                    {/* Admin settings */}
                    {currentRole ===
                      'admin' && (
                      <Link
                        to="/admin/settings"
                        onClick={
                          closeMenus
                        }
                        role="menuitem"
                        className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <User size={18} />

                        Settings
                      </Link>
                    )}

                    {/* Sign out */}
                    <div className="mt-1 border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={
                          handleLogout
                        }
                        role="menuitem"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <LogOut
                          size={18}
                        />

                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 hover:text-emerald-700"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() =>
              setIsMenuOpen(
                (previous) =>
                  !previous
              )
            }
            className="rounded-xl p-3 text-slate-700 transition hover:bg-slate-100 md:hidden"
            aria-label={
              isMenuOpen
                ? 'Close menu'
                : 'Open menu'
            }
            aria-expanded={
              isMenuOpen
            }
          >
            {isMenuOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="border-t border-slate-100 py-4 md:hidden">

            <nav className="space-y-1">
              <NavLink
                to="/"
                onClick={closeMenus}
                className={
                  mobileNavLinkClass
                }
              >
                Home
              </NavLink>

              <NavLink
                to="/catalog"
                onClick={closeMenus}
                className={
                  mobileNavLinkClass
                }
              >
                Marketplace
              </NavLink>

              <NavLink
                to="/pre-harvest"
                onClick={closeMenus}
                className={
                  mobileNavLinkClass
                }
              >
                Pre-Harvest
              </NavLink>

              <NavLink
                to="/post-harvest"
                onClick={closeMenus}
                className={
                  mobileNavLinkClass
                }
              >
                Post-Harvest
              </NavLink>

              <NavLink
                to="/about"
                onClick={closeMenus}
                className={
                  mobileNavLinkClass
                }
              >
                About
              </NavLink>

              <NavLink
                to="/contact"
                onClick={closeMenus}
                className={
                  mobileNavLinkClass
                }
              >
                Contact
              </NavLink>
            </nav>

            {/* Mobile actions */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">

              <Link
                to="/cart"
                onClick={closeMenus}
                className="relative flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"
              >
                <ShoppingBag
                  size={18}
                />

                Cart

                {cartCount >
                  0 && (
                  <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                    {cartCount >
                    99
                      ? '99+'
                      : cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <Link
                  to={dashboardPath}
                  onClick={closeMenus}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
                >
                  <LayoutDashboard
                    size={18}
                  />

                  Dashboard
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMenus}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white"
                >
                  <User size={18} />

                  Login
                </Link>
              )}
            </div>

            {/* Authenticated mobile actions */}
            {user && (
              <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">

                <div className="mb-2 rounded-xl bg-slate-50 px-4 py-3">
                  <p className="truncate text-sm font-black text-slate-900">
                    {displayName}
                  </p>

                  <p className="mt-1 truncate text-xs capitalize text-slate-500">
                    {currentRole ||
                      'User'}
                  </p>
                </div>

                {currentRole ===
                  'buyer' && (
                  <>
                    <Link
                      to="/buyer/orders"
                      onClick={
                        closeMenus
                      }
                      className={
                        mobileNavLinkClass
                      }
                    >
                      <span className="flex items-center gap-3">
                        <ClipboardList
                          size={18}
                        />
                        My Orders
                      </span>
                    </Link>

                    <Link
                      to="/cart"
                      onClick={
                        closeMenus
                      }
                      className={
                        mobileNavLinkClass
                      }
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-3">
                          <ShoppingBag
                            size={18}
                          />
                          View Cart
                        </span>

                        {cartCount >
                          0 && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                            {cartCount >
                            99
                              ? '99+'
                              : cartCount}
                          </span>
                        )}
                      </span>
                    </Link>
                  </>
                )}

                {(currentRole ===
                  'producer' ||
                  currentRole ===
                    'aggregator' ||
                  currentRole ===
                    'agent') && (
                  <Link
                    to={
                      profilePath
                    }
                    onClick={
                      closeMenus
                    }
                    className={
                      mobileNavLinkClass
                    }
                  >
                    <span className="flex items-center gap-3">
                      <User size={18} />
                      My Profile
                    </span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={
                    handleLogout
                  }
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
                >
                  <LogOut
                    size={18}
                  />

                  Sign Out
                </button>
              </div>
            )}

            {/* Guest registration */}
            {!user && (
              <Link
                to="/register"
                onClick={closeMenus}
                className="mt-3 flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20"
              >
                Create Account
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
