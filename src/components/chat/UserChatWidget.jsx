import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import { useChatRealtime } from "../../context/ChatRealtimeContext";
import { useStorefrontSettings } from "../../context/StorefrontSettingsContext";
import { getApiErrorMessage } from "../../services/apiClient";
import { getMyConversationApi, sendMyMessageApi } from "../../services/chatService";

const formatTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

function UserChatWidget() {
  const { isAuthenticated, user } = useAuth();
  const { socket, connected } = useChatRealtime();
  const { settings } = useStorefrontSettings();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const listRef = useRef(null);

  const conversationId = conversation?.id;

  useEffect(() => {
    if (!open || !isAuthenticated) {
      return;
    }

    let ignore = false;

    const loadConversation = async () => {
      setLoading(true);
      try {
        const payload = await getMyConversationApi();
        if (ignore) return;
        setConversation(payload?.conversation || null);
        setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      } catch (error) {
        toast.error(getApiErrorMessage(error));
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadConversation();

    return () => {
      ignore = true;
    };
  }, [open, isAuthenticated]);

  useEffect(() => {
    if (!socket || !conversationId) {
      return;
    }

    socket.emit("chat:join-conversation", conversationId);

    const onMessage = (payload) => {
      if (payload?.conversationId !== conversationId) return;
      const incoming = payload?.message;
      if (!incoming?.id) return;
      setMessages((prev) => {
        if (prev.some((entry) => entry.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    };

    socket.on("chat:new-message", onMessage);

    return () => {
      socket.emit("chat:leave-conversation", conversationId);
      socket.off("chat:new-message", onMessage);
    };
  }, [socket, conversationId]);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, open]);

  const handleSend = async () => {
    const messageText = text.trim();
    if (!messageText || sending) return;

    setSending(true);
    try {
      const payload = await sendMyMessageApi(messageText);
      const nextMessage = payload?.message;
      if (nextMessage?.id) {
        setMessages((prev) => {
          if (prev.some((entry) => entry.id === nextMessage.id)) return prev;
          return [...prev, nextMessage];
        });
      }
      setText("");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const statusText = useMemo(() => {
    if (!isAuthenticated) return "Sign in required";
    return connected ? "Live support online" : "Reconnecting...";
  }, [connected, isAuthenticated]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition hover:scale-105 hover:bg-brand-dark"
        aria-label="Open support chat"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open ? (
        <section className="fixed bottom-24 right-6 z-50 flex h-[32rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[24rem]">
          <header className="border-b border-slate-200 bg-brand-light px-4 py-3">
            <p className="text-sm font-semibold text-brand-dark">{settings.storeName} Support</p>
            <p className="text-xs text-slate-600">{statusText}</p>
          </header>

          {!isAuthenticated ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-muted">Please sign in to start chatting with our support team.</p>
              <Link to="/auth" className="btn-primary w-full">
                Sign In to Chat
              </Link>
            </div>
          ) : loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chat...
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {!messages.length ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-muted">
                    No messages yet. Ask us anything about products, orders, or delivery.
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.senderId === user?.id;
                    return (
                      <article
                        key={message.id}
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${
                          mine
                            ? "ml-auto bg-brand text-white"
                            : "mr-auto bg-white text-ink border border-slate-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                        <p className={`mt-1 text-[10px] ${mine ? "text-white/80" : "text-muted"}`}>
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
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white disabled:opacity-60"
                    aria-label="Send message"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}

export default UserChatWidget;
