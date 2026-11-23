import React, { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Zap,
  Bell,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";

const InstallAppCard = ({ className = "" }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosModalOpen, setIsIosModalOpen] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Detect if already installed / running standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // Capture Chrome/Android/Edge beforeinstallprompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
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
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setIsIosModalOpen(true);
    } else {
      setIsIosModalOpen(true);
    }
  };

  if (isInstalled) {
    return (
      <div className={`p-2.5 sm:p-3.5 rounded-2xl bg-base-200/60 border border-base-content/10 flex items-center justify-between gap-3 max-w-xl w-full text-left ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-success/20 text-success flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <h4 className="font-semibold text-xs sm:text-sm text-base-content">App Installed</h4>
            <p className="text-[11px] text-base-content/70">Running as a native standalone app.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sleek, compact on mobile, expansive on desktop */}
      <div
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-3 sm:p-5 bg-gradient-to-br from-base-200/90 via-base-200/60 to-base-100 border border-primary/25 shadow-md hover:border-primary/50 transition-all max-w-xl w-full text-left backdrop-blur-md ${className}`}
      >
        {/* Subtle ambient light glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#04BC66] to-[#008f53] text-white flex items-center justify-center shadow-md shadow-[#04BC66]/25 shrink-0">
              <Smartphone size={20} strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="badge badge-xs sm:badge-sm bg-primary/15 text-primary border-none font-semibold px-1.5 py-0 text-[10px] sm:text-xs">
                  PWA Ready
                </span>
                <span className="text-[10px] text-base-content/60 hidden sm:inline">
                  Android • iOS • Windows
                </span>
              </div>
              <h3 className="text-xs sm:text-base font-bold text-base-content tracking-tight truncate">
                Install ChatApp
              </h3>
              <p className="text-[11px] text-base-content/70 hidden sm:block truncate mt-0.5">
                Fast, instant launch with zero storage footprint.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#04BC66] hover:bg-[#03A85B] active:scale-95 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-[#04BC66]/20 transition-all cursor-pointer shrink-0"
          >
            <Download size={14} className="shrink-0" />
            <span>Install</span>
          </button>
        </div>
      </div>

      {/* iOS / Browser Manual Install Guide Modal */}
      {isIosModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-base-100 rounded-2xl max-w-sm w-full p-5 border border-base-content/10 shadow-2xl relative">
            <button
              onClick={() => setIsIosModalOpen(false)}
              className="absolute top-3.5 right-3.5 p-1 rounded-full text-base-content/60 hover:text-base-content hover:bg-base-200 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#04BC66]/20 text-[#04BC66] flex items-center justify-center">
                <Smartphone size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-base-content">
                  Install ChatApp
                </h3>
                <p className="text-xs text-base-content/60">
                  Quick installation guide
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-base-content/80">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-base-200/50">
                <Share size={18} className="text-primary shrink-0 mt-0.5" />
                <p>
                  1. Tap the <span className="font-bold text-base-content">Share</span> button in Safari or Chrome toolbar.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-base-200/50">
                <PlusSquare size={18} className="text-primary shrink-0 mt-0.5" />
                <p>
                  2. Scroll down and tap <span className="font-bold text-base-content">Add to Home Screen</span>.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-base-200/50">
                <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
                <p>
                  3. Tap <span className="font-bold text-base-content">Add</span> in top right. ChatApp will appear on your home screen!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsIosModalOpen(false)}
              className="w-full mt-4 py-2 rounded-xl bg-[#04BC66] text-white font-semibold text-xs hover:bg-[#03A85B] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppCard;
