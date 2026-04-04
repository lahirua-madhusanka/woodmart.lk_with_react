import { Mail, CheckCircle2, MailCheck, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../services/apiClient";
import { deleteMyInquiry, getMyInquiries } from "../services/customerInquiriesService";

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadgeStyle = (status) => {
  const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold";
  switch (status) {
    case "new":
      return `${baseClasses} bg-blue-100 text-blue-700`;
    case "read":
      return `${baseClasses} bg-yellow-100 text-yellow-700`;
    case "replied":
      return `${baseClasses} bg-green-100 text-green-700`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-700`;
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "new":
      return <Mail size={16} className="mr-1" />;
    case "read":
      return <CheckCircle2 size={16} className="mr-1" />;
    case "replied":
      return <MailCheck size={16} className="mr-1" />;
    default:
      return null;
  }
};

function MyInquiriesPage() {
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  useEffect(() => {
    const loadInquiries = async () => {
      setLoading(true);
      try {
        const data = await getMyInquiries();
        setInquiries(data || []);
        if (data?.length && !selectedInquiry) {
          setSelectedInquiry(data[0]);
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    loadInquiries();
  }, []);

  const handleDeleteInquiry = async () => {
    if (!selectedInquiry?.id || deletingId) {
      return;
    }

    setDeletingId(selectedInquiry.id);
    try {
      await deleteMyInquiry(selectedInquiry.id);

      setInquiries((prev) => {
        const next = prev.filter((item) => item.id !== selectedInquiry.id);
        setSelectedInquiry(next[0] || null);
        return next;
      });

      toast.success("Inquiry deleted successfully");
      setConfirmDeleteOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setDeletingId("");
    }
  };

  useEffect(() => {
    if (!confirmDeleteOpen || deletingId) {
      return;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setConfirmDeleteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmDeleteOpen, deletingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  if (inquiries.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <Mail className="mx-auto mb-4 text-slate-300" size={48} />
            <h2 className="mb-2 text-xl font-semibold text-slate-900">No Inquiries Yet</h2>
            <p className="text-slate-600">
              You haven't submitted any contact inquiries. If you have a question, please contact us using the contact form.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Inquiries</h1>
          <p className="mt-2 text-slate-600">View your contact inquiries and responses from our team</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* List */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
                {inquiries.map((inquiry) => (
                  <button
                    key={inquiry.id}
                    onClick={() => setSelectedInquiry(inquiry)}
                    className={`w-full border-b border-slate-200 px-4 py-4 text-left transition ${
                      selectedInquiry?.id === inquiry.id ? "bg-brand-light" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-medium text-slate-900 line-clamp-2">{inquiry.subject}</h3>
                      <span className={getStatusBadgeStyle(inquiry.status)}>
                        {getStatusIcon(inquiry.status)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(inquiry.createdAt)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selectedInquiry ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                {/* Header */}
                <div className="mb-6 pb-6 border-b border-slate-200">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">{selectedInquiry.subject}</h2>
                    <div className="flex items-center gap-2">
                      <span className={getStatusBadgeStyle(selectedInquiry.status)}>
                        {getStatusIcon(selectedInquiry.status)}
                        {selectedInquiry.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteOpen(true)}
                        disabled={deletingId === selectedInquiry.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === selectedInquiry.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Submitted on {formatDate(selectedInquiry.createdAt)}
                  </p>
                </div>

                {/* Your Message */}
                <div className="mb-6">
                  <h3 className="mb-3 font-semibold text-slate-900">Your Message</h3>
                  <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                    {selectedInquiry.message}
                  </div>
                </div>

                {/* Admin Reply */}
                {selectedInquiry.adminReply ? (
                  <div className="rounded-lg bg-green-50 p-4 border border-green-200">
                    <h3 className="mb-3 font-semibold text-green-900">Response from Our Team</h3>
                    <div className="whitespace-pre-wrap text-sm text-green-800 mb-3">
                      {selectedInquiry.adminReply}
                    </div>
                    {selectedInquiry.repliedAt && (
                      <p className="text-xs text-green-700">
                        Replied on {formatDate(selectedInquiry.repliedAt)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
                    <p className="text-sm text-blue-800">
                      Our team is reviewing your inquiry. You'll receive an email response as soon as we've replied.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
                Select an inquiry to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {confirmDeleteOpen && selectedInquiry ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingId) {
              setConfirmDeleteOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete Inquiry"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-rose-100 p-2 text-rose-600">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Delete Inquiry?</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Are you sure you want to delete this inquiry? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                disabled={Boolean(deletingId)}
                className="rounded-lg border border-[#0959a4]/30 px-4 py-2 text-sm font-semibold text-[#0959a4] transition hover:bg-[#0959a4]/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteInquiry}
                disabled={Boolean(deletingId)}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId ? <Loader2 size={14} className="animate-spin" /> : null}
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default MyInquiriesPage;
