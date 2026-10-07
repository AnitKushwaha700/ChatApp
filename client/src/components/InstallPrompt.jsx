import { useState, useEffect } from "react";
import { Download, Share, PlusSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    
    if (isIosDevice) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsIOS(true);
      // Show iOS prompt after a slight delay
      const timer = setTimeout(() => {
        // Only show if they haven't dismissed it recently
        const dismissed = localStorage.getItem('pwaPromptDismissed');
        if (!dismissed || Date.now() - parseInt(dismissed) > 86400000) { // 24 hours
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Chrome
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwaPromptDismissed');
      if (!dismissed || Date.now() - parseInt(dismissed) > 86400000) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log("PWA was installed");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: 100, opacity: 0, x: "-50%" }}
          className="fixed bottom-4 left-1/2 z-50 w-[95%] max-w-sm bg-base-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl border border-base-200 p-4"
        >
          <button 
            onClick={handleDismiss}
            className="absolute -top-3 -right-3 bg-base-200 rounded-full p-1.5 shadow-sm hover:bg-base-300 transition-colors"
          >
            <X size={16} />
          </button>
          
          {isIOS ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                  <Download size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Install App</h3>
                  <p className="text-xs text-base-content/70">Install for a better experience</p>
                </div>
              </div>
              <div className="bg-base-200 rounded-xl p-3 text-sm">
                <p className="flex items-center gap-2 mb-2">
                  1. Tap <Share size={16} className="text-primary" /> Share in safari menu
                </p>
                <p className="flex items-center gap-2">
                  2. Scroll down & tap <PlusSquare size={16} className="text-base-content" /> Add to Home Screen
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                  <Download size={24} />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-base">Install App</h3>
                  <p className="text-xs text-base-content/70">Add to home screen</p>
                </div>
              </div>
              <button 
                className="btn btn-sm btn-primary rounded-xl px-4" 
                onClick={handleInstallClick}
              >
                Install
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
