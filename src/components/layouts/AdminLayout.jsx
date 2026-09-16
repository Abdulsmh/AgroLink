import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Truck,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout = () => {
  const { logout, userProfile } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navigation = [
    {
      name: 'Admin Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Producer Approvals',
      path: '/admin/approvals',
      icon: UserCheck,
    },
    {
      name: 'User Management',
      path: '/admin/users',
      icon: Users,
    },
    {
      name: 'Logistics Hub',
      path: '/admin/logistics',
      icon: Truck,
    },
    {
      name: 'Market Pricing',
      path: '/admin/pricing',
      icon: TrendingUp,
    },
    {
      name: 'Disputes',
      path: '/admin/disputes',
      icon: AlertTriangle,
    },
    {
      name: 'System Audits',
      path: '/admin/audits',
      icon: ShieldCheck,
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
    },
  ];

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    closeSidebar();
    logout();
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100">

      {/* MOBILE BACKDROP */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ADMIN SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex h-screen w-72 shrink-0 flex-col
          bg-slate-950 text-white
          shadow-2xl
          transition-transform duration-300 ease-in-out
          lg:static
          lg:z-auto
          lg:w-64
          lg:translate-x-0
          lg:shadow-none
          ${
            isSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >

        {/* BRAND */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-800 px-5">

          {/* Clickable AgroLink logo */}
          <NavLink
            to="/"
            onClick={closeSidebar}
            aria-label="Go to AgroLink homepage"
            className="flex items-center gap-3 rounded-xl outline-none transition hover:opacity-90 focus:ring-2 focus:ring-emerald-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>

            <div>
              <h1 className="text-base font-bold text-white">
                AgroLink
              </h1>

              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                Admin Portal
              </p>
            </div>
          </NavLink>

          {/* Close button */}
          <button
            type="button"
            onClick={closeSidebar}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ADMIN PROFILE */}
        <div className="shrink-0 border-b border-slate-800 p-4">
          <div className="rounded-xl bg-slate-900 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Administrator
            </p>

            <p className="mt-2 truncate text-sm font-bold text-white">
              {userProfile?.full_name || 'Admin User'}
            </p>

            <p className="mt-1 truncate text-xs text-slate-400">
              {userProfile?.email || 'Admin account'}
            </p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Administration
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />

                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* LOGOUT */}
        <div className="shrink-0 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5" />

            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN ADMIN AREA */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* MOBILE TOP BAR */}
        <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">

          {/* Clickable mobile AgroLink logo */}
          <NavLink
            to="/"
            onClick={closeSidebar}
            aria-label="Go to AgroLink homepage"
            className="flex items-center gap-2 rounded-lg outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>

            <div>
              <p className="text-sm font-bold leading-none text-slate-900">
                AgroLink
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                Admin Portal
              </p>
            </div>
          </NavLink>

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open navigation"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="main-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* HIDDEN SCROLLBAR STYLES */}
      <style>
        {`
          .sidebar-scrollbar,
          .main-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .sidebar-scrollbar::-webkit-scrollbar,
          .main-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
};