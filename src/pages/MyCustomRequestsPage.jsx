import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import ConfirmationModal from "../components/ConfirmationModal";
import { getApiErrorMessage } from "../services/apiClient";
import {
  acceptCustomProjectQuoteApi,
  declineCustomProjectQuoteApi,
  deleteCustomProjectRequestApi,
  getMyCustomProjectRequestsApi,
} from "../services/customProjectService";

const statusClasses = {
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

function MyCustomRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // 'decline' or 'delete'
    requestId: null,
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getMyCustomProjectRequestsApi();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (requestId) => {
    setActionInProgress(requestId);
    try {
      const response = await acceptCustomProjectQuoteApi(requestId);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? response.request : r))
      );
      toast.success(response.message || "Quote accepted successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeclineQuote = async (requestId) => {
    setConfirmModal({
      isOpen: true,
      type: "decline",
      requestId,
    });
  };

  const confirmDecline = async () => {
    const requestId = confirmModal.requestId;
    setConfirmModal({ isOpen: false, type: null, requestId: null });

    setActionInProgress(requestId);
    try {
      const response = await declineCustomProjectQuoteApi(requestId);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? response.request : r))
      );
      toast.success(response.message || "Quote declined successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      requestId,
    });
  };

  const confirmDelete = async () => {
    const requestId = confirmModal.requestId;
    setConfirmModal({ isOpen: false, type: null, requestId: null });

    setDeletingId(requestId);
    try {
      await deleteCustomProjectRequestApi(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success("Request deleted successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <section className="container-pad py-10">
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === "decline" ? "Decline Quotation" : "Delete Request"}
        message={
          confirmModal.type === "decline"
            ? "Are you sure you want to decline this quotation? This action cannot be undone."
            : "Are you sure you want to delete this request? This action cannot be undone."
        }
        confirmText={confirmModal.type === "decline" ? "Decline" : "Delete"}
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmModal.type === "decline" ? confirmDecline : confirmDelete}
        onCancel={() => setConfirmModal({ isOpen: false, type: null, requestId: null })}
      />
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Customer Portal</p>
            <h1 className="mt-2 font-display text-4xl text-ink">My Custom Requests</h1>
            <p className="mt-2 text-sm text-muted">Track your quote, respond to it, and purchase within the allowed window.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadRequests}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink"
            >
              Refresh
            </button>
            <Link to="/custom-project" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
              New Request
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-muted">Loading requests...</div>
        ) : !requests.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-ink">No requests yet</h2>
            <p className="mt-2 text-sm text-muted">Submit your first custom project request to receive a quotation.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const statusKey = String(request.displayStatus || request.status || "").trim().toLowerCase();

              return (
              <article key={request.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      statusClasses[statusKey] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {statusKey || "pending"}
                  </span>
                  <p className="text-xs text-muted">Requested on {formatDate(request.createdAt)}</p>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">{request.description}</p>

                <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-3">
                  <p>
                    <span className="font-semibold text-ink">Specifications:</span> {request.specifications || "-"}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Budget:</span>{" "}
                    {request.budget == null ? "-" : `Rs. ${Number(request.budget).toFixed(2)}`}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Deadline:</span> {request.deadline || "-"}
                  </p>
                </div>

                {request.images?.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                    {request.images.map((image) => (
                      <a
                        key={image.id}
                        href={image.url}
                        target="_blank"
                        rel="noreferrer"
                        className="overflow-hidden rounded-lg border border-slate-200"
                      >
                        <img src={image.url} alt="Request reference" className="h-28 w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <p>
                        <span className="font-semibold text-ink">Quotation:</span>{" "}
                        {request.quotationPrice == null ? "Pending" : `Rs. ${Number(request.quotationPrice).toFixed(2)}`}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-ink">Quote Valid Until:</span> {request.quoteValidUntil || "-"}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-ink">Admin Response:</span> {request.adminMessage || "No response yet"}
                      </p>
                      <p className="mt-1">
                        <span className="font-semibold text-ink">Customer Response:</span> {request.customerResponse || "Pending"}
                      </p>
                      {request.acceptedAt ? (
                        <p className="mt-1">
                          <span className="font-semibold text-ink">Accepted At:</span> {formatDate(request.acceptedAt)}
                        </p>
                      ) : null}
                      {request.declinedAt ? (
                        <p className="mt-1">
                          <span className="font-semibold text-ink">Declined At:</span> {formatDate(request.declinedAt)}
                        </p>
                      ) : null}
                      {request.purchaseDeadline ? (
                        <p className="mt-1">
                          <span className="font-semibold text-ink">Purchase Deadline:</span> {formatDate(request.purchaseDeadline)}
                        </p>
                      ) : null}
                    </div>

                    {statusKey === "quoted" && !request.isQuoteExpired ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptQuote(request.id)}
                          disabled={actionInProgress === request.id}
                          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {actionInProgress === request.id ? "Accepting..." : "Accept"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineQuote(request.id)}
                          disabled={actionInProgress === request.id}
                          className="rounded-lg bg-slate-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {actionInProgress === request.id ? "Declining..." : "Decline"}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {request.isQuoteExpired ? (
                    <p className="mt-2 rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
                      Quote expired. Please wait for an updated quotation from admin.
                    </p>
                  ) : null}

                  {request.purchaseNotice && !request.isPurchaseWindowExpired ? (
                    <p className="mt-2 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                      You have accepted the quotation. The admin will send you the product link shortly.
                    </p>
                  ) : null}

                  {request.isPurchaseWindowExpired ? (
                    <p className="mt-2 rounded-md bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
                      Your 10-day purchase window has expired.
                    </p>
                  ) : null}

                  {["accepted", "link_sent"].includes(statusKey) ? (
                    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
                      {request.purchaseLink ? (
                        <>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Purchase Link</p>
                          <a
                            href={request.purchaseLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
                          >
                            Buy Product
                          </a>
                          <p className="mt-1 text-xs text-muted">Sent at {formatDate(request.purchaseLinkSentAt)}</p>
                          <p className="mt-1 text-sm text-ink">{request.purchaseLinkMessage || "Use this link to complete your purchase."}</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted">Waiting for admin to send purchase link.</p>
                      )}
                    </div>
                  ) : null}
                </div>

                {statusKey !== "quoted" && (request.customerResponse || "") !== "accepted" && (statusKey !== "link_sent" && statusKey !== "expired") ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(request.id)}
                      disabled={deletingId === request.id}
                      className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {deletingId === request.id ? "Deleting..." : "Delete Request"}
                    </button>
                  </div>
                ) : null}

                {request.quoteHistory?.length ? (
                  <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-ink">Quote History</p>
                    <div className="mt-2 space-y-2">
                      {request.quoteHistory.map((entry) => (
                        <div key={entry.id} className="rounded-md bg-slate-50 p-2 text-muted">
                          <p className="text-xs">Updated {formatDate(entry.createdAt)}</p>
                          <p>
                            Previous price: {entry.previousQuotationPrice == null ? "-" : `Rs. ${Number(entry.previousQuotationPrice).toFixed(2)}`}
                          </p>
                          <p>Previous valid until: {entry.previousQuoteValidUntil || "-"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {request.notifications?.length ? (
                  <div className="mt-4 rounded-lg border border-brand/20 bg-brand-light p-3 text-sm">
                    <p className="font-semibold text-ink">Notifications</p>
                    <div className="mt-2 space-y-2">
                      {request.notifications.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="rounded-md bg-white p-2">
                          <p className="font-semibold text-ink">{entry.title}</p>
                          <p className="text-muted">{entry.message || "Update available"}</p>
                          <p className="text-xs text-muted">{formatDate(entry.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default MyCustomRequestsPage;
