import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PrivateRoute from "./components/auth/PrivateRoute";
import PageFallbackLoader from "./components/common/PageFallbackLoader";
import MainLayout from "./components/layout/MainLayout";
import AdminProtectedRoute from "./admin/routes/AdminProtectedRoute";

// Route-level splitting keeps the initial storefront payload small.
const HomePage = lazy(() => import("./pages/HomePage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const ProductDetailsPage = lazy(() => import("./pages/ProductDetailsPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const WishlistPage = lazy(() => import("./pages/WishlistPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const CustomProjectPage = lazy(() => import("./pages/CustomProjectPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const CheckEmailPage = lazy(() => import("./pages/CheckEmailPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));

// Admin area is split into isolated chunks and loaded only for admin routes.
const AdminLayout = lazy(() => import("./admin/layout/AdminLayout"));
const AdminLoginPage = lazy(() => import("./admin/pages/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("./admin/pages/DashboardPage"));
const AdminProductsPage = lazy(() => import("./admin/pages/ProductsPage"));
const AdminProductFormPage = lazy(() => import("./admin/pages/ProductFormPage"));
const AdminOrdersPage = lazy(() => import("./admin/pages/OrdersPage"));
const AdminProfitPage = lazy(() => import("./admin/pages/ProfitReportPage"));
const AdminCustomersPage = lazy(() => import("./admin/pages/CustomersPage"));
const AdminCategoriesPage = lazy(() => import("./admin/pages/CategoriesPage"));
const AdminReviewsPage = lazy(() => import("./admin/pages/ReviewsPage"));
const AdminMessagesPage = lazy(() => import("./admin/pages/MessagesPage"));
const AdminBannersPage = lazy(() => import("./admin/pages/BannersPage"));
const AdminCouponsPage = lazy(() => import("./admin/pages/CouponsPage"));
const AdminSettingsPage = lazy(() => import("./admin/pages/SettingsPage"));

const withSuspense = (node, label) => (
  <Suspense fallback={<PageFallbackLoader label={label} />}>{node}</Suspense>
);

function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={withSuspense(<AdminLoginPage />, "Loading admin login...")} />
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            {withSuspense(<AdminLayout />, "Loading admin console...")}
          </AdminProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={withSuspense(<AdminDashboardPage />, "Loading dashboard...")} />
        <Route path="products" element={withSuspense(<AdminProductsPage />, "Loading products...")} />
        <Route path="products/add" element={withSuspense(<AdminProductFormPage />, "Loading product form...")} />
        <Route path="products/edit/:id" element={withSuspense(<AdminProductFormPage />, "Loading product form...")} />
        <Route path="orders" element={withSuspense(<AdminOrdersPage />, "Loading orders...")} />
        <Route path="profit" element={withSuspense(<AdminProfitPage />, "Loading profit report...")} />
        <Route path="customers" element={withSuspense(<AdminCustomersPage />, "Loading customers...")} />
        <Route path="categories" element={withSuspense(<AdminCategoriesPage />, "Loading categories...")} />
        <Route path="reviews" element={withSuspense(<AdminReviewsPage />, "Loading reviews...")} />
        <Route path="messages" element={withSuspense(<AdminMessagesPage />, "Loading messages...")} />
        <Route path="banners" element={withSuspense(<AdminBannersPage />, "Loading banners...")} />
        <Route path="coupons" element={withSuspense(<AdminCouponsPage />, "Loading coupons...")} />
        <Route path="settings" element={withSuspense(<AdminSettingsPage />, "Loading settings...")} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      <Route path="/" element={<MainLayout />}>
        <Route index element={withSuspense(<HomePage />, "Loading home...")} />
        <Route path="shop" element={withSuspense(<ShopPage />, "Loading shop...")} />
        <Route path="product/:id" element={withSuspense(<ProductDetailsPage />, "Loading product...")} />
        <Route
          path="cart"
          element={
            <PrivateRoute>
              {withSuspense(<CartPage />, "Loading cart...")}
            </PrivateRoute>
          }
        />
        <Route
          path="wishlist"
          element={
            <PrivateRoute>
              {withSuspense(<WishlistPage />, "Loading wishlist...")}
            </PrivateRoute>
          }
        />
        <Route
          path="checkout"
          element={
            <PrivateRoute>
              {withSuspense(<CheckoutPage />, "Loading checkout...")}
            </PrivateRoute>
          }
        />
        <Route
          path="orders"
          element={
            <PrivateRoute>
              {withSuspense(<OrdersPage />, "Loading orders...")}
            </PrivateRoute>
          }
        />
        <Route
          path="account"
          element={
            <PrivateRoute>
              {withSuspense(<AccountPage />, "Loading account...")}
            </PrivateRoute>
          }
        />
        <Route
          path="order-confirmation/:id"
          element={
            <PrivateRoute>
              {withSuspense(<OrderConfirmationPage />, "Loading confirmation...")}
            </PrivateRoute>
          }
        />
        <Route path="about" element={withSuspense(<AboutPage />, "Loading about...")} />
        <Route path="contact" element={withSuspense(<ContactPage />, "Loading contact...")} />
        <Route path="custom-project" element={withSuspense(<CustomProjectPage />, "Loading custom project...")} />
        <Route path="auth" element={withSuspense(<AuthPage />, "Loading account...")} />
        <Route path="auth/check-email" element={withSuspense(<CheckEmailPage />, "Loading verification details...")} />
        <Route path="auth/verify-email" element={withSuspense(<VerifyEmailPage />, "Verifying email...")} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;