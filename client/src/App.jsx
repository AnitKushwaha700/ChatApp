import React from "react";
import SiteHeader from "./components/SiteHeader";
import Home from "./pages/Home";
import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Chat from "./pages/Chat";
import UserDashboard from "./pages/UserDashboard";
import AuthModals from "./components/AuthModals";

const App = () => {
  const path = useLocation().pathname;

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  return (
    <>
      <Toaster />
      <AuthModals />
      {path !== "/chat" && <SiteHeader />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/dashboard" element={<UserDashboard />} />
      </Routes>
    </>
  );
};

export default App;