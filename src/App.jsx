
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Public pages
import { Home } from './pages/Home';
import { Login } from './components/Login';
import { Register } from './components/Register';
import Catalog from './pages/Catalog';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import PreHarvest from './pages/PreHarvest';
import PostHarvest from './pages/PostHarvest';
import ProductDetails from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import Checkout from './pages/Checkout';

// Buyer layout and pages
import BuyerLayout from './components/layouts/BuyerLayout';
import BuyerDashboard from './pages/buyer/BuyerDashboard';
import BuyerOrders from './pages/BuyerOrders';
import BuyerBulkRequest from './pages/buyer/BuyerBulkRequest';
import BuyerBulkRequests from './pages/buyer/BuyerBulkRequests';
import BuyerBookings from './pages/buyer/BuyerBookings';

// Public components
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Producer layout and pages
import { ProducerLayout } from './components/layouts/ProducerLayout';
import { ProducerDashboard } from './pages/producer/ProducerDashboard';
import { ProducerListings } from './pages/producer/ProducerListings';
import { ProducerOrders } from './pages/producer/ProducerOrders';
import { ProducerLogistics } from './pages/producer/ProducerLogistics';
import { ProducerAnalytics } from './pages/producer/ProducerAnalytics';
import { ProducerEarnings } from './pages/producer/ProducerEarnings';
import { ProducerMessages } from './pages/producer/ProducerMessages';
import { ProducerCertificates } from './pages/producer/ProducerCertificates';
import { ProducerVerification } from './pages/producer/ProducerVerification';
import { ProducerProfile } from './pages/producer/ProducerProfile';
import ProducerAggregatorRequests from './pages/producer/ProducerAggregatorRequests';
import ProducerBookings from './pages/producer/ProducerBookings';

// Aggregator layout and pages
import { AggregatorLayout } from './components/layouts/AggregatorLayout';
import AggregatorDashboard from './pages/aggregator/AggregatorDashboard';
import AggregatorFarmers from './pages/aggregator/AggregatorFarmers';
import AggregatorListings from './pages/aggregator/AggregatorListings';
import AggregatorOrders from './pages/aggregator/AggregatorOrders';
import AggregatorProfile from './pages/aggregator/AggregatorProfile';
import AggregatorBulkRequests from './pages/aggregator/AggregatorBulkRequests';
import AggregatorBookings from './pages/aggregator/AggregatorBookings';
import AggregatorFarmerRecords from './pages/aggregator/AggregatorFarmerRecords';

// Admin layout and pages
import { AdminLayout } from './components/layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducerApprovals } from './pages/admin/AdminProducerApprovals';
import AdminRoleRequests from './pages/admin/AdminRoleRequests';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import { AdminAudits } from './pages/admin/AdminAudits';
import { AdminLogisticsHub } from './pages/admin/AdminLogisticsHub';
import { AdminMarketPricing } from './pages/admin/AdminMarketPricing';
import { AdminDisputes } from './pages/admin/AdminDisputes';
import { AdminSettings } from './pages/admin/AdminSettings';

