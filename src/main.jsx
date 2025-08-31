// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google"; // ✅ ajouté
import App from "./app/App";

// THIRD PARTY CSS
import "perfect-scrollbar/css/perfect-scrollbar.css";

// Ton client ID Google (OAuth2)
const clientId = "643716741024-b17obejeud2ksngkbj3722smrttnkk0d.apps.googleusercontent.com";

const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
