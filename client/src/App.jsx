import React from "react";
import SiteHeader from "./layouts/SiteHeader";
import Home from "./pages/Home";
import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Chat from "./pages/Chat";
import UserDashboard from "./pages/UserDashboard";
import AuthModals from "./features/auth/AuthModals";
import InstallPrompt from "./components/InstallPrompt";
import { WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const OfflineBanner = () => {
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 w-full z-[100] bg-error text-error-content px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 shadow-md pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2"
        >
          <WifiOff size={16} />
          <span>You're offline. Reconnecting when network is available.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
const App = () => {
  const path = useLocation().pathname;

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  return (
    <>
      <Toaster />
      <OfflineBanner />
      <AuthModals />
      <InstallPrompt />
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