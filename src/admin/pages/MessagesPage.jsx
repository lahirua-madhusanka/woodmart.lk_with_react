import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useChatRealtime } from "../../context/ChatRealtimeContext";
import { getApiErrorMessage } from "../../services/apiClient";
import {
  getAdminConversationMessages,
  getAdminConversations,
  markAdminConversationRead,
  sendAdminMessage,
} from "../services/messagesService";

const formatTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function MessagesPage() {
  const { socket, refreshAdminUnreadCount } = useChatRealtime();
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [composer, setComposer] = useState("");

  const listRef = useRef(null);

  const selectedConversation = useMemo(
    () => conversations.find((entry) => entry.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await getAdminConversations();
      setConversations(data || []);
      if (!selectedConversationId && data?.length) {
        setSelectedConversationId(data[0].id);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingConversations(false);
    }
  }, [selectedConversationId]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;

    setLoadingMessages(true);
    try {
      const payload = await getAdminConversationMessages(conversationId);
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      await markAdminConversationRead(conversationId);
      await refreshAdminUnreadCount();
      setConversations((prev) =>
        prev.map((entry) =>
          entry.id === conversationId ? { ...entry, unreadCount: 0 } : entry
        )
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingMessages(false);
    }
  }, [refreshAdminUnreadCount]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadMessages(selectedConversationId);
  }, [loadMessages, selectedConversationId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (payload) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) return;

      loadConversations();

      if (conversationId === selectedConversationId && payload?.message?.id) {
        setMessages((prev) => {
          if (prev.some((entry) => entry.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
        markAdminConversationRead(conversationId).catch(() => {});
      }
    };

    const onConversationUpdated = () => {
      loadConversations();
    };

    socket.on("chat:new-message", onNewMessage);
    socket.on("chat:conversation-updated", onConversationUpdated);

    return () => {
      socket.off("chat:new-message", onNewMessage);
      socket.off("chat:conversation-updated", onConversationUpdated);
    };
  }, [loadConversations, selectedConversationId, socket]);

  const handleSend = async () => {
    if (!selectedConversationId || !composer.trim() || sending) return;

    setSending(true);
    try {
      const payload = await sendAdminMessage(selectedConversationId, composer.trim());
      if (payload?.message?.id) {
        setMessages((prev) => {
          if (prev.some((entry) => entry.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
      }
      setComposer("");
      loadConversations();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="grid min-h-[70vh] lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 px-4 py-3">
            <h1 className="text-lg font-semibold text-ink">Messages</h1>
            <p className="text-xs text-muted">Customer conversations in real time</p>
          </div>

          {loadingConversations ? (
            <div className="p-4 text-sm text-muted">Loading conversations...</div>
          ) : !conversations.length ? (
            <div className="p-4 text-sm text-muted">No conversations yet.</div>
          ) : (
            <div className="max-h-[68vh] overflow-y-auto">
              {conversations.map((conversation) => {
                const active = conversation.id === selectedConversationId;
                const unread = Number(conversation.unreadCount || 0);
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full border-b border-slate-100 px-4 py-3 text-left transition ${
                      active ? "bg-brand-light" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {conversation.customer?.name || "Customer"}
                      </p>
                      {unread > 0 ? (
                        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                          {unread}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted">{conversation.customer?.email || "-"}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-600">
                      {conversation.lastMessageText || "No messages yet"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">{formatTime(conversation.lastMessageAt)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className="flex min-h-[70vh] flex-col">
          {selectedConversation ? (
            <>
              <header className="border-b border-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-ink">
                  {selectedConversation.customer?.name || "Customer"}
                </p>
                <p className="text-xs text-muted">{selectedConversation.customer?.email || "No email"}</p>
              </header>

              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {loadingMessages ? (
                  <div className="text-sm text-muted">Loading messages...</div>
                ) : !messages.length ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-muted">
                    No messages in this conversation yet.
                  </div>
                ) : (
                  messages.map((message) => {
                    const fromAdmin = message.sender?.role === "admin";
                    return (
                      <article
                        key={message.id}
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                          fromAdmin
                            ? "ml-auto bg-brand text-white"
                            : "mr-auto border border-slate-200 bg-white text-ink"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.text}</p>
                        <p className={`mt-1 text-[10px] ${fromAdmin ? "text-white/80" : "text-muted"}`}>
                          {formatTime(message.createdAt)}
                        </p>
                      </article>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={composer}
                    onChange={(event) => setComposer(event.target.value)}
                    rows={2}
                    placeholder="Type reply..."
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !composer.trim()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-60"
                    aria-label="Send reply"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
              Select a conversation to start replying.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default MessagesPage;
