import React from "react";
import { createRoot } from "react-dom/client";
import App from "./web.js";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("root element missing");
}

createRoot(rootElement).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(App),
  ),
);
