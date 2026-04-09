import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PrivateRoute from "../components/auth/PrivateRoute";
import PageFallbackLoader from "../components/common/PageFallbackLoader";
import MainLayout from "../components/layout/MainLayout";

const HomePage = lazy(() => import("../pages/HomePage"));
const ShopPage = lazy(() => import("../pages/ShopPage"));
const SearchResultsPage = lazy(() => import("../pages/SearchResultsPage"));
const ProductDetailsPage = lazy(() => import("../pages/ProductDetailsPage"));
const CartPage = lazy(() => import("../pages/CartPage"));
const WishlistPage = lazy(() => import("../pages/WishlistPage"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage"));
const OrdersPage = lazy(() => import("../pages/OrdersPage"));
const OrderConfirmationPage = lazy(() => import("../pages/OrderConfirmationPage"));
const AboutPage = lazy(() => import("../pages/AboutPage"));
const ContactPage = lazy(() => import("../pages/ContactPage"));
const CustomProjectPage = lazy(() => import("../pages/CustomProjectPage"));
const MyCustomRequestsPage = lazy(() => import("../pages/MyCustomRequestsPage"));
const AuthPage = lazy(() => import("../pages/AuthPage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage"));
const CheckEmailPage = lazy(() => import("../pages/CheckEmailPage"));
const VerifyEmailPage = lazy(() => import("../pages/VerifyEmailPage"));
const AccountPage = lazy(() => import("../pages/AccountPage"));
const MyInquiriesPage = lazy(() => import("../pages/MyInquiriesPage"));
const ShippingPolicyPage = lazy(() => import("../pages/ShippingPolicyPage"));
const ReturnsRefundsPage = lazy(() => import("../pages/ReturnsRefundsPage"));
const OrderTrackingPage = lazy(() => import("../pages/OrderTrackingPage"));
const FAQPage = lazy(() => import("../pages/FAQPage"));

const withSuspense = (node, label) => (
  <Suspense fallback={<PageFallbackLoader label={label} />}>{node}</Suspense>
);

function UserApp() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={withSuspense(<HomePage />, "Loading home...")} />
        <Route path="shop" element={withSuspense(<ShopPage />, "Loading shop...")} />
        <Route path="search" element={withSuspense(<SearchResultsPage />, "Searching products...")} />
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
          path="my-inquiries"
          element={
            <PrivateRoute>
              {withSuspense(<MyInquiriesPage />, "Loading inquiries...")}
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
        <Route path="shipping-policy" element={withSuspense(<ShippingPolicyPage />, "Loading shipping policy...")} />
        <Route path="returns-refunds" element={withSuspense(<ReturnsRefundsPage />, "Loading returns & refunds...")} />
        <Route path="order-tracking" element={withSuspense(<OrderTrackingPage />, "Loading order tracking...")} />
        <Route path="faq" element={withSuspense(<FAQPage />, "Loading FAQ...")} />
        <Route path="custom-project" element={withSuspense(<CustomProjectPage />, "Loading custom project...")} />
        <Route
          path="my-requests"
          element={
            <PrivateRoute>
              {withSuspense(<MyCustomRequestsPage />, "Loading my requests...")}
            </PrivateRoute>
          }
        />
        <Route path="auth" element={withSuspense(<AuthPage />, "Loading account...")} />
        <Route path="auth/forgot-password" element={withSuspense(<ForgotPasswordPage />, "Loading password reset...")} />
        <Route path="reset-password" element={withSuspense(<ResetPasswordPage />, "Loading reset password...")} />
        <Route path="auth/check-email" element={withSuspense(<CheckEmailPage />, "Loading verification details...")} />
        <Route path="auth/verify-email" element={withSuspense(<VerifyEmailPage />, "Verifying email...")} />
        <Route path="verify-email" element={withSuspense(<VerifyEmailPage />, "Verifying email...")} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default UserApp;
