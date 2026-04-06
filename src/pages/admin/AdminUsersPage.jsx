import { Search, ShieldCheck, Trash2 } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import { toast } from "react-toastify";
import PasswordConfirmModal from "../../components/admin/PasswordConfirmModal";
import StatusBadge from "../../components/admin/StatusBadge";
import { getApiErrorMessage } from "../../services/apiClient";
import {
  deleteAdminUserApi,
  getAdminUsersApi,
  updateAdminUserRoleApi,
} from "../../services/adminApi/usersService";

const DataTable = lazy(() => import("../../components/admin/DataTable"));
const ConfirmModal = lazy(() => import("../../components/admin/ConfirmModal"));

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState("");
  const [roleTarget, setRoleTarget] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState("");

  const loadUsers = async (searchTerm = "") => {
    setLoading(true);
    try {
      const data = await getAdminUsersApi(searchTerm ? { q: searchTerm } : {});
      setUsers(data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const onSearch = (event) => {
    event.preventDefault();
    loadUsers(query);
  };

  const openRoleModal = (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    setRoleTarget({ id: user._id, name: user.name, email: user.email, currentRole: user.role, nextRole });
    setAdminPassword("");
    setRoleError("");
  };

  const confirmRoleChange = async () => {
    if (!roleTarget) return;
    if (!adminPassword.trim()) {
      setRoleError("Password is required");
      return;
    }

    setRoleLoading(true);
    try {
      const updated = await updateAdminUserRoleApi(roleTarget.id, roleTarget.nextRole, adminPassword);
      setUsers((prev) => prev.map((user) => (user._id === roleTarget.id ? updated : user)));
      toast.success("Role updated successfully");
      setRoleTarget(null);
      setAdminPassword("");
      setRoleError("");
    } catch (error) {
      const message = getApiErrorMessage(error);
      setRoleError(message);
      toast.error(message);
    } finally {
      setRoleLoading(false);
    }
  };

  const deleteUser = async () => {
    try {
      await deleteAdminUserApi(deleteUserId);
      setUsers((prev) => prev.filter((user) => user._id !== deleteUserId));
      toast.success("User deleted");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeleteUserId("");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
        <label className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2">
          <Search size={15} className="text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users"
            className="ml-2 bg-transparent text-sm outline-none"
          />
        </label>
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Search</button>
      </form>

      {loading ? (
        <div className="rounded-xl bg-white p-10 text-center text-muted">Loading users...</div>
      ) : (
        <Suspense fallback={<div className="rounded-xl bg-white p-10 text-center text-muted">Loading table...</div>}>
          <DataTable
            rows={users}
            columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => (
                <div>
                  <p className="font-semibold text-ink">{row.name}</p>
                  <p className="text-xs text-muted">{row.email}</p>
                </div>
              ),
            },
            { key: "email", label: "Email" },
            {
              key: "role",
              label: "Role",
              render: (row) => <StatusBadge value={row.role} />,
            },
            {
              key: "createdAt",
              label: "Created",
              render: (row) => new Date(row.createdAt).toLocaleDateString(),
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openRoleModal(row)}
                    className="inline-flex items-center gap-1 rounded-md border border-brand px-2 py-1 text-xs font-semibold text-brand"
                  >
                    <ShieldCheck size={13} />
                    Set {row.role === "admin" ? "User" : "Admin"}
                  </button>
                  <button
                    onClick={() => setDeleteUserId(row._id)}
                    className="rounded-md border border-red-200 p-1.5 text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ),
            },
            ]}
            emptyText="No users found"
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <PasswordConfirmModal
          open={Boolean(roleTarget)}
          title="Confirm Role Change"
          description="For security, please enter your admin password to confirm this role update."
          password={adminPassword}
          error={roleError}
          loading={roleLoading}
          confirmText="Confirm"
          onPasswordChange={setAdminPassword}
          onConfirm={confirmRoleChange}
          onClose={() => {
            if (roleLoading) return;
            setRoleTarget(null);
            setAdminPassword("");
            setRoleError("");
          }}
        />
        <ConfirmModal
          open={Boolean(deleteUserId)}
          title="Delete user"
          description="This action is permanent. Continue?"
          onConfirm={deleteUser}
          onClose={() => setDeleteUserId("")}
          confirmText="Delete"
        />
      </Suspense>
    </div>
  );
}

export default AdminUsersPage;
