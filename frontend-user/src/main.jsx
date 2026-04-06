import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AdminAuthProvider } from "../../src/context/AdminAuthContext";
import { ChatRealtimeProvider } from "../../src/context/ChatRealtimeContext";
import { StorefrontSettingsProvider } from "../../src/context/StorefrontSettingsContext";
import { UserAuthProvider } from "../../src/context/UserAuthContext";
import UserApp from "../../src/apps/UserApp";
import "../../src/index.css";
import "react-toastify/dist/ReactToastify.css";
import { StoreProvider } from "../../src/context/StoreContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <StorefrontSettingsProvider>
        <UserAuthProvider>
          <AdminAuthProvider>
            <ChatRealtimeProvider>
              <StoreProvider>
                <UserApp />
                <ToastContainer
                  position="top-right"
                  autoClose={2500}
                  closeOnClick
                  theme="light"
                />
              </StoreProvider>
            </ChatRealtimeProvider>
          </AdminAuthProvider>
        </UserAuthProvider>
      </StorefrontSettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
