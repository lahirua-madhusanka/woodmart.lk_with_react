import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { ChatRealtimeProvider } from "./context/ChatRealtimeContext";
import { StorefrontSettingsProvider } from "./context/StorefrontSettingsContext";
import { UserAuthProvider } from "./context/UserAuthContext";
import App from "./App";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import { StoreProvider } from "./context/StoreContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <StorefrontSettingsProvider>
        <UserAuthProvider>
          <AdminAuthProvider>
            <ChatRealtimeProvider>
              <StoreProvider>
                <App />
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