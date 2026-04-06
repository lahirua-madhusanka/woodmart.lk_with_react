import { Search, Loader2, Mail, CheckCircle2, MailCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { getApiErrorMessage } from "../../services/apiClient";
import { getSocket } from "../../services/socketService";
import {
  getContactInquiries,
  getContactInquiryById,
  replyToContactInquiry,
  updateContactMessageStatus,
} from "../services/contactInboxService";

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

function ContactInboxPage() {
  const { token, isAuthenticated } = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replyNote, setReplyNote] = useState("");

  const selectedInquiry = useMemo(
    () => inquiries.find((item) => item.id === selectedInquiryId) || null,
    [inquiries, selectedInquiryId]
  );

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContactInquiries(statusFilter, searchQuery);
      setInquiries(data || []);
      // Auto-select the first one if none selected
      if (!selectedInquiryId && data?.length) {
        setSelectedInquiryId(data[0].id);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, selectedInquiryId]);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      return undefined;
    }

    const socket = getSocket(token);
    if (!socket) {
      return undefined;
    }

    const handleInquiryDeleted = ({ id }) => {
      if (!id) return;

      setInquiries((prev) => {
        const next = prev.filter((item) => item.id !== id);
        setSelectedInquiryId((currentSelectedId) => {
          if (currentSelectedId !== id) {
            return next.some((item) => item.id === currentSelectedId) ? currentSelectedId : next[0]?.id || "";
          }
          return next[0]?.id || "";
        });
        return next;
      });

      setReplyMessage((current) => (selectedInquiryId === id ? "" : current));
      setReplyNote((current) => (selectedInquiryId === id ? "" : current));
    };

    socket.on("contact:inquiry-deleted", handleInquiryDeleted);
    return () => socket.off("contact:inquiry-deleted", handleInquiryDeleted);
  }, [token, isAuthenticated, selectedInquiryId]);

  useEffect(() => {
    if (!selectedInquiryId) {
      return;
    }

    const loadSelectedInquiry = async () => {
      setLoadingSelected(true);
      try {
        const data = await getContactInquiryById(selectedInquiryId);
        setInquiries((prev) => prev.map((item) => (item.id === selectedInquiryId ? data : item)));
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setLoadingSelected(false);
      }
    };

    loadSelectedInquiry();
  }, [selectedInquiryId]);

  useEffect(() => {
    if (!selectedInquiry) {
      return;
    }

    setReplyMessage(selectedInquiry.adminReply || "");
    setReplyNote(selectedInquiry.internalNote || "");
  }, [selectedInquiry?.id]);

  const handleStatusChange = useCallback(
    async (newStatus) => {
      if (!selectedInquiry?.id) return;

      setUpdating(selectedInquiry.id);
      try {
        const result = await updateContactMessageStatus(selectedInquiry.id, newStatus);
        setInquiries((prev) =>
          prev.map((item) => (item.id === selectedInquiry.id ? result.inquiry : item))
        );
        toast.success("Status updated successfully");
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        setUpdating(null);
      }
    },
    [selectedInquiry?.id]
  );

  const handleReplyNoteSubmit = async () => {
    if (!selectedInquiry?.id) {
      return;
    }

    if (!replyMessage.trim()) {
      toast.warning("Please enter a reply message");
      return;
    }

    setSendingReply(true);
    try {
      const result = await replyToContactInquiry(selectedInquiry.id, {
        replyMessage: replyMessage.trim(),
        internalNote: replyNote.trim() || null,
      });

      setInquiries((prev) =>
        prev.map((item) => (item.id === selectedInquiry.id ? result.inquiry : item))
      );
      toast.success("Reply sent to customer successfully");
      setReplyMessage("");
      setReplyNote("");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSendingReply(false);
    }
  };

  const isBusy = updating === selectedInquiry?.id || sendingReply || loadingSelected;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left panel: Inquiries list */}
      <div className="lg:col-span-1">
        <div className="rounded-lg border border-slate-200 bg-white">
          {/* Search and filter */}
          <div className="border-b border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search inquiries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
            </select>
          </div>

          {/* Inquiries list */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
            {inquiries.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No inquiries found
              </div>
            ) : (
              inquiries.map((inquiry) => (
                <button
                  key={inquiry.id}
                  onClick={() => setSelectedInquiryId(inquiry.id)}
                  className={`w-full border-b border-slate-200 px-4 py-3 text-left transition ${
                    selectedInquiryId === inquiry.id
                      ? "bg-brand-light"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-slate-900">
                      {inquiry.firstName} {inquiry.lastName}
                    </span>
                    <span className={getStatusBadgeStyle(inquiry.status)}>
                      {getStatusIcon(inquiry.status)}
                      {inquiry.status}
                    </span>
                  </div>
                  <div className="truncate text-xs text-slate-500">{inquiry.email}</div>
                  <div className="mt-1 truncate text-sm text-slate-700">{inquiry.subject}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {formatDate(inquiry.createdAt)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right panel: Inquiry detail */}
      <div className="lg:col-span-2">
        {selectedInquiry ? (
          <div className="rounded-lg border border-slate-200 bg-white">
            {/* Header */}
            <div className="border-b border-slate-200 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedInquiry.firstName} {selectedInquiry.lastName}
                </h2>
                <span className={getStatusBadgeStyle(selectedInquiry.status)}>
                  {getStatusIcon(selectedInquiry.status)}
                  {selectedInquiry.status}
                </span>
              </div>
              <div className="grid gap-2 text-sm text-slate-600">
                <div>
                  <span className="font-semibold text-slate-900">Email:</span> {selectedInquiry.email}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Subject:</span>{" "}
                  {selectedInquiry.subject}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Received:</span>{" "}
                  {formatDate(selectedInquiry.createdAt)}
                </div>
              </div>
            </div>

            {/* Message body */}
            <div className="border-b border-slate-200 p-6">
              <h3 className="mb-3 font-semibold text-slate-900">Message</h3>
              <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                {selectedInquiry.message}
              </div>
              {selectedInquiry.adminReply ? (
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-900">Latest Reply</h4>
                  <div className="whitespace-pre-wrap rounded-lg bg-blue-50 p-4 text-sm text-slate-800">
                    {selectedInquiry.adminReply}
                  </div>
                  {selectedInquiry.repliedAt ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Replied at {formatDate(selectedInquiry.repliedAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Status actions */}
            <div className="border-b border-slate-200 p-6">
              <h3 className="mb-3 font-semibold text-slate-900">Update Status</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange("read")}
                  disabled={isBusy || selectedInquiry.status === "read"}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {updating === selectedInquiry.id && <Loader2 size={14} className="animate-spin" />}
                  <CheckCircle2 size={16} />
                  Mark as Read
                </button>
                <button
                  onClick={() => handleStatusChange("replied")}
                  disabled={isBusy || selectedInquiry.status === "replied"}
                  className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
                >
                  {updating === selectedInquiry.id && <Loader2 size={14} className="animate-spin" />}
                  <MailCheck size={16} />
                  Mark as Replied
                </button>
              </div>
            </div>

            {/* Reply note section */}
            <div className="p-6">
              <h3 className="mb-3 font-semibold text-slate-900">Reply</h3>
              <p className="mb-3 text-xs text-slate-500">
                Write a response to the customer, then optionally add an internal note.
              </p>
              <div className="mb-3 flex flex-col gap-2">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply to the customer..."
                  className="h-28 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
                <textarea
                  value={replyNote}
                  onChange={(e) => setReplyNote(e.target.value)}
                  placeholder="Type your internal follow-up note (optional)..."
                  className="h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <button
                onClick={handleReplyNoteSubmit}
                disabled={!replyMessage.trim() || isBusy}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {sendingReply ? <Loader2 size={14} className="animate-spin" /> : null}
                <MailCheck size={16} />
                Send Reply & Update Status
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-slate-500">
            Select an inquiry to view details
          </div>
        )}
      </div>
    </div>
  );
}

export default ContactInboxPage;
