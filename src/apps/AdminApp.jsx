import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PageFallbackLoader from "../components/common/PageFallbackLoader";
import AdminProtectedRoute from "../admin/routes/AdminProtectedRoute";

const AdminLayout = lazy(() => import("../admin/layout/AdminLayout"));
const AdminLoginPage = lazy(() => import("../admin/pages/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("../admin/pages/DashboardPage"));
const AdminProductsPage = lazy(() => import("../admin/pages/ProductsPage"));
const AdminProductFormPage = lazy(() => import("../admin/pages/ProductFormPage"));
const AdminOrdersPage = lazy(() => import("../admin/pages/OrdersPage"));
const AdminProfitPage = lazy(() => import("../admin/pages/ProfitReportPage"));
const AdminCustomersPage = lazy(() => import("../admin/pages/CustomersPage"));
const AdminCategoriesPage = lazy(() => import("../admin/pages/CategoriesPage"));
const AdminReviewsPage = lazy(() => import("../admin/pages/ReviewsPage"));
const AdminMessagesPage = lazy(() => import("../admin/pages/MessagesPage"));
const AdminContactInboxPage = lazy(() => import("../admin/pages/ContactInboxPage"));
const AdminBannersPage = lazy(() => import("../admin/pages/BannersPage"));
const AdminCouponsPage = lazy(() => import("../admin/pages/CouponsPage"));
const AdminCustomRequestsPage = lazy(() => import("../admin/pages/CustomRequestsPage"));
const AdminSettingsPage = lazy(() => import("../admin/pages/SettingsPage"));

const withSuspense = (node, label) => (
  <Suspense fallback={<PageFallbackLoader label={label} />}>{node}</Suspense>
);

function AdminApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
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
        <Route path="contact" element={withSuspense(<AdminContactInboxPage />, "Loading contact inbox...")} />
        <Route path="custom-requests" element={withSuspense(<AdminCustomRequestsPage />, "Loading custom requests...")} />
        <Route path="banners" element={withSuspense(<AdminBannersPage />, "Loading banners...")} />
        <Route path="coupons" element={withSuspense(<AdminCouponsPage />, "Loading coupons...")} />
        <Route path="settings" element={withSuspense(<AdminSettingsPage />, "Loading settings...")} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export default AdminApp;
