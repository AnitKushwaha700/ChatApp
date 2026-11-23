import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useModal } from "../context/ModalContext";
import {
  ShieldCheck,
  Zap,
  Video,
  Globe,
  ArrowRight,
  Download,
  Sparkles,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import heroBgImage from "../assets/chatApp-image.png";
import toast from "react-hot-toast";

const Home = () => {
  const { isLogin } = useAuth();
  const navigate = useNavigate();
  const { openLogin, openRegister } = useModal();

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) setIsInstalled(true);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("ChatApp installed successfully!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleStartChatting = () => {
    if (isLogin) {
      navigate("/chat");
    } else {
      openLogin();
    }
  };

  const handleInstallClick = async () => {
    if (isInstalled) {
      toast.success("ChatApp is already installed on your device!");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      openRegister();
    }
  };

  return (
    <main className="h-[calc(100dvh-56px)] sm:h-[calc(100dvh-64px)] w-full bg-base-100 text-base-content flex flex-col justify-center items-center py-4 px-4 sm:px-8 overflow-hidden relative select-none transition-colors duration-200">
      {/* ==================== SUBTLE AMBIENT LIGHTING BACKGROUND ==================== */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        {/* Subtle Background 3D Depth Texture */}
        <motion.img
          src={heroBgImage}
          alt="ChatApp Graphic"
          animate={{
            scale: [1.02, 1.05, 1.02],
            x: ["-1%", "1%", "-1%"],
            y: ["-0.5%", "0.5%", "-0.5%"],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="w-full h-full object-cover object-center opacity-10 dark:opacity-20 grayscale contrast-125 brightness-90 mix-blend-luminosity"
        />

        {/* Ambient Gradient Masks */}
        <div className="absolute inset-0 bg-gradient-to-b from-base-100/60 via-transparent to-base-100" />

        {/* Soft Volumetric Glow Orbs */}
        <div className="absolute top-[12%] left-[18%] w-[35vw] h-[35vw] max-w-[420px] max-h-[420px] rounded-full bg-[#04BC66]/15 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] rounded-full bg-[#00a884]/10 blur-[130px]" />

        {/* Subtle Tech Dot Grid */}
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(var(--wa-text, #04BC66) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* ==================== CLEAN COMPANY HERO STACK ==================== */}
      <div className="max-w-4xl w-full z-10 text-center flex flex-col items-center justify-center my-auto px-2">
        {/* Bold Corporate Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-base-content leading-[1.08] mb-4 sm:mb-5"
        >
          Connect with Anyone,
          <br />
          <span className="bg-gradient-to-r from-[#04BC66] via-[#10b981] to-[#059669] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(4,188,102,0.3)]">
            Anywhere in the World.
          </span>
        </motion.h1>

        {/* Company Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-base-content/75 max-w-2xl mx-auto font-normal leading-relaxed mb-6 sm:mb-8"
        >
          Fast, simple, and secure real-time messaging and calls. Experience
          crystal-clear audio, HD video, and instant synchronization across all
          your devices.
        </motion.p>

        {/* Dual Primary & Secondary Action CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-10 w-full sm:w-auto"
        >
          {/* Primary Action Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStartChatting}
            className="w-full sm:w-auto bg-gradient-to-b from-[#05df7a] via-[#04BC66] to-[#018e4d] text-white font-bold text-base px-8 sm:px-9 py-3.5 rounded-full shadow-[0_8px_24px_rgba(4,188,102,0.35),inset_0_1px_1px_rgba(255,255,255,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>Start Chatting Free</span>
            <ArrowRight
              size={17}
              className="group-hover:translate-x-1 transition-transform"
            />
          </motion.button>

          {/* Secondary Action Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleInstallClick}
            className="w-full sm:w-auto bg-base-200/90 hover:bg-base-300 text-base-content font-semibold text-base px-7 sm:px-8 py-3.5 rounded-full border border-base-content/15 shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isInstalled ? (
              <>
                <CheckCircle2 size={17} className="text-[#04BC66]" />
                <span>App Installed</span>
              </>
            ) : (
              <>
                <Download size={17} className="text-[#04BC66]" />
                <span>Install App (PWA)</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Corporate Trust & Feature Proof Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs sm:text-sm text-base-content/70 font-medium pt-4 sm:pt-6 border-t border-base-content/10 max-w-2xl w-full"
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-[#04BC66]" />
            <span>End-to-End Encrypted</span>
          </div>
          <span className="hidden sm:inline text-base-content/30">•</span>
          <div className="flex items-center gap-1.5">
            <Zap size={16} className="text-[#04BC66]" />
            <span>Sub-50ms WebSockets</span>
          </div>
          <span className="hidden sm:inline text-base-content/30">•</span>
          <div className="flex items-center gap-1.5">
            <Video size={16} className="text-[#04BC66]" />
            <span>HD Voice & Video</span>
          </div>
          <span className="hidden sm:inline text-base-content/30">•</span>
          <div className="flex items-center gap-1.5">
            <Globe size={16} className="text-[#04BC66]" />
            <span>DPDP Act Compliant</span>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default Home;
