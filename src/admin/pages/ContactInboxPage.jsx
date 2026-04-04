import { Search, Loader2, Mail, CheckCircle2, MailCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "../../services/apiClient";
import { getContactInquiries, updateContactMessageStatus } from "../services/contactInboxService";

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
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiryId, setSelectedInquiryId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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

  const handleReplyNoteSubmit = () => {
    if (!replyNote.trim()) {
      toast.warning("Please enter a reply note");
      return;
    }

    // Change status to 'replied' and add note
    handleStatusChange("replied");
    // In a real scenario, you'd also save the reply note text somewhere
    // For now, just mark as replied
    toast.success("Marked as replied");
    setReplyNote("");
  };

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
            </div>

            {/* Status actions */}
            <div className="border-b border-slate-200 p-6">
              <h3 className="mb-3 font-semibold text-slate-900">Update Status</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange("read")}
                  disabled={updating === selectedInquiry.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {updating === selectedInquiry.id && <Loader2 size={14} className="animate-spin" />}
                  <CheckCircle2 size={16} />
                  Mark as Read
                </button>
                <button
                  onClick={() => handleStatusChange("replied")}
                  disabled={updating === selectedInquiry.id}
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
              <h3 className="mb-3 font-semibold text-slate-900">Reply Note</h3>
              <p className="mb-3 text-xs text-slate-500">
                Add a note about your reply or follow-up action (this is for internal reference only)
              </p>
              <div className="mb-3 flex flex-col gap-2">
                <textarea
                  value={replyNote}
                  onChange={(e) => setReplyNote(e.target.value)}
                  placeholder="Type your internal reply note here..."
                  className="h-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <button
                onClick={handleReplyNoteSubmit}
                disabled={!replyNote.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
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