// Public layout
const PublicLayout = ({ children }) => (
  <div className="flex min-h-screen flex-col justify-between bg-slate-50 font-sans">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '12px',
            },
          }}
        />

        <ScrollToTop />

        <Routes>
          {/* ==================== PUBLIC ROUTES ==================== */}

          <Route
            path="/"
            element={
              <PublicLayout>
                <Home />
              </PublicLayout>
            }
          />

          <Route
            path="/catalog"
            element={
              <PublicLayout>
                <Catalog />
              </PublicLayout>
            }
          />

          <Route
            path="/about"
            element={
              <PublicLayout>
                <About />
              </PublicLayout>
            }
          />

          <Route
            path="/contact"
            element={
              <PublicLayout>
                <Contact />
              </PublicLayout>
            }
          />

          <Route
            path="/pre-harvest"
            element={
              <PublicLayout>
                <PreHarvest />
              </PublicLayout>
            }
          />

          <Route
            path="/post-harvest"
            element={
              <PublicLayout>
                <PostHarvest />
              </PublicLayout>
            }
          />

          {/* ==================== PRODUCT & SHOPPING ==================== */}

          <Route
            path="/product/:productId"
            element={
              <PublicLayout>
                <ProductDetails />
              </PublicLayout>
            }
          />

          <Route
            path="/cart"
            element={
              <PublicLayout>
                <Cart />
              </PublicLayout>
            }
          />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <PublicLayout>
                  <Checkout />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* ==================== AUTHENTICATION ==================== */}

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ==================== BUYER PORTAL ==================== */}

          <Route
            path="/buyer"
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <BuyerLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="/buyer/dashboard" replace />}
            />

            <Route path="dashboard" element={<BuyerDashboard />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="pre-harvest" element={<PreHarvest />} />
            <Route path="bookings" element={<BuyerBookings />} />
            <Route path="post-harvest" element={<PostHarvest />} />
            <Route path="cart" element={<Cart />} />
            <Route path="orders" element={<BuyerOrders />} />
            <Route path="bulk-request" element={<BuyerBulkRequest />} />
            <Route path="bulk-requests" element={<BuyerBulkRequests />} />
          </Route>

          {/* ==================== PRODUCER PORTAL ==================== */}

          <Route
            path="/producer"
            element={
              <ProtectedRoute allowedRoles={['producer']}>
                <ProducerLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="/producer/dashboard" replace />}
            />

            <Route path="dashboard" element={<ProducerDashboard />} />
            <Route path="listings" element={<ProducerListings />} />
            <Route path="orders" element={<ProducerOrders />} />

            <Route
              path="bookings"
              element={
                <ProtectedRoute
                  allowedRoles={['producer']}
                  requireApproved
                >
                  <ProducerBookings />
                </ProtectedRoute>
              }
            />

            <Route
              path="aggregator-requests"
              element={
                <ProtectedRoute
                  allowedRoles={['producer']}
                  requireApproved
                >
                  <ProducerAggregatorRequests />
                </ProtectedRoute>
              }
            />

            <Route path="logistics" element={<ProducerLogistics />} />
            <Route path="analytics" element={<ProducerAnalytics />} />
            <Route path="earnings" element={<ProducerEarnings />} />
            <Route path="messages" element={<ProducerMessages />} />
            <Route path="certificates" element={<ProducerCertificates />} />
            <Route path="verification" element={<ProducerVerification />} />
            <Route path="profile" element={<ProducerProfile />} />
          </Route>

          {/* ==================== AGGREGATOR PORTAL ==================== */}

          <Route
            path="/aggregator"
            element={
              <ProtectedRoute allowedRoles={['aggregator']}>
                <AggregatorLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="/aggregator/dashboard" replace />}
            />

            {/* Available while verification is pending */}
            <Route
              path="dashboard"
              element={<AggregatorDashboard />}
            />

            <Route
              path="profile"
              element={<AggregatorProfile />}
            />

            {/* Approved aggregators only */}
            <Route
              path="farmers"
              element={
                <ProtectedRoute
                  allowedRoles={['aggregator']}
                  requireApproved
                >
                  <AggregatorFarmers />
                </ProtectedRoute>
              }
            />

            <Route
              path="farmer-records"
              element={
                <ProtectedRoute
                  allowedRoles={['aggregator']}
                  requireApproved
                >
                  <AggregatorFarmerRecords />
                </ProtectedRoute>
              }
            />

            <Route
              path="listings"
              element={
                <ProtectedRoute
                  allowedRoles={['aggregator']}
                  requireApproved
                >
                  <AggregatorListings />
                </ProtectedRoute>
              }
            />

            <Route
              path="orders"
              element={
                <ProtectedRoute
                  allowedRoles={['aggregator']}
                  requireApproved
                >
                  <AggregatorOrders />
                </ProtectedRoute>
              }
            />

            {/* Buyer orders for approved linked farmers */}
          {/*  <Route
              path="requests"
              element={
                <ProtectedRoute
                  allowedRoles={['aggregator']}
                  requireApproved
                >
                  <AggregatorRequests />
                </ProtectedRoute>
              }
            />*/}

            <Route
              path="bulk-requests"
              element={
                <ProtectedRoute
                  allowedRoles={['aggregator']}
                  requireApproved
                >
                  <AggregatorBulkRequests />
                </ProtectedRoute>
              }
            />

            <Route
              path="bookings"
              element={
                <ProtectedRoute
                  allowedRoles={['aggregator']}
                  requireApproved
                >
                  <AggregatorBookings />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* ==================== ADMIN PORTAL ==================== */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="/admin/dashboard" replace />}
            />

            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="role-requests" element={<AdminRoleRequests />} />
            <Route path="approvals" element={<AdminProducerApprovals />} />
            <Route path="users" element={<AdminUserManagement />} />
            <Route path="audits" element={<AdminAudits />} />
            <Route path="logistics" element={<AdminLogisticsHub />} />
            <Route path="pricing" element={<AdminMarketPricing />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* ==================== FALLBACK ==================== */}

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
