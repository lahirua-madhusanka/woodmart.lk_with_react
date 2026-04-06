import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import { useAuth } from "./AuthContext";
import { getAdminUnreadCountApi } from "../services/chatService";
import { disconnectSocket, getSocket } from "../services/socketService";

const ChatRealtimeContext = createContext(null);

export function ChatRealtimeProvider({ children }) {
  const location = useLocation();
  const { token: userToken } = useAuth();
  const {
    token: adminToken,
    user: adminUser,
    isAuthenticated: isAdminAuthenticated,
  } = useAdminAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);

  const isAdminArea = location.pathname.startsWith("/admin");
  const activeToken = isAdminArea ? adminToken || userToken : userToken || adminToken;

  const refreshAdminUnreadCount = async () => {
    if (!isAdminAuthenticated || adminUser?.role !== "admin") {
      setAdminUnreadCount(0);
      return 0;
    }

    try {
      const payload = await getAdminUnreadCountApi();
      const nextCount = Number(payload?.unreadCount || 0);
      setAdminUnreadCount(nextCount);
      return nextCount;
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (!activeToken) {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
      setAdminUnreadCount(0);
      return;
    }

    const client = getSocket(activeToken);
    setSocket(client);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    client.on("connect", onConnect);
    client.on("disconnect", onDisconnect);

    if (client.connected) {
      setConnected(true);
    }

    return () => {
      client.off("connect", onConnect);
      client.off("disconnect", onDisconnect);
    };
  }, [activeToken]);

  useEffect(() => {
    const usingAdminSocket = isAdminArea ? activeToken === adminToken : false;

    if (!socket || !isAdminAuthenticated || adminUser?.role !== "admin" || !usingAdminSocket) {
      return;
    }

    refreshAdminUnreadCount();

    const onChatSignal = () => {
      refreshAdminUnreadCount();
    };

    socket.on("chat:new-message", onChatSignal);
    socket.on("chat:conversation-updated", onChatSignal);
    socket.on("chat:read-updated", onChatSignal);

    return () => {
      socket.off("chat:new-message", onChatSignal);
      socket.off("chat:conversation-updated", onChatSignal);
      socket.off("chat:read-updated", onChatSignal);
    };
  }, [socket, adminToken, activeToken, isAdminAuthenticated, adminUser?.role, isAdminArea]);

  const value = useMemo(
    () => ({
      socket,
      connected,
      adminUnreadCount,
      refreshAdminUnreadCount,
      setAdminUnreadCount,
    }),
    [socket, connected, adminUnreadCount]
  );

  return <ChatRealtimeContext.Provider value={value}>{children}</ChatRealtimeContext.Provider>;
}

export function useChatRealtime() {
  const context = useContext(ChatRealtimeContext);
  if (!context) {
    throw new Error("useChatRealtime must be used within ChatRealtimeProvider");
  }
  return context;
}
