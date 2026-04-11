import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import AccountSidebar from "../account/components/AccountSidebar";
import AddressCard from "../account/components/AddressCard";
import CartList from "../account/components/CartList";
import EmptyState from "../account/components/EmptyState";
import Loader from "../account/components/Loader";
import OrdersTable from "../account/components/OrdersTable";
import SettingsForm from "../account/components/SettingsForm";
import SummaryCard from "../account/components/SummaryCard";
import UserAccountLayout from "../account/components/UserAccountLayout";
import WishlistList from "../account/components/WishlistList";
import {
  getUserPhone,
  saveUserPhone,
} from "../account/utils/userAccountStorage";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { getApiErrorMessage } from "../services/apiClient";
import {
  deleteCheckoutAddressApi,
  getCheckoutProfileApi,
  getUserOrdersApi,
  saveCheckoutAddressApi,
} from "../services/orderService";

const tabKeys = ["dashboard", "orders", "addresses", "settings", "wishlist", "cart"];

const emptyAddress = {
  id: "",
  fullName: "",
  email: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Sri Lanka",
  phone: "",
  isDefault: false,
};

function AccountPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, logout, updateProfile, changePassword } = useAuth();
  const {
    wishlistItems,
    cartDetailedItems,
    toggleWishlist,
    moveWishlistToCart,
    updateCartItem,
    removeFromCart,
  } = useStore();

  const requestedTab = params.get("tab") || "dashboard";
  const activeTab = tabKeys.includes(requestedTab) ? requestedTab : "dashboard";

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [editingAddressId, setEditingAddressId] = useState("");
  const [phone, setPhone] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user?._id) return;

    const loadOrders = async () => {
      setLoadingOrders(true);
      try {
        const data = await getUserOrdersApi();
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setLoadingOrders(false);
      }
    };

    const loadCheckoutProfile = async () => {
      try {
        const profile = await getCheckoutProfileApi();
        const saved = Array.isArray(profile?.savedAddresses) ? profile.savedAddresses : [];
        setAddresses(saved);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      }
    };

    loadOrders();
    loadCheckoutProfile();
    setPhone(getUserPhone(user._id));
  }, [user?._id]);

  const summary = useMemo(
    () => ({
      totalOrders: orders.length,
      wishlistItems: wishlistItems.length,
      savedAddresses: addresses.length,
    }),
    [orders.length, wishlistItems.length, addresses.length]
  );

  const updateTab = (tab) => {
    setParams({ tab });
  };

  const performLogout = async () => {
    await logout();
    navigate("/auth", { replace: true });
  };

  const viewOrderDetails = (order) => {
    const id = order?._id || order?.id;
    if (!id) return;
    navigate(`/order-confirmation/${id}`);
  };

  const startAddAddress = () => {
    setEditingAddressId("");
    setAddressForm({
      ...emptyAddress,
      fullName: user?.name || "",
      email: user?.email || "",
      phone: phone || "",
    });
  };

  const startEditAddress = (address) => {
    setEditingAddressId(address.id);
    setAddressForm({ ...address });
  };

  const cancelAddressForm = () => {
    setEditingAddressId("");
    setAddressForm(emptyAddress);
  };

  const submitAddress = async (event) => {
    event.preventDefault();

    if (!addressForm.fullName || !addressForm.email || !addressForm.phone || !addressForm.line1 || !addressForm.city || !addressForm.state || !addressForm.country || !addressForm.postalCode) {
      toast.error("Please fill all required address fields");
      return;
    }

    setSavingAddress(true);
    try {
      const isFirstAddress = addresses.length === 0 && !editingAddressId;
      const response = await saveCheckoutAddressApi({
        id: editingAddressId || undefined,
        fullName: addressForm.fullName,
        email: addressForm.email,
        phone: addressForm.phone,
        line1: addressForm.line1,
        line2: addressForm.line2 || "",
        city: addressForm.city,
        state: addressForm.state,
        postalCode: addressForm.postalCode,
        country: addressForm.country,
        isDefault: Boolean(addressForm.isDefault || isFirstAddress),
      });

      const next = Array.isArray(response?.savedAddresses) ? response.savedAddresses : [];
      setAddresses(next);
      cancelAddressForm();
      toast.success(editingAddressId ? "Address updated" : "Address added");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingAddress(false);
    }
  };

  const deleteAddress = async (id) => {
    setSavingAddress(true);
    try {
      const response = await deleteCheckoutAddressApi(id);
      const next = Array.isArray(response?.savedAddresses) ? response.savedAddresses : [];
      setAddresses(next);
      toast.info("Address removed");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingAddress(false);
    }
  };

  const setDefaultAddress = async (id) => {
    const selected = addresses.find((item) => item.id === id);
    if (!selected) return;

    setSavingAddress(true);
    try {
      const response = await saveCheckoutAddressApi({
        id: selected.id,
        fullName: selected.fullName,
        email: selected.email,
        phone: selected.phone,
        line1: selected.line1,
        line2: selected.line2 || "",
        city: selected.city,
        state: selected.state || "",
        postalCode: selected.postalCode,
        country: selected.country,
        isDefault: true,
      });
      const next = Array.isArray(response?.savedAddresses) ? response.savedAddresses : [];
      setAddresses(next);
      toast.success("Default address updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSavingAddress(false);
    }
  };

  const saveProfileDetails = async (profileValues) => {
    setSavingProfile(true);
    try {
      await updateProfile({ name: profileValues.name, email: profileValues.email });
      setPhone(profileValues.phone || "");
      if (user?._id) {
        saveUserPhone(user._id, profileValues.phone || "");
      }
      toast.success("Account settings updated");
    } catch {
      // toast handled in AuthContext
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (passwordValues) => {
    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordValues.currentPassword,
        newPassword: passwordValues.newPassword,
      });
    } catch {
      // toast handled in AuthContext
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return <Loader label="Loading your account..." />;
  }

  const renderDashboard = () => (
    <div className="space-y-5">
      <section className="rounded-xl bg-slate-50 p-4">
        <h2 className="text-xl font-bold text-ink">Welcome back, {user.name}</h2>
        <p className="mt-1 text-sm text-muted">Manage your orders, addresses, wishlist, and account settings from one place.</p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard title="Total Orders" value={summary.totalOrders} hint="All time" />
        <SummaryCard title="Wishlist Items" value={summary.wishlistItems} hint="Saved products" />
        <SummaryCard title="Saved Addresses" value={summary.savedAddresses} hint="Shipping locations" />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-ink">Recent Orders</h3>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
          >
            View All Orders
          </button>
        </div>
        <OrdersTable orders={orders.slice(0, 5)} loading={loadingOrders} onViewDetails={viewOrderDetails} />
      </section>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">My Orders</h2>
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-ink hover:border-brand hover:text-brand"
        >
          Go to Orders Page
        </button>
      </div>
      <OrdersTable orders={orders} loading={loadingOrders} onViewDetails={viewOrderDetails} />
    </div>
  );

  const renderAddresses = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">My Addresses</h2>
        <button type="button" onClick={startAddAddress} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Add New Address</button>
      </div>

      {(editingAddressId || addressForm.fullName || addressForm.line1) ? (
        <form onSubmit={submitAddress} className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={addressForm.fullName} onChange={(event) => setAddressForm((prev) => ({ ...prev, fullName: event.target.value }))} placeholder="Full name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input type="email" value={addressForm.email} onChange={(event) => setAddressForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={addressForm.phone} onChange={(event) => setAddressForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone number" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={addressForm.line1} onChange={(event) => setAddressForm((prev) => ({ ...prev, line1: event.target.value }))} placeholder="Address line 1" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" required />
            <input value={addressForm.line2} onChange={(event) => setAddressForm((prev) => ({ ...prev, line2: event.target.value }))} placeholder="Address line 2" className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
            <input value={addressForm.city} onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="City" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={addressForm.state} onChange={(event) => setAddressForm((prev) => ({ ...prev, state: event.target.value }))} placeholder="District / State" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={addressForm.postalCode} onChange={(event) => setAddressForm((prev) => ({ ...prev, postalCode: event.target.value }))} placeholder="Postal code" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input value={addressForm.country} onChange={(event) => setAddressForm((prev) => ({ ...prev, country: event.target.value }))} placeholder="Country" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={Boolean(addressForm.isDefault)} onChange={(event) => setAddressForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
            Set as default
          </label>

          <div className="flex gap-2">
            <button type="submit" disabled={savingAddress} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {savingAddress ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
            </button>
            <button type="button" onClick={cancelAddressForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink">Cancel</button>
          </div>
        </form>
      ) : null}

      {!addresses.length ? (
        <EmptyState title="No saved addresses" message="Add your shipping address to speed up checkout." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => startEditAddress(address)}
              onDelete={() => deleteAddress(address.id)}
              onSetDefault={() => setDefaultAddress(address.id)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Account Settings</h2>
      <SettingsForm
        user={user}
        phone={phone}
        onSaveProfile={saveProfileDetails}
        onChangePassword={savePassword}
        savingProfile={savingProfile}
        savingPassword={savingPassword}
      />
    </div>
  );

  const renderWishlist = () => (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Wishlist</h2>
      <WishlistList
        items={wishlistItems}
        onRemove={(item) => toggleWishlist(item._id || item.id)}
        onMoveToCart={(item) => moveWishlistToCart(item._id || item.id)}
      />
    </div>
  );

  const renderCart = () => (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">Cart</h2>
      <CartList
        items={cartDetailedItems}
        onQuantityChange={(item, qty) => updateCartItem(item.productId, Math.max(1, qty))}
        onRemove={(item) => removeFromCart(item.productId)}
        onCheckout={() => navigate("/checkout")}
      />
    </div>
  );

  const contentByTab = {
    dashboard: renderDashboard(),
    orders: renderOrders(),
    addresses: renderAddresses(),
    settings: renderSettings(),
    wishlist: renderWishlist(),
    cart: renderCart(),
  };

  return (
    <UserAccountLayout
      sidebar={
        <AccountSidebar
          activeTab={activeTab}
          onTabChange={updateTab}
          onNavigate={(path) => navigate(path)}
          user={user}
          onLogout={performLogout}
        />
      }
    >
      {contentByTab[activeTab]}
    </UserAccountLayout>
  );
}

export default AccountPage;
