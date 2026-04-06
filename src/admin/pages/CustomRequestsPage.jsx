import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import EmptyState from "../components/EmptyState";
import FilterDropdown from "../components/FilterDropdown";
import Loader from "../components/Loader";
import SearchBar from "../components/SearchBar";
import { getApiErrorMessage } from "../../services/apiClient";
import ConfirmationModal from "../../components/ConfirmationModal";
import {
  getAdminCustomRequestById,
  getAdminCustomRequests,
  deleteAdminCustomRequestApi,
  sendAdminCustomRequestPurchaseLink,
  updateAdminCustomRequest,
} from "../services/customRequestsService";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "quoted", label: "Quoted" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "link_sent", label: "Link Sent" },
  { value: "expired", label: "Expired" },
  { value: "rejected", label: "Rejected" },
];

const statusBadgeClass = {
  pending: "bg-amber-100 text-amber-800",
  reviewed: "bg-blue-100 text-blue-800",
  quoted: "bg-indigo-100 text-indigo-800",
  accepted: "bg-emerald-100 text-emerald-800",
  declined: "bg-rose-100 text-rose-800",
  link_sent: "bg-cyan-100 text-cyan-800",
  expired: "bg-orange-100 text-orange-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

function CustomRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [adminForm, setAdminForm] = useState({
    status: "pending",
    quotationPrice: "",
    adminMessage: "",
    quoteValidUntil: "",
  });
  const [purchaseLinkForm, setPurchaseLinkForm] = useState({
    purchaseLink: "",
    purchaseLinkMessage: "",
  });

  const loadRequests = async () => {
    setLoadingList(true);
    try {
      const data = await getAdminCustomRequests({ status: statusFilter, q: query.trim() || undefined });
      setRequests(Array.isArray(data) ? data : []);
      if (!selectedId && data?.length) {
        setSelectedId(data[0].id);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingList(false);
    }
  };

  const loadRequestDetail = async (id) => {
    if (!id) {
      setSelectedRequest(null);
      return;
    }

    setLoadingDetail(true);
    try {
      const data = await getAdminCustomRequestById(id);
      setSelectedRequest(data);
      setAdminForm({
        status: data?.status || "pending",
        quotationPrice: data?.quotationPrice == null ? "" : String(data.quotationPrice),
        adminMessage: data?.adminMessage || "",
        quoteValidUntil: data?.quoteValidUntil || "",
      });
      setPurchaseLinkForm({
        purchaseLink: data?.purchaseLink || "",
        purchaseLinkMessage: data?.purchaseLinkMessage || "",
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  useEffect(() => {
    loadRequestDetail(selectedId);
  }, [selectedId]);

  const visibleRequests = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((item) => {
      const haystack = [item.name, item.email, item.mobile, item.description].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [requests, query]);

  const handleSave = async () => {
    if (!selectedRequest) return;

    setSaving(true);
    try {
      const payload = {
        status: adminForm.status,
        quotationPrice: adminForm.quotationPrice === "" ? null : Number(adminForm.quotationPrice),
        adminMessage: adminForm.adminMessage,
        quoteValidUntil: adminForm.quoteValidUntil || null,
      };
      const response = await updateAdminCustomRequest(selectedRequest.id, payload);
      const updated = response?.request;

      setSelectedRequest(updated || selectedRequest);
      setRequests((prev) => prev.map((row) => (row.id === selectedRequest.id ? (updated || row) : row)));
      toast.success(response?.message || "Request updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleSendPurchaseLink = async () => {
    if (!selectedRequest) return;

    if (!purchaseLinkForm.purchaseLink.trim()) {
      toast.error("Purchase link is required");
      return;
    }

    setSendingLink(true);
    try {
      const response = await sendAdminCustomRequestPurchaseLink(selectedRequest.id, {
        purchaseLink: purchaseLinkForm.purchaseLink.trim(),
        purchaseLinkMessage: purchaseLinkForm.purchaseLinkMessage.trim(),
      });
      const updated = response?.request;
      setSelectedRequest(updated || selectedRequest);
      setRequests((prev) => prev.map((row) => (row.id === selectedRequest.id ? (updated || row) : row)));
      toast.success(response?.message || "Purchase link sent");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSendingLink(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;
    setConfirmDelete(true);
  };

  const confirmDeleteRequest = async () => {
    setConfirmDelete(false);

    setDeleting(true);
    try {
      await deleteAdminCustomRequestApi(selectedRequest.id);
      setRequests((prev) => prev.filter((r) => r.id !== selectedRequest.id));
      setSelectedRequest(null);
      setSelectedId("");
      toast.success("Request deleted successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  if (loadingList) {
    return <Loader label="Loading custom requests..." />;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <ConfirmationModal
        isOpen={confirmDelete}
        title="Delete Request"
        message={`Are you sure you want to delete the request from ${selectedRequest?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmDeleteRequest}
        onCancel={() => setConfirmDelete(false)}
      />
      <div className="grid min-h-[75vh] lg:grid-cols-[340px_1fr]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-slate-200 px-4 py-3">
            <h1 className="text-lg font-semibold text-ink">Custom Requests</h1>
            <SearchBar value={query} onChange={setQuery} placeholder="Search name, email, details" />
            <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} label="Status" />
            <button
              type="button"
              onClick={loadRequests}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Refresh list
            </button>
          </div>

          {!visibleRequests.length ? (
            <div className="p-4">
              <EmptyState title="No custom requests" description="Try changing the status filter." />
            </div>
          ) : (
            <div className="max-h-[68vh] overflow-y-auto">
              {visibleRequests.map((request) => {
                const active = request.id === selectedId;
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedId(request.id)}
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left transition ${
                      active ? "bg-brand-light" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-semibold text-ink">{request.name}</p>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          statusBadgeClass[request.displayStatus || request.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {request.displayStatus || request.status}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted">{request.email}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-600">{request.description}</p>
                    <p className="mt-1 text-[11px] text-muted">{formatDate(request.createdAt)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className="flex min-h-[75vh] flex-col">
          {loadingDetail ? (
            <div className="p-5 text-sm text-muted">Loading request details...</div>
          ) : !selectedRequest ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
              Select a request to review.
            </div>
          ) : (
            <div className="space-y-4 p-5">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-ink">{selectedRequest.name}</h2>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        statusBadgeClass[selectedRequest.displayStatus || selectedRequest.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {selectedRequest.displayStatus || selectedRequest.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteRequest}
                    disabled={deleting}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete Request"}
                  </button>
                </div>
                <p className="mt-1 text-sm text-muted">{selectedRequest.email} | {selectedRequest.mobile}</p>
                <p className="mt-1 text-xs text-muted">Requested on {formatDate(selectedRequest.createdAt)}</p>
              </div>

              <article className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-ink">Request Description</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{selectedRequest.description}</p>
                <div className="mt-4 grid gap-2 text-sm text-muted md:grid-cols-3">
                  <p>
                    <span className="font-semibold text-ink">Specifications:</span> {selectedRequest.specifications || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Budget:</span>{" "}
                    {selectedRequest.budget == null ? "-" : `Rs. ${Number(selectedRequest.budget).toFixed(2)}`}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Deadline:</span> {selectedRequest.deadline || "-"}
                  </p>
                </div>
              </article>

              <article className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-ink">Quotation & Status</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold text-ink">Status</span>
                    <select
                      value={adminForm.status}
                      onChange={(event) => setAdminForm((prev) => ({ ...prev, status: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                    >
                      {statusOptions
                        .filter((option) => option.value !== "all" && option.value !== "expired")
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold text-ink">Quotation Price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={adminForm.quotationPrice}
                      onChange={(event) => setAdminForm((prev) => ({ ...prev, quotationPrice: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                      placeholder="Enter quotation amount"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block font-semibold text-ink">Quote Valid Until</span>
                    <input
                      type="date"
                      value={adminForm.quoteValidUntil}
                      onChange={(event) => setAdminForm((prev) => ({ ...prev, quoteValidUntil: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                    />
                  </label>
                </div>

                <label className="mt-3 block text-sm">
                  <span className="mb-1 block font-semibold text-ink">Admin Response Message</span>
                  <textarea
                    rows={4}
                    value={adminForm.adminMessage}
                    onChange={(event) => setAdminForm((prev) => ({ ...prev, adminMessage: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                    placeholder="Provide quote explanation or next steps"
                  />
                </label>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Response"}
                  </button>
                  <p className="text-xs text-muted">Updated at {formatDate(selectedRequest.updatedAt)}</p>
                </div>
              </article>

              <article className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-ink">Customer Decision</h3>
                <div className="mt-2 grid gap-2 text-sm text-muted md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-ink">Response:</span> {selectedRequest.customerResponse || "Pending"}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Accepted At:</span> {formatDate(selectedRequest.acceptedAt)}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Declined At:</span> {formatDate(selectedRequest.declinedAt)}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Purchase Deadline:</span> {formatDate(selectedRequest.purchaseDeadline)}
                  </p>
                </div>
              </article>

              <article className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-ink">Send Product Purchase Link</h3>
                <p className="mt-1 text-xs text-muted">
                  Send this after customer acceptance. They can purchase within the 10-day window.
                </p>
                {selectedRequest.customerResponse !== "accepted" ? (
                  <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                    Waiting for customer to accept the quotation before sending the link.
                  </p>
                ) : (
                  <>
                    <div className="mt-3 grid gap-3">
                      <label className="text-sm">
                        <span className="mb-1 block font-semibold text-ink">Product URL</span>
                        <input
                          type="url"
                          value={purchaseLinkForm.purchaseLink}
                          onChange={(event) =>
                            setPurchaseLinkForm((prev) => ({ ...prev, purchaseLink: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                          placeholder="https://..."
                        />
                      </label>
                      <label className="text-sm">
                        <span className="mb-1 block font-semibold text-ink">Message (optional)</span>
                        <textarea
                          rows={3}
                          value={purchaseLinkForm.purchaseLinkMessage}
                          onChange={(event) =>
                            setPurchaseLinkForm((prev) => ({ ...prev, purchaseLinkMessage: event.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand"
                          placeholder="Your custom product is ready. Use this link to purchase within 10 days."
                        />
                      </label>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSendPurchaseLink}
                        disabled={sendingLink}
                        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {sendingLink ? "Sending..." : "Send Product Link"}
                      </button>
                      <p className="text-xs text-muted">Last sent: {formatDate(selectedRequest.purchaseLinkSentAt)}</p>
                    </div>
                  </>
                )}
              </article>

              <article className="rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-ink">Quote History</h3>
                {!selectedRequest.quoteHistory?.length ? (
                  <p className="mt-2 text-sm text-muted">No quote revisions yet.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {selectedRequest.quoteHistory.map((entry) => (
                      <div key={entry.id} className="rounded-lg bg-slate-50 p-3 text-sm text-ink">
                        <p className="text-xs text-muted">Updated {formatDate(entry.createdAt)}</p>
                        <p className="mt-1">
                          <span className="font-semibold">Previous Price:</span>{" "}
                          {entry.previousQuotationPrice == null ? "-" : `Rs. ${Number(entry.previousQuotationPrice).toFixed(2)}`}
                        </p>
                        <p>
                          <span className="font-semibold">Previous Valid Until:</span> {entry.previousQuoteValidUntil || "-"}
                        </p>
                        <p>
                          <span className="font-semibold">Previous Message:</span> {entry.previousAdminMessage || "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default CustomRequestsPage;
