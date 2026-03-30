import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./context/AuthContext";
import { ChatRealtimeProvider } from "./context/ChatRealtimeContext";
import { StorefrontSettingsProvider } from "./context/StorefrontSettingsContext";
import App from "./App";
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import { StoreProvider } from "./context/StoreContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <StorefrontSettingsProvider>
        <AuthProvider>
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
        </AuthProvider>
      </StorefrontSettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);