import React from "react";
import { createRoot } from "react-dom/client";
import SiteRouter from "./SiteRouter";
import "./style.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SiteRouter />
  </React.StrictMode>,
);
